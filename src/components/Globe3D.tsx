import { useRef, useMemo } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { OrbitControls, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';

extend({ Line2, LineMaterial, LineGeometry });

interface Attack {
  id: string;
  source_lat: number;
  source_lng: number;
  target_lat: number;
  target_lng: number;
  severity: string;
  attack_type: string;
  source_country?: string;
}

interface Globe3DProps {
  attacks: Attack[];
}

function latLongToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  
  return new THREE.Vector3(x, y, z);
}

function AttackArc({ source, target, severity }: { source: THREE.Vector3; target: THREE.Vector3; severity: string }) {
  const color = useMemo(() => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      default: return '#22c55e';
    }
  }, [severity]);
  
  const points = useMemo(() => {
    const mid = new THREE.Vector3().addVectors(source, target).multiplyScalar(0.5);
    const distance = source.distanceTo(target);
    mid.normalize().multiplyScalar(2 + distance * 0.3);
    
    const curve = new THREE.QuadraticBezierCurve3(source, mid, target);
    return curve.getPoints(50);
  }, [source, target]);
  
  return (
    <mesh>
      {points.slice(0, -1).map((point, i) => {
        const nextPoint = points[i + 1];
        const midPoint = new THREE.Vector3().addVectors(point, nextPoint).multiplyScalar(0.5);
        const direction = new THREE.Vector3().subVectors(nextPoint, point);
        const length = direction.length();
        
        return (
          <mesh key={i} position={midPoint}>
            <boxGeometry args={[0.01, 0.01, length]} />
            <meshBasicMaterial color={color} transparent opacity={0.7} />
          </mesh>
        );
      })}
    </mesh>
  );
}

function AttackPoint({ position, severity, type }: { position: THREE.Vector3; severity: string; type: string }) {
  const ref = useRef<THREE.Mesh>(null);
  
  const color = useMemo(() => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      default: return '#22c55e';
    }
  }, [severity]);
  
  useFrame(({ clock }) => {
    if (ref.current) {
      const scale = 1 + Math.sin(clock.elapsedTime * 4) * 0.3;
      ref.current.scale.setScalar(scale);
    }
  });
  
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.03, 16, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} />
    </mesh>
  );
}

function GlobeCore() {
  const globeRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (globeRef.current) {
      globeRef.current.rotation.y = clock.elapsedTime * 0.05;
    }
  });
  
  return (
    <>
      {/* Main globe */}
      <Sphere ref={globeRef} args={[2, 64, 64]}>
        <meshPhongMaterial
          color="#1e293b"
          emissive="#0ea5e9"
          emissiveIntensity={0.1}
          transparent
          opacity={0.9}
          wireframe={false}
        />
      </Sphere>
      
      {/* Grid lines */}
      <Sphere args={[2.01, 32, 32]}>
        <meshBasicMaterial
          color="#0ea5e9"
          transparent
          opacity={0.15}
          wireframe
        />
      </Sphere>
      
      {/* Atmosphere glow */}
      <Sphere ref={atmosphereRef} args={[2.15, 32, 32]}>
        <meshBasicMaterial
          color="#0ea5e9"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </Sphere>
    </>
  );
}

function Scene({ attacks }: { attacks: Attack[] }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#0ea5e9" />
      
      <GlobeCore />
      
      {attacks.slice(0, 20).map((attack) => {
        const sourcePos = latLongToVector3(attack.source_lat || 0, attack.source_lng || 0, 2.05);
        const targetPos = latLongToVector3(attack.target_lat || 0, attack.target_lng || 0, 2.05);
        
        return (
          <group key={attack.id}>
            <AttackArc source={sourcePos} target={targetPos} severity={attack.severity} />
            <AttackPoint position={sourcePos} severity={attack.severity} type={attack.attack_type} />
            <AttackPoint position={targetPos} severity="low" type="target" />
          </group>
        );
      })}
      
      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minDistance={3}
        maxDistance={8}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </>
  );
}

export function Globe3D({ attacks }: Globe3DProps) {
  return (
    <div className="w-full h-full bg-background rounded-lg overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        style={{ background: 'transparent' }}
      >
        <Scene attacks={attacks} />
      </Canvas>
      
      {/* Legend overlay */}
      <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg p-3 border border-border">
        <p className="text-xs font-semibold mb-2">Attack Severity</p>
        <div className="space-y-1">
          {[
            { label: 'Critical', color: 'bg-destructive' },
            { label: 'High', color: 'bg-warning' },
            { label: 'Medium', color: 'bg-primary' },
            { label: 'Low', color: 'bg-success' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${item.color}`} />
              <span className="text-xs">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Controls hint */}
      <div className="absolute top-4 right-4 bg-card/80 backdrop-blur-sm rounded px-2 py-1 border border-border">
        <span className="text-xs text-muted-foreground">Drag to rotate • Scroll to zoom</span>
      </div>
    </div>
  );
}
