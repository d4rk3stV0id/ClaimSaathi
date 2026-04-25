import { motion } from 'motion/react';
import { Shield, ChevronRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { LANGUAGES } from '../constants';
import { cn } from '../lib/utils';
import { Language } from '../types';

export const SplashView = () => {
  const { setLanguage, language, setOnboarded } = useStore();

  return (
    <div className="fixed inset-0 bg-navy z-50 flex flex-col items-center justify-between p-8 overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary rounded-full blur-[100px] opacity-20 translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent rounded-full blur-[100px] opacity-10 -translate-x-1/2 translate-y-1/2" />

      <div className="flex-1 flex flex-col items-center justify-center pt-20">
        {/* Logo Animation */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-6 flex flex-col items-center"
        >
          <img src="/logo.png" alt="ClaimSaathi" className="h-64 w-auto object-contain drop-shadow-xl rounded-2xl" />
        </motion.div>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-white/60 font-sans text-lg text-center"
        >
          Aapka Claim, Aasaan Tarike Se
        </motion.p>
      </div>

      <div className="w-full max-w-sm space-y-8 pb-10">
        <div className="space-y-4">
          <p className="text-white/40 text-xs uppercase tracking-widest text-center">Select Language</p>
          <div className="flex gap-3 overflow-x-auto pb-4 px-2 no-scrollbar">
            {LANGUAGES.map((lang) => (
              <motion.button
                key={lang.code}
                whileTap={{ scale: 0.95 }}
                onClick={() => setLanguage(lang.code as Language)}
                className={cn(
                  "px-6 py-3 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  language === lang.code 
                    ? "bg-primary text-white shadow-glow" 
                    : "bg-white/10 text-white/70 backdrop-blur-md"
                )}
              >
                {lang.label}
              </motion.button>
            ))}
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setOnboarded(true)}
          className="w-full py-4 bg-primary text-white rounded-full font-display font-semibold text-lg flex items-center justify-center gap-2 shadow-glow group"
        >
          Get Started
          <motion.div
            animate={{ x: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <ChevronRight className="w-6 h-6" />
          </motion.div>
        </motion.button>
      </div>
    </div>
  );
};
