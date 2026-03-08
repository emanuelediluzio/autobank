/**
 * Client GoCardless Bank Account Data API (PSD2 Open Banking)
 * Docs: https://developer.gocardless.com/bank-account-data/
 */

const API_BASE = 'https://bankaccountdata.gocardless.com/api/v2';

let accessToken = null;
let accessExpiresAt = 0;
let refreshToken = null;

/**
 * Ottiene un nuovo refresh token da secret_id e secret_key
 */
export async function getRefreshToken(secretId, secretKey) {
  const res = await fetch(`${API_BASE}/token/new/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ secret_id: secretId, secret_key: secretKey }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Token error: ${res.status}`);
  }
  const data = await res.json();
  refreshToken = data.refresh;
  return data;
}

/**
 * Aggiorna l'access token usando il refresh token
 */
export async function refreshAccessToken(refresh) {
  const res = await fetch(`${API_BASE}/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ refresh: refresh || refreshToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Refresh error: ${res.status}`);
  }
  const data = await res.json();
  accessToken = data.access;
  accessExpiresAt = Date.now() + (data.access_expires || 86400) * 1000;
  return data.access;
}

/**
 * Assicura di avere un access token valido (con margine di 5 min)
 */
async function ensureAccessToken(secretId, secretKey) {
  if (accessToken && accessExpiresAt > Date.now() + 300000) {
    return accessToken;
  }
  if (refreshToken && accessExpiresAt > Date.now()) {
    try {
      return await refreshAccessToken();
    } catch {
      refreshToken = null;
    }
  }
  if (secretId && secretKey) {
    await getRefreshToken(secretId, secretKey);
    return await refreshAccessToken();
  }
  throw new Error('Token non disponibile. Configura GOCARDLESS_SECRET_ID e GOCARDLESS_SECRET_KEY.');
}

/**
 * Esegue una richiesta autenticata all'API
 */
async function apiRequest(path, options = {}, auth = {}) {
  const token = await ensureAccessToken(auth.secretId, auth.secretKey);
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      accept: 'application/json',
      ...options.headers,
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(data.detail || data.summary || `API error: ${res.status}`);
  }
  return data;
}

/**
 * Lista banche disponibili per un paese
 * @param {string} country - Codice ISO 3166 (es. IT, GB)
 */
export async function getInstitutions(country = 'IT', auth = {}) {
  return apiRequest(`/institutions/?country=${country}`, {}, auth);
}

/**
 * Crea un nuovo requisition (link per collegare la banca)
 * @param {object} params
 * @param {string} params.redirect - URL di redirect dopo auth
 * @param {string} params.institutionId - ID banca (es. SANDBOXFINANCE_SFIN0000 per sandbox)
 * @param {string} [params.reference] - ID interno utente
 * @param {string} [params.agreement] - ID agreement (opzionale)
 */
export async function createRequisition(params, auth = {}) {
  const body = {
    redirect: params.redirect,
    institution_id: params.institutionId,
    reference: params.reference || crypto.randomUUID(),
    user_language: params.userLanguage || 'IT',
  };
  if (params.agreement) body.agreement = params.agreement;
  return apiRequest('/requisitions/', { method: 'POST', body: JSON.stringify(body) }, auth);
}

/**
 * Recupera requisition e lista account collegati
 */
export async function getRequisition(requisitionId, auth = {}) {
  return apiRequest(`/requisitions/${requisitionId}/`, {}, auth);
}

/**
 * Dettagli account (IBAN, holder, ecc.)
 */
export async function getAccountDetails(accountId, auth = {}) {
  return apiRequest(`/accounts/${accountId}/details/`, {}, auth);
}

/**
 * Saldo account
 */
export async function getAccountBalances(accountId, auth = {}) {
  return apiRequest(`/accounts/${accountId}/balances/`, {}, auth);
}

/**
 * Transazioni account (booked + pending)
 */
export async function getAccountTransactions(accountId, auth = {}) {
  return apiRequest(`/accounts/${accountId}/transactions/`, {}, auth);
}
