import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExportButton } from '@/components/ExportButton';
import { 
  Plus, Search, Filter, AlertTriangle, Clock, 
  User, CheckCircle, XCircle, MoreHorizontal, RefreshCw 
} from 'lucide-react';
import { format } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

type Incident = Tables<'incidents'>;
type Profile = Tables<'profiles'>;

const severityColors = {
  critical: 'bg-critical text-white',
  high: 'bg-high text-white',
  medium: 'bg-medium text-white',
  low: 'bg-low text-white'
};

const statusColors = {
  open: 'bg-destructive/20 text-destructive border-destructive/30',
  investigating: 'bg-warning/20 text-warning border-warning/30',
  resolved: 'bg-success/20 text-success border-success/30',
  closed: 'bg-muted text-muted-foreground border-border'
};

export default function Incidents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    severity: 'medium' as 'critical' | 'high' | 'medium' | 'low',
    attack_type: '',
    target: '',
    source_ip: ''
  });

  useEffect(() => {
    fetchIncidents();
    fetchProfiles();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('incidents-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => {
        fetchIncidents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchIncidents = async () => {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setIncidents(data || []);
    }
    setLoading(false);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*');
    setProfiles(data || []);
  };

  const createIncident = async () => {
    if (!newIncident.title || !newIncident.severity) {
      toast({ title: 'Error', description: 'Title and severity are required', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('incidents').insert({
      ...newIncident,
      status: 'open'
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Log audit event
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'incident_created',
        resource_type: 'incident',
        details: { title: newIncident.title }
      });

      toast({ title: 'Success', description: 'Incident created successfully' });
      setIsCreateOpen(false);
      setNewIncident({ title: '', description: '', severity: 'medium', attack_type: '', target: '', source_ip: '' });
      fetchIncidents();
    }
  };

  const updateIncidentStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('incidents')
      .update({ 
        status: status as 'open' | 'investigating' | 'resolved' | 'closed',
        resolved_at: status === 'resolved' || status === 'closed' ? new Date().toISOString() : null
      })
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'incident_status_changed',
        resource_type: 'incident',
        resource_id: id,
        details: { new_status: status }
      });
      toast({ title: 'Success', description: 'Status updated' });
    }
  };

  const assignIncident = async (id: string, assigneeId: string) => {
    const { error } = await supabase
      .from('incidents')
      .update({ assigned_to: assigneeId })
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'incident_assigned',
        resource_type: 'incident',
        resource_id: id,
        details: { assigned_to: assigneeId }
      });
      toast({ title: 'Success', description: 'Incident assigned' });
    }
  };

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || incident.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    open: incidents.filter(i => i.status === 'open').length,
    investigating: incidents.filter(i => i.status === 'investigating').length,
    resolved: incidents.filter(i => i.status === 'resolved').length,
    total: incidents.length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Incidents</h1>
          <p className="text-muted-foreground">Manage and track security incidents</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={fetchIncidents} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <ExportButton data={filteredIncidents} collection="incidents" label="Export" />
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Incident
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Incident</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={newIncident.title}
                    onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                    placeholder="Incident title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newIncident.description}
                    onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                    placeholder="Detailed description of the incident"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select
                      value={newIncident.severity}
                      onValueChange={(v) => setNewIncident({ ...newIncident, severity: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Attack Type</Label>
                    <Input
                      value={newIncident.attack_type}
                      onChange={(e) => setNewIncident({ ...newIncident, attack_type: e.target.value })}
                      placeholder="e.g., DDoS, Phishing"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Target</Label>
                    <Input
                      value={newIncident.target}
                      onChange={(e) => setNewIncident({ ...newIncident, target: e.target.value })}
                      placeholder="Affected system/asset"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Source IP</Label>
                    <Input
                      value={newIncident.source_ip}
                      onChange={(e) => setNewIncident({ ...newIncident, source_ip: e.target.value })}
                      placeholder="Attacker IP"
                    />
                  </div>
                </div>
                <Button onClick={createIncident} className="w-full">Create Incident</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-destructive/20">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.open}</p>
              <p className="text-sm text-muted-foreground">Open</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-warning/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-warning/20">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.investigating}</p>
              <p className="text-sm text-muted-foreground">Investigating</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-success/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-success/20">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.resolved}</p>
              <p className="text-sm text-muted-foreground">Resolved</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/20">
              <MoreHorizontal className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search incidents..."
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Incident</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading incidents...
                  </TableCell>
                </TableRow>
              ) : filteredIncidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No incidents found
                  </TableCell>
                </TableRow>
              ) : (
                filteredIncidents.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{incident.title}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-xs">
                          {incident.description}
                        </p>
                        {incident.attack_type && (
                          <Badge variant="outline" className="mt-1">
                            {incident.attack_type}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={severityColors[incident.severity]}>
                        {incident.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={incident.status || 'open'}
                        onValueChange={(v) => updateIncidentStatus(incident.id, v)}
                      >
                        <SelectTrigger className={`w-32 ${statusColors[incident.status || 'open']}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="investigating">Investigating</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={incident.assigned_to || ''}
                        onValueChange={(v) => assignIncident(incident.id, v)}
                      >
                        <SelectTrigger className="w-40">
                          <User className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="Assign" />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles.map((profile) => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.full_name || profile.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {incident.created_at ? format(new Date(incident.created_at), 'MMM d, yyyy HH:mm') : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {incident.status !== 'resolved' && incident.status !== 'closed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateIncidentStatus(incident.id, 'resolved')}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
