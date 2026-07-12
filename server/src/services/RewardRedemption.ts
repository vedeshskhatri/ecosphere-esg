import prisma from '../lib/prisma';
import { createNotification } from './NotificationService';
import { emitToAll, emitToUser } from '../socket/eventBus';

export class RewardRedemptionService {
  /**
   * Redeems a reward for a user in a concurrency-safe manner using row-level locking.
   */
  static async redeemReward(userId: string, rewardId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Lock the Reward row to prevent race conditions on stock
      const rewards: any[] = await tx.$queryRaw`
        SELECT id, name, stock, "pointsRequired", status 
        FROM "Reward" 
        WHERE id = ${rewardId} 
        FOR UPDATE
      `;
      
      const reward = rewards[0];
      if (!reward) {
        throw new Error('Reward not found');
      }

      if (reward.status !== 'ACTIVE') {
        throw new Error('Reward is not currently active');
      }

      if (reward.stock <= 0) {
        throw new Error('Reward is currently out of stock');
      }

      // 2. Lock the User row to prevent double spending
      const users: any[] = await tx.$queryRaw`
        SELECT id, name, "pointsBalance" 
        FROM "User" 
        WHERE id = ${userId} 
        FOR UPDATE
      `;
      
      const user = users[0];
      if (!user) {
        throw new Error('User not found');
      }

      const pointsRequired = Number(reward.pointsRequired);
      const pointsBalance = Number(user.pointsBalance);

      if (pointsBalance < pointsRequired) {
        throw new Error('Insufficient points balance');
      }

      // 3. Deduct stock from Reward
      await tx.reward.update({
        where: { id: rewardId },
        data: { stock: { decrement: 1 } },
      });

      // 4. Deduct points from User
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { pointsBalance: { decrement: pointsRequired } },
        select: { id: true, name: true, pointsBalance: true, xp: true },
      });

      // 5. Create RewardRedemption log
      const redemption = await tx.rewardRedemption.create({
        data: {
          rewardId,
          employeeId: userId,
          pointsSpent: pointsRequired,
          status: 'FULFILLED',
        },
        include: {
          reward: { select: { name: true } },
        },
      });

      // 6. Create Notification
      await createNotification({
        userId,
        type: 'REWARD_REDEEMED',
        title: 'Reward Redeemed successfully',
        message: `You successfully redeemed "${reward.name}" for ${pointsRequired} points.`,
        refType: 'RewardRedemption',
        refId: redemption.id,
      });

      // 7. Emit updates via websockets
      emitToUser(userId, 'user:update', updatedUser);
      emitToAll('activity:feed', {
        type: 'REWARD_REDEEMED',
        message: `${user.name} redeemed the reward: "${reward.name}"`,
        timestamp: new Date(),
      });

      return {
        redemption,
        user: updatedUser,
      };
    });
  }
}
export default RewardRedemptionService;
