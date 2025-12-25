'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogOut, RefreshCw, Monitor, Smartphone, Tablet } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Session {
  id: string;
  token: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  ipAddress: string;
  device: string;
  browser: string;
  os: string;
  city: string;
  country: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  status: 'active' | 'expired';
  isCurrentSession: boolean;
}

export function LoginActivityTable() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [terminatingSessionId, setTerminatingSessionId] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/security/sessions');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load sessions');
      }
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err: any) {
      console.error('Failed to fetch sessions:', err);
      setError(err.message || 'Failed to load login activity');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleTerminateSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to terminate this session? You will be logged out if this is your current session.')) {
      return;
    }

    try {
      setTerminatingSessionId(sessionId);
      const res = await fetch(`/api/security/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to terminate session');
      }

      const data = await res.json();
      
      toast({
        title: 'Session Terminated',
        description: data.wasCurrentSession 
          ? 'Your current session has been terminated. You will be logged out.' 
          : 'Session terminated successfully.',
      });

      // Refresh sessions list
      await fetchSessions();

      // If this was the current session, redirect to login after a short delay
      if (data.wasCurrentSession) {
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
    } catch (err: any) {
      console.error('Failed to terminate session:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to Terminate Session',
        description: err.message || 'Could not terminate session. Please try again.',
      });
    } finally {
      setTerminatingSessionId(null);
    }
  };

  const getDeviceIcon = (device: string) => {
    if (device.toLowerCase().includes('mobile')) {
      return <Smartphone className="h-4 w-4" />;
    } else if (device.toLowerCase().includes('tablet')) {
      return <Tablet className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  if (isLoading && sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Login Activity</CardTitle>
          <CardDescription>Active and recent user sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Login Activity</CardTitle>
            <CardDescription>Active and recent user sessions with device and location details</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSessions}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No active or recent sessions found.
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Browser / OS</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(session.device)}
                        <span className="font-medium">{session.device}</span>
                        {session.isCurrentSession && (
                          <Badge variant="default" className="text-xs">Current</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{session.browser}</div>
                        <div className="text-muted-foreground">{session.os}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {session.city !== 'Unknown' && session.city !== 'Local' ? (
                          <>
                            <div className="font-medium">{session.city}</div>
                            <div className="text-muted-foreground">{session.country}</div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">
                            {session.city === 'Local' ? 'Local Network' : 'Unknown'}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {session.ipAddress}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{formatDate(session.lastActivityAt)}</div>
                        <div className="text-muted-foreground text-xs">
                          {getTimeAgo(session.lastActivityAt)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={session.status === 'active' ? 'default' : 'secondary'}
                      >
                        {session.status === 'active' ? 'Active' : 'Expired'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {session.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTerminateSession(session.id)}
                          disabled={terminatingSessionId === session.id}
                        >
                          {terminatingSessionId === session.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <LogOut className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

