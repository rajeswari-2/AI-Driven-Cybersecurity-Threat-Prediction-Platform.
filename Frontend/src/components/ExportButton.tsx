import { useState } from 'react';
import { Download, FileJson, FileText, Database, Cloud, Server, ChevronDown, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportButtonProps {
  data: any;
  collection: string;
  label?: string;
}

type CloudPlatform = 'mongodb' | 'aws' | 'azure' | 'mysql';

interface CloudConfig {
  mongodb: {
    connectionString: string;
    database: string;
    collection: string;
  };
  aws: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
  };
  azure: {
    connectionString: string;
    container: string;
    blobName: string;
  };
  mysql: {
    host: string;
    port: string;
    database: string;
    username: string;
    password: string;
    table: string;
  };
}

export function ExportButton({ data, collection, label = 'Export' }: ExportButtonProps) {
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<CloudPlatform | null>(null);
  const [cloudConfig, setCloudConfig] = useState<CloudConfig>({
    mongodb: { connectionString: '', database: '', collection: '' },
    aws: { accessKeyId: '', secretAccessKey: '', region: 'us-east-1', bucket: '' },
    azure: { connectionString: '', container: '', blobName: '' },
    mysql: { host: 'localhost', port: '3306', database: '', username: '', password: '', table: '' },
  });

  const handleJsonExport = () => {
    try {
      const exportData = {
        collection,
        exportedAt: new Date().toISOString(),
        data
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${collection}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('JSON exported successfully');
    } catch (error) {
      toast.error('Failed to export JSON');
    }
  };

  const handlePdfExport = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text(`${collection.replace(/_/g, ' ').toUpperCase()} REPORT`, pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });
      
      let yPosition = 40;
      
      // Convert data to table format
      const flattenObject = (obj: any, prefix = ''): [string, string][] => {
        const rows: [string, string][] = [];
        for (const key in obj) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          const value = obj[key];
          if (value === null || value === undefined) {
            rows.push([fullKey, 'N/A']);
          } else if (typeof value === 'object' && !Array.isArray(value)) {
            rows.push(...flattenObject(value, fullKey));
          } else if (Array.isArray(value)) {
            rows.push([fullKey, `[${value.length} items]`]);
          } else {
            rows.push([fullKey, String(value)]);
          }
        }
        return rows;
      };
      
      const tableData = flattenObject(data);
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Property', 'Value']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 60 },
          1: { cellWidth: 'auto' }
        }
      });
      
      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
      }
      
      doc.save(`${collection}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  const openCloudConfig = (platform: CloudPlatform) => {
    setSelectedPlatform(platform);
    setConfigDialogOpen(true);
  };

  const handleCloudExport = async () => {
    if (!selectedPlatform) return;
    
    const config = cloudConfig[selectedPlatform];
    const exportData = {
      collection,
      exportedAt: new Date().toISOString(),
      data,
    };
    
    // Validate config
    const isEmpty = Object.values(config).some(v => v === '');
    if (isEmpty) {
      toast.error('Please fill in all configuration fields');
      return;
    }
    
    try {
      // SECURITY: Credentials are NOT stored - they are used immediately and discarded
      // This prevents credential exposure via XSS or localStorage access
      
      toast.loading(`Connecting to ${selectedPlatform.toUpperCase()}...`);
      
      // Call the edge function for cloud export with authentication
      const { data: { session } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getSession());
      
      if (!session) {
        toast.dismiss();
        toast.error('Authentication required. Please log in to export data.');
        return;
      }
      
      const response = await fetch('https://icnnqilmwytviqxbybzn.supabase.co/functions/v1/export-to-cloud', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          platform: selectedPlatform,
          data: exportData,
          collection,
          config,
        }),
      });
      
      const result = await response.json();
      
      toast.dismiss();
      
      if (result.error) {
        toast.error(`Export failed: ${result.error}`);
        return;
      }
      
      toast.success(result.message || `Data exported to ${selectedPlatform.toUpperCase()} successfully`);
      setConfigDialogOpen(false);
      
      // Also download a backup JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${collection}_${selectedPlatform}_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error: any) {
      toast.dismiss();
      toast.error(`Failed to export to ${selectedPlatform}: ${error.message || 'Unknown error'}`);
    }
  };

  const updateConfig = (platform: CloudPlatform, field: string, value: string) => {
    setCloudConfig(prev => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: value }
    }));
  };

  const renderConfigFields = () => {
    if (!selectedPlatform) return null;

    switch (selectedPlatform) {
      case 'mongodb':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mongo-connection">Connection String</Label>
              <Input
                id="mongo-connection"
                placeholder="mongodb+srv://user:pass@cluster.mongodb.net"
                value={cloudConfig.mongodb.connectionString}
                onChange={(e) => updateConfig('mongodb', 'connectionString', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mongo-database">Database Name</Label>
              <Input
                id="mongo-database"
                placeholder="security_db"
                value={cloudConfig.mongodb.database}
                onChange={(e) => updateConfig('mongodb', 'database', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mongo-collection">Collection Name</Label>
              <Input
                id="mongo-collection"
                placeholder="exports"
                value={cloudConfig.mongodb.collection}
                onChange={(e) => updateConfig('mongodb', 'collection', e.target.value)}
              />
            </div>
          </div>
        );

      case 'aws':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="aws-access-key">Access Key ID</Label>
              <Input
                id="aws-access-key"
                placeholder="AKIAIOSFODNN7EXAMPLE"
                value={cloudConfig.aws.accessKeyId}
                onChange={(e) => updateConfig('aws', 'accessKeyId', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aws-secret-key">Secret Access Key</Label>
              <Input
                id="aws-secret-key"
                type="password"
                placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                value={cloudConfig.aws.secretAccessKey}
                onChange={(e) => updateConfig('aws', 'secretAccessKey', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aws-region">Region</Label>
              <Select
                value={cloudConfig.aws.region}
                onValueChange={(value) => updateConfig('aws', 'region', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                  <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                  <SelectItem value="eu-west-1">EU (Ireland)</SelectItem>
                  <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="aws-bucket">S3 Bucket Name</Label>
              <Input
                id="aws-bucket"
                placeholder="my-security-exports"
                value={cloudConfig.aws.bucket}
                onChange={(e) => updateConfig('aws', 'bucket', e.target.value)}
              />
            </div>
          </div>
        );

      case 'azure':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="azure-connection">Connection String</Label>
              <Input
                id="azure-connection"
                placeholder="DefaultEndpointsProtocol=https;AccountName=..."
                value={cloudConfig.azure.connectionString}
                onChange={(e) => updateConfig('azure', 'connectionString', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="azure-container">Container Name</Label>
              <Input
                id="azure-container"
                placeholder="security-exports"
                value={cloudConfig.azure.container}
                onChange={(e) => updateConfig('azure', 'container', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="azure-blob">Blob Name (optional)</Label>
              <Input
                id="azure-blob"
                placeholder="Leave empty for auto-generated name"
                value={cloudConfig.azure.blobName}
                onChange={(e) => updateConfig('azure', 'blobName', e.target.value)}
              />
            </div>
          </div>
        );

      case 'mysql':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mysql-host">Host</Label>
                <Input
                  id="mysql-host"
                  placeholder="localhost"
                  value={cloudConfig.mysql.host}
                  onChange={(e) => updateConfig('mysql', 'host', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mysql-port">Port</Label>
                <Input
                  id="mysql-port"
                  placeholder="3306"
                  value={cloudConfig.mysql.port}
                  onChange={(e) => updateConfig('mysql', 'port', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mysql-database">Database</Label>
              <Input
                id="mysql-database"
                placeholder="security_exports"
                value={cloudConfig.mysql.database}
                onChange={(e) => updateConfig('mysql', 'database', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mysql-username">Username</Label>
                <Input
                  id="mysql-username"
                  placeholder="admin"
                  value={cloudConfig.mysql.username}
                  onChange={(e) => updateConfig('mysql', 'username', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mysql-password">Password</Label>
                <Input
                  id="mysql-password"
                  type="password"
                  placeholder="••••••••"
                  value={cloudConfig.mysql.password}
                  onChange={(e) => updateConfig('mysql', 'password', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mysql-table">Table Name</Label>
              <Input
                id="mysql-table"
                placeholder="exports"
                value={cloudConfig.mysql.table}
                onChange={(e) => updateConfig('mysql', 'table', e.target.value)}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getPlatformIcon = (platform: CloudPlatform) => {
    switch (platform) {
      case 'mongodb':
        return <Database className="h-4 w-4 mr-2 text-green-500" />;
      case 'aws':
        return <Cloud className="h-4 w-4 mr-2 text-orange-500" />;
      case 'azure':
        return <Cloud className="h-4 w-4 mr-2 text-blue-500" />;
      case 'mysql':
        return <Server className="h-4 w-4 mr-2 text-blue-400" />;
    }
  };

  const getPlatformLabel = (platform: CloudPlatform) => {
    switch (platform) {
      case 'mongodb':
        return 'MongoDB';
      case 'aws':
        return 'AWS S3';
      case 'azure':
        return 'Azure Blob Storage';
      case 'mysql':
        return 'MySQL Database';
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {label}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Export Format</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleJsonExport}>
            <FileJson className="h-4 w-4 mr-2 text-yellow-500" />
            Export as JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePdfExport}>
            <FileText className="h-4 w-4 mr-2 text-red-500" />
            Export as PDF
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="flex items-center">
            <Settings2 className="h-3 w-3 mr-1" />
            Cloud Platforms
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => openCloudConfig('mongodb')}>
            {getPlatformIcon('mongodb')}
            MongoDB
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openCloudConfig('aws')}>
            {getPlatformIcon('aws')}
            AWS S3
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openCloudConfig('azure')}>
            {getPlatformIcon('azure')}
            Azure Blob Storage
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openCloudConfig('mysql')}>
            {getPlatformIcon('mysql')}
            MySQL Database
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {selectedPlatform && getPlatformIcon(selectedPlatform)}
              Configure {selectedPlatform && getPlatformLabel(selectedPlatform)}
            </DialogTitle>
            <DialogDescription>
              Enter your connection details to export data to {selectedPlatform && getPlatformLabel(selectedPlatform)}.
            </DialogDescription>
          </DialogHeader>
          {renderConfigFields()}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCloudExport}>
              <Cloud className="h-4 w-4 mr-2" />
              Export to Cloud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
