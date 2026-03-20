// src/storage.js
// Simple JSON file storage for user settings, push tokens, and seen transactions.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '..', 'data');

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

function filePath(name) { return resolve(DATA_DIR, `${name}.json`); }

function readStore(name, fallback = {}) {
  const p = filePath(name);
  if (!existsSync(p)) return fallback;
  return JSON.parse(readFileSync(p, 'utf8'));
}

function writeStore(name, data) {
  writeFileSync(filePath(name), JSON.stringify(data, null, 2));
}

// --- Push tokens ---
export function savePushToken(userId, token) {
  const store = readStore('push-tokens', {});
  store[userId] = token;
  writeStore('push-tokens', store);
}

export function getPushToken(userId) {
  return readStore('push-tokens', {})[userId] || null;
}

export function getAllPushTokens() {
  return readStore('push-tokens', {});
}

// --- User settings (budget thresholds, notification prefs) ---
export function getUserSettings(userId) {
  const store = readStore('user-settings', {});
  return store[userId] || { budgets: {}, notifications: { realtime: true, reports: 'weekly', budgetAlerts: true } };
}

export function saveUserSettings(userId, settings) {
  const store = readStore('user-settings', {});
  store[userId] = { ...store[userId], ...settings };
  writeStore('user-settings', store);
}

// --- Seen transaction IDs (for polling new-tx detection) ---
export function getSeenTransactionIds(userId) {
  const store = readStore('seen-transactions', {});
  return store[userId] || [];
}

export function saveSeenTransactionIds(userId, ids) {
  const store = readStore('seen-transactions', {});
  store[userId] = ids;
  writeStore('seen-transactions', store);
}

// --- User consent tokens (multi-account) ---
export function getUserConsents(userId) {
  const store = readStore('user-consents', {});
  return store[userId] || [];
}

export function addUserConsent(userId, consent) {
  const store = readStore('user-consents', {});
  if (!store[userId]) store[userId] = [];
  store[userId].push(consent);
  writeStore('user-consents', store);
}

export function removeUserConsent(userId, consentToken) {
  const store = readStore('user-consents', {});
  if (!store[userId]) return;
  store[userId] = store[userId].filter(c => c.consentToken !== consentToken);
  writeStore('user-consents', store);
}
