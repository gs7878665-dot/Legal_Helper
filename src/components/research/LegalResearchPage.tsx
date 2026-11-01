import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  BookOpen,
  Filter,
  ExternalLink,
  Copy,
  Check,
  X,
  Sparkles,
  AlertCircle,
  Loader2,
  FileText,
  Gavel,
  ShieldAlert,
  Info,
  Scale
} from 'lucide-react';
import { AuthBadge } from '../auth/AuthBadge';
import { apiClient } from '../../api/client';
import type {
  ResearchResultItem,
  ResearchSourceDetail,
  ResearchSearchResponse
} from '../../api/types';

const SOURCE_TYPE_OPTIONS = [
  { id: 'all', label: 'All Legal Sources' },
  { id: 'legislation', label: 'Legislation & Acts', icon: FileText },
  { id: 'judgment', label: 'Judicial Precedents', icon: Gavel },
  { id: 'rule', label: 'Rules & Regulations', icon: BookOpen },
];

const SUGGESTED_RESEARCH_QUERIES = [
  'Consumer protection refund deficiency in service',
  'Section 66D Information Technology Act cyber fraud',
  'Tenancy notice period security deposit Transfer of Property',
  'Puttaswamy right to privacy Article 21',
  'BNS Section 318 cheating and fraud',
  'Indian Contract Act Section 73 damages breach',
  'Digital Personal Data Protection Act consent breach'
];

export const LegalResearchPage: React.FC = () => {
  const navigate = useNavigate();

  // Search parameters
  const [query, setQuery] = useState('consumer protection refund');
  const [selectedSourceType, setSelectedSourceType] = useState('all');
  const [jurisdiction, setJurisdiction] = useState('India');

  // Search state
  const [searchResponse, setSearchResponse] = useState<ResearchSearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Detail Modal
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [sourceDetail, setSourceDetail] = useState<ResearchSourceDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [copiedCitation, setCopiedCitation] = useState(false);

  // Perform search
  const executeSearch = async (overrideQuery?: string, overrideType?: string) => {
    const q = (overrideQuery !== undefined ? overrideQuery : query).trim();
    if (!q) return;

    setIsLoading(true);
    setErrorMessage(null);
    setHasSearched(true);

    const typeFilter = overrideType !== undefined ? overrideType : selectedSourceType;
    const filterArray = typeFilter !== 'all' ? [typeFilter] : undefined;

    try {
      const response = await apiClient.searchLegalSources(
        q,
        jurisdiction,
        filterArray,
        15,
        0
      );
      setSearchResponse(response);
    } catch (err: any) {
      setErrorMessage(err.message || 'Legal research search query failed. Ensure the backend server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load search
  useEffect(() => {
    executeSearch();
  }, []);

  // Open detail view
  const handleOpenDetail = async (sourceId: string) => {
    setSelectedSourceId(sourceId);
    setIsLoadingDetail(true);
    setCopiedCitation(false);
    try {
      const detail = await apiClient.getLegalSource(sourceId);
      setSourceDetail(detail);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load source details.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedSourceId(null);
    setSourceDetail(null);
  };

  const handleCopyCitation = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2000);
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
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-glow">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide flex items-center gap-2">
                <span>Legal Research</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                  Indian Jurisprudence
                </span>
              </h1>
              <p className="text-[11px] text-gray-400 hidden md:block">
                Query verified statutes, judicial precedents, and regulatory frameworks
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/tools/legal-advisor')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 border border-primary/30 text-xs text-primary-light transition-all font-mono"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Legal Advisor</span>
          </button>

          <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

          <AuthBadge />
        </div>
      </header>

      {/* Main Research Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Development RAG Notice Banner */}
        <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-xs text-cyan-200/90 flex items-start gap-3 backdrop-blur-sm">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <span className="font-semibold text-cyan-300 mr-1.5">
              RAG Retrieval Interface Active:
            </span>
            <span>
              Connected to the stable <code className="font-mono text-cyan-300">LegalRetriever</code> interface.
              Currently serving vetted Indian statutory sections and benchmark precedents via the Development Adapter while the custom RAG embedding model is in training.
            </span>
          </div>
        </div>

        {/* Search Bar & Controls */}
        <div className="p-5 rounded-2xl bg-[#08081a]/95 border border-white/10 shadow-elevated flex flex-col gap-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeSearch();
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search legal concepts, act titles, sections, or case names (e.g. 'consumer refund', 'Section 66D IT Act')..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/60 border border-white/15 focus:border-cyan-500 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none font-sans"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-black/60 border border-white/15 text-xs font-mono text-gray-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="India">India (Central & States)</option>
              </select>

              <button
                type="submit"
                disabled={!query.trim() || isLoading}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:pointer-events-none text-white font-medium text-xs shadow-glow transition-all whitespace-nowrap"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Search Sources</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
            <span className="text-[11px] font-mono text-gray-500 flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3" />
              <span>Source Type:</span>
            </span>

            {SOURCE_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setSelectedSourceType(opt.id);
                  executeSearch(query, opt.id);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                  selectedSourceType === opt.id
                    ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-semibold shadow-glow'
                    : 'bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-gray-200'
                }`}
              >
                {opt.icon && <opt.icon className="w-3 h-3" />}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Suggested Queries */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
            <span className="text-gray-500 font-mono">Suggested:</span>
            {SUGGESTED_RESEARCH_QUERIES.slice(0, 4).map((sq, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuery(sq);
                  executeSearch(sq, selectedSourceType);
                }}
                className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-colors"
              >
                {sq}
              </button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-start gap-3 backdrop-blur-sm">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-0.5">Search Error</p>
              <p className="text-gray-300">{errorMessage}</p>
            </div>
            <button
              onClick={() => executeSearch()}
              className="px-2.5 py-1 rounded-md bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-xs font-mono text-red-200"
            >
              Retry
            </button>
          </div>
        )}

        {/* Search Results Area */}
        <div className="flex-1 flex flex-col gap-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              <p className="text-xs font-mono">
                Querying legal indexes and ranking jurisprudence...
              </p>
            </div>
          ) : searchResponse && searchResponse.total_found > 0 ? (
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center justify-between text-xs font-mono text-gray-400 px-1">
                <span>
                  Found {searchResponse.total_found} verified legal {searchResponse.total_found === 1 ? 'source' : 'sources'} for "{searchResponse.query}"
                </span>
                <span className="text-[11px] text-cyan-400">
                  {searchResponse.retrieval_mode}
                </span>
              </div>

              {/* Source Result Cards */}
              {searchResponse.results.map((item: ResearchResultItem) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-[#070716]/90 border border-white/10 hover:border-cyan-500/40 transition-all duration-200 flex flex-col gap-3 shadow-elevated group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0">
                        {item.source_type === 'judgment' ? (
                          <Gavel className="w-3.5 h-3.5" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-gray-100 group-hover:text-cyan-300 transition-colors">
                          {item.title}
                        </h2>
                        <p className="text-xs font-mono text-cyan-400/90">
                          {item.citation} {item.year ? `· (${item.year})` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400">
                        {item.source_type}
                      </span>
                      {item.is_development_fixture ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400">
                          Dev Fixture
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                          Authenticated Source
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Excerpt Box */}
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 text-xs text-gray-300 leading-relaxed font-sans">
                    <span className="font-mono text-gray-500 text-[11px] block mb-1">
                      Statutory Excerpt / Holding:
                    </span>
                    {item.excerpt}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                    <div className="flex items-center gap-3 text-gray-400 font-mono text-[11px]">
                      {item.court_or_authority && (
                        <span>Authority: {item.court_or_authority}</span>
                      )}
                      <span>·</span>
                      <span>Confidence: {Math.round(item.confidence_score * 100)}%</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyCitation(item.citation)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-gray-300 hover:text-white flex items-center gap-1.5 transition-all"
                        title="Copy official citation"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy Citation</span>
                      </button>

                      <button
                        onClick={() => handleOpenDetail(item.id)}
                        className="px-3 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-[11px] font-mono text-cyan-300 flex items-center gap-1.5 transition-all"
                      >
                        <span>Full Source & Analysis</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : hasSearched ? (
            /* Explicit Empty State (Requirement 6) */
            <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl bg-[#08081a]/60 border border-white/10">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-gray-200 mb-1">
                No Legal Sources Found
              </h3>
              <p className="text-xs text-gray-400 max-w-md mb-6 leading-relaxed">
                No verified statutory provisions or judicial citations in our current index match "<span className="text-gray-200">{query}</span>" with the selected filters.
                Legal Helper does not synthesize or invent fictional case citations.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => {
                    setQuery('consumer protection refund');
                    setSelectedSourceType('all');
                    executeSearch('consumer protection refund', 'all');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-300"
                >
                  Try "Consumer Protection"
                </button>
                <button
                  onClick={() => {
                    setQuery('Information Technology Act 66D');
                    setSelectedSourceType('all');
                    executeSearch('Information Technology Act 66D', 'all');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-300"
                >
                  Try "IT Act Section 66D"
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      {/* Result Detail Modal */}
      {selectedSourceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl bg-[#08081a] border border-white/20 p-6 shadow-2xl flex flex-col gap-4 overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {sourceDetail?.title || 'Legal Source Detail'}
                  </h3>
                  <p className="text-xs font-mono text-cyan-400">
                    {sourceDetail?.citation}
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseDetail}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            {isLoadingDetail ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                <span className="text-xs font-mono">Loading verified record...</span>
              </div>
            ) : sourceDetail ? (
              <div className="flex flex-col gap-4 text-xs">
                {/* Meta Attributes Table */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-black/40 border border-white/5 font-mono text-[11px]">
                  <div>
                    <span className="text-gray-500 block">Jurisdiction</span>
                    <span className="text-gray-200">{sourceDetail.jurisdiction}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Authority / Body</span>
                    <span className="text-gray-200">
                      {sourceDetail.court_or_authority || 'Parliament / State Assembly'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Source Class</span>
                    <span className="text-cyan-400 uppercase">{sourceDetail.source_type}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Verification Status</span>
                    <span className={sourceDetail.is_development_fixture ? 'text-amber-400' : 'text-emerald-400'}>
                      {sourceDetail.is_development_fixture ? 'Development Fixture' : 'Authenticated'}
                    </span>
                  </div>
                </div>

                {/* Excerpt */}
                <div>
                  <h4 className="font-mono text-gray-400 uppercase tracking-wider text-[11px] mb-1">
                    Key Legal Excerpt
                  </h4>
                  <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-cyan-100/90 leading-relaxed">
                    {sourceDetail.content_excerpt}
                  </div>
                </div>

                {/* Full Text / Analysis */}
                {sourceDetail.full_text && (
                  <div>
                    <h4 className="font-mono text-gray-400 uppercase tracking-wider text-[11px] mb-1">
                      Statutory Analysis & Procedural Application
                    </h4>
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-gray-300 leading-relaxed space-y-2">
                      <p>{sourceDetail.full_text}</p>
                    </div>
                  </div>
                )}

                {/* Topic Tags */}
                {sourceDetail.tags && sourceDetail.tags.length > 0 && (
                  <div>
                    <span className="font-mono text-gray-500 text-[11px] block mb-1">
                      Indexed Topics & Keywords:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {sourceDetail.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] font-mono text-gray-300"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cautionary Disclaimer */}
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 text-[11px] text-gray-400 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                  <span>
                    Judicial citations and statutory interpretations evolve through recent appellate jurisprudence. Always cross-reference the latest amendments and official gazette notifications.
                  </span>
                </div>
              </div>
            ) : null}

            {/* Modal Footer */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <button
                onClick={() => sourceDetail && handleCopyCitation(sourceDetail.citation)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-mono transition-all"
              >
                {copiedCitation ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Official Citation</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                {sourceDetail?.url && (
                  <a
                    href={sourceDetail.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono transition-all"
                  >
                    <span>External Gazette / Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  onClick={handleCloseDetail}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-gray-200 font-mono transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
