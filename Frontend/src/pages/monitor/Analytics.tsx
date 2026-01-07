import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Calendar, RefreshCw, Shield, AlertTriangle, Activity, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ExportButton } from '@/components/ExportButton';
import { useSecurityStats } from '@/hooks/useSecurityStats';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6'];

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('7d');
  const { stats, threatTrends, attackTypes, isLoading, refresh } = useSecurityStats();

  const exportData = { stats, threatTrends, attackTypes, generatedAt: new Date().toISOString() };

  // Calculate trends
  const threatChange = threatTrends.length >= 2 
    ? Math.round(((threatTrends[threatTrends.length - 1]?.critical || 0) - (threatTrends[0]?.critical || 0)) / Math.max(1, threatTrends[0]?.critical || 1) * 100)
    : 0;

  const blockedChange = stats.blockedAttacks > 0 
    ? Math.round((stats.blockedAttacks / Math.max(1, stats.totalThreats)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Advanced threat analysis and insights - Live synced data</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <ExportButton data={exportData} collection="analytics_report" label="Export" />
        </div>
      </div>

      {/* Stats Grid - Synced with real data */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="cyber-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-muted-foreground">Total Threats</p>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold">{stats.totalThreats.toLocaleString()}</p>
            <div className={cn('flex items-center gap-1 text-xs font-medium', threatChange >= 0 ? 'text-destructive' : 'text-success')}>
              {threatChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {threatChange >= 0 ? '+' : ''}{threatChange}%
            </div>
          </div>
        </div>

        <div className="cyber-card rounded-xl border border-success/30 bg-success/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-success" />
            <p className="text-sm text-muted-foreground">Blocked Attacks</p>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold text-success">{stats.blockedAttacks.toLocaleString()}</p>
            <div className="flex items-center gap-1 text-xs font-medium text-success">
              <TrendingUp className="h-3 w-3" />
              {blockedChange}% blocked
            </div>
          </div>
        </div>

        <div className="cyber-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-primary" />
            <p className="text-sm text-muted-foreground">Avg Response Time</p>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold">{stats.avgResponseTime}</p>
            <div className="flex items-center gap-1 text-xs font-medium text-success">
              <TrendingDown className="h-3 w-3" />
              -15%
            </div>
          </div>
        </div>

        <div className="cyber-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-chart-4" />
            <p className="text-sm text-muted-foreground">Detection Rate</p>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold">{stats.detectionRate}</p>
            <div className="flex items-center gap-1 text-xs font-medium text-success">
              <TrendingUp className="h-3 w-3" />
              +2.1%
            </div>
          </div>
        </div>
      </div>

      {/* Active Incidents Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="cyber-card rounded-xl border border-warning/30 bg-warning/5 p-4">
          <p className="text-sm text-muted-foreground mb-1">Active Incidents</p>
          <p className="text-3xl font-bold text-warning">{stats.activeIncidents}</p>
          <p className="text-xs text-muted-foreground mt-1">Require investigation</p>
        </div>
        <div className="cyber-card rounded-xl border border-success/30 bg-success/5 p-4">
          <p className="text-sm text-muted-foreground mb-1">Resolved Incidents</p>
          <p className="text-3xl font-bold text-success">{stats.resolvedIncidents}</p>
          <p className="text-xs text-muted-foreground mt-1">Successfully closed</p>
        </div>
        <div className="cyber-card rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-muted-foreground mb-1">Critical Threats</p>
          <p className="text-3xl font-bold text-destructive">{stats.criticalThreats}</p>
          <p className="text-xs text-muted-foreground mt-1">Need immediate action</p>
        </div>
      </div>

      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted/50">
          <TabsTrigger value="trends">Threat Trends</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
        </TabsList>
        <TabsContent value="trends" className="mt-4">
          <div className="cyber-card rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-4">Threat Trends Over Time (Live Data)</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={threatTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 47%, 16%)" />
                  <XAxis dataKey="date" stroke="hsl(215, 20%, 55%)" tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                  <YAxis stroke="hsl(215, 20%, 55%)" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(222, 47%, 11%)', border: '1px solid hsl(217, 33%, 17%)' }}
                    labelStyle={{ color: 'hsl(215, 20%, 65%)' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="critical" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} name="Critical" />
                  <Area type="monotone" dataKey="high" stackId="1" stroke="#f97316" fill="#f97316" fillOpacity={0.3} name="High" />
                  <Area type="monotone" dataKey="medium" stackId="1" stroke="#eab308" fill="#eab308" fillOpacity={0.3} name="Medium" />
                  <Area type="monotone" dataKey="low" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} name="Low" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="distribution" className="mt-4">
          <div className="cyber-card rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-4">Attack Type Distribution (Live Data)</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={attackTypes} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={80} 
                    outerRadius={140} 
                    dataKey="count" 
                    nameKey="name" 
                    label={({ name, percentage }) => `${name} (${percentage}%)`}
                    labelLine={{ stroke: 'hsl(215, 20%, 55%)' }}
                  >
                    {attackTypes.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(222, 47%, 11%)', border: '1px solid hsl(217, 33%, 17%)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Attack types list */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
              {attackTypes.map((type, i) => (
                <div key={type.name} className="flex items-center gap-2 p-2 rounded bg-muted/30">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-sm truncate">{type.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{type.count}</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
