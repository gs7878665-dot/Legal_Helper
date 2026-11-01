import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, LogIn, ChevronDown, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthBadgeProps {
  className?: string;
}

export const AuthBadge: React.FC<AuthBadgeProps> = ({ className = '' }) => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [dropdownOpen]);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 ${className}`}>
        <div className="w-3.5 h-3.5 rounded-full border border-indigo-400 border-t-transparent animate-spin" />
        <span className="text-[11px] font-mono text-slate-400">Loading...</span>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/40 border border-indigo-500/30 hover:border-indigo-500/50 text-xs text-slate-200 transition-all shadow-sm group cursor-pointer"
          title="Account profile & options"
        >
          <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px] border border-cyan-400/30">
            {user.display_name.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-slate-200 max-w-[120px] truncate">
            {user.display_name}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#0b0f24] border border-slate-800 shadow-2xl shadow-black/80 py-2 z-50 animate-in fade-in slide-in-from-top-1 text-xs">
            <div className="px-4 py-2 border-b border-slate-800/80">
              <div className="flex items-center gap-1.5 text-cyan-400 font-semibold mb-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Account</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate">{user.email}</p>
            </div>

            <div className="p-1.5">
              <button
                type="button"
                onClick={async () => {
                  setDropdownOpen(false);
                  await logout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-300 hover:text-rose-200 hover:bg-rose-950/40 transition-colors cursor-pointer text-left font-medium"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Link
        to="/login"
        state={{ from: location }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/30 hover:border-cyan-400/50 text-xs font-medium text-slate-200 hover:text-cyan-300 transition-all shadow-sm"
      >
        <LogIn className="w-3.5 h-3.5 text-cyan-400" />
        <span>Sign In</span>
      </Link>
    </div>
  );
};
