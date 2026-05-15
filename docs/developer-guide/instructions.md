# LMS Platform — Серверт Суулгах Бүрэн Заавар

> **Stack:** NestJS · Prisma · PostgreSQL · RabbitMQ · Redis · Next.js · MinIO · Ollama · Docker Compose  
> **Зорилго:** GitHub-аас татаж авснаас эхлэн бүрэн ажиллах хүртлэх алхам алхмаар.

---

## Агуулга

1. [Серверийн шаардлага](#1-серверийн-шаардлага)
2. [Docker суулгах](#2-docker-суулгах)
3. [Node.js болон pnpm суулгах](#3-nodejs-болон-pnpm-суулгах) *(зөвхөн хөгжүүлэлтэд)*
4. [Репозиторыг татах](#4-репозиторыг-татах)
5. [Орчны тохируулга `.env`](#5-орчны-тохируулга-env)
6. [Сервисүүдийг өргөх](#6-сервисүүдийг-өргөх)
7. [Database Migration](#7-database-migration)
8. [Seed өгөгдөл ачаалах](#8-seed-өгөгдөл-ачаалах)
9. [Ажиллаж байгааг шалгах](#9-ажиллаж-байгааг-шалгах)
10. [Өдөр тутмын үйлдлүүд](#10-өдөр-тутмын-үйлдлүүд)
11. [Хөгжүүлэлтийн горим](#11-хөгжүүлэлтийн-горим)
12. [Шинэ сервис нэмэх](#12-шинэ-сервис-нэмэх)
13. [Алдаа засах](#13-алдаа-засах)
14. [Лавлах хүснэгт](#14-лавлах-хүснэгт)

---

## 1. Серверийн шаардлага

### Хамгийн бага тохиргоо

| Нөөц | Хамгийн бага | Санал болгосон |
|---|---|---|
| CPU | 4 core | 8+ core |
| RAM | 8 GB | 16 GB |
| Disk | 40 GB SSD | 100 GB SSD |
| Үйлдлийн систем | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| Сүлжээ | Тогтвортой интернет | Gigabit |

### Шаардлагатай программ

| Хэрэгсэл | Хамгийн бага хувилбар | Тайлбар |
|---|---|---|
| Docker | 26.x+ | Container ажиллуулах |
| Docker Compose plugin | 2.27.x+ | Олон сервис удирдах |
| Git | 2.x+ | Код татах |
| Node.js | 20.x+ | *Зөвхөн хөгжүүлэлт / seed-д* |
| pnpm | 9.x+ | *Зөвхөн хөгжүүлэлт / seed-д* |

---

## 2. Docker суулгах

### Ubuntu 22.04 дээр

```bash
# 1. Хуучин хувилбар байвал устгах
sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# 2. Шаардлагатай package суулгах
sudo apt update
sudo apt install -y ca-certificates curl gnupg lsb-release

# 3. Docker-ийн GPG key нэмэх
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 4. Docker repository нэмэх
echo "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 5. Docker суулгах
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 6. Одоогийн хэрэглэгчид docker бүлэгт нэмэх (sudo шаардахгүй болно)
sudo usermod -aG docker $USER
newgrp docker

# 7. Суулгалтыг шалгах
docker --version
docker compose version
```

**Хүлээгдэх хариу:**
```
Docker version 26.x.x, build ...
Docker Compose version v2.27.x
```

---

## 3. Node.js болон pnpm суулгах

> ⓘ **Production** орчинд зөвхөн Docker ашигладаг тул Node.js/pnpm **заавал биш**.  
> Гэхдээ seed ажиллуулах болон локал хөгжүүлэлтэд шаардлагатай.

```bash
# nvm ашиглан Node.js 20 суулгах
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Shell-г дахин ачаалах
source ~/.bashrc   # bash ашиглаж байгаа бол
# source ~/.zshrc  # zsh ашиглаж байгаа бол

# Node.js 20 суулгаж идэвхжүүлэх
nvm install 20
nvm use 20
nvm alias default 20

# pnpm суулгах
npm install -g pnpm@9

# Шалгах
node --version    # → v20.x.x
pnpm --version    # → 9.x.x
```

---

## 4. Репозиторыг татах

```bash
# Репозиторыг clone хийх
git clone https://github.com/<ORG>/lms-platform.git lms-platform

# Ажлын хавтас руу орох
cd lms-platform

# Одоогийн branch шалгах
git branch
git log --oneline -5
```

> `<ORG>` байрандаа GitHub organization эсвэл хэрэглэгчийн нэрийг тавина.

### Шинэчлэлт татах (хожим)

```bash
git pull origin main
```

---

## 5. Орчны тохируулга `.env`

### 5.1 Template-с хуулах

```bash
cp .env.example .env
```

### 5.2 Аюулгүй нууц үгийн дүрэм

Database connection URL-д зарим тэмдэгт encoding шаардадаг тул нууц үгэнд **дараах тэмдэгтүүдийг ашиглахгүй байна:**

| Зайлсхийх | Шалтгаан |
|---|---|
| `@` | URL-д хэрэглэгч/хост хэсгийг тусгаарлана |
| `!` | Shell-д тусгай утга |
| `\` | Escape тэмдэгт |
| `#`, `?`, `/`, `%`, `:` | URL-д тусгай утга |

**Зөвшөөрөгдсөн тэмдэгтүүд:** `A-Z` `a-z` `0-9` `-` `_`

### 5.3 JWT Secret үүсгэх

JWT secret нь зөвхөн hex тэмдэгт (`0-9`, `a-f`) ашигладаг тул аюулгүй:

```bash
# Terminal-д ажиллуулна — гарсан утгыг доорх .env-д тавина
openssl rand -hex 32   # → JWT_SECRET-д хуулах
openssl rand -hex 32   # → JWT_REFRESH_SECRET-д хуулах (заавал өөр!)
```

### 5.4 Бэлэн `.env` файл — copy-paste хийгээд ★ тэмдэглэсэн 5 утгыг солих

```env
# =============================================================================
# LMS Platform — .env
# Заавал солих утгууд: ★ тэмдэглэсэн 5 мөр
# =============================================================================

# ---------------------------------------------------------------------------
# PostgreSQL
# ---------------------------------------------------------------------------
POSTGRES_USER=lms
POSTGRES_PASSWORD=LmsDb2026KqR9mP        # ★ заавал солих  (A-Z a-z 0-9 - _ гэсэн тэмдэгт)
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# ---------------------------------------------------------------------------
# Redis
# ---------------------------------------------------------------------------
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# ---------------------------------------------------------------------------
# RabbitMQ
# RABBITMQ_URL-д RABBITMQ_DEFAULT_PASS-тайгаа ижил байх ёстой
# ---------------------------------------------------------------------------
RABBITMQ_DEFAULT_USER=lms
RABBITMQ_DEFAULT_PASS=LmsRmq2026MvN8p    # ★ заавал солих
RABBITMQ_URL=amqp://lms:LmsRmq2026MvN8p@rabbitmq:5672
RABBITMQ_EXCHANGE=lms.events

# ---------------------------------------------------------------------------
# MinIO
# MINIO_SECRET_KEY нь MINIO_ROOT_PASSWORD-тэй ижил байна
# ---------------------------------------------------------------------------
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=LmsMinio26WxJ3n      # ★ заавал солих
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=LmsMinio26WxJ3n
MINIO_USE_SSL=false

# ---------------------------------------------------------------------------
# Gateway
# ---------------------------------------------------------------------------
GATEWAY_PORT=3000
GATEWAY_NODE_ENV=production
ALLOWED_ORIGINS=http://localhost,http://localhost:3000
# Production domain бол: ALLOWED_ORIGINS=https://yourdomain.com

# ---------------------------------------------------------------------------
# Upstream сервис URL (docker network дотор)
# ---------------------------------------------------------------------------
AUTH_SERVICE_URL=http://auth-service:3001
USER_SERVICE_URL=http://user-service:3002
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

# ---------------------------------------------------------------------------
# Auth Service
# ---------------------------------------------------------------------------
AUTH_PORT=3001
AUTH_NODE_ENV=production
AUTH_DATABASE_URL=postgresql://lms:LmsDb2026KqR9mP@postgres:5432/auth_db

# JWT — openssl rand -hex 32 командаар үүсгэнэ
JWT_SECRET=★_PASTE_FIRST_OPENSSL_OUTPUT_HERE★    # ★ заавал солих
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=★_PASTE_SECOND_OPENSSL_OUTPUT_HERE★  # ★ заавал солих (эхнийхтэй өөр!)
JWT_REFRESH_EXPIRES_IN=7d

# ---------------------------------------------------------------------------
# Database URL-ууд — POSTGRES_PASSWORD солисон бол энд бас солино
# ---------------------------------------------------------------------------
USER_PORT=3002
USER_NODE_ENV=production
USER_DATABASE_URL=postgresql://lms:LmsDb2026KqR9mP@postgres:5432/user_db

COURSE_PORT=3003
COURSE_NODE_ENV=production
COURSE_DATABASE_URL=postgresql://lms:LmsDb2026KqR9mP@postgres:5432/course_db

ENROLLMENT_PORT=3004
ENROLLMENT_NODE_ENV=production
ENROLLMENT_DATABASE_URL=postgresql://lms:LmsDb2026KqR9mP@postgres:5432/enrollment_db

QUIZ_PORT=3005
QUIZ_NODE_ENV=production
QUIZ_DATABASE_URL=postgresql://lms:LmsDb2026KqR9mP@postgres:5432/quiz_db

ASSIGNMENT_PORT=3006
ASSIGNMENT_NODE_ENV=production
ASSIGNMENT_DATABASE_URL=postgresql://lms:LmsDb2026KqR9mP@postgres:5432/assignment_db

WALLET_PORT=3007
WALLET_NODE_ENV=production
WALLET_DATABASE_URL=postgresql://lms:LmsDb2026KqR9mP@postgres:5432/wallet_db

PAYMENT_PORT=3008
PAYMENT_NODE_ENV=production
PAYMENT_DATABASE_URL=postgresql://lms:LmsDb2026KqR9mP@postgres:5432/payment_db

AI_PORT=3009
AI_NODE_ENV=production
AI_DATABASE_URL=postgresql://lms:LmsDb2026KqR9mP@postgres:5432/ai_db
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=llama3.2
OLLAMA_TIMEOUT_MS=120000

NOTIFICATION_PORT=3010
NOTIFICATION_NODE_ENV=production
NOTIFICATION_DATABASE_URL=postgresql://lms:LmsDb2026KqR9mP@postgres:5432/notification_db
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=LMS Platform <noreply@lms.mn>

MEDIA_PORT=3011
MEDIA_NODE_ENV=production
MEDIA_DATABASE_URL=postgresql://lms:LmsDb2026KqR9mP@postgres:5432/media_db
MINIO_BUCKET=lms-media
MINIO_PUBLIC_URL=http://localhost:9000
UPLOAD_MAX_SIZE_MB=500
PRESIGN_EXPIRES_SECONDS=7200

CERTIFICATE_PORT=3012
CERTIFICATE_NODE_ENV=production
CERTIFICATE_DATABASE_URL=postgresql://lms:LmsDb2026KqR9mP@postgres:5432/certificate_db
APP_PUBLIC_URL=http://localhost

ANALYTICS_PORT=3013
ANALYTICS_NODE_ENV=production
ANALYTICS_DATABASE_URL=postgresql://lms:LmsDb2026KqR9mP@postgres:5432/analytics_db
```

### 5.5 Нууц үг солих — find-and-replace аргаар

Дээрх файлд байгаа жишээ нууц үгийг өөрийн нууц үгээр нэг командаар бүгдийг нь солино:

```bash
# POSTGRES_PASSWORD солих (бүх database URL-д нэгэн зэрэг)
OLD_PG="LmsDb2026KqR9mP"
NEW_PG="ТА_ЭНД_ШИНЭ_НУУЦ_ҮГ_ТАВИНА"
sed -i "s|${OLD_PG}|${NEW_PG}|g" .env

# RABBITMQ нууц үг солих (URL-д мөн тусгагдана)
OLD_RMQ="LmsRmq2026MvN8p"
NEW_RMQ="ТА_ЭНД_ШИНЭ_НУУЦ_ҮГ_ТАВИНА"
sed -i "s|${OLD_RMQ}|${NEW_RMQ}|g" .env

# MinIO нууц үг солих
OLD_MINIO="LmsMinio26WxJ3n"
NEW_MINIO="ТА_ЭНД_ШИНЭ_НУУЦ_ҮГ_ТАВИНА"
sed -i "s|${OLD_MINIO}|${NEW_MINIO}|g" .env

# JWT secret оруулах
JWT1=$(openssl rand -hex 32)
JWT2=$(openssl rand -hex 32)
sed -i "s|★_PASTE_FIRST_OPENSSL_OUTPUT_HERE★|${JWT1}|g" .env
sed -i "s|★_PASTE_SECOND_OPENSSL_OUTPUT_HERE★|${JWT2}|g" .env

echo "✓ .env тохируулга бэлэн"
```

### 5.6 Тохируулга шалгах

```bash
# ★ тэмдэгт үлдсэн эсэх (заавал 0 гарах ёстой)
grep -c "★" .env && echo "⚠ Солигдоогүй утга байна" || echo "✓ Бүх ★ утга солигдсон"

# JWT_SECRET байгаа эсэх
grep "^JWT_SECRET=" .env

# POSTGRES_PASSWORD байгаа эсэх
grep "^POSTGRES_PASSWORD=" .env

# RABBITMQ_URL-д нууц үг зөв эсэх
grep "^RABBITMQ_URL=" .env
```

---

## 6. Сервисүүдийг өргөх

### 6.1 Эхний удаад (image build + start)

```bash
docker compose up -d --build
```

Энэ процесс **10–20 минут** үргэлжилнэ (image build, package install). Лог харахын тулд:

```bash
docker compose logs -f
# Зогсоохдоо: Ctrl+C
```

### 6.2 Container дараалал

Docker Compose дараах дарааллаар сервисүүдийг эхлүүлнэ — `depends_on` + healthcheck-ийг дагана:

```
┌─────────────────────────────────────────────────┐
│  1. Дэд бүтэц (healthcheck дамжсаны дараа дараагийн шат)  │
│     postgres · redis · rabbitmq · minio · ollama           │
└──────────────────────┬──────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│  2. Апп сервисүүд                               │
│     auth · course · enrollment · quiz            │
│     assignment · wallet · payment · ai           │
│     notification · media · certificate · analytics│
└──────────────────────┬──────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│  3. Gateway → Web → NGINX                        │
└─────────────────────────────────────────────────┘
```

### 6.3 Байдлыг шалгах

```bash
docker compose ps
```

**Хүлээгдэх гарц** — бүх сервис `Up (healthy)` байх ёстой:

```
NAME                        STATUS              PORTS
lms-postgres                Up (healthy)        0.0.0.0:5432->5432/tcp
lms-redis                   Up (healthy)        0.0.0.0:6379->6379/tcp
lms-rabbitmq                Up (healthy)        0.0.0.0:5672->5672/tcp
lms-minio                   Up (healthy)        0.0.0.0:9000-9001->9000-9001/tcp
lms-auth-service            Up (healthy)        0.0.0.0:3001->3001/tcp
lms-course-service          Up (healthy)        0.0.0.0:3003->3003/tcp
lms-enrollment-service      Up (healthy)        0.0.0.0:3004->3004/tcp
lms-quiz-service            Up (healthy)        0.0.0.0:3005->3005/tcp
lms-assignment-service      Up (healthy)        0.0.0.0:3006->3006/tcp
lms-wallet-service          Up (healthy)        0.0.0.0:3007->3007/tcp
lms-payment-service         Up (healthy)        0.0.0.0:3008->3008/tcp
lms-ai-service              Up (healthy)        0.0.0.0:3009->3009/tcp
lms-notification-service    Up (healthy)        0.0.0.0:3010->3010/tcp
lms-media-service           Up (healthy)        0.0.0.0:3011->3011/tcp
lms-certificate-service     Up (healthy)        0.0.0.0:3012->3012/tcp
lms-analytics-service       Up (healthy)        0.0.0.0:3013->3013/tcp
lms-gateway                 Up (healthy)        0.0.0.0:3000->3000/tcp
lms-web                     Up (healthy)
lms-nginx                   Up                  0.0.0.0:80->80/tcp
```

> Зарим сервис `starting` гарч байвал 1–2 минут хүлээгээд дахин шалгана.

### 6.4 Асуудал гарвал

```bash
# Тухайн сервисийн дэлгэрэнгүй лог
docker compose logs --tail=50 auth-service

# Бүх сервисийн хуучин лог харах
docker compose logs --tail=20 2>&1 | grep -E "(ERROR|WARN|error|warn)" | head -30
```

---

## 7. Database Migration

Сервисүүд ажиллаж байгаа үед database schema-г шинэчлэх.

### 7.1 Docker script ашиглах (зөвлөмж)

```bash
bash scripts/docker-migrate.sh
```

Script нь бүх ажиллаж буй сервисийн container дотор `prisma migrate deploy` ажиллуулна. Амжилттай бол:

```
▶ Migrating auth-service ...
  ✓ auth-service
▶ Migrating course-service ...
  ✓ course-service
...
✓ All container migrations complete.
```

### 7.2 Нэг сервисийн migration тусад нь

```bash
# Container дотор
docker compose exec auth-service sh -c \
  "cd /app/services/auth-service && npx prisma migrate deploy"

# Товч хэлбэр
docker compose exec course-service npx prisma migrate deploy
```

### 7.3 Migration байдал шалгах

```bash
docker compose exec auth-service sh -c \
  "cd /app/services/auth-service && npx prisma migrate status"
```

**Зөв гарц:**
```
The following migration(s) have been applied:
✔ 20260513030040_init
No pending migrations.
```

### 7.4 Шинэ migration үүсгэх (хөгжүүлэлтэд)

Schema өөрчилсний дараа:

```bash
cd services/course-service

# Шинэ migration үүсгэх
DATABASE_URL="postgresql://lms:<нууц_үг>@localhost:5432/course_db" \
  pnpm exec prisma migrate dev --name add_course_certificate_url

# Дараа нь migration file-г git-д commit хийнэ
git add prisma/migrations/
git commit -m "feat(course): add certificate_url field"
```

> ⚠️ `migrate dev` нь зөвхөн **хөгжүүлэлтийн орчинд** ашиглана.  
> Production-д `migrate deploy` ашигладаг (docker-migrate.sh хийнэ).

---

## 8. Seed өгөгдөл ачаалах

Seed нь систем эхэлж ажиллахад дараах үндсэн өгөгдлийг бэлтгэнэ:

| Сервис | Seed өгөгдөл |
|---|---|
| auth | 7 хэрэглэгч (1 super_admin, 1 admin, 2 instructor, 3 student) |
| course | 3 курс, 6 модуль, 18 хичээл, 5 skill |
| enrollment | 4 элсэлт (1 дууссан, 1 явцтай, 2 шинэ) |
| quiz | 2 quiz, 10 асуулт (TypeScript, NestJS) |
| assignment | 6 даалгавар (code, text, file upload) |
| wallet | 7 wallet, 3 transaction, 2 revenue share |
| payment | 4 payment (3 COMPLETED, 1 PENDING) |
| ai | 1 chat session, 3 recommendation |
| notification | 7 preference, 8 мэдэгдэл |
| media | 7 медиа файл (5 video, 2 PDF), subtitle |
| certificate | 1 гэрчилгээ |
| analytics | 7 хоногийн KPI, 8 event |

**Нэвтрэх нууц үгнүүд (seed-ийн дараа):**
```
superadmin@lms.mn  / Admin1234!
admin@lms.mn       / Admin1234!
instructor1@lms.mn / Admin1234!
instructor2@lms.mn / Admin1234!
student1@lms.mn    / Student1234!
student2@lms.mn    / Student1234!
student3@lms.mn    / Student1234!
```

### 8.1 Docker seed script (зөвлөмж)

Энэ script нь HOST машинаас `localhost:5432`-д холбогдон seed ажиллуулна.

**Шаардлага:** Node.js ба pnpm суусан байх (3-р хэсэг үзнэ)

```bash
# 1. Dependency суулгах (нэг удаа)
pnpm install

# 2. Prisma client үүсгэх
pnpm -r exec prisma generate

# 3. Seed ажиллуулах
bash scripts/docker-seed.sh
```

**Амжилттай гарц:**
```
▶ Seeding services/auth-service (db: auth_db) ...
  ✓ services/auth-service
▶ Seeding services/course-service (db: course_db) ...
  ✓ services/course-service
...
✓ Seeded 12 service(s).
```

### 8.2 Нэг сервисийн seed тусад нь

```bash
# DATABASE_URL-ийг localhost-оор дарж өгнө
DATABASE_URL="postgresql://lms:<нууц_үг>@localhost:5432/auth_db" \
  bash -c "cd services/auth-service && pnpm run seed"
```

### 8.3 Seed дахин ажиллуулах

Seed нь **idempotent** — хэдэн удаа ажиллуулсан ч давхардал үүсэхгүй (`upsert` ашигладаг).

```bash
bash scripts/docker-seed.sh
```

---

## 9. Ажиллаж байгааг шалгах

### 9.1 Health check хийх

```bash
# Gateway
curl -s http://localhost:3000/api/health | python3 -m json.tool

# Auth service шууд
curl -s http://localhost:3001/api/health | python3 -m json.tool

# Frontend (NGINX-ээр дамжсан)
curl -I http://localhost
```

**Зөв хариу:**
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis":    { "status": "up" }
  }
}
```

### 9.2 Swagger API баримтжуулал нээх

Браузерт дараах хаягуудыг нээнэ:

| Хаяг | Сервис |
|---|---|
| `http://localhost/` | Frontend (Next.js) |
| `http://localhost:3000/api/docs` | Gateway Swagger |
| `http://localhost:3001/api/docs` | Auth Swagger |
| `http://localhost:3003/api/docs` | Course Swagger |

### 9.3 Дэд бүтцийн UI нэвтрэх

| Хаяг | Хэрэгсэл | Нэвтрэх |
|---|---|---|
| `http://localhost:15672` | RabbitMQ Management | .env `RABBITMQ_DEFAULT_USER` / `RABBITMQ_DEFAULT_PASS` |
| `http://localhost:9001` | MinIO Console | .env `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` |

### 9.4 Нэвтрэх API шалгах

```bash
# Login хийж токен авах
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student1@lms.mn","password":"Student1234!"}' \
  | python3 -m json.tool
```

**Зөв хариу:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "...",
  "user": { "id": "...", "email": "student1@lms.mn", "role": "STUDENT" }
}
```

---

## 10. Өдөр тутмын үйлдлүүд

### Систем эхлүүлэх / зогсоох

```bash
docker compose up -d         # эхлүүлэх (background)
docker compose down          # зогсоох (өгөгдөл хадгалагдана)
docker compose restart       # бүгдийг дахин эхлүүлэх

# ⚠️ Дараахийг болгоомжтой ашигла — volume устгана, өгөгдөл алдагдана
docker compose down -v
```

### Нэг сервис дахин build хийх (код өөрчлөгдсөний дараа)

```bash
docker compose up -d --build auth-service
```

### Лог харах

```bash
docker compose logs -f                         # бүх сервис
docker compose logs -f auth-service gateway    # тодорхой сервисүүд
docker compose logs --tail=200 course-service  # сүүлийн 200 мөр

# Алдааг шүүж харах
docker compose logs 2>&1 | grep -E "ERROR|error" | tail -30
```

### Container дотор орох

```bash
docker compose exec auth-service sh
docker compose exec postgres sh
docker compose exec redis sh
```

### PostgreSQL-д шууд холбогдох

```bash
# Container дотроос
docker compose exec postgres psql -U lms -d auth_db

# Host-оос (port 5432 нээлттэй бол)
psql -h localhost -U lms -d auth_db

# Нийт database жагсаалт
docker compose exec postgres psql -U lms -c "\l"
```

### Migration deploy (шинэ код татсаны дараа)

```bash
git pull origin main
bash scripts/docker-migrate.sh
```

### Нэг сервисийн migration

```bash
docker compose exec course-service sh -c \
  "cd /app/services/course-service && npx prisma migrate deploy"
```

### Prisma Studio (database GUI)

```bash
# Тухайн сервисийн database-г браузераар харах
cd services/auth-service
DATABASE_URL="postgresql://lms:<нууц_үг>@localhost:5432/auth_db" \
  pnpm exec prisma studio
# → http://localhost:5555 нээнэ
```

### Ollama AI загвар татах

```bash
# LLaMA загвар татах (~4 GB)
docker compose exec ollama ollama pull llama3.2

# Татагдсан загваруудын жагсаалт
docker compose exec ollama ollama list

# Тест хийх
docker compose exec ollama ollama run llama3.2 "Сайн байна уу?"
```

---

## 11. Хөгжүүлэлтийн горим

Дэд бүтцийг Docker-оор, апп кодыг локал `ts-node`-оор ажиллуулна.  
Ингэснээр кодын өөрчлөлт шууд хүчин төгөлдөр болно (hot-reload).

### 11.1 Дэд бүтцийг эхлүүлэх

```bash
docker compose up -d postgres redis rabbitmq minio
```

### 11.2 Dependency суулгах (нэг удаа)

```bash
pnpm install
pnpm run bootstrap   # Prisma client үүсгэх + migration
```

### 11.3 Сервисийг локал ажиллуулах

Тус бүр **тусдаа terminal цонх**-д:

```bash
# Auth Service
cd services/auth-service && pnpm run start:dev

# Course Service
cd services/course-service && pnpm run start:dev

# Gateway
cd gateway && pnpm run start:dev
```

### 11.4 Хэрэгтэй тушаалууд

```bash
pnpm install                      # бүх dependency суулгах
pnpm -r exec prisma generate      # бүх Prisma client дахин үүсгэх
pnpm run build                    # бүх сервис build хийх
pnpm run lint                     # code style шалгах
pnpm run test                     # unit тест
pnpm run test:e2e                  # e2e тест
```

### 11.5 Шинэ package нэмэх

```bash
pnpm --filter auth-service add <package>       # prod dependency
pnpm --filter auth-service add -D <package>    # dev dependency
pnpm -r add <package>                          # бүх сервист
```

---

## 12. Шинэ сервис нэмэх

### Алхам 1 — Database үүсгэх

`infra/postgres/init.sql`-д нэмэх:

```sql
CREATE DATABASE new_service_db;
GRANT ALL PRIVILEGES ON DATABASE new_service_db TO lms;
```

### Алхам 2 — Орчны тохируулга

`.env.example` болон `.env`-д нэмэх:

```env
NEW_SERVICE_PORT=3014
NEW_SERVICE_NODE_ENV=development
NEW_SERVICE_DATABASE_URL=postgresql://lms:<нууц_үг>@postgres:5432/new_service_db
```

### Алхам 3 — `docker-compose.yml`-д нэмэх

```yaml
new-service:
  build:
    context: .
    dockerfile: services/new-service/Dockerfile
    target: runner
  container_name: lms-new-service
  restart: unless-stopped
  env_file: .env
  environment:
    PORT: ${NEW_SERVICE_PORT:-3014}
    NODE_ENV: ${NEW_SERVICE_NODE_ENV:-development}
    DATABASE_URL: ${NEW_SERVICE_DATABASE_URL}
  ports:
    - "3014:3014"
  networks:
    - lms-net
  depends_on:
    postgres:
      condition: service_healthy
    rabbitmq:
      condition: service_healthy
  healthcheck:
    test: ["CMD", "curl", "-f", "http://127.0.0.1:3014/api/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
```

### Алхам 4 — Scripts-д нэмэх

`scripts/migrate.sh`, `scripts/seed.sh`, `scripts/bootstrap.sh`, `scripts/docker-migrate.sh`, `scripts/docker-seed.sh` файлуудын `SERVICES` массивт нэмнэ:

```bash
"services/new-service"
```

### Алхам 5 — Gateway route нэмэх

`gateway/src/proxy/services.config.ts` файлд upstream нэмнэ.

---

## 13. Алдаа засах

### Container эхлэхгүй байна

```bash
# Лог харах
docker compose logs --tail=50 <svc-нэр>

# Container байдал
docker compose ps

# Container шууд ажиллуулж алдааг шалгах
docker compose run --rm auth-service sh
```

### Migration алдаа гарлаа

```bash
# Migration байдал харах
docker compose exec auth-service sh -c \
  "cd /app/services/auth-service && npx prisma migrate status"

# ⚠️ Зөвхөн dev орчинд — бүх өгөгдлийг устгана!
docker compose exec auth-service sh -c \
  "cd /app/services/auth-service && npx prisma migrate reset"
```

### Database холбогдохгүй байна

```bash
# PostgreSQL бэлэн эсэх
docker compose exec postgres pg_isready -U lms

# Database байгаа эсэх
docker compose exec postgres psql -U lms -c "\l"

# .env-д DATABASE_URL зөв эсэх шалгах
grep "AUTH_DATABASE_URL" .env
```

### RabbitMQ холбогдохгүй байна

```bash
# RabbitMQ байдал
docker compose exec rabbitmq rabbitmq-diagnostics ping

# RABBITMQ_URL шалгах
grep "RABBITMQ_URL" .env

# RabbitMQ лог харах
docker compose logs --tail=30 rabbitmq
```

### Port давхцал

```bash
# 3000 порт ашиглаж буй процесс
sudo lsof -i :3000

# Процесс зогсоох
sudo kill -9 <PID>
```

### Disk дүүрэн

```bash
# Disk зай шалгах
df -h

# Docker-ийн нөөц шалгах
docker system df

# Ашиглагдаагүй image, container цэвэрлэх (volume хадгалагдана)
docker system prune -a

# ⚠️ Volume-г бас устгах (өгөгдөл алдагдана)
docker system prune -a --volumes
```

### Seed алдаа гарлаа

```bash
# PostgreSQL localhost:5432-д нэвтрэх боломж шалгах
psql -h localhost -U lms -d auth_db -c "SELECT 1"

# Нэг сервис тусад нь seed хийж алдаа харах
DATABASE_URL="postgresql://lms:<нууц_үг>@localhost:5432/auth_db" \
  bash -c "cd services/auth-service && pnpm run seed"
```

### Нийтлэг алдааны хүснэгт

| Алдааны шинж тэмдэг | Шалтгаан | Засах арга |
|---|---|---|
| `ECONNREFUSED 5432` | PostgreSQL бэлэн болоогүй | `docker compose ps postgres` — healthy хүртэл хүлээ |
| `ECONNREFUSED 5672` | RabbitMQ бэлэн болоогүй | `docker compose ps rabbitmq` — healthy хүртэл хүлээ |
| `P1001: Can't reach database` | DATABASE_URL буруу | `.env`-ийн нууц үгийг шалга |
| `JWT_SECRET not defined` | .env ачаалагдаагүй | `env_file: .env` docker-compose-д байгаа эсэх |
| `Container unhealthy` | Апп эхлэхгүй байна | `docker compose logs <svc>` — root cause харах |
| `Port already in use` | Өөр процесс ашиглаж байна | `sudo lsof -i :<port>` → kill |
| Migration `drift detected` | Schema болон migration нийцэхгүй | `migrate reset` (dev only!) |

---

## 14. Лавлах хүснэгт

### Портуудын жагсаалт

| Сервис | Порт | Swagger / UI |
|---|---|---|
| **NGINX** (entry point) | **80** | `http://localhost` |
| Gateway | 3000 | `http://localhost:3000/api/docs` |
| Auth | 3001 | `http://localhost:3001/api/docs` |
| Course | 3003 | `http://localhost:3003/api/docs` |
| Enrollment | 3004 | `http://localhost:3004/api/docs` |
| Quiz | 3005 | `http://localhost:3005/api/docs` |
| Assignment | 3006 | `http://localhost:3006/api/docs` |
| Wallet | 3007 | `http://localhost:3007/api/docs` |
| Payment | 3008 | `http://localhost:3008/api/docs` |
| AI | 3009 | `http://localhost:3009/api/docs` |
| Notification | 3010 | `http://localhost:3010/api/docs` |
| Media | 3011 | `http://localhost:3011/api/docs` |
| Certificate | 3012 | `http://localhost:3012/api/docs` |
| Analytics | 3013 | `http://localhost:3013/api/docs` |
| PostgreSQL | 5432 | — |
| Redis | 6379 | — |
| RabbitMQ AMQP | 5672 | — |
| RabbitMQ UI | 15672 | `http://localhost:15672` |
| MinIO API | 9000 | — |
| MinIO Console | 9001 | `http://localhost:9001` |
| Ollama | 11434 | — |

### Бүрэн суулгалтын дараалал (товч)

```bash
# 1. Код татах
git clone <REPO_URL> lms-platform && cd lms-platform

# 2. Орчин тохируулах
cp .env.example .env
# → .env файлд нууц үг, JWT secret, DATABASE_URL-уудыг тохируулах

# 3. Бүх сервис өргөх
docker compose up -d --build

# 4. Бүгд healthy болтол хүлээх
watch docker compose ps

# 5. Migration
bash scripts/docker-migrate.sh

# 6. Seed (заавал биш, demo/dev орчинд)
pnpm install && pnpm -r exec prisma generate
bash scripts/docker-seed.sh

# 7. Шалгах
curl http://localhost:3000/api/health
curl -I http://localhost
```

### Хурдан лавлах тушаалууд

```bash
# ── Эхлүүлэх / зогсоох ────────────────────────────────────
docker compose up -d                          # эхлүүлэх
docker compose down                           # зогсоох (өгөгдөл хэвээр)
docker compose down -v                        # зогсоох + volume устгах ⚠️
docker compose restart                        # дахин эхлүүлэх
docker compose ps                             # байдал шалгах

# ── Migration ─────────────────────────────────────────────
bash scripts/docker-migrate.sh                # бүх сервис (container дотор)
bash scripts/migrate.sh                       # бүх сервис (host-оос, pnpm шаардлагатай)
docker compose exec <svc> npx prisma migrate deploy  # нэг сервис

# ── Seed ──────────────────────────────────────────────────
bash scripts/docker-seed.sh                   # бүх сервис (host-оос, pnpm шаардлагатай)
bash scripts/seed.sh                          # бүх сервис (host-оос)

# ── Лог ───────────────────────────────────────────────────
docker compose logs -f                        # бүх сервисийн лог
docker compose logs -f <svc>                  # нэг сервисийн лог
docker compose logs --tail=100 <svc>          # сүүлийн 100 мөр

# ── Rebuild ───────────────────────────────────────────────
docker compose up -d --build <svc>            # нэг сервис дахин build

# ── Shell ─────────────────────────────────────────────────
docker compose exec <svc> sh                  # container дотор орох
docker compose exec postgres psql -U lms -d <db>  # database shell

# ── Prisma ────────────────────────────────────────────────
pnpm -r exec prisma generate                  # бүх client дахин үүсгэх
docker compose exec <svc> npx prisma migrate status  # migration байдал
```
