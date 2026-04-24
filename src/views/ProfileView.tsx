import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Camera, 
  Shield, 
  Bell, 
  Globe, 
  HelpCircle, 
  MapPin, 
  LogOut,
  ChevronRight,
  CreditCard,
  Moon,
  Sun
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { STAGGER_CONTAINER, STAGGER_ITEM } from '../constants';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { Language } from '../types';

export const ProfileView = () => {
  const { user, claims, setOnboarded, theme, toggleTheme, language, setLanguage, setCurrentTab } = useStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('claimsaathi-notifications-enabled');
    return saved === null ? true : saved === 'true';
  });

  const totalSavings = claims.filter(c => c.status === 'Approved').reduce((acc, c) => acc + c.amount, 0);
  const languageLabel = useMemo(() => {
    const labels: Record<Language, string> = {
      en: 'English',
      hi: 'Hindi (हिन्दी)',
      ta: 'Tamil (தமிழ்)',
      te: 'Telugu (తెలుగు)',
      bn: 'Bangla (বাংলা)',
    };
    return labels[language];
  }, [language]);

  const cycleLanguage = () => {
    const order: Language[] = ['en', 'hi', 'ta', 'te', 'bn'];
    const next = order[(order.indexOf(language) + 1) % order.length];
    setLanguage(next);
    toast.success(`Language set to ${next.toUpperCase()}`);
  };

  const toggleNotifications = () => {
    setNotificationsEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('claimsaathi-notifications-enabled', String(next));
      toast.success(next ? 'Notifications enabled' : 'Notifications disabled');
      return next;
    });
  };

  const openNearbyHospitals = () => {
    const openSearch = (query: string) => window.open(`https://www.google.com/maps/search/${encodeURIComponent(query)}`, '_blank');
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      openSearch('cashless hospitals near me');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        openSearch(`cashless hospitals near ${coords.latitude},${coords.longitude}`);
      },
      () => {
        openSearch('cashless hospitals near me');
      },
      { timeout: 5000 },
    );
  };

  const openFaq = () => {
    window.open('https://www.supabase.com/docs', '_blank');
    toast('Opened help docs in a new tab.');
  };

  const openPolicies = () => {
    setCurrentTab('policy');
  };

  const openHealthCards = () => {
    setCurrentTab('policy');
    toast('Open policy and download your insurer health card from there.');
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Continue to clear local app auth state even if signout call fails.
    } finally {
      setOnboarded(false);
      toast.success('Logged out');
    }
  };

  const sections = [
    {
      title: 'My Documents',
      items: [
        { id: 'policies', label: 'My Policies', icon: Shield, badge: '1', action: openPolicies },
        { id: 'id-cards', label: 'E-Health Cards', icon: CreditCard, action: openHealthCards },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { id: 'dark-mode', label: 'Dark Mode', icon: theme === 'dark' ? Moon : Sun, type: 'toggle', action: toggleTheme, active: theme === 'dark' },
        { id: 'notifications', label: 'Notifications', icon: Bell, type: 'toggle', action: toggleNotifications, active: notificationsEnabled },
        { id: 'language', label: 'Language Preference', icon: Globe, value: languageLabel, action: cycleLanguage },
      ]
    },
    {
       title: 'Support',
       items: [
         { id: 'hospitals', label: 'Nearby Cashless Hospitals', icon: MapPin, action: openNearbyHospitals },
         { id: 'faq', label: 'Help & FAQ', icon: HelpCircle, action: openFaq },
       ]
    }
  ];

  return (
    <div className="px-6 py-10 min-h-screen">
      {/* Header */}
      <div className="flex flex-col items-center mb-10">
        <div className="relative mb-4">
           <div className="w-24 h-24 rounded-full border-4 border-primary/20 p-1">
              <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-gray-200 dark:bg-slate-800 text-3xl font-display font-bold text-gray-500 dark:text-gray-400">
                 {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
           </div>
           <button
             onClick={() => toast('Profile photo upload will be enabled soon.')}
             className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center border-2 border-surface shadow-lg"
           >
              <Camera size={14} />
           </button>
        </div>
        <h2 className="font-display font-bold text-xl text-text-main">{user?.name || 'User'}</h2>
        <p className="text-text-muted text-sm italic">{user?.phone || user?.email || 'No contact info'}</p>
        <span className="mt-2 bg-primary-light text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Verified User</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-10">
         <div className="bg-surface p-4 rounded-lg shadow-card text-center">
            <p className="text-2xl font-display font-bold text-primary">{claims.length.toString().padStart(2, '0')}</p>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Claims Active</p>
         </div>
         <div className="bg-surface p-4 rounded-lg shadow-card text-center">
            <p className="text-2xl font-display font-bold text-text-main">₹{(totalSavings / 1000).toFixed(1)}K</p>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Lifetime Savings</p>
         </div>
      </div>

      {/* Sections */}
      <motion.div
         variants={STAGGER_CONTAINER}
         initial="initial"
         animate="animate"
         className="space-y-8"
      >
        {sections.map((section) => (
          <motion.div key={section.title} variants={STAGGER_ITEM} className="space-y-3">
             <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-2">{section.title}</h3>
             <div className="bg-surface rounded-lg shadow-card overflow-hidden">
                {section.items.map((item: any, idx) => {
                  const Icon = item.icon;
                  return (
                    <button 
                      key={item.id}
                      onClick={item.action}
                      className={cn(
                        "w-full px-5 py-4 flex items-center justify-between group active:bg-gray-50 dark:active:bg-navy-light transition-colors",
                        idx < section.items.length - 1 && "border-b border-gray-100 dark:border-white/5"
                      )}
                    >
                       <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                            item.active ? "bg-primary text-white" : "bg-gray-50 dark:bg-white/5 text-text-muted group-hover:bg-primary/10 group-hover:text-primary"
                          )}>
                             <Icon size={20} />
                          </div>
                          <span className="text-sm font-bold text-text-main">{item.label}</span>
                       </div>
                       <div className="flex items-center gap-3">
                          {item.badge && (
                            <span className="bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                              {item.badge}
                            </span>
                          )}
                          {item.value && (
                            <span className="text-xs text-text-muted">{item.value}</span>
                          )}
                          {item.type === 'toggle' ? (
                            <div className={cn(
                              "w-10 h-5 rounded-full relative transition-colors",
                              item.active ? "bg-primary" : "bg-gray-200 dark:bg-white/10"
                            )}>
                               <motion.div 
                                 animate={{ x: item.active ? 20 : 4 }}
                                 className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm" 
                               />
                            </div>
                          ) : (
                            <ChevronRight size={16} className="text-gray-300" />
                          )}
                       </div>
                    </button>
                  );
                })}
             </div>
          </motion.div>
        ))}

        <motion.button
          variants={STAGGER_ITEM}
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-3 text-danger font-bold text-sm py-4 bg-danger/5 rounded-lg border border-danger/10 mb-20"
        >
          <LogOut size={18} />
          Logout from ClaimSaathi
        </motion.button>
      </motion.div>
    </div>
  );
};
