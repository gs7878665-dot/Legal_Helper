import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Briefcase,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  Download,
  Printer,
  PlusCircle,
  History,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { AuthBadge } from '../auth/AuthBadge';
import type { LawyerPreparationItem } from '../../api/types';

const ISSUE_CATEGORIES = [
  'Property & Tenancy Dispute',
  'Consumer Rights & Deficiency in Service',
  'Employment & Workplace Issue',
  'Commercial Contract & Business Dispute',
  'Family & Matrimonial Matter',
  'Cyber Crime & Online Fraud',
  'Cheque Bounce (Sec 138 NI Act)',
  'Criminal Defense / Police Complaint',
  'Other Civil Grievance',
];

const INDIAN_STATES = [
  'Delhi',
  'Maharashtra',
  'Karnataka',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'West Bengal',
  'Gujarat',
  'Rajasthan',
  'Kerala',
  'Punjab',
  'Haryana',
  'Madhya Pradesh',
  'Bihar',
  'Other',
];

export const LawyerPreparationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Form inputs
  const [category, setCategory] = useState(ISSUE_CATEGORIES[0]);
  const [situation, setSituation] = useState('');
  const [relevantDates, setRelevantDates] = useState('');
  const [state, setState] = useState('Delhi');
  const [city, setCity] = useState('');
  const [hasNotice, setHasNotice] = useState(false);
  const [noticeDetails, setNoticeDetails] = useState('');

  // Execution state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<LawyerPreparationItem | null>(null);

  // History state
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<LawyerPreparationItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Active tab in results view
  const [activeTab, setActiveTab] = useState<'brief' | 'facts' | 'checklist' | 'questions' | 'issues'>('brief');

  // Load session from query params or history on mount
  useEffect(() => {
    const sessionId = searchParams.get('id');
    if (sessionId) {
      loadSpecificSession(sessionId);
    }
  }, [searchParams]);

  const loadSpecificSession = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.getLawyerPreparationById(id);
      setCurrentSession(res);
      // populate form
      setCategory(res.category);
      setSituation(res.situation_description);
      setRelevantDates(res.relevant_dates || '');
      setState(res.state);
      setCity(res.city);
      setHasNotice(res.has_notice_or_deadline);
      setNoticeDetails(res.notice_details || '');
    } catch (err: any) {
      setError(err?.message || 'Failed to load consultation session.');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await apiClient.getLawyerPreparations();
      setHistoryItems(res.items);
    } catch (err: any) {
      console.warn('Failed to load preparation history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!situation.trim() || situation.trim().length < 15) {
      setError('Please provide a short description of at least 15 characters.');
      return;
    }
    if (!city.trim()) {
      setError('Please enter your city.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.createLawyerPreparation({
        category,
        situation_description: situation,
        relevant_dates: relevantDates || undefined,
        state,
        city,
        has_notice_or_deadline: hasNotice,
        notice_details: hasNotice ? noticeDetails : undefined,
      });
      setCurrentSession(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate consultation pack. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!currentSession) return;
    const blob = new Blob([currentSession.consultation_document], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lawyer_Consultation_Brief_${currentSession.category.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await apiClient.deleteLawyerPreparation(id);
      if (currentSession?.id === id) {
        setCurrentSession(null);
      }
      setHistoryItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete session.');
    }
  };

  const resetForm = () => {
    setCurrentSession(null);
    setSituation('');
    setRelevantDates('');
    setCity('');
    setHasNotice(false);
    setNoticeDetails('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#030308] text-white flex flex-col font-sans selection:bg-cyan-500/30">
      {/* Top Header */}
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
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide text-white">Lawyer Preparation</h1>
              <p className="text-[11px] text-gray-400 hidden md:block">
                Structure your legal facts, identify vital evidence, and formulate precise questions before your advocate consultation
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={() => {
                setShowHistory(!showHistory);
                if (!showHistory) loadHistory();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 hover:text-white transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              <span>{showHistory ? 'Hide History' : 'Saved Sessions'}</span>
            </button>
          )}
          <AuthBadge />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 flex flex-col gap-6">
        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-200 text-xs">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 text-sm">
              &times;
            </button>
          </div>
        )}

        {/* History Drawer */}
        {showHistory && (
          <div className="p-4 rounded-2xl bg-[#090b14] border border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Your Saved Preparation Packs</h2>
              <span className="text-[11px] text-gray-400">{historyItems.length} items</span>
            </div>
            {loadingHistory ? (
              <div className="text-xs text-gray-400 py-4 text-center">Loading your consultation sessions...</div>
            ) : historyItems.length === 0 ? (
              <div className="text-xs text-gray-400 py-3 text-center">No saved consultation sessions yet.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {historyItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setCurrentSession(item);
                      setShowHistory(false);
                    }}
                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-all flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white truncate">{item.category}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(item.id);
                          }}
                          className="text-gray-500 hover:text-red-400 p-1"
                          title="Delete session"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-400 line-clamp-2 mt-1">{item.case_summary}</p>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-500 pt-2 border-t border-white/5">
                      <span>{item.city}, {item.state}</span>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Two-Column or Results Layout */}
        {!currentSession ? (
          /* Step-by-Step Initial Form */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Guidance Panel */}
            <div className="lg:col-span-4 space-y-5">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-950/20 via-[#070913] to-slate-950/80 border border-cyan-500/20">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-4">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h2 className="text-base font-semibold text-white">Before You Visit an Advocate</h2>
                <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                  Advocates charge for their time and need clear facts, dates, and documentation to give actionable advice.
                  This assistant compiles your narrative into a structured client briefing pack.
                </p>

                <div className="mt-5 space-y-3">
                  <div className="flex items-start gap-2.5 text-xs text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>Differentiates your verified facts from statutory analysis</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>Identifies crucial evidence, emails, and receipts to carry</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>Formulates precise questions regarding court fee, jurisdiction, and limitation</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-gray-400 italic">
                  Note: This tool is an informational preparation assistant and does not replace legal representation by an advocate.
                </div>
              </div>
            </div>

            {/* Right Form Card */}
            <div className="lg:col-span-8">
              <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-2xl bg-[#070913] border border-white/10 shadow-xl space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-white">Prepare Your Consultation Dossier</h2>
                  <p className="text-xs text-gray-400 mt-1">Provide the factual background of your matter.</p>
                </div>

                {/* 1. Category & Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Legal Issue Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-[#0c101d] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                    >
                      {ISSUE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">State (Jurisdiction) *</label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full bg-[#0c101d] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. City & Relevant Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">City / District *</label>
                    <input
                      type="text"
                      placeholder="e.g., Bengaluru, Mumbai, Pune, South Delhi"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                      className="w-full bg-[#0c101d] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Relevant Dates (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g., Agreement signed Jan 2024; Notice received Oct 15"
                      value={relevantDates}
                      onChange={(e) => setRelevantDates(e.target.value)}
                      className="w-full bg-[#0c101d] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                {/* 3. Description of Situation */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    What is your situation? Describe the core facts *
                  </label>
                  <textarea
                    rows={5}
                    placeholder="Describe what occurred chronologically: what was agreed upon, what went wrong, what communication happened, and what remedy you are seeking..."
                    value={situation}
                    onChange={(e) => setSituation(e.target.value)}
                    required
                    className="w-full bg-[#0c101d] border border-white/15 rounded-xl p-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 leading-relaxed"
                  />
                  <span className="text-[11px] text-gray-400">
                    Be specific about amounts, written agreements, and interactions. We do not invent facts you do not provide.
                  </span>
                </div>

                {/* 4. Active Notice or Court Deadline */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="hasNotice"
                      checked={hasNotice}
                      onChange={(e) => setHasNotice(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-700 text-cyan-500 focus:ring-cyan-400 bg-gray-900 cursor-pointer"
                    />
                    <label htmlFor="hasNotice" className="text-xs font-medium text-gray-200 cursor-pointer">
                      Have you received a formal Legal Notice, Court Summons, or statutory deadline?
                    </label>
                  </div>

                  {hasNotice && (
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">
                        Notice Details & Stated Deadline (if specified)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., 15-day demand notice under Sec 138 NI Act received on 22 Oct"
                        value={noticeDetails}
                        onChange={(e) => setNoticeDetails(e.target.value)}
                        className="w-full bg-[#0c101d] border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  )}
                </div>

                {/* Submit button */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold tracking-wide transition-all shadow-[0_0_20px_rgba(56,189,248,0.3)] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Compiling Client Briefing Pack...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate Consultation Dossier</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* Results View */
          <div className="space-y-6">
            {/* Top Bar for Results View */}
            <div className="p-4 sm:p-6 rounded-2xl bg-[#070913] border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[11px] font-mono border border-cyan-500/40">
                    {currentSession.category}
                  </span>
                  <span className="text-xs text-gray-400">
                    {currentSession.city}, {currentSession.state}
                  </span>
                </div>
                <h2 className="text-base font-semibold text-white mt-1">Consultation Dossier Ready</h2>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={resetForm}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>New Session</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download (.md)</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs text-cyan-300 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Brief</span>
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto text-xs">
              <button
                onClick={() => setActiveTab('brief')}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'brief'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                1. Consultation Document
              </button>
              <button
                onClick={() => setActiveTab('facts')}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'facts'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                2. Case Summary & Facts
              </button>
              <button
                onClick={() => setActiveTab('checklist')}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'checklist'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                3. Documents to Gather ({currentSession.information_to_gather?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('questions')}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'questions'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                4. Questions to Ask ({currentSession.questions_to_ask?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('issues')}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'issues'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                5. Potential Legal Issues
              </button>
            </div>

            {/* TAB CONTENT 1: Structured Document */}
            {activeTab === 'brief' && (
              <div className="p-6 sm:p-8 rounded-2xl bg-[#070913] border border-white/10 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-sm font-semibold text-white">Full Consultation Briefing Document</h3>
                  <span className="text-[11px] text-gray-400">Ready to print or present to advocate</span>
                </div>
                <div className="bg-[#04060c] p-6 rounded-xl border border-white/5 font-mono text-xs text-gray-300 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                  {currentSession.consultation_document}
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: Facts & Interpretation */}
            {activeTab === 'facts' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-[#070913] border border-white/10 space-y-4">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <h3 className="text-sm font-semibold text-white">Facts Provided by You</h3>
                  </div>
                  <p className="text-xs text-gray-400">
                    These facts are preserved exactly as you stated and form the evidentiary baseline of your matter.
                  </p>
                  <ul className="space-y-2 mt-2">
                    {currentSession.user_provided_facts?.map((fact, idx) => (
                      <li key={idx} className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-gray-200 flex items-start gap-2">
                        <span className="text-cyan-400 font-bold">•</span>
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-6 rounded-2xl bg-[#070913] border border-white/10 space-y-4">
                  <div className="flex items-center gap-2 text-purple-400">
                    <Sparkles className="w-4 h-4" />
                    <h3 className="text-sm font-semibold text-white">AI Case Interpretation</h3>
                  </div>
                  <p className="text-xs text-gray-400">
                    How an advocate in India may analyze these facts and the primary legal contours to evaluate.
                  </p>
                  <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs text-purple-200 leading-relaxed">
                    {currentSession.ai_interpretation}
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-gray-400">
                    <strong>Caveat:</strong> This interpretation is based on standard legal doctrines and must be confirmed by an advocate upon reviewing executed agreements.
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: Information to Gather */}
            {activeTab === 'checklist' && (
              <div className="p-6 sm:p-8 rounded-2xl bg-[#070913] border border-white/10 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Evidence & Documents to Assemble</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Gather these items in a physical folder or digital PDF before your appointment.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {currentSession.information_to_gather?.map((doc, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-semibold text-white">{doc.document_name}</h4>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                              doc.importance === 'Critical'
                                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                : doc.importance === 'Recommended'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                : 'bg-gray-500/20 text-gray-300'
                            }`}
                          >
                            {doc.importance}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 leading-relaxed">{doc.relevance}</p>
                      </div>

                      <div className="text-[10px] text-gray-500 flex items-center gap-1">
                        {doc.is_statutory_requirement ? (
                          <span className="text-amber-400">Statutory Requirement for Court Filing</span>
                        ) : (
                          <span>Evidentiary Support / Best Practice</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: Questions to Ask */}
            {activeTab === 'questions' && (
              <div className="p-6 sm:p-8 rounded-2xl bg-[#070913] border border-white/10 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Specific Questions for Your Advocate</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Ask these during your meeting to ensure thorough answers on cost, jurisdiction, and timelines.
                  </p>
                </div>

                <div className="space-y-3 mt-4">
                  {currentSession.questions_to_ask?.map((q, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 text-[10px] font-mono border border-cyan-500/30">
                          {q.topic}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-white mt-1">“{q.question}”</p>
                      <p className="text-[11px] text-gray-400 italic">Purpose: {q.purpose}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT 5: Potential Legal Issues */}
            {activeTab === 'issues' && (
              <div className="p-6 sm:p-8 rounded-2xl bg-[#070913] border border-white/10 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Potential Legal Frameworks & Areas</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Legal topics and statutory areas for further discussion with counsel.
                  </p>
                </div>

                <div className="space-y-4 mt-4">
                  {currentSession.potential_legal_issues?.map((issue, idx) => (
                    <div key={idx} className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                      <h4 className="text-xs font-semibold text-cyan-300">{issue.issue_title}</h4>
                      <p className="text-xs text-gray-300">
                        <strong>Statutory Area:</strong> {issue.potential_statute_or_area}
                      </p>
                      <p className="text-xs text-gray-300">
                        <strong>Jurisdiction:</strong> {issue.jurisdiction}
                      </p>
                      <p className="text-[11px] text-gray-400 italic pt-1 border-t border-white/5">
                        {issue.caveat}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
