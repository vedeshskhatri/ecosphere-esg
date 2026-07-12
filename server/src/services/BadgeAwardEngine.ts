import prisma from '../lib/prisma';
import { emitToUser, emitToAll } from '../socket/eventBus';

/**
 * Checks if the employee is eligible for any new badges and awards them.
 * This is designed to run as a side effect after XP or participation updates
 * and should never throw errors to avoid crashing the parent operation.
 * 
 * @param employeeId The ID of the employee to check
 */
export async function checkAndAwardBadges(employeeId: string): Promise<void> {
  try {
    // 1. Get the user's current xp from the User table.
    const user = await prisma.user.findUnique({
      where: { id: employeeId },
      select: { xp: true }
    });

    if (!user) {
      console.warn(`[BadgeAwardEngine] User not found: ${employeeId}`);
      return;
    }

    // 2. Count completed challenges: ChallengePart records where employeeId = employeeId AND approvalStatus = 'APPROVED'
    const completedChallenges = await prisma.challengePart.count({
      where: {
        employeeId,
        approvalStatus: 'APPROVED'
      }
    });

    // 3. Count approved CSR participations: EmployeeParticipation records where employeeId = employeeId AND approvalStatus = 'APPROVED'
    const csrCount = await prisma.employeeParticipation.count({
      where: {
        employeeId,
        approvalStatus: 'APPROVED'
      }
    });

    // 4. Check EsgSettings (findFirst) — if autoBadgeAward is false, return early and do nothing
    const settings = await prisma.esgSettings.findFirst();
    if (settings && settings.autoBadgeAward === false) {
      return;
    }

    // 5. Get all Badge records
    const badges = await prisma.badge.findMany();

    // 6. Get all BadgeAward records where employeeId = employeeId (already earned badges)
    const earnedBadgeAwards = await prisma.badgeAward.findMany({
      where: { employeeId },
      select: { badgeId: true }
    });
    const earnedBadgeIds = new Set(earnedBadgeAwards.map(award => award.badgeId));

    // 7. Filter badges to only ones not yet awarded
    const unawardedBadges = badges.filter(badge => !earnedBadgeIds.has(badge.id));

    // 8. For each unawarded badge, check unlock rule
    for (const badge of unawardedBadges) {
      let unlocked = false;

      if (badge.unlockRuleType === 'XP_THRESHOLD') {
        unlocked = user.xp >= badge.unlockRuleValue;
      } else if (badge.unlockRuleType === 'CHALLENGE_COUNT') {
        unlocked = completedChallenges >= badge.unlockRuleValue;
      } else if (badge.unlockRuleType === 'CSR_COUNT') {
        unlocked = csrCount >= badge.unlockRuleValue;
      }

      if (unlocked) {
        // 9. For each badge where the rule is met:
        // - create BadgeAward record
        await prisma.badgeAward.create({
          data: {
            employeeId,
            badgeId: badge.id
          }
        });

        // - create Notification (userId = employeeId, type = 'BADGE_UNLOCK', title = 'Badge Unlocked!', message = You earned the "${badge.name}" badge!)
        const title = 'Badge Unlocked!';
        const message = `You earned the "${badge.name}" badge!`;

        await prisma.notification.create({
          data: {
            userId: employeeId,
            type: 'BADGE_UNLOCK',
            title,
            message
          }
        });

        // - call emitToUser(employeeId, 'badge:awarded', { badgeName: badge.name, badgeIcon: badge.icon, message: 'You earned a new badge!' })
        emitToUser(employeeId, 'badge:awarded', {
          badgeName: badge.name,
          badgeIcon: badge.icon,
          message: 'You earned a new badge!'
        });

        // - call emitToAll('activity:feed', { type: 'BADGE_UNLOCKED', employeeId, badgeName: badge.name })
        emitToAll('activity:feed', {
          type: 'BADGE_UNLOCKED',
          employeeId,
          badgeName: badge.name
        });
      }
    }
  } catch (error) {
    console.error('[BadgeAwardEngine]', error);
  }
}
