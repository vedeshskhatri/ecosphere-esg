export class EmailService {
  /**
   * Simulates sending a fully styled HTML email alert.
   * Prints the structured SMTP email directly to the node console in development.
   */
  static sendAlertEmail(to: string, subject: string, templateHtml: string): void {
    const divider = '='.repeat(60);
    console.log('\n' + divider);
    console.log(`✉️  [SMTP SIMULATED MAIL] TO: ${to}`);
    console.log(`✉️  [SMTP SIMULATED MAIL] SUBJECT: ${subject}`);
    console.log(divider);
    // Strip simple HTML tags or print a indented block to make console reading clean
    const cleanText = templateHtml
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    console.log(`   "${cleanText}"`);
    console.log(divider + '\n');
  }

  static getSlaOverdueTemplate(ownerName: string, issueTitle: string, dueDate: Date): string {
    return `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1E293B;">
        <h2 style="color: #EF4444;">⚠️ SLA BREACH WARNING: Overdue Compliance Issue</h2>
        <p>Dear ${ownerName},</p>
        <p>This is an automated notification that the following governance compliance issue assigned to you has passed its due date without resolution:</p>
        <blockquote style="background: #F1F5F9; border-left: 4px solid #EF4444; padding: 10px; margin: 10px 0;">
          <strong>Issue:</strong> ${issueTitle}<br/>
          <strong>Due Date:</strong> ${dueDate.toLocaleDateString()}<br/>
          <strong>Status:</strong> OVERDUE
        </blockquote>
        <p>Please log in to the EcoSphere ESG Platform immediately to resolve this violation and update the audit status.</p>
        <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 20px 0;"/>
        <p style="font-size: 11px; color: #94A3B8;">This is a system generated notification from EcoSphere Automated SLA Watcher.</p>
      </div>
    `;
  }

  static getBadgeUnlockTemplate(employeeName: string, badgeName: string, badgeIcon: string, description: string): string {
    return `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1E293B;">
        <h2 style="color: #10B981;">🏆 CONGRATULATIONS! Badge Unlocked</h2>
        <p>Dear ${employeeName},</p>
        <p>You have successfully unlocked a new ESG achievement badge on the EcoSphere ESG Platform:</p>
        <div style="background: #F8FAFC; border: 1px solid #10B981; border-radius: 8px; padding: 15px; margin: 15px 0; display: flex; align-items: center;">
          <span style="font-size: 32px; margin-right: 15px;">${badgeIcon}</span>
          <div>
            <strong style="font-size: 16px; color: #0F172A;">${badgeName}</strong><br/>
            <span style="color: #475569;">${description}</span>
          </div>
        </div>
        <p>Your XP balance has been updated and the achievement has been published to the live activity feed.</p>
        <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 20px 0;"/>
        <p style="font-size: 11px; color: #94A3B8;">Keep up the sustainable vibes! — The EcoSphere Team</p>
      </div>
    `;
  }

  static getComplianceIssueRaisedTemplate(ownerName: string, issueTitle: string, severity: string, dueDate: Date): string {
    return `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1E293B;">
        <h2 style="color: #F59E0B;">📋 NEW ASSIGNMENT: Governance Compliance Issue</h2>
        <p>Dear ${ownerName},</p>
        <p>A new compliance issue has been raised and assigned to you following a governance audit:</p>
        <blockquote style="background: #F8FAFC; border-left: 4px solid #F59E0B; padding: 10px; margin: 10px 0;">
          <strong>Issue Title:</strong> ${issueTitle}<br/>
          <strong>Severity:</strong> <span style="color: #EF4444; font-weight: bold;">${severity}</span><br/>
          <strong>Due Date:</strong> ${dueDate.toLocaleDateString()}
        </blockquote>
        <p>Please log in to the EcoSphere portal, review the auditor's findings, and address the issue by the specified due date to avoid SLA breach penalties.</p>
        <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 20px 0;"/>
        <p style="font-size: 11px; color: #94A3B8;">EcoSphere Governance Compliance Team</p>
      </div>
    `;
  }
}
export default EmailService;
