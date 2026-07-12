import prisma from './lib/prisma';

async function main() {
  const parts = await prisma.employeeParticipation.findMany({
    include: {
      employee: true,
      activity: true
    }
  });
  console.log('--- Employee Participations ---');
  parts.forEach(p => {
    console.log(`ID: ${p.id}, Employee: ${p.employee.name}, Activity: ${p.activity.title}, Status: ${p.approvalStatus}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
