import { useState } from 'react';
import { Globe, Search, Shield, AlertTriangle, CheckCircle, XCircle, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { ExportButton } from '@/components/ExportButton';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

type ScanStatus = 'idle' | 'scanning' | 'completed';

export default function WebsiteScanner() {
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [scanResults, setScanResults] = useState<any>(null);

  const startScan = async () => {
    if (!url) return;
    
    setStatus('scanning');
    setProgress(0);
    setScanResults(null);
    
    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + 5, 90));
    }, 200);

    try {
      const { data, error } = await supabase.functions.invoke('scan-website', {
        body: { url }
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;
      
      // Save scan result to database
      const { error: saveError } = await supabase.from('scan_results').insert({
        scan_type: 'website',
        target: url,
        status: 'completed',
        result: data,
        threats_found: data.total_vulnerabilities || 0,
        severity: data.risk_score >= 70 ? 'critical' : data.risk_score >= 50 ? 'high' : data.risk_score >= 30 ? 'medium' : 'low',
        completed_at: new Date().toISOString(),
        created_by: user?.id
      });

      if (saveError) {
        console.warn('Failed to save scan result:', saveError);
      }
      
      setScanResults(data);
      setStatus('completed');
      toast.success('Scan completed and saved');
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
        <h1 className="text-3xl font-bold">Website Scanner</h1>
        <p className="text-muted-foreground">Analyze websites for vulnerabilities and security issues</p>
      </div>

      {/* URL Input */}
      <div className="cyber-card rounded-xl border border-border p-6">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Enter URL (e.g., https://example.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pl-11 h-12 text-lg bg-muted/50"
              disabled={status === 'scanning'}
            />
          </div>
          <Button 
            size="lg" 
            className="h-12 px-8"
            onClick={startScan}
            disabled={!url || status === 'scanning'}
          >
            {status === 'scanning' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Scan Website
              </>
            )}
          </Button>
        </div>

        {status === 'scanning' && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Scanning in progress...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </div>

      {/* Results */}
      {status === 'completed' && scanResults && (
        <div className="space-y-6 animate-fade-in">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="cyber-card rounded-xl border border-border p-4 text-center">
              <p className="text-4xl font-bold text-high">{scanResults.risk_score}</p>
              <p className="text-sm text-muted-foreground">Risk Score</p>
            </div>
            <div className="cyber-card rounded-xl border border-border p-4 text-center">
              <p className="text-4xl font-bold text-critical">{scanResults.total_vulnerabilities}</p>
              <p className="text-sm text-muted-foreground">Vulnerabilities</p>
            </div>
            <div className="cyber-card rounded-xl border border-border p-4 text-center">
              <p className="text-4xl font-bold text-warning">{scanResults.scan_duration}</p>
              <p className="text-sm text-muted-foreground">Scan Duration</p>
            </div>
            <div className="cyber-card rounded-xl border border-border p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-bold">{scanResults.ssl_info?.grade || 'N/A'}</span>
                <Lock className="h-6 w-6 text-success" />
              </div>
              <p className="text-sm text-muted-foreground">SSL Grade</p>
            </div>
          </div>

          {/* Detailed Results */}
          <Tabs defaultValue="owasp" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-muted/50">
              <TabsTrigger value="owasp">OWASP Top 10</TabsTrigger>
              <TabsTrigger value="vulnerabilities">Vulnerabilities</TabsTrigger>
              <TabsTrigger value="ssl">SSL/TLS</TabsTrigger>
              <TabsTrigger value="headers">Security Headers</TabsTrigger>
            </TabsList>

            <TabsContent value="owasp" className="mt-4">
              <div className="cyber-card rounded-xl border border-border p-6">
                <h3 className="font-semibold mb-4">OWASP Top 10 Compliance</h3>
                <div className="space-y-3">
                  {scanResults.owasp_compliance && Object.entries(scanResults.owasp_compliance).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <span className="text-sm font-medium">{key}</span>
                      <span className={cn(
                        'px-3 py-1 rounded text-xs font-semibold',
                        value === 'PASS' ? 'bg-success/20 text-success' :
                        value === 'FAIL' ? 'bg-critical/20 text-critical' :
                        'bg-warning/20 text-warning'
                      )}>
                        {value as string}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="vulnerabilities" className="mt-4">
              <div className="cyber-card rounded-xl border border-border p-6">
                <h3 className="font-semibold mb-4">Detected Vulnerabilities</h3>
                <div className="space-y-3">
                  {scanResults.vulnerabilities?.map((vuln: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-lg border border-border bg-muted/20">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={cn('px-2 py-0.5 rounded text-xs font-semibold', getSeverityColor(vuln.severity))}>
                            {vuln.severity?.toUpperCase()}
                          </span>
                          <span className="font-medium">{vuln.name}</span>
                        </div>
                        {vuln.cve_id && (
                          <code className="text-xs bg-muted px-2 py-1 rounded">{vuln.cve_id}</code>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{vuln.description}</p>
                      <div className="flex items-start gap-2 text-sm">
                        <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-primary">{vuln.recommendation}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ssl" className="mt-4">
              <div className="cyber-card rounded-xl border border-border p-6">
                <h3 className="font-semibold mb-4">SSL/TLS Analysis</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-1">Certificate Grade</p>
                    <p className="text-2xl font-bold text-success">{scanResults.ssl_info?.grade || 'N/A'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-1">Protocol</p>
                    <p className="text-2xl font-bold">{scanResults.ssl_info?.protocol || 'N/A'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-1">Issuer</p>
                    <p className="text-lg font-medium">{scanResults.ssl_info?.issuer || 'N/A'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-1">Expires</p>
                    <p className="text-lg font-medium">{scanResults.ssl_info?.expires || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="headers" className="mt-4">
              <div className="cyber-card rounded-xl border border-border p-6">
                <h3 className="font-semibold mb-4">Security Headers</h3>
                <div className="space-y-3">
                  {scanResults.security_headers && Object.entries(scanResults.security_headers).map(([header, present]) => (
                    <div key={header} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <code className="text-sm font-mono">{header}</code>
                      {present ? (
                        <div className="flex items-center gap-2 text-success">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm">Present</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-critical">
                          <XCircle className="h-4 w-4" />
                          <span className="text-sm">Missing</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3">
            <Button variant="outline" onClick={reset}>
              Scan Another Website
            </Button>
            <ExportButton data={scanResults} collection="website_scans" label="Export Results" />
          </div>
        </div>
      )}
    </div>
  );
}
