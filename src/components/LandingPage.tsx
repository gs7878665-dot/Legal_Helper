import React from 'react';
import { HeroSection } from './HeroSection';

interface LandingPageProps {
  onEnterApp?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#030308] text-white selection:bg-primary/30 selection:text-white">
      {/* Full-screen cinematic hero hosting LegalDimensionScene */}
      <main className="w-full h-full">
        <HeroSection onEnterClick={onEnterApp} />
      </main>
    </div>
  );
};
