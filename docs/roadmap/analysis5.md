ENG-005 — Системийн анализ
Одоогийн асуудлуудын оношлогоо
5.1 Wallet top-up production workflow байхгүй
Яагаад болохгүй байна:

Файл	Асуудал
payment/schema.prisma:32	courseId String — required, nullable биш
create-payment.dto.ts:12	@IsUUID() courseId заавал required
payment-events.ts:4	PaymentConfirmedPayload.courseId: string — required
wallet event-listener.service.ts	payment.confirmed event огт сонсдоггүй
wallet.controller.ts:31	POST /wallet/dev/topup — production дээр 403
Flow яаж эвдэрч байна:


Хэрэглэгч wallet topup хийнэ
→ POST /payments { courseId: ??? }  ← courseId хаанаас авах?
→ Payment completed
→ payment.confirmed event emit
→ enrollment-service: courseId-гүй бол enrollFromPayment алдана
→ wallet-service: event огт сонсдоггүй → balance хэзээ ч нэмэгдэхгүй
5.2 Payment ownership шалгалт дутуу
Файл	Асуудал
payment.service.ts:108	findById(id) — userId шалгалт байхгүй
payment.controller.ts:50	GET /payments/:id — user controller-аас service руу дамжихгүй
payment.controller.ts:57	POST /payments/:id/check — адилхан асуудал
5.3 Mock/dev endpoints production hardening
Файл	Асуудал
webhook.controller.ts:48	POST /webhooks/mock-pay/:id — guard огт байхгүй, NODE_ENV шалгалт байхгүй
webhook.controller.ts:39	POST /webhooks/simulate/:id — JWT guard байгаа ч admin role шалгалт байхгүй
5.4 Wallet transaction type нарийвчлал
Файл	Асуудал
wallet/schema.prisma:21	WALLET_TOPUP type байхгүй — топ-ап CREDIT гэж бүртгэгдэнэ
wallet/schema.prisma:72	reference field — unique constraint байхгүй → нэг paymentId-аар давхар credit боломжтой
Засах төлөвлөгөө
Phase 1 — Shared types (суурь)
1.1 packages/shared-types/src/events/payloads/payment-events.ts

PaymentConfirmedPayload дотор purpose: 'COURSE_PURCHASE' | 'WALLET_TOPUP' нэмэх
courseId?: string optional болгох
walletOwnerId?: string нэмэх
Phase 2 — Payment Service
2.1 prisma/schema.prisma


enum PaymentPurpose {
  COURSE_PURCHASE
  WALLET_TOPUP
}

model Payment {
  purpose       PaymentPurpose @default(COURSE_PURCHASE)
  courseId      String?        // optional болгох
  walletOwnerId String?        // топ-ап хэн хийж байгааг хадгалах
}
2.2 src/payment/dto/create-payment.dto.ts

purpose field нэмэх
COURSE_PURCHASE үед courseId required (@ValidateIf)
WALLET_TOPUP үед courseId байхгүй
2.3 src/payment/payment.service.ts

create() — purpose-г дэмжих, description update
completePayment() — event payload дотор purpose, walletOwnerId дамжуулах
findById(id, userId, isAdmin?) — owner шалгалт нэмэх
checkPayment(id, userId) — owner шалгалт нэмэх
2.4 src/payment/payment.controller.ts

findOne, checkPayment — user service руу дамжуулах
2.5 src/webhook/webhook.controller.ts

mock-pay — JwtAuthGuard + NODE_ENV шалгалт нэмэх
simulate — admin role guard нэмэх
Phase 3 — Wallet Service
3.1 prisma/schema.prisma

TransactionType дотор WALLET_TOPUP нэмэх
Transaction.reference дээр @unique → idempotency хангах
3.2 src/events/event-listener.service.ts

payment.confirmed event шинэ consumer нэмэх:

purpose === WALLET_TOPUP → walletService.credit(userId, amount, 'Хэтэвч цэнэглэлт', 'WALLET_TOPUP', paymentId)
purpose === COURSE_PURCHASE → skip (enrollment-service хариуцна)
3.3 src/wallet/wallet.service.ts

credit() — WALLET_TOPUP type дэмжих
Phase 4 — Enrollment Service
4.1 src/events/event-listener.service.ts

onPaymentConfirmed() дотор purpose === 'COURSE_PURCHASE' шалгалт нэмэх
WALLET_TOPUP event ирвэл log хийгээд skip хийх (enrollFromPayment дуудахгүй)
Phase 5 — Frontend
5.1 web/src/app/wallet/page.tsx — Production topup flow нэмэх:

"Хэтэвч цэнэглэх" primary CTA button (production дээр харагдана)
Preset amounts: 10k, 50k, 100k, 500k
Provider сонголт: QPay / SocialPay
QR code modal (QPay дэлгэц)
"Төлбөр шалгах" polling button
Төлбөр амжилттай болсон үед wallet balance refresh
5.2 web/src/hooks/use-wallet.ts — topup mutation нэмэх

5.3 web/src/types/wallet.ts — WALLET_TOPUP transaction type нэмэх

Хийх ажлуудын дараалал

Phase 1: shared-types update           ← бусад бүгд хамаарна
Phase 2: payment-service               ← schema + DTO + service + controller + webhook
Phase 3: wallet-service                ← schema + event consumer + wallet service
Phase 4: enrollment-service            ← purpose guard нэмэх
Phase 5: frontend                      ← topup UI + hooks  шалгаад нэмэлт засвар өөрчлөлтүүд байвал бүрэн гүйцэт хийгээд өгөөч
Засварыг эхлүүлэх үү? Эсвэл тодруулах асуудал байвал хэлнэ үү.