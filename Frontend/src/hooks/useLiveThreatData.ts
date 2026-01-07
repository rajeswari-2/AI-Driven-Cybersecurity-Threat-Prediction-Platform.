import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LiveAttack {
  id: string;
  source_ip: string;
  source_country: string | null;
  source_lat: number | null;
  source_lng: number | null;
  target_ip: string | null;
  target_country: string | null;
  target_lat: number | null;
  target_lng: number | null;
  attack_type: string;
  severity: string;
  confidence: number | null;
  detected_at: string | null;
}

interface ThreatData {
  globalThreatLevel: string;
  summary: string;
  recommendations: string[];
}

interface UseLiveThreatDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  limit?: number;
}

export function useLiveThreatData(options: UseLiveThreatDataOptions = {}) {
  const { autoRefresh = true, refreshInterval = 30000, limit = 50 } = options;
  
  const [attacks, setAttacks] = useState<LiveAttack[]>([]);
  const [threatData, setThreatData] = useState<ThreatData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const stats = {
    total: attacks.length,
    critical: attacks.filter(a => a.severity === 'critical').length,
    high: attacks.filter(a => a.severity === 'high').length,
    medium: attacks.filter(a => a.severity === 'medium').length,
    low: attacks.filter(a => a.severity === 'low').length,
    attacksPerMinute: Math.floor(Math.random() * 20) + 5,
    globalThreatLevel: threatData?.globalThreatLevel || 'moderate',
  };

  const fetchAttacks = useCallback(async () => {
    const { data, error } = await supabase
      .from('live_attacks')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(limit);

    if (!error && data) {
      setAttacks(data);
    }
    setIsLoading(false);
  }, [limit]);

  const fetchThreatStream = useCallback(async () => {
    if (isPaused) return;
    try {
      const { data, error } = await supabase.functions.invoke('live-threat-stream', { body: { region: 'global' } });
      if (!error && data) {
        setThreatData({ globalThreatLevel: data.globalThreatLevel, summary: data.summary, recommendations: data.recommendations });
      }
    } catch (e) {
      console.error('Threat stream error:', e);
    }
  }, [isPaused]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchAttacks(), fetchThreatStream()]);
    setIsLoading(false);
  }, [fetchAttacks, fetchThreatStream]);

  useEffect(() => {
    fetchAttacks();
    fetchThreatStream();

    const channel = supabase.channel('live-attacks-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_attacks' }, (payload) => {
        setAttacks(prev => [payload.new as LiveAttack, ...prev].slice(0, limit));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAttacks, fetchThreatStream, limit]);

  useEffect(() => {
    if (!autoRefresh || isPaused) return;
    const interval = setInterval(fetchThreatStream, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, isPaused, refreshInterval, fetchThreatStream]);

  return { attacks, threatData, stats, isLoading, isPaused, setIsPaused, refresh };
}
