import cron from 'node-cron';
import prisma from '../lib/prisma';
import { createNotification } from '../services/NotificationService';
import { emitToAll, emitToUser } from '../socket/eventBus';

/**
 * Starts the background SLA Compliance Watcher cron job.
 * Runs every 5 minutes.
 */
export function startSLAWatcher(): void {
  // Cron schedule: */5 * * * * (Every 5 minutes)
  cron.schedule('*/5 * * * *', async () => {
    console.log(`[SLAWatcher] Cron check started at: ${new Date().toISOString()}`);
    try {
      const now = new Date();
      
      // Find open or in-progress issues that are past their due date and not flagged as overdue
      const overdueIssues = await prisma.complianceIssue.findMany({
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          dueDate: { lt: now },
          isOverdue: false,
        },
      });

      if (overdueIssues.length === 0) {
        console.log('[SLAWatcher] No new overdue issues detected.');
        return;
      }

      console.log(`[SLAWatcher] Found ${overdueIssues.length} new overdue compliance issues.`);

      for (const issue of overdueIssues) {
        // Update issue status to overdue
        await prisma.complianceIssue.update({
          where: { id: issue.id },
          data: { isOverdue: true },
        });

        // Create notification for the issue owner
        const notification = await createNotification({
          userId: issue.ownerId,
          type: 'COMPLIANCE_OVERDUE',
          title: 'SLA BREACH: Compliance Issue Overdue',
          message: `Your assigned compliance issue is overdue: "${issue.description}"`,
          refType: 'ComplianceIssue',
          refId: issue.id,
        });

        // Emit general websocket event
        emitToAll('compliance:overdue', {
          issueId: issue.id,
          ownerId: issue.ownerId,
        });
      }
    } catch (error) {
      console.error('[SLAWatcher] Error running compliance check:', error);
    }
  });
  console.log('[SLAWatcher] Compliance SLA cron job scheduled (every 5 minutes).');
}
