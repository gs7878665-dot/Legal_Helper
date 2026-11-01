import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  ChevronLeft,
  BookOpen,
  HelpCircle,
  Lightbulb,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Scale,
  RefreshCw,
  Info,
  CheckCircle2,
  FileText,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { AuthBadge } from '../auth/AuthBadge';
import type {
  LawItem,
  ProvisionConversionResponse,
  LegalSourceItem,
  ProvisionSearchItem,
} from '../../api/types';

const RELATIONSHIP_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  direct_correspondence: {
    label: 'Direct Correspondence',
    color: 'text-emerald-300',
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-500/40',
  },
  changed_provision: {
    label: 'Substantive Changes / Expanded',
    color: 'text-amber-300',
    bg: 'bg-amber-950/40',
    border: 'border-amber-500/40',
  },
  partial_correspondence: {
    label: 'Partial Correspondence',
    color: 'text-cyan-300',
    bg: 'bg-cyan-950/40',
    border: 'border-cyan-500/40',
  },
  repealed_provision: {
    label: 'Repealed / Omitted',
    color: 'text-rose-300',
    bg: 'bg-rose-950/40',
    border: 'border-rose-500/40',
  },
  new_provision: {
    label: 'Newly Enacted Provision',
    color: 'text-violet-300',
    bg: 'bg-violet-950/40',
    border: 'border-violet-500/40',
  },
  related_provision: {
    label: 'Cross-Code Procedural Link',
    color: 'text-sky-300',
    bg: 'bg-sky-950/40',
    border: 'border-sky-500/40',
  },
};

const POPULAR_CONVERSIONS = [
  { sourceLaw: 'ipc', sourceNum: '420', targetLaw: 'bns', label: 'IPC 420 (Cheating) → BNS' },
  { sourceLaw: 'ipc', sourceNum: '302', targetLaw: 'bns', label: 'IPC 302 (Murder) → BNS' },
  { sourceLaw: 'ipc', sourceNum: '498A', targetLaw: 'bns', label: 'IPC 498A (Cruelty) → BNS' },
  { sourceLaw: 'ipc', sourceNum: '307', targetLaw: 'bns', label: 'IPC 307 (Attempt to Murder) → BNS' },
  { sourceLaw: 'crpc', sourceNum: '154', targetLaw: 'bnss', label: 'CrPC 154 (FIR) → BNSS' },
  { sourceLaw: 'crpc', sourceNum: '438', targetLaw: 'bnss', label: 'CrPC 438 (Anticipatory Bail) → BNSS' },
  { sourceLaw: 'bsa', sourceNum: '1', targetLaw: 'iea', label: 'BSA 1 (Evidence) → Evidence Act' },
  { sourceLaw: 'bns', sourceNum: '318', targetLaw: 'ipc', label: 'BNS 318 → IPC (Reverse)' },
];

export const LegalProvisionConverterPage: React.FC = () => {
  const navigate = useNavigate();

  // Laws list from backend
  const [laws, setLaws] = useState<LawItem[]>([]);
  const [lawsLoading, setLawsLoading] = useState(true);

  // User input states
  const [sourceLaw, setSourceLaw] = useState<string>('ipc');
  const [sourceProvision, setSourceProvision] = useState<string>('420');
  const [targetLaw, setTargetLaw] = useState<string>('bns');

  // Conversion Results
  const [conversionResult, setConversionResult] = useState<ProvisionConversionResponse | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search autocomplete / exploration
  const [searchResults, setSearchResults] = useState<ProvisionSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Official sources
  const [sources, setSources] = useState<LegalSourceItem[]>([]);
  const [showSourcesModal, setShowSourcesModal] = useState(false);

  // 1. Fetch available laws from backend
  useEffect(() => {
    async function loadLaws() {
      try {
        const lawsList = await apiClient.getLaws();
        setLaws(lawsList);
        if (lawsList.length >= 2) {
          const hasIpc = lawsList.some((l) => l.slug === 'ipc');
          const hasBns = lawsList.some((l) => l.slug === 'bns');
          setSourceLaw(hasIpc ? 'ipc' : lawsList[0].slug);
          setTargetLaw(hasBns ? 'bns' : lawsList[1].slug);
        }
      } catch (err: any) {
        setErrorMessage('Failed to load registered legal codes.');
      } finally {
        setLawsLoading(false);
      }
    }
    loadLaws();

    apiClient.getLegalSources().then(setSources).catch(() => {});
  }, []);

  // 2. Perform Conversion
  const handleConvert = useCallback(
    async (srcLaw = sourceLaw, srcNum = sourceProvision, tgtLaw = targetLaw) => {
      if (!srcNum.trim()) {
        setErrorMessage('Please enter a section or provision number.');
        return;
      }
      if (srcLaw === tgtLaw) {
        setErrorMessage('Source and target laws must be different.');
        return;
      }

      setIsConverting(true);
      setErrorMessage(null);
      try {
        const res = await apiClient.convertProvision(srcLaw, srcNum.trim(), tgtLaw);
        setConversionResult(res);
      } catch (err: any) {
        setConversionResult(null);
        setErrorMessage(
          err?.message || `No provision '${srcNum}' found in the selected source law.`
        );
      } finally {
        setIsConverting(false);
      }
    },
    [sourceLaw, sourceProvision, targetLaw]
  );

  // Auto-run initial conversion when laws load
  useEffect(() => {
    if (!lawsLoading && laws.length > 0) {
      handleConvert('ipc', '420', 'bns');
    }
  }, [lawsLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Swap source and target laws
  const handleSwapLaws = () => {
    const temp = sourceLaw;
    setSourceLaw(targetLaw);
    setTargetLaw(temp);
    if (conversionResult?.correspondences?.[0]?.target_provision?.provision_number) {
      const nextNum = conversionResult.correspondences[0].target_provision.provision_number;
      setSourceProvision(nextNum);
      handleConvert(targetLaw, nextNum, temp);
    }
  };

  // Autocomplete search across provisions
  const handleSearchChange = async (val: string) => {
    if (!val || val.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await apiClient.searchProvisions(val.trim(), sourceLaw, 6);
      setSearchResults(res.results);
      setShowSearchDropdown(true);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (item: ProvisionSearchItem) => {
    setSourceProvision(item.provision.provision_number);
    setShowSearchDropdown(false);
    handleConvert(sourceLaw, item.provision.provision_number, targetLaw);
  };

  return (
    <div className="min-h-screen bg-[#030308] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 1. Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#070913]/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-cyan-400 transition-all cursor-pointer shadow-sm"
          >
            <ChevronLeft className="w-4 h-4 text-cyan-400" />
            <span className="font-medium">Tree of Knowledge</span>
          </button>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-cyan-400">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                Legal Provision Converter
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800/40">
                  Multi-Law Architecture
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                Cross-statutory conversion, plain-language meanings, and everyday examples
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowSourcesModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-cyan-300 transition-all cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Official Concordance Sources</span>
          </button>
          <AuthBadge />
        </div>
      </header>

      {/* 2. Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Converter Selector Panel */}
        <div className="p-6 rounded-2xl bg-[#0b0f24]/90 border border-slate-800/80 backdrop-blur-sm shadow-xl flex flex-col gap-5">
          <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
            {/* Source Law Selector */}
            <div className="flex-1 w-full flex flex-col gap-1.5">
              <label className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                Source Law
              </label>
              <select
                value={sourceLaw}
                onChange={(e) => setSourceLaw(e.target.value)}
                disabled={lawsLoading}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#060919] border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-cyan-400 transition-colors cursor-pointer"
              >
                {laws.map((law) => (
                  <option key={law.slug} value={law.slug}>
                    {law.short_name} ({law.enactment_year}) — {law.status === 'repealed' ? 'Historical / Repealed' : 'Active'}
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <div className="pt-5 flex items-center justify-center">
              <button
                type="button"
                onClick={handleSwapLaws}
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 transition-all cursor-pointer shadow-md"
                title="Swap source and target laws"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Provision Input with live search */}
            <div className="w-full md:w-56 flex flex-col gap-1.5 relative">
              <label className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                Section / Provision #
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={sourceProvision}
                  onChange={(e) => {
                    setSourceProvision(e.target.value);
                    handleSearchChange(e.target.value);
                  }}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowSearchDropdown(true);
                  }}
                  placeholder="e.g. 420, 302, 498A"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060919] border border-slate-800 text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                />
                {isSearching && (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {showSearchDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 z-40 rounded-xl bg-[#0b0f24] border border-slate-800 shadow-2xl overflow-hidden divide-y divide-slate-800/80">
                  {searchResults.map((item) => (
                    <div
                      key={item.provision.id}
                      onClick={() => handleSelectSearchResult(item)}
                      className="p-2.5 hover:bg-slate-900/80 cursor-pointer text-xs transition-colors"
                    >
                      <div className="font-semibold text-cyan-300 font-mono">
                        {item.provision.provision_type} {item.provision.provision_number}
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-1">{item.provision.title}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Target Law Selector */}
            <div className="flex-1 w-full flex flex-col gap-1.5">
              <label className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                Target Law
              </label>
              <select
                value={targetLaw}
                onChange={(e) => setTargetLaw(e.target.value)}
                disabled={lawsLoading}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#060919] border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-cyan-400 transition-colors cursor-pointer"
              >
                {laws.map((law) => (
                  <option key={law.slug} value={law.slug}>
                    {law.short_name} ({law.enactment_year}) — {law.status === 'repealed' ? 'Historical / Repealed' : 'Active'}
                  </option>
                ))}
              </select>
            </div>

            {/* Convert Action Button */}
            <div className="pt-5 w-full md:w-auto">
              <button
                type="button"
                onClick={() => handleConvert()}
                disabled={isConverting}
                className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50 cursor-pointer"
              >
                {isConverting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Cross-Referencing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>Convert Provision</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Popular Quick Conversion Pills */}
          <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
            <span className="text-slate-500 mr-1 flex items-center gap-1">
              <Lightbulb className="w-3 h-3 text-amber-400" /> Quick Lookups:
            </span>
            {POPULAR_CONVERSIONS.map((pop, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSourceLaw(pop.sourceLaw);
                  setSourceProvision(pop.sourceNum);
                  setTargetLaw(pop.targetLaw);
                  handleConvert(pop.sourceLaw, pop.sourceNum, pop.targetLaw);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                {pop.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/40 flex items-center gap-3 text-xs text-rose-300">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 3. Conversion Results Area */}
        {conversionResult && (
          <div className="flex flex-col gap-6">
            {/* Status Summary & Legal Caveat Panel */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0f24]/90 border border-slate-800 flex flex-col gap-2.5 shadow-md">
              <div className="flex items-center gap-2">
                {conversionResult.has_verified_mapping ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Info className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span className="text-xs font-semibold text-white font-mono">
                  {conversionResult.status_summary}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-mono bg-[#060919] p-3 rounded-xl border border-slate-800/80">
                <span className="text-amber-400 font-semibold mr-1">Statutory Notice:</span>
                {conversionResult.caveat}
              </p>
            </div>

            {/* Split Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SOURCE PROVISION CARD */}
              <div className="p-6 rounded-2xl bg-[#0b0f24] border border-slate-800 shadow-xl flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">
                      Source Code · {conversionResult.source_law.short_name}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-400 border border-slate-800">
                      Enacted {conversionResult.source_law.enactment_year}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <span className="text-cyan-400">
                        {conversionResult.source_provision.provision_type} {conversionResult.source_provision.provision_number}
                      </span>
                    </h2>
                    <h3 className="text-sm font-semibold text-slate-300 mt-1">
                      {conversionResult.source_provision.title}
                    </h3>
                  </div>

                  {/* Official Statutory Text Excerpt */}
                  {conversionResult.source_provision.official_text && (
                    <div className="p-3.5 rounded-xl bg-[#060919] border border-slate-800/80 text-xs font-mono text-slate-300 leading-relaxed max-h-48 overflow-y-auto">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                        Official Statutory Language:
                      </span>
                      {conversionResult.source_provision.official_text}
                    </div>
                  )}

                  {/* Plain Language Meaning */}
                  {conversionResult.source_provision.plain_language_explanation && (
                    <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-indigo-300 font-mono flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                        Plain-Language Meaning
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {conversionResult.source_provision.plain_language_explanation}
                      </p>
                    </div>
                  )}

                  {/* Practical Everyday Example */}
                  {conversionResult.source_provision.practical_example && (
                    <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-amber-300 font-mono flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                        Practical Everyday Example (Illustration)
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed italic">
                        &ldquo;{conversionResult.source_provision.practical_example}&rdquo;
                      </p>
                      <span className="text-[10px] font-mono text-slate-500 mt-1">
                        Note: An example is an illustration, not a definitive legal determination. Actual application depends on specific facts.
                      </span>
                    </div>
                  )}

                  {/* Key Conditions */}
                  {conversionResult.source_provision.key_conditions?.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-[#060919] border border-slate-800/80 text-xs">
                      <span className="text-[11px] font-mono font-semibold text-slate-400 block mb-2">
                        Essential Statutory Elements:
                      </span>
                      <ul className="space-y-1 text-slate-300">
                        {conversionResult.source_provision.key_conditions.map((cond, i) => (
                          <li key={i} className="list-disc list-inside font-mono text-[11px]">
                            {cond}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>Effective: {conversionResult.source_provision.effective_from || 'Historical'}</span>
                  {conversionResult.source_law.official_source_url && (
                    <a
                      href={conversionResult.source_law.official_source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      Official Law <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* TARGET PROVISION(S) CARD */}
              <div className="p-6 rounded-2xl bg-[#0b0f24] border border-slate-800 shadow-xl flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                      Target Code · {conversionResult.target_law.short_name}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-400 border border-slate-800">
                      Enacted {conversionResult.target_law.enactment_year}
                    </span>
                  </div>

                  {conversionResult.correspondences.length > 0 ? (
                    conversionResult.correspondences.map((corr, idx) => {
                      const relInfo =
                        RELATIONSHIP_LABELS[corr.relationship_type] ||
                        RELATIONSHIP_LABELS.direct_correspondence;
                      return (
                        <div
                          key={corr.id || idx}
                          className="p-4 rounded-xl bg-[#060919] border border-slate-800 flex flex-col gap-3"
                        >
                          {/* Relationship Badge */}
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-medium ${relInfo.bg} ${relInfo.color} border ${relInfo.border}`}
                            >
                              {relInfo.label}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              Status: {corr.mapping_status}
                            </span>
                          </div>

                          <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                              <span className="text-emerald-400">
                                {corr.target_provision.provision_type} {corr.target_provision.provision_number}
                              </span>
                            </h2>
                            <h3 className="text-sm font-semibold text-slate-300 mt-0.5">
                              {corr.target_provision.title}
                            </h3>
                          </div>

                          {/* Substantive Changes Callout */}
                          {corr.substantive_changes && (
                            <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-600/30 text-xs">
                              <span className="text-[10px] font-semibold text-indigo-300 font-mono block mb-1">
                                Substantive Law Transition / Changes:
                              </span>
                              <p className="text-slate-200">{corr.substantive_changes}</p>
                            </div>
                          )}

                          {/* Target Official Text */}
                          {corr.target_provision.official_text && (
                            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 max-h-40 overflow-y-auto">
                              <span className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                                Statutory Text in {conversionResult.target_law.short_name}:
                              </span>
                              {corr.target_provision.official_text}
                            </div>
                          )}

                          {/* Source Reference Concordance Table */}
                          {corr.source_reference && (
                            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 pt-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Verified in: {corr.source_reference}</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    // Structured No Correspondence Found
                    <div className="p-8 rounded-xl bg-[#060919] border border-slate-800 flex flex-col items-center justify-center text-center gap-3">
                      <AlertTriangle className="w-8 h-8 text-amber-400" />
                      <h4 className="text-sm font-semibold text-white">
                        No Verified Correspondence Found
                      </h4>
                      <p className="text-xs text-slate-400 max-w-sm">
                        No direct or partial equivalent has been identified in official government concordance tables between {conversionResult.source_law.short_name} {conversionResult.source_provision.provision_number} and {conversionResult.target_law.short_name}.
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        Legal Helper never fabricates or guesses statutory section numbers.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>Concordance Dataset: 2024.1 Official</span>
                  {conversionResult.target_law.official_source_url && (
                    <a
                      href={conversionResult.target_law.official_source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      Gazette Source <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* OFFICIAL CONCORDANCE SOURCES MODAL */}
      {/* ========================================================================= */}
      {showSourcesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-[#0b0f24] border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-cyan-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Verified Legal Concordance Sources</h3>
                  <p className="text-[11px] text-slate-400">Official government gazettes & transition tables</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSourcesModal(false)}
                className="text-slate-400 hover:text-white p-1 text-xs font-mono"
              >
                Close
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
              {sources.map((src, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-[#060919] border border-slate-800/80 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{src.title}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
                      {src.source_type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{src.description}</p>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                    <span>Authority: {src.authority}</span>
                    {src.url && (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        Visit Source <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
