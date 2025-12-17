import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuditLogsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Audit Logs</h1>
        <p className="text-muted-foreground">Track every action with user, time, device, and IP details.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>A complete record of all activities within the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-12">
            <p>No audit logs to display.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
