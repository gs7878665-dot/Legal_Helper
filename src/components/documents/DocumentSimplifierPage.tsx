import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  UploadCloud,
  FileCode,
  Copy,
  Check,
  Download,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Scale,
  ShieldCheck,
  Sliders,
  ChevronRight,
  Info,
  Calendar,
  DollarSign,
  BookOpen,
  Flag,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Eye
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { AuthBadge } from '../auth/AuthBadge';
import type {
  DocumentItem,
  SimplificationResultItem,
  StructuredSimplificationOutput
} from '../../api/types';

const SAMPLE_DOCUMENTS = [
  {
    title: 'Residential Lease Agreement (Bengaluru)',
    text: `RENTAL AGREEMENT
This Rental Agreement is made and executed on this 1st day of November 2026 at Bengaluru, Karnataka between:
Mr. Rajesh Varma, residing at #42, 12th Cross, Indiranagar, Bengaluru (hereinafter called the "LESSOR") of the ONE PART;
AND
Ms. Ananya Sen, working at TechCorp India Pvt Ltd, Bengaluru (hereinafter called the "LESSEE") of the OTHER PART.

WHEREAS the Lessor is the absolute owner of the residential premises situated at Flat 301, Palm Meadows, Whitefield, Bengaluru - 560066.

NOW THIS AGREEMENT WITNESSETH AS FOLLOWS:
1. TENURE: The tenure of this tenancy shall be for a fixed duration of eleven (11) months commencing from 1st November 2026 to 30th September 2027.
2. MONTHLY RENT: The Lessee shall pay a monthly rent of ₹38,000/- (Rupees Thirty-Eight Thousand only) inclusive of maintenance on or before the 5th day of each calendar month. Any delay exceeding 7 days shall attract a penal interest of 1.5% per month.
3. INTEREST-FREE SECURITY DEPOSIT: The Lessee has paid a sum of ₹1,50,000/- (Rupees One Lakh Fifty Thousand only) as interest-free security deposit. The said deposit shall be refunded within fifteen (15) days of handing over vacant possession, subject to deduction of painting charges equivalent to one month's rent.
4. INDEMNITY & MAINTENANCE: The Lessee agrees to indemnify and keep indemnified the Lessor against any statutory penalties, municipal claims, or third-party liabilities arising from negligent misuse of the premises.
5. TERMINATION & NOTICE PERIOD: Either party may terminate this agreement by serving two (2) months prior written notice. If the Lessee vacates without adequate notice, the security deposit shall stand forfeited.
6. JURISDICTION: This agreement shall be governed by the laws of India and subject exclusively to the courts of Bengaluru, Karnataka under the Karnataka Rent Control provisions.`
  },
  {
    title: 'B2B Software Development & Services Agreement',
    text: `MASTER SERVICES AGREEMENT (MSA)
This Master Services Agreement is entered into on 15th October 2026 by and between:
CloudMatrix Technologies Pvt Ltd, having its registered office in Hyderabad, Telangana ("Service Provider")
AND
Vanguard Retail Solutions Ltd, having its corporate office in Mumbai, Maharashtra ("Client").

OPERATIVE PROVISIONS:
1. STATEMENT OF WORK: Service Provider shall deliver cloud migration and compliance software modules as enumerated in Schedule A for a total milestone fee of ₹12,50,000/- plus applicable GST.
2. PAYMENT TERMS & PENALTIES: Invoices are payable within 30 days of submission. If payment is delayed beyond 45 days, Service Provider may suspend access and levy liquidated damages of 12% per annum.
3. INTELLECTUAL PROPERTY INDEMNIFICATION: The Service Provider shall defend and hold harmless the Client against any third-party suits alleging that the software infringes any patent, copyright, or trade secret recognized under the Copyright Act, 1957.
4. LIMITATION OF LIABILITY: Neither party shall be liable for indirect, incidental, or consequential damages. Aggregate liability under this contract shall not exceed the total fees paid by Client in the preceding three (3) months.
5. FORCE MAJEURE: Neither party shall be in default on account of events beyond reasonable control, including natural calamities, epidemics, or government embargos.
6. GOVERNING LAW & ARBITRATION: Any dispute arising out of this agreement shall be settled through binding arbitration under the Arbitration and Conciliation Act, 1996 by a sole arbitrator in Mumbai.`
  },
  {
    title: 'Mutual Non-Disclosure Agreement (NDA)',
    text: `MUTUAL NON-DISCLOSURE AGREEMENT
This Non-Disclosure Agreement ("Agreement") is executed on 20th September 2026 by and between Disclosing Party and Receiving Party.

1. DEFINITION OF CONFIDENTIAL INFORMATION: Confidential Information includes all technical, business, statutory algorithms, customer records, and commercial data disclosed in tangible or electronic format marked as "Proprietary".
2. EXCLUSIONS: Confidential Information does not encompass information that (a) is or becomes publicly available without breach of this Agreement, (b) was already known prior to disclosure, or (c) is required to be disclosed under statutory subpoena or judicial decree.
3. NON-DISCLOSURE OBLIGATION: The Receiving Party agrees to preserve confidentiality with the same degree of care as its own confidential materials (but not less than reasonable care) for a duration of three (3) years from disclosure.
4. REMEDIES: The parties acknowledge that monetary damages may be inadequate for unauthorized disclosure, and the Disclosing Party shall be entitled to seek injunctive relief without posting bond in courts of New Delhi.`
  }
];

export const DocumentSimplifierPage: React.FC = () => {
  const navigate = useNavigate();

  // Active Tab: 'upload' or 'paste'
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');

  // Input states
  const [pastedTitle, setPastedTitle] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Document record state
  const [currentDocument, setCurrentDocument] = useState<DocumentItem | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // Simplification settings
  const [simplificationLevel, setSimplificationLevel] = useState<'basic' | 'standard' | 'detailed'>('standard');
  const [preserveLegalTerms, setPreserveLegalTerms] = useState(true);
  const [explainTerminology, setExplainTerminology] = useState(true);

  // Simplification execution state
  const [isSimplifying, setIsSimplifying] = useState(false);
  const [simplificationResult, setSimplificationResult] = useState<SimplificationResultItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedState, setCopiedState] = useState(false);
  const [isRedFlagsExpanded, setIsRedFlagsExpanded] = useState(false);
  const [activeHighlightedClause, setActiveHighlightedClause] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalDocScrollRef = useRef<HTMLDivElement>(null);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await handleFileUpload(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await handleFileUpload(file);
    }
  };

  // Upload and Extract File
  const handleFileUpload = async (file: File) => {
    setErrorMessage(null);
    setIsExtracting(true);

    try {
      const doc = await apiClient.uploadDocument(file);
      setCurrentDocument(doc);
      setSimplificationResult(null);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to process document. Please ensure it is a valid, readable PDF or DOCX file.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Submit Pasted Text
  const handlePastedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) return;

    setErrorMessage(null);
    setIsExtracting(true);

    try {
      const doc = await apiClient.createDocumentFromText(
        pastedTitle.trim() || 'Pasted Legal Agreement',
        pastedText.trim()
      );
      setCurrentDocument(doc);
      setSimplificationResult(null);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to ingest pasted legal text.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Load Sample Template
  const handleLoadSample = (sample: typeof SAMPLE_DOCUMENTS[0]) => {
    setPastedTitle(sample.title);
    setPastedText(sample.text);
    setActiveTab('paste');
  };

  // Run AI Simplification
  const handleRunSimplification = async () => {
    if (!currentDocument) return;

    setIsSimplifying(true);
    setErrorMessage(null);

    try {
      const result = await apiClient.simplifyDocument(currentDocument.id, {
        level: simplificationLevel,
        preserve_legal_terms: preserveLegalTerms,
        explain_terminology: explainTerminology,
        language: 'en',
      });
      setSimplificationResult(result);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Simplification request failed. Please check network or try again.');
    } finally {
      setIsSimplifying(false);
    }
  };

  // Copy Plain Text Action
  const handleCopyText = () => {
    if (!simplificationResult) return;
    navigator.clipboard.writeText(simplificationResult.simplified_text);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2200);
  };

  // Download Plain Text Action
  const handleDownloadText = () => {
    if (!simplificationResult) return;
    const element = document.createElement('a');
    const file = new Blob([simplificationResult.simplified_text], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    const baseName = currentDocument?.original_filename.replace(/\.[^/.]+$/, '') || 'simplified_legal_document';
    element.download = `${baseName}_simplified.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Reset to Upload another document
  const handleResetDocument = () => {
    setCurrentDocument(null);
    setSimplificationResult(null);
    setPastedText('');
    setPastedTitle('');
    setErrorMessage(null);
    setActiveHighlightedClause(null);
  };

  // Navigate/scroll to referenced clause in Original Document
  const handleViewClause = (sourceRef?: string, excerpt?: string) => {
    if (!originalDocScrollRef.current) return;
    const targetText = excerpt || sourceRef;
    if (!targetText) return;

    setActiveHighlightedClause(targetText);

    // Try finding exact paragraph/position or scroll into view
    const container = originalDocScrollRef.current;
    const fullText = currentDocument?.extracted_text || '';
    const cleanSearch = targetText.slice(0, 35).trim();
    const idx = fullText.toLowerCase().indexOf(cleanSearch.toLowerCase());

    if (idx !== -1 && fullText.length > 0) {
      const scrollRatio = idx / fullText.length;
      container.scrollTo({
        top: scrollRatio * container.scrollHeight,
        behavior: 'smooth'
      });
    }

    setTimeout(() => {
      setActiveHighlightedClause(null);
    }, 4000);
  };

  const structured: StructuredSimplificationOutput | undefined = simplificationResult?.structured_output || undefined;

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col select-none font-sans relative">
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
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide flex items-center gap-2 text-white">
                <span>Document Simplifier</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                  India Jurisdiction
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 hidden md:block">
                Transforms complex deeds and legal agreements into plain-language clauses with preserved figures & obligations
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {currentDocument && (
            <button
              onClick={handleResetDocument}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-xs text-slate-300 hover:text-white transition-all font-mono cursor-pointer"
              title="Start with another document"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Document</span>
            </button>
          )}

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <AuthBadge />
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-5">
        {/* Error Notification Alert */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-start gap-3 shadow-lg">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <p className="font-semibold text-rose-200 mb-0.5">Notice</p>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* STEP 1: If no document is loaded, show upload/paste zone */}
        {!currentDocument ? (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full py-4">
            {/* Hero Card */}
            <div className="bg-[#0b0f24]/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium w-fit mb-4">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Private & Client-Scoped Storage</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
                Understand Any Legal Agreement in Minutes
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
                Upload your rental deed, employment contract, or notice. Legal Helper translates archaic clauses into plain language, preserves every deadline and financial figure, and explains difficult legal jargon.
              </p>

              {/* Input Mode Selector Tabs */}
              <div className="flex items-center gap-2 mt-6 p-1 bg-slate-950/80 rounded-xl border border-slate-800 w-fit">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'upload'
                      ? 'bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Document (PDF / DOCX)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'paste'
                      ? 'bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileCode className="w-4 h-4" />
                  <span>Paste Legal Text</span>
                </button>
              </div>

              {/* Tab 1: Upload Dropzone */}
              {activeTab === 'upload' && (
                <div className="mt-6">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-4 ${
                      isDragOver
                        ? 'border-cyan-400 bg-cyan-950/20 scale-[1.01]'
                        : 'border-slate-800 hover:border-indigo-500/50 bg-[#07091a]/50'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                      className="hidden"
                    />

                    <div className="w-14 h-14 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                      {isExtracting ? (
                        <div className="w-6 h-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                      ) : (
                        <UploadCloud className="w-7 h-7" />
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-white mb-1">
                        {isExtracting ? 'Reading & Extracting Document...' : 'Click to select or drag and drop your document'}
                      </p>
                      <p className="text-xs text-slate-400">
                        Supports PDF (.pdf), Microsoft Word (.docx), and plain text (.txt) up to 10 MB
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-indigo-950/80 border border-indigo-500/30 text-indigo-300">
                        PDF
                      </span>
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-indigo-950/80 border border-indigo-500/30 text-indigo-300">
                        DOCX
                      </span>
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-indigo-950/80 border border-indigo-500/30 text-indigo-300">
                        TXT
                      </span>
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-slate-800/80 text-slate-400">
                        Max 10 MB
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Direct Paste Text */}
              {activeTab === 'paste' && (
                <form onSubmit={handlePastedSubmit} className="mt-6 flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Agreement or Document Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={pastedTitle}
                      onChange={(e) => setPastedTitle(e.target.value)}
                      placeholder="e.g. Commercial Lease Deed, NDA, Consumer Notice"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#07091a] border border-slate-800 focus:border-cyan-400 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-slate-300">
                        Legal Text Content
                      </label>
                      <span className="text-[11px] font-mono text-slate-500">
                        {pastedText.length} characters · ~{pastedText.split(/\s+/).filter(Boolean).length} words
                      </span>
                    </div>
                    <textarea
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      rows={8}
                      placeholder="Paste clauses, lease terms, indemnity provisions, or legal notice paragraphs here..."
                      className="w-full p-3.5 rounded-xl bg-[#07091a] border border-slate-800 focus:border-cyan-400 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors font-mono resize-y"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isExtracting || pastedText.trim().length < 15}
                    className="self-end px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-lg shadow-indigo-900/30 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {isExtracting ? (
                      <>
                        <div className="w-3.5 h-3.5 rounded-full border border-white border-t-transparent animate-spin" />
                        <span>Processing Text...</span>
                      </>
                    ) : (
                      <>
                        <span>Ingest & Review Clauses</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Quick Sample Agreement Templates */}
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase text-slate-400 mb-3 px-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Or test with a pre-configured legal agreement:</span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {SAMPLE_DOCUMENTS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleLoadSample(sample)}
                    className="p-4 rounded-xl bg-[#0b0f24]/60 hover:bg-[#0e1430] border border-slate-800/80 hover:border-indigo-500/40 text-left transition-all duration-200 group cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                          {sample.title}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 group-hover:text-cyan-400 transition-all" />
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 font-mono">
                        {sample.text.slice(0, 120)}...
                      </p>
                    </div>
                    <span className="text-[10px] text-cyan-400 font-mono mt-3">
                      Click to load template →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* STEP 2: Document Loaded Workspace */
          <div className="flex flex-col gap-5">
            {/* Metadata Bar */}
            <div className="p-4 rounded-xl bg-[#0b0f24]/90 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-cyan-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>{currentDocument.original_filename}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      Extracted
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {currentDocument.word_count} words · {(currentDocument.file_size_bytes / 1024).toFixed(1)} KB · {currentDocument.source_type === 'upload' ? 'File Upload' : 'Direct Text'}
                  </p>
                </div>
              </div>

              {/* Controls & Action */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Level selector */}
                <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#07091a] border border-slate-800 text-xs font-mono">
                  {(['basic', 'standard', 'detailed'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSimplificationLevel(lvl)}
                      className={`px-3 py-1 rounded-md capitalize font-medium transition-colors cursor-pointer ${
                        simplificationLevel === lvl
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>

                {/* Option Toggles */}
                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-300">
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                    <input
                      type="checkbox"
                      checked={preserveLegalTerms}
                      onChange={(e) => setPreserveLegalTerms(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span>Preserve Figures & Terms</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                    <input
                      type="checkbox"
                      checked={explainTerminology}
                      onChange={(e) => setExplainTerminology(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span>Explain Jargon</span>
                  </label>
                </div>

                {/* Simplify Action Button */}
                <button
                  type="button"
                  onClick={handleRunSimplification}
                  disabled={isSimplifying}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-900/30 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSimplifying ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      <span>Simplifying Clauses...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                      <span>{simplificationResult ? 'Re-simplify' : 'Simplify Document'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* RED FLAG SUMMARY CARD - Prominently displayed directly below the controls and above both document panels */}
            {simplificationResult ? (
              <div className="rounded-2xl bg-[#0b0f24]/95 border border-indigo-900/60 shadow-[0_4px_24px_rgba(15,23,42,0.6)] overflow-hidden transition-all duration-300">
                {/* Card Header Banner */}
                <div className="p-4 sm:px-6 bg-gradient-to-r from-slate-900 via-[#0d122e] to-slate-900 border-b border-indigo-950/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.2)]">
                      <Flag className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-sm font-semibold text-white tracking-wide">
                          Red Flag Summary
                        </h3>
                        {structured?.red_flags && structured.red_flags.length > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 border border-amber-500/40 text-amber-300">
                            {structured.red_flags.length} {structured.red_flags.length === 1 ? 'Finding' : 'Findings'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                            Clean Review
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Potential clauses and obligations that deserve closer review.
                      </p>
                    </div>
                  </div>

                  {structured?.red_flags && structured.red_flags.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setIsRedFlagsExpanded(!isRedFlagsExpanded)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/40 text-xs font-mono text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer"
                    >
                      <span>{isRedFlagsExpanded ? 'Show Top Findings' : `View All (${structured.red_flags.length})`}</span>
                      {isRedFlagsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-4 sm:p-5">
                  {structured?.red_flags && structured.red_flags.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {(isRedFlagsExpanded ? structured.red_flags : structured.red_flags.slice(0, 4)).map((flag, idx) => {
                        const isHigh = flag.severity === 'high';
                        const isMedium = flag.severity === 'medium';
                        return (
                          <div
                            key={idx}
                            className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                              isHigh
                                ? 'bg-red-950/20 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.06)]'
                                : isMedium
                                ? 'bg-amber-950/15 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.05)]'
                                : 'bg-slate-900/40 border-slate-800'
                            }`}
                          >
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                                  <ShieldAlert className={`w-3.5 h-3.5 shrink-0 ${
                                    isHigh ? 'text-red-400' : isMedium ? 'text-amber-400' : 'text-slate-400'
                                  }`} />
                                  <span>{flag.finding}</span>
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-bold ${
                                    isHigh
                                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                      : isMedium
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                                  }`}
                                >
                                  {flag.severity} Risk
                                </span>
                              </div>

                              <p className="text-xs text-slate-300 leading-relaxed">
                                {flag.explanation}
                              </p>

                              {flag.source_excerpt && (
                                <div className="mt-1 p-2 rounded-lg bg-black/50 border border-slate-800/80 font-mono text-[11px] text-slate-400 italic line-clamp-2">
                                  "{flag.source_excerpt}"
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 mt-1">
                              <span className="text-[11px] font-mono text-slate-400">
                                {flag.source_reference ? `Ref: ${flag.source_reference}` : 'General Clause Obligation'}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleViewClause(flag.source_reference, flag.source_excerpt)}
                                className="flex items-center gap-1 text-[11px] font-mono font-medium text-cyan-400 hover:text-cyan-300 hover:underline transition-all cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View clause</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Calm Empty State */
                    <div className="py-6 px-4 flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <Check className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-emerald-300">
                          No potential red flags were identified in this analysis.
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Standard contract terms detected without aggressive forfeiture, unmitigated liabilities, or statutory conflicts.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : errorMessage ? (
              /* Error / Retry State for Analysis */
              <div className="rounded-2xl bg-red-950/20 border border-red-500/30 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-red-200">
                      Red Flag Analysis & Simplification Encountered an Error
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      {errorMessage}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRunSimplification}
                  className="px-3.5 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-500 text-white text-xs font-semibold font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Analysis</span>
                </button>
              </div>
            ) : null}

            {/* Split Screen Workspace: Original Document vs. Simplified Translation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              {/* Left Column: Original Extracted Document */}
              <div className="bg-[#0b0f24]/90 border border-slate-800 rounded-2xl flex flex-col h-[700px] overflow-hidden">
                <div className="p-3.5 border-b border-slate-800/80 bg-[#07091a] flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 font-mono flex items-center gap-2">
                    <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                    <span>ORIGINAL DOCUMENT TEXT</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Read-only source
                  </span>
                </div>
                <div
                  ref={originalDocScrollRef}
                  className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-text transition-colors"
                >
                  {activeHighlightedClause && (
                    <div className="mb-3 p-2.5 rounded-lg bg-indigo-950/70 border border-cyan-500/50 text-[11px] text-cyan-200 flex items-center gap-2 animate-pulse">
                      <Eye className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>Targeted Clause Focus: {activeHighlightedClause.slice(0, 90)}...</span>
                    </div>
                  )}
                  {currentDocument.extracted_text}
                </div>
              </div>

              {/* Right Column: Simplified Result or Controls Prompt */}
              <div className="bg-[#0b0f24]/90 border border-slate-800 rounded-2xl flex flex-col h-[700px] overflow-hidden">
                <div className="p-3.5 border-b border-slate-800/80 bg-[#07091a] flex items-center justify-between">
                  <span className="text-xs font-semibold text-cyan-300 font-mono flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>PLAIN-LANGUAGE TRANSLATION</span>
                  </span>

                  {simplificationResult && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyText}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800/60 hover:bg-slate-700/80 text-[11px] font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Copy entire simplified text"
                      >
                        {copiedState ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedState ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadText}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 text-[11px] font-mono text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer"
                        title="Download as text file"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Content Container */}
                <div className="flex-1 p-5 overflow-y-auto select-text flex flex-col gap-5">
                  {isSimplifying ? (
                    /* Loading State */
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                      <div className="relative w-14 h-14 mb-4">
                        <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-ping" />
                        <div className="w-14 h-14 rounded-full border-2 border-t-cyan-400 border-r-indigo-500 border-b-transparent border-l-transparent animate-spin" />
                      </div>
                      <p className="text-sm font-semibold text-white mb-1">
                        Translating Legal Clauses to Plain Language...
                      </p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Analyzing obligations, preserving timeline dates & amounts, and validating terminology.
                      </p>
                    </div>
                  ) : simplificationResult ? (
                    /* Render Structured Simplification */
                    <div className="flex flex-col gap-5">
                      {/* 1. Summary Card */}
                      {structured?.summary && (
                        <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs text-slate-200 leading-relaxed">
                          <div className="flex items-center gap-1.5 font-semibold text-cyan-300 mb-1 font-mono uppercase tracking-wider text-[11px]">
                            <Scale className="w-3.5 h-3.5" />
                            <span>Executive Plain-Language Summary</span>
                          </div>
                          <p>{structured.summary}</p>
                        </div>
                      )}

                      {/* 2. Key Facts Preserved (Dates, Financials, Parties) */}
                      {structured?.key_facts && (
                        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col gap-3">
                          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Preserved Core Elements</span>
                          </span>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            {/* Dates & Deadlines */}
                            {structured.key_facts.dates_and_deadlines && structured.key_facts.dates_and_deadlines.length > 0 && (
                              <div className="p-3 rounded-lg bg-black/40 border border-slate-800/80">
                                <span className="font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5 text-[11px]">
                                  <Calendar className="w-3 h-3 text-amber-400" />
                                  <span>Dates & Deadlines</span>
                                </span>
                                <ul className="list-disc list-inside space-y-1 text-slate-300 font-mono text-[11px]">
                                  {structured.key_facts.dates_and_deadlines.map((d, i) => (
                                    <li key={i}>{d}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Financial Terms & Amounts */}
                            {structured.key_facts.financial_terms && structured.key_facts.financial_terms.length > 0 && (
                              <div className="p-3 rounded-lg bg-black/40 border border-slate-800/80">
                                <span className="font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5 text-[11px]">
                                  <DollarSign className="w-3 h-3 text-emerald-400" />
                                  <span>Financial Figures & Penalties</span>
                                </span>
                                <ul className="list-disc list-inside space-y-1 text-slate-300 font-mono text-[11px]">
                                  {structured.key_facts.financial_terms.map((amt, i) => (
                                    <li key={i}>{amt}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 3. Clause-by-Clause Simplified Sections */}
                      {structured?.sections && structured.sections.length > 0 && (
                        <div className="flex flex-col gap-3">
                          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                            Clause Breakdown
                          </span>
                          {structured.sections.map((section, idx) => (
                            <div
                              key={idx}
                              className="p-4 rounded-xl bg-[#0e132c]/80 border border-slate-800/80 flex flex-col gap-2 shadow-sm"
                            >
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-semibold text-cyan-300">
                                  {section.title}
                                </h4>
                                {section.original_reference && (
                                  <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded">
                                    {section.original_reference}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-200 leading-relaxed">
                                {section.simplified_content}
                              </p>
                              {section.practical_implication && (
                                <div className="mt-1 p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-indigo-300 flex items-start gap-2">
                                  <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-semibold text-slate-200 mr-1">What this means:</span>
                                    <span>{section.practical_implication}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 4. Explained Legal Terminology */}
                      {structured?.explained_terms && structured.explained_terms.length > 0 && (
                        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col gap-2.5">
                          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Legal Terms Demystified</span>
                          </span>
                          <div className="grid grid-cols-1 gap-2">
                            {structured.explained_terms.map((t, idx) => (
                              <div key={idx} className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80 text-xs">
                                <span className="font-semibold text-cyan-300 mr-2">{t.term}:</span>
                                <span className="text-slate-300">{t.plain_definition}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 5. Ambiguities & Watchouts */}
                      {structured?.ambiguities_and_risks && structured.ambiguities_and_risks.length > 0 && (
                        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-600/30 text-xs text-amber-200/90 flex flex-col gap-1.5">
                          <span className="font-semibold text-amber-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-mono">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Potential Ambiguities & Risks to Watch</span>
                          </span>
                          <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                            {structured.ambiguities_and_risks.map((risk, idx) => (
                              <li key={idx}>{risk}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 6. Retrieved RAG Sources (if any) */}
                      {simplificationResult.retrieved_sources && simplificationResult.retrieved_sources.length > 0 && (
                        <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex flex-col gap-2">
                          <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Corroborating Indian Statutory Sources (RAG)</span>
                          </span>
                          {simplificationResult.retrieved_sources.map((src, idx) => (
                            <div key={idx} className="p-2.5 rounded-lg bg-black/50 border border-cyan-500/20 text-xs">
                              <p className="font-semibold text-slate-200">{src.citation || src.title}</p>
                              <p className="text-slate-400 text-[11px] mt-1 font-mono">{src.excerpt}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 7. Authority & Disclaimer */}
                      <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px] text-slate-500 italic">
                        {structured?.disclaimer ||
                          'This simplified document is generated for informational and comprehension purposes only. It is not formal legal representation. The original signed legal document remains authoritative.'}
                      </div>
                    </div>
                  ) : (
                    /* Initial Prompt to Click Simplify */
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                      <div className="w-12 h-12 rounded-xl bg-indigo-950/50 border border-indigo-500/20 flex items-center justify-center text-cyan-400 mb-3">
                        <Sliders className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-semibold text-white mb-1">
                        Ready to Simplify
                      </h4>
                      <p className="text-xs text-slate-400 max-w-sm mb-4">
                        Choose your simplification level above and click "Simplify Document" to generate plain-language explanations.
                      </p>
                      <button
                        type="button"
                        onClick={handleRunSimplification}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-semibold shadow-lg shadow-indigo-900/30 transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Simplify Document Now</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
