
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';

export default function TwoFactorAuthPage() {
  const [is2faEnabled, setIs2faEnabled] = useState(true);
  const { toast } = useToast();

  const handleToggle = () => {
    setIs2faEnabled(prev => !prev);
    toast({
        title: "Security Update",
        description: `Two-Factor Authentication has been ${!is2faEnabled ? "enabled" : "disabled"}.`
    });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Two-Factor Authentication (2FA)</h1>
        <p className="text-muted-foreground">Enhance your account security by enabling 2FA.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>2FA Settings</CardTitle>
          <CardDescription>
            When enabled, you will be required to enter a security code from your authenticator app when you sign in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-6 rounded-lg bg-muted/50">
             <div className="space-y-1">
                <Label htmlFor="two-factor-auth" className="text-base font-medium">Enable Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Status: <span className={is2faEnabled ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {is2faEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </p>
             </div>
             <Switch
                id="two-factor-auth"
                checked={is2faEnabled}
                onCheckedChange={handleToggle}
              />
          </div>
          {is2faEnabled && (
            <div className="mt-6 text-center">
                 <p className="text-muted-foreground mb-4">Scan this QR code with your authenticator app.</p>
                <div className="inline-block p-4 border rounded-lg bg-white">
                    <img src="https://placehold.co/200x200" alt="QR Code" data-ai-hint="qr code" />
                </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
