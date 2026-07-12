import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { EmissionScope, ApprovalStatus, IssueStatus, AuditStatus, Role } from '@prisma/client';

const router = Router();

// Helper to convert data to CSV string
function convertToCSV(headers: string[], rows: any[][]): string {
  const csvLines = [headers.join(',')];
  for (const row of rows) {
    const escapedRow = row.map((val) => {
      if (val === null || val === undefined) return '';
      const stringified = String(val);
      if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n')) {
        return `"${stringified.replace(/"/g, '""')}"`;
      }
      return stringified;
    });
    csvLines.push(escapedRow.join(','));
  }
  return csvLines.join('\n');
}

// ─────────────────────────────────────────
// ENVIRONMENTAL REPORT
// ─────────────────────────────────────────
router.get('/environmental', requireAuth, async (req, res) => {
  const { departmentId, startDate, endDate } = req.query;

  try {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);

    const txFilters: any = {};
    if (departmentId) txFilters.departmentId = departmentId as string;
    if (startDate || endDate) txFilters.date = dateFilter;

    // Fetch transactions
    const transactions = await prisma.carbonTransaction.findMany({
      where: txFilters,
      include: { department: true },
    });

    // 1. Group by department
    const deptMap: Record<string, number> = {};
    // 2. Group by Scope
    const scopeMap = {
      [EmissionScope.SCOPE1]: 0,
      [EmissionScope.SCOPE2]: 0,
      [EmissionScope.SCOPE3]: 0,
    };

    transactions.forEach((tx) => {
      const co2 = Number(tx.co2Kg);
      deptMap[tx.department.name] = (deptMap[tx.department.name] || 0) + co2;
      scopeMap[tx.scope] += co2;
    });

    const byDepartment = Object.entries(deptMap).map(([name, co2]) => ({ name, co2: parseFloat(co2.toFixed(2)) }));
    const byScope = Object.entries(scopeMap).map(([scope, co2]) => ({ name: scope, co2: parseFloat(co2.toFixed(2)) }));

    return res.json({
      success: true,
      data: {
        totalEmissionsCo2: parseFloat(transactions.reduce((sum, tx) => sum + Number(tx.co2Kg), 0).toFixed(2)),
        byDepartment,
        byScope,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// SOCIAL REPORT
// ─────────────────────────────────────────
router.get('/social', requireAuth, async (req, res) => {
  const { departmentId } = req.query;

  try {
    const userFilters: any = {};
    if (departmentId) userFilters.departmentId = departmentId as string;

    const employees = await prisma.user.findMany({
      where: { ...userFilters, role: Role.EMPLOYEE },
      select: { id: true, name: true, xp: true, department: true },
    });

    const userIds = employees.map((emp) => emp.id);

    const participations = await prisma.employeeParticipation.findMany({
      where: { employeeId: { in: userIds } },
      include: { activity: true },
    });

    // Calculations
    const totalXP = employees.reduce((sum, emp) => sum + emp.xp, 0);
    const approvedParticipations = participations.filter((p) => p.approvalStatus === 'APPROVED').length;
    const pendingParticipations = participations.filter((p) => p.approvalStatus === 'PENDING').length;
    const volunteerHours = approvedParticipations * 2; // Stub factor

    return res.json({
      success: true,
      data: {
        totalXP,
        approvedParticipations,
        pendingParticipations,
        volunteerHours,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GOVERNANCE REPORT
// ─────────────────────────────────────────
router.get('/governance', requireAuth, async (req, res) => {
  const { departmentId } = req.query;

  try {
    const issueFilters: any = {};
    if (departmentId) {
      issueFilters.audit = { departmentId: departmentId as string };
    }

    const issues = await prisma.complianceIssue.findMany({
      where: issueFilters,
      include: { audit: true },
    });

    const audits = await prisma.audit.findMany({
      where: departmentId ? { departmentId: departmentId as string } : {},
    });

    // Severity mapping counts
    const severityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    const issueStatusCounts = { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0 };
    let overdueCount = 0;

    issues.forEach((issue) => {
      severityCounts[issue.severity] = (severityCounts[issue.severity] || 0) + 1;
      issueStatusCounts[issue.status] = (issueStatusCounts[issue.status] || 0) + 1;
      if (issue.isOverdue && issue.status !== 'RESOLVED') {
        overdueCount++;
      }
    });

    const auditStatusCounts = { PLANNED: 0, IN_PROGRESS: 0, COMPLETED: 0 };
    audits.forEach((audit) => {
      auditStatusCounts[audit.status] = (auditStatusCounts[audit.status] || 0) + 1;
    });

    return res.json({
      success: true,
      data: {
        totalIssues: issues.length,
        severityCounts,
        issueStatusCounts,
        overdueCount,
        totalAudits: audits.length,
        auditStatusCounts,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// ESG SUMMARY REPORT
// ─────────────────────────────────────────
router.get('/summary', requireAuth, async (req, res) => {
  const { departmentId } = req.query;

  try {
    const scoreFilters: any = {};
    if (departmentId) scoreFilters.departmentId = departmentId as string;

    // Fetch latest score records for all departments or filtered department
    const scores = await prisma.departmentScore.findMany({
      where: scoreFilters,
      include: { department: true },
      orderBy: { calculatedAt: 'desc' },
    });

    // Calculate dynamic average for orgScore
    let orgScore = 0;
    if (scores.length > 0) {
      const sum = scores.reduce((acc, s) => acc + Number(s.totalScore), 0);
      orgScore = parseFloat((sum / scores.length).toFixed(1));
    }

    return res.json({
      success: true,
      data: {
        orgScore,
        departmentScores: scores.map((s) => ({
          departmentId: s.departmentId,
          name: s.department.name,
          envScore: Number(s.envScore),
          socialScore: Number(s.socialScore),
          govScore: Number(s.govScore),
          totalScore: Number(s.totalScore),
        })),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// EXPORT CSV
// ─────────────────────────────────────────
router.get('/export', requireAuth, async (req, res) => {
  const { type, departmentId, startDate, endDate } = req.query;

  try {
    let csvText = '';
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);

    if (type === 'environmental') {
      const txFilters: any = {};
      if (departmentId) txFilters.departmentId = departmentId as string;
      if (startDate || endDate) txFilters.date = dateFilter;

      const transactions = await prisma.carbonTransaction.findMany({
        where: txFilters,
        include: { department: true, emissionFactor: true },
        orderBy: { date: 'desc' },
      });

      const headers = ['Transaction ID', 'Department', 'Scope', 'Source Type', 'Quantity', 'Unit', 'CO2 (Kg)', 'Date', 'Notes'];
      const rows = transactions.map((t) => [
        t.id,
        t.department.name,
        t.scope,
        t.sourceType,
        Number(t.quantity),
        t.emissionFactor.unit,
        Number(t.co2Kg),
        t.date.toISOString().split('T')[0],
        t.notes || '',
      ]);
      csvText = convertToCSV(headers, rows);
    } else if (type === 'social') {
      const userFilters: any = {};
      if (departmentId) userFilters.departmentId = departmentId as string;

      const participations = await prisma.employeeParticipation.findMany({
        where: { employee: userFilters },
        include: { employee: { include: { department: true } }, activity: true },
        orderBy: { createdAt: 'desc' },
      });

      const headers = ['Record ID', 'Employee Name', 'Email', 'Department', 'CSR Activity', 'Status', 'Points Earned', 'Completion Date'];
      const rows = participations.map((p) => [
        p.id,
        p.employee.name,
        p.employee.email,
        p.employee.department?.name || 'N/A',
        p.activity.title,
        p.approvalStatus,
        p.pointsEarned,
        p.completionDate ? p.completionDate.toISOString().split('T')[0] : 'N/A',
      ]);
      csvText = convertToCSV(headers, rows);
    } else if (type === 'governance') {
      const issueFilters: any = {};
      if (departmentId) issueFilters.audit = { departmentId: departmentId as string };

      const issues = await prisma.complianceIssue.findMany({
        where: issueFilters,
        include: { audit: { include: { department: true } }, owner: true },
        orderBy: { dueDate: 'asc' },
      });

      const headers = ['Issue ID', 'Department', 'Audit Title', 'Description', 'Severity', 'Status', 'Owner Name', 'Due Date', 'Overdue Flag'];
      const rows = issues.map((i) => [
        i.id,
        i.audit?.department.name || 'Global',
        i.audit?.title || 'External',
        i.description,
        i.severity,
        i.status,
        i.owner.name,
        i.dueDate.toISOString().split('T')[0],
        i.isOverdue ? 'YES' : 'NO',
      ]);
      csvText = convertToCSV(headers, rows);
    } else {
      // Default: Summary score export
      const scoreFilters: any = {};
      if (departmentId) scoreFilters.departmentId = departmentId as string;

      const scores = await prisma.departmentScore.findMany({
        where: scoreFilters,
        include: { department: true },
        orderBy: { calculatedAt: 'desc' },
      });

      const headers = ['Score ID', 'Department', 'Env Score', 'Social Score', 'Gov Score', 'Total ESG Score', 'Calculated At'];
      const rows = scores.map((s) => [
        s.id,
        s.department.name,
        Number(s.envScore),
        Number(s.socialScore),
        Number(s.govScore),
        Number(s.totalScore),
        s.calculatedAt.toISOString(),
      ]);
      csvText = convertToCSV(headers, rows);
    }

    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ecosphere_${type || 'summary'}_report.csv"`);
    return res.send('\uFEFF' + csvText);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
