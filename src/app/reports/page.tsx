import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, PlusCircle } from "lucide-react";

export default function ReportsPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Standard Reports</h1>
          <p className="text-muted-foreground">Access predefined and custom reports for your business.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2" />
          New Custom Report
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Sales Pipeline</CardTitle>
            <CardDescription>Detailed view of your current sales pipeline.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <FileDown className="mr-2" />
              Download Report
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Inventory Turnover</CardTitle>
            <CardDescription>Analysis of how quickly inventory is sold.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <FileDown className="mr-2" />
              Download Report
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Overdue Payments</CardTitle>
            <CardDescription>List of all outstanding invoices and payments.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <FileDown className="mr-2" />
              Download Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
