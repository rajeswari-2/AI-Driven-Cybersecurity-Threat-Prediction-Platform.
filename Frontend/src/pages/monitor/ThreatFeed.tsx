import { useState, useEffect } from 'react';
import { Database, Search, Filter, RefreshCw, AlertTriangle, Shield, ShieldOff, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ExportButton } from '@/components/ExportButton';
import { toast } from 'sonner';
import { useSecurityStats } from '@/hooks/useSecurityStats';
import { formatDistanceToNow } from 'date-fns';

interface LiveAttack {
  id: string;
  source_ip: string;
  source_country: string | null;
  target_ip: string | null;
  target_country: string | null;
  attack_type: string;
  severity: string;
  detected_at: string | null;
}

export default function ThreatFeed() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [liveAttacks, setLiveAttacks] = useState<LiveAttack[]>([]);
  const [loading, setLoading] = useState(true);
  const [blockedIps, setBlockedIps] = useState<Set<string>>(new Set());
  
  const { stats, blockAttack, refresh: refreshStats } = useSecurityStats();

  const fetchLiveAttacks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('live_attacks')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(200);

    if (error) {
      toast.error('Failed to load live attacks');
    } else {
      setLiveAttacks(data || []);
    }
    setLoading(false);
  };

  const fetchBlockedIps = async () => {
    const { data } = await supabase
      .from('blocked_attacks')
      .select('source_ip');
    
    if (data) {
      setBlockedIps(new Set(data.map(b => b.source_ip)));
    }
  };

  useEffect(() => {
    fetchLiveAttacks();
    fetchBlockedIps();
    
    // Real-time subscription for live attacks
    const attacksChannel = supabase
      .channel('threat-feed-attacks')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_attacks' }, (payload) => {
        const newAttack = payload.new as LiveAttack;
        setLiveAttacks(prev => [newAttack, ...prev].slice(0, 200));
      })
      .subscribe();

    // Real-time subscription for blocked attacks
    const blockedChannel = supabase
      .channel('threat-feed-blocked')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blocked_attacks' }, () => {
        fetchBlockedIps();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(attacksChannel);
      supabase.removeChannel(blockedChannel);
    };
  }, []);

  const handleBlockAttack = async (attack: LiveAttack) => {
    const success = await blockAttack(
      attack.id,
      attack.source_ip,
      attack.attack_type,
      attack.severity,
      `Blocked from Threat Feed - ${attack.attack_type} from ${attack.source_country || 'Unknown'}`
    );
    if (success) {
      setBlockedIps(prev => new Set([...prev, attack.source_ip]));
    }
  };

  const filteredAttacks = liveAttacks.filter(attack => {
    const matchesSearch = searchQuery === '' || 
      attack.source_ip?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attack.attack_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attack.source_country?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || attack.attack_type === typeFilter;
    const matchesSeverity = severityFilter === 'all' || attack.severity === severityFilter;
    return matchesSearch && matchesType && matchesSeverity;
  });

  const attackTypes = [...new Set(liveAttacks.map(a => a.attack_type))];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-critical text-white';
      case 'high': return 'bg-high text-white';
      case 'medium': return 'bg-medium text-black';
      case 'low': return 'bg-low text-white';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Threat Intelligence Feed</h1>
          <p className="text-muted-foreground">Live threat monitoring - Data persists across sessions</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => { fetchLiveAttacks(); refreshStats(); }} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <ExportButton data={filteredAttacks} collection="live_attacks" label="Export Threats" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" /> Live Threats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.liveAttacksCount}</div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" /> Blocked Attacks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.blockedAttacks}</div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-critical" /> Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-critical">{stats.criticalThreats}</div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-high" /> High Severity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-high">{stats.highThreats}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="cyber-card rounded-xl border border-border p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search IP, type, country..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-muted/50" />
            </div>
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {attackTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-40"><AlertTriangle className="h-4 w-4 mr-2" /><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Live Attacks Table */}
      <div className="cyber-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Live Threat Feed
            <span className="relative flex h-2 w-2 ml-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          </h3>
          <span className="text-sm text-muted-foreground">{filteredAttacks.length} threats</span>
        </div>
        <ScrollArea className="h-[500px]">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Source IP</th>
                <th>Country</th>
                <th>Target</th>
                <th>Attack Type</th>
                <th>Severity</th>
                <th>Detected</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8">Loading...</td></tr>
              ) : filteredAttacks.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No threats found</td></tr>
              ) : (
                filteredAttacks.map((attack) => (
                  <tr key={attack.id} className="hover:bg-muted/30">
                    <td>
                      <code className="text-xs font-mono bg-muted/50 px-2 py-1 rounded">
                        {attack.source_ip}
                      </code>
                    </td>
                    <td className="text-sm">{attack.source_country || 'Unknown'}</td>
                    <td className="text-sm text-muted-foreground">{attack.target_country || 'N/A'}</td>
                    <td className="text-sm">{attack.attack_type}</td>
                    <td><Badge className={getSeverityColor(attack.severity)}>{attack.severity}</Badge></td>
                    <td className="text-sm text-muted-foreground">
                      {attack.detected_at ? formatDistanceToNow(new Date(attack.detected_at), { addSuffix: true }) : 'Just now'}
                    </td>
                    <td>
                      {blockedIps.has(attack.source_ip) ? (
                        <Badge variant="outline" className="text-green-500 border-green-500">
                          <Shield className="h-3 w-3 mr-1" /> Blocked
                        </Badge>
                      ) : (
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleBlockAttack(attack)}
                          className="h-7 text-xs"
                        >
                          <ShieldOff className="h-3 w-3 mr-1" /> Block
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ScrollArea>
      </div>
    </div>
  );
}
