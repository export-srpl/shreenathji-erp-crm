
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

export default function GeoLogsPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Geolocation Logs</h1>
          <p className="text-muted-foreground">Track and review geolocation data from mobile devices.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Live Geo Logs</CardTitle>
          <CardDescription>Real-time location updates from field staff.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-12">
            <MapPin className="mx-auto h-12 w-12" />
            <p className="mt-4">No geolocation data is currently available.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
