/**
 * AI Service - Categorizzazione intelligente e chatbot finanziario
 * Usa OpenAI-compatible API (Ollama, OpenRouter, ecc.)
 */
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.AI_API_KEY || 'ollama',
  baseURL: process.env.AI_BASE_URL || 'http://localhost:11434/v1',
});

const MODEL = process.env.AI_MODEL || 'llama3.1';

/**
 * Categorizza una transazione usando AI
 */
export async function aiCategorize(transaction) {
  const desc = [
    transaction.remittanceInformationUnstructured,
    transaction.creditorName,
    transaction.debtorName,
    transaction.additionalInformation,
  ].filter(Boolean).join(' | ');

  const amount = transaction.transactionAmount?.amount || '0';
  const currency = transaction.transactionAmount?.currency || 'EUR';

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `Sei un classificatore di transazioni bancarie. Rispondi SOLO con un JSON valido.
Categorie disponibili: alimentari, trasporti, abbigliamento, casa, salute, svago, tecnologia, bancomat, trasferimento, stipendio, investimenti, istruzione, viaggi, animali, regali, altro.

Rispondi con: {"id": "categoria_id", "label": "Nome Categoria", "icon": "emoji", "confidence": 0.0-1.0}`,
        },
        {
          role: 'user',
          content: `Classifica: "${desc}" | Importo: ${amount} ${currency}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 100,
    });

    const text = response.choices[0]?.message?.content?.trim() || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.id && parsed.label) return parsed;
    }
  } catch (e) {
    console.error('[AI] Categorize error:', e.message);
  }
  return null;
}

/**
 * Categorizza un batch di transazioni
 */
export async function aiBatchCategorize(transactions) {
  const results = [];
  for (const tx of transactions) {
    const cat = await aiCategorize(tx);
    results.push({ ...tx, category: cat || tx.category });
  }
  return results;
}

/**
 * Chatbot finanziario - analizza transazioni e risponde
 */
export async function aiChat(message, context = {}) {
  const { transactions = [], balances = {}, accounts = [] } = context;

  // Prepara sommario finanziario
  let totalBalance = 0;
  const balanceSummary = [];
  for (const acc of accounts) {
    const id = acc.id || acc.accountId;
    const bal = balances[id];
    if (bal) {
      const main = bal.mainBalanceAmount || bal.balances?.[0]?.balanceAmount;
      if (main) {
        totalBalance += parseFloat(main.amount || '0');
        balanceSummary.push(`${acc.institutionId || 'Conto'}: ${main.amount} ${main.currency || 'EUR'}`);
      }
    }
  }

  // Ultime transazioni
  const recentTxs = transactions
    .sort((a, b) => (b.bookingDate || '').localeCompare(a.bookingDate || ''))
    .slice(0, 20)
    .map(tx => {
      const amt = tx.transactionAmount?.amount || '0';
      const desc = tx.remittanceInformationUnstructured || tx.creditorName || tx.debtorName || '?';
      const cat = tx.category?.label || 'Altro';
      return `${tx.bookingDate}: ${desc} | ${amt} EUR | ${cat}`;
    });

  // Spese per categoria
  const catTotals = {};
  for (const tx of transactions) {
    const cat = tx.category?.label || 'Altro';
    const amt = parseFloat(tx.transactionAmount?.amount || '0');
    if (amt < 0) {
      catTotals[cat] = (catTotals[cat] || 0) + Math.abs(amt);
    }
  }
  const catSummary = Object.entries(catTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, total]) => `${cat}: ${total.toFixed(2)} EUR`)
    .join('\n');

  const systemPrompt = `Sei l'assistente finanziario di Autobank. Rispondi in italiano, in modo conciso e utile.
Hai accesso ai dati finanziari dell'utente:

SALDO TOTALE: ${totalBalance.toFixed(2)} EUR
CONTI: ${balanceSummary.join(' | ') || 'Nessun conto collegato'}

SPESE PER CATEGORIA (mese corrente):
${catSummary || 'Nessun dato'}

ULTIME TRANSAZIONI:
${recentTxs.join('\n') || 'Nessuna transazione'}

Dai consigli pratici e personalizzati. Se ti chiedono di risparmiare, analizza le spese e suggerisci dove tagliare. Se ti chiedono un report, fornisci un'analisi dettagliata.`;

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });
    return response.choices[0]?.message?.content?.trim() || 'Mi dispiace, non sono riuscito a elaborare la risposta.';
  } catch (e) {
    console.error('[AI] Chat error:', e.message);
    return `Errore AI: ${e.message}. Verifica che il servizio AI sia attivo.`;
  }
}

/**
 * Genera insights automatici sulle spese
 */
export async function aiInsights(transactions) {
  const txSummary = transactions.slice(0, 50).map(tx => {
    const amt = tx.transactionAmount?.amount || '0';
    const desc = tx.remittanceInformationUnstructured || tx.creditorName || '?';
    return `${tx.bookingDate}: ${desc} ${amt} EUR`;
  }).join('\n');

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `Analizza queste transazioni e genera 3-5 insight brevi e utili in italiano. Rispondi con un JSON array: [{"title": "...", "description": "...", "type": "warning|tip|positive|info", "icon": "emoji"}]`,
        },
        { role: 'user', content: txSummary },
      ],
      temperature: 0.5,
      max_tokens: 500,
    });
    const text = response.choices[0]?.message?.content?.trim() || '[]';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('[AI] Insights error:', e.message);
  }
  return [];
}
