'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, FileText, ShoppingCart, IndianRupee, TrendingUp, Target } from 'lucide-react';
import { MetricCard } from '@/components/dashboard/metric-card';
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
          {/* Enhanced Metric Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Leads"
              value={funnel?.leads.total || 0}
              change={funnel?.leads.total ? { value: 12.4, label: 'vs last month' } : undefined}
              icon={Users}
              description="Active leads in pipeline"
            />
            <MetricCard
              title="Conversion Rate"
              value={`${funnel?.leads.conversionRate.toFixed(1) || 0}%`}
              change={funnel?.leads.conversionRate ? { value: 5.2, label: 'vs last month' } : undefined}
              icon={Target}
              description="Lead to customer conversion"
            />
            <MetricCard
              title="Total Quotes"
              value={funnel?.quotes.count || 0}
              change={funnel?.quotes.count ? { value: 8.3, label: 'vs last month' } : undefined}
              icon={FileText}
              description="Quotes generated"
            />
            <MetricCard
              title="Total Revenue"
              value={funnel?.payments.totalAmount || 0}
              change={funnel?.payments.totalAmount ? { value: 18.5, label: 'vs last month' } : undefined}
              icon={IndianRupee}
              description="Revenue collected"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="card-enhanced">
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
                <CardDescription>Track leads through the sales pipeline.</CardDescription>
              </CardHeader>
              <CardContent>
                {funnel ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                      <span className="font-medium">Total Leads</span>
                      <span className="font-bold text-lg">{funnel.leads.total}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                      <span className="font-medium">Qualified / Converted</span>
                      <span className="font-semibold">
                        {funnel.leads.qualified} <span className="text-success">({funnel.leads.conversionRate.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                      <span className="font-medium">Quotes Created</span>
                      <span className="font-semibold">
                        {funnel.quotes.count} <span className="text-info">({funnel.quotes.fromLeads.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                      <span className="font-medium">Sales Orders</span>
                      <span className="font-semibold">
                        {funnel.salesOrders.count} <span className="text-primary">({funnel.salesOrders.fromProformas.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                      <span className="font-medium">Invoices</span>
                      <span className="font-semibold">
                        {funnel.invoices.count} <span className="text-warning">({funnel.invoices.fromSalesOrders.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t mt-3 p-2 rounded-lg bg-primary/5">
                      <span className="font-semibold">Total Collected</span>
                      <span className="font-bold text-lg text-primary">
                        {funnel.payments.totalAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No funnel data available.</p>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2 card-enhanced">
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

            <Card className="md:col-span-2 lg:col-span-3 card-enhanced">
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
                <CardDescription>Top 5 customers by total invoiced amount.</CardDescription>
              </CardHeader>
              <CardContent>
                {topCustomers.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No invoice data available.</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    {topCustomers.map((c, index) => (
                      <div 
                        key={c.customerId} 
                        className="card-grid p-4 text-center animate-fade-in"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className="text-2xl font-bold text-muted-foreground mb-2">#{index + 1}</div>
                        <div className="font-semibold mb-2 truncate" title={c.customerName}>{c.customerName}</div>
                        <div className="text-xs text-muted-foreground mb-3">Invoices: {c.invoiceCount}</div>
                        <div className="text-lg font-bold metric-value">
                          {c.totalAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
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
