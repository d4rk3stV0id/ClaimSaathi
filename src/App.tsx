import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { AuthView } from './views/AuthView';
import { clearSupabaseLocalSession, isSupabaseEnabled, supabase } from './lib/supabase';
import { Layout } from './components/Layout';
import { DashboardView } from './views/DashboardView';
import { PolicyReaderView } from './views/PolicyReaderView';
import { ClaimWizardView } from './views/ClaimWizardView';
import { ClaimTrackerView } from './views/ClaimTrackerView';
import { ProfileView } from './views/ProfileView';

export default function App() {
  const { onboarded, currentTab, theme, session, isAuthenticated, setSession, hydrateUserData } = useStore();

  useEffect(() => {
    if (!isSupabaseEnabled) return;
    let mounted = true;
    // Check active sessions and set the user.
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) setSession(session);
      } catch (error) {
        // Recover from stale local auth state/locks in dev.
        clearSupabaseLocalSession();
        await supabase.auth.signOut({ scope: 'local' });
        if (mounted) setSession(null);
        console.warn('Supabase session recovery applied.', error);
      }
    })();

    // Listen for changes on auth state (logged in, signed out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setSession]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    void hydrateUserData(userId);
  }, [session?.user?.id, hydrateUserData]);

  if (isSupabaseEnabled && !isAuthenticated && !onboarded) {
    return (
      <>
        <AuthView />
        <Toaster position="top-center" />
      </>
    );
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'home':
        return <DashboardView />;
      case 'policy':
        return <PolicyReaderView />;
      case 'claims':
        return <ClaimWizardView />;
      case 'profile':
        return <ProfileView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <Layout>
      {renderContent()}
      <Toaster position="top-right" />
    </Layout>
  );
}
