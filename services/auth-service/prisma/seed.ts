import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Fixed seed IDs — same across all services for cross-service consistency
export const SEED_IDS = {
  SUPER_ADMIN:  'a0000001-0000-0000-0000-000000000001',
  ADMIN_1:      'a0000001-0000-0000-0000-000000000002',
  INSTRUCTOR_1: 'a0000001-0000-0000-0000-000000000003',
  INSTRUCTOR_2: 'a0000001-0000-0000-0000-000000000004',
  STUDENT_1:    'a0000001-0000-0000-0000-000000000005',
  STUDENT_2:    'a0000001-0000-0000-0000-000000000006',
  STUDENT_3:    'a0000001-0000-0000-0000-000000000007',
};

const ADMIN_PASS   = 'Admin1234!';
const STUDENT_PASS = 'Student1234!';

const USERS: Array<{
  id: string;
  email: string;
  role: UserRole;
  pass: string;
}> = [
  { id: SEED_IDS.SUPER_ADMIN,  email: 'superadmin@lms.mn',   role: 'SUPER_ADMIN',  pass: ADMIN_PASS },
  { id: SEED_IDS.ADMIN_1,      email: 'admin@lms.mn',        role: 'ADMIN',        pass: ADMIN_PASS },
  { id: SEED_IDS.INSTRUCTOR_1, email: 'instructor1@lms.mn',  role: 'INSTRUCTOR',   pass: ADMIN_PASS },
  { id: SEED_IDS.INSTRUCTOR_2, email: 'instructor2@lms.mn',  role: 'INSTRUCTOR',   pass: ADMIN_PASS },
  { id: SEED_IDS.STUDENT_1,    email: 'student1@lms.mn',     role: 'STUDENT',      pass: STUDENT_PASS },
  { id: SEED_IDS.STUDENT_2,    email: 'student2@lms.mn',     role: 'STUDENT',      pass: STUDENT_PASS },
  { id: SEED_IDS.STUDENT_3,    email: 'student3@lms.mn',     role: 'STUDENT',      pass: STUDENT_PASS },
];

async function main() {
  console.log('Seeding auth-service...');

  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.pass, 12);
    await prisma.user.upsert({
      where:  { email: u.email },
      update: {},
      create: { id: u.id, email: u.email, passwordHash, role: u.role, isActive: true },
    });
    console.log(`  ✓ ${u.role.padEnd(12)} ${u.email}`);
  }

  console.log('\nDefault passwords:');
  console.log('  Admin / Instructor : Admin1234!');
  console.log('  Student            : Student1234!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
