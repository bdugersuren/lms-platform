# Engineering Roadmap

| ID | Topic | Priority | Status | Notes |
|---|---|---|---|---|
| ENG-001 | Centralize service metadata and standardize microservice conventions | Normal | DONE | |
| ENG-002 | services/user-service | Normal | DONE |  |
| ENG-003 | Enrollment/progress хоёр газар давхар байна| Normal | DONE |   |
| ENG-004 | Event contract-ууд scattered string literal| Normal | DONE |  Solution |
| ENG-005 | Wallet, payment, банкны QR top-up | High | TODO |  Solution |

ENG-001 Details

Problem:

- Service configuration is distributed across docker-compose, env files, and service code.
- Naming conventions exist implicitly but are not formally defined.
- Ports, URLs, profiles, and service identities are difficult to manage centrally.
- Documentation generation cannot reliably derive architecture metadata.

Goal:

Create a centralized service metadata system.

Requirements:

- Create config/services.yml
- Define:
    - service name
    - container name
    - internal port
    - compose profile
    - dependencies
    - environment naming convention
- Ensure all services follow deterministic naming patterns.
- Generate documentation from centralized metadata.
- Reduce duplicated configuration.
- Preserve current runtime behavior.

Architecture Rules:

- Service ports must remain stable.
- Internal Docker DNS names must remain backward compatible.
- Generated docs must reflect actual runtime topology.
- New services must be addable from one place.

Deliverables:

- config/services.yml
- docs/generated/current-architecture.md
- service matrix documentation
- dependency graph generation
- docs verification tooling

Success Criteria:

- Every service has a single authoritative metadata definition.
- Adding a new service requires updating only one metadata source.
- Generated documentation matches runtime configuration exactly.




ENG-002 Details

`user-service` байхгүй боловч docs/gateway дээр байгаа

Одоогийн repo-д `services/user-service` байхгүй. Гэвч:

- `docs/architecture/README.md`, `docs/developer-guide/README.md` дээр `user-service` гэж тусдаа service байдлаар тайлбарласан.
- `gateway/src/proxy/services.config.ts` дээр `users: process.env.USER_SERVICE_URL` route байна.
- Auth service-ийн `User` model нь email, role, MFA-тэй боловч profile/full name/avatar/organization preference гэх мэт LMS хэрэглэгчийн profile байхгүй.

Сайжруулах санал:

- шийдвэр гаргах:
  - `user-service`-ийг үнэхээр үүсгэж, profile, organization, tenant membership, student/instructor profile, displayName, avatar, locale, bio хадгалдаг болгох.
  
- Certificate service одоо `recipientName ?? 'Student'` гэж fallback хийдэг. Profile service байхгүйгээс сертификат дээр сурагчийн жинхэнэ нэр гарахгүй. Иймээс profile read model  хэрэгтэй.





ENG-003 Enrollment/progress хоёр газар давхар байна

Одоогийн бүтэц:

course-service/prisma/schema.prisma: CourseEnrollment, LessonProgress, interactive progress models.
enrollment-service/prisma/schema.prisma: Enrollment, LessonProgress.
Frontend-ийн use-enrollment.ts нь /enrollments/* буюу enrollment-service-ийг ашиглаж байна.
course-service/src/enrollment болон course-service/src/progress бас enrollment/progress endpoint-тэй.
Энэ нь дараах асуудлыг үүсгэнэ:

Нэг сурагчийн progress хоёр database-д өөр өөр болж болно.
Certificate generation аль event-ийг сонсох нь тодорхойгүй болно.
Wallet revenue distribution аль enrollment ID-г ашиглах нь зөрж болно.
Course content delete/update хийхэд enrollment-service-ийн progress sync алдагдана.
Сайжруулах санал:

Enrollment/progress-ийн single source of truth-ийг enrollment-service болгох.
course-service-ээс CourseEnrollment, LessonProgress-ийг legacy гэж тэмдэглэж, endpoint-үүдийг deprecate хийх эсвэл зөвхөн course content owner байлгах.
Course content өөрчлөгдөхөд course.lesson.created, course.lesson.deleted, course.lesson.reordered, course.published event гаргаж enrollment-service өөрийн lesson progress projection-ийг sync хийдэг болгох.
Interactive block answer/progress course-service-д үлдэх үү, enrollment-service-д шилжих үү гэдгийг тодорхойлох. Learning progress-тэй шууд холбоотой тул enrollment-service-д ойртуулах нь илүү 




ENG-004 4. Event contract-ууд scattered string literal байна

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


ENG-005 Wallet, payment, банкны QR top-up

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