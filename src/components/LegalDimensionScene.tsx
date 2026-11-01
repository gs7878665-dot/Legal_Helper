import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import gsap from 'gsap';
import { ArrowLeft } from 'lucide-react';
import { OrganicTrunk } from './tree/OrganicTrunk';
import { OrganicBranch } from './tree/OrganicBranch';
import { TreeAmbientParticles } from './tree/TreeAmbientParticles';
import { useTreeData } from '../hooks/useTreeData';
import { AuthBadge } from './auth/AuthBadge';
import type { CategoryItem, ToolItem } from '../api/types';

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

// 4 main category branch Y elevations positioned comfortably in central view, lowered to ensure top branch is fully in frame
const BRANCH_Y_COORDS = [1.7, 0.1, -1.5, -3.1];
const BRANCH_DIRECTIONS: Array<'left' | 'right'> = ['left', 'right', 'left', 'right'];

export interface CinematicAnimationState {
  blackOverlayOpacity: number;
  universeUnfold: number; // 0 -> 1
  universeParticles: number; // 0 -> 1
  humanReveal: number; // 0 -> 1 (fades and moves human in)
  humanY: number; // Y position of human
  treeRise: number; // 0 (way below) -> 1 (settled in view)
  humanFadeOut: number; // 1 -> 0 (fades out as tree dominates)
  titleScale: number; // 1 -> 0.75
  titleX: number; // 0 (center) -> -42vw (top left)
  titleY: number; // 0 (center) -> -42vh (top left)
  titleOpacity: number; // 0 -> 1
  sceneCameraY: number;
  sceneCameraZ: number;
  targetY: number;
  targetZ: number;
}

interface WorldSceneProps {
  categories: CategoryItem[];
  selectedCategoryWithTools: CategoryItem | null;
  onSelectCategory: (slug: string) => void;
  onSelectTool: (tool: ToolItem) => void;
  onZoomOut: () => void;
  animState: React.MutableRefObject<CinematicAnimationState>;
  zoomedCategoryIndex: number | null;
  isMobile: boolean;
}

const WorldScene: React.FC<WorldSceneProps> = ({
  categories,
  selectedCategoryWithTools,
  onSelectCategory,
  onSelectTool,
  onZoomOut,
  animState,
  zoomedCategoryIndex,
  isMobile,
}) => {
  const { camera, mouse } = useThree();

  // Mesh & group references
  const universeGroupRef = useRef<THREE.Group>(null);
  const coreMeshRef = useRef<THREE.Mesh>(null);
  const coreLightRef = useRef<THREE.PointLight>(null);
  const orbitalRingsRef = useRef<THREE.Group>(null);
  const particlesMeshRef = useRef<THREE.InstancedMesh>(null);

  const humanGroupRef = useRef<THREE.Group>(null);
  const treeRootRef = useRef<THREE.Group>(null);

  // Precomputed Universe Particles
  const particleCount = isMobile ? 240 : 480;
  const particleData = useMemo(() => {
    const list = [];
    const colors = [
      new THREE.Color('#c084fc'),
      new THREE.Color('#818cf8'),
      new THREE.Color('#e0e7ff'),
      new THREE.Color('#38bdf8'),
    ];

    for (let i = 0; i < particleCount; i++) {
      const radius = 2.5 + Math.random() * 8.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const targetPos = new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta) * 0.75 + 0.8,
        radius * Math.cos(phi) - 3.5
      );

      const speed = 0.4 + Math.random() * 0.6;
      const phaseOffset = Math.random() * Math.PI * 2;
      const scale = 0.025 + Math.random() * 0.035;
      const color = colors[Math.floor(Math.random() * colors.length)];

      list.push({ targetPos, speed, phaseOffset, scale, color });
    }
    return list;
  }, [particleCount]);

  // Set particle colors once
  useEffect(() => {
    if (particlesMeshRef.current) {
      particleData.forEach((p, i) => {
        particlesMeshRef.current!.setColorAt(i, p.color);
      });
      particlesMeshRef.current.instanceColor!.needsUpdate = true;
    }
  }, [particleData]);

  // Temporary matrices
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tempPos = useMemo(() => new THREE.Vector3(), []);
  const tempScale = useMemo(() => new THREE.Vector3(), []);

  // Frame Loop
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const st = animState.current;

    // Camera zoom logic when a category branch is clicked
    // Lower the branch in the viewport by around 10vh (~0.9 units elevation offset)
    // and frame the 20vw extended branch comfortably with generous top and side margins.
    if (zoomedCategoryIndex !== null) {
      const branchY = BRANCH_Y_COORDS[zoomedCategoryIndex % BRANCH_Y_COORDS.length];
      const dir = BRANCH_DIRECTIONS[zoomedCategoryIndex % BRANCH_DIRECTIONS.length];
      const isRightBranch = dir === 'right';

      // Move camera target to lower the branch by ~10vh and focus on the spacious limb
      const targetCamX = isRightBranch ? 3.0 : -3.0;
      const targetCamY = branchY + 0.65; // Lowers the branch in view by ~10vh
      const targetCamZ = 8.6; // Step back to comfortably frame the 20vw wider reach and all 4 leaf badges

      camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, delta * 3.5);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY, delta * 3.5);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, delta * 3.5);

      // Look at the center of the extended limb
      const lookX = isRightBranch ? 3.4 : -3.4;
      camera.lookAt(lookX, branchY - 0.1, 0);
    } else {
      // General view tracked by GSAP timeline + subtle mouse parallax
      const px = mouse.x * 0.25;
      const py = mouse.y * 0.18;
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, px, delta * 4.0);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, st.sceneCameraY + py, delta * 4.0);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, st.sceneCameraZ, delta * 4.0);
      camera.lookAt(0, st.targetY, st.targetZ);
    }

    // 1. Universe Form & Orbit
    if (coreMeshRef.current && coreLightRef.current) {
      const uScale = st.universeUnfold;
      coreMeshRef.current.scale.set(uScale, uScale, uScale);
      coreLightRef.current.intensity = uScale * 2.5;
    }

    if (orbitalRingsRef.current) {
      orbitalRingsRef.current.rotation.z = time * 0.18;
      orbitalRingsRef.current.rotation.y = time * 0.12;
      orbitalRingsRef.current.visible = st.universeUnfold > 0.05;
    }

    if (particlesMeshRef.current && st.universeParticles > 0.01) {
      const exp = st.universeParticles;
      for (let i = 0; i < particleCount; i++) {
        const p = particleData[i];
        tempPos.lerpVectors(new THREE.Vector3(0, 0, 0), p.targetPos, exp);

        if (exp > 0.6) {
          tempPos.x += Math.sin(time * p.speed + p.phaseOffset) * 0.02;
          tempPos.y += Math.cos(time * p.speed + p.phaseOffset) * 0.015;
        }

        const sc = p.scale * exp;
        tempScale.set(sc, sc, sc);
        tempMatrix.makeTranslation(tempPos.x, tempPos.y, tempPos.z);
        tempMatrix.scale(tempScale);
        particlesMeshRef.current.setMatrixAt(i, tempMatrix);
      }
      particlesMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // 2. Human Figure Coordinates & Visibility
    if (humanGroupRef.current) {
      const effectiveHumanOpacity = st.humanReveal * st.humanFadeOut;
      humanGroupRef.current.visible = effectiveHumanOpacity > 0.02;
      humanGroupRef.current.position.y = st.humanY;

      // Gentle subtle breathing
      if (effectiveHumanOpacity > 0.05) {
        humanGroupRef.current.position.y = st.humanY + Math.sin(time * 1.5) * 0.02;
      }
    }

    // 3. Tree Emerging & Rise
    if (treeRootRef.current) {
      // treeRise: 0 -> Y = -28 (below viewport), 1 -> Y = 0 (settled)
      const treeY = THREE.MathUtils.lerp(-28, 0, st.treeRise);
      treeRootRef.current.position.y = treeY;

      // Subtle gentle organic sway
      treeRootRef.current.rotation.y = Math.sin(time * 0.12) * 0.025;
    }
  });

  return (
    <>
      {/* Deep, cinematic atmospheric midnight fog */}
      <fogExp2 attach="fog" args={['#030308', 0.016]} />

      {/* Atmospheric Lighting */}
      <ambientLight intensity={0.65} color="#25213b" />
      <directionalLight position={[0, 10, 14]} intensity={2.2} color="#fff1e6" />
      <directionalLight position={[-12, 14, -6]} intensity={1.8} color="#c084fc" />
      <directionalLight position={[12, -8, 6]} intensity={1.5} color="#38bdf8" />

      {/* Background Floating Dust / Stars */}
      <TreeAmbientParticles count={150} />

      {/* ========================================================= */}
      {/* ACT 1: Cinematic Universe Formation                       */}
      {/* ========================================================= */}
      <group ref={universeGroupRef} position={[0, 1.2, -2]}>
        <pointLight ref={coreLightRef} color="#c084fc" intensity={0} distance={16} decay={2} />
        <mesh ref={coreMeshRef} scale={[0, 0, 0]}>
          <sphereGeometry args={[0.3, 24, 24]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        <group ref={orbitalRingsRef} visible={false}>
          {[1.6, 2.6, 3.8].map((radius, idx) => (
            <mesh key={radius} rotation={[idx * 0.7, idx * 0.45, 0]}>
              <torusGeometry args={[radius, 0.012, 8, 80]} />
              <meshBasicMaterial
                color={idx % 2 === 0 ? '#c084fc' : '#818cf8'}
                transparent
                opacity={0.35}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          ))}
        </group>

        <instancedMesh ref={particlesMeshRef} args={[undefined, undefined, particleCount]}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshBasicMaterial transparent opacity={0.85} blending={THREE.AdditiveBlending} />
        </instancedMesh>
      </group>

      {/* ========================================================= */}
      {/* ACT 2 & 3: Human Figure (Purely Visual, No Pointer Events) */}
      {/* ========================================================= */}
      <group ref={humanGroupRef} position={[0, 0, 4.2]} visible={false}>
        {/* Head */}
        <mesh position={[0, 1.68, 0]}>
          <sphereGeometry args={[0.11, 14, 14]} />
          <meshStandardMaterial
            color="#0b0817"
            roughness={0.4}
            emissive="#818cf8"
            emissiveIntensity={0.2}
          />
        </mesh>

        {/* Neck */}
        <mesh position={[0, 1.54, 0]}>
          <cylinderGeometry args={[0.06, 0.07, 0.09, 10]} />
          <meshStandardMaterial color="#0b0817" roughness={0.4} />
        </mesh>

        {/* Torso & Long Coat */}
        <mesh position={[0, 1.18, 0]}>
          <cylinderGeometry args={[0.18, 0.26, 0.65, 12]} />
          <meshStandardMaterial
            color="#0d0b1a"
            roughness={0.35}
            metalness={0.6}
            emissive="#4f46e5"
            emissiveIntensity={0.15}
          />
        </mesh>

        {/* Coat Flare */}
        <mesh position={[0, 0.72, 0]}>
          <cylinderGeometry args={[0.26, 0.32, 0.45, 12]} />
          <meshStandardMaterial
            color="#0d0b1a"
            roughness={0.35}
            metalness={0.6}
            emissive="#4f46e5"
            emissiveIntensity={0.1}
          />
        </mesh>

        {/* Arms */}
        <mesh position={[-0.24, 1.14, 0]}>
          <cylinderGeometry args={[0.05, 0.045, 0.58, 8]} />
          <meshStandardMaterial color="#0d0b1a" roughness={0.4} />
        </mesh>
        <mesh position={[0.24, 1.14, 0]}>
          <cylinderGeometry args={[0.05, 0.045, 0.58, 8]} />
          <meshStandardMaterial color="#0d0b1a" roughness={0.4} />
        </mesh>

        {/* Legs */}
        <mesh position={[-0.11, 0.27, 0]}>
          <cylinderGeometry args={[0.06, 0.05, 0.56, 8]} />
          <meshStandardMaterial color="#080612" roughness={0.4} />
        </mesh>
        <mesh position={[0.11, 0.27, 0]}>
          <cylinderGeometry args={[0.06, 0.05, 0.56, 8]} />
          <meshStandardMaterial color="#080612" roughness={0.4} />
        </mesh>
      </group>

      {/* ========================================================= */}
      {/* ACT 3, 4, 5: Knowledge Tree Growing Upward                */}
      {/* ========================================================= */}
      <group ref={treeRootRef} position={[0, -28, 0]}>
        {/* Continuous Central Organic Trunk (Clicking trunk when zoomed zooms out) */}
        <OrganicTrunk
          bottomY={-24}
          topY={18}
          onTrunkClick={zoomedCategoryIndex !== null ? onZoomOut : undefined}
        />

        {/* 4 Main Category Branches: When a branch is zoomed in, ONLY that branch is visible */}
        {categories.slice(0, 4).map((cat, idx) => {
          // If a branch is selected, hide other branches to eliminate clutter
          if (zoomedCategoryIndex !== null && zoomedCategoryIndex !== idx) {
            return null;
          }

          const yPos = BRANCH_Y_COORDS[idx % BRANCH_Y_COORDS.length];
          const dir = BRANCH_DIRECTIONS[idx % BRANCH_DIRECTIONS.length];
          const isSelected = zoomedCategoryIndex === idx;

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

export interface LegalDimensionSceneProps {
  onEnterApp?: () => void;
  className?: string;
  skipIntro?: boolean;
}

export const LegalDimensionScene: React.FC<LegalDimensionSceneProps> = ({
  className = '',
  skipIntro = false,
}) => {
  const navigate = useNavigate();
  const {
    categories,
    selectedCategoryWithTools,
    selectCategory,
  } = useTreeData();

  const [hasWebGL, setHasWebGL] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [introFinished, setIntroFinished] = useState(skipIntro);
  const [zoomedCategoryIndex, setZoomedCategoryIndex] = useState<number | null>(null);

  // Mutable animation state driven by GSAP
  const animState = useRef<CinematicAnimationState>(
    skipIntro
      ? {
          blackOverlayOpacity: 0,
          universeUnfold: 1,
          universeParticles: 1,
          humanReveal: 0,
          humanY: 1.4,
          treeRise: 1,
          humanFadeOut: 0,
          titleScale: 0.55,
          titleX: -32,
          titleY: -42,
          titleOpacity: 1,
          sceneCameraY: -0.2,
          sceneCameraZ: 9.8,
          targetY: -0.2,
          targetZ: 0,
        }
      : {
          blackOverlayOpacity: 1,
          universeUnfold: 0,
          universeParticles: 0,
          humanReveal: 0,
          humanY: 0,
          treeRise: 0,
          humanFadeOut: 1,
          titleScale: 1,
          titleX: 0,
          titleY: 0,
          titleOpacity: 0,
          sceneCameraY: 1.0,
          sceneCameraZ: 7.5,
          targetY: 1.0,
          targetZ: 0,
        }
  );

  // Smooth DOM overlay state for brand title
  const [titleOverlay, setTitleOverlay] = useState(
    skipIntro
      ? {
          opacity: 1,
          scale: 0.55,
          xVw: -32,
          yVh: -42,
          isCorner: true,
        }
      : {
          opacity: 0,
          scale: 1,
          xVw: 0,
          yVh: 0,
          isCorner: false,
        }
  );

  // Check WebGL, media queries, and mobile
  useEffect(() => {
    setHasWebGL(isWebGLAvailable());

    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mediaQuery.matches);
      const handleMotion = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mediaQuery.addEventListener('change', handleMotion);

      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);

      return () => {
        mediaQuery.removeEventListener('change', handleMotion);
        window.removeEventListener('resize', checkMobile);
      };
    }
  }, []);

  // Master Cinematic Timeline
  useEffect(() => {
    const s = animState.current;

    if (skipIntro || reducedMotion) {
      s.blackOverlayOpacity = 0;
      s.universeUnfold = 1;
      s.universeParticles = 1;
      s.humanReveal = 0;
      s.humanFadeOut = 0;
      s.treeRise = 1;
      s.sceneCameraY = -0.2;
      s.sceneCameraZ = 9.8;
      s.targetY = -0.2;
      s.targetZ = 0;
      setTitleOverlay({
        opacity: 1,
        scale: 0.55,
        xVw: -32,
        yVh: -42,
        isCorner: true,
      });
      setIntroFinished(true);
      return;
    }

    // Reset values for start
    s.blackOverlayOpacity = 1;
    s.universeUnfold = 0;
    s.universeParticles = 0;
    s.humanReveal = 0;
    s.humanY = 0;
    s.treeRise = 0;
    s.humanFadeOut = 1;
    s.titleScale = 1;
    s.titleX = 0;
    s.titleY = 0;
    s.titleOpacity = 0;
    s.sceneCameraY = 1.0;
    s.sceneCameraZ = 7.5;
    s.targetY = 1.0;
    s.targetZ = 0;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          setIntroFinished(true);
        },
      });

      // ----------------------------------------------------
      // ACT 1: Black screen -> Universe Formation (0.0s - 2.8s)
      // ----------------------------------------------------
      tl.to(s, {
        blackOverlayOpacity: 0,
        duration: 0.8,
        ease: 'power2.out',
      }, 0.0);

      tl.to(s, {
        universeUnfold: 1.0,
        universeParticles: 1.0,
        duration: 2.2,
        ease: 'power2.inOut',
      }, 0.4);

      // ----------------------------------------------------
      // ACT 2: Human + Legal Helper Title (2.4s - 4.6s)
      // ----------------------------------------------------
      tl.to(s, {
        humanReveal: 1.0,
        duration: 1.4,
        ease: 'power2.out',
      }, 2.4);

      tl.to(s, {
        titleOpacity: 1.0,
        duration: 1.6,
        ease: 'power2.out',
        onUpdate: () => {
          setTitleOverlay((prev) => ({
            ...prev,
            opacity: s.titleOpacity,
          }));
        },
      }, 2.6);

      // ----------------------------------------------------
      // ACT 3: Tree Grows Upward & Moves Human + Title (4.6s - 7.6s)
      // ----------------------------------------------------
      tl.to(s, {
        treeRise: 1.0,
        humanY: 1.4,
        sceneCameraY: -0.2,
        sceneCameraZ: 9.8,
        targetY: -0.2,
        duration: 3.0,
        ease: 'power2.inOut',
      }, 4.6);

      // ----------------------------------------------------
      // ACT 4: Tree becomes the main scene (6.8s - 8.6s)
      // Human fades out; Legal Helper moves to subtle side brand position
      // ----------------------------------------------------
      tl.to(s, {
        humanFadeOut: 0.0,
        duration: 1.4,
        ease: 'power2.inOut',
      }, 6.6);

      tl.to(s, {
        titleScale: 0.55,
        titleX: -32,
        titleY: -42,
        duration: 2.0,
        ease: 'power3.inOut',
        onUpdate: () => {
          setTitleOverlay({
            opacity: s.titleOpacity,
            scale: s.titleScale,
            xVw: s.titleX,
            yVh: s.titleY,
            isCorner: s.titleScale < 0.85,
          });
        },
      }, 6.8);
    });

    return () => {
      ctx.revert();
    };
  }, [reducedMotion, skipIntro]);

  // Branch interaction: clicking zooms smoothly into that branch
  const handleSelectCategory = (slug: string) => {
    selectCategory(slug);
    const catIdx = categories.findIndex((c) => c.slug === slug);
    if (catIdx !== -1) {
      setZoomedCategoryIndex(catIdx);
    }
  };

  const handleReturnToMainTree = () => {
    setZoomedCategoryIndex(null);
  };

  const handleSelectTool = (tool: ToolItem) => {
    navigate(tool.route);
  };

  if (!hasWebGL) {
    return (
      <div className="absolute inset-0 bg-black flex items-center justify-center p-6 text-center select-none">
        <div className="text-left space-y-4 max-w-md">
          <h1 className="text-3xl font-light text-white tracking-[0.2em] uppercase font-sans">
            Legal Helper
          </h1>
          <p className="text-xs text-gray-400">
            WebGL is not supported in this environment. Proceed directly to the legal workspace below.
          </p>
          <button
            onClick={() => navigate('/explore')}
            className="px-6 py-2.5 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition-colors"
          >
            Enter Legal Helper ↗
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-screen overflow-hidden bg-[#030308] ${className}`}>
      {/* 1. Initial Black Screen Overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-50 bg-black transition-opacity duration-300"
        style={{ opacity: animState.current.blackOverlayOpacity }}
      />

      {/* 2. Top Navigation Bar (Revealed when tree is in focus) */}
      <div
        className={`absolute top-5 inset-x-0 z-30 px-12 sm:px-14 flex items-center justify-between pointer-events-none transition-opacity duration-700 ${
          introFinished ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="pointer-events-auto flex items-center gap-4">
          {zoomedCategoryIndex !== null ? (
            <button
              type="button"
              onClick={handleReturnToMainTree}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-xs font-light text-gray-200 hover:text-white backdrop-blur-md transition-all cursor-pointer shadow-lg"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-primary" />
              <span>Return to Main Tree</span>
            </button>
          ) : (
            <h1 className="text-xl sm:text-2xl font-light tracking-[0.22em] text-white/90 uppercase font-sans drop-shadow-[0_0_25px_rgba(192,132,252,0.4)] whitespace-nowrap">
              Legal Helper
            </h1>
          )}
        </div>

        <div className="pointer-events-auto">
          <AuthBadge />
        </div>
      </div>

      {/* 3. Full-Viewport 3D Canvas */}
      <div className={`w-full h-full ${introFinished ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <Canvas
          camera={{ position: [0, 1.0, 7.5], fov: 45, near: 0.1, far: 140 }}
          dpr={isMobile ? [1, 1.5] : [1, 2]}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
          }}
          className="w-full h-full"
        >
          <WorldScene
            categories={categories}
            selectedCategoryWithTools={selectedCategoryWithTools}
            onSelectCategory={handleSelectCategory}
            onSelectTool={handleSelectTool}
            onZoomOut={handleReturnToMainTree}
            animState={animState}
            zoomedCategoryIndex={zoomedCategoryIndex}
            isMobile={isMobile}
          />
        </Canvas>
      </div>

      {/* 4. Elegant Brand Title & Side Element */}
      <div
        className="pointer-events-none absolute inset-0 z-20 select-none overflow-hidden"
        aria-hidden="true"
      >
        {!titleOverlay.isCorner && (
          /* Centered dramatic title during intro formation */
          <div className="w-full h-full flex items-center justify-center">
            <div
              className="will-change-transform flex flex-col items-center justify-center transition-shadow"
              style={{
                opacity: titleOverlay.opacity,
                transform: `translate(${titleOverlay.xVw}vw, ${titleOverlay.yVh}vh) scale(${titleOverlay.scale})`,
              }}
            >
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-light tracking-[0.24em] text-white/95 uppercase font-sans drop-shadow-[0_0_35px_rgba(192,132,252,0.4)] whitespace-nowrap">
                Legal Helper
              </h1>
              <p className="mt-3 text-xs sm:text-sm font-light tracking-[0.18em] text-gray-300 uppercase font-sans">
                Clarity in Complexity
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 5. Minimal Bottom Guidance when Main Tree is Active */}
      <footer
        className={`pointer-events-none absolute bottom-5 inset-x-0 z-20 flex flex-col items-center justify-end select-none transition-opacity duration-700 ${
          introFinished && zoomedCategoryIndex === null ? 'opacity-70' : 'opacity-0'
        }`}
      >
        <div className="px-4 py-1.5 rounded-full bg-black/60 border border-white/10 text-[11px] font-mono text-gray-300 backdrop-blur-md">
          <span>Click a branch to inspect legal tools</span>
        </div>
      </footer>
    </div>
  );
};
