import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

export function ThreatChart() {
  const [data, setData] = useState<{ time: string; threats: number; blocked: number }[]>([]);

  useEffect(() => {
    // Generate chart data from recent attacks
    const generateData = async () => {
      const now = new Date();
      const chartData = [];
      
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hourStr = hour.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false });
        
        // Simulated data with some variance
        chartData.push({
          time: hourStr,
          threats: Math.floor(Math.random() * 30) + 10,
          blocked: Math.floor(Math.random() * 15) + 5,
        });
      }
      
      setData(chartData);
    };

    generateData();
    const interval = setInterval(generateData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="cyber-card rounded-xl border border-border p-6">
      <h3 className="font-semibold mb-4">Threat Activity (24h)</h3>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="threatGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="blockedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="time" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={10}
              tickLine={false}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Area
              type="monotone"
              dataKey="threats"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              fill="url(#threatGradient)"
              name="Threats"
            />
            <Area
              type="monotone"
              dataKey="blocked"
              stroke="hsl(var(--success))"
              strokeWidth={2}
              fill="url(#blockedGradient)"
              name="Blocked"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
