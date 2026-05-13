# CLAUDE.md

# LMS Platform Development Guide

## Project Overview

This project is an enterprise-grade AI-native Learning Management System (LMS) platform designed for:

- Schools
- Universities
- Corporate training
- Online academies
- Certification organizations
- Private learning centers

The platform architecture is:

- Multi-tenant SaaS
- Microservice-ready
- AI-native
- Event-driven
- Docker Compose based
- Kubernetes-ready

---

# Core Technology Stack

## Backend

- Node.js
- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis
- RabbitMQ
- Web socket

---

## Frontend

- Next.js
- TypeScript
- TailwindCSS
- Zustand
- React Query

---

## Mobile

- Flutter

---

## Infrastructure

- Docker
- Docker Compose
- NGINX
- MinIO
- Ollama

---

## Future Infrastructure

- Kubernetes
- Prometheus
- Grafana
- Loki
- ArgoCD

---

# Architecture Principles

## IMPORTANT

This system MUST follow:

- Clean Architecture
- SOLID Principles
- Domain Driven Design (DDD)
- Event Driven Architecture
- Service Isolation
- Scalable Architecture

---

# Architecture Type

## Current Stage

Development currently uses:

- Docker Compose
- Multiple services
- PostgreSQL
- RabbitMQ
- Redis

---

## Future Stage

The system MUST be Kubernetes-ready.

Do NOT tightly couple services.

---

# Microservice Rules

## VERY IMPORTANT RULES

### Rule 1

Each service owns its own database/schema.

NEVER directly access another service database.

---

### Rule 2

Service-to-service communication:

- REST/gRPC for synchronous communication
- RabbitMQ for asynchronous communication

---

### Rule 3

Services MUST be stateless.

Do NOT store runtime state in memory.

Use:

- PostgreSQL
- Redis

for persistence.

---

### Rule 4

All services MUST have:

- Dockerfile
- .env.example
- health check
- structured logging
- Swagger/OpenAPI docs

---

### Rule 5

All services MUST be independently deployable.

---

# Service Architecture

## Gateway

Responsibilities:

- API aggregation
- JWT validation
- request forwarding
- rate limiting

---

## Auth Service

Responsibilities:

- login
- register
- JWT
- refresh token
- MFA
- OAuth

Database:

- auth_db

---

## User Service

Responsibilities:

- profiles
- preferences
- organization users

Database:

- user_db

---

## Course Service

Responsibilities:

- courses
- modules
- lessons
- curriculum
- prerequisites

Database:

- course_db

---

## Enrollment Service

Responsibilities:

- enrollments
- progress tracking
- completion tracking

Database:

- enrollment_db

---

## Quiz Service

Responsibilities:

- quizzes
- adaptive exams
- question bank
- submissions

Database:

- quiz_db

---

## Assignment Service

Responsibilities:

- assignments
- grading
- submissions

Database:

- assignment_db

---

## Wallet Service

Responsibilities:

- wallet
- transactions
- revenue sharing
- payouts

Database:

- wallet_db

IMPORTANT:

Financial logic MUST be isolated.

---

## Payment Service

Responsibilities:

- QPay
- SocialPay
- payment verification
- webhook handling

Database:

- payment_db

---

## AI Service

Responsibilities:

- essay scoring
- AI tutor
- recommendations
- adaptive learning
- skill graph

Database:

- ai_db

IMPORTANT:

AI inference MUST use Ollama locally.

---

## Notification Service

Responsibilities:

- email
- SMS
- push notifications
- in-app notifications

Database:

- notification_db

---

## Media Service

Responsibilities:

- video uploads
- transcoding
- subtitles
- media management

Storage:

- MinIO

---

## Certificate Service

Responsibilities:

- certificate generation
- QR verification
- public validation

Database:

- certificate_db

---

## Analytics Service

Responsibilities:

- KPI
- reports
- AI analytics
- dashboards

Database:

- analytics_db

---

# Folder Structure

```txt
lms-platform/

├── gateway/
├── services/
├── packages/
├── infra/
├── scripts/
├── docker-compose.yml
└── CLAUDE.md



lms-platform/

├── docker-compose.yml
├── .env
├── README.md

├── gateway/
│   ├── Dockerfile
│   ├── package.json
│   └── src/

├── services/
│
│   ├── auth-service/
│   │   ├── Dockerfile
│   │   ├── prisma/
│   │   ├── src/
│   │   └── package.json
│
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

├── packages/
│
│   ├── shared-types/
│   ├── shared-events/
│   ├── shared-auth/
│   ├── shared-utils/
│   ├── shared-config/
│   └── shared-prisma/

├── infra/
│
│   ├── nginx/
│   │   └── nginx.conf
│   │
│   ├── postgres/
│   │   └── init.sql
│   │
│   ├── rabbitmq/
│   │   └── definitions.json
│   │
│   ├── redis/
│   │
│   └── monitoring/
│       ├── prometheus/
│       └── grafana/

└── scripts/
    ├── bootstrap.sh
    ├── migrate.sh
    └── seed.sh