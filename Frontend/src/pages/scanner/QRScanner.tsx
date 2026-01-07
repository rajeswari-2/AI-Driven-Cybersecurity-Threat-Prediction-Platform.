import { useState, useCallback } from 'react';
import { QrCode, Upload, Shield, AlertTriangle, CheckCircle, XCircle, Loader2, ExternalLink, Link2, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { ExportButton } from '@/components/ExportButton';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import jsQR from 'jsqr';

type ScanStatus = 'idle' | 'scanning' | 'completed';

const decodeQRCode = (imageSrc: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      resolve(code?.data || null);
    };
    img.onerror = () => resolve(null);
    img.src = imageSrc;
  });
};

export default function QRScanner() {
  const { user } = useAuth();
  const [image, setImage] = useState<string | null>(null);
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [scanResults, setScanResults] = useState<any>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const startScan = async () => {
    if (!image) return;
    
    setStatus('scanning');
    setProgress(0);
    setScanResults(null);
    
    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + 8, 90));
    }, 100);

    try {
      // Decode QR code client-side first
      const decodedUrl = await decodeQRCode(image);
      
      if (!decodedUrl) {
        throw new Error('Could not decode QR code. Please ensure the image contains a valid QR code.');
      }

      // Send the decoded URL to the edge function for threat analysis
      const { data, error } = await supabase.functions.invoke('analyze-qr', {
        body: { url: decodedUrl }
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;
      
      // Save scan result to database
      const { error: saveError } = await supabase.from('scan_results').insert({
        scan_type: 'qr',
        target: decodedUrl,
        status: 'completed',
        result: data,
        threats_found: data.threats_detected?.length || 0,
        severity: data.is_malicious ? 'critical' : 'low',
        completed_at: new Date().toISOString(),
        created_by: user?.id
      });

      if (saveError) {
        console.warn('Failed to save scan result:', saveError);
      }
      
      setScanResults(data);
      setStatus('completed');
      toast.success('QR analysis completed and saved');
    } catch (error: any) {
      clearInterval(progressInterval);
      toast.error(`Analysis failed: ${error.message}`);
      setStatus('idle');
      setProgress(0);
    }
  };

  const reset = () => {
    setImage(null);
    setStatus('idle');
    setProgress(0);
    setScanResults(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">QR Code Scanner</h1>
        <p className="text-muted-foreground">Analyze QR codes for malicious URLs and phishing attempts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="space-y-4">
          <div
            className={cn(
              'cyber-card rounded-xl border-2 border-dashed p-8 transition-all duration-300 cursor-pointer',
              isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
              image && 'border-solid'
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !image && document.getElementById('qr-input')?.click()}
          >
            <input
              id="qr-input"
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*"
            />
            
            {!image ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <QrCode className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Upload QR Code Image</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Drop an image here or click to select
                </p>
                <p className="text-xs text-muted-foreground mt-2">Supports: PNG, JPG, GIF, WebP</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <img src={image} alt="QR Code" className="max-w-full max-h-64 rounded-lg mb-4" />
                <p className="text-sm text-muted-foreground">QR Code loaded</p>
              </div>
            )}
          </div>

          {status === 'scanning' && (
            <div className="cyber-card rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Analyzing QR code...</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Decoding URL and checking threat databases</span>
              </div>
            </div>
          )}

          {image && status === 'idle' && (
            <Button className="w-full" size="lg" onClick={startScan}>
              <Shield className="h-4 w-4 mr-2" />
              Analyze QR Code
            </Button>
          )}

          {status === 'completed' && (
            <Button variant="outline" className="w-full" onClick={reset}>
              Scan Another QR Code
            </Button>
          )}
        </div>

        {/* Results Section */}
        {status === 'completed' && scanResults && (
          <div className="space-y-4 animate-fade-in">
            {/* Threat Score */}
            <div className={cn(
              'cyber-card rounded-xl border p-6',
              scanResults.is_malicious ? 'border-critical/30 bg-critical/5' : 'border-success/30 bg-success/5'
            )}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Threat Assessment</h3>
                <span className={cn(
                  'text-xs font-semibold uppercase px-3 py-1 rounded',
                  scanResults.is_malicious ? 'bg-critical text-white' : 'bg-success text-white'
                )}>
                  {scanResults.is_malicious ? 'MALICIOUS' : 'SAFE'}
                </span>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className={cn(
                    'text-5xl font-bold',
                    scanResults.is_malicious ? 'text-critical' : 'text-success'
                  )}>
                    {scanResults.threat_score}
                  </p>
                  <p className="text-sm text-muted-foreground">Threat Score</p>
                </div>
                <div className="flex-1">
                  {scanResults.is_malicious ? (
                    <div className="flex items-center gap-2 text-critical">
                      <Ban className="h-5 w-5" />
                      <span className="font-medium">High-confidence phishing attempt detected</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-success">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">No threats detected</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Decoded URL */}
            <div className="cyber-card rounded-xl border border-border p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                Decoded URL
              </h3>
              <code className={cn(
                'block p-3 rounded-lg bg-muted/50 font-mono text-sm break-all',
                scanResults.is_malicious ? 'text-critical' : 'text-foreground'
              )}>
                {scanResults.decoded_url}
              </code>
            </div>

            {/* Threats Detected */}
            {scanResults.threats_detected?.length > 0 && (
              <div className="cyber-card rounded-xl border border-border p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Threats Detected
                </h3>
                <ul className="space-y-2">
                  {scanResults.threats_detected.map((threat: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-critical/10 border border-critical/20">
                      <XCircle className="h-5 w-5 text-critical mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{threat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Redirect Chain */}
            {scanResults.redirect_chain?.length > 0 && (
              <div className="cyber-card rounded-xl border border-border p-6">
                <h3 className="font-semibold mb-4">Redirect Chain</h3>
                <div className="space-y-2">
                  {scanResults.redirect_chain.map((url: string, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold',
                        i === scanResults.redirect_chain.length - 1 
                          ? 'bg-critical/20 text-critical' 
                          : 'bg-muted text-muted-foreground'
                      )}>
                        {i + 1}
                      </div>
                      <code className="flex-1 text-sm font-mono truncate bg-muted/50 px-3 py-2 rounded">
                        {url}
                      </code>
                      {i < scanResults.redirect_chain.length - 1 && (
                        <span className="text-muted-foreground">→</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendation */}
            <div className={cn(
              'cyber-card rounded-xl border p-4',
              scanResults.is_malicious ? 'border-critical/30 bg-critical/5' : 'border-success/30 bg-success/5'
            )}>
              <div className="flex items-center gap-3">
                <Shield className={cn('h-6 w-6', scanResults.is_malicious ? 'text-critical' : 'text-success')} />
                <div>
                  <p className={cn('font-semibold', scanResults.is_malicious ? 'text-critical' : 'text-success')}>
                    AI Recommendation
                  </p>
                  <p className="text-sm">{scanResults.recommendation}</p>
                </div>
              </div>
            </div>

            <ExportButton data={scanResults} collection="qr_scans" label="Export Results" />
          </div>
        )}
      </div>
    </div>
  );
}
