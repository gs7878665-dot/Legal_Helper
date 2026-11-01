import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import type { ToolItem } from '../../api/types';
import {
  ArrowLeft,
  Sparkles,
  Search,
  FileText,
  PenTool,
  Mail,
  FolderLock,
  ShieldAlert,
  Clock,
  Briefcase,
  HeartHandshake,
  Calculator,
  Hash,
  Scale,
  Cpu,
  Layers,
  CheckCircle2,
  Construction,
  Database,
  ExternalLink,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  sparkles: Sparkles,
  search: Search,
  'file-text': FileText,
  'pen-tool': PenTool,
  mail: Mail,
  'folder-lock': FolderLock,
  'shield-alert': ShieldAlert,
  clock: Clock,
  briefcase: Briefcase,
  'heart-handshake': HeartHandshake,
  calculator: Calculator,
  hash: Hash,
  scale: Scale,
};

export const ToolPlaceholderPage: React.FC = () => {
  const { toolSlug } = useParams<{ toolSlug: string }>();
  const navigate = useNavigate();

  const [tool, setTool] = useState<ToolItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTool() {
      if (!toolSlug) return;
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getToolBySlug(toolSlug);
        if (isMounted) {
          setTool(data);
        }
      } catch (err: any) {
        if (isMounted) {
          // If network / 404, we still render a graceful view
          setError(err?.message || 'Tool details could not be retrieved from the server.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadTool();
    return () => {
      isMounted = false;
    };
  }, [toolSlug]);

  const displayName =
    tool?.name ||
    toolSlug
      ?.split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') ||
    'Legal Tool';

  const IconComponent = tool?.icon ? ICON_MAP[tool.icon] || Scale : Scale;

  return (
    <div className="relative min-h-screen w-full bg-[#030308] text-white flex flex-col justify-between overflow-x-hidden selection:bg-primary/30 selection:text-white">
      {/* Background Ambience & Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(129,140,248,0.15),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-20 w-full flex items-center justify-between px-6 py-5 sm:px-10 border-b border-white/5 backdrop-blur-md bg-black/30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="group flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs font-medium text-gray-300 hover:text-white transition-all shadow-subtle active:scale-95"
            aria-label="Back to Tree of Knowledge"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Tree of Knowledge</span>
          </button>

          <span className="text-gray-600 hidden sm:inline">/</span>

          <span className="text-xs font-mono text-gray-400 hidden sm:inline">
            /tools/{toolSlug}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400">
          <Database className="w-3 h-3 text-emerald-400" />
          <span className="hidden sm:inline">PostgreSQL Sync</span>
          <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-indigo-300">
            Phase 1
          </span>
        </div>
      </header>

      {/* Main Content Showcase */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6 sm:p-10 my-auto">
        <div className="w-full max-w-2xl bg-card/80 border border-border shadow-elevated rounded-3xl p-8 sm:p-12 backdrop-blur-xl relative overflow-hidden animate-fade-in text-center sm:text-left">
          
          {/* Subtle Top Accent Beam */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/70 to-transparent" />

          {/* Badge & Icon Row */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-glow shrink-0">
                <IconComponent className="w-8 h-8" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-indigo-300 mb-2">
                  <Cpu className="w-3 h-3 text-primary" />
                  <span>Legal Intelligence Tool</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-light tracking-wide text-white uppercase font-sans">
                  {displayName}
                </h1>
              </div>
            </div>

            {/* Status Pill */}
            <div className="flex flex-col items-end gap-1.5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium font-mono">
                <Construction className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>{loading ? 'Fetching Metadata...' : 'Workflow Coming Next'}</span>
              </div>
              {error && (
                <span className="text-[10px] text-amber-400/80 font-mono">
                  Offline snapshot view
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mb-8">
            <p className="text-sm sm:text-base text-gray-300 font-light leading-relaxed">
              {tool?.description ||
                'This specialized legal capability is part of the Legal Helper Tree of Knowledge vertical slice. Full execution logic, AI synthesis, and document pipelines will be activated in the next vertical slice.'}
            </p>
          </div>

          {/* Feature Highlights Grid Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10 text-left">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs font-medium text-white mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                <span>Statutory Clarity</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-normal">
                Mapped against relevant Indian legal provisions and precedent.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs font-medium text-white mb-1">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>Contextual Steps</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-normal">
                Structured procedural guidance tailored to your legal situation.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs font-medium text-white mb-1">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Plain Language</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-normal">
                Jargon-free explanations designed for ordinary citizens.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-end pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-gray-300 hover:text-white transition-colors"
            >
              Return to Landing
            </button>
            <button
              type="button"
              onClick={() => navigate('/explore')}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-glow transition-all flex items-center justify-center gap-2 group"
            >
              <span>Explore Other Tools on Tree</span>
              <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 px-6 text-center text-xs text-gray-500 border-t border-white/5 font-mono">
        Legal Helper · Tree of Knowledge Vertical Slice · Ready for Module Implementation
      </footer>
    </div>
  );
};
