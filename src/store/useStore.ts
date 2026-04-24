import { create } from 'zustand';
import { User, Policy, Claim, Language } from '../types';
import { Session } from '@supabase/supabase-js';
import { fetchClaimsForUser, fetchPolicyForUser, insertClaimForUser, upsertPolicyForUser } from '../lib/claimsaathiDb';

interface AppState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  activePolicy: Policy | null;
  /** Raw upload kept in memory for Policy Saathi Q&A (not persisted). */
  policyDocument: { base64: string; mimeType: string; extractedText?: string } | null;
  claims: Claim[];
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
}

export const useStore = create<AppState>((set) => {
  const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('claimsaathi-theme') : 'light';
  const initialTheme = (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'light';

  return {
    user: null,
    session: null,
    isAuthenticated: false,
    activePolicy: null,
    policyDocument: null,
    claims: [],
    language: 'en',
    onboarded: false,
    currentTab: 'home',
    theme: initialTheme,

    setUser: (user) => set({ user }),
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
      set({ 
        session, 
        isAuthenticated: !!session,
        user: mappedUser,
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
      if (!userId) return;
      void insertClaimForUser(userId, claim).catch((error) => {
        console.warn('Could not save claim to database.', error);
      });
    },
    toggleTheme: () => set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('claimsaathi-theme', newTheme);
      return { theme: newTheme };
    }),
  };
});
