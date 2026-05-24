/**
 * Enrollment Service — E2E Tests
 *
 * Requirements: docker-compose stack must be running, databases migrated and seeded.
 *   docker compose up -d postgres redis rabbitmq auth-service course-service
 *   cd services/enrollment-service && pnpm prisma migrate deploy && pnpm seed
 *   AUTH_SERVICE_URL=http://localhost:3001 pnpm test:e2e
 *
 * The tests obtain real JWT tokens from auth-service, then exercise the
 * enrollment endpoints to verify the full HTTP layer end-to-end.
 */

import * as request from 'supertest';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import axios from 'axios';

// ── Helpers ───────────────────────────────────────────────────────────────────

const AUTH_URL = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';

async function getToken(email: string, password: string): Promise<string> {
  const res = await axios.post(`${AUTH_URL}/api/auth/login`, { email, password });
  return res.data.data.accessToken as string;
}

// ── App setup ─────────────────────────────────────────────────────────────────

let app: INestApplication;
let studentToken: string;
let adminToken: string;

// A known seeded course ID — update if seed data changes
const SEEDED_COURSE_ID = process.env.E2E_COURSE_ID ?? '';

beforeAll(async () => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = module.createNestApplication();
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.init();

  // Obtain tokens from the running auth-service
  [studentToken, adminToken] = await Promise.all([
    getToken('student1@know.mn', 'Student!1234'),
    getToken('admin@know.mn', 'Admin!1234'),
  ]);
});

afterAll(async () => {
  await app.close();
});

// ── GET /api/enrollments/my ────────────────────────────────────────────────────

describe('GET /api/enrollments/my', () => {
  it('returns 200 with enrollment list for authenticated student', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/enrollments/my')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('returns 401 without authorization header', async () => {
    await request(app.getHttpServer())
      .get('/api/enrollments/my')
      .expect(401);
  });
});

// ── POST /api/enrollments ─────────────────────────────────────────────────────

describe('POST /api/enrollments', () => {
  it('returns 400 when courseId is missing', async () => {
    await request(app.getHttpServer())
      .post('/api/enrollments')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({})
      .expect(400);
  });

  it('returns 400 when courseId is not a valid UUID', async () => {
    await request(app.getHttpServer())
      .post('/api/enrollments')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ courseId: 'not-a-uuid' })
      .expect(400);
  });

  it('returns 401 without authorization header', async () => {
    await request(app.getHttpServer())
      .post('/api/enrollments')
      .send({ courseId: '00000000-0000-0000-0000-000000000001' })
      .expect(401);
  });

  // Skipped when no seeded course ID is available in CI without seed data
  (SEEDED_COURSE_ID ? it : it.skip)(
    'enrolls student in course and returns enrollment object (idempotent)',
    async () => {
      const res = await request(app.getHttpServer())
        .post('/api/enrollments')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ courseId: SEEDED_COURSE_ID })
        .expect(200);

      expect(res.body.data).toMatchObject({
        courseId: SEEDED_COURSE_ID,
        status: expect.any(String),
      });

      // Second call must be idempotent — no 409 or 500
      await request(app.getHttpServer())
        .post('/api/enrollments')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ courseId: SEEDED_COURSE_ID })
        .expect(200);
    },
  );
});

// ── GET /api/enrollments/check ────────────────────────────────────────────────

describe('GET /api/enrollments/check', () => {
  it('returns 401 without authorization header', async () => {
    await request(app.getHttpServer())
      .get('/api/enrollments/check')
      .query({ courseId: '00000000-0000-0000-0000-000000000001' })
      .expect(401);
  });

  it('returns 400 when courseId query param is missing', async () => {
    await request(app.getHttpServer())
      .get('/api/enrollments/check')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(400);
  });

  it('returns enrolled=false for a non-enrolled course', async () => {
    const fakeCourseId = '00000000-0000-0000-0000-000000000099';
    const res = await request(app.getHttpServer())
      .get('/api/enrollments/check')
      .set('Authorization', `Bearer ${studentToken}`)
      .query({ courseId: fakeCourseId })
      .expect(200);

    expect(res.body.data.enrolled).toBe(false);
  });
});

// ── GET /api/enrollments/:id ──────────────────────────────────────────────────

describe('GET /api/enrollments/:id', () => {
  it('returns 401 without authorization header', async () => {
    await request(app.getHttpServer())
      .get('/api/enrollments/00000000-0000-0000-0000-000000000001')
      .expect(401);
  });

  it('returns 404 for non-existent enrollment UUID', async () => {
    await request(app.getHttpServer())
      .get('/api/enrollments/00000000-0000-0000-0000-000000000099')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(404);
  });
});

// ── GET /api/health ───────────────────────────────────────────────────────────

describe('GET /api/health', () => {
  it('returns 200 when service is healthy', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);
  });
});
