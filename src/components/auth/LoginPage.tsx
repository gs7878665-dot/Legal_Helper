import React, { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Scale, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({});

  const redirectTarget = (location.state as any)?.from?.pathname || '/explore';

  // If already authenticated and done loading, redirect immediately
  if (isAuthenticated && !authLoading) {
    return <Navigate to={redirectTarget} replace />;
  }

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login({
        email: email.trim().toLowerCase(),
        password,
      });
      navigate(redirectTarget, { replace: true });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication failed. Please verify your email and password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden select-none">
      {/* Background ambient glowing orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-900/25 via-violet-900/20 to-cyan-800/20 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute -bottom-20 right-1/4 w-[400px] h-[280px] bg-indigo-950/30 blur-[110px] pointer-events-none rounded-full" />

      {/* Top Bar Navigation */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-6 px-4 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 text-xs tracking-wider uppercase font-semibold text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(99,102,241,0.25)]">
            <Scale className="w-4 h-4" />
          </div>
          <span>Legal Helper</span>
        </Link>
        <Link
          to="/explore"
          className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
        >
          Explore Tree →
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Main Card */}
        <div className="bg-[#0b0f23]/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-7 sm:p-9 shadow-2xl shadow-black/60 relative">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Secure Authentication</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Welcome back
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Sign in to access your confidential advisory consultations and legal research sessions.
            </p>
          </div>

          {/* Backend Error Alert */}
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/40 flex items-start gap-3 text-rose-300 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email Field */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (validationErrors.email) setValidationErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  autoFocus
                  placeholder="advocate@example.com"
                  className={`block w-full pl-10 pr-3.5 py-2.5 bg-[#0e132c]/80 border ${
                    validationErrors.email ? 'border-rose-500/70 focus:border-rose-500' : 'border-slate-800 focus:border-cyan-400'
                  } rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400/50 transition-colors`}
                />
              </div>
              {validationErrors.email && (
                <p className="mt-1.5 text-xs text-rose-400 font-medium">{validationErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (validationErrors.password) setValidationErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="••••••••"
                  className={`block w-full pl-10 pr-10 py-2.5 bg-[#0e132c]/80 border ${
                    validationErrors.password ? 'border-rose-500/70 focus:border-rose-500' : 'border-slate-800 focus:border-cyan-400'
                  } rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400/50 transition-colors`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {validationErrors.password && (
                <p className="mt-1.5 text-xs text-rose-400 font-medium">{validationErrors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="mt-7 pt-6 border-t border-slate-800/70 text-center">
            <p className="text-xs text-slate-400">
              Don't have an account?{' '}
              <Link
                to="/register"
                state={{ from: location.state?.from }}
                className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Create one now
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
