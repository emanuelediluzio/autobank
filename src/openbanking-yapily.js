/**
 * Client Open Banking per Yapily
 *
 * ATTENZIONE:
 * - Usa i dati della tua applicazione Yapily (applicationUuid e secret) presi
 *   dalla dashboard.
 * - Questo file è uno scheletro basato sul modello tipico Yapily, verifica SEMPRE
 *   gli endpoint e i campi con la documentazione ufficiale prima di andare in produzione.
 *
 * Variabili ambiente attese (.env):
 * - YAPILY_APPLICATION_UUID
 * - YAPILY_APPLICATION_SECRET
 * - YAPILY_API_BASE (opzionale, default https://api.yapily.com)
 */

const DEFAULT_API_BASE = process.env.YAPILY_API_BASE || 'https://api.yapily.com';

function getBasicAuthHeader({ appUuid, appSecret }) {
  if (!appUuid || !appSecret) {
    throw new Error('Configura YAPILY_APPLICATION_UUID e YAPILY_APPLICATION_SECRET nel file .env');
  }
  const token = Buffer.from(`${appUuid}:${appSecret}`).toString('base64');
  return `Basic ${token}`;
}

async function yapilyRequest(path, { method = 'GET', headers = {}, body, authConfig } = {}) {
  const url = path.startsWith('http') ? path : `${DEFAULT_API_BASE}${path}`;

  const allHeaders = {
    accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: getBasicAuthHeader(authConfig),
    ...headers,
  };

  // Se abbiamo un consentToken, lo passiamo come header 'consent'
  if (authConfig?.consentToken) {
    allHeaders.consent = authConfig.consentToken;
  }

  const res = await fetch(url, {
    method,
    headers: allHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) {
    const msg = data.error || data.message || data.description || `HTTP ${res.status}`;
    throw new Error(`Yapily API error: ${msg}`);
  }

  return data;
}

/**
 * Lista istituti/bank disponibili.
 * Yapily espone /institutions. Qui filtriamo per paese se presente in data.countries.
 */
export async function getInstitutions(country = 'IT', auth = {}) {
  const data = await yapilyRequest('/institutions', { authConfig: auth });
  const items = Array.isArray(data) ? data : data.institutions || data.data || [];

  if (!country) return items;
  const upper = country.toUpperCase();
  return items.filter((inst) => {
    const countries = inst.countries || inst.country || [];
    if (Array.isArray(countries)) {
      return countries.some((c) => {
        // c can be a string "IT" or an object { countryCode2: "IT" }
        const code = typeof c === 'string' ? c : (c.countryCode2 || c.code || '');
        return code.toUpperCase() === upper;
      });
    }
    return String(countries).toUpperCase() === upper;
  });
}

/**
 * Crea un "consent" in Yapily e restituisce l'URL di autorizzazione.
 *
 * In genere:
 *  - POST /consents con applicationUserId, institutionId, callback, permissions
 *  - La risposta contiene authorisationUrl e consentToken (o id del consent).
 *
 * Qui mappiamo:
 *  - id  -> consentToken / id
 *  - link -> authorisationUrl
 */
export async function createRequisition(params, auth = {}) {
  const {
    redirect,
    institutionId,
    reference,
    country,
  } = params;

  if (!institutionId) {
    throw new Error('institutionId richiesto per creare un consent Yapily');
  }

  const body = {
    applicationUserId: reference || `user-${Date.now()}`,
    institutionId,
    callback: redirect,
    // Verifica i permissions esatti nella doc Yapily
    permissions: [
      'ACCOUNT',
      'ACCOUNT_TRANSACTIONS',
    ],
  };

  const data = await yapilyRequest('/consents', {
    method: 'POST',
    body,
    authConfig: auth,
  });

  // La struttura esatta dipende dalla versione API, qui usiamo nomi tipici
  const consentId = data.id || data.consentToken || data.consentId;
  const link = data.authorisationUrl || data.authorisationURL || data._links?.authorise?.href;

  if (!consentId || !link) {
    throw new Error('Risposta Yapily senza consentId/link. Controlla la configurazione e la doc Yapily.');
  }

  return {
    id: consentId,
    link,
    raw: data,
  };
}

/**
 * Recupera info sul consent / requisition.
 * Tipicamente GET /consents/{consentId}
 */
export async function getRequisition(requisitionId, auth = {}) {
  if (!requisitionId) throw new Error('requisitionId (consentId) mancante');
  const data = await yapilyRequest(`/consents/${requisitionId}`, { authConfig: auth });
  return data;
}

/**
 * Restituisce tutti gli account per il consentToken corrente.
 * Docs: "Get Accounts" (GET /accounts) – Feature `ACCOUNTS`
 */
export async function getAccounts(auth = {}) {
  const data = await yapilyRequest('/accounts', { authConfig: auth });
  // risposta tipica: { meta, data: [ ...accounts ] }
  if (Array.isArray(data)) return data;
  return data.data || [];
}

/**
 * Dettagli singolo account, derivati dalla lista di /accounts.
 */
export async function getAccountDetails(accountId, auth = {}) {
  if (!auth.consentToken) {
    throw new Error('Manca consentToken in authConfig per getAccountDetails');
  }
  const accounts = await getAccounts(auth);
  const found = accounts.find((a) => a.id === accountId || a.accountId === accountId);
  if (!found) {
    throw new Error(`Account ${accountId} non trovato per il consent corrente`);
  }
  return found;
}

/**
 * Saldi account.
 * Docs: "Get Account Balances" (GET /accounts/{accountId}/balances) – Feature `ACCOUNT_BALANCES`
 */
export async function getAccountBalances(accountId, auth = {}) {
  if (!auth.consentToken) {
    throw new Error('Manca consentToken in authConfig per getAccountBalances');
  }

  const data = await yapilyRequest(`/accounts/${accountId}/balances`, {
    authConfig: auth,
  });

  // forma standard: { meta, data: { mainBalanceAmount, balances: [...] } }
  return data.data || data;
}

/**
 * Transazioni account.
 * Docs: "Get Account Transactions" (GET /accounts/{accountId}/transactions) – Feature `ACCOUNT_TRANSACTIONS`
 */
export async function getAccountTransactions(accountId, auth = {}) {
  if (!auth.consentToken) {
    throw new Error('Manca consentToken in authConfig per getAccountTransactions');
  }

  // Esempio: ultimi 90 giorni
  const from = new Date();
  from.setMonth(from.getMonth() - 3);
  const fromDate = from.toISOString().split('T')[0]; // yyyy-mm-dd

  const query = new URLSearchParams({
    from: fromDate,
    limit: '500',
  }).toString();

  const data = await yapilyRequest(`/accounts/${accountId}/transactions?${query}`, {
    authConfig: auth,
  });

  const tx = data.data || [];

  // Il tuo motore si aspetta { booked: [...], pending: [...] }
  return {
    booked: tx,
    pending: [],
  };
}


