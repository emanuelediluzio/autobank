/**
 * Autobank - Server Express
 * API per collegamento banche (Open Banking) e tracking spese
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getInstitutions,
  createRequisition,
  getRequisition,
  getAccountDetails,
  getAccountBalances,
  getAccountTransactions,
} from './src/openbanking-yapily.js';
import { categorizeTransactions, groupByCategory } from './src/categorizer.js';
import { getAccounts } from './src/openbanking-yapily.js';
import {
  savePushToken, getPushToken, getUserSettings, saveUserSettings,
  getUserConsents, addUserConsent, removeUserConsent,
} from './src/storage.js';
import { computeMonthlyStats, computeCategoryTotals } from './src/stats.js';
import { startPolling } from './src/polling.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const auth = () => ({
  appUuid: process.env.YAPILY_APPLICATION_UUID,
  appSecret: process.env.YAPILY_APPLICATION_SECRET,
  apiBase: process.env.YAPILY_API_BASE,
  // Per ora usiamo un consentToken statico da .env per sviluppo.
  // In produzione andrà gestito per utente dopo il flusso OAuth2 Yapily.
  consentToken: process.env.YAPILY_CONSENT_TOKEN,
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Yapily OAuth: scambio code → consentToken ---
app.get('/api/consent-callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.status(400).json({ error: 'Parametri code e state richiesti' });
    }

    const { appUuid, appSecret, apiBase } = auth();
    const basicToken = Buffer.from(`${appUuid}:${appSecret}`).toString('base64');

    const yapilyRes = await fetch(`${apiBase}/consent-auth-code`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ authCode: code, authState: state }),
    });

    const data = await yapilyRes.json();
    if (!yapilyRes.ok) {
      return res.status(yapilyRes.status).json({ error: data.message || data.error || 'Errore Yapily' });
    }

    const consentToken = data.data?.consentToken || data.consentToken;
    if (!consentToken) {
      return res.status(500).json({ error: 'Nessun consentToken nella risposta Yapily', raw: data });
    }

    // Aggiorna il .env automaticamente
    const fs = await import('fs');
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('YAPILY_CONSENT_TOKEN=')) {
      envContent = envContent.replace(/YAPILY_CONSENT_TOKEN=.*/, `YAPILY_CONSENT_TOKEN=${consentToken}`);
    } else {
      envContent += `\nYAPILY_CONSENT_TOKEN=${consentToken}\n`;
    }
    fs.writeFileSync(envPath, envContent);

    // Aggiorna anche in memoria per questa sessione
    process.env.YAPILY_CONSENT_TOKEN = consentToken;

    res.json({ status: data.data?.status || data.status, consentToken });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Mobile app callback: Yapily redirects here, we redirect to app deep link
// Yapily supports TWO flows:
//   Flow A (default): redirects with ?consent=<token> directly
//   Flow B (custom):  redirects with ?code=<code>&state=<state> for exchange
app.all('/callback', async (req, res) => {
  try {
    console.log('[callback] Method:', req.method);
    console.log('[callback] Query params:', JSON.stringify(req.query));
    console.log('[callback] Body:', JSON.stringify(req.body));
    console.log('[callback] Full URL:', req.originalUrl);
    console.log('[callback] Headers:', JSON.stringify(req.headers).slice(0, 500));

    // Merge query and body params (Yapily may POST or GET)
    const params = { ...req.query, ...req.body };

    // Flow A: Yapily default — consent token arrives directly
    const directConsent = params.consent || params.consentToken;
    if (directConsent) {
      console.log('[callback] Flow A: consent token received directly');
      process.env.YAPILY_CONSENT_TOKEN = directConsent;
      const appRedirect = `autobank://callback?consentToken=${encodeURIComponent(directConsent)}`;
      return res.redirect(appRedirect);
    }

    // Flow B: Custom redirect — exchange one-time-token/code for consent
    const { code, state } = params;

    // Yapily may also use 'application-user-id' or 'user-uuid' or 'one-time-token'
    const oneTimeToken = params['one-time-token'] || params.ott;

    if (oneTimeToken) {
      console.log('[callback] Flow B (OTT): exchanging one-time-token');
      const { appUuid, appSecret, apiBase } = auth();
      const basicToken = Buffer.from(`${appUuid}:${appSecret}`).toString('base64');

      const yapilyRes = await fetch(`${apiBase}/exchange-one-time-token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ oneTimeToken }),
      });

      const data = await yapilyRes.json();
      console.log('[callback] OTT exchange response:', JSON.stringify(data).slice(0, 500));
      const consentToken = data.data?.consentToken || data.consentToken;

      if (consentToken) {
        process.env.YAPILY_CONSENT_TOKEN = consentToken;
        const appRedirect = `autobank://callback?consentToken=${encodeURIComponent(consentToken)}`;
        return res.redirect(appRedirect);
      }
      return res.status(500).send('OTT exchange failed: no consent token');
    }

    if (code && state) {
      console.log('[callback] Flow B (code): exchanging auth code');
      const { appUuid, appSecret, apiBase } = auth();
      const basicToken = Buffer.from(`${appUuid}:${appSecret}`).toString('base64');

      const yapilyRes = await fetch(`${apiBase}/consent-auth-code`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ authCode: code, authState: state }),
      });

      const data = await yapilyRes.json();
      console.log('[callback] Code exchange response:', JSON.stringify(data).slice(0, 500));
      const consentToken = data.data?.consentToken || data.consentToken;

      if (consentToken) {
        process.env.YAPILY_CONSENT_TOKEN = consentToken;
        const appRedirect = `autobank://callback?consentToken=${encodeURIComponent(consentToken)}`;
        return res.redirect(appRedirect);
      }
      return res.status(500).send('Code exchange failed: no consent token');
    }

    // Fallback: serve HTML page that reads fragment (#) params from URL
    // Yapily may send consent token as fragment instead of query param
    console.log('[callback] No params found, serving fragment reader HTML');
    res.send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Autobank - Collegamento in corso...</title>
<style>body{font-family:system-ui;background:#0f1419;color:#e6edf3;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column}
.spinner{border:3px solid #30363d;border-top:3px solid #3fb950;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
#status{margin-top:20px;font-size:15px}#debug{margin-top:16px;font-size:12px;color:#8b949e;max-width:90%;word-break:break-all}</style></head>
<body>
<div class="spinner"></div>
<div id="status">Collegamento in corso...</div>
<div id="debug"></div>
<script>
(function() {
  var debug = document.getElementById('debug');
  var status = document.getElementById('status');
  var fullUrl = window.location.href;
  var hash = window.location.hash;
  var search = window.location.search;

  debug.textContent = 'URL: ' + fullUrl;
  console.log('[callback-client] Full URL:', fullUrl);
  console.log('[callback-client] Hash:', hash);
  console.log('[callback-client] Search:', search);

  // Parse both fragment and query params
  var params = {};
  if (hash && hash.length > 1) {
    new URLSearchParams(hash.substring(1)).forEach(function(v, k) { params[k] = v; });
  }
  if (search && search.length > 1) {
    new URLSearchParams(search).forEach(function(v, k) { params[k] = v; });
  }

  console.log('[callback-client] Parsed params:', JSON.stringify(params));
  debug.textContent += ' | Params: ' + JSON.stringify(params);

  var consent = params.consent || params.consentToken || params['consent-token'];
  var code = params.code || params.authCode;
  var stateVal = params.state || params.authState;

  if (consent) {
    status.textContent = 'Token ricevuto! Ritorno all\\'app...';
    window.location.href = 'autobank://callback?consentToken=' + encodeURIComponent(consent);
    return;
  }

  if (code && stateVal) {
    status.textContent = 'Scambio codice in corso...';
    fetch('/api/consent-callback?code=' + encodeURIComponent(code) + '&state=' + encodeURIComponent(stateVal))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.consentToken) {
          status.textContent = 'Token ricevuto! Ritorno all\\'app...';
          window.location.href = 'autobank://callback?consentToken=' + encodeURIComponent(data.consentToken);
        } else {
          status.textContent = 'Errore: nessun token ricevuto';
          debug.textContent += ' | Response: ' + JSON.stringify(data);
        }
      })
      .catch(function(e) { status.textContent = 'Errore: ' + e.message; });
    return;
  }

  // No params found at all — show debug info
  status.textContent = 'Nessun parametro ricevuto da Yapily';
  debug.textContent += ' | Nessun consent/code trovato. Controlla i log Render.';
})();
</script></body></html>`);
  } catch (e) {
    console.error('[callback] Error:', e.message);
    res.status(500).send(`Error: ${e.message}`);
  }
});

// --- API ---

// Lista banche per paese
app.get('/api/institutions', async (req, res) => {
  try {
    const country = req.query.country || 'IT';
    const list = await getInstitutions(country, auth());
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Crea requisition (link per collegare banca)
app.post('/api/requisitions', async (req, res) => {
  try {
    const redirect = process.env.REDIRECT_URL || `https://${req.get('host')}/callback`;
    console.log('[requisition] Using redirect URL:', redirect);
    const { institutionId, reference, country } = req.body;
    const reqData = await createRequisition(
      {
        redirect,
        institutionId,
        reference: reference || `user-${Date.now()}`,
        country: country || req.query.country || 'IT',
      },
      auth()
    );
    res.json(reqData);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Dettaglio requisition (account collegati)
app.get('/api/requisitions/:id', async (req, res) => {
  try {
    const data = await getRequisition(req.params.id, auth());
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Dettagli account
app.get('/api/accounts/:id/details', async (req, res) => {
  try {
    const data = await getAccountDetails(req.params.id, auth());
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Saldi account
app.get('/api/accounts/:id/balances', async (req, res) => {
  try {
    const data = await getAccountBalances(req.params.id, auth());
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Transazioni (con categorizzazione)
app.get('/api/accounts/:id/transactions', async (req, res) => {
  try {
    const raw = await getAccountTransactions(req.params.id, auth());
    const categorized = categorizeTransactions(raw.transactions || {});
    res.json({
      ...raw,
      transactions: categorized,
      byCategory: groupByCategory({ booked: categorized.booked }),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Dashboard aggregata: tutti gli account di una requisition
app.get('/api/dashboard/:requisitionId', async (req, res) => {
  try {
    const reqData = await getRequisition(req.params.requisitionId, auth());
    const accounts = reqData.accounts || [];
    const results = [];

    for (const accountId of accounts) {
      const [details, balances, txRaw] = await Promise.all([
        getAccountDetails(accountId, auth()),
        getAccountBalances(accountId, auth()),
        getAccountTransactions(accountId, auth()),
      ]);
      const categorized = categorizeTransactions(txRaw.transactions || {});
      results.push({
        accountId,
        details,
        balances,
        transactions: categorized,
        byCategory: groupByCategory({ booked: categorized.booked }),
      });
    }

    res.json({ requisition: reqData, accounts: results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Lista tutti gli account per il consent corrente
app.get('/api/accounts', async (req, res) => {
  try {
    const accounts = await getAccounts(auth());
    res.json(accounts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Registra Expo push token
app.post('/api/register-push-token', (req, res) => {
  const { userId, token } = req.body;
  if (!userId || !token) return res.status(400).json({ error: 'userId e token richiesti' });
  savePushToken(userId, token);
  res.json({ ok: true });
});

// Impostazioni utente
app.get('/api/user/:userId/settings', (req, res) => {
  res.json(getUserSettings(req.params.userId));
});

app.put('/api/user/:userId/settings', (req, res) => {
  saveUserSettings(req.params.userId, req.body);
  res.json(getUserSettings(req.params.userId));
});

// Statistiche mensili per grafici
app.get('/api/accounts/:id/stats/monthly', async (req, res) => {
  try {
    const raw = await getAccountTransactions(req.params.id, auth());
    const txList = raw.booked || [];
    const daily = computeMonthlyStats(txList);
    const categories = computeCategoryTotals(txList);
    res.json({ daily, categories });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Multi-account: consents per utente
app.get('/api/user/:userId/consents', (req, res) => {
  res.json(getUserConsents(req.params.userId));
});

app.post('/api/user/:userId/consents', (req, res) => {
  const { consentToken, institutionId, institutionName } = req.body;
  addUserConsent(req.params.userId, { consentToken, institutionId, institutionName, addedAt: new Date().toISOString() });
  res.json(getUserConsents(req.params.userId));
});

app.delete('/api/user/:userId/consents/:consentToken', (req, res) => {
  removeUserConsent(req.params.userId, req.params.consentToken);
  res.json({ ok: true });
});

// Fallback SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start polling after server boot
startPolling(auth);

app.listen(PORT, () => {
  console.log(`\n🚀 Autobank in ascolto su http://localhost:${PORT}`);
  console.log(`   API: /api/institutions, /api/requisitions, /api/accounts/:id/transactions`);
  if (!process.env.YAPILY_APPLICATION_UUID) {
    console.log(`\n⚠️  Configura .env con YAPILY_APPLICATION_UUID e YAPILY_APPLICATION_SECRET`);
  }
});
