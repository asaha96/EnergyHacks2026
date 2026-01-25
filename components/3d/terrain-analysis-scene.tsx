'use client';

import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { cn } from '@/lib/utils';
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
const TERRAIN_ELEVATION_SCALE = 0.8;
const PLACEMENT_BOUND = TERRAIN_HALF * 0.90;

type NormalizedPolygon = Array<{ x: number; z: number }>;

type PolygonBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  centerX: number;
  centerZ: number;
  width: number;
  height: number;
  normalizedPolygon: NormalizedPolygon | null;
};

function getPolygonBounds(polygon: PolygonCoordinates[] | null | undefined): PolygonBounds {
  if (!polygon || polygon.length < 3) {
    // Default to terrain bounds
    return {
      minX: -PLACEMENT_BOUND,
      maxX: PLACEMENT_BOUND,
      minZ: -PLACEMENT_BOUND,
      maxZ: PLACEMENT_BOUND,
      centerX: 0,
      centerZ: 0,
      width: PLACEMENT_BOUND * 2,
      height: PLACEMENT_BOUND * 2,
      normalizedPolygon: null,
    };
  }

  const { normalized, scaleX, scaleZ } = normalizePolygonTo3D(polygon);

  const xs = normalized.map(p => p.x);
  const zs = normalized.map(p => p.z);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);

  return {
    minX,
    maxX,
    minZ,
    maxZ,
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
    width: maxX - minX,
    height: maxZ - minZ,
    normalizedPolygon: normalized,
  };
}

// Map normalized [-1,1] coordinate to polygon bounds with margin
function toPolygonCoord(value: number, min: number, max: number, margin: number = 0.15): number {
  const clamped = clampNumber(value, -1, 1);
  const range = max - min;
  const marginedMin = min + range * margin;
  const marginedMax = max - range * margin;
  return marginedMin + ((clamped + 1) / 2) * (marginedMax - marginedMin);
}

function normalizePolygonTo3D(polygon: PolygonCoordinates[]): {
  normalized: NormalizedPolygon;
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  scaleX: number;
  scaleZ: number;
} {
  if (!polygon || polygon.length < 3) {
    return {
      normalized: [
        { x: -TERRAIN_HALF, z: -TERRAIN_HALF },
        { x: TERRAIN_HALF, z: -TERRAIN_HALF },
        { x: TERRAIN_HALF, z: TERRAIN_HALF },
        { x: -TERRAIN_HALF, z: TERRAIN_HALF },
      ],
      bounds: { minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 },
      scaleX: TERRAIN_SIZE,
      scaleZ: TERRAIN_SIZE,
    };
  }

  const minLat = Math.min(...polygon.map(p => p.lat));
  const maxLat = Math.max(...polygon.map(p => p.lat));
  const minLng = Math.min(...polygon.map(p => p.lng));
  const maxLng = Math.max(...polygon.map(p => p.lng));

  const latRange = maxLat - minLat || 0.0001;
  const lngRange = maxLng - minLng || 0.0001;
  const aspectRatio = lngRange / latRange;

  const scaleX = aspectRatio >= 1 ? TERRAIN_SIZE : TERRAIN_SIZE * aspectRatio;
  const scaleZ = aspectRatio >= 1 ? TERRAIN_SIZE / aspectRatio : TERRAIN_SIZE;

  const normalized = polygon.map(p => ({
    x: ((p.lng - minLng) / lngRange - 0.5) * scaleX,
    z: -((p.lat - minLat) / latRange - 0.5) * scaleZ,
  }));

  return { normalized, bounds: { minLat, maxLat, minLng, maxLng }, scaleX, scaleZ };
}

function isPointInPolygon(x: number, y: number, polygon: NormalizedPolygon): boolean {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].z;
    const xj = polygon[j].x, yj = polygon[j].z;

    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
}

function distanceToPolygonEdge(x: number, y: number, polygon: NormalizedPolygon): number {
  let minDist = Infinity;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const x1 = polygon[i].x, y1 = polygon[i].z;
    const x2 = polygon[j].x, y2 = polygon[j].z;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;

    let t = 0;
    if (len2 > 0) {
      t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / len2));
    }

    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    const dist = Math.sqrt((x - projX) * (x - projX) + (y - projY) * (y - projY));

    minDist = Math.min(minDist, dist);
  }

  return minDist;
}

function createPolygonTerrainGeometry(
  normalizedPolygon: NormalizedPolygon,
  terrainData: Float32Array,
  resolution: number,
  scaleX: number,
  scaleZ: number
): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(scaleX, scaleZ, resolution - 1, resolution - 1);
  const positions = geo.attributes.position.array as Float32Array;
  const uvs = geo.attributes.uv.array as Float32Array;

  const alphas = new Float32Array(positions.length / 3);
  const edgeDistances = new Float32Array(positions.length / 3);

  for (let i = 0; i < positions.length / 3; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];

    const u = uvs[i * 2];
    const v = uvs[i * 2 + 1];

    const gx = Math.floor(u * (resolution - 1));
    const gy = Math.floor((1 - v) * (resolution - 1));
    const clampedGx = Math.max(0, Math.min(resolution - 1, gx));
    const clampedGy = Math.max(0, Math.min(resolution - 1, gy));
    const elevation = terrainData[clampedGy * resolution + clampedGx] || 0;

    positions[i * 3 + 2] = elevation * TERRAIN_ELEVATION_SCALE;

    const worldZ = -y;
    const inPolygon = isPointInPolygon(x, worldZ, normalizedPolygon);
    const edgeDist = distanceToPolygonEdge(x, worldZ, normalizedPolygon);
    const signedDist = inPolygon ? edgeDist : -edgeDist;

    edgeDistances[i] = signedDist;
    alphas[i] = 1.0;
  }

  geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
  geo.setAttribute('edgeDist', new THREE.BufferAttribute(edgeDistances, 1));
  geo.computeVertexNormals();

  return geo;
}

const CROSS_SECTION_DEPTH = 1.5;

function sampleTerrainHeightAt(
  terrainData: Float32Array,
  resolution: number,
  x: number,
  z: number,
  scaleX: number,
  scaleZ: number
): number {
  const u = (x / scaleX + 0.5);
  const v = (-z / scaleZ + 0.5);

  const gx = u * (resolution - 1);
  const gy = (1 - v) * (resolution - 1);

  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = Math.min(x0 + 1, resolution - 1);
  const y1 = Math.min(y0 + 1, resolution - 1);

  const tx = gx - x0;
  const ty = gy - y0;

  const clampX0 = Math.max(0, Math.min(resolution - 1, x0));
  const clampY0 = Math.max(0, Math.min(resolution - 1, y0));
  const clampX1 = Math.max(0, Math.min(resolution - 1, x1));
  const clampY1 = Math.max(0, Math.min(resolution - 1, y1));

  const h00 = terrainData[clampY0 * resolution + clampX0] || 0;
  const h10 = terrainData[clampY0 * resolution + clampX1] || 0;
  const h01 = terrainData[clampY1 * resolution + clampX0] || 0;
  const h11 = terrainData[clampY1 * resolution + clampX1] || 0;

  const hx0 = h00 + (h10 - h00) * tx;
  const hx1 = h01 + (h11 - h01) * tx;

  return hx0 + (hx1 - hx0) * ty;
}

function TerrainCrossSection({
  polygon,
  terrainData,
  resolution,
  revealProgress,
}: {
  polygon: PolygonCoordinates[] | null | undefined;
  terrainData: Float32Array;
  resolution: number;
  revealProgress: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { geometry, scaleX, scaleZ } = useMemo(() => {
    if (!polygon || polygon.length < 3) {
      return { geometry: null, scaleX: TERRAIN_SIZE, scaleZ: TERRAIN_SIZE };
    }

    const { normalized, scaleX, scaleZ } = normalizePolygonTo3D(polygon);
    const segmentsPerEdge = 48;

    const vertices: number[] = [];
    const uvs: number[] = [];
    const baseElevations: number[] = [];
    const indices: number[] = [];

    let vertexIndex = 0;

    for (let i = 0; i < normalized.length; i++) {
      const p1 = normalized[i];
      const p2 = normalized[(i + 1) % normalized.length];

      for (let j = 0; j < segmentsPerEdge; j++) {
        const t1 = j / segmentsPerEdge;
        const t2 = (j + 1) / segmentsPerEdge;

        const x1 = p1.x + (p2.x - p1.x) * t1;
        const z1 = p1.z + (p2.z - p1.z) * t1;
        const x2 = p1.x + (p2.x - p1.x) * t2;
        const z2 = p1.z + (p2.z - p1.z) * t2;

        const elev1 = sampleTerrainHeightAt(terrainData, resolution, x1, z1, scaleX, scaleZ);
        const elev2 = sampleTerrainHeightAt(terrainData, resolution, x2, z2, scaleX, scaleZ);

        const uCoord1 = (i + t1) / normalized.length;
        const uCoord2 = (i + t2) / normalized.length;

        vertices.push(
          x1, elev1, z1,
          x2, elev2, z2,
          x1, 0, z1,
          x2, 0, z2
        );

        baseElevations.push(elev1, elev2, elev1, elev2);

        uvs.push(
          uCoord1, 1.0,
          uCoord2, 1.0,
          uCoord1, 0.0,
          uCoord2, 0.0
        );

        indices.push(
          vertexIndex, vertexIndex + 2, vertexIndex + 1,
          vertexIndex + 1, vertexIndex + 2, vertexIndex + 3
        );

        vertexIndex += 4;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute('baseElev', new THREE.Float32BufferAttribute(baseElevations, 1));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return { geometry: geo, scaleX, scaleZ };
  }, [polygon, terrainData, resolution]);

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uRevealProgress: { value: 0 },
        uElevationScale: { value: 0 },
        uBaseY: { value: TERRAIN_BASE_Y },
        uDepth: { value: CROSS_SECTION_DEPTH },
      },
      vertexShader: `
        attribute float baseElev;
        
        uniform float uElevationScale;
        uniform float uBaseY;
        uniform float uDepth;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vDepth;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          
          float isTop = uv.y;
          float scaledElev = baseElev * uElevationScale * 0.8;
          float topY = uBaseY + scaledElev;
          float bottomY = uBaseY - uDepth;
          
          float finalY = mix(bottomY, topY, isTop);
          vec3 newPosition = vec3(position.x, finalY, position.z);
          
          vPosition = newPosition;
          vDepth = 1.0 - uv.y;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uRevealProgress;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vDepth;
        
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        
        void main() {
          vec3 topsoil = vec3(0.35, 0.25, 0.15);
          vec3 darkSoil = vec3(0.25, 0.18, 0.12);
          vec3 clay = vec3(0.55, 0.35, 0.25);
          vec3 sandstone = vec3(0.76, 0.60, 0.42);
          vec3 limestone = vec3(0.85, 0.82, 0.75);
          vec3 shale = vec3(0.40, 0.38, 0.35);
          vec3 bedrock = vec3(0.30, 0.28, 0.26);
          
          float depth = vDepth;
          
          float layerNoise = noise(vec2(vUv.x * 20.0, depth * 3.0)) * 0.15;
          float wavyDepth = depth + sin(vUv.x * 25.0 + depth * 5.0) * 0.03 + layerNoise;
          
          vec3 layerColor;
          float layerBlend;
          
          if (wavyDepth < 0.08) {
            layerBlend = wavyDepth / 0.08;
            layerColor = mix(topsoil, darkSoil, layerBlend);
          } else if (wavyDepth < 0.2) {
            layerBlend = (wavyDepth - 0.08) / 0.12;
            layerColor = mix(darkSoil, clay, layerBlend);
          } else if (wavyDepth < 0.4) {
            layerBlend = (wavyDepth - 0.2) / 0.2;
            layerColor = mix(clay, sandstone, layerBlend);
          } else if (wavyDepth < 0.6) {
            layerBlend = (wavyDepth - 0.4) / 0.2;
            layerColor = mix(sandstone, limestone, layerBlend);
          } else if (wavyDepth < 0.8) {
            layerBlend = (wavyDepth - 0.6) / 0.2;
            layerColor = mix(limestone, shale, layerBlend);
          } else {
            layerBlend = (wavyDepth - 0.8) / 0.2;
            layerColor = mix(shale, bedrock, layerBlend);
          }
          
          float grainNoise = noise(vUv * 80.0) * 0.08;
          float mediumNoise = noise(vUv * 30.0) * 0.05;
          layerColor += vec3(grainNoise + mediumNoise) - 0.06;
          
          float strataNoise = noise(vec2(vUv.x * 50.0, depth * 8.0));
          float strataLine = smoothstep(0.48, 0.5, strataNoise) * smoothstep(0.52, 0.5, strataNoise);
          layerColor = mix(layerColor, layerColor * 0.85, strataLine * 0.5);
          
          vec3 lightDir = normalize(vec3(0.3, 0.5, 0.4));
          float diffuse = max(dot(vNormal, lightDir), 0.0) * 0.4 + 0.6;
          layerColor *= diffuse;
          
          float alpha = smoothstep(0.0, 0.3, uRevealProgress);
          
          gl_FragColor = vec4(layerColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uRevealProgress.value = revealProgress;

      const targetScale = Math.min(revealProgress * 2, 1);
      materialRef.current.uniforms.uElevationScale.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uElevationScale.value,
        targetScale,
        0.05
      );
    }
  });

  if (!geometry) return null;

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </mesh>
  );
}



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

    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const gx = (x / (resolution - 1)) * (gridSize - 1);
        const gy = (y / (resolution - 1)) * (gridSize - 1);
        let elev = bicubicInterpolate(realElevationData, gridSize, gx, gy);
        elev = ((elev - minElev) / range) * 2.0;
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
  { x: 0.3, z: 0.25, label: 'Solar Zone A', type: 'solar' },
  { x: -0.35, z: 0.18, label: 'Wind Corridor', type: 'wind' },
  { x: 0.1, z: -0.35, label: 'Optimal Site', type: 'optimal' },
  { x: -0.25, z: -0.3, label: 'Battery Storage', type: 'battery' },
  { x: 0.4, z: -0.1, label: 'Grid Connect', type: 'grid' },
];

function buildFallbackPlan(): PlacementPlan {
  const solar: SolarPlacement[] = [];
  const wind: WindPlacement[] = [
    { x: -0.45, z: 0.35, height: 1.45, scale: 0.4 },
    { x: 0.5, z: -0.25, height: 1.3, scale: 0.36 },
    { x: -0.25, z: -0.5, height: 1.38, scale: 0.38 },
  ];

  for (let i = 0; i < 12; i++) {
    const rand = mulberry32(200 + i * 37)();
    const angle = (i / 12) * Math.PI * 2;
    // Reduced radius to keep solar panels centered on terrain
    const radius = 0.25 + rand * 0.35;
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

function TerrainMesh({
  phase,
  progress,
  revealProgress,
  terrainData,
  polygon,
}: {
  phase: AnalysisPhase;
  progress: number;
  revealProgress: number;
  terrainData: Float32Array;
  polygon?: PolygonCoordinates[] | null;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const resolution = TERRAIN_RESOLUTION;

  const geometryData = useMemo(() => {
    const { normalized, scaleX, scaleZ } = normalizePolygonTo3D(polygon || []);

    if (polygon && polygon.length >= 3) {
      return createPolygonTerrainGeometry(normalized, terrainData, resolution, scaleX, scaleZ);
    }

    const geo = new THREE.PlaneGeometry(10, 10, resolution - 1, resolution - 1);
    const positions = geo.attributes.position.array as Float32Array;
    const vertexCount = positions.length / 3;
    const alphas = new Float32Array(vertexCount).fill(1.0);
    const edgeDistances = new Float32Array(vertexCount).fill(1.0);

    for (let i = 0; i < terrainData.length; i++) {
      const elevation = terrainData[i];
      positions[i * 3 + 2] = elevation * TERRAIN_ELEVATION_SCALE;
    }

    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('edgeDist', new THREE.BufferAttribute(edgeDistances, 1));
    geo.computeVertexNormals();
    return geo;
  }, [terrainData, polygon, resolution]);

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
        attribute float alpha;
        attribute float edgeDist;
        
        uniform float uRevealProgress;
        uniform float uElevationScale;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vElevation;
        varying float vReveal;
        varying float vAlpha;
        varying float vEdgeDist;
        
        void main() {
          vUv = uv;
          vAlpha = alpha;
          vEdgeDist = edgeDist;
          
          float targetZ = position.z;
          float revealedZ = targetZ * uElevationScale;
          
          vec3 newPosition = vec3(position.x, position.y, revealedZ);
          vPosition = newPosition;
          vElevation = targetZ;
          
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
        varying float vAlpha;
        varying float vEdgeDist;
        
        vec3 meadowBase = vec3(0.28, 0.45, 0.25);
        vec3 grassLight = vec3(0.38, 0.55, 0.30);
        vec3 grassMid = vec3(0.45, 0.58, 0.32);
        vec3 hillGreen = vec3(0.42, 0.52, 0.30);
        vec3 highGrass = vec3(0.48, 0.54, 0.34);
        
        vec3 solarGold = vec3(1.0, 0.85, 0.25);
        vec3 energyBlue = vec3(0.2, 0.7, 1.0);
        
        void main() {
          float edgeAA = smoothstep(-0.05, 0.05, vEdgeDist);
          if (edgeAA < 0.01) {
            discard;
          }
          
          float t = clamp(vElevation / 0.8, 0.0, 1.0);
          
          vec3 terrainColor;
          if (t < 0.25) {
            terrainColor = mix(meadowBase, grassLight, t / 0.25);
          } else if (t < 0.5) {
            terrainColor = mix(grassLight, grassMid, (t - 0.25) / 0.25);
          } else if (t < 0.75) {
            terrainColor = mix(grassMid, hillGreen, (t - 0.5) / 0.25);
          } else {
            terrainColor = mix(hillGreen, highGrass, (t - 0.75) / 0.25);
          }
          
          vec3 sunDir = normalize(vec3(0.4, 0.3, 1.0));
          vec3 skyDir = normalize(vec3(-0.2, 0.5, 0.8));
          
          float sunDiffuse = max(dot(vNormal, sunDir), 0.0);
          float skyDiffuse = max(dot(vNormal, skyDir), 0.0) * 0.3;
          float ambient = 0.25;
          
          vec3 sunColor = vec3(1.0, 0.95, 0.85);
          vec3 skyColor = vec3(0.6, 0.8, 1.0);
          
          vec3 litColor = terrainColor * ambient;
          litColor += terrainColor * sunDiffuse * 0.65 * sunColor;
          litColor += terrainColor * skyDiffuse * skyColor;
          
          float rimLight = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
          rimLight = pow(rimLight, 3.0) * 0.3;
          litColor += vec3(0.4, 0.7, 0.5) * rimLight;
          
          float scanY = mod(uTime * 0.4, 1.4);
          float scanEffect = smoothstep(scanY - 0.15, scanY, vUv.y) * 
                            (1.0 - smoothstep(scanY, scanY + 0.03, vUv.y));
          litColor += energyBlue * scanEffect * 1.5 * (1.0 - uProgress);
          
          float gridScale = 25.0;
          float gridX = abs(fract(vUv.x * gridScale - 0.5) - 0.5) / fwidth(vUv.x * gridScale);
          float gridY = abs(fract(vUv.y * gridScale - 0.5) - 0.5) / fwidth(vUv.y * gridScale);
          float grid = 1.0 - min(min(gridX, gridY), 1.0);
          float gridPulse = 0.3 + 0.2 * sin(uTime * 1.5);
          float gridOpacity = mix(0.4, 0.15, uProgress) * gridPulse;
          litColor += energyBlue * grid * gridOpacity * vReveal;
          
          float phaseValue = uPhase;
          
          if (phaseValue >= 2.0) {
            float solarFactor = max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
            solarFactor = pow(solarFactor, 1.5);
            float solarIntensity = smoothstep(0.3, 0.6, uProgress) * 0.4;
            litColor = mix(litColor, litColor + solarGold * solarFactor, solarIntensity);
          }
          
          if (phaseValue >= 3.0) {
            float optimalZone = smoothstep(0.4, 0.7, t) * (1.0 - smoothstep(0.7, 0.9, t));
            float zoneGlow = optimalZone * sin(uTime * 2.0 + vUv.x * 10.0) * 0.5 + 0.5;
            float zoneIntensity = smoothstep(0.5, 0.8, uProgress) * 0.25;
            litColor += vec3(0.3, 0.9, 0.4) * zoneGlow * zoneIntensity;
          }
          
          float wireframeReveal = smoothstep(0.0, 0.15, uRevealProgress);
          litColor = mix(energyBlue * 0.5 + grid * energyBlue, litColor, wireframeReveal);
          
          float alpha = vReveal * edgeAA;
          
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


  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometryData}
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

function SolarStructures({
  phase,
  progress,
  placements,
  getSurfaceHeight,
  polygonBounds,
}: {
  phase: AnalysisPhase;
  progress: number;
  placements: SolarPlacement[];
  getSurfaceHeight: (x: number, z: number) => number;
  polygonBounds: PolygonBounds;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const phaseNum = ['data-collection', 'constraint-integration', 'technology-optimization', 'system-design', 'financial-modeling', 'complete'].indexOf(phase);

  const structures = useMemo(() => {
    return placements.map((placement, i) => {
      const seed = Math.floor((placement.x * 1000 + placement.z * 2000) * 1000) + i * 19;
      const rand = mulberry32(seed);
      const x = toPolygonCoord(placement.x, polygonBounds.minX, polygonBounds.maxX);
      const z = toPolygonCoord(placement.z, polygonBounds.minZ, polygonBounds.maxZ);

      // Check if position is inside the polygon (if polygon exists)
      const isInside = !polygonBounds.normalizedPolygon ||
        isPointInPolygon(x, z, polygonBounds.normalizedPolygon);

      return {
        x,
        z,
        tilt: clampNumber(placement.tilt ?? (0.2 + rand() * 0.2), 0.12, 0.5),
        scale: clampNumber(placement.scale ?? (0.28 + rand() * 0.18), 0.22, 0.5),
        azimuth: placement.azimuth ?? rand() * Math.PI * 2,
        postHeight: 0.28 + rand() * 0.28,
        floatPhase: rand() * Math.PI * 2,
        isInside,
      };
    }).filter(s => s.isInside);
  }, [placements, polygonBounds]);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const struct = structures[i];
        if (!struct) return;
        child.position.y = getSurfaceHeight(struct.x, struct.z);
      });
    }
  });

  const showStructures = phaseNum >= 3;
  const structureOpacity = showStructures ? Math.min((progress - 0.5) * 4, 1) : 0;

  if (!showStructures || structureOpacity <= 0) return null;

  return (
    <group ref={groupRef}>
      {structures.map((struct, i) => (
        <group
          key={i}
          position={[struct.x, getSurfaceHeight(struct.x, struct.z), struct.z]}
          rotation={[0, struct.azimuth, 0]}
        >
          <mesh
            position={[0, struct.postHeight, 0]}
            rotation={[-struct.tilt, 0, 0]}
            scale={[struct.scale, struct.scale, struct.scale]}
          >
            <boxGeometry args={[0.8, 0.02, 0.5]} />
            <meshStandardMaterial
              color="#1a365d"
              metalness={0.8}
              roughness={0.2}
              transparent
              opacity={structureOpacity}
            />
          </mesh>
          <mesh
            position={[0, struct.postHeight, 0]}
            rotation={[-struct.tilt, 0, 0]}
            scale={[struct.scale, struct.scale, struct.scale]}
          >
            <boxGeometry args={[0.85, 0.03, 0.55]} />
            <meshStandardMaterial
              color="#4a5568"
              metalness={0.6}
              roughness={0.4}
              transparent
              opacity={structureOpacity * 0.8}
            />
          </mesh>
          <mesh position={[0, struct.postHeight / 2, 0]} scale={[struct.scale, 1, struct.scale]}>
            <cylinderGeometry args={[0.02, 0.02, struct.postHeight, 8]} />
            <meshStandardMaterial
              color="#718096"
              metalness={0.5}
              roughness={0.5}
              transparent
              opacity={structureOpacity}
            />
          </mesh>
          <pointLight
            position={[0, struct.postHeight + 0.2, 0]}
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
  polygonBounds,
}: {
  phase: AnalysisPhase;
  progress: number;
  placements: WindPlacement[];
  getSurfaceHeight: (x: number, z: number) => number;
  polygonBounds: PolygonBounds;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const phaseNum = ['data-collection', 'constraint-integration', 'technology-optimization', 'system-design', 'financial-modeling', 'complete'].indexOf(phase);

  const turbines = useMemo(() => {
    return placements.map((placement, i) => {
      const seed = Math.floor((placement.x * 800 + placement.z * 900) * 1000) + i * 31;
      const rand = mulberry32(seed);
      const x = toPolygonCoord(placement.x, polygonBounds.minX, polygonBounds.maxX);
      const z = toPolygonCoord(placement.z, polygonBounds.minZ, polygonBounds.maxZ);

      // Check if position is inside the polygon (if polygon exists)
      const isInside = !polygonBounds.normalizedPolygon ||
        isPointInPolygon(x, z, polygonBounds.normalizedPolygon);

      return {
        x,
        z,
        height: clampNumber(placement.height ?? (1.25 + rand() * 0.35), 1.1, 1.8),
        scale: clampNumber(placement.scale ?? (0.34 + rand() * 0.1), 0.3, 0.5),
        isInside,
      };
    }).filter(t => t.isInside);
  }, [placements, polygonBounds]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((turbine, i) => {
        const struct = turbines[i];
        if (!struct) return;
        turbine.position.y = getSurfaceHeight(struct.x, struct.z);

        const blades = turbine.children.find(c => c.name === 'blades');
        if (blades) {
          blades.rotation.z = state.clock.elapsedTime * (0.5 + i * 0.1);
        }
      });
    }
  });

  const showTurbines = phaseNum >= 3;
  const turbineOpacity = showTurbines ? Math.min((progress - 0.6) * 5, 1) : 0;

  if (!showTurbines || turbineOpacity <= 0) return null;

  return (
    <group ref={groupRef}>
      {turbines.map((turbine, i) => {
        const towerHeight = turbine.height * turbine.scale;

        return (
          <group
            key={i}
            position={[
              turbine.x,
              getSurfaceHeight(turbine.x, turbine.z),
              turbine.z,
            ]}
          >
            <mesh position={[0, towerHeight / 2, 0]}>
              <cylinderGeometry args={[0.08 * turbine.scale, 0.12 * turbine.scale, towerHeight, 8]} />
              <meshStandardMaterial
                color="#e2e8f0"
                metalness={0.3}
                roughness={0.6}
                transparent
                opacity={turbineOpacity}
              />
            </mesh>
            <mesh position={[0, towerHeight, 0]}>
              <boxGeometry args={[0.15 * turbine.scale, 0.12 * turbine.scale, 0.3 * turbine.scale]} />
              <meshStandardMaterial
                color="#e2e8f0"
                metalness={0.4}
                roughness={0.5}
                transparent
                opacity={turbineOpacity}
              />
            </mesh>
            <group name="blades" position={[0, towerHeight, 0.16 * turbine.scale]}>
              {[0, 1, 2].map((blade) => (
                <group
                  key={blade}
                  rotation={[0, 0, (blade * Math.PI * 2) / 3]}
                >
                  {/* Blade positioned to extend outward from hub center */}
                  <mesh position={[0, 0.4 * turbine.scale, 0]}>
                    <boxGeometry args={[0.03 * turbine.scale, 0.8 * turbine.scale, 0.01 * turbine.scale]} />
                    <meshStandardMaterial
                      color="#f7fafc"
                      metalness={0.2}
                      roughness={0.7}
                      transparent
                      opacity={turbineOpacity}
                    />
                  </mesh>
                </group>
              ))}
              {/* Hub at center */}
              <mesh>
                <sphereGeometry args={[0.05 * turbine.scale, 8, 8]} />
                <meshStandardMaterial
                  color="#cbd5e1"
                  metalness={0.5}
                  roughness={0.4}
                  transparent
                  opacity={turbineOpacity}
                />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
}

// Floating analysis markers with better animations
function AnalysisMarkers({
  phase,
  progress,
  placements,
  getSurfaceHeight,
  polygonBounds,
}: {
  phase: AnalysisPhase;
  progress: number;
  placements: MarkerPlacement[];
  getSurfaceHeight: (x: number, z: number) => number;
  polygonBounds: PolygonBounds;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const phaseNum = ['data-collection', 'constraint-integration', 'technology-optimization', 'system-design', 'financial-modeling', 'complete'].indexOf(phase);

  const markers = useMemo(() => {
    return placements.map((placement, i) => {
      const seed = Math.floor((placement.x * 900 + placement.z * 1100) * 1000) + i * 13;
      const rand = mulberry32(seed);
      const x = toPolygonCoord(placement.x, polygonBounds.minX, polygonBounds.maxX);
      const z = toPolygonCoord(placement.z, polygonBounds.minZ, polygonBounds.maxZ);

      // Check if position is inside the polygon (if polygon exists)
      const isInside = !polygonBounds.normalizedPolygon ||
        isPointInPolygon(x, z, polygonBounds.normalizedPolygon);

      return {
        x,
        z,
        label: placement.label,
        type: placement.type,
        stemHeight: 0.5 + rand() * 0.25,
        floatPhase: rand() * Math.PI * 2,
        showAtPhase: placement.type === 'grid' ? 4 : placement.type === 'optimal' || placement.type === 'battery' ? 3 : 2,
        isInside,
      };
    }).filter(m => m.isInside);
  }, [placements, polygonBounds]);

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

function CameraController({ isEntering }: { phase: AnalysisPhase; isEntering: boolean }) {
  const { camera } = useThree();
  const targetPosition = useRef(new THREE.Vector3(10, 7, 10));
  const animationProgress = useRef(0);
  const isAnimating = useRef(true);

  useEffect(() => {
    if (isEntering) {
      camera.position.set(20, 15, 20);
      targetPosition.current.set(10, 7, 10);
      animationProgress.current = 0;
      isAnimating.current = true;
    }
  }, [isEntering, camera]);

  useFrame(() => {
    if (!isAnimating.current) return;

    animationProgress.current += 0.015;

    if (animationProgress.current >= 1) {
      isAnimating.current = false;
      return;
    }

    camera.position.lerp(targetPosition.current, 0.03);
    camera.lookAt(0, 0, 0);
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
  className?: string;
}

export function TerrainAnalysisScene({
  phase,
  progress,
  isVisible,
  onTransitionComplete,
  polygon,
  className
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

  // Calculate polygon bounds for placing objects within the terrain
  const polygonBounds = useMemo(() => getPolygonBounds(polygon), [polygon]);
  // Use ref to track revealProgress so useFrame callbacks get current value
  const revealProgressRef = useRef(revealProgress);
  useEffect(() => {
    revealProgressRef.current = revealProgress;
  }, [revealProgress]);

  const getSurfaceHeight = useCallback(
    (x: number, z: number) => {
      const revealScale = Math.min(revealProgressRef.current * 2, 1);
      return getTerrainSurfaceHeight(terrainData, TERRAIN_RESOLUTION, x, z, revealScale);
    },
    [terrainData]
  );

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
          className={cn(
            "absolute top-0 bottom-0 left-0 right-[420px] z-0",
            className
          )}
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

            <ambientLight intensity={0.5} />
            <directionalLight
              position={[10, 15, 8]}
              intensity={1.0}
              color="#fff7ed"
            />
            <pointLight position={[-8, 5, -8]} intensity={0.35} color="#86efac" />
            <pointLight position={[8, 3, 8]} intensity={0.25} color="#7dd3fc" />
            <hemisphereLight args={['#cfe8ff', '#b7e4c7', 0.35]} />

            <TerrainMesh
              phase={phase}
              progress={progress}
              revealProgress={revealProgress}
              terrainData={terrainData}
              polygon={polygon}
            />
            <TerrainCrossSection
              polygon={polygon}
              terrainData={terrainData}
              resolution={TERRAIN_RESOLUTION}
              revealProgress={revealProgress}
            />
            {/* Progressive elements */}
            {/* Progressive elements - Particles removed per user request */}
            <SolarStructures
              phase={phase}
              progress={progress}
              placements={placementPlan.solar}
              getSurfaceHeight={getSurfaceHeight}
              polygonBounds={polygonBounds}
            />
            <WindTurbines
              phase={phase}
              progress={progress}
              placements={placementPlan.wind}
              getSurfaceHeight={getSurfaceHeight}
              polygonBounds={polygonBounds}
            />
            <AnalysisMarkers
              phase={phase}
              progress={progress}
              placements={placementPlan.markers}
              getSurfaceHeight={getSurfaceHeight}
              polygonBounds={polygonBounds}
            />
            <GridFloor revealProgress={revealProgress} />

            {/* Ambient sparkles */}
            {/* Ambient sparkles removed per user request */}

            <OrbitControls
              enableZoom={true}
              enablePan={true}
              enableRotate={true}
              minDistance={2}
              maxDistance={50}
              minPolarAngle={0.1}
              maxPolarAngle={Math.PI / 2.05}
              autoRotate={false}
              enableDamping={true}
              dampingFactor={0.08}
              rotateSpeed={0.8}
              zoomSpeed={1.2}
              panSpeed={0.8}
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
