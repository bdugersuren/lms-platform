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
