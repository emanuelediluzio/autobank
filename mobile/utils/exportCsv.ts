// mobile/utils/exportCsv.ts
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface Transaction {
  bookingDate?: string;
  remittanceInformationUnstructured?: string;
  creditorName?: string;
  debtorName?: string;
  transactionAmount?: { amount: string; currency: string };
  category?: { id: string; label: string; icon: string };
}

function escapeField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export function generateCsv(transactions: Transaction[]): string {
  const header = 'Data,Descrizione,Importo,Valuta,Categoria';
  const rows = transactions.map(tx => {
    const date = tx.bookingDate || '';
    const desc = tx.remittanceInformationUnstructured || tx.creditorName || tx.debtorName || '';
    const amount = tx.transactionAmount?.amount || '0';
    const currency = tx.transactionAmount?.currency || 'EUR';
    const category = tx.category?.label || 'Altro';

    return [
      escapeField(date),
      escapeField(desc),
      escapeField(amount),
      escapeField(currency),
      escapeField(category),
    ].join(',');
  });

  return [header, ...rows].join('\n');
}

export async function exportAndShareCsv(transactions: Transaction[]): Promise<void> {
  const csv = generateCsv(transactions);
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const fileName = `autobank_transazioni_${dateStr}.csv`;

  const file = new File(Paths.document, fileName);
  file.create();
  file.write(csv);

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Esporta transazioni',
      UTI: 'public.comma-separated-values-text',
    });
  }
}
