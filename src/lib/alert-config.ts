/**
 * Alert Configuration
 * 
 * Configurable thresholds for security alerts.
 * Values can be set via environment variables with sensible defaults.
 */

export interface AlertThresholds {
  bulkOperationCount: number; // Threshold for bulk operation alerts (default: 50)
  bulkOperationHighSeverity: number; // Threshold for high severity bulk operations (default: 100)
  failedLoginMedium: number; // Failed login attempts for medium severity (default: 3)
  failedLoginHigh: number; // Failed login attempts for high severity (default: 5)
  pricingOverrideMedium: number; // Price change percentage for medium severity (default: 20%)
  pricingOverrideHigh: number; // Price change percentage for high severity (default: 50%)
}

/**
 * Get alert thresholds from environment variables or use defaults
 */
export function getAlertThresholds(): AlertThresholds {
  return {
    bulkOperationCount: parseInt(
      process.env.ALERT_BULK_OPERATION_THRESHOLD || '50',
      10
    ),
    bulkOperationHighSeverity: parseInt(
      process.env.ALERT_BULK_OPERATION_HIGH_THRESHOLD || '100',
      10
    ),
    failedLoginMedium: parseInt(
      process.env.ALERT_FAILED_LOGIN_MEDIUM || '3',
      10
    ),
    failedLoginHigh: parseInt(
      process.env.ALERT_FAILED_LOGIN_HIGH || '5',
      10
    ),
    pricingOverrideMedium: parseInt(
      process.env.ALERT_PRICING_OVERRIDE_MEDIUM || '20',
      10
    ),
    pricingOverrideHigh: parseInt(
      process.env.ALERT_PRICING_OVERRIDE_HIGH || '50',
      10
    ),
  };
}

/**
 * Get threshold value by key (for dynamic access)
 */
export function getThreshold(key: keyof AlertThresholds): number {
  const thresholds = getAlertThresholds();
  return thresholds[key];
}

