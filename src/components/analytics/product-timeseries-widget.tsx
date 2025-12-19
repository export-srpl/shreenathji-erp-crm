'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface ProductTimeSeriesWidgetProps {
  filters: {
    startDate?: string;
    endDate?: string;
    customerType?: string;
    salesRepId?: string;
  };
}

export function ProductTimeSeriesWidget({ filters }: ProductTimeSeriesWidgetProps) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<'month' | 'quarter'>('month');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        params.append('groupBy', groupBy);

        const res = await fetch(`/api/analytics/products/timeseries?${params.toString()}`);
        if (res.ok) {
          const result = await res.json();
          // Group by period and aggregate
          const periodMap: Record<string, any> = {};
          for (const item of result) {
            if (!periodMap[item.period]) {
              periodMap[item.period] = {
                period: item.period,
                quantity: 0,
                revenue: 0,
                invoiceCount: 0,
              };
            }
            periodMap[item.period].quantity += item.quantity;
            periodMap[item.period].revenue += item.revenue;
            periodMap[item.period].invoiceCount += item.invoiceCount;
          }
          setData(Object.values(periodMap).sort((a, b) => a.period.localeCompare(b.period)));
        }
      } catch (error) {
        console.error('Failed to load product time-series:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [filters, groupBy]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Product Sales Trend
            </CardTitle>
            <CardDescription>Time-series view of product sales quantity and revenue</CardDescription>
          </div>
          <Select value={groupBy} onValueChange={(v: 'month' | 'quarter') => setGroupBy(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">By Month</SelectItem>
              <SelectItem value="quarter">By Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No time-series data available</p>
        ) : (
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid gap-2">
                            <div className="font-medium">{payload[0].payload.period}</div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">Quantity: </span>
                              <span className="font-medium">{payload[0].value?.toLocaleString()}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">Revenue: </span>
                              <span className="font-medium">
                                ₹{Number(payload[1]?.value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">Invoices: </span>
                              <span className="font-medium">{payload[0].payload.invoiceCount}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="quantity"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  name="Quantity"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

