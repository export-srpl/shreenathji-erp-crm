'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';

interface RevenueProjectionWidgetProps {
  filters: {
    startDate?: string;
    endDate?: string;
    pipelineId?: string;
    salesRepId?: string;
  };
}

export function RevenueProjectionWidget({ filters }: RevenueProjectionWidgetProps) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.pipelineId) params.append('pipelineId', filters.pipelineId);
        params.append('months', '6');

        const res = await fetch(`/api/reports/revenue/projection?${params.toString()}`);
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (error) {
        console.error('Failed to load revenue projection:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Revenue Projection
        </CardTitle>
        <CardDescription>Forecasted revenue based on weighted pipeline and historical trends</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No projection data available</p>
        ) : (
          <div className="space-y-4">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="font-medium">{payload[0].payload.period}</div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">Projected: </span>
                              <span className="font-medium">
                                ₹{Number(payload[0].value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Confidence: <Badge variant="outline">{payload[0].payload.confidence}</Badge>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="projectedRevenue"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    name="Projected Revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.slice(0, 3).map((projection) => (
                <Card key={projection.period}>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">{projection.period}</div>
                    <div className="text-2xl font-bold mt-2">
                      ₹{projection.projectedRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                    <Badge variant={projection.confidence === 'high' ? 'default' : projection.confidence === 'medium' ? 'secondary' : 'outline'} className="mt-2">
                      {projection.confidence} confidence
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

