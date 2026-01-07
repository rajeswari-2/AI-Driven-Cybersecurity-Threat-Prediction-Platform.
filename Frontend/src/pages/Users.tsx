import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link } from 'react-router-dom';
import { 
  Search, Shield, Users as UsersIcon, Crown, Eye, 
  UserCog, AlertTriangle, CheckCircle 
} from 'lucide-react';
import { format } from 'date-fns';
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

const roleIcons: Record<AppRole, any> = {
  admin: Crown,
  analyst: UserCog,
  viewer: Eye
};

export default function Users() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<AppRole | null>(null);

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
    
    // Fetch profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    // Fetch roles
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('*');

    if (profilesError || rolesError) {
      toast({ 
        title: 'Error', 
        description: profilesError?.message || rolesError?.message, 
        variant: 'destructive' 
      });
    } else {
      setUserRoles(rolesData || []);
      
      // Merge profiles with roles
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
    // NOTE: This client-side check is for UI/UX purposes only.
    // The actual authorization is enforced by RLS policies on user_roles table
    // which require admin role to UPDATE/INSERT/DELETE.
    if (currentUserRole !== 'admin') {
      toast({ 
        title: 'Access Denied', 
        description: 'Only admins can change user roles', 
        variant: 'destructive' 
      });
      return;
    }

    // Check if role exists
    const existingRole = userRoles.find(r => r.user_id === userId);

    if (existingRole) {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }
    } else {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }
    }

    // Log audit event
    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      action: 'role_changed',
      resource_type: 'user_role',
      resource_id: userId,
      details: { new_role: newRole }
    });

    toast({ title: 'Success', description: 'User role updated' });
    fetchUsers();
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    analysts: users.filter(u => u.role === 'analyst').length,
    viewers: users.filter(u => u.role === 'viewer').length
  };

  const isAdmin = currentUserRole === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage team members and their roles</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild>
            <Link to="/users/roles" className="gap-2">
              <Shield className="h-4 w-4" />
              Role Management
            </Link>
          </Button>
          {!isAdmin && (
            <div className="flex items-center gap-2 text-warning bg-warning/10 px-4 py-2 rounded-lg border border-warning/30">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Admin access required to modify roles</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/20">
              <UsersIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-primary/5">
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
        <Card className="border-border/50 bg-warning/5">
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
        <Card className="border-border/50">
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search users..."
          className="pl-10"
        />
      </div>

      {/* Users Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((userItem) => {
                  const RoleIcon = roleIcons[userItem.role || 'viewer'];
                  return (
                    <TableRow key={userItem.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={userItem.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/20 text-primary">
                              {userItem.full_name?.charAt(0) || userItem.email?.charAt(0)?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{userItem.full_name || 'No name'}</p>
                            <p className="text-sm text-muted-foreground">{userItem.email}</p>
                          </div>
                          {userItem.id === user?.id && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`gap-1 ${roleColors[userItem.role || 'viewer']}`}>
                          <RoleIcon className="h-3 w-3" />
                          {userItem.role || 'viewer'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {userItem.created_at ? format(new Date(userItem.created_at), 'MMM d, yyyy') : '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {userItem.updated_at ? format(new Date(userItem.updated_at), 'MMM d, yyyy') : '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isAdmin && userItem.id !== user?.id ? (
                          <Select
                            value={userItem.role}
                            onValueChange={(v) => updateUserRole(userItem.id, v as AppRole)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="analyst">Analyst</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {userItem.id === user?.id ? 'Current user' : 'View only'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Role Permissions Info */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-5 w-5 text-primary" />
                <span className="font-semibold">Admin</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Full system access</li>
                <li>• Manage users and roles</li>
                <li>• View all audit logs</li>
                <li>• Configure settings</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
              <div className="flex items-center gap-2 mb-2">
                <UserCog className="h-5 w-5 text-warning" />
                <span className="font-semibold">Analyst</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• View all threats and scans</li>
                <li>• Manage incidents</li>
                <li>• Run security scans</li>
                <li>• Access threat intel</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold">Viewer</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• View dashboard</li>
                <li>• View own scans</li>
                <li>• Read-only access</li>
                <li>• Limited features</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
