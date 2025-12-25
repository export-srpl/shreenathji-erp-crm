'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = searchParams.get('redirectTo') || '/sales/dashboard';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    let timeoutId: NodeJS.Timeout | null = null;
    let controller: AbortController | null = null;

    try {
      // Add timeout to prevent hanging (30 seconds max)
      controller = new AbortController();
      timeoutId = setTimeout(() => {
        if (controller) {
          controller.abort();
        }
      }, 30000);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });

      // Clear timeout on successful response
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (!res.ok) {
        // Handle error responses
        let errorMessage = 'Invalid email or password.';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // If response is not JSON, use status-based messages
          if (res.status === 401) {
            errorMessage = 'Invalid email or password.';
          } else if (res.status === 403) {
            errorMessage = 'Access denied. Please contact your administrator.';
          } else if (res.status >= 500) {
            errorMessage = 'Server error. Please try again later.';
          }
        }
        
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: errorMessage,
        });
        setIsSubmitting(false);
        return;
      }

      const data = await res.json();

      // Check if 2FA is required
      if (data.requires2FA) {
        router.push(`/login/verify-2fa?email=${encodeURIComponent(email)}&redirectTo=${encodeURIComponent(redirectTo)}`);
        return;
      }

      // Only show success and redirect if we actually got here (response was ok)
      toast({
        title: 'Welcome back',
        description: 'You have logged in successfully.',
      });

      router.push(redirectTo);
    } catch (error) {
      // Clear timeout if still active
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Handle abort errors silently (timeout was intentional)
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
        toast({
          variant: 'destructive',
          title: 'Login timeout',
          description: 'The login request took too long. Please try again.',
        });
        return;
      }

      // Log other errors but don't show abort errors in console
      if (!(error instanceof Error && error.name === 'AbortError')) {
        console.error('Login error', error);
      }

      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: 'Unexpected error. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Enter your credentials to access the dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="login-email-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-10"
                data-testid="login-password-input"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
              data-testid="login-submit-button"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
            <div className="text-center text-xs text-muted-foreground">
              <Link 
                href="/reset-password" 
                className="underline underline-offset-4 hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded pointer-events-auto"
                aria-label="Reset password"
                data-testid="forgot-password-link"
                onClick={(e) => {
                  // Ensure link is always clickable, even during login
                  if (isSubmitting) {
                    e.preventDefault();
                    // Allow navigation but show a message
                    return;
                  }
                }}
              >
                Forgot password?
              </Link>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}


