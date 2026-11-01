import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { CategoryItem, ToolItem } from '../../api/types';
import { BotanicalLeafCluster, type LeafPerch } from './BotanicalLeafCluster';

interface OrganicBranchProps {
  category: CategoryItem;
  categoryIndex: number;
  yPosition: number;
  direction: 'left' | 'right';
  isSelected: boolean;
  tools?: ToolItem[];
  onSelectCategory: (slug: string) => void;
  onSelectTool: (tool: ToolItem) => void;
}

/**
 * Procedurally builds an organic tapered tree branch with:
 * - Matching rich cedar-amber wood tones
 * - Visible connection collar at trunk
 * - Natural upward curvature and continuous tapering toward tip
 * - Perfectly balanced reach on both left and right sides so tree is centered
 */
function createTaperedBranchMesh(
  curve: THREE.CatmullRomCurve3,
  startRadius = 0.54,
  endRadius = 0.08,
  segments = 40,
  radialSegments = 16
): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const points = curve.getPoints(segments);
  const frenetFrames = curve.computeFrenetFrames(segments, false);

  for (let j = 0; j <= segments; j++) {
    const v = j / segments;
    const pt = points[j];
    const N = frenetFrames.normals[j];
    const B = frenetFrames.binormals[j];

    // Smooth organic tapering with collar flare at the base
    const flare = v < 0.16 ? Math.pow((0.16 - v) / 0.16, 2.0) * 0.25 : 0;
    const rBase = THREE.MathUtils.lerp(startRadius, endRadius, Math.pow(v, 0.72)) + flare;

    for (let i = 0; i <= radialSegments; i++) {
      const u = i / radialSegments;
      const theta = u * Math.PI * 2;

      // Subtle bark ridges along branch
      const bark =
        Math.sin(5 * theta + v * 12) * (0.05 * rBase) +
        Math.cos(8 * theta) * (0.03 * rBase);
      const r = rBase + bark;

      const cos = Math.cos(theta);
      const sin = Math.sin(theta);

      const vx = pt.x + (N.x * cos + B.x * sin) * r;
      const vy = pt.y + (N.y * cos + B.y * sin) * r;
      const vz = pt.z + (N.z * cos + B.z * sin) * r;

      vertices.push(vx, vy, vz);
      uvs.push(u, v);
    }
  }

  for (let j = 0; j < segments; j++) {
    for (let i = 0; i < radialSegments; i++) {
      const a = j * (radialSegments + 1) + i;
      const b = j * (radialSegments + 1) + (i + 1);
      const c = (j + 1) * (radialSegments + 1) + i;
      const d = (j + 1) * (radialSegments + 1) + (i + 1);
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

export const OrganicBranch: React.FC<OrganicBranchProps> = ({
  category,
  categoryIndex,
  yPosition,
  direction,
  isSelected,
  tools = [],
  onSelectCategory,
  onSelectTool,
}) => {
  const branchGroupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const isLeft = direction === 'left';
  const sign = isLeft ? -1 : 1;
  const branchColor = category.branch_position?.color || '#818cf8';

  // Procedural branch path & distinct sub-twigs for each tool
  const {
    branchGeometry,
    collarGeometry,
    twigsGeometries,
    hitGeometry,
    toolPerches,
    reach,
    rise,
  } = useMemo(() => {
    // Generous, spacious reach: when selected, branch extends in width by 20vw (~2.5+ units in 3D)
    const baseReach = 4.2 + (categoryIndex % 2) * 0.3;
    const reach = isSelected ? baseReach + 2.6 : baseReach;
    // Lower the rise when zoomed in so top leaves never crowd the upper margin
    const rise = isSelected ? 0.35 + (categoryIndex % 3) * 0.1 : 0.85 + (categoryIndex % 3) * 0.15;

    const p0 = new THREE.Vector3(0, 0, 0); // Trunk origin
    const p1 = new THREE.Vector3(sign * 1.5, -0.06, sign * 0.15); // Connection
    const p2 = new THREE.Vector3(sign * 3.4, 0.15, sign * 0.3); // Gentle lower mid-limb
    const p3 = new THREE.Vector3(sign * reach, rise, sign * 0.45); // Extended terminal tip

    const curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3]);
    const branchGeom = createTaperedBranchMesh(curve, 0.54, 0.08, 44, 16);

    // Invisible hit cylinder for effortless clicking anywhere along the branch
    const hitGeom = new THREE.TubeGeometry(curve, 18, 0.8, 8, false);

    // Collar ring bridging trunk to branch
    const collarCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(sign * 0.7, -0.04, sign * 0.1),
    ]);
    const collarGeom = new THREE.TubeGeometry(collarCurve, 10, 0.65, 12, false);

    // Well-spaced perches across the broad 20vw extended branch
    // When exactly 3 tools are present (e.g. Safety & Help: Scam Detector, Legal Aid Finder, Lawyer Preparation),
    // distribute them in a harmonious, non-linear composition around the branch:
    // 1. Scam Detector (Top-outer elevated)
    // 2. Legal Aid Finder (Mid-upper lateral)
    // 3. Lawyer Preparation (Lower-mid forward)
    const perchConfigs: Array<{
      tAttach: number;
      endPoint: THREE.Vector3;
      rotation: [number, number, number];
    }> =
      tools.length === 3
        ? [
            // Perch 0: Far outer branch tip / upper canopy (Scam Detector)
            {
              tAttach: 0.94,
              endPoint: new THREE.Vector3(sign * (reach + 0.6), rise + 0.35, sign * 0.45),
              rotation: [0.08, sign * 0.28, sign * -0.18],
            },
            // Perch 1: Mid-upper sub-twig (Legal Aid Finder)
            {
              tAttach: 0.72,
              endPoint: new THREE.Vector3(sign * (reach - 1.8), rise + 0.95, sign * -0.2),
              rotation: [0.16, sign * 0.42, sign * -0.28],
            },
            // Perch 2: Lower-forward sub-twig (Lawyer Preparation)
            {
              tAttach: 0.52,
              endPoint: new THREE.Vector3(sign * (reach - 3.4), rise - 0.75, sign * 0.85),
              rotation: [-0.14, sign * -0.32, sign * 0.26],
            },
          ]
        : [
            // Standard 4-branch layout
            // Perch 0: Far outer branch tip
            {
              tAttach: 0.96,
              endPoint: new THREE.Vector3(sign * (reach + 0.7), rise + 0.1, sign * 0.5),
              rotation: [0.08, sign * 0.3, sign * -0.2],
            },
            // Perch 1: Upper sub-twig (gently elevated)
            {
              tAttach: 0.78,
              endPoint: new THREE.Vector3(sign * (reach - 1.1), rise + 0.85, sign * 0.1),
              rotation: [0.15, sign * 0.4, sign * -0.3],
            },
            // Perch 2: Lower forward sub-twig (gently lowered)
            {
              tAttach: 0.62,
              endPoint: new THREE.Vector3(sign * (reach - 2.4), rise - 0.7, sign * 0.9),
              rotation: [-0.15, sign * -0.35, sign * 0.3],
            },
            // Perch 3: Lateral mid sub-twig
            {
              tAttach: 0.45,
              endPoint: new THREE.Vector3(sign * (reach - 3.7), rise + 0.4, sign * 0.7),
              rotation: [0.2, sign * -0.5, sign * 0.35],
            },
          ];

    const subTwigs: THREE.BufferGeometry[] = [];
    const perches: LeafPerch[] = [];

    // Map each tool to a distinct wooden sub-twig and perch
    tools.forEach((tool, index) => {
      const config = perchConfigs[index % perchConfigs.length];
      const attachPoint = curve.getPointAt(config.tAttach);

      // Mid-joint for natural organic curvature of the twig
      const midPoint = new THREE.Vector3(
        (attachPoint.x + config.endPoint.x) * 0.5,
        (attachPoint.y + config.endPoint.y) * 0.5 + 0.12,
        (attachPoint.z + config.endPoint.z) * 0.5 + 0.08
      );

      const twigCurve = new THREE.CatmullRomCurve3([attachPoint, midPoint, config.endPoint]);
      subTwigs.push(createTaperedBranchMesh(twigCurve, 0.15, 0.04, 14, 8));

      perches.push({
        tool,
        position: [config.endPoint.x, config.endPoint.y, config.endPoint.z],
        rotation: config.rotation,
      });
    });

    return {
      branchGeometry: branchGeom,
      collarGeometry: collarGeom,
      twigsGeometries: subTwigs,
      hitGeometry: hitGeom,
      toolPerches: perches,
      reach,
      rise,
    };
  }, [sign, categoryIndex, tools, isSelected]);

  // Entrance transition: smoothly interpolates branch extension when selected
  const animProgress = useRef(isSelected ? 0 : 1);
  useFrame((state, delta) => {
    if (!branchGroupRef.current) return;
    const t = state.clock.getElapsedTime();

    // Gentle organic branch sway
    const sway = Math.sin(t * 1.2 + categoryIndex * 1.5) * 0.012;
    branchGroupRef.current.rotation.z = sway;

    // Smooth subtle branch entrance scale easing when selected
    if (isSelected && animProgress.current < 1) {
      animProgress.current = Math.min(1, animProgress.current + delta * 2.2);
      const ease = 1 - Math.pow(1 - animProgress.current, 3);
      branchGroupRef.current.scale.set(ease, ease, ease);
    } else if (!isSelected) {
      animProgress.current = 0;
      branchGroupRef.current.scale.set(1, 1, 1);
    }
  });

  return (
    <group
      ref={branchGroupRef}
      position={[0, yPosition, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelectCategory(category.slug);
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
      {/* Invisible broad hit mesh for smooth click interaction */}
      <mesh geometry={hitGeometry}>
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Flared Collar connecting to trunk in matching warm cedar-amber */}
      <mesh geometry={collarGeometry}>
        <meshStandardMaterial
          color="#755032"
          roughness={0.55}
          metalness={0.16}
          emissive="#382212"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Main Tapered Branch Limb — clean organic wood, no cards on it */}
      <mesh geometry={branchGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={hovered || isSelected ? '#8a603d' : '#755032'}
          roughness={0.52}
          metalness={0.18}
          emissive={isSelected ? branchColor : '#382212'}
          emissiveIntensity={isSelected ? 0.38 : hovered ? 0.25 : 0.15}
        />
      </mesh>

      {/* Subtle bark ridge contour wireframe highlight */}
      <mesh geometry={branchGeometry} scale={[1.008, 1.008, 1.008]}>
        <meshBasicMaterial
          color={isSelected ? branchColor : '#a37648'}
          wireframe
          transparent
          opacity={isSelected ? 0.45 : hovered ? 0.3 : 0.15}
        />
      </mesh>

      {/* Wooden sub-twigs holding each tool leaf */}
      {twigsGeometries.map((geom, idx) => (
        <mesh key={`twig-${idx}`} geometry={geom}>
          <meshStandardMaterial
            color="#755032"
            roughness={0.55}
            metalness={0.16}
            emissive={isSelected ? branchColor : '#382212'}
            emissiveIntensity={isSelected ? 0.35 : 0.12}
          />
        </mesh>
      ))}

      {/* Clean, minimalist Category Name label on the main branch */}
      <Html
        position={[sign * (reach * 0.72), rise + 0.5, sign * 0.45]}
        center
        distanceFactor={11}
        zIndexRange={[80, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelectCategory(category.slug);
          }}
          className={`pointer-events-auto cursor-pointer transition-all duration-300 select-none px-3.5 py-1.5 rounded-full border backdrop-blur-md ${
            isSelected
              ? 'bg-black/90 text-white border-white/60 shadow-[0_0_25px_rgba(255,255,255,0.3)] scale-105'
              : hovered
              ? 'bg-black/80 text-white border-white/40 scale-102 shadow-md'
              : 'bg-black/60 text-gray-200/90 border-white/15 hover:border-white/40'
          }`}
          style={{
            borderColor: isSelected || hovered ? branchColor : undefined,
          }}
        >
          <span className="text-xs sm:text-sm font-light tracking-[0.12em] uppercase font-sans whitespace-nowrap">
            {category.name}
          </span>
        </div>
      </Html>

      {/* 
        Multiple Botanical Leaves across the branch:
        Each leaf has its own distinct perch on its own twig, and redirects to its sub-component!
      */}
      {isSelected && toolPerches.length > 0 && (
        <BotanicalLeafCluster
          perches={toolPerches}
          branchColor={branchColor}
          isSelectedBranch={isSelected}
          onSelectTool={onSelectTool}
        />
      )}
    </group>
  );
};
