'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2 } from 'lucide-react';

function Verify2FAForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAutoVerified, setHasAutoVerified] = useState(false);

  const email = searchParams.get('email') || '';
  const redirectTo = searchParams.get('redirectTo') || '/sales/dashboard';

  const verifyCode = async (verificationCode: string) => {
    if (verificationCode.length !== 6 || isSubmitting || hasAutoVerified) return;

    setIsSubmitting(true);
    setHasAutoVerified(true);

    try {
      // Add timeout to prevent hanging (20 seconds max)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 20000);

      // Verify 2FA code
      const res = await fetch('/api/auth/2fa/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const error = await res.json();
        toast({
          variant: 'destructive',
          title: 'Verification failed',
          description: error.error || 'Invalid verification code.',
        });
        setHasAutoVerified(false);
        return;
      }

      // Complete login after 2FA verification (with timeout)
      const loginController = new AbortController();
      const loginTimeoutId = setTimeout(() => {
        loginController.abort();
      }, 20000);

      const loginRes = await fetch('/api/auth/login/complete-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        signal: loginController.signal,
      });

      clearTimeout(loginTimeoutId);

      if (!loginRes.ok) {
        const error = await loginRes.json();
        throw new Error(error.error || 'Failed to complete login');
      }

      toast({
        title: 'Verification successful',
        description: 'You have logged in successfully.',
      });

      router.push(redirectTo);
    } catch (error: any) {
      console.error('2FA verification error', error);
      
      // Handle timeout/abort errors
      if (error.name === 'AbortError') {
        toast({
          variant: 'destructive',
          title: 'Request timeout',
          description: 'The verification request took too long. Please try again.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Verification failed',
          description: error.message || 'Unexpected error. Please try again.',
        });
      }
      setHasAutoVerified(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await verifyCode(code);
  }

  // Auto-verify when 6 digits are entered
  useEffect(() => {
    if (code.length === 6 && !isSubmitting && !hasAutoVerified) {
      verifyCode(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, isSubmitting, hasAutoVerified]);

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
              data-testid="2fa-code-input"
            />
            <p className="text-xs text-muted-foreground text-center">
              Open your authenticator app and enter the code shown
            </p>
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting || code.length !== 6}
            data-testid="2fa-verify-button"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify & Sign In'
            )}
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

