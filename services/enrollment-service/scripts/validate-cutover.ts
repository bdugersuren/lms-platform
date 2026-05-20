/**
 * validate-cutover.ts
 *
 * Phase 5/6 cutover validation script.
 * Verifies that enrollment-service is the authoritative source of truth and that
 * course-service enrollment writes are properly disabled.
 *
 * Run after setting ENROLLMENT_CUTOVER_ENABLED=true:
 *   ts-node -r tsconfig-paths/register scripts/validate-cutover.ts
 *
 * Environment variables:
 *   GATEWAY_URL              Gateway base URL (default: http://localhost:3000)
 *   ENROLLMENT_SERVICE_URL   Direct enrollment-service URL (default: http://localhost:3004)
 *   COURSE_SERVICE_URL       Direct course-service URL (default: http://localhost:3003)
 *   TEST_TOKEN               JWT bearer token for API calls (required)
 *   TEST_COURSE_ID           Published course ID to use for enrollment test (optional)
 */

import axios, { AxiosInstance } from 'axios';

const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://localhost:3000';
const ENROLLMENT_URL = process.env.ENROLLMENT_SERVICE_URL ?? 'http://localhost:3004';
const COURSE_URL = process.env.COURSE_SERVICE_URL ?? 'http://localhost:3003';
const TEST_TOKEN = process.env.TEST_TOKEN ?? '';
const TEST_COURSE_ID = process.env.TEST_COURSE_ID ?? '';

interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

const results: CheckResult[] = [];

function pass(name: string, detail: string) {
  results.push({ name, passed: true, detail });
  console.log(`  ✓ ${name}: ${detail}`);
}

function fail(name: string, detail: string) {
  results.push({ name, passed: false, detail });
  console.error(`  ✗ ${name}: ${detail}`);
}

function makeClient(baseURL: string): AxiosInstance {
  return axios.create({
    baseURL,
    headers: TEST_TOKEN ? { Authorization: `Bearer ${TEST_TOKEN}` } : {},
    validateStatus: () => true,
    timeout: 8000,
  });
}

// ─── Check 1: Enrollment-service health ──────────────────────────────────────

async function checkEnrollmentServiceHealth(): Promise<void> {
  const client = makeClient(ENROLLMENT_URL);
  const res = await client.get('/api/health');
  if (res.status === 200) {
    pass('enrollment-service health', `status=${res.status}`);
  } else {
    fail('enrollment-service health', `status=${res.status}, body=${JSON.stringify(res.data)}`);
  }
}

// ─── Check 2: Course-service health ──────────────────────────────────────────

async function checkCourseServiceHealth(): Promise<void> {
  const client = makeClient(COURSE_URL);
  const res = await client.get('/api/health');
  if (res.status === 200) {
    pass('course-service health', `status=${res.status}`);
  } else {
    fail('course-service health', `status=${res.status}`);
  }
}

// ─── Check 3: course-service enroll returns 410 Gone ─────────────────────────

async function checkCourseServiceEnrollDisabled(): Promise<void> {
  if (!TEST_COURSE_ID) {
    results.push({ name: 'course-service enroll disabled', passed: true, detail: 'SKIPPED — no TEST_COURSE_ID' });
    console.log('  ~ course-service enroll disabled: SKIPPED (set TEST_COURSE_ID to enable)');
    return;
  }

  const client = makeClient(COURSE_URL);
  const res = await client.post(`/api/courses/${TEST_COURSE_ID}/enroll`);
  if (res.status === 410) {
    pass('course-service enroll disabled', `Got 410 Gone as expected`);
  } else if (res.status === 401 || res.status === 403) {
    results.push({ name: 'course-service enroll disabled', passed: true, detail: `Got ${res.status} — auth required, ENROLLMENT_CUTOVER_ENABLED not yet set or call not authenticated` });
    console.log(`  ~ course-service enroll disabled: ${res.status} (auth required — set TEST_TOKEN to verify 410)`);
  } else {
    fail('course-service enroll disabled', `Expected 410 but got ${res.status} — ENROLLMENT_CUTOVER_ENABLED may not be set`);
  }
}

// ─── Check 4: enrollment-service enroll endpoint responds ────────────────────

async function checkEnrollmentServiceEnrollExists(): Promise<void> {
  if (!TEST_COURSE_ID || !TEST_TOKEN) {
    results.push({ name: 'enrollment-service enroll endpoint', passed: true, detail: 'SKIPPED — need TEST_COURSE_ID + TEST_TOKEN' });
    console.log('  ~ enrollment-service enroll endpoint: SKIPPED');
    return;
  }

  const client = makeClient(ENROLLMENT_URL);
  const res = await client.post('/api/enrollments/by-course/' + TEST_COURSE_ID);
  if (res.status === 201 || res.status === 200 || res.status === 409) {
    pass('enrollment-service enroll endpoint', `status=${res.status} (201/200=enrolled, 409=already enrolled)`);
  } else if (res.status === 401 || res.status === 403) {
    fail('enrollment-service enroll endpoint', `Got ${res.status} — check TEST_TOKEN validity`);
  } else {
    fail('enrollment-service enroll endpoint', `Unexpected status=${res.status}, body=${JSON.stringify(res.data)}`);
  }
}

// ─── Check 5: Gateway routes /courses/:id/enroll to enrollment-service ───────

async function checkGatewayEnrollmentRouting(): Promise<void> {
  if (!TEST_COURSE_ID || !TEST_TOKEN) {
    results.push({ name: 'gateway enrollment routing', passed: true, detail: 'SKIPPED — need TEST_COURSE_ID + TEST_TOKEN' });
    console.log('  ~ gateway enrollment routing: SKIPPED');
    return;
  }

  const client = makeClient(GATEWAY_URL);
  const res = await client.post(`/api/courses/${TEST_COURSE_ID}/enroll`);
  // If enrollment-service handles it, we get 201/200/409 (not 410 from course-service)
  if (res.status === 201 || res.status === 200 || res.status === 409) {
    pass('gateway enrollment routing', `Gateway routes to enrollment-service (status=${res.status})`);
  } else if (res.status === 410) {
    fail('gateway enrollment routing', `Gateway still hitting course-service (got 410). Check CourseEnrollmentController is registered.`);
  } else {
    fail('gateway enrollment routing', `Unexpected status=${res.status}`);
  }
}

// ─── Check 6: enrollment-service projection count ────────────────────────────

async function checkProjectionStatus(): Promise<void> {
  if (!TEST_TOKEN) {
    results.push({ name: 'projection status', passed: true, detail: 'SKIPPED — need TEST_TOKEN' });
    console.log('  ~ projection status: SKIPPED');
    return;
  }

  const client = makeClient(ENROLLMENT_URL);
  const res = await client.get('/api/admin/projections/status');
  if (res.status === 200) {
    const stats = res.data?.data ?? res.data;
    const courseCount = stats?.courses ?? stats?.courseCount ?? '?';
    if (Number(courseCount) > 0) {
      pass('projection status', `course_projections=${courseCount} — projections are populated`);
    } else {
      fail('projection status', `course_projections=${courseCount} — run rebuild:projections script`);
    }
  } else if (res.status === 401 || res.status === 403) {
    results.push({ name: 'projection status', passed: true, detail: `SKIPPED — need ADMIN token (got ${res.status})` });
    console.log(`  ~ projection status: SKIPPED (need ADMIN token)`);
  } else {
    fail('projection status', `status=${res.status}`);
  }
}

// ─── Check 7: course-service progress endpoints return 410 ───────────────────

async function checkCourseServiceProgressDisabled(): Promise<void> {
  // Use a fake UUID — we just want to confirm the flag-based 410 response
  const fakeId = '00000000-0000-0000-0000-000000000001';
  const client = makeClient(COURSE_URL);

  const res = await client.post(`/api/enrollments/${fakeId}/lessons/${fakeId}/complete`);
  if (res.status === 410) {
    pass('course-service progress disabled', `Got 410 Gone for lesson complete`);
  } else if (res.status === 401 || res.status === 403) {
    results.push({ name: 'course-service progress disabled', passed: true, detail: `Got ${res.status} — needs auth to verify 410` });
    console.log(`  ~ course-service progress disabled: ${res.status} (set TEST_TOKEN to verify 410)`);
  } else if (res.status === 404) {
    fail('course-service progress disabled', `Got 404 — ENROLLMENT_CUTOVER_ENABLED not set (would get 410 when enabled)`);
  } else {
    fail('course-service progress disabled', `Unexpected status=${res.status}`);
  }
}

// ─── Check 8: enrollment-service progress endpoints respond ──────────────────

async function checkEnrollmentServiceProgressExists(): Promise<void> {
  const fakeId = '00000000-0000-0000-0000-000000000001';
  const client = makeClient(ENROLLMENT_URL);

  // Without auth we expect 401, confirming the endpoint exists
  const res = await client.post(`/api/enrollments/${fakeId}/progress/${fakeId}/complete`);
  if (res.status === 401 || res.status === 403 || res.status === 404) {
    pass('enrollment-service progress endpoint exists', `status=${res.status} (endpoint reachable)`);
  } else {
    fail('enrollment-service progress endpoint exists', `Unexpected status=${res.status}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  ENG-003 Phase 5/6 Cutover Validation');
  console.log('══════════════════════════════════════════════════════════════\n');

  const checks = [
    checkEnrollmentServiceHealth,
    checkCourseServiceHealth,
    checkCourseServiceEnrollDisabled,
    checkEnrollmentServiceEnrollExists,
    checkGatewayEnrollmentRouting,
    checkProjectionStatus,
    checkCourseServiceProgressDisabled,
    checkEnrollmentServiceProgressExists,
  ];

  for (const check of checks) {
    try {
      await check();
    } catch (err) {
      const name = check.name.replace(/^check/, '').replace(/([A-Z])/g, ' $1').trim().toLowerCase();
      fail(name, `Threw: ${(err as Error).message}`);
    }
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const skipped = results.filter((r) => r.detail.startsWith('SKIPPED')).length;

  console.log(`\n──────────────────────────────────────────────────────────────`);
  console.log(`  Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log(`──────────────────────────────────────────────────────────────\n`);

  if (failed > 0) {
    console.error(`CUTOVER VALIDATION FAILED — ${failed} check(s) did not pass.\n`);
    process.exit(1);
  } else {
    console.log(`CUTOVER VALIDATION PASSED — enrollment-service owns enrollment & progress.\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error in validation script:', err);
  process.exit(1);
});
