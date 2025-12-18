'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, ShieldCheck, ShieldOff, Copy, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface User2FAStatus {
  is2FAEnabled: boolean;
  hasSecret: boolean;
}

export default function TwoFactorAuthPage() {
  const { toast } = useToast();
  const [is2faEnabled, setIs2faEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch2FAStatus();
  }, []);

  const fetch2FAStatus = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const user = await res.json();
        setIs2faEnabled(user.is2FAEnabled || false);
      }
    } catch (error) {
      console.error('Failed to fetch 2FA status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSecret = async () => {
    try {
      setIsGenerating(true);
      const res = await fetch('/api/auth/2fa/generate');
      if (!res.ok) {
        throw new Error('Failed to generate 2FA secret');
      }

      const data = await res.json();
      setQrCode(data.qrCode);
      setSecret(data.manualEntryKey);
      setShowSetup(true);
      
      toast({
        title: 'QR Code Generated',
        description: 'Scan the QR code with your authenticator app.',
      });
    } catch (error) {
      console.error('Failed to generate secret:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to generate QR code',
        description: 'Please try again later.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        variant: 'destructive',
        title: 'Invalid Code',
        description: 'Please enter a 6-digit code.',
      });
      return;
    }

    try {
      setIsVerifying(true);
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Verification failed');
      }

      setIs2faEnabled(true);
      setShowSetup(false);
      setQrCode(null);
      setSecret(null);
      setVerificationCode('');
      
      toast({
        title: '2FA Enabled',
        description: 'Two-factor authentication has been successfully enabled.',
      });
    } catch (error) {
      console.error('Failed to verify code:', error);
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: error instanceof Error ? error.message : 'Invalid verification code.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
      return;
    }

    try {
      setIsDisabling(true);
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Failed to disable 2FA');
      }

      setIs2faEnabled(false);
      setShowSetup(false);
      setQrCode(null);
      setSecret(null);
      
      toast({
        title: '2FA Disabled',
        description: 'Two-factor authentication has been disabled.',
      });
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to disable 2FA',
        description: 'Please try again later.',
      });
    } finally {
      setIsDisabling(false);
    }
  };

  const handleCopySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copied',
        description: 'Secret key copied to clipboard.',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Two-Factor Authentication (2FA)</h1>
        <p className="text-muted-foreground">Enhance your account security by enabling 2FA with Google Authenticator.</p>
      </div>

      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle>2FA Settings</CardTitle>
          <CardDescription>
            When enabled, you will be required to enter a security code from your authenticator app when you sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Section */}
          <div className="flex items-center justify-between p-6 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              {is2faEnabled ? (
                <ShieldCheck className="h-6 w-6 text-green-600" />
              ) : (
                <ShieldOff className="h-6 w-6 text-muted-foreground" />
              )}
              <div className="space-y-1">
                <Label className="text-base font-medium">Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Status: <span className={is2faEnabled ? 'text-green-600 font-semibold' : 'text-muted-foreground font-semibold'}>
                    {is2faEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </p>
              </div>
            </div>
            {is2faEnabled ? (
              <Button variant="destructive" onClick={handleDisable} disabled={isDisabling}>
                {isDisabling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Disabling...
                  </>
                ) : (
                  <>
                    <ShieldOff className="mr-2 h-4 w-4" />
                    Disable 2FA
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleGenerateSecret} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Enable 2FA
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Setup Section */}
          {showSetup && !is2faEnabled && (
            <div className="space-y-4 p-6 border rounded-lg bg-muted/30">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Scan the QR code below with Google Authenticator or another TOTP app. If you can't scan, enter the secret key manually.
                </AlertDescription>
              </Alert>

              {qrCode && (
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 border rounded-lg bg-white">
                    <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                  </div>
                  
                  {secret && (
                    <div className="w-full space-y-2">
                      <Label>Manual Entry Key</Label>
                      <div className="flex gap-2">
                        <Input
                          value={secret}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleCopySecret}
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Use this key if you can't scan the QR code
                      </p>
                    </div>
                  )}

                  <div className="w-full space-y-2">
                    <Label htmlFor="verification-code">Enter Verification Code</Label>
                    <Input
                      id="verification-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="000000"
                      value={verificationCode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setVerificationCode(value);
                      }}
                      className="text-center text-xl tracking-widest font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the 6-digit code from your authenticator app to verify and enable 2FA
                    </p>
                  </div>

                  <div className="flex gap-2 w-full">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowSetup(false);
                        setQrCode(null);
                        setSecret(null);
                        setVerificationCode('');
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleVerifyAndEnable}
                      disabled={isVerifying || verificationCode.length !== 6}
                      className="flex-1"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          Verify & Enable
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          {!showSetup && (
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium">How it works:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Click "Enable 2FA" to generate a QR code</li>
                <li>Scan the QR code with Google Authenticator or any TOTP app</li>
                <li>Enter the 6-digit code from your app to verify</li>
                <li>Once enabled, you'll need to enter a code every time you log in</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
