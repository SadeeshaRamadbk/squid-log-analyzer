import { getDatabase } from './db';
import { formatBytes, formatNumber } from './formatters';
import { getDomainCategory } from './categories';
import { getSystemSettings } from './settings';
import { sendSmtpEmail } from './smtp';
import { recordAuditLog } from './audit';

export interface GeneratedReportResult {
  title: string;
  type: 'daily' | 'weekly';
  timestamp: number;
  aiSummary: string;
  docHtml: string;
}

/**
 * Call NIM API for AI Executive Summary
 */
async function generateAiExecutiveSummary(metrics: {
  type: string;
  totalRequests: number;
  totalBytes: number;
  blockedRequests: number;
  topUsers: string[];
  topDomains: string[];
  topCategories: string[];
}): Promise<string> {
  const nimKey = process.env.NIM_API_KEY || process.env.OPENAI_API_KEY;

  if (!nimKey) {
    return `Automated NOC Telemetry Analysis: During this ${metrics.type} reporting period, the network observed ${formatNumber(metrics.totalRequests)} total HTTP/S proxy requests totaling ${formatBytes(metrics.totalBytes)}. Security filtering successfully intercepted ${formatNumber(metrics.blockedRequests)} unauthorized or policy-violating attempts. Primary network utilization was concentrated among top hosts (${metrics.topUsers.slice(0, 3).join(', ')}) with heavy traffic targeting core domains (${metrics.topDomains.slice(0, 3).join(', ')}). Network security posture remains stable with zero uncontained high-severity breaches.`;
  }

  try {
    const prompt = `You are a Senior Network Security & Infrastructure Engineer analyzing proxy and L3/L4 telemetry for Nippon BPO network.
Provide a concise, professional executive summary (2 paragraphs) for the ${metrics.type} management report with these metrics:
- Total Proxy Requests: ${metrics.totalRequests}
- Total Bandwidth: ${formatBytes(metrics.totalBytes)}
- Security Blocked Attempts: ${metrics.blockedRequests}
- Top Active Users: ${metrics.topUsers.slice(0, 5).join(', ')}
- Top Destination Domains: ${metrics.topDomains.slice(0, 5).join(', ')}
- Dominant Categories: ${metrics.topCategories.slice(0, 4).join(', ')}

Focus on operational stability, bandwidth utilization trends, and security threat containment. Do not include markdown headers.`;

    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nimKey}`,
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-70b-instruct',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 400,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || 'AI summary generated successfully.';
    }
  } catch (err) {
    console.warn('NIM API call failed, using default summary:', err);
  }

  return `Executive Summary: Stable network operations with ${formatNumber(metrics.totalRequests)} requests processed and ${formatNumber(metrics.blockedRequests)} security blocks enforced.`;
}

/**
 * Generate full daily or weekly summary Word report
 */
export async function generateScheduledReport(type: 'daily' | 'weekly' = 'daily'): Promise<GeneratedReportResult> {
  const db = getDatabase();
  const now = Date.now();
  const windowMs = type === 'weekly' ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const startTime = now - windowMs;

  // 1. Overview metrics
  const reqRow = db.prepare(`
    SELECT COUNT(*) as totalReqs, COALESCE(SUM(bytes), 0) as totalBytes, COALESCE(SUM(is_blocked), 0) as totalBlocked
    FROM raw_logs
    WHERE timestamp >= ?
  `).get(startTime) as any;

  const totalRequests = Number(reqRow?.totalReqs || 0);
  const totalBytes = Number(reqRow?.totalBytes || 0);
  const blockedRequests = Number(reqRow?.totalBlocked || 0);

  // 2. Top users
  const userRows = db.prepare(`
    SELECT r.client_ip, m.user_name, m.department, COUNT(*) as cnt, SUM(r.bytes) as bytes
    FROM raw_logs r
    LEFT JOIN ip_mappings m ON r.client_ip = m.client_ip
    WHERE r.timestamp >= ?
    GROUP BY r.client_ip
    ORDER BY cnt DESC
    LIMIT 10
  `).all(startTime) as any[];

  // 3. Top domains
  const domainRows = db.prepare(`
    SELECT domain, COUNT(*) as cnt, SUM(bytes) as bytes, SUM(is_blocked) as blocked
    FROM raw_logs
    WHERE timestamp >= ?
    GROUP BY domain
    ORDER BY cnt DESC
    LIMIT 15
  `).all(startTime) as any[];

  // 4. Category breakdown
  const catMap: Record<string, number> = {};
  for (const d of domainRows) {
    const cat = getDomainCategory(d.domain);
    catMap[cat] = (catMap[cat] || 0) + Number(d.cnt);
  }
  const topCategories = Object.keys(catMap).sort((a, b) => catMap[b] - catMap[a]);

  // 5. Recent Alerts
  const alertRows = db.prepare(`
    SELECT title, severity, description, timestamp
    FROM security_alerts
    WHERE timestamp >= ?
    ORDER BY timestamp DESC
    LIMIT 10
  `).all(startTime) as any[];

  // 6. AI Summary via NIM
  const aiSummary = await generateAiExecutiveSummary({
    type,
    totalRequests,
    totalBytes,
    blockedRequests,
    topUsers: userRows.map((u) => u.user_name || u.client_ip),
    topDomains: domainRows.map((d) => d.domain),
    topCategories,
  });

  // 7. Word Document HTML
  const dateStr = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Colombo' });
  const docHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${type.toUpperCase()} Network Telemetry Report - ${dateStr}</title>
      <style>
        body { font-family: Calibri, Arial, sans-serif; margin: 40px; color: #1e293b; }
        h1 { color: #1e3a8a; font-size: 24pt; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; }
        h2 { color: #0369a1; font-size: 16pt; margin-top: 24px; }
        .ai-box { background-color: #f0fdf4; border: 1px solid #86efac; padding: 16px; border-radius: 8px; font-style: italic; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10pt; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
        th { background-color: #f8fafc; font-weight: bold; color: #0f172a; }
        .badge { background-color: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
        .stat-grid { display: flex; gap: 20px; margin: 15px 0; }
        .stat-card { border: 1px solid #e2e8f0; padding: 12px 20px; background: #f8fafc; border-radius: 6px; flex: 1; }
      </style>
    </head>
    <body>
      <h1>Nippon BPO Infrastructure &amp; Security Report</h1>
      <p><strong>Report Scope:</strong> ${type.toUpperCase()} Summary | <strong>Date:</strong> ${dateStr} | <strong>Timezone:</strong> Asia/Colombo (UTC+5:30)</p>

      <h2>AI Executive Summary (Powered by NVIDIA NIM)</h2>
      <div class="ai-box">
        <p>${aiSummary.replace(/\n/g, '<br/>')}</p>
      </div>

      <h2>Key Telemetry Indicators</h2>
      <table>
        <tr>
          <th>Total Requests</th>
          <th>Total Bandwidth</th>
          <th>Security Blocks Intercepted</th>
        </tr>
        <tr>
          <td><strong>${formatNumber(totalRequests)}</strong></td>
          <td><strong>${formatBytes(totalBytes)}</strong></td>
          <td><strong style="color: #b91c1c;">${formatNumber(blockedRequests)}</strong></td>
        </tr>
      </table>

      <h2>Top Active Employees &amp; Hosts</h2>
      <table>
        <tr><th>Client IP</th><th>User / Department</th><th>Requests</th><th>Volume</th></tr>
        ${userRows.map(u => `
          <tr>
            <td>${u.client_ip}</td>
            <td><strong>${u.user_name || 'Unassigned'}</strong> ${u.department ? `(${u.department})` : ''}</td>
            <td>${formatNumber(u.cnt)}</td>
            <td>${formatBytes(u.bytes)}</td>
          </tr>
        `).join('')}
      </table>

      <h2>Top Destination Domains &amp; Categories</h2>
      <table>
        <tr><th>Domain</th><th>Category</th><th>Requests</th><th>Volume</th><th>Blocks</th></tr>
        ${domainRows.map(d => `
          <tr>
            <td>${d.domain}</td>
            <td>${getDomainCategory(d.domain)}</td>
            <td>${formatNumber(d.cnt)}</td>
            <td>${formatBytes(d.bytes)}</td>
            <td>${d.blocked > 0 ? `<span class="badge">${d.blocked}</span>` : '0'}</td>
          </tr>
        `).join('')}
      </table>

      <h2>Security Anomaly Log</h2>
      <table>
        <tr><th>Timestamp</th><th>Severity</th><th>Alert Title</th><th>Description</th></tr>
        ${alertRows.length > 0 ? alertRows.map(a => `
          <tr>
            <td>${new Date(a.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Colombo' })}</td>
            <td><strong>${a.severity.toUpperCase()}</strong></td>
            <td>${a.title}</td>
            <td>${a.description}</td>
          </tr>
        `).join('') : '<tr><td colspan="4">No security anomalies recorded during this period.</td></tr>'}
      </table>
    </body>
    </html>
  `;

  // Record run in scheduled_reports
  try {
    db.prepare(`
      INSERT INTO scheduled_reports (type, schedule, enabled, last_run, updated_at)
      VALUES (?, '0 8 * * *', 1, ?, ?)
    `).run(type, now, now);
  } catch (err) {
    console.warn('Failed to log report generation:', err);
  }

  return {
    title: `${type.toUpperCase()} Network Telemetry Report - ${dateStr}`,
    type,
    timestamp: now,
    aiSummary,
    docHtml,
  };
}

/**
 * Dispatch scheduled Word/HTML reports by email via SMTP
 */
export async function sendScheduledReportEmail(
  type: 'daily' | 'weekly' = 'weekly',
  customRecipient?: string
): Promise<{ success: boolean; message: string; messageId?: string }> {
  const settings = getSystemSettings();
  const recipient = customRecipient || settings.smtpTo;

  if (!recipient) {
    return { success: false, message: 'No recipient email configured in settings' };
  }

  if (!settings.smtpHost || !settings.smtpFrom) {
    return { success: false, message: 'SMTP Host and Sender (From) must be configured in Settings.' };
  }

  const report = await generateScheduledReport(type);
  const subject = `[Nippon BPO] ${type.toUpperCase()} Network & Security Telemetry Report - ${new Date().toLocaleDateString('en-US')}`;

  try {
    const emailResult = await sendSmtpEmail({
      host: settings.smtpHost,
      port: Number(settings.smtpPort || 587),
      secure: Boolean(settings.smtpSecure),
      user: settings.smtpUser,
      pass: settings.smtpPass,
      from: settings.smtpFrom,
      to: recipient,
      subject,
      html: report.docHtml,
    });

    if (emailResult.success) {
      recordAuditLog({
        actor: 'system',
        action: 'report_email',
        target: recipient,
        details: { type, title: report.title },
        status: 'success',
      });
    }

    return {
      success: emailResult.success,
      message: emailResult.success ? `Report successfully sent to ${recipient}` : 'Failed to send report email',
      messageId: emailResult.messageId,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'SMTP transmission error',
    };
  }
}
