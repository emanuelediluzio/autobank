# Autobank iOS — Design Spec

## Overview
App iOS nativa per tracking spese via Open Banking (Yapily). React Native + Expo con backend Express esistente deployato su Railway.

## Architecture
- **Frontend**: React Native + Expo (managed workflow), Expo Router (file-based)
- **Backend**: Express (esistente), deploy Railway
- **State management**: Zustand
- **Charts**: victory-native
- **Push notifications**: expo-notifications + polling server-side
- **Style**: Dark mode only, palette esistente (#0f1419 bg, #1a2332 surface, #3fb950 accent, #f85149 danger)

## Screens

### 1. Onboarding
- Selezione paese (picker) + lista banche da API
- Bottone "Collega banca" -> WebView per OAuth Yapily
- Callback gestito in-app, salvataggio consentToken

### 2. Dashboard (tab)
- Card summary: spese totali, entrate, saldo
- Grafico a torta: ripartizione per categoria
- Grafico lineare: andamento spese ultimi 30 giorni
- Lista ultimi 5 movimenti (tap per dettaglio)

### 3. Transazioni (tab)
- Lista completa transazioni, raggruppate per data
- Filtro per categoria e range date
- Search bar
- Pull-to-refresh
- Icona + colore per categoria

### 4. Account (tab)
- Lista conti collegati con saldo
- Tap su conto -> dettaglio con transazioni di quel conto
- Bottone "Aggiungi conto" -> flusso onboarding
- Swipe per rimuovere conto

### 5. Profilo (tab)
- Info utente (applicationUserId)
- Link a Impostazioni
- About / versione app
- Logout (rimuove tutti i consent)

### 6. Impostazioni (push da Profilo)
- Soglie budget per categoria (slider/input per ogni categoria)
- Frequenza report: giornaliero / settimanale / disattivato
- Gestione notifiche on/off per tipo

## Notifications (3 types)

### Real-time transactions
- Server polling Yapily ogni 15 min
- Nuove transazioni -> push via Expo Push API
- Formato: "Hai speso 45.00 EUR da Esselunga (Alimentari)"

### Periodic reports
- Cron giornaliero (ore 21) o settimanale (domenica ore 21)
- Summary: totale speso, categoria top, confronto con periodo precedente

### Budget alerts
- Ad ogni polling, controlla soglie per categoria
- Se superata -> push alert: "Alimentari: 210/200 EUR - Soglia superata!"

## Backend Changes

### New endpoints needed
- `POST /api/register-push-token` — salva Expo push token per utente
- `GET /api/accounts` — lista tutti gli account del consent corrente
- `DELETE /api/accounts/:id` — rimuovi un account/consent
- `GET /api/user/settings` — recupera impostazioni utente
- `PUT /api/user/settings` — salva soglie budget e preferenze notifiche
- `GET /api/stats/monthly` — dati aggregati per grafico mensile

### New server features
- Polling job (setInterval o cron) per nuove transazioni
- Push notification sender via Expo Push API
- Storage impostazioni utente (JSON file o SQLite per semplicita')

## Project Structure
```
repos/autobank/
├── server.js                    (backend - update)
├── src/
│   ├── openbanking-yapily.js    (esistente)
│   ├── categorizer.js           (esistente)
│   ├── notifications.js         (nuovo - push via Expo)
│   ├── polling.js               (nuovo - polling transazioni)
│   ├── storage.js               (nuovo - persistenza utente/settings)
│   └── stats.js                 (nuovo - aggregazioni per grafici)
├── data/                        (nuovo - JSON storage)
├── mobile/
│   ├── app.json
│   ├── package.json
│   ├── app/
│   │   ├── _layout.tsx
│   │   ├── onboarding.tsx
│   │   ├── settings.tsx
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx        (Dashboard)
│   │   │   ├── transactions.tsx
│   │   │   ├── accounts.tsx
│   │   │   └── profile.tsx
│   │   └── account/
│   │       └── [id].tsx         (Dettaglio account)
│   ├── components/
│   │   ├── TransactionItem.tsx
│   │   ├── CategoryChart.tsx
│   │   ├── MonthlyChart.tsx
│   │   ├── SummaryCard.tsx
│   │   ├── BankPicker.tsx
│   │   └── BudgetSlider.tsx
│   ├── services/
│   │   └── api.ts
│   ├── store/
│   │   ├── useAuthStore.ts
│   │   ├── useTransactionStore.ts
│   │   └── useSettingsStore.ts
│   ├── hooks/
│   │   └── useNotifications.ts
│   ├── utils/
│   │   ├── format.ts
│   │   └── colors.ts
│   └── theme/
│       └── index.ts
├── railway.json
├── Procfile
└── package.json
```

## Deploy
- Railway: collega repo GitHub, env vars da .env, auto-deploy su push
- Mobile: Expo Go per dev, EAS Build per TestFlight iOS
