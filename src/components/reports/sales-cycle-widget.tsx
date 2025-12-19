'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Clock } from 'lucide-react';

interface SalesCycleWidgetProps {
  filters: {
    startDate?: string;
    endDate?: string;
    pipelineId?: string;
    salesRepId?: string;
  };
}

export function SalesCycleWidget({ filters }: SalesCycleWidgetProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.salesRepId) params.append('salesRepId', filters.salesRepId);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);

        const res = await fetch(`/api/reports/sales-cycle?${params.toString()}`);
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (error) {
        console.error('Failed to load sales cycle metrics:', error);
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
          <Clock className="h-5 w-5" />
          Sales Cycle Duration
        </CardTitle>
        <CardDescription>Average time to close deals</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !data ? (
          <p className="text-sm text-muted-foreground text-center py-8">No sales cycle data available</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Average Cycle Duration</div>
                <div className="text-3xl font-bold mt-2">{data.avgCycleDuration} days</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Median Cycle Duration</div>
                <div className="text-3xl font-bold mt-2">{data.medianCycleDuration} days</div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

