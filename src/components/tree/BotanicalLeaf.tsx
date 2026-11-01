import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { ToolItem } from '../../api/types';
import {
  Sparkles,
  Search,
  FileText,
  PenTool,
  Mail,
  FolderLock,
  ShieldAlert,
  Clock,
  Briefcase,
  HeartHandshake,
  Calculator,
  Hash,
  Scale,
  ArrowUpRight,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  sparkles: Sparkles,
  search: Search,
  'file-text': FileText,
  'pen-tool': PenTool,
  mail: Mail,
  'folder-lock': FolderLock,
  'shield-alert': ShieldAlert,
  clock: Clock,
  briefcase: Briefcase,
  'heart-handshake': HeartHandshake,
  calculator: Calculator,
  hash: Hash,
  scale: Scale,
};

/**
 * Creates custom 3D botanical leaf geometry with natural lanceolate silhouette,
 * central midrib fold, and natural downward blade curl.
 */
export function createBotanicalLeafGeometry(
  length = 1.0,
  maxWidth = 0.48,
  curl = 0.18
): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const segmentsX = 8;
  const segmentsY = 16;
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= segmentsY; j++) {
    const v = j / segmentsY; // 0 (stem base) to 1 (pointed apex)
    // Botanical lanceolate leaf profile: tapers to sharp apex
    const widthFactor = Math.sin(Math.pow(v, 0.7) * Math.PI) * Math.pow(1.05 - v * 0.35, 0.6);
    const halfW = (maxWidth * 0.5) * Math.max(0, widthFactor);
    const yPos = v * length;
    // Downward arching curl
    const zCurl = -Math.sin(v * Math.PI * 0.85) * curl;

    for (let i = 0; i <= segmentsX; i++) {
      const u = (i / segmentsX) * 2 - 1; // -1 (left edge) to 0 (midrib) to +1 (right edge)
      const xPos = u * halfW;
      // Slight V-gutter along the central midrib
      const zVee = (1 - Math.abs(u)) * 0.04;
      const zPos = zCurl + zVee;

      vertices.push(xPos, yPos, zPos);
      uvs.push((u + 1) * 0.5, v);
    }
  }

  for (let j = 0; j < segmentsY; j++) {
    for (let i = 0; i < segmentsX; i++) {
      const a = j * (segmentsX + 1) + i;
      const b = j * (segmentsX + 1) + (i + 1);
      const c = (j + 1) * (segmentsX + 1) + i;
      const d = (j + 1) * (segmentsX + 1) + (i + 1);
      indices.push(a, b, d);
      indices.push(a, d, c);
    }
  }

  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

interface BotanicalLeafProps {
  tool: ToolItem;
  position: [number, number, number];
  rotation: [number, number, number];
  accentColor: string;
  delayIndex: number;
  isSelectedBranch: boolean;
  onSelect: (tool: ToolItem) => void;
}

/**
 * Botanical Leaf Node:
 * Renders an interactive tool leaf, companion foliage leaves, and an anchored badge
 * that directly redirects to that tool's component route.
 */
export const BotanicalLeaf: React.FC<BotanicalLeafProps> = ({
  tool,
  position,
  rotation,
  accentColor,
  delayIndex,
  isSelectedBranch,
  onSelect,
}) => {
  const leafGroupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Generate leaf geometry & petiole stem once
  const { bladeGeometry, petioleGeometry, midribGeometry, companionGeometry } = useMemo(() => {
    const blade = createBotanicalLeafGeometry(1.1, 0.52, 0.2);
    const companion = createBotanicalLeafGeometry(0.85, 0.4, 0.16);

    // Stem connecting twig to leaf base
    const pCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.28, 0),
      new THREE.Vector3(0.02, -0.12, -0.01),
      new THREE.Vector3(0, 0, 0),
    ]);
    const petiole = new THREE.TubeGeometry(pCurve, 8, 0.024, 6, false);

    // Central midrib spine along the leaf
    const mCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0.02),
      new THREE.Vector3(0, 0.55, -0.05),
      new THREE.Vector3(0, 1.1, -0.15),
    ]);
    const midrib = new THREE.TubeGeometry(mCurve, 14, 0.016, 6, false);

    return {
      bladeGeometry: blade,
      petioleGeometry: petiole,
      midribGeometry: midrib,
      companionGeometry: companion,
    };
  }, []);

  // Staggered entrance animation: each leaf and its label bloom in closely coordinated sequence
  const bloomProgress = useRef(0);
  const [bloomScale, setBloomScale] = useState(0);

  // Natural breeze sway and entrance scale
  useFrame((state, delta) => {
    if (!leafGroupRef.current) return;
    const t = state.clock.getElapsedTime();

    // Subtle, restrained flutter
    const flutter = Math.sin(t * 1.5 + delayIndex * 1.2) * 0.035;
    leafGroupRef.current.rotation.z = rotation[2] + flutter;

    // Staggered bloom: delayed slightly by delayIndex (~0.12s per item)
    if (bloomProgress.current < 1) {
      const delay = delayIndex * 0.12;
      if (t > delay) {
        bloomProgress.current = Math.min(1, bloomProgress.current + delta * 2.8);
        const ease = 1 - Math.pow(1 - bloomProgress.current, 3);
        setBloomScale(ease);
      }
    }

    const hoverMultiplier = hovered ? 1.15 : 1.0;
    const currentScale = bloomScale * hoverMultiplier;
    leafGroupRef.current.scale.lerp(
      new THREE.Vector3(currentScale, currentScale, currentScale),
      0.18
    );
  });

  const IconComponent = tool.icon ? ICON_MAP[tool.icon] || Scale : Scale;

  const handleClick = (e: any) => {
    e.stopPropagation();
    onSelect(tool);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(tool);
    }
  };

  return (
    <group
      ref={leafGroupRef}
      position={position}
      rotation={rotation}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Invisible broad hit sphere for easy clicking */}
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.7, 8, 8]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Main Petiole Stem */}
      <mesh geometry={petioleGeometry}>
        <meshStandardMaterial
          color="#422e1d"
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Central Luminous Midrib Vein */}
      <mesh geometry={midribGeometry}>
        <meshStandardMaterial
          color={hovered ? '#ffffff' : accentColor}
          emissive={accentColor}
          emissiveIntensity={hovered ? 1.4 : 0.6}
          roughness={0.2}
        />
      </mesh>

      {/* Primary Botanical Leaf Blade */}
      <mesh geometry={bladeGeometry}>
        <meshStandardMaterial
          color={hovered ? '#1a382c' : '#142920'}
          roughness={0.42}
          metalness={0.2}
          side={THREE.DoubleSide}
          emissive={accentColor}
          emissiveIntensity={hovered ? 0.6 : isSelectedBranch ? 0.28 : 0.15}
        />
      </mesh>

      {/* Subtle outer glowing wireframe contour */}
      <mesh geometry={bladeGeometry} scale={[1.015, 1.015, 1.015]}>
        <meshBasicMaterial
          color={accentColor}
          wireframe
          transparent
          opacity={hovered ? 0.75 : 0.3}
        />
      </mesh>

      {/* Companion foliage leaf 1 (adds rich botanical leaf volume) */}
      <group position={[-0.15, -0.05, 0.08]} rotation={[0.2, -0.45, -0.55]} scale={[0.85, 0.85, 0.85]}>
        <mesh geometry={companionGeometry}>
          <meshStandardMaterial
            color="#142920"
            roughness={0.5}
            metalness={0.15}
            side={THREE.DoubleSide}
            emissive={accentColor}
            emissiveIntensity={0.15}
          />
        </mesh>
      </group>

      {/* Companion foliage leaf 2 */}
      <group position={[0.18, 0.05, -0.08]} rotation={[-0.15, 0.4, 0.5]} scale={[0.8, 0.8, 0.8]}>
        <mesh geometry={companionGeometry}>
          <meshStandardMaterial
            color="#142920"
            roughness={0.5}
            metalness={0.15}
            side={THREE.DoubleSide}
            emissive={accentColor}
            emissiveIntensity={0.15}
          />
        </mesh>
      </group>

      {/* Floating Feature Component Badge above this leaf — redirects to tool route */}
      <Html
        position={[0, 1.25, 0.15]}
        center
        distanceFactor={10.5}
        zIndexRange={[100, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <button
          type="button"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
          className={`pointer-events-auto cursor-pointer group flex items-center gap-2.5 px-3.5 py-2 rounded-xl border backdrop-blur-md transition-all duration-300 select-none outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
            hovered
              ? 'bg-[#090b14]/95 border-cyan-400 text-white scale-108 shadow-[0_0_25px_rgba(56,189,248,0.35)] -translate-y-0.5'
              : 'bg-[#05070e]/85 border-cyan-500/30 text-gray-200 shadow-lg hover:border-cyan-400/60'
          }`}
          style={{
            borderColor: hovered ? '#38bdf8' : 'rgba(56, 189, 248, 0.35)',
            opacity: bloomScale,
            transform: `scale(${bloomScale})`,
          }}
          aria-label={tool.name}
        >
          <div
            className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-110 shadow-sm"
            style={{
              backgroundColor: hovered ? 'rgba(56, 189, 248, 0.25)' : 'rgba(56, 189, 248, 0.15)',
              color: hovered ? '#ffffff' : '#38bdf8',
            }}
          >
            <IconComponent className="w-3.5 h-3.5" />
          </div>

          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-xs font-medium tracking-wide font-sans text-white/95 group-hover:text-cyan-300 transition-colors">
              {tool.name}
            </span>
            <ArrowUpRight className="w-3 h-3 text-cyan-400/70 group-hover:text-cyan-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </button>
      </Html>
    </group>
  );
};
