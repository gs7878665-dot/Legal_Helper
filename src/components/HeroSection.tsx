import React from 'react';
import { LegalDimensionScene } from './LegalDimensionScene';

interface HeroSectionProps {
  onEnterClick?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onEnterClick }) => {
  const handleEnter = () => {
    if (onEnterClick) {
      onEnterClick();
    } else {
      window.location.hash = '#app';
    }
  };

  return (
    <section className="relative w-full h-screen overflow-hidden bg-black">
      <LegalDimensionScene onEnterApp={handleEnter} />
    </section>
  );
};
