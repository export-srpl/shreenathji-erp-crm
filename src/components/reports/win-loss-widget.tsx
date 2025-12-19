'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface WinLossWidgetProps {
  filters: {
    startDate?: string;
    endDate?: string;
    pipelineId?: string;
    salesRepId?: string;
  };
}

const COLORS = ['#10b981', '#ef4444', '#6b7280'];

export function WinLossWidget({ filters }: WinLossWidgetProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.pipelineId) params.append('pipelineId', filters.pipelineId);
        if (filters.salesRepId) params.append('salesRepId', filters.salesRepId);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);

        const res = await fetch(`/api/reports/win-loss?${params.toString()}`);
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (error) {
        console.error('Failed to load win-loss analysis:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  const pieData = data
    ? [
        { name: 'Won', value: data.totalWon, color: COLORS[0] },
        { name: 'Lost', value: data.totalLost, color: COLORS[1] },
      ]
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Win-Loss Analysis
        </CardTitle>
        <CardDescription>Deal conversion rates and win-loss breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !data ? (
          <p className="text-sm text-muted-foreground text-center py-8">No win-loss data available</p>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Win Rate</div>
                  <div className="text-2xl font-bold">{data.winRate.toFixed(1)}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Won Deals</div>
                  <div className="text-2xl font-bold">{data.totalWon}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Lost Deals</div>
                  <div className="text-2xl font-bold">{data.totalLost}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Avg Won Deal Size</div>
                  <div className="text-2xl font-bold">
                    ₹{data.avgWonDealSize.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pie Chart */}
            {pieData.length > 0 && (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* By Stage */}
            {data.byStage && data.byStage.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Win Rate by Stage</h3>
                <div className="space-y-2">
                  {data.byStage.map((stage: any) => (
                    <div key={stage.stageName} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <div className="font-medium">{stage.stageName}</div>
                        <div className="text-sm text-muted-foreground">
                          {stage.won} won, {stage.lost} lost
                        </div>
                      </div>
                      <Badge variant={stage.winRate >= 50 ? 'default' : 'secondary'}>
                        {stage.winRate.toFixed(1)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

