import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface OrganicTrunkProps {
  bottomY?: number;
  topY?: number;
  radialSegments?: number;
  heightSegments?: number;
  onTrunkClick?: () => void;
}

/**
 * Procedurally generates an organic, prominent, highly visible tree trunk with:
 * - Rich, warm amber-cedar wood tones clearly visible against dark backgrounds
 * - Substantial girth and volumetric silhouette
 * - Flared buttress base and natural tapering toward crown
 * - Visible longitudinal bark ridges, fluting, and organic sap veins
 */
function createOrganicTrunkGeometry(
  bottomY = -24,
  topY = 18,
  radialSegments = 36,
  heightSegments = 96
): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Spine trajectory function (natural subtle organic lean)
  const getSpinePoint = (y: number) => {
    const x = Math.sin(y * 0.16) * 0.38 + Math.cos(y * 0.07) * 0.22;
    const z = Math.cos(y * 0.12) * 0.28 - Math.sin(y * 0.05) * 0.16;
    return new THREE.Vector3(x, y, z);
  };

  // Base radius: substantial girth, wide buttress flare, majestic presence
  const getBaseRadius = (y: number) => {
    const t = (y - bottomY) / (topY - bottomY);
    if (t < 0.22) {
      const flare = Math.pow((0.22 - t) / 0.22, 2.0);
      return 2.2 + flare * 2.4; // up to 4.6 at root flares
    }
    // Prominent thick trunk: 2.2 tapering down to 1.15 at crown
    return 2.2 - Math.pow(t, 0.72) * 1.05;
  };

  for (let j = 0; j <= heightSegments; j++) {
    const v = j / heightSegments;
    const y = bottomY + v * (topY - bottomY);
    const spine = getSpinePoint(y);
    const baseR = getBaseRadius(y);

    for (let i = 0; i <= radialSegments; i++) {
      const u = i / radialSegments;
      const theta = u * Math.PI * 2;

      // Prominent longitudinal bark ridges & organic furrows
      const barkNoise =
        Math.sin(6 * theta + y * 0.45) * 0.12 +
        Math.cos(10 * theta - y * 0.75) * 0.06 +
        Math.sin(3 * theta + y * 0.2) * 0.14;

      // Root buttress fluting near bottom
      const rootFluting =
        v < 0.3
          ? Math.pow(Math.cos(4 * theta), 4) * (0.3 - v) * 3.0
          : 0;

      const r = baseR * (1 + barkNoise) + rootFluting;

      const px = spine.x + Math.sin(theta) * r;
      const pz = spine.z + Math.cos(theta) * r;
      const py = y;

      vertices.push(px, py, pz);
      uvs.push(u, v);
    }
  }

  for (let j = 0; j < heightSegments; j++) {
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

export const OrganicTrunk: React.FC<OrganicTrunkProps> = ({
  bottomY = -24,
  topY = 18,
  onTrunkClick,
}) => {
  const glowLightRef = useRef<THREE.PointLight>(null);

  const trunkGeometry = useMemo(() => {
    return createOrganicTrunkGeometry(bottomY, topY, 36, 96);
  }, [bottomY, topY]);

  // Luminous sap veins winding up the prominent trunk stem
  const sapVeinGeometries = useMemo(() => {
    const veins: THREE.BufferGeometry[] = [];
    const numVeins = 3;

    for (let v = 0; v < numVeins; v++) {
      const pts: THREE.Vector3[] = [];
      const vOffset = (v * Math.PI * 2) / numVeins;

      for (let y = bottomY + 2; y <= topY - 1; y += 1.0) {
        const t = (y - bottomY) / (topY - bottomY);
        const angle = y * 0.18 + vOffset;
        const r = (2.2 - Math.pow(t, 0.72) * 1.05) + 0.1;
        const x = Math.sin(angle) * r + Math.sin(y * 0.16) * 0.38;
        const z = Math.cos(angle) * r + Math.cos(y * 0.12) * 0.28;
        pts.push(new THREE.Vector3(x, y, z));
      }

      const curve = new THREE.CatmullRomCurve3(pts);
      veins.push(new THREE.TubeGeometry(curve, 64, 0.045, 8, false));
    }

    return veins;
  }, [bottomY, topY]);

  // Canopy crown limbs (branching at the top of the tree)
  const canopyCrownGeometries = useMemo(() => {
    const limbs = [
      [new THREE.Vector3(0, 16.5, 0), new THREE.Vector3(-1.6, 19.5, 0.5), new THREE.Vector3(-2.8, 22.0, 1.0)],
      [new THREE.Vector3(0, 16.5, 0), new THREE.Vector3(1.5, 19.2, -0.4), new THREE.Vector3(2.6, 21.8, -0.8)],
      [new THREE.Vector3(0, 16.5, 0), new THREE.Vector3(0.3, 20.0, -1.2), new THREE.Vector3(0.6, 22.8, -2.2)],
    ];

    return limbs.map((pts) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      return new THREE.TubeGeometry(curve, 20, 0.32, 10, false);
    });
  }, []);

  useFrame((state) => {
    if (glowLightRef.current) {
      const t = state.clock.getElapsedTime();
      glowLightRef.current.intensity = 2.6 + Math.sin(t * 1.5) * 0.4;
    }
  });

  return (
    <group
      onClick={(e) => {
        if (onTrunkClick) {
          e.stopPropagation();
          onTrunkClick();
        }
      }}
      onPointerOver={(e) => {
        if (onTrunkClick) {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={() => {
        if (onTrunkClick) {
          document.body.style.cursor = 'auto';
        }
      }}
    >
      {/* Main Prominent Organic Trunk Mesh with rich visible cedar-amber bark */}
      <mesh geometry={trunkGeometry} receiveShadow castShadow>
        <meshStandardMaterial
          color="#7c5535"
          roughness={0.52}
          metalness={0.18}
          emissive="#382212"
          emissiveIntensity={0.35}
        />
      </mesh>

      {/* Prominent Bark Ridge Contour Highlight Overlay */}
      <mesh geometry={trunkGeometry} scale={[1.006, 1.0, 1.006]}>
        <meshStandardMaterial
          color="#a37648"
          roughness={0.4}
          metalness={0.25}
          wireframe
          transparent
          opacity={0.32}
        />
      </mesh>

      {/* Luminous Sap Veins along Trunk Stem */}
      {sapVeinGeometries.map((geom, idx) => (
        <mesh key={`vein-${idx}`} geometry={geom}>
          <meshStandardMaterial
            color="#c084fc"
            emissive="#a855f7"
            emissiveIntensity={1.4}
            roughness={0.2}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}

      {/* Canopy crown limbs in matching cedar wood */}
      {canopyCrownGeometries.map((geom, idx) => (
        <mesh key={`crown-${idx}`} geometry={geom}>
          <meshStandardMaterial
            color="#7c5535"
            roughness={0.55}
            metalness={0.15}
            emissive="#382212"
            emissiveIntensity={0.25}
          />
        </mesh>
      ))}

      {/* Dedicated Stem Key Illumination Lights */}
      <pointLight
        ref={glowLightRef}
        position={[0, 4.5, 4.0]}
        color="#ffecd1"
        intensity={3.2}
        distance={20}
        decay={1.8}
      />
      <pointLight
        position={[0, -5.5, 4.0]}
        color="#ffe2b8"
        intensity={2.8}
        distance={20}
        decay={1.8}
      />
      <pointLight
        position={[0, -15.5, 4.5]}
        color="#fcd34d"
        intensity={2.6}
        distance={20}
        decay={1.8}
      />
    </group>
  );
};
