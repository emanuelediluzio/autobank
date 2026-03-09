# Autobank

App di **tracking spese** con Open Banking (PSD2).  
Collega la tua banca, visualizza le transazioni e le spese categorizzate automaticamente.

> Esempi e configurazione pensati per provider come **Tink**. Adatta gli endpoint se usi un altro aggregatore.

## Requisiti

- Node.js 18+
- Account sviluppatore presso un provider Open Banking (es. Tink)

## Setup

1. Crea un account sviluppatore (es. su Tink) e genera `client_id` e `client_secret`.
2. Copia `.env.example` in `.env`:

```bash
cp .env.example .env
```

3. Inserisci le credenziali in `.env`:

```env
OB_CLIENT_ID=il_tuo_client_id
OB_CLIENT_SECRET=il_tuo_client_secret
OB_API_BASE=https://api.tink.com
REDIRECT_URL=http://localhost:3000/callback.html
```

4. Installa e avvia:

```bash
npm install
npm run dev
```

5. Apri [http://localhost:3000](http://localhost:3000)

## Flusso

1. **Collega banca** → Scegli paese, clicca "Collega banca" e vieni reindirizzato al flusso del provider (es. Tink Link).
2. **Autorizza** → L'utente dà il consenso nella UI della banca/provider.
3. **Dashboard** → Una volta completato il collegamento, la dashboard mostra transazioni e spese per categoria.

## API

| Endpoint | Descrizione |
|----------|-------------|
| `GET /api/institutions?country=IT` | Lista mercati/istituti disponibili |
| `POST /api/requisitions` | Crea il link di collegamento (es. Tink Link) |
| `GET /api/requisitions/:id` | (Placeholder per compatibilità, da adattare al provider) |
| `GET /api/accounts/:id/transactions` | Transazioni (categorizzate) |
| `GET /api/dashboard/:requisitionId` | Dashboard aggregata (richiede logica token utente) |

## Categorizzazione

Le transazioni vengono categorizzate automaticamente in base alla descrizione (es. "PAG ZARA" → Abbigliamento).  
Categorie: Alimentari, Trasporti, Abbigliamento, Casa & Utenze, Salute, Svago, Tecnologia, Prelievo, Trasferimento, Altro.

## Licenza

MIT
