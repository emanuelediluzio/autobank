// mobile/store/useSettingsStore.ts
import { create } from 'zustand';
import * as api from '../services/api';

interface SettingsState {
  budgets: Record<string, number>;
  notifications: { realtime: boolean; reports: 'daily' | 'weekly' | 'off'; budgetAlerts: boolean };
  loading: boolean;
  fetch: (userId: string) => Promise<void>;
  update: (userId: string, settings: Partial<SettingsState>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  budgets: {},
  notifications: { realtime: true, reports: 'weekly', budgetAlerts: true },
  loading: false,

  fetch: async (userId: string) => {
    set({ loading: true });
    const data = await api.getUserSettings(userId);
    set({ budgets: data.budgets || {}, notifications: data.notifications || { realtime: true, reports: 'weekly', budgetAlerts: true }, loading: false });
  },

  update: async (userId: string, settings) => {
    const updated = await api.updateUserSettings(userId, settings);
    set({ budgets: updated.budgets || {}, notifications: updated.notifications });
  },
}));
