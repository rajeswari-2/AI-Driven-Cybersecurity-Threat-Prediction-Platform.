import { Activity, AlertTriangle, Shield, Filter, Pause, Play, Maximize2, RefreshCw, Loader2, Globe, Map, Satellite } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useState, Suspense } from 'react';
import { useLiveThreatData } from '@/hooks/useLiveThreatData';
import { Globe3D } from '@/components/Globe3D';

// Simple SVG World Map component
const WorldMap = ({ attacks }: { attacks: any[] }) => {
  return (
    <div className="relative w-full h-full bg-background rounded-lg overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-30" />
      
      <svg viewBox="0 0 1000 500" className="w-full h-full" style={{ background: 'transparent' }}>
        <g fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.5">
          <path d="M150,120 L250,100 L280,130 L290,180 L250,220 L200,240 L150,220 L120,180 Z" />
          <path d="M220,260 L280,250 L300,320 L280,400 L240,420 L200,380 L210,300 Z" />
          <path d="M450,100 L520,90 L540,120 L530,160 L480,170 L450,150 Z" />
          <path d="M450,180 L530,170 L560,220 L550,320 L500,360 L440,320 L430,240 Z" />
          <path d="M550,80 L750,60 L820,120 L800,200 L700,220 L600,200 L560,160 L570,100 Z" />
          <path d="M780,300 L860,280 L880,320 L860,380 L800,390 L760,350 Z" />
        </g>

        {attacks.slice(0, 15).map((attack) => {
          const sourceX = ((attack.source_lng + 180) / 360) * 1000;
          const sourceY = ((90 - attack.source_lat) / 180) * 500;
          const targetX = ((attack.target_lng + 180) / 360) * 1000;
          const targetY = ((90 - attack.target_lat) / 180) * 500;
          
          const color = attack.severity === 'critical' ? 'hsl(var(--destructive))' :
                       attack.severity === 'high' ? 'hsl(var(--warning))' :
                       attack.severity === 'medium' ? 'hsl(var(--chart-4))' :
                       'hsl(var(--success))';

          return (
            <g key={attack.id}>
              <line x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}
                stroke={color} strokeWidth="1.5" opacity="0.7" strokeDasharray="5,5">
                <animate attributeName="stroke-dashoffset" from="10" to="0" dur="1s" repeatCount="indefinite" />
              </line>
              <circle cx={sourceX} cy={sourceY} r="5" fill={color}>
                <animate attributeName="r" values="5;10;5" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={targetX} cy={targetY} r="4" fill="hsl(var(--primary))" />
            </g>
          );
        })}
      </svg>

      <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg p-3 border border-border">
        <p className="text-xs font-semibold mb-2">Attack Severity</p>
        <div className="space-y-1">
          {[
            { label: 'Critical', color: 'bg-destructive' },
            { label: 'High', color: 'bg-warning' },
            { label: 'Medium', color: 'bg-chart-4' },
            { label: 'Low', color: 'bg-success' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={cn('h-2 w-2 rounded-full', item.color)} />
              <span className="text-xs">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Satellite Map Component (using OpenStreetMap tiles as placeholder)
const SatelliteMap = ({ attacks }: { attacks: any[] }) => {
  return (
    <div className="relative w-full h-full bg-slate-900 rounded-lg overflow-hidden">
      {/* Satellite-style dark background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      {/* Simulated satellite view with terrain */}
      <svg viewBox="0 0 1000 500" className="w-full h-full relative z-10" style={{ background: 'transparent' }}>
        {/* Ocean background */}
        <rect width="1000" height="500" fill="#0c1929" />
        
        {/* Continents with satellite-style coloring */}
        <g fill="#1a3a2f" stroke="#2d5a4a" strokeWidth="1">
          {/* North America */}
          <path d="M80,80 Q120,60 180,70 Q240,80 280,120 Q300,160 280,200 Q250,240 200,260 Q150,250 120,220 Q80,180 70,140 Q70,100 80,80 Z" />
          {/* South America */}
          <path d="M200,280 Q240,270 270,290 Q290,330 280,380 Q260,420 230,440 Q190,430 180,390 Q170,340 200,280 Z" />
          {/* Europe */}
          <path d="M440,80 Q480,70 520,80 Q540,100 530,130 Q510,150 470,160 Q440,150 430,120 Q430,90 440,80 Z" />
          {/* Africa */}
          <path d="M450,170 Q500,160 540,180 Q560,220 550,280 Q530,340 490,370 Q450,360 430,310 Q420,250 430,200 Q440,180 450,170 Z" />
          {/* Asia */}
          <path d="M550,60 Q650,50 750,70 Q820,100 830,160 Q820,220 750,250 Q680,260 620,240 Q570,210 550,160 Q540,100 550,60 Z" />
          {/* Australia */}
          <path d="M780,300 Q830,290 870,310 Q890,340 880,380 Q850,400 810,400 Q770,390 760,360 Q760,330 780,300 Z" />
        </g>
        
        {/* City lights effect */}
        {[
          { x: 180, y: 140, size: 3 }, // NYC
          { x: 140, y: 160, size: 2 }, // LA
          { x: 240, y: 330, size: 2 }, // São Paulo
          { x: 470, y: 110, size: 3 }, // London
          { x: 490, y: 120, size: 2 }, // Paris
          { x: 590, y: 130, size: 2 }, // Moscow
          { x: 720, y: 150, size: 3 }, // Beijing
          { x: 750, y: 170, size: 3 }, // Tokyo
          { x: 650, y: 210, size: 2 }, // Mumbai
          { x: 840, y: 340, size: 2 }, // Sydney
        ].map((city, i) => (
          <circle key={i} cx={city.x} cy={city.y} r={city.size} fill="#fbbf24" opacity="0.6">
            <animate attributeName="opacity" values="0.4;0.8;0.4" dur="3s" repeatCount="indefinite" begin={`${i * 0.2}s`} />
          </circle>
        ))}

        {/* Attack visualization */}
        {attacks.slice(0, 15).map((attack) => {
          const sourceX = ((attack.source_lng + 180) / 360) * 1000;
          const sourceY = ((90 - attack.source_lat) / 180) * 500;
          const targetX = ((attack.target_lng + 180) / 360) * 1000;
          const targetY = ((90 - attack.target_lat) / 180) * 500;
          
          const color = attack.severity === 'critical' ? '#ef4444' :
                       attack.severity === 'high' ? '#f59e0b' :
                       attack.severity === 'medium' ? '#3b82f6' :
                       '#22c55e';

          return (
            <g key={attack.id}>
              {/* Attack arc with glow */}
              <line x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}
                stroke={color} strokeWidth="2" opacity="0.8" strokeDasharray="8,4">
                <animate attributeName="stroke-dashoffset" from="12" to="0" dur="0.5s" repeatCount="indefinite" />
              </line>
              {/* Source point with pulse */}
              <circle cx={sourceX} cy={sourceY} r="6" fill={color} opacity="0.3">
                <animate attributeName="r" values="6;15;6" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0;0.3" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <circle cx={sourceX} cy={sourceY} r="4" fill={color} />
              {/* Target point */}
              <circle cx={targetX} cy={targetY} r="3" fill="#60a5fa" />
            </g>
          );
        })}
      </svg>

      {/* Satellite view overlay info */}
      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded px-3 py-2 border border-cyan-500/30">
        <div className="flex items-center gap-2">
          <Satellite className="h-4 w-4 text-cyan-400" />
          <span className="text-xs text-cyan-400 font-mono">SATELLITE VIEW</span>
        </div>
        <p className="text-xs text-slate-400 mt-1">Real-time threat overlay</p>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 border border-slate-700">
        <p className="text-xs font-semibold mb-2 text-slate-300">Threat Level</p>
        <div className="space-y-1">
          {[
            { label: 'Critical', color: 'bg-red-500' },
            { label: 'High', color: 'bg-amber-500' },
            { label: 'Medium', color: 'bg-blue-500' },
            { label: 'Low', color: 'bg-green-500' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={cn('h-2 w-2 rounded-full', item.color)} />
              <span className="text-xs text-slate-400">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function LiveMap() {
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'flat' | '3d' | 'satellite'>('3d');
  const { 
    attacks, 
    threatData, 
    stats, 
    isLoading, 
    isPaused, 
    setIsPaused, 
    refresh 
  } = useLiveThreatData({
    autoRefresh: true,
    refreshInterval: 10000,
    limit: 50
  });

  // Transform attacks for map visualization
  const mapAttacks = attacks.map(attack => ({
    id: attack.id,
    type: attack.attack_type,
    severity: attack.severity,
    source_ip: attack.source_ip,
    source_country: attack.source_country,
    source_lat: attack.source_lat || 0,
    source_lng: attack.source_lng || 0,
    target_ip: attack.target_ip,
    target_country: attack.target_country,
    target_lat: attack.target_lat || 0,
    target_lng: attack.target_lng || 0,
    timestamp: attack.detected_at,
    attack_type: attack.attack_type,
    confidence: Math.floor(Math.random() * 30) + 70
  }));

  const filteredAttacks = filter === 'all' 
    ? mapAttacks 
    : mapAttacks.filter(a => a.severity === filter);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-white';
      case 'high': return 'bg-warning text-black';
      case 'medium': return 'bg-chart-4 text-black';
      case 'low': return 'bg-success text-white';
      default: return 'bg-muted';
    }
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-destructive';
      case 'high': return 'text-warning';
      case 'elevated': return 'text-chart-4';
      case 'moderate': return 'text-chart-3';
      default: return 'text-success';
    }
  };

  const renderMapView = () => {
    if (isLoading && attacks.length === 0) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    switch (viewMode) {
      case '3d':
        return (
          <Suspense fallback={
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Loading 3D Globe...</span>
            </div>
          }>
            <Globe3D attacks={filteredAttacks} />
          </Suspense>
        );
      case 'satellite':
        return <SatelliteMap attacks={filteredAttacks} />;
      default:
        return <WorldMap attacks={filteredAttacks} />;
    }
  };

  return (
    <div className="space-y-6 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Live Attack Map</h1>
          <p className="text-muted-foreground">Real-time AI-powered global cyber attack monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Selector */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="mr-2">
            <TabsList className="h-9">
              <TabsTrigger value="flat" className="px-3">
                <Map className="h-4 w-4 mr-1" />
                2D
              </TabsTrigger>
              <TabsTrigger value="3d" className="px-3">
                <Globe className="h-4 w-4 mr-1" />
                3D
              </TabsTrigger>
              <TabsTrigger value="satellite" className="px-3">
                <Satellite className="h-4 w-4 mr-1" />
                Satellite
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsPaused(!isPaused)}>
            {isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          <Button variant="outline" size="icon">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <div className="cyber-card rounded-lg border border-border p-4 flex items-center gap-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.attacksPerMinute}</p>
            <p className="text-xs text-muted-foreground">Attacks/min</p>
          </div>
        </div>
        <div className="cyber-card rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-center gap-4">
          <div className="p-2 rounded-lg bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-bold text-destructive">{stats.critical}</p>
            <p className="text-xs text-muted-foreground">Critical Threats</p>
          </div>
        </div>
        <div className="cyber-card rounded-lg border border-border p-4 flex items-center gap-4">
          <div className="p-2 rounded-lg bg-success/10">
            <Shield className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Detected</p>
          </div>
        </div>
        <div className="cyber-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-muted-foreground">Global Threat Level</span>
          </div>
          <p className={cn("text-lg font-bold uppercase", getThreatLevelColor(stats.globalThreatLevel))}>
            {stats.globalThreatLevel}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
        <div className="lg:col-span-2 cyber-card rounded-xl border border-border overflow-hidden relative">
          {renderMapView()}
        </div>

        <div className="cyber-card rounded-xl border border-border flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold">Live Attack Feed</h3>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-32 h-8">
                <Filter className="h-3 w-3 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {filteredAttacks.slice(0, 20).map((attack) => (
                <div
                  key={attack.id}
                  className={cn(
                    'p-3 rounded-lg border border-border/50 bg-muted/20 transition-all',
                    attack.severity === 'critical' && 'border-destructive/30 bg-destructive/5'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getSeverityColor(attack.severity)}>
                      {attack.severity}
                    </Badge>
                    <span className="text-sm font-medium">{attack.type}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{attack.confidence}%</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center justify-between">
                      <span>From: {attack.source_country}</span>
                      <code className="font-mono bg-muted/50 px-1 rounded">{attack.source_ip}</code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>To: {attack.target_country}</span>
                      <span>{formatDistanceToNow(new Date(attack.timestamp), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Threat Summary */}
      {threatData?.summary && (
        <div className="cyber-card rounded-xl border border-border p-4">
          <h3 className="font-semibold mb-2">AI Threat Summary</h3>
          <p className="text-sm text-muted-foreground">{threatData.summary}</p>
        </div>
      )}
    </div>
  );
}
