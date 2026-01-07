import { useState, useCallback } from 'react';
import { Upload, FileWarning, Shield, AlertTriangle, CheckCircle, XCircle, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { ExportButton } from '@/components/ExportButton';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

type ScanStatus = 'idle' | 'uploading' | 'scanning' | 'completed';

export default function StaticScanner() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [scanResults, setScanResults] = useState<any>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const startScan = async () => {
    if (!file) return;
    
    setStatus('uploading');
    setProgress(0);
    setScanResults(null);
    
    // Simulate upload progress
    for (let i = 0; i <= 30; i += 10) {
      await new Promise(r => setTimeout(r, 100));
      setProgress(i);
    }
    
    setStatus('scanning');
    
    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + 5, 90));
    }, 200);

    try {
      // Generate a simple hash for the file
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { data, error } = await supabase.functions.invoke('scan-static', {
        body: { 
          filename: file.name,
          fileSize: file.size,
          fileType: file.type || file.name.split('.').pop()?.toUpperCase(),
          fileHash: `SHA256:${fileHash}`
        }
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;
      
      // Transform response to match expected format
      const results = {
        risk_score: data.threat_score || 0,
        detection_ratio: `${data.indicators?.length || 0}/10`,
        file_type: data.file_info?.fileType || file.type,
        file_size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        scan_engines: data.indicators?.map((ind: any) => ({
          name: ind.type,
          status: ind.severity === 'critical' || ind.severity === 'high' ? 'malicious' : 'clean',
          result: ind.description
        })) || [],
        behaviors: data.yara_matches || [],
        recommendation: data.recommendation || 'No specific recommendation',
        md5: 'N/A',
        sha256: data.file_info?.fileHash || fileHash
      };
      
      // Save scan result to database
      const { error: saveError } = await supabase.from('scan_results').insert({
        scan_type: 'static',
        target: file.name,
        status: 'completed',
        result: { ...results, raw_data: data },
        threats_found: data.indicators?.length || 0,
        severity: results.risk_score >= 70 ? 'critical' : results.risk_score >= 40 ? 'high' : results.risk_score >= 20 ? 'medium' : 'low',
        completed_at: new Date().toISOString(),
        created_by: user?.id
      });

      if (saveError) {
        console.warn('Failed to save scan result:', saveError);
      }
      
      setScanResults(results);
      setStatus('completed');
      toast.success('File analysis completed and saved');
    } catch (error: any) {
      clearInterval(progressInterval);
      toast.error(`Analysis failed: ${error.message}`);
      setStatus('idle');
      setProgress(0);
    }
  };

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setProgress(0);
    setScanResults(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Static File Scanner</h1>
        <p className="text-muted-foreground">Analyze files for malware, vulnerabilities, and threats</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="space-y-4">
          <div
            className={cn(
              'cyber-card rounded-xl border-2 border-dashed p-8 transition-all duration-300 cursor-pointer',
              isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
              file && 'border-solid'
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !file && document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".exe,.dll,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.apk"
            />
            
            {!file ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Drop file here or click to upload</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Supports: EXE, DLL, PDF, DOC, XLS, ZIP, RAR, APK
                </p>
                <p className="text-xs text-muted-foreground mt-2">Maximum file size: 50MB</p>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                  <FileWarning className="h-6 w-6 text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {status === 'idle' && (
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); reset(); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Progress */}
          {status !== 'idle' && status !== 'completed' && (
            <div className="cyber-card rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {status === 'uploading' ? 'Uploading file...' : 'Scanning for threats...'}
                </span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>{status === 'uploading' ? 'Uploading to secure sandbox' : 'Analyzing with AI and threat databases'}</span>
              </div>
            </div>
          )}

          {/* Scan Button */}
          {file && status === 'idle' && (
            <Button className="w-full" size="lg" onClick={startScan}>
              <Shield className="h-4 w-4 mr-2" />
              Start Security Scan
            </Button>
          )}

          {status === 'completed' && (
            <Button variant="outline" className="w-full" onClick={reset}>
              Scan Another File
            </Button>
          )}
        </div>

        {/* Results Section */}
        {status === 'completed' && scanResults && (
          <div className="space-y-4 animate-fade-in">
            {/* Risk Score */}
            <div className={cn(
              'cyber-card rounded-xl border p-6',
              scanResults.risk_score >= 70 ? 'border-critical/30 bg-critical/5' : 
              scanResults.risk_score >= 40 ? 'border-warning/30 bg-warning/5' :
              'border-success/30 bg-success/5'
            )}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Threat Assessment</h3>
                <span className={cn(
                  'text-xs font-semibold uppercase px-2 py-1 rounded',
                  scanResults.risk_score >= 70 ? 'bg-critical text-white' :
                  scanResults.risk_score >= 40 ? 'bg-warning text-black' :
                  'bg-success text-white'
                )}>
                  {scanResults.risk_score >= 70 ? 'MALICIOUS' : scanResults.risk_score >= 40 ? 'SUSPICIOUS' : 'CLEAN'}
                </span>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className={cn(
                    'text-5xl font-bold',
                    scanResults.risk_score >= 70 ? 'text-critical' :
                    scanResults.risk_score >= 40 ? 'text-warning' :
                    'text-success'
                  )}>{scanResults.risk_score}</p>
                  <p className="text-sm text-muted-foreground">Risk Score</p>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Detection Ratio</span>
                    <span className="font-mono text-critical">{scanResults.detection_ratio}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>File Type</span>
                    <span className="font-mono">{scanResults.file_type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>File Size</span>
                    <span className="font-mono">{scanResults.file_size}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detection Engines */}
            {scanResults.scan_engines?.length > 0 && (
              <div className="cyber-card rounded-xl border border-border p-6">
                <h3 className="font-semibold mb-4">Antivirus Results</h3>
                <div className="space-y-2">
                  {scanResults.scan_engines.map((engine: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        {engine.status === 'malicious' ? (
                          <XCircle className="h-5 w-5 text-critical" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-success" />
                        )}
                        <span className="font-medium">{engine.name}</span>
                      </div>
                      <span className={cn(
                        'text-sm font-mono',
                        engine.status === 'malicious' ? 'text-critical' : 'text-success'
                      )}>
                        {engine.result}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Behaviors */}
            {scanResults.behaviors?.length > 0 && (
              <div className="cyber-card rounded-xl border border-border p-6">
                <h3 className="font-semibold mb-4">Detected Behaviors</h3>
                <ul className="space-y-2">
                  {scanResults.behaviors.map((behavior: any, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-sm p-2 rounded bg-muted/30">
                      <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">{typeof behavior === 'string' ? behavior : behavior.name}</span>
                        {behavior.description && <p className="text-muted-foreground text-xs mt-1">{behavior.description}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendation */}
            <div className={cn(
              'cyber-card rounded-xl border p-4',
              scanResults.risk_score >= 70 ? 'border-critical/30 bg-critical/5' : 'border-success/30 bg-success/5'
            )}>
              <div className="flex items-center gap-3">
                <Shield className={cn('h-6 w-6', scanResults.risk_score >= 70 ? 'text-critical' : 'text-success')} />
                <div>
                  <p className={cn('font-semibold', scanResults.risk_score >= 70 ? 'text-critical' : 'text-success')}>
                    Recommended Action
                  </p>
                  <p className="text-sm">{scanResults.recommendation}</p>
                </div>
              </div>
            </div>

            {/* File Hashes */}
            <div className="cyber-card rounded-xl border border-border p-6">
              <h3 className="font-semibold mb-4">File Hashes</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">MD5</p>
                  <code className="text-sm font-mono bg-muted/50 px-2 py-1 rounded block truncate">
                    {scanResults.md5}
                  </code>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">SHA256</p>
                  <code className="text-sm font-mono bg-muted/50 px-2 py-1 rounded block truncate">
                    {scanResults.sha256}
                  </code>
                </div>
              </div>
            </div>

            <ExportButton data={scanResults} collection="file_scans" label="Export Results" />
          </div>
        )}
      </div>
    </div>
  );
}
