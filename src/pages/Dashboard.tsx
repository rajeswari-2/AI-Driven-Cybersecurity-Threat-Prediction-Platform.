import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Activity, Target, Zap, RefreshCw } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { RiskGauge } from '@/components/dashboard/RiskGauge';
import { ThreatFeed } from '@/components/dashboard/ThreatFeed';
import { ThreatChart } from '@/components/dashboard/ThreatChart';
import { Button } from '@/components/ui/button';
import { ExportButton } from '@/components/ExportButton';
import { useNavigate } from 'react-router-dom';
import { useLiveThreatData } from '@/hooks/useLiveThreatData';
import { useSecurityStats } from '@/hooks/useSecurityStats';

export default function Dashboard() {
  const navigate = useNavigate();
  const { attacks, threatData, isLoading: attacksLoading, refresh: refreshAttacks } = useLiveThreatData({
    autoRefresh: true,
    refreshInterval: 30000,
    limit: 20
  });

  const { stats, isLoading: statsLoading, refresh: refreshStats, blockAttack } = useSecurityStats();
  const [recommendations, setRecommendations] = useState<any[]>([]);

  const isLoading = attacksLoading || statsLoading;

  // Calculate risk score from synced stats
  const riskScore = Math.min(100, Math.round(
    (stats.activeIncidents * 5) + 
    (stats.criticalThreats * 10) + 
    (stats.highThreats * 5) +
    (stats.liveAttacksCount * 2) -
    (stats.blockedAttacks * 3) // Reduce risk for blocked attacks
  ));

  const generateRecommendations = () => {
    const recs = [];
    
    if (stats.criticalThreats > 0) {
      recs.push({
        title: 'Review Critical Threats',
        description: `${stats.criticalThreats} critical threat indicators need immediate attention`,
        priority: 'critical',
        action: () => navigate('/monitor/threat-feed')
      });
    }
    
    if (stats.activeIncidents > 5) {
      recs.push({
        title: 'Incident Backlog',
        description: `${stats.activeIncidents} open incidents require investigation`,
        priority: 'high',
        action: () => navigate('/incidents')
      });
    }
    
    if (stats.liveAttacksCount > 10 && stats.blockedAttacks < stats.liveAttacksCount * 0.3) {
      recs.push({
        title: 'Block More Attacks',
        description: `Only ${stats.blockedAttacks} of ${stats.liveAttacksCount} attacks blocked. Review and block threats.`,
        priority: 'high',
        action: () => navigate('/monitor/live-map')
      });
    }

    if (threatData?.recommendations) {
      threatData.recommendations.slice(0, 2).forEach((rec: string, i: number) => {
        recs.push({
          title: `AI Insight ${i + 1}`,
          description: rec,
          priority: 'medium',
          action: () => navigate('/ai/predictions')
        });
      });
    }

    recs.push({
      title: 'Run Security Scan',
      description: 'Regular scanning helps identify new vulnerabilities',
      priority: 'medium',
      action: () => navigate('/scanner/website')
    });

    setRecommendations(recs.slice(0, 4));
  };

  useEffect(() => {
    generateRecommendations();
  }, [stats, threatData]);

  const handleRefresh = async () => {
    await Promise.all([refreshAttacks(), refreshStats()]);
  };

  const exportData = {
    stats,
    liveAttacks: attacks,
    threatData,
    recommendations,
    generatedAt: new Date().toISOString()
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Security Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time threat monitoring and analysis
            {threatData?.globalThreatLevel && (
              <span className={`ml-2 font-semibold uppercase ${
                threatData.globalThreatLevel === 'critical' ? 'text-destructive' :
                threatData.globalThreatLevel === 'high' ? 'text-warning' :
                'text-success'
              }`}>
                • {threatData.globalThreatLevel} threat level
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" className="border-primary/30 hover:bg-primary/10" onClick={() => navigate('/scanner/api')}>
            <Zap className="h-4 w-4 mr-2" />
            Run API Scan
          </Button>
          <ExportButton data={exportData} collection="dashboard_report" label="Export Report" />
        </div>
      </div>

      {/* Stats Grid - Now fully synced */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Threats"
          value={stats.totalThreats.toLocaleString()}
          subtitle="Detected attacks"
          icon={AlertTriangle}
          trend={{ value: 12, isPositive: false }}
          variant="critical"
        />
        <StatCard
          title="Blocked Attacks"
          value={stats.blockedAttacks.toLocaleString()}
          subtitle="Successfully blocked"
          icon={Shield}
          trend={{ value: stats.blockedAttacks > 0 ? Math.round((stats.blockedAttacks / Math.max(1, stats.totalThreats)) * 100) : 0, isPositive: true }}
          variant="success"
        />
        <StatCard
          title="Active Incidents"
          value={stats.activeIncidents}
          subtitle="Require attention"
          icon={Activity}
          variant="warning"
        />
        <StatCard
          title="Live Attacks"
          value={stats.liveAttacksCount}
          subtitle="Current monitoring"
          icon={Target}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Score */}
        <div className="cyber-card rounded-xl border border-border p-6 flex flex-col items-center justify-center">
          <h3 className="font-semibold mb-4">Global Risk Score</h3>
          <RiskGauge score={riskScore} size="lg" />
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Based on {stats.liveAttacksCount} live attacks, {stats.blockedAttacks} blocked
          </p>
        </div>

        {/* Threat Chart */}
        <div className="lg:col-span-2">
          <ThreatChart />
        </div>
      </div>

      {/* Live Feed with Block functionality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ThreatFeed attacks={attacks} isLoading={attacksLoading} onBlockAttack={blockAttack} />
        
        {/* Quick Actions */}
        <div className="cyber-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">AI Recommendations</h3>
            {threatData?.summary && (
              <span className="text-xs text-muted-foreground">AI-powered</span>
            )}
          </div>
          <div className="space-y-3">
            {recommendations.map((item, i) => (
              <div key={i} className="p-4 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
                      item.priority === 'critical' ? 'bg-critical' :
                      item.priority === 'high' ? 'bg-high' : 'bg-medium'
                    } text-white`}>
                      {item.priority}
                    </span>
                    <span className="font-medium">{item.title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <Button size="sm" variant="outline" onClick={item.action}>View</Button>
              </div>
            ))}
          </div>
          
          {threatData?.summary && (
            <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">AI Threat Summary</p>
              <p className="text-sm">{threatData.summary}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
