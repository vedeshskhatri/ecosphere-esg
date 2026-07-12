import prisma from '../lib/prisma';
import { emitToUser } from '../socket/eventBus';

export interface CreateNotificationParams {
  userId: string;
  type:
    | 'BADGE_UNLOCK'
    | 'CSR_APPROVED'
    | 'CSR_REJECTED'
    | 'CHALLENGE_APPROVED'
    | 'CHALLENGE_REJECTED'
    | 'COMPLIANCE_ISSUE_RAISED'
    | 'COMPLIANCE_OVERDUE'
    | 'POLICY_REMINDER'
    | 'REWARD_REDEEMED';
  title: string;
  message: string;
  refType?: string;
  refId?: string;
}

/**
 * Service to create a notification, save it to the DB, and emit it via WebSockets.
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        refType: params.refType || null,
        refId: params.refId || null,
        isRead: false,
      },
    });

    // Emit live WebSocket notification event to user
    emitToUser(params.userId, 'notification:new', notification);
    return notification;
  } catch (error) {
    console.error('[NotificationService] Error creating notification:', error);
    throw error;
  }
}
