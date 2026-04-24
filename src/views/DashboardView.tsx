import { motion } from 'motion/react';
import { Bell, BookOpen, ShieldCheck, Activity, MessageCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { AnimatedCard, GlassCard, StatusBadge } from '../components/UI';
import { AnimatedCounter } from '../components/SpecialUI';
import { STAGGER_CONTAINER, STAGGER_ITEM } from '../constants';
import { cn } from '../lib/utils';

export const DashboardView = () => {
  const { user, claims, activePolicy, setCurrentTab } = useStore();

  const actions = [
    { id: 'policy', label: 'Read My Policy', icon: BookOpen, desc: 'View coverage & rules', color: 'bg-primary/10 text-primary', tab: 'policy' },
    { id: 'file', label: 'File a Claim', icon: ShieldCheck, desc: 'Start a new claim', color: 'bg-accent/10 text-accent', tab: 'claims' },
    { id: 'track', label: 'Track Claim', icon: Activity, desc: 'Check claim status', color: 'bg-indigo-100 text-indigo-600', tab: 'claims' },
    { id: 'ask', label: 'Ask AI', icon: MessageCircle, desc: 'Chat with ClaimSaathi', color: 'bg-navy/10 text-navy', tab: 'policy' },
  ];

  return (
    <div className="flex min-h-full w-full flex-col bg-background">
      {/* Hero — full width, web-aligned */}
      <div className="relative overflow-hidden bg-gradient-to-br from-navy to-navy-light px-6 py-10 lg:px-12 lg:py-14">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-primary opacity-20 blur-[80px]" />

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
          <div className="max-w-xl space-y-2">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <span className="font-display text-xl font-bold tracking-tight text-white">ClaimSaathi</span>
            </div>
            <h2 className="text-3xl font-display font-bold tracking-tight text-white lg:text-4xl">
              Namaste, {user?.name?.split(' ')[0] || 'User'} 👋
            </h2>
            <p className="text-base text-white/70">Welcome to your insurance dashboard.</p>
          </div>

          <div className="w-full max-w-lg shrink-0 lg:max-w-md">
            <GlassCard className="border-white/20 shadow-elevated lg:p-8">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  {activePolicy ? (
                    <>
                      <span className="inline-block rounded-full bg-success px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                        Active policy
                      </span>
                      <h3 className="mt-3 font-display text-xl font-bold text-white">{activePolicy.name}</h3>
                      <p className="mt-1 text-xs text-white/60">Insurer: {activePolicy.insurer}</p>
                    </>
                  ) : (
                    <>
                      <span className="inline-block rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                        Action needed
                      </span>
                      <h3 className="mt-3 font-display text-xl font-bold text-white">No policy linked</h3>
                      <p className="mt-1 text-xs text-white/60">Add a policy to unlock features</p>
                    </>
                  )}
                </div>
                <div className="hidden items-center gap-3 sm:flex">
                  <button type="button" className="relative text-white/70 transition-colors hover:text-white" aria-label="Notifications">
                    <Bell size={22} />
                    <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-navy bg-accent" />
                  </button>
                  <div className="h-11 w-11 overflow-hidden rounded-full border-2 border-primary shadow-lg">
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`}
                      alt=""
                      className="h-full w-full bg-white"
                    />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Total coverage</p>
                <div className="mt-1 font-display text-3xl font-bold text-primary-light lg:text-4xl">
                  {activePolicy ? (
                    <AnimatedCounter from={0} to={activePolicy.coverageAmount || 0} prefix="₹" />
                  ) : (
                    '₹0'
                  )}
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Main — web grid: primary column + sidebar */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 lg:px-12 lg:py-14">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_min(400px,34%)] lg:gap-16">
          <div className="space-y-6">
            <h2 className="font-display text-xl font-bold text-text-main">What would you like to do?</h2>
            <motion.div
              variants={STAGGER_CONTAINER}
              initial="initial"
              animate="animate"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2"
            >
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <AnimatedCard
                    key={action.id}
                    className="flex flex-col gap-4 rounded-lg p-6 shadow-card"
                    onClick={() => setCurrentTab(action.tab as 'home' | 'policy' | 'claims' | 'profile')}
                  >
                    <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl text-xl', action.color)}>
                      <Icon size={24} />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="font-display text-[15px] font-bold text-text-main">{action.label}</h4>
                      <p className="text-sm leading-relaxed text-text-muted">{action.desc}</p>
                    </div>
                  </AnimatedCard>
                );
              })}
            </motion.div>
          </div>

          <aside className="space-y-4 lg:pt-2">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-text-main">Recent activity</h3>
              <button type="button" className="text-sm font-bold text-primary hover:underline">
                View all
              </button>
            </div>
            <div className="rounded-xl bg-surface p-6 shadow-card lg:p-8">
              {claims.length > 0 ? (
                <motion.div variants={STAGGER_CONTAINER} initial="initial" animate="animate" className="space-y-6">
                  {claims.map((claim, idx) => (
                    <motion.div
                      key={claim.id}
                      variants={STAGGER_ITEM}
                      className={cn(
                        'relative flex items-center gap-5',
                        idx < claims.length - 1 && 'border-b border-gray-100 pb-6 dark:border-white/5',
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl',
                          claim.status === 'Approved' ? 'bg-green-100 text-success' : 'bg-amber-100 text-warning',
                        )}
                      >
                        {claim.status === 'Approved' ? '✓' : '⏳'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-text-main">{claim.title}</h4>
                        <p className="mt-0.5 text-[11px] text-text-muted">Hospital • {claim.date}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="mb-1 text-sm font-bold text-text-main">₹{claim.amount.toLocaleString()}</p>
                        <StatusBadge status={claim.status} />
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-text-muted">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 dark:bg-white/5">
                    <BookOpen size={32} className="text-gray-300 dark:text-slate-500" />
                  </div>
                  <p className="text-sm font-medium">No recent activity</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};
