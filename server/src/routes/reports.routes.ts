import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { ScoringEngine } from '../services/ScoringEngine';
import { PDFService } from '../services/PDFService';

const router = Router();

// GET /api/reports/pdf - Export ESG Performance Certificate PDF
router.get('/pdf', requireAuth, async (req, res) => {
  try {
    // 1. Gather scores from ScoringEngine
    const scores = await ScoringEngine.calculateOrgScores();

    // 2. Fetch counts/metrics for certificate tables
    const co2SavedRes = await prisma.carbonTransaction.aggregate({
      _sum: { co2Kg: true },
    });
    const co2SavedKg = Math.round(Number(co2SavedRes._sum.co2Kg || 0));

    const employeesCount = await prisma.user.count({
      where: { role: 'EMPLOYEE', status: 'ACTIVE' },
    });

    const activePolicies = await prisma.esgPolicy.count({
      where: { status: 'ACTIVE' },
    });

    const challengesCompleted = await prisma.challengePart.count({
      where: { approvalStatus: 'APPROVED' },
    });

    // 3. Set headers for streaming PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="EcoSphere_ESG_Certificate.pdf"');

    // 4. Generate & Stream PDF
    PDFService.generateESGCertificate(res, {
      orgName: 'EcoSphere Corporate Operations',
      envScore: scores.envScore,
      socialScore: scores.socialScore,
      govScore: scores.govScore,
      totalScore: scores.totalScore,
      co2SavedKg,
      employeesCount,
      activePolicies,
      challengesCompleted,
    });
  } catch (error) {
    console.error('[Reports] Error generating PDF report:', error);
    return res.status(500).json({ success: false, error: 'Failed to generate PDF ESG certificate' });
  }
});

// GET /api/reports/csv - Export CSV reports by type
router.get('/csv', requireAuth, async (req, res) => {
  const { type } = req.query;

  try {
    let csvContent = '';
    let filename = 'esg_report.csv';

    if (type === 'emissions') {
      filename = 'environmental_emissions_report.csv';
      const txs = await prisma.carbonTransaction.findMany({
        include: {
          department: { select: { name: true } },
          emissionFactor: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
      });

      csvContent = 'Transaction ID,Date,Department,Source Type,Scope,Quantity,CO2 Avoided (kg),Notes\n';
      txs.forEach((tx) => {
        csvContent += `"${tx.id}","${tx.date.toISOString().split('T')[0]}","${tx.department.name}","${tx.sourceType}","${tx.scope}",${tx.quantity},${tx.co2Kg},"${tx.notes || ''}"\n`;
      });
    } else if (type === 'policies') {
      filename = 'governance_policies_report.csv';
      const acks = await prisma.policyAcknowledgement.findMany({
        include: {
          policy: { select: { title: true } },
          employee: { select: { name: true, email: true } },
        },
        orderBy: { acknowledgedAt: 'desc' },
      });

      csvContent = 'Acknowledgement ID,Policy Title,Employee Name,Employee Email,Status,Acknowledged At\n';
      acks.forEach((ack) => {
        csvContent += `"${ack.id}","${ack.policy.title}","${ack.employee.name}","${ack.employee.email}","${ack.status}","${ack.acknowledgedAt ? ack.acknowledgedAt.toISOString() : ''}"\n`;
      });
    } else if (type === 'challenges') {
      filename = 'social_challenges_report.csv';
      const parts = await prisma.challengePart.findMany({
        include: {
          challenge: { select: { title: true, difficulty: true } },
          employee: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });

      csvContent = 'Participation ID,Challenge Title,Difficulty,Employee Name,Progress (%),Approval Status,XP Awarded\n';
      parts.forEach((p) => {
        csvContent += `"${p.id}","${p.challenge.title}","${p.challenge.difficulty}","${p.employee.name}",${p.progress},"${p.approvalStatus}",${p.xpAwarded}\n`;
      });
    } else if (type === 'redemptions') {
      filename = 'gamification_redemptions_report.csv';
      const redemptions = await prisma.rewardRedemption.findMany({
        include: {
          reward: { select: { name: true } },
          employee: { select: { name: true, email: true } },
        },
        orderBy: { redeemedAt: 'desc' },
      });

      csvContent = 'Redemption ID,Redeemed At,Reward Name,Employee Name,Employee Email,Points Spent,Status\n';
      redemptions.forEach((r) => {
        csvContent += `"${r.id}","${r.redeemedAt.toISOString()}","${r.reward.name}","${r.employee.name}","${r.employee.email}",${r.pointsSpent},"${r.status}"\n`;
      });
    } else {
      // Default summary report
      filename = 'esg_summary_report.csv';
      const scores = await ScoringEngine.calculateOrgScores();
      csvContent = 'Metric,Score/Value\n';
      csvContent += `Environmental Score,${scores.envScore.toFixed(2)}\n`;
      csvContent += `Social Score,${scores.socialScore.toFixed(2)}\n`;
      csvContent += `Governance Score,${scores.govScore.toFixed(2)}\n`;
      csvContent += `Total ESG Rating,${scores.totalScore.toFixed(2)}%\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvContent);
  } catch (error) {
    console.error('[Reports] Error generating CSV report:', error);
    return res.status(500).json({ success: false, error: 'Failed to generate CSV export' });
  }
});

export default router;
