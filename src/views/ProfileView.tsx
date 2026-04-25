import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, Shield, Bell, Globe, HelpCircle, MapPin, LogOut,
  ChevronRight, ChevronLeft, CreditCard, Moon, Sun, User,
  Edit3, Save, X, CheckCircle2, AlertCircle, Heart, ShieldCheck, ClipboardList
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { STAGGER_CONTAINER, STAGGER_ITEM } from '../constants';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { Language } from '../types';

type SubPage = 'main' | 'policies' | 'ehealth' | 'editProfile';

/** Default avatar options using DiceBear styles */
const DEFAULT_AVATARS = [
  { id: 'avatar1', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=b6e3f4', label: 'Aneka' },
  { id: 'avatar2', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=c0aede', label: 'Felix' },
  { id: 'avatar3', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jade&backgroundColor=ffd5dc', label: 'Jade' },
  { id: 'avatar4', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bubba&backgroundColor=d1f4d1', label: 'Bubba' },
  { id: 'avatar5', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna&backgroundColor=ffe6b6', label: 'Luna' },
];

/** Validate ABHA ID: 14 digits, Verhoeff checksum on last digit. */
function validateAbhaId(id: string): boolean {
  if (!/^\d{14}$/.test(id)) return false;
  // Verhoeff checksum tables
  const d = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
  const p = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
  const inv = [0,4,3,2,1,5,6,7,8,9];
  let c = 0;
  const digits = id.split('').map(Number).reverse();
  for (let i = 0; i < digits.length; i++) c = d[c][p[i % 8][digits[i]]];
  return c === 0;
}

export const ProfileView = () => {
  const { user, claims, activePolicy, setOnboarded, theme, toggleTheme, language, setLanguage, setCurrentTab, updateUserProfile, applyPolicyAnalysis } = useStore();
  const [subPage, setSubPage] = useState<SubPage>('main');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('claimsaathi-notifications-enabled');
    return saved === null ? true : saved === 'true';
  });

  // Edit profile state
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editBlood, setEditBlood] = useState(user?.bloodGroup || '');
  const [editEmergency, setEditEmergency] = useState(user?.emergencyContact || '');
  const [editAllergies, setEditAllergies] = useState(user?.allergies || '');
  const [editAbha, setEditAbha] = useState(user?.abhaId || '');
  const [abhaStatus, setAbhaStatus] = useState<'idle'|'valid'|'invalid'>(user?.abhaVerified ? 'valid' : 'idle');
  const [abhaConsent, setAbhaConsent] = useState(false);
  const [abhaFetching, setAbhaFetching] = useState(false);
  const [editAvatar, setEditAvatar] = useState(user?.avatar || '');

  const totalSavings = claims.filter(c => c.status === 'Approved').reduce((acc, c) => acc + c.amount, 0);
  const languageLabel = useMemo(() => {
    const labels: Record<Language, string> = { en: 'English', hi: 'Hindi (हिन्दी)', ta: 'Tamil (தமிழ்)', te: 'Telugu (తెలుగు)', bn: 'Bangla (বাংলা)' };
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
    if (typeof navigator === 'undefined' || !navigator.geolocation) { openSearch('cashless hospitals near me'); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => openSearch(`cashless hospitals near ${coords.latitude},${coords.longitude}`),
      () => openSearch('cashless hospitals near me'),
      { timeout: 5000 },
    );
  };

  const openFaq = () => { window.open('https://www.supabase.com/docs', '_blank'); toast('Opened help docs in a new tab.'); };

  const handleLogout = async () => {
    try { await supabase.auth.signOut({ scope: 'local' }); } catch { }
    finally { setOnboarded(false); toast.success('Logged out'); }
  };

  const verifyAbha = () => {
    if (!editAbha) { setAbhaStatus('idle'); return; }
    if (validateAbhaId(editAbha)) {
      setAbhaStatus('valid');
      toast.success('ABHA ID verified (checksum valid)');
    } else {
      setAbhaStatus('invalid');
      toast.error('Invalid ABHA ID — must be 14 digits with valid checksum');
    }
  };

  const saveProfile = () => {
    const abhaVerified = abhaStatus === 'valid';
    updateUserProfile({
      avatar: editAvatar || undefined,
      name: editName || user?.name || 'User',
      phone: editPhone,
      email: editEmail,
      bloodGroup: editBlood,
      emergencyContact: editEmergency,
      allergies: editAllergies,
      abhaId: editAbha,
      abhaVerified,
      abhaName: abhaVerified ? (editName || user?.name) : user?.abhaName,
    });
    toast.success('Profile updated');
    setSubPage('main');
  };

  const openEditProfile = () => {
    setEditName(user?.name || '');
    setEditPhone(user?.phone || '');
    setEditEmail(user?.email || '');
    setEditBlood(user?.bloodGroup || '');
    setEditEmergency(user?.emergencyContact || '');
    setEditAllergies(user?.allergies || '');
    setEditAbha(user?.abhaId || '');
    setAbhaStatus(user?.abhaVerified ? 'valid' : 'idle');
    setEditAvatar(user?.avatar || '');
    setSubPage('editProfile');
  };

  /** Simulates secure ABDM consent-based fetch of linked insurance policies. */
  const handleAbhaFetch = async () => {
    if (!abhaConsent || abhaStatus !== 'valid') return;
    setAbhaFetching(true);
    try {
      // Simulate ABDM HIE (Health Information Exchange) API call
      await new Promise((r) => setTimeout(r, 2500));
      // In production, this would call ABDM's consent flow APIs:
      // 1. POST /v0.5/consent-requests/init — Create consent request
      // 2. User grants consent via ABDM app/PHR
      // 3. POST /v0.5/health-information/fetch — Fetch encrypted health data
      // 4. Decrypt with session key → Extract policy information
      const simulatedPolicy = {
        id: `abha-${editAbha}`,
        name: 'Star Health Comprehensive Plan',
        insurer: 'Star Health Insurance',
        coverageAmount: 500000,
        validityDate: '2027-03-31',
        status: 'Active' as const,
        covered: [
          'In-patient hospitalization',
          'Day care procedures (590+)',
          'Pre & post hospitalization (60/180 days)',
          'Ambulance charges up to ₹2,500',
          'Organ donor expenses',
          'AYUSH treatments',
        ],
        excluded: [
          'Pre-existing diseases (4 year waiting)',
          'Cosmetic procedures',
          'Dental unless accidental',
          'Self-inflicted injuries',
        ],
      };
      await applyPolicyAnalysis(simulatedPolicy, { base64: '', mimeType: 'application/json' });
      toast.success('Policy details fetched securely via ABDM!');
    } catch {
      toast.error('Failed to fetch policy details. Please try again.');
    } finally {
      setAbhaFetching(false);
    }
  };

  // ── SUB-PAGES ──

  if (subPage === 'policies') {
    return (
      <div className="px-6 py-6 min-h-screen">
        <header className="flex items-center gap-4 mb-8">
          <button type="button" onClick={() => setSubPage('main')} className="rounded-lg p-1 text-text-main hover:bg-gray-100 dark:hover:bg-white/10"><ChevronLeft className="h-6 w-6" /></button>
          <h2 className="font-display text-xl font-bold text-text-main">My Policies</h2>
        </header>
        {activePolicy ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-gradient-to-br from-navy to-navy-light p-6 text-white shadow-elevated">
              <div className="flex items-center justify-between mb-4">
                <span className="rounded-full bg-success px-3 py-1 text-[10px] font-bold uppercase tracking-wider">{activePolicy.status}</span>
              </div>
              <h3 className="font-display text-xl font-bold mb-1">{activePolicy.name}</h3>
              <p className="text-sm text-white/60 mb-4">Insurer: {activePolicy.insurer}</p>
              <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                <div><p className="text-[10px] uppercase tracking-widest text-white/40">Coverage</p><p className="font-display text-lg font-bold">₹{activePolicy.coverageAmount.toLocaleString('en-IN')}</p></div>
                <div><p className="text-[10px] uppercase tracking-widest text-white/40">Valid Until</p><p className="font-display text-lg font-bold">{activePolicy.validityDate}</p></div>
              </div>
            </div>
            <div className="rounded-xl bg-surface p-5 shadow-card">
              <h4 className="font-display text-sm font-bold text-text-main mb-3">Covered Items</h4>
              <ul className="space-y-2">{activePolicy.covered.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text-main"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />{item}</li>
              ))}</ul>
            </div>
            <button type="button" onClick={() => setCurrentTab('policy')} className="w-full rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-bold text-primary hover:bg-primary/10">
              Upload or View Policy Details →
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Shield size={48} className="mb-4 text-gray-300 dark:text-slate-500" />
            <p className="text-sm font-medium text-text-muted mb-4">No policies linked yet</p>
            <button type="button" onClick={() => setCurrentTab('policy')} className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-glow">Upload Policy</button>
          </div>
        )}
      </div>
    );
  }

  if (subPage === 'ehealth') {
    return (
      <div className="px-6 py-6 min-h-screen">
        <header className="flex items-center gap-4 mb-8">
          <button type="button" onClick={() => setSubPage('main')} className="rounded-lg p-1 text-text-main hover:bg-gray-100 dark:hover:bg-white/10"><ChevronLeft className="h-6 w-6" /></button>
          <h2 className="font-display text-xl font-bold text-text-main">E-Health Card</h2>
        </header>
        {user?.abhaVerified && user?.abhaId ? (
          <div className="space-y-6">
            {/* Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-6 text-white shadow-elevated">
              <div className="absolute right-4 top-4 opacity-10"><Shield size={64} /></div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">ABHA Health Card</p>
              <h3 className="font-display text-2xl font-bold mb-1">{user.abhaName || user.name}</h3>
              <p className="font-mono text-lg tracking-wider mb-4">{user.abhaId.replace(/(\d{2})(\d{4})(\d{4})(\d{4})/, '$1-$2-$3-$4')}</p>
              <div className="grid grid-cols-2 gap-3 border-t border-white/20 pt-4 text-sm">
                {user.abhaDob && <div><p className="text-[10px] uppercase text-white/40">DOB</p><p className="font-semibold">{user.abhaDob}</p></div>}
                {user.abhaGender && <div><p className="text-[10px] uppercase text-white/40">Gender</p><p className="font-semibold">{user.abhaGender}</p></div>}
                {user.bloodGroup && <div><p className="text-[10px] uppercase text-white/40">Blood Group</p><p className="font-semibold">{user.bloodGroup}</p></div>}
                {user.emergencyContact && <div><p className="text-[10px] uppercase text-white/40">Emergency</p><p className="font-semibold">{user.emergencyContact}</p></div>}
              </div>
              {user.allergies && (
                <div className="mt-3 border-t border-white/20 pt-3"><p className="text-[10px] uppercase text-white/40">Known Allergies</p><p className="text-sm font-semibold">{user.allergies}</p></div>
              )}
              <div className="mt-4 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-white/80" />
                <span className="text-[11px] font-semibold text-white/70">Verified via Ayushman Bharat</span>
              </div>
            </div>
            {/* Details */}
            <div className="rounded-xl bg-surface p-5 shadow-card space-y-3">
              <h4 className="font-display text-sm font-bold text-text-main">Account Details</h4>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex justify-between text-sm"><span className="text-text-muted">Full Name</span><span className="font-semibold text-text-main">{user.abhaName || user.name}</span></div>
                <div className="flex justify-between text-sm"><span className="text-text-muted">ABHA Number</span><span className="font-mono font-semibold text-text-main">{user.abhaId}</span></div>
                <div className="flex justify-between text-sm"><span className="text-text-muted">Phone</span><span className="font-semibold text-text-main">{user.phone || '—'}</span></div>
                <div className="flex justify-between text-sm"><span className="text-text-muted">Email</span><span className="font-semibold text-text-main">{user.email || '—'}</span></div>
              </div>
            </div>

            {/* Digital Health Records */}
            <div className="rounded-xl bg-surface p-5 shadow-card space-y-4">
              <h4 className="font-display text-sm font-bold text-text-main">Digital Health Records</h4>
              <p className="text-xs text-text-muted">Claims history and diagnostic reports processed through your insurance.</p>
              {claims.length > 0 ? (
                <div className="space-y-3">
                  {claims.slice(0, 5).map((claim) => (
                    <div key={claim.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3 dark:border-white/5 dark:bg-white/5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text-main truncate">{claim.title}</p>
                        <p className="text-[11px] text-text-muted">{claim.date} · Ref: <span className="font-mono">{claim.id}</span></p>
                      </div>
                      <div className="shrink-0 ml-4 text-right">
                        <p className="text-sm font-bold text-text-main">₹{claim.amount.toLocaleString('en-IN')}</p>
                        <span className={cn(
                          'inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase',
                          claim.status === 'Approved' ? 'bg-success/10 text-success' :
                          claim.status === 'Rejected' ? 'bg-danger/10 text-danger' :
                          'bg-warning/10 text-warning'
                        )}>{claim.status}</span>
                      </div>
                    </div>
                  ))}
                  {claims.length > 5 && (
                    <p className="text-center text-xs text-text-muted">+ {claims.length - 5} more records</p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 py-8 text-center dark:border-white/10 dark:bg-white/5">
                  <ClipboardList size={28} className="mx-auto mb-2 text-gray-300 dark:text-slate-500" />
                  <p className="text-xs text-text-muted">No health records yet. File a claim to see records here.</p>
                </div>
              )}
            </div>

            {/* Government Scheme Eligibility */}
            <div className="rounded-xl bg-surface p-5 shadow-card space-y-4">
              <h4 className="font-display text-sm font-bold text-text-main">Government Scheme Eligibility</h4>
              <p className="text-xs text-text-muted">Based on your ABHA registration, you may be eligible for the following schemes.</p>
              <div className="space-y-3">
                <div className="rounded-lg border border-primary/15 bg-primary/5 p-4 dark:border-primary/25 dark:bg-primary/10">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"><Shield size={18} /></div>
                    <div>
                      <h5 className="text-sm font-bold text-text-main">Ayushman Bharat PM-JAY</h5>
                      <p className="mt-1 text-xs text-text-muted leading-relaxed">Up to ₹5 lakh annual health cover per family for secondary and tertiary care hospitalization. Covers 1,929+ procedures including surgeries, medical treatments, and day care.</p>
                      <span className="mt-2 inline-block rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success uppercase">ABHA Linked</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 dark:border-white/5 dark:bg-white/5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent"><Heart size={18} /></div>
                    <div>
                      <h5 className="text-sm font-bold text-text-main">Pradhan Mantri Suraksha Bima Yojana</h5>
                      <p className="mt-1 text-xs text-text-muted leading-relaxed">Accidental insurance cover of ₹2 lakh for death/full disability and ₹1 lakh for partial disability at ₹20/year premium.</p>
                      <span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 uppercase dark:bg-amber-300/20 dark:text-amber-200">Check Eligibility</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 dark:border-white/5 dark:bg-white/5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-400/20 dark:text-indigo-300"><ShieldCheck size={18} /></div>
                    <div>
                      <h5 className="text-sm font-bold text-text-main">Pradhan Mantri Jeevan Jyoti Bima Yojana</h5>
                      <p className="mt-1 text-xs text-text-muted leading-relaxed">Life insurance cover of ₹2 lakh in case of death due to any reason, at a premium of ₹436/year for ages 18–50.</p>
                      <span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 uppercase dark:bg-amber-300/20 dark:text-amber-200">Check Eligibility</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CreditCard size={48} className="mb-4 text-gray-300 dark:text-slate-500" />
            <p className="text-sm font-medium text-text-muted mb-2">No ABHA ID linked</p>
            <p className="text-xs text-text-muted mb-6 max-w-xs">Add and verify your 14-digit ABHA ID in your profile to view your e-health card.</p>
            <button type="button" onClick={openEditProfile} className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-glow">Edit Profile & Add ABHA</button>
          </div>
        )}
      </div>
    );
  }

  if (subPage === 'editProfile') {
    const inputCls = "w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-text-main outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-navy-light dark:text-white";
    const labelCls = "block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5";
    return (
      <div className="px-6 py-6 min-h-screen pb-28">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setSubPage('main')} className="rounded-lg p-1 text-text-main hover:bg-gray-100 dark:hover:bg-white/10"><ChevronLeft className="h-6 w-6" /></button>
            <h2 className="font-display text-xl font-bold text-text-main">Edit Profile</h2>
          </div>
          <button type="button" onClick={saveProfile} className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-glow"><Save size={16} />Save</button>
        </header>
        <div className="max-w-xl mx-auto space-y-6">
          {/* Avatar Picker */}
          <div className="rounded-xl bg-surface p-5 shadow-card space-y-4">
            <h3 className="font-display text-sm font-bold text-text-main">Profile Picture</h3>
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-full border-4 border-primary/20 p-0.5 shrink-0">
                <img
                  src={editAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${editName || 'User'}`}
                  alt="Selected avatar"
                  className="w-full h-full rounded-full bg-gray-100 dark:bg-slate-800"
                />
              </div>
              <div className="flex-1">
                <p className="text-xs text-text-muted mb-3">Choose a default avatar</p>
                <div className="flex gap-2 flex-wrap">
                  {DEFAULT_AVATARS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setEditAvatar(av.url)}
                      className={cn(
                        'w-12 h-12 rounded-full border-2 p-0.5 transition-all hover:scale-110',
                        editAvatar === av.url ? 'border-primary ring-2 ring-primary/30 scale-110' : 'border-gray-200 dark:border-white/10'
                      )}
                    >
                      <img src={av.url} alt={av.label} className="w-full h-full rounded-full bg-gray-50" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-surface p-5 shadow-card space-y-4">
            <h3 className="font-display text-sm font-bold text-text-main">Personal Details</h3>
            <div><label className={labelCls}>Full Name</label><input value={editName} onChange={(e) => setEditName(e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Phone</label><input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Email</label><input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className={inputCls} /></div>
          </div>
          <div className="rounded-xl bg-surface p-5 shadow-card space-y-4">
            <h3 className="font-display text-sm font-bold text-text-main">Medical Info</h3>
            <div><label className={labelCls}>Blood Group</label>
              <select value={editBlood} onChange={(e) => setEditBlood(e.target.value)} className={inputCls}>
                <option value="">Select</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Emergency Contact</label><input value={editEmergency} onChange={(e) => setEditEmergency(e.target.value)} placeholder="+91 XXXXX XXXXX" className={inputCls} /></div>
            <div><label className={labelCls}>Known Allergies</label><input value={editAllergies} onChange={(e) => setEditAllergies(e.target.value)} placeholder="e.g. Penicillin, Peanuts" className={inputCls} /></div>
          </div>
          <div className="rounded-xl bg-surface p-5 shadow-card space-y-4">
            <h3 className="font-display text-sm font-bold text-text-main">ABHA ID Verification</h3>
            <p className="text-xs text-text-muted">Enter your 14-digit Ayushman Bharat Health Account number.</p>
            <div className="flex gap-3">
              <input value={editAbha} onChange={(e) => { setEditAbha(e.target.value.replace(/\D/g, '').slice(0, 14)); setAbhaStatus('idle'); }} placeholder="00-0000-0000-0000" maxLength={14} className={cn(inputCls, 'font-mono tracking-wider flex-1', abhaStatus === 'valid' && 'border-success ring-success/20', abhaStatus === 'invalid' && 'border-danger ring-danger/20')} />
              <button type="button" onClick={verifyAbha} disabled={editAbha.length !== 14} className="shrink-0 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white disabled:opacity-40">Verify</button>
            </div>
            {abhaStatus === 'valid' && <p className="flex items-center gap-2 text-sm text-success font-semibold"><CheckCircle2 size={16} />ABHA ID is valid</p>}
            {abhaStatus === 'invalid' && <p className="flex items-center gap-2 text-sm text-danger font-semibold"><AlertCircle size={16} />Invalid ABHA ID (checksum failed)</p>}

            {/* ABHA Consent-based policy fetch */}
            {abhaStatus === 'valid' && (
              <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4 dark:border-primary/30 dark:bg-primary/10">
                <h4 className="text-sm font-bold text-text-main mb-1 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-primary" />
                  Fetch Linked Insurance Details
                </h4>
                <p className="text-xs text-text-muted leading-relaxed mb-3">
                  With your consent, ClaimSaathi can securely retrieve your insurance policy details linked to your ABHA account via the ABDM Health Information Exchange. Your data is encrypted end-to-end and never stored on third-party servers.
                </p>
                <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-navy-light mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">Data that will be accessed:</p>
                  <ul className="space-y-1 text-xs text-text-muted">
                    <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-primary shrink-0" />Insurance policy name & provider</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-primary shrink-0" />Coverage amount & validity period</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-primary shrink-0" />Covered procedures & exclusions</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-primary shrink-0" />Cashless hospital network</li>
                  </ul>
                </div>
                <label className="flex items-start gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={abhaConsent}
                    onChange={(e) => setAbhaConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary accent-primary"
                  />
                  <span className="text-xs text-text-muted leading-relaxed">
                    I consent to ClaimSaathi accessing my insurance records via ABDM. I understand that my data will be encrypted and used solely for displaying my policy information within this app.
                  </span>
                </label>
                <button
                  type="button"
                  disabled={!abhaConsent || abhaFetching}
                  onClick={handleAbhaFetch}
                  className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {abhaFetching ? (
                    <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Fetching securely…</>
                  ) : (
                    <><ShieldCheck size={16} />Fetch Policy Details</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN PROFILE ──

  const sections = [
    { title: 'My Documents', items: [
      { id: 'policies', label: 'My Policies', icon: Shield, badge: activePolicy ? '1' : undefined, action: () => setSubPage('policies') },
      { id: 'id-cards', label: 'E-Health Card', icon: CreditCard, action: () => setSubPage('ehealth') },
    ]},
    { title: 'Account', items: [
      { id: 'edit-profile', label: 'Edit Profile & ABHA', icon: Edit3, action: openEditProfile },
    ]},
    { title: 'Preferences', items: [
      { id: 'dark-mode', label: 'Dark Mode', icon: theme === 'dark' ? Moon : Sun, type: 'toggle' as const, action: toggleTheme, active: theme === 'dark' },
      { id: 'notifications', label: 'Notifications', icon: Bell, type: 'toggle' as const, action: toggleNotifications, active: notificationsEnabled },
      { id: 'language', label: 'Language Preference', icon: Globe, value: languageLabel, action: cycleLanguage },
    ]},
    { title: 'Support', items: [
      { id: 'hospitals', label: 'Nearby Cashless Hospitals', icon: MapPin, action: openNearbyHospitals },
      { id: 'faq', label: 'Help & FAQ', icon: HelpCircle, action: openFaq },
    ]},
  ];

  return (
    <div className="px-6 py-10 min-h-screen">
      <div className="flex flex-col items-center mb-10">
        <div className="relative mb-4">
           <div className="w-24 h-24 rounded-full border-4 border-primary/20 p-0.5">
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`}
                alt="Profile"
                className="w-full h-full rounded-full bg-gray-100 dark:bg-slate-800"
              />
           </div>
           <button
             onClick={openEditProfile}
             className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center border-2 border-surface shadow-lg"
           >
              <Camera size={14} />
           </button>
        </div>
        <h2 className="font-display font-bold text-xl text-text-main">{user?.name || 'User'}</h2>
        <p className="text-text-muted text-sm italic">{user?.phone || user?.email || 'No contact info'}</p>
        {user?.abhaVerified && <span className="mt-2 bg-success/10 text-success px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">ABHA Verified</span>}
        {!user?.abhaVerified && <span className="mt-2 bg-primary-light text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Verified User</span>}
      </div>

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

      <motion.div variants={STAGGER_CONTAINER} initial="initial" animate="animate" className="space-y-8">
        {sections.map((section) => (
          <motion.div key={section.title} variants={STAGGER_ITEM} className="space-y-3">
             <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-2">{section.title}</h3>
             <div className="bg-surface rounded-lg shadow-card overflow-hidden">
                {section.items.map((item: any, idx: number) => {
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
                            <ChevronRight size={16} className="text-gray-400 dark:text-slate-400" />
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
