'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface AuditLog {
  id: string;
  userId: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  action: string;
  resource: string;
  resourceId: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
}

export default function AuditLogsPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: 'all',
    resource: 'all',
    userId: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filters.action !== 'all') params.append('action', filters.action);
      if (filters.resource !== 'all') params.append('resource', filters.resource);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('limit', '500');

      const res = await fetch(`/api/security/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      const data = await res.json();
      setLogs(data);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load audit logs. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const parseDetails = (details: string | null): Record<string, any> => {
    if (!details) return {};
    try {
      return JSON.parse(details);
    } catch {
      return {};
    }
  };

  const getActionBadge = (action: string) => {
    const colorMap: Record<string, string> = {
      'user_created': 'bg-green-100 text-green-700 border-green-200',
      'user_deleted': 'bg-red-100 text-red-700 border-red-200',
      'user_role_changed': 'bg-orange-100 text-orange-700 border-orange-200',
      'user_updated': 'bg-blue-100 text-blue-700 border-blue-200',
      'pricing_updated': 'bg-purple-100 text-purple-700 border-purple-200',
      'product_deleted': 'bg-red-100 text-red-700 border-red-200',
      'customer_deleted': 'bg-red-100 text-red-700 border-red-200',
      'document_deleted': 'bg-red-100 text-red-700 border-red-200',
      'workflow_rule_created': 'bg-green-100 text-green-700 border-green-200',
      'workflow_rule_updated': 'bg-blue-100 text-blue-700 border-blue-200',
      'workflow_rule_deleted': 'bg-red-100 text-red-700 border-red-200',
      'approval_requested': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'approval_approved': 'bg-green-100 text-green-700 border-green-200',
      'approval_rejected': 'bg-red-100 text-red-700 border-red-200',
    };

    const colorClass = colorMap[action] || 'bg-gray-100 text-gray-700 border-gray-200';
    return (
      <Badge variant="outline" className={colorClass}>
        {action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
      </Badge>
    );
  };

  const handleExport = () => {
    // Convert logs to CSV format
    const headers = ['Timestamp', 'User', 'Action', 'Resource', 'Resource ID', 'Details', 'IP Address'];
    const rows = logs.map((log) => {
      const details = parseDetails(log.details);
      return [
        format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
        log.user?.email || 'System',
        log.action,
        log.resource,
        log.resourceId || '',
        JSON.stringify(details),
        log.ipAddress || '',
      ];
    });

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get unique actions and resources for filter dropdowns
  const uniqueActions = Array.from(new Set(logs.map((log) => log.action)));
  const uniqueResources = Array.from(new Set(logs.map((log) => log.resource)));

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Audit Logs</h1>
        <p className="text-muted-foreground">
          View system-wide audit trail of all critical actions and changes
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>
                Immutable log of all system activities and changes
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Select value={filters.action} onValueChange={(value) => setFilters({ ...filters, action: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.resource} onValueChange={(value) => setFilters({ ...filters, resource: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                {uniqueResources.map((resource) => (
                  <SelectItem key={resource} value={resource}>
                    {resource.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="Start Date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />

            <Input
              type="date"
              placeholder="End Date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p className="font-medium">No audit logs found</p>
              <p className="text-sm mt-2">No audit entries match the current filters.</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Resource ID</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const details = parseDetails(log.details);
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">
                          {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          {log.user ? (
                            <div>
                              <div className="text-sm">{log.user.name || log.user.email}</div>
                              {log.user.name && (
                                <div className="text-xs text-muted-foreground">{log.user.email}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">System</span>
                          )}
                        </TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell>
                          <span className="text-sm capitalize">{log.resource}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs">{log.resourceId || '—'}</span>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-md">
                            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                              {JSON.stringify(details, null, 2)}
                            </pre>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs">{log.ipAddress || '—'}</span>
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

