// ─── Purge All Demo / Mock Data Script ─────────────────────────────────────
// Cleans all development/demo business records from PostgreSQL while retaining system Roles.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function purgeDemoData() {
  console.log('🧹 Purging all demo and sample data from PostgreSQL...\n');

  console.log('  → Deleting Notifications...');
  await prisma.notification.deleteMany();

  console.log('  → Deleting Activity Logs...');
  await prisma.activityLog.deleteMany();

  console.log('  → Deleting Reports...');
  await prisma.report.deleteMany();

  console.log('  → Deleting Audit Items...');
  await prisma.auditItem.deleteMany();

  console.log('  → Deleting Audit Cycles...');
  await prisma.auditCycle.deleteMany();

  console.log('  → Deleting Maintenance Requests...');
  await prisma.maintenanceRequest.deleteMany();

  console.log('  → Deleting Bookings...');
  await prisma.booking.deleteMany();

  console.log('  → Deleting Transfer Requests...');
  await prisma.transferRequest.deleteMany();

  console.log('  → Deleting Asset Allocations...');
  await prisma.assetAllocation.deleteMany();

  console.log('  → Deleting Asset Requests...');
  await prisma.assetRequest.deleteMany();

  console.log('  → Deleting Asset Histories...');
  await prisma.assetHistory.deleteMany();

  console.log('  → Deleting Assets...');
  await prisma.asset.deleteMany();

  console.log('  → Deleting Custom Fields...');
  await prisma.customField.deleteMany();

  console.log('  → Deleting Asset Categories...');
  await prisma.assetCategory.deleteMany();

  console.log('  → Unlinking Users from Departments & Managers...');
  await prisma.user.updateMany({ data: { departmentId: null, managerId: null } });

  console.log('  → Deleting Departments...');
  await prisma.department.deleteMany();

  console.log('  → Deleting Users...');
  await prisma.user.deleteMany();

  console.log('  → Deleting Organizations...');
  await prisma.organization.deleteMany();

  console.log('\n✅ Demo data purge complete! Database is now a clean fresh SaaS ERP state.\n');

  console.log('  → Verifying System Roles...');
  await Promise.all([
    prisma.role.upsert({ where: { name: 'Administrator' }, update: {}, create: { name: 'Administrator' } }),
    prisma.role.upsert({ where: { name: 'Asset Manager' }, update: {}, create: { name: 'Asset Manager' } }),
    prisma.role.upsert({ where: { name: 'Department Head' }, update: {}, create: { name: 'Department Head' } }),
    prisma.role.upsert({ where: { name: 'Employee' }, update: {}, create: { name: 'Employee' } }),
  ]);
  console.log('✅ System Roles verified!');
}

purgeDemoData()
  .catch((e) => {
    console.error('❌ Error purging demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
