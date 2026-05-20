# LMS Platform - сайжруулах шаардлагын дэлгэрэнгүй шинжилгээ

Шинжилгээ хийсэн огноо: 2026-05-19

Энэ баримт нь одоогийн repository-ийн бодит код, Docker Compose, frontend route-ууд, NestJS service-үүд, Prisma schema, RabbitMQ event урсгал, gateway/nginx тохиргоонд тулгуурласан сайжруулах шаардлагын жагсаалт юм. Зорилго нь платформыг production-д ойртуулах, сурагч/багш/админ workflow-уудыг тасралтгүй болгох, service хоорондын мэдээлэл солилцоог найдвартай болгох, UI/UX болон агуулгын бүтцийг цэгцлэхэд оршино.

## 1. Ерөнхий дүгнэлт

Платформын үндсэн skeleton сайн тавигдсан: Next.js frontend, NestJS microservice-үүд, тусдаа PostgreSQL database-үүд, RabbitMQ event bus, Redis, MinIO, nginx reverse proxy, Docker profile-ууд байна. Гэхдээ одоогийн байдлаар дараах өндөр эрсдэлтэй зөрчлүүд байна.

- Documentation болон бодит кодын архитектур зөрсөн байна. Жишээ нь `user-service` docs дээр байвч repo-д байхгүй, зарим service port, route, event flow хуучирсан.
- Course/enrollment/progress logic хоёр service-д давхар хэрэгжсэн байна: `course-service` дотор `CourseEnrollment/LessonProgress`, мөн `enrollment-service` дотор `Enrollment/LessonProgress`.
- Payment service зөвхөн course payment-д төвлөрсөн бөгөөд wallet top-up буюу сурагч банкны QR уншуулж хэтэвч цэнэглэх production workflow байхгүй.
- RabbitMQ event delivery нь fire-and-forget хэлбэртэй, retry/outbox/idempotency/DLQ/contract versioning сул байна.
- Frontend дээр сурагчийн learning journey бүрэн холбогдоогүй хэсгүүд байна: lesson completion, certificate, payment, wallet, notification, assignment, quiz хоорондын flow хэрэглэгчид нэг мөр мэдрэгдэхгүй.
- Security gap байна: зарим endpoint ownership шалгалтгүй, dev/mock endpoint public байрлалтай, JWT default secret fallback ашигласан service-үүд байна.
- Test coverage, contract tests, e2e smoke tests байхгүй эсвэл харагдахгүй байна.

## 2. Priority roadmap

| Priority | Сэдэв | Яагаад чухал вэ |
|---|---|---|
| P0 | Payment ownership, dev/mock webhook хамгаалалт, wallet top-up fraud control | Санхүүгийн алдаа, бусдын төлбөр шалгах/дуусгах, production дээр mock flow үлдэх эрсдэлтэй |
| P0 | Enrollment/progress source-of-truth нэг болгох | Курс дуусалт, сертификат, analytics, wallet revenue зэрэг downstream workflow буруу болох магадлалтай |
| P0 | RabbitMQ reliability: outbox, idempotency, DLQ | Төлбөр төлөгдсөн ч enrollment/certificate/wallet revenue үүсэхгүй алдагдах эрсдэлтэй |
| P1 | Wallet QR top-up production flow | Сурагч өөрийн хэтэвчээ банкны QR-аар цэнэглэх гол бизнес шаардлага одоогоор байхгүй |
| P1 | Gateway/service route, docs, OpenAPI contract sync | Frontend/backend integration алдаа, onboarding удаашрал, буруу command/profile ажиллуулах эрсдэлтэй |
| P1 | Frontend UX flow нэгтгэл | Сурагч course purchase, wallet, lesson, certificate journey тасархай байна |
| P2 | Observability, audit log, admin operations | Production support, алдаа оношлох, fraud/reconciliation-д хэрэгтэй |
| P2 | Content/site structure, localization, SEO | Сургалтын платформын үнэ цэнэ, итгэлцэл, хөрвөлт сайжирна |

## 3. Архитектур ба service boundary

### 3.1 `user-service` байхгүй боловч docs/gateway дээр байгаа

Одоогийн repo-д `services/user-service` байхгүй. Гэвч:

- `docs/architecture/README.md`, `docs/developer-guide/README.md` дээр `user-service` гэж тусдаа service байдлаар тайлбарласан.
- `gateway/src/proxy/services.config.ts` дээр `users: process.env.USER_SERVICE_URL` route байна.
- Auth service-ийн `User` model нь email, role, MFA-тэй боловч profile/full name/avatar/organization preference гэх мэт LMS хэрэглэгчийн profile байхгүй.

Сайжруулах санал:

- Нэг шийдвэр гаргах:
  - A хувилбар: `user-service`-ийг үнэхээр үүсгэж, profile, organization, tenant membership, student/instructor profile, displayName, avatar, locale, bio хадгалдаг болгох.
  - B хувилбар: docs/gateway-ээс `user-service` references-ийг устгаж, auth-service-г түр profile owner гэж тодорхойлох.
- Certificate service одоо `recipientName ?? 'Student'` гэж fallback хийдэг. Profile service байхгүйгээс сертификат дээр сурагчийн жинхэнэ нэр гарахгүй. Иймээс profile read model эсвэл `auth.user.registered/profile.updated` event хэрэгтэй.

### 3.2 Enrollment/progress хоёр газар давхар байна

Одоогийн бүтэц:

- `course-service/prisma/schema.prisma`: `CourseEnrollment`, `LessonProgress`, interactive progress models.
- `enrollment-service/prisma/schema.prisma`: `Enrollment`, `LessonProgress`.
- Frontend-ийн `use-enrollment.ts` нь `/enrollments/*` буюу `enrollment-service`-ийг ашиглаж байна.
- `course-service/src/enrollment` болон `course-service/src/progress` бас enrollment/progress endpoint-тэй.

Энэ нь дараах асуудлыг үүсгэнэ:

- Нэг сурагчийн progress хоёр database-д өөр өөр болж болно.
- Certificate generation аль event-ийг сонсох нь тодорхойгүй болно.
- Wallet revenue distribution аль enrollment ID-г ашиглах нь зөрж болно.
- Course content delete/update хийхэд enrollment-service-ийн progress sync алдагдана.

Сайжруулах санал:

- Enrollment/progress-ийн single source of truth-ийг `enrollment-service` болгох.
- `course-service`-ээс `CourseEnrollment`, `LessonProgress`-ийг legacy гэж тэмдэглэж, endpoint-үүдийг deprecate хийх эсвэл зөвхөн course content owner байлгах.
- Course content өөрчлөгдөхөд `course.lesson.created`, `course.lesson.deleted`, `course.lesson.reordered`, `course.published` event гаргаж enrollment-service өөрийн lesson progress projection-ийг sync хийдэг болгох.
- Interactive block answer/progress course-service-д үлдэх үү, enrollment-service-д шилжих үү гэдгийг тодорхойлох. Learning progress-тэй шууд холбоотой тул enrollment-service-д ойртуулах нь илүү цэвэр.

### 3.3 Service port/docs зөрчил

Docs дээр зарим port зөрсөн байна. Жишээ нь developer guide-д enrollment `3005`, quiz `3004` гэж гарсан хэсэг байхад Compose дээр:

- `enrollment-service`: `3004`
- `quiz-service`: `3005`

Сайжруулах санал:

- `docs/architecture/README.md`, `docs/developer-guide/README.md`, `docs/api/README.md`-ийг Compose config-аас автоматаар generated inventory table-тэй болгох.
- `docker compose --profile ... config --services` болон service env port-оос docs lint хийх script нэмэх.

## 4. Service хоорондын мэдээлэл солилцоо

### 4.1 Event contract-ууд scattered string literal байна

Event name-үүд service бүрт string literal байдлаар байна:

- `payment.confirmed`
- `enrollment.created`
- `enrollment.completed`
- `lesson.completed`
- `certificate.issued`
- `assignment.submission.graded`
- `quiz.attempt.submitted`

Зарим shared type (`packages/shared-types/src/events`) байгаа ч бүх service ашиглахгүй байна.

Сайжруулах санал:

- `packages/shared-types/src/events` дотор бүх event-ийн canonical contract-ийг version-тэй тодорхойлох.
- Жишээ:

```ts
type EventEnvelope<T> = {
  id: string;
  type: string;
  version: 1;
  occurredAt: string;
  producer: string;
  correlationId?: string;
  causationId?: string;
  data: T;
};
```

- Producer/consumer бүр энэ envelope-ийг ашиглах.
- `zod` эсвэл `class-validator`-аар consumer талд event payload validate хийх.

### 4.2 Outbox pattern байхгүй

Одоогоор business DB update хийгээд дараа нь `this.client.emit(...)` хийдэг. Жишээ:

- Payment completed -> `payment.confirmed`
- Enrollment created -> `enrollment.created`
- Certificate issued -> `certificate.issued`

DB commit амжилттай боловч RabbitMQ publish fail бол event алдагдана.

Сайжруулах санал:

- Service бүрт `outbox_events` table нэмэх.
- Business transaction дотор event-ийг outbox-д бичих.
- Background publisher outbox-оос RabbitMQ руу publish хийгээд `publishedAt` тэмдэглэх.
- Consumer бүр idempotency table (`processed_events`) ашиглах.

### 4.3 Dead-letter queue, retry policy, observability сул

Consumer талд олон газар error swallow хийж message ack болгож байна. Жишээ:

- enrollment-service payment confirmed auto-enroll fail болсон ч ack.
- wallet-service revenue distribution fail болсон ч ack.

Энэ нь infinite retry-ээс хамгаалж байгаа боловч бизнес event алдагдана.

Сайжруулах санал:

- Retryable/non-retryable error ялгах.
- DLQ queue үүсгэх: `lms.events.dlq`.
- `event_failures` table дээр failed event payload, error, retry count хадгалах.
- Admin UI дээр failed event replay хийх боломж өгөх.

### 4.4 Synchronous service calls fallback strategy хэрэгтэй

Enrollment service course-service-аас course basic/module lesson data HTTP-р татдаг. Wallet service revenue distribution хийхдээ course-service рүү HTTP-р price/instructorId татдаг.

Эрсдэл:

- Course service түр down бол enrollment/payment downstream тасарна.
- Retry хийгдэхгүй бол revenue эсвэл enrollment алдагдана.

Сайжруулах санал:

- Read model projection ашиглах: `course.published/course.updated` event-ээр enrollment/wallet service-д course snapshot хадгалах.
- Synchronous call-ийг зөвхөн fallback эсвэл admin repair task болгох.
- Timeout, retry, circuit breaker (`@nestjs/axios` + retry/backoff) стандартчилах.

## 5. Wallet, payment, банкны QR top-up

### 5.1 Wallet top-up production workflow байхгүй

Frontend `web/src/app/wallet/page.tsx` дээр зөвхөн development top-up panel байна. Backend `wallet-service` дээр `POST /wallet/dev/topup` production дээр хаагддаг. Payment service-ийн `CreatePaymentDto` заавал `courseId` авдаг тул wallet цэнэглэх төлбөр үүсгэх боломжгүй.

Сурагчийн хүссэн workflow:

1. Сурагч `Хэтэвч цэнэглэх` дарна.
2. Дүн сонгоно эсвэл оруулна.
3. Банкны QR/QPay invoice үүснэ.
4. Сурагч банкны апп-аар QR уншуулж төлнө.
5. Payment provider webhook/check амжилттай бол wallet balance нэмэгдэнэ.
6. Transaction history дээр `CREDIT` буюу `WALLET_TOPUP` гэж харагдана.

Сайжруулах санал:

- Payment schema дээр `purpose` нэмэх:

```prisma
enum PaymentPurpose {
  COURSE_PURCHASE
  WALLET_TOPUP
}

model Payment {
  purpose PaymentPurpose @default(COURSE_PURCHASE)
  courseId String?
  walletOwnerId String?
}
```

- `CreatePaymentDto`-г хоёр төрөлтэй болгох:
  - `COURSE_PURCHASE`: `courseId` required.
  - `WALLET_TOPUP`: `amount` required, `courseId` байхгүй.
- Payment confirmed event-д `purpose` дамжуулах.
- Wallet service `payment.confirmed` сонсоод `purpose === WALLET_TOPUP` үед `walletService.credit(userId, amount, 'Хэтэвч цэнэглэлт', 'CREDIT', paymentId)` хийх.
- Enrollment service зөвхөн `purpose === COURSE_PURCHASE` үед auto-enroll хийх.
- Frontend wallet page дээр:
  - `Цэнэглэх` primary CTA.
  - Preset amounts: 10k, 50k, 100k, 500k.
  - Provider сонголт: QPay, SocialPay.
  - QR image/deeplink modal.
  - `Төлбөр шалгах` polling эсвэл manual check.
  - Completed үед wallet query invalidate.

### 5.2 Payment ownership шалгалт дутуу

`PaymentController.findOne` болон `checkPayment` нь authenticated user-аас id авдаг боловч payment owner эсэхийг шалгахгүй байна. Нэг хэрэглэгч бусдын payment UUID мэдвэл төлбөрийн мэдээлэл харах эсвэл status check trigger хийх боломжтой.

Сайжруулах санал:

- `findById(id, user)` болгож owner/admin шалгах.
- `checkPayment(id, user)` дээр мөн адил.
- Admin list endpoint тусдаа role guard-тэй байх.

### 5.3 Mock/dev endpoints production hardening

`POST /webhooks/mock-pay/:paymentId` нь guard-гүй байна. Энэ нь mock provider payment-ийг шууд complete хийх боломжтой. `simulate` guard-тэй боловч role эсвэл NODE_ENV шалгалт тод харагдахгүй.

Сайжруулах санал:

- `mock-pay`, `simulate` endpoint-үүдийг `NODE_ENV !== 'production'` үед л module-д бүртгэх эсвэл guard дотор production дээр 404/403 буцаах.
- Admin/dev role guard нэмэх.
- Public webhook endpoint дээр provider signature validation хийх.
- Webhook replay/idempotency key ашиглах.

### 5.4 Wallet transaction type нарийвчлал

`TransactionType.CREDIT` бүх орлогыг төлөөлж байна. Wallet top-up, refund, admin adjustment, revenue share ялгарах хэрэгтэй.

Сайжруулах санал:

- `WALLET_TOPUP`, `ADMIN_ADJUSTMENT`, `COURSE_PURCHASE`, `REFUND` зэрэг type нэмэх.
- `reference` unique optional index нэмэх: нэг paymentId-ээр давхар credit хийхгүй.
- Transaction metadata-д provider, invoiceId, paymentId хадгалах.

## 6. Course, lesson, enrollment, certificate flow

### 6.1 Course completion -> certificate flow fragile

Certificate service `enrollment.completed` event сонсдог. Гэхдээ completion event зөвхөн enrollment-service талд бүрэн найдвартай publish болох ёстой. Course-service талын duplicate progress ашиглагдвал certificate үүсэхгүй.

Сайжруулах санал:

- Completion event зөвхөн enrollment-service-ээс гардаг болгох.
- Certificate service дээр `(userId, courseId)` unique constraint нэмэх.
- Event consumer idempotent байх.
- Certificate status list дээр revoked certificate-ийг owner-д харуулах эсэхийг product decision болгох.
- Recipient name/profile data-г user/profile read model-оос авах.

### 6.2 Lesson completion UI ба backend completion холболт

Lesson viewer дээр “Курс дуусгах” гэсэн link байна, гэхдээ frontend lesson complete endpoint-ийг бүх lesson renderer дээр нэгдсэн байдлаар ашиглаж байгаа эсэх тодорхой биш. Video/PDF/Markdown components interactive block completion хадгалдаг ч enrollment progress complete хийх flow UI-тэй бүрэн уялдаагүй байж болзошгүй.

Сайжруулах санал:

- Lesson viewer бүрт `Mark complete` action нэг стандарт component болгох.
- Required interactive blocks passed/completed болсон эсэхийг server-side шалгаж байж lesson complete зөвшөөрөх.
- `nextLesson` unlock state-ийг API-аас авч, locked lesson дээр route guard хийх.
- Course detail дээр сурагчийн current lesson resume button шууд хамгийн эхний incomplete/unlocked lesson рүү очдог болгох.

### 6.3 Course content өөрчлөлт progress-д нөлөөлөх дүрэм хэрэгтэй

Багш published course дээр lesson нэмэх/устгах үед enrollment-service-ийн lesson progress records sync болох эсэх тодорхойгүй.

Сайжруулах санал:

- Published course edit policy:
  - draft edits freely.
  - published course дээр lesson delete хийх бол enrolled students-д нөлөөлөх warning, migration event.
  - new lesson нэмэхэд existing enrollments-д progress record үүсгэх.
- Progress recalculation job нэмэх.

## 7. Frontend UX, сайтын бүтэц, агуулга

### 7.1 Role-based navigation тодорхой болгох

Одоогийн route-ууд олон байна: dashboard, my-courses, courses manage/new/edit, assignments, quizzes, wallet, payments, media, certificates, analytics, AI. Гэвч role тус бүрийн primary navigation нэг мөр биш байна.

Сайжруулах санал:

- Student navigation:
  - Dashboard
  - My Courses
  - Browse Courses
  - Wallet
  - Certificates
  - Assignments/Quizzes
  - Notifications
- Instructor navigation:
  - Instructor dashboard
  - My courses/manage
  - Course builder
  - Students/progress
  - Assignments/quizzes grading
  - Revenue/payouts
- Admin navigation:
  - Users
  - Courses moderation
  - Payments
  - Certificates
  - Analytics
  - System health/events

### 7.2 Student learning journey

Сурагчийн гол journey:

1. Курс хайх.
2. Үнэгүй бол enroll, төлбөртэй бол wallet/payment.
3. Хичээл үзэх.
4. Quiz/assignment хийх.
5. Completion progress харах.
6. Certificate авах.

Сайжруулах санал:

- Course card дээр enrollment/payment status харуулах.
- Paid course дээр “Хэтэвчээр төлөх” ба “Банкны QR-аар төлөх” сонголт.
- My Courses дээр resume lesson, due assignment, quiz attempts, certificate status нэг дор.
- Lesson viewer дээр sidebar progress, locked/unlocked, completed badge, next action.
- Completion page/modal: “Сертификат үүсэж байна/бэлэн боллоо”.

### 7.3 Homepage/content strategy

Одоогийн CMS секцүүд байна: hero, featured courses, stats, teacher showcase, FAQ, partners, testimonials. Гэхдээ platform value proposition, course catalog discovery, trust signals production түвшинд сайжруулах хэрэгтэй.

Сайжруулах санал:

- Homepage дээр:
  - Actual featured courses with thumbnails, level, duration, price.
  - Certificate verification trust block.
  - “How learning works” flow: enroll -> learn -> assess -> certificate.
  - Organization/teacher onboarding CTA.
  - Mongolian-first copy, English fallback.
- Course catalog:
  - Search, category, level, price, language, certificate filter.
  - Sort by newest/popular/rating.
  - Empty states Mongolian хэлээр нэг мөр.
- Course detail:
  - Curriculum preview.
  - Instructor profile.
  - Requirements/outcomes.
  - Certificate policy.
  - Payment options.

### 7.4 Localization consistency

UI зарим хэсэг English, зарим нь Mongolian байна. Example: Certificates page дээр `My Certificates`, `Issue Certificate`, `Verify`, `Print` гэх мэт English text байна.

Сайжруулах санал:

- i18n layer нэвтрүүлэх: `mn`, `en`.
- Route/page бүр translation key ашиглах.
- Tenant locale-той холбох.
- Date/currency formatting helper centralize хийх.

## 8. Auth, authorization, security

### 8.1 JWT default secret fallback

Gateway болон олон service JWT strategy дээр default/fallback secret хэрэглэж байгаа хэсгүүд байна (`secret`, config optional). Production дээр env дутуу байвал service ажиллахгүй fail-fast байх ёстой.

Сайжруулах санал:

- `JWT_SECRET`, `JWT_REFRESH_SECRET` required validation.
- Secret length minimum.
- Service startup дээр config schema validation fail-fast.

### 8.2 Refresh token/session model

Auth service refresh token table байна. Гэхдээ олон device/session management UI байхгүй.

Сайжруулах санал:

- Session list: device, ip, user-agent, createdAt, lastUsedAt.
- Logout one session.
- Password change дээр all sessions revoke одоогийн logic сайн, UI дээр тайлбарлах.

### 8.3 Role guard consistency

Service бүр өөрийн `JwtAuthGuard`, `CurrentUser`, `JwtStrategy`-тай давхардсан. Зарим endpoint role guardгүй admin-only logic service дотор if-р байна.

Сайжруулах санал:

- `packages/shared-auth` guards/decorators-ийг бүх service ашиглах.
- `@Roles()` decorator нийтлэг болгох.
- Forbidden үед `ApiResponseBuilder.success(null, 'Forbidden')` биш actual `ForbiddenException` шидэх.

## 9. Gateway, API, integration

### 9.1 Gateway versioning ба route docs зөрүү

Gateway `app.setGlobalPrefix('api')`, `enableVersioning(URI)` хэрэглэж байгаа боловч frontend `/api/auth`, `/api/courses` гэж дууддаг. Docs дээр `/api/v1/...` их гарсан. Proxy target нь upstream `/api/${service}` гэж явж байна.

Сайжруулах санал:

- Нэг canonical API style сонгох:
  - `/api/:service/...` эсвэл
  - `/api/v1/:service/...`
- Frontend hooks, docs, Swagger бүгд нэг болгох.
- Gateway дээр request/response contract tests хийх.

### 9.2 Query serialization сул

Gateway `new URLSearchParams(req.query as Record<string, string>)` ашиглаж байна. Array query, nested query, boolean/number multi-value алдагдаж болзошгүй.

Сайжруулах санал:

- `qs` library ашиглах.
- Gateway integration test: repeated params, search filters, pagination.

### 9.3 File upload path хоёрдмол байна

Gateway өөрийн `media` upload controller-той, media-service бас upload хийдэг. Large file upload nginx/gateway/media-service дамжихдаа memory/timeouts эрсдэлтэй.

Сайжруулах санал:

- Direct-to-MinIO presigned upload flow:
  - media-service presigned PUT үүсгэнэ.
  - browser MinIO руу upload хийнэ.
  - media-service finalize endpoint.
- Gateway дээр 500MB multipart дамжуулахыг бууруулах.

## 10. Analytics, notification, audit

### 10.1 Analytics event coverage дутуу

Analytics service event log сайн эхлэлтэй. Гэвч бүх business event canonical биш тул KPI буруу болох эрсдэлтэй.

Сайжруулах санал:

- Event taxonomy баримтжуулах.
- Payment purpose, wallet top-up, course completion, certificate viewed/downloaded, lesson started/completed, quiz submitted, assignment graded зэрэг event бүрийг standard болгох.
- Analytics dashboard дээр event ingestion lag, failed events харуулах.

### 10.2 Notification preference ба delivery status

Notification schema preference-тэй боловч email/SMS/push provider integration production түвшинд тодорхой биш.

Сайжруулах санал:

- Notification template system.
- Delivery provider abstraction.
- Retry/backoff, failure reason, provider message id.
- User-facing notification settings page.

### 10.3 Audit log шаардлагатай

Админ/санхүү/сертификат/курс publish/delete зэрэг high-impact action-д audit log хэрэгтэй.

Сайжруулах санал:

- `audit-service` эсвэл analytics event-ийн strict subset.
- Actor, action, target, before/after, ip, user-agent, correlationId.
- Admin UI search/filter.

## 11. Media, AI, assessment

### 11.1 Media transcoding pipeline placeholder шинжтэй

Media service schema дээр transcode job байна. Гэхдээ background worker, actual FFmpeg/HLS pipeline, progress reporting тодорхойгүй.

Сайжруулах санал:

- Transcode worker service эсвэл BullMQ queue.
- HLS output, thumbnail extraction, duration detection.
- Upload status: UPLOADING -> READY/TRANSCODING -> READY/FAILED.
- Lesson contentUrl mediaId reference-тай болох.

### 11.2 AI feature guardrails

AI tutor/essay score байгаа ч privacy, prompt safety, cost/resource guardrails хэрэгтэй.

Сайжруулах санал:

- Prompt template versioning.
- Course context retrieval strategy.
- Rate limit per user/course.
- AI response moderation/logging.
- Essay grading rubric teacher-configurable болгох.

### 11.3 Quiz/assignment progress integration

Quiz service quiz attempts-тэй боловч lesson/course completion-тэй хэрхэн холбогдох нь сул байна. Assignment graded event notification явж болох ч enrollment progress-д score нөлөөлөх эсэх тодорхойгүй.

Сайжруулах санал:

- Course completion policy:
  - all lessons complete
  - required quiz passed
  - required assignments graded/pass
  - minimum total score
- Policy-г course-service дээр config болгож, enrollment-service completion calculator ашиглах.

## 12. Data model ба tenant strategy

### 12.1 Multi-tenant claim байна, database model дээр tenantId алга

Frontend middleware tenant slug header гаргадаг, default tenant config байна. Гэвч service schemas дээр `tenantId` ерөнхийдөө байхгүй.

Эрсдэл:

- Олон байгууллага нэг платформ дээр ороход course/user/payment/certificate тусгаарлалт хийх боломжгүй.
- Custom domain tenant lookup API docs/code зөрж байна.

Сайжруулах санал:

- Tenant model/tenant-service эсвэл config service бий болгох.
- Core entities-д `tenantId` нэмэх: User/Profile, Course, Enrollment, Payment, Wallet, Certificate, Media.
- JWT-д tenant memberships/activeTenant оруулах.
- Gateway tenant resolution -> service headers -> service-level tenant guard.

### 12.2 Decimal/money handling

Payment, wallet amount Decimal ашиглаж байгаа нь сайн. Гэхдээ frontend талд string/number холилдсон, fees hardcoded 20% харагдаж байна.

Сайжруулах санал:

- Money helper shared package.
- All money API response string.
- Fee policy service/config.
- Currency formatting central helper.

## 13. DevOps, Docker, production readiness

### 13.1 Docker profile dependency clarity

Certificate/wallet/payment ажиллуулахад зөв profile хэрэгтэй:

- Certificate: `ops`
- Wallet/payment: `finance`
- Web: `frontend`
- Core: gateway/auth/course/enrollment

Сайжруулах санал:

- Use-case based compose commands:
  - learner core: `core + frontend`
  - paid course: `core + finance + frontend`
  - certificate: `core + ops + frontend`
  - full learning: `core + learn + finance + ops + frontend`
- `scripts/dev-usecase.sh wallet-topup` гэх мэт wrapper.

### 13.2 Build reliability

Next.js build дээр external font fetch гацах эрсдэл илэрсэн. Build нь deterministic/offline-friendly байх ёстой.

Сайжруулах санал:

- External network шаарддаг build step-үүдийг арилгах.
- Font local/system fallback.
- Docker build cache cleanup docs.
- CI дээр `docker compose build web` smoke.

### 13.3 Resource limits

Compose дээр NestJS services 192MB limit, NODE_OPTIONS 150MB. Prisma + Nest + Swagger + event consumer ачаалалд production дээр бага байж магадгүй.

Сайжруулах санал:

- Dev/prod compose ялгах.
- Memory/load test.
- Healthcheck latency болон restart reason monitor.

## 14. Testing strategy

Одоогоор test script байгаа ч service-level tests харагдахгүй байна.

Сайжруулах санал:

- Unit tests:
  - auth password/refresh/session
  - payment complete/idempotency
  - wallet credit/debit concurrency
  - enrollment completion calculator
  - certificate idempotency
- Contract tests:
  - Gateway route -> service route.
  - Event payload schema validation.
- E2E tests:
  - register/login
  - free course enroll -> complete -> certificate
  - paid course payment -> enrollment
  - wallet top-up QR -> payment confirmed -> balance credit
  - instructor creates course -> publish
- Smoke scripts:
  - `docker compose ... up -d`
  - health endpoints
  - seed login credentials work

## 15. Documentation cleanup

Одоогийн docs сайн эхлэлтэй ч бодит кодтой sync алдагдсан.

Сайжруулах санал:

- `docs/current-architecture.md` гэсэн generated/verified doc нэмэх.
- `docs/api/README.md`-ийг Swagger/OpenAPI-аас шинэчлэх.
- Seed credentials, service ports, compose profile matrix нэг эх сурвалжтай болгох.
- `docs/need.md`-ийг roadmap tracker болгон ашиглаж status column нэмэх.

## 16. Нэн түрүүнд хийх implementation багц

### Багц A - Санхүү ба wallet QR top-up

1. Payment schema-д `purpose`, nullable `courseId`, `walletOwnerId` нэмэх.
2. `CreatePaymentDto`-г discriminated DTO болгох.
3. Wallet top-up endpoint эсвэл payment create purpose нэмэх.
4. Wallet service `payment.confirmed` consumer нэмэх.
5. Enrollment service payment consumer зөвхөн course purchase event дээр ажилладаг болгох.
6. Frontend wallet page дээр QR modal нэмэх.
7. Payment ownership check нэмэх.
8. Mock/dev endpoint production guard хийх.

### Багц B - Enrollment/progress consolidation

1. Enrollment source-of-truth decision гаргах.
2. Course-service enrollment/progress endpoint-үүдийг deprecated болгох.
3. Enrollment-service-д course snapshot/cache нэмэх.
4. Completion calculator-г quiz/assignment policy-той өргөтгөх.
5. Certificate idempotency/unique constraint нэмэх.

### Багц C - Event reliability

1. Shared event envelope.
2. Outbox table + publisher.
3. Consumer idempotency.
4. DLQ + admin replay.
5. Correlation ID propagation.

### Багц D - Frontend learning experience

1. Role-based shell/navigation.
2. My Courses resume/certificate/assignment/quiz status.
3. Course detail payment/wallet/certificate UX.
4. Lesson viewer complete flow.
5. i18n text cleanup.

### Багц E - Docs/test/ops

1. Docs порт/service inventory sync.
2. E2E happy paths.
3. Docker use-case scripts.
4. Build reliability checks.
5. Production config validation.

## 17. Acceptance criteria санал

Доорх acceptance criteria-г хангахад платформ production MVP-д ойртоно.

- Сурагч QPay QR-аар wallet цэнэглээд wallet balance автоматаар нэмэгддэг.
- Wallet top-up payment давхар webhook ирсэн ч balance нэг л удаа нэмэгддэг.
- Paid course purchase амжилттай бол enrollment нэг л удаа үүсдэг.
- Course completion 100% болсон үед certificate нэг л удаа үүсдэг.
- Course-service болон enrollment-service progress зөрөхгүй.
- Admin failed event-ийг харж replay хийж чаддаг.
- Docs дээрх service list, port, profile, route бүгд compose/code-той таардаг.
- Production mode дээр mock/dev payment/top-up endpoint ажиллахгүй.
- Frontend-ийн гол сурагч journey Mongolian UI-тэй, тодорхой next action-той.
- CI дээр unit + contract + e2e smoke tests ажилладаг.

