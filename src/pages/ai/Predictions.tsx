import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ExportButton } from '@/components/ExportButton';
import { 
  Brain, TrendingUp, AlertTriangle, Shield, Target,
  Zap, RefreshCw, BarChart3, Activity, Sparkles, ChevronRight, Loader2,
  Globe, Link2, QrCode, FileCode, Database
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ScanResult {
  id: string;
  scan_type: string;
  target: string;
  status: string;
  result: any;
  threats_found: number | null;
  severity: string | null;
  completed_at: string | null;
  created_at: string;
}

const scanTypeIcons: Record<string, typeof Globe> = {
  website: Globe,
  api: Link2,
  qr: QrCode,
  static: FileCode
};

const scanTypeLabels: Record<string, string> = {
  website: 'Website',
  api: 'API',
  qr: 'QR Code',
  static: 'Static File'
};

const severityColors: Record<string, string> = {
  critical: 'bg-destructive text-white',
  high: 'bg-warning text-black',
  medium: 'bg-chart-4 text-black',
  low: 'bg-success text-white'
};

export default function Predictions() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [multiAgentResults, setMultiAgentResults] = useState<any>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [loadingScans, setLoadingScans] = useState(true);

  useEffect(() => {
    fetchScanHistory();
  }, []);

  const fetchScanHistory = async () => {
    setLoadingScans(true);
    const { data, error } = await supabase
      .from('scan_results')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Failed to fetch scan history:', error);
    } else {
      setScanHistory(data || []);
    }
    setLoadingScans(false);
  };

  const runMultiAgentAnalysis = async () => {
    if (scanHistory.length === 0) {
      toast.error('No scan data available. Run some scans first.');
      return;
    }

    setIsAnalyzing(true);
    setMultiAgentResults(null);

    try {
      // Prepare scan data summary for AI analysis
      const scanSummary = {
        totalScans: scanHistory.length,
        scansByType: {
          website: scanHistory.filter(s => s.scan_type === 'website').length,
          api: scanHistory.filter(s => s.scan_type === 'api').length,
          qr: scanHistory.filter(s => s.scan_type === 'qr').length,
          static: scanHistory.filter(s => s.scan_type === 'static').length,
        },
        severityDistribution: {
          critical: scanHistory.filter(s => s.severity === 'critical').length,
          high: scanHistory.filter(s => s.severity === 'high').length,
          medium: scanHistory.filter(s => s.severity === 'medium').length,
          low: scanHistory.filter(s => s.severity === 'low').length,
        },
        totalThreatsFound: scanHistory.reduce((sum, s) => sum + (s.threats_found || 0), 0),
        recentScans: scanHistory.slice(0, 10).map(s => ({
          type: s.scan_type,
          target: s.target,
          severity: s.severity,
          threats: s.threats_found,
          vulnerabilities: s.result?.vulnerabilities || s.result?.threats_detected || [],
        })),
      };

      const { data, error } = await supabase.functions.invoke('multi-agent-analysis', {
        body: {
          scanType: 'threat_prediction',
          target: 'organization_assets',
          scanData: scanSummary,
          context: {
            recentScans: scanHistory.length,
            totalVulnerabilities: scanSummary.totalThreatsFound,
            exposedServices: Object.entries(scanSummary.scansByType)
              .filter(([_, count]) => count > 0)
              .map(([type]) => type),
            industryVertical: 'technology'
          },
          userContext: {
            securityPosture: scanSummary.severityDistribution.critical > 0 ? 'critical' : 
                            scanSummary.severityDistribution.high > 2 ? 'weak' : 'moderate',
            complianceRequirements: ['SOC2', 'GDPR'],
            assetCriticality: 'high'
          }
        }
      });

      if (error) {
        if (error.message?.includes('429')) {
          toast.error('Rate limited. Please try again later.');
          return;
        }
        if (error.message?.includes('402')) {
          toast.error('Credits required. Please add funds.');
          return;
        }
        throw error;
      }

      setMultiAgentResults(data);
      toast.success('Multi-agent AI analysis complete');
    } catch (error: any) {
      console.error('Multi-agent analysis error:', error);
      toast.error(`Analysis failed: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getInsightBadge = (type: string) => {
    const variants: Record<string, string> = {
      critical: 'bg-destructive/20 text-destructive border-destructive/30',
      high: 'bg-warning/20 text-warning border-warning/30',
      medium: 'bg-chart-4/20 text-chart-4 border-chart-4/30',
      low: 'bg-success/20 text-success border-success/30',
      safe: 'bg-success/20 text-success border-success/30',
    };
    return variants[type] || variants.medium;
  };

  const threatForecast = multiAgentResults?.agentAnalyses?.map((agent: any, i: number) => ({
    agent: agent.agent?.split('_')[0] || `Agent ${i + 1}`,
    anomalyScore: agent.anomalyScore || 0,
    attackProb: Math.round((agent.attackProbability || 0) * 100)
  })) || [];

  const radarData = multiAgentResults?.agentAnalyses?.map((agent: any) => ({
    subject: agent.agent?.split('_')[0] || 'Unknown',
    A: agent.anomalyScore || 0,
    fullMark: 100
  })) || [];

  // Pie chart data for scan types
  const scanTypePieData = Object.entries({
    website: scanHistory.filter(s => s.scan_type === 'website').length,
    api: scanHistory.filter(s => s.scan_type === 'api').length,
    qr: scanHistory.filter(s => s.scan_type === 'qr').length,
    static: scanHistory.filter(s => s.scan_type === 'static').length,
  }).filter(([_, value]) => value > 0).map(([name, value]) => ({ name: scanTypeLabels[name], value }));

  const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--chart-4))', 'hsl(var(--success))'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            AI Predictions
          </h1>
          <p className="text-muted-foreground mt-1">
            Analyze collected scan data with multi-agent AI system
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={fetchScanHistory} disabled={loadingScans}>
            <RefreshCw className={`h-4 w-4 ${loadingScans ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={runMultiAgentAnalysis} disabled={isAnalyzing || scanHistory.length === 0} size="lg">
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running 5 AI Agents...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Run Multi-Agent Analysis
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Scan Data Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/20">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{scanHistory.length}</p>
              <p className="text-sm text-muted-foreground">Total Scans</p>
            </div>
          </CardContent>
        </Card>
        {['website', 'api', 'qr', 'static'].map((type) => {
          const Icon = scanTypeIcons[type];
          const count = scanHistory.filter(s => s.scan_type === type).length;
          return (
            <Card key={type} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-sm text-muted-foreground">{scanTypeLabels[type]}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Scan History + Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Scan Results
            </CardTitle>
            <CardDescription>Data used for AI predictions</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {loadingScans ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : scanHistory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No scan data available</p>
                  <p className="text-sm">Run some scans to collect data for AI analysis</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scanHistory.slice(0, 15).map((scan) => {
                    const Icon = scanTypeIcons[scan.scan_type] || Globe;
                    return (
                      <div key={scan.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded bg-background">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium truncate max-w-[200px]">{scan.target}</p>
                            <p className="text-xs text-muted-foreground">
                              {scanTypeLabels[scan.scan_type]} • {format(new Date(scan.created_at), 'MMM d, HH:mm')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {scan.threats_found != null && scan.threats_found > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {scan.threats_found} threats
                            </Badge>
                          )}
                          {scan.severity && (
                            <Badge className={cn('text-xs', severityColors[scan.severity])}>
                              {scan.severity}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Scan Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scanTypePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={scanTypePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {scanTypePieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                No scan data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Multi-Agent Results */}
      {multiAgentResults && (
        <div className="space-y-6 animate-fade-in">
          {/* Final Prediction Banner */}
          <Card className={cn("border-2", getInsightBadge(multiAgentResults.overallThreatLevel))}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn("p-4 rounded-full", 
                    multiAgentResults.overallThreatLevel === 'critical' ? 'bg-destructive/20' :
                    multiAgentResults.overallThreatLevel === 'high' ? 'bg-warning/20' : 'bg-success/20'
                  )}>
                    <Shield className={cn("h-8 w-8",
                      multiAgentResults.overallThreatLevel === 'critical' ? 'text-destructive' :
                      multiAgentResults.overallThreatLevel === 'high' ? 'text-warning' : 'text-success'
                    )} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Meta-Agent Final Prediction</p>
                    <h2 className="text-3xl font-bold uppercase">{multiAgentResults.overallThreatLevel}</h2>
                    <p className="text-sm text-muted-foreground">
                      Confidence: {multiAgentResults.confidenceScore}% | {multiAgentResults.threatCount} threats detected
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Based on {scanHistory.length} scans</p>
                  <p className="text-2xl font-bold">{multiAgentResults.agentConsensus?.agreementLevel || 0}%</p>
                  <p className="text-xs text-muted-foreground">Agent Consensus</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agent Analyses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {multiAgentResults.agentAnalyses?.map((agent: any, i: number) => (
              <Card key={i} className="bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    {agent.agent}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Anomaly Score</span>
                      <span className="text-sm font-bold">{agent.anomalyScore}%</span>
                    </div>
                    <Progress value={agent.anomalyScore} className="h-1" />
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Attack Prob</span>
                      <span className="text-sm font-bold">{Math.round((agent.attackProbability || 0) * 100)}%</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {agent.threats?.length || 0} threats detected
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Agent Analysis Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={threatForecast}>
                    <defs>
                      <linearGradient id="colorAnomaly" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="agent" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="anomalyScore" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorAnomaly)" name="Anomaly Score" />
                    <Area type="monotone" dataKey="attackProb" stroke="hsl(var(--destructive))" strokeWidth={2} fill="transparent" name="Attack Probability" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Agent Coverage Radar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <PolarRadiusAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <Radar name="Anomaly" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Primary Threats */}
          {multiAgentResults.finalPrediction?.primaryThreats?.length > 0 && (
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Primary Threats Identified
                </CardTitle>
                <CardDescription>AI-predicted threats based on your scan data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {multiAgentResults.finalPrediction.primaryThreats.map((threat: any, i: number) => (
                    <div key={i} className="p-4 rounded-lg border border-border bg-background/50">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{threat.name}</h4>
                          <p className="text-sm text-muted-foreground">{threat.type} - {threat.attackVector}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getInsightBadge(threat.severity)}>{threat.severity}</Badge>
                          <span className="text-sm font-mono">{Math.round(threat.probability * 100)}%</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm"><span className="text-muted-foreground">Affected:</span> {threat.affectedAssets?.join(', ')}</p>
                        <div className="p-3 rounded bg-primary/5 border border-primary/20">
                          <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1">
                            <Zap className="h-3 w-3" /> Mitigation Steps
                          </p>
                          <ul className="text-sm space-y-1">
                            {threat.mitigationSteps?.map((step: string, j: number) => (
                              <li key={j} className="flex items-start gap-2">
                                <ChevronRight className="h-3 w-3 mt-1 text-primary flex-shrink-0" />
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Personalized Risk & Explanation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {multiAgentResults.personalizedRisk && (
              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Personalized Risk Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Your Risk Profile</p>
                      <p className="font-semibold">{multiAgentResults.personalizedRisk.userRiskProfile}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Contextual Threats</p>
                      <div className="flex flex-wrap gap-2">
                        {multiAgentResults.personalizedRisk.contextualThreats?.map((threat: string, i: number) => (
                          <Badge key={i} variant="outline">{threat}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Prioritized Actions</p>
                      <ul className="space-y-1">
                        {multiAgentResults.personalizedRisk.prioritizedActions?.map((action: string, i: number) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="text-primary font-bold">{i + 1}.</span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  AI Explanation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{multiAgentResults.explanation}</p>
                <div className="mt-4 p-3 rounded bg-muted/30">
                  <p className="text-sm font-semibold mb-1">Summary</p>
                  <p className="text-sm text-muted-foreground">{multiAgentResults.summary}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <ExportButton data={multiAgentResults} collection="ai_predictions" label="Export Analysis" />
        </div>
      )}

      {/* Initial State */}
      {!multiAgentResults && !isAnalyzing && (
        <Card className="bg-card/50">
          <CardContent className="py-12 text-center">
            <Brain className="h-16 w-16 text-primary mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Multi-Agent AI Threat Prediction</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {scanHistory.length > 0 
                ? `Analyze ${scanHistory.length} scan results using 5 specialized AI agents to get comprehensive threat predictions.`
                : 'Run security scans (Website, API, QR, Static) to collect data, then analyze with AI.'}
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {['CICIDS2017', 'UNSW-NB15', 'NSL-KDD', 'TON_IoT', 'MAWILab'].map(dataset => (
                <Badge key={dataset} variant="outline">{dataset}</Badge>
              ))}
            </div>
            <Button onClick={runMultiAgentAnalysis} size="lg" disabled={scanHistory.length === 0}>
              <Sparkles className="mr-2 h-4 w-4" />
              {scanHistory.length > 0 ? 'Start Multi-Agent Analysis' : 'No Scan Data Available'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
