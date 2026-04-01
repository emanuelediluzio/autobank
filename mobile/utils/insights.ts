// mobile/utils/insights.ts

interface Transaction {
  bookingDate?: string;
  transactionAmount?: { amount: string; currency: string };
  category?: { id: string; label: string; icon: string };
  creditorName?: string;
  debtorName?: string;
  remittanceInformationUnstructured?: string;
}

export interface Insight {
  icon: string;
  text: string;
  type: 'info' | 'warning' | 'success';
}

function getMonthTransactions(transactions: Transaction[], monthsAgo: number): Transaction[] {
  const now = new Date();
  const targetMonth = now.getMonth() - monthsAgo;
  const targetYear = now.getFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;

  return transactions.filter(tx => {
    if (!tx.bookingDate) return false;
    const d = new Date(tx.bookingDate);
    return d.getMonth() === normalizedMonth && d.getFullYear() === targetYear;
  });
}

function totalSpent(txs: Transaction[]): number {
  return txs.reduce((sum, tx) => {
    const amt = parseFloat(tx.transactionAmount?.amount || '0');
    return amt < 0 ? sum + Math.abs(amt) : sum;
  }, 0);
}

function spentByCategory(txs: Transaction[]): Record<string, { total: number; label: string; icon: string }> {
  const result: Record<string, { total: number; label: string; icon: string }> = {};
  for (const tx of txs) {
    const amt = parseFloat(tx.transactionAmount?.amount || '0');
    if (amt >= 0) continue;
    const catId = tx.category?.id || 'altro';
    const catLabel = tx.category?.label || 'Altro';
    const catIcon = tx.category?.icon || '\uD83D\uDCE6';
    if (!result[catId]) {
      result[catId] = { total: 0, label: catLabel, icon: catIcon };
    }
    result[catId].total += Math.abs(amt);
  }
  return result;
}

export function analyzeSpending(transactions: Transaction[]): Insight[] {
  const insights: Insight[] = [];

  const thisMonthTxs = getMonthTransactions(transactions, 0);
  const lastMonthTxs = getMonthTransactions(transactions, 1);

  const thisMonthSpent = totalSpent(thisMonthTxs);
  const lastMonthSpent = totalSpent(lastMonthTxs);

  // 1. Confronto mese corrente vs precedente
  if (lastMonthSpent > 0 && thisMonthSpent > 0) {
    const diff = thisMonthSpent - lastMonthSpent;
    const pct = Math.round((Math.abs(diff) / lastMonthSpent) * 100);

    if (diff > 0) {
      insights.push({
        icon: '\uD83D\uDCC8',
        text: `Hai speso il ${pct}% in piu rispetto al mese scorso (${Math.round(thisMonthSpent)} vs ${Math.round(lastMonthSpent)} EUR)`,
        type: pct > 20 ? 'warning' : 'info',
      });
    } else if (diff < 0) {
      insights.push({
        icon: '\uD83D\uDCC9',
        text: `Hai speso il ${pct}% in meno rispetto al mese scorso. Ottimo lavoro!`,
        type: 'success',
      });
    } else {
      insights.push({
        icon: '\u2696\uFE0F',
        text: `Le spese di questo mese sono in linea con il mese scorso.`,
        type: 'info',
      });
    }
  }

  // 2. Categoria principale
  const thisMonthCategories = spentByCategory(thisMonthTxs);
  const sortedCategories = Object.entries(thisMonthCategories)
    .sort(([, a], [, b]) => b.total - a.total);

  if (sortedCategories.length > 0) {
    const [, top] = sortedCategories[0];
    insights.push({
      icon: top.icon,
      text: `La tua categoria di spesa principale e "${top.label}" con ${Math.round(top.total)} EUR questo mese.`,
      type: 'info',
    });
  }

  // 3. Spesa insolita: confronta categorie tra i due mesi
  const lastMonthCategories = spentByCategory(lastMonthTxs);
  for (const [catId, current] of Object.entries(thisMonthCategories)) {
    const previous = lastMonthCategories[catId];
    if (previous && previous.total > 0) {
      const ratio = current.total / previous.total;
      if (ratio > 2 && current.total > 50) {
        insights.push({
          icon: '\u26A0\uFE0F',
          text: `Spesa insolita in "${current.label}": ${Math.round(current.total)} EUR, piu del doppio rispetto al mese scorso.`,
          type: 'warning',
        });
      }
    } else if (!previous && current.total > 100) {
      insights.push({
        icon: '\uD83C\uDD95',
        text: `Nuova spesa in "${current.label}" questo mese: ${Math.round(current.total)} EUR.`,
        type: 'info',
      });
    }
  }

  // 4. Numero transazioni
  if (thisMonthTxs.length > 0) {
    const avgPerDay = thisMonthTxs.length / new Date().getDate();
    if (avgPerDay > 5) {
      insights.push({
        icon: '\uD83D\uDCB3',
        text: `Media di ${avgPerDay.toFixed(1)} transazioni al giorno questo mese. Tante piccole spese possono accumularsi!`,
        type: 'info',
      });
    }
  }

  // 5. Nessuna spesa ancora
  if (thisMonthTxs.length === 0 && transactions.length > 0) {
    insights.push({
      icon: '\uD83D\uDCC5',
      text: 'Nessuna transazione registrata per questo mese.',
      type: 'info',
    });
  }

  return insights;
}
