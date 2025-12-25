'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface SecurityAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string | null;
  userId: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  resource: string | null;
  resourceId: string | null;
  metadata: string | null;
  acknowledged: boolean;
  acknowledgedAt: string | null;
  acknowledgedById: string | null;
  acknowledgedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  createdAt: string;
}

export default function SecurityAlertsPage() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [acknowledgedFilter, setAcknowledgedFilter] = useState<string>('unacknowledged');

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter, typeFilter, acknowledgedFilter]);

  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (severityFilter !== 'all') params.append('severity', severityFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (acknowledgedFilter === 'acknowledged') params.append('acknowledged', 'true');
      else if (acknowledgedFilter === 'unacknowledged') params.append('acknowledged', 'false');

      const res = await fetch(`/api/security/alerts?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch alerts');
      const data = await res.json();
      setAlerts(data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load security alerts. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      const res = await fetch(`/api/security/alerts/${alertId}/acknowledge`, {
        method: 'POST',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to acknowledge alert');
      }

      toast({
        title: 'Success',
        description: 'Alert acknowledged',
      });

      fetchAlerts();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to acknowledge alert',
      });
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <Badge variant="destructive" className="bg-red-600">
            <XCircle className="h-3 w-3 mr-1" />
            Critical
          </Badge>
        );
      case 'high':
        return (
          <Badge variant="destructive" className="bg-orange-600">
            <AlertTriangle className="h-3 w-3 mr-1" />
            High
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Medium
          </Badge>
        );
      case 'low':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Info className="h-3 w-3 mr-1" />
            Low
          </Badge>
        );
      default:
        return <Badge variant="secondary">{severity}</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const parseMetadata = (metadata: string | null): Record<string, any> => {
    if (!metadata) return {};
    try {
      return JSON.parse(metadata);
    } catch {
      return {};
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (acknowledgedFilter === 'acknowledged' && !alert.acknowledged) return false;
    if (acknowledgedFilter === 'unacknowledged' && alert.acknowledged) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Security Alerts</h1>
        <p className="text-muted-foreground">
          Monitor security events and unusual activity in your system
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Security Alerts</CardTitle>
              <CardDescription>
                Review and acknowledge security alerts and anomalies
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="new_login_location">New Login Location</SelectItem>
                  <SelectItem value="failed_login">Failed Login</SelectItem>
                  <SelectItem value="bulk_operation">Bulk Operation</SelectItem>
                  <SelectItem value="pricing_override">Pricing Override</SelectItem>
                  <SelectItem value="suspicious_activity">Suspicious Activity</SelectItem>
                </SelectContent>
              </Select>
              <Select value={acknowledgedFilter} onValueChange={setAcknowledgedFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Alerts</SelectItem>
                  <SelectItem value="unacknowledged">Unacknowledged</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No security alerts found</p>
              <p className="text-sm mt-2">All clear! No security events to review.</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlerts.map((alert) => {
                    const metadata = parseMetadata(alert.metadata);
                    return (
                      <TableRow key={alert.id}>
                        <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                        <TableCell>
                          <span className="text-sm capitalize">
                            {getTypeLabel(alert.type)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{alert.title}</div>
                            {alert.description && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {alert.description}
                              </div>
                            )}
                            {metadata.ipAddress && (
                              <div className="text-xs text-muted-foreground mt-1">
                                IP: {metadata.ipAddress}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {alert.user ? (
                            <div>
                              <div className="text-sm">{alert.user.name || alert.user.email}</div>
                              {alert.user.name && (
                                <div className="text-xs text-muted-foreground">{alert.user.email}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">System</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {alert.resource ? (
                            <span className="text-sm capitalize">{alert.resource}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(alert.createdAt), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          {alert.acknowledged ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Acknowledged
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!alert.acknowledged && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAcknowledge(alert.id)}
                            >
                              Acknowledge
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

