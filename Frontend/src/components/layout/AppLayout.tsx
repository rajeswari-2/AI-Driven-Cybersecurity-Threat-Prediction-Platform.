import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Shield, LayoutDashboard, FileSearch, Globe, Zap, QrCode, FileCode,
  Map, Globe2, BarChart3, Database, ShieldOff, Brain, AlertTriangle,
  Settings, Users, LogOut, Menu, X, ChevronDown
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    name: 'Scanners',
    icon: FileSearch,
    children: [
      { name: 'Website Scanner', href: '/scanner/website', icon: Globe },
      { name: 'API Scanner', href: '/scanner/api', icon: Zap },
      { name: 'QR Scanner', href: '/scanner/qr', icon: QrCode },
      { name: 'Static Analysis', href: '/scanner/static', icon: FileCode },
    ],
  },
  {
    name: 'Monitoring',
    icon: Map,
    children: [
      { name: 'Live Map', href: '/monitor/live-map', icon: Map },
      { name: '3D Globe', href: '/monitor/globe', icon: Globe2 },
      { name: 'Analytics', href: '/monitor/analytics', icon: BarChart3 },
      { name: 'Threat Feed', href: '/monitor/threat-feed', icon: Database },
      { name: 'Blocked Attacks', href: '/monitor/blocked-attacks', icon: ShieldOff },
    ],
  },
  {
    name: 'AI',
    icon: Brain,
    children: [
      { name: 'Predictions', href: '/ai/predictions', icon: Brain },
    ],
  },
  { name: 'Incidents', href: '/incidents', icon: AlertTriangle },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Scanners', 'Monitoring', 'AI']);

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev =>
      prev.includes(name) ? prev.filter(g => g !== name) : [...prev, name]
    );
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r border-border transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16'
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">ThreatPredict</span>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="px-2 space-y-1">
            {navigation.map((item) => {
              if (item.children) {
                const isExpanded = expandedGroups.includes(item.name);
                return (
                  <div key={item.name}>
                    <button
                      onClick={() => toggleGroup(item.name)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors',
                        !sidebarOpen && 'justify-center'
                      )}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {sidebarOpen && (
                        <>
                          <span className="flex-1 text-left">{item.name}</span>
                          <ChevronDown className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')} />
                        </>
                      )}
                    </button>
                    {sidebarOpen && isExpanded && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.href}
                            to={child.href}
                            className={({ isActive }) => cn(
                              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                              isActive
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-muted-foreground hover:bg-muted'
                            )}
                          >
                            <child.icon className="h-4 w-4" />
                            <span>{child.name}</span>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.href}
                  to={item.href!}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted',
                    !sidebarOpen && 'justify-center'
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {sidebarOpen && <span>{item.name}</span>}
                </NavLink>
              );
            })}
          </nav>
        </ScrollArea>

        {/* User Menu */}
        <div className="p-4 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={cn('w-full justify-start gap-3', !sidebarOpen && 'justify-center')}>
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                {sidebarOpen && (
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium truncate">{user?.email}</p>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        'flex-1 transition-all duration-300',
        sidebarOpen ? 'ml-64' : 'ml-16'
      )}>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
