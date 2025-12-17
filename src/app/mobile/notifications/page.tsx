import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Push Notifications</h1>
          <p className="text-muted-foreground">Send and review push notifications for reminders, approvals, and status updates.</p>
        </div>
        <Button>
          <Send className="mr-2" />
          Send Notification
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Notification History</CardTitle>
          <CardDescription>Log of all push notifications sent to users.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-12">
            <p>No notifications have been sent yet.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
