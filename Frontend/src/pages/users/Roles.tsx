import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search, Shield, Users as UsersIcon, Crown, Eye,
  UserCog, AlertTriangle, CheckCircle, ArrowUpDown, RefreshCw, Lock, ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import type { Tables, Enums } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;
type UserRole = Tables<'user_roles'>;
type AppRole = Enums<'app_role'>;

interface UserWithRole extends Profile {
  role?: AppRole;
}

const roleColors: Record<AppRole, string> = {
  admin: 'bg-primary text-primary-foreground',
  analyst: 'bg-warning/20 text-warning border-warning/30',
  viewer: 'bg-muted text-muted-foreground'
};

const roleIcons: Record<AppRole, typeof Crown> = {
  admin: Crown,
  analyst: UserCog,
  viewer: Eye
};

const roleDescriptions: Record<AppRole, string> = {
  admin: 'Full access to all features including user management, blocking, and settings',
  analyst: 'Can view threats, manage incidents, and run security scans',
  viewer: 'Read-only access to dashboards and reports'
};

export default function Roles() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<AppRole | null>(null);
  const [selectedTab, setSelectedTab] = useState<AppRole | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'role' | 'date'>('name');

  useEffect(() => {
    fetchUsers();
    checkCurrentUserRole();
  }, [user]);

  const checkCurrentUserRole = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setCurrentUserRole(data.role);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);

    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('*');

    if (profilesError || rolesError) {
      toast.error(profilesError?.message || rolesError?.message || 'Failed to load users');
    } else {
      setUserRoles(rolesData || []);

      const usersWithRoles = (profilesData || []).map(profile => {
        const userRole = (rolesData || []).find(r => r.user_id === profile.id);
        return {
          ...profile,
          role: userRole?.role || 'viewer'
        } as UserWithRole;
      });

      setUsers(usersWithRoles);
    }
    setLoading(false);
  };

  const updateUserRole = async (userId: string, newRole: AppRole) => {
    if (currentUserRole !== 'admin') {
      toast.error('Only admins can change user roles');
      return;
    }

    const existingRole = userRoles.find(r => r.user_id === userId);

    if (existingRole) {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) {
        toast.error(error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (error) {
        toast.error(error.message);
        return;
      }
    }

    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      action: 'role_changed',
      resource_type: 'user_role',
      resource_id: userId,
      details: { new_role: newRole }
    });

    toast.success(`Role updated to ${newRole}`);
    fetchUsers();
  };

  const filteredUsers = users
    .filter(u =>
      (selectedTab === 'all' || u.role === selectedTab) &&
      (u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === 'name') return (a.full_name || '').localeCompare(b.full_name || '');
      if (sortBy === 'role') return (a.role || '').localeCompare(b.role || '');
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    analysts: users.filter(u => u.role === 'analyst').length,
    viewers: users.filter(u => u.role === 'viewer').length
  };

  const isAdmin = currentUserRole === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/users">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              Role Management
            </h1>
            <p className="text-muted-foreground">Promote or demote users between viewer, analyst, and admin roles</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isAdmin && (
            <div className="flex items-center gap-2 text-warning bg-warning/10 px-4 py-2 rounded-lg border border-warning/30">
              <Lock className="h-4 w-4" />
              <span className="text-sm font-medium">Admin access required</span>
            </div>
          )}
          <Button variant="outline" size="icon" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Role Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedTab('all')}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-muted">
              <UsersIcon className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">All Users</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-border/50 cursor-pointer hover:border-primary/50 transition-colors ${selectedTab === 'admin' ? 'border-primary' : ''}`} onClick={() => setSelectedTab('admin')}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/20">
              <Crown className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.admins}</p>
              <p className="text-sm text-muted-foreground">Admins</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-border/50 cursor-pointer hover:border-warning/50 transition-colors ${selectedTab === 'analyst' ? 'border-warning' : ''}`} onClick={() => setSelectedTab('analyst')}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-warning/20">
              <UserCog className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.analysts}</p>
              <p className="text-sm text-muted-foreground">Analysts</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-border/50 cursor-pointer hover:border-muted-foreground/50 transition-colors ${selectedTab === 'viewer' ? 'border-muted-foreground' : ''}`} onClick={() => setSelectedTab('viewer')}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-muted">
              <Eye className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.viewers}</p>
              <p className="text-sm text-muted-foreground">Viewers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Sort */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'name' | 'role' | 'date')}>
          <SelectTrigger className="w-[180px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Sort by Name</SelectItem>
            <SelectItem value="role">Sort by Role</SelectItem>
            <SelectItem value="date">Sort by Date</SelectItem>
          </SelectContent>
        </Select>
        {selectedTab !== 'all' && (
          <Button variant="ghost" size="sm" onClick={() => setSelectedTab('all')}>
            Clear filter
          </Button>
        )}
      </div>

      {/* Users Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            Users ({filteredUsers.length})
          </CardTitle>
          <CardDescription>
            {isAdmin ? 'Click on a role dropdown to change user permissions' : 'You need admin access to modify roles'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">User</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Change Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((userItem) => {
                    const RoleIcon = roleIcons[userItem.role || 'viewer'];
                    const isCurrentUser = userItem.id === user?.id;
                    return (
                      <TableRow key={userItem.id} className={isCurrentUser ? 'bg-primary/5' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={userItem.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/20 text-primary">
                                {userItem.full_name?.charAt(0) || userItem.email?.charAt(0)?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{userItem.full_name || 'No name'}</p>
                                {isCurrentUser && (
                                  <Badge variant="outline" className="text-xs">You</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{userItem.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`gap-1.5 ${roleColors[userItem.role || 'viewer']}`}>
                            <RoleIcon className="h-3 w-3" />
                            {userItem.role || 'viewer'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {userItem.created_at ? format(new Date(userItem.created_at), 'MMM d, yyyy') : '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {isAdmin && !isCurrentUser ? (
                            <Select
                              value={userItem.role}
                              onValueChange={(v) => updateUserRole(userItem.id, v as AppRole)}
                            >
                              <SelectTrigger className="w-[130px] ml-auto">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">
                                  <div className="flex items-center gap-2">
                                    <Crown className="h-3.5 w-3.5 text-primary" />
                                    Admin
                                  </div>
                                </SelectItem>
                                <SelectItem value="analyst">
                                  <div className="flex items-center gap-2">
                                    <UserCog className="h-3.5 w-3.5 text-warning" />
                                    Analyst
                                  </div>
                                </SelectItem>
                                <SelectItem value="viewer">
                                  <div className="flex items-center gap-2">
                                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                    Viewer
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {isCurrentUser ? "Can't change own role" : 'View only'}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Role Descriptions */}
      <div className="grid gap-4 md:grid-cols-3">
        {(['admin', 'analyst', 'viewer'] as AppRole[]).map((role) => {
          const RoleIcon = roleIcons[role];
          return (
            <Card key={role} className={`border-border/50 ${role === 'admin' ? 'bg-primary/5 border-primary/30' : role === 'analyst' ? 'bg-warning/5 border-warning/30' : ''}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <RoleIcon className={`h-5 w-5 ${role === 'admin' ? 'text-primary' : role === 'analyst' ? 'text-warning' : 'text-muted-foreground'}`} />
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{roleDescriptions[role]}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
