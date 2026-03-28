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

    // Fallback: log all params for debugging and show a friendly page
    console.log('[callback] Unknown flow, all params:', JSON.stringify(params));
    res.status(400).send(`
      <h2>Callback ricevuto</h2>
      <p>Method: ${req.method}</p>
      <p>Query: ${JSON.stringify(req.query)}</p>
      <p>Body: ${JSON.stringify(req.body)}</p>
      <p>Full URL: ${req.originalUrl}</p>
      <p>Se vedi questo, il redirect da Yapily è arrivato ma con parametri non riconosciuti.</p>
    `);
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
