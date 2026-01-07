import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, Bell, Shield, Key, Mail, Lock, 
  Smartphone, AlertTriangle, CheckCircle, Save 
} from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    avatar_url: ''
  });
  const [notifications, setNotifications] = useState({
    email_alerts: true,
    critical_threats: true,
    weekly_reports: true,
    incident_updates: true,
    system_updates: false
  });
  const [security, setSecurity] = useState({
    mfa_enabled: false,
    session_timeout: 30,
    ip_whitelist: ''
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    
    if (data) {
      setProfile({
        full_name: data.full_name || '',
        email: data.email || user.email || '',
        avatar_url: data.avatar_url || ''
      });
    }
  };

  const handleProfileUpdate = async () => {
    if (!user) return;
    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      // Log audit event
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'profile_updated',
        resource_type: 'profile',
        resource_id: user.id,
        details: { updated_fields: ['full_name', 'avatar_url'] }
      });

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been saved successfully.'
      });
    }
    setLoading(false);
  };

  const handlePasswordChange = async () => {
    toast({
      title: 'Password Reset',
      description: 'Check your email for password reset instructions.'
    });
    await supabase.auth.resetPasswordForEmail(profile.email);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences and security</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xl">
                    {profile.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Label htmlFor="avatar_url">Avatar URL</Label>
                  <Input
                    id="avatar_url"
                    value={profile.avatar_url}
                    onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="full_name"
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      className="pl-10"
                      placeholder="Your full name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      value={profile.email}
                      className="pl-10"
                      disabled
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleProfileUpdate} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Configure how you want to receive alerts and updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: 'email_alerts', label: 'Email Alerts', description: 'Receive important alerts via email', icon: Mail },
                { key: 'critical_threats', label: 'Critical Threats', description: 'Immediate notification for critical severity threats', icon: AlertTriangle },
                { key: 'incident_updates', label: 'Incident Updates', description: 'Updates on incidents assigned to you', icon: CheckCircle },
                { key: 'weekly_reports', label: 'Weekly Reports', description: 'Weekly security summary and statistics', icon: Bell },
                { key: 'system_updates', label: 'System Updates', description: 'Platform updates and maintenance notices', icon: Bell },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications[item.key as keyof typeof notifications]}
                    onCheckedChange={(checked) => 
                      setNotifications({ ...notifications, [item.key]: checked })
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <div className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handlePasswordChange} variant="outline">
                  <Key className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>Add an extra layer of security to your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Smartphone className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Authenticator App</p>
                      <p className="text-sm text-muted-foreground">Use an authenticator app for 2FA codes</p>
                    </div>
                  </div>
                  <Switch
                    checked={security.mfa_enabled}
                    onCheckedChange={(checked) => setSecurity({ ...security, mfa_enabled: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Session Settings</CardTitle>
                <CardDescription>Configure session timeout and security options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Session Timeout (minutes)</Label>
                  <Input
                    type="number"
                    value={security.session_timeout}
                    onChange={(e) => setSecurity({ ...security, session_timeout: parseInt(e.target.value) })}
                    min={5}
                    max={120}
                  />
                </div>
                <div className="space-y-2">
                  <Label>IP Whitelist</Label>
                  <Input
                    value={security.ip_whitelist}
                    onChange={(e) => setSecurity({ ...security, ip_whitelist: e.target.value })}
                    placeholder="192.168.1.1, 10.0.0.0/24"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated list of allowed IP addresses or CIDR ranges
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
