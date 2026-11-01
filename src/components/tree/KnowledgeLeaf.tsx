import React, { useRef, useState, useEffect } from 'react';
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
  ExternalLink 
} from 'lucide-react';

interface KnowledgeLeafProps {
  tool: ToolItem;
  position: THREE.Vector3;
  branchColor: string;
  delayIndex: number;
  onSelect: (tool: ToolItem) => void;
}

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

export const KnowledgeLeaf: React.FC<KnowledgeLeafProps> = ({
  tool,
  position,
  branchColor,
  delayIndex,
  onSelect,
}) => {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [growthScale, setGrowthScale] = useState(0);

  // Progressive staggered emergence
  useEffect(() => {
    let current = 0;
    const startDelay = delayIndex * 120; // 120ms stagger per tool leaf

    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        current += 0.08;
        if (current >= 1) {
          current = 1;
          clearInterval(interval);
        }
        setGrowthScale(current);
      }, 16);
      return () => clearInterval(interval);
    }, startDelay);

    return () => clearTimeout(timeout);
  }, [delayIndex]);

  // Leaf hover animation and gentle idle float
  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();

    const targetScale = growthScale * (hovered ? 1.3 : 1.0);
    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);

    // Subtle gentle waving motion
    meshRef.current.rotation.z = Math.sin(time * 2.0 + delayIndex) * 0.08;
    meshRef.current.rotation.y = time * 0.6 + delayIndex * 0.4;
  });

  const IconComponent = tool.icon ? ICON_MAP[tool.icon] || Scale : Scale;

  return (
    <group ref={meshRef} position={position} scale={[0, 0, 0]}>
      {/* 3D Crystalline Knowledge Leaf Diamond */}
      <group
        onClick={(e) => {
          e.stopPropagation();
          onSelect(tool);
        }}
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
        {/* Invisible hit collider */}
        <mesh>
          <sphereGeometry args={[0.35, 12, 12]} />
          <meshBasicMaterial visible={false} />
        </mesh>

        {/* Outer Glowing Wireframe Diamond Leaf */}
        <mesh rotation={[0, Math.PI / 4, 0]}>
          <octahedronGeometry args={[0.22, 0]} />
          <meshStandardMaterial
            color={hovered ? '#ffffff' : branchColor}
            emissive={branchColor}
            emissiveIntensity={hovered ? 1.5 : 0.7}
            roughness={0.2}
            metalness={0.9}
            wireframe={!hovered}
          />
        </mesh>

        {/* Inner Solid Core */}
        <mesh rotation={[0, 0, 0]}>
          <octahedronGeometry args={[0.14, 0]} />
          <meshBasicMaterial
            color={hovered ? '#ffffff' : branchColor}
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Small point light for the leaf */}
        <pointLight
          color={branchColor}
          intensity={hovered ? 1.8 : 0.5}
          distance={2.5}
        />
      </group>

      {/* Anchored Tool Name Badge Label */}
      <Html
        position={[0.28, 0.15, 0]}
        center={false}
        distanceFactor={9.5}
        zIndexRange={[100, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect(tool);
          }}
          className={`pointer-events-auto cursor-pointer group flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md transition-all duration-300 whitespace-nowrap shadow-elevated ${
            hovered
              ? 'bg-black/90 border-white text-white scale-105 shadow-glow ring-2 ring-primary/40'
              : 'bg-black/75 border-white/15 text-gray-200 hover:border-white/40'
          }`}
          style={{
            borderColor: hovered ? branchColor : undefined,
          }}
        >
          <div
            className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
            style={{
              backgroundColor: `${branchColor}25`,
              color: branchColor,
            }}
          >
            <IconComponent className="w-3 h-3" />
          </div>

          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold tracking-wide font-sans">
                {tool.name}
              </span>
              <ExternalLink className="w-2.5 h-2.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {tool.description && (
              <span className="text-[10px] text-gray-400 font-light max-w-[180px] truncate hidden sm:block">
                {tool.description}
              </span>
            )}
          </div>
        </div>
      </Html>
    </group>
  );
};
