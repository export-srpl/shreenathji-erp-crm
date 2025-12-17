import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export default function ExchangeRatesPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Exchange Rates</h1>
          <p className="text-muted-foreground">Manage daily foreign exchange rates for invoices and quotations.</p>
        </div>
        <Button variant="outline">
          <Upload className="mr-2" />
          Update Rates
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Current FX Rates</CardTitle>
          <CardDescription>Live rates used across the application.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-12">
            <p>No exchange rates available.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
