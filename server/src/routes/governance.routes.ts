import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { validate } from '../middleware/validate';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { createNotification } from '../services/NotificationService';
import { emitToAll } from '../socket/eventBus';
import { ScoringEngine } from '../services/ScoringEngine';

const router = Router();

// Zod Validation Schemas
const createPolicySchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  departmentId: z.string().uuid('Invalid department ID').optional().nullable(),
  effectiveDate: z.string().transform((val) => new Date(val)),
});

const updatePolicyStatusSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']),
});

const createAuditSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  departmentId: z.string().uuid('Invalid department ID'),
  auditorId: z.string().uuid('Invalid auditor ID'),
  date: z.string().transform((val) => new Date(val)),
});

const updateAuditStatusSchema = z.object({
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED']),
  findings: z.string().optional().nullable(),
});

const createIssueSchema = z.object({
  auditId: z.string().uuid('Invalid audit ID').optional().nullable(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  ownerId: z.string().uuid('Invalid owner ID'),
  dueDate: z.string().transform((val) => new Date(val)),
});

const updateIssueStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']),
  isOverdue: z.boolean().optional(),
});

// ─────────────────────────────────────────
// ESG POLICIES
// ─────────────────────────────────────────

// GET /api/governance/policies - List all policies
router.get('/policies', requireAuth, async (req, res) => {
  try {
    const policies = await prisma.esgPolicy.findMany({
      include: {
        department: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: policies });
  } catch (error) {
    console.error('[Governance] Error fetching policies:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch policies' });
  }
});

// POST /api/governance/policies - Create policy
router.post('/policies', requireAuth, requireRole('ADMIN', 'MANAGER'), validate(createPolicySchema), async (req: AuthRequest, res) => {
  const { title, description, departmentId, effectiveDate } = req.body;

  try {
    const policy = await prisma.esgPolicy.create({
      data: {
        title,
        description,
        departmentId: departmentId || null,
        effectiveDate,
        status: 'DRAFT',
      },
    });

    return res.status(201).json({ success: true, data: policy });
  } catch (error) {
    console.error('[Governance] Error creating policy:', error);
    return res.status(500).json({ success: false, error: 'Failed to create policy' });
  }
});

// PATCH /api/governance/policies/:id - Update status
router.patch('/policies/:id', requireAuth, requireRole('ADMIN', 'MANAGER'), validate(updatePolicyStatusSchema), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const policy = await prisma.esgPolicy.update({
      where: { id },
      data: { status },
    });

    // If policy becomes ACTIVE, notify users who should acknowledge it
    if (status === 'ACTIVE') {
      const employees = await prisma.user.findMany({
        where: { status: 'ACTIVE', role: 'EMPLOYEE' },
        select: { id: true },
      });

      for (const emp of employees) {
        await prisma.policyAcknowledgement.upsert({
          where: {
            policyId_employeeId: {
              policyId: id,
              employeeId: emp.id,
            },
          },
          update: { status: 'PENDING' },
          create: {
            policyId: id,
            employeeId: emp.id,
            status: 'PENDING',
          },
        });

        await createNotification({
          userId: emp.id,
          type: 'POLICY_REMINDER',
          title: 'New ESG Policy Active',
          message: `Please review and acknowledge the policy: "${policy.title}"`,
          refType: 'EsgPolicy',
          refId: id,
        });
      }
    }

    return res.json({ success: true, data: policy });
  } catch (error) {
    console.error('[Governance] Error updating policy status:', error);
    return res.status(500).json({ success: false, error: 'Failed to update policy status' });
  }
});

// GET /api/governance/policies/:id/acknowledgements - List status
router.get('/policies/:id/acknowledgements', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const acks = await prisma.policyAcknowledgement.findMany({
      where: { policyId: id },
      include: {
        employee: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    return res.json({ success: true, data: acks });
  } catch (error) {
    console.error('[Governance] Error fetching policy acknowledgements:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch acknowledgements' });
  }
});

// POST /api/governance/policies/:id/acknowledge - Employee acknowledge
router.post('/policies/:id/acknowledge', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const ack = await prisma.policyAcknowledgement.upsert({
      where: {
        policyId_employeeId: {
          policyId: id,
          employeeId: userId,
        },
      },
      update: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
      },
      create: {
        policyId: id,
        employeeId: userId,
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
      },
    });

    // Recalculate scores for employee's department
    const employee = await prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true, name: true }
    });
    if (employee && employee.departmentId) {
      await ScoringEngine.recalculateAndEmit(employee.departmentId);
    }

    emitToAll('activity:feed', {
      type: 'POLICY_ACKNOWLEDGED',
      message: `${employee?.name || 'Employee'} acknowledged policy: "${id}"`,
      timestamp: new Date(),
    });

    return res.json({ success: true, data: ack });
  } catch (error) {
    console.error('[Governance] Error acknowledging policy:', error);
    return res.status(500).json({ success: false, error: 'Failed to acknowledge policy' });
  }
});

// ─────────────────────────────────────────
// AUDITS
// ─────────────────────────────────────────

// GET /api/governance/audits - List audits
router.get('/audits', requireAuth, async (req, res) => {
  try {
    const audits = await prisma.audit.findMany({
      include: {
        department: { select: { name: true } },
        auditor: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });
    return res.json({ success: true, data: audits });
  } catch (error) {
    console.error('[Governance] Error fetching audits:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch audits' });
  }
});

// POST /api/governance/audits - Create audit
router.post('/audits', requireAuth, requireRole('ADMIN', 'MANAGER'), validate(createAuditSchema), async (req, res) => {
  const { title, departmentId, auditorId, date } = req.body;

  try {
    const audit = await prisma.audit.create({
      data: {
        title,
        departmentId,
        auditorId,
        date,
        status: 'PLANNED',
      },
    });
    return res.status(201).json({ success: true, data: audit });
  } catch (error) {
    console.error('[Governance] Error creating audit:', error);
    return res.status(500).json({ success: false, error: 'Failed to create audit' });
  }
});

// PATCH /api/governance/audits/:id - Update audit status
router.patch('/audits/:id', requireAuth, requireRole('ADMIN', 'MANAGER'), validate(updateAuditStatusSchema), async (req, res) => {
  const { id } = req.params;
  const { status, findings } = req.body;

  try {
    const audit = await prisma.audit.update({
      where: { id },
      data: {
        status,
        findings: findings !== undefined ? findings : undefined,
      },
    });
    return res.json({ success: true, data: audit });
  } catch (error) {
    console.error('[Governance] Error updating audit:', error);
    return res.status(500).json({ success: false, error: 'Failed to update audit' });
  }
});

// ─────────────────────────────────────────
// COMPLIANCE ISSUES
// ─────────────────────────────────────────

// GET /api/governance/issues - List compliance issues
router.get('/issues', requireAuth, async (req, res) => {
  try {
    const issues = await prisma.complianceIssue.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true } },
        audit: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: issues });
  } catch (error) {
    console.error('[Governance] Error fetching issues:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch issues' });
  }
});

// POST /api/governance/issues - Create compliance issue
router.post('/issues', requireAuth, requireRole('ADMIN', 'MANAGER'), validate(createIssueSchema), async (req, res) => {
  const { auditId, severity, description, ownerId, dueDate } = req.body;

  try {
    const issue = await prisma.complianceIssue.create({
      data: {
        auditId: auditId || null,
        severity,
        description,
        ownerId,
        dueDate,
        status: 'OPEN',
        isOverdue: new Date(dueDate) < new Date(),
      },
    });

    // Notify issue owner
    await createNotification({
      userId: ownerId,
      type: 'COMPLIANCE_ISSUE_RAISED',
      title: 'New Compliance Issue Raised',
      message: `A new ${severity} compliance issue has been assigned to you: "${description}"`,
      refType: 'ComplianceIssue',
      refId: issue.id,
    });

    // Notify live feed
    emitToAll('activity:feed', {
      type: 'COMPLIANCE_ISSUE_RAISED',
      message: `New compliance issue assigned to owner`,
      timestamp: new Date(),
    });

    // Recalculate scores for owner's department
    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { departmentId: true }
    });
    if (owner && owner.departmentId) {
      await ScoringEngine.recalculateAndEmit(owner.departmentId);
    }

    return res.status(201).json({ success: true, data: issue });
  } catch (error) {
    console.error('[Governance] Error creating compliance issue:', error);
    return res.status(500).json({ success: false, error: 'Failed to create compliance issue' });
  }
});

// PATCH /api/governance/issues/:id - Update compliance issue
router.patch('/issues/:id', requireAuth, requireRole('ADMIN', 'MANAGER'), validate(updateIssueStatusSchema), async (req, res) => {
  const { id } = req.params;
  const { status, isOverdue } = req.body;

  try {
    const issue = await prisma.complianceIssue.update({
      where: { id },
      data: {
        status,
        isOverdue: isOverdue !== undefined ? isOverdue : undefined,
      },
    });
    const issueWithDept = await prisma.complianceIssue.findUnique({
      where: { id },
      include: {
        audit: { select: { departmentId: true } },
        owner: { select: { departmentId: true } },
      },
    });
    const deptId = issueWithDept?.audit?.departmentId || issueWithDept?.owner?.departmentId;
    if (deptId) {
      await ScoringEngine.recalculateAndEmit(deptId);
    }

    return res.json({ success: true, data: issue });
  } catch (error) {
    console.error('[Governance] Error updating compliance issue:', error);
    return res.status(500).json({ success: false, error: 'Failed to update compliance issue' });
  }
});

export default router;
