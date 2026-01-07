import { useState } from 'react';
import { Link2, Play, Shield, AlertTriangle, Loader2, Zap, Code, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { ExportButton } from '@/components/ExportButton';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type ScanStatus = 'idle' | 'scanning' | 'completed';

export default function APIScanner() {
  const { user } = useAuth();
  const [endpoint, setEndpoint] = useState('');
  const [method, setMethod] = useState('GET');
  const [headers, setHeaders] = useState('');
  const [body, setBody] = useState('');
  const [authEnabled, setAuthEnabled] = useState(false);
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [scanResults, setScanResults] = useState<any>(null);

  const startScan = async () => {
    if (!endpoint) return;
    
    setStatus('scanning');
    setProgress(0);
    setScanResults(null);
    
    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + 5, 90));
    }, 200);

    try {
      let parsedHeaders = {};
      let parsedBody = undefined;
      
      try {
        if (headers.trim()) parsedHeaders = JSON.parse(headers);
      } catch {
        toast.error('Invalid headers JSON');
        clearInterval(progressInterval);
        setStatus('idle');
        return;
      }

      try {
        if (body.trim()) parsedBody = JSON.parse(body);
      } catch {
        toast.error('Invalid body JSON');
        clearInterval(progressInterval);
        setStatus('idle');
        return;
      }

      const { data, error } = await supabase.functions.invoke('scan-api', {
        body: { 
          endpoint, 
          method, 
          headers: parsedHeaders, 
          body: parsedBody,
          analyzeJwt: authEnabled
        }
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;
      
      // Save scan result to database
      const vulnCount = data.vulnerabilities?.length || 0;
      const severity = vulnCount > 5 ? 'critical' : vulnCount > 2 ? 'high' : vulnCount > 0 ? 'medium' : 'low';
      
      const { error: saveError } = await supabase.from('scan_results').insert({
        scan_type: 'api',
        target: endpoint,
        status: 'completed',
        result: { ...data, method, analyzeJwt: authEnabled },
        threats_found: vulnCount,
        severity,
        completed_at: new Date().toISOString(),
        created_by: user?.id
      });

      if (saveError) {
        console.warn('Failed to save scan result:', saveError);
      }
      
      setScanResults(data);
      setStatus('completed');
      toast.success('API scan completed and saved');
    } catch (error: any) {
      clearInterval(progressInterval);
      toast.error(`Scan failed: ${error.message}`);
      setStatus('idle');
      setProgress(0);
    }
  };

  const reset = () => {
    setStatus('idle');
    setProgress(0);
    setScanResults(null);
  };

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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">API Scanner</h1>
        <p className="text-muted-foreground">Test API endpoints for security vulnerabilities</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <div className="space-y-4">
          <div className="cyber-card rounded-xl border border-border p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              API Configuration
            </h3>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-28">
                  <Label className="text-xs text-muted-foreground">Method</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger className="bg-muted/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                      <SelectItem value="PATCH">PATCH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Endpoint URL</Label>
                  <Input
                    placeholder="https://api.example.com/v1/users"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    className="bg-muted/50"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Headers (JSON)</Label>
                <Textarea
                  placeholder='{"Authorization": "Bearer token..."}'
                  value={headers}
                  onChange={(e) => setHeaders(e.target.value)}
                  className="bg-muted/50 font-mono text-sm h-24"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Request Body (JSON)</Label>
                <Textarea
                  placeholder='{"key": "value"}'
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="bg-muted/50 font-mono text-sm h-24"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">JWT Token Analysis</p>
                    <p className="text-xs text-muted-foreground">Deep inspection of JWT tokens</p>
                  </div>
                </div>
                <Switch checked={authEnabled} onCheckedChange={setAuthEnabled} />
              </div>
            </div>

            {status === 'scanning' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Running security tests...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <Button 
              className="w-full" 
              size="lg"
              onClick={startScan}
              disabled={!endpoint || status === 'scanning'}
            >
              {status === 'scanning' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scanning API...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start API Scan
                </>
              )}
            </Button>
          </div>

          {/* Attack Trends */}
          {status === 'completed' && scanResults?.attack_trends && (
            <div className="cyber-card rounded-xl border border-border p-6 animate-fade-in">
              <h3 className="font-semibold mb-4">Attack Trends (24h)</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scanResults.attack_trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 47%, 16%)" />
                    <XAxis dataKey="time" stroke="hsl(215, 20%, 55%)" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} />
                    <YAxis stroke="hsl(215, 20%, 55%)" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(222, 47%, 8%)',
                        border: '1px solid hsl(222, 47%, 16%)',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="attacks"
                      stroke="hsl(185, 100%, 50%)"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(185, 100%, 50%)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {status === 'completed' && scanResults && (
          <div className="space-y-4 animate-fade-in">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="cyber-card rounded-xl border border-critical/30 bg-critical/5 p-4 text-center">
                <p className="text-3xl font-bold text-critical">{scanResults.vulnerabilities?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Issues Found</p>
              </div>
              <div className="cyber-card rounded-xl border border-border p-4 text-center">
                <p className="text-3xl font-bold text-success">{scanResults.security_score || 0}%</p>
                <p className="text-sm text-muted-foreground">Security Score</p>
              </div>
            </div>

            {/* Vulnerabilities */}
            <div className="cyber-card rounded-xl border border-border p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Detected Issues
              </h3>
              <div className="space-y-3">
                {scanResults.vulnerabilities?.map((vuln: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-lg border border-border bg-muted/20">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={cn('px-2 py-0.5 rounded text-xs font-semibold', getSeverityColor(vuln.severity))}>
                          {vuln.severity?.toUpperCase()}
                        </span>
                        <span className="font-medium text-sm">{vuln.name}</span>
                      </div>
                    </div>
                    {vuln.endpoint && (
                      <code className="text-xs bg-muted px-2 py-1 rounded mb-2 block font-mono">
                        {vuln.endpoint}
                      </code>
                    )}
                    <p className="text-sm text-muted-foreground mb-3">{vuln.description}</p>
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-start gap-2">
                        <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-primary mb-1">AI Remediation</p>
                          <p className="text-sm">{vuln.recommendation}</p>
                        </div>
                      </div>
                      <Button size="sm" className="mt-3">
                        <Code className="h-3 w-3 mr-1" />
                        Apply Fix
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={reset}>
                Scan Another API
              </Button>
              <ExportButton data={scanResults} collection="api_scans" label="Export Results" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
