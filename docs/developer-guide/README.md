# LMS Platform — Developer Guide

> **Stack:** NestJS · TypeScript · Prisma · PostgreSQL · RabbitMQ · Redis · Next.js · Docker Compose

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Repository Structure](#2-repository-structure)
3. [Microservice Inventory](#3-microservice-inventory)
4. [Docker Compose Setup](#4-docker-compose-setup)
5. [Environment Configuration](#5-environment-configuration)
6. [API Gateway](#6-api-gateway)
7. [Service-to-Service Communication](#7-service-to-service-communication)
8. [RabbitMQ Event System](#8-rabbitmq-event-system)
9. [Redis Usage](#9-redis-usage)
10. [Prisma & Database Structure](#10-prisma--database-structure)
11. [Shared Packages](#11-shared-packages)
12. [Authentication & Authorization](#12-authentication--authorization)
13. [Development Workflow](#13-development-workflow)
14. [Testing](#14-testing)
15. [Deployment](#15-deployment)
16. [Coding Standards](#16-coding-standards)
17. [Troubleshooting](#17-troubleshooting)

---

## 1. Architecture Overview

The platform is an **event-driven microservice monorepo** where each service is independently deployable and owns its own data store. Services never share databases. All async communication flows through a RabbitMQ topic exchange.

```
┌─────────────────────────────────────────────────────────────────┐
│                         NGINX (port 80)                         │
│   /api  →  gateway:3000          /  →  web:3002                 │
└────────────────────┬────────────────────────────────────────────┘
                     │ HTTP proxy
          ┌──────────▼──────────┐
          │   API Gateway :3000  │  JWT validation · rate limiting
          │   (Fastify adapter)  │  route forwarding · Swagger
          └──┬──┬──┬──┬──┬──┬──┘
             │  │  │  │  │  │   HTTP (synchronous)
   ┌─────────┘  │  │  │  │  └─────────────────────┐
   ▼            ▼  │  │  ▼                         ▼
auth:3001  user:3014│  │ course:3003          payment:3008
                    │  │
              quiz:3005  enrollment:3004
              wallet:3007 assignment:3006
              ai:3009   notification:3010
              media:3011 certificate:3012
              analytics:3013 audit:3015

          All services publish/subscribe via:
          ┌─────────────────────────────────┐
          │  RabbitMQ  lms.events  (topic)  │
          └─────────────────────────────────┘
                     │         │
          ┌──────────┘         └──────────┐
          ▼                               ▼
   PostgreSQL :5432                  Redis :6379
   (15 isolated databases)      (tokens · rate limits)
```

*Ports shown are internal container ports. See [`docs/generated/current-architecture.md`](../generated/current-architecture.md) for the complete authoritative service list.*

### Design Principles

| Principle | How It Is Applied |
|-----------|-------------------|
| Clean Architecture | Domain layer has no framework imports; use cases depend on repository interfaces |
| SOLID | Single-responsibility per service; open/closed via NestJS modules |
| Domain-Driven Design | Aggregates per service (Course, Enrollment, Payment, …) |
| Event-Driven | Async state changes flow through RabbitMQ; no direct DB cross-reads |
| Service Isolation | Each service: its own DB, its own `.env`, its own Dockerfile |
| Stateless services | Runtime state in PostgreSQL or Redis; no in-process caches |

---

## 2. Repository Structure

```
lms-platform/
├── docker-compose.yml          # Full stack orchestration
├── .env / .env.example         # Root-level shared env vars
├── CLAUDE.md                   # Architecture rules (authoritative)
│
├── gateway/                    # API Gateway (Fastify, NestJS)
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── auth/               # JWT validation middleware
│       ├── proxy/              # Route forwarding to upstream services
│       ├── media/              # Direct file upload handling
│       └── health/
│
├── services/
│   ├── auth-service/
│   ├── user-service/
│   ├── course-service/
│   ├── enrollment-service/
│   ├── quiz-service/
│   ├── assignment-service/
│   ├── wallet-service/
│   ├── payment-service/
│   ├── ai-service/
│   ├── notification-service/
│   ├── media-service/
│   ├── certificate-service/
│   └── analytics-service/
│
├── packages/                   # Shared pnpm workspace packages
│   ├── shared-types/           # TypeScript interfaces & enums
│   ├── shared-config/          # NestJS ConfigFactory functions
│   ├── shared-utils/           # Logger, pagination, hash, api-response
│   ├── shared-auth/            # JWT strategy, RolesGuard, decorators
│   └── shared-events/          # RabbitMQ event type definitions
│
├── web/                        # Next.js 14 frontend (App Router)
│
├── infra/
│   ├── nginx/nginx.conf
│   ├── postgres/init.sql       # Creates all 15 databases
│   ├── rabbitmq/definitions.json
│   └── redis/
│
├── docs/
│   ├── user-guide/
│   ├── teacher-guide/
│   ├── admin-guide/
│   └── developer-guide/        # ← you are here
│
└── scripts/
    ├── bootstrap.sh
    ├── migrate.sh
    └── seed.sh
```

### Individual Service Layout

Every service follows the same internal structure:

```
services/course-service/
├── Dockerfile
├── package.json
├── tsconfig.json
├── .env.example
├── prisma/
│   ├── schema.prisma           # Service-owned schema
│   └── migrations/
└── src/
    ├── main.ts                 # Bootstrap (HTTP + optional microservice)
    ├── app.module.ts           # Root module
    ├── {domain}/               # e.g. course/, module/, lesson/
    │   ├── {domain}.controller.ts
    │   ├── {domain}.service.ts
    │   ├── {domain}.module.ts
    │   ├── dto/
    │   └── entities/
    ├── events/                 # RabbitMQ listeners (if any)
    │   ├── event-listener.service.ts
    │   └── events.module.ts
    ├── prisma/
    │   └── prisma.service.ts
    └── health/
        └── health.controller.ts
```

---

## 3. Microservice Inventory

> **Canonical reference:** [`docs/generated/current-architecture.md`](../generated/current-architecture.md) is auto-generated from `config/services.yml` and `docker-compose.yml` and is always up to date. The table below is a summary — if values differ, the generated file wins.

| Service | Internal Port | Compose Profile | Database | Primary Responsibility |
|---------|:---:|:---:|----------|----------------------|
| **gateway** | 3000 | core | — | JWT validation, rate limiting, route forwarding |
| **auth-service** | 3001 | core | `auth_db` | Login, register, JWT, refresh tokens, OAuth |
| **user-service** | 3014 | core | `user_db` | User profiles, display name, avatar, preferences |
| **tenant-service** | 3016 | core | `tenant_db` | Tenants, custom domains, branding, feature flags |
| **course-service** | 3003 | core | `course_db` | Courses, modules, lessons, curriculum |
| **enrollment-service** | 3004 | core | `enrollment_db` | Enrollments, progress, completion |
| **quiz-service** | 3005 | learn | `quiz_db` | Quizzes, adaptive exams, question bank |
| **assignment-service** | 3006 | learn | `assignment_db` | Assignments, submissions, grading |
| **wallet-service** | 3007 | finance | `wallet_db` | Wallet, transactions, revenue sharing |
| **payment-service** | 3008 | finance | `payment_db` | QPay, SocialPay, Mock, webhooks |
| **ai-service** | 3009 | ai | `ai_db` | Essay scoring, AI tutor, Ollama inference |
| **notification-service** | 3010 | ops | `notification_db` | Email, SMS, push, in-app notifications |
| **media-service** | 3011 | ops | `media_db` | Video upload, transcoding, subtitles (MinIO storage) |
| **certificate-service** | 3012 | ops | `certificate_db` | Certificate generation, QR verify (MinIO storage) |
| **analytics-service** | 3013 | ops | `analytics_db` | KPI, reports, event log |
| **audit-service** | 3015 | ops | `audit_db` | Immutable audit logs for compliance |

For the complete port allocation, dependency graph, and environment variable inventory see [`docs/generated/current-architecture.md`](../generated/current-architecture.md).

---

## 4. Docker Compose Setup

### Infrastructure Services

The following infrastructure services start first. App services declare `depends_on` with `condition: service_healthy`.

```yaml
# postgres
postgres:
  image: postgres:16-alpine
  ports: ["5432:5432"]
  environment:
    POSTGRES_USER: lms
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    POSTGRES_DB: lms
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - ./infra/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U lms"]

# redis
redis:
  image: redis:7-alpine
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
  ports: ["6379:6379"]

# rabbitmq
rabbitmq:
  image: rabbitmq:3.13-management-alpine
  ports: ["5672:5672", "15672:15672"]
  volumes:
    - ./infra/rabbitmq/definitions.json:/etc/rabbitmq/definitions.json:ro
  healthcheck:
    test: rabbitmq-diagnostics -q ping

# minio
minio:
  image: minio/minio:latest
  command: server /data --console-address ":9001"
  ports: ["9000:9000", "9001:9001"]

# ollama (local LLM)
ollama:
  image: ollama/ollama:latest
  volumes: [ollama_data:/root/.ollama]
```

### App Service Pattern

Every backend service follows this pattern:

```yaml
course-service:
  build:
    context: .
    dockerfile: services/course-service/Dockerfile
  env_file: - .env
  environment:
    PORT: 3003
    SERVICE_NAME: course-service
    DATABASE_URL: postgresql://lms:${POSTGRES_PASSWORD}@postgres:5432/course_db
  depends_on:
    postgres: { condition: service_healthy }
    rabbitmq: { condition: service_healthy }
  networks: [lms-net]
  restart: unless-stopped
```

### Starting the Stack

```bash
# First time — build all images
docker compose build

# Start infrastructure only (for local service development)
docker compose up -d postgres redis rabbitmq minio

# Start everything
docker compose up -d

# View logs for a single service
docker compose logs -f course-service

# Restart one service after code change
docker compose build course-service && docker compose up -d course-service

# Stop everything and remove volumes (full reset)
docker compose down -v
```

### Typical Startup Order

```
postgres ──► auth-service
          ─► user-service
          ─► course-service ──► enrollment-service
          ─► quiz-service
          ─► assignment-service
          ─► wallet-service
          ─► payment-service
rabbitmq ──► (all services that publish or consume events)
redis    ──► gateway, auth-service
minio    ──► media-service, certificate-service
ollama   ──► ai-service
```

---

## 5. Environment Configuration

Copy `.env.example` to `.env` before starting:

```bash
cp .env.example .env
# Edit .env — set real secrets for JWT_SECRET, POSTGRES_PASSWORD, etc.
```

### Key Variables

```bash
# ── Database ──────────────────────────────────────────────────────
POSTGRES_USER=lms
POSTGRES_PASSWORD=your_strong_password_here

# Per-service DATABASE_URL (each service reads its own)
AUTH_DATABASE_URL=postgresql://lms:${POSTGRES_PASSWORD}@postgres:5432/auth_db
USER_DATABASE_URL=postgresql://lms:${POSTGRES_PASSWORD}@postgres:5432/user_db
COURSE_DATABASE_URL=postgresql://lms:${POSTGRES_PASSWORD}@postgres:5432/course_db
ENROLLMENT_DATABASE_URL=postgresql://lms:${POSTGRES_PASSWORD}@postgres:5432/enrollment_db
QUIZ_DATABASE_URL=postgresql://lms:${POSTGRES_PASSWORD}@postgres:5432/quiz_db
ASSIGNMENT_DATABASE_URL=postgresql://lms:${POSTGRES_PASSWORD}@postgres:5432/assignment_db
WALLET_DATABASE_URL=postgresql://lms:${POSTGRES_PASSWORD}@postgres:5432/wallet_db
PAYMENT_DATABASE_URL=postgresql://lms:${POSTGRES_PASSWORD}@postgres:5432/payment_db
AI_DATABASE_URL=postgresql://lms:${POSTGRES_PASSWORD}@postgres:5432/ai_db
NOTIFICATION_DATABASE_URL=postgresql://lms:${POSTGRES_PASSWORD}@postgres:5432/notification_db
MEDIA_DATABASE_URL=postgresql://lms:${POSTGRES_PASSWORD}@postgres:5432/media_db
CERTIFICATE_DATABASE_URL=postgresql://lms:${POSTGRES_PASSWORD}@postgres:5432/certificate_db
ANALYTICS_DATABASE_URL=postgresql://lms:${POSTGRES_PASSWORD}@postgres:5432/analytics_db

# ── Redis ────────────────────────────────────────────────────────
REDIS_HOST=redis
REDIS_PORT=6379

# ── RabbitMQ ─────────────────────────────────────────────────────
RABBITMQ_URL=amqp://lms:your_rabbitmq_password@rabbitmq:5672
RABBITMQ_EXCHANGE=lms.events

# ── JWT ──────────────────────────────────────────────────────────
JWT_SECRET=your-super-secret-key-minimum-32-characters-long
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret-minimum-32-characters-long
JWT_REFRESH_EXPIRES_IN=7d

# ── MinIO ────────────────────────────────────────────────────────
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=lms-media
MINIO_USE_SSL=false

# ── AI / Ollama ──────────────────────────────────────────────────
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=llama3.2
OLLAMA_TIMEOUT_MS=120000

# ── Gateway upstream URLs ────────────────────────────────────────
AUTH_SERVICE_URL=http://auth-service:3001
USER_SERVICE_URL=http://user-service:3014
TENANT_SERVICE_URL=http://tenant-service:3016
COURSE_SERVICE_URL=http://course-service:3003
ENROLLMENT_SERVICE_URL=http://enrollment-service:3004
QUIZ_SERVICE_URL=http://quiz-service:3005
ASSIGNMENT_SERVICE_URL=http://assignment-service:3006
WALLET_SERVICE_URL=http://wallet-service:3007
PAYMENT_SERVICE_URL=http://payment-service:3008
AI_SERVICE_URL=http://ai-service:3009
NOTIFICATION_SERVICE_URL=http://notification-service:3010
MEDIA_SERVICE_URL=http://media-service:3011
CERTIFICATE_SERVICE_URL=http://certificate-service:3012
ANALYTICS_SERVICE_URL=http://analytics-service:3013
AUDIT_SERVICE_URL=http://audit-service:3015

# ── Rate limiting (gateway) ──────────────────────────────────────
THROTTLE_TTL=60000    # window in ms
THROTTLE_LIMIT=100    # max requests per window
```

### Loading Config in NestJS

Each service uses `@nestjs/config` with Joi validation:

```typescript
// app.module.ts
ConfigModule.forRoot({
  isGlobal: true,
  load: [appConfig, databaseConfig, rabbitmqConfig],
  validationSchema: Joi.object({
    PORT: Joi.number().default(3000),
    DATABASE_URL: Joi.string().uri().required(),
    RABBITMQ_URL: Joi.string().uri().required(),
    JWT_SECRET: Joi.string().min(32).required(),
  }),
}),
```

---

## 6. API Gateway

The gateway is the **single entry point** for all client traffic. It handles:

- JWT verification (no business logic)
- Rate limiting (ThrottlerModule, 100 req/60 s by default)
- Route forwarding via `HttpModule` to upstream services
- Direct multipart upload handling for media
- Swagger aggregation at `/docs` (development only)

### Bootstrap

```typescript
// gateway/src/main.ts
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter({ logger: false, bodyLimit: 500 * 1024 * 1024 }),
);

await app.register(require('@fastify/multipart'), {
  limits: { fileSize: 500 * 1024 * 1024, files: 1 },
});

app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
app.setGlobalPrefix('api');
app.enableVersioning({ type: VersioningType.URI });

// Swagger available at /docs (non-production)
if (process.env.NODE_ENV !== 'production') {
  const config = new DocumentBuilder()
    .setTitle('LMS API')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
}

await app.listen(3000, '0.0.0.0');
```

### Request Flow

```
Client
  │
  ▼ HTTP
NGINX :80
  │  /api/*
  ▼
Gateway :3000
  ├─ ThrottlerGuard — reject if rate exceeded (429)
  ├─ JwtAuthGuard — verify Bearer token, attach req.user
  ├─ RolesGuard — check user.role against @Roles() decorator
  └─ ProxyModule — forward to upstream service
         │
         ▼ HTTP (internal lms-net)
    Target Service :300x
         │
         ▼
    Response bubbled back to client
```

### Adding a New Proxy Route

```typescript
// gateway/src/proxy/proxy.module.ts — register new upstream
@Module({
  imports: [
    ConfigModule,
    HttpModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        baseURL: config.get('MY_SERVICE_URL'),
        timeout: 30_000,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [MyProxyController],
})
export class MyProxyModule {}
```

```typescript
// gateway/src/proxy/my-proxy.controller.ts
@Controller('v1/my-resource')
@UseGuards(JwtAuthGuard)
export class MyProxyController {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  @Get(':id')
  async getOne(@Param('id') id: string, @Req() req: FastifyRequest) {
    const url = `${this.config.get('MY_SERVICE_URL')}/api/v1/my-resource/${id}`;
    const { data } = await firstValueFrom(
      this.http.get(url, { headers: { 'x-user-id': req.user.id } }),
    );
    return data;
  }
}
```

---

## 7. Service-to-Service Communication

### Synchronous (HTTP)

Used when the caller needs an immediate response (e.g., gateway → upstream, wallet-service fetching course price).

```typescript
// wallet-service fetching course details before distributing revenue
const { data } = await firstValueFrom(
  this.http.get(`${this.courseUrl}/api/v1/courses/${courseId}`),
);
const price = parseFloat(data.data.price);
```

**Rules:**
- Services talk via Docker internal DNS (`course-service`, `wallet-service`, etc.)
- Always set a timeout (default `30_000` ms in `HttpModule`)
- Never read another service's database directly

### Asynchronous (RabbitMQ)

Used for state-change notifications where the publisher does not need to wait for consumers.

```typescript
// Publishing an event
this.messaging.publishEvent('payment.confirmed', {
  paymentId: payment.id,
  userId: payment.userId,
  courseId: payment.courseId,
  amount: payment.amount.toString(),
  currency: payment.currency,
  provider: payment.provider,
});

// Consuming an event (hybrid microservice pattern)
@EventPattern('payment.confirmed')
async onPaymentConfirmed(@Payload() event: PaymentConfirmedEvent): Promise<void> {
  await this.enrollmentService.enrollFromPayment(
    event.userId, event.courseId, event.paymentId,
  );
}
```

---

## 8. RabbitMQ Event System

### Topology

```
Exchange: lms.events  (type: topic, durable: true)

Routing key patterns → Queues:

auth.#          ──► auth.events
auth.user.#     ──► user.auth-events
auth.#          ──► notification.auth-events
course.#        ──► course.events, course.publisher
payment.#       ──► enrollment.events
enrollment.#    ──► wallet.events

Dead-letter exchange: lms.dead-letter (fanout)
Dead-letter queue:    lms.dead-letter
```

### All Platform Events

| Event | Publisher | Consumers |
|-------|-----------|-----------|
| `auth.user.registered` | auth-service | user-service, notification-service |
| `auth.user.login` | auth-service | analytics-service |
| `auth.password.reset` | auth-service | notification-service |
| `course.created` | course-service | analytics-service |
| `course.published` | course-service | analytics-service, notification-service |
| `payment.confirmed` | payment-service | enrollment-service, notification-service, analytics-service |
| `enrollment.created` | enrollment-service | wallet-service, notification-service, analytics-service |
| `lesson.completed` | enrollment-service | analytics-service, certificate-service |
| `quiz.submitted` | quiz-service | analytics-service |
| `assignment.submitted` | assignment-service | notification-service, analytics-service |
| `certificate.issued` | certificate-service | notification-service |

### Setting Up a Hybrid Microservice

A service that both serves HTTP requests **and** consumes RabbitMQ events uses NestJS's hybrid application pattern:

```typescript
// services/my-service/src/main.ts
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Connect RabbitMQ consumer
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL],
      exchange: process.env.RABBITMQ_EXCHANGE ?? 'lms.events',
      exchangeType: 'topic',
      routingKey: 'payment.#',          // only these routing keys
      queue: 'my-service.events',       // durable queue name
      queueOptions: { durable: true },
      noAck: false,                     // manual ack for reliability
    },
  });

  app.setGlobalPrefix('api/v1');
  await app.startAllMicroservices();    // start RMQ consumer
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

```typescript
// services/my-service/src/events/event-listener.service.ts
@Injectable()
export class EventListenerService {
  private readonly logger = new Logger(EventListenerService.name);
  constructor(private readonly myService: MyService) {}

  @EventPattern('payment.confirmed')
  async onPaymentConfirmed(@Payload() event: PaymentConfirmedEvent): Promise<void> {
    this.logger.log(`Received payment.confirmed paymentId=${event.paymentId}`);
    try {
      await this.myService.handlePayment(event);
    } catch (err) {
      // Swallow to prevent nack → requeue loop
      this.logger.error('Handler failed', err);
    }
  }
}
```

### Adding a New Queue to RabbitMQ Definitions

Edit `infra/rabbitmq/definitions.json`:

```json
{
  "queues": [
    { "name": "my-service.events", "vhost": "/", "durable": true, "auto_delete": false, "arguments": {} }
  ],
  "bindings": [
    {
      "source": "lms.events", "vhost": "/",
      "destination": "my-service.events", "destination_type": "queue",
      "routing_key": "payment.#", "arguments": {}
    }
  ]
}
```

Then restart RabbitMQ:

```bash
docker compose restart rabbitmq
```

---

## 9. Redis Usage

Redis runs at `redis:6379` with `maxmemory 256mb` and `allkeys-lru` eviction.

### Use Cases

| Use Case | Key Pattern | TTL |
|----------|-------------|-----|
| Refresh token storage | `refresh:{userId}` | 7 days |
| Rate limit counters | ThrottlerModule (automatic) | Configurable |
| Session cache | `session:{token}` | 15 min |

### Connecting in NestJS

```typescript
// Using ioredis via @nestjs-modules/ioredis or cache-manager-redis-store
import { RedisService } from '@liaoliaots/nestjs-redis';

@Injectable()
export class TokenService {
  private readonly redis: Redis;
  constructor(private readonly redisService: RedisService) {
    this.redis = this.redisService.getClient();
  }

  async storeRefreshToken(userId: string, token: string): Promise<void> {
    await this.redis.set(`refresh:${userId}`, token, 'EX', 60 * 60 * 24 * 7);
  }

  async getRefreshToken(userId: string): Promise<string | null> {
    return this.redis.get(`refresh:${userId}`);
  }

  async deleteRefreshToken(userId: string): Promise<void> {
    await this.redis.del(`refresh:${userId}`);
  }
}
```

---

## 10. Prisma & Database Structure

### One Schema Per Service

Each service owns exactly one PostgreSQL database. The `prisma/schema.prisma` file in each service directory is the **only** definition of that service's data model.

```
postgres:5432
├── auth_db         → auth-service/prisma/schema.prisma
├── user_db         → user-service/prisma/schema.prisma
├── tenant_db       → tenant-service/prisma/schema.prisma
├── course_db       → course-service/prisma/schema.prisma
├── enrollment_db   → enrollment-service/prisma/schema.prisma
├── quiz_db         → quiz-service/prisma/schema.prisma
├── assignment_db   → assignment-service/prisma/schema.prisma
├── wallet_db       → wallet-service/prisma/schema.prisma
├── payment_db      → payment-service/prisma/schema.prisma
├── ai_db           → ai-service/prisma/schema.prisma
├── notification_db → notification-service/prisma/schema.prisma
├── media_db        → media-service/prisma/schema.prisma
├── certificate_db  → certificate-service/prisma/schema.prisma
├── analytics_db    → analytics-service/prisma/schema.prisma
└── audit_db        → audit-service/prisma/schema.prisma
```

All 15 databases are created by `infra/postgres/init.sql` on first startup.

### PrismaService Pattern

```typescript
// services/{service}/src/prisma/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

### Running Migrations

```bash
# Inside a running container (preferred for CI)
docker compose exec course-service sh -c \
  "cd /app/services/course-service && npx prisma migrate deploy"

# During development — generate + apply
docker compose exec course-service sh -c \
  "cd /app/services/course-service && npx prisma migrate dev --name add_my_field"

# Quick schema push without migration history (dev only)
docker compose exec course-service sh -c \
  "cd /app/services/course-service && npx prisma db push"

# Regenerate client after schema change
docker compose exec course-service sh -c \
  "cd /app/services/course-service && npx prisma generate"
```

### Key Schema Patterns

**Soft-deletable course:**

```prisma
model Course {
  id           String    @id @default(uuid())
  title        String
  description  String?
  price        Decimal   @default(0) @db.Decimal(10,2)
  level        Level     @default(BEGINNER)
  status       CourseStatus @default(DRAFT)
  language     String    @default("mn")
  tags         String[]
  thumbnail    String?
  totalMinutes Int       @default(0)
  passingScore Int       @default(60)
  instructorId String    @map("instructor_id")
  modules      CourseModule[]
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")
  @@map("courses")
}

enum Level { BEGINNER INTERMEDIATE ADVANCED }
enum CourseStatus { DRAFT PUBLISHED ARCHIVED }
```

**Idempotent enrollment (paymentId guard):**

```prisma
model Enrollment {
  id              String   @id @default(uuid())
  courseId        String   @map("course_id")
  studentId       String   @map("student_id")
  paymentId       String?  @map("payment_id")
  progressPercent Float    @default(0) @map("progress_percent")
  status          EnrollmentStatus @default(ACTIVE)
  enrolledAt      DateTime @default(now()) @map("enrolled_at")
  completedAt     DateTime? @map("completed_at")

  @@unique([courseId, studentId])
  @@index([paymentId])
  @@map("enrollments")
}
```

**Revenue split (wallet-service):**

```prisma
// PLATFORM_FEE_PERCENT = new Decimal('20')
// instructorAmount = amount * 0.80
// platformAmount   = amount * 0.20
model RevenueShare {
  id             String  @id @default(uuid())
  courseId       String  @map("course_id")
  enrollmentId   String  @map("enrollment_id")
  instructorId   String  @map("instructor_id")
  totalAmount    Decimal @db.Decimal(10,2)
  instructorAmount Decimal @db.Decimal(10,2)
  platformAmount Decimal @db.Decimal(10,2)
  createdAt      DateTime @default(now())
  @@map("revenue_shares")
}
```

**Analytics immutable event log:**

```prisma
model AnalyticsEvent {
  id         String   @id @default(uuid())
  eventType  String   @map("event_type")
  userId     String?  @map("user_id")
  courseId   String?  @map("course_id")
  payload    Json
  occurredAt DateTime @default(now()) @map("occurred_at")
  @@map("analytics_events")
}
```

### Atomic Transactions

Use Prisma `$transaction` for financial operations:

```typescript
async distributeRevenue(instructorId: string, courseId: string, enrollmentId: string, amount: number) {
  const PLATFORM_FEE = new Decimal('20');
  const total = new Decimal(amount);
  const platformAmount = total.mul(PLATFORM_FEE).div(100);
  const instructorAmount = total.sub(platformAmount);

  await this.prisma.$transaction([
    this.prisma.wallet.update({
      where: { userId: instructorId },
      data: { balance: { increment: instructorAmount } },
    }),
    this.prisma.revenueShare.create({
      data: { courseId, enrollmentId, instructorId, totalAmount: total, instructorAmount, platformAmount },
    }),
  ]);
}
```

---

## 11. Shared Packages

The `packages/` directory contains pnpm workspace packages imported by services as `@lms/*`.

### `@lms/shared-config`

NestJS `ConfigFactory` functions — import and load in `ConfigModule.forRoot({ load: [...] })`.

```typescript
import { appConfig, databaseConfig, redisConfig, rabbitmqConfig, jwtConfig } from '@lms/shared-config';

// app.module.ts
ConfigModule.forRoot({
  isGlobal: true,
  load: [appConfig, databaseConfig, rabbitmqConfig, jwtConfig],
})
```

`appConfig` exposes: `port`, `nodeEnv`, `serviceName`.

### `@lms/shared-utils`

```typescript
import { createLogger, hashPassword, comparePassword, paginate, createApiResponse } from '@lms/shared-utils';

// Structured Winston logger
const logger = createLogger('course-service');

// Pagination helper
const { data, meta } = paginate(items, total, page, limit);

// Consistent API envelope
return createApiResponse(data, 'Course fetched');
// → { success: true, data, message, timestamp }
```

### `@lms/shared-types`

```typescript
import type { JwtPayload, PaginatedResponse, ApiResponse } from '@lms/shared-types';

// JwtPayload: { sub, email, role, iat, exp }
// PaginatedResponse<T>: { data: T[], meta: { total, page, limit, totalPages } }
// ApiResponse<T>: { success, data, message, timestamp }
```

### `@lms/shared-auth`

```typescript
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, Public } from '@lms/shared-auth';

// Controller usage
@Controller('courses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CourseController {
  @Post()
  @Roles('INSTRUCTOR', 'ADMIN')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCourseDto) { ... }

  @Get(':id')
  @Public()  // skips JwtAuthGuard
  findOne(@Param('id') id: string) { ... }
}
```

### `@lms/shared-events`

TypeScript interfaces for all RabbitMQ event payloads:

```typescript
import type { PaymentConfirmedEvent, EnrollmentCreatedEvent } from '@lms/shared-events';
```

---

## 12. Authentication & Authorization

### JWT Token Lifecycle

```
Login → POST /api/v1/auth/login
      ← { accessToken (15m), refreshToken (7d) }

All subsequent requests:
  Authorization: Bearer <accessToken>

Token expiry → POST /api/v1/auth/refresh
  body: { refreshToken }
  ← { accessToken (new 15m), refreshToken (rotated 7d) }

Logout → POST /api/v1/auth/logout
  (invalidates refresh token in Redis)
```

### JWT Payload

```typescript
interface JwtPayload {
  sub: string;      // userId
  email: string;
  role: UserRole;   // SUPER_ADMIN | ADMIN | INSTRUCTOR | STUDENT
  iat: number;
  exp: number;
}
```

### Role Hierarchy

```
SUPER_ADMIN   — full platform access, manage organizations
ADMIN         — manage courses, users within their organization
INSTRUCTOR    — create/manage own courses, grade assignments
STUDENT       — enroll, learn, submit assignments
```

### Password Requirements

Registration enforces this regex:

```
/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
```

Minimum 8 characters, at least one uppercase, one lowercase, one digit, one special character.

---

## 13. Development Workflow

### Prerequisites

```bash
node --version   # v20+
pnpm --version   # v9+
docker --version # v24+
```

### First-Time Setup

```bash
# Clone and install workspace dependencies
git clone <repo>
cd lms-platform
pnpm install

# Configure environment
cp .env.example .env
# Edit .env — set JWT_SECRET (32+ chars), POSTGRES_PASSWORD, etc.

# Start infrastructure
docker compose up -d postgres redis rabbitmq minio

# Run migrations for all services
bash scripts/migrate.sh

# Seed initial data (SUPER_ADMIN account, sample courses)
bash scripts/seed.sh

# Start all services
docker compose up -d
```

### Daily Development Loop

```bash
# 1. Edit code in services/course-service/src/

# 2. Rebuild only the changed service
docker compose build course-service

# 3. Restart it
docker compose up -d course-service

# 4. Watch logs
docker compose logs -f course-service

# 5. Run Prisma migration if schema changed
docker compose exec course-service sh -c \
  "cd /app/services/course-service && npx prisma migrate dev --name my_change"
```

### Adding a New Service

1. Create `services/my-service/` directory following the standard layout
2. Add `Dockerfile`, `package.json`, `prisma/schema.prisma`, `src/main.ts`, `src/app.module.ts`
3. Add the new database to `infra/postgres/init.sql`
4. Add the service block to `docker-compose.yml`
5. Add its `DATABASE_URL` to `.env.example`
6. If it consumes events: add queue + binding to `infra/rabbitmq/definitions.json`
7. If it serves HTTP: add upstream URL to gateway's `app.module.ts` and create proxy controller
8. Run `docker compose build my-service && docker compose up -d my-service`

### Useful Docker Commands

```bash
# Shell into a running container
docker compose exec course-service sh

# Check all service health
docker compose ps

# View all logs simultaneously
docker compose logs --tail=50

# Remove a service's database volume (full reset)
docker compose down && docker volume rm lms-platform_postgres_data

# Rebuild without cache
docker compose build --no-cache course-service
```

---

## 14. Testing

### Unit Tests

Each service uses Jest with NestJS testing utilities:

```typescript
// course.service.spec.ts
describe('CourseService', () => {
  let service: CourseService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CourseService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
      ],
    }).compile();

    service = module.get(CourseService);
    prisma = module.get(PrismaService);
  });

  it('creates a course', async () => {
    const dto: CreateCourseDto = { title: 'Test', level: 'BEGINNER', language: 'mn' };
    prisma.course.create.mockResolvedValue({ id: 'uuid', ...dto } as any);
    const result = await service.create('instructor-id', dto);
    expect(result.title).toBe('Test');
  });
});
```

```bash
# Run tests inside service container
docker compose exec course-service sh -c "cd /app/services/course-service && pnpm test"

# Run with coverage
docker compose exec course-service sh -c "cd /app/services/course-service && pnpm test:cov"
```

### E2E Tests

```typescript
// course.e2e-spec.ts
describe('CourseController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  it('POST /api/v1/courses — creates course as INSTRUCTOR', () => {
    return request(app.getHttpServer())
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ title: 'E2E Course', level: 'BEGINNER', language: 'mn' })
      .expect(201);
  });
});
```

### Integration Test: Full Payment → Enrollment Flow

```bash
# 1. Get a student token
TOKEN=$(curl -s -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@test.com","password":"Test@1234"}' \
  | jq -r '.data.accessToken')

# 2. Create a payment for a paid course
PAYMENT=$(curl -s -X POST http://localhost/api/v1/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"courseId\":\"$COURSE_ID\",\"amount\":49900,\"provider\":\"MOCK\"}" \
  | jq -r '.data.id')

# 3. Simulate mock payment completion
curl -X POST http://localhost/api/v1/payments/$PAYMENT/mock-pay \
  -H "Authorization: Bearer $TOKEN"

# 4. Verify enrollment was created automatically
curl http://localhost/api/v1/enrollments/check?courseId=$COURSE_ID \
  -H "Authorization: Bearer $TOKEN"
# Expected: { enrolled: true }
```

---

## 15. Deployment

### Production Docker Compose

For production, override the development compose file:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Production overrides should include:
- `NODE_ENV=production` (disables Swagger)
- Resource limits on all containers
- Named volumes with backup policies
- Healthcheck intervals tightened
- `restart: always` (instead of `unless-stopped`)

### Environment Hardening Checklist

```
☐ JWT_SECRET is 64+ random characters
☐ POSTGRES_PASSWORD is strong (not 'password')
☐ RabbitMQ default guest/guest credentials changed
☐ MinIO MINIO_ACCESS_KEY / MINIO_SECRET_KEY changed
☐ Redis has requirepass set for production
☐ Ollama not exposed on public network
☐ NODE_ENV=production (disables Swagger /docs)
☐ NGINX SSL/TLS configured (Let's Encrypt recommended)
☐ All DATABASE_URLs use SSL for external Postgres
```

### Running Migrations in Production

```bash
# Run migrations for all services in sequence
for svc in auth user course enrollment quiz assignment wallet payment ai notification media certificate analytics; do
  echo "Migrating $svc..."
  docker compose exec ${svc}-service sh -c \
    "cd /app/services/${svc}-service && npx prisma migrate deploy"
done
```

### Health Endpoints

Every service exposes a health endpoint at `GET /api/v1/health`:

```json
{ "status": "ok", "timestamp": "2025-01-01T00:00:00.000Z", "service": "course-service" }
```

Gateway exposes: `GET /api/health`

```bash
# Check all services are up
for port in 3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012 3013; do
  echo -n "Port $port: "
  curl -s http://localhost:$port/api/v1/health | jq -r '.status' 2>/dev/null || echo "DOWN"
done
```

### Kubernetes Readiness

The stack is Docker-Compose-first but Kubernetes-ready:

- All services are stateless (state in Postgres/Redis)
- Config via environment variables (12-factor app)
- Health endpoints for liveness/readiness probes
- No inter-service shared volumes
- Graceful shutdown via `OnModuleDestroy` hooks

To migrate to Kubernetes, generate Helm charts or use Kompose:

```bash
kompose convert -f docker-compose.yml -o k8s/
```

---

## 16. Coding Standards

### Module Boundary Rules

```
✅ OK: CourseService calls its own PrismaService
✅ OK: WalletService calls CourseService via HTTP to read course price
✅ OK: EnrollmentService publishes enrollment.created event
❌ NEVER: EnrollmentService imports PrismaService from course-service
❌ NEVER: Two services share a database connection
❌ NEVER: Publish raw database rows as events (use domain objects)
```

### DTO Validation

Always use `class-validator` decorators:

```typescript
export class CreateCourseDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(Level)
  level: Level;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}
```

### Service Method Pattern

```typescript
async findOne(id: string, userId: string): Promise<ApiResponse<CourseDto>> {
  const course = await this.prisma.course.findUnique({
    where: { id },
    include: { modules: { include: { lessons: true } } },
  });

  if (!course) throw new NotFoundException('Course not found');

  return createApiResponse(this.toDto(course), 'Course fetched');
}
```

### Event Naming Convention

Use dot-separated domain-action format:

```
{domain}.{entity}.{past-tense-action}
                            ↓
auth.user.registered
auth.password.reset
course.published
payment.confirmed
enrollment.created
lesson.completed
certificate.issued
```

### Error Handling

```typescript
// Use NestJS built-in HTTP exceptions
throw new NotFoundException('Course not found');
throw new ForbiddenException('You do not own this course');
throw new BadRequestException('Invalid payment amount');
throw new ConflictException('Already enrolled in this course');

// For event listeners — log and swallow (prevent nack loop)
@EventPattern('payment.confirmed')
async onPaymentConfirmed(@Payload() event: PaymentConfirmedEvent) {
  try {
    await this.service.handle(event);
  } catch (err) {
    this.logger.error(`Handler failed for paymentId=${event.paymentId}`, err);
    // Do NOT rethrow — prevents infinite nack → requeue loop
  }
}
```

### Logging

```typescript
// Use @nestjs/common Logger or the shared winston logger
private readonly logger = new Logger(CourseService.name);

// Log meaningful actions with context
this.logger.log(`Course published courseId=${id} instructorId=${instructorId}`);
this.logger.error(`Failed to distribute revenue enrollmentId=${id}`, err.stack);
this.logger.warn(`Slow AI response: ${elapsed}ms for submissionId=${id}`);
```

### File & Class Naming

| Type | Convention | Example |
|------|-----------|---------|
| Files | `kebab-case.type.ts` | `course.service.ts` |
| Classes | `PascalCase` | `CourseService` |
| Variables/functions | `camelCase` | `findAllCourses` |
| Constants | `UPPER_SNAKE_CASE` | `PLATFORM_FEE_PERCENT` |
| DB columns | `snake_case` via `@map` | `instructor_id` |

---

## 17. Troubleshooting

### Service Won't Start

```bash
# Check logs
docker compose logs my-service --tail=50

# Common causes:
# 1. Database not ready yet → check depends_on healthcheck
# 2. Missing env var → check docker-compose.yml env block
# 3. Prisma client not generated → rebuild image
docker compose build --no-cache my-service
```

### RabbitMQ Events Not Delivered

```bash
# Check exchange and queue bindings
curl -u lms:${RABBITMQ_PASSWORD} \
  http://localhost:15672/api/bindings/%2F/e/lms.events/q/enrollment.events

# Check if queue exists and has consumers
curl -u lms:${RABBITMQ_PASSWORD} \
  http://localhost:15672/api/queues/%2F/enrollment.events

# Manually publish a test event via management UI
# http://localhost:15672 → Exchanges → lms.events → Publish message
# Routing key: payment.confirmed
# Body: { "paymentId": "test", "userId": "test", "courseId": "test" }
```

### Prisma Migration Fails

```bash
# Check migration status
docker compose exec course-service sh -c \
  "cd /app/services/course-service && npx prisma migrate status"

# Reset dev database (destructive — dev only)
docker compose exec course-service sh -c \
  "cd /app/services/course-service && npx prisma migrate reset --force"
```

### JWT Invalid / 401 Errors

```bash
# Verify JWT_SECRET is identical between auth-service and gateway
docker compose exec auth-service sh -c "echo $JWT_SECRET | cut -c1-10"
docker compose exec gateway sh -c "echo $JWT_SECRET | cut -c1-10"
# These must match

# Check token expiry
# Access token: 15m — short-lived by design
# Refresh token: 7d — use /api/v1/auth/refresh to rotate
```

### AI Service Slow / Timing Out

```bash
# Check Ollama is running and model is loaded
docker compose logs ollama --tail=20

# Pull model manually
docker compose exec ollama ollama pull llama3.2

# Increase timeout if needed (.env)
OLLAMA_TIMEOUT_MS=180000
```

### MinIO Bucket Not Found

```bash
# Create bucket manually
docker compose exec minio mc alias set local http://minio:9000 minioadmin minioadmin
docker compose exec minio mc mb local/lms-media
```

---

## Quick Reference

### API Base URLs (Local)

| Endpoint | URL |
|----------|-----|
| Frontend | `http://localhost` |
| API (via NGINX) | `http://localhost/api` |
| Swagger Docs | `http://localhost/docs` |
| RabbitMQ Management | `http://localhost:15672` |
| MinIO Console | `http://localhost:9001` |

### Most-Used Commands

```bash
# Full rebuild
docker compose down && docker compose build && docker compose up -d

# Watch all logs
docker compose logs -f

# Run a migration
docker compose exec {service}-service sh -c "cd /app/services/{service}-service && npx prisma migrate dev --name {name}"

# Open psql for a service
docker compose exec postgres psql -U lms -d course_db

# Purge a queue (development)
curl -u lms:pass -X DELETE http://localhost:15672/api/queues/%2F/enrollment.events/contents
```
