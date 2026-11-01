import React from 'react';
import { LegalDimensionScene } from '../LegalDimensionScene';

export const TreeKnowledgePage: React.FC = () => {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#030308] text-white select-none">
      <LegalDimensionScene skipIntro={true} />
    </div>
  );
};

