import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';

interface AnimatedCounterProps {
  from: number;
  to: number;
  prefix?: string;
  duration?: number;
  className?: string;
}

export const AnimatedCounter = ({ from, to, prefix = "", duration = 1.5, className }: AnimatedCounterProps) => {
  const count = useMotionValue(from);
  const [display, setDisplay] = useState(from);

  useEffect(() => {
    const controls = animate(count, to, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => setDisplay(Math.floor(latest))
    });
    return () => controls.stop();
  }, [to, from, duration]);

  return <span className={className}>{prefix}{display.toLocaleString()}</span>;
};

export const FloatingButton = ({ label, onClick, icon: Icon, className }: any) => (
  <motion.button
    whileHover={{ scale: 1.02, y: -2 }}
    whileTap={{ scale: 0.97 }}
    type="button"
    className={cn(
      'fixed right-4 z-40 flex items-center justify-center gap-2.5 rounded-full bg-primary px-5 py-3.5 font-display text-sm font-bold text-white shadow-glow ring-2 ring-white/50',
      'bottom-[calc(72px+12px+env(safe-area-inset-bottom,0px))] max-w-[calc(100vw-2rem)] lg:bottom-[calc(72px+1.25rem)] lg:right-10 lg:max-w-none',
      className,
    )}
    onClick={onClick}
  >
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
      {Icon && <Icon size={17} strokeWidth={2} />}
    </span>
    <span className="pr-0.5">{label}</span>
  </motion.button>
);
