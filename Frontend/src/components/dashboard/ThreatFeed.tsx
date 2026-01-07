import { Shield, ShieldOff, AlertTriangle, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Attack {
  id: string;
  source_ip: string;
  source_country: string | null;
  attack_type: string;
  severity: string;
  detected_at: string | null;
}

interface ThreatFeedProps {
  attacks: Attack[];
  isLoading: boolean;
  onBlockAttack?: (attackId: string, sourceIp: string, attackType: string, severity: string, reason: string) => Promise<boolean>;
  /** When true, shows "Admin Only" badge instead of block buttons */
  showAdminOnlyHint?: boolean;
}

export function ThreatFeed({ attacks, isLoading, onBlockAttack, showAdminOnlyHint = false }: ThreatFeedProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-white';
      case 'high': return 'bg-warning text-black';
      case 'medium': return 'bg-chart-4 text-black';
      case 'low': return 'bg-success text-white';
      default: return 'bg-muted';
    }
  };

  const handleBlock = async (attack: Attack) => {
    if (onBlockAttack) {
      await onBlockAttack(
        attack.id,
        attack.source_ip,
        attack.attack_type,
        attack.severity,
        `Blocked from Dashboard - ${attack.attack_type}`
      );
    }
  };

  const canBlock = Boolean(onBlockAttack);

  return (
    <div className="cyber-card rounded-xl border border-border flex flex-col h-[400px]">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Live Threat Feed
        </h3>
        <div className="flex items-center gap-2">
          {showAdminOnlyHint && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-warning border-warning/40 bg-warning/10 gap-1 text-xs">
                  <Lock className="h-3 w-3" />
                  Admin Only
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Admin role required to block attacks</p>
              </TooltipContent>
            </Tooltip>
          )}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading threats...</div>
        ) : attacks.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No active threats</div>
        ) : (
          <div className="space-y-3">
            {attacks.slice(0, 10).map((attack) => (
              <div
                key={attack.id}
                className={cn(
                  'p-3 rounded-lg border border-border/50 bg-muted/20',
                  attack.severity === 'critical' && 'border-destructive/30 bg-destructive/5'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className={getSeverityColor(attack.severity)}>
                      {attack.severity}
                    </Badge>
                    <span className="text-sm font-medium">{attack.attack_type}</span>
                  </div>
                  {canBlock ? (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleBlock(attack)}
                    >
                      <ShieldOff className="h-3 w-3 mr-1" />
                      Block
                    </Button>
                  ) : showAdminOnlyHint ? (
                    <Badge variant="outline" className="text-muted-foreground text-[10px] gap-0.5">
                      <Lock className="h-2.5 w-2.5" />
                    </Badge>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>
                    <code className="bg-muted px-1 rounded">{attack.source_ip}</code>
                    {attack.source_country && ` • ${attack.source_country}`}
                  </span>
                  <span>
                    {attack.detected_at 
                      ? formatDistanceToNow(new Date(attack.detected_at), { addSuffix: true })
                      : 'Just now'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
