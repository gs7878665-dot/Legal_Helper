export type Theme = 'midnight' | 'violet' | 'cloud';
export type Language = 'en' | 'hi';

export interface TranslationDictionary {
  brand: {
    name: string;
    tagline: string;
    poweredBy: string;
  };
  nav: {
    product: string;
    features: string;
    howItWorks: string;
    trustSafety: string;
    tryCta: string;
    themeTooltip: string;
    themeNames: Record<Theme, string>;
    langToggle: string;
    menuOpen: string;
    menuClose: string;
  };
  hero: {
    badge: string;
    headlinePart1: string;
    headlinePart2: string;
    subheadline: string;
    primaryCta: string;
    secondaryCta: string;
    disclaimer: string;
  };
  preview: {
    title: string;
    badge: string;
    jurisdiction: string;
    questionTag: string;
    question: string;
    analysisTag: string;
    analysisHeading: string;
    analysisBody: string;
    keyTakeawayLabel: string;
    keyTakeaway: string;
    nextStepsHeading: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    sourcesHeading: string;
    source1Title: string;
    source1Detail: string;
    source2Title: string;
    source2Detail: string;
    demoNote: string;
    readAloud: string;
    playing: string;
    paused: string;
    copyBtn: string;
    copied: string;
    feedbackLabel: string;
  };
}
