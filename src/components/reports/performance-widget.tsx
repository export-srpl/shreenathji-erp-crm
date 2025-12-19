'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PerformanceWidgetProps {
  filters: {
    startDate?: string;
    endDate?: string;
    pipelineId?: string;
    salesRepId?: string;
  };
}

export function PerformanceWidget({ filters }: PerformanceWidgetProps) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.salesRepId) params.append('salesRepIds', filters.salesRepId);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);

        const res = await fetch(`/api/reports/performance?${params.toString()}`);
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (error) {
        console.error('Failed to load performance data:', error);
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
          <Users className="h-5 w-5" />
          Salesperson Performance
        </CardTitle>
        <CardDescription>Individual and team performance metrics</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No performance data available</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Salesperson</TableHead>
                <TableHead className="text-right">Total Deals</TableHead>
                <TableHead className="text-right">Win Rate</TableHead>
                <TableHead className="text-right">Total Revenue</TableHead>
                <TableHead className="text-right">Avg Deal Size</TableHead>
                <TableHead className="text-right">Pipeline Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((perf) => (
                <TableRow key={perf.salespersonId}>
                  <TableCell className="font-medium">{perf.salespersonName}</TableCell>
                  <TableCell className="text-right">{perf.totalDeals}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={perf.winRate >= 50 ? 'default' : 'secondary'}>
                      {perf.winRate.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    ₹{perf.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="text-right">
                    ₹{perf.avgDealSize.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ₹{perf.weightedPipelineValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

