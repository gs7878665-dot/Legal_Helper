import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  UploadCloud,
  FileText,
  AlertTriangle,
  Calendar,
  DollarSign,
  User as UserIcon,
  HelpCircle,
  Copy,
  Check,
  Download,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Scale,
  Save,
  BookOpen,
  Send,
  AlertCircle
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { AuthBadge } from '../auth/AuthBadge';
import type {
  NoticeReplyItem,
  ToneCode,
  UserStance
} from '../../api/types';

const SAMPLE_NOTICES = [
  {
    title: 'Tenant Rent Arrears Demand Notice',
    text: `LEGAL NOTICE FOR RECOVERY OF ARREARS

Date: 20th October 2026
Ref No: LN/BLR/2026/842

To:
Mr. Siddharth Malhotra
Flat 502, Green Glen Layout, Bellandur, Bengaluru - 560103

From:
Advocate S. K. Narang, High Court of Karnataka
On behalf of: M/s UrbanStay Living Properties Pvt Ltd, Bengaluru

Sir,

Under instructions from and on behalf of my client, M/s UrbanStay Living Properties Pvt Ltd, I hereby serve upon you this formal Legal Notice:

1. That you were inducted as a tenant in respect of Flat 502, Green Glen Layout under lease agreement dated 1st January 2026 at a monthly rent of INR 45,000/-.

2. That you have defaulted in payment of rent for the months of August, September, and October 2026, totaling INR 1,35,000/- despite repeated WhatsApp and email reminders.

3. That you have caused unauthorized alterations to the electrical fittings in violation of Clause 8 of the Tenancy Agreement.

4. I therefore call upon you to pay the outstanding sum of INR 1,35,000/- along with interest @ 18% p.a. within 15 days of receipt of this notice.

5. Failing compliance within 15 days of receipt, my client shall initiate recovery proceedings under the Karnataka Rent Act and criminal prosecution under Section 406/420 of IPC/BNS without further intimation.

Yours faithfully,
Adv. S. K. Narang`
  },
  {
    title: 'Consumer Cheque Bounce Statutory Notice (Sec 138)',
    text: `STATUTORY NOTICE UNDER SECTION 138 OF NEGOTIABLE INSTRUMENTS ACT, 1881

Date: 18th October 2026
Ref: ADV/NI/2026/119

To:
Mr. Arvind Kejriwal
Proprietor, Apex Logistics, Mumbai - 400051

From:
Advocate R. M. Deshmukh, Bombay High Court
On behalf of: FinGrowth Commercial Capital Ltd, Nariman Point, Mumbai

Sir,

Under instructions from our client, FinGrowth Commercial Capital Ltd, we hereby serve you with this statutory notice:

1. That in discharge of your legally enforceable debt, you issued Cheque No. 408891 dated 25th September 2026 for INR 3,50,000/- drawn on HDFC Bank.

2. That upon presentation by our client, the said cheque was returned dishonoured on 3rd October 2026 with bank memo remark "FUNDS INSUFFICIENT".

3. That you were fully aware of the insufficiency of funds in your account at the time of issuing the aforesaid cheque.

4. We hereby demand that you make payment of the cheque amount of INR 3,50,000/- within 15 days from the date of receipt of this notice.

5. In case of non-payment within the statutory period of 15 days, our client shall file a criminal complaint under Section 138 of the Negotiable Instruments Act, 1881.

Yours faithfully,
Adv. R. M. Deshmukh`
  }
];

export const NoticeReplyPage: React.FC = () => {
  const navigate = useNavigate();

  // 6 Stages:
  // 1 = Upload / Paste Notice
  // 2 = Analyzing (Transient / Loading)
  // 3 = Review Extracted Details & Allegations
  // 4 = User's Factual Position
  // 5 = Generate Reply
  // 6 = Edit, Save & Export Reply
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // Input states for Step 1
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('paste');
  const [pastedNoticeText, setPastedNoticeText] = useState('');
  const [noticeTitle, setNoticeTitle] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Active Notice Record
  const [activeReply, setActiveReply] = useState<NoticeReplyItem | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Step 4 User Position inputs
  const [userFullName, setUserFullName] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [replyDate, setReplyDate] = useState(new Date().toISOString().split('T')[0]);
  const [matterBackground, setMatterBackground] = useState('');
  const [desiredAction, setDesiredAction] = useState('');
  const [tone, setTone] = useState<ToneCode>('firm');

  // Stance per allegation ID
  const [allegationResponses, setAllegationResponses] = useState<Record<string, { stance: UserStance; explanation: string }>>({});

  // Step 6 Editor & Export states
  const [editorText, setEditorText] = useState('');
  const [copiedState, setCopiedState] = useState(false);
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenInstructions, setRegenInstructions] = useState('');
  const [checklist, setChecklist] = useState({
    namesChecked: false,
    datesChecked: false,
    allegationsChecked: false,
    amountsChecked: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load sample template
  const handleLoadSample = (sample: typeof SAMPLE_NOTICES[0]) => {
    setNoticeTitle(sample.title);
    setPastedNoticeText(sample.text);
    setActiveTab('paste');
  };

  // Upload PDF or DOCX file
  const handleFileUpload = async (file: File) => {
    setErrorMessage(null);
    setIsUploading(true);
    try {
      const doc = await apiClient.uploadDocument(file);
      if (!doc.extracted_text) {
        throw new Error('Could not extract text from document. Scanned PDF requires OCR; please copy & paste text directly.');
      }
      const record = await apiClient.createNoticeReply({
        document_id: doc.id,
        title: file.name.replace(/\.[^/.]+$/, ''),
        tone,
        language: 'en',
      });
      setActiveReply(record);
      // Auto trigger analysis
      await runAnalysis(record.id);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to upload and extract notice document.');
    } finally {
      setIsUploading(false);
    }
  };

  // Submit Pasted Text
  const handlePastedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedNoticeText.trim() || pastedNoticeText.trim().length < 30) {
      setErrorMessage('Please paste the complete legal notice text (at least 30 characters).');
      return;
    }
    setErrorMessage(null);
    setIsUploading(true);
    try {
      const record = await apiClient.createNoticeReply({
        notice_text: pastedNoticeText.trim(),
        title: noticeTitle.trim() || 'Reply to Legal Notice',
        tone,
        language: 'en',
      });
      setActiveReply(record);
      await runAnalysis(record.id);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to initialize notice record.');
    } finally {
      setIsUploading(false);
    }
  };

  // Run Stage 2: Analyze Notice
  const runAnalysis = async (replyId: string) => {
    setIsAnalyzing(true);
    setCurrentStep(2);
    setErrorMessage(null);
    try {
      const analyzed = await apiClient.analyzeNotice(replyId);
      setActiveReply(analyzed);

      // Pre-fill user responses template
      const initialStances: Record<string, { stance: UserStance; explanation: string }> = {};
      (analyzed.allegations_and_demands || []).forEach((item) => {
        initialStances[item.id] = {
          stance: 'no_position_provided',
          explanation: '',
        };
      });
      setAllegationResponses(initialStances);

      // Auto prefill recipient/sender in matter form
      if (analyzed.extracted_notice_details?.recipient_party) {
        setUserFullName(analyzed.extracted_notice_details.recipient_party);
      }

      setCurrentStep(3);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Notice analysis failed.');
      setCurrentStep(1);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Update allegation stance
  const handleStanceChange = (id: string, stance: UserStance) => {
    setAllegationResponses((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        stance,
      },
    }));
  };

  // Update allegation explanation
  const handleExplanationChange = (id: string, explanation: string) => {
    setAllegationResponses((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        explanation,
      },
    }));
  };

  // Save user responses to backend
  const handleSaveUserResponses = async () => {
    if (!activeReply) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const payloadResponses = {
        user_info: {
          full_name: userFullName.trim(),
          address: userAddress.trim() || undefined,
          email: userEmail.trim() || undefined,
          phone: userPhone.trim() || undefined,
        },
        matter_info: {
          reply_date: replyDate,
          background: matterBackground.trim() || undefined,
          desired_action: desiredAction.trim() || undefined,
        },
        allegation_responses: allegationResponses,
      };

      const updated = await apiClient.updateNoticeReply(activeReply.id, {
        tone,
        user_responses: payloadResponses,
      });
      setActiveReply(updated);
      setSuccessMessage('Factual responses saved.');
      setTimeout(() => setSuccessMessage(null), 3000);
      return updated;
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save responses.');
    } finally {
      setIsSaving(false);
    }
  };

  // Generate Reply (Step 4 -> Step 5/6)
  const handleGenerateReply = async () => {
    if (!activeReply) return;
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      // First persist user responses
      await handleSaveUserResponses();

      const generated = await apiClient.generateNoticeReply(activeReply.id);
      setActiveReply(generated);
      setEditorText(generated.user_edited_reply || generated.generated_reply || '');
      setCurrentStep(6);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Reply generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Regenerate reply
  const handleRegenerate = async () => {
    if (!activeReply) return;
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const regen = await apiClient.regenerateNoticeReply(activeReply.id, {
        additional_instructions: regenInstructions.trim() || undefined,
      });
      setActiveReply(regen);
      setEditorText(regen.user_edited_reply || regen.generated_reply || '');
      setShowRegenModal(false);
      setRegenInstructions('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Regeneration failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Save manual edits in editor
  const handleSaveEditor = async () => {
    if (!activeReply) return;
    setIsSaving(true);
    try {
      const updated = await apiClient.updateNoticeReply(activeReply.id, {
        user_edited_reply: editorText,
        status: 'edited',
      });
      setActiveReply(updated);
      setSuccessMessage('Notice reply edits saved.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save edits.');
    } finally {
      setIsSaving(false);
    }
  };

  // Copy plain text
  const handleCopyText = () => {
    navigator.clipboard.writeText(editorText);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2200);
  };

  // Download TXT
  const handleDownloadTxt = () => {
    const element = document.createElement('a');
    const file = new Blob([editorText], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    const safeTitle = (activeReply?.title || 'Notice_Reply').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
    element.download = `${safeTitle}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Count unanswered allegations
  const unansweredCount = Object.values(allegationResponses).filter(
    (item) => item.stance === 'no_position_provided' && !item.explanation.trim()
  ).length;

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col font-sans relative selection:bg-indigo-500/30">
      {/* Background ambient lighting */}
      <div className="fixed top-0 left-1/3 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-indigo-950/20 via-violet-950/25 to-cyan-900/15 blur-[140px] pointer-events-none rounded-full" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[300px] bg-indigo-950/20 blur-[130px] pointer-events-none rounded-full" />

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#070913]/85 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/explore')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-xs text-slate-300 hover:text-cyan-400 transition-all cursor-pointer"
            title="Return to Tree of Knowledge"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Explore Tree</span>
          </button>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(99,102,241,0.25)]">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide flex items-center gap-2 text-white">
                <span>Notice Reply</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                  India Jurisdiction
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 hidden md:block">
                Deconstruct legal demand notices, assert your factual position, and draft structured formal replies
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <AuthBadge />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6 relative z-10">
        {/* Step Progress Tracker */}
        <div className="p-3.5 rounded-2xl bg-[#0b0f24]/90 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto py-1">
            {[
              { num: 1, label: 'Notice Intake' },
              { num: 3, label: 'Extracted Details' },
              { num: 4, label: 'Factual Position' },
              { num: 6, label: 'Formal Reply' },
            ].map((step) => {
              const isActive = currentStep === step.num || (currentStep === 2 && step.num === 1) || (currentStep === 5 && step.num === 4);
              const isPast = currentStep > step.num;
              return (
                <button
                  key={step.num}
                  type="button"
                  disabled={step.num > currentStep}
                  onClick={() => {
                    if (step.num < currentStep) setCurrentStep(step.num as any);
                  }}
                  className={`flex items-center gap-2 text-xs font-mono transition-all ${
                    isActive
                      ? 'text-cyan-300 font-bold'
                      : isPast
                      ? 'text-indigo-300 hover:text-white cursor-pointer'
                      : 'text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      isActive
                        ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                        : isPast
                        ? 'bg-indigo-600/30 border border-indigo-500/50 text-indigo-300'
                        : 'bg-slate-900 border border-slate-800 text-slate-600'
                    }`}
                  >
                    {isPast ? <Check className="w-3.5 h-3.5" /> : (step.num === 6 ? 4 : step.num === 4 ? 3 : step.num === 3 ? 2 : 1)}
                  </span>
                  <span className="whitespace-nowrap">{step.label}</span>
                  {step.num < 6 && <ChevronRight className="w-3.5 h-3.5 text-slate-700 ml-1" />}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {successMessage && (
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 animate-fadeIn">
                <Check className="w-3 h-3" />
                <span>{successMessage}</span>
              </span>
            )}
            {activeReply && currentStep >= 3 && (
              <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
                Notice: {activeReply.extracted_notice_details?.notice_date || 'Undated'}
              </span>
            )}
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/40 text-xs text-red-200 flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-xs text-red-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 1: Provide the Notice */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="flex flex-col gap-6">
            <div className="text-center sm:text-left">
              <h2 className="text-lg font-semibold text-white tracking-wide">
                Provide the Legal Notice You Received
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Upload your legal demand notice (PDF or DOCX) or paste the text directly. Legal Helper parses every assertion, pinpoints stated deadlines, and prepares a structured counter-defense.
              </p>
            </div>

            {/* Input Selection Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                  activeTab === 'paste'
                    ? 'bg-indigo-600/30 border border-indigo-500/50 text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Paste Notice Text</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-indigo-600/30 border border-indigo-500/50 text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload PDF / DOCX File</span>
              </button>
            </div>

            {/* Paste Mode */}
            {activeTab === 'paste' ? (
              <form onSubmit={handlePastedSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1.5">
                    Notice Title or Identifier (Optional)
                  </label>
                  <input
                    type="text"
                    value={noticeTitle}
                    onChange={(e) => setNoticeTitle(e.target.value)}
                    placeholder="e.g. Reply to UrbanStay Demand Notice / Section 138 Notice"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f24] border border-slate-800 text-xs text-white placeholder-slate-600 outline-none focus:border-cyan-500/70"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono text-slate-300">
                      Legal Notice Raw Text <span className="text-red-400">*</span>
                    </label>
                    <span className="text-[11px] font-mono text-slate-500">
                      {pastedNoticeText.length} characters
                    </span>
                  </div>
                  <textarea
                    rows={12}
                    value={pastedNoticeText}
                    onChange={(e) => setPastedNoticeText(e.target.value)}
                    placeholder="Paste the complete text of the legal notice here, including the Date, Advocate name, Subject, numbered paragraphs, and closing demands..."
                    className="w-full p-4 rounded-2xl bg-[#0b0f24] border border-slate-800 focus:border-cyan-500/70 text-xs font-mono text-slate-200 placeholder-slate-600 outline-none leading-relaxed select-text"
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] font-mono text-slate-500">
                    Uploaded legal text remains strictly private & client-scoped.
                  </span>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 disabled:opacity-50 text-white text-xs font-semibold font-mono tracking-wide shadow-lg shadow-indigo-900/30 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-cyan-200" />
                    <span>Analyze Legal Notice</span>
                  </button>
                </div>
              </form>
            ) : (
              /* Upload Mode */
              <div className="flex flex-col gap-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleFileUpload(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-10 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    isDragOver
                      ? 'border-cyan-400 bg-cyan-950/20'
                      : 'border-slate-800 hover:border-indigo-500/50 bg-[#0b0f24]/60'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-cyan-400 mb-3">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">
                    Drag and drop your Legal Notice file here
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mb-3">
                    Supports text-based PDF or DOCX up to 10 MB. Scanned document images without text layer should be copy-pasted in the text tab.
                  </p>
                  <span className="px-3 py-1.5 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-xs font-mono text-cyan-300">
                    Browse Files
                  </span>
                </div>
              </div>
            )}

            {/* Pre-configured sample notices */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Or test with a pre-configured legal notice:</span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SAMPLE_NOTICES.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleLoadSample(sample)}
                    className="p-3.5 rounded-xl bg-[#0b0f24]/60 hover:bg-[#0e1430] border border-slate-800/80 hover:border-indigo-500/40 text-left transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div>
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors block">
                        {sample.title}
                      </span>
                      <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-mono">
                        {sample.text.slice(0, 100)}...
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all shrink-0 ml-3" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 2: Analyzing Notice State */}
        {/* ========================================================================= */}
        {(currentStep === 2 || isAnalyzing) && (
          <div className="p-12 rounded-2xl bg-[#0b0f24]/90 border border-slate-800 flex flex-col items-center justify-center text-center gap-4 min-h-[400px]">
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-ping" />
              <div className="w-14 h-14 rounded-full border-2 border-t-cyan-400 border-r-indigo-500 border-b-transparent border-l-transparent animate-spin" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Deconstructing Notice Allegations & Deadlines...
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Parsing sender assertions, identifying explicit response timeframes, and isolating claims for your factual rebuttal.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 3: Review Extracted Details & Allegations */}
        {/* ========================================================================= */}
        {currentStep === 3 && activeReply && (
          <div className="flex flex-col gap-6">
            {/* 1. DEADLINE WARNING PANEL */}
            {activeReply.extracted_notice_details?.explicit_deadline ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/25 border border-amber-500/40 shadow-[0_4px_20px_rgba(245,158,11,0.08)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider font-mono">
                        Stated Response Deadline in Notice:
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/30 text-amber-200 border border-amber-400/40">
                        {activeReply.extracted_notice_details.explicit_deadline}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 font-mono italic">
                      "{activeReply.extracted_notice_details.deadline_excerpt || activeReply.extracted_notice_details.explicit_deadline}"
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-amber-400/90 whitespace-nowrap bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-600/30">
                  Explicitly stated by sender
                </span>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-slate-400 shrink-0" />
                <p className="text-xs text-slate-400">
                  <span className="text-slate-300 font-semibold mr-1">Notice Timeframe:</span>
                  No explicit response deadline was identified in the extracted notice. This does not establish that no deadline applies.
                </p>
              </div>
            )}

            {/* 2. Notice Metadata Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#0b0f24]/90 border border-slate-800 flex flex-col gap-1.5">
                <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Sender & Counsel</span>
                </span>
                <p className="text-xs font-semibold text-white">
                  {activeReply.extracted_notice_details?.sender_party || 'Sender Designated in Notice'}
                </p>
                {activeReply.extracted_notice_details?.sender_advocate && (
                  <p className="text-[11px] font-mono text-cyan-300">
                    Adv. {activeReply.extracted_notice_details.sender_advocate}
                  </p>
                )}
                {activeReply.extracted_notice_details?.reference_number && (
                  <p className="text-[11px] font-mono text-slate-400">
                    Ref: {activeReply.extracted_notice_details.reference_number}
                  </p>
                )}
              </div>

              <div className="p-4 rounded-xl bg-[#0b0f24]/90 border border-slate-800 flex flex-col gap-1.5">
                <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Demanded Sum</span>
                </span>
                <p className="text-sm font-bold font-mono text-emerald-400">
                  {activeReply.extracted_notice_details?.amount_demanded || 'Non-monetary claim'}
                </p>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  {activeReply.extracted_notice_details?.matter_summary || 'General legal notice'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0b0f24]/90 border border-slate-800 flex flex-col gap-1.5">
                <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span>Consequences Asserted</span>
                </span>
                <p className="text-xs text-red-200/90 leading-relaxed line-clamp-3">
                  {activeReply.extracted_notice_details?.consequences_asserted || 'Litigation threatened if demands are unmet.'}
                </p>
              </div>
            </div>

            {/* 3. Discrete Allegations & Claims List */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>Extracted Allegations & Demands</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {activeReply.allegations_and_demands?.length || 0} items identified
                  </span>
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  Sender assertions are allegations, not proven facts
                </span>
              </div>

              <div className="space-y-3">
                {(activeReply.allegations_and_demands || []).map((item, idx) => {
                  const isDemand = item.item_type === 'demand';
                  return (
                    <div
                      key={item.id || idx}
                      className="p-4 rounded-xl bg-[#0b0f24]/90 border border-slate-800/90 flex flex-col gap-2 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-bold ${
                            isDemand ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                          }`}>
                            {item.item_type} #{idx + 1}
                          </span>
                          {item.source_reference && (
                            <span className="text-[11px] font-mono text-slate-500">
                              Ref: {item.source_reference}
                            </span>
                          )}
                        </span>
                        {item.associated_amount && (
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            {item.associated_amount}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-200 leading-relaxed">
                        {item.statement}
                      </p>

                      {item.source_excerpt && (
                        <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/70 text-[11px] font-mono text-slate-400 italic">
                          "{item.source_excerpt}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Navigation to Stage 4 */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-mono flex items-center gap-2 cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Replace Notice</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-semibold font-mono tracking-wide shadow-lg shadow-indigo-900/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Provide Your Factual Position</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 4: User's Factual Position & Rebuttals */}
        {/* ========================================================================= */}
        {currentStep === 4 && activeReply && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold text-white tracking-wide">
                Provide Your Position on Each Allegation
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                The AI engine will never fabricate admissions or false claims. Choose your stance for each allegation and supply your own explanation, proof, or payment records.
              </p>
            </div>

            {/* Tone selector */}
            <div className="p-4 rounded-xl bg-[#0b0f24]/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-mono text-slate-300">Reply Demeanour / Tone:</span>
              <div className="flex items-center gap-2">
                {(['firm', 'formal', 'polite', 'neutral'] as ToneCode[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono capitalize transition-colors cursor-pointer ${
                      tone === t ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Part A: User & Matter Basics */}
            <div className="p-5 rounded-2xl bg-[#0b0f24]/90 border border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-300 font-mono block mb-1">
                  Your Full Legal Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={userFullName}
                  onChange={(e) => setUserFullName(e.target.value)}
                  placeholder="e.g. Siddharth Malhotra"
                  className="w-full px-3 py-2 rounded-xl bg-[#07091a] border border-slate-800 text-white outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-mono block mb-1">Reply Issuing Date</label>
                <input
                  type="date"
                  value={replyDate}
                  onChange={(e) => setReplyDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#07091a] border border-slate-800 text-white outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-mono block mb-1">Your Address (Optional)</label>
                <input
                  type="text"
                  value={userAddress}
                  onChange={(e) => setUserAddress(e.target.value)}
                  placeholder="e.g. Flat 502, Green Glen Layout, Bengaluru"
                  className="w-full px-3 py-2 rounded-xl bg-[#07091a] border border-slate-800 text-white outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-mono block mb-1">Desired Closing Demand / Outcome</label>
                <input
                  type="text"
                  value={desiredAction}
                  onChange={(e) => setDesiredAction(e.target.value)}
                  placeholder="e.g. Unconditionally withdraw notice and acknowledge NEFT receipts"
                  className="w-full px-3 py-2 rounded-xl bg-[#07091a] border border-slate-800 text-white outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-mono block mb-1">Phone Number (Optional)</label>
                <input
                  type="text"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  placeholder="+91..."
                  className="w-full px-3 py-2 rounded-xl bg-[#07091a] border border-slate-800 text-white outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-mono block mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 rounded-xl bg-[#07091a] border border-slate-800 text-white outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-slate-300 font-mono block mb-1">
                  Overall Background & True Facts
                </label>
                <textarea
                  rows={2}
                  value={matterBackground}
                  onChange={(e) => setMatterBackground(e.target.value)}
                  placeholder="Summarize the core disagreement from your perspective (e.g. Rent was already paid via NEFT UTR #998877; repairs were pre-authorized)..."
                  className="w-full p-2.5 rounded-xl bg-[#07091a] border border-slate-800 text-white outline-none resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Form Part B: Item-by-Item Allegation Responses */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-white flex items-center justify-between">
                <span>Item-by-Item Position on Sender's Assertions</span>
                {unansweredCount > 0 ? (
                  <span className="text-[11px] font-mono text-amber-400 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-500/30">
                    {unansweredCount} item(s) unaddressed (will use placeholders)
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/30">
                    All items addressed
                  </span>
                )}
              </h3>

              {(activeReply.allegations_and_demands || []).map((item, idx) => {
                const currentResp = allegationResponses[item.id] || {
                  stance: 'no_position_provided',
                  explanation: '',
                };

                return (
                  <div
                    key={item.id || idx}
                    className="p-5 rounded-2xl bg-[#0b0f24]/90 border border-slate-800 flex flex-col gap-3.5 shadow-sm"
                  >
                    {/* Item statement */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-300 font-mono">
                          Assertion #{idx + 1} ({item.item_type}):
                        </span>
                        {item.associated_amount && (
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            {item.associated_amount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed font-mono">
                        "{item.statement}"
                      </p>
                    </div>

                    {/* Stance Buttons */}
                    <div>
                      <label className="text-[11px] font-mono text-slate-400 block mb-1.5">
                        Your Stance on this assertion:
                      </label>
                      <div className="flex flex-wrap gap-2 text-xs font-mono">
                        {[
                          { code: 'disagree', label: 'I Disagree / Deny' },
                          { code: 'agree', label: 'I Agree / Admit' },
                          { code: 'partially_agree', label: 'Partially Agree' },
                          { code: 'clarify', label: 'Clarify Context' },
                          { code: 'unknown', label: 'Unknown to Me' },
                        ].map((s) => {
                          const isSel = currentResp.stance === s.code;
                          return (
                            <button
                              key={s.code}
                              type="button"
                              onClick={() => handleStanceChange(item.id, s.code as UserStance)}
                              className={`px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                                isSel
                                  ? s.code === 'disagree'
                                    ? 'bg-red-950/50 border-red-500 text-red-300 font-semibold'
                                    : s.code === 'agree'
                                    ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300 font-semibold'
                                    : 'bg-indigo-950/50 border-cyan-400 text-cyan-300 font-semibold'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Specific factual explanation */}
                    <div>
                      <label className="text-[11px] font-mono text-slate-400 block mb-1">
                        Your Factual Explanation & Evidence:
                      </label>
                      <textarea
                        rows={2}
                        value={currentResp.explanation}
                        onChange={(e) => handleExplanationChange(item.id, e.target.value)}
                        placeholder="State your factual rebuttal, transaction reference, or explanation..."
                        className="w-full p-2.5 rounded-xl bg-[#07091a] border border-slate-800 text-xs text-white placeholder-slate-600 outline-none resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Navigation & Generate Action */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-mono flex items-center gap-2 cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Notice Overview</span>
              </button>

              <button
                type="button"
                onClick={handleGenerateReply}
                disabled={isGenerating}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 disabled:opacity-50 text-white text-xs font-semibold font-mono tracking-wide shadow-lg shadow-indigo-900/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    <span>Synthesizing Legal Reply...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-cyan-200" />
                    <span>Generate Formal Notice Reply</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 6: Generated Reply Editor & Export */}
        {/* ========================================================================= */}
        {currentStep === 6 && activeReply && (
          <div className="flex flex-col gap-5">
            {/* Action Bar */}
            <div className="p-4 rounded-xl bg-[#0b0f24]/90 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-cyan-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>{activeReply.title}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 capitalize">
                      {activeReply.status}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {editorText.split(/\s+/).filter(Boolean).length} words · Formatted Formal Reply
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-mono transition-colors cursor-pointer"
                >
                  Adjust Factual Stances
                </button>

                <button
                  type="button"
                  onClick={() => setShowRegenModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/30 text-xs font-mono text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Regenerate...</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveEditor}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-white transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isSaving ? 'Saving...' : 'Save Edits'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyText}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedState ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedState ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-xs font-semibold font-mono text-white shadow-md shadow-indigo-900/30 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download TXT</span>
                </button>
              </div>
            </div>

            {/* Document Editor Area */}
            <div className="bg-[#0b0f24]/95 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col min-h-[600px]">
              <div className="p-3 border-b border-slate-800/80 bg-[#07091a] flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>LEGAL NOTICE REPLY CANVAS (EDITABLE)</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  Full para-wise counter-statement
                </span>
              </div>

              <textarea
                value={editorText}
                onChange={(e) => setEditorText(e.target.value)}
                className="flex-1 w-full p-6 sm:p-8 bg-[#0a0d20] font-mono text-xs sm:text-sm text-slate-200 leading-relaxed outline-none resize-none focus:ring-0 select-text"
                rows={24}
                spellCheck={false}
              />
            </div>

            {/* Verification Checklist before export */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col gap-2.5">
              <span className="text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider">
                Pre-Dispatch Verification Checklist
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono text-slate-400">
                <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={checklist.namesChecked}
                    onChange={(e) => setChecklist({ ...checklist, namesChecked: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-500"
                  />
                  <span>Names & Addresses</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={checklist.datesChecked}
                    onChange={(e) => setChecklist({ ...checklist, datesChecked: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-500"
                  />
                  <span>Dates & Deadlines</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={checklist.allegationsChecked}
                    onChange={(e) => setChecklist({ ...checklist, allegationsChecked: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-500"
                  />
                  <span>Para-wise Responses</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={checklist.amountsChecked}
                    onChange={(e) => setChecklist({ ...checklist, amountsChecked: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-500"
                  />
                  <span>Amounts & UTR Proof</span>
                </label>
              </div>
            </div>

            {/* RAG Statutory Sources if any */}
            {activeReply.retrieved_sources && activeReply.retrieved_sources.length > 0 && (
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex flex-col gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Corroborating Indian Statutory Context (RAG)</span>
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                  {activeReply.retrieved_sources.map((src, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-black/50 border border-cyan-500/20 text-xs">
                      <p className="font-semibold text-slate-200">{src.citation || src.title}</p>
                      <p className="text-slate-400 text-[11px] mt-1 font-mono line-clamp-3">{src.excerpt}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Statutory Disclaimer */}
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
              <Scale className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-200 font-semibold mr-1">Statutory Notice:</span>
                <span>AI-assisted draft for review. Verify the facts, deadlines, legal references, and applicable requirements before sending. This is not a substitute for advice from a qualified legal professional.</span>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Regenerate Reply */}
        {showRegenModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[#0b0f24] border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 animate-scaleUp">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-cyan-400" />
                  <span>Regenerate Legal Notice Reply</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowRegenModal(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Provide additional instructions to adjust tone, emphasize specific denials, or add statutory counter-claims without altering your core facts.
              </p>

              <div>
                <label className="text-[11px] font-mono text-slate-300 block mb-1.5">
                  Adjustment Instructions (Optional)
                </label>
                <textarea
                  rows={3}
                  value={regenInstructions}
                  onChange={(e) => setRegenInstructions(e.target.value)}
                  placeholder="e.g. Explicitly reserve rights under Section 74 of the Indian Contract Act and emphasize that damage deductions were unauthorized..."
                  className="w-full p-3 rounded-xl bg-[#07091a] border border-slate-800 text-xs text-white placeholder-slate-600 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegenModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold font-mono flex items-center gap-2 cursor-pointer"
                >
                  {isGenerating ? 'Regenerating...' : 'Regenerate Reply'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
