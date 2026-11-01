import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderLock,
  UploadCloud,
  Search,
  Filter,
  ArrowUpDown,
  Grid,
  List,
  FileText,
  File,
  Eye,
  Download,
  Trash2,
  Edit3,
  Calendar,
  Tag,
  Building,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
  RefreshCw,
  FileCheck,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { AuthBadge } from '../auth/AuthBadge';
import type { DocumentItem, VaultSearchItem } from '../../api/types';

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Agreements & Contracts': { bg: 'bg-indigo-500/10', text: 'text-indigo-300', border: 'border-indigo-500/30' },
  'Notices & Replies': { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/30' },
  'Identity & Personal Documents': { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  'Property Documents': { bg: 'bg-cyan-500/10', text: 'text-cyan-300', border: 'border-cyan-500/30' },
  'Court & Case Documents': { bg: 'bg-rose-500/10', text: 'text-rose-300', border: 'border-rose-500/30' },
  'Financial & Tax Documents': { bg: 'bg-violet-500/10', text: 'text-violet-300', border: 'border-violet-500/30' },
  Other: { bg: 'bg-slate-500/10', text: 'text-slate-300', border: 'border-slate-500/30' },
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const LegalVaultPage: React.FC = () => {
  const navigate = useNavigate();

  // Documents state
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters and controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedFileType, setSelectedFileType] = useState<string>('All');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Search Results Mode (Full text / Content search)
  const [isSearchingContent, setIsSearchingContent] = useState(false);
  const [searchResults, setSearchResults] = useState<VaultSearchItem[] | null>(null);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Agreements & Contracts');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadDocumentDate, setUploadDocumentDate] = useState('');
  const [uploadRelatedEntity, setUploadRelatedEntity] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Detail / Preview Modal
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'metadata' | 'overview'>('preview');
  const [isGeneratingOverview, setIsGeneratingOverview] = useState(false);

  // Edit Metadata Modal
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editDocumentDate, setEditDocumentDate] = useState('');
  const [editRelatedEntity, setEditRelatedEntity] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete confirmation
  const [docToDelete, setDocToDelete] = useState<DocumentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch document list from API
  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.listVaultDocuments({
        category: selectedCategory,
        search: searchQuery,
        file_type: selectedFileType,
        tag: selectedTag,
        sort_by: sortBy,
        page,
        page_size: 12,
      });
      setDocuments(res.documents);
      setTotalCount(res.total_count);
      setTotalPages(res.total_pages);
      setCategories(res.categories);
      setAllTags(res.all_tags);
      setSearchResults(null);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to load documents from Legal Vault.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, searchQuery, selectedFileType, selectedTag, sortBy, page]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Execute deep content search
  const handleContentSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults(null);
      fetchDocuments();
      return;
    }

    setIsSearchingContent(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.searchVault(searchQuery.trim());
      setSearchResults(res.results);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Content search failed.');
    } finally {
      setIsSearchingContent(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setPage(1);
  };

  // Upload Document handler
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', uploadFile);
    if (uploadTitle.trim()) formData.append('title', uploadTitle.trim());
    if (uploadCategory) formData.append('category', uploadCategory);
    if (uploadDescription.trim()) formData.append('description', uploadDescription.trim());
    if (uploadTags.trim()) formData.append('tags', uploadTags.trim());
    if (uploadDocumentDate) formData.append('document_date', uploadDocumentDate);
    if (uploadRelatedEntity.trim()) formData.append('related_entity', uploadRelatedEntity.trim());

    try {
      await apiClient.uploadVaultDocument(formData);
      setShowUploadModal(false);
      // Reset form
      setUploadFile(null);
      setUploadTitle('');
      setUploadDescription('');
      setUploadTags('');
      setUploadDocumentDate('');
      setUploadRelatedEntity('');
      fetchDocuments();
    } catch (err: any) {
      setUploadError(err?.message || 'Upload failed. Please ensure file is a valid PDF, DOCX, or TXT under 10MB.');
    } finally {
      setIsUploading(false);
    }
  };

  // Open Preview / Detail View
  const handleOpenDoc = (doc: DocumentItem) => {
    setActiveDoc(doc);
    setActiveTab(doc.ai_overview ? 'overview' : 'preview');
    setShowDetailModal(true);
  };

  // Generate AI overview
  const handleGenerateOverview = async () => {
    if (!activeDoc) return;
    setIsGeneratingOverview(true);
    try {
      const updated = await apiClient.generateVaultOverview(activeDoc.id);
      setActiveDoc(updated);
      // Update in documents list
      setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    } catch (err: any) {
      alert(err?.message || 'Failed to generate overview. Ensure extracted text is available.');
    } finally {
      setIsGeneratingOverview(false);
    }
  };

  // Open Edit Metadata Modal
  const handleOpenEdit = (doc: DocumentItem) => {
    setEditingDoc(doc);
    setEditTitle(doc.title || doc.original_filename);
    setEditCategory(doc.category || 'Other');
    setEditDescription(doc.description || '');
    setEditTags(doc.tags ? doc.tags.join(', ') : '');
    setEditDocumentDate(doc.document_date || '');
    setEditRelatedEntity(doc.related_entity || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;
    setIsSavingEdit(true);
    try {
      const parsedTags = editTags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const updated = await apiClient.updateVaultDocument(editingDoc.id, {
        title: editTitle,
        category: editCategory,
        description: editDescription,
        tags: parsedTags,
        document_date: editDocumentDate,
        related_entity: editRelatedEntity,
      });

      setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      if (activeDoc?.id === updated.id) {
        setActiveDoc(updated);
      }
      setEditingDoc(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to update metadata.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Document
  const handleDeleteDoc = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.deleteVaultDocument(docToDelete.id);
      setDocuments((prev) => prev.filter((d) => d.id !== docToDelete.id));
      if (activeDoc?.id === docToDelete.id) {
        setShowDetailModal(false);
        setActiveDoc(null);
      }
      setDocToDelete(null);
      fetchDocuments();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete document.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getFileIcon = (filename: string) => {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.pdf')) return <FileText className="w-5 h-5 text-rose-400" />;
    if (lower.endsWith('.docx')) return <FileText className="w-5 h-5 text-indigo-400" />;
    return <File className="w-5 h-5 text-cyan-400" />;
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
              <FolderLock className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                Legal Vault
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800/40">
                  Private Repository
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                Securely store, organize, preview, and find your legal documents
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-semibold text-xs transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-slate-950" />
            <span>Upload Document</span>
          </button>
          <AuthBadge />
        </div>
      </header>

      {/* 2. Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Toolbar & Filters */}
        <div className="p-4 rounded-2xl bg-[#0b0f24]/80 border border-slate-800/80 backdrop-blur-sm flex flex-col gap-4 shadow-lg">
          {/* Top Row: Search and Search Button */}
          <form onSubmit={handleContentSearch} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, party, description, tags, or document text..."
                className="w-full pl-10 pr-9 py-2 rounded-xl bg-[#060919] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all font-mono"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="submit"
                disabled={isSearchingContent}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-cyan-300 text-xs font-semibold transition-all cursor-pointer"
              >
                {isSearchingContent ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Search</span>
              </button>

              {/* View Toggle */}
              <div className="flex items-center p-1 rounded-xl bg-[#060919] border border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'grid'
                      ? 'bg-indigo-600/40 text-cyan-300 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Grid View"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'list'
                      ? 'bg-indigo-600/40 text-cyan-300 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="List View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </form>

          {/* Bottom Row: Category, File Type, Sort Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60 text-xs">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full sm:max-w-2xl no-scrollbar">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All');
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === 'All'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sort & Format Selectors */}
            <div className="flex items-center gap-2">
              {/* File Type */}
              <div className="flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedFileType}
                  onChange={(e) => {
                    setSelectedFileType(e.target.value);
                    setPage(1);
                  }}
                  className="bg-[#060919] border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-400 font-mono"
                >
                  <option value="All">All Formats</option>
                  <option value="pdf">PDF (.pdf)</option>
                  <option value="docx">Word (.docx)</option>
                  <option value="txt">Text (.txt)</option>
                </select>
              </div>

              {/* Tag Filter */}
              {allTags.length > 0 && (
                <div className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedTag}
                    onChange={(e) => {
                      setSelectedTag(e.target.value);
                      setPage(1);
                    }}
                    className="bg-[#060919] border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-400 font-mono"
                  >
                    <option value="">All Tags</option>
                    {allTags.map((t) => (
                      <option key={t} value={t}>
                        #{t}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sort By */}
              <div className="flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-[#060919] border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-400 font-mono"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title">By Title (A-Z)</option>
                  <option value="document_date">By Document Date</option>
                  <option value="size">By File Size</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Search Results Banner */}
        {searchResults !== null && (
          <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>
                Found <strong className="text-white">{searchResults.length}</strong> matching document(s) for query &ldquo;<span className="text-cyan-300 font-mono">{searchQuery}</span>&rdquo;
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-xs text-cyan-400 hover:text-cyan-200 underline font-mono"
            >
              Reset to all documents
            </button>
          </div>
        )}

        {/* 3. Document Workspace States */}
        {isLoading ? (
          <div className="p-16 rounded-2xl bg-[#0b0f24]/60 border border-slate-800 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-t-cyan-400 border-r-indigo-500 border-b-transparent border-l-transparent animate-spin" />
            <p className="text-xs text-slate-400 font-mono">Loading your legal documents...</p>
          </div>
        ) : errorMessage ? (
          <div className="p-10 rounded-2xl bg-rose-950/20 border border-rose-500/40 flex flex-col items-center justify-center text-center gap-3">
            <AlertTriangle className="w-8 h-8 text-rose-400" />
            <p className="text-xs text-rose-300 max-w-md">{errorMessage}</p>
            <button
              type="button"
              onClick={fetchDocuments}
              className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-xs text-rose-200 hover:bg-rose-500/30"
            >
              Retry
            </button>
          </div>
        ) : searchResults !== null ? (
          // Content Search Results View
          searchResults.length === 0 ? (
            <div className="p-16 rounded-2xl bg-[#0b0f24]/60 border border-slate-800 flex flex-col items-center justify-center text-center gap-3">
              <Search className="w-8 h-8 text-slate-500" />
              <h3 className="text-sm font-semibold text-white">No matches found in your Vault</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                No documents matched &ldquo;{searchQuery}&rdquo; in titles, tags, or extracted document text.
              </p>
              <button
                type="button"
                onClick={handleClearSearch}
                className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-xs text-cyan-300"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults.map((item) => (
                <div
                  key={item.document.id}
                  onClick={() => handleOpenDoc(item.document)}
                  className="p-5 rounded-2xl bg-[#0b0f24]/90 hover:bg-[#0f1433] border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer flex flex-col gap-3 group shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                        {getFileIcon(item.document.original_filename)}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                          {item.document.title || item.document.original_filename}
                        </h4>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {item.document.original_filename} · {formatBytes(item.document.file_size_bytes)}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 shrink-0">
                      Matched in: {item.matched_in}
                    </span>
                  </div>

                  {item.matching_excerpt && (
                    <div className="p-2.5 rounded-lg bg-[#060919] border border-slate-800/80 text-xs text-slate-300 font-mono line-clamp-2">
                      &ldquo;{item.matching_excerpt}&rdquo;
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                    <span className="font-mono">Category: {item.document.category}</span>
                    <span className="text-cyan-400 font-medium group-hover:underline flex items-center gap-1">
                      Open Document <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : documents.length === 0 ? (
          // Empty State
          <div className="p-16 rounded-2xl bg-[#0b0f24]/60 border border-slate-800 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-cyan-400 mb-1">
              <FolderLock className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">Your Legal Vault is Empty</h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                Securely store your executed contracts, notices, court pleadings, deeds, and identification documents in one isolated, private repository.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-semibold text-xs transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-slate-950" />
              <span>Upload Your First Document</span>
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          // Grid View
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => {
              const catStyle = CATEGORY_COLORS[doc.category] || CATEGORY_COLORS.Other;
              return (
                <div
                  key={doc.id}
                  className="p-5 rounded-2xl bg-[#0b0f24]/90 hover:bg-[#0e1330] border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between gap-4 group shadow-md"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                        {getFileIcon(doc.original_filename)}
                      </div>
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-medium ${catStyle.bg} ${catStyle.text} border ${catStyle.border}`}>
                        {doc.category}
                      </span>
                    </div>

                    <div>
                      <h4
                        onClick={() => handleOpenDoc(doc)}
                        className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 cursor-pointer"
                        title={doc.title || doc.original_filename}
                      >
                        {doc.title || doc.original_filename}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5 line-clamp-1">
                        {doc.original_filename}
                      </p>
                    </div>

                    {doc.description && (
                      <p className="text-xs text-slate-300/80 line-clamp-2">
                        {doc.description}
                      </p>
                    )}

                    {/* Metadata tags */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {doc.document_date && (
                        <span className="flex items-center gap-1 text-[10px] font-mono bg-slate-900/80 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                          <Calendar className="w-2.5 h-2.5" /> {doc.document_date}
                        </span>
                      )}
                      {doc.related_entity && (
                        <span className="flex items-center gap-1 text-[10px] font-mono bg-slate-900/80 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                          <Building className="w-2.5 h-2.5" /> {doc.related_entity}
                        </span>
                      )}
                      {(doc.tags || []).slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1 text-[10px] font-mono bg-indigo-950/40 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800/30"
                        >
                          <Tag className="w-2.5 h-2.5" /> {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions & File details */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-mono text-slate-500">
                      {formatBytes(doc.file_size_bytes)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenDoc(doc)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
                        title="Preview & Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(doc)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-300 transition-colors"
                        title="Edit Metadata"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={apiClient.getVaultDownloadUrl(doc.id)}
                        download
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-emerald-300 transition-colors"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => setDocToDelete(doc)}
                        className="p-1.5 rounded-lg hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // List View
          <div className="rounded-2xl bg-[#0b0f24]/90 border border-slate-800/80 overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#070a1a] text-slate-400 border-b border-slate-800 font-mono">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Document</th>
                    <th className="py-3 px-4 font-semibold">Category</th>
                    <th className="py-3 px-4 font-semibold">Date</th>
                    <th className="py-3 px-4 font-semibold">Size</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {documents.map((doc) => {
                    const catStyle = CATEGORY_COLORS[doc.category] || CATEGORY_COLORS.Other;
                    return (
                      <tr key={doc.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                              {getFileIcon(doc.original_filename)}
                            </div>
                            <div>
                              <div
                                onClick={() => handleOpenDoc(doc)}
                                className="font-semibold text-white hover:text-cyan-300 cursor-pointer line-clamp-1"
                              >
                                {doc.title || doc.original_filename}
                              </div>
                              <span className="text-[11px] text-slate-500 font-mono">
                                {doc.original_filename}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${catStyle.bg} ${catStyle.text} border ${catStyle.border}`}>
                            {doc.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                          {doc.document_date || new Date(doc.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                          {formatBytes(doc.file_size_bytes)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-300 border border-slate-800">
                            {doc.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenDoc(doc)}
                              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-300"
                              title="Preview & Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(doc)}
                              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-300"
                              title="Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={apiClient.getVaultDownloadUrl(doc.id)}
                              download
                              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-emerald-300"
                              title="Download"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => setDocToDelete(doc)}
                              className="p-1.5 rounded-lg hover:bg-rose-950/40 text-slate-400 hover:text-rose-400"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. Pagination */}
        {totalPages > 1 && searchResults === null && (
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-2">
            <span>
              Showing {documents.length} of {totalCount} documents
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-[#0b0f24] border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 rounded-lg bg-[#0b0f24] border border-slate-800 text-slate-200">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg bg-[#0b0f24] border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* UPLOAD DOCUMENT MODAL */}
      {/* ========================================================================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-[#0b0f24] border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-cyan-400">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Deposit to Legal Vault</h3>
                  <p className="text-[11px] text-slate-400">Secure private document storage</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300">
                  {uploadError}
                </div>
              )}

              {/* File Dropzone */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
                  Select Legal Document *
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                      if (!uploadTitle) {
                        setUploadTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ''));
                      }
                    }
                  }}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-6 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    uploadFile
                      ? 'border-cyan-400 bg-cyan-950/20'
                      : 'border-slate-800 hover:border-indigo-500/50 bg-[#060919]'
                  }`}
                >
                  <UploadCloud className="w-7 h-7 text-cyan-400 mb-2" />
                  {uploadFile ? (
                    <div>
                      <span className="text-xs font-semibold text-cyan-300 block">{uploadFile.name}</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatBytes(uploadFile.size)} · Click to change file
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-xs font-semibold text-white block mb-0.5">
                        Choose PDF, DOCX, or TXT file
                      </span>
                      <span className="text-[11px] text-slate-400">Maximum file size 10 MB</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Document Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                  Document Title
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Indiranagar Apartment Lease Deed"
                  className="w-full px-3 py-2 rounded-xl bg-[#060919] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Category & Date Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                    Category
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#060919] border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Agreements & Contracts">Agreements & Contracts</option>
                    <option value="Notices & Replies">Notices & Replies</option>
                    <option value="Identity & Personal Documents">Identity & Personal Documents</option>
                    <option value="Property Documents">Property Documents</option>
                    <option value="Court & Case Documents">Court & Case Documents</option>
                    <option value="Financial & Tax Documents">Financial & Tax Documents</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                    Document Date (optional)
                  </label>
                  <input
                    type="date"
                    value={uploadDocumentDate}
                    onChange={(e) => setUploadDocumentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#060919] border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>

              {/* Related Entity */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                  Related Person / Counterparty / Case
                </label>
                <input
                  type="text"
                  value={uploadRelatedEntity}
                  onChange={(e) => setUploadRelatedEntity(e.target.value)}
                  placeholder="e.g. Landlord Ramesh / HDFC Bank / Case #382/2026"
                  className="w-full px-3 py-2 rounded-xl bg-[#060919] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  placeholder="e.g. lease, apartment, signed, 2026"
                  className="w-full px-3 py-2 rounded-xl bg-[#060919] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                  Notes / Description
                </label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Additional context about this document..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-[#060919] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Encrypting & Depositing...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Deposit Document</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOCUMENT PREVIEW & DETAIL MODAL */}
      {/* ========================================================================= */}
      {showDetailModal && activeDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-4xl h-[90vh] rounded-2xl bg-[#0b0f24] border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                  {getFileIcon(activeDoc.original_filename)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white line-clamp-1">
                    {activeDoc.title || activeDoc.original_filename}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                    <span>{activeDoc.original_filename}</span>
                    <span>·</span>
                    <span>{formatBytes(activeDoc.file_size_bytes)}</span>
                    <span>·</span>
                    <span className="text-cyan-400">{activeDoc.category}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={apiClient.getVaultDownloadUrl(activeDoc.id)}
                  download
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="px-5 border-b border-slate-800/80 bg-[#070919] flex items-center gap-4 text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`py-2.5 border-b-2 font-medium transition-colors ${
                  activeTab === 'preview'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                File Preview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('metadata')}
                className={`py-2.5 border-b-2 font-medium transition-colors ${
                  activeTab === 'metadata'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Metadata & Properties
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`py-2.5 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'overview'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>AI Overview</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === 'preview' && (
                <div className="h-full flex flex-col gap-4">
                  {activeDoc.original_filename.toLowerCase().endsWith('.pdf') ? (
                    <div className="w-full h-full min-h-[450px] rounded-xl border border-slate-800 bg-[#060919] overflow-hidden">
                      <iframe
                        src={apiClient.getVaultPreviewUrl(activeDoc.id)}
                        title="PDF Document Preview"
                        className="w-full h-full min-h-[450px]"
                      />
                    </div>
                  ) : activeDoc.extracted_text ? (
                    <div className="p-4 rounded-xl bg-[#060919] border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
                      {activeDoc.extracted_text}
                    </div>
                  ) : (
                    <div className="p-10 rounded-xl bg-[#060919] border border-slate-800 flex flex-col items-center justify-center text-center gap-3">
                      <FileText className="w-8 h-8 text-slate-500" />
                      <p className="text-xs text-slate-400 max-w-sm">
                        Direct inline browser preview is not available for this binary format without an active extraction layer.
                      </p>
                      <a
                        href={apiClient.getVaultDownloadUrl(activeDoc.id)}
                        download
                        className="px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-mono"
                      >
                        Download Document to View
                      </a>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'metadata' && (
                <div className="flex flex-col gap-5 max-w-2xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-xl bg-[#060919] border border-slate-800">
                      <span className="text-[11px] text-slate-400 font-mono block mb-1">Category</span>
                      <span className="font-semibold text-white">{activeDoc.category}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#060919] border border-slate-800">
                      <span className="text-[11px] text-slate-400 font-mono block mb-1">Document Date</span>
                      <span className="font-semibold text-white">
                        {activeDoc.document_date || 'Not specified'}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#060919] border border-slate-800">
                      <span className="text-[11px] text-slate-400 font-mono block mb-1">Related Entity / Case</span>
                      <span className="font-semibold text-white">
                        {activeDoc.related_entity || 'Not specified'}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#060919] border border-slate-800">
                      <span className="text-[11px] text-slate-400 font-mono block mb-1">Extraction Status</span>
                      <span className="font-semibold text-cyan-400 font-mono">{activeDoc.status}</span>
                    </div>
                  </div>

                  {activeDoc.description && (
                    <div className="p-4 rounded-xl bg-[#060919] border border-slate-800 text-xs">
                      <span className="text-[11px] text-slate-400 font-mono block mb-1.5">Description & Notes</span>
                      <p className="text-slate-300 leading-relaxed">{activeDoc.description}</p>
                    </div>
                  )}

                  {activeDoc.tags && activeDoc.tags.length > 0 && (
                    <div className="p-4 rounded-xl bg-[#060919] border border-slate-800 text-xs">
                      <span className="text-[11px] text-slate-400 font-mono block mb-2">Tags</span>
                      <div className="flex flex-wrap gap-1.5">
                        {activeDoc.tags.map((t) => (
                          <span
                            key={t}
                            className="px-2.5 py-1 rounded-md bg-indigo-950/40 text-indigo-300 border border-indigo-800/30 text-[11px] font-mono"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-4 rounded-xl bg-[#060919] border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Need to modify title, category, or tags?</span>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(activeDoc)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-cyan-300 font-mono hover:bg-indigo-600/50"
                    >
                      Edit Metadata
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'overview' && (
                <div className="flex flex-col gap-5">
                  {activeDoc.ai_overview ? (
                    <div className="flex flex-col gap-4">
                      <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-semibold text-cyan-300 font-mono uppercase tracking-wider mb-1">
                            Document Summary
                          </h4>
                          <p className="text-xs text-slate-200 leading-relaxed">
                            {activeDoc.ai_overview.summary}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {/* Dates */}
                        <div className="p-4 rounded-xl bg-[#060919] border border-slate-800">
                          <span className="text-[11px] font-semibold text-amber-300 font-mono block mb-2 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" /> Important Dates
                          </span>
                          <ul className="space-y-1 text-slate-300">
                            {(activeDoc.ai_overview.important_dates || []).map((d, i) => (
                              <li key={i} className="font-mono text-[11px] list-disc list-inside">
                                {d}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Amounts */}
                        <div className="p-4 rounded-xl bg-[#060919] border border-slate-800">
                          <span className="text-[11px] font-semibold text-emerald-300 font-mono block mb-2 flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5" /> Key Monetary Amounts
                          </span>
                          <ul className="space-y-1 text-slate-300">
                            {(activeDoc.ai_overview.key_amounts || []).map((a, i) => (
                              <li key={i} className="font-mono text-[11px] list-disc list-inside">
                                {a}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Parties */}
                        <div className="p-4 rounded-xl bg-[#060919] border border-slate-800">
                          <span className="text-[11px] font-semibold text-indigo-300 font-mono block mb-2 flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5" /> Identified Parties
                          </span>
                          <ul className="space-y-1 text-slate-300">
                            {(activeDoc.ai_overview.identified_parties || []).map((p, i) => (
                              <li key={i} className="font-mono text-[11px] list-disc list-inside">
                                {p}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Key Sections */}
                        <div className="p-4 rounded-xl bg-[#060919] border border-slate-800">
                          <span className="text-[11px] font-semibold text-cyan-300 font-mono block mb-2 flex items-center gap-1.5">
                            <FileCheck className="w-3.5 h-3.5" /> Key Sections / Clauses
                          </span>
                          <ul className="space-y-1 text-slate-300">
                            {(activeDoc.ai_overview.key_sections || []).map((s, i) => (
                              <li key={i} className="font-mono text-[11px] list-disc list-inside">
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <p className="text-[11px] font-mono text-slate-500 italic">
                        {activeDoc.ai_overview.disclaimer || 'AI overview generated from document text for informational review only.'}
                      </p>
                    </div>
                  ) : (
                    <div className="p-10 rounded-xl bg-[#060919] border border-slate-800 flex flex-col items-center justify-center text-center gap-3">
                      <Sparkles className="w-8 h-8 text-cyan-400" />
                      <h4 className="text-sm font-semibold text-white">Generate Plain-Language Overview</h4>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Extract key dates, named counterparties, monetary amounts, and major clauses without modifying the original document.
                      </p>
                      <button
                        type="button"
                        onClick={handleGenerateOverview}
                        disabled={isGeneratingOverview || !activeDoc.extracted_text}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 font-bold text-xs disabled:opacity-50 cursor-pointer shadow-md"
                      >
                        {isGeneratingOverview ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Analyzing Document...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                            <span>Generate Document Overview</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT METADATA MODAL */}
      {/* ========================================================================= */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[#0b0f24] border border-slate-800 shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-400" />
                Edit Document Metadata
              </h3>
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 font-mono">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#060919] border border-slate-800 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 font-mono">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#060919] border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Agreements & Contracts">Agreements & Contracts</option>
                    <option value="Notices & Replies">Notices & Replies</option>
                    <option value="Identity & Personal Documents">Identity & Personal Documents</option>
                    <option value="Property Documents">Property Documents</option>
                    <option value="Court & Case Documents">Court & Case Documents</option>
                    <option value="Financial & Tax Documents">Financial & Tax Documents</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 font-mono">Document Date</label>
                  <input
                    type="date"
                    value={editDocumentDate}
                    onChange={(e) => setEditDocumentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#060919] border border-slate-800 text-slate-200 font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 font-mono">Related Entity / Case</label>
                <input
                  type="text"
                  value={editRelatedEntity}
                  onChange={(e) => setEditRelatedEntity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#060919] border border-slate-800 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 font-mono">Tags (comma separated)</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#060919] border border-slate-800 text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 font-mono">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-[#060919] border border-slate-800 text-white resize-none focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION DIALOG */}
      {/* ========================================================================= */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#0b0f24] border border-rose-500/40 shadow-2xl p-6 flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Delete Document?</h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to delete &ldquo;{docToDelete.title || docToDelete.original_filename}&rdquo;? The file will be permanently removed from your private vault.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-medium"
              >
                Keep Document
              </button>
              <button
                type="button"
                onClick={handleDeleteDoc}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
