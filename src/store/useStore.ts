import { create } from 'zustand';
import toast from 'react-hot-toast';
import { User, Policy, Claim, Language } from '../types';
import { Session } from '@supabase/supabase-js';
import { fetchClaimsForUser, fetchPolicyForUser, insertClaimForUser, upsertPolicyForUser } from '../lib/claimsaathiDb';
import { isSupabaseEnabled } from '../lib/supabase';

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface AppState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  activePolicy: Policy | null;
  /** Raw upload kept in memory for Policy Saathi Q&A (not persisted). */
  policyDocument: { base64: string; mimeType: string; extractedText?: string } | null;
  claims: Claim[];
  notifications: Notification[];
  language: Language;
  onboarded: boolean;
  currentTab: 'home' | 'policy' | 'claims' | 'profile';
  theme: 'light' | 'dark';
  
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLanguage: (lang: Language) => void;
  setOnboarded: (val: boolean) => void;
  setCurrentTab: (tab: 'home' | 'policy' | 'claims' | 'profile') => void;
  hydrateUserData: (userId: string) => Promise<void>;
  applyPolicyAnalysis: (policy: Policy, document: { base64: string; mimeType: string; extractedText?: string }) => Promise<void>;
  clearActivePolicy: () => void;
  addClaim: (claim: Claim) => void;
  toggleTheme: () => void;
  updateUserProfile: (fields: Partial<User>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
}

/** Keys persisted to localStorage for user profile. */
const USER_PROFILE_KEY = 'claimsaathi-user-profile';

function loadSavedUserProfile(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveUserProfile(user: User | null) {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_PROFILE_KEY);
  }
}

export const useStore = create<AppState>((set) => {
  const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('claimsaathi-theme') : 'light';
  const initialTheme = (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'light';
  const savedUser = loadSavedUserProfile();

  return {
    user: savedUser,
    session: null,
    isAuthenticated: false,
    activePolicy: null,
    policyDocument: null,
    claims: [],
    notifications: [],
    language: 'en',
    onboarded: false,
    currentTab: 'home',
    theme: initialTheme,

    setUser: (user) => {
      saveUserProfile(user);
      set({ user });
    },
    setSession: (session) => {
      let mappedUser = null;
      if (session?.user) {
        mappedUser = {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || 'User',
          email: session.user.email || '',
          phone: session.user.user_metadata?.phone || '',
        };
      }
      // Merge with any saved local profile so we don't lose ABHA/medical info on re-login
      const savedLocal = loadSavedUserProfile();
      const mergedUser = mappedUser ? { ...savedLocal, ...mappedUser } : savedLocal;
      if (mergedUser) saveUserProfile(mergedUser);
      set({ 
        session, 
        isAuthenticated: !!session,
        user: mergedUser,
        ...(session ? {} : { activePolicy: null, policyDocument: null, claims: [] }),
      });
    },
    setLanguage: (language) => set({ language }),
    setOnboarded: (onboarded) => set({ onboarded }),
    setCurrentTab: (currentTab) => set({ currentTab }),
    hydrateUserData: async (userId) => {
      try {
        const [policy, claims] = await Promise.all([
          fetchPolicyForUser(userId),
          fetchClaimsForUser(userId),
        ]);
        set({ activePolicy: policy, claims });
      } catch (error) {
        console.warn('Could not hydrate user policy/claims from database.', error);
      }
    },
    applyPolicyAnalysis: async (policy, document) => {
      set({ activePolicy: policy, policyDocument: document });
      const userId = useStore.getState().session?.user?.id;
      if (!userId) return;
      try {
        await upsertPolicyForUser(userId, policy);
      } catch (error) {
        console.warn('Could not save policy to database.', error);
      }
    },
    clearActivePolicy: () => set({ activePolicy: null, policyDocument: null }),
    addClaim: (claim) => {
      set((state) => ({ claims: [claim, ...state.claims] }));
      const userId = useStore.getState().session?.user?.id;
      if (!userId) {
        if (isSupabaseEnabled) {
          toast.error('Sign in to save claims to your account.');
        }
        return;
      }
      void insertClaimForUser(userId, claim)
        .then(() => useStore.getState().hydrateUserData(userId))
        .catch((error) => {
          const message = error instanceof Error ? error.message : 'Could not save claim.';
          console.warn('Could not save claim to database.', error);
          toast.error(message);
        });
    },
    toggleTheme: () => set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('claimsaathi-theme', newTheme);
      return { theme: newTheme };
    }),
    updateUserProfile: (fields) => set((state) => {
      const base = state.user || { name: 'User', phone: '', email: '' };
      const updated = { ...base, ...fields };
      saveUserProfile(updated);
      return { user: updated };
    }),
    markNotificationRead: (id) => set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    })),
    markAllNotificationsRead: () => set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),
  };
});
