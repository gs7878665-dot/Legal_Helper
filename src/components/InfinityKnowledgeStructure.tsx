import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';

// Check if WebGL is supported in the current environment
export function isWebGLAvailable(): boolean {
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

// Parametric 3D Infinity (Lemniscate with helical 3D separation)
function getInfinityPoint(
  t: number,
  scaleX = 3.4,
  scaleY = 1.5,
  scaleZ = 1.1
): THREE.Vector3 {
  const x = scaleX * Math.cos(t);
  const y = scaleY * Math.sin(2 * t);
  const z = scaleZ * Math.sin(t);
  return new THREE.Vector3(x, y, z);
}

// Tangent vector at parameter t
function getInfinityTangent(
  t: number,
  scaleX = 3.4,
  scaleY = 1.5,
  scaleZ = 1.1
): THREE.Vector3 {
  const dx = -scaleX * Math.sin(t);
  const dy = 2 * scaleY * Math.cos(2 * t);
  const dz = scaleZ * Math.cos(t);
  return new THREE.Vector3(dx, dy, dz).normalize();
}

interface InfinitySceneProps {
  reducedMotion: boolean;
  isMobile: boolean;
  onAssemblyComplete?: () => void;
}

const InfinityScene: React.FC<InfinitySceneProps> = ({
  reducedMotion,
  isMobile,
  onAssemblyComplete,
}) => {
  const { mouse } = useThree();
  const rootGroupRef = useRef<THREE.Group>(null);
  const strandsGroupRef = useRef<THREE.Group>(null);
  const particlesMeshRef = useRef<THREE.InstancedMesh>(null);
  const nodesMeshRef = useRef<THREE.InstancedMesh>(null);
  const ambientPointsRef = useRef<THREE.Points>(null);
  const latticeLinesRef = useRef<THREE.LineSegments>(null);
  const centerLightRef = useRef<THREE.PointLight>(null);

  // Configuration based on device capability
  const config = useMemo(() => {
    return {
      numStrands: isMobile ? 5 : 7,
      strandSegments: isMobile ? 180 : 260,
      numParticles: isMobile ? 420 : 850,
      numNodes: isMobile ? 18 : 32,
      numAmbient: isMobile ? 35 : 75,
      scaleX: isMobile ? 2.5 : 3.5,
      scaleY: isMobile ? 1.15 : 1.55,
      scaleZ: isMobile ? 0.85 : 1.15,
      latticeSteps: isMobile ? 32 : 54,
    };
  }, [isMobile]);

  // Master timeline animation progress values driven by GSAP
  const animState = useRef({
    // Phase 1: Darkness & initial center particles
    initialGlow: reducedMotion ? 1 : 0,
    // Phase 2: Convergence (0 = scattered, 1 = assembled on infinity)
    convergence: reducedMotion ? 1 : 0,
    // Phase 3: Strands & connecting lines formation (0 = hidden, 1 = fully lit)
    strandOpacity: reducedMotion ? 1 : 0,
    latticeOpacity: reducedMotion ? 1 : 0,
    centerGlowIntensity: reducedMotion ? 2.5 : 0,
    // Phase 4: Light wave & rotation enable
    waveProgress: reducedMotion ? 1 : 0,
    rotationSpeedMultiplier: reducedMotion ? 0 : 1,
  });

  // Calculate Strand Curves with braided 3D offsets
  const { strandPointsList, latticePositions } = useMemo(() => {
    const strands: THREE.Vector3[][] = [];
    const up = new THREE.Vector3(0, 1, 0);

    for (let s = 0; s < config.numStrands; s++) {
      const points: THREE.Vector3[] = [];
      const strandRadius = 0.08 + (s / (config.numStrands - 1)) * 0.18;
      const strandPhaseOffset = (s / config.numStrands) * Math.PI * 2;
      const twistFreq = 3.0; // 3 full twists around the loop

      for (let i = 0; i <= config.strandSegments; i++) {
        const t = (i / config.strandSegments) * Math.PI * 2;
        const basePoint = getInfinityPoint(t, config.scaleX, config.scaleY, config.scaleZ);
        const tangent = getInfinityTangent(t, config.scaleX, config.scaleY, config.scaleZ);

        // Compute local coordinate frame (Normal & Binormal)
        const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
        if (normal.lengthSq() < 0.001) normal.set(1, 0, 0);
        const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();

        const angle = strandPhaseOffset + twistFreq * t;
        const offset = new THREE.Vector3()
          .addScaledVector(normal, Math.cos(angle) * strandRadius)
          .addScaledVector(binormal, Math.sin(angle) * strandRadius);

        points.push(basePoint.clone().add(offset));
      }
      strands.push(points);
    }

    // Generate connecting lattice lines between adjacent strands
    const latticePos: number[] = [];
    for (let step = 0; step < config.latticeSteps; step++) {
      const idx = Math.floor((step / config.latticeSteps) * config.strandSegments);
      for (let s = 0; s < config.numStrands - 1; s++) {
        const p1 = strands[s][idx];
        const p2 = strands[s + 1][idx];
        if (p1 && p2) {
          latticePos.push(p1.x, p1.y, p1.z);
          latticePos.push(p2.x, p2.y, p2.z);
        }
      }
    }

    return { strandPointsList: strands, latticePositions: new Float32Array(latticePos) };
  }, [config]);

  // Particle data: Target positions, initial scatter positions, phases, colors
  const particlesData = useMemo(() => {
    const data = [];
    const colors = [
      new THREE.Color('#2ae909ff'), // Soft vibrant violet
      new THREE.Color('#818cf8'), // Luminous indigo
      new THREE.Color('#ffffff'), // Soft white
      new THREE.Color('#e0e7ff'), // Pale blue-white
      new THREE.Color('#a855f7'), // Deep purple
    ];

    for (let i = 0; i < config.numParticles; i++) {
      // Pick a random parameter t along the infinity curve
      const t = Math.random() * Math.PI * 2;
      const strandIdx = Math.floor(Math.random() * config.numStrands);
      const ptIdx = Math.floor((t / (Math.PI * 2)) * config.strandSegments);
      const targetBase = strandPointsList[strandIdx]?.[ptIdx] || getInfinityPoint(t, config.scaleX, config.scaleY, config.scaleZ);

      // Add a tiny jitter around strand
      const targetPos = targetBase.clone().add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.08,
          (Math.random() - 0.5) * 0.08,
          (Math.random() - 0.5) * 0.08
        )
      );

      // Scatter initial position: spread widely in 3D space
      const scatterRadius = 5.0 + Math.random() * 6.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const scatterPos = new THREE.Vector3(
        scatterRadius * Math.sin(phi) * Math.cos(theta),
        scatterRadius * Math.sin(phi) * Math.sin(theta) * 0.6,
        scatterRadius * Math.cos(phi) * 0.8
      );

      // Random color & scale
      const color = colors[Math.floor(Math.random() * colors.length)];
      const baseScale = 0.016 + Math.random() * 0.024;
      const speed = 0.8 + Math.random() * 0.6;
      const phase = Math.random() * Math.PI * 2;

      // Stagger factor: particles closer to center assemble slightly earlier
      const distFromCenter = targetPos.length();
      const staggerDelay = Math.min(distFromCenter / 4.0, 1.0);

      data.push({
        targetPos,
        scatterPos,
        color,
        baseScale,
        speed,
        phase,
        t,
        staggerDelay,
      });
    }
    return data;
  }, [config, strandPointsList]);

  // Major Junction Nodes along the curve
  const nodesData = useMemo(() => {
    const nodes = [];
    for (let i = 0; i < config.numNodes; i++) {
      const t = (i / config.numNodes) * Math.PI * 2;
      const pos = getInfinityPoint(t, config.scaleX, config.scaleY, config.scaleZ);
      nodes.push({
        pos,
        t,
        scale: 0.05 + (i % 2 === 0 ? 0.025 : 0.01),
      });
    }
    return nodes;
  }, [config]);

  // Ambient floating dust particles
  const ambientPositions = useMemo(() => {
    const positions = new Float32Array(config.numAmbient * 3);
    for (let i = 0; i < config.numAmbient; i++) {
      const radius = 2.0 + Math.random() * 4.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.7;
      positions[i * 3 + 2] = radius * Math.cos(phi) * 0.8;
    }
    return positions;
  }, [config]);

  // GSAP 4-Phase Timeline Orchestration
  useEffect(() => {
    if (reducedMotion) {
      animState.current.initialGlow = 1;
      animState.current.convergence = 1;
      animState.current.strandOpacity = 1;
      animState.current.latticeOpacity = 1;
      animState.current.centerGlowIntensity = 2.5;
      animState.current.waveProgress = 1;
      animState.current.rotationSpeedMultiplier = 0;
      onAssemblyComplete?.();
      return;
    }

    const tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      onComplete: () => {
        onAssemblyComplete?.();
      },
    });

    // Phase 1 — Darkness: Initial silence, faint emergence of central particles (0 - 1.0s)
    tl.to(animState.current, {
      initialGlow: 0.35,
      centerGlowIntensity: 0.8,
      duration: 1.0,
      ease: 'power1.in',
    });

    // Phase 2 — Convergence: Particles begin moving toward infinity path; strands begin forming (1.0 - 2.6s)
    tl.to(
      animState.current,
      {
        convergence: 1.0,
        initialGlow: 1.0,
        duration: 1.8,
        ease: 'power3.out',
      },
      '-=0.2'
    );

    tl.to(
      animState.current,
      {
        strandOpacity: 0.7,
        duration: 1.2,
        ease: 'power2.out',
      },
      '-=1.2'
    );

    // Phase 3 — Formation: Full structure emerges, connecting lines & nodes light up, central glow swells (2.6 - 4.0s)
    tl.to(
      animState.current,
      {
        strandOpacity: 1.0,
        latticeOpacity: 0.65,
        centerGlowIntensity: 2.8,
        duration: 1.4,
        ease: 'power2.out',
      },
      '-=0.4'
    );

    // Phase 4 — Final Reveal: Light wave sweeps around infinity path, gentle continuous rotation engages (4.0 - 5.4s)
    tl.to(
      animState.current,
      {
        waveProgress: 2.0,
        rotationSpeedMultiplier: 1.0,
        duration: 1.4,
        ease: 'sine.inOut',
      },
      '-=0.2'
    );

    return () => {
      tl.kill();
    };
  }, [reducedMotion, onAssemblyComplete]);

  // Temporary transform matrix for InstancedMesh updates
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tempPos = useMemo(() => new THREE.Vector3(), []);
  const tempScale = useMemo(() => new THREE.Vector3(), []);

  // Set initial colors on particle instances once
  useEffect(() => {
    if (particlesMeshRef.current) {
      particlesData.forEach((p, i) => {
        particlesMeshRef.current!.setColorAt(i, p.color);
      });
      particlesMeshRef.current.instanceColor!.needsUpdate = true;
    }
    if (nodesMeshRef.current) {
      const nodeColor = new THREE.Color('#f5f3ff');
      nodesData.forEach((_, i) => {
        nodesMeshRef.current!.setColorAt(i, nodeColor);
      });
      nodesMeshRef.current.instanceColor!.needsUpdate = true;
    }
  }, [particlesData, nodesData]);

  // Frame Loop (Restrained, elegant motion without React re-renders)
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const {
      convergence,
      initialGlow,
      strandOpacity,
      latticeOpacity,
      centerGlowIntensity,
      waveProgress,
      rotationSpeedMultiplier,
    } = animState.current;

    // 1. Slow, continuous rotation around vertical Y axis
    if (rootGroupRef.current) {
      if (!reducedMotion) {
        // Continuous slow rotation
        rootGroupRef.current.rotation.y += delta * 0.12 * rotationSpeedMultiplier;

        // Subtle floating / breathing on Y axis
        rootGroupRef.current.position.y = Math.sin(time * 0.75) * 0.05;

        // Subtle pointer-based parallax tilt (smooth lerp)
        const targetRotX = mouse.y * 0.12;
        const targetRotZ = -mouse.x * 0.08;
        rootGroupRef.current.rotation.x += (targetRotX - rootGroupRef.current.rotation.x) * 0.04;
        rootGroupRef.current.rotation.z += (targetRotZ - rootGroupRef.current.rotation.z) * 0.04;
      }
    }

    // 2. Update center point light
    if (centerLightRef.current) {
      centerLightRef.current.intensity = centerGlowIntensity;
    }

    // 3. Update Instanced Particles
    if (particlesMeshRef.current) {
      for (let i = 0; i < config.numParticles; i++) {
        const p = particlesData[i];

        // Staggered convergence
        const effectiveConv = Math.min(Math.max((convergence - p.staggerDelay * 0.25) / 0.75, 0), 1);
        tempPos.lerpVectors(p.scatterPos, p.targetPos, effectiveConv);

        // Add subtle floating drift when assembled
        if (effectiveConv > 0.8 && !reducedMotion) {
          const driftX = Math.sin(time * p.speed + p.phase) * 0.02;
          const driftY = Math.cos(time * p.speed + p.phase * 1.3) * 0.02;
          const driftZ = Math.sin(time * 0.8 + p.phase * 0.7) * 0.02;
          tempPos.x += driftX;
          tempPos.y += driftY;
          tempPos.z += driftZ;
        }

        // Pulse wave along the infinity path
        const waveAngle = (p.t / (Math.PI * 2)) * Math.PI * 2;
        const wave = Math.sin(waveAngle * 2.0 - time * 1.2 + waveProgress * Math.PI);
        const waveScaleBoost = Math.max(0, wave) * 0.012;

        const currentScale =
          p.baseScale *
          initialGlow *
          (0.2 + 0.8 * effectiveConv) +
          waveScaleBoost;

        tempScale.set(currentScale, currentScale, currentScale);
        tempMatrix.makeTranslation(tempPos.x, tempPos.y, tempPos.z);
        tempMatrix.scale(tempScale);
        particlesMeshRef.current.setMatrixAt(i, tempMatrix);
      }
      particlesMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // 4. Update Junction Nodes
    if (nodesMeshRef.current) {
      for (let i = 0; i < config.numNodes; i++) {
        const node = nodesData[i];
        const pulse = 1.0 + Math.sin(time * 2.0 + node.t * 3.0) * 0.2;
        const s = node.scale * strandOpacity * pulse;
        tempScale.set(s, s, s);
        tempMatrix.makeTranslation(node.pos.x, node.pos.y, node.pos.z);
        tempMatrix.scale(tempScale);
        nodesMeshRef.current.setMatrixAt(i, tempMatrix);
      }
      nodesMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // 5. Update Strands & Lattice opacity / materials
    if (strandsGroupRef.current) {
      strandsGroupRef.current.children.forEach((child, sIdx) => {
        if (child instanceof THREE.Line) {
          const mat = child.material as THREE.LineBasicMaterial;
          mat.opacity = strandOpacity * (0.45 + ((sIdx % 2) * 0.35));
        }
      });
    }

    if (latticeLinesRef.current) {
      const latticeMat = latticeLinesRef.current.material as THREE.LineBasicMaterial;
      latticeMat.opacity = latticeOpacity * 0.35;
    }

    // 6. Slowly drift ambient dust
    if (ambientPointsRef.current && !reducedMotion) {
      ambientPointsRef.current.rotation.y = time * 0.02;
      ambientPointsRef.current.rotation.x = Math.sin(time * 0.015) * 0.05;
    }
  });

  return (
    <group ref={rootGroupRef}>
      {/* Central Soft Glow Lighting */}
      <pointLight
        ref={centerLightRef}
        position={[0, 0, 0]}
        color="#c084fc"
        intensity={0}
        distance={9}
        decay={2}
      />
      <pointLight position={[3, 0, 1]} color="#818cf8" intensity={1.2} distance={8} decay={2} />
      <pointLight position={[-3, 0, -1]} color="#9333ea" intensity={1.2} distance={8} decay={2} />

      {/* Layered Infinity Strands */}
      <group ref={strandsGroupRef}>
        {strandPointsList.map((points, idx) => {
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const color = idx % 2 === 0 ? '#a855f7' : '#818cf8';
          return (
            <primitive
              key={`strand-${idx}`}
              object={
                new THREE.Line(
                  geometry,
                  new THREE.LineBasicMaterial({
                    color,
                    transparent: true,
                    opacity: 0,
                    blending: THREE.AdditiveBlending,
                    linewidth: 1,
                  })
                )
              }
            />
          );
        })}
      </group>

      {/* Connecting Lattice Lines */}
      <primitive
        ref={latticeLinesRef}
        object={
          new THREE.LineSegments(
            new THREE.BufferGeometry().setAttribute(
              'position',
              new THREE.BufferAttribute(latticePositions, 3)
            ),
            new THREE.LineBasicMaterial({
              color: '#c4b5fd',
              transparent: true,
              opacity: 0,
              blending: THREE.AdditiveBlending,
            })
          )
        }
      />

      {/* Instanced Luminous Particles */}
      <instancedMesh
        ref={particlesMeshRef}
        args={[undefined, undefined, config.numParticles]}
      >
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>

      {/* Instanced Major Glowing Nodes */}
      <instancedMesh
        ref={nodesMeshRef}
        args={[undefined, undefined, config.numNodes]}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>

      {/* Ambient Floating Particles */}
      <points ref={ambientPointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[ambientPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={isMobile ? 0.02 : 0.03}
          color="#a5b4fc"
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
};

// Graceful 2D Fallback for environments where WebGL is unavailable
const WebGLFallback: React.FC = () => {
  return (
    <div className="relative w-full h-[480px] sm:h-[560px] flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-radial from-primary/10 via-accent/5 to-transparent blur-3xl opacity-60" />
      <svg
        className="w-72 h-44 sm:w-96 sm:h-56 text-primary animate-pulse-subtle"
        viewBox="0 0 300 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M75,75 C25,25 0,40 0,75 C0,110 25,125 75,75 C125,25 175,25 225,75 C275,125 300,110 300,75 C300,40 275,25 225,75 C175,125 125,125 75,75 Z"
          stroke="url(#fallback-gradient)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="8 6"
          className="opacity-80"
        />
        <path
          d="M75,75 C25,25 0,40 0,75 C0,110 25,125 75,75 C125,25 175,25 225,75 C275,125 300,110 300,75 C300,40 275,25 225,75 C175,125 125,125 75,75 Z"
          stroke="url(#fallback-gradient-2)"
          strokeWidth="1.5"
          className="opacity-50"
        />
        <defs>
          <linearGradient id="fallback-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="50%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id="fallback-gradient-2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export interface InfinityKnowledgeStructureProps {
  onAssemblyComplete?: () => void;
  className?: string;
}

export const InfinityKnowledgeStructure: React.FC<InfinityKnowledgeStructureProps> = ({
  onAssemblyComplete,
  className = '',
}) => {
  const [hasWebGL, setHasWebGL] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check WebGL support
    setHasWebGL(isWebGLAvailable());

    // Check prefers-reduced-motion
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mediaQuery.matches);
      const handleMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mediaQuery.addEventListener('change', handleMotionChange);

      // Check mobile
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);

      return () => {
        mediaQuery.removeEventListener('change', handleMotionChange);
        window.removeEventListener('resize', checkMobile);
      };
    }
  }, []);

  if (!hasWebGL) {
    return <WebGLFallback />;
  }

  return (
    <div
      className={`relative w-full h-[460px] sm:h-[540px] md:h-[620px] lg:h-[680px] overflow-hidden ${className}`}
      aria-label="Interactive 3D Infinity Knowledge Structure Animation"
    >
      <Canvas
        camera={{ position: [0, 0, 5.8], fov: 48 }}
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ pointerEvents: 'auto' }}
      >
        <InfinityScene
          reducedMotion={reducedMotion}
          isMobile={isMobile}
          onAssemblyComplete={onAssemblyComplete}
        />
      </Canvas>
    </div>
  );
};
