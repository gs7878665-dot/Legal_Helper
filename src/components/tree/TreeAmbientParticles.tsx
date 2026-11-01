import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface TreeAmbientParticlesProps {
  count?: number;
}

export const TreeAmbientParticles: React.FC<TreeAmbientParticlesProps> = ({
  count = 220,
}) => {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const palette = [
      new THREE.Color('#c084fc'),
      new THREE.Color('#818cf8'),
      new THREE.Color('#38bdf8'),
      new THREE.Color('#ffffff'),
    ];

    for (let i = 0; i < count; i++) {
      // Atmospheric distribution around tall vertical tree
      const y = (Math.random() - 0.5) * 36;
      const angle = Math.random() * Math.PI * 2;
      const radius = 3.5 + Math.random() * 10;

      pos[i * 3] = Math.sin(angle) * radius;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.cos(angle) * radius;

      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }

    return [pos, col];
  }, [count]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const time = state.clock.getElapsedTime();
    pointsRef.current.rotation.y = time * 0.04;
    pointsRef.current.position.y = Math.sin(time * 0.5) * 0.15;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.65}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
