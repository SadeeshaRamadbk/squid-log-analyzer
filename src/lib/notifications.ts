import { getSystemSettings, SystemSettings } from './settings';
import { sendSmtpEmail } from './smtp';
import type { SecurityAlert } from './alerts';

const SEVERITY_LEVELS: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function meetsSeverityThreshold(severity: string, minSeverity: string): boolean {
  const alertRank = SEVERITY_LEVELS[severity.toLowerCase()] || 1;
  const minRank = SEVERITY_LEVELS[minSeverity.toLowerCase()] || 3;
  return alertRank >= minRank;
}

/**
 * Dispatch an alert to configured email (SMTP) and/or webhook endpoints based on severity routing
 */
export async function dispatchAlertNotification(
  alert: SecurityAlert,
  customSettings?: SystemSettings
): Promise<{ emailSent: boolean; webhookSent: boolean; error?: string }> {
  const settings = customSettings || getSystemSettings();
  let emailSent = false;
  let webhookSent = false;
  const errors: string[] = [];

  // 1. Email via SMTP
  if (settings.smtpEnabled && meetsSeverityThreshold(alert.severity, settings.minSeverityForEmail)) {
    try {
      const subject = `[${alert.severity.toUpperCase()} ALERT] ${alert.title}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: ${alert.severity === 'critical' ? '#dc2626' : alert.severity === 'high' ? '#ea580c' : '#2563eb'}; margin-top: 0;">
            ${alert.title}
          </h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 120px;"><strong>Severity:</strong></td>
              <td style="padding: 6px 0; text-transform: uppercase; font-weight: bold;">${alert.severity}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Source Host:</strong></td>
              <td style="padding: 6px 0;">${alert.employeeName ? `${alert.employeeName} (${alert.sourceIp})` : (alert.sourceIp || 'N/A')}</td>
            </tr>
            ${alert.target ? `<tr><td style="padding: 6px 0; color: #64748b;"><strong>Target:</strong></td><td style="padding: 6px 0;">${alert.target}</td></tr>` : ''}
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Occurrences:</strong></td>
              <td style="padding: 6px 0;">${alert.occurrenceCount || 1}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Timestamp:</strong></td>
              <td style="padding: 6px 0;">${new Date(alert.timestamp).toISOString()}</td>
            </tr>
          </table>
          <div style="background-color: #f8fafc; padding: 12px; border-radius: 6px; font-size: 14px; color: #334155; line-height: 1.5;">
            ${alert.description}
          </div>
          <p style="font-size: 11px; color: #94a3b8; margin-top: 20px;">
            Sent by Nippon BPO Squid & NetFlow Security Analyzer
          </p>
        </div>
      `;

      await sendSmtpEmail({
        host: settings.smtpHost,
        port: Number(settings.smtpPort),
        secure: Boolean(settings.smtpSecure),
        user: settings.smtpUser,
        pass: settings.smtpPass,
        from: settings.smtpFrom,
        to: settings.smtpTo,
        subject,
        text: `${alert.title}\nSeverity: ${alert.severity}\nSource: ${alert.employeeName || alert.sourceIp}\nDescription: ${alert.description}`,
        html,
      });
      emailSent = true;
    } catch (err: any) {
      errors.push(`Email: ${err.message}`);
      console.warn('[Notification] Failed to send email alert:', err);
    }
  }

  // 2. Generic Webhook (Slack, Discord, Teams, or Custom SIEM)
  if (settings.webhookEnabled && settings.webhookUrl && meetsSeverityThreshold(alert.severity, settings.minSeverityForWebhook)) {
    try {
      const payload = {
        event: 'security_alert',
        id: alert.id,
        timestamp: new Date(alert.timestamp).toISOString(),
        severity: alert.severity,
        type: alert.type,
        title: alert.title,
        description: alert.description,
        sourceIp: alert.sourceIp,
        employeeName: alert.employeeName,
        target: alert.target,
        occurrenceCount: alert.occurrenceCount || 1,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (settings.webhookSecret) {
        headers['X-Alert-Secret'] = settings.webhookSecret;
      }

      const res = await fetch(settings.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        throw new Error(`Webhook returned HTTP ${res.status}`);
      }
      webhookSent = true;
    } catch (err: any) {
      errors.push(`Webhook: ${err.message}`);
      console.warn('[Notification] Failed to deliver webhook alert:', err);
    }
  }

  return {
    emailSent,
    webhookSent,
    error: errors.length > 0 ? errors.join('; ') : undefined,
  };
}

/**
 * Send test notification to verify SMTP or Webhook configuration
 */
export async function sendTestNotification(
  channel: 'smtp' | 'webhook',
  settings: SystemSettings
): Promise<{ success: boolean; message: string }> {
  const dummyAlert: SecurityAlert = {
    id: 999999,
    timestamp: Date.now(),
    type: 'blocked_spike',
    severity: 'high',
    title: 'Test Security Notification',
    description: 'This is a test notification from Nippon BPO Squid Log Analyzer confirming alert dispatch channel functionality.',
    sourceIp: '192.168.0.254',
    employeeName: 'Security Admin Test Host',
    target: 'test-endpoint.internal',
    status: 'active',
    occurrenceCount: 1,
  };

  if (channel === 'smtp') {
    if (!settings.smtpHost || !settings.smtpTo || !settings.smtpFrom) {
      return { success: false, message: 'SMTP Host, Sender (From), and Recipient (To) are required.' };
    }
    try {
      await sendSmtpEmail({
        host: settings.smtpHost,
        port: Number(settings.smtpPort),
        secure: Boolean(settings.smtpSecure),
        user: settings.smtpUser,
        pass: settings.smtpPass,
        from: settings.smtpFrom,
        to: settings.smtpTo,
        subject: `[TEST ALERT] Nippon BPO Analyzer Notification Test`,
        text: `This is a test email notification from Nippon BPO Squid & NetFlow Security Analyzer confirming your SMTP configuration.`,
      });
      return { success: true, message: `Test email successfully dispatched to ${settings.smtpTo}` };
    } catch (err: any) {
      return { success: false, message: `SMTP Error: ${err.message}` };
    }
  } else {
    if (!settings.webhookUrl) {
      return { success: false, message: 'Webhook Destination URL is required.' };
    }
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (settings.webhookSecret) headers['X-Alert-Secret'] = settings.webhookSecret;

      const res = await fetch(settings.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event: 'test_notification',
          timestamp: new Date().toISOString(),
          message: 'Test notification from Nippon BPO Squid Log Analyzer',
          alert: dummyAlert,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) throw new Error(`Destination server responded with HTTP ${res.status}`);
      return { success: true, message: `Webhook test succeeded (HTTP ${res.status})` };
    } catch (err: any) {
      return { success: false, message: `Webhook Error: ${err.message}` };
    }
  }
}
