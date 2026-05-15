# LMS Platform — API Reference

> **Base URL:** `http://localhost/api/v1`  
> **Swagger UI:** `http://localhost/docs` *(development only)*  
> **Content-Type:** `application/json` for all requests and responses  
> **Auth:** Bearer JWT in `Authorization` header

---

## Table of Contents

1. [Conventions](#1-conventions)
2. [Authentication & JWT](#2-authentication--jwt)
3. [RBAC — Role-Based Access Control](#3-rbac--role-based-access-control)
4. [Pagination](#4-pagination)
5. [Filtering & Search](#5-filtering--search)
6. [Error Responses](#6-error-responses)
7. [Auth Endpoints](#7-auth-endpoints)
8. [Course Endpoints](#8-course-endpoints)
9. [Module & Lesson Endpoints](#9-module--lesson-endpoints)
10. [Interactive Block Endpoints](#10-interactive-block-endpoints)
11. [Enrollment & Progress Endpoints](#11-enrollment--progress-endpoints)
12. [Quiz Endpoints](#12-quiz-endpoints)
13. [Assignment Endpoints](#13-assignment-endpoints)
14. [Payment Endpoints](#14-payment-endpoints)
15. [Wallet & Payout Endpoints](#15-wallet--payout-endpoints)
16. [AI Endpoints](#16-ai-endpoints)
17. [Notification Endpoints](#17-notification-endpoints)
18. [Certificate Endpoints](#18-certificate-endpoints)
19. [Media Endpoints](#19-media-endpoints)
20. [Analytics Endpoints](#20-analytics-endpoints)
21. [Health Endpoints](#21-health-endpoints)

---

## 1. Conventions

### Response Envelope

Every response is wrapped in the same envelope:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable message",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

Error responses use the same shape with `success: false` and an `error` key instead of `data` (see [§6](#6-error-responses)).

### UUID Parameters

All resource IDs are UUIDs (v4). Pass them in path parameters without braces:

```
GET /api/v1/courses/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

Invalid UUIDs return `400 Bad Request`.

### HTTP Methods

| Method | Semantics |
|--------|-----------|
| `GET` | Read — never mutates state |
| `POST` | Create a new resource, or trigger an action |
| `PATCH` | Partial update — only supplied fields change |
| `DELETE` | Remove resource; returns `204 No Content` on success |

---

## 2. Authentication & JWT

### Token Types

| Token | Lifetime | Purpose |
|-------|----------|---------|
| `accessToken` | 15 minutes | Authenticate API requests |
| `refreshToken` | 7 days | Obtain a new access token |

### Attaching the Token

Include the access token in every protected request:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### JWT Payload Structure

```json
{
  "sub":   "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "role":  "STUDENT",
  "jti":   "unique-token-id",
  "iat":   1736944200,
  "exp":   1736945100
}
```

| Claim | Description |
|-------|-------------|
| `sub` | User UUID — used as `userId` in all service calls |
| `email` | User's email address |
| `role` | One of `SUPER_ADMIN`, `ADMIN`, `INSTRUCTOR`, `STUDENT` |
| `jti` | JWT ID — used to revoke individual tokens on logout |
| `iat` | Issued-at (Unix timestamp) |
| `exp` | Expiry (Unix timestamp) |

### Token Refresh Flow

```
POST /api/v1/auth/refresh
Body: { "refreshToken": "<7-day token>" }

← 200 { accessToken: "<new 15m>", refreshToken: "<rotated 7d>" }
```

Refresh tokens rotate on every use — store the new one each time.

### Logout

`POST /api/v1/auth/logout` revokes the current JWT (`jti` blacklisted in Redis, TTL = remaining lifetime).  
`POST /api/v1/auth/logout-all` revokes all sessions (deletes refresh token from Redis).

---

## 3. RBAC — Role-Based Access Control

### Roles

| Role | Description |
|------|-------------|
| `SUPER_ADMIN` | Full platform access; can manage all organizations and users |
| `ADMIN` | Manage users, courses, and content within an organization |
| `INSTRUCTOR` | Create and manage own courses; grade assignments |
| `STUDENT` | Enroll in courses; submit assignments and quizzes |

### Endpoint Access Matrix

| Endpoint | SUPER_ADMIN | ADMIN | INSTRUCTOR | STUDENT | Public |
|----------|:-----------:|:-----:|:----------:|:-------:|:------:|
| `POST /auth/register` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `POST /auth/login` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET /auth/users` | ✓ | ✓ | — | — | — |
| `PATCH /auth/users/:id/status` | ✓ | ✓ | — | — | — |
| `GET /courses` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `POST /courses` | ✓ | ✓ | ✓ | — | — |
| `PATCH /courses/:id` | ✓ | ✓ | owner | — | — |
| `DELETE /courses/:id` | ✓ | ✓ | owner | — | — |
| `POST /courses/:id/publish` | ✓ | ✓ | owner | — | — |
| `POST /enrollments` | ✓ | ✓ | ✓ | ✓ | — |
| `POST /quizzes` | ✓ | ✓ | ✓ | — | — |
| `POST /quizzes/:id/attempts` | ✓ | ✓ | ✓ | ✓ | — |
| `POST /assignments` | ✓ | ✓ | ✓ | — | — |
| `POST /submissions/:id/grade` | ✓ | ✓ | ✓ | — | — |
| `POST /payments` | ✓ | ✓ | ✓ | ✓ | — |
| `GET /wallet/me` | ✓ | ✓ | ✓ | — | — |
| `POST /wallet/payouts` | ✓ | ✓ | ✓ | — | — |
| `POST /wallet/payouts/:id/complete` | ✓ | ✓ | — | — | — |
| `GET /analytics/overview` | ✓ | ✓ | — | — | — |
| `GET /certificates/verify/:code` | ✓ | ✓ | ✓ | ✓ | ✓ |

### How RBAC Is Enforced

The gateway injects `x-user-id` and passes the JWT payload to upstream services. Services use `@Roles()` decorator + `RolesGuard`:

- **Missing token** → `401 Unauthorized`
- **Insufficient role** → `403 Forbidden`
- **Resource owned by another user** → `403 Forbidden` (checked in service layer)

---

## 4. Pagination

All list endpoints support cursor-free offset pagination:

### Query Parameters

| Parameter | Type | Default | Maximum | Description |
|-----------|------|---------|---------|-------------|
| `page` | integer | `1` | — | Page number (1-indexed) |
| `limit` | integer | `20` | `100` | Items per page |

### Paginated Response

```json
{
  "success": true,
  "data": {
    "data": [ ... ],
    "meta": {
      "total": 143,
      "page": 2,
      "limit": 20,
      "totalPages": 8
    }
  }
}
```

### Example

```
GET /api/v1/auth/users?page=3&limit=10
```

---

## 5. Filtering & Search

### Course Listing Filters

```
GET /api/v1/courses?status=PUBLISHED&level=BEGINNER&search=python&page=1&limit=20
```

| Parameter | Values | Description |
|-----------|--------|-------------|
| `status` | `DRAFT` `PUBLISHED` `ARCHIVED` | Filter by course status |
| `level` | `BEGINNER` `INTERMEDIATE` `ADVANCED` | Filter by difficulty |
| `instructorId` | UUID | Filter by instructor |
| `search` | string | Full-text search on title (trimmed) |

### User Listing Filters

```
GET /api/v1/auth/users?role=INSTRUCTOR&page=1&limit=20
```

| Parameter | Values | Description |
|-----------|--------|-------------|
| `role` | `SUPER_ADMIN` `ADMIN` `INSTRUCTOR` `STUDENT` | Filter by role |

### Quiz Filters

```
GET /api/v1/quizzes?courseId=<uuid>&lessonId=<uuid>
```

### Analytics Filters

```
GET /api/v1/analytics/timeseries?days=7
GET /api/v1/analytics/events?eventType=payment.confirmed&limit=50&offset=0
GET /api/v1/analytics/courses?limit=5
```

---

## 6. Error Responses

### Error Envelope

```json
{
  "success": false,
  "statusCode": 404,
  "error": "Not Found",
  "message": "Course not found"
}
```

### Status Codes

| Code | Name | Common Cause |
|------|------|-------------|
| `400` | Bad Request | Validation failure, invalid UUID, missing required field |
| `401` | Unauthorized | Missing or expired JWT |
| `403` | Forbidden | Authenticated but insufficient role / not the owner |
| `404` | Not Found | Resource with given ID does not exist |
| `409` | Conflict | Unique constraint violation (e.g. email already registered, already enrolled) |
| `422` | Unprocessable Entity | Business rule violation (e.g. cannot publish empty course) |
| `429` | Too Many Requests | Rate limit exceeded (100 req / 60 s per IP) |
| `500` | Internal Server Error | Unexpected server-side error |

### Validation Error (400)

```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": [
    "password must contain uppercase, lowercase, number, and special character",
    "email must be an email"
  ]
}
```

### Rate Limit Error (429)

```json
{
  "success": false,
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "ThrottlerException: Too Many Requests"
}
```

---

## 7. Auth Endpoints

### `POST /auth/register`

Create a new user account. Returns tokens immediately.

**Access:** Public

**Request:**
```json
{
  "email": "student@example.com",
  "password": "P@ssw0rd!",
  "role": "STUDENT"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `email` | string | ✓ | Valid email format |
| `password` | string | ✓ | ≥8 chars, uppercase + lowercase + digit + special char |
| `role` | enum | — | `SUPER_ADMIN` `ADMIN` `INSTRUCTOR` `STUDENT` — default: `STUDENT` |

**Response `201`:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errors:** `400` validation · `409` email already registered

---

### `POST /auth/login`

**Access:** Public

**Request:**
```json
{
  "email": "student@example.com",
  "password": "P@ssw0rd!"
}
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errors:** `401` invalid credentials · `400` validation

---

### `POST /auth/refresh`

Rotate access and refresh tokens.

**Access:** Public (requires valid refresh token in body)

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errors:** `401` invalid or expired refresh token

---

### `POST /auth/logout`

Revoke current session. Blacklists the access token's `jti` in Redis.

**Access:** Any authenticated user  
**Header:** `Authorization: Bearer <accessToken>`

**Response `200`:**
```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

---

### `POST /auth/logout-all`

Revoke all sessions by deleting the refresh token from Redis.

**Access:** Any authenticated user

**Response `200`:**
```json
{ "success": true, "message": "Logged out from all sessions", "data": null }
```

---

### `GET /auth/me`

Get the authenticated user's profile.

**Access:** Any authenticated user

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "student@example.com",
    "role": "STUDENT",
    "isActive": true,
    "mfaEnabled": false,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### `PATCH /auth/change-password`

Change password. Logs out all sessions after change.

**Access:** Any authenticated user

**Request:**
```json
{
  "currentPassword": "OldP@ssw0rd!",
  "newPassword": "NewP@ssw0rd!"
}
```

**Response `200`:**
```json
{ "success": true, "message": "Password changed successfully", "data": null }
```

**Errors:** `401` wrong current password

---

### `GET /auth/users` *(Admin)*

List all users with pagination.

**Access:** `ADMIN`, `SUPER_ADMIN`

**Query:** `?role=INSTRUCTOR&page=1&limit=20`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "email": "instructor@example.com",
        "role": "INSTRUCTOR",
        "isActive": true,
        "createdAt": "2025-01-01T00:00:00.000Z"
      }
    ],
    "meta": { "total": 45, "page": 1, "limit": 20, "totalPages": 3 }
  }
}
```

**Errors:** `401` · `403`

---

### `PATCH /auth/users/:id/status` *(Admin)*

Activate or deactivate a user account.

**Access:** `ADMIN`, `SUPER_ADMIN`

**Request:**
```json
{ "isActive": false }
```

**Response `200`:**
```json
{ "success": true, "message": "User deactivated", "data": null }
```

**Errors:** `401` · `403` · `404`

---

## 8. Course Endpoints

### `POST /courses`

Create a new course. The caller becomes the instructor (`instructorId`).

**Access:** `INSTRUCTOR`, `ADMIN`, `SUPER_ADMIN`

**Request:**
```json
{
  "title": "Introduction to Machine Learning",
  "description": "Learn ML fundamentals from scratch.",
  "level": "BEGINNER",
  "price": "49900.00",
  "tags": ["machine-learning", "python", "ai"],
  "language": "mn",
  "isSequential": true,
  "passingScore": 70,
  "thumbnail": "https://cdn.example.com/ml-course.jpg"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `title` | string | ✓ | 3–200 chars |
| `description` | string | — | max 2000 chars |
| `thumbnail` | string | — | URL |
| `level` | enum | — | `BEGINNER` `INTERMEDIATE` `ADVANCED` — default: `BEGINNER` |
| `price` | string (decimal) | — | decimal with 0–2 decimal places — default: `"0"` |
| `tags` | string[] | — | |
| `language` | string | — | max 10 chars — default: `"mn"` |
| `isSequential` | boolean | — | default: `true` |
| `passingScore` | number | — | 0–100 — default: `60` |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-...",
    "title": "Introduction to Machine Learning",
    "slug": "introduction-to-machine-learning",
    "description": "Learn ML fundamentals from scratch.",
    "instructorId": "550e8400-...",
    "price": "49900.00",
    "level": "BEGINNER",
    "status": "DRAFT",
    "tags": ["machine-learning", "python", "ai"],
    "language": "mn",
    "isSequential": true,
    "passingScore": 70,
    "totalLessons": 0,
    "totalMinutes": 0,
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
}
```

---

### `GET /courses`

List courses. No auth required — returns `PUBLISHED` courses by default.

**Access:** Public

**Query:**

| Parameter | Example | Description |
|-----------|---------|-------------|
| `status` | `PUBLISHED` | Filter by status |
| `level` | `BEGINNER` | Filter by level |
| `instructorId` | `uuid` | Filter by instructor |
| `search` | `python` | Search by title |
| `page` | `1` | Page number |
| `limit` | `20` | Items per page (max 100) |

**Example:**
```
GET /api/v1/courses?status=PUBLISHED&level=BEGINNER&search=python&page=1&limit=10
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "a1b2c3d4-...",
        "title": "Python Basics",
        "slug": "python-basics",
        "instructorId": "uuid",
        "price": "0.00",
        "level": "BEGINNER",
        "status": "PUBLISHED",
        "tags": ["python"],
        "totalLessons": 12,
        "totalMinutes": 180,
        "createdAt": "2025-01-01T00:00:00.000Z"
      }
    ],
    "meta": { "total": 34, "page": 1, "limit": 10, "totalPages": 4 }
  }
}
```

---

### `GET /courses/:id`

Get full course detail including all modules and lessons.

**Access:** Public

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-...",
    "title": "Introduction to Machine Learning",
    "slug": "introduction-to-machine-learning",
    "description": "Learn ML fundamentals from scratch.",
    "instructorId": "uuid",
    "price": "49900.00",
    "level": "BEGINNER",
    "status": "PUBLISHED",
    "tags": ["machine-learning"],
    "language": "mn",
    "isSequential": true,
    "passingScore": 70,
    "totalLessons": 24,
    "totalMinutes": 360,
    "publishedAt": "2025-01-10T00:00:00.000Z",
    "modules": [
      {
        "id": "mod-uuid",
        "title": "Module 1: Fundamentals",
        "sortOrder": 1,
        "unlockScore": null,
        "lessons": [
          {
            "id": "lesson-uuid",
            "title": "What is Machine Learning?",
            "lessonType": "VIDEO",
            "sortOrder": 1,
            "estimatedMinutes": 15,
            "isPreview": true,
            "contentUrl": "https://cdn.example.com/video.mp4"
          }
        ]
      }
    ]
  }
}
```

**Errors:** `404`

---

### `GET /courses/slug/:slug`

Get course by URL slug.

**Access:** Public  
**Response:** Same as `GET /courses/:id`

---

### `PATCH /courses/:id`

Update course fields. Only the course owner or admin may update.

**Access:** Course owner (`INSTRUCTOR`), `ADMIN`, `SUPER_ADMIN`

**Request:** Any subset of `CreateCourseDto` fields.
```json
{
  "title": "Introduction to ML — Updated",
  "price": "79900.00",
  "level": "INTERMEDIATE"
}
```

**Response `200`:** Updated course object

**Errors:** `401` · `403` · `404`

---

### `POST /courses/:id/publish`

Transition course from `DRAFT` → `PUBLISHED`.

**Access:** Course owner, `ADMIN`, `SUPER_ADMIN`

**Response `200`:**
```json
{ "success": true, "data": { "id": "...", "status": "PUBLISHED", "publishedAt": "2025-01-15T..." } }
```

**Errors:** `401` · `403` · `404` · `422` (course has no lessons)

---

### `POST /courses/:id/archive`

Transition course from `PUBLISHED` → `ARCHIVED`.

**Access:** Course owner, `ADMIN`, `SUPER_ADMIN`

**Response `200`:** Updated course with `status: "ARCHIVED"`

---

### `DELETE /courses/:id`

Delete a course and all its modules/lessons (cascade).

**Access:** Course owner, `ADMIN`, `SUPER_ADMIN`

**Response `200`:**
```json
{ "success": true, "data": null }
```

---

## 9. Module & Lesson Endpoints

### `POST /courses/:courseId/modules`

**Access:** Course owner, `ADMIN`, `SUPER_ADMIN`

**Request:**
```json
{
  "title": "Module 1: Fundamentals",
  "description": "Core concepts you need to know",
  "sortOrder": 1,
  "unlockScore": null
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `title` | string | ✓ | 2–200 chars |
| `description` | string | — | max 1000 chars |
| `sortOrder` | integer | — | ≥0, default `0` |
| `unlockScore` | number | — | minimum score to unlock module |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "mod-uuid",
    "courseId": "course-uuid",
    "title": "Module 1: Fundamentals",
    "sortOrder": 1,
    "unlockScore": null,
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

---

### `GET /courses/:courseId/modules`

List all modules for a course (with lessons).

**Access:** Public

---

### `PATCH /courses/:courseId/modules/:moduleId`

Update module fields.

**Access:** Course owner, admin

---

### `DELETE /courses/:courseId/modules/:moduleId`

Delete module and all its lessons.

**Access:** Course owner, admin  
**Response:** `200` with deleted module

---

### `POST /courses/:courseId/modules/:moduleId/lessons`

Create a lesson inside a module.

**Access:** Course owner, `ADMIN`, `SUPER_ADMIN`

**Request:**
```json
{
  "title": "Introduction Video",
  "description": "Overview of the course",
  "lessonType": "VIDEO",
  "sortOrder": 1,
  "contentUrl": "https://cdn.example.com/intro.mp4",
  "estimatedMinutes": 15,
  "isPreview": true,
  "passingScore": 60,
  "unlockNextOnPass": true
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `title` | string | ✓ | 2–200 chars |
| `lessonType` | enum | — | `VIDEO` `PDF` `MARKDOWN` `TEXT` `LIVE` `QUIZ` — default: `TEXT` |
| `sortOrder` | integer | — | ≥0, default `0` |
| `contentUrl` | string | — | URL for video/PDF |
| `rawMarkdown` | string | — | Markdown content |
| `rawText` | string | — | Plain text content |
| `estimatedMinutes` | integer | — | ≥0 |
| `isPreview` | boolean | — | Free preview — default: `false` |
| `passingScore` | number | — | 0–100, default `60` |
| `unlockNextOnPass` | boolean | — | default `true` |

**Response `200`:** Lesson object

---

### `GET /courses/:courseId/modules/:moduleId/lessons`

List lessons in a module.

**Access:** Public

---

### `PATCH /courses/:courseId/modules/:moduleId/lessons/:lessonId`

Update lesson.

**Access:** Course owner, admin

---

### `DELETE /courses/:courseId/modules/:moduleId/lessons/:lessonId`

Delete lesson.

**Access:** Course owner, admin

---

## 10. Interactive Block Endpoints

Interactive blocks are embedded within lessons and trigger at a specific moment (video second, PDF page, or paragraph number).

### `POST /courses/:courseId/lessons/:lessonId/blocks`

Create an interactive block.

**Access:** Course owner, `ADMIN`, `SUPER_ADMIN`

**Request:**
```json
{
  "blockType": "QUIZ",
  "title": "Check Your Understanding",
  "sortOrder": 1,
  "triggerSecond": 300,
  "isRequired": true,
  "passingScore": 70,
  "continueOnPassOnly": true,
  "unlockNextContent": true,
  "contentJson": {}
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `blockType` | enum | ✓ | `QUIZ` `CHECKPOINT` `INFO` `ASSIGNMENT` `AI_PROMPT` |
| `triggerSecond` | integer | — | Fire at this video second |
| `triggerPage` | integer | — | Fire at this PDF page |
| `triggerParagraph` | integer | — | Fire at this paragraph |
| `isRequired` | boolean | — | Student must complete to progress — default `true` |
| `passingScore` | number | — | Score threshold to mark as passed |
| `continueOnPassOnly` | boolean | — | Block content if score < passingScore — default `true` |
| `contentJson` | object | — | Block-type-specific config |

**Response `200`:** Interactive block object

---

### `POST /courses/:courseId/lessons/:lessonId/blocks/:blockId/questions`

Add a question to an interactive block.

**Request:**
```json
{
  "questionType": "SINGLE_CHOICE",
  "questionText": "What is supervised learning?",
  "explanation": "Supervised learning uses labeled training data.",
  "score": 1,
  "sortOrder": 1
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `questionType` | enum | ✓ | `SINGLE_CHOICE` `MULTIPLE_CHOICE` `TRUE_FALSE` `ORDERING` `MATCHING` `SHORT_TEXT` |
| `questionText` | string | ✓ | |
| `explanation` | string | — | Shown after answer |
| `score` | number | — | Points for correct answer, default `1` |

---

### `POST /courses/:courseId/lessons/:lessonId/blocks/:blockId/questions/:questionId/options`

Add an answer option to a question.

**Request:**
```json
{
  "optionText": "Learning from labeled data",
  "isCorrect": true,
  "sortOrder": 1
}
```

---

### `POST /courses/:courseId/lessons/:lessonId/progress/blocks/:blockId/submit`

Submit answers for an interactive block (student).

**Access:** Any authenticated user (enrolled student)

**Request:**
```json
{
  "answers": [
    {
      "questionId": "q-uuid",
      "selectedOptionIds": ["opt-uuid-1"]
    },
    {
      "questionId": "q-uuid-2",
      "answerText": "Machine learning is..."
    }
  ]
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "blockProgressId": "bp-uuid",
    "score": 0.9,
    "passed": true,
    "attempts": 1,
    "answers": [
      { "questionId": "q-uuid", "isCorrect": true, "scoreAwarded": 1 }
    ]
  }
}
```

---

## 11. Enrollment & Progress Endpoints

### `POST /enrollments`

Enroll in a free course. For paid courses, payment must complete first (enrollment is created automatically via `payment.confirmed` event).

**Access:** Any authenticated user

**Request:**
```json
{
  "courseId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Enrolled successfully",
  "data": {
    "id": "enrollment-uuid",
    "courseId": "course-uuid",
    "studentId": "student-uuid",
    "progressPercent": 0,
    "totalScore": 0,
    "completed": false,
    "enrolledAt": "2025-01-15T10:00:00.000Z",
    "lessonProgresses": [
      {
        "lessonId": "lesson-uuid",
        "status": "IN_PROGRESS",
        "progressPercent": 0,
        "score": 0,
        "completed": false
      }
    ]
  }
}
```

**Errors:** `409` already enrolled · `404` course not found

---

### `GET /enrollments/my`

List all my enrollments.

**Access:** Any authenticated user

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "enrollment-uuid",
      "courseId": "course-uuid",
      "progressPercent": 45.5,
      "totalScore": 82.0,
      "completed": false,
      "enrolledAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### `GET /enrollments/check?courseId=:courseId`

Check enrollment status for a specific course.

**Access:** Any authenticated user

**Example:**
```
GET /api/v1/enrollments/check?courseId=a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Response `200`:**
```json
{
  "success": true,
  "data": { "enrolled": true }
}
```

---

### `GET /enrollments/by-course/:courseId`

Get full enrollment object for a specific course.

**Access:** Any authenticated user

**Response `200`:** Full enrollment object with `lessonProgresses`

---

### `GET /enrollments/:id`

Get a specific enrollment by ID.

**Access:** Enrollment owner

---

### `DELETE /enrollments/:id`

Unenroll from a course.

**Access:** Enrollment owner

**Response `200`:**
```json
{ "success": true, "message": "Unenrolled successfully", "data": null }
```

---

### `GET /enrollments/:enrollmentId/progress`

Get full lesson progress for an enrollment.

**Access:** Enrollment owner

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "enrollmentId": "uuid",
    "progressPercent": 33.3,
    "lessonProgresses": [
      {
        "id": "lp-uuid",
        "lessonId": "lesson-uuid",
        "status": "COMPLETED",
        "progressPercent": 100,
        "score": 90,
        "completed": true,
        "unlockedAt": "2025-01-10T08:00:00.000Z",
        "completedAt": "2025-01-10T09:30:00.000Z"
      },
      {
        "id": "lp-uuid-2",
        "lessonId": "lesson-uuid-2",
        "status": "IN_PROGRESS",
        "progressPercent": 50,
        "score": 0,
        "completed": false,
        "unlockedAt": "2025-01-10T09:30:00.000Z",
        "completedAt": null
      }
    ]
  }
}
```

---

### `PATCH /enrollments/:enrollmentId/progress/:lessonId`

Update lesson progress (e.g. video playback position).

**Access:** Enrollment owner

**Request:**
```json
{
  "progressPercent": 75.5,
  "score": 0
}
```

**Response `200`:** Updated `LessonProgress` object

---

### `POST /enrollments/:enrollmentId/progress/:lessonId/complete`

Mark lesson as 100% completed.

**Access:** Enrollment owner

**Response `200`:**
```json
{
  "success": true,
  "message": "Lesson completed",
  "data": {
    "lessonId": "uuid",
    "status": "COMPLETED",
    "completed": true,
    "completedAt": "2025-01-15T11:00:00.000Z",
    "nextLessonUnlocked": true
  }
}
```

---

## 12. Quiz Endpoints

### `POST /quizzes`

Create a new quiz.

**Access:** `INSTRUCTOR`, `ADMIN`, `SUPER_ADMIN`

**Request:**
```json
{
  "courseId": "course-uuid",
  "lessonId": "lesson-uuid",
  "title": "Module 1 Assessment",
  "description": "Test your understanding of the fundamentals",
  "passingScore": 70,
  "timeLimit": 30,
  "maxAttempts": 3,
  "isAdaptive": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `courseId` | UUID | ✓ | Course this quiz belongs to |
| `lessonId` | UUID | — | Attach to a specific lesson |
| `passingScore` | number | — | 0–100, default `70` |
| `timeLimit` | integer | — | Minutes; `null` = unlimited |
| `maxAttempts` | integer | — | Default `3` |
| `isAdaptive` | boolean | — | Enable adaptive branching, default `false` |

**Response `200`:** Quiz object

---

### `GET /quizzes`

**Access:** Any authenticated user  
**Query:** `?courseId=uuid&lessonId=uuid`

---

### `GET /quizzes/:id`

Get quiz with all questions and options.

**Access:** Any authenticated user

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "quiz-uuid",
    "title": "Module 1 Assessment",
    "passingScore": 70,
    "timeLimit": 30,
    "maxAttempts": 3,
    "isAdaptive": false,
    "isPublished": true,
    "questions": [
      {
        "id": "q-uuid",
        "questionType": "SINGLE_CHOICE",
        "questionText": "What is supervised learning?",
        "score": 1,
        "sortOrder": 1,
        "options": [
          { "id": "opt-1", "optionText": "Learning from labeled data", "sortOrder": 1 },
          { "id": "opt-2", "optionText": "Learning without labels", "sortOrder": 2 }
        ]
      }
    ]
  }
}
```

> Note: `isCorrect` is hidden from students; only returned to instructors.

---

### `PATCH /quizzes/:id`

Update quiz settings.

**Access:** `INSTRUCTOR`, `ADMIN`, `SUPER_ADMIN`

---

### `POST /quizzes/:id/publish`

Publish quiz so students can attempt it.

**Access:** `INSTRUCTOR`, `ADMIN`, `SUPER_ADMIN`

---

### `DELETE /quizzes/:id`

Delete quiz and all attempts.

**Response:** `204 No Content`

---

### `POST /quizzes/:quizId/attempts`

Start a new quiz attempt.

**Access:** Any authenticated user

**Response `200`:**
```json
{
  "success": true,
  "message": "Attempt started",
  "data": {
    "id": "attempt-uuid",
    "quizId": "quiz-uuid",
    "studentId": "student-uuid",
    "status": "IN_PROGRESS",
    "startedAt": "2025-01-15T10:00:00.000Z",
    "expiresAt": "2025-01-15T10:30:00.000Z",
    "questions": [
      {
        "id": "q-uuid",
        "questionText": "What is supervised learning?",
        "questionType": "SINGLE_CHOICE",
        "options": [
          { "id": "opt-1", "optionText": "Learning from labeled data" },
          { "id": "opt-2", "optionText": "Learning without labels" }
        ]
      }
    ]
  }
}
```

**Errors:** `409` max attempts reached · `404` quiz not found

---

### `GET /quizzes/:quizId/attempts/my`

Get my attempt history for a quiz.

**Access:** Any authenticated user

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "attempt-uuid",
      "status": "GRADED",
      "score": 85.0,
      "passed": true,
      "startedAt": "2025-01-15T10:00:00.000Z",
      "submittedAt": "2025-01-15T10:18:00.000Z"
    }
  ]
}
```

---

### `POST /quizzes/:quizId/attempts/:attemptId/submit`

Submit answers for an in-progress attempt.

**Access:** Any authenticated user (attempt owner)

**Request:**
```json
{
  "answers": [
    {
      "questionId": "q-uuid-1",
      "selectedOptionIds": ["opt-uuid-1"]
    },
    {
      "questionId": "q-uuid-2",
      "selectedOptionIds": ["opt-uuid-a", "opt-uuid-b"]
    },
    {
      "questionId": "q-uuid-3",
      "textAnswer": "Overfitting occurs when..."
    }
  ]
}
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Attempt submitted",
  "data": {
    "attemptId": "attempt-uuid",
    "score": 85.0,
    "passed": true,
    "passingScore": 70,
    "status": "GRADED",
    "submittedAt": "2025-01-15T10:18:00.000Z",
    "answers": [
      {
        "questionId": "q-uuid-1",
        "isCorrect": true,
        "score": 1,
        "explanation": "Supervised learning uses labeled training data."
      }
    ]
  }
}
```

---

## 13. Assignment Endpoints

### `POST /assignments`

**Access:** `INSTRUCTOR`, `ADMIN`, `SUPER_ADMIN`

**Request:**
```json
{
  "courseId": "course-uuid",
  "lessonId": "lesson-uuid",
  "title": "Final Project: Build a Classifier",
  "description": "Build a binary classifier using scikit-learn and submit your code.",
  "type": "FILE_UPLOAD",
  "maxScore": 100,
  "passingScore": 60,
  "dueDate": "2025-02-01T23:59:00.000Z",
  "allowLate": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `courseId` | UUID | ✓ | |
| `lessonId` | UUID | — | Attach to lesson |
| `type` | enum | — | `FILE_UPLOAD` `TEXT` `LINK` `CODE` — default `TEXT` |
| `maxScore` | number | — | Max possible score, default `100` |
| `passingScore` | number | — | 0–100, default `60` |
| `dueDate` | ISO 8601 string | — | Assignment deadline |
| `allowLate` | boolean | — | Accept submissions after deadline, default `false` |

**Response `200`:** Assignment object

---

### `GET /assignments`

**Access:** Any authenticated user  
**Query:** `?courseId=uuid&lessonId=uuid`

---

### `GET /assignments/:id`

**Access:** Any authenticated user

---

### `POST /assignments/:id/publish`

**Access:** `INSTRUCTOR`, `ADMIN`, `SUPER_ADMIN`

---

### `DELETE /assignments/:id`

**Response:** `204 No Content`

---

### `POST /assignments/:assignmentId/submissions/draft`

Save or update a draft submission. Can be called multiple times.

**Access:** Any authenticated user

**Request:**
```json
{
  "content": "My solution explanation...",
  "fileUrls": ["https://cdn.example.com/submission.zip"],
  "linkUrl": null
}
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Draft saved",
  "data": {
    "id": "sub-uuid",
    "assignmentId": "assign-uuid",
    "studentId": "student-uuid",
    "status": "DRAFT",
    "content": "My solution explanation...",
    "fileUrls": ["https://cdn.example.com/submission.zip"],
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

---

### `POST /assignments/:assignmentId/submissions/submit`

Finalise and submit the draft. Changes status to `SUBMITTED`.

**Access:** Assignment owner

**Response `200`:**
```json
{
  "success": true,
  "message": "Submitted successfully",
  "data": {
    "id": "sub-uuid",
    "status": "SUBMITTED",
    "submittedAt": "2025-01-15T11:00:00.000Z",
    "isLate": false
  }
}
```

**Errors:** `422` no draft exists · `409` already submitted

---

### `GET /assignments/:assignmentId/submissions/my`

Get my submission for an assignment.

**Access:** Submission owner

---

### `GET /assignments/:assignmentId/submissions`

List all submissions for an assignment.

**Access:** `INSTRUCTOR`, `ADMIN`, `SUPER_ADMIN`

---

### `POST /submissions/:submissionId/grade`

Grade a submission.

**Access:** `INSTRUCTOR`, `ADMIN`, `SUPER_ADMIN`

**Request:**
```json
{
  "score": 88,
  "feedback": "Excellent work! The classifier achieved 95% accuracy. Consider adding cross-validation."
}
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Submission graded",
  "data": {
    "id": "grade-uuid",
    "submissionId": "sub-uuid",
    "gradedBy": "instructor-uuid",
    "score": 88,
    "maxScore": 100,
    "feedback": "Excellent work!...",
    "status": "GRADED",
    "gradedAt": "2025-01-16T09:00:00.000Z"
  }
}
```

---

### `GET /submissions/:submissionId/grade`

Get the grade for a submission.

**Access:** Submission owner, instructor, admin

---

### `POST /submissions/:submissionId/return`

Return a submission for revision.

**Access:** `INSTRUCTOR`, `ADMIN`, `SUPER_ADMIN`

**Request:**
```json
{ "feedback": "Please include more visualizations and improve the documentation." }
```

**Response `200`:** Updated submission with `status: "RETURNED"`

---

## 14. Payment Endpoints

### `POST /payments`

Create a payment invoice. Triggers QPay QR code generation, SocialPay checkout URL, or Mock invoice.

**Access:** Any authenticated user

**Request:**
```json
{
  "courseId": "course-uuid",
  "amount": 49900,
  "provider": "QPAY",
  "description": "Introduction to ML — course purchase",
  "returnUrl": "https://myapp.com/payment/result"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `courseId` | UUID | ✓ | Course to purchase |
| `amount` | number | ✓ | Amount in MNT (≥1) |
| `provider` | enum | ✓ | `QPAY` `SOCIAL_PAY` `MOCK` |
| `description` | string | — | Payment description |
| `returnUrl` | string | — | Redirect URL after SocialPay payment |

**Response `200` (QPay):**
```json
{
  "success": true,
  "message": "Payment created",
  "data": {
    "id": "payment-uuid",
    "userId": "user-uuid",
    "courseId": "course-uuid",
    "amount": "49900.00",
    "currency": "MNT",
    "provider": "QPAY",
    "status": "PROCESSING",
    "invoiceId": "qpay-invoice-id",
    "qrCode": "raw-qr-data",
    "qrImage": "base64-encoded-qr-image",
    "deepLinks": [
      { "name": "Khan bank", "description": "Khan Bank", "logo": "...", "link": "khanbank://..." }
    ],
    "expiredAt": "2025-01-15T10:30:00.000Z",
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

**Response `200` (SocialPay):**
```json
{
  "data": {
    "provider": "SOCIAL_PAY",
    "status": "PROCESSING",
    "checkoutUrl": "https://socialpay.mn/checkout/...",
    "expiredAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Response `200` (Mock — for development):**
```json
{
  "data": {
    "provider": "MOCK",
    "status": "PROCESSING",
    "invoiceId": "mock-invoice-id"
  }
}
```

---

### `GET /payments/me`

List my payment history.

**Access:** Any authenticated user

**Query:** `?page=1&limit=20`

---

### `GET /payments/:id`

Get payment details by ID.

**Access:** Payment owner

**Response `200`:** Full payment object including QR data

---

### `POST /payments/:id/check`

Manually poll provider for payment status update.

**Access:** Any authenticated user

**Response `200`:** Updated payment object with current `status`

---

### `POST /webhooks/qpay/:paymentId`

QPay payment callback (called by QPay servers).

**Access:** Public (no auth — called externally)

**Body:** QPay webhook payload

---

### `POST /webhooks/socialpay`

SocialPay payment callback.

**Access:** Public

---

### `POST /webhooks/mock-pay/:paymentId`

Instantly complete a MOCK provider payment. Development only.

**Access:** Public  

**Response `200`:**
```json
{
  "success": true,
  "message": "Mock payment completed",
  "data": {
    "id": "payment-uuid",
    "status": "COMPLETED",
    "completedAt": "2025-01-15T10:05:00.000Z"
  }
}
```

After this call, the `payment.confirmed` RabbitMQ event is published → enrollment is created automatically.

---

## 15. Wallet & Payout Endpoints

### `GET /wallet/me`

Get the current user's wallet. Creates it if it doesn't exist yet.

**Access:** `INSTRUCTOR`, `ADMIN`, `SUPER_ADMIN`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "wallet-uuid",
    "ownerId": "user-uuid",
    "balance": "328500.00",
    "currency": "MNT",
    "status": "ACTIVE",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### `POST /wallet/me/init`

Explicitly initialise a wallet for the authenticated user.

**Access:** Any authenticated user  
**Response `200`:** Wallet object

---

### `GET /wallet/transactions`

List wallet transactions (paginated).

**Access:** Wallet owner

**Query:** `?page=1&limit=20`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "txn-uuid",
        "type": "REVENUE_SHARE",
        "status": "COMPLETED",
        "amount": "39920.00",
        "balanceBefore": "288580.00",
        "balanceAfter": "328500.00",
        "currency": "MNT",
        "description": "Revenue from enrollment enrollment-uuid",
        "reference": "enrollment-uuid",
        "createdAt": "2025-01-15T10:05:00.000Z"
      }
    ],
    "meta": { "total": 12, "page": 1, "limit": 20, "totalPages": 1 }
  }
}
```

Transaction types: `CREDIT` `DEBIT` `REVENUE_SHARE` `PAYOUT` `REFUND` `PLATFORM_FEE`

---

### `GET /wallet/transactions/:id`

Get a single transaction.

**Access:** Wallet owner

---

### `POST /wallet/payouts`

Request a payout from wallet balance.

**Access:** `INSTRUCTOR`, `ADMIN`, `SUPER_ADMIN`

**Request:**
```json
{
  "amount": 200000,
  "bankName": "Khan Bank",
  "accountNumber": "5044123456",
  "accountName": "Bat-Erdene Gantulga",
  "note": "Monthly withdrawal"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `amount` | number | ✓ | Minimum `1000` MNT |
| `bankName` | string | — | |
| `accountNumber` | string | — | |
| `accountName` | string | — | |
| `note` | string | — | |

**Response `200`:**
```json
{
  "success": true,
  "message": "Payout request submitted",
  "data": {
    "id": "payout-uuid",
    "walletId": "wallet-uuid",
    "amount": "200000.00",
    "currency": "MNT",
    "status": "PENDING",
    "bankName": "Khan Bank",
    "accountNumber": "5044123456",
    "accountName": "Bat-Erdene Gantulga",
    "createdAt": "2025-01-15T12:00:00.000Z"
  }
}
```

**Errors:** `422` insufficient balance

---

### `GET /wallet/payouts`

List my payout requests.

**Access:** Wallet owner  
**Query:** `?page=1&limit=20`

---

### `POST /wallet/payouts/:id/complete` *(Admin)*

Mark payout as completed. Triggers a `DEBIT` transaction on the wallet.

**Access:** `ADMIN`, `SUPER_ADMIN`

**Response `200`:** Updated payout with `status: "COMPLETED"`

---

### `POST /wallet/payouts/:id/reject` *(Admin)*

Reject payout request.

**Access:** `ADMIN`, `SUPER_ADMIN`

**Request:**
```json
{ "reason": "Invalid bank account details provided." }
```

**Response `200`:** Updated payout with `status: "REJECTED"` and `rejectedReason`

---

## 16. AI Endpoints

### `POST /ai/tutor/sessions`

Create a new AI tutor chat session.

**Access:** Any authenticated user

**Request:**
```json
{
  "courseId": "course-uuid",
  "title": "Questions about gradient descent"
}
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Session created",
  "data": {
    "id": "session-uuid",
    "userId": "user-uuid",
    "courseId": "course-uuid",
    "title": "Questions about gradient descent",
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

---

### `GET /ai/tutor/sessions`

List my chat sessions.

**Access:** Any authenticated user

---

### `GET /ai/tutor/sessions/:id`

Get session with full message history.

**Access:** Session owner

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "session-uuid",
    "title": "Questions about gradient descent",
    "messages": [
      { "id": "msg-1", "role": "user", "content": "What is gradient descent?", "createdAt": "..." },
      { "id": "msg-2", "role": "assistant", "content": "Gradient descent is an optimization algorithm...", "createdAt": "..." }
    ]
  }
}
```

---

### `DELETE /ai/tutor/sessions/:id`

Delete a chat session and all its messages.

**Response:** `204 No Content`

---

### `POST /ai/tutor/sessions/:id/messages`

Send a message to the AI tutor and get a response.

**Access:** Session owner

**Request:**
```json
{
  "content": "Can you explain backpropagation in simple terms?"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `content` | string | ✓ | 1–4000 chars |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "userMessage": {
      "id": "msg-uuid",
      "role": "user",
      "content": "Can you explain backpropagation in simple terms?",
      "createdAt": "2025-01-15T10:01:00.000Z"
    },
    "assistantMessage": {
      "id": "msg-uuid-2",
      "role": "assistant",
      "content": "Backpropagation is how neural networks learn from mistakes. Think of it like this: ...",
      "createdAt": "2025-01-15T10:01:03.000Z"
    }
  }
}
```

> Note: Ollama inference may take up to 120 seconds. Implement a long timeout on the client side.

---

### `POST /ai/essay-score`

Score an essay using AI (4-rubric system: content, structure, language, arguments — 25 pts each).

**Access:** Any authenticated user

**Request:**
```json
{
  "essayText": "Machine learning is a subset of artificial intelligence that enables systems to learn...",
  "assignmentId": "assignment-uuid",
  "prompt": "Explain the differences between supervised and unsupervised learning",
  "maxScore": 100
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `essayText` | string | ✓ | 50–10000 chars |
| `assignmentId` | UUID | — | Link result to an assignment |
| `prompt` | string | — | Topic context for more accurate scoring, max 2000 chars |
| `maxScore` | number | — | 10–1000, default `100` |

**Response `200`:**
```json
{
  "success": true,
  "message": "Essay scored successfully",
  "data": {
    "id": "score-uuid",
    "score": 84.0,
    "maxScore": 100,
    "feedback": "Strong content and argumentation. Structure could be improved with clearer topic sentences. Grammar is mostly correct.",
    "rubricBreakdown": {
      "content": 23,
      "structure": 18,
      "language": 21,
      "arguments": 22
    },
    "createdAt": "2025-01-15T10:02:00.000Z"
  }
}
```

> If AI parsing fails, score defaults to `60` with a fallback feedback message.

---

### `GET /ai/essay-score/history`

Get my AI essay scoring history.

**Access:** Any authenticated user

---

### `POST /ai/recommendations`

Get AI-powered course recommendations based on current enrollments.

**Access:** Any authenticated user

**Request:**
```json
{
  "enrolledCourseIds": ["uuid-1", "uuid-2"],
  "enrolledCourseTitles": ["Python Basics", "Introduction to ML"]
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "courseId": "course-uuid-3",
      "reason": "Natural progression from ML fundamentals — covers deep learning in detail",
      "score": 0.92
    },
    {
      "courseId": "course-uuid-4",
      "reason": "Complements Python skills with data visualization techniques",
      "score": 0.87
    }
  ]
}
```

---

## 17. Notification Endpoints

### `GET /notifications`

List my in-app notifications.

**Access:** Any authenticated user  
**Query:** `?page=1&limit=20`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "notif-uuid",
        "type": "ENROLLMENT_CONFIRMED",
        "title": "Enrollment Successful",
        "body": "You have been enrolled in 'Introduction to Machine Learning'.",
        "isRead": false,
        "createdAt": "2025-01-15T10:05:00.000Z"
      }
    ],
    "meta": { "total": 8, "page": 1, "limit": 20, "totalPages": 1 }
  }
}
```

---

### `GET /notifications/unread-count`

**Access:** Any authenticated user

**Response `200`:**
```json
{ "success": true, "data": { "count": 3 } }
```

---

### `PATCH /notifications/:id/read`

Mark a specific notification as read.

**Access:** Notification owner

---

### `PATCH /notifications/read-all`

Mark all notifications as read.

**Access:** Any authenticated user

---

### `DELETE /notifications/:id`

Delete a notification.

**Response:** `204 No Content`

---

### `GET /notifications/preferences`

Get notification delivery preferences.

**Access:** Any authenticated user

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "emailEnabled": true,
    "pushEnabled": true,
    "smsEnabled": false,
    "inAppEnabled": true
  }
}
```

---

### `PATCH /notifications/preferences`

Update notification preferences.

**Access:** Any authenticated user

**Request:**
```json
{
  "emailEnabled": true,
  "pushEnabled": false,
  "smsEnabled": false,
  "inAppEnabled": true
}
```

---

## 18. Certificate Endpoints

### `GET /certificates/verify/:code`

Publicly verify a certificate by its QR code. No authentication required.

**Access:** Public

**Example:**
```
GET /api/v1/certificates/verify/CERT-A1B2C3D4
```

**Response `200` (valid):**
```json
{
  "success": true,
  "message": "Certificate is valid",
  "data": {
    "valid": true,
    "id": "cert-uuid",
    "courseTitle": "Introduction to Machine Learning",
    "recipientName": "Bat-Erdene Gantulga",
    "issuedAt": "2025-01-20T00:00:00.000Z",
    "verifyCode": "CERT-A1B2C3D4"
  }
}
```

**Response `200` (revoked):**
```json
{
  "data": { "valid": false, "status": "REVOKED" }
}
```

---

### `POST /certificates`

Issue a certificate to a student.

**Access:** `INSTRUCTOR`, `ADMIN`, `SUPER_ADMIN`

**Request:**
```json
{
  "userId": "student-uuid",
  "courseId": "course-uuid",
  "enrollmentId": "enrollment-uuid"
}
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Certificate issued successfully",
  "data": {
    "id": "cert-uuid",
    "userId": "student-uuid",
    "courseId": "course-uuid",
    "verifyCode": "CERT-A1B2C3D4",
    "status": "ACTIVE",
    "issuedAt": "2025-01-20T00:00:00.000Z"
  }
}
```

---

### `GET /certificates`

List my certificates.

**Access:** Any authenticated user  
**Query:** `?page=1&limit=20`

---

### `GET /certificates/:id`

Get a specific certificate.

**Access:** Certificate owner, `ADMIN`, `SUPER_ADMIN`

---

### `DELETE /certificates/:id`

Revoke a certificate (changes status to `REVOKED`).

**Access:** `ADMIN`, `SUPER_ADMIN`  
**Response:** `204 No Content`

---

## 19. Media Endpoints

### `POST /media/files`

Upload a file (video, PDF, image) to MinIO.

**Access:** Any authenticated user  
**Content-Type:** `multipart/form-data`  
**Max file size:** 500 MB

**Request:**
```
POST /api/v1/media/files
Content-Type: multipart/form-data

file: <binary file data>
```

**Response `200`:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "id": "media-uuid",
    "userId": "user-uuid",
    "originalName": "lecture-01.mp4",
    "mimeType": "video/mp4",
    "size": 104857600,
    "url": "http://minio:9000/lms-media/uuid/lecture-01.mp4",
    "bucket": "lms-media",
    "key": "uuid/lecture-01.mp4",
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

---

### `GET /media/files`

List my media files.

**Access:** Any authenticated user  
**Query:** `?page=1&limit=20`

---

### `GET /media/files/:id`

Get file details.

---

### `PATCH /media/files/:id`

Update file metadata (title, description).

---

### `DELETE /media/files/:id`

Delete file from MinIO and database.

**Response:** `204 No Content`

---

### `GET /media/presign?src=:objectKey`

Generate a presigned URL for a private MinIO object (valid for 1 hour).

**Access:** Any authenticated user

**Query:** `?src=uuid/lecture-01.mp4`

**Response `200`:**
```json
{
  "success": true,
  "message": "Presigned URL generated",
  "data": {
    "url": "http://minio:9000/lms-media/uuid/lecture-01.mp4?X-Amz-Signature=..."
  }
}
```

---

## 20. Analytics Endpoints

All analytics endpoints require `ADMIN` or `SUPER_ADMIN` role.

### `GET /analytics/overview`

Platform-wide KPI summary.

**Access:** `ADMIN`, `SUPER_ADMIN`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1204,
    "totalCourses": 48,
    "totalEnrollments": 3892,
    "completedCourses": 612,
    "confirmedPayments": 1847,
    "totalRevenue": 91523300,
    "avgQuizScore": 72.4,
    "certificatesIssued": 598
  }
}
```

---

### `GET /analytics/timeseries?days=30`

Daily metrics for chart rendering.

**Access:** `ADMIN`, `SUPER_ADMIN`

**Query:** `?days=30` (max 365)

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-01-14",
      "newUsers": 12,
      "newEnrollments": 34,
      "confirmedPayments": 18,
      "revenueAmount": 892800,
      "quizAttempts": 67,
      "avgQuizScore": 74.2,
      "assignmentSubmissions": 23,
      "certificatesIssued": 5
    }
  ]
}
```

---

### `GET /analytics/events`

Recent analytics events feed.

**Access:** `ADMIN`, `SUPER_ADMIN`

**Query:** `?limit=50&offset=0&eventType=payment.confirmed`

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "evt-uuid",
      "eventType": "payment.confirmed",
      "userId": "user-uuid",
      "courseId": "course-uuid",
      "payload": { "amount": "49900", "provider": "QPAY" },
      "occurredAt": "2025-01-15T10:05:00.000Z"
    }
  ]
}
```

---

### `GET /analytics/courses?limit=10`

Top courses by enrollment count.

**Access:** `ADMIN`, `SUPER_ADMIN`

**Response `200`:**
```json
{
  "success": true,
  "data": [
    { "courseId": "uuid", "enrollmentCount": 234 },
    { "courseId": "uuid-2", "enrollmentCount": 189 }
  ]
}
```

---

### `GET /analytics/user-activity?days=30`

Daily active user count.

**Access:** `ADMIN`, `SUPER_ADMIN`

---

### `GET /analytics/event-breakdown`

Count of each event type.

**Access:** `ADMIN`, `SUPER_ADMIN`

**Response `200`:**
```json
{
  "success": true,
  "data": [
    { "eventType": "auth.user.login", "count": 4820 },
    { "eventType": "payment.confirmed", "count": 1847 },
    { "eventType": "enrollment.created", "count": 3892 }
  ]
}
```

---

## 21. Health Endpoints

Each service exposes a health check. No authentication required.

### `GET /api/health`

Gateway health (via NGINX).

**Response `200`:**
```json
{ "status": "ok", "timestamp": "2025-01-15T10:00:00.000Z", "service": "gateway" }
```

### Per-Service Health

Each service exposes `GET /api/v1/health` on its internal port:

| Service | Internal URL |
|---------|-------------|
| auth-service | `http://auth-service:3001/api/v1/health` |
| user-service | `http://user-service:3002/api/v1/health` |
| course-service | `http://course-service:3003/api/v1/health` |
| quiz-service | `http://quiz-service:3004/api/v1/health` |
| enrollment-service | `http://enrollment-service:3005/api/v1/health` |
| assignment-service | `http://assignment-service:3006/api/v1/health` |
| wallet-service | `http://wallet-service:3007/api/v1/health` |
| payment-service | `http://payment-service:3008/api/v1/health` |
| ai-service | `http://ai-service:3009/api/v1/health` |
| notification-service | `http://notification-service:3010/api/v1/health` |
| media-service | `http://media-service:3011/api/v1/health` |
| certificate-service | `http://certificate-service:3012/api/v1/health` |
| analytics-service | `http://analytics-service:3013/api/v1/health` |

---

## Appendix: Quick Reference

### Complete Endpoint List

| Method | Path | Auth | Role |
|--------|------|------|------|
| POST | `/auth/register` | No | — |
| POST | `/auth/login` | No | — |
| POST | `/auth/refresh` | No (refresh token) | — |
| POST | `/auth/logout` | Bearer | Any |
| POST | `/auth/logout-all` | Bearer | Any |
| GET | `/auth/me` | Bearer | Any |
| PATCH | `/auth/change-password` | Bearer | Any |
| GET | `/auth/users` | Bearer | Admin+ |
| PATCH | `/auth/users/:id/status` | Bearer | Admin+ |
| POST | `/courses` | Bearer | Instructor+ |
| GET | `/courses` | No | — |
| GET | `/courses/:id` | No | — |
| GET | `/courses/slug/:slug` | No | — |
| PATCH | `/courses/:id` | Bearer | Owner/Admin |
| POST | `/courses/:id/publish` | Bearer | Owner/Admin |
| POST | `/courses/:id/archive` | Bearer | Owner/Admin |
| DELETE | `/courses/:id` | Bearer | Owner/Admin |
| POST | `/courses/:id/modules` | Bearer | Owner/Admin |
| GET | `/courses/:id/modules` | No | — |
| PATCH | `/courses/:id/modules/:mId` | Bearer | Owner/Admin |
| DELETE | `/courses/:id/modules/:mId` | Bearer | Owner/Admin |
| POST | `/courses/:id/modules/:mId/lessons` | Bearer | Owner/Admin |
| PATCH | `/courses/:id/modules/:mId/lessons/:lId` | Bearer | Owner/Admin |
| DELETE | `/courses/:id/modules/:mId/lessons/:lId` | Bearer | Owner/Admin |
| POST | `/courses/:id/lessons/:lId/blocks` | Bearer | Owner/Admin |
| POST | `/courses/:id/lessons/:lId/blocks/:bId/questions` | Bearer | Owner/Admin |
| POST | `/courses/:id/lessons/:lId/progress/blocks/:bId/submit` | Bearer | Any |
| POST | `/enrollments` | Bearer | Any |
| GET | `/enrollments/my` | Bearer | Any |
| GET | `/enrollments/check` | Bearer | Any |
| GET | `/enrollments/by-course/:courseId` | Bearer | Any |
| GET | `/enrollments/:id` | Bearer | Owner |
| DELETE | `/enrollments/:id` | Bearer | Owner |
| GET | `/enrollments/:id/progress` | Bearer | Owner |
| PATCH | `/enrollments/:id/progress/:lessonId` | Bearer | Owner |
| POST | `/enrollments/:id/progress/:lessonId/complete` | Bearer | Owner |
| POST | `/quizzes` | Bearer | Instructor+ |
| GET | `/quizzes` | Bearer | Any |
| GET | `/quizzes/:id` | Bearer | Any |
| PATCH | `/quizzes/:id` | Bearer | Instructor+ |
| POST | `/quizzes/:id/publish` | Bearer | Instructor+ |
| DELETE | `/quizzes/:id` | Bearer | Instructor+ |
| POST | `/quizzes/:id/attempts` | Bearer | Any |
| GET | `/quizzes/:id/attempts/my` | Bearer | Any |
| GET | `/quizzes/:id/attempts/:aId` | Bearer | Owner |
| POST | `/quizzes/:id/attempts/:aId/submit` | Bearer | Owner |
| POST | `/assignments` | Bearer | Instructor+ |
| GET | `/assignments` | Bearer | Any |
| GET | `/assignments/:id` | Bearer | Any |
| PATCH | `/assignments/:id` | Bearer | Instructor+ |
| POST | `/assignments/:id/publish` | Bearer | Instructor+ |
| DELETE | `/assignments/:id` | Bearer | Instructor+ |
| POST | `/assignments/:id/submissions/draft` | Bearer | Any |
| POST | `/assignments/:id/submissions/submit` | Bearer | Owner |
| GET | `/assignments/:id/submissions/my` | Bearer | Owner |
| GET | `/assignments/:id/submissions` | Bearer | Instructor+ |
| GET | `/assignments/:id/submissions/:sId` | Bearer | Owner/Instructor |
| POST | `/submissions/:id/grade` | Bearer | Instructor+ |
| GET | `/submissions/:id/grade` | Bearer | Owner/Instructor |
| POST | `/submissions/:id/return` | Bearer | Instructor+ |
| POST | `/payments` | Bearer | Any |
| GET | `/payments/me` | Bearer | Any |
| GET | `/payments/:id` | Bearer | Owner |
| POST | `/payments/:id/check` | Bearer | Any |
| POST | `/webhooks/qpay/:paymentId` | No | — |
| POST | `/webhooks/socialpay` | No | — |
| POST | `/webhooks/mock-pay/:paymentId` | No | — |
| GET | `/wallet/me` | Bearer | Instructor+ |
| POST | `/wallet/me/init` | Bearer | Any |
| GET | `/wallet/transactions` | Bearer | Owner |
| GET | `/wallet/transactions/:id` | Bearer | Owner |
| POST | `/wallet/payouts` | Bearer | Instructor+ |
| GET | `/wallet/payouts` | Bearer | Owner |
| POST | `/wallet/payouts/:id/complete` | Bearer | Admin+ |
| POST | `/wallet/payouts/:id/reject` | Bearer | Admin+ |
| POST | `/ai/tutor/sessions` | Bearer | Any |
| GET | `/ai/tutor/sessions` | Bearer | Any |
| GET | `/ai/tutor/sessions/:id` | Bearer | Owner |
| DELETE | `/ai/tutor/sessions/:id` | Bearer | Owner |
| POST | `/ai/tutor/sessions/:id/messages` | Bearer | Owner |
| POST | `/ai/essay-score` | Bearer | Any |
| GET | `/ai/essay-score/history` | Bearer | Any |
| POST | `/ai/recommendations` | Bearer | Any |
| GET | `/notifications` | Bearer | Any |
| GET | `/notifications/unread-count` | Bearer | Any |
| PATCH | `/notifications/:id/read` | Bearer | Owner |
| PATCH | `/notifications/read-all` | Bearer | Any |
| DELETE | `/notifications/:id` | Bearer | Owner |
| GET | `/notifications/preferences` | Bearer | Any |
| PATCH | `/notifications/preferences` | Bearer | Any |
| GET | `/certificates/verify/:code` | No | — |
| POST | `/certificates` | Bearer | Instructor+ |
| GET | `/certificates` | Bearer | Any |
| GET | `/certificates/:id` | Bearer | Owner/Admin |
| DELETE | `/certificates/:id` | Bearer | Admin+ |
| POST | `/media/files` | Bearer | Any |
| GET | `/media/files` | Bearer | Any |
| GET | `/media/files/:id` | Bearer | Owner |
| PATCH | `/media/files/:id` | Bearer | Owner |
| DELETE | `/media/files/:id` | Bearer | Owner |
| GET | `/media/presign` | Bearer | Any |
| GET | `/analytics/overview` | Bearer | Admin+ |
| GET | `/analytics/timeseries` | Bearer | Admin+ |
| GET | `/analytics/events` | Bearer | Admin+ |
| GET | `/analytics/courses` | Bearer | Admin+ |
| GET | `/analytics/user-activity` | Bearer | Admin+ |
| GET | `/analytics/event-breakdown` | Bearer | Admin+ |
| GET | `/api/health` | No | — |
