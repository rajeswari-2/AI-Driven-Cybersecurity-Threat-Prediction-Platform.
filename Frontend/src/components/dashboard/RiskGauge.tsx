import { cn } from '@/lib/utils';

interface RiskGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function RiskGauge({ score, size = 'md' }: RiskGaugeProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  
  const sizeStyles = {
    sm: 'h-24 w-24',
    md: 'h-32 w-32',
    lg: 'h-40 w-40',
  };

  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  const getColor = () => {
    if (clampedScore >= 70) return 'text-destructive';
    if (clampedScore >= 40) return 'text-warning';
    return 'text-success';
  };

  const getRiskLabel = () => {
    if (clampedScore >= 70) return 'Critical';
    if (clampedScore >= 40) return 'Elevated';
    return 'Low';
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  return (
    <div className={cn('relative flex items-center justify-center', sizeStyles[size])}>
      <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
          fill="none"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke={clampedScore >= 70 ? 'hsl(var(--destructive))' : clampedScore >= 40 ? 'hsl(var(--warning))' : 'hsl(var(--success))'}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn('font-bold', textSizes[size], getColor())}>{clampedScore}</span>
        <span className="text-xs text-muted-foreground">{getRiskLabel()}</span>
      </div>
    </div>
  );
}
