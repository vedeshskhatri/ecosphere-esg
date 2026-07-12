import prisma from '../lib/prisma';
import { createNotification } from './NotificationService';
import { emitToAll, emitToUser } from '../socket/eventBus';
import { EmailService } from './EmailService';

export class BadgeAwardEngine {
  /**
   * Evaluates and awards badges to an employee based on their XP, challenges, and CSR activities.
   * Called automatically whenever employee XP increases.
   */
  static async checkAndAwardBadges(employeeId: string): Promise<void> {
    try {
      // 1. Fetch ESG settings to check if auto badge awarding is enabled
      const settings = await prisma.esgSettings.findFirst();
      if (settings && !settings.autoBadgeAward) {
        console.log('[BadgeAwardEngine] Auto badge awarding is disabled in ESG Settings.');
        return;
      }

      // 2. Fetch employee details (XP)
      const employee = await prisma.user.findUnique({
        where: { id: employeeId },
        select: { name: true, xp: true, email: true },
      });

      if (!employee) {
        console.error(`[BadgeAwardEngine] Employee with ID ${employeeId} not found.`);
        return;
      }

      // 3. Fetch completed challenges count (APPROVED status)
      const completedChallengesCount = await prisma.challengePart.count({
        where: {
          employeeId,
          approvalStatus: 'APPROVED',
        },
      });

      // 4. Fetch approved CSR participations count
      const approvedCsrCount = await prisma.employeeParticipation.count({
        where: {
          employeeId,
          approvalStatus: 'APPROVED',
        },
      });

      // 5. Fetch all badges
      const allBadges = await prisma.badge.findMany();

      // 6. Fetch badges already earned by this employee
      const earnedAwards = await prisma.badgeAward.findMany({
        where: { employeeId },
        select: { badgeId: true },
      });

      const earnedBadgeIds = new Set(earnedAwards.map((award) => award.badgeId));

      // 7. Find badges to award
      const badgesToAward = allBadges.filter((badge) => {
        // Skip if already earned
        if (earnedBadgeIds.has(badge.id)) return false;

        // Evaluate unlock rules
        switch (badge.unlockRuleType) {
          case 'XP_THRESHOLD':
            return employee.xp >= badge.unlockRuleValue;
          case 'CHALLENGE_COUNT':
            return completedChallengesCount >= badge.unlockRuleValue;
          case 'CSR_COUNT':
            return approvedCsrCount >= badge.unlockRuleValue;
          default:
            return false;
        }
      });

      if (badgesToAward.length === 0) {
        return;
      }

      console.log(`[BadgeAwardEngine] Awarding ${badgesToAward.length} new badges to ${employee.name}.`);

      // 8. Award each badge
      for (const badge of badgesToAward) {
        // Create BadgeAward record (ignore if duplicate due to concurrent checks)
        await prisma.badgeAward.upsert({
          where: {
            badgeId_employeeId: {
              badgeId: badge.id,
              employeeId,
            },
          },
          update: {},
          create: {
            badgeId: badge.id,
            employeeId,
          },
        });

        // Create Badge Unlock Notification
        await createNotification({
          userId: employeeId,
          type: 'BADGE_UNLOCK',
          title: `🏆 Badge Unlocked: ${badge.name}`,
          message: `Congratulations! You unlocked the "${badge.name}" badge: ${badge.description}`,
          refType: 'Badge',
          refId: badge.id,
        });

        // Send simulated email alert
        if (employee) {
          const emailHtml = EmailService.getBadgeUnlockTemplate(
            employee.name,
            badge.name,
            badge.icon,
            badge.description
          );
          EmailService.sendAlertEmail(
            employee.email,
            `🏆 Badge Unlocked: ${badge.name}`,
            emailHtml
          );
        }

        // Emit targeted WebSocket event to the earned user
        emitToUser(employeeId, 'badge:awarded', {
          badgeId: badge.id,
          name: badge.name,
          icon: badge.icon,
          description: badge.description,
        });

        // Emit general message to live activity feed
        emitToAll('activity:feed', {
          type: 'BADGE_UNLOCKED',
          message: `${employee.name} unlocked the badge ${badge.icon} ${badge.name}!`,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error(`[BadgeAwardEngine] Error check and award badges for user ${employeeId}:`, error);
    }
  }
}
export default BadgeAwardEngine;
