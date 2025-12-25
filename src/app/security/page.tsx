'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, AlertTriangle, Activity } from 'lucide-react';
import { LoginActivityTable } from '@/components/security/login-activity-table';

interface SecurityStats {
  period: string;
  totalLogins: number;
  failedLogins: number;
  successRate: string;
  lockedAccounts: number;
  suspiciousActivity: number;
  timestamp: string;
}

const PERIOD_OPTIONS = [
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 30 days', value: '30' },
  { label: 'Last 90 days', value: '90' },
];

export default function SecurityOverviewPage() {
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [days, setDays] = useState<string>('7');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async (daysValue: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/security/stats?days=${daysValue}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to load security stats (status ${res.status})`);
      }
      const data = (await res.json()) as SecurityStats;
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch security stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch security stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePeriodChange = (value: string) => {
    setDays(value);
    loadStats(value);
  };

  const successRateNumber = stats ? Number(stats.successRate) || 0 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Security Overview</h1>
          <p className="text-muted-foreground">
            High-level security metrics for your ERP/CRM. Only admins can view this page.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={days} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {stats && (
            <Badge variant="outline" className="text-xs">
              Updated:{' '}
              {new Date(stats.timestamp).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </Badge>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && !stats ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="card-enhanced">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Logins</CardTitle>
              <Shield className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {stats ? stats.totalLogins.toLocaleString('en-IN') : '--'}
              </div>
              <p className="text-xs text-muted-foreground">
                Successful authentication attempts in the selected period.
              </p>
            </CardContent>
          </Card>

          <Card className="card-enhanced">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">
                {stats ? stats.failedLogins.toLocaleString('en-IN') : '--'}
              </div>
              <p className="text-xs text-muted-foreground">
                Invalid credential attempts. Sudden spikes may indicate attacks.
              </p>
            </CardContent>
          </Card>

          <Card className="card-enhanced">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Login Success Rate</CardTitle>
              <Activity className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {stats ? `${successRateNumber.toFixed(1)}%` : '--'}
              </div>
              <p className="text-xs text-muted-foreground">
                {(successRateNumber || 0) < 80
                  ? 'Low success rate – investigate failed logins and potential attacks.'
                  : 'Healthy success rate – continue monitoring for anomalies.'}
              </p>
            </CardContent>
          </Card>

          <Card className="card-enhanced">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Locked Accounts</CardTitle>
              <Shield className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {stats ? stats.lockedAccounts.toLocaleString('en-IN') : '--'}
              </div>
              <p className="text-xs text-muted-foreground">
                Accounts currently locked due to repeated failed login attempts.
              </p>
            </CardContent>
          </Card>

          <Card className="card-enhanced">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suspicious Activity</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {stats ? stats.suspiciousActivity.toLocaleString('en-IN') : '--'}
              </div>
              <p className="text-xs text-muted-foreground">
                Count of unauthorized access events detected in audit logs.
              </p>
            </CardContent>
          </Card>

          <Card className="card-enhanced">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Summary</CardTitle>
              <CardDescription>
                {stats ? `Based on activity in the last ${stats.period}.` : 'No data available yet.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>
                  Authentication is{' '}
                  <span className="font-semibold">
                    {successRateNumber >= 95
                      ? 'very stable'
                      : successRateNumber >= 85
                      ? 'stable'
                      : 'potentially at risk'}
                  </span>
                  .
                </li>
                <li>
                  {stats && stats.lockedAccounts > 0
                    ? 'Some accounts are locked – review and assist affected users.'
                    : 'No accounts are currently locked.'}
                </li>
                <li>
                  {stats && stats.suspiciousActivity > 0
                    ? 'Suspicious activity detected – review audit logs for details.'
                    : 'No suspicious activity recorded in the selected period.'}
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Security Alerts Section */}
      <div className="mt-8">
        <SecurityAlertsSection days={days} />
      </div>

      {/* Login Activity Table */}
      <div className="mt-8">
        <LoginActivityTable />
      </div>
    </div>
  );
}

interface SecurityAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  userId: string | null;
  user: { id: string; email: string; name: string | null } | null;
  ipAddress: string | null;
  timestamp: string;
  details: any;
}

function SecurityAlertsSection({ days }: { days: string }) {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/security/alerts?days=${days}`);
        if (!res.ok) throw new Error('Failed to fetch alerts');
        const data = await res.json();
        setAlerts(data);
      } catch (error) {
        console.error('Failed to fetch security alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    // Refresh alerts every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [days]);

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const highAlerts = alerts.filter(a => a.severity === 'high');
  const mediumAlerts = alerts.filter(a => a.severity === 'medium');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Security Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Security Alerts
        </CardTitle>
        <CardDescription>
          Recent security events and suspicious activity detected in the last {days} days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p className="font-medium">No security alerts</p>
            <p className="text-sm">No suspicious activity detected in the selected period.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {criticalAlerts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-red-600 mb-2">
                  Critical Alerts ({criticalAlerts.length})
                </h3>
                <div className="space-y-2">
                  {criticalAlerts.slice(0, 5).map((alert) => (
                    <Alert key={alert.id} variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{alert.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {alert.ipAddress && `IP: ${alert.ipAddress}`}
                              {alert.user && ` • User: ${alert.user.email}`}
                              {` • ${new Date(alert.timestamp).toLocaleString()}`}
                            </p>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}

            {highAlerts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-orange-600 mb-2">
                  High Priority Alerts ({highAlerts.length})
                </h3>
                <div className="space-y-2">
                  {highAlerts.slice(0, 5).map((alert) => (
                    <Alert key={alert.id} className="border-orange-500">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <AlertDescription>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{alert.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {alert.ipAddress && `IP: ${alert.ipAddress}`}
                              {alert.user && ` • User: ${alert.user.email}`}
                              {` • ${new Date(alert.timestamp).toLocaleString()}`}
                            </p>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}

            {mediumAlerts.length > 0 && criticalAlerts.length === 0 && highAlerts.length === 0 && (
              <div className="space-y-2">
                {mediumAlerts.slice(0, 10).map((alert) => (
                  <Alert key={alert.id} className="border-yellow-500">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <AlertDescription>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {alert.ipAddress && `IP: ${alert.ipAddress}`}
                            {alert.user && ` • User: ${alert.user.email}`}
                            {` • ${new Date(alert.timestamp).toLocaleString()}`}
                          </p>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {alerts.length > 10 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                Showing {Math.min(10, alerts.length)} of {alerts.length} alerts. 
                Review audit logs for complete history.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}



