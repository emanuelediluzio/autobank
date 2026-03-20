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
