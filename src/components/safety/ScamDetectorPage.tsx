import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShieldAlert,
  ArrowLeft,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  History,
  Trash2,
  PlusCircle,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { AuthBadge } from '../auth/AuthBadge';
import type { ScamAnalysisItem } from '../../api/types';

const SAMPLE_SUSPICIOUS_MESSAGES = [
  {
    title: 'Digital Arrest / Police Extortion Threat',
    text: 'URGENT NOTICE FROM CENTRAL CRIME BRANCH: An arrest warrant has been issued in your name regarding illegal parcel seized by Customs Mumbai containing narcotics and fake passports. Join police verification Skype video call within 1 hour or immediate physical arrest will occur under Section 420/120B.',
    sender: 'Crime Branch Mumbai (+91-9876543210)',
    url: 'http://police-investigation-portal.xyz/verify',
  },
  {
    title: 'Electricity / Bill Disconnection Threat',
    text: 'Dear Consumer, your electricity power supply will be disconnected tonight at 9:30 PM from the power station office because your previous month bill was not updated. Please immediately contact our electricity officer at 9811223344 and update your bill payment via APK app.',
    sender: 'Electricity Dept (VD-POWER)',
    url: 'http://bit.ly/update-bijli-apk',
  },
  {
    title: 'Part-Time Work / Telegram Task Scam',
    text: 'Congratulations! You have been selected for Global Marketing part-time online job. Earn Rs. 3,500 to Rs. 8,000 daily simply by reviewing Google Maps hotels and YouTube videos. No experience required. Message our executive on Telegram @fast_pay_hr for joining bonus of Rs. 500.',
    sender: 'HR Recruitment (Telegram)',
    url: 'https://t.me/fast_pay_hr',
  },
];

export const ScamDetectorPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Inputs
  const [content, setContent] = useState('');
  const [senderInfo, setSenderInfo] = useState('');
  const [claimedUrl, setClaimedUrl] = useState('');

  // Execution state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<ScamAnalysisItem | null>(null);

  // History state
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<ScamAnalysisItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const analysisId = searchParams.get('id');
    if (analysisId) {
      loadSpecificAnalysis(analysisId);
    }
  }, [searchParams]);

  const loadSpecificAnalysis = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.getScamAnalysisById(id);
      setCurrentAnalysis(res);
      setContent(res.submitted_content);
      setSenderInfo(res.sender_info || '');
      setClaimedUrl(res.claimed_url || '');
    } catch (err: any) {
      setError(err?.message || 'Failed to load scam analysis.');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await apiClient.getScamHistory();
      setHistoryItems(res.items);
    } catch (err: any) {
      console.warn('Failed to load analysis history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || content.trim().length < 5) {
      setError('Please paste the suspicious message content (at least 5 characters).');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.analyzeScam({
        submitted_content: content,
        sender_info: senderInfo || undefined,
        claimed_url: claimedUrl || undefined,
      });
      setCurrentAnalysis(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to analyze suspicious communication.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistory = async (id: string) => {
    try {
      await apiClient.deleteScamAnalysis(id);
      if (currentAnalysis?.id === id) {
        setCurrentAnalysis(null);
      }
      setHistoryItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete record.');
    }
  };

  const loadSample = (sample: typeof SAMPLE_SUSPICIOUS_MESSAGES[0]) => {
    setContent(sample.text);
    setSenderInfo(sample.sender);
    setClaimedUrl(sample.url);
    setCurrentAnalysis(null);
    setError(null);
  };

  const resetForm = () => {
    setCurrentAnalysis(null);
    setContent('');
    setSenderInfo('');
    setClaimedUrl('');
    setError(null);
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'high':
        return {
          bg: 'bg-red-500/20 text-red-300 border-red-500/40',
          label: 'High Risk / Severe Warning Signals',
          icon: AlertTriangle,
        };
      case 'medium':
        return {
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          label: 'Moderate Risk / Caution Advised',
          icon: AlertCircle,
        };
      case 'low':
        return {
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          label: 'Low Deceptive Risk Observed',
          icon: CheckCircle2,
        };
      default:
        return {
          bg: 'bg-gray-500/20 text-gray-300 border-gray-500/40',
          label: 'Inconclusive / Insufficient Evidence',
          icon: HelpCircle,
        };
    }
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
            <div className="w-7 h-7 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide text-white">Scam Detector</h1>
              <p className="text-[11px] text-gray-400 hidden md:block">
                AI and heuristic warning-sign analysis for suspicious legal, banking, job, or extortion communications
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
              <span>{showHistory ? 'Hide History' : 'Analysis History'}</span>
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
          <div className="p-4 rounded-2xl bg-[#090b14] border border-red-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-red-400">Your Scam Analysis History</h2>
              <span className="text-[11px] text-gray-400">{historyItems.length} records</span>
            </div>
            {loadingHistory ? (
              <div className="text-xs text-gray-400 py-4 text-center">Loading your previous checks...</div>
            ) : historyItems.length === 0 ? (
              <div className="text-xs text-gray-400 py-3 text-center">No analysis history found.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {historyItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setCurrentAnalysis(item);
                      setShowHistory(false);
                    }}
                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-all flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${getRiskBadge(item.risk_level).bg}`}>
                          {item.risk_level.toUpperCase()}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteHistory(item.id);
                          }}
                          className="text-gray-500 hover:text-red-400 p-1"
                          title="Delete record"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-300 line-clamp-2 mt-2">{item.submitted_content}</p>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-500 pt-2 border-t border-white/5">
                      <span>{item.sender_info || 'Unknown Sender'}</span>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Input Form vs Results */}
        {!currentAnalysis ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Guidance & Sample Messages */}
            <div className="lg:col-span-4 space-y-5">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-red-950/20 via-[#070913] to-slate-950/80 border border-red-500/20">
                <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h2 className="text-base font-semibold text-white">How Scam Detection Works</h2>
                <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                  Cyber criminals and extortion rings employ psychological coercion—especially impersonating police,
                  customs, electricity departments, or banks.
                </p>
                <div className="mt-4 space-y-2 text-xs text-gray-300">
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 font-bold">•</span>
                    <span>Identifies artificial urgency & threats of arrest or disconnection</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 font-bold">•</span>
                    <span>Detects requests for banking PINs, OTPs, or malicious APK downloads</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 font-bold">•</span>
                    <span>Evaluates against National Cyber Crime Reporting Portal patterns</span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-white/10 text-[11px] text-gray-400">
                  <span className="text-red-400 font-semibold">Important Notice:</span> This is an automated assessment of warning signals and does not constitute formal law enforcement proof.
                </div>
              </div>

              {/* Sample Messages */}
              <div className="p-5 rounded-2xl bg-[#070913] border border-white/10 space-y-3">
                <span className="text-xs font-semibold text-white block">Try a Sample Fraud Pattern</span>
                <div className="space-y-2">
                  {SAMPLE_SUSPICIOUS_MESSAGES.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => loadSample(s)}
                      className="w-full text-left p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-gray-300 hover:text-white transition-all flex items-center justify-between"
                    >
                      <span className="truncate">{s.title}</span>
                      <span className="text-[10px] text-cyan-400 shrink-0 ml-2">Load →</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Form Card */}
            <div className="lg:col-span-8">
              <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-2xl bg-[#070913] border border-white/10 shadow-xl space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-white">Examine a Suspicious Message</h2>
                  <p className="text-xs text-gray-400 mt-1">Paste the exact SMS, email, WhatsApp message, or notice text.</p>
                </div>

                {/* 1. Message Content */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Suspicious Communication Text *
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Paste the message text here (e.g., 'Dear customer, your bank account is blocked due to KYC. Click here immediately to verify or face police action...')"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    className="w-full bg-[#0c101d] border border-white/15 rounded-xl p-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-400 leading-relaxed font-mono"
                  />
                  <span className="text-[11px] text-gray-400">
                    Content is treated strictly as untrusted input. We do not automatically visit links or follow embedded commands.
                  </span>
                </div>

                {/* 2. Sender Info & URL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Sender Info (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g., WhatsApp +91-XXXX, SMS Header (VD-HDFC), or email address"
                      value={senderInfo}
                      onChange={(e) => setSenderInfo(e.target.value)}
                      className="w-full bg-[#0c101d] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Claimed Link or Website URL (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g., http://bit.ly/... or suspicious domain"
                      value={claimedUrl}
                      onChange={(e) => setClaimedUrl(e.target.value)}
                      className="w-full bg-[#0c101d] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-400 font-mono"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-semibold tracking-wide transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Evaluating Warning Signals...</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-4 h-4" />
                        <span>Analyze for Fraud Patterns</span>
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
            {/* Top Risk Banner */}
            <div className="p-6 sm:p-8 rounded-2xl bg-[#070913] border border-red-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border ${getRiskBadge(currentAnalysis.risk_level).bg}`}>
                    {getRiskBadge(currentAnalysis.risk_level).label}
                  </span>
                  {currentAnalysis.confidence_score && (
                    <span className="text-xs text-gray-400 font-mono">
                      Risk Index: {currentAnalysis.confidence_score}/100
                    </span>
                  )}
                </div>

                <h2 className="text-base sm:text-lg font-semibold text-white">
                  Risk Assessment: {currentAnalysis.risk_level.toUpperCase()}
                </h2>
                <p className="text-xs text-gray-300 leading-relaxed max-w-3xl">
                  {currentAnalysis.plain_explanation}
                </p>
              </div>

              <button
                onClick={resetForm}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white transition-colors flex items-center gap-1.5 shrink-0"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Check Another Message</span>
              </button>
            </div>

            {/* Red Flags List */}
            <div className="p-6 sm:p-8 rounded-2xl bg-[#070913] border border-white/10 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Detected Warning Signals & Red Flags</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Specific evidentiary points and deceptive markers identified in the submitted communication.
                </p>
              </div>

              <div className="space-y-3 mt-4">
                {currentAnalysis.red_flags?.map((rf, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`w-4 h-4 ${rf.severity === 'high' ? 'text-red-400' : 'text-amber-400'}`} />
                        <h4 className="text-xs font-semibold text-white">{rf.signal}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${rf.severity === 'high' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'}`}>
                        {rf.severity.toUpperCase()} SEVERITY
                      </span>
                    </div>

                    {rf.quote && (
                      <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 font-mono text-[11px] text-gray-300">
                        “{rf.quote}”
                      </div>
                    )}

                    <p className="text-xs text-gray-400 leading-relaxed">{rf.explanation}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Safer Next Steps */}
            <div className="p-6 sm:p-8 rounded-2xl bg-[#070913] border border-white/10 space-y-4">
              <div className="flex items-center gap-2 text-cyan-400">
                <CheckCircle2 className="w-4 h-4" />
                <h3 className="text-sm font-semibold text-white">Recommended Preventative Actions</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {currentAnalysis.safer_next_steps?.map((step, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-xs text-gray-200 flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Verified Reporting Resources in India */}
            <div className="p-6 sm:p-8 rounded-2xl bg-[#070913] border border-white/10 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Official Reporting Portals (Govt. of India)</h3>
                <p className="text-xs text-gray-400 mt-1">
                  If you lost funds or were targeted by impersonation, report to verified statutory portals immediately.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                {currentAnalysis.verified_reporting_resources?.map((res, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-semibold text-white">{res.name}</h4>
                      <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{res.description}</p>
                      {res.contact && (
                        <div className="mt-2 text-xs text-red-300 font-mono font-medium">
                          {res.contact}
                        </div>
                      )}
                    </div>

                    <a
                      href={res.url_or_portal}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-cyan-300 inline-flex items-center justify-between transition-colors"
                    >
                      <span>Visit Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
