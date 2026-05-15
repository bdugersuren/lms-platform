# LMS Platform — Суулгах ба Удирдах Заавар

> **Stack:** NestJS · Prisma · PostgreSQL · RabbitMQ · Redis · Next.js · MinIO · Ollama · Docker Compose

---

## Агуулга

- [Шинэ серверт суулгах](#шинэ-серверт-суулгах) — эхний удаагийн бүрэн дараалал
- [Өдөр тутмын үйлдлүүд](#өдөр-тутмын-үйлдлүүд) — restart, log, build, migration
- [Хөгжүүлэлтийн горим](#хөгжүүлэлтийн-горим) — локал орчинд ажиллах
- [Шинэ сервис нэмэх](#шинэ-сервис-нэмэх)
- [Лавлах хүснэгт](#лавлах-хүснэгт) — порт, хаяг, тушаалын жагсаалт

---

## Шинэ серверт суулгах

### Шаардлага

| Хэрэгсэл | Хамгийн бага хувилбар |
|---|---|
| Docker | 26.x+ |
| Docker Compose plugin | 2.27.x+ |
| Git | 2.x+ |
| Node.js *(локал хөгжүүлэлтэд)* | 20.x+ |
| pnpm *(локал хөгжүүлэлтэд)* | 9.x+ |

<details>
<summary>Docker суулгах (Ubuntu 22.04)</summary>

```bash
sudo apt update && sudo apt install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# sudo шаардахгүй болгох
sudo usermod -aG docker $USER && newgrp docker
```

</details>

---

### 1-р алхам — Код татах

```bash
git clone <REPOSITORY_URL> lms-platform
cd lms-platform
```

---

### 2-р алхам — Орчны тохируулга (.env)

```bash
cp .env.example .env
```

**Заавал өөрчлөх утгууд:**

```bash
# 1. JWT secret үүсгэх
openssl rand -hex 32   # → JWT_SECRET-д хуулах
openssl rand -hex 32   # → JWT_REFRESH_SECRET-д хуулах (өөр утга!)
```

`.env` файлд дараах мөрүүдийг шинэчилнэ:

```env
# ── Нууц үгнүүд ──────────────────────────────────────────
POSTGRES_PASSWORD=<найдвартай_нууц_үг>

RABBITMQ_DEFAULT_PASS=<найдвартай_нууц_үг>
RABBITMQ_URL=amqp://lms:<дээрхтэй_ижил>@rabbitmq:5672

MINIO_ROOT_PASSWORD=<найдвартай_нууц_үг>
MINIO_SECRET_KEY=<дээрхтэй_ижил>

# ── JWT ──────────────────────────────────────────────────
JWT_SECRET=<openssl гарсан эхний утга>
JWT_REFRESH_SECRET=<openssl гарсан хоёр дахь утга>

# ── Database URL-уудад нууц үгийг тусгах ─────────────────
AUTH_DATABASE_URL=postgresql://lms:<postgres_нууц_үг>@postgres:5432/auth_db
COURSE_DATABASE_URL=postgresql://lms:<postgres_нууц_үг>@postgres:5432/course_db
ENROLLMENT_DATABASE_URL=postgresql://lms:<postgres_нууц_үг>@postgres:5432/enrollment_db
QUIZ_DATABASE_URL=postgresql://lms:<postgres_нууц_үг>@postgres:5432/quiz_db
ASSIGNMENT_DATABASE_URL=postgresql://lms:<postgres_нууц_үг>@postgres:5432/assignment_db
WALLET_DATABASE_URL=postgresql://lms:<postgres_нууц_үг>@postgres:5432/wallet_db
PAYMENT_DATABASE_URL=postgresql://lms:<postgres_нууц_үг>@postgres:5432/payment_db
AI_DATABASE_URL=postgresql://lms:<postgres_нууц_үг>@postgres:5432/ai_db
NOTIFICATION_DATABASE_URL=postgresql://lms:<postgres_нууц_үг>@postgres:5432/notification_db
MEDIA_DATABASE_URL=postgresql://lms:<postgres_нууц_үг>@postgres:5432/media_db
CERTIFICATE_DATABASE_URL=postgresql://lms:<postgres_нууц_үг>@postgres:5432/certificate_db
ANALYTICS_DATABASE_URL=postgresql://lms:<postgres_нууц_үг>@postgres:5432/analytics_db

# ── CORS (production) ─────────────────────────────────────
ALLOWED_ORIGINS=https://yourdomain.com
```

---

### 3-р алхам — Сервисүүд өргөх

```bash
docker compose up -d
```

Дараах дарааллаар эхэлнэ:

```
postgres · redis · rabbitmq · minio · ollama
        ↓  (healthcheck дамжина)
auth · course · enrollment · quiz · assignment
wallet · payment · ai · notification · media · certificate · analytics
        ↓
gateway  →  web  →  nginx
```

Бүх container ready болсон эсэхийг шалгах:

```bash
docker compose ps
```

Бүгд `Up (healthy)` байх ёстой. Хэрэв нэг нь `starting` байвал хүлээгээд дахин шалгана:

```bash
# Тухайн сервисийн яагаад эхлэхгүй байгааг харах
docker compose logs <service-нэр>
```

---

### 4-р алхам — Database Migration

```bash
# Container дотор бүх сервисийн migration ажиллуулах
for svc in auth-service course-service enrollment-service quiz-service \
           assignment-service wallet-service payment-service ai-service \
           notification-service media-service certificate-service analytics-service; do
  echo "→ $svc"
  docker compose exec "$svc" npx prisma migrate deploy 2>/dev/null \
    && echo "  ✓" || echo "  ⚠ алгассан"
done
```

> **Локал хөгжүүлэлтэд** (Node.js суусан бол): `pnpm run migrate`

---

### 5-р алхам — Seed өгөгдөл *(заавал биш)*

Seed script байгаа сервисүүдийг автоматаар ажиллуулна:

```bash
# Локал
pnpm run seed

# Docker дотор (жишээ: auth-service)
docker compose exec auth-service npx ts-node prisma/seed.ts
```

---

### 6-р алхам — Ажиллаж байгаа эсэх шалгах

```bash
# Gateway health
curl http://localhost:3000/api/health

# Frontend
curl -I http://localhost
```

**Нэвтрэх хаягууд:**

| Хаяг | Зориулалт |
|---|---|
| `http://localhost` | Frontend (Next.js via NGINX) |
| `http://localhost:3000/api/docs` | Swagger — Gateway |
| `http://localhost:15672` | RabbitMQ Management UI |
| `http://localhost:9001` | MinIO Console |

---

## Өдөр тутмын үйлдлүүд

### Бүх систем зогсоох / эхлүүлэх

```bash
docker compose down          # зогсоох (өгөгдөл хадгалагдана)
docker compose up -d         # эхлүүлэх
docker compose restart       # дахин эхлүүлэх
```

> ⚠️ `docker compose down -v` нь **volume-г устгана** — өгөгдөл алдагдана.

### Нэг сервисийг rebuild хийх (код өөрчлөгдсөний дараа)

```bash
docker compose up -d --build auth-service
```

### Лог харах

```bash
docker compose logs -f                        # бүх сервис
docker compose logs -f auth-service gateway   # тодорхой сервисүүд
docker compose logs --tail=200 auth-service   # сүүлийн 200 мөр
```

### Сервисийн container дотор орох

```bash
docker compose exec auth-service sh
```

### Migration (шинэ migration нэмсний дараа)

```bash
# Нэг сервисийн migration deploy
docker compose exec course-service npx prisma migrate deploy

# Бүх сервис (дээрх 4-р алхамын loop-г давтах)
```

**Шинэ migration үүсгэх (хөгжүүлэлтэд):**

```bash
cd services/course-service
pnpm exec prisma migrate dev --name <migration_нэр>
# жишээ: --name add_course_tags
```

### Prisma Studio (database GUI)

```bash
cd services/auth-service
DATABASE_URL="postgresql://lms:<нууц_үг>@localhost:5432/auth_db" \
  pnpm exec prisma studio
# → http://localhost:5555
```

### Ollama загвар татах

```bash
docker compose exec ollama ollama pull llama3.2
docker compose exec ollama ollama list   # татагдсан загваруудын жагсаалт
```

---

## Хөгжүүлэлтийн горим

Дэд бүтцийг Docker-оор ажиллуулж, сервисийн кодыг локал Node.js-оор ажиллуулна. Ингэснээр хурдан hot-reload авна.

```bash
# 1. Дэд бүтцийг эхлүүлэх
docker compose up -d postgres redis rabbitmq minio

# 2. Dependency суулгах (нэг удаа)
pnpm install

# 3. Prisma client үүсгэх
pnpm run bootstrap

# 4. Тус сервисийг локал ажиллуулах (тус бүр өөр terminal-д)
cd services/auth-service   && pnpm run start:dev
cd services/course-service && pnpm run start:dev
```

### Хэрэгтэй тушаалууд

```bash
pnpm install                    # бүх workspace dependency суулгах
pnpm -r exec prisma generate    # бүх сервисийн Prisma client үүсгэх
pnpm run build                  # бүх сервис build
pnpm run lint                   # бүх сервис lint
pnpm run test                   # бүх unit тест
```

### Шинэ package нэмэх

```bash
pnpm --filter auth-service add <package>          # нэг сервист
pnpm --filter auth-service add -D <package>       # dev dependency
pnpm -r add <package>                             # бүх сервист
```

---

## Шинэ сервис нэмэх

### 1. Database нэмэх — `infra/postgres/init.sql`

```sql
CREATE DATABASE new_service_db;
GRANT ALL PRIVILEGES ON DATABASE new_service_db TO lms;
```

### 2. `.env.example` болон `.env`-д нэмэх

```env
NEW_SERVICE_PORT=3014
NEW_SERVICE_NODE_ENV=development
NEW_SERVICE_DATABASE_URL=postgresql://lms:<нууц_үг>@postgres:5432/new_service_db
```

### 3. `docker-compose.yml`-д нэмэх

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

### 4. Scripts-д нэмэх

`scripts/migrate.sh`, `scripts/seed.sh`, `scripts/bootstrap.sh` гурвын `SERVICES=( ... )` массивт нэмнэ:

```bash
"services/new-service"
```

### 5. Gateway-д route нэмэх

`gateway/src/proxy/services.config.ts` файлд upstream нэмнэ.

---

## Алдаа засах (Troubleshooting)

| Шинж тэмдэг | Шалгах зүйл | Засах |
|---|---|---|
| Container `unhealthy` | `docker compose logs <svc>` | Алдааны мөрийг харж засна |
| Migration алдаа | `docker compose exec <svc> npx prisma migrate status` | Migration file-г шалгана |
| `ECONNREFUSED postgres` | `docker compose ps postgres` | postgres healthy болтол хүлээнэ |
| RabbitMQ холбогдохгүй | `docker compose logs rabbitmq \| tail -30` | `RABBITMQ_URL` зөв эсэх шалгана |
| Port давхцал | `sudo lsof -i :<port>` | `sudo kill -9 <PID>` |
| Disk дүүрэн | `df -h` | `docker system prune -a` (болгоомжтой!) |

**Migration reset** *(хөгжүүлэлтэд л, production-д хэрэглэхгүй!)*:

```bash
docker compose exec auth-service npx prisma migrate reset
```

---

## Лавлах хүснэгт

### Портуудын жагсаалт

| Сервис | Порт | Swagger |
|---|---|---|
| NGINX (frontend entry) | **80** | — |
| Gateway | 3000 | `/api/docs` |
| Auth | 3001 | `/api/docs` |
| Course | 3003 | `/api/docs` |
| Enrollment | 3004 | `/api/docs` |
| Quiz | 3005 | `/api/docs` |
| Assignment | 3006 | `/api/docs` |
| Wallet | 3007 | `/api/docs` |
| Payment | 3008 | `/api/docs` |
| AI | 3009 | `/api/docs` |
| Notification | 3010 | `/api/docs` |
| Media | 3011 | `/api/docs` |
| Certificate | 3012 | `/api/docs` |
| Analytics | 3013 | `/api/docs` |
| PostgreSQL | 5432 | — |
| Redis | 6379 | — |
| RabbitMQ AMQP | 5672 | — |
| RabbitMQ UI | 15672 | `http://localhost:15672` |
| MinIO API | 9000 | — |
| MinIO Console | 9001 | `http://localhost:9001` |
| Ollama | 11434 | — |

### Хурдан лавлах тушаалууд

```bash
# ── Суулгах ─────────────────────────────────────────
docker compose up -d                          # бүх систем өргөх
docker compose ps                             # байдал шалгах

# ── Migration ───────────────────────────────────────
pnpm run migrate                              # локал (Node.js шаардлагатай)
docker compose exec <svc> npx prisma migrate deploy   # container дотор

# ── Seed ────────────────────────────────────────────
pnpm run seed                                 # бүх сервис

# ── Log ─────────────────────────────────────────────
docker compose logs -f                        # бүх
docker compose logs -f <svc>                  # нэг сервис

# ── Rebuild ─────────────────────────────────────────
docker compose up -d --build <svc>            # нэг сервис

# ── Shell ───────────────────────────────────────────
docker compose exec <svc> sh                  # container дотор орох

# ── Зогсоох ─────────────────────────────────────────
docker compose down                           # зогсоох (өгөгдөл хэвээр)
docker compose down -v                        # зогсоох + volume устгах ⚠️
```
