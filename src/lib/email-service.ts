/**
 * Email Service
 * 
 * Foundation for sending email notifications for critical security alerts.
 * 
 * To enable email notifications, configure one of the following:
 * 
 * 1. SMTP (Simple Mail Transfer Protocol)
 *    Set environment variables:
 *    - EMAIL_SMTP_HOST
 *    - EMAIL_SMTP_PORT
 *    - EMAIL_SMTP_USER
 *    - EMAIL_SMTP_PASSWORD
 *    - EMAIL_FROM_ADDRESS
 * 
 * 2. SendGrid API
 *    Set environment variables:
 *    - SENDGRID_API_KEY
 *    - EMAIL_FROM_ADDRESS
 * 
 * 3. AWS SES (Simple Email Service)
 *    Set environment variables:
 *    - AWS_SES_REGION
 *    - AWS_ACCESS_KEY_ID
 *    - AWS_SECRET_ACCESS_KEY
 *    - EMAIL_FROM_ADDRESS
 */

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

/**
 * Check if email service is configured
 */
export function isEmailServiceConfigured(): boolean {
  return !!(
    process.env.EMAIL_SMTP_HOST ||
    process.env.SENDGRID_API_KEY ||
    (process.env.AWS_SES_REGION && process.env.AWS_ACCESS_KEY_ID)
  );
}

/**
 * Send email notification (placeholder implementation)
 * 
 * TODO: Integrate with actual email service (SendGrid, SES, SMTP, etc.)
 * 
 * This is a foundation that can be extended with actual email service integration.
 * For now, it logs the email to console in development and can be extended
 * to send actual emails in production.
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const from = process.env.EMAIL_FROM_ADDRESS || 'noreply@shreenathjirasayan.com';
  const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to;

  // In development, log email instead of sending
  if (process.env.NODE_ENV === 'development' || !isEmailServiceConfigured()) {
    console.log('📧 Email Notification (would send):', {
      from,
      to: recipients,
      subject: options.subject,
      body: options.text || options.html,
    });
    return;
  }

  // TODO: Implement actual email sending based on configured service
  // Example implementations:

  // SendGrid:
  // if (process.env.SENDGRID_API_KEY) {
  //   const sgMail = require('@sendgrid/mail');
  //   sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  //   await sgMail.send({
  //     from,
  //     to: options.to,
  //     subject: options.subject,
  //     html: options.html,
  //     text: options.text,
  //   });
  //   return;
  // }

  // AWS SES:
  // if (process.env.AWS_SES_REGION) {
  //   const AWS = require('aws-sdk');
  //   const ses = new AWS.SES({ region: process.env.AWS_SES_REGION });
  //   await ses.sendEmail({
  //     Source: from,
  //     Destination: { ToAddresses: Array.isArray(options.to) ? options.to : [options.to] },
  //     Message: {
  //       Subject: { Data: options.subject },
  //       Body: { Html: { Data: options.html }, Text: { Data: options.text || options.html } },
  //     },
  //   }).promise();
  //   return;
  // }

  // SMTP:
  // if (process.env.EMAIL_SMTP_HOST) {
  //   const nodemailer = require('nodemailer');
  //   const transporter = nodemailer.createTransport({
  //     host: process.env.EMAIL_SMTP_HOST,
  //     port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
  //     secure: process.env.EMAIL_SMTP_PORT === '465',
  //     auth: {
  //       user: process.env.EMAIL_SMTP_USER,
  //       pass: process.env.EMAIL_SMTP_PASSWORD,
  //     },
  //   });
  //   await transporter.sendMail({
  //     from,
  //     to: recipients,
  //     subject: options.subject,
  //     html: options.html,
  //     text: options.text,
  //   });
  //   return;
  // }

  console.warn('Email service not configured. Email notification logged but not sent.');
}

/**
 * Generate HTML email template for security alerts
 */
export function generateSecurityAlertEmail(alert: {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description?: string | null;
  resource?: string | null;
  createdAt: Date;
  alertUrl?: string;
}): string {
  const severityColors = {
    low: '#10b981', // green
    medium: '#f59e0b', // yellow
    high: '#ef4444', // red
    critical: '#dc2626', // dark red
  };

  const color = severityColors[alert.severity];
  const alertUrl = alert.alertUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/security/alerts`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Security Alert: ${alert.title}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="border-left: 4px solid ${color}; padding-left: 20px; margin-bottom: 30px;">
        <h1 style="color: ${color}; margin-top: 0;">Security Alert</h1>
        <p style="font-size: 14px; color: #666; margin: 5px 0;">
          <strong>Severity:</strong> <span style="text-transform: uppercase; color: ${color};">${alert.severity}</span>
        </p>
        <p style="font-size: 14px; color: #666; margin: 5px 0;">
          <strong>Type:</strong> ${alert.type.replace(/_/g, ' ')}
        </p>
        <p style="font-size: 14px; color: #666; margin: 5px 0;">
          <strong>Time:</strong> ${alert.createdAt.toLocaleString()}
        </p>
      </div>
      
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 5px; margin-bottom: 30px;">
        <h2 style="margin-top: 0; color: #111;">${alert.title}</h2>
        ${alert.description ? `<p>${alert.description}</p>` : ''}
        ${alert.resource ? `<p style="margin-top: 15px;"><strong>Resource:</strong> ${alert.resource}</p>` : ''}
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${alertUrl}" 
           style="display: inline-block; background-color: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          View Alert in Dashboard
        </a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      <p style="font-size: 12px; color: #6b7280; text-align: center;">
        This is an automated security alert from Shreenathji ERP+CRM System.<br>
        Please review this alert in the security dashboard.
      </p>
    </body>
    </html>
  `;
}

/**
 * Send security alert email notification
 */
export async function sendSecurityAlertEmail(
  alert: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description?: string | null;
    resource?: string | null;
    createdAt: Date;
    alertId?: string;
  },
  recipientEmails: string[]
): Promise<void> {
  if (recipientEmails.length === 0) {
    return;
  }

  const alertUrl = alert.alertId
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/security/alerts`
    : undefined;

  const html = generateSecurityAlertEmail({ ...alert, alertUrl });
  const text = `${alert.title}\n\n${alert.description || ''}\n\nSeverity: ${alert.severity.toUpperCase()}\nType: ${alert.type}\nTime: ${alert.createdAt.toLocaleString()}`;

  await sendEmail({
    to: recipientEmails,
    subject: `[${alert.severity.toUpperCase()}] Security Alert: ${alert.title}`,
    html,
    text,
  });
}

