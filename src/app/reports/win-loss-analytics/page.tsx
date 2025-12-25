'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';

interface AnalyticsData {
  summary: {
    total: number;
    won: number;
    lost: number;
    disqualified: number;
  };
  breakdown: Array<{
    key: string;
    won: number;
    lost: number;
    disqualified: number;
    total: number;
    winRate: string;
  }>;
  groupBy: string;
  module: string;
}

export default function WinLossAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [module, setModule] = useState<string>('');
  const [groupBy, setGroupBy] = useState<string>('reason');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Set default date range (last 30 days)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchAnalytics();
    }
  }, [module, groupBy, startDate, endDate]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        groupBy,
      });
      if (module) params.append('module', module);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/reports/win-loss-analytics?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const analyticsData = await res.json();
      setData(analyticsData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const winRate = data?.summary.total
    ? ((data.summary.won / data.summary.total) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Win/Loss Analytics</h1>
        <p className="text-muted-foreground">
          Analyze win and loss patterns to identify trends and improve sales performance.
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Customize your analytics view</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="module">Module</Label>
              <Select value={module} onValueChange={setModule}>
                <SelectTrigger id="module">
                  <SelectValue placeholder="All Modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Modules</SelectItem>
                  <SelectItem value="LEAD">Leads</SelectItem>
                  <SelectItem value="DEAL">Deals</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="groupBy">Group By</Label>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger id="groupBy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reason">Reason</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="customerType">Customer Type</SelectItem>
                  <SelectItem value="region">Region</SelectItem>
                  <SelectItem value="salesPerson">Sales Person</SelectItem>
                  <SelectItem value="source">Source</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Won
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{data.summary.won}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Lost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{data.summary.lost}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Win Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{winRate}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>Breakdown by {groupBy}</CardTitle>
              <CardDescription>
                Detailed breakdown showing win/loss distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.breakdown.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No data available for the selected filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4 font-semibold">{groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}</th>
                        <th className="text-right py-2 px-4 font-semibold">Total</th>
                        <th className="text-right py-2 px-4 font-semibold">Won</th>
                        <th className="text-right py-2 px-4 font-semibold">Lost</th>
                        <th className="text-right py-2 px-4 font-semibold">Disqualified</th>
                        <th className="text-right py-2 px-4 font-semibold">Win Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.breakdown.map((item) => (
                        <tr key={item.key} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-4 font-medium">{item.key || 'Unknown'}</td>
                          <td className="text-right py-2 px-4">{item.total}</td>
                          <td className="text-right py-2 px-4 text-green-600">{item.won}</td>
                          <td className="text-right py-2 px-4 text-red-600">{item.lost}</td>
                          <td className="text-right py-2 px-4 text-orange-600">{item.disqualified}</td>
                          <td className="text-right py-2 px-4 font-semibold">{item.winRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              Failed to load analytics data. Please try again.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

