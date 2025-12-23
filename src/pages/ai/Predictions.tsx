import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ExportButton } from '@/components/ExportButton';
import { 
  Brain, TrendingUp, TrendingDown, AlertTriangle, Shield, Target,
  Zap, RefreshCw, Clock, BarChart3, Activity, Sparkles, ChevronRight, Loader2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { cn } from '@/lib/utils';

export default function Predictions() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [multiAgentResults, setMultiAgentResults] = useState<any>(null);

  const runMultiAgentAnalysis = async () => {
    setIsAnalyzing(true);
    setMultiAgentResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('multi-agent-analysis', {
        body: {
          scanType: 'threat_prediction',
          target: 'organization_assets',
          context: {
            recentIncidents: 12,
            activeVulnerabilities: 28,
            exposedServices: ['web', 'api', 'database'],
            industryVertical: 'technology'
          },
          userContext: {
            securityPosture: 'moderate',
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
            Multi-agent AI system trained on CICIDS2017, UNSW-NB15, NSL-KDD, TON_IoT, MAWILab
          </p>
        </div>
        <Button onClick={runMultiAgentAnalysis} disabled={isAnalyzing} size="lg">
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
                  <p className="text-sm text-muted-foreground">Agent Consensus</p>
                  <p className="text-2xl font-bold">{multiAgentResults.agentConsensus?.agreementLevel || 0}%</p>
                  <p className="text-xs text-muted-foreground">
                    Most confident: {multiAgentResults.agentConsensus?.mostConfidentAgent || 'N/A'}
                  </p>
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
                <CardDescription>AI-predicted threats with mitigation guidance</CardDescription>
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
              Run analysis using 5 specialized AI agents trained on industry-standard datasets 
              to get comprehensive threat predictions with personalized risk assessment.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {['CICIDS2017', 'UNSW-NB15', 'NSL-KDD', 'TON_IoT', 'MAWILab'].map(dataset => (
                <Badge key={dataset} variant="outline">{dataset}</Badge>
              ))}
            </div>
            <Button onClick={runMultiAgentAnalysis} size="lg">
              <Sparkles className="mr-2 h-4 w-4" />
              Start Multi-Agent Analysis
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
