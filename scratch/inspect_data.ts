import { PrismaClient } from '../lib/generated/prisma';
const prisma = new PrismaClient();

async function main() {
  const branches = await prisma.branch.findMany();
  console.log('--- BRANCHES ---');
  console.table(branches.map(b => ({ id: b.id, name: b.name })));

  const lastOrders = await prisma.order.findMany({
    orderBy: { date: 'desc' },
    limit: 10,
    select: { id: true, customer: true, total: true, branchId: true }
  });
  console.log('\n--- LAST 10 ORDERS ---');
  console.table(lastOrders);

  const admins = await prisma.admin.findMany({
    select: { id: true, name: true, role: true, branchId: true }
  });
  console.log('\n--- ADMINS ---');
  console.table(admins);
}

main().catch(console.error).finally(() => prisma.$disconnect());
