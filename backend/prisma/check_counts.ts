import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.count();
  const orgs = await prisma.organization.count();
  const depts = await prisma.department.count();
  const assets = await prisma.asset.count();
  const roles = await prisma.role.count();

  console.log('--- Database Record Counts ---');
  console.log(`Users:         ${users}`);
  console.log(`Organizations: ${orgs}`);
  console.log(`Departments:   ${depts}`);
  console.log(`Assets:        ${assets}`);
  console.log(`System Roles:  ${roles}`);
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
