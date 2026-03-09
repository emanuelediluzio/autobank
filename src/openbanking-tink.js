/**
 * Client generico per Open Banking con Tink
 *
 * NOTA IMPORTANTE:
 * - Questo file contiene uno scheletro pronto all'uso per integrare Tink.
 * - Devi verificare e completare gli endpoint esatti usando la documentazione aggiornata di Tink.
 *
 * Variabili usate (da .env):
 * - OB_CLIENT_ID
 * - OB_CLIENT_SECRET
 * - OB_API_BASE (es. https://api.tink.com)
 */

const DEFAULT_API_BASE = process.env.OB_API_BASE || 'https://api.tink.com';

/**
 * Esegue una richiesta HTTP generica verso Tink
 */
async function httpRequest(path, { method = 'GET', headers = {}, body } = {}) {
  const url = path.startsWith('http') ? path : `${DEFAULT_API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) {
    const msg = data.error_description || data.message || data.error || `HTTP ${res.status}`;
    throw new Error(`Tink API error: ${msg}`);
  }

  return data;
}

/**
 * Ottiene un access token con client_credentials
 *
 * Devi controllare nella documentazione Tink:
 * - endpoint esatto (tipicamente /api/v1/oauth/token o simile)
 * - parametri grant_type / scope richiesti per accounts/transactions
 */
export async function getClientAccessToken({ clientId, clientSecret }) {
  if (!clientId || !clientSecret) {
    throw new Error('Configura OB_CLIENT_ID e OB_CLIENT_SECRET nel file .env');
  }

  // ESEMPIO: controlla e adatta a doc Tink
  const tokenUrl = `${DEFAULT_API_BASE}/api/v1/oauth/token`;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'accounts:read,transactions:read',
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) {
    const msg = data.error_description || data.message || data.error || `HTTP ${res.status}`;
    throw new Error(`Tink token error: ${msg}`);
  }

  if (!data.access_token) {
    throw new Error('Access token non presente nella risposta Tink (controlla la configurazione).');
  }

  return data.access_token;
}

/**
 * Restituisce una lista di "istituti" in forma generica.
 *
 * Con Tink di solito NON gestisci tu la lista banche,
 * ma usi Tink Link che mostra l'elenco all'utente.
 *
 * Qui quindi restituiamo una lista fittizia di mercati supportati
 * che il frontend può usare solo per scegliere il paese.
 */
export async function getInstitutions(country = 'IT', _auth = {}) {
  // Puoi usare la lista ufficiale dei mercati Tink se preferisci.
  const markets = [
    { id: 'IT', name: 'Italia' },
    { id: 'SE', name: 'Svezia' },
    { id: 'DE', name: 'Germania' },
    { id: 'FR', name: 'Francia' },
    { id: 'GB', name: 'Regno Unito' },
  ];

  // Se il paese esiste, lo restituiamo come "istituto"
  const found = markets.find((m) => m.id === country.toUpperCase());
  if (found) {
    return [found];
  }
  return markets;
}

/**
 * Crea un "requisition" equivalente con Tink Link.
 *
 * Qui NON viene creata una risorsa server-side come con GoCardless.
 * Costruiamo invece un URL Tink Link che l'utente aprirà per collegare la banca.
 *
 * Devi verificare nella doc Tink i parametri esatti di Tink Link.
 */
export async function createRequisition(params, { clientId }) {
  if (!clientId) {
    throw new Error('Configura OB_CLIENT_ID nel file .env');
  }

  const {
    redirect,
    reference,
    userLanguage = 'it_IT',
    country = 'IT',
  } = params;

  const market = country.toLowerCase(); // es. it, se, de ...

  // URL base Tink Link (verifica versione /path nella doc)
  const baseLink = 'https://link.tink.com/1.0/transactions/connect';

  const url = new URL(baseLink);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirect);
  url.searchParams.set('market', market);
  url.searchParams.set('locale', userLanguage);
  url.searchParams.set('test', 'true'); // rimuovi in produzione
  url.searchParams.set('state', reference || `user-${Date.now()}`);
  url.searchParams.set('scope', 'accounts:read,transactions:read');

  // NOTA:
  // Con Tink, dopo il redirect ricevi un "code" da scambiare per un access_token utente.
  // Questo implica che le funzioni getRequisition/getAccountTransactions qui sotto
  // dovranno essere adattate per usare quel token invece del vecchio modello requisition/account.

  return {
    id: reference || `user-${Date.now()}`,
    link: url.toString(),
  };
}

/**
 * Placeholder per compatibilità con la vecchia API.
 *
 * Una volta che avrai il "code" Tink nel redirect, dovrai:
 * 1. Scambiarlo per un access_token utente (endpoint oauth/token con grant_type=authorization_code).
 * 2. Salvare da qualche parte quell'access_token associato alla tua reference/id.
 * 3. In getRequisition usare quell'access_token per leggere accounts/transactions.
 */
export async function getRequisition(_id, _auth = {}) {
  throw new Error(
    'getRequisition con Tink richiede gestione del code/oauth sul redirect. ' +
      'Vedi documentazione Tink per scambiare il code con un access_token utente.'
  );
}

export async function getAccountDetails(_accountId, _auth = {}) {
  throw new Error(
    'getAccountDetails non è ancora implementato per Tink. ' +
      'Usa l\'access_token utente e l\'endpoint accounts di Tink.'
  );
}

export async function getAccountBalances(_accountId, _auth = {}) {
  throw new Error(
    'getAccountBalances non è ancora implementato per Tink. ' +
      'Usa l\'access_token utente e l\'endpoint balances/transactions di Tink.'
  );
}

export async function getAccountTransactions(_accountId, _auth = {}) {
  throw new Error(
    'getAccountTransactions non è ancora implementato per Tink. ' +
      'Dovresti usare l\'access_token utente e chiamare l\'endpoint transactions di Tink.'
  );
}

