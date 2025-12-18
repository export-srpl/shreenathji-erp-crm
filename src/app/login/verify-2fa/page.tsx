'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Shield } from 'lucide-react';

function Verify2FAForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const email = searchParams.get('email') || '';
  const redirectTo = searchParams.get('redirectTo') || '/sales/dashboard';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Verify 2FA code
      const res = await fetch('/api/auth/2fa/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast({
          variant: 'destructive',
          title: 'Verification failed',
          description: error.error || 'Invalid verification code.',
        });
        return;
      }

      // Complete login after 2FA verification
      const loginRes = await fetch('/api/auth/login/complete-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!loginRes.ok) {
        const error = await loginRes.json();
        throw new Error(error.error || 'Failed to complete login');
      }

      toast({
        title: 'Verification successful',
        description: 'You have logged in successfully.',
      });

      router.push(redirectTo);
    } catch (error) {
      console.error('2FA verification error', error);
      toast({
        variant: 'destructive',
        title: 'Verification failed',
        description: 'Unexpected error. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-6 w-6 text-primary" />
          <CardTitle>Two-Factor Authentication</CardTitle>
        </div>
        <CardDescription>
          Enter the 6-digit code from your authenticator app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(value);
              }}
              required
              autoFocus
              className="text-center text-2xl tracking-widest font-mono"
            />
            <p className="text-xs text-muted-foreground text-center">
              Open your authenticator app and enter the code shown
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting || code.length !== 6}>
            {isSubmitting ? 'Verifying...' : 'Verify & Sign In'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function Verify2FAPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <Suspense fallback={<div>Loading...</div>}>
        <Verify2FAForm />
      </Suspense>
    </div>
  );
}

