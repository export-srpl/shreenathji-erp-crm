import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function IntegrationsPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Integration Hub</h1>
          <p className="text-muted-foreground">Connect with Gmail, Tally, QuickBooks, GST API, and more.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2" />
          New Integration
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Connected Integrations</CardTitle>
          <CardDescription>Manage API keys and view sync logs.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-12">
            <p>No integrations are configured.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
