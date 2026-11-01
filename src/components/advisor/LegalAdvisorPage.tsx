import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  HelpCircle,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  Layers,
  ExternalLink,
  RotateCcw,
  MessageSquare,
  Scale
} from 'lucide-react';
import { AuthBadge } from '../auth/AuthBadge';
import { apiClient } from '../../api/client';
import type {
  AdvisorSession,
  AdvisorMessage,
  AdvisorSourceItem
} from '../../api/types';

const INDIAN_STATES = [
  'All India (Central)',
  'Karnataka (Bengaluru)',
  'Maharashtra (Mumbai/Pune)',
  'Delhi NCR',
  'Tamil Nadu (Chennai)',
  'Telangana (Hyderabad)',
  'Uttar Pradesh',
  'West Bengal (Kolkata)',
  'Gujarat (Ahmedabad)',
  'Kerala',
  'Rajasthan',
  'Punjab / Haryana'
];

const DISPUTE_CATEGORIES = [
  'General Legal Query',
  'Tenancy & Security Deposit',
  'Consumer Grievance & E-commerce',
  'Cyber Fraud & Banking',
  'Employment & Labour',
  'Contract & Commercial Breach',
  'Property & Real Estate'
];

const SAMPLE_PROMPTS = [
  {
    title: 'Security Deposit Refund',
    text: 'My landlord in Bengaluru is refusing to return my security deposit of ₹80,000 after I vacated the flat on proper notice last month.',
    category: 'Tenancy & Security Deposit',
  },
  {
    title: 'E-commerce Defective Product',
    text: 'An e-commerce platform delivered a damaged laptop and has rejected my return request citing their internal 48-hour return window.',
    category: 'Consumer Grievance & E-commerce',
  },
  {
    title: 'Unpaid Salary & Relieving Letter',
    text: 'My previous employer has withheld my final two months of salary and is refusing to issue a relieving letter despite serving my notice period.',
    category: 'Employment & Labour',
  },
  {
    title: 'Unauthorized UPI Deduction',
    text: 'I fell victim to a fraudulent phishing call and lost ₹45,000 via unauthorized UPI debit transactions from my savings account.',
    category: 'Cyber Fraud & Banking',
  }
];

export const LegalAdvisorPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [session, setSession] = useState<AdvisorSession | null>(null);
  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [jurisdiction, setJurisdiction] = useState('India');
  const [stateRegion, setStateRegion] = useState('All India (Central)');
  const [incidentDate, setIncidentDate] = useState('');
  const [incidentCity, setIncidentCity] = useState('');
  const [category, setCategory] = useState('General Legal Query');
  const [showOptionalContext, setShowOptionalContext] = useState(false);

  // Status
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Initialize or restore session
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      setIsInitializing(true);
      setErrorMessage(null);
      try {
        const storedSessionId = sessionStorage.getItem('lh_advisor_session_id');
        if (storedSessionId) {
          try {
            const existing = await apiClient.getAdvisorSession(storedSessionId);
            if (isMounted) {
              setSession(existing);
              setMessages(existing.messages || []);
              if (existing.jurisdiction) setJurisdiction(existing.jurisdiction);
              setIsInitializing(false);
              return;
            }
          } catch {
            sessionStorage.removeItem('lh_advisor_session_id');
          }
        }

        // Create new session
        const newSession = await apiClient.createAdvisorSession('New Legal Inquiry', 'India', {
          state: stateRegion,
          category,
        });
        if (isMounted) {
          setSession(newSession);
          setMessages([]);
          sessionStorage.setItem('lh_advisor_session_id', newSession.id);
          setIsInitializing(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err.message || 'Failed to initialize advisory session. Verify the backend server is running.');
          setIsInitializing(false);
        }
      }
    }

    initSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleStartNewSession = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      sessionStorage.removeItem('lh_advisor_session_id');
      const newSession = await apiClient.createAdvisorSession('New Legal Inquiry', jurisdiction, {
        state: stateRegion,
        category,
        incidentCity,
        incidentDate,
      });
      setSession(newSession);
      setMessages([]);
      sessionStorage.setItem('lh_advisor_session_id', newSession.id);
      setInputText('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create a new session.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading || !session) return;

    // Optimistically add user message to list
    const tempUserMsg: AdvisorMessage = {
      id: `temp-${Date.now()}`,
      session_id: session.id,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInputText('');
    setIsLoading(true);
    setErrorMessage(null);

    const contextPayload: Record<string, any> = {
      state: stateRegion,
      category,
    };
    if (incidentCity) contextPayload.city = incidentCity;
    if (incidentDate) contextPayload.date = incidentDate;

    try {
      const response = await apiClient.sendAdvisorMessage(
        session.id,
        text,
        jurisdiction,
        contextPayload
      );

      setMessages((prev) => {
        // Replace temp or append
        const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
        return [...filtered, tempUserMsg, response];
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process inquiry. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-[#030308] text-white flex flex-col font-sans selection:bg-primary/30">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#050510]/80 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/explore')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all text-xs font-mono"
            title="Return to Tree of Knowledge"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Tree of Knowledge</span>
          </button>

          <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shadow-glow">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide flex items-center gap-2">
                <span>Legal Advisor</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                  India Jurisdiction
                </span>
              </h1>
              <p className="text-[11px] text-gray-400 hidden md:block">
                Cautious, structured legal intake and source-backed preliminary guidance
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleStartNewSession}
            disabled={isLoading || messages.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none border border-white/10 text-xs text-gray-300 hover:text-white transition-all font-mono"
            title="Start a fresh advisory session"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Session</span>
          </button>

          <button
            onClick={() => navigate('/tools/legal-research')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs text-cyan-300 transition-all font-mono"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Research Tool</span>
          </button>

          <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

          <AuthBadge />
        </div>
      </header>

      {/* Main Advisory Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-5">
        {/* Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-start gap-3 backdrop-blur-sm shadow-lg">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">Notice</p>
              <p className="text-gray-300">{errorMessage}</p>
            </div>
            <button
              onClick={() => handleSendMessage()}
              className="px-2.5 py-1 rounded-md bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-xs font-mono text-red-200 transition-all"
            >
              Retry
            </button>
          </div>
        )}

        {/* Conversation Stream */}
        <div className="flex-1 flex flex-col gap-5 min-h-[380px]">
          {isInitializing ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs font-mono">Initializing secure advisory session...</p>
            </div>
          ) : messages.length === 0 ? (
            /* Empty State: Intake Guidance & Suggested Prompts */
            <div className="flex-1 flex flex-col items-center justify-center py-8 px-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary/30 to-cyan-500/30 border border-white/10 flex items-center justify-center text-primary mb-4 shadow-glow">
                <Scale className="w-7 h-7 text-cyan-300" />
              </div>
              <h2 className="text-xl font-bold text-gray-100 mb-2">
                Describe Your Legal Situation
              </h2>
              <p className="text-xs text-gray-400 max-w-lg mb-8 leading-relaxed">
                Provide the key facts of your dispute or legal inquiry. Legal Advisor analyzes your case under Indian law, retrieves applicable statutory provisions, and outlines practical next steps.
              </p>

              {/* Sample Prompts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-w-3xl w-full text-left">
                {SAMPLE_PROMPTS.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCategory(sample.category);
                      handleSendMessage(sample.text);
                    }}
                    className="p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-primary/40 transition-all duration-200 flex flex-col gap-2 group shadow-elevated"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-200 group-hover:text-primary transition-colors">
                        {sample.title}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10">
                        {sample.category}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                      {sample.text}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Chat Messages List */
            <div className="flex flex-col gap-6 pb-2">
              {messages.map((msg, i) => (
                <div
                  key={msg.id || i}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  {msg.role === 'user' ? (
                    /* User Message Bubble */
                    <div className="max-w-2xl px-5 py-3.5 rounded-2xl bg-gradient-to-br from-primary/30 to-violet-900/30 border border-primary/40 text-gray-100 text-sm leading-relaxed shadow-elevated">
                      <div className="flex items-center gap-2 mb-1.5 text-[11px] font-mono text-primary/80">
                        <span>You</span>
                        <span>·</span>
                        <span>
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ) : (
                    /* Assistant Structured Card */
                    <div className="w-full rounded-2xl bg-[#070716]/90 border border-white/10 p-5 sm:p-7 shadow-elevated flex flex-col gap-5">
                      {/* Advisor Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-white/10">
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-md bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-semibold text-gray-200 tracking-wide font-sans">
                            Legal Advisor Assessment
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-gray-500">
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Structured View: Summary */}
                      {msg.structured_data?.summary && (
                        <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary-light flex items-start gap-2.5">
                          <Scale className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-white mr-1.5">Summary:</span>
                            <span className="text-gray-200">{msg.structured_data.summary}</span>
                          </div>
                        </div>
                      )}

                      {/* Applicable Legal Concepts Badges */}
                      {msg.structured_data?.legal_concepts && msg.structured_data.legal_concepts.length > 0 && (
                        <div>
                          <div className="text-[11px] font-mono uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                            <Layers className="w-3 h-3 text-cyan-400" />
                            <span>Relevant Legal Concepts (India)</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {msg.structured_data.legal_concepts.map((concept, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 rounded-md text-xs font-mono bg-cyan-500/10 border border-cyan-500/25 text-cyan-300"
                              >
                                {concept}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Plain-Language Explanation */}
                      <div>
                        <div className="text-[11px] font-mono uppercase tracking-wider text-gray-400 mb-2">
                          Legal Assessment & Explanation
                        </div>
                        <div className="text-sm text-gray-200 leading-relaxed space-y-2 whitespace-pre-wrap font-sans">
                          {msg.structured_data?.plain_language_explanation || msg.content}
                        </div>
                      </div>

                      {/* Practical Next Steps */}
                      {msg.structured_data?.practical_steps && msg.structured_data.practical_steps.length > 0 && (
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                          <div className="text-xs font-semibold text-gray-200 mb-2.5 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Recommended Practical Next Steps</span>
                          </div>
                          <ol className="space-y-2 text-xs text-gray-300">
                            {msg.structured_data.practical_steps.map((step, idx) => (
                              <li key={idx} className="flex items-start gap-2.5">
                                <span className="font-mono text-cyan-400 shrink-0 font-bold">
                                  {idx + 1}.
                                </span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* Missing Facts / Information Needed */}
                      {msg.structured_data?.missing_facts && msg.structured_data.missing_facts.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                          <div className="font-semibold text-amber-300 mb-1.5 flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                            <span>Additional Facts That Would Refine This Analysis</span>
                          </div>
                          <ul className="list-disc list-inside space-y-1 text-gray-300">
                            {msg.structured_data.missing_facts.map((fact, idx) => (
                              <li key={idx}>{fact}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Retrieved Sources & Citations */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-1">
                          <div className="text-[11px] font-mono uppercase tracking-wider text-gray-400 mb-2.5 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-primary" />
                            <span>Retrieved Authorities & Statutory Citations</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {msg.sources.map((source: AdvisorSourceItem) => (
                              <div
                                key={source.id}
                                className="p-3 rounded-lg bg-black/40 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between text-xs"
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="font-medium text-gray-200 line-clamp-1">
                                      {source.title}
                                    </span>
                                    <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400 uppercase">
                                      {source.source_type}
                                    </span>
                                  </div>
                                  <p className="text-[11px] font-mono text-cyan-300 mb-1.5">
                                    {source.citation}
                                  </p>
                                  <p className="text-[11px] text-gray-400 line-clamp-2 leading-snug">
                                    {source.excerpt}
                                  </p>
                                </div>
                                <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                                  {source.is_development_fixture ? (
                                    <span className="font-mono text-amber-400/80">
                                      Dev Fixture
                                    </span>
                                  ) : (
                                    <span className="font-mono text-emerald-400">
                                      Verified Source
                                    </span>
                                  )}
                                  {source.url && (
                                    <a
                                      href={source.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-primary hover:underline"
                                    >
                                      <span>Reference</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Clickable Follow-up Questions */}
                      {msg.structured_data?.follow_up_questions && msg.structured_data.follow_up_questions.length > 0 && (
                        <div className="pt-2">
                          <div className="text-[11px] font-mono text-gray-400 mb-2 flex items-center gap-1.5">
                            <MessageSquare className="w-3 h-3 text-cyan-400" />
                            <span>Suggested Follow-up Questions (Click to Ask):</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {msg.structured_data.follow_up_questions.map((q, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleSendMessage(q)}
                                disabled={isLoading}
                                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-primary/20 border border-white/10 hover:border-primary/40 text-xs text-gray-300 hover:text-white transition-all text-left flex items-center gap-2 group"
                              >
                                <span className="group-hover:translate-x-0.5 transition-transform">
                                  {q}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Cautious Disclaimer Notice */}
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 text-[11px] text-gray-400 flex items-start gap-2 leading-relaxed">
                        <ShieldAlert className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                        <span>
                          {msg.structured_data?.disclaimer ||
                            'Legal Helper provides legal information for educational purposes only. This does not constitute legal advice or an advocate-client relationship. Always consult a qualified advocate for advice on your specific legal situation.'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* In-Flight Thinking Indicator */}
              {isLoading && (
                <div className="w-full rounded-2xl bg-[#070716]/90 border border-primary/30 p-5 shadow-elevated flex items-center gap-3 text-xs text-gray-300">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>
                    Analyzing case facts, retrieving statutory sections, and synthesizing structured legal guidance...
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Optional Case Context Drawer */}
        <div className="rounded-xl bg-[#070716]/80 border border-white/10 overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => setShowOptionalContext(!showOptionalContext)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-mono text-gray-400 hover:text-white transition-colors bg-white/[0.02]"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                Optional Case Context: {stateRegion} · {category}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px]">
              <span>{showOptionalContext ? 'Hide Context Fields' : 'Add Context (Location, Dates, Category)'}</span>
              {showOptionalContext ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </div>
          </button>

          {showOptionalContext && (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 border-t border-white/10 bg-black/40 text-xs">
              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-cyan-400" />
                  <span>State / Jurisdiction</span>
                </label>
                <select
                  value={stateRegion}
                  onChange={(e) => setStateRegion(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#0e0e20] border border-white/15 text-gray-200 text-xs focus:outline-none focus:border-primary"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s} className="bg-[#0e0e20]">
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-primary" />
                  <span>Dispute Category</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#0e0e20] border border-white/15 text-gray-200 text-xs focus:outline-none focus:border-primary"
                >
                  {DISPUTE_CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-[#0e0e20]">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-cyan-400" />
                  <span>Specific City/Town</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pune, Bandra, Whitefield"
                  value={incidentCity}
                  onChange={(e) => setIncidentCity(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#0e0e20] border border-white/15 text-gray-200 text-xs focus:outline-none focus:border-primary placeholder:text-gray-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-violet-400" />
                  <span>Date / Timeframe</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. October 2024, 2 weeks ago"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#0e0e20] border border-white/15 text-gray-200 text-xs focus:outline-none focus:border-primary placeholder:text-gray-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* Fixed Prompt Input Area */}
        <div className="sticky bottom-4 z-20">
          <div className="p-2 sm:p-3 rounded-2xl bg-[#08081a]/95 border border-white/15 backdrop-blur-xl shadow-glow flex flex-col gap-2">
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                messages.length === 0
                  ? 'Describe your legal situation in plain language (e.g., facts, dates, what the other party did)...'
                  : 'Ask a follow-up question or provide more details...'
              }
              className="w-full px-3 py-2 bg-transparent text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none resize-none font-sans"
            />

            <div className="flex items-center justify-between px-2 pt-1 border-t border-white/10 text-xs">
              <span className="text-[11px] font-mono text-gray-500 hidden sm:inline">
                Shift + Enter for new line · Enter to submit
              </span>

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isLoading}
                className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-light hover:to-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-white font-medium text-xs shadow-glow transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>Submit to Advisor</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
