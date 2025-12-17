import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AiForecastingPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline">AI Forecasting</h1>
        <p className="text-muted-foreground">Predictive analytics for sales, raw material planning, and export demand.</p>
      </div>
       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Sales Forecast</CardTitle>
            <CardDescription>Predict future sales trends.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="text-center text-muted-foreground py-8">
                <p>No forecast data available.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Raw Material Planning</CardTitle>
            <CardDescription>Forecast raw material needs.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="text-center text-muted-foreground py-8">
                <p>No forecast data available.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Export Demand</CardTitle>
            <CardDescription>Predict demand in export markets.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-8">
                <p>No forecast data available.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
