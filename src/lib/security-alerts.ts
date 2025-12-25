import type { PrismaClient } from '@prisma/client';
import { getAlertThresholds } from './alert-config';
import { sendSecurityAlertEmail, isEmailServiceConfigured } from './email-service';

export type AlertType =
  | 'new_login_location'
  | 'failed_login'
  | 'bulk_operation'
  | 'pricing_override'
  | 'suspicious_activity'
  | 'document_deletion'
  | 'approval_bypassed'
  | 'unusual_access_pattern';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityAlertData {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description?: string;
  userId?: string | null;
  resource?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Create a security alert
 */
export async function createSecurityAlert(
  prisma: PrismaClient,
  alert: SecurityAlertData
): Promise<void> {
  try {
    const createdAlert = await prisma.securityAlert.create({
      data: {
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        description: alert.description || null,
        userId: alert.userId || null,
        resource: alert.resource || null,
        resourceId: alert.resourceId || null,
        metadata: alert.metadata ? JSON.stringify(alert.metadata) : null,
        acknowledged: false,
        createdAt: new Date(),
      },
    });

    // Send email notification for high and critical alerts
    if ((alert.severity === 'high' || alert.severity === 'critical') && isEmailServiceConfigured()) {
      try {
        // Get admin users to notify (non-blocking)
        const adminUsers = await prisma.user.findMany({
          where: { role: 'admin' },
          select: { email: true },
        });

        if (adminUsers.length > 0) {
          const adminEmails = adminUsers.map(u => u.email).filter(Boolean) as string[];
          
          // Send email asynchronously (don't block alert creation)
          sendSecurityAlertEmail(
            {
              type: alert.type,
              severity: alert.severity,
              title: alert.title,
              description: alert.description || undefined,
              resource: alert.resource || undefined,
              createdAt: createdAlert.createdAt,
              alertId: createdAlert.id,
            },
            adminEmails
          ).catch((err: unknown) => {
            console.error('Failed to send security alert email:', err);
          });
        }
      } catch (emailError) {
        // Don't fail alert creation if email fails
        console.error('Failed to send security alert email notification:', emailError);
      }
    }
  } catch (error) {
    // Best-effort alerting - don't block main workflow
    console.error('Failed to create security alert:', {
      error,
      alert,
    });
  }
}

/**
 * Detect if login is from a new location/device
 */
export async function detectNewLoginLocation(
  prisma: PrismaClient,
  userId: string,
  ipAddress: string | null,
  country: string | null,
  city: string | null
): Promise<boolean> {
  // Check if user has previous sessions with same IP/country
  const existingSessions = await prisma.session.findFirst({
    where: {
      userId,
      OR: [
        ipAddress ? { ipAddress } : {},
        country ? { country } : {},
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  // If no previous sessions with this IP/country, it's a new location
  return !existingSessions;
}

/**
 * Create alert for new login location
 */
export async function alertNewLoginLocation(
  prisma: PrismaClient,
  userId: string,
  ipAddress: string | null,
  country: string | null,
  city: string | null,
  device: string | null,
  browser: string | null
): Promise<void> {
  const isNew = await detectNewLoginLocation(prisma, userId, ipAddress, country, city);
  
  if (isNew) {
    await createSecurityAlert(prisma, {
      type: 'new_login_location',
      severity: 'medium',
      title: 'Login from new location',
      description: `User logged in from ${city ? `${city}, ` : ''}${country || 'unknown location'}`,
      userId,
      metadata: {
        ipAddress,
        country,
        city,
        device,
        browser,
      },
    });
  }
}

/**
 * Create alert for failed login attempts
 */
export async function alertFailedLogin(
  prisma: PrismaClient,
  email: string,
  ipAddress: string | null,
  attemptCount: number
): Promise<void> {
  const thresholds = getAlertThresholds();
  const severity: AlertSeverity = 
    attemptCount >= thresholds.failedLoginHigh ? 'high' : 
    attemptCount >= thresholds.failedLoginMedium ? 'medium' : 
    'low';
  
  await createSecurityAlert(prisma, {
    type: 'failed_login',
    severity,
    title: `Failed login attempt${attemptCount > 1 ? 's' : ''} - ${email}`,
    description: `${attemptCount} failed login attempt${attemptCount > 1 ? 's' : ''} detected`,
    metadata: {
      email,
      ipAddress,
      attemptCount,
    },
  });
}

/**
 * Create alert for bulk operations
 */
export async function alertBulkOperation(
  prisma: PrismaClient,
  userId: string,
  resource: string,
  action: string,
  count: number,
  ipAddress?: string | null
): Promise<void> {
  const thresholds = getAlertThresholds();
  if (count > thresholds.bulkOperationCount) {
    // Only alert on large bulk operations
    await createSecurityAlert(prisma, {
      type: 'bulk_operation',
      severity: count > thresholds.bulkOperationHighSeverity ? 'high' : 'medium',
      title: `Large bulk ${action} operation on ${resource}`,
      description: `${count} ${resource} records ${action}ed in single operation`,
      userId,
      resource,
      metadata: {
        action,
        count,
        ipAddress,
      },
    });
  }
}

/**
 * Create alert for pricing overrides
 */
export async function alertPricingOverride(
  prisma: PrismaClient,
  userId: string,
  resource: string,
  resourceId: string,
  originalPrice: number,
  newPrice: number,
  overridePercentage: number
): Promise<void> {
  const thresholds = getAlertThresholds();
  const severity: AlertSeverity = 
    overridePercentage > thresholds.pricingOverrideHigh ? 'high' : 
    overridePercentage > thresholds.pricingOverrideMedium ? 'medium' : 
    'low';
  
  await createSecurityAlert(prisma, {
    type: 'pricing_override',
    severity,
    title: `Pricing override detected: ${Math.abs(overridePercentage).toFixed(1)}% change`,
    description: `Price changed from ${originalPrice} to ${newPrice} (${overridePercentage > 0 ? '+' : ''}${overridePercentage.toFixed(1)}%)`,
    userId,
    resource,
    resourceId,
    metadata: {
      originalPrice,
      newPrice,
      overridePercentage,
    },
  });
}

