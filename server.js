/**
 * Autobank - Server Express
 * API per collegamento banche (GoCardless) e tracking spese
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getInstitutions,
  createRequisition,
  getRequisition,
  getAccountDetails,
  getAccountBalances,
  getAccountTransactions,
} from './src/gocardless.js';
import { categorizeTransactions, groupByCategory } from './src/categorizer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const auth = () => ({
  secretId: process.env.GOCARDLESS_SECRET_ID,
  secretKey: process.env.GOCARDLESS_SECRET_KEY,
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- API ---

// Lista banche per paese
app.get('/api/institutions', async (req, res) => {
  try {
    const country = req.query.country || 'IT';
    const list = await getInstitutions(country, auth());
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Crea requisition (link per collegare banca)
app.post('/api/requisitions', async (req, res) => {
  try {
    const redirect = process.env.REDIRECT_URL || `${req.protocol}://${req.get('host')}/callback.html`;
    const { institutionId, reference } = req.body;
    const institution_id = institutionId || 'SANDBOXFINANCE_SFIN0000'; // sandbox default
    const reqData = await createRequisition(
      {
        redirect,
        institutionId: institution_id,
        reference: reference || `user-${Date.now()}`,
      },
      auth()
    );
    res.json(reqData);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Dettaglio requisition (account collegati)
app.get('/api/requisitions/:id', async (req, res) => {
  try {
    const data = await getRequisition(req.params.id, auth());
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Dettagli account
app.get('/api/accounts/:id/details', async (req, res) => {
  try {
    const data = await getAccountDetails(req.params.id, auth());
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Saldi account
app.get('/api/accounts/:id/balances', async (req, res) => {
  try {
    const data = await getAccountBalances(req.params.id, auth());
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Transazioni (con categorizzazione)
app.get('/api/accounts/:id/transactions', async (req, res) => {
  try {
    const raw = await getAccountTransactions(req.params.id, auth());
    const categorized = categorizeTransactions(raw.transactions || {});
    res.json({
      ...raw,
      transactions: categorized,
      byCategory: groupByCategory({ booked: categorized.booked }),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Dashboard aggregata: tutti gli account di una requisition
app.get('/api/dashboard/:requisitionId', async (req, res) => {
  try {
    const reqData = await getRequisition(req.params.requisitionId, auth());
    const accounts = reqData.accounts || [];
    const results = [];

    for (const accountId of accounts) {
      const [details, balances, txRaw] = await Promise.all([
        getAccountDetails(accountId, auth()),
        getAccountBalances(accountId, auth()),
        getAccountTransactions(accountId, auth()),
      ]);
      const categorized = categorizeTransactions(txRaw.transactions || {});
      results.push({
        accountId,
        details,
        balances,
        transactions: categorized,
        byCategory: groupByCategory({ booked: categorized.booked }),
      });
    }

    res.json({ requisition: reqData, accounts: results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Fallback SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Autobank in ascolto su http://localhost:${PORT}`);
  console.log(`   API: /api/institutions, /api/requisitions, /api/accounts/:id/transactions`);
  if (!process.env.GOCARDLESS_SECRET_ID) {
    console.log(`\n⚠️  Configura .env con GOCARDLESS_SECRET_ID e GOCARDLESS_SECRET_KEY`);
  }
});
