import prisma from '../lib/prisma';
import { createNotification } from './NotificationService';
import { emitToAll, emitToUser } from '../socket/eventBus';

export class RewardRedemptionService {
  /**
   * Redeems a reward for a user in a concurrency-safe manner using row-level locking.
   */
  static async redeemReward(userId: string, rewardId: string) {
    let pointsRequired = 0;
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

      pointsRequired = Number(reward.pointsRequired);
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

      return {
        redemption,
        updatedUser,
        user,
        rewardName: reward.name,
      };
    }, { timeout: 15000 }).then(async (result) => {
      // 6. Create Notification (runs outside transaction)
      await createNotification({
        userId,
        type: 'REWARD_REDEEMED',
        title: 'Reward Redeemed successfully',
        message: `You successfully redeemed "${result.rewardName}" for ${pointsRequired} points.`,
        refType: 'RewardRedemption',
        refId: result.redemption.id,
      });

      // 7. Emit updates via websockets
      emitToUser(userId, 'user:update', result.updatedUser);
      emitToAll('activity:feed', {
        type: 'REWARD_REDEEMED',
        message: `${result.user.name} redeemed the reward: "${result.rewardName}"`,
        timestamp: new Date(),
      });

      return {
        redemption: result.redemption,
        user: result.updatedUser,
      };
    });
  }
}
export default RewardRedemptionService;
