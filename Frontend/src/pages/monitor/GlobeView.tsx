import { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { Play, Pause, RotateCcw, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LiveAttack {
  id: string;
  type: string;
  severity: string;
  source: { ip: string; country: string; lat: number; lng: number; };
  target: { ip: string; country: string; lat: number; lng: number; };
  timestamp: string;
  confidence: number;
}

interface ThreatStreamData {
  globalThreatLevel: string;
  realtimeAttacks: LiveAttack[];
  threatActors: any[];
  geographicDistribution: any[];
  summary: string;
}

function latLngToVector3(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function AttackArc({ source, target, severity }: { source: { lat: number; lng: number }; target: { lat: number; lng: number }; severity: string; }) {
  const color = severity === 'critical' ? '#ef4444' : severity === 'high' ? '#f97316' : severity === 'medium' ? '#eab308' : '#22c55e';
  const points: THREE.Vector3[] = [];
  const sourceVec = latLngToVector3(source.lat, source.lng, 2);
  const targetVec = latLngToVector3(target.lat, target.lng, 2);
  
  for (let i = 0; i <= 50; i++) {
    const t = i / 50;
    const point = new THREE.Vector3().lerpVectors(sourceVec, targetVec, t);
    const height = Math.sin(t * Math.PI) * 0.5;
    point.normalize().multiplyScalar(2 + height);
    points.push(point);
  }

  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <group>
      <primitive object={new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 }))} />
      <mesh position={sourceVec}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={targetVec}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshBasicMaterial color="#00d4ff" />
      </mesh>
    </group>
  );
}

function Globe({ attacks, isRotating }: { attacks: LiveAttack[]; isRotating: boolean }) {
  const globeRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (globeRef.current && isRotating) {
      globeRef.current.rotation.y += 0.001;
    }
  });

  return (
    <group ref={globeRef}>
      <Sphere args={[2, 64, 64]}>
        <meshStandardMaterial color="#1a1f35" wireframe transparent opacity={0.3} />
      </Sphere>
      <Sphere args={[1.98, 64, 64]}>
        <meshStandardMaterial color="#0d1117" />
      </Sphere>
      <Sphere args={[2.01, 32, 32]}>
        <meshBasicMaterial color="#00d4ff" wireframe transparent opacity={0.05} />
      </Sphere>
      {attacks.slice(0, 15).map((attack) => (
        <AttackArc
          key={attack.id}
          source={{ lat: attack.source.lat, lng: attack.source.lng }}
          target={{ lat: attack.target.lat, lng: attack.target.lng }}
          severity={attack.severity}
        />
      ))}
    </group>
  );
}

function GlobeLoader() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Loading 3D Globe...</p>
      </div>
    </div>
  );
}

export default function GlobeView() {
  const [attacks, setAttacks] = useState<LiveAttack[]>([]);
  const [threatData, setThreatData] = useState<ThreatStreamData | null>(null);
  const [isRotating, setIsRotating] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLiveThreatStream = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('live-threat-stream', {
        body: { region: 'global' }
      });

      if (error) throw error;

      setThreatData(data);
      setAttacks(prev => {
        const newAttacks = data.realtimeAttacks || [];
        const combined = [...newAttacks, ...prev].slice(0, 30);
        return combined;
      });
      setIsLoading(false);
    } catch (error: any) {
      console.error('Live threat stream error:', error);
      toast.error('Failed to fetch live threat data');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveThreatStream();
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(fetchLiveThreatStream, 12000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-white';
      case 'high': return 'bg-warning text-black';
      case 'medium': return 'bg-chart-4 text-black';
      case 'low': return 'bg-success text-white';
      default: return 'bg-muted';
    }
  };

  const topAttackers = threatData?.geographicDistribution?.slice(0, 5) || [];
  const threatActors = threatData?.threatActors?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">3D Globe View</h1>
          <p className="text-muted-foreground">AI-powered interactive global network visualization</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchLiveThreatStream} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsPaused(!isPaused)}>
            {isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsRotating(!isRotating)}>
            <RotateCcw className={cn('h-4 w-4 mr-2', isRotating && 'animate-spin-slow')} />
            {isRotating ? 'Stop Rotation' : 'Auto Rotate'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 cyber-card rounded-xl border border-border h-[600px] overflow-hidden relative">
          <Suspense fallback={<GlobeLoader />}>
            <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
              <ambientLight intensity={0.3} />
              <pointLight position={[10, 10, 10]} intensity={0.8} />
              <pointLight position={[-10, -10, -10]} intensity={0.3} color="#00d4ff" />
              <Globe attacks={attacks} isRotating={isRotating} />
              <OrbitControls enableZoom={true} enablePan={false} minDistance={4} maxDistance={10} autoRotate={false} />
            </Canvas>
          </Suspense>

          <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg p-3 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-medium">Live AI Monitor</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Global Threat: <span className={cn("font-bold uppercase", 
                threatData?.globalThreatLevel === 'critical' ? 'text-destructive' :
                threatData?.globalThreatLevel === 'high' ? 'text-warning' : 'text-success'
              )}>{threatData?.globalThreatLevel || 'Loading...'}</span>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="cyber-card rounded-xl border border-border p-4">
            <h3 className="font-semibold mb-3">Top Attack Sources</h3>
            <div className="space-y-2">
              {topAttackers.length > 0 ? topAttackers.map((attacker: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}.</span>
                    <span className="text-sm">{attacker.country}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-destructive rounded-full" style={{ width: `${Math.min(100, (attacker.attackCount / 10) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-8">{attacker.attackCount}</span>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-muted-foreground">Loading threat data...</p>
              )}
            </div>
          </div>

          <div className="cyber-card rounded-xl border border-border p-4">
            <h3 className="font-semibold mb-3">Active Threat Actors</h3>
            <div className="space-y-2">
              {threatActors.length > 0 ? threatActors.map((actor: any, i: number) => (
                <div key={i} className="p-2 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{actor.name}</span>
                    <Badge variant="outline" className={cn("text-xs",
                      actor.activityLevel === 'high' ? 'border-destructive text-destructive' :
                      actor.activityLevel === 'medium' ? 'border-warning text-warning' : 'border-success text-success'
                    )}>{actor.activityLevel}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{actor.type}</p>
                </div>
              )) : (
                <p className="text-xs text-muted-foreground">Loading actor data...</p>
              )}
            </div>
          </div>

          <div className="cyber-card rounded-xl border border-border flex flex-col h-[250px]">
            <div className="p-3 border-b border-border">
              <h3 className="font-semibold text-sm">Live Feed</h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                {attacks.slice(0, 10).map((attack) => (
                  <div key={attack.id} className="p-2 rounded-lg bg-muted/30 text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={cn('text-[10px] px-1.5 py-0', getSeverityColor(attack.severity))}>
                        {attack.severity}
                      </Badge>
                      <span className="font-medium truncate">{attack.type}</span>
                    </div>
                    <p className="text-muted-foreground">
                      {attack.source.country} → {attack.target.country}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {threatData?.summary && (
        <div className="cyber-card rounded-xl border border-border p-4">
          <h3 className="font-semibold mb-2">AI Intelligence Summary</h3>
          <p className="text-sm text-muted-foreground">{threatData.summary}</p>
        </div>
      )}
    </div>
  );
}
