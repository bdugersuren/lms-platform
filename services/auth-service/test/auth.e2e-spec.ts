/**
 * Auth Service — E2E Tests
 *
 * Requirements: docker-compose stack must be running before executing these tests.
 *   docker compose up -d postgres redis rabbitmq
 *   cd services/auth-service && pnpm prisma migrate deploy && pnpm seed
 *   pnpm test:e2e
 */

import * as request from 'supertest';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

// ── App setup ─────────────────────────────────────────────────────────────────

let app: INestApplication;
let accessToken: string;
let refreshToken: string;

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
});

afterAll(async () => {
  await app.close();
});

// ── POST /api/auth/register ───────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  const uniqueEmail = `e2e-${Date.now()}@test.example.com`;

  it('returns 201 with tokens on successful registration', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: uniqueEmail, password: 'TestPass!1234' })
      .expect(201);

    expect(res.body.data).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      tokenType: 'Bearer',
    });
  });

  it('returns 409 when email already exists', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: uniqueEmail, password: 'TestPass!1234' })
      .expect(409);
  });

  it('returns 400 for invalid email format', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'TestPass!1234' })
      .expect(400);
  });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('returns 200 with tokens for valid credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@know.mn', password: 'Admin!1234' })
      .expect(200);

    expect(res.body.data).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      tokenType: 'Bearer',
      expiresIn: expect.any(Number),
    });

    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('returns 401 for wrong password', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@know.mn', password: 'WrongPassword!' })
      .expect(401);
  });

  it('returns 401 for non-existent user', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'SomePass!1234' })
      .expect(401);
  });

  it('returns 400 for missing required fields', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@know.mn' })
      .expect(400);
  });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  it('returns 200 with user profile for valid access token', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data).toMatchObject({
      sub: expect.any(String),
      email: 'admin@know.mn',
      role: expect.any(String),
    });
  });

  it('returns 401 without authorization header', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .expect(401);
  });

  it('returns 401 with malformed token', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-valid-token')
      .expect(401);
  });
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────────

describe('POST /api/auth/refresh', () => {
  it('returns 200 with new token pair from valid refresh token', async () => {
    // First login to get a fresh pair
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'student1@know.mn', password: 'Student!1234' })
      .expect(200);

    const studentRefreshToken = loginRes.body.data.refreshToken;

    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${studentRefreshToken}`)
      .send({ refreshToken: studentRefreshToken })
      .expect(200);

    expect(res.body.data).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
    // New tokens must differ from the original
    expect(res.body.data.accessToken).not.toBe(studentRefreshToken);
  });

  it('returns 401 with invalid refresh token', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Authorization', 'Bearer invalid-refresh-token')
      .send({ refreshToken: 'invalid-refresh-token' })
      .expect(401);
  });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('returns 200 and subsequent /me calls return 401', async () => {
    // Get a fresh token pair for logout test
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'student1@know.mn', password: 'Student!1234' })
      .expect(200);

    const token = loginRes.body.data.accessToken;

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // The access token should now be blacklisted
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });
});
