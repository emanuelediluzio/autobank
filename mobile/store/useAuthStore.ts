// mobile/store/useAuthStore.ts
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as api from '../services/api';

interface AuthState {
  userId: string;
  email: string | null;
  name: string | null;
  authToken: string | null;
  consentToken: string | null;
  isOnboarded: boolean;
  isLoggedIn: boolean;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  setConsentToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  userId: '',
  email: null,
  name: null,
  authToken: null,
  consentToken: null,
  isOnboarded: false,
  isLoggedIn: false,

  signup: async (email: string, password: string, name?: string) => {
    const result = await api.authSignup(email, password, name);
    await SecureStore.setItemAsync('authToken', result.token);
    await SecureStore.setItemAsync('userEmail', result.user.email);
    await SecureStore.setItemAsync('userName', result.user.name);
    set({
      authToken: result.token,
      email: result.user.email,
      name: result.user.name,
      userId: result.user.email,
      isLoggedIn: true,
    });
  },

  login: async (email: string, password: string) => {
    const result = await api.authLogin(email, password);
    await SecureStore.setItemAsync('authToken', result.token);
    await SecureStore.setItemAsync('userEmail', result.user.email);
    await SecureStore.setItemAsync('userName', result.user.name);
    set({
      authToken: result.token,
      email: result.user.email,
      name: result.user.name,
      userId: result.user.email,
      isLoggedIn: true,
    });
  },

  setConsentToken: async (token: string) => {
    await SecureStore.setItemAsync('consentToken', token);
    set({ consentToken: token, isOnboarded: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('authToken');
    await SecureStore.deleteItemAsync('consentToken');
    await SecureStore.deleteItemAsync('userEmail');
    await SecureStore.deleteItemAsync('userName');
    set({
      authToken: null,
      consentToken: null,
      email: null,
      name: null,
      userId: '',
      isOnboarded: false,
      isLoggedIn: false,
    });
  },

  loadFromStorage: async () => {
    const [authToken, consentToken, email, name] = await Promise.all([
      SecureStore.getItemAsync('authToken'),
      SecureStore.getItemAsync('consentToken'),
      SecureStore.getItemAsync('userEmail'),
      SecureStore.getItemAsync('userName'),
    ]);
    set({
      authToken,
      consentToken,
      email,
      name,
      userId: email || '',
      isLoggedIn: !!authToken,
      isOnboarded: !!consentToken,
    });
  },
}));
