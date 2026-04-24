import { motion, AnimatePresence } from 'motion/react';
import { Home, FileText, Activity, User, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { currentTab, setCurrentTab } = useStore();

  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'policy', label: 'Policy', icon: FileText },
    { id: 'claims', label: 'Claims', icon: Activity },
    { id: 'profile', label: 'Profile', icon: User },
  ] as const;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-[72px]">
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-[72px] bg-surface border-t border-gray-100 px-6 lg:px-[100px] flex justify-around items-center z-50">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id as any)}
              className="relative flex flex-col items-center gap-1 group w-20"
            >
              <div
                className={cn(
                  "transition-colors duration-300",
                  isActive ? "text-primary" : "text-text-muted group-hover:text-text-main"
                )}
              >
                <Icon size={24} />
              </div>
              <span className={cn(
                "text-[11px] font-bold transition-colors uppercase tracking-tight",
                isActive ? "text-primary" : "text-text-muted"
              )}>
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="w-1.5 h-1.5 bg-primary rounded-full mt-0.5"
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
