import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useForm } from 'react-hook-form';
import { clearSupabaseLocalSession, supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Lock, Mail, ArrowRight, Activity, ShieldCheck, User, Phone } from 'lucide-react';
import { useStore } from '../store/useStore';

async function checkSupabaseReachable(timeoutMs = 7000): Promise<boolean> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
    if (!anonKey) return false;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/health`;
    await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });
    // Any HTTP response means Supabase is reachable from this browser.
    return true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

export const AuthView = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { setOnboarded } = useStore();

  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm();

  const password = watch('password');

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    let authError = null;

    try {
      const reachable = await checkSupabaseReachable();
      if (!reachable) {
        toast.error('Cannot reach Supabase from this network. Please switch network/VPN and try again.');
        return;
      }

      // Clean stale local auth state before a fresh attempt.
      clearSupabaseLocalSession();
      await supabase.auth.signOut({ scope: 'local' });

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        authError = error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              full_name: data.fullName,
              phone: data.phone,
            }
          }
        });
        authError = error;
        
        if (!error) {
          toast.success('Registration successful! Please check your email.');
          // You could auto-switch to login tab here if desired
          setIsLogin(true);
        }
      }

      if (authError) {
        toast.error(authError.message);
      } else if (isLogin) {
        toast.success('Welcome back!');
        setOnboarded(true); // Assuming login signals onboarding is complete
      }
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      if (/failed to fetch|lock|timed out/i.test(message)) {
        toast.error('Supabase network request timed out. Please retry on a different network or disable VPN/proxy.');
      } else {
        toast.error('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = (mode: boolean) => {
    setIsLogin(mode);
    reset(); // Clear errors and fields when switching
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden bg-slate-900 text-white font-sans py-12">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }} 
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/30 blur-[120px]" 
        />
        <motion.div 
          animate={{ scale: [1, 1.5, 1], rotate: [0, -90, 0] }} 
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[40%] -right-[10%] w-[40vw] h-[40vw] rounded-full bg-violet-600/20 blur-[100px]" 
        />
        <motion.div 
          animate={{ scale: [1, 1.1, 1], y: [0, -50, 0] }} 
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-[20%] left-[20%] w-[60vw] h-[50vw] rounded-full bg-cyan-600/20 blur-[150px]" 
        />
      </div>

      <div className="relative z-10 w-full max-w-md p-6 max-h-screen overflow-y-auto no-scrollbar">
        {/* Logo and Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center mb-8"
        >
          <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-xl border border-white/20 shadow-2xl mb-4 group hover:bg-white/20 transition-all duration-300">
            <ShieldCheck className="w-10 h-10 text-indigo-400 group-hover:scale-110 transition-transform duration-300" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white to-indigo-300 text-center">
            ClaimSaathi
          </h1>
          <p className="text-slate-400 mt-2 text-center text-sm font-medium tracking-wide">
            Your Trusted Insurance Companion
          </p>
        </motion.div>

        {/* Main Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] relative"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500" />

          {/* Tab Selector */}
          <div className="flex w-full mb-8 bg-white/5 rounded-xl p-1 relative">
            <motion.div
              className="absolute h-[calc(100%-8px)] rounded-lg bg-indigo-600/80 shadow-lg top-1 w-[calc(50%-4px)]"
              animate={{ left: isLogin ? '4px' : 'calc(50%)' }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
            <button
              type="button"
              onClick={() => toggleMode(true)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg relative z-10 transition-colors ${isLogin ? 'text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => toggleMode(false)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg relative z-10 transition-colors ${!isLogin ? 'text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5 overflow-hidden"
                >
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                      </div>
                      <input
                        {...register('fullName', { required: !isLogin ? 'Full name is required' : false })}
                        type="text"
                        className="block w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                        placeholder="John Doe"
                      />
                    </div>
                    {errors.fullName && <p className="text-red-400 text-xs mt-1 ml-1">{errors.fullName.message as string}</p>}
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                      </div>
                      <input
                        {...register('phone', { required: !isLogin ? 'Phone number is required' : false })}
                        type="tel"
                        className="block w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                    {errors.phone && <p className="text-red-400 text-xs mt-1 ml-1">{errors.phone.message as string}</p>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email Address */}
            <motion.div layout>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email address' }
                  })}
                  type="email"
                  className="block w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1 ml-1">{errors.email.message as string}</p>}
            </motion.div>

            {/* Password */}
            <motion.div layout>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Minimum 6 characters' } })}
                  type="password"
                  className="block w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1 ml-1">{errors.password.message as string}</p>}
            </motion.div>

            {/* Confirm Password */}
            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 20 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <label className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                    </div>
                    <input
                      {...register('confirmPassword', { 
                        required: !isLogin ? 'Please confirm your password' : false,
                        validate: (val) => {
                          if (!isLogin && val !== password) {
                            return 'Passwords do not match';
                          }
                        }
                      })}
                      type="password"
                      className="block w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                      placeholder="••••••••"
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-red-400 text-xs mt-1 ml-1">{errors.confirmPassword.message as string}</p>}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              layout
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 mt-6 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 focus:ring-4 focus:ring-indigo-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
            >
              {isLoading ? (
                <Activity className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'Sign In to Dashboard' : 'Create Account'}</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </motion.button>

          </form>
        </motion.div>
      </div>
      
      {/* Hide scrollbar for the container visually but allow scroll */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};
