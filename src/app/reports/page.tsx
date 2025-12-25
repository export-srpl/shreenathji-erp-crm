'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, PlusCircle, TrendingUp, Users, Package, AlertCircle, BarChart3, ClipboardList, Target } from "lucide-react";
import Link from 'next/link';

export default function ReportsPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Standard Reports</h1>
          <p className="text-muted-foreground">Access predefined ERP-grade reports for your business.</p>
        </div>
      </div>

      {/* Sales Performance Reports */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Sales Performance Reports</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle>Conversion Funnel</CardTitle>
              </div>
              <CardDescription>
                Lead-to-order and order-to-invoice conversion rates with funnel metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/reports/conversion-funnel">
                <Button variant="outline" className="w-full">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Report
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>Sales Performance by Person</CardTitle>
              </div>
              <CardDescription>
                Sales performance metrics by sales person with order values and invoice rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/reports/sales-performance">
                <Button variant="outline" className="w-full">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Report
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <CardTitle>Backlog by Customer/Product</CardTitle>
              </div>
              <CardDescription>
                Pending dispatch summary aggregated by customer and product
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/logistics/dispatch-backlog">
                <Button variant="outline" className="w-full">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  View Report
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                <CardTitle>Pending Dispatch Summary</CardTitle>
              </div>
              <CardDescription>
                Complete dispatch register with exception detection and alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/logistics/dispatch-register">
                <Button variant="outline" className="w-full">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  View Register
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle>Planning Signal</CardTitle>
              </div>
              <CardDescription>
                Forward-looking demand based on confirmed Sales Orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/planning/summary">
                <Button variant="outline" className="w-full">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Summary
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle>Win/Loss Analytics</CardTitle>
              </div>
              <CardDescription>
                Analyze win and loss patterns by reason, product, region, and more
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/reports/win-loss-analytics">
                <Button variant="outline" className="w-full">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Analytics
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Other Reports */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Other Reports</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Sales Summary</CardTitle>
              <CardDescription>Monthly summary of quotes, orders, and invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/reports/sales-summary">
                <Button variant="outline" className="w-full">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Report
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer Orders</CardTitle>
              <CardDescription>Order summary by customer</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/reports/customer-orders">
                <Button variant="outline" className="w-full">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Report
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
