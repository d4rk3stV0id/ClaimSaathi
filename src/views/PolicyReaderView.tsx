import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import {
  CloudUpload,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  Info,
  Sparkles,
  Zap,
  Check,
  ShieldCheck,
  Mic,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { PolicyAnalysisLoader, AnimatedCard, AITypingIndicator } from '../components/UI';
import { FloatingButton } from '../components/SpecialUI';
import { cn } from '../lib/utils';
import { STAGGER_CONTAINER, STAGGER_ITEM } from '../constants';
import { analyzePolicyFromFile } from '../lib/policyAnalysis';
import { askAboutPolicy, type PolicyChatTurn } from '../lib/policyChat';
import {
  policyChatInputPlaceholder,
  policyChatSuggestions,
  policyChatWelcomeMessage,
} from '../lib/policyChatUiCopy';
import { isBrowserSpeechRecognitionAvailable, startSpeechRecognition } from '../lib/speechRecognition';

type ChatRow = { id: string; role: 'user' | 'ai'; content: string };

export const PolicyReaderView = () => {
  const { user, activePolicy, policyDocument, applyPolicyAnalysis, clearActivePolicy, setCurrentTab, language } =
    useStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusText, setStatusText] = useState('Reading your document…');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatRow[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const speechSessionRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    return () => {
      speechSessionRef.current?.stop();
      speechSessionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isChatOpen, chatMessages, chatSending]);

  const runAnalysis = useCallback(
    async (file: File) => {
      setIsAnalyzing(true);
      setStatusText('Reading your document…');
      setChatMessages([]);
      try {
        setStatusText('Reading your policy with Gemini…');
        const { policy, document } = await analyzePolicyFromFile(file);
        setStatusText('Preparing your coverage overview…');
        await applyPolicyAnalysis(policy, document);
        const lang = useStore.getState().language;
        setChatMessages([
          {
            id: crypto.randomUUID(),
            role: 'ai',
            content: policyChatWelcomeMessage(policy, lang),
          },
        ]);
        toast.success('Policy summary ready');
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Something went wrong';
        toast.error(message);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [applyPolicyAnalysis, language],
  );

  const sendChatMessage = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || chatSending) return;
      const doc = useStore.getState().policyDocument;
      const pol = useStore.getState().activePolicy;
      if (!doc || !pol) {
        toast.error('Upload your policy again to use chat.');
        return;
      }

      const userMsg: ChatRow = { id: crypto.randomUUID(), role: 'user', content: text };
      setChatMessages((prev) => [...prev, userMsg]);
      setChatInput('');
      setChatSending(true);

      const history: PolicyChatTurn[] = chatMessages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        content: m.content,
      }));

      try {
        const answer = await askAboutPolicy({
          base64: doc.base64,
          mimeType: doc.mimeType,
          extractedText: doc.extractedText,
          policy: pol,
          history,
          question: text,
          responseLanguage: language,
        });
        setChatMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'ai', content: answer }]);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Could not get an answer';
        toast.error(message);
        setChatMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'ai',
            content: `I could not answer right now.\n\nReason: ${message}`,
          },
        ]);
      } finally {
        setChatSending(false);
      }
    },
    [chatMessages, chatSending, language],
  );

  const toggleVoiceInput = useCallback(() => {
    if (!isBrowserSpeechRecognitionAvailable()) {
      toast.error('Voice typing is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    if (chatSending) return;
    if (isListening) {
      speechSessionRef.current?.stop();
      speechSessionRef.current = null;
      setIsListening(false);
      return;
    }
    speechSessionRef.current?.stop();
    setIsListening(true);
    speechSessionRef.current = startSpeechRecognition({
      language,
      onFinal: (said) => {
        if (said) {
          setChatInput((prev) => (prev ? `${prev.trimEnd()} ${said}` : said));
        }
        setIsListening(false);
        speechSessionRef.current = null;
      },
      onError: (msg) => {
        toast.error(msg);
        setIsListening(false);
        speechSessionRef.current = null;
      },
      onEnd: () => {
        setIsListening(false);
        speechSessionRef.current = null;
      },
    });
  }, [chatSending, isListening, language]);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: { errors: { code: string }[] }[]) => {
      if (fileRejections.length > 0) {
        toast.error('Please upload a PDF or image (JPG/PNG).');
        return;
      }
      const file = acceptedFiles[0];
      if (file) void runAnalysis(file);
    },
    [runAnalysis],
  );

  const dropzoneOptions: any = {
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] },
    multiple: false,
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone(dropzoneOptions);

  return (
    <div className="min-h-screen bg-background pb-28 font-sans lg:pb-16">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-background/90 backdrop-blur-md dark:border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-12">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setCurrentTab('home')}
              className="rounded-lg p-1 text-text-main transition-colors hover:bg-gray-100 dark:hover:bg-white/10"
              aria-label="Go back"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <h2 className="font-display text-xl font-bold text-text-main dark:text-white">My Policy</h2>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-text-muted transition-colors hover:bg-gray-100 dark:hover:bg-white/10"
            aria-label="Info"
          >
            <Info className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-12 lg:py-10">
        <AnimatePresence mode="wait">
          {!activePolicy && !isAnalyzing && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div 
                {...getRootProps()} 
                className={cn(
                  'relative mx-auto flex min-h-[360px] w-full max-w-3xl flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition-all duration-300 lg:min-h-[420px]',
                  isDragActive
                    ? 'border-primary bg-primary-light/30 ring-4 ring-primary/15'
                    : 'border-gray-200 bg-surface shadow-card dark:border-white/15',
                )}
              >
                <input {...getInputProps()} />
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6"
                >
                  <CloudUpload className="text-primary w-10 h-10" />
                </motion.div>
                <h3 className="mb-2 font-display text-xl font-bold text-text-main">Upload Policy PDF</h3>
                <p className="mb-6 text-sm text-text-muted">Or upload a clear photo of your policy document (JPG / PNG).</p>
                <div className="rounded-full bg-primary px-8 py-3 text-sm font-bold text-white shadow-glow">Select file</div>
                
                {/* Simulated rotating border effect using CSS animation (defined in index.css or inline) */}
                <div className="absolute inset-0 border-2 border-dashed border-primary/20 rounded-lg pointer-events-none animate-[spin_60s_linear_infinite]" />
              </div>

              {/* Tips Section */}
              <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-surface p-4 shadow-card dark:border-white/10">
                  <Zap className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-bold text-text-main">AI analysis</p>
                    <p className="mt-1 text-xs text-text-muted">We read the fine print from your file.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-surface p-4 shadow-card dark:border-white/10">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <div>
                    <p className="text-sm font-bold text-text-main">Smart tips</p>
                    <p className="mt-1 text-xs text-text-muted">Suggestions to make the most of coverage.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {isAnalyzing && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="rounded-xl bg-surface p-6 shadow-card dark:bg-surface"
            >
              <PolicyAnalysisLoader statusText={statusText} />
            </motion.div>
          )}

          {activePolicy && !isAnalyzing && (
            <motion.div
              key="results"
              variants={STAGGER_CONTAINER}
              initial="initial"
              animate="animate"
              className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10"
            >
              <motion.section
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-lg bg-gradient-to-br from-navy to-navy-light p-6 text-white shadow-elevated lg:col-span-2 lg:p-8"
              >
                <div className="pointer-events-none absolute right-4 top-4 opacity-10 lg:right-8 lg:top-8">
                  <ShieldCheck size={72} className="lg:h-24 lg:w-24" />
                </div>
                <h3 className="relative mb-6 font-display text-2xl font-bold tracking-tight lg:text-3xl">{activePolicy.name}</h3>
                <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-[1fr_min(280px,40%)] lg:items-end">
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-widest text-white/50">Sum insured</p>
                    {activePolicy.coverageAmount > 0 ? (
                      <p className="font-display text-3xl font-bold lg:text-4xl">
                        ₹{activePolicy.coverageAmount.toLocaleString('en-IN')}
                      </p>
                    ) : (
                      <>
                        <p className="font-display text-xl font-bold">Not found in file</p>
                        <p className="mt-2 max-w-xl text-sm text-white/65">
                          Check the declaration or schedule in your PDF for the sum insured amount.
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 border-t border-white/10 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/50">Insurer</p>
                    <p className="text-base font-semibold leading-snug text-white/95">{activePolicy.insurer}</p>
                  </div>
                </div>
              </motion.section>

              <AnimatedCard
                hoverable={false}
                className="rounded-lg border border-success/15 bg-success/5 p-6 shadow-card lg:p-8 dark:border-success/25 dark:bg-success/10"
              >
                <div className="mb-6 flex items-center gap-3">
                  <CheckCircle2 className="h-7 w-7 text-success" />
                  <h4 className="font-display text-lg font-bold text-success lg:text-xl">What&apos;s covered</h4>
                </div>
                <ul className="space-y-4">
                  {activePolicy.covered.map((item, idx) => (
                    <motion.li
                      key={`${idx}-${item.slice(0, 24)}`}
                      variants={STAGGER_ITEM}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.03 * idx }}
                      className="flex gap-3 border-b border-success/10 pb-4 last:border-0 last:pb-0 dark:border-white/10"
                    >
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-success" strokeWidth={2.5} />
                      <span className="text-[15px] leading-relaxed text-text-main">{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </AnimatedCard>

              <AnimatedCard
                hoverable={false}
                className="rounded-lg border border-danger/15 bg-danger/5 p-6 shadow-card lg:p-8 dark:border-danger/25 dark:bg-danger/10"
              >
                <div className="mb-6 flex items-center gap-3">
                  <XCircle className="h-7 w-7 text-danger" />
                  <h4 className="font-display text-lg font-bold text-danger lg:text-xl">Exclusions</h4>
                </div>
                <ul className="space-y-4">
                  {activePolicy.excluded.map((item, idx) => (
                    <motion.li
                      key={`${idx}-${item.slice(0, 24)}`}
                      variants={STAGGER_ITEM}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.03 * idx }}
                      className="flex gap-3 border-b border-danger/10 pb-4 last:border-0 last:pb-0 dark:border-white/10"
                    >
                      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" strokeWidth={2.25} />
                      <span className="text-[15px] leading-relaxed text-text-main">{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </AnimatedCard>

              <div className="flex flex-col gap-6 lg:col-span-2 lg:flex-row lg:items-start lg:justify-between">
                {activePolicy.disclaimer ? (
                  <div className="flex-1 rounded-lg border border-gray-100 bg-surface p-5 shadow-card dark:border-white/10">
                    <div className="flex gap-3">
                      <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <p className="text-sm leading-relaxed text-text-muted">{activePolicy.disclaimer}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1" />
                )}
                <button
                  type="button"
                  onClick={() => {
                    clearActivePolicy();
                    setChatMessages([]);
                    setIsChatOpen(false);
                  }}
                  className="w-full shrink-0 rounded-lg border border-primary/30 bg-primary/5 px-6 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/10 lg:w-auto"
                >
                  Upload a different policy
                </button>
              </div>

              <FloatingButton label="Ask about my policy" icon={Sparkles} onClick={() => setIsChatOpen(true)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chat Drawer */}
      <AnimatePresence>
        {isChatOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChatOpen(false)}
              className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[70] flex h-[80vh] flex-col rounded-t-xl bg-white text-slate-900 shadow-[0_-8px_40px_rgba(15,30,61,0.12)] dark:bg-[#152238] dark:text-slate-50"
            >
              <div className="mx-auto mt-3 mb-6 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-500" />
              <div className="mb-4 flex items-center justify-between px-6">
                <div className="flex items-center gap-2">
                   <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                      <Sparkles size={16} className="text-white" />
                   </div>
                   <div>
                     <h3 className="font-display text-lg font-bold text-[#0f1e3d] dark:text-white">Policy Saathi</h3>
                     <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                       {language === 'en'
                         ? 'Ask in English or change app language in Profile for Hindi / Tamil / Telugu / Bangla replies.'
                         : 'Assistant replies in your app language. Change it anytime in Profile.'}
                     </p>
                   </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsChatOpen(false)}
                  className="rounded-full p-1 text-slate-600 hover:bg-slate-100 hover:text-[#0f1e3d] dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label="Close"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto bg-slate-50/80 px-6 pb-32 dark:bg-[#0f1e3d]/50">
                {chatMessages.length === 0 ? (
                  <p className="py-8 text-center text-sm font-medium text-slate-600 dark:text-slate-300">
                    Open after analyzing a policy to chat here.
                  </p>
                ) : (
                  chatMessages.map((msg) =>
                    msg.role === 'ai' ? (
                      <div key={msg.id} className="flex gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 dark:bg-primary/25">
                          <ShieldCheck size={16} className="text-primary" />
                        </div>
                        <div className="max-w-[min(88%,32rem)] rounded-2xl rounded-tl-md border-2 border-slate-200 bg-white p-4 text-[15px] leading-relaxed text-[#0f172a] shadow-sm dark:border-slate-600 dark:bg-[#1a2f5a] dark:text-slate-100">
                          {msg.content.split('**').map((chunk, i) =>
                            i % 2 === 1 ? (
                              <strong key={i} className="font-semibold text-[#0f1e3d] dark:text-white">
                                {chunk}
                              </strong>
                            ) : (
                              <span key={i}>{chunk}</span>
                            ),
                          )}
                          {msg.id === chatMessages[0]?.id && msg.role === 'ai' ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {policyChatSuggestions(language).map((q) => (
                                <button
                                  key={q}
                                  type="button"
                                  disabled={chatSending || !policyDocument}
                                  onClick={() => void sendChatMessage(q)}
                                  className="rounded-full bg-[#0f1e3d] px-3 py-2 text-left text-xs font-semibold leading-snug text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-40 dark:bg-white dark:text-[#0f1e3d]"
                                >
                                  {q}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div key={msg.id} className="flex justify-end gap-3">
                        <div className="max-w-[min(88%,32rem)] rounded-2xl rounded-tr-md bg-primary px-4 py-3 text-[15px] leading-relaxed text-white shadow-md ring-2 ring-primary/25">
                          {msg.content}
                        </div>
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold uppercase text-white">
                          {user?.name ? user.name.charAt(0) : 'U'}
                        </div>
                      </div>
                    ),
                  )
                )}
                {chatSending ? (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 dark:bg-primary/25">
                      <ShieldCheck size={16} className="text-primary" />
                    </div>
                    <div className="rounded-2xl rounded-tl-md border-2 border-slate-200 bg-white px-4 py-3 dark:border-slate-600 dark:bg-[#1a2f5a]">
                      <AITypingIndicator />
                    </div>
                  </div>
                ) : null}
                <div ref={chatEndRef} />
              </div>

              <div className="fixed bottom-0 left-0 right-0 z-[71] border-t-2 border-slate-200 bg-white p-6 dark:border-slate-600 dark:bg-[#152238]">
                <div className="flex gap-2 sm:gap-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void sendChatMessage(chatInput);
                      }
                    }}
                    placeholder={policyChatInputPlaceholder(language, !!policyDocument)}
                    disabled={!policyDocument || chatSending}
                    className="min-h-[48px] flex-1 rounded-full border-2 border-slate-300 bg-white px-5 py-3 text-[15px] text-[#0f172a] placeholder:text-slate-500 shadow-inner outline-none transition-colors focus:border-primary disabled:opacity-50 dark:border-slate-500 dark:bg-[#1a2f5a] dark:text-slate-100 dark:placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    disabled={!policyDocument || chatSending}
                    onClick={() => toggleVoiceInput()}
                    className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-slate-700 shadow-inner transition-colors hover:border-primary hover:text-primary disabled:opacity-40 dark:border-slate-500 dark:bg-[#1a2f5a] dark:text-slate-200 dark:hover:border-primary',
                      isListening && 'animate-pulse border-red-400 text-red-600 dark:border-red-500 dark:text-red-400',
                    )}
                    aria-label={isListening ? 'Stop voice input' : 'Voice to text'}
                    title={isListening ? 'Stop listening' : 'Speak your question'}
                  >
                    <Mic size={22} />
                  </button>
                  <button
                    type="button"
                    disabled={!policyDocument || chatSending || !chatInput.trim()}
                    onClick={() => void sendChatMessage(chatInput)}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-glow ring-2 ring-white disabled:opacity-40 dark:ring-[#152238]"
                    aria-label="Send"
                  >
                    <Sparkles size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
