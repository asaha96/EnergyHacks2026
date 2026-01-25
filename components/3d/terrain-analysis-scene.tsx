'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  PerspectiveCamera,
  Float,
  Sparkles
} from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import type { AnalysisPhase } from '@/components/agent';

export interface TerrainHeightmap {
  width: number;
  height: number;
  data: number[];
}

function normalizeHeightmap(heightmap: TerrainHeightmap) {
  const { data } = heightmap;
  const normalized = new Float32Array(data.length);
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const value of data) {
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  const range = max - min || 1;
  for (let i = 0; i < data.length; i++) {
    normalized[i] = (data[i] - min) / range;
  }

  return normalized;
}

// Generate realistic terrain heightmap using multiple noise octaves
function generateTerrainData(width: number, height: number, seed: number = 42) {
  const data = new Float32Array(width * height);

  const random = (x: number, y: number) => {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453123;
    return n - Math.floor(n);
  };

  const smoothNoise = (x: number, y: number, scale: number) => {
    const x0 = Math.floor(x / scale);
    const y0 = Math.floor(y / scale);
    const fx = (x / scale) - x0;
    const fy = (y / scale) - y0;

    const v00 = random(x0, y0);
    const v10 = random(x0 + 1, y0);
    const v01 = random(x0, y0 + 1);
    const v11 = random(x0 + 1, y0 + 1);

    const i1 = v00 * (1 - fx) + v10 * fx;
    const i2 = v01 * (1 - fx) + v11 * fx;

    return i1 * (1 - fy) + i2 * fy;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let elevation = 0;
      elevation += smoothNoise(x, y, 32) * 1.0;
      elevation += smoothNoise(x, y, 16) * 0.5;
      elevation += smoothNoise(x, y, 8) * 0.25;
      elevation += smoothNoise(x, y, 4) * 0.125;

      const cx = x - width / 2;
      const cy = y - height / 2;
      const distFromCenter = Math.sqrt(cx * cx + cy * cy) / (width / 2);
      elevation += Math.max(0, 1 - distFromCenter * 1.2) * 0.5;
      elevation += Math.sin(x * 0.05) * Math.cos(y * 0.07) * 0.3;

      data[y * width + x] = elevation;
    }
  }

  return data;
}

// Enhanced terrain mesh with progressive detail and lush green colors
function TerrainMesh({
  phase,
  progress,
<<<<<<< Updated upstream
  revealProgress
}: {
=======
  revealProgress,
  heightmap
}: { 
>>>>>>> Stashed changes
  phase: AnalysisPhase;
  progress: number;
  revealProgress: number;
  heightmap?: TerrainHeightmap | null;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
<<<<<<< Updated upstream

  const resolution = 128;
  const terrainData = useMemo(() => generateTerrainData(resolution, resolution), []);

=======
  
  const width = heightmap?.width ?? 128;
  const height = heightmap?.height ?? 128;
  const terrainData = useMemo(() => {
    if (!heightmap?.data || heightmap.data.length !== width * height) {
      return generateTerrainData(width, height);
    }

    return normalizeHeightmap(heightmap);
  }, [heightmap, width, height]);
  
>>>>>>> Stashed changes
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(10, 10, width - 1, height - 1);
    const positions = geo.attributes.position.array as Float32Array;

    for (let i = 0; i < terrainData.length; i++) {
      const elevation = terrainData[i];
      positions[i * 3 + 2] = elevation * 1.5;
    }

    geo.computeVertexNormals();
    return geo;
  }, [terrainData, width, height]);

  // Beautiful lush green shader with progressive reveal
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uRevealProgress: { value: 0 },
        uPhase: { value: 0 },
        uScanLine: { value: 0 },
        uElevationScale: { value: 0 },
      },
      vertexShader: `
        uniform float uRevealProgress;
        uniform float uElevationScale;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vElevation;
        varying float vReveal;
        
        void main() {
          vUv = uv;
          
          // Progressive elevation reveal - terrain rises from flat
          float targetZ = position.z;
          float revealedZ = targetZ * uElevationScale;
          
          vec3 newPosition = vec3(position.x, position.y, revealedZ);
          vPosition = newPosition;
          vElevation = targetZ;
          
          // Calculate reveal based on distance from center
          float distFromCenter = length(uv - 0.5) * 2.0;
          vReveal = smoothstep(distFromCenter, distFromCenter + 0.3, uRevealProgress * 1.5);
          
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uProgress;
        uniform float uRevealProgress;
        uniform float uPhase;
        uniform float uScanLine;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vElevation;
        varying float vReveal;
        
        // Lush green color palette
        vec3 deepForest = vec3(0.05, 0.22, 0.12);
        vec3 forestGreen = vec3(0.13, 0.35, 0.18);
        vec3 grassGreen = vec3(0.22, 0.50, 0.22);
        vec3 limeGreen = vec3(0.35, 0.62, 0.28);
        vec3 paleGreen = vec3(0.55, 0.75, 0.42);
        vec3 sunlitGreen = vec3(0.68, 0.82, 0.45);
        vec3 peakColor = vec3(0.75, 0.72, 0.58);
        
        // Solar golden overlay
        vec3 solarGold = vec3(1.0, 0.85, 0.25);
        vec3 energyBlue = vec3(0.2, 0.7, 1.0);
        
        void main() {
          // Normalize elevation for color mapping
          float t = clamp(vElevation / 2.0, 0.0, 1.0);
          
          // Create rich green gradient based on elevation
          vec3 terrainColor;
          if (t < 0.15) {
            terrainColor = mix(deepForest, forestGreen, t / 0.15);
          } else if (t < 0.3) {
            terrainColor = mix(forestGreen, grassGreen, (t - 0.15) / 0.15);
          } else if (t < 0.5) {
            terrainColor = mix(grassGreen, limeGreen, (t - 0.3) / 0.2);
          } else if (t < 0.7) {
            terrainColor = mix(limeGreen, paleGreen, (t - 0.5) / 0.2);
          } else if (t < 0.85) {
            terrainColor = mix(paleGreen, sunlitGreen, (t - 0.7) / 0.15);
          } else {
            terrainColor = mix(sunlitGreen, peakColor, (t - 0.85) / 0.15);
          }
          
          // Enhanced lighting with warm sun
          vec3 sunDir = normalize(vec3(0.4, 0.3, 1.0));
          vec3 skyDir = normalize(vec3(-0.2, 0.5, 0.8));
          
          float sunDiffuse = max(dot(vNormal, sunDir), 0.0);
          float skyDiffuse = max(dot(vNormal, skyDir), 0.0) * 0.3;
          float ambient = 0.25;
          
          // Warm sunlight tint
          vec3 sunColor = vec3(1.0, 0.95, 0.85);
          vec3 skyColor = vec3(0.6, 0.8, 1.0);
          
          vec3 litColor = terrainColor * ambient;
          litColor += terrainColor * sunDiffuse * 0.65 * sunColor;
          litColor += terrainColor * skyDiffuse * skyColor;
          
          // Rim lighting for depth
          float rimLight = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
          rimLight = pow(rimLight, 3.0) * 0.3;
          litColor += vec3(0.4, 0.7, 0.5) * rimLight;
          
          // Scanning effect during reveal
          float scanY = mod(uTime * 0.4, 1.4);
          float scanEffect = smoothstep(scanY - 0.15, scanY, vUv.y) * 
                            (1.0 - smoothstep(scanY, scanY + 0.03, vUv.y));
          litColor += energyBlue * scanEffect * 1.5 * (1.0 - uProgress);
          
          // Grid overlay - subtle and elegant
          float gridScale = 25.0;
          float gridX = abs(fract(vUv.x * gridScale - 0.5) - 0.5) / fwidth(vUv.x * gridScale);
          float gridY = abs(fract(vUv.y * gridScale - 0.5) - 0.5) / fwidth(vUv.y * gridScale);
          float grid = 1.0 - min(min(gridX, gridY), 1.0);
          float gridPulse = 0.3 + 0.2 * sin(uTime * 1.5);
          float gridOpacity = mix(0.4, 0.15, uProgress) * gridPulse;
          litColor += energyBlue * grid * gridOpacity * vReveal;
          
          // Phase-based overlays
          float phaseValue = uPhase;
          
          // Solar analysis highlight (phase 2+)
          if (phaseValue >= 2.0) {
            float solarFactor = max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
            solarFactor = pow(solarFactor, 1.5);
            float solarIntensity = smoothstep(0.3, 0.6, uProgress) * 0.4;
            litColor = mix(litColor, litColor + solarGold * solarFactor, solarIntensity);
          }
          
          // Optimal zones glow (phase 3+)
          if (phaseValue >= 3.0) {
            float optimalZone = smoothstep(0.4, 0.7, t) * (1.0 - smoothstep(0.7, 0.9, t));
            float zoneGlow = optimalZone * sin(uTime * 2.0 + vUv.x * 10.0) * 0.5 + 0.5;
            float zoneIntensity = smoothstep(0.5, 0.8, uProgress) * 0.25;
            litColor += vec3(0.3, 0.9, 0.4) * zoneGlow * zoneIntensity;
          }
          
          // Wireframe reveal at very start
          float wireframeReveal = smoothstep(0.0, 0.15, uRevealProgress);
          float wireOpacity = (1.0 - wireframeReveal) * 0.8;
          litColor = mix(energyBlue * 0.5 + grid * energyBlue, litColor, wireframeReveal);
          
          // Edge fade for floating terrain look
          float edgeDist = max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)) * 2.0;
          float edgeFade = 1.0 - smoothstep(0.85, 1.0, edgeDist);
          
          // Final alpha with reveal
          float alpha = vReveal * edgeFade;
          
          gl_FragColor = vec4(litColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uProgress.value = progress;
      materialRef.current.uniforms.uRevealProgress.value = revealProgress;

      // Smooth elevation scale animation
      const targetScale = Math.min(revealProgress * 2, 1);
      materialRef.current.uniforms.uElevationScale.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uElevationScale.value,
        targetScale,
        0.05
      );

      const phaseMap: Record<string, number> = {
        'data-collection': 0,
        'constraint-integration': 1,
        'technology-optimization': 2,
        'system-design': 3,
        'financial-modeling': 4,
        'complete': 5,
      };
      materialRef.current.uniforms.uPhase.value = phaseMap[phase] || 0;
    }

    if (meshRef.current) {
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.1) * 0.01;
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.5, 0]}
    >
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </mesh>
  );
}

// Energy flow particles that appear progressively
function EnergyParticles({ progress, phase }: { progress: number; phase: AnalysisPhase }) {
  const pointsRef = useRef<THREE.Points>(null);
  const phaseNum = ['data-collection', 'constraint-integration', 'technology-optimization', 'system-design', 'financial-modeling', 'complete'].indexOf(phase);

  const particleCount = 300;

  const [positions, colors, velocities] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Spiral distribution around terrain
      const angle = (i / particleCount) * Math.PI * 8;
      const radius = 2 + (i / particleCount) * 4;

      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = -1 + Math.random() * 0.5;
      pos[i * 3 + 2] = Math.sin(angle) * radius;

      // Green to gold gradient
      const t = i / particleCount;
      col[i * 3] = 0.2 + t * 0.6;
      col[i * 3 + 1] = 0.8 - t * 0.2;
      col[i * 3 + 2] = 0.3 + t * 0.2;

      vel[i * 3] = (Math.random() - 0.5) * 0.02;
      vel[i * 3 + 1] = Math.random() * 0.03 + 0.01;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    return [pos, col, vel];
  }, []);

  useFrame((state) => {
    if (pointsRef.current && phaseNum >= 1) {
      const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
      const visibleCount = Math.floor(particleCount * Math.min(progress * 1.5, 1));

      for (let i = 0; i < visibleCount; i++) {
        pos[i * 3] += velocities[i * 3];
        pos[i * 3 + 1] += velocities[i * 3 + 1];
        pos[i * 3 + 2] += velocities[i * 3 + 2];

        // Spiral upward motion
        const angle = state.clock.elapsedTime * 0.5 + (i / particleCount) * Math.PI * 2;
        pos[i * 3] += Math.cos(angle) * 0.002;
        pos[i * 3 + 2] += Math.sin(angle) * 0.002;

        if (pos[i * 3 + 1] > 5) {
          pos[i * 3 + 1] = -1;
          const resetAngle = (i / particleCount) * Math.PI * 8;
          const resetRadius = 2 + (i / particleCount) * 4;
          pos[i * 3] = Math.cos(resetAngle) * resetRadius;
          pos[i * 3 + 2] = Math.sin(resetAngle) * resetRadius;
        }
      }

      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  if (phaseNum < 1) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.7 * Math.min(progress * 2, 1)}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Solar panel structures that appear during system design
function SolarStructures({ phase, progress }: { phase: AnalysisPhase; progress: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const phaseNum = ['data-collection', 'constraint-integration', 'technology-optimization', 'system-design', 'financial-modeling', 'complete'].indexOf(phase);

  const structures = useMemo(() => {
    const items = [];
    // Generate solar array positions on the terrain
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const radius = 1.5 + Math.random() * 2;
      items.push({
        position: [
          Math.cos(angle) * radius,
          0.1 + Math.random() * 0.3,
          Math.sin(angle) * radius
        ] as [number, number, number],
        rotation: Math.random() * 0.3 - 0.15,
        scale: 0.3 + Math.random() * 0.2,
        delay: i * 0.1,
      });
    }
    return items;
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        // Gentle floating animation
        child.position.y = structures[i].position[1] + Math.sin(state.clock.elapsedTime * 1.5 + i) * 0.02;
        // Rotate to face sun
        child.rotation.x = -0.3 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
      });
    }
  });

  // Only show during system design phase and later
  const showStructures = phaseNum >= 3;
  const structureOpacity = showStructures ? Math.min((progress - 0.5) * 4, 1) : 0;

  if (!showStructures || structureOpacity <= 0) return null;

  return (
    <group ref={groupRef}>
      {structures.map((struct, i) => (
        <group key={i} position={struct.position} rotation={[0, struct.rotation, 0]}>
          {/* Solar panel */}
          <mesh rotation={[-0.3, 0, 0]} scale={struct.scale}>
            <boxGeometry args={[0.8, 0.02, 0.5]} />
            <meshStandardMaterial
              color="#1a365d"
              metalness={0.8}
              roughness={0.2}
              transparent
              opacity={structureOpacity}
            />
          </mesh>
          {/* Panel frame */}
          <mesh rotation={[-0.3, 0, 0]} scale={struct.scale}>
            <boxGeometry args={[0.85, 0.03, 0.55]} />
            <meshStandardMaterial
              color="#4a5568"
              metalness={0.6}
              roughness={0.4}
              transparent
              opacity={structureOpacity * 0.8}
            />
          </mesh>
          {/* Support post */}
          <mesh position={[0, -struct.position[1] / 2, 0]} scale={struct.scale}>
            <cylinderGeometry args={[0.02, 0.02, struct.position[1], 8]} />
            <meshStandardMaterial
              color="#718096"
              metalness={0.5}
              roughness={0.5}
              transparent
              opacity={structureOpacity}
            />
          </mesh>
          {/* Glow effect */}
          <pointLight
            position={[0, 0.2, 0]}
            color="#fbbf24"
            intensity={structureOpacity * 0.3}
            distance={1}
          />
        </group>
      ))}
    </group>
  );
}

// Wind turbine structures
function WindTurbines({ phase, progress }: { phase: AnalysisPhase; progress: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const phaseNum = ['data-collection', 'constraint-integration', 'technology-optimization', 'system-design', 'financial-modeling', 'complete'].indexOf(phase);

  const turbines = useMemo(() => [
    { position: [-3, 1.5, 2] as [number, number, number], scale: 0.4 },
    { position: [3.5, 1.2, -1.5] as [number, number, number], scale: 0.35 },
    { position: [-2, 1.3, -3] as [number, number, number], scale: 0.38 },
  ], []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((turbine, i) => {
        // Find the blade group and rotate it
        const blades = turbine.children.find(c => c.name === 'blades');
        if (blades) {
          blades.rotation.z = state.clock.elapsedTime * (2 + i * 0.3);
        }
      });
    }
  });

  const showTurbines = phaseNum >= 3;
  const turbineOpacity = showTurbines ? Math.min((progress - 0.6) * 5, 1) : 0;

  if (!showTurbines || turbineOpacity <= 0) return null;

  return (
    <group ref={groupRef}>
      {turbines.map((turbine, i) => (
        <group key={i} position={turbine.position} scale={turbine.scale}>
          {/* Tower */}
          <mesh position={[0, -turbine.position[1] / 2, 0]}>
            <cylinderGeometry args={[0.08, 0.12, turbine.position[1], 8]} />
            <meshStandardMaterial
              color="#e2e8f0"
              metalness={0.3}
              roughness={0.6}
              transparent
              opacity={turbineOpacity}
            />
          </mesh>
          {/* Nacelle */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.15, 0.12, 0.3]} />
            <meshStandardMaterial
              color="#e2e8f0"
              metalness={0.4}
              roughness={0.5}
              transparent
              opacity={turbineOpacity}
            />
          </mesh>
          {/* Blades - geometry centered at hub, extends outward */}
          <group name="blades" position={[0, 0, 0.16]}>
            {[0, 1, 2].map((blade) => (
              <mesh
                key={blade}
                rotation={[0, 0, (blade * Math.PI * 2) / 3]}
              >
                {/* Blade geometry extends from 0 to 0.8, so we translate it to pivot around origin */}
                <boxGeometry args={[0.03, 0.8, 0.01]} translate={[0, 0.4, 0]} />
                <meshStandardMaterial
                  color="#f7fafc"
                  metalness={0.2}
                  roughness={0.7}
                  transparent
                  opacity={turbineOpacity}
                />
              </mesh>
            ))}
          </group>
        </group>
      ))}
    </group>
  );
}

// Floating analysis markers with better animations
function AnalysisMarkers({ phase, progress }: { phase: AnalysisPhase; progress: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const phaseNum = ['data-collection', 'constraint-integration', 'technology-optimization', 'system-design', 'financial-modeling', 'complete'].indexOf(phase);

  const markers = useMemo(() => [
    { position: [1.8, 1.0, 1.5] as [number, number, number], label: 'Solar Zone A', type: 'solar', showAtPhase: 2 },
    { position: [-2.2, 0.8, 1.0] as [number, number, number], label: 'Wind Corridor', type: 'wind', showAtPhase: 2 },
    { position: [0.5, 1.2, -2.0] as [number, number, number], label: 'Optimal Site', type: 'optimal', showAtPhase: 3 },
    { position: [-1.5, 0.6, -1.8] as [number, number, number], label: 'Battery Storage', type: 'battery', showAtPhase: 3 },
    { position: [2.5, 0.5, -0.5] as [number, number, number], label: 'Grid Connect', type: 'grid', showAtPhase: 4 },
  ], []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        if (markers[i]) {
          child.position.y = markers[i].position[1] + Math.sin(state.clock.elapsedTime * 2 + i * 1.5) * 0.08;
        }
      });
    }
  });

  const getMarkerColor = (type: string) => {
    switch (type) {
      case 'solar': return '#f59e0b';
      case 'wind': return '#3b82f6';
      case 'optimal': return '#10b981';
      case 'battery': return '#8b5cf6';
      case 'grid': return '#ec4899';
      default: return '#6b7280';
    }
  };

  return (
    <group ref={groupRef}>
      {markers.map((marker, i) => {
        const isVisible = phaseNum >= marker.showAtPhase;
        const markerOpacity = isVisible ? Math.min((progress - marker.showAtPhase * 0.15) * 4, 1) : 0;

        if (markerOpacity <= 0) return null;

        return (
          <Float key={i} speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
            <group position={marker.position}>
              {/* Glowing orb */}
              <mesh>
                <sphereGeometry args={[0.1, 24, 24]} />
                <meshStandardMaterial
                  color={getMarkerColor(marker.type)}
                  emissive={getMarkerColor(marker.type)}
                  emissiveIntensity={0.8}
                  transparent
                  opacity={markerOpacity}
                />
              </mesh>
              {/* Outer ring */}
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.15, 0.22, 32]} />
                <meshBasicMaterial
                  color={getMarkerColor(marker.type)}
                  transparent
                  opacity={markerOpacity * 0.5}
                  side={THREE.DoubleSide}
                />
              </mesh>
              {/* Connection line */}
              <mesh position={[0, -marker.position[1] / 2, 0]}>
                <cylinderGeometry args={[0.008, 0.008, marker.position[1], 8]} />
                <meshBasicMaterial
                  color={getMarkerColor(marker.type)}
                  transparent
                  opacity={markerOpacity * 0.4}
                />
              </mesh>
              {/* Point light for glow */}
              <pointLight
                color={getMarkerColor(marker.type)}
                intensity={markerOpacity * 0.5}
                distance={2}
              />
            </group>
          </Float>
        );
      })}
    </group>
  );
}

// Beautiful animated grid floor
function GridFloor({ revealProgress }: { revealProgress: number }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const gridMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uReveal: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uReveal;
        varying vec2 vUv;
        
        void main() {
          vec2 uv = vUv * 50.0;
          
          float lineX = abs(fract(uv.x - 0.5) - 0.5) / fwidth(uv.x);
          float lineY = abs(fract(uv.y - 0.5) - 0.5) / fwidth(uv.y);
          float line = 1.0 - min(min(lineX, lineY), 1.0);
          
          // Radial reveal
          float dist = length(vUv - 0.5) * 2.0;
          float reveal = smoothstep(dist, dist + 0.2, uReveal * 1.5);
          float fade = 1.0 - smoothstep(0.4, 1.0, dist);
          
          // Pulse effect
          float pulse = 0.5 + 0.5 * sin(uTime * 0.8 - dist * 4.0);
          
          // Green-tinted grid
           vec3 gridColor = vec3(0.22, 0.58, 0.48);
           vec3 color = gridColor * line * fade * pulse * reveal;
           float alpha = line * fade * 0.18 * reveal;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uReveal.value = revealProgress;
    }
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
      <planeGeometry args={[35, 35]} />
      <primitive object={gridMaterial} ref={materialRef} attach="material" />
    </mesh>
  );
}

// Cinematic camera controller
function CameraController({ phase, isEntering }: { phase: AnalysisPhase; isEntering: boolean }) {
  const { camera } = useThree();
  const targetPosition = useRef(new THREE.Vector3(12, 10, 12));
  const lookAtTarget = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    if (isEntering) {
      // Start far away and high for dramatic entrance
      camera.position.set(20, 15, 20);
      targetPosition.current.set(10, 7, 10);
    }
  }, [isEntering, camera]);

  useEffect(() => {
    switch (phase) {
      case 'data-collection':
        targetPosition.current.set(10, 7, 10);
        break;
      case 'constraint-integration':
        targetPosition.current.set(8, 6, 8);
        break;
      case 'technology-optimization':
        targetPosition.current.set(7, 5, 9);
        break;
      case 'system-design':
        targetPosition.current.set(6, 5, 7);
        break;
      case 'financial-modeling':
      case 'complete':
        targetPosition.current.set(8, 6, 8);
        break;
    }
  }, [phase]);

  useFrame(() => {
    camera.position.lerp(targetPosition.current, 0.015);
    camera.lookAt(lookAtTarget.current);
  });

  return null;
}

// Main scene component with transition support
interface TerrainAnalysisSceneProps {
  phase: AnalysisPhase;
  progress: number;
  isVisible: boolean;
  onTransitionComplete?: () => void;
  heightmap?: TerrainHeightmap | null;
}

export function TerrainAnalysisScene({
  phase,
  progress,
  isVisible,
  onTransitionComplete,
  heightmap
}: TerrainAnalysisSceneProps) {
  const [mounted, setMounted] = useState(false);
  const [isEntering, setIsEntering] = useState(true);
  const [revealProgress, setRevealProgress] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Progressive reveal animation
  useEffect(() => {
    if (isVisible) {
      setIsEntering(true);
      setRevealProgress(0);

      // Animate reveal progress
      const startTime = Date.now();
      const duration = 3000; // 3 seconds for full reveal

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min(elapsed / duration, 1);
        setRevealProgress(newProgress);

        if (newProgress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsEntering(false);
          onTransitionComplete?.();
        }
      };

      requestAnimationFrame(animate);
    }
  }, [isVisible, onTransitionComplete]);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{
            duration: 0.8,
            ease: [0.22, 1, 0.36, 1]
          }}
          className="absolute top-0 bottom-0 left-0 right-[420px] z-0"
        >
          <Canvas
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: 'high-performance'
            }}
            dpr={[1, 2]}
          >
            <color attach="background" args={['#f8fafc']} />

            <PerspectiveCamera makeDefault position={[12, 10, 12]} fov={45} />
            <CameraController phase={phase} isEntering={isEntering} />

            {/* Lighting */}
            <ambientLight intensity={0.5} />
            <directionalLight
              position={[10, 15, 8]}
              intensity={1.0}
              color="#fff7ed"
              castShadow
            />
            <pointLight position={[-8, 5, -8]} intensity={0.35} color="#86efac" />
            <pointLight position={[8, 3, 8]} intensity={0.25} color="#7dd3fc" />
            <hemisphereLight args={['#cfe8ff', '#b7e4c7', 0.35]} />

            {/* Main terrain */}
            <TerrainMesh
              phase={phase}
              progress={progress}
              revealProgress={revealProgress}
              heightmap={heightmap}
            />

            {/* Progressive elements */}
            <EnergyParticles progress={progress} phase={phase} />
            <SolarStructures phase={phase} progress={progress} />
            <WindTurbines phase={phase} progress={progress} />
            <AnalysisMarkers phase={phase} progress={progress} />
            <GridFloor revealProgress={revealProgress} />

            {/* Ambient sparkles */}
            <Sparkles
              count={80}
              size={2.5}
              speed={0.35}
              opacity={0.45 * revealProgress}
              scale={14}
              color="#34d399"
            />

            {/* Controls */}
            <OrbitControls
              enableZoom={true}
              enablePan={false}
              minDistance={5}
              maxDistance={25}
              minPolarAngle={Math.PI / 6}
              maxPolarAngle={Math.PI / 2.2}
              autoRotate
              autoRotateSpeed={0.2}
              enableDamping
              dampingFactor={0.05}
            />

            {/* Atmospheric fog */}
            <fog attach="fog" args={['#f8fafc', 14, 40]} />
          </Canvas>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default TerrainAnalysisScene;
