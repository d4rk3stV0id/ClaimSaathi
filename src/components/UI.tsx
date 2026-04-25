import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { STAGGER_ITEM } from '../constants';
import { ReactNode } from 'react';

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  /** When false, no lift/hover — use for static content (e.g. policy bullet lists). Default true. */
  hoverable?: boolean;
  [key: string]: any;
}

export const AnimatedCard = ({ children, className, onClick, hoverable = true }: AnimatedCardProps) => (
  <motion.div
    variants={STAGGER_ITEM}
    whileHover={hoverable ? { y: -3, boxShadow: '0 10px 40px rgba(0,0,0,0.12)' } : undefined}
    whileTap={hoverable ? { scale: 0.98 } : undefined}
    onClick={onClick}
    className={cn(
      'bg-surface rounded-md p-4 shadow-card transition-shadow',
      hoverable ? 'cursor-pointer' : 'cursor-default',
      className,
    )}
  >
    {children}
  </motion.div>
);

export const GlassCard = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn(
    "bg-white/8 border border-white/12 backdrop-blur-md rounded-md p-4",
    className
  )}>
    {children}
  </div>
);

export const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    Approved: "bg-success/10 text-success",
    Pending: "bg-warning/10 text-warning",
    Rejected: "bg-danger/10 text-danger",
    Active: "bg-success/10 text-success",
    Submitted: "bg-primary/10 text-primary",
    Verified: "bg-primary/10 text-primary",
    Review: "bg-warning/10 text-warning",
  }[status] || "bg-gray-100 text-gray-600";

  return (
    <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", styles)}>
      {status}
    </span>
  );
};

export const ProgressBar = ({ value, className }: { value: number; className?: string }) => (
  <div
    className={cn(
      'h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/15',
      className,
    )}
  >
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${value}%` }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="h-full bg-primary"
    />
  </div>
);

/** Full-screen-style loader while policy PDF is analyzed (indeterminate shimmer + rings). */
export const PolicyAnalysisLoader = ({ statusText }: { statusText: string }) => (
  <div className="flex min-h-[420px] flex-col items-center justify-center px-4 py-12">
    <div className="relative mb-10 flex h-40 w-40 items-center justify-center">
      <motion.div
        className="absolute inset-2 rounded-full bg-primary/15 blur-2xl dark:bg-primary/25"
        animate={{ opacity: [0.35, 0.9, 0.35], scale: [0.92, 1.08, 0.92] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute inset-0 rounded-full border-[3px] border-primary/25 border-t-primary"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.15, ease: 'linear' }}
      />
      <motion.div
        className="absolute inset-3 rounded-full border-[3px] border-accent/20 border-b-accent"
        animate={{ rotate: -360 }}
        transition={{ repeat: Infinity, duration: 1.55, ease: 'linear' }}
      />
      <motion.div
        className="absolute inset-8 rounded-full border border-primary/40"
        animate={{ scale: [1, 1.06, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lg ring-2 ring-primary/20 dark:bg-navy-light dark:ring-primary/30"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.span
          animate={{ rotate: [0, 12, -12, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="text-primary"
          aria-hidden
        >
          <Sparkles size={28} strokeWidth={1.75} />
        </motion.span>
      </motion.div>
    </div>

    <div className="w-full max-w-sm space-y-5 text-center">
      <div className="policy-analysis-shimmer" role="progressbar" aria-valuetext={statusText} />
      <AnimatePresence mode="wait">
        <motion.p
          key={statusText}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="min-h-[3rem] px-2 font-display text-base font-semibold text-text-main dark:text-slate-100"
        >
          {statusText}
        </motion.p>
      </AnimatePresence>
      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        Extracting coverage, limits, and exclusions from your document…
      </p>
    </div>
  </div>
);

export const AITypingIndicator = () => (
  <div className="flex gap-1 p-2">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        animate={{ y: [0, -6, 0] }}
        transition={{ 
          duration: 0.6, 
          repeat: Infinity, 
          delay: i * 0.1,
          ease: "easeInOut" 
        }}
        className="w-1.5 h-1.5 bg-primary rounded-full"
      />
    ))}
  </div>
);
