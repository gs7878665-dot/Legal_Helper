import React from 'react';
import { Scale, ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';

interface AppPlaceholderProps {
  onBack: () => void;
}

export const AppPlaceholder: React.FC<AppPlaceholderProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen w-full bg-[#030308] text-white flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden">
      {/* Background radial glow */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[130px]"
      />

      <div className="relative z-10 max-w-lg mx-auto bg-[#0a0814] border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl">
        <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-glow">
          <Scale className="w-7 h-7" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono uppercase tracking-widest text-indigo-300 mb-4">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Main Application Route · /app</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-3">
          Legal Helper Workspace
        </h1>

        <p className="text-xs sm:text-sm text-gray-400 leading-relaxed mb-8">
          This is the dedicated placeholder route for the core Legal Helper intelligence platform. The primary legal consultation engine, document analysis workflows, and citizen assistance tools will be accessed here.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-medium border border-white/15 transition-all hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Cinematic Opening</span>
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-center gap-2 text-[11px] text-gray-500 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span>Placeholder Route Verified</span>
        </div>
      </div>
    </div>
  );
};
