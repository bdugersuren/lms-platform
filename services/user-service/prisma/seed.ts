import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// These UUIDs MUST match auth-service/prisma/seed.ts SEED_IDS.
// They are intentionally duplicated here (cross-service boundary — no shared import).
const SEED_IDS = {
  SUPER_ADMIN:  'a0000001-0000-0000-0000-000000000001',
  ADMIN_1:      'a0000001-0000-0000-0000-000000000002',
  INSTRUCTOR_1: 'a0000001-0000-0000-0000-000000000003',
  INSTRUCTOR_2: 'a0000001-0000-0000-0000-000000000004',
  STUDENT_1:    'a0000001-0000-0000-0000-000000000005',
  STUDENT_2:    'a0000001-0000-0000-0000-000000000006',
  STUDENT_3:    'a0000001-0000-0000-0000-000000000007',
};

const PROFILES: Array<{
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
}> = [
  { id: SEED_IDS.SUPER_ADMIN,  displayName: 'Super Admin',    firstName: 'Super',   lastName: 'Admin' },
  { id: SEED_IDS.ADMIN_1,      displayName: 'Admin',          firstName: 'Platform', lastName: 'Admin' },
  { id: SEED_IDS.INSTRUCTOR_1, displayName: 'Bat-Erdene B.',  firstName: 'Bat-Erdene', lastName: 'Batbold' },
  { id: SEED_IDS.INSTRUCTOR_2, displayName: 'Oyunaa D.',      firstName: 'Oyunaa',  lastName: 'Dorj' },
  { id: SEED_IDS.STUDENT_1,    displayName: 'Ankhaa N.',      firstName: 'Ankhaa',  lastName: 'Naran' },
  { id: SEED_IDS.STUDENT_2,    displayName: 'Gantulga M.',    firstName: 'Gantulga', lastName: 'Munkh' },
  { id: SEED_IDS.STUDENT_3,    displayName: 'Solongo T.',     firstName: 'Solongo', lastName: 'Tserenpuntsag' },
];

async function main() {
  console.log('Seeding user-service...');

  for (const p of PROFILES) {
    await prisma.userProfile.upsert({
      where:  { id: p.id },
      update: {},
      create: {
        id:          p.id,
        displayName: p.displayName,
        firstName:   p.firstName,
        lastName:    p.lastName,
        locale:      'mn',
        timezone:    'Asia/Ulaanbaatar',
      },
    });
    console.log(`  ✓ ${p.displayName}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
