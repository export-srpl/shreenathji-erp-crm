'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
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
} from 'recharts';

const chartConfig = {
  quotes: { label: 'Quotes', color: 'hsl(var(--chart-1))' },
  proformas: { label: 'Proformas', color: 'hsl(var(--chart-2))' },
  salesOrders: { label: 'Sales Orders', color: 'hsl(var(--chart-3))' },
  invoices: { label: 'Invoices', color: 'hsl(var(--chart-4))' },
};

export default function SalesDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [salesSummary, setSalesSummary] = useState<any[]>([]);
  const [funnel, setFunnel] = useState<any | null>(null);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [summaryRes, funnelRes, customersRes] = await Promise.all([
          fetch('/api/reports/sales-summary'),
          fetch('/api/reports/conversion-funnel'),
          fetch('/api/reports/top-customers?limit=5'),
        ]);

        if (summaryRes.ok) {
          setSalesSummary(await summaryRes.json());
        }
        if (funnelRes.ok) {
          setFunnel(await funnelRes.json());
        }
        if (customersRes.ok) {
          setTopCustomers(await customersRes.json());
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Sales Dashboard</h1>
        <p className="text-muted-foreground">Analyze sales performance and track key metrics.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
                <CardDescription>Track leads through the sales pipeline.</CardDescription>
              </CardHeader>
              <CardContent>
                {funnel ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Leads</span>
                      <span className="font-medium">{funnel.leads.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Qualified / Converted</span>
                      <span className="font-medium">
                        {funnel.leads.qualified} ({funnel.leads.conversionRate.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quotes Created</span>
                      <span className="font-medium">
                        {funnel.quotes.count} ({funnel.quotes.fromLeads.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sales Orders</span>
                      <span className="font-medium">
                        {funnel.salesOrders.count} ({funnel.salesOrders.fromProformas.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Invoices</span>
                      <span className="font-medium">
                        {funnel.invoices.count} ({funnel.invoices.fromSalesOrders.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t mt-2">
                      <span>Total Collected</span>
                      <span className="font-medium">
                        {funnel.payments.totalAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                        {' '}({funnel.payments.collectionRate.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No funnel data available.</p>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Sales by Month</CardTitle>
                <CardDescription>Monthly totals for quotes, proformas, orders, and invoices.</CardDescription>
              </CardHeader>
              <CardContent>
                {salesSummary.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No sales data available.</p>
                ) : (
                  <ChartContainer config={chartConfig}>
                    <LineChart data={salesSummary}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="quotes.total" stroke="var(--color-quotes)" name="Quotes" />
                      <Line type="monotone" dataKey="proformas.total" stroke="var(--color-proformas)" name="Proformas" />
                      <Line type="monotone" dataKey="salesOrders.total" stroke="var(--color-salesOrders)" name="Sales Orders" />
                      <Line type="monotone" dataKey="invoices.total" stroke="var(--color-invoices)" name="Invoices" />
                    </LineChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
                <CardDescription>Top 5 customers by total invoiced amount.</CardDescription>
              </CardHeader>
              <CardContent>
                {topCustomers.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No invoice data available.</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {topCustomers.map((c) => (
                      <div key={c.customerId} className="space-y-1 rounded-md border p-3">
                        <div className="font-medium">{c.customerName}</div>
                        <div className="text-xs text-muted-foreground">Invoices: {c.invoiceCount}</div>
                        <div className="text-sm font-semibold">
                          {c.totalAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
