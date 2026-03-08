#!/usr/bin/env node
/**
 * Script di test: ottieni il primo token da GoCardless
 * Esegui: node scripts/test-token.js
 * Richiede .env con GOCARDLESS_SECRET_ID e GOCARDLESS_SECRET_KEY
 */

import 'dotenv/config';
import { getRefreshToken } from '../src/gocardless.js';

const secretId = process.env.GOCARDLESS_SECRET_ID;
const secretKey = process.env.GOCARDLESS_SECRET_KEY;

if (!secretId || !secretKey) {
  console.error('Configura GOCARDLESS_SECRET_ID e GOCARDLESS_SECRET_KEY in .env');
  process.exit(1);
}

try {
  const data = await getRefreshToken(secretId, secretKey);
  console.log('✅ Token ottenuto con successo!');
  console.log('   refresh_expires:', data.refresh_expires, 'secondi');
  console.log('   (usa il refresh token per ottenere access token nelle chiamate API)');
} catch (e) {
  console.error('❌ Errore:', e.message);
  process.exit(1);
}
