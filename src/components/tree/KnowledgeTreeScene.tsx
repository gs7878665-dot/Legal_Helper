import React, { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { CategoryItem, ToolItem } from '../../api/types';
import { OrganicTrunk } from './OrganicTrunk';
import { OrganicBranch } from './OrganicBranch';
import { TreeAmbientParticles } from './TreeAmbientParticles';

interface KnowledgeTreeSceneProps {
  categories: CategoryItem[];
  selectedSlug: string | null;
  selectedCategoryWithTools: CategoryItem | null;
  scrollProgress: number; // 0 to 3
  onSelectCategory: (slug: string) => void;
  onSelectTool: (tool: ToolItem) => void;
  isMobile?: boolean;
}

// Vertical Y layout for 4 major branches (spaced 7.0 units apart vertically)
const BRANCH_Y_COORDS = [4.5, -2.5, -9.5, -16.5];
const BRANCH_DIRECTIONS: Array<'left' | 'right'> = ['left', 'right', 'left', 'right'];

const TreeWorld: React.FC<{
  categories: CategoryItem[];
  selectedSlug: string | null;
  selectedCategoryWithTools: CategoryItem | null;
  scrollProgress: number;
  onSelectCategory: (slug: string) => void;
  onSelectTool: (tool: ToolItem) => void;
}> = ({
  categories,
  selectedSlug,
  selectedCategoryWithTools,
  scrollProgress,
  onSelectCategory,
  onSelectTool,
}) => {
  const { camera, mouse } = useThree();
  const treeRootRef = useRef<THREE.Group>(null);

  // Smooth vertical camera tracking based on scrollProgress
  useFrame((state, delta) => {
    // Current target Y is linearly interpolated across branch tiers:
    // Index 0 (scrollProgress = 0) -> Y = 4.5 (First branch)
    // Index 1 (scrollProgress = 1) -> Y = -2.5
    // Index 2 (scrollProgress = 2) -> Y = -9.5
    // Index 3 (scrollProgress = 3) -> Y = -16.5
    const targetY = 4.5 - scrollProgress * 7.0;

    // Subtle, centered pointer parallax tilt
    const targetCamX = mouse.x * 0.15;
    const targetCamY = targetY + mouse.y * 0.2;

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, delta * 3.5);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY, delta * 3.5);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, 10.4, delta * 2.0);

    camera.lookAt(0, camera.position.y, 0);

    // Subtle gentle breathing of tree
    if (treeRootRef.current) {
      const time = state.clock.getElapsedTime();
      treeRootRef.current.rotation.y = Math.sin(time * 0.12) * 0.03;
    }
  });

  return (
    <>
      {/* Soft atmospheric background fog (lighter density so stem is vivid) */}
      <fogExp2 attach="fog" args={['#030308', 0.015]} />

      {/* Cinematic Lighting System tailored for prominent wood stem visibility */}
      <ambientLight intensity={0.65} color="#25213b" />
      
      {/* Front warm key light illuminating the prominent trunk stem */}
      <directionalLight position={[0, 8, 14]} intensity={2.2} color="#fff1e6" />
      
      {/* Angled rim lights creating specular edge contour along bark */}
      <directionalLight position={[-12, 14, -6]} intensity={1.8} color="#c084fc" />
      <directionalLight position={[12, -8, 6]} intensity={1.6} color="#38bdf8" />
      <directionalLight position={[0, -18, 10]} intensity={1.2} color="#f59e0b" />

      {/* Subtle Background Stars / Floating Knowledge Dust */}
      <TreeAmbientParticles count={140} />

      {/* Main Organic Tree Hierarchy */}
      <group ref={treeRootRef} position={[0, 0, 0]}>
        {/* Continuous Central Organic Trunk with prominent visible cedar bark */}
        <OrganicTrunk bottomY={-24} topY={18} />

        {/* 4 Major Category Branches Emerging Organically from Alternating Sides */}
        {categories.map((cat, idx) => {
          const yPos = BRANCH_Y_COORDS[idx % BRANCH_Y_COORDS.length];
          const dir = BRANCH_DIRECTIONS[idx % BRANCH_DIRECTIONS.length];
          const isSelected = selectedSlug === cat.slug;

          // Tools for this category
          const branchTools =
            isSelected && selectedCategoryWithTools?.tools
              ? selectedCategoryWithTools.tools
              : cat.tools || [];

          return (
            <OrganicBranch
              key={cat.id || cat.slug}
              category={cat}
              categoryIndex={idx}
              yPosition={yPos}
              direction={dir}
              isSelected={isSelected}
              tools={branchTools}
              onSelectCategory={onSelectCategory}
              onSelectTool={onSelectTool}
            />
          );
        })}
      </group>
    </>
  );
};

export const KnowledgeTreeScene: React.FC<KnowledgeTreeSceneProps> = ({
  categories,
  selectedSlug,
  selectedCategoryWithTools,
  scrollProgress,
  onSelectCategory,
  onSelectTool,
  isMobile = false,
}) => {
  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 4.5, 10.4], fov: 45, near: 0.1, far: 120 }}
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        className="w-full h-full"
      >
        <TreeWorld
          categories={categories}
          selectedSlug={selectedSlug}
          selectedCategoryWithTools={selectedCategoryWithTools}
          scrollProgress={scrollProgress}
          onSelectCategory={onSelectCategory}
          onSelectTool={onSelectTool}
        />
      </Canvas>
    </div>
  );
};
