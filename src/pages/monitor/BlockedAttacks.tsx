import { useState, useEffect } from 'react';
import { Shield, Search, Trash2, RefreshCw, Filter, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface BlockedAttack {
  id: string;
  attack_id: string | null;
  source_ip: string;
  attack_type: string;
  severity: string;
  blocked_at: string;
  blocked_by: string | null;
  auto_blocked: boolean;
  reason: string | null;
}

const severityColors: Record<string, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-warning text-warning-foreground',
  medium: 'bg-info text-info-foreground',
  low: 'bg-success text-success-foreground',
  info: 'bg-muted text-muted-foreground',
};

export default function BlockedAttacks() {
  const [blockedAttacks, setBlockedAttacks] = useState<BlockedAttack[]>([]);
  const [filteredAttacks, setFilteredAttacks] = useState<BlockedAttack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const fetchBlockedAttacks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('blocked_attacks')
        .select('*')
        .order('blocked_at', { ascending: false });

      if (error) throw error;
      setBlockedAttacks(data || []);
    } catch (error) {
      console.error('Error fetching blocked attacks:', error);
      toast.error('Failed to fetch blocked attacks');
    } finally {
      setIsLoading(false);
    }
  };

  const unblockAttack = async (id: string, sourceIp: string) => {
    try {
      const { error } = await supabase
        .from('blocked_attacks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success(`Unblocked IP: ${sourceIp}`);
      fetchBlockedAttacks();
    } catch (error) {
      console.error('Error unblocking attack:', error);
      toast.error('Failed to unblock attack');
    }
  };

  // Filter attacks based on search and filters
  useEffect(() => {
    let filtered = blockedAttacks;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (attack) =>
          attack.source_ip.toLowerCase().includes(query) ||
          attack.attack_type.toLowerCase().includes(query) ||
          attack.reason?.toLowerCase().includes(query)
      );
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter((attack) => attack.severity === severityFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((attack) => attack.attack_type === typeFilter);
    }

    setFilteredAttacks(filtered);
  }, [blockedAttacks, searchQuery, severityFilter, typeFilter]);

  // Initial fetch and realtime subscription
  useEffect(() => {
    fetchBlockedAttacks();

    const channel = supabase
      .channel('blocked-attacks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'blocked_attacks' },
        () => {
          fetchBlockedAttacks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Get unique attack types for filter
  const attackTypes = [...new Set(blockedAttacks.map((a) => a.attack_type))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-success" />
            Blocked Attacks
          </h1>
          <p className="text-muted-foreground">
            Manage and review blocked IPs and attack sources
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchBlockedAttacks} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="cyber-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Total Blocked</p>
          <p className="text-2xl font-bold">{blockedAttacks.length}</p>
        </div>
        <div className="cyber-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Critical Blocked</p>
          <p className="text-2xl font-bold text-destructive">
            {blockedAttacks.filter((a) => a.severity === 'critical').length}
          </p>
        </div>
        <div className="cyber-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Auto-Blocked</p>
          <p className="text-2xl font-bold text-info">
            {blockedAttacks.filter((a) => a.auto_blocked).length}
          </p>
        </div>
        <div className="cyber-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Manual Blocks</p>
          <p className="text-2xl font-bold text-warning">
            {blockedAttacks.filter((a) => !a.auto_blocked).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="cyber-card rounded-xl border border-border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by IP, attack type, or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Attack Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {attackTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="cyber-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source IP</TableHead>
              <TableHead>Attack Type</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Blocked At</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredAttacks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No blocked attacks found
                </TableCell>
              </TableRow>
            ) : (
              filteredAttacks.map((attack) => (
                <TableRow key={attack.id} className="group">
                  <TableCell className="font-mono font-medium">{attack.source_ip}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{attack.attack_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={severityColors[attack.severity] || 'bg-muted'}>
                      {attack.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(attack.blocked_at), 'MMM dd, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={attack.auto_blocked ? 'secondary' : 'outline'}>
                      {attack.auto_blocked ? 'Auto' : 'Manual'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {attack.reason || 'No reason provided'}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Unblock
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-warning" />
                            Unblock IP Address
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to unblock <strong>{attack.source_ip}</strong>?
                            This IP was blocked for <strong>{attack.attack_type}</strong> attack.
                            Unblocking may expose your network to potential threats.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => unblockAttack(attack.id, attack.source_ip)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Unblock
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
