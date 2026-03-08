# Autobank

App di **tracking spese** con Open Banking (PSD2) tramite GoCardless Bank Account Data.

Collega la tua banca, visualizza le transazioni e le spese categorizzate automaticamente.

## Requisiti

- Node.js 18+
- Account [GoCardless Bank Account Data](https://bankaccountdata.gocardless.com/) (gratuito per sviluppo)

## Setup

1. **Registrati** su [bankaccountdata.gocardless.com](https://bankaccountdata.gocardless.com/user-secrets/)
2. Crea un **User Secret** e copia `secret_id` e `secret_key`
3. Copia `.env.example` in `.env`:

```bash
cp .env.example .env
```

4. Inserisci le credenziali in `.env`:

```
GOCARDLESS_SECRET_ID=il_tuo_secret_id
GOCARDLESS_SECRET_KEY=la_tua_secret_key
REDIRECT_URL=http://localhost:3000/callback.html
```

5. Installa e avvia:

```bash
npm install
npm run dev
```

6. Apri [http://localhost:3000](http://localhost:3000)

## Flusso

1. **Collega banca** → Scegli paese e banca, clicca "Collega banca"
2. **Autorizza** → Verrai reindirizzato alla banca (o Sandbox per i test) per dare il consenso
3. **Dashboard** → Visualizza transazioni e spese per categoria

## Sandbox

Per testare senza banche reali, usa **Sandbox Finance** (`SANDBOXFINANCE_SFIN0000`).  
Puoi inserire qualsiasi user id e codice per completare l'autenticazione.

## API

| Endpoint | Descrizione |
|----------|-------------|
| `GET /api/institutions?country=IT` | Lista banche |
| `POST /api/requisitions` | Crea link collegamento |
| `GET /api/requisitions/:id` | Dettaglio requisition |
| `GET /api/accounts/:id/transactions` | Transazioni (categorizzate) |
| `GET /api/dashboard/:requisitionId` | Dashboard aggregata |

## Categorizzazione

Le transazioni vengono categorizzate automaticamente in base alla descrizione (es. "PAG ZARA" → Abbigliamento).  
Categorie: Alimentari, Trasporti, Abbigliamento, Casa & Utenze, Salute, Svago, Tecnologia, Prelievo, Trasferimento, Altro.

## Licenza

MIT
