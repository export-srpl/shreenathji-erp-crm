'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface WeightedPipelineWidgetProps {
  filters: {
    startDate?: string;
    endDate?: string;
    pipelineId?: string;
    salesRepId?: string;
  };
}

export function WeightedPipelineWidget({ filters }: WeightedPipelineWidgetProps) {
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

        const res = await fetch(`/api/reports/pipeline/weighted?${params.toString()}`);
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (error) {
        console.error('Failed to load weighted pipeline:', error);
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
          Weighted Pipeline
        </CardTitle>
        <CardDescription>Pipeline value weighted by stage probability</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !data ? (
          <p className="text-sm text-muted-foreground text-center py-8">No pipeline data available</p>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Total Deals</div>
                  <div className="text-2xl font-bold">{data.totalDeals}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Total Value</div>
                  <div className="text-2xl font-bold">
                    ₹{data.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Weighted Value</div>
                  <div className="text-2xl font-bold">
                    ₹{data.weightedValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* By Stage */}
            {data.byStage && data.byStage.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Pipeline by Stage</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stage</TableHead>
                      <TableHead className="text-right">Probability</TableHead>
                      <TableHead className="text-right">Deals</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                      <TableHead className="text-right">Weighted Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byStage.map((stage: any) => (
                      <TableRow key={stage.stageId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{stage.stageName}</span>
                            <Badge variant={stage.stageType === 'won' ? 'default' : stage.stageType === 'lost' ? 'destructive' : 'secondary'}>
                              {stage.stageType}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{stage.probability}%</TableCell>
                        <TableCell className="text-right">{stage.dealCount}</TableCell>
                        <TableCell className="text-right">
                          ₹{stage.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₹{stage.weightedValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

