import { PrismaClient, Role, UserStatus, CategoryType, EmissionScope, GoalStatus, PolicyStatus, ActivityStatus, ChallengeStatus, ChallengeDifficulty, ApprovalStatus, AcknowledgementStatus, AuditStatus, IssueSeverity, IssueStatus, RedemptionStatus, NotificationType, BadgeUnlockType, RewardStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed started...');

  // 1. Clear existing data
  console.log('Clearing old data...');
  await prisma.nudge.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.rewardRedemption.deleteMany();
  await prisma.badgeAward.deleteMany();
  await prisma.departmentScore.deleteMany();
  await prisma.complianceIssue.deleteMany();
  await prisma.audit.deleteMany();
  await prisma.policyAcknowledgement.deleteMany();
  await prisma.challengePart.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.employeeParticipation.deleteMany();
  await prisma.csrActivity.deleteMany();
  await prisma.carbonTransaction.deleteMany();
  await prisma.user.deleteMany();
  await prisma.esgSettings.deleteMany();
  await prisma.conversionFactor.deleteMany();
  await prisma.reward.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.esgPolicy.deleteMany();
  await prisma.environmentalGoal.deleteMany();
  await prisma.emissionFactor.deleteMany();
  await prisma.category.deleteMany();
  await prisma.department.deleteMany();

  // 2. ESG Settings
  console.log('Seeding ESG Settings...');
  const esgSettings = await prisma.esgSettings.create({
    data: {
      envWeight: 40,
      socialWeight: 30,
      govWeight: 30,
      autoBadgeAward: true,
      evidenceRequired: true,
      autoEmissionCalc: false,
      emailAlerts: false,
    },
  });

  // 3. Departments
  console.log('Seeding Departments...');
  const mfgDept = await prisma.department.create({
    data: { name: 'Manufacturing', code: 'MFG', status: 'ACTIVE' },
  });
  const logDept = await prisma.department.create({
    data: { name: 'Logistics', code: 'LOG', status: 'ACTIVE' },
  });
  const corDept = await prisma.department.create({
    data: { name: 'Corporate', code: 'COR', status: 'ACTIVE' },
  });

  // 4. Users
  console.log('Seeding Users...');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);

  // Admin
  const adminUser = await prisma.user.create({
    data: {
      name: 'Vedesh S Khatri',
      email: 'vedesh@ecosphere.com',
      passwordHash: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      departmentId: corDept.id,
    },
  });

  // Managers
  const mfgManager = await prisma.user.create({
    data: {
      name: 'Aman Manager',
      email: 'aman@ecosphere.com',
      passwordHash: hashedPassword,
      role: 'MANAGER',
      status: 'ACTIVE',
      departmentId: mfgDept.id,
    },
  });
  const logManager = await prisma.user.create({
    data: {
      name: 'Swapnil Manager',
      email: 'swapnil@ecosphere.com',
      passwordHash: hashedPassword,
      role: 'MANAGER',
      status: 'ACTIVE',
      departmentId: logDept.id,
    },
  });
  const corManager = await prisma.user.create({
    data: {
      name: 'Corporate Manager',
      email: 'cor_mgr@ecosphere.com',
      passwordHash: hashedPassword,
      role: 'MANAGER',
      status: 'ACTIVE',
      departmentId: corDept.id,
    },
  });

  // Update department heads
  await prisma.department.update({ where: { id: mfgDept.id }, data: { headId: mfgManager.id } });
  await prisma.department.update({ where: { id: logDept.id }, data: { headId: logManager.id } });
  await prisma.department.update({ where: { id: corDept.id }, data: { headId: corManager.id } });

  // Employees
  const employeesData = [
    { name: 'John Mfg', email: 'john.mfg@ecosphere.com', deptId: mfgDept.id, xp: 450, points: 450 },
    { name: 'Sarah Mfg', email: 'sarah.mfg@ecosphere.com', deptId: mfgDept.id, xp: 850, points: 850 },
    { name: 'Alex Log', email: 'alex.log@ecosphere.com', deptId: logDept.id, xp: 220, points: 220 },
    { name: 'Emma Log', email: 'emma.log@ecosphere.com', deptId: logDept.id, xp: 610, points: 610 },
    { name: 'David Cor', email: 'david.cor@ecosphere.com', deptId: corDept.id, xp: 340, points: 340 },
    { name: 'Lisa Cor', email: 'lisa.cor@ecosphere.com', deptId: corDept.id, xp: 1200, points: 200 }, // Redeemed some rewards
  ];

  const employees: any[] = [];
  for (const emp of employeesData) {
    const user = await prisma.user.create({
      data: {
        name: emp.name,
        email: emp.email,
        passwordHash: hashedPassword,
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        departmentId: emp.deptId,
        xp: emp.xp,
        pointsBalance: emp.points,
      },
    });
    employees.push(user);
  }

  // Update employeeCount in departments
  await prisma.department.update({ where: { id: mfgDept.id }, data: { employeeCount: 3 } }); // manager + 2 employees
  await prisma.department.update({ where: { id: logDept.id }, data: { employeeCount: 3 } });
  await prisma.department.update({ where: { id: corDept.id }, data: { employeeCount: 4 } }); // admin + manager + 2 employees

  // 5. Categories
  console.log('Seeding Categories...');
  const envCsrCat = await prisma.category.create({ data: { name: 'Environmental CSR', type: 'CSR_ACTIVITY' } });
  const socialCsrCat = await prisma.category.create({ data: { name: 'Community Care', type: 'CSR_ACTIVITY' } });
  const energyChalCat = await prisma.category.create({ data: { name: 'Energy Conservation', type: 'CHALLENGE' } });
  const wasteChalCat = await prisma.category.create({ data: { name: 'Waste Reduction', type: 'CHALLENGE' } });

  // 6. Emission Factors
  console.log('Seeding Emission Factors...');
  const efDiesel = await prisma.emissionFactor.create({
    data: { name: 'Diesel Fleet Fuel', scope: 'SCOPE1', factorValue: 2.68, unit: 'kg CO2e per litre', sourceType: 'Fleet', status: 'ACTIVE' },
  });
  const efNaturalGas = await prisma.emissionFactor.create({
    data: { name: 'Natural Gas', scope: 'SCOPE1', factorValue: 1.89, unit: 'kg CO2e per m3', sourceType: 'Heating', status: 'ACTIVE' },
  });
  const efElectricity = await prisma.emissionFactor.create({
    data: { name: 'Grid Electricity', scope: 'SCOPE2', factorValue: 0.82, unit: 'kg CO2e per kWh', sourceType: 'Electricity', status: 'ACTIVE' },
  });
  const efAirTravel = await prisma.emissionFactor.create({
    data: { name: 'Business Flights', scope: 'SCOPE3', factorValue: 0.255, unit: 'kg CO2e per km', sourceType: 'Business Travel', status: 'ACTIVE' },
  });
  const efPaper = await prisma.emissionFactor.create({
    data: { name: 'Office Paper', scope: 'SCOPE3', factorValue: 0.54, unit: 'kg CO2e per kg', sourceType: 'Supplies', status: 'ACTIVE' },
  });

  // 7. Environmental Goals
  console.log('Seeding Environmental Goals...');
  const goalLog = await prisma.environmentalGoal.create({
    data: { title: 'Reduce Logistics Fleet Emissions', departmentId: logDept.id, targetCo2: 15000, currentCo2: 12450, deadline: new Date('2026-12-31'), status: 'ON_TRACK' },
  });
  const goalMfg = await prisma.environmentalGoal.create({
    data: { title: 'Cut Manufacturing Waste Carbon', departmentId: mfgDept.id, targetCo2: 25000, currentCo2: 23800, deadline: new Date('2026-10-30'), status: 'AT_RISK' },
  });
  const goalCor = await prisma.environmentalGoal.create({
    data: { title: 'Carbon Neutral Office Operations', departmentId: corDept.id, targetCo2: 5000, currentCo2: 5000, deadline: new Date('2026-06-30'), status: 'COMPLETED' },
  });

  // 8. Carbon Transactions (12 months of historical data)
  console.log('Seeding Carbon Transactions...');
  const depts = [mfgDept.id, logDept.id, corDept.id];
  const scopes: EmissionScope[] = ['SCOPE1', 'SCOPE2', 'SCOPE3'];
  const efs = [efDiesel, efNaturalGas, efElectricity, efAirTravel, efPaper];

  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const txDate = new Date(now.getFullYear(), now.getMonth() - i, 15);
    for (const deptId of depts) {
      // 3 transactions per department per month
      for (let j = 0; j < 3; j++) {
        const factor = efs[(deptId.charCodeAt(0) + i + j) % efs.length];
        const quantity = 500 + Math.random() * 1000;
        const co2Kg = quantity * Number(factor.factorValue);
        await prisma.carbonTransaction.create({
          data: {
            departmentId: deptId,
            emissionFactorId: factor.id,
            scope: factor.scope,
            quantity,
            co2Kg,
            sourceType: factor.sourceType,
            date: txDate,
            isAuto: Math.random() > 0.5,
            notes: `Seeded transaction for month -${i}`,
            createdById: adminUser.id,
          },
        });
      }
    }
  }

  // 9. CSR Activities
  console.log('Seeding CSR Activities...');
  const csr1 = await prisma.csrActivity.create({
    data: { title: 'EcoSphere Annual Tree Plantation Drive', categoryId: envCsrCat.id, description: 'Join us to plant 500 saplings in the local forest area. Snacks and transport will be provided.', maxParticipants: 30, xpReward: 100, status: 'ACTIVE', createdById: mfgManager.id },
  });
  const csr2 = await prisma.csrActivity.create({
    data: { title: 'Blood Donation Camp', categoryId: socialCsrCat.id, description: 'Quarterly blood donation drive in partnership with Red Cross in the Main Conference Room.', maxParticipants: 50, xpReward: 80, status: 'ACTIVE', createdById: corManager.id },
  });
  const csr3 = await prisma.csrActivity.create({
    data: { title: 'Office E-Waste Collection Week', categoryId: envCsrCat.id, description: 'Bring your broken gadgets and appliances from home for certified eco-friendly recycling.', maxParticipants: 100, xpReward: 50, status: 'ACTIVE', createdById: logManager.id },
  });

  // CSR participations
  await prisma.employeeParticipation.create({
    data: { employeeId: employees[0].id, activityId: csr1.id, approvalStatus: 'APPROVED', pointsEarned: 100, completionDate: new Date() },
  });
  await prisma.employeeParticipation.create({
    data: { employeeId: employees[1].id, activityId: csr1.id, approvalStatus: 'APPROVED', pointsEarned: 100, completionDate: new Date() },
  });
  await prisma.employeeParticipation.create({
    data: { employeeId: employees[2].id, activityId: csr2.id, approvalStatus: 'PENDING' },
  });

  // 10. Challenges
  console.log('Seeding Challenges...');
  const chal1 = await prisma.challenge.create({
    data: { title: 'Zero Waste Challenge', categoryId: wasteChalCat.id, description: 'Avoid single-use plastics for 2 consecutive weeks. Upload a photo of your reusable kit.', xp: 150, difficulty: 'EASY', status: 'ACTIVE', createdById: corManager.id },
  });
  const chal2 = await prisma.challenge.create({
    data: { title: 'Active Commute Week', categoryId: energyChalCat.id, description: 'Cycle, walk, or carpool to work for 5 days. Track commute log for proof.', xp: 200, difficulty: 'MEDIUM', status: 'ACTIVE', createdById: logManager.id },
  });
  const chal3 = await prisma.challenge.create({
    data: { title: 'Green Energy Ambassador', categoryId: energyChalCat.id, description: 'Identify and report 5 energy wastage spots in the corporate office with resolution ideas.', xp: 300, difficulty: 'HARD', status: 'ACTIVE', createdById: mfgManager.id },
  });

  // Challenge participations
  await prisma.challengePart.create({
    data: { employeeId: employees[1].id, challengeId: chal1.id, approvalStatus: 'APPROVED', xpAwarded: 150, progress: 100 },
  });
  await prisma.challengePart.create({
    data: { employeeId: employees[3].id, challengeId: chal2.id, approvalStatus: 'PENDING', progress: 60 },
  });

  // 11. Badges
  console.log('Seeding Badges...');
  const badge1 = await prisma.badge.create({
    data: { name: 'Carbon Buster', description: 'Log first carbon transaction reduction', icon: '🍃', unlockRuleType: 'XP_THRESHOLD', unlockRuleValue: 100 },
  });
  const badge2 = await prisma.badge.create({
    data: { name: 'Eco Starter', description: 'Earn 500 total XP on EcoSphere', icon: '🌱', unlockRuleType: 'XP_THRESHOLD', unlockRuleValue: 500 },
  });
  const badge3 = await prisma.badge.create({
    data: { name: 'Sustainability Champion', description: 'Complete 3 ESG challenges', icon: '🏆', unlockRuleType: 'CHALLENGE_COUNT', unlockRuleValue: 3 },
  });
  const badge4 = await prisma.badge.create({
    data: { name: 'CSR Superhero', description: 'Participate in 5 CSR activities', icon: '🌟', unlockRuleType: 'CSR_COUNT', unlockRuleValue: 5 },
  });

  // Award badges to Sarah (employees[1]) who has 850 XP
  await prisma.badgeAward.create({
    data: { employeeId: employees[1].id, badgeId: badge1.id },
  });
  await prisma.badgeAward.create({
    data: { employeeId: employees[1].id, badgeId: badge2.id },
  });

  // 12. Rewards
  console.log('Seeding Rewards...');
  const rew1 = await prisma.reward.create({
    data: { name: 'Eco Bamboo Water Bottle', description: 'Double-walled insulated water bottle with bamboo finish.', pointsRequired: 200, stock: 15, status: 'ACTIVE' },
  });
  const rew2 = await prisma.reward.create({
    data: { name: '10 Tree Plantation Certificate', description: 'Certified tree plantation in your name via NGO partner.', pointsRequired: 300, stock: 99, status: 'ACTIVE' },
  });
  const rew3 = await prisma.reward.create({
    data: { name: 'Solar Phone Charger', description: 'High-efficiency solar portable battery pack.', pointsRequired: 600, stock: 4, status: 'ACTIVE' },
  });
  const rew4 = await prisma.reward.create({
    data: { name: 'Paid Eco Volunteer Day Off', description: 'Additional paid leave for participating in verified community events.', pointsRequired: 1000, stock: 2, status: 'ACTIVE' },
  });

  // Reward redemptions
  await prisma.rewardRedemption.create({
    data: { employeeId: employees[5].id, rewardId: rew1.id, pointsSpent: 200, status: 'FULFILLED' },
  });

  // 13. Conversion Factors
  console.log('Seeding Conversion Factors...');
  await prisma.conversionFactor.createMany({
    data: [
      { metricType: 'CARBON_KG', value: 0.024, unit: 'trees', label: '🌳 {n} trees saved this month', icon: 'tree' },
      { metricType: 'CARBON_KG', value: 0.008, unit: 'flights', label: '✈️ {n} flights worth of carbon saved', icon: 'plane' },
      { metricType: 'XP_POINTS', value: 0.1, unit: 'hours', label: '🕐 {n} hours volunteered', icon: 'clock' },
    ],
  });

  // 14. Esg Policies
  console.log('Seeding Governance Policies...');
  const policy1 = await prisma.esgPolicy.create({
    data: { title: 'Anti-Bribery and Corruption Policy', description: 'This policy covers the standard regulations regarding corporate gifts, hospitality, and strict code of business conduct for all global operations.', effectiveDate: new Date(), status: 'ACTIVE' },
  });
  const policy2 = await prisma.esgPolicy.create({
    data: { title: 'Sustainable Supply Chain Sourcing Policy', description: 'Mandates that 80% of packaging materials must be biodegradable or post-consumer recycled by Q4 2026.', effectiveDate: new Date(), status: 'ACTIVE' },
  });

  // Policy Acknowledgements
  await prisma.policyAcknowledgement.create({
    data: { employeeId: employees[0].id, policyId: policy1.id, status: 'ACKNOWLEDGED', acknowledgedAt: new Date() },
  });
  await prisma.policyAcknowledgement.create({
    data: { employeeId: employees[1].id, policyId: policy1.id, status: 'PENDING' },
  });

  // 15. Audits & Compliance Issues
  console.log('Seeding Audits & Compliance Issues...');
  const audit1 = await prisma.audit.create({
    data: { title: 'Q2 Manufacturing Waste Audit', departmentId: mfgDept.id, auditorId: mfgManager.id, date: new Date(), status: 'COMPLETED', findings: 'Waste sorting is overall good. Found minor leaks in warehouse chemical containers.' },
  });
  const audit2 = await prisma.audit.create({
    data: { title: 'Annual Logistics Safety Compliance Check', departmentId: logDept.id, auditorId: adminUser.id, date: new Date(), status: 'IN_PROGRESS' },
  });

  const issue1 = await prisma.complianceIssue.create({
    data: { auditId: audit1.id, severity: 'HIGH', description: 'Leak detected in Chemical Containment Unit B3. Repacking required.', ownerId: mfgManager.id, dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), status: 'OPEN', isOverdue: false },
  });
  const issue2 = await prisma.complianceIssue.create({
    data: { auditId: audit1.id, severity: 'CRITICAL', description: 'Overdue MSDS sheets update in Warehouse 2.', ownerId: mfgManager.id, dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), status: 'OPEN', isOverdue: true },
  });

  // 16. Nudges & Department Scores
  console.log('Seeding Nudges...');
  await prisma.nudge.create({
    data: { departmentId: mfgDept.id, type: 'EMISSION_SPIKE', message: 'Manufacturing carbon footprint has increased 32% above rolling 30-day average.' },
  });

  console.log('Precalculating scores...');
  // Initialize scores
  const scoreResults = [
    { departmentId: mfgDept.id, envScore: 68.5, socialScore: 78.0, govScore: 40.0, totalScore: 62.8 },
    { departmentId: logDept.id, envScore: 75.0, socialScore: 50.0, govScore: 80.0, totalScore: 69.0 },
    { departmentId: corDept.id, envScore: 100.0, socialScore: 60.0, govScore: 90.0, totalScore: 85.0 },
  ];

  for (const score of scoreResults) {
    await prisma.departmentScore.create({
      data: {
        departmentId: score.departmentId,
        envScore: score.envScore,
        socialScore: score.socialScore,
        govScore: score.govScore,
        totalScore: score.totalScore,
      },
    });
  }

  console.log('🎉 Seed successful!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
