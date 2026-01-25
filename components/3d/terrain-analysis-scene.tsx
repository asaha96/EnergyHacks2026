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
import { PolygonCoordinates } from '@/components/map';
import { calculateCentroid, fetchElevationGrid } from '@/lib/geo';

const TERRAIN_RESOLUTION = 128;
const TERRAIN_SIZE = 10;
const TERRAIN_HALF = TERRAIN_SIZE / 2;
const TERRAIN_BASE_Y = -0.5;
const TERRAIN_ELEVATION_SCALE = 1.5;
const PLACEMENT_BOUND = TERRAIN_HALF * 0.92;

type SolarPlacement = {
  x: number;
  z: number;
  tilt?: number;
  scale?: number;
  azimuth?: number;
};

type WindPlacement = {
  x: number;
  z: number;
  height?: number;
  scale?: number;
};

type MarkerPlacement = {
  x: number;
  z: number;
  label: string;
  type: 'solar' | 'wind' | 'optimal' | 'battery' | 'grid';
};

type PlacementPlan = {
  solar: SolarPlacement[];
  wind: WindPlacement[];
  markers: MarkerPlacement[];
};

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
      // const distFromCenter = Math.sqrt(cx * cx + cy * cy) / (width / 2);
      // elevation += Math.max(0, 1 - distFromCenter * 1.2) * 0.5;
      elevation += Math.sin(x * 0.05) * Math.cos(y * 0.07) * 0.3;

      data[y * width + x] = elevation;
    }
  }

  return data;
}

// Cubic interpolation for smoother upscaling
function cubicInterpolate(p0: number, p1: number, p2: number, p3: number, t: number) {
  const v0 = p2 - p0;
  const v1 = 2 * p0 - 5 * p1 + 4 * p2 - p3;
  const v2 = -p0 + 3 * p1 - 3 * p2 + p3;
  return p1 + 0.5 * t * (v0 + t * (v1 + t * v2));
}

// Bicubic interpolation for 2D grid
function bicubicInterpolate(grid: Float32Array, gridSize: number, x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const dx = x - xi;
  const dy = y - yi;

  const p = [];
  for (let j = -1; j <= 2; j++) {
    const row = [];
    for (let i = -1; i <= 2; i++) {
      let gx = xi + i;
      let gy = yi + j;
      // Clamp to edges
      if (gx < 0) gx = 0;
      if (gx >= gridSize) gx = gridSize - 1;
      if (gy < 0) gy = 0;
      if (gy >= gridSize) gy = gridSize - 1;
      row.push(grid[gy * gridSize + gx]);
    }
    p.push(row);
  }

  const colResults = [];
  for (let i = 0; i < 4; i++) {
    colResults.push(cubicInterpolate(p[i][0], p[i][1], p[i][2], p[i][3], dx));
  }

  return cubicInterpolate(colResults[0], colResults[1], colResults[2], colResults[3], dy);
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toFiniteNumber(value: unknown, fallback: number) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function buildTerrainHeightmap(realElevationData: Float32Array | null, resolution: number) {
  if (realElevationData && realElevationData.length === 100) {
    const data = new Float32Array(resolution * resolution);
    const gridSize = 10;

    let minElev = Infinity;
    let maxElev = -Infinity;
    for (let i = 0; i < realElevationData.length; i++) {
      minElev = Math.min(minElev, realElevationData[i]);
      maxElev = Math.max(maxElev, realElevationData[i]);
    }

    const range = maxElev - minElev || 1;
    const noiseData = generateTerrainData(resolution, resolution, 123);

    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const gx = (x / (resolution - 1)) * (gridSize - 1);
        const gy = (y / (resolution - 1)) * (gridSize - 1);
        let elev = bicubicInterpolate(realElevationData, gridSize, gx, gy);
        elev = ((elev - minElev) / range) * 2.0;
        elev += noiseData[y * resolution + x] * 0.15;
        data[y * resolution + x] = elev;
      }
    }

    return data;
  }

  return generateTerrainData(resolution, resolution);
}

function sampleTerrainHeight(terrainData: Float32Array, resolution: number, x: number, z: number) {
  const u = clampNumber((x + TERRAIN_HALF) / TERRAIN_SIZE, 0, 1);
  const v = clampNumber((-z + TERRAIN_HALF) / TERRAIN_SIZE, 0, 1);

  const gx = u * (resolution - 1);
  const gy = v * (resolution - 1);
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = Math.min(x0 + 1, resolution - 1);
  const y1 = Math.min(y0 + 1, resolution - 1);
  const tx = gx - x0;
  const ty = gy - y0;

  const h00 = terrainData[y0 * resolution + x0];
  const h10 = terrainData[y0 * resolution + x1];
  const h01 = terrainData[y1 * resolution + x0];
  const h11 = terrainData[y1 * resolution + x1];

  const hx0 = h00 + (h10 - h00) * tx;
  const hx1 = h01 + (h11 - h01) * tx;
  return hx0 + (hx1 - hx0) * ty;
}

function getTerrainSurfaceHeight(
  terrainData: Float32Array,
  resolution: number,
  x: number,
  z: number,
  revealScale: number
) {
  const elevation = sampleTerrainHeight(terrainData, resolution, x, z) * TERRAIN_ELEVATION_SCALE;
  return TERRAIN_BASE_Y + elevation * revealScale;
}

function downsampleTerrainData(
  terrainData: Float32Array,
  resolution: number,
  gridSize: number
): number[] {
  const downsampled: number[] = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const worldX = (x / (gridSize - 1)) * TERRAIN_SIZE - TERRAIN_HALF;
      const worldZ = (y / (gridSize - 1)) * TERRAIN_SIZE - TERRAIN_HALF;
      downsampled.push(sampleTerrainHeight(terrainData, resolution, worldX, worldZ));
    }
  }
  return downsampled;
}

function toWorldCoord(value: number) {
  return clampNumber(value, -1, 1) * PLACEMENT_BOUND;
}

const DEFAULT_MARKERS: MarkerPlacement[] = [
  { x: 0.38, z: 0.33, label: 'Solar Zone A', type: 'solar' },
  { x: -0.48, z: 0.22, label: 'Wind Corridor', type: 'wind' },
  { x: 0.12, z: -0.43, label: 'Optimal Site', type: 'optimal' },
  { x: -0.32, z: -0.39, label: 'Battery Storage', type: 'battery' },
  { x: 0.55, z: -0.11, label: 'Grid Connect', type: 'grid' },
];

function buildFallbackPlan(): PlacementPlan {
  const solar: SolarPlacement[] = [];
  const wind: WindPlacement[] = [
    { x: -0.62, z: 0.42, height: 1.45, scale: 0.4 },
    { x: 0.7, z: -0.3, height: 1.3, scale: 0.36 },
    { x: -0.32, z: -0.68, height: 1.38, scale: 0.38 },
  ];

  for (let i = 0; i < 12; i++) {
    const rand = mulberry32(200 + i * 37)();
    const angle = (i / 12) * Math.PI * 2;
    const radius = 0.35 + rand * 0.4;
    solar.push({
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      tilt: 0.18 + rand * 0.22,
      scale: 0.26 + rand * 0.2,
      azimuth: angle + 0.6,
    });
  }

  return {
    solar,
    wind,
    markers: DEFAULT_MARKERS,
  };
}

function normalizePlacementPlan(raw: Partial<PlacementPlan>, fallback: PlacementPlan): PlacementPlan {
  const solarRaw = Array.isArray(raw.solar) ? raw.solar : fallback.solar;
  const windRaw = Array.isArray(raw.wind) ? raw.wind : fallback.wind;
  const markerRaw = Array.isArray(raw.markers) ? raw.markers : fallback.markers;

  const solar = Array.from({ length: 12 }).map((_, i) => {
    const fallbackItem = fallback.solar[i % fallback.solar.length];
    const item = solarRaw[i] ?? fallbackItem;
    return {
      x: clampNumber(toFiniteNumber(item?.x, fallbackItem.x), -1, 1),
      z: clampNumber(toFiniteNumber(item?.z, fallbackItem.z), -1, 1),
      tilt: clampNumber(toFiniteNumber(item?.tilt, fallbackItem.tilt ?? 0.25), 0.1, 0.5),
      scale: clampNumber(toFiniteNumber(item?.scale, fallbackItem.scale ?? 0.32), 0.22, 0.5),
      azimuth: toFiniteNumber(item?.azimuth, fallbackItem.azimuth ?? 0),
    };
  });

  const wind = Array.from({ length: 3 }).map((_, i) => {
    const fallbackItem = fallback.wind[i % fallback.wind.length];
    const item = windRaw[i] ?? fallbackItem;
    return {
      x: clampNumber(toFiniteNumber(item?.x, fallbackItem.x), -1, 1),
      z: clampNumber(toFiniteNumber(item?.z, fallbackItem.z), -1, 1),
      height: clampNumber(toFiniteNumber(item?.height, fallbackItem.height ?? 1.4), 1.1, 1.8),
      scale: clampNumber(toFiniteNumber(item?.scale, fallbackItem.scale ?? 0.38), 0.3, 0.5),
    };
  });

  const fallbackMarkersByType = new Map(fallback.markers.map((marker) => [marker.type, marker]));
  const markers = DEFAULT_MARKERS.map((template) => {
    const match = markerRaw.find((marker) => marker?.type === template.type) ??
      fallbackMarkersByType.get(template.type) ?? template;

    return {
      type: template.type,
      label: template.label,
      x: clampNumber(toFiniteNumber(match?.x, template.x), -1, 1),
      z: clampNumber(toFiniteNumber(match?.z, template.z), -1, 1),
    };
  });

  return { solar, wind, markers };
}

// Enhanced terrain mesh with progressive detail and lush green colors
function TerrainMesh({
  phase,
  progress,
  revealProgress,
  terrainData
}: {
  phase: AnalysisPhase;
  progress: number;
  revealProgress: number;
  terrainData: Float32Array;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const resolution = TERRAIN_RESOLUTION;

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(10, 10, resolution - 1, resolution - 1);
    const positions = geo.attributes.position.array as Float32Array;

    for (let i = 0; i < terrainData.length; i++) {
      const elevation = terrainData[i];
      positions[i * 3 + 2] = elevation * TERRAIN_ELEVATION_SCALE;
    }

    geo.computeVertexNormals();
    return geo;
  }, [terrainData]);

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
      position={[0, TERRAIN_BASE_Y, 0]}
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
function SolarStructures({
  phase,
  progress,
  placements,
  getSurfaceHeight,
}: {
  phase: AnalysisPhase;
  progress: number;
  placements: SolarPlacement[];
  getSurfaceHeight: (x: number, z: number) => number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const phaseNum = ['data-collection', 'constraint-integration', 'technology-optimization', 'system-design', 'financial-modeling', 'complete'].indexOf(phase);

  const structures = useMemo(() => {
    return placements.map((placement, i) => {
      const seed = Math.floor((placement.x * 1000 + placement.z * 2000) * 1000) + i * 19;
      const rand = mulberry32(seed);
      return {
        x: toWorldCoord(placement.x),
        z: toWorldCoord(placement.z),
        tilt: clampNumber(placement.tilt ?? (0.2 + rand() * 0.2), 0.12, 0.5),
        scale: clampNumber(placement.scale ?? (0.28 + rand() * 0.18), 0.22, 0.5),
        azimuth: placement.azimuth ?? rand() * Math.PI * 2,
        postHeight: 0.28 + rand() * 0.28,
        floatPhase: rand() * Math.PI * 2,
      };
    });
  }, [placements]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const struct = structures[i];
        if (!struct) return;
        const baseY = getSurfaceHeight(struct.x, struct.z);
        child.position.y = baseY + struct.postHeight + Math.sin(state.clock.elapsedTime * 1.5 + struct.floatPhase) * 0.02;
        child.rotation.x = -struct.tilt + Math.sin(state.clock.elapsedTime * 0.5 + struct.floatPhase) * 0.04;
        child.rotation.y = struct.azimuth;
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
        <group key={i} position={[struct.x, getSurfaceHeight(struct.x, struct.z) + struct.postHeight, struct.z]}>
          {/* Solar panel */}
          <mesh rotation={[-struct.tilt, 0, 0]} scale={[struct.scale, struct.scale, struct.scale]}>
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
          <mesh rotation={[-struct.tilt, 0, 0]} scale={[struct.scale, struct.scale, struct.scale]}>
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
          <mesh position={[0, -struct.postHeight / 2, 0]} scale={[struct.scale, 1, struct.scale]}>
            <cylinderGeometry args={[0.02, 0.02, struct.postHeight, 8]} />
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
function WindTurbines({
  phase,
  progress,
  placements,
  getSurfaceHeight,
}: {
  phase: AnalysisPhase;
  progress: number;
  placements: WindPlacement[];
  getSurfaceHeight: (x: number, z: number) => number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const phaseNum = ['data-collection', 'constraint-integration', 'technology-optimization', 'system-design', 'financial-modeling', 'complete'].indexOf(phase);

  const turbines = useMemo(() => {
    return placements.map((placement, i) => {
      const seed = Math.floor((placement.x * 800 + placement.z * 900) * 1000) + i * 31;
      const rand = mulberry32(seed);
      return {
        x: toWorldCoord(placement.x),
        z: toWorldCoord(placement.z),
        height: clampNumber(placement.height ?? (1.25 + rand() * 0.35), 1.1, 1.8),
        scale: clampNumber(placement.scale ?? (0.34 + rand() * 0.1), 0.3, 0.5),
      };
    });
  }, [placements]);

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
        <group
          key={i}
          position={[
            turbine.x,
            getSurfaceHeight(turbine.x, turbine.z) + turbine.height * turbine.scale,
            turbine.z,
          ]}
          scale={turbine.scale}
        >
          {/* Tower */}
          <mesh position={[0, -turbine.height / 2, 0]}>
            <cylinderGeometry args={[0.08, 0.12, turbine.height, 8]} />
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
function AnalysisMarkers({
  phase,
  progress,
  placements,
  getSurfaceHeight,
}: {
  phase: AnalysisPhase;
  progress: number;
  placements: MarkerPlacement[];
  getSurfaceHeight: (x: number, z: number) => number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const phaseNum = ['data-collection', 'constraint-integration', 'technology-optimization', 'system-design', 'financial-modeling', 'complete'].indexOf(phase);

  const markers = useMemo(() => {
    return placements.map((placement, i) => {
      const seed = Math.floor((placement.x * 900 + placement.z * 1100) * 1000) + i * 13;
      const rand = mulberry32(seed);
      return {
        x: toWorldCoord(placement.x),
        z: toWorldCoord(placement.z),
        label: placement.label,
        type: placement.type,
        stemHeight: 0.5 + rand() * 0.25,
        floatPhase: rand() * Math.PI * 2,
        showAtPhase: placement.type === 'grid' ? 4 : placement.type === 'optimal' || placement.type === 'battery' ? 3 : 2,
      };
    });
  }, [placements]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        if (markers[i]) {
          const marker = markers[i];
          const baseY = getSurfaceHeight(marker.x, marker.z);
          child.position.y = baseY + marker.stemHeight + Math.sin(state.clock.elapsedTime * 2 + marker.floatPhase) * 0.08;
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
            <group position={[marker.x, getSurfaceHeight(marker.x, marker.z) + marker.stemHeight, marker.z]}>
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
              <mesh position={[0, -marker.stemHeight / 2, 0]}>
                <cylinderGeometry args={[0.008, 0.008, marker.stemHeight, 8]} />
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
  polygon?: PolygonCoordinates[] | null;
}

export function TerrainAnalysisScene({
  phase,
  progress,
  isVisible,
  onTransitionComplete,
  polygon
}: TerrainAnalysisSceneProps) {
  const [mounted, setMounted] = useState(false);
  const [isEntering, setIsEntering] = useState(true);
  const [revealProgress, setRevealProgress] = useState(0);
  const [realElevationData, setRealElevationData] = useState<Float32Array | null>(null);
  const fallbackPlan = useMemo(() => buildFallbackPlan(), []);
  const [placementPlan, setPlacementPlan] = useState<PlacementPlan>(fallbackPlan);
  const terrainData = useMemo(
    () => buildTerrainHeightmap(realElevationData, TERRAIN_RESOLUTION),
    [realElevationData]
  );
  const getSurfaceHeight = useMemo(() => {
    const revealScale = Math.min(revealProgress * 2, 1);
    return (x: number, z: number) =>
      getTerrainSurfaceHeight(terrainData, TERRAIN_RESOLUTION, x, z, revealScale);
  }, [terrainData, revealProgress]);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Fetch real elevation data when polygon changes
  useEffect(() => {
    if (polygon && polygon.length >= 3) {
      const center = calculateCentroid(polygon);
      // Fetch a grid around the center, covering ~500m radius
      fetchElevationGrid(center, 500, 10)
        .then(data => {
          setRealElevationData(data);
        })
        .catch(err => {
          console.error("Failed to load elevation data", err);
        });
    }
  }, [polygon]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const gridSize = 10;
    const grid = realElevationData
      ? Array.from(realElevationData)
      : downsampleTerrainData(terrainData, TERRAIN_RESOLUTION, gridSize);

    const requestPlan = async () => {
      try {
        const res = await fetch('/api/terrain/placements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ elevationGrid: grid, gridSize }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error('Placement plan request failed');

        const payload = await res.json();
        if (!payload?.success || !payload?.data) {
          throw new Error('Placement plan missing');
        }

        const normalized = normalizePlacementPlan(payload.data, fallbackPlan);
        if (!cancelled) setPlacementPlan(normalized);
      } catch (error) {
        if (!cancelled) setPlacementPlan(fallbackPlan);
      }
    };

    requestPlan();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [realElevationData, terrainData, fallbackPlan]);

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
              terrainData={terrainData}
            />

            {/* Progressive elements */}
            <EnergyParticles progress={progress} phase={phase} />
            <SolarStructures
              phase={phase}
              progress={progress}
              placements={placementPlan.solar}
              getSurfaceHeight={getSurfaceHeight}
            />
            <WindTurbines
              phase={phase}
              progress={progress}
              placements={placementPlan.wind}
              getSurfaceHeight={getSurfaceHeight}
            />
            <AnalysisMarkers
              phase={phase}
              progress={progress}
              placements={placementPlan.markers}
              getSurfaceHeight={getSurfaceHeight}
            />
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
