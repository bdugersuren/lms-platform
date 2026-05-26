# LMS Platform Server Setup Commands

Энэ файл нь project-ийг GitHub-аас татаж шинэ Linux server дээр Docker Compose ашиглан суурилуулах, тохируулах, migration/seed хийх үндсэн дараалал юм.

**Repository:** `https://github.com/bdugersuren/lms-platform.git`

## 1. Server Бэлтгэх

Ubuntu/Debian server дээр package index шинэчилнэ.

```bash
sudo apt update
sudo apt upgrade -y
```

Docker суусан эсэхийг шалгана.

```bash
docker --version
docker compose version
```

Хэрвээ Docker байхгүй бол Docker Engine болон Compose plugin суулгана. Production server дээр Docker-ийн official installation guide-аар суулгахыг зөвлөж байна.

## 2. Project Байршуулах

Project байрлуулах хавтас руу орно.

```bash
cd /opt
```

GitHub-аас clone хийнэ.

```bash
git clone https://github.com/bdugersuren/lms-platform.git lms-platform
cd /opt/lms-platform
```

Clone хийсний дараа project root дараах байдалтай байна:

```text
/opt/lms-platform
  docker-compose.yml
  .env.example
  scripts/
  services/
  gateway/
  web/
  packages/
  infra/
```

## 3. Environment Тохируулах

`.env.example`-ээс `.env` үүсгэнэ.

```bash
cp .env.example .env
```

`.env` файлыг засна.

```bash
nano .env
```

Заавал өөрчлөх шаардлагатай утгууд:

```env
POSTGRES_PASSWORD=change_to_strong_password
RABBITMQ_DEFAULT_PASS=change_to_strong_password
RABBITMQ_URL=amqp://lms:change_to_strong_password@rabbitmq:5672
MINIO_ROOT_PASSWORD=change_to_strong_password
MINIO_SECRET_KEY=change_to_strong_password
JWT_SECRET=change_to_long_random_secret
JWT_REFRESH_SECRET=change_to_another_long_random_secret
```

JWT secret үүсгэх жишээ:

```bash
openssl rand -hex 32
```

Анхаарах зүйл: `.env` доторх `RABBITMQ_DEFAULT_PASS` болон `RABBITMQ_URL` дахь password заавал ижил байна.

**Domain тохиргоо (МАШ ЧУХАЛ)** — `PLATFORM_DOMAIN` болон `ALLOWED_ORIGINS`-г өөрийн домэйнд тохируулна:

```env
# Gateway: энэ домэйнг үндсэн платформ гэж таних → demo tenant руу хандуулна
PLATFORM_DOMAIN=know.mn
DEFAULT_TENANT_SLUG=demo

# Browser CORS-д зөвшөөрөх origin-ууд
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://know.mn,https://know.mn
```

MinIO presigned URL-ийн тохиргоо — domain-аар солино:

```env
MINIO_BUCKET=lms-media
MINIO_PUBLIC_STORE_URL=http://know.mn/minio-store
```

> **Тайлбар:** `PLATFORM_DOMAIN` тохируулаагүй бол gateway нь `know.mn`-г танихгүй тул login 401 буцаана. `.env.example`-д аль хэдийн `know.mn`-р тохируулагдсан.

## 4. Runtime Volume Хавтас Бэлтгэх

Энэ project Docker runtime өгөгдлийг repo доторх `VOLUMES/` хавтас руу хадгална.

```bash
mkdir -p VOLUMES/postgres/data
mkdir -p VOLUMES/redis/data
mkdir -p VOLUMES/rabbitmq/data
mkdir -p VOLUMES/minio/data
mkdir -p VOLUMES/ollama/data
```

Эдгээр хавтасны зориулалт:

```text
VOLUMES/postgres/data   PostgreSQL database files
VOLUMES/redis/data      Redis runtime data
VOLUMES/rabbitmq/data   RabbitMQ persisted state
VOLUMES/minio/data      Upload хийсэн media/certificate файлууд
VOLUMES/ollama/data     Ollama model/cache data
```

## 5. Infrastructure Асаах

Эхлээд зөвхөн үндсэн infrastructure сервисүүдийг асаана.

```bash
docker compose up -d postgres redis rabbitmq minio
```

MinIO bucket автоматаар үүсгэгдэнэ (`mc-init` container ажиллана).

Status шалгах:

```bash
docker compose ps
```

Log харах:

```bash
docker compose logs -f postgres redis rabbitmq minio
```

## 6. Core Backend Асаах

Gateway, auth, course, enrollment, nginx зэрэг core сервисүүдийг build хийж асаана.

```bash
docker compose --profile core up -d --build
```

Status шалгах:

```bash
docker compose ps
```

API health шалгах:

```bash
curl http://localhost/api/health
curl http://localhost:3000/api/health
```

## 7. Бүх Backend Сервис Асаах

Core + learning + finance + ops сервисүүдийг асаана.

```bash
docker compose --profile core --profile learn --profile finance --profile ops up -d --build
```

Энэ нь дараах service-үүдийг хамарна:

```text
core:    nginx, gateway, auth-service, course-service, enrollment-service,
         user-service, tenant-service, audit-service
learn:   quiz-service, assignment-service
finance: wallet-service, payment-service
ops:     notification-service, media-service, certificate-service,
         analytics-service, ai-service
```

## 8. Frontend/Web Асаах

Frontend-г nginx-ээр дамжуулж ажиллуулахын тулд `core` болон `frontend` profile-г хамт асаана.

```bash
docker compose --profile core --profile frontend up -d --build
```

Browser дээр:

```text
http://SERVER_IP
```

эсвэл domain тохируулсан бол:

```text
http://your-domain.com
```

## 9. AI Service Асаах

AI service болон Ollama их RAM/CPU хэрэглэнэ. Server хангалттай resource-той үед асаана.

```bash
docker compose --profile core --profile ai up -d --build
```

AI model/cache өгөгдөл:

```text
VOLUMES/ollama/data
```

## 10. Database Migration Ажиллуулах

Running container-үүд дээр migration ажиллуулах:

```bash
bash scripts/docker-migrate.sh
```

Анхаарах зүйл: энэ script зөвхөн running байгаа service container-үүд дээр migration хийдэг. Бүх service-ийн migration хийх бол эхлээд бүх backend profile-уудыг асаасан байна.

```bash
docker compose --profile core --profile learn --profile finance --profile ops up -d
bash scripts/docker-migrate.sh
```

## 11. Seed Data Оруулах

Бүх service-ийн `prisma/seed.ts`-ийг ажиллуулах:

```bash
bash scripts/docker-seed.sh
```

Энэ script:

```text
1. Service бүрийн database URL-г тохируулна.
2. Prisma schema-г тухайн DB-тэй sync хийнэ.
3. Service container дотор seed.ts ажиллуулна.
```

Амжилттай бол дараах маягаар дуусна:

```text
✓ Seeded 12 service(s).
```

Default seed хэрэглэгчид:

```text
admin@know.mn    / Admin!1234      (admin, tenant: demo)
student1@know.mn / Student!1234   (student, tenant: demo)
```

> **Анхаарах:** Seed credentials нь `prisma/seed.ts` файлаас хамаарна. Seed дахин ажиллуулбал давхардахгүй (idempotent).

## 12. Хурдан Дараалал (Хэрвээ clone хийгдсэн бол)

Repo аль хэдийн `/opt/lms-platform`-д байгаа үед environment болон volume бэлтгэж хурдан ажиллуулах:

```bash
cd /opt/lms-platform
cp .env.example .env
nano .env

mkdir -p VOLUMES/postgres/data VOLUMES/redis/data VOLUMES/rabbitmq/data VOLUMES/minio/data VOLUMES/ollama/data

docker compose up -d postgres redis rabbitmq minio
docker compose --profile core --profile learn --profile finance --profile ops --profile frontend up -d --build

bash scripts/docker-migrate.sh
bash scripts/docker-seed.sh

docker compose ps
```

Frontend шалгах:

```bash
curl http://localhost/
curl http://localhost/api/health
```

## 13. GitHub → Server: Бүрэн Дараалал (Анхны Байршуулалт)

Шинэ Linux server дээр GitHub-аас татаж, бүрэн байршуулах дараалал:

```bash
# 1. Server бэлтгэх
sudo apt update && sudo apt upgrade -y

# Docker суусан эсэхийг шалгана (суугаагүй бол Official guide-аар суулгана)
docker --version
docker compose version

# 2. Project байрлуулах
cd /opt
git clone https://github.com/bdugersuren/lms-platform.git lms-platform
cd /opt/lms-platform

# 3. Environment тохируулах
cp .env.example .env
nano .env
# Заавал солих: POSTGRES_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET, RABBITMQ_DEFAULT_PASS
# Production domain бол MINIO_PUBLIC_STORE_URL=http://YOUR_DOMAIN/minio-store

# 4. Runtime volume хавтас үүсгэх
mkdir -p VOLUMES/postgres/data VOLUMES/redis/data VOLUMES/rabbitmq/data VOLUMES/minio/data VOLUMES/ollama/data

# 5. Infrastructure эхлүүлэх (MinIO bucket mc-init автомат үүсгэнэ)
docker compose up -d postgres redis rabbitmq minio

# Postgres/RabbitMQ ready болтол 15-20 секунд хүлээнэ
sleep 20

# 6. Бүх backend + frontend build хийж асаах
docker compose --profile core --profile learn --profile finance --profile ops --profile frontend up -d --build

# 7. Database migration ажиллуулах
bash scripts/docker-migrate.sh

# 8. Seed data оруулах
bash scripts/docker-seed.sh

# 9. Шалгах
docker compose ps
curl http://localhost/api/health
```

Амжилттай бол `/api/health` → `{"status":"ok"}` буцаана.

Login шалгах:

```bash
curl -s -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@know.mn","password":"Admin!1234","tenantSlug":"demo"}' \
  | jq '.accessToken'
```

---

## 14. Шинэчлэлт (Git Pull → Rebuild)

GitHub дээр шинэ commit орсон үед server дээр шинэчлэх дараалал:

```bash
cd /opt/lms-platform

# 1. Шинэ код татах
git pull origin main

# 2. Container-үүдийг rebuild хийж шинэчлэх
docker compose --profile core --profile learn --profile finance --profile ops --profile frontend up -d --build

# 3. Шинэ migration байвал ажиллуулах (schema өөрчлөгдсөн үед)
bash scripts/docker-migrate.sh

# 4. Status шалгах
docker compose ps
curl http://localhost/api/health
```

> **Анхаарах:** `--build` flag нь зөвхөн өөрчлөгдсөн service-ийн image-ийг rebuild хийдэг. `VOLUMES/` доторх өгөгдөл хэвэндээ үлдэнэ.

Тодорхой нэг service-ийг л шинэчлэх бол:

```bash
# Жишээ нь зөвхөн gateway шинэчлэх
docker compose up -d --build gateway
docker compose logs -f gateway
```

---

## 15. Log, Status, Restart Командууд

Бүх container status:

```bash
docker compose ps
```

Бүх log:

```bash
docker compose logs -f
```

Тухайн service-ийн log:

```bash
docker compose logs -f gateway auth-service web
```

Service restart:

```bash
docker compose restart gateway auth-service
```

Rebuild хийх:

```bash
docker compose --profile core --profile learn --profile finance --profile ops --profile frontend up -d --build
```

## 16. Зогсоох Командууд

Container-үүдийг зогсоох:

```bash
docker compose --profile core --profile learn --profile finance --profile ops --profile frontend --profile ai down
```

Анхаарах зүйл: `VOLUMES/` доторх өгөгдөл устахгүй.

Container болон local bind-mounted өгөгдлийг хамт устгах шаардлагатай бол `VOLUMES/` хавтсыг гараар устгана. Production server дээр үүнийг backup-гүй хийхгүй.

## 17. Backup Жишээ

PostgreSQL dump авах:

```bash
mkdir -p backups
docker compose exec postgres pg_dumpall -U lms > backups/postgres-all.sql
```

MinIO/upload файлууд backup хийх:

```bash
tar -czf backups/minio-data.tar.gz VOLUMES/minio/data
```

Бүх runtime volume backup:

```bash
tar -czf backups/volumes-all.tar.gz VOLUMES
```

## 18. Нийтлэг Асуудал

**Postgres холбогдохгүй бол:**

```bash
docker compose ps postgres
docker compose logs postgres
```

**RabbitMQ access refused бол** `.env` доторх эдгээр утгыг шалгана:

```env
RABBITMQ_DEFAULT_USER=lms
RABBITMQ_DEFAULT_PASS=...
RABBITMQ_URL=amqp://lms:...@rabbitmq:5672
```

RabbitMQ queue argument conflict (PRECONDITION-FAILED 406) гарвал queue-г management API-аар устгана:

```bash
curl -u lms:<password> -X DELETE http://localhost:15672/api/queues/%2F/<queue-name>
```

**Frontend дээр API ажиллахгүй бол:**

```bash
docker compose logs -f nginx gateway web
curl http://localhost/api/health
```

**401 Unauthorized бүх endpoint дээр гарвал** tenant resolver-ийг шалгана — gateway `x-tenant-id` header-т slug (жишээ нь `demo`) дамжуулж байгаа эсэхийг баталгаажуулна.

**MinIO presigned upload ажиллахгүй бол** nginx `/minio-store/` proxy-г шалгана:

```bash
# CORS preflight шалгах
curl -s -o /dev/null -D - -X OPTIONS http://localhost/minio-store/lms-media/ \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: PUT"
# HTTP/1.1 204 буцаах ёстой

# nginx config reload хийх
docker compose restart nginx
```

> **Тайлбар:** MinIO CORS-ийг `mc cors set` тушаалаар тохируулдаггүй (mc болон MinIO хоорондын API мэдрэмжийн асуудал). Үүний оронд nginx `/minio-store/` location CORS preflight-г шийдэж, `Host: minio:9000` header-ийг дамжуулдаг тул presigned URL-ийн signature шалгалт зөв ажиллана.

**Seed ажиллахгүй бол:**

```bash
docker compose ps
bash scripts/docker-seed.sh
```

**Port давхардвал** тухайн port-ыг ашиглаж байгаа процессыг шалгана:

```bash
sudo ss -ltnp
```

**mc-init container "exited 0" биш бол** log харна:

```bash
docker compose logs mc-init
# Bucket үүссэн эсэхийг шалгах
docker compose exec minio mc ls local/lms-media
```

---

## 19. DMOJ Coding Judge — Суурилуулалт ба Ажиллуулалт

DMOJ бол LMS-тэй хослуулан ашигладаг self-hosted online judge систем юм. `AssignmentType.CODE` төрлийн даалгаврыг автомат judge хийж, оноо тооцоолно.

### Архитектур Тайлбар

```
[Student] → POST /coding/assignments/:id/submissions
    ↓
[coding-service :3017]      lms-net network дотор
    ├─ CodeSubmission үүсгэнэ (coding_db)
    ├─ assignment-service руу Submission бүртгэнэ (REST)
    ├─ DMOJ руу код илгээнэ (HTTP)
    └─ 5 секунд тутам DMOJ-аас үр дүн polling хийнэ
           ↓ GRADED болмогц
    ├─ assignment-service руу Grade дуудна
    │      ↓ (өөрчлөлтгүй, одоогийн chain-г ашиглана)
    └─ enrollment-service AssignmentGradeRecord шинэчилнэ
```

**Сүлжээний зохион байгуулалт:**

| Сервис | lms-net | dmoj-internal | Host port |
|---|---|---|---|
| coding-service | тийм | үгүй | 127.0.0.1:3017 |
| dmoj-site | тийм | тийм | 127.0.0.1:8081 |
| dmoj-db (MariaDB) | үгүй | тийм | — |
| dmoj-redis | үгүй | тийм | — |
| dmoj-celery / dmoj-bridged / dmoj-judge | үгүй | тийм | — |

`coding-service` нь `lms-net` дотор `dmoj-site` container-тэй шууд харилцана. DMOJ-ийн дотоод сервисүүд (`dmoj-db`, `dmoj-redis`) нь тусдаа `dmoj-internal` network-д байдаг тул LMS-аас шууд харагдахгүй — аюулгүй.

---

### 19.1 DMOJ Environment Тохируулах

`.env.dmoj.example`-ээс `.env.dmoj` үүсгэнэ.

```bash
cp .env.dmoj.example .env.dmoj
```

`.env.dmoj` файлыг засна.

```bash
nano .env.dmoj
```

Заавал өөрчлөх утгууд:

```env
# Django secret key (урт, санамсаргүй тэмдэгт мөр)
DMOJ_SECRET_KEY=openssl rand -hex 50 тушаалаар үүсгэнэ

# MariaDB нууц үг
DMOJ_DB_ROOT_PASSWORD=strong_root_password
DMOJ_DB_PASSWORD=strong_db_password

# Judge authentication key
DMOJ_JUDGE_KEY=lms-judge-01
```

Secret key үүсгэх:

```bash
openssl rand -hex 50
```

`.env` (LMS-ийн үндсэн env) дотор DMOJ холболтын тохиргоог нэмнэ:

```bash
nano .env
```

Дараах мөрүүдийг шалган, шаардлагатай бол өөрчилнэ:

```env
# DMOJ холболт (coding-service ашиглана)
DMOJ_BASE_URL=http://dmoj-site:8000
DMOJ_INTERNAL_SECRET=change-me-internal-secret
DMOJ_RESULT_SYNC_INTERVAL_MS=5000

# Coding-service database
CODING_DATABASE_URL=postgresql://lms:YOUR_POSTGRES_PASSWORD@postgres:5432/coding_db

# Service account (coding-service → assignment-service grade дуудахад ашиглана)
CODING_SERVICE_ACCOUNT_EMAIL=coding-system@lms.internal
CODING_SERVICE_ACCOUNT_PASSWORD=strong_service_account_password

# Түр зуурын service JWT (coding-service grade хийхэд хэрэглэнэ)
# auth-service seed хийсний дараа энд буулгана
CODING_SERVICE_JWT_OVERRIDE=
```

---

### 19.2 LMS Stack-г Эхлүүлэх (DMOJ-аас ӨМНӨ)

DMOJ нь `lms-net` network-г `external: true` болгон ашигладаг тул LMS-ийг эхлүүлж `lms-net` network-г үүсгэсэн байх шаардлагатай.

```bash
# Infra дангаар асаагаад network үүсэх хангалттай
docker compose up -d postgres redis rabbitmq minio
```

Network үүссэн эсэхийг шалгана:

```bash
docker network ls | grep lms-net
```

`lms-net` харагдвал зөв. Одоо coding-service хамт асаана:

```bash
# learn profile нь quiz, assignment, coding-service хамарна
docker compose --profile core --profile learn up -d --build
```

coding-service бэлэн болсон эсэхийг шалгана:

```bash
curl http://127.0.0.1:3017/api/health
```

`{"status":"ok"}` буцаах ёстой.

---

### 19.3 DMOJ Stack Асаах

```bash
docker compose -f docker-compose.dmoj.yml --env-file .env.dmoj up -d
```

Container-үүдийн статус:

```bash
docker compose -f docker-compose.dmoj.yml ps
```

Дараах container-үүд `running` байх ёстой:

```text
dmoj-db        MariaDB (DMOJ-ийн өгөгдлийн сан)
dmoj-redis     Redis (channel layer, cache)
dmoj-site      Django web app (DMOJ admin + API)
dmoj-celery    Async task worker
dmoj-bridged   Judge daemon bridge
dmoj-judge     Код ажиллуулагч (C++, Python, Java гэх мэт)
```

DMOJ site бэлэн болоход хэсэг хугацаа (30–60 секунд) шаардлагатай. Log харах:

```bash
docker compose -f docker-compose.dmoj.yml logs -f dmoj-site
```

`"Starting development server at http://0.0.0.0:8000/"` харагдвал бэлэн.

DMOJ site-г browser дээр нээнэ:

```text
http://127.0.0.1:8081
```

---

### 19.4 DMOJ Admin Account Үүсгэх

DMOJ site анх асмагц admin хэрэглэгч байхгүй. `dmoj-site` container дотор Django `createsuperuser` ажиллуулна.

```bash
docker compose -f docker-compose.dmoj.yml exec dmoj-site \
  python manage.py createsuperuser
```

Username, email, password асуух тул оруулна. Дараа нь DMOJ admin UI руу нэвтэрнэ:

```text
http://127.0.0.1:8081/admin
```

---

### 19.5 DMOJ Judge Token Тохируулах

DMOJ admin UI-д нэвтэрсний дараа judge authentication token тохируулна.

**Admin UI > Judge > Add Judge:**

- Name: `lms-judge-01` (`.env.dmoj` дахь `DMOJ_JUDGE_KEY`-тэй ижил байна)
- Authentication key: аюулгүй token үүсгэж оруулна

Ингэснээр `dmoj-judge` container DMOJ-тэй холбогдож код ажиллуулах боломжтой болно.

---

### 19.6 coding_db Migration Ажиллуулах

`coding-service` database-г migrate хийнэ.

```bash
# Container дотор migration
docker compose exec coding-service npx prisma migrate deploy
```

Эсвэл docker-migrate.sh ажиллуулвал coding-service-г автоматаар хамруулна:

```bash
bash scripts/docker-migrate.sh
```

Migration амжилттай бол:

```text
✓ coding-service: migrations applied
```

---

### 19.7 Coding Service Account Seed Хийх

`coding-service` нь `assignment-service` руу grade дуудахдаа service account JWT ашиглана. Auth-service-д `coding-system@lms.internal` хэрэглэгч нэмэх хэрэгтэй.

Энэ хэрэглэгчийг auth-service seed-д нэмэх эсвэл гараар шууд үүсгэнэ:

```bash
# Auth-service-д service account бүртгэх
curl -s -X POST http://localhost/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "coding-system@lms.internal",
    "password": "YOUR_SERVICE_ACCOUNT_PASSWORD",
    "role": "ADMIN",
    "tenantSlug": "demo"
  }'
```

Амжилттай бүртгэгдсэний дараа login хийж JWT авна:

```bash
JWT=$(curl -s -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "coding-system@lms.internal",
    "password": "YOUR_SERVICE_ACCOUNT_PASSWORD",
    "tenantSlug": "demo"
  }' | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['accessToken'])")

echo $JWT
```

Авсан JWT-г `.env` файлд буулгана:

```bash
nano .env
# CODING_SERVICE_JWT_OVERRIDE=eyJhbGc... гэж буулгана
```

coding-service-г restart хийнэ:

```bash
docker compose restart coding-service
```

---

### 19.8 DMOJ Дахь Асуудал Үүсгэж LMS-тэй Холбох (Instructor)

#### Алхам 1: DMOJ admin дээр асуудал (problem) үүсгэх

DMOJ admin UI-д нэвтэрч:

```text
http://127.0.0.1:8081/admin > Problems > Add Problem
```

- **Code:** `hello-world` (жишээ)
- **Name:** Hello World
- **Time limit:** 2.0 (секунд)
- **Memory limit:** 65536 (KB)
- **Points:** 100

Test case-уудыг нэмж (`Problem > Test Data`) input/output оруулна.

#### Алхам 2: LMS дээр CODE даалгавар үүсгэх

Instructor account-аар нэвтэрч, assignment-service-д `AssignmentType.CODE` даалгавар үүсгэнэ:

```bash
curl -s -X POST http://localhost/api/assignments \
  -H "Authorization: Bearer YOUR_INSTRUCTOR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "YOUR_COURSE_ID",
    "title": "Hello World Даалгавар",
    "description": "Стандарт оруултаас нэр уншиж Hello, NAME! хэвлэх",
    "type": "CODE",
    "maxScore": 100,
    "passingScore": 60
  }'
```

Хариуд `assignmentId` авна. Дараа нь coding-service-д DMOJ problem-тэй холбоно:

#### Алхам 3: DMOJ problem-тэй холбох (binding)

```bash
curl -s -X POST http://localhost/api/coding/assignments/YOUR_ASSIGNMENT_ID/binding \
  -H "Authorization: Bearer YOUR_INSTRUCTOR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "dmojProblemCode": "hello-world",
    "allowedLanguages": ["CPP17", "CPP14", "PY3", "JAVA"],
    "maxScore": 100,
    "passingScore": 60
  }'
```

Амжилттай бол:

```json
{
  "id": "...",
  "assignmentId": "YOUR_ASSIGNMENT_ID",
  "dmojProblemCode": "hello-world",
  "isActive": true
}
```

---

### 19.9 Код Илгээх (Student)

Student нэвтэрч, CODE даалгаврыг нээхэд frontend дээр `CodeSubmissionPanel` харагдана:

- Програмчлалын хэл сонгоно (C++17, Python 3 гэх мэт)
- Кодоо бичнэ
- "Judge руу илгээх" товч дарна

**API-аар шалгах:**

```bash
# Student JWT авах
STUDENT_JWT=$(curl -s -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student1@know.mn","password":"Student!1234","tenantSlug":"demo"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['accessToken'])")

# Код илгээх
SUBMISSION=$(curl -s -X POST \
  http://localhost/api/coding/assignments/YOUR_ASSIGNMENT_ID/submissions \
  -H "Authorization: Bearer $STUDENT_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "CPP17",
    "code": "#include<iostream>\nusing namespace std;\nint main(){\n  string name;\n  cin>>name;\n  cout<<\"Hello, \"<<name<<\"!\"<<endl;\n}"
  }')

echo $SUBMISSION
SUBMISSION_ID=$(echo $SUBMISSION | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
```

Submission бүртгэгдсэний дараа `status: QUEUED` буцаана.

---

### 19.10 Submission Үр Дүн Шалгах

Polling worker 5 секунд тутам DMOJ-аас үр дүн татах тул хэдэн секунд хүлээгээд submission-г шалгана:

```bash
# Submission status шалгах
curl -s http://localhost/api/coding/submissions/$SUBMISSION_ID \
  -H "Authorization: Bearer $STUDENT_JWT" \
  | python3 -m json.tool
```

Хариу:

```json
{
  "id": "...",
  "status": "GRADED",
  "language": "CPP17",
  "score": 100,
  "maxScore": 100,
  "timeMs": 34,
  "memoryKb": 3276,
  "cases": [
    { "caseNumber": 1, "status": "AC", "timeMs": 34, "memoryKb": 3276, "score": 100, "maxScore": 100 }
  ]
}
```

`status: GRADED` болж `score >= passingScore` байвал enrollment progress автоматаар шинэчлэгдэнэ.

Миний submission түүх:

```bash
curl -s http://localhost/api/coding/assignments/YOUR_ASSIGNMENT_ID/submissions/my \
  -H "Authorization: Bearer $STUDENT_JWT" \
  | python3 -m json.tool
```

---

### 19.11 DMOJ Зогсоох ба Дахин Асаах

DMOJ зогсоох:

```bash
docker compose -f docker-compose.dmoj.yml down
```

LMS coding-service ажиллах хэвээр байна — student нь `QUEUED` статус харна, DMOJ сэргэхэд polling автоматаар дахин эхэлнэ.

DMOJ дахин асаах:

```bash
docker compose -f docker-compose.dmoj.yml --env-file .env.dmoj up -d
```

---

### 19.12 DMOJ Бүрэн Дараалал (Хурдан Жагсаалт)

```bash
# 1. LMS infra болон network эхлүүлэх
docker compose up -d postgres redis rabbitmq minio
docker compose --profile core --profile learn up -d --build

# 2. coding_db migration
bash scripts/docker-migrate.sh

# 3. DMOJ env тохируулах
cp .env.dmoj.example .env.dmoj
nano .env.dmoj   # DMOJ_SECRET_KEY, DMOJ_DB_PASSWORD заавал өөрчлөх

# 4. DMOJ stack асаах
docker compose -f docker-compose.dmoj.yml --env-file .env.dmoj up -d

# 5. DMOJ admin account үүсгэх (нэг удаа)
docker compose -f docker-compose.dmoj.yml exec dmoj-site \
  python manage.py createsuperuser

# 6. DMOJ site шалгах
curl http://127.0.0.1:8081/api/v2/

# 7. coding-service шалгах
curl http://127.0.0.1:3017/api/health

# 8. Network холболт шалгах
docker network inspect lms-net | python3 -c \
  "import json,sys; names=[c['Name'] for c in json.load(sys.stdin)[0]['Containers'].values()]; print('\n'.join(names))"
# coding-service болон dmoj-site хоёул харагдах ёстой
```

---

### 19.13 DMOJ Нийтлэг Асуудал

**dmoj-site эхлэхгүй, database connection алдаа:**

```bash
docker compose -f docker-compose.dmoj.yml logs dmoj-site
# MariaDB бэлэн болоход хугацаа шаардана — 30 секунд хүлээгээд дахин шалгана
docker compose -f docker-compose.dmoj.yml restart dmoj-site
```

**coding-service DMOJ руу холбогдохгүй (503 judge unavailable):**

```bash
# lms-net дотор dmoj-site харагдаж байгаа эсэх
docker compose exec coding-service curl http://dmoj-site:8000/api/v2/

# Хэрвээ hostname олдохгүй бол DMOJ stack-г асаасан эсэхийг шалгана
docker compose -f docker-compose.dmoj.yml ps
```

**Submission QUEUED-д удаан байвал:**

```bash
# Polling worker log шалгах
docker compose logs -f coding-service | grep -i "poll\|dmoj\|graded"

# DMOJ submission шууд шалгах
docker compose -f docker-compose.dmoj.yml exec dmoj-site \
  python manage.py shell -c "from judge.models import Submission; print(Submission.objects.last())"
```

**dmoj-judge ажиллахгүй бол:**

```bash
docker compose -f docker-compose.dmoj.yml logs dmoj-judge
# Judge token мэдрэмж — DMOJ admin UI > Judge дахь key-тэй DMOJ_JUDGE_KEY ижил байна
```

**lms-net network олдохгүй (docker-compose.dmoj.yml асаахад):**

```bash
# LMS infra эхлүүлэх — network үүсгэнэ
docker compose up -d postgres
docker network ls | grep lms-net
```

**coding-service grade хийхгүй, JWT override дутуу:**

```bash
# CODING_SERVICE_JWT_OVERRIDE тохируулагдсан эсэх
docker compose exec coding-service env | grep CODING_SERVICE_JWT

# Дутуу бол service account login хийж авна (19.7-г үзнэ үү)
```
