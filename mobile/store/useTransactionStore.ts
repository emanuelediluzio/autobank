// mobile/store/useTransactionStore.ts
import { create } from 'zustand';
import * as api from '../services/api';

interface Transaction {
  transactionId?: string;
  id?: string;
  bookingDate?: string;
  valueDate?: string;
  transactionAmount?: { amount: string; currency: string };
  remittanceInformationUnstructured?: string;
  creditorName?: string;
  debtorName?: string;
  category?: { id: string; label: string; icon: string };
}

interface Account {
  id: string;
  accountId?: string;
  type?: string;
  currency?: string;
  [key: string]: any;
}

interface TransactionState {
  accounts: Account[];
  transactions: Record<string, Transaction[]>;
  balances: Record<string, any>;
  stats: Record<string, { daily: any[]; categories: any[] }>;
  loading: boolean;
  error: string | null;
  fetchAccounts: () => Promise<void>;
  fetchTransactions: (accountId: string) => Promise<void>;
  fetchBalances: (accountId: string) => Promise<void>;
  fetchStats: (accountId: string) => Promise<void>;
  fetchAll: () => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  accounts: [],
  transactions: {},
  balances: {},
  stats: {},
  loading: false,
  error: null,

  fetchAccounts: async () => {
    set({ loading: true, error: null });
    try {
      const accounts = await api.getAccounts();
      set({ accounts, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchTransactions: async (accountId: string) => {
    try {
      const data = await api.getAccountTransactions(accountId);
      const txs = data.transactions?.booked || data.booked || [];
      set(s => ({ transactions: { ...s.transactions, [accountId]: txs } }));
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchBalances: async (accountId: string) => {
    try {
      const data = await api.getAccountBalances(accountId);
      set(s => ({ balances: { ...s.balances, [accountId]: data } }));
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchStats: async (accountId: string) => {
    try {
      const data = await api.getAccountStats(accountId);
      set(s => ({ stats: { ...s.stats, [accountId]: data } }));
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const accounts = await api.getAccounts();
      set({ accounts });
      await Promise.all(accounts.map(async (acc: Account) => {
        const id = acc.id || acc.accountId!;
        await Promise.all([
          get().fetchTransactions(id),
          get().fetchBalances(id),
          get().fetchStats(id),
        ]);
      }));
      set({ loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },
}));
