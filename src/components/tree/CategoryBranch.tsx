import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { CategoryItem, ToolItem } from '../../api/types';
import { KnowledgeLeaf } from './KnowledgeLeaf';
import { ChevronRight, Layers } from 'lucide-react';

interface CategoryBranchProps {
  category: CategoryItem;
  isSelected: boolean;
  isAnySelected: boolean;
  tools?: ToolItem[];
  onSelectCategory: (slug: string) => void;
  onSelectTool: (tool: ToolItem) => void;
}

export const CategoryBranch: React.FC<CategoryBranchProps> = ({
  category,
  isSelected,
  isAnySelected,
  tools = [],
  onSelectCategory,
  onSelectTool,
}) => {
  const branchGroupRef = useRef<THREE.Group>(null);
  const mainBranchMeshRef = useRef<THREE.Mesh>(null);
  const [labelHovered, setLabelHovered] = useState(false);

  const { height, angle, radius, color } = category.branch_position;

  // Extension factor when selected (grows outward)
  const currentLengthRef = useRef(radius);
  const targetRadius = isSelected ? radius + 1.3 : radius;

  // Build curved 3D branch tube geometry
  const { branchGeometry, twigData } = useMemo(() => {
    // Generate curved path from trunk out toward tip
    const p0 = new THREE.Vector3(0, 0, 0);
    const p1 = new THREE.Vector3(radius * 0.4, Math.sin(angle * 2) * 0.2, 0);
    const p2 = new THREE.Vector3(radius, 0.2, 0);

    const curve = new THREE.CatmullRomCurve3([p0, p1, p2]);
    const geom = new THREE.TubeGeometry(curve, 32, 0.16, 12, false);

    // Sub-twigs branching off when category is selected
    // Distributed along the outer half of the branch
    const twigs: Array<{
      start: THREE.Vector3;
      end: THREE.Vector3;
      geometry: THREE.TubeGeometry;
      leafPos: THREE.Vector3;
    }> = [];

    const numTwigs = Math.max(tools.length, 2);
    for (let i = 0; i < numTwigs; i++) {
      const t = 0.45 + (i / numTwigs) * 0.5; // along outer half
      const basePt = curve.getPointAt(t);

      // Alternate branch direction up/down and forward/back
      const side = i % 2 === 0 ? 1 : -1;
      const twigLen = 1.2 + (i % 3) * 0.3;
      const endPt = new THREE.Vector3(
        basePt.x + twigLen * 0.4,
        basePt.y + side * 0.7 + (i * 0.15),
        basePt.z + side * (0.8 + (i * 0.2))
      );

      const twigCurve = new THREE.CatmullRomCurve3([basePt, endPt]);
      const twigGeom = new THREE.TubeGeometry(twigCurve, 16, 0.05, 8, false);

      twigs.push({
        start: basePt,
        end: endPt,
        geometry: twigGeom,
        leafPos: endPt,
      });
    }

    return {
      branchGeometry: geom,
      twigData: twigs,
    };
  }, [radius, angle, tools.length]);

  // Frame animation: smooth extension & subtle breathing
  useFrame((state, delta) => {
    if (!branchGroupRef.current) return;
    const time = state.clock.getElapsedTime();

    // Lerp branch extension
    currentLengthRef.current = THREE.MathUtils.lerp(
      currentLengthRef.current,
      targetRadius,
      delta * 5.0
    );

    const scaleFactor = currentLengthRef.current / radius;
    if (mainBranchMeshRef.current) {
      mainBranchMeshRef.current.scale.set(scaleFactor, 1, 1);
    }

    // Subtle breathing on Y
    branchGroupRef.current.position.y =
      height + Math.sin(time * 1.5 + category.sort_order) * 0.05;
  });

  const isDimmed = isAnySelected && !isSelected;
  const branchOpacity = isDimmed ? 0.35 : 1.0;
  const branchEmissiveIntensity = isSelected ? 1.6 : isDimmed ? 0.15 : 0.65;

  return (
    <group
      ref={branchGroupRef}
      position={[0, height, 0]}
      rotation={[0, angle, 0]}
    >
      {/* Trunk Connection Junction Ring */}
      <mesh position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.55, 0.08, 8, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={branchEmissiveIntensity}
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>

      {/* Main 3D Branch Limb */}
      <mesh
        ref={mainBranchMeshRef}
        geometry={branchGeometry}
        onClick={(e) => {
          e.stopPropagation();
          onSelectCategory(category.slug);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setLabelHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setLabelHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <meshStandardMaterial
          color={isSelected ? '#ffffff' : color}
          emissive={color}
          emissiveIntensity={branchEmissiveIntensity}
          roughness={0.25}
          metalness={0.8}
          transparent
          opacity={branchOpacity}
        />
      </mesh>

      {/* Branch Tip Beacon Orb */}
      <mesh
        position={[targetRadius, 0.2, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectCategory(category.slug);
        }}
      >
        <sphereGeometry args={[isSelected ? 0.28 : 0.22, 16, 16]} />
        <meshBasicMaterial
          color={isSelected ? '#ffffff' : color}
          transparent
          opacity={branchOpacity}
        />
        <pointLight
          color={color}
          intensity={isSelected ? 3.0 : isDimmed ? 0.3 : 1.2}
          distance={4.0}
        />
      </mesh>

      {/* Sprouted Sub-Twigs and Knowledge Leaves (Rendered when selected) */}
      {isSelected && (
        <group>
          {twigData.map((twig, idx) => {
            const tool = tools[idx];
            return (
              <React.Fragment key={`twig-${idx}`}>
                {/* 3D Twig geometry */}
                <mesh geometry={twig.geometry}>
                  <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={1.2}
                    roughness={0.3}
                    metalness={0.8}
                  />
                </mesh>

                {/* Tool Leaf situated at twig tip */}
                {tool && (
                  <KnowledgeLeaf
                    tool={tool}
                    position={twig.leafPos}
                    branchColor={color}
                    delayIndex={idx}
                    onSelect={onSelectTool}
                  />
                )}
              </React.Fragment>
            );
          })}
        </group>
      )}

      {/* Anchored 3D Category Label */}
      <Html
        position={[targetRadius + 0.45, 0.3, 0]}
        center={false}
        distanceFactor={10.0}
        zIndexRange={[90, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelectCategory(category.slug);
          }}
          className={`pointer-events-auto cursor-pointer group flex items-center gap-2.5 px-4 py-2 rounded-2xl border transition-all duration-300 backdrop-blur-md select-none ${
            isSelected
              ? 'bg-black/90 text-white scale-110 shadow-glow'
              : isDimmed
              ? 'bg-black/50 text-gray-400 hover:text-white border-white/10 opacity-70 hover:opacity-100'
              : 'bg-black/75 text-gray-200 hover:text-white hover:border-white/40 border-white/20'
          }`}
          style={{
            borderColor: isSelected || labelHovered ? color : undefined,
            boxShadow: isSelected ? `0 0 25px ${color}50` : undefined,
          }}
        >
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform group-hover:scale-125"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 10px ${color}`,
            }}
          />

          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-semibold tracking-wide font-sans">
                {category.name}
              </span>
              <ChevronRight
                className={`w-3.5 h-3.5 transition-transform duration-300 ${
                  isSelected ? 'rotate-90 text-primary' : 'group-hover:translate-x-0.5'
                }`}
              />
            </div>
            <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
              <Layers className="w-2.5 h-2.5" />
              <span>{category.tools?.length || (tools.length > 0 ? tools.length : 'Tools')} available</span>
            </span>
          </div>
        </div>
      </Html>
    </group>
  );
};
