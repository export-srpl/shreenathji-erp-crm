'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, LogOut, Shield, Monitor, Smartphone, Tablet } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Session {
  id: string;
  device: string | null;
  browser: string | null;
  os: string | null;
  city: string | null;
  country: string | null;
  ipAddress: string | null;
  lastActivityAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export default function SessionsPage() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false);
  const [sessionToTerminate, setSessionToTerminate] = useState<Session | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/sessions');
      if (!res.ok) throw new Error('Failed to fetch sessions');
      const data = await res.json();
      setSessions(data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load sessions. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTerminate = (session: Session) => {
    if (session.isCurrent) {
      toast({
        variant: 'destructive',
        title: 'Cannot terminate',
        description: 'You cannot terminate your current session from this page.',
      });
      return;
    }
    setSessionToTerminate(session);
    setTerminateDialogOpen(true);
  };

  const confirmTerminate = async () => {
    if (!sessionToTerminate) return;

    try {
      const res = await fetch(`/api/sessions/${sessionToTerminate.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to terminate session');
      }

      toast({
        title: 'Success',
        description: 'Session terminated successfully',
      });

      // Remove session from list
      setSessions(sessions.filter((s) => s.id !== sessionToTerminate.id));
      setTerminateDialogOpen(false);
      setSessionToTerminate(null);
    } catch (error) {
      console.error('Failed to terminate session:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to terminate session',
      });
    }
  };

  const getDeviceIcon = (device: string | null) => {
    switch (device?.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const formatLocation = (session: Session) => {
    const parts = [];
    if (session.city) parts.push(session.city);
    if (session.country) parts.push(session.country);
    return parts.length > 0 ? parts.join(', ') : 'Unknown location';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Active Sessions</h1>
        <p className="text-muted-foreground">
          View and manage your active login sessions across different devices and locations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Sessions</CardTitle>
          <CardDescription>
            All active sessions where you are currently logged in
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              No active sessions found.
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Browser</TableHead>
                    <TableHead>OS</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(session.device)}
                          <span>{session.device || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{session.browser || 'Unknown'}</TableCell>
                      <TableCell>{session.os || 'Unknown'}</TableCell>
                      <TableCell>{formatLocation(session)}</TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">{session.ipAddress || '—'}</span>
                      </TableCell>
                      <TableCell>
                        {format(new Date(session.lastActivityAt), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        {session.isCurrent ? (
                          <Badge variant="default" className="bg-green-600">
                            <Shield className="h-3 w-3 mr-1" />
                            Current
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!session.isCurrent && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTerminate(session)}
                          >
                            <LogOut className="h-4 w-4 mr-1" />
                            Terminate
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

      <AlertDialog open={terminateDialogOpen} onOpenChange={setTerminateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate Session?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out from this session? The user will need to log in again
              to access the system from this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTerminate}>Terminate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

