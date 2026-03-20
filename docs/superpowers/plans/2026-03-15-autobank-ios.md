# Autobank iOS Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully functional iOS expense tracking app using React Native + Expo, backed by the existing Express server with Yapily Open Banking, deployed on Railway.

**Architecture:** Expo Router file-based navigation with bottom tabs (Dashboard, Transactions, Accounts, Profile). Zustand for state. Backend enhanced with JSON-file storage for user settings/push tokens, polling job for new transactions, and Expo Push API integration. Deploy backend on Railway.

**Tech Stack:** React Native, Expo SDK 52, Expo Router, Zustand, Victory Native, expo-notifications, Express, Railway

---

## Chunk 1: Backend — Storage & New API Endpoints

### Task 1: Create JSON file storage module

**Files:**
- Create: `src/storage.js`
- Create: `data/.gitkeep`

- [ ] **Step 1: Create data directory**

```bash
mkdir -p data
touch data/.gitkeep
```

- [ ] **Step 2: Write storage.js**

```js
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
```

- [ ] **Step 3: Commit**

```bash
git add src/storage.js data/.gitkeep
git commit -m "feat: add JSON file storage for users, settings, push tokens"
```

### Task 2: Create stats aggregation module

**Files:**
- Create: `src/stats.js`

- [ ] **Step 1: Write stats.js**

```js
// src/stats.js
// Aggregazioni per grafici dashboard mobile
import { categorizeTransaction } from './categorizer.js';

export function computeMonthlyStats(transactions) {
  const daily = {};
  for (const tx of transactions) {
    const date = tx.bookingDate || tx.valueDate;
    if (!date) continue;
    const day = date.substring(0, 10); // yyyy-mm-dd
    const amount = parseFloat(tx.transactionAmount?.amount || '0') || 0;
    if (!daily[day]) daily[day] = { date: day, spent: 0, income: 0 };
    if (amount < 0) daily[day].spent += Math.abs(amount);
    else daily[day].income += amount;
  }
  return Object.values(daily).sort((a, b) => a.date.localeCompare(b.date));
}

export function computeCategoryTotals(transactions) {
  const cats = {};
  for (const tx of transactions) {
    const cat = tx.category || categorizeTransaction(tx);
    const amount = parseFloat(tx.transactionAmount?.amount || '0') || 0;
    if (!cats[cat.id]) cats[cat.id] = { id: cat.id, label: cat.label, icon: cat.icon, total: 0, count: 0 };
    cats[cat.id].total += Math.abs(amount);
    cats[cat.id].count += 1;
  }
  return Object.values(cats).sort((a, b) => b.total - a.total);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/stats.js
git commit -m "feat: add stats module for monthly/category aggregations"
```

### Task 3: Add new API endpoints to server.js

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Add imports at top of server.js**

After the existing imports, add:

```js
import { getAccounts } from './src/openbanking-yapily.js';
import {
  savePushToken, getPushToken, getUserSettings, saveUserSettings,
  getUserConsents, addUserConsent, removeUserConsent,
} from './src/storage.js';
import { computeMonthlyStats, computeCategoryTotals } from './src/stats.js';
```

- [ ] **Step 2: Add new endpoints before the fallback route**

Add these endpoints before `app.get('*', ...)`:

```js
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
```

- [ ] **Step 3: Run server to verify it starts**

```bash
cd repos/autobank && node server.js
```
Expected: Server starts without errors on port 3000.

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "feat: add accounts, settings, stats, push-token, multi-consent endpoints"
```

### Task 4: Create notifications module

**Files:**
- Create: `src/notifications.js`

- [ ] **Step 1: Write notifications.js**

```js
// src/notifications.js
// Expo Push API sender

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function sendPushNotification(expoPushToken, { title, body, data = {} }) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data,
  };

  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });

  return res.json();
}

export async function sendPushToMany(tokens, notification) {
  const messages = tokens.map(token => ({
    to: token,
    sound: 'default',
    ...notification,
  }));

  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });

  return res.json();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/notifications.js
git commit -m "feat: add Expo push notification sender"
```

### Task 5: Create polling job for new transactions & budget alerts

**Files:**
- Create: `src/polling.js`

- [ ] **Step 1: Write polling.js**

```js
// src/polling.js
// Polling job: checks for new transactions, sends push notifications
import { getAccounts, getAccountTransactions } from './openbanking-yapily.js';
import { categorizeTransaction } from './categorizer.js';
import { sendPushNotification } from './notifications.js';
import {
  getAllPushTokens, getSeenTransactionIds, saveSeenTransactionIds,
  getUserSettings,
} from './storage.js';

const POLL_INTERVAL = 15 * 60 * 1000; // 15 minutes

export function startPolling(authFn) {
  console.log('📡 Polling transazioni avviato (ogni 15 min)');

  async function poll() {
    try {
      const authConfig = authFn();
      if (!authConfig.consentToken || authConfig.consentToken === 'IL_TUO_CONSENT_TOKEN_DI_TEST') return;

      const accounts = await getAccounts(authConfig);
      const pushTokens = getAllPushTokens();

      for (const account of accounts) {
        const accountId = account.id || account.accountId;
        const raw = await getAccountTransactions(accountId, authConfig);
        const txList = raw.booked || [];

        // Check for new transactions
        for (const [userId, pushToken] of Object.entries(pushTokens)) {
          const seenIds = getSeenTransactionIds(userId);
          const newTxs = txList.filter(tx => {
            const txId = tx.transactionId || tx.id;
            return txId && !seenIds.includes(txId);
          });

          if (newTxs.length > 0) {
            // Send push for each new transaction
            const settings = getUserSettings(userId);
            if (settings.notifications?.realtime !== false) {
              for (const tx of newTxs.slice(0, 5)) {
                const amount = tx.transactionAmount?.amount || '0';
                const currency = tx.transactionAmount?.currency || 'EUR';
                const cat = categorizeTransaction(tx);
                const desc = tx.remittanceInformationUnstructured || tx.creditorName || 'Transazione';
                await sendPushNotification(pushToken, {
                  title: `${parseFloat(amount) < 0 ? 'Spesa' : 'Entrata'}: ${amount} ${currency}`,
                  body: `${desc} (${cat.label})`,
                  data: { type: 'transaction', accountId, transactionId: tx.transactionId },
                });
              }
            }

            // Budget alert check
            if (settings.notifications?.budgetAlerts !== false && settings.budgets) {
              const allTxs = txList.map(tx => ({ ...tx, category: categorizeTransaction(tx) }));
              const catTotals = {};
              for (const tx of allTxs) {
                const amt = Math.abs(parseFloat(tx.transactionAmount?.amount || '0'));
                if (!catTotals[tx.category.id]) catTotals[tx.category.id] = 0;
                catTotals[tx.category.id] += amt;
              }
              for (const [catId, limit] of Object.entries(settings.budgets)) {
                if (limit > 0 && catTotals[catId] > limit) {
                  await sendPushNotification(pushToken, {
                    title: 'Soglia budget superata!',
                    body: `${catId}: ${catTotals[catId].toFixed(2)}/${limit} EUR`,
                    data: { type: 'budget_alert', category: catId },
                  });
                }
              }
            }

            // Mark as seen
            const allIds = txList.map(tx => tx.transactionId || tx.id).filter(Boolean);
            saveSeenTransactionIds(userId, allIds);
          }
        }
      }
    } catch (e) {
      console.error('Polling error:', e.message);
    }
  }

  setInterval(poll, POLL_INTERVAL);
  // First poll after 30 seconds (let server start)
  setTimeout(poll, 30_000);
}
```

- [ ] **Step 2: Wire polling into server.js**

Add at the end of server.js, right before `app.listen(...)`:

```js
import { startPolling } from './src/polling.js';
// Start polling after server boot
startPolling(auth);
```

- [ ] **Step 3: Commit**

```bash
git add src/polling.js server.js
git commit -m "feat: add transaction polling job with push notifications and budget alerts"
```

### Task 6: Add Railway deploy config

**Files:**
- Create: `railway.json`
- Create: `Procfile`
- Modify: `package.json`

- [ ] **Step 1: Create railway.json**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "node server.js",
    "healthcheckPath": "/api/institutions?country=IT",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

- [ ] **Step 2: Create Procfile**

```
web: node server.js
```

- [ ] **Step 3: Add .gitignore for data dir sensitive files**

Add to existing `.gitignore` (or create it):

```
node_modules/
data/*.json
.env
```

- [ ] **Step 4: Commit**

```bash
git add railway.json Procfile .gitignore
git commit -m "feat: add Railway deploy config"
```

---

## Chunk 2: Expo Project Setup & Theme

### Task 7: Initialize Expo project

**Files:**
- Create: `mobile/` (entire Expo project)

- [ ] **Step 1: Create Expo project with Expo Router template**

```bash
cd repos/autobank
npx create-expo-app@latest mobile --template tabs
```

- [ ] **Step 2: Install dependencies**

```bash
cd repos/autobank/mobile
npx expo install expo-notifications expo-web-browser expo-linking expo-secure-store
npm install zustand victory-native react-native-svg
```

- [ ] **Step 3: Commit**

```bash
cd repos/autobank
git add mobile/
git commit -m "feat: initialize Expo project with dependencies"
```

### Task 8: Create theme and utility files

**Files:**
- Create: `mobile/theme/index.ts`
- Create: `mobile/utils/format.ts`
- Create: `mobile/utils/colors.ts`

- [ ] **Step 1: Write theme/index.ts**

```ts
// mobile/theme/index.ts
export const theme = {
  colors: {
    bg: '#0f1419',
    surface: '#1a2332',
    surfaceHover: '#243044',
    text: '#e6edf3',
    textMuted: '#8b949e',
    accent: '#3fb950',
    accentDim: '#238636',
    danger: '#f85149',
    border: '#30363d',
  },
  fonts: {
    regular: 'System',
    mono: 'Courier',
  },
  radius: 12,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
} as const;

export type Theme = typeof theme;
```

- [ ] **Step 2: Write utils/format.ts**

```ts
// mobile/utils/format.ts
export function formatAmount(amount: number | string, currency = 'EUR'): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return '0,00 €';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
  }).format(n);
}

export function formatDate(str: string | undefined): string {
  if (!str) return '-';
  const d = new Date(str);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateShort(str: string): string {
  const d = new Date(str);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}
```

- [ ] **Step 3: Write utils/colors.ts**

```ts
// mobile/utils/colors.ts
// Category colors for charts
export const categoryColors: Record<string, string> = {
  alimentari: '#3fb950',
  trasporti: '#58a6ff',
  abbigliamento: '#d2a8ff',
  casa: '#f0883e',
  salute: '#f85149',
  svago: '#db61a2',
  tecnologia: '#79c0ff',
  bancomat: '#8b949e',
  trasferimento: '#56d364',
  altro: '#484f58',
};

export function getCategoryColor(categoryId: string): string {
  return categoryColors[categoryId] || categoryColors.altro;
}
```

- [ ] **Step 4: Commit**

```bash
git add mobile/theme/ mobile/utils/
git commit -m "feat: add theme, format utils, category colors"
```

### Task 9: Create API service

**Files:**
- Create: `mobile/services/api.ts`

- [ ] **Step 1: Write api.ts**

```ts
// mobile/services/api.ts
// API client for the Express backend

// In dev: use local IP. In prod: use Railway URL.
// Set this via app.json extra or env.
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

// Institutions
export const getInstitutions = (country = 'IT') =>
  request<any[]>(`/institutions?country=${country}`);

// Requisitions (consent creation)
export const createRequisition = (institutionId: string) =>
  request<{ id: string; link: string }>('/requisitions', {
    method: 'POST',
    body: JSON.stringify({ institutionId }),
  });

// Consent callback exchange
export const exchangeConsentCode = (code: string, state: string) =>
  request<{ consentToken: string; status: string }>(`/consent-callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);

// Accounts
export const getAccounts = () =>
  request<any[]>('/accounts');

export const getAccountDetails = (id: string) =>
  request<any>(`/accounts/${id}/details`);

export const getAccountBalances = (id: string) =>
  request<any>(`/accounts/${id}/balances`);

export const getAccountTransactions = (id: string) =>
  request<any>(`/accounts/${id}/transactions`);

export const getAccountStats = (id: string) =>
  request<{ daily: any[]; categories: any[] }>(`/accounts/${id}/stats/monthly`);

// Dashboard
export const getDashboard = (requisitionId: string) =>
  request<any>(`/dashboard/${requisitionId}`);

// User settings
export const getUserSettings = (userId: string) =>
  request<any>(`/user/${userId}/settings`);

export const updateUserSettings = (userId: string, settings: any) =>
  request<any>(`/user/${userId}/settings`, {
    method: 'PUT',
    body: JSON.stringify(settings),
  });

// Push token
export const registerPushToken = (userId: string, token: string) =>
  request<{ ok: boolean }>('/register-push-token', {
    method: 'POST',
    body: JSON.stringify({ userId, token }),
  });

// Multi-account consents
export const getUserConsents = (userId: string) =>
  request<any[]>(`/user/${userId}/consents`);

export const addUserConsent = (userId: string, consent: { consentToken: string; institutionId: string; institutionName: string }) =>
  request<any[]>(`/user/${userId}/consents`, {
    method: 'POST',
    body: JSON.stringify(consent),
  });

export const removeUserConsent = (userId: string, consentToken: string) =>
  request<{ ok: boolean }>(`/user/${userId}/consents/${consentToken}`, { method: 'DELETE' });
```

- [ ] **Step 2: Commit**

```bash
git add mobile/services/
git commit -m "feat: add API service client for mobile app"
```

---

## Chunk 3: Zustand Stores

### Task 10: Create auth store

**Files:**
- Create: `mobile/store/useAuthStore.ts`

- [ ] **Step 1: Write useAuthStore.ts**

```ts
// mobile/store/useAuthStore.ts
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  userId: string;
  consentToken: string | null;
  isOnboarded: boolean;
  setConsentToken: (token: string) => void;
  logout: () => void;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: 'user-123',
  consentToken: null,
  isOnboarded: false,

  setConsentToken: async (token: string) => {
    await SecureStore.setItemAsync('consentToken', token);
    set({ consentToken: token, isOnboarded: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('consentToken');
    set({ consentToken: null, isOnboarded: false });
  },

  loadFromStorage: async () => {
    const token = await SecureStore.getItemAsync('consentToken');
    if (token) {
      set({ consentToken: token, isOnboarded: true });
    }
  },
}));
```

- [ ] **Step 2: Commit**

```bash
git add mobile/store/useAuthStore.ts
git commit -m "feat: add auth store with SecureStore persistence"
```

### Task 11: Create transaction store

**Files:**
- Create: `mobile/store/useTransactionStore.ts`

- [ ] **Step 1: Write useTransactionStore.ts**

```ts
// mobile/store/useTransactionStore.ts
import { create } from 'zustand';
import * as api from '../services/api';

interface Transaction {
  transactionId?: string;
  id?: string;
  bookingDate?: string;
  valueDate?: string;
  transactionAmount?: { amount: string; currency: string };
  remittanceInformationUnstructured?: string;
  creditorName?: string;
  debtorName?: string;
  category?: { id: string; label: string; icon: string };
}

interface Account {
  id: string;
  accountId?: string;
  type?: string;
  currency?: string;
  [key: string]: any;
}

interface TransactionState {
  accounts: Account[];
  transactions: Record<string, Transaction[]>;
  balances: Record<string, any>;
  stats: Record<string, { daily: any[]; categories: any[] }>;
  loading: boolean;
  error: string | null;
  fetchAccounts: () => Promise<void>;
  fetchTransactions: (accountId: string) => Promise<void>;
  fetchBalances: (accountId: string) => Promise<void>;
  fetchStats: (accountId: string) => Promise<void>;
  fetchAll: () => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  accounts: [],
  transactions: {},
  balances: {},
  stats: {},
  loading: false,
  error: null,

  fetchAccounts: async () => {
    set({ loading: true, error: null });
    try {
      const accounts = await api.getAccounts();
      set({ accounts, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchTransactions: async (accountId: string) => {
    try {
      const data = await api.getAccountTransactions(accountId);
      const txs = data.transactions?.booked || data.booked || [];
      set(s => ({ transactions: { ...s.transactions, [accountId]: txs } }));
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchBalances: async (accountId: string) => {
    try {
      const data = await api.getAccountBalances(accountId);
      set(s => ({ balances: { ...s.balances, [accountId]: data } }));
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchStats: async (accountId: string) => {
    try {
      const data = await api.getAccountStats(accountId);
      set(s => ({ stats: { ...s.stats, [accountId]: data } }));
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const accounts = await api.getAccounts();
      set({ accounts });
      await Promise.all(accounts.map(async (acc: Account) => {
        const id = acc.id || acc.accountId!;
        await Promise.all([
          get().fetchTransactions(id),
          get().fetchBalances(id),
          get().fetchStats(id),
        ]);
      }));
      set({ loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },
}));
```

- [ ] **Step 2: Commit**

```bash
git add mobile/store/useTransactionStore.ts
git commit -m "feat: add transaction store with accounts, balances, stats"
```

### Task 12: Create settings store

**Files:**
- Create: `mobile/store/useSettingsStore.ts`

- [ ] **Step 1: Write useSettingsStore.ts**

```ts
// mobile/store/useSettingsStore.ts
import { create } from 'zustand';
import * as api from '../services/api';

interface SettingsState {
  budgets: Record<string, number>;
  notifications: { realtime: boolean; reports: 'daily' | 'weekly' | 'off'; budgetAlerts: boolean };
  loading: boolean;
  fetch: (userId: string) => Promise<void>;
  update: (userId: string, settings: Partial<SettingsState>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  budgets: {},
  notifications: { realtime: true, reports: 'weekly', budgetAlerts: true },
  loading: false,

  fetch: async (userId: string) => {
    set({ loading: true });
    const data = await api.getUserSettings(userId);
    set({ budgets: data.budgets || {}, notifications: data.notifications || { realtime: true, reports: 'weekly', budgetAlerts: true }, loading: false });
  },

  update: async (userId: string, settings) => {
    const updated = await api.updateUserSettings(userId, settings);
    set({ budgets: updated.budgets || {}, notifications: updated.notifications });
  },
}));
```

- [ ] **Step 2: Commit**

```bash
git add mobile/store/useSettingsStore.ts
git commit -m "feat: add settings store for budgets and notification prefs"
```

---

## Chunk 4: App Layout & Onboarding

### Task 13: Create root layout with Expo Router

**Files:**
- Create: `mobile/app/_layout.tsx`

- [ ] **Step 1: Write _layout.tsx**

```tsx
// mobile/app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../store/useAuthStore';
import { theme } from '../theme';

export default function RootLayout() {
  const loadFromStorage = useAuthStore(s => s.loadFromStorage);

  useEffect(() => { loadFromStorage(); }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.bg },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: theme.colors.bg },
        }}
      >
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: 'Impostazioni', presentation: 'modal' }} />
        <Stack.Screen name="account/[id]" options={{ title: 'Dettaglio Conto' }} />
      </Stack>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/app/_layout.tsx
git commit -m "feat: add root layout with navigation stack"
```

### Task 14: Create tab layout

**Files:**
- Create: `mobile/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Write tabs _layout.tsx**

```tsx
// mobile/app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 30,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        headerStyle: { backgroundColor: theme.colors.bg },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Ionicons name="pie-chart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Movimenti',
          tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Conti',
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profilo',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/app/\(tabs\)/_layout.tsx
git commit -m "feat: add bottom tab navigation layout"
```

### Task 15: Create onboarding screen

**Files:**
- Create: `mobile/app/onboarding.tsx`
- Create: `mobile/components/BankPicker.tsx`

- [ ] **Step 1: Write BankPicker.tsx**

```tsx
// mobile/components/BankPicker.tsx
import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { getInstitutions } from '../services/api';
import { theme } from '../theme';

interface Props {
  country: string;
  onSelect: (bank: { id: string; name: string }) => void;
  selected: string | null;
}

export function BankPicker({ country, onSelect, selected }: Props) {
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getInstitutions(country)
      .then(setBanks)
      .catch(() => setBanks([]))
      .finally(() => setLoading(false));
  }, [country]);

  if (loading) return <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 20 }} />;

  return (
    <FlatList
      data={banks}
      keyExtractor={(item) => item.id}
      style={styles.list}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.item, selected === item.id && styles.selected]}
          onPress={() => onSelect({ id: item.id, name: item.name || item.fullName || item.id })}
        >
          <Text style={[styles.name, selected === item.id && styles.selectedText]}>
            {item.name || item.fullName || item.id}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 300 },
  item: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.surfaceHover,
  },
  name: { color: theme.colors.text, fontSize: 15, fontWeight: '500' },
  selectedText: { color: theme.colors.accent },
});
```

- [ ] **Step 2: Write onboarding.tsx**

```tsx
// mobile/app/onboarding.tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';
import { createRequisition, exchangeConsentCode } from '../services/api';
import { BankPicker } from '../components/BankPicker';
import { theme } from '../theme';

const COUNTRIES = [
  { code: 'IT', label: 'Italia' },
  { code: 'GB', label: 'UK' },
  { code: 'DE', label: 'Germania' },
  { code: 'FR', label: 'Francia' },
];

export default function OnboardingScreen() {
  const [country, setCountry] = useState('IT');
  const [selectedBank, setSelectedBank] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setConsentToken = useAuthStore(s => s.setConsentToken);
  const router = useRouter();

  const handleConnect = async () => {
    if (!selectedBank) return;
    setLoading(true);
    setError('');

    try {
      const { link } = await createRequisition(selectedBank.id);

      // Open bank auth in system browser
      const result = await WebBrowser.openAuthSessionAsync(
        link,
        Linking.createURL('callback')
      );

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');

        if (code && state) {
          const { consentToken } = await exchangeConsentCode(code, state);
          await setConsentToken(consentToken);
          router.replace('/(tabs)');
        } else {
          setError('Nessun codice ricevuto dalla banca.');
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>autobank</Text>
        <Text style={styles.subtitle}>Collega la tua banca per iniziare</Text>

        <Text style={styles.label}>Paese</Text>
        <View style={styles.countryRow}>
          {COUNTRIES.map(c => (
            <TouchableOpacity
              key={c.code}
              style={[styles.countryBtn, country === c.code && styles.countryActive]}
              onPress={() => { setCountry(c.code); setSelectedBank(null); }}
            >
              <Text style={[styles.countryText, country === c.code && styles.countryActiveText]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Banca</Text>
        <BankPicker country={country} onSelect={setSelectedBank} selected={selectedBank?.id || null} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, (!selectedBank || loading) && styles.btnDisabled]}
          onPress={handleConnect}
          disabled={!selectedBank || loading}
        >
          <Text style={styles.btnText}>{loading ? 'Collegamento...' : 'Collega banca'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { flex: 1, padding: 24, paddingTop: 60 },
  logo: { fontSize: 32, fontWeight: '700', color: theme.colors.accent, textAlign: 'center' },
  subtitle: { fontSize: 15, color: theme.colors.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 32 },
  label: { fontSize: 13, color: theme.colors.textMuted, fontWeight: '500', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  countryRow: { flexDirection: 'row', gap: 8 },
  countryBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  countryActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.surfaceHover },
  countryText: { color: theme.colors.textMuted, fontWeight: '500' },
  countryActiveText: { color: theme.colors.accent },
  btn: { marginTop: 24, backgroundColor: theme.colors.accent, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: theme.colors.bg, fontWeight: '700', fontSize: 16 },
  error: { color: theme.colors.danger, marginTop: 12, textAlign: 'center' },
});
```

- [ ] **Step 3: Commit**

```bash
git add mobile/components/BankPicker.tsx mobile/app/onboarding.tsx
git commit -m "feat: add onboarding screen with bank picker and OAuth flow"
```

---

## Chunk 5: Dashboard Screen

### Task 16: Create shared components

**Files:**
- Create: `mobile/components/SummaryCard.tsx`
- Create: `mobile/components/TransactionItem.tsx`

- [ ] **Step 1: Write SummaryCard.tsx**

```tsx
// mobile/components/SummaryCard.tsx
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { formatAmount } from '../utils/format';

interface Props {
  label: string;
  value: number;
  currency?: string;
  type?: 'neutral' | 'positive' | 'negative';
}

export function SummaryCard({ label, value, currency = 'EUR', type = 'neutral' }: Props) {
  const color = type === 'positive' ? theme.colors.accent
    : type === 'negative' ? theme.colors.danger
    : theme.colors.text;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]}>
        {typeof value === 'number' ? formatAmount(value, currency) : value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  label: { fontSize: 11, color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 18, fontWeight: '700', marginTop: 4 },
});
```

- [ ] **Step 2: Write TransactionItem.tsx**

```tsx
// mobile/components/TransactionItem.tsx
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { formatAmount, formatDate } from '../utils/format';

interface Props {
  description: string;
  amount: number;
  currency?: string;
  date?: string;
  categoryLabel?: string;
  categoryIcon?: string;
}

export function TransactionItem({ description, amount, currency = 'EUR', date, categoryLabel, categoryIcon }: Props) {
  const isExpense = amount < 0;

  return (
    <View style={styles.row}>
      <Text style={styles.icon}>{categoryIcon || '📦'}</Text>
      <View style={styles.info}>
        <Text style={styles.desc} numberOfLines={1}>{description}</Text>
        <Text style={styles.meta}>{categoryLabel || 'Altro'} · {formatDate(date)}</Text>
      </View>
      <Text style={[styles.amount, { color: isExpense ? theme.colors.danger : theme.colors.accent }]}>
        {formatAmount(amount, currency)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  icon: { fontSize: 20, marginRight: 12 },
  info: { flex: 1 },
  desc: { color: theme.colors.text, fontSize: 14, fontWeight: '500' },
  meta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
```

- [ ] **Step 3: Commit**

```bash
git add mobile/components/SummaryCard.tsx mobile/components/TransactionItem.tsx
git commit -m "feat: add SummaryCard and TransactionItem components"
```

### Task 17: Create chart components

**Files:**
- Create: `mobile/components/CategoryChart.tsx`
- Create: `mobile/components/MonthlyChart.tsx`

- [ ] **Step 1: Write CategoryChart.tsx**

```tsx
// mobile/components/CategoryChart.tsx
import { View, Text, StyleSheet } from 'react-native';
import { VictoryPie } from 'victory-native';
import { theme } from '../theme';
import { getCategoryColor } from '../utils/colors';
import { formatAmount } from '../utils/format';

interface CategoryData {
  id: string;
  label: string;
  icon: string;
  total: number;
  count: number;
}

export function CategoryChart({ data, currency = 'EUR' }: { data: CategoryData[]; currency?: string }) {
  if (!data.length) return null;

  const chartData = data.slice(0, 6).map(c => ({
    x: c.icon,
    y: c.total,
    label: c.icon,
  }));

  const colors = data.slice(0, 6).map(c => getCategoryColor(c.id));

  return (
    <View style={styles.container}>
      <VictoryPie
        data={chartData}
        colorScale={colors}
        innerRadius={60}
        padAngle={2}
        labels={({ datum }) => datum.label}
        style={{ labels: { fontSize: 16 } }}
        width={220}
        height={220}
      />
      <View style={styles.legend}>
        {data.slice(0, 6).map(c => (
          <View key={c.id} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: getCategoryColor(c.id) }]} />
            <Text style={styles.legendLabel}>{c.label}</Text>
            <Text style={styles.legendValue}>{formatAmount(c.total, currency)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  legend: { width: '100%', marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendLabel: { flex: 1, color: theme.colors.text, fontSize: 13 },
  legendValue: { color: theme.colors.textMuted, fontSize: 13, fontVariant: ['tabular-nums'] },
});
```

- [ ] **Step 2: Write MonthlyChart.tsx**

```tsx
// mobile/components/MonthlyChart.tsx
import { View, Text, StyleSheet } from 'react-native';
import { VictoryLine, VictoryChart, VictoryAxis, VictoryArea } from 'victory-native';
import { theme } from '../theme';
import { formatDateShort } from '../utils/format';

interface DailyData { date: string; spent: number; income: number }

export function MonthlyChart({ data }: { data: DailyData[] }) {
  if (!data.length) return null;

  const last30 = data.slice(-30);

  return (
    <View style={styles.container}>
      <VictoryChart
        width={340}
        height={180}
        padding={{ top: 10, bottom: 30, left: 50, right: 10 }}
      >
        <VictoryAxis
          style={{
            axis: { stroke: theme.colors.border },
            tickLabels: { fill: theme.colors.textMuted, fontSize: 9 },
          }}
          tickFormat={(t: string) => formatDateShort(t)}
          tickCount={5}
        />
        <VictoryAxis
          dependentAxis
          style={{
            axis: { stroke: theme.colors.border },
            tickLabels: { fill: theme.colors.textMuted, fontSize: 9 },
            grid: { stroke: theme.colors.border, strokeDasharray: '4' },
          }}
        />
        <VictoryArea
          data={last30}
          x="date"
          y="spent"
          style={{
            data: { fill: 'rgba(248,81,73,0.15)', stroke: theme.colors.danger, strokeWidth: 2 },
          }}
        />
        <VictoryLine
          data={last30}
          x="date"
          y="income"
          style={{
            data: { stroke: theme.colors.accent, strokeWidth: 2, strokeDasharray: '6' },
          }}
        />
      </VictoryChart>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.line, { backgroundColor: theme.colors.danger }]} />
          <Text style={styles.legendText}>Spese</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.line, { backgroundColor: theme.colors.accent }]} />
          <Text style={styles.legendText}>Entrate</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  legendRow: { flexDirection: 'row', gap: 20, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  line: { width: 16, height: 3, borderRadius: 2 },
  legendText: { color: theme.colors.textMuted, fontSize: 12 },
});
```

- [ ] **Step 3: Commit**

```bash
git add mobile/components/CategoryChart.tsx mobile/components/MonthlyChart.tsx
git commit -m "feat: add CategoryChart (pie) and MonthlyChart (line) components"
```

### Task 18: Create Dashboard screen

**Files:**
- Create: `mobile/app/(tabs)/index.tsx`

- [ ] **Step 1: Write Dashboard screen**

```tsx
// mobile/app/(tabs)/index.tsx
import { useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { SummaryCard } from '../../components/SummaryCard';
import { CategoryChart } from '../../components/CategoryChart';
import { MonthlyChart } from '../../components/MonthlyChart';
import { TransactionItem } from '../../components/TransactionItem';
import { theme } from '../../theme';

export default function DashboardScreen() {
  const { isOnboarded } = useAuthStore();
  const { accounts, transactions, balances, stats, loading, fetchAll } = useTransactionStore();
  const router = useRouter();

  useEffect(() => {
    if (!isOnboarded) { router.replace('/onboarding'); return; }
    fetchAll();
  }, [isOnboarded]);

  // Aggregate across all accounts
  const allTxs = Object.values(transactions).flat();
  let totalSpent = 0, totalIncome = 0;
  for (const tx of allTxs) {
    const amt = parseFloat(tx.transactionAmount?.amount || '0');
    if (amt < 0) totalSpent += Math.abs(amt);
    else totalIncome += amt;
  }

  const allCategories = Object.values(stats).flatMap(s => s?.categories || []);
  const mergedCategories: Record<string, any> = {};
  for (const c of allCategories) {
    if (!mergedCategories[c.id]) mergedCategories[c.id] = { ...c };
    else { mergedCategories[c.id].total += c.total; mergedCategories[c.id].count += c.count; }
  }
  const categoryData = Object.values(mergedCategories).sort((a: any, b: any) => b.total - a.total);

  const allDaily = Object.values(stats).flatMap(s => s?.daily || []);
  const mergedDaily: Record<string, any> = {};
  for (const d of allDaily) {
    if (!mergedDaily[d.date]) mergedDaily[d.date] = { ...d };
    else { mergedDaily[d.date].spent += d.spent; mergedDaily[d.date].income += d.income; }
  }
  const dailyData = Object.values(mergedDaily).sort((a: any, b: any) => a.date.localeCompare(b.date));

  const recentTxs = allTxs
    .sort((a, b) => (b.bookingDate || '').localeCompare(a.bookingDate || ''))
    .slice(0, 5);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAll} tintColor={theme.colors.accent} />}
    >
      <Text style={styles.title}>Dashboard</Text>

      <View style={styles.summaryRow}>
        <SummaryCard label="Spese" value={totalSpent} type="negative" />
        <SummaryCard label="Entrate" value={totalIncome} type="positive" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Per categoria</Text>
        <CategoryChart data={categoryData} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Andamento mensile</Text>
        <MonthlyChart data={dailyData} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ultimi movimenti</Text>
        {recentTxs.map((tx, i) => (
          <TransactionItem
            key={tx.transactionId || tx.id || i}
            description={tx.remittanceInformationUnstructured || tx.creditorName || tx.debtorName || 'Transazione'}
            amount={parseFloat(tx.transactionAmount?.amount || '0')}
            currency={tx.transactionAmount?.currency}
            date={tx.bookingDate}
            categoryLabel={tx.category?.label}
            categoryIcon={tx.category?.icon}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', color: theme.colors.text, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border },
  cardTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginBottom: 12 },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/app/\(tabs\)/index.tsx
git commit -m "feat: add Dashboard screen with charts and summary"
```

---

## Chunk 6: Transactions & Accounts Screens

### Task 19: Create Transactions screen

**Files:**
- Create: `mobile/app/(tabs)/transactions.tsx`

- [ ] **Step 1: Write transactions.tsx**

```tsx
// mobile/app/(tabs)/transactions.tsx
import { useState, useMemo } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useTransactionStore } from '../../store/useTransactionStore';
import { TransactionItem } from '../../components/TransactionItem';
import { theme } from '../../theme';

const CATEGORY_FILTERS = [
  { id: 'all', label: 'Tutti' },
  { id: 'alimentari', label: '🛒' },
  { id: 'trasporti', label: '🚗' },
  { id: 'casa', label: '🏠' },
  { id: 'svago', label: '🎬' },
  { id: 'salute', label: '💊' },
  { id: 'tecnologia', label: '💻' },
  { id: 'abbigliamento', label: '👕' },
];

export default function TransactionsScreen() {
  const { transactions, loading, fetchAll } = useTransactionStore();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');

  const allTxs = Object.values(transactions).flat();

  const filtered = useMemo(() => {
    let list = allTxs.sort((a, b) => (b.bookingDate || '').localeCompare(a.bookingDate || ''));
    if (catFilter !== 'all') list = list.filter(tx => tx.category?.id === catFilter);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(tx => {
        const desc = (tx.remittanceInformationUnstructured || tx.creditorName || tx.debtorName || '').toLowerCase();
        return desc.includes(s);
      });
    }
    return list;
  }, [allTxs, catFilter, search]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Cerca movimenti..."
        placeholderTextColor={theme.colors.textMuted}
        value={search}
        onChangeText={setSearch}
      />
      <View style={styles.filters}>
        {CATEGORY_FILTERS.map(f => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterBtn, catFilter === f.id && styles.filterActive]}
            onPress={() => setCatFilter(f.id)}
          >
            <Text style={[styles.filterText, catFilter === f.id && styles.filterActiveText]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item, i) => item.transactionId || item.id || String(i)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAll} tintColor={theme.colors.accent} />}
        renderItem={({ item }) => (
          <TransactionItem
            description={item.remittanceInformationUnstructured || item.creditorName || item.debtorName || 'Transazione'}
            amount={parseFloat(item.transactionAmount?.amount || '0')}
            currency={item.transactionAmount?.currency}
            date={item.bookingDate}
            categoryLabel={item.category?.label}
            categoryIcon={item.category?.icon}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Nessun movimento trovato</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  search: { margin: 16, marginBottom: 8, padding: 12, borderRadius: 10, backgroundColor: theme.colors.surface, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border, fontSize: 14 },
  filters: { flexDirection: 'row', paddingHorizontal: 16, gap: 6, marginBottom: 8 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  filterActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  filterText: { color: theme.colors.textMuted, fontSize: 13 },
  filterActiveText: { color: theme.colors.bg },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  empty: { color: theme.colors.textMuted, textAlign: 'center', marginTop: 40 },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/app/\(tabs\)/transactions.tsx
git commit -m "feat: add Transactions screen with search and category filters"
```

### Task 20: Create Accounts screen

**Files:**
- Create: `mobile/app/(tabs)/accounts.tsx`
- Create: `mobile/app/account/[id].tsx`

- [ ] **Step 1: Write accounts.tsx**

```tsx
// mobile/app/(tabs)/accounts.tsx
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTransactionStore } from '../../store/useTransactionStore';
import { theme } from '../../theme';
import { formatAmount } from '../../utils/format';

export default function AccountsScreen() {
  const { accounts, balances, loading, fetchAll } = useTransactionStore();
  const router = useRouter();

  const getBalance = (accountId: string) => {
    const bal = balances[accountId];
    if (!bal) return null;
    const main = bal.mainBalanceAmount || bal.balances?.[0]?.balanceAmount;
    return main;
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id || item.accountId}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAll} tintColor={theme.colors.accent} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.title}>I tuoi conti</Text>}
        renderItem={({ item }) => {
          const id = item.id || item.accountId;
          const bal = getBalance(id);
          return (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/account/${id}`)}>
              <View style={styles.cardTop}>
                <Ionicons name="wallet" size={24} color={theme.colors.accent} />
                <View style={styles.cardInfo}>
                  <Text style={styles.bankName}>{item.institutionId || item.type || 'Conto'}</Text>
                  <Text style={styles.iban}>{item.iban || item.accountNumber || id}</Text>
                </View>
              </View>
              {bal && (
                <Text style={styles.balance}>{formatAmount(bal.amount, bal.currency)}</Text>
              )}
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/onboarding')}>
            <Ionicons name="add-circle-outline" size={22} color={theme.colors.accent} />
            <Text style={styles.addText}>Aggiungi conto</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={<Text style={styles.empty}>Nessun conto collegato</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  list: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', color: theme.colors.text, marginBottom: 20 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardInfo: { flex: 1 },
  bankName: { color: theme.colors.text, fontWeight: '600', fontSize: 15 },
  iban: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  balance: { fontSize: 22, fontWeight: '700', color: theme.colors.accent, marginTop: 12, fontVariant: ['tabular-nums'] },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, marginTop: 8 },
  addText: { color: theme.colors.accent, fontWeight: '600', fontSize: 15 },
  empty: { color: theme.colors.textMuted, textAlign: 'center', marginTop: 40 },
});
```

- [ ] **Step 2: Write account/[id].tsx**

```tsx
// mobile/app/account/[id].tsx
import { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTransactionStore } from '../../store/useTransactionStore';
import { TransactionItem } from '../../components/TransactionItem';
import { SummaryCard } from '../../components/SummaryCard';
import { theme } from '../../theme';
import { formatAmount } from '../../utils/format';

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transactions, balances, fetchTransactions, fetchBalances } = useTransactionStore();

  useEffect(() => {
    if (id) {
      fetchTransactions(id);
      fetchBalances(id);
    }
  }, [id]);

  const txs = (transactions[id!] || []).sort((a, b) => (b.bookingDate || '').localeCompare(a.bookingDate || ''));
  const bal = balances[id!];
  const balAmount = bal?.mainBalanceAmount || bal?.balances?.[0]?.balanceAmount;

  let spent = 0, income = 0;
  for (const tx of txs) {
    const amt = parseFloat(tx.transactionAmount?.amount || '0');
    if (amt < 0) spent += Math.abs(amt);
    else income += amt;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={txs}
        keyExtractor={(item, i) => item.transactionId || item.id || String(i)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            {balAmount && (
              <Text style={styles.mainBalance}>{formatAmount(balAmount.amount, balAmount.currency)}</Text>
            )}
            <View style={styles.summaryRow}>
              <SummaryCard label="Spese" value={spent} type="negative" />
              <SummaryCard label="Entrate" value={income} type="positive" />
            </View>
            <Text style={styles.sectionTitle}>Transazioni</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TransactionItem
            description={item.remittanceInformationUnstructured || item.creditorName || item.debtorName || 'Transazione'}
            amount={parseFloat(item.transactionAmount?.amount || '0')}
            currency={item.transactionAmount?.currency}
            date={item.bookingDate}
            categoryLabel={item.category?.label}
            categoryIcon={item.category?.icon}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  list: { padding: 16, paddingBottom: 40 },
  mainBalance: { fontSize: 36, fontWeight: '700', color: theme.colors.text, textAlign: 'center', marginVertical: 20, fontVariant: ['tabular-nums'] },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: theme.colors.text, marginBottom: 12 },
});
```

- [ ] **Step 3: Commit**

```bash
git add mobile/app/\(tabs\)/accounts.tsx mobile/app/account/\[id\].tsx
git commit -m "feat: add Accounts screen and account detail view"
```

---

## Chunk 7: Profile, Settings & Notifications

### Task 21: Create Profile screen

**Files:**
- Create: `mobile/app/(tabs)/profile.tsx`

- [ ] **Step 1: Write profile.tsx**

```tsx
// mobile/app/(tabs)/profile.tsx
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { theme } from '../../theme';

export default function ProfileScreen() {
  const { userId, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Logout', 'Vuoi scollegare tutti i conti e uscire?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Esci', style: 'destructive', onPress: () => { logout(); router.replace('/onboarding'); } },
    ]);
  };

  const menuItems = [
    { icon: 'settings-outline' as const, label: 'Impostazioni', onPress: () => router.push('/settings') },
    { icon: 'notifications-outline' as const, label: 'Notifiche', onPress: () => router.push('/settings') },
    { icon: 'information-circle-outline' as const, label: 'About', onPress: () => Alert.alert('Autobank', 'v1.0.0\nOpen Banking PSD2 con Yapily') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color={theme.colors.accent} />
        </View>
        <Text style={styles.userId}>{userId}</Text>
        <Text style={styles.subtitle}>Account collegato via Yapily</Text>

        <View style={styles.menu}>
          {menuItems.map((item, i) => (
            <TouchableOpacity key={i} style={styles.menuItem} onPress={item.onPress}>
              <Ionicons name={item.icon} size={22} color={theme.colors.text} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
          <Text style={styles.logoutText}>Esci</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { flex: 1, padding: 24, alignItems: 'center', paddingTop: 40 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.colors.accent },
  userId: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginTop: 16 },
  subtitle: { color: theme.colors.textMuted, fontSize: 13, marginTop: 4 },
  menu: { width: '100%', marginTop: 32, backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 12 },
  menuLabel: { flex: 1, color: theme.colors.text, fontSize: 15 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 32, padding: 16 },
  logoutText: { color: theme.colors.danger, fontWeight: '600', fontSize: 15 },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/app/\(tabs\)/profile.tsx
git commit -m "feat: add Profile screen with menu and logout"
```

### Task 22: Create Settings screen

**Files:**
- Create: `mobile/app/settings.tsx`
- Create: `mobile/components/BudgetSlider.tsx`

- [ ] **Step 1: Write BudgetSlider.tsx**

```tsx
// mobile/components/BudgetSlider.tsx
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { theme } from '../theme';
import { formatAmount } from '../utils/format';

interface Props {
  label: string;
  icon: string;
  value: number;
  onValueChange: (val: number) => void;
}

export function BudgetSlider({ label, icon, value, onValueChange }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value > 0 ? formatAmount(value) : 'Nessun limite'}</Text>
      </View>
      <Slider
        minimumValue={0}
        maximumValue={1000}
        step={25}
        value={value}
        onValueChange={onValueChange}
        minimumTrackTintColor={theme.colors.accent}
        maximumTrackTintColor={theme.colors.border}
        thumbTintColor={theme.colors.accent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  icon: { fontSize: 18, marginRight: 8 },
  label: { flex: 1, color: theme.colors.text, fontSize: 14, fontWeight: '500' },
  value: { color: theme.colors.textMuted, fontSize: 13, fontVariant: ['tabular-nums'] },
});
```

- [ ] **Step 2: Write settings.tsx**

```tsx
// mobile/app/settings.tsx
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { BudgetSlider } from '../components/BudgetSlider';
import { theme } from '../theme';

const CATEGORIES = [
  { id: 'alimentari', label: 'Alimentari', icon: '🛒' },
  { id: 'trasporti', label: 'Trasporti', icon: '🚗' },
  { id: 'abbigliamento', label: 'Abbigliamento', icon: '👕' },
  { id: 'casa', label: 'Casa & Utenze', icon: '🏠' },
  { id: 'salute', label: 'Salute', icon: '💊' },
  { id: 'svago', label: 'Svago', icon: '🎬' },
  { id: 'tecnologia', label: 'Tecnologia', icon: '💻' },
];

const REPORT_OPTIONS = [
  { value: 'daily', label: 'Giornaliero' },
  { value: 'weekly', label: 'Settimanale' },
  { value: 'off', label: 'Disattivato' },
] as const;

export default function SettingsScreen() {
  const { userId } = useAuthStore();
  const { budgets, notifications, fetch, update } = useSettingsStore();
  const [localBudgets, setLocalBudgets] = useState<Record<string, number>>({});
  const [localNotif, setLocalNotif] = useState(notifications);

  useEffect(() => { fetch(userId); }, []);
  useEffect(() => { setLocalBudgets(budgets); setLocalNotif(notifications); }, [budgets, notifications]);

  const save = () => {
    update(userId, { budgets: localBudgets, notifications: localNotif });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.section}>Notifiche</Text>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Transazioni in tempo reale</Text>
          <Switch
            value={localNotif.realtime}
            onValueChange={v => setLocalNotif(n => ({ ...n, realtime: v }))}
            trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Alert soglie budget</Text>
          <Switch
            value={localNotif.budgetAlerts}
            onValueChange={v => setLocalNotif(n => ({ ...n, budgetAlerts: v }))}
            trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
          />
        </View>
        <Text style={styles.subLabel}>Report periodico</Text>
        <View style={styles.radioRow}>
          {REPORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.radioBtn, localNotif.reports === opt.value && styles.radioActive]}
              onPress={() => setLocalNotif(n => ({ ...n, reports: opt.value }))}
            >
              <Text style={[styles.radioText, localNotif.reports === opt.value && styles.radioActiveText]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.section}>Soglie budget mensile</Text>
      <View style={styles.card}>
        {CATEGORIES.map(cat => (
          <BudgetSlider
            key={cat.id}
            label={cat.label}
            icon={cat.icon}
            value={localBudgets[cat.id] || 0}
            onValueChange={v => setLocalBudgets(b => ({ ...b, [cat.id]: v }))}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={save}>
        <Text style={styles.saveBtnText}>Salva impostazioni</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  section: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 20, marginBottom: 10 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.colors.border },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  switchLabel: { color: theme.colors.text, fontSize: 15 },
  subLabel: { color: theme.colors.textMuted, fontSize: 13, marginTop: 12, marginBottom: 8 },
  radioRow: { flexDirection: 'row', gap: 8 },
  radioBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border },
  radioActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.surfaceHover },
  radioText: { color: theme.colors.textMuted, fontSize: 13 },
  radioActiveText: { color: theme.colors.accent },
  saveBtn: { backgroundColor: theme.colors.accent, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: theme.colors.bg, fontWeight: '700', fontSize: 16 },
});
```

- [ ] **Step 3: Install slider dependency**

```bash
cd repos/autobank/mobile
npx expo install @react-native-community/slider
```

- [ ] **Step 4: Commit**

```bash
git add mobile/components/BudgetSlider.tsx mobile/app/settings.tsx
git commit -m "feat: add Settings screen with budget sliders and notification toggles"
```

### Task 23: Create push notification hook

**Files:**
- Create: `mobile/hooks/useNotifications.ts`

- [ ] **Step 1: Write useNotifications.ts**

```ts
// mobile/hooks/useNotifications.ts
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { registerPushToken } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowInForeground: true,
  }),
});

export function useNotifications() {
  const { userId } = useAuthStore();
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) registerPushToken(userId, token).catch(console.error);
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
    });

    return () => {
      if (notificationListener.current) Notifications.removeNotificationSubscription(notificationListener.current);
      if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [userId]);
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}
```

- [ ] **Step 2: Install expo-device**

```bash
cd repos/autobank/mobile
npx expo install expo-device
```

- [ ] **Step 3: Wire useNotifications into root layout**

Add to `mobile/app/_layout.tsx`, inside the `RootLayout` component:

```tsx
import { useNotifications } from '../hooks/useNotifications';

// Inside RootLayout function, after useEffect:
useNotifications();
```

- [ ] **Step 4: Commit**

```bash
git add mobile/hooks/useNotifications.ts mobile/app/_layout.tsx
git commit -m "feat: add push notifications setup and registration"
```

---

## Chunk 8: App Configuration & Final Wiring

### Task 24: Configure app.json for Expo

**Files:**
- Modify: `mobile/app.json`

- [ ] **Step 1: Update app.json**

```json
{
  "expo": {
    "name": "Autobank",
    "slug": "autobank",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "scheme": "autobank",
    "splash": {
      "backgroundColor": "#0f1419"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.autobank.app",
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#0f1419"
      },
      "package": "com.autobank.app"
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/icon.png",
          "color": "#3fb950"
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

- [ ] **Step 2: Set API URL env var**

Create `mobile/.env`:

```
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3000/api
```

- [ ] **Step 3: Commit**

```bash
git add mobile/app.json mobile/.env
git commit -m "feat: configure app.json with dark theme, notifications, and scheme"
```

### Task 25: Add .gitignore for mobile

**Files:**
- Create: `mobile/.gitignore`

- [ ] **Step 1: Write .gitignore**

```
node_modules/
.expo/
dist/
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*
web-build/
.env.local
```

- [ ] **Step 2: Commit**

```bash
git add mobile/.gitignore
git commit -m "chore: add mobile .gitignore"
```

### Task 26: Final integration test

- [ ] **Step 1: Start backend**

```bash
cd repos/autobank && npm run dev
```

- [ ] **Step 2: Start Expo app**

In a new terminal:

```bash
cd repos/autobank/mobile && npx expo start
```

- [ ] **Step 3: Test on iPhone via Expo Go**

Scan the QR code with Expo Go app. Verify:
- Onboarding screen shows if no consent token
- Bank list loads from API
- OAuth flow opens in browser
- Dashboard shows after connecting
- Transactions list with search/filter
- Accounts list
- Profile + Settings screens
- Pull-to-refresh works

- [ ] **Step 4: Final commit**

```bash
cd repos/autobank
git add -A
git commit -m "feat: complete Autobank iOS app with Expo"
```

---

## Chunk 9: Railway Deploy

### Task 27: Deploy backend to Railway

- [ ] **Step 1: Install Railway CLI (if not installed)**

```bash
brew install railway
```

- [ ] **Step 2: Login and init project**

```bash
cd repos/autobank
railway login
railway init
```

- [ ] **Step 3: Set environment variables**

```bash
railway variables set YAPILY_APPLICATION_UUID=bcd7b99f-cb01-418d-84ac-96c5701be175
railway variables set YAPILY_APPLICATION_SECRET=Pn0uhuU6728FkT9kmoFW0KgSEKNfmVkZ
railway variables set YAPILY_API_BASE=https://api.yapily.com
railway variables set YAPILY_CONSENT_TOKEN=IL_TUO_TOKEN
railway variables set PORT=3000
```

- [ ] **Step 4: Deploy**

```bash
railway up
```

- [ ] **Step 5: Get the public URL and update mobile .env**

```bash
railway domain
```

Update `mobile/.env`:

```
EXPO_PUBLIC_API_URL=https://YOUR-APP.up.railway.app/api
```

- [ ] **Step 6: Commit**

```bash
git add mobile/.env
git commit -m "feat: point mobile app to Railway deployed backend"
```
