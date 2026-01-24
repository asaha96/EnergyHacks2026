'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera,
  Environment,
  Float,
  Text,
  MeshTransmissionMaterial,
  useTexture,
  Stars
} from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import type { AnalysisPhase } from '@/components/agent';

// Generate realistic terrain heightmap using multiple noise octaves
function generateTerrainData(width: number, height: number, seed: number = 42) {
  const data = new Float32Array(width * height);
  
  // Simple pseudo-random based on seed
  const random = (x: number, y: number) => {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453123;
    return n - Math.floor(n);
  };
  
  // Smooth noise interpolation
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
      // Multiple octaves for realistic terrain
      elevation += smoothNoise(x, y, 32) * 1.0;
      elevation += smoothNoise(x, y, 16) * 0.5;
      elevation += smoothNoise(x, y, 8) * 0.25;
      elevation += smoothNoise(x, y, 4) * 0.125;
      
      // Add a gentle hill in the center
      const cx = x - width / 2;
      const cy = y - height / 2;
      const distFromCenter = Math.sqrt(cx * cx + cy * cy) / (width / 2);
      elevation += Math.max(0, 1 - distFromCenter * 1.2) * 0.5;
      
      // Add some valleys
      elevation += Math.sin(x * 0.05) * Math.cos(y * 0.07) * 0.3;
      
      data[y * width + x] = elevation;
    }
  }
  
  return data;
}

// Terrain mesh with displacement
function TerrainMesh({ 
  phase, 
  progress 
}: { 
  phase: AnalysisPhase;
  progress: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const resolution = 128;
  const terrainData = useMemo(() => generateTerrainData(resolution, resolution), []);
  
  // Create geometry with displacement
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(10, 10, resolution - 1, resolution - 1);
    const positions = geo.attributes.position.array as Float32Array;
    const colors = new Float32Array(positions.length);
    
    for (let i = 0; i < terrainData.length; i++) {
      const elevation = terrainData[i];
      positions[i * 3 + 2] = elevation * 1.5; // Z is up after rotation
      
      // Color based on elevation
      const t = elevation / 2;
      // Deep water -> shallow -> sand -> grass -> rock -> snow
      if (t < 0.2) {
        // Deep blue-green for low areas
        colors[i * 3] = 0.1;
        colors[i * 3 + 1] = 0.4 + t;
        colors[i * 3 + 2] = 0.5;
      } else if (t < 0.4) {
        // Green for mid areas
        colors[i * 3] = 0.2 + t * 0.3;
        colors[i * 3 + 1] = 0.6 + t * 0.2;
        colors[i * 3 + 2] = 0.2;
      } else if (t < 0.7) {
        // Light green/tan for higher areas
        colors[i * 3] = 0.5 + t * 0.3;
        colors[i * 3 + 1] = 0.6;
        colors[i * 3 + 2] = 0.3;
      } else {
        // Rocky gray for peaks
        colors[i * 3] = 0.6;
        colors[i * 3 + 1] = 0.55;
        colors[i * 3 + 2] = 0.5;
      }
    }
    
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    
    return geo;
  }, [terrainData]);

  // Custom shader for beautiful terrain rendering
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uPhase: { value: 0 },
        uScanLine: { value: 0 },
        uGridOpacity: { value: 0.3 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vColor;
        attribute vec3 color;
        
        void main() {
          vUv = uv;
          vPosition = position;
          vNormal = normalize(normalMatrix * normal);
          vColor = color;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uProgress;
        uniform float uPhase;
        uniform float uScanLine;
        uniform float uGridOpacity;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vColor;
        
        void main() {
          // Base terrain color from vertex colors
          vec3 baseColor = vColor;
          
          // Lighting
          vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));
          float diffuse = max(dot(vNormal, lightDir), 0.0);
          float ambient = 0.3;
          
          vec3 litColor = baseColor * (ambient + diffuse * 0.7);
          
          // Scanning effect
          float scanEffect = smoothstep(uScanLine - 0.1, uScanLine, vUv.y) * 
                            (1.0 - smoothstep(uScanLine, uScanLine + 0.02, vUv.y));
          litColor += vec3(0.2, 0.8, 1.0) * scanEffect * 2.0;
          
          // Grid overlay
          float gridX = abs(fract(vUv.x * 20.0 - 0.5) - 0.5) / fwidth(vUv.x * 20.0);
          float gridY = abs(fract(vUv.y * 20.0 - 0.5) - 0.5) / fwidth(vUv.y * 20.0);
          float grid = 1.0 - min(min(gridX, gridY), 1.0);
          litColor += vec3(0.1, 0.5, 0.8) * grid * uGridOpacity * (0.5 + 0.5 * sin(uTime * 2.0));
          
          // Elevation highlight for analysis
          float elevationGlow = smoothstep(0.3, 0.8, vPosition.z / 1.5);
          if (uPhase > 1.0) {
            litColor += vec3(1.0, 0.6, 0.1) * elevationGlow * 0.3 * uProgress;
          }
          
          // Solar analysis overlay
          if (uPhase > 2.0) {
            float solarPotential = max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
            litColor += vec3(1.0, 0.9, 0.2) * solarPotential * 0.4 * (uProgress - 0.3);
          }
          
          // Final output
          gl_FragColor = vec4(litColor, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    });
  }, []);

  // Animate the material
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uProgress.value = progress;
      
      // Map phase to numeric value
      const phaseMap: Record<string, number> = {
        'data-collection': 0,
        'constraint-integration': 1,
        'technology-optimization': 2,
        'system-design': 3,
        'financial-modeling': 4,
        'complete': 5,
      };
      materialRef.current.uniforms.uPhase.value = phaseMap[phase] || 0;
      
      // Animate scan line
      const scanSpeed = 0.5;
      materialRef.current.uniforms.uScanLine.value = 
        (state.clock.elapsedTime * scanSpeed) % 1.2;
    }
    
    // Gentle rotation
    if (meshRef.current) {
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.1) * 0.02;
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

// Floating analysis markers
function AnalysisMarkers({ phase, progress }: { phase: AnalysisPhase; progress: number }) {
  const groupRef = useRef<THREE.Group>(null);
  
  const markers = useMemo(() => [
    { position: [1.5, 0.8, 1.2] as [number, number, number], label: 'Solar Zone A', type: 'solar' },
    { position: [-1.8, 0.5, 0.8] as [number, number, number], label: 'Wind Corridor', type: 'wind' },
    { position: [0.5, 1.0, -1.5] as [number, number, number], label: 'Optimal Site', type: 'optimal' },
    { position: [-2.2, 0.3, 2.0] as [number, number, number], label: 'Exclusion', type: 'exclusion' },
  ], []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        child.position.y = markers[i].position[1] + Math.sin(state.clock.elapsedTime * 2 + i) * 0.1;
      });
    }
  });

  const getMarkerColor = (type: string) => {
    switch (type) {
      case 'solar': return '#fbbf24';
      case 'wind': return '#3b82f6';
      case 'optimal': return '#22c55e';
      case 'exclusion': return '#ef4444';
      default: return '#8b5cf6';
    }
  };

  // Only show markers after certain phases
  const showMarkers = phase !== 'data-collection';

  if (!showMarkers) return null;

  return (
    <group ref={groupRef}>
      {markers.map((marker, i) => (
        <Float key={i} speed={2} rotationIntensity={0.2} floatIntensity={0.3}>
          <group position={marker.position}>
            {/* Marker pin */}
            <mesh>
              <sphereGeometry args={[0.08, 16, 16]} />
              <meshStandardMaterial 
                color={getMarkerColor(marker.type)} 
                emissive={getMarkerColor(marker.type)}
                emissiveIntensity={0.5}
              />
            </mesh>
            {/* Glow ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.12, 0.18, 32]} />
              <meshBasicMaterial 
                color={getMarkerColor(marker.type)} 
                transparent 
                opacity={0.6}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* Vertical line */}
            <mesh position={[0, -marker.position[1] / 2, 0]}>
              <cylinderGeometry args={[0.01, 0.01, marker.position[1], 8]} />
              <meshBasicMaterial 
                color={getMarkerColor(marker.type)} 
                transparent 
                opacity={0.4}
              />
            </mesh>
          </group>
        </Float>
      ))}
    </group>
  );
}

// Animated grid floor
function GridFloor() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const gridMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
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
        varying vec2 vUv;
        
        void main() {
          vec2 uv = vUv * 40.0;
          
          float lineX = abs(fract(uv.x - 0.5) - 0.5) / fwidth(uv.x);
          float lineY = abs(fract(uv.y - 0.5) - 0.5) / fwidth(uv.y);
          float line = 1.0 - min(min(lineX, lineY), 1.0);
          
          // Radial fade
          float dist = length(vUv - 0.5) * 2.0;
          float fade = 1.0 - smoothstep(0.3, 1.0, dist);
          
          // Pulse effect
          float pulse = 0.5 + 0.5 * sin(uTime * 0.5 - dist * 3.0);
          
          vec3 color = vec3(0.1, 0.4, 0.6) * line * fade * pulse;
          float alpha = line * fade * 0.3;
          
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
    }
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
      <planeGeometry args={[30, 30]} />
      <primitive object={gridMaterial} ref={materialRef} attach="material" />
    </mesh>
  );
}

// Particle system for ambient effect
function AmbientParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  
  const [positions, velocities] = useMemo(() => {
    const count = 200;
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 1] = Math.random() * 8 - 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
      
      vel[i * 3] = (Math.random() - 0.5) * 0.01;
      vel[i * 3 + 1] = Math.random() * 0.02 + 0.01;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
    }
    
    return [pos, vel];
  }, []);

  useFrame(() => {
    if (pointsRef.current) {
      const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < pos.length / 3; i++) {
        pos[i * 3] += velocities[i * 3];
        pos[i * 3 + 1] += velocities[i * 3 + 1];
        pos[i * 3 + 2] += velocities[i * 3 + 2];
        
        // Reset particles that go too high
        if (pos[i * 3 + 1] > 6) {
          pos[i * 3 + 1] = -2;
          pos[i * 3] = (Math.random() - 0.5) * 15;
          pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
        }
      }
      
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#22d3ee"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

// Camera controller for smooth movements
function CameraController({ phase }: { phase: AnalysisPhase }) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(0, 0, 0));
  const positionRef = useRef(new THREE.Vector3(8, 6, 8));

  useEffect(() => {
    // Adjust camera based on phase
    switch (phase) {
      case 'data-collection':
        positionRef.current.set(10, 8, 10);
        break;
      case 'constraint-integration':
        positionRef.current.set(8, 5, 8);
        break;
      case 'technology-optimization':
        positionRef.current.set(6, 7, 6);
        break;
      case 'system-design':
        positionRef.current.set(5, 4, 8);
        break;
      case 'financial-modeling':
      case 'complete':
        positionRef.current.set(7, 5, 7);
        break;
    }
  }, [phase]);

  useFrame(() => {
    camera.position.lerp(positionRef.current, 0.02);
    camera.lookAt(targetRef.current);
  });

  return null;
}

// Main scene component
interface TerrainAnalysisSceneProps {
  phase: AnalysisPhase;
  progress: number;
  isVisible: boolean;
}

export function TerrainAnalysisScene({ 
  phase, 
  progress,
  isVisible 
}: TerrainAnalysisSceneProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 z-0"
        >
          <Canvas
            gl={{ 
              antialias: true, 
              alpha: true,
              powerPreference: 'high-performance'
            }}
            dpr={[1, 2]}
          >
            <color attach="background" args={['#0a0f1a']} />
            
            <PerspectiveCamera makeDefault position={[8, 6, 8]} fov={45} />
            <CameraController phase={phase} />
            
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 10, 5]} intensity={1} color="#ffffff" />
            <pointLight position={[-5, 5, -5]} intensity={0.5} color="#3b82f6" />
            <pointLight position={[5, 3, 5]} intensity={0.3} color="#22c55e" />
            
            <TerrainMesh phase={phase} progress={progress} />
            <AnalysisMarkers phase={phase} progress={progress} />
            <GridFloor />
            <AmbientParticles />
            
            <Stars radius={50} depth={50} count={1000} factor={4} fade speed={1} />
            
            <OrbitControls
              enableZoom={true}
              enablePan={false}
              minDistance={5}
              maxDistance={20}
              minPolarAngle={Math.PI / 6}
              maxPolarAngle={Math.PI / 2.5}
              autoRotate
              autoRotateSpeed={0.3}
            />
            
            <fog attach="fog" args={['#0a0f1a', 15, 35]} />
          </Canvas>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default TerrainAnalysisScene;
