import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

export default function LocalizationPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Localization</h1>
          <p className="text-muted-foreground">Configure settings for different tax regimes (e.g., GST India, VAT EU).</p>
        </div>
        <Button>
          <Save className="mr-2" />
          Save Changes
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Tax Settings</CardTitle>
          <CardDescription>Define tax rules and formats for your region.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-12">
            <p>Localization settings have not been configured.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
