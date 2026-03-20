#!/usr/bin/env node
/**
 * Yapily Setup - Flusso completo per ottenere il consentToken
 *
 * Esegui: node scripts/yapily-setup.js
 *
 * Passaggi:
 * 1. Testa le credenziali (GET /institutions)
 * 2. Mostra le banche sandbox disponibili
 * 3. Crea un account-auth-request → ti dà l'URL da aprire
 * 4. Avvia un mini-server sulla porta 3000 per catturare il callback
 * 5. Scambia code → consentToken
 * 6. Salva nel .env
 */

import 'dotenv/config';
import { createServer } from 'http';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import readline from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, '..', '.env');

const APP_UUID = process.env.YAPILY_APPLICATION_UUID;
const APP_SECRET = process.env.YAPILY_APPLICATION_SECRET;
const API_BASE = process.env.YAPILY_API_BASE || 'https://api.yapily.com';
const PORT = process.env.PORT || 3000;
const CALLBACK_URL = `http://localhost:${PORT}/callback`;

function basicAuth() {
  return 'Basic ' + Buffer.from(`${APP_UUID}:${APP_SECRET}`).toString('base64');
}

async function apiCall(path, { method = 'GET', body } = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    Authorization: basicAuth(),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${data.error || data.message || text}`);
  }
  return data;
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}

// --- STEP 1: Test credenziali ---
async function testCredentials() {
  console.log('\n=== STEP 1: Test credenziali ===');
  if (!APP_UUID || !APP_SECRET) {
    console.error('❌ Mancano YAPILY_APPLICATION_UUID e/o YAPILY_APPLICATION_SECRET nel .env');
    process.exit(1);
  }
  console.log(`   UUID: ${APP_UUID}`);
  console.log(`   API:  ${API_BASE}`);

  try {
    const data = await apiCall('/institutions');
    const institutions = Array.isArray(data) ? data : data.data || [];
    console.log(`✅ Credenziali OK! ${institutions.length} istituti disponibili.`);
    return institutions;
  } catch (e) {
    console.error('❌ Autenticazione fallita:', e.message);
    process.exit(1);
  }
}

// --- STEP 2: Mostra banche sandbox ---
function showSandboxBanks(institutions) {
  console.log('\n=== STEP 2: Banche sandbox disponibili ===');
  const sandbox = institutions.filter((i) =>
    (i.name || '').toLowerCase().includes('sandbox') ||
    (i.id || '').toLowerCase().includes('sandbox') ||
    (i.environmentType || '').toLowerCase() === 'sandbox'
  );

  if (sandbox.length === 0) {
    console.log('   Nessuna banca sandbox trovata. Ecco le prime 10:');
    institutions.slice(0, 10).forEach((i) => {
      console.log(`   - ${i.id} (${i.name || i.fullName || '?'})`);
    });
  } else {
    sandbox.forEach((i) => {
      console.log(`   - ${i.id} (${i.name || i.fullName || '?'})`);
    });
  }
}

// --- STEP 3: Crea account-auth-request ---
async function createAuthRequest(institutionId) {
  console.log('\n=== STEP 3: Creazione Account Authorisation ===');
  console.log(`   Istituto: ${institutionId}`);
  console.log(`   Callback: ${CALLBACK_URL}`);

  const body = {
    applicationUserId: 'user-123',
    institutionId,
    callback: CALLBACK_URL,
  };

  const data = await apiCall('/account-auth-requests', { method: 'POST', body });

  const authUrl = data.data?.authorisationUrl
    || data.authorisationUrl
    || data.data?.authorisationURL
    || data.authorisationURL;

  if (!authUrl) {
    console.error('❌ Nessun authorisationUrl nella risposta:', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log(`\n✅ Authorisation creata!`);
  console.log(`\n🔗 Apri questo URL nel browser per dare il consenso:\n`);
  console.log(`   ${authUrl}\n`);

  return authUrl;
}

// --- STEP 4: Mini-server per catturare il callback ---
function waitForCallback() {
  return new Promise((resolvePromise) => {
    console.log(`\n=== STEP 4: In attesa del callback su http://localhost:${PORT}/callback ===`);
    console.log('   (Dopo aver dato il consenso nel browser, verrai rediretto qui)\n');

    const server = createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${PORT}`);

      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <html><body style="font-family:sans-serif;text-align:center;padding:4rem;background:#0f1419;color:#e6edf3">
            <h1 style="color:#3fb950">Callback ricevuto!</h1>
            <p>Puoi chiudere questa finestra. Lo script sta scambiando il code per il consentToken...</p>
          </body></html>
        `);

        server.close();
        resolvePromise({ code, state });
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(PORT, () => {
      console.log(`   Server callback in ascolto sulla porta ${PORT}...`);
    });
  });
}

// --- STEP 5: Scambia code → consentToken ---
async function exchangeCode(code, state) {
  console.log('\n=== STEP 5: Scambio code → consentToken ===');
  console.log(`   code:  ${code}`);
  console.log(`   state: ${state}`);

  const data = await apiCall('/consent-auth-code', {
    method: 'POST',
    body: { authCode: code, authState: state },
  });

  const consentToken = data.data?.consentToken || data.consentToken;
  const status = data.data?.status || data.status;

  if (!consentToken) {
    console.error('❌ Nessun consentToken nella risposta:', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log(`\n✅ Consent ottenuto!`);
  console.log(`   Status: ${status}`);
  console.log(`   Token:  ${consentToken.substring(0, 30)}...`);

  return consentToken;
}

// --- STEP 6: Salva nel .env ---
function saveToEnv(consentToken) {
  console.log('\n=== STEP 6: Salvataggio nel .env ===');

  let envContent = readFileSync(ENV_PATH, 'utf8');

  if (envContent.includes('YAPILY_CONSENT_TOKEN=')) {
    envContent = envContent.replace(
      /YAPILY_CONSENT_TOKEN=.*/,
      `YAPILY_CONSENT_TOKEN=${consentToken}`
    );
  } else {
    envContent += `\nYAPILY_CONSENT_TOKEN=${consentToken}\n`;
  }

  writeFileSync(ENV_PATH, envContent);
  console.log('✅ .env aggiornato con il nuovo YAPILY_CONSENT_TOKEN');
  console.log('\n🎉 Setup completato! Riavvia il server con: npm run dev\n');
}

// --- MAIN ---
async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║     Yapily Setup — Autobank          ║');
  console.log('╚══════════════════════════════════════╝');

  const institutions = await testCredentials();
  showSandboxBanks(institutions);

  const institutionId = await ask('\nInserisci l\'institutionId da usare: ');
  if (!institutionId) {
    console.error('❌ institutionId obbligatorio');
    process.exit(1);
  }

  await createAuthRequest(institutionId);

  const { code, state } = await waitForCallback();

  if (!code) {
    console.error('❌ Nessun code ricevuto nel callback');
    process.exit(1);
  }

  const consentToken = await exchangeCode(code, state);
  saveToEnv(consentToken);
}

main().catch((e) => {
  console.error('❌ Errore:', e.message);
  process.exit(1);
});
