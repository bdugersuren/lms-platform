# Scripts — Гарын авлага

`scripts/` хавтас дотор байгаа бүх shell скриптүүдийн дэлгэрэнгүй тайлбар.

---

## Хавтасны бүтэц

```
scripts/
├── instruction.md          ← Энэ файл
│
├── lib/
│   └── common.sh           ← Бүх скриптийн ашигладаг хуваалцсан туслах функцүүд
│
├── dev/                    ← Docker контейнер удирдах скриптүүд
│   ├── start-infra.sh
│   ├── start-core.sh
│   ├── start-full.sh
│   ├── start-ai.sh
│   ├── stop.sh
│   ├── restart.sh
│   ├── logs.sh
│   ├── status.sh
│   └── reset.sh
│
├── db/                     ← Өгөгдлийн сан удирдах скриптүүд
│   ├── migrate.sh
│   ├── seed.sh
│   └── reset.sh
│
├── docs/                   ← Баримт бичиг үүсгэх, шалгах скриптүүд
│   ├── generate.sh
│   └── verify.sh
│
├── verify/                 ← Тусдаа шалгах скриптүүд
│   ├── compose.sh
│   └── services.sh
│
│── bootstrap.sh            ← [Хуучин] Нэг удаагийн суурь тохиргоо
├── migrate.sh              ← [Хуучин] user-service орхигдсон migrate
├── seed.sh                 ← [Хуучин] user-service орхигдсон seed
├── dev.sh                  ← Интерактив локал dev хөөргөгч
├── docker-dev.sh           ← Контейнер дотор nodemon ажиллуулагч
├── docker-migrate.sh       ← Контейнер дотор migrate ажиллуулагч
└── docker-seed.sh          ← Контейнер дотор seed ажиллуулагч
```

---

## Хурдан лавлах

| Зорилго | Команд |
|---------|--------|
| Эхний удаа тохиргоо хийх | `pnpm bootstrap` |
| Зөвхөн дэд бүтэц асаах | `pnpm dev:infra` |
| Үндсэн backend асаах | `pnpm dev:core` |
| Бүх сервисийн migration ажиллуулах | `pnpm db:migrate` |
| Туршилтын өгөгдөл ачаалах | `pnpm db:seed` |
| Логийг дагах | `pnpm dev:logs` |
| Бүх контейнер зогсоох | `pnpm dev:stop` |
| Бүх өгөгдөл устгаж дахин эхлэх | `pnpm db:reset` |

---

## 1. Хуваалцсан туслах санг: `lib/common.sh`

**Шууд ажиллуулдаггүй.** Бусад бүх скриптүүд `source` хийж ашигладаг.

### Агуулга

#### Лог функцүүд

```bash
log_info    "мессеж"   # ▶  цэнхэр текст — ажиллаж байгааг мэдэгдэнэ
log_success "мессеж"   # ✓  ногоон текст — амжилттай дууссаныг мэдэгдэнэ
log_warn    "мессеж"   # ⚠  шар текст    — анхааруулга
log_error   "мессеж"   # ✗  улаан текст  — алдаа (stderr-рүү)
log_step    "мессеж"   # ══ тод цэнхэр   — том хэсгийн гарчиг
```

#### `require_docker`
Docker daemon ажиллаж байгаа эсэхийг шалгана. Ажиллаагүй бол скрипт зогсоно.

#### `load_env`
`.env` файлыг уншина. WSL2 дээр Windows git-ийн `\r\n` мөрийн төгсгөлийг автоматаар цэвэрлэнэ (`tr -d '\r'`). `ROOT_DIR` хувьсагч тохируулагдсан байх ёстой.

#### `find_node`
`NODE_BIN` хувьсагчид Node.js-ийн замыг олж тохируулна. Хайлтын дараалал:
1. `PATH` дотрох `node`
2. NVM (`~/.nvm/nvm.sh`)
3. VSCode Server (`~/.vscode-server/bin/*/node`) — WSL2 remote
4. VSCode Remote Containers

#### `confirm_destructive "мессеж"`
Хэрэглэгчээс `yes` гэж бичихийг шаардана. Бусад хариулт өгвөл скрипт аюулгүй зогсоно. Устгах үйлдлийн өмнө заавал дуудна.

#### `compose_up` / `compose_down`
Docker Compose-ийн товчилсон командууд. `compose_down` нь `--profile core/learn/finance/ops/frontend/ai` бүгдийг оруулж зогсооно.

---

## 2. Дэд бүтэц болон Docker скриптүүд (`dev/`)

### `dev/start-infra.sh` — Дэд бүтэц асаах

```bash
pnpm dev:infra
```

**Юу хийдэг вэ:**
Docker Compose-ийн профилгүй (default) сервисүүдийг асаана: **postgres**, **redis**, **rabbitmq**, **minio**.

**Хэзээ ажиллуулах вэ:**
- Өдөр тутмын ажлын эхэнд, backend-ийг ажиллуулахаас өмнө
- Зөвхөн дэд бүтэц хэрэгтэй үед (e.g. migrate, seed ажиллуулахын өмнө)

**Ажиллуулсны дараах URL:**
- RabbitMQ менежмент: `http://localhost:15672`
- MinIO консол: `http://localhost:9001`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

**Шаардлага:** Docker ажиллаж байх ёстой

---

### `dev/start-core.sh` — Үндсэн backend асаах

```bash
pnpm dev:core
```

**Юу хийдэг вэ:**
`--profile core` сервисүүдийг асаана: дэд бүтэц + **nginx**, **gateway**, **auth-service**, **user-service**, **course-service**, **enrollment-service**.

**Хэзээ ажиллуулах вэ:**
- Өдөр тутмын хөгжүүлэлтийн үед (хамгийн их хэрэглэгддэг команд)
- Auth, JWT, профайл, курс, бүртгэлийн API тест хийх үед

**Системийн хэрэглээ:** ~1.5 GB RAM

**Ажиллуулсны дараах URL:**
- API gateway: `http://localhost:3000/api`
- Auth Swagger: `http://localhost:3001/api/docs`
- User Swagger: `http://localhost:3014/api/docs`

---

### `dev/start-full.sh` — Бүх домэйн сервис асаах

```bash
pnpm dev:full
```

**Юу хийдэг вэ:**
`core` + `learn` + `finance` + `ops` профилийн сервисүүдийг нэгэн зэрэг асаана. AI/Ollama орохгүй.

**Хэзээ ажиллуулах вэ:**
- Quiz, assignment, wallet, payment, notification, media, certificate, analytics-г нэгэн зэрэг тест хийх үед
- End-to-end тест ажиллуулах үед

**Системийн хэрэглээ:** ~3.7 GB RAM — санах ойг урьдчилан шалгана уу

---

### `dev/start-ai.sh` — AI стек асаах

```bash
pnpm dev:ai-stack
```

**Юу хийдэг вэ:**
`core` + `ai` профилийн сервисүүдийг асаана: **ollama** + **ai-service**.

**Хэзээ ажиллуулах вэ:**
- AI туторын endpoint, эссэ үнэлгээ, зөвлөмж тест хийх үед
- Ollama загвар турших үед

**Системийн хэрэглээ:** ~8.5 GB RAM (загвар ачаалагдсан үед)

**Загвар татах:**
```bash
docker exec lms-ollama ollama pull llama3.2
```

---

### `dev/stop.sh` — Бүх контейнер зогсоох

```bash
pnpm dev:stop
```

**Юу хийдэг вэ:**
Бүх профилийн контейнеруудыг зогсооно. **Volume-ууд болон өгөгдөл хадгалагдана.**

**Хэзээ ажиллуулах вэ:**
- Ажлаа дуусгах үед
- RAM чөлөөлөх хэрэгтэй үед
- Тохиргоо өөрчлөхийн өмнө

> `dev:reset`-аас ялгаатай нь volume устгахгүй тул өгөгдөл хадгалагдана.

---

### `dev/restart.sh` — Ухаалаг дахин эхлүүлэгч

```bash
pnpm dev:restart                  # бүгдийг зогсоож core асаана
pnpm dev:restart learn            # бүгдийг зогсоож core+learn асаана
pnpm dev:restart auth-service     # зөвхөн нэг контейнер дахин эхлүүлнэ
```

**Аргументууд:**
| Аргумент | Үйлдэл |
|----------|--------|
| *(хоосон)* эсвэл `core` | Бүгдийг зогсоож core профил асаана |
| `learn` | Бүгдийг зогсоож core+learn асаана |
| `finance` | Бүгдийг зогсоож core+finance асаана |
| `ops` | Бүгдийг зогсоож core+ops асаана |
| `ai` | Бүгдийг зогсоож core+ai асаана |
| `<сервисийн нэр>` | Зөвхөн тэр контейнерийг `docker compose restart` хийнэ |

**Хэзээ ажиллуулах вэ:**
- Нэг сервис тогтворгүй болсон үед
- Тохиргоо өөрчилсний дараа

---

### `dev/logs.sh` — Логийг дагах

```bash
pnpm dev:logs                    # бүх ажиллаж байгаа контейнерийн лог
pnpm dev:logs auth-service       # зөвхөн auth-service
bash scripts/dev/logs.sh auth-service user-service   # хэд хэдэн сервис
```

**Хэзээ ажиллуулах вэ:**
- Алдаа дибаг хийх үед
- RabbitMQ event дамжилтыг шалгах үед
- `Ctrl+C` дарж зогсооно

---

### `dev/status.sh` — Контейнерийн төлөв

```bash
pnpm dev:status           # контейнеруудын жагсаалт, төлөв
pnpm dev:status --stats   # + CPU/RAM хэрэглээ (нэг удаагийн snapshot)
```

**Хэзээ ажиллуулах вэ:**
- Ямар контейнер ажиллаж байгааг шалгах үед
- Аль контейнер санах ой хэт их хэрэглэж байгааг олох үед

---

### `dev/reset.sh` — ⚠ БҮГДИЙГ УСТГАХ (контейнер + volume)

```bash
pnpm dev:reset
```

**Юу хийдэг вэ:**
1. `yes` гэж бичихийг шаардана
2. Бүх контейнер болон **volume-уудыг устгана** — **бүх өгөгдөл алдагдана**
3. Дэд бүтцийн контейнеруудыг дахин асаана

**Хэзээ ажиллуулах вэ:**
- Postgres volume гэмтсэн, эсвэл migration-д орохгүй байгаа тохиолдолд
- Бүрэн цэвэр орчин хэрэгтэй үед

**Дараа нь заавал ажиллуулах:**
```bash
pnpm db:migrate
pnpm db:seed
```

---

## 3. Өгөгдлийн сангийн скриптүүд (`db/`)

### `db/migrate.sh` — Prisma migration ажиллуулах ✅ Зөвлөмжтэй

```bash
pnpm db:migrate
```

**Юу хийдэг вэ:**
13 сервис бүрийн хувьд `prisma migrate deploy` ажиллуулна. DATABASE_URL-г хэсэг бүрийн өгөгдлийн сангийн нэрийг оруулан бие даан тохируулна.

**Дэмжигдэх сервисүүд (13):**
auth, user, course, enrollment, quiz, assignment, wallet, payment, ai, notification, media, certificate, analytics

**Хуучин `migrate.sh`-аас юугаараа ялгаатай вэ:**

| | Хуучин `migrate.sh` | Шинэ `db/migrate.sh` |
|-|---------------------|----------------------|
| user-service | ❌ орхигдсон | ✅ орсон |
| DATABASE_URL | ❌ буруу (prefix-тэй хувьсагч) | ✅ зөв (шинээр байгуулна) |
| Алдаа мэдэгдэл | Нэг алдаанд зогсоно | Бүгдийг ажиллуулж, эцэст нь тайлагдана |

**Хэзээ ажиллуулах вэ:**
- `pnpm dev:infra` дараа, анх тохиргоо хийхдээ
- Шинэ migration нэмсний дараа
- `db:reset` хийсний дараа (автоматаар дуудагдана)

**Шаардлага:** Postgres container ажиллаж байх ёстой

---

### `db/seed.sh` — Туршилтын өгөгдөл ачаалах ✅ Зөвлөмжтэй

```bash
pnpm db:seed
```

**Юу хийдэг вэ:**
`prisma/seed.ts` файл байгаа сервис бүрийн хувьд тэр файлыг `ts-node`-оор ажиллуулна. Seed файлгүй сервисүүдийг чимээгүй алгасана.

**Хуучин `seed.sh`-аас юугаараа ялгаатай вэ:**

| | Хуучин `seed.sh` | Шинэ `db/seed.sh` |
|-|------------------|-------------------|
| user-service | ❌ орхигдсон | ✅ орсон |
| `prisma db push` | ✅ (migration-тай хамт) | ❌ хасагдсан (тусдаа ажиллуулна) |

> **Дараалал чухал:** `db:seed`-ийн өмнө `db:migrate` заавал ажиллуулсан байх ёстой.

**Хэзээ ажиллуулах вэ:**
- Migration дуусгасны дараа
- Өгөгдлийн сан цэвэрлэгдсэний дараа

**Суулгагдах туршилтын өгөгдлүүд:**
`config/services.yml` файлын `seed_credentials` хэсгийг үзнэ үү.

---

### `db/reset.sh` — ⚠ БҮХ ӨГӨГДЛИЙН САНГ УСТГАХ

```bash
pnpm db:reset
```

**Юу хийдэг вэ:**
1. `yes` гэж бичихийг шаардана
2. 13 өгөгдлийн сан бүрийг `DROP DATABASE → CREATE DATABASE` хийнэ
3. `db/migrate.sh` дуудна
4. `db/seed.sh` дуудна

**Онцлог:** `psql`-г host дээр суулгасан байх шаардлагагүй — `docker compose exec -T postgres psql`-г ашиглана.

**Хэзээ ажиллуулах вэ:**
- Migration conflict үүссэн, засах боломжгүй болсон үед
- Schema-г бүрэн дахин эхлүүлэх хэрэгтэй үед
- `dev:reset`-ийн дараа (контейнер дахин асасны дараа)

**Шаардлага:** `lms-postgres` контейнер ажиллаж байх ёстой

---

## 4. Баримт бичгийн скриптүүд (`docs/`)

### `docs/generate.sh` — Бүх баримт бичиг үүсгэх

```bash
pnpm docs:all
```

**Дуудах дараалал:**

| Дуудагдах скрипт | Үүсгэх файл |
|------------------|-------------|
| `generate-docs.js` | `docs/generated/current-architecture.md` |
| `generate-compose-docs.js` | `docs/generated/docker-architecture.md` |
| `generate-openapi.js` | `docs/api/openapi.json` |
| `generate-api-markdown.js` | `docs/api/reference.md` |

**Хэзээ ажиллуулах вэ:**
- `config/services.yml` өөрчилсний дараа
- `docker-compose.yml`-д шинэ сервис нэмсний дараа
- Pull request нийтлэхийн өмнө

---

### `docs/verify.sh` — Баримт бичиг зөв байгааг шалгах

```bash
pnpm docs:check
```

**Ажиллуулах шалгалтууд:**

| Шалгалт | Юу шалгадаг вэ |
|---------|----------------|
| `verify-services.js` | `config/services.yml` нь `docker-compose.yml`-тэй таарч байна уу |
| `verify-compose.js` | `docker-compose.yml`-ийн бүтэц зөв эсэх |
| `verify-docs.js` | Үүсгэгдсэн баримт бичиг хуучрсан эсэх |

Нэг шалгалт амжилтгүй болсон ч бусад нь үргэлжлэн ажиллана. Эцэст нь нийт амжилтгүй тоог харуулна.

**Хэзээ ажиллуулах вэ:**
- Pull request-ийн CI шалгалтаар
- Шинэ сервис нэмсний дараа
- `docs:all` ажиллуулсны дараа шалгахад

---

## 5. Шалгах скриптүүд (`verify/`)

### `verify/services.sh`

```bash
pnpm verify:services
```

`config/services.yml` дахь сервисүүд нь `docker-compose.yml`-тэй таарч байгааг шалгана. Зөрүүтэй байвал алдааны код буцаана.

### `verify/compose.sh`

```bash
pnpm verify:compose
```

`docker-compose.yml`-ийн YAML бүтэц, шаардлагатай талбарууд зөв байгааг шалгана.

---

## 6. Хуучин скриптүүд (root level)

Эдгээрийг **устгасангүй** — буцах нийцтэй байдлыг хадгалах зорилготой. Гэхдээ **шинэ скриптүүдийг** ашиглахыг зөвлөнө.

---

### `bootstrap.sh` — Нэг удаагийн суурь тохиргоо

```bash
pnpm bootstrap
```

**Юу хийдэг вэ:**
1. pnpm суулгалтыг шалгана
2. `pnpm install` — бүх workspace-ийн dependency суулгана
3. Prisma client үүсгэнэ (auth, course, enrollment болон бусад)
4. Хуваалцсан package-уудыг build хийнэ

**Хэзээ ажиллуулах вэ:**
- Repository-г анх clone хийсний дараа (нэг удаа)
- Шинэ сервис нэмсний дараа
- `node_modules` бүрэн устгасны дараа

> ⚠ `bootstrap.sh` дахь Prisma client үүсгэлтэнд **user-service орхигдсон** байгааг анхаарна уу. Засах шаардлагатай.

---

### `migrate.sh` — Хуучин migration скрипт

```bash
pnpm migrate
# эсвэл
bash scripts/migrate.sh
```

**Мэдэгдэж байгаа дутагдлууд:**
- ❌ `user-service` орхигдсон
- ❌ Prisma-д `DATABASE_URL` буруу тохируулагдана (prefix-тэй хувьсагч ашиглана)

**Оронд нь ашиглана уу:** `pnpm db:migrate`

---

### `seed.sh` — Хуучин seed скрипт

```bash
pnpm seed
# эсвэл
bash scripts/seed.sh
```

**Мэдэгдэж байгаа дутагдлууд:**
- ❌ `user-service` орхигдсон
- `prisma db push`-г migration-тай хамт ажиллуулдаг (тусгаарлагдаагүй)

**Оронд нь ашиглана уу:** `pnpm db:seed`

---

### `dev.sh` — Интерактив локал dev хөөргөгч

```bash
bash scripts/dev.sh             # дугаараар сервис сонгох цэс харуулна
bash scripts/dev.sh --infra-only   # зөвхөн дэд бүтэц асааж гарна
bash scripts/dev.sh --all          # бүх сервисийг nodemon-оор асаана
```

**Юу хийдэг вэ:**
Docker-д зөвхөн дэд бүтцийг асааж, backend сервисүүдийг **host дээр nodemon-оор** ажиллуулна (контейнер ашиглахгүй).

**Хэзээ ашиглах вэ:**
- Нэг сервисийг зөвхөн host дээр хурдан hot-reload хийж хөгжүүлэхэд
- Зэрэг хэд хэдэн сервисийг интерактив сонголтоор ажиллуулахад

> **Анхаарна уу:** user-service энэ скриптийн жагсаалтад ороогүй байна.

---

### `docker-dev.sh` — Контейнер доторх nodemon

```bash
# Шууд дуудахгүй — docker-compose.override.yml-аас дуудагдана
```

**Юу хийдэг вэ:**
NestJS сервисийн src/ болон packages/ хавтсуудыг `nodemon`-оор ажиглаж, `ts-node --transpile-only`-оор дахин эхлүүлнэ. Контейнер дотор hot-reload хийхэд зориулагдсан.

---

### `docker-migrate.sh` — Контейнер дотор migration

```bash
bash scripts/docker-migrate.sh
```

**Юу хийдэг вэ:**
Ажиллаж байгаа сервисийн контейнер дотор `npx prisma migrate deploy` ажиллуулна.

**Хэзээ ашиглах вэ:**
- Сервисийн контейнер ажиллаж байгаа, host дээр pnpm/prisma байхгүй үед
- `docker-migrate.sh` нь `docker-seed.sh`-ийн `fallback` болдог

> ⚠ Мөн user-service орхигдсон байна. **Оронд нь:** `pnpm db:migrate`

---

### `docker-seed.sh` — Контейнер дотор seed

```bash
bash scripts/docker-seed.sh
```

**Юу хийдэг вэ:**
- Сервисийн контейнер ажиллаж байвал: `docker compose exec` ашиглана
- Контейнер ажиллахгүй байвал: `docker compose run --rm` ашиглана
- Postgres холболтыг `pg_isready`-аар урьдчилан шалгана

**Хэзээ ашиглах вэ:**
- CI/CD pipeline дотор (host дээр pnpm байхгүй)
- `seed.sh`-ийн автомат fallback болдог

> ⚠ Мөн user-service орхигдсон байна. **Оронд нь:** `pnpm db:seed`

---

## 7. Ердийн ажлын урсгал

### Эхний удаагийн тохиргоо (шинэ clone)

```bash
cp .env.example .env           # .env тохируулна
pnpm bootstrap                 # dependency суулгах, Prisma client үүсгэх
pnpm dev:infra                 # postgres, redis, rabbitmq, minio асаана
# 15 секунд хүлээнэ (postgres initialize хийж дуусахыг)
pnpm db:migrate                # бүх schema үүсгэнэ
pnpm db:seed                   # туршилтын өгөгдөл ачаална
pnpm dev:core                  # backend сервисүүд асаана
```

### Өдөр тутмын ажил

```bash
pnpm dev:core                  # ажлын эхэнд
pnpm dev:logs auth-service     # шаардлагатай үед лог харах
pnpm dev:stop                  # ажлын эцэст
```

### Нэг сервис дибаг хийх

```bash
pnpm dev:core                  # бусдыг контейнерт ажиллуул
pnpm dev:auth                  # auth-service-г host дээр nodemon-оор ажиллуул
pnpm dev:logs auth-service     # лог дагах
```

### Шинэ migration нэмсний дараа

```bash
# Сервисийн хавтсаас migration үүсгэнэ:
cd services/auth-service
pnpm exec prisma migrate dev --name "нэмсэн_зүйл"

# Root-аас migration deploy хийнэ:
cd ../..
pnpm db:migrate
```

### Бүх зүйлийг дахин эхлүүлэх

```bash
pnpm db:reset     # өгөгдлийн сан устгаж, migrate + seed хийнэ
pnpm dev:core
```

---

## 8. Шинэ сервис нэмэх checklist

Шинэ сервис нэмэхэд дараах файлуудад нэмэлт хийх шаардлагатай:

- [ ] `scripts/db/migrate.sh` — SERVICES массивт нэмэх
- [ ] `scripts/db/seed.sh` — SERVICES массивт нэмэх
- [ ] `scripts/db/reset.sh` — DATABASES массивт нэмэх
- [ ] `scripts/bootstrap.sh` — Prisma client генерацийн жагсаалтад нэмэх
- [ ] `docker-compose.yml` — Шинэ сервисийн блок нэмэх
- [ ] `config/services.yml` — Metadata бичих
- [ ] `.env` / `.env.example` — PORT, DATABASE_URL нэмэх
- [ ] `infra/postgres/init.sql` — Шинэ DB нэмэх
- [ ] `pnpm docs:all && pnpm docs:check` ажиллуулах
