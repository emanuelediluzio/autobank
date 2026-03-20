// src/stats.js
// Aggregazioni per grafici dashboard mobile
import { categorizeTransaction } from './categorizer.js';

export function computeMonthlyStats(transactions) {
  const daily = {};
  for (const tx of transactions) {
    const date = tx.bookingDate || tx.valueDate;
    if (!date) continue;
    const day = date.substring(0, 10); // yyyy-mm-dd
    const amount = parseFloat(tx.transactionAmount?.amount || '0') || 0;
    if (!daily[day]) daily[day] = { date: day, spent: 0, income: 0 };
    if (amount < 0) daily[day].spent += Math.abs(amount);
    else daily[day].income += amount;
  }
  return Object.values(daily).sort((a, b) => a.date.localeCompare(b.date));
}

export function computeCategoryTotals(transactions) {
  const cats = {};
  for (const tx of transactions) {
    const cat = tx.category || categorizeTransaction(tx);
    const amount = parseFloat(tx.transactionAmount?.amount || '0') || 0;
    if (!cats[cat.id]) cats[cat.id] = { id: cat.id, label: cat.label, icon: cat.icon, total: 0, count: 0 };
    cats[cat.id].total += Math.abs(amount);
    cats[cat.id].count += 1;
  }
  return Object.values(cats).sort((a, b) => b.total - a.total);
}
