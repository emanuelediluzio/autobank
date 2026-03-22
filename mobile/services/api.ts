// mobile/services/api.ts
// API client for the Express backend

// In dev: use local IP. In prod: use Railway URL.
// Set this via app.json extra or env.
// Expo injects EXPO_PUBLIC_ vars at build time
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://autobank-74kt.onrender.com/api';

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
