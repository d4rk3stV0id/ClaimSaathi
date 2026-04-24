import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  FileCheck, 
  Search, 
  Wallet,
  AlertCircle,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';
import { AnimatedCounter } from '../components/SpecialUI';

export const ClaimTrackerView = () => {
  const steps = [
    { id: 1, title: 'Submitted', date: '12 Oct, 10:30 AM', desc: 'Claim successfully registered', done: true },
    { id: 2, title: 'Documents Verified', date: '13 Oct, 02:15 PM', desc: 'All bills & reports verified by AI', done: true },
    { id: 3, title: 'Under Review', date: 'In Progress', desc: 'TPA is reviewing complex procedures', current: true },
    { id: 4, title: 'Final Decision', date: '--', desc: 'Approval from medical board' },
    { id: 5, title: 'Paid', date: '--', desc: 'Amount credited to bank' }
  ];

  return (
    <div className="px-6 py-10 min-h-screen">
      <header className="mb-8">
        <h2 className="font-display font-bold text-xl mb-1">Track Claim</h2>
        <p className="text-gray-400 text-sm">ID: CS-2938 | StarHealth Gold</p>
      </header>

      {/* Main Status Timeline */}
      <div className="bg-surface p-6 rounded-lg shadow-card mb-8">
        <div className="space-y-0 relative">
          {steps.map((step, idx) => {
            const isLast = idx === steps.length - 1;
            return (
              <div key={step.id} className="relative flex gap-6 pb-8">
                {/* Connecting Line */}
                {!isLast && (
                  <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-100">
                    {step.done && (
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: '100%' }}
                        transition={{ duration: 0.5, delay: idx * 0.2 }}
                        className={cn("w-full bg-primary", steps[idx+1].done ? "bg-primary" : "bg-primary opacity-50")}
                      />
                    )}
                  </div>
                )}

                {/* Step Icon */}
                <div className="relative z-10">
                  {step.done ? (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
                       <CheckCircle2 size={16} />
                    </div>
                  ) : step.current ? (
                    <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center relative">
                       <motion.div
                          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0.2, 0.5] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="absolute inset-0 bg-primary rounded-full"
                       />
                       <Clock size={16} className="text-primary relative z-10" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
                       <Circle size={16} />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 -mt-1">
                  <h4 className={cn(
                    "text-sm font-bold",
                    step.done || step.current ? "text-navy" : "text-gray-400"
                  )}>
                    {step.title}
                  </h4>
                  <p className="text-[10px] text-primary font-bold mt-0.5 uppercase tracking-wider">{step.date}</p>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-navy rounded-lg p-6 text-white space-y-6 relative overflow-hidden">
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary rounded-full blur-[80px] opacity-20" />
        
        <div className="flex justify-between items-center relative z-10">
           <div>
              <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest mb-1">Estimated Approved Amount</p>
              <div className="text-3xl font-display font-bold text-primary">
                 <AnimatedCounter from={0} to={61200} prefix="₹" />
                 <span className="text-white/40 text-lg ml-2 line-through font-normal font-sans">₹68,450</span>
              </div>
           </div>
           <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
              <Sparkles size={24} className="text-primary" />
           </div>
        </div>

        <div className="space-y-2 relative z-10">
           <div className="flex justify-between text-xs text-white/60">
              <span>Coverage Limit Progress</span>
              <span>89%</span>
           </div>
           <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                 initial={{ width: 0 }}
                 animate={{ width: '89%' }}
                 transition={{ duration: 1, ease: "easeOut" }}
                 className="h-full bg-primary"
              />
           </div>
        </div>

        <button className="w-full py-3 bg-white/8 backdrop-blur-md rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-white/12 transition-all relative z-10">
           See Breakdown details
           <ChevronRight size={14} />
        </button>
      </div>

      {/* AI Help Section */}
      <div className="mt-8 bg-surface p-5 rounded-lg border border-gray-100 flex items-start gap-4 shadow-card">
         <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
            <AlertCircle size={20} />
         </div>
         <div className="space-y-2">
            <h4 className="font-display font-bold text-sm">Facing an issue?</h4>
            <p className="text-xs text-gray-500">If your claim is stuck under review for more than 48 hours, our AI can help you draft an urgent query to the insurer.</p>
            <button className="text-primary text-xs font-bold underline">Draft AI Query</button>
         </div>
      </div>
    </div>
  );
};
