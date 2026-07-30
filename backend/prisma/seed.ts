// ─── AssetFlow Database Seed ────────────────────────────────────────────────
// Seeds system roles and permissions required for fresh SaaS ERP operation.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding AssetFlow system configuration...\n');

  // ─── 1. System Roles ────────────────────────────────────────────────────────
  console.log('  → Creating system roles...');
  await Promise.all([
    prisma.role.upsert({ where: { name: 'Administrator' }, update: {}, create: { name: 'Administrator' } }),
    prisma.role.upsert({ where: { name: 'Asset Manager' }, update: {}, create: { name: 'Asset Manager' } }),
    prisma.role.upsert({ where: { name: 'Department Head' }, update: {}, create: { name: 'Department Head' } }),
    prisma.role.upsert({ where: { name: 'Employee' }, update: {}, create: { name: 'Employee' } }),
  ]);

  console.log('\n✅ System configuration seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
