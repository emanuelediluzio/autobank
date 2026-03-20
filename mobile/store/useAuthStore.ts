// mobile/store/useAuthStore.ts
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  userId: string;
  consentToken: string | null;
  isOnboarded: boolean;
  setConsentToken: (token: string) => void;
  logout: () => void;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: 'user-123',
  consentToken: null,
  isOnboarded: false,

  setConsentToken: async (token: string) => {
    await SecureStore.setItemAsync('consentToken', token);
    set({ consentToken: token, isOnboarded: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('consentToken');
    set({ consentToken: null, isOnboarded: false });
  },

  loadFromStorage: async () => {
    const token = await SecureStore.getItemAsync('consentToken');
    if (token) {
      set({ consentToken: token, isOnboarded: true });
    }
  },
}));
