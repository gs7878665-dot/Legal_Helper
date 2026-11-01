import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface TreeTrunkProps {
  height?: number;
  segments?: number;
}

export const TreeTrunk: React.FC<TreeTrunkProps> = ({
  height = 16.0,
  segments = 80,
}) => {
  const ringsGroupRef = useRef<THREE.Group>(null);
  const glowLightRef = useRef<THREE.PointLight>(null);

  // Generate helical spline path for central trunk
  const { trunkCurve, trunkGeometry, coreVeinsGeometry } = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const veinPoints: THREE.Vector3[][] = [[], [], []];

    const minY = -height / 2;
    const maxY = height / 2;
    const step = height / segments;

    for (let y = minY; y <= maxY; y += step) {
      // Gentle helical twist along Y
      const angle = y * 0.28;
      const radius = 0.38 + Math.sin(y * 0.5) * 0.08;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      const pt = new THREE.Vector3(x, y, z);
      points.push(pt);

      // Braided luminous energy veins winding around trunk
      for (let v = 0; v < 3; v++) {
        const veinAngle = angle + (v * (Math.PI * 2)) / 3 + y * 0.45;
        const vRadius = radius + 0.12;
        veinPoints[v].push(
          new THREE.Vector3(
            x + Math.sin(veinAngle) * vRadius,
            y,
            z + Math.cos(veinAngle) * vRadius
          )
        );
      }
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(curve, segments, 0.42, 16, false);

    const veinGeometries = veinPoints.map((pts) => {
      const vCurve = new THREE.CatmullRomCurve3(pts);
      return new THREE.TubeGeometry(vCurve, segments, 0.035, 8, false);
    });

    return {
      trunkCurve: curve,
      trunkGeometry: geometry,
      coreVeinsGeometry: veinGeometries,
    };
  }, [height, segments]);

  // Precomputed rings along the trunk acting as structural helix nodes
  const ringNodes = useMemo(() => {
    const nodes = [];
    for (let y = -6.5; y <= 6.5; y += 1.8) {
      const pt = trunkCurve.getPointAt((y + 8) / 16);
      nodes.push({ pos: pt, y });
    }
    return nodes;
  }, [trunkCurve]);

  // Gentle idle pulse on trunk energy
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (ringsGroupRef.current) {
      ringsGroupRef.current.rotation.y = time * 0.08;
    }
    if (glowLightRef.current) {
      glowLightRef.current.intensity = 2.2 + Math.sin(time * 2.0) * 0.5;
    }
  });

  return (
    <group>
      {/* Central Ambient Point Light inside trunk */}
      <pointLight
        ref={glowLightRef}
        position={[0, 0, 0]}
        color="#818cf8"
        intensity={2.5}
        distance={12}
        decay={2}
      />

      {/* Main Solid Obsidian Trunk Tube */}
      <mesh geometry={trunkGeometry}>
        <meshStandardMaterial
          color="#090814"
          roughness={0.25}
          metalness={0.88}
          emissive="#1e1838"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Braided Luminous Veins wrapping around the trunk */}
      {coreVeinsGeometry.map((vGeom, idx) => (
        <mesh key={`vein-${idx}`} geometry={vGeom}>
          <meshBasicMaterial
            color={idx === 0 ? '#c084fc' : idx === 1 ? '#818cf8' : '#38bdf8'}
            transparent
            opacity={0.85}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}

      {/* Structural Helix Conduit Rings */}
      <group ref={ringsGroupRef}>
        {ringNodes.map((node, idx) => (
          <mesh key={`ring-${idx}`} position={node.pos}>
            <torusGeometry args={[0.58, 0.035, 8, 36]} />
            <meshStandardMaterial
              color="#3730a3"
              emissive="#818cf8"
              emissiveIntensity={0.6}
              roughness={0.2}
              metalness={0.9}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};
