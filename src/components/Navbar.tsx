import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  Scale, 
  Moon, 
  Sparkles, 
  Sun, 
  Globe, 
  Menu, 
  X, 
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { AuthBadge } from './auth/AuthBadge';

interface NavbarProps {
  onTryClick?: () => void;
  onExploreFeatures?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onTryClick, onExploreFeatures }) => {
  const { theme, cycleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileMenuOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const showDemoToast = (featureName: string) => {
    setToastMessage(`${featureName} · Section coming in next phase. Exploring interactive hero preview!`);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'midnight':
        return <Moon className="w-4 h-4 text-indigo-400" />;
      case 'violet':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'cloud':
        return <Sun className="w-4 h-4 text-amber-500" />;
    }
  };

  const navLinks = [
    { 
      label: t.nav.product, 
      action: () => {
        if (onTryClick) {
          onTryClick();
        } else {
          showDemoToast(t.nav.product);
        }
      } 
    },
    { 
      label: t.nav.features, 
      action: () => {
        if (onExploreFeatures) {
          onExploreFeatures();
        } else {
          showDemoToast(t.nav.features);
        }
      } 
    },
    { 
      label: t.nav.howItWorks, 
      action: () => showDemoToast(t.nav.howItWorks) 
    },
    { 
      label: t.nav.trustSafety, 
      action: () => showDemoToast(t.nav.trustSafety) 
    },
  ];

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? 'bg-background/85 backdrop-blur-md border-b border-border shadow-subtle py-3'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between" aria-label="Main Navigation">
            {/* Logo and Brand */}
            <a 
              href="#" 
              className="group flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1 transition-transform active:scale-[0.98]"
              aria-label="Legal Helper Home"
            >
              <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-card border border-border shadow-subtle group-hover:border-primary/50 transition-colors">
                <Scale className="w-4 h-4 text-primary transition-transform group-hover:scale-110 duration-200" />
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
              </div>
              
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold tracking-tight text-foreground font-sans">
                    Legal Helper
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-medium tracking-wide rounded bg-badge-bg text-badge-text border border-badge-border">
                    IN · AI
                  </span>
                </div>
                <span className="text-[11px] text-muted hidden sm:inline-block leading-tight">
                  {t.brand.tagline}
                </span>
              </div>
            </a>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1 lg:gap-2">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={link.action}
                  className="px-3.5 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors rounded-lg hover:bg-card-subtle/70 active:scale-[0.98]"
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* Desktop Controls & CTA */}
            <div className="hidden md:flex items-center gap-2.5">
              {/* Language Switcher */}
              <button
                type="button"
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground bg-card border border-border hover:border-border-strong rounded-lg transition-all active:scale-[0.98]"
                aria-label={`Switch language to ${language === 'en' ? 'Hindi' : 'English'}`}
                title={language === 'en' ? 'हिंदी में अनुवाद करें' : 'Switch to English'}
              >
                <Globe className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium">
                  {language === 'en' ? 'हि / EN' : 'EN / हि'}
                </span>
              </button>

              {/* Theme Switcher */}
              <button
                type="button"
                onClick={cycleTheme}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground bg-card border border-border hover:border-border-strong rounded-lg transition-all active:scale-[0.98]"
                aria-label={t.nav.themeTooltip}
                title={`${t.nav.themeTooltip}: ${t.nav.themeNames[theme]}`}
              >
                {getThemeIcon()}
                <span className="capitalize">{t.nav.themeNames[theme]}</span>
              </button>

              {/* Primary CTA */}
              <button
                type="button"
                onClick={onTryClick}
                className="group relative inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-wide text-white rounded-lg bg-primary hover:bg-primary-hover shadow-subtle hover:shadow-glow transition-all duration-200 active:scale-[0.98] border border-primary/30 overflow-hidden"
              >
                <span>{t.nav.tryCta}</span>
                <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>

              <div className="h-4 w-px bg-border mx-1" />

              <AuthBadge />
            </div>

            {/* Mobile Menu & Quick Controls */}
            <div className="flex md:hidden items-center gap-1.5">
              {/* Compact Language Toggle */}
              <button
                type="button"
                onClick={toggleLanguage}
                className="p-2 text-xs font-medium text-muted hover:text-foreground bg-card border border-border rounded-lg"
                aria-label="Toggle language"
              >
                <span className="text-xs font-bold text-primary">
                  {language === 'en' ? 'हि' : 'EN'}
                </span>
              </button>

              {/* Compact Theme Cycle */}
              <button
                type="button"
                onClick={cycleTheme}
                className="p-2 text-muted hover:text-foreground bg-card border border-border rounded-lg"
                aria-label="Toggle theme"
              >
                {getThemeIcon()}
              </button>

              {/* Mobile Menu Hamburger */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-muted hover:text-foreground bg-card border border-border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                aria-expanded={mobileMenuOpen}
                aria-label={mobileMenuOpen ? t.nav.menuClose : t.nav.menuOpen}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 text-foreground" />
                ) : (
                  <Menu className="w-5 h-5 text-foreground" />
                )}
              </button>
            </div>
          </nav>
        </div>

        {/* Mobile Fullscreen / Slide-down Menu Drawer */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-x-0 top-[65px] bottom-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border flex flex-col justify-between p-6 overflow-y-auto animate-fade-in md:hidden"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex flex-col space-y-3 pt-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-1">
                Navigation
              </div>
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    link.action();
                  }}
                  className="w-full text-left px-4 py-3 text-base font-medium text-foreground hover:bg-card rounded-xl border border-transparent hover:border-border transition-colors flex items-center justify-between"
                >
                  <span>{link.label}</span>
                  <ArrowUpRight className="w-4 h-4 text-muted" />
                </button>
              ))}

              <div className="pt-4 border-t border-border space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3">
                  Preferences
                </div>

                {/* Theme Selector for Mobile */}
                <div className="grid grid-cols-3 gap-2 px-1">
                  {(['midnight', 'violet', 'cloud'] as const).map((thm) => (
                    <button
                      key={thm}
                      onClick={() => cycleTheme()}
                      className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                        theme === thm
                          ? 'border-primary bg-primary/10 text-foreground font-semibold'
                          : 'border-border bg-card text-muted hover:text-foreground'
                      }`}
                    >
                      {thm === 'midnight' && <Moon className="w-4 h-4" />}
                      {thm === 'violet' && <Sparkles className="w-4 h-4" />}
                      {thm === 'cloud' && <Sun className="w-4 h-4" />}
                      <span className="capitalize">{t.nav.themeNames[thm]}</span>
                    </button>
                  ))}
                </div>

                {/* Language Toggle for Mobile */}
                <button
                  onClick={toggleLanguage}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium bg-card border border-border rounded-xl text-foreground"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    <span>{language === 'en' ? 'भाषा: हिंदी में बदलें' : 'Language: Switch to English'}</span>
                  </div>
                  <span className="text-xs font-semibold text-primary px-2 py-0.5 rounded bg-primary/10">
                    {language.toUpperCase()}
                  </span>
                </button>
              </div>
            </div>

            {/* Mobile Primary CTA */}
            <div className="pt-6 pb-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onTryClick) onTryClick();
                }}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-5 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-elevated border border-primary/30"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{t.nav.tryCta}</span>
              </button>
              <p className="text-[11px] text-center text-muted mt-3">
                {t.hero.disclaimer}
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Floating toast notification for demo feedback */}
      {toastMessage && (
        <div 
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 max-w-md bg-card border border-primary/40 shadow-elevated rounded-xl p-4 flex items-start gap-3 animate-fade-in-up"
        >
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-foreground font-medium leading-relaxed">
            {toastMessage}
          </div>
        </div>
      )}
    </>
  );
};
