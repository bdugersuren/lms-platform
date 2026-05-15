# LMS Platform — Architecture Reference

> **Version:** 1.0 · **Stack:** NestJS · TypeScript · Prisma · PostgreSQL · RabbitMQ · Redis · Next.js · Docker Compose

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Microservice Architecture](#2-microservice-architecture)
3. [API Gateway](#3-api-gateway)
4. [Database Architecture](#4-database-architecture)
5. [RabbitMQ Event Flow](#5-rabbitmq-event-flow)
6. [Redis Architecture](#6-redis-architecture)
7. [AI Architecture](#7-ai-architecture)
8. [Interactive Lesson Engine](#8-interactive-lesson-engine)
9. [Quiz Engine](#9-quiz-engine)
10. [Wallet & Financial Architecture](#10-wallet--financial-architecture)

---

## 1. System Overview

The platform is a **multi-tenant, AI-native LMS** built on an event-driven microservice architecture. Every bounded context lives in an isolated service with its own database, communicates asynchronously via RabbitMQ, and is independently deployable.

```mermaid
graph TB
    subgraph Clients["Clients"]
        WEB["Next.js Web App"]
        MOB["Flutter Mobile"]
        EXT["External API Consumers"]
    end

    subgraph Edge["Edge Layer"]
        NGINX["NGINX\nReverse Proxy :80"]
    end

    subgraph Gateway["Gateway Layer"]
        GW["API Gateway :3000\nFastify · JWT · Rate Limit · Swagger"]
    end

    subgraph Services["Microservices (lms-net)"]
        direction TB
        AUTH["auth-service :3001"]
        USER["user-service :3002"]
        COURSE["course-service :3003"]
        QUIZ["quiz-service :3004"]
        ENROLL["enrollment-service :3005"]
        ASSIGN["assignment-service :3006"]
        WALLET["wallet-service :3007"]
        PAYMENT["payment-service :3008"]
        AI["ai-service :3009"]
        NOTIF["notification-service :3010"]
        MEDIA["media-service :3011"]
        CERT["certificate-service :3012"]
        ANALYTICS["analytics-service :3013"]
    end

    subgraph Infra["Infrastructure"]
        PG[("PostgreSQL :5432\n13 databases")]
        RMQ[["RabbitMQ :5672\nlms.events (topic)"]]
        REDIS[("Redis :6379\nTokens · Rate Limits")]
        MINIO[("MinIO :9000\nObject Storage")]
        OLLAMA["Ollama :11434\nLlama 3.2 (local LLM)"]
    end

    WEB & MOB & EXT --> NGINX
    NGINX --"/api → gateway"--> GW
    NGINX --"/ → web app"--> WEB
    GW --> AUTH & USER & COURSE & QUIZ & ENROLL & ASSIGN & WALLET & PAYMENT & AI & NOTIF & MEDIA & CERT & ANALYTICS
    Services --> PG
    Services <--> RMQ
    AUTH & GW --> REDIS
    MEDIA & CERT --> MINIO
    AI --> OLLAMA
```

### Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Service Isolation** | Each service owns its database; no cross-DB reads |
| **Stateless Services** | All runtime state in PostgreSQL or Redis |
| **Event-Driven** | Async state changes flow through `lms.events` topic exchange |
| **Clean Architecture** | Domain layer has zero framework imports |
| **Kubernetes-Ready** | 12-factor app, env-var config, health endpoints |

---

## 2. Microservice Architecture

### Service Map

```mermaid
graph LR
    subgraph Core["Core Domain"]
        AUTH["🔐 auth-service\nLogin · Register · JWT\nMFA · OAuth\n─\nauth_db"]
        USER["👤 user-service\nProfiles · Preferences\nOrganization Users\n─\nuser_db"]
        COURSE["📚 course-service\nCourses · Modules\nLessons · Skills\n─\ncourse_db"]
        ENROLL["📋 enrollment-service\nEnrollments · Progress\nCompletion\n─\nenrollment_db"]
    end

    subgraph Assessment["Assessment Domain"]
        QUIZ["📝 quiz-service\nQuizzes · Adaptive Exams\nQuestion Bank\n─\nquiz_db"]
        ASSIGN["📤 assignment-service\nAssignments · Submissions\nGrading\n─\nassignment_db"]
    end

    subgraph Financial["Financial Domain"]
        PAYMENT["💳 payment-service\nQPay · SocialPay · Mock\nWebhook Handling\n─\npayment_db"]
        WALLET["👛 wallet-service\nWallet · Transactions\nRevenue Share · Payouts\n─\nwallet_db"]
    end

    subgraph Intelligence["Intelligence Domain"]
        AI["🤖 ai-service\nAI Tutor · Essay Score\nRecommendations\n─\nai_db"]
    end

    subgraph Support["Support Domain"]
        NOTIF["🔔 notification-service\nEmail · SMS · Push\nIn-app\n─\nnotification_db"]
        MEDIA["🎬 media-service\nVideo Upload · Transcode\nSubtitles\n─\nMinIO"]
        CERT["🏆 certificate-service\nGenerate · QR Verify\nPublic Validation\n─\ncertificate_db"]
        ANALYTICS["📊 analytics-service\nKPI · Reports\nEvent Log\n─\nanalytics_db"]
    end

    PAYMENT -->|payment.confirmed| ENROLL
    ENROLL -->|enrollment.created| WALLET
    ENROLL -->|lesson.completed| CERT
    AUTH -->|auth.user.registered| USER
    AUTH -->|auth.user.registered| NOTIF
    ASSIGN -->|submission scored| AI
```

### Service Internal Structure

Every service follows the same internal layout:

```mermaid
graph TD
    subgraph "services/course-service/"
        MAIN["src/main.ts\nBootstrap: HTTP + optional RMQ"]
        APP["src/app.module.ts\nRoot module · ConfigModule · PrismaModule"]
        DOM["src/course/\ncourse.controller.ts\ncourse.service.ts\ncourse.module.ts\ndto/"]
        EVT["src/events/\nevent-listener.service.ts\n@EventPattern handlers"]
        PRI["src/prisma/\nprisma.service.ts"]
        HLT["src/health/\nhealth.controller.ts"]
        SCH["prisma/schema.prisma\nService-owned DB schema"]
    end

    MAIN --> APP --> DOM
    APP --> PRI
    APP --> EVT
    APP --> HLT
    SCH --> PRI
```

---

## 3. API Gateway

The gateway is the **single ingress point** — all client traffic passes through it. It validates JWT tokens, enforces rate limits, and forwards requests to upstream services without containing any business logic.

### Request Pipeline

```mermaid
flowchart LR
    CLIENT["Client\nBrowser / Mobile"] -->|"HTTP/WS\nport 80"| NGINX

    NGINX -->|"/api/*"| GW
    NGINX -->|"/"| NEXT["Next.js :3002"]

    subgraph GW["API Gateway :3000 (Fastify)"]
        direction TB
        THR["ThrottlerGuard\n100 req / 60 s"]
        JWT["JwtAuthGuard\nVerify Bearer token\nAttach req.user"]
        ROLE["RolesGuard\n@Roles() decorator check"]
        PROXY["ProxyModule\nHTTP forward to upstream\n30s timeout · 5 redirects"]

        THR --> JWT --> ROLE --> PROXY
    end

    PROXY -->|"x-user-id header injected"| SVC["Upstream Services :300x"]
```

### Gateway Module Structure

```mermaid
graph TD
    APPMOD["AppModule"]
    APPMOD --> THRMOD["ThrottlerModule\nttl=60000ms\nlimit=100"]
    APPMOD --> HTTPMOD["HttpModule\ntimeout=30s\nmaxRedirects=5"]
    APPMOD --> AUTHMOD["GatewayAuthModule\nJWT strategy"]
    APPMOD --> PROXYMOD["ProxyModule\nRoute forwarding"]
    APPMOD --> MEDMOD["MediaModule\nDirect upload handling\n500MB multipart"]
    APPMOD --> HLTMOD["HealthModule\nGET /api/health"]

    PROXYMOD --> AUTH_R["/api/v1/auth/* → auth-service:3001"]
    PROXYMOD --> USER_R["/api/v1/users/* → user-service:3002"]
    PROXYMOD --> COURSE_R["/api/v1/courses/* → course-service:3003"]
    PROXYMOD --> QUIZ_R["/api/v1/quizzes/* → quiz-service:3004"]
    PROXYMOD --> ENROLL_R["/api/v1/enrollments/* → enrollment-service:3005"]
    PROXYMOD --> ASSIGN_R["/api/v1/assignments/* → assignment-service:3006"]
    PROXYMOD --> WALLET_R["/api/v1/wallet/* → wallet-service:3007"]
    PROXYMOD --> PAYMENT_R["/api/v1/payments/* → payment-service:3008"]
    PROXYMOD --> AI_R["/api/v1/ai/* → ai-service:3009"]
    PROXYMOD --> CERT_R["/api/v1/certificates/* → certificate-service:3012"]
    PROXYMOD --> ANALYTICS_R["/api/v1/analytics/* → analytics-service:3013"]
```

### JWT Token Lifecycle

```mermaid
sequenceDiagram
    participant C as Client
    participant G as Gateway
    participant A as auth-service
    participant R as Redis

    C->>A: POST /api/v1/auth/login {email, password}
    A->>A: bcrypt.compare(password, hash)
    A->>R: SET refresh:{userId} token EX 604800
    A-->>C: { accessToken (15m), refreshToken (7d) }

    C->>G: GET /api/v1/courses (Bearer accessToken)
    G->>G: jwt.verify(token, JWT_SECRET)
    G->>G: Attach user {sub, email, role} to req
    G-->>C: 200 OK

    C->>A: POST /api/v1/auth/refresh {refreshToken}
    A->>R: GET refresh:{userId}
    A->>R: SET refresh:{userId} newToken EX 604800
    A-->>C: { accessToken (new 15m), refreshToken (rotated) }

    C->>A: POST /api/v1/auth/logout
    A->>R: DEL refresh:{userId}
    A-->>C: 200 OK
```

### NGINX Configuration Summary

```mermaid
graph LR
    subgraph NGINX["NGINX :80"]
        direction TB
        LOG["Structured JSON access log"]
        GZIP["gzip level 6\ntext/html, application/json, ..."]
        SIZE["client_max_body_size 500m\nproxy timeouts 300s"]
        DNS["resolver 127.0.0.11\nDocker internal DNS"]

        subgraph Routes["Routing"]
            API["location /api\nproxy_pass gateway:3000\nWebSocket upgrade supported"]
            STATIC["location /_next/static\nCache-Control: immutable\nmax-age=31536000"]
            ROOT["location /\nproxy_pass web:3002"]
        end

        subgraph Security["Security Headers"]
            XFO["X-Frame-Options: DENY"]
            XCT["X-Content-Type-Options: nosniff"]
            XSS["X-XSS-Protection: 1; mode=block"]
            REF["Referrer-Policy: strict-origin"]
        end
    end
```

---

## 4. Database Architecture

Each service owns exactly one PostgreSQL database. No service ever reads another service's tables. Cross-domain data is accessed via HTTP or events.

### Database Isolation Map

```mermaid
graph TB
    subgraph PG["PostgreSQL :5432 — initialized by infra/postgres/init.sql"]
        direction LR
        AUTH_DB[("auth_db\n─\nusers\nrefresh_tokens\noauth_accounts")]
        USER_DB[("user_db\n─\nuser_profiles\npreferences")]
        COURSE_DB[("course_db\n─\ncourses · modules\nlessons\ninteractive_blocks\ninteractive_questions\nlesson_progresses\nskills")]
        ENROLL_DB[("enrollment_db\n─\nenrollments\nlesson_progresses")]
        QUIZ_DB[("quiz_db\n─\nquizzes · questions\nquestion_options\nquiz_attempts\nattempt_answers")]
        ASSIGN_DB[("assignment_db\n─\nassignments\nsubmissions\ngrades")]
        WALLET_DB[("wallet_db\n─\nwallets\ntransactions\nrevenue_shares\npayouts")]
        PAYMENT_DB[("payment_db\n─\npayments\nwebhook_logs")]
        AI_DB[("ai_db\n─\nchat_sessions\nchat_messages\nessay_scores\nrecommendations")]
        NOTIF_DB[("notification_db\n─\nnotifications\ntemplates")]
        MEDIA_DB[("media_db\n─\nmedia_assets\ntranscode_jobs")]
        CERT_DB[("certificate_db\n─\ncertificates\nverify_codes")]
        ANALYTICS_DB[("analytics_db\n─\nanalytics_events\ndaily_kpis")]
    end
```

### Core Domain Entity Relationships

```mermaid
erDiagram
    Course {
        uuid id PK
        string title
        string slug UK
        decimal price
        enum level "BEGINNER|INTERMEDIATE|ADVANCED"
        enum status "DRAFT|PUBLISHED|ARCHIVED"
        string[] tags
        string language
        int totalLessons
        int totalMinutes
        float passingScore
        bool isSequential
        string instructorId
    }

    Module {
        uuid id PK
        uuid courseId FK
        string title
        int sortOrder
        float unlockScore
    }

    Lesson {
        uuid id PK
        uuid moduleId FK
        string title
        enum lessonType "VIDEO|PDF|MARKDOWN|TEXT|LIVE|QUIZ"
        int sortOrder
        string contentUrl
        string rawMarkdown
        int estimatedMinutes
        bool isPreview
        float passingScore
        bool unlockNextOnPass
    }

    InteractiveBlock {
        uuid id PK
        uuid lessonId FK
        enum blockType "QUIZ|CHECKPOINT|INFO|ASSIGNMENT|AI_PROMPT"
        int sortOrder
        int triggerSecond
        int triggerPage
        json contentJson
        bool isRequired
        float passingScore
        bool continueOnPassOnly
    }

    Skill {
        uuid id PK
        string name UK
        string category
    }

    LessonSkill {
        uuid lessonId FK
        uuid skillId FK
        float weight
    }

    LessonDependency {
        uuid lessonId FK
        uuid requiredLessonId FK
    }

    Course ||--o{ Module : "has"
    Module ||--o{ Lesson : "has"
    Lesson ||--o{ InteractiveBlock : "has"
    Lesson ||--o{ LessonSkill : "teaches"
    LessonSkill }o--|| Skill : "references"
    Lesson ||--o{ LessonDependency : "requires"
```

### Auth Domain Schema

```mermaid
erDiagram
    User {
        uuid id PK
        string email UK
        string passwordHash
        enum role "SUPER_ADMIN|ADMIN|INSTRUCTOR|STUDENT"
        bool isActive
        bool mfaEnabled
        string mfaSecret
    }

    RefreshToken {
        uuid id PK
        uuid userId FK
        string tokenHash UK
        datetime expiresAt
    }

    OAuthAccount {
        uuid id PK
        uuid userId FK
        string provider
        string providerUserId
    }

    User ||--o{ RefreshToken : "has"
    User ||--o{ OAuthAccount : "has"
```

### Financial Domain Schema

```mermaid
erDiagram
    Payment {
        uuid id PK
        string userId
        string courseId
        decimal amount
        string currency
        enum provider "QPAY|SOCIAL_PAY|MOCK"
        enum status "PENDING|PROCESSING|COMPLETED|FAILED|REFUNDED|CANCELLED"
        string invoiceId UK
        string qrCode
        json deepLinks
        string checkoutUrl
        datetime expiredAt
        datetime completedAt
    }

    WebhookLog {
        uuid id PK
        string provider
        uuid paymentId FK
        string eventType
        json payload
        bool processed
    }

    Wallet {
        uuid id PK
        string ownerId UK
        string ownerType
        decimal balance
        string currency
        enum status "ACTIVE|SUSPENDED|CLOSED"
    }

    Transaction {
        uuid id PK
        uuid walletId FK
        enum type "CREDIT|DEBIT|REVENUE_SHARE|PAYOUT|REFUND|PLATFORM_FEE"
        enum status "PENDING|COMPLETED|FAILED|REVERSED"
        decimal amount
        decimal balanceBefore
        decimal balanceAfter
        string reference
    }

    RevenueShare {
        uuid id PK
        uuid walletId FK
        string courseId
        string enrollmentId UK
        decimal grossAmount
        decimal platformFee
        decimal netAmount
        decimal feePercent
    }

    Payout {
        uuid id PK
        uuid walletId FK
        decimal amount
        enum status "PENDING|PROCESSING|COMPLETED|REJECTED"
        string bankName
        string accountNumber
        string rejectedReason
    }

    Payment ||--o{ WebhookLog : "logs"
    Wallet ||--o{ Transaction : "records"
    Wallet ||--o{ RevenueShare : "earns"
    Wallet ||--o{ Payout : "requests"
```

---

## 5. RabbitMQ Event Flow

### Exchange Topology

```mermaid
graph TB
    subgraph RMQ["RabbitMQ — vhost: /"]
        direction TB

        subgraph Exchanges["Exchanges"]
            TOPIC["lms.events\ntype: topic · durable\nMain event bus"]
            DIRECT["lms.direct\ntype: direct · durable\nPoint-to-point commands"]
            DLX["lms.dead-letter\ntype: fanout · durable\nFailed message sink"]
        end

        subgraph Queues["Durable Queues"]
            Q1["auth.events\nrouting: auth.#"]
            Q2["user.auth-events\nrouting: auth.user.#"]
            Q3["notification.auth-events\nrouting: auth.#"]
            Q4["course.events\nrouting: course.#"]
            Q5["course.publisher\nrouting: course.#"]
            Q6["enrollment.events\nrouting: payment.#"]
            Q7["wallet.events\nrouting: enrollment.#"]
            Q8["lms.dead-letter\nall failed messages"]
        end

        TOPIC --> Q1
        TOPIC --> Q2
        TOPIC --> Q3
        TOPIC --> Q4
        TOPIC --> Q5
        TOPIC --> Q6
        TOPIC --> Q7
        DLX --> Q8
    end
```

### Full Event Chain

```mermaid
flowchart TD
    REG["👤 User Registers\nPOST /api/v1/auth/register"]
    REG -->|"auth.user.registered"| USER_SVC["user-service\nCreate profile"]
    REG -->|"auth.user.registered"| NOTIF_SVC1["notification-service\nSend welcome email"]
    REG -->|"auth.user.login"| ANALYTICS_SVC1["analytics-service\nLog event"]

    BUY["💳 Student Buys Course\nPOST /api/v1/payments"]
    BUY --> PAYMENT_SVC["payment-service\nCreate invoice\n(QPay / SocialPay / Mock)"]
    PAYMENT_SVC -->|"Webhook / mock-pay"| COMPLETE["payment.confirmed\n{paymentId, userId, courseId, amount}"]
    COMPLETE -->|"payment.#"| ENROLL_SVC["enrollment-service\nenrollFromPayment()\nIdempotent: paymentId guard"]
    COMPLETE -->|"payment.#"| NOTIF_SVC2["notification-service\nSend receipt email"]
    COMPLETE -->|"payment.#"| ANALYTICS_SVC2["analytics-service\nLog payment event"]

    ENROLL_SVC -->|"enrollment.created\n{enrollmentId, courseId, studentId}"| WALLET_SVC["wallet-service\ndistributeRevenue()\n80% instructor / 20% platform\nAtomic $transaction"]
    ENROLL_SVC -->|"enrollment.created"| NOTIF_SVC3["notification-service\nSend enrollment confirmation"]
    ENROLL_SVC -->|"enrollment.created"| ANALYTICS_SVC3["analytics-service\nLog enrollment"]

    LESSON["📖 Student Completes Lesson\nPATCH /api/v1/enrollments/.../progress"]
    LESSON -->|"lesson.completed"| CERT_SVC["certificate-service\nCheck if course complete\nIssue certificate"]
    LESSON -->|"lesson.completed"| ANALYTICS_SVC4["analytics-service\nLog lesson completion"]

    CERT_SVC -->|"certificate.issued"| NOTIF_SVC4["notification-service\nSend certificate email"]

    QUIZ_SUB["📝 Quiz Submitted\nPOST /api/v1/quizzes/.../submit"]
    QUIZ_SUB -->|"quiz.submitted"| ANALYTICS_SVC5["analytics-service\nLog quiz attempt"]

    ASSIGN_SUB["📤 Assignment Submitted"]
    ASSIGN_SUB -->|"assignment.submitted"| NOTIF_SVC5["notification-service\nNotify instructor"]
    ASSIGN_SUB -->|"assignment.submitted"| ANALYTICS_SVC6["analytics-service\nLog submission"]
```

### Payment → Enrollment Sequence (Critical Path)

```mermaid
sequenceDiagram
    participant S as Student
    participant G as Gateway
    participant P as payment-service
    participant W as Webhook / Mock
    participant RMQ as RabbitMQ
    participant E as enrollment-service
    participant WA as wallet-service
    participant N as notification-service

    S->>G: POST /api/v1/payments {courseId, amount, provider: MOCK}
    G->>P: Forward
    P->>P: Create Payment (PENDING → PROCESSING)
    P->>P: Create Mock invoice
    P-->>S: { id, status: PROCESSING, invoiceId }

    S->>G: POST /api/v1/payments/{id}/mock-pay
    G->>P: Forward
    P->>P: Update status → COMPLETED
    P->>RMQ: publish payment.confirmed {paymentId, userId, courseId, amount}
    P-->>S: { status: COMPLETED }

    RMQ-->>E: Deliver to enrollment.events queue
    E->>E: enrollFromPayment() — check paymentId (idempotent)
    E->>E: Create Enrollment + LessonProgresses
    E->>RMQ: publish enrollment.created {enrollmentId, courseId, studentId}

    RMQ-->>WA: Deliver to wallet.events queue
    WA->>WA: GET /api/v1/courses/{id} (HTTP, course-service)
    WA->>WA: distributeRevenue() — $transaction\n80% → instructor wallet\n20% → platform wallet

    RMQ-->>N: Deliver to notification.auth-events queue
    N->>N: Send enrollment confirmation email

    S->>G: GET /api/v1/enrollments/check?courseId=...
    G->>E: Forward
    E-->>S: { enrolled: true }
```

---

## 6. Redis Architecture

Redis runs with `maxmemory 256mb` and `allkeys-lru` eviction policy — meaning the least-recently-used keys are automatically evicted when memory pressure occurs.

### Usage Map

```mermaid
graph LR
    subgraph REDIS["Redis :6379\nmaxmemory=256mb · allkeys-lru"]
        direction TB
        subgraph Tokens["Token Store"]
            RT["refresh:{userId}\nValue: tokenHash\nTTL: 7 days (604800s)"]
            BL["blacklist:{jti}\nValue: 1\nTTL: remaining token lifetime\nLogout invalidation"]
        end

        subgraph RateLimit["Rate Limiting (ThrottlerModule)"]
            RL["throttle:{ip}:{endpoint}\nValue: hit count\nTTL: 60s window\nLimit: 100 req"]
        end

        subgraph Cache["Response Cache (planned)"]
            CC["course:{id}\nValue: serialized course JSON\nTTL: 300s"]
        end
    end

    AUTH["auth-service"] -->|"SET on login\nDEL on logout\nGET on refresh"| RT
    AUTH -->|"SET on logout"| BL
    GW["gateway"] -->|"INCR on each request\nExpiry check"| RL
```

### Token Rotation Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant A as auth-service
    participant R as Redis

    Note over C,R: Login
    C->>A: POST /auth/login {email, password}
    A->>A: bcrypt.compare()
    A->>A: jwt.sign({sub, email, role}, JWT_SECRET, {expiresIn: '15m'})
    A->>A: jwt.sign({sub}, JWT_REFRESH_SECRET, {expiresIn: '7d'})
    A->>R: SET refresh:{userId} hash(refreshToken) EX 604800
    A-->>C: {accessToken, refreshToken}

    Note over C,R: Token Refresh
    C->>A: POST /auth/refresh {refreshToken}
    A->>R: GET refresh:{userId}
    A->>A: bcrypt.compare(token, stored_hash)
    A->>A: Generate new accessToken + refreshToken
    A->>R: SET refresh:{userId} hash(newRefreshToken) EX 604800
    A-->>C: {accessToken: new, refreshToken: rotated}

    Note over C,R: Logout
    C->>A: POST /auth/logout {refreshToken}
    A->>R: DEL refresh:{userId}
    A-->>C: 200 OK
```

---

## 7. AI Architecture

The platform's AI capabilities are powered by **Ollama** running **Llama 3.2** locally — no external LLM API calls. This ensures data privacy and eliminates per-token costs.

### AI System Overview

```mermaid
graph TB
    subgraph AI_SVC["ai-service :3009 — ai_db"]
        TUTOR["AI Tutor Module\nChat sessions\nContext-aware responses"]
        ESSAY["Essay Scorer Module\n4-rubric evaluation\nFallback: 60%"]
        REC["Recommendation Engine\nCourse suggestions\nSkill-gap analysis"]
    end

    subgraph OLLAMA["Ollama :11434"]
        MODEL["llama3.2\n(local LLM)\ntimeout: 120s"]
    end

    subgraph AI_DB["ai_db"]
        SESS["chat_sessions\n{userId, courseId, title}"]
        MSG["chat_messages\n{sessionId, role, content}"]
        SCORE["essay_scores\n{userId, assignmentId\nrubricBreakdown: JSON}"]
        RECS["recommendations\n{userId, courseId, reason, score}"]
    end

    STUDENT["👤 Student"] -->|"POST /api/v1/ai/chat"| TUTOR
    INSTRUCTOR["👨‍🏫 Instructor"] -->|"POST /api/v1/ai/score-essay"| ESSAY
    TUTOR --> MODEL
    ESSAY --> MODEL
    REC --> MODEL

    TUTOR --> SESS & MSG
    ESSAY --> SCORE
    REC --> RECS
```

### AI Tutor Chat Flow

```mermaid
sequenceDiagram
    participant S as Student
    participant AI as ai-service
    participant DB as ai_db
    participant OLL as Ollama (llama3.2)

    S->>AI: POST /ai/chat {message, sessionId?, courseId?}
    AI->>DB: Find or create ChatSession
    AI->>DB: Fetch last N messages (context window)
    
    AI->>AI: Build system prompt:\n"You are an LMS tutor.\nCourse context: {courseTitle}\nFocus on: {topic}"
    
    AI->>OLL: POST /api/chat\n{model: llama3.2, messages: [...history, userMsg]}
    Note over AI,OLL: timeout: OLLAMA_TIMEOUT_MS (120s)
    OLL-->>AI: {message: {role: assistant, content: response}}
    
    AI->>DB: INSERT chat_messages (user message)
    AI->>DB: INSERT chat_messages (assistant response)
    AI-->>S: {response, sessionId, messageId}
```

### Essay Scoring Rubric

```mermaid
graph TB
    subgraph RUBRIC["4-Category Rubric (100 points total)"]
        CONTENT["Content\n0 – 25 pts\nAccuracy · Depth · Relevance"]
        STRUCT["Structure\n0 – 25 pts\nOrganization · Flow · Clarity"]
        LANG["Language\n0 – 25 pts\nGrammar · Vocabulary · Style"]
        ARGS["Arguments\n0 – 25 pts\nLogic · Evidence · Persuasion"]
    end

    ESSAY["Essay Text\n(student submission)"] --> PROMPT

    PROMPT["Ollama Prompt\nScore each category 0-25\nReturn JSON: {content, structure, language, arguments, feedback}"]
    PROMPT --> OLL["llama3.2"]

    OLL --> PARSE{"JSON\nParse\nSuccess?"}
    PARSE -->|"Yes"| CALC["Total = content + structure + language + arguments\nSave to essay_scores"]
    PARSE -->|"No — parse failure"| FALLBACK["Fallback Score: 60\nFeedback: 'Unable to score'\nSave to essay_scores"]

    CALC --> RESULT["EssayScore\n{score, maxScore: 100\nrubricBreakdown: JSON\nfeedback: string}"]
    FALLBACK --> RESULT
```

### Recommendation Engine

```mermaid
flowchart LR
    INPUTS["Input Signals"]
    INPUTS --> ENROLL_HIST["Enrollment history\n(via HTTP to enrollment-service)"]
    INPUTS --> SKILL_GAP["Skill gaps\n(course_db: LessonSkill · Skill)"]
    INPUTS --> QUIZ_PERF["Quiz performance\n(via HTTP to quiz-service)"]

    ENROLL_HIST & SKILL_GAP & QUIZ_PERF --> OLLAMA["Ollama prompt:\n'Given these skills and history,\nrecommend 5 courses from:\n{course list}'"]
    OLLAMA --> RECS["recommendations table\n{userId, courseId, reason, score}"]
    RECS --> API["GET /api/v1/ai/recommendations\n→ [{courseId, reason, score}]"]
```

---

## 8. Interactive Lesson Engine

The interactive lesson engine embeds assessments, checkpoints, and AI prompts **inside** lesson content. A trigger fires the block at a specific moment (video second, PDF page, markdown paragraph) and can gate further progress until the student passes.

### Block Types and Triggers

```mermaid
graph LR
    subgraph LESSON["Lesson (any type)"]
        VIDEO["VIDEO\nTrigger: triggerSecond"]
        PDF["PDF\nTrigger: triggerPage"]
        MARKDOWN["MARKDOWN\nTrigger: triggerParagraph"]
        TEXT["TEXT\nTrigger: triggerParagraph"]
    end

    subgraph BLOCKS["InteractiveBlock (blockType)"]
        QUIZ_B["QUIZ\nEmbedded questions\nScore threshold → unlock"]
        CHECK["CHECKPOINT\nConfirmation prompt\nNo scoring"]
        INFO["INFO\nInformational callout\nNon-blocking"]
        ASSIGN_B["ASSIGNMENT\nLink to assignment-service\nassignmentId in contentJson"]
        AI_B["AI_PROMPT\nChat with tutor\nContext: current lesson"]
    end

    VIDEO -->|"at second N"| QUIZ_B & CHECK & INFO & AI_B
    PDF -->|"at page N"| QUIZ_B & CHECK & INFO & ASSIGN_B
    MARKDOWN -->|"at paragraph N"| QUIZ_B & INFO & AI_B
```

### Interactive Block Schema Detail

```mermaid
erDiagram
    Lesson {
        uuid id PK
        uuid moduleId FK
        enum lessonType
        bool unlockNextOnPass
        float passingScore
    }

    InteractiveBlock {
        uuid id PK
        uuid lessonId FK
        enum blockType "QUIZ|CHECKPOINT|INFO|ASSIGNMENT|AI_PROMPT"
        int sortOrder
        int triggerSecond
        int triggerPage
        int triggerParagraph
        json contentJson
        bool isRequired
        float passingScore
        bool continueOnPassOnly
    }

    InteractiveQuestion {
        uuid id PK
        uuid interactiveBlockId FK
        enum questionType "SINGLE_CHOICE|MULTIPLE_CHOICE|TRUE_FALSE|ORDERING|MATCHING|SHORT_TEXT"
        string questionText
        string explanation
        float score
        int sortOrder
    }

    InteractiveQuestionOption {
        uuid id PK
        uuid questionId FK
        string optionText
        bool isCorrect
        int sortOrder
    }

    InteractiveBlockProgress {
        uuid id PK
        uuid lessonProgressId FK
        uuid interactiveBlockId FK
        float score
        bool passed
        bool completed
        int attempts
    }

    InteractiveAnswer {
        uuid id PK
        uuid interactiveBlockProgressId FK
        uuid questionId FK
        string answerText
        json selectedOptionIds
        bool isCorrect
        float scoreAwarded
    }

    Lesson ||--o{ InteractiveBlock : "contains"
    InteractiveBlock ||--o{ InteractiveQuestion : "has"
    InteractiveQuestion ||--o{ InteractiveQuestionOption : "has"
    InteractiveBlock ||--o{ InteractiveBlockProgress : "tracks"
    InteractiveBlockProgress ||--o{ InteractiveAnswer : "records"
```

### Student Progress Flow

```mermaid
flowchart TD
    START["Student opens lesson"] --> UNLOCK{"Lesson\nstatus?"}
    UNLOCK -->|"LOCKED"| LOCKED_MSG["Show locked message\nDisplay required prerequisite"]
    UNLOCK -->|"IN_PROGRESS / COMPLETED"| CONTENT["Render lesson content"]

    CONTENT --> TRIGGER{"Interactive\nblock trigger\nreached?"}
    TRIGGER -->|"No"| CONSUME["Student continues consuming"]
    CONSUME --> TRIGGER

    TRIGGER -->|"Yes — blockType: QUIZ"| QUIZ_MODAL["Show quiz modal\nQuestions from InteractiveQuestion"]
    QUIZ_MODAL --> SUBMIT["Student submits answers"]
    SUBMIT --> SCORE["Calculate score\nSave InteractiveBlockProgress\nSave InteractiveAnswer[]"]

    SCORE --> PASS{"score ≥\npassingScore?"}
    PASS -->|"Yes"| UNLOCK_NEXT["Mark block: passed=true\nUnlock next content segment\nContinue lesson"]
    PASS -->|"No & continueOnPassOnly"| RETRY{"attempts <\nmaxAttempts?"}
    RETRY -->|"Yes"| QUIZ_MODAL
    RETRY -->|"No"| BLOCKED["Block progress\nContact instructor"]

    UNLOCK_NEXT --> ALL_DONE{"All required\nblocks passed?"}
    ALL_DONE -->|"No"| CONTENT
    ALL_DONE -->|"Yes"| COMPLETE_LESSON["Mark LessonProgress: completed\nUpdate progressPercent\nCheck unlockNextOnPass"]

    COMPLETE_LESSON --> NEXT_UNLOCK{"unlockNextOnPass\n= true?"}
    NEXT_UNLOCK -->|"Yes"| UNLOCK_LESSON["Set next LessonProgress: IN_PROGRESS"]
    NEXT_UNLOCK -->|"No"| MANUAL["Instructor must unlock"]

    COMPLETE_LESSON -->|"event"| EMIT["Publish lesson.completed\n→ analytics-service\n→ certificate-service"]
```

### Sequential vs Free-Navigation Mode

```mermaid
graph LR
    subgraph SEQ["isSequential = true (default)"]
        L1_S["Lesson 1\n✅ COMPLETED"] --> L2_S["Lesson 2\n🔓 IN_PROGRESS"] --> L3_S["Lesson 3\n🔒 LOCKED"]
    end

    subgraph FREE["isSequential = false"]
        L1_F["Lesson 1\n🔓 Available"] --- L2_F["Lesson 2\n🔓 Available"] --- L3_F["Lesson 3\n🔓 Available"]
    end

    subgraph DEP["LessonDependency — custom graph"]
        A["Lesson A\n✅"] --> C["Lesson C\n🔓"]
        B["Lesson B\n✅"] --> C
        C --> D["Lesson D\n🔒"]
    end
```

---

## 9. Quiz Engine

The quiz engine supports **standard quizzes** and **adaptive quizzes** (difficulty-branching). Quizzes can be standalone (course-level) or attached to a lesson.

### Quiz Schema

```mermaid
erDiagram
    Quiz {
        uuid id PK
        string courseId
        string lessonId
        string title
        float passingScore "default: 70"
        int timeLimit
        int maxAttempts "default: 3"
        bool isAdaptive "default: false"
        bool isPublished
    }

    Question {
        uuid id PK
        uuid quizId FK
        enum questionType "SINGLE_CHOICE|MULTIPLE_CHOICE|TRUE_FALSE|SHORT_TEXT"
        string questionText
        string explanation
        float score "default: 1"
        int sortOrder "proxy for difficulty in adaptive"
    }

    QuestionOption {
        uuid id PK
        uuid questionId FK
        string optionText
        bool isCorrect
        int sortOrder
    }

    QuizAttempt {
        uuid id PK
        uuid quizId FK
        string studentId
        enum status "IN_PROGRESS|SUBMITTED|GRADED|EXPIRED"
        float score
        bool passed
        datetime startedAt
        datetime submittedAt
        datetime expiresAt
    }

    AttemptAnswer {
        uuid id PK
        uuid attemptId FK
        uuid questionId FK
        string[] selectedOptionIds
        string textAnswer
        bool isCorrect
        float score
    }

    Quiz ||--o{ Question : "contains"
    Question ||--o{ QuestionOption : "has"
    Quiz ||--o{ QuizAttempt : "has"
    QuizAttempt ||--o{ AttemptAnswer : "records"
```

### Standard Quiz Flow

```mermaid
sequenceDiagram
    participant S as Student
    participant QS as quiz-service
    participant DB as quiz_db

    S->>QS: POST /quizzes/{id}/attempts
    QS->>DB: Check attempt count ≤ maxAttempts
    QS->>DB: Create QuizAttempt (IN_PROGRESS)\nexpiresAt = now + timeLimit
    QS->>DB: Fetch all questions (shuffled if configured)
    QS-->>S: {attemptId, questions[], expiresAt}

    S->>QS: POST /quizzes/attempts/{attemptId}/submit\n{answers: [{questionId, selectedOptionIds}]}
    QS->>DB: Fetch correct options for each question
    QS->>QS: Calculate score per question\nTotal = Σ(question.score * isCorrect)
    QS->>DB: Save AttemptAnswers
    QS->>DB: Update QuizAttempt:\nstatus=GRADED\nscore=total\npassed=(total≥passingScore)
    QS->>QS: Publish quiz.submitted event
    QS-->>S: {score, passed, passingScore, answers[]}
```

### Adaptive Quiz Engine

The adaptive engine uses `sortOrder` as a **difficulty proxy**: correct answer → serve a harder question (higher sortOrder); wrong answer → serve an easier question (lower sortOrder).

```mermaid
flowchart TD
    START["Start Adaptive Quiz\nPOST /quizzes/{id}/attempts\nisAdaptive: true"]
    START --> INIT["Select initial question\nmid-difficulty (median sortOrder)"]
    INIT --> SHOW["Show question to student"]
    SHOW --> ANS["Student answers"]
    ANS --> EVAL{"Correct?"}

    EVAL -->|"✅ Correct"| HARDER["Fetch next unanswered question\nwith sortOrder > current\n(harder)"]
    EVAL -->|"❌ Wrong"| EASIER["Fetch next unanswered question\nwith sortOrder < current\n(easier)"]

    HARDER --> MORE1{"More\nquestions?"}
    EASIER --> MORE2{"More\nquestions?"}

    MORE1 -->|"Yes"| SHOW
    MORE2 -->|"Yes"| SHOW
    MORE1 -->|"No"| GRADE
    MORE2 -->|"No"| GRADE

    GRADE["Calculate final score\nMark attempt GRADED\nPublish quiz.submitted"]
    GRADE --> RESULT["Return {score, passed, adaptivePath}"]
```

### Question Types and Answer Validation

```mermaid
graph LR
    subgraph TYPES["QuestionType"]
        SC["SINGLE_CHOICE\nExactly 1 selectedOptionId\n✅ isCorrect: 1 option"]
        MC["MULTIPLE_CHOICE\n1..N selectedOptionIds\n✅ All correct options selected\n❌ No incorrect options selected"]
        TF["TRUE_FALSE\n2 options (True/False)\nSame as SINGLE_CHOICE"]
        ST["SHORT_TEXT\ntextAnswer: string\nManual grading or AI scoring"]
    end

    subgraph SCORING["Scoring"]
        SC --> SC_SCORE["score = question.score if correct else 0"]
        MC --> MC_SCORE["score = question.score if exact match else 0"]
        TF --> TF_SCORE["score = question.score if correct else 0"]
        ST --> ST_SCORE["score = 0 (pending)\nAI service or instructor grades"]
    end
```

---

## 10. Wallet & Financial Architecture

All financial logic is isolated inside **wallet-service**. No other service touches wallet balances. Revenue is distributed atomically via Prisma `$transaction`.

### Revenue Distribution Flow

```mermaid
flowchart TD
    PAYMENT_DONE["payment.confirmed event\n{paymentId, userId, courseId, amount}"]
    PAYMENT_DONE --> ENROLL_SVC["enrollment-service\nCreate Enrollment"]
    ENROLL_SVC -->|"enrollment.created\n{enrollmentId, courseId, studentId}"| WALLET_SVC

    subgraph WALLET_SVC["wallet-service — distributeRevenue()"]
        FETCH["HTTP GET course-service\n/api/v1/courses/{courseId}\n→ {price, instructorId}"]
        FETCH --> CALC["Calculate split\ngross = course.price\nplatformFee = gross × 20%\nnetAmount = gross × 80%"]
        CALC --> TXN["Prisma $transaction ─────────────────────\n1. UPDATE wallets SET balance += netAmount\n   WHERE ownerId = instructorId\n2. INSERT revenue_shares\n   {walletId, courseId, enrollmentId\n    grossAmount, platformFee, netAmount, feePercent=20}\n───────────────────────────────────────────\nAtomic: either both succeed or neither"]
        TXN --> EMIT["Publish wallet.revenue.distributed"]
    end

    EMIT --> ANALYTICS["analytics-service\nLog revenue event"]
```

### Wallet Schema & Transaction Ledger

```mermaid
erDiagram
    Wallet {
        uuid id PK
        string ownerId UK
        string ownerType "USER or PLATFORM"
        decimal balance "18,2 precision"
        string currency "default: MNT"
        enum status "ACTIVE|SUSPENDED|CLOSED"
    }

    Transaction {
        uuid id PK
        uuid walletId FK
        enum type "CREDIT|DEBIT|REVENUE_SHARE|PAYOUT|REFUND|PLATFORM_FEE"
        enum status "PENDING|COMPLETED|FAILED|REVERSED"
        decimal amount
        decimal balanceBefore
        decimal balanceAfter
        string reference "External payment ID"
        json metadata
    }

    RevenueShare {
        uuid id PK
        uuid walletId FK
        string courseId
        string enrollmentId UK
        decimal grossAmount
        decimal platformFee
        decimal netAmount
        decimal feePercent "default: 20"
    }

    Payout {
        uuid id PK
        uuid walletId FK
        decimal amount
        enum status "PENDING|PROCESSING|COMPLETED|REJECTED"
        string bankName
        string accountNumber
        string accountName
        string rejectedReason
        datetime processedAt
    }

    Wallet ||--o{ Transaction : "ledger"
    Wallet ||--o{ RevenueShare : "earnings"
    Wallet ||--o{ Payout : "withdrawals"
```

### Payout Lifecycle

```mermaid
stateDiagram-v2
    [*] --> PENDING : Instructor requests payout\nPOST /api/v1/wallet/payouts

    PENDING --> PROCESSING : Admin reviews\nPATCH /payout/{id} status=PROCESSING

    PROCESSING --> COMPLETED : Bank transfer confirmed\nPATCH /payout/{id} status=COMPLETED\nDEBIT transaction created

    PROCESSING --> REJECTED : Admin rejects\nPATCH /payout/{id} status=REJECTED\nrejectedReason saved

    COMPLETED --> [*]
    REJECTED --> PENDING : Instructor re-applies
```

### Financial Safety Rules

```mermaid
graph TB
    RULE1["Rule 1: Isolation\nOnly wallet-service reads/writes wallet_db\nNo other service may touch wallet tables"]
    RULE2["Rule 2: Atomicity\nAll balance changes use Prisma $transaction\nBalance update + ledger record = one atomic operation"]
    RULE3["Rule 3: Idempotency\nRevenueShare.enrollmentId is UNIQUE\nDuplicate enrollment.created events → no double credit"]
    RULE4["Rule 4: Precision\nAll amounts stored as Decimal(18, 2)\nNo floating-point arithmetic for money"]
    RULE5["Rule 5: Audit trail\nEvery balance change creates a Transaction record\nbalanceBefore and balanceAfter stored"]

    RULE1 & RULE2 & RULE3 & RULE4 & RULE5 --> SAFE["Financial Integrity"]
```

---

## Appendix: Service Port Reference

| Service | Port | Database | Key Endpoints |
|---------|------|----------|---------------|
| NGINX | 80 | — | `/api/*` → gateway, `/` → web |
| **gateway** | 3000 | — | `/api/health`, `/docs` |
| **auth-service** | 3001 | auth_db | `/api/v1/auth/login`, `/register`, `/refresh`, `/logout` |
| **user-service** | 3002 | user_db | `/api/v1/users/me`, `/api/v1/users/:id` |
| **course-service** | 3003 | course_db | `/api/v1/courses`, `/modules`, `/lessons` |
| **quiz-service** | 3004 | quiz_db | `/api/v1/quizzes`, `/attempts`, `/submit` |
| **enrollment-service** | 3005 | enrollment_db | `/api/v1/enrollments`, `/check`, `/progress` |
| **assignment-service** | 3006 | assignment_db | `/api/v1/assignments`, `/submissions`, `/grade` |
| **wallet-service** | 3007 | wallet_db | `/api/v1/wallet/balance`, `/transactions`, `/payouts` |
| **payment-service** | 3008 | payment_db | `/api/v1/payments`, `/mock-pay`, `/webhook/:provider` |
| **ai-service** | 3009 | ai_db | `/api/v1/ai/chat`, `/score-essay`, `/recommendations` |
| **notification-service** | 3010 | notification_db | `/api/v1/notifications` |
| **media-service** | 3011 | MinIO | `/api/v1/media/upload`, `/transcode` |
| **certificate-service** | 3012 | certificate_db | `/api/v1/certificates`, `/verify/:code` |
| **analytics-service** | 3013 | analytics_db | `/api/v1/analytics/kpi`, `/events` |
| RabbitMQ Management | 15672 | — | `http://localhost:15672` |
| MinIO Console | 9001 | — | `http://localhost:9001` |
| PostgreSQL | 5432 | 13 DBs | Direct psql only |
| Redis | 6379 | — | Direct redis-cli only |
| Ollama | 11434 | — | Internal only |

## Appendix: Technology Decision Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| HTTP framework | Fastify (gateway) · Express (services) | Fastify: 500MB multipart, high throughput for gateway |
| ORM | Prisma | Type-safe, migration history, per-service isolation |
| Message broker | RabbitMQ topic exchange | Pattern routing (`payment.#`, `enrollment.#`), durable queues |
| LLM inference | Ollama (local) | Zero per-token cost, data privacy, offline capability |
| Object storage | MinIO | S3-compatible, self-hosted, Docker-native |
| Cache / token store | Redis allkeys-lru | Auto-eviction under pressure, fast token lookups |
| Auth | JWT + Redis refresh | Stateless access tokens, revocable refresh tokens |
| Financial precision | Prisma `Decimal(18,2)` | Avoids IEEE 754 floating-point errors in money math |
