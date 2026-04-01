// mobile/app/transaction/[id].tsx
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Share, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTransactionStore } from '../../store/useTransactionStore';
import { theme } from '../../theme';
import { formatAmount, formatDate } from '../../utils/format';

const NOTE_KEY_PREFIX = '@autobank:tx_note:';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transactions, accounts } = useTransactionStore();
  const [note, setNote] = useState('');
  const [savedNote, setSavedNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Find the transaction across all accounts
  let tx: any = null;
  let accountId: string | null = null;
  for (const [accId, txList] of Object.entries(transactions)) {
    const found = txList.find(t => (t.transactionId || t.id) === id);
    if (found) {
      tx = found;
      accountId = accId;
      break;
    }
  }

  const account = accounts.find(a => (a.id || a.accountId) === accountId);

  useEffect(() => {
    if (id) {
      AsyncStorage.getItem(`${NOTE_KEY_PREFIX}${id}`).then(val => {
        if (val) {
          setNote(val);
          setSavedNote(val);
        }
      });
    }
  }, [id]);

  const saveNote = async () => {
    if (!id) return;
    setSaving(true);
    await AsyncStorage.setItem(`${NOTE_KEY_PREFIX}${id}`, note);
    setSavedNote(note);
    setSaving(false);
  };

  const shareTransaction = async () => {
    if (!tx) return;
    const amount = parseFloat(tx.transactionAmount?.amount || '0');
    const currency = tx.transactionAmount?.currency || 'EUR';
    const desc = tx.remittanceInformationUnstructured || tx.creditorName || tx.debtorName || 'Transazione';
    const date = formatDate(tx.bookingDate);
    const category = tx.category?.label || 'Altro';

    const message = [
      `Transazione Autobank`,
      ``,
      `Importo: ${formatAmount(amount, currency)}`,
      `Descrizione: ${desc}`,
      `Data: ${date}`,
      `Categoria: ${category}`,
      tx.creditorName ? `Creditore: ${tx.creditorName}` : null,
      tx.debtorName ? `Debitore: ${tx.debtorName}` : null,
      savedNote ? `Nota: ${savedNote}` : null,
    ].filter(Boolean).join('\n');

    try {
      await Share.share({ message });
    } catch {}
  };

  if (!tx) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Transazione non trovata</Text>
      </View>
    );
  }

  const amount = parseFloat(tx.transactionAmount?.amount || '0');
  const currency = tx.transactionAmount?.currency || 'EUR';
  const isExpense = amount < 0;
  const description = tx.remittanceInformationUnstructured || tx.creditorName || tx.debtorName || 'Transazione';
  const status = tx.bookingDate ? 'Contabilizzata' : 'In sospeso';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Amount */}
      <View style={styles.amountSection}>
        <Text style={styles.categoryIcon}>{tx.category?.icon || '\uD83D\uDCE6'}</Text>
        <Text style={[styles.amount, { color: isExpense ? theme.colors.danger : theme.colors.accent }]}>
          {formatAmount(amount, currency)}
        </Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      {/* Details Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dettagli</Text>

        <DetailRow label="Categoria" value={`${tx.category?.icon || ''} ${tx.category?.label || 'Altro'}`} />
        <DetailRow label="Data contabilizzazione" value={formatDate(tx.bookingDate)} />
        {tx.valueDate && <DetailRow label="Data valuta" value={formatDate(tx.valueDate)} />}
        <DetailRow label="Stato" value={status} />
        {tx.creditorName && <DetailRow label="Creditore" value={tx.creditorName} />}
        {tx.debtorName && <DetailRow label="Debitore" value={tx.debtorName} />}
        {account && (
          <DetailRow
            label="Conto"
            value={account.name || account.iban || account.id || 'Conto'}
          />
        )}
        {tx.transactionId && <DetailRow label="ID Transazione" value={tx.transactionId} />}
      </View>

      {/* Personal Note */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Nota personale</Text>
        <TextInput
          style={styles.noteInput}
          placeholder="Aggiungi una nota..."
          placeholderTextColor={theme.colors.textMuted}
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
        />
        {note !== savedNote && (
          <TouchableOpacity style={styles.saveNoteBtn} onPress={saveNote} disabled={saving}>
            <Text style={styles.saveNoteBtnText}>{saving ? 'Salvataggio...' : 'Salva nota'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Share Button */}
      <TouchableOpacity style={styles.shareBtn} onPress={shareTransaction}>
        <Text style={styles.shareBtnText}>Condividi transazione</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  emptyText: { color: theme.colors.textMuted, textAlign: 'center', marginTop: 40, fontSize: 15 },
  amountSection: { alignItems: 'center', paddingVertical: 32 },
  categoryIcon: { fontSize: 40, marginBottom: 12 },
  amount: { fontSize: 36, fontWeight: '700', fontVariant: ['tabular-nums'] },
  description: { color: theme.colors.textMuted, fontSize: 15, marginTop: 8, textAlign: 'center', paddingHorizontal: 20 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginBottom: 12 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailLabel: { color: theme.colors.textMuted, fontSize: 13, flex: 1 },
  detailValue: { color: theme.colors.text, fontSize: 14, fontWeight: '500', flex: 1, textAlign: 'right' },
  noteInput: {
    backgroundColor: theme.colors.bg,
    borderRadius: 10,
    padding: 12,
    color: theme.colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveNoteBtn: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveNoteBtnText: { color: theme.colors.bg, fontWeight: '600', fontSize: 14 },
  shareBtn: {
    backgroundColor: theme.colors.surface,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.accent,
    marginTop: 8,
  },
  shareBtnText: { color: theme.colors.accent, fontWeight: '700', fontSize: 16 },
});
