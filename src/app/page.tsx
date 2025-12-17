import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KanbanSquare, FlaskConical, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Welcome back, Admin!</h1>
        <p className="text-muted-foreground">Here's a quick overview of your business operations.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Sales</CardTitle>
            <CardDescription>This month</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">Rs. 12,50,420</p>
            <p className="text-sm text-green-600">+15.2% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Deals</CardTitle>
            <CardDescription>In pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">32</p>
            <p className="text-sm text-muted-foreground">2 recently added</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Production Status</CardTitle>
            <CardDescription>Current batches</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">8</p>
            <p className="text-sm text-muted-foreground">3 in QC approval</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold font-headline">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="flex flex-col">
            <CardHeader className="flex-row items-center gap-4">
              <KanbanSquare className="w-10 h-10 text-primary" />
              <div>
                <CardTitle>Deals Pipeline</CardTitle>
                <CardDescription>Manage your sales pipeline from prospect to close.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex-grow flex items-end">
              <Link href="/deals" className="w-full">
                <Button className="w-full">
                  Go to Deals <ArrowRight className="ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
          <Card className="flex flex-col">
            <CardHeader className="flex-row items-center gap-4">
              <FlaskConical className="w-10 h-10 text-primary" />
              <div>
                <CardTitle>Generate COA</CardTitle>
                <CardDescription>Create a Certificate of Analysis for a product batch.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex-grow flex items-end">
              <Link href="/qc/coa-generator" className="w-full">
                <Button className="w-full">
                  Generate Form <ArrowRight className="ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
