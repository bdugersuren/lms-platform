Read CLAUDE.md and follow all architecture and engineering rules strictly.

Generate the initial backend foundation for this LMS platform.

Tasks:

1. Generate root monorepo structure
2. Generate docker-compose.yml
3. Generate gateway service
4. Generate auth-service
5. Generate shared packages:
   - shared-types
   - shared-utils
   - shared-auth
   - shared-config
6. Configure RabbitMQ integration
7. Configure PostgreSQL integration
8. Configure Prisma
9. Configure Redis
10. Configure Swagger
11. Configure health checks
12. Configure structured logging
13. Configure centralized exception handling

Requirements:
- Use NestJS
- Use TypeScript only
- Use Prisma ORM
- Use Docker Compose
- Use clean architecture
- Use modular architecture
- Use production-ready patterns

IMPORTANT:
- Do not simplify architecture
- Do not generate pseudo code
- Do not generate fake implementations
- Keep services isolated
- Keep architecture Kubernetes-ready
- Follow CLAUDE.md strictly

Generate code incrementally and explain generated structure briefly.





---





# LMS Platform — Видео/PDF Татаж Авахаас Хамгаалах Төлөвлөгөө

> Энэ төлөвлөгөө нь доорх анхдагч суурь төлөвлөгөөнөөс тусдаа шинэ даалгавар юм.

---

## Контекст

Одоогийн байдлаар MinIO bucket нь PUBLIC READ policy-тэй тул курс дотор байрлах видео болон PDF файлуудын URL-г мэдэж байгаа хэн ч шууд татаж авах боломжтой. Суралцагч хичээлийг Chrome DevTools → Network tab-аар харж, файлын URL-ийг олж татаж авна. Зорилго: **энгийн татаж авалтаас хамгаалах** (URL хуваалцах, DevTools-аар татах, right-click save).

---

## Хэрэгжүүлэх Арга

**Private bucket + Gateway presigned URL endpoint + Frontend hardening**

MinIO bucket-ийг private болгож, бүх зөвшөөрөгдсөн хэрэглэгч (студент, багш) 2 цагийн хугацаатай presigned URL авна. Frontend видео болон PDF-ийн download товчлуурыг нуун, right-click-ийг хаана.

---

## Өөрчлөх Файлууд

### 1. `gateway/src/media/media.service.ts` — ЗАСАХ

**1a. Bucket public policy-г устгах** — `onModuleInit` дахь `setBucketPolicy` дуудлагыг хасах. Bucket үүсгэхийг хэвээр үлдээх, зөвхөн policy тогтоохгүй болгох → bucket private болно.

**1b. `presign(key: string): Promise<string>` метод нэмэх** — `this.client.presignedGetObject(BUCKET, key, 7200)` дуудаж 2 цагийн хугацаатай URL буцаана.

**1c. `parseKeyFromUrl(rawUrl: string): string` private метод нэмэх:**
- `http://localhost:9000/lms-media/videos/abc.mp4` → `videos/abc.mp4` (host + bucket prefix хасах)
- `videos/abc.mp4` → `videos/abc.mp4` (хэвээр буцаах)
- Мэдэгдэхгүй format → `BadRequestException` шидэх
- `this.publicUrl` (constructor-т аль хэдийн хадгалагдсан) ашиглан strip хийх

---

### 2. `gateway/src/media/media.controller.ts` — ЗАСАХ

**Шинэ endpoint нэмэх:**
```
GET /api/media/presign?src=<encoded-url-or-key>
@UseGuards(JwtAuthGuard)   ← RolesGuard байхгүй — студент ч дуудаж чадна
```
- `src` хоосон бол `BadRequestException`
- `parseKeyFromUrl(src)` → key олох
- `presign(key)` → presigned URL авах
- `expiresAt = new Date(Date.now() + 7200 * 1000).toISOString()`
- `ApiResponseBuilder.success({ presignedUrl, expiresAt }, ...)` буцаах

Нэмэлт import: `Get`, `Query` from `@nestjs/common`

---

### 3. `web/src/hooks/use-media-url.ts` — ШИНЭ ФАЙЛ

```ts
export function useMediaUrl(rawUrl: string | null | undefined): 
  { mediaUrl: string | null; loading: boolean; error: string | null }
```

**Логик:**
- `rawUrl` хоосон → `{ mediaUrl: null, loading: false, error: null }` шууд буцаах
- YouTube / Vimeo URL → `{ mediaUrl: rawUrl, loading: false }` шууд буцаах (presign хийхгүй)
- MinIO URL (бусад) → `GET /media/presign?src=...` дуудах; `api` instance ашиглах (`@/lib/api`) — auth header автоматаар орно

**Чухал дэлгэрэнгүй:**
- `useEffect([rawUrl])` → URL өөрчлөгдсөн үед л нэг удаа дуудна, re-render бүрт биш
- `cancelled` flag ашиглах (unmount-д state тохируулахаас зайлсхийх)

---

### 4. `web/src/components/lesson-viewer/video-player.tsx` — ЗАСАХ

- `useMediaUrl(source.type === 'native' ? url : null)` дуудах
- `mediaLoading` true үед spinner харуулах
- `<video>` дээр: `src={mediaUrl ?? ''}`, `controlsList="nodownload disablePictureInPicture"` нэмэх
- Видео container div дээр `onContextMenu={(e) => e.preventDefault()}` нэмэх
- Error state дахь `<a href={url}>Шууд нээх ↗</a>` холбоосыг **устгах** → мессежээр солих
- YouTube/Vimeo iframe хэсэг огт өөрчлөхгүй

---

### 5. `web/src/components/lesson-viewer/pdf-viewer.tsx` — ЗАСАХ

- `useMediaUrl(url)` дуудах
- `mediaLoading` үед spinner харуулах
- `<object data={mediaUrl ?? ''}>` болгох
- `onContextMenu={(e) => e.preventDefault()}` wrapper div дээр нэмэх
- Fallback `<a href={url}>PDF нээх ↗</a>` **устгах** → мессежээр солих

---

## Deployment Дараалал (ЧУХАЛ — буруу дараалал бол бүх хичээл нэн даруй ажиллахаа болино)

```
Алхам 1 → docker compose build gateway && docker compose up -d --no-deps gateway
           (presign endpoint амьд болно; bucket ахлаа public — аюулгүй)

Алхам 2 → docker compose build web && docker compose up -d --no-deps web
           (frontend presigned URL ашиглана; bucket ахлаа public)

Алхам 3 → Smoke test: V1–V3 шалгах

Алхам 4 → Bucket-ийг PRIVATE болгох (нэг удаагийн manual үйлдэл)
           MinIO console: http://localhost:9001 → lms-media → Access Policy → private
           Эсвэл CLI:
           docker run --rm --network lms-net minio/mc:latest \
             sh -c "mc alias set l http://minio:9000 minioadmin minioadmin \
                    && mc anonymous set none l/lms-media"
```

---

## Шалгах Тест

| # | Шалгах зүйл | Хүлээгдэх үр дүн |
|---|-------------|-----------------|
| V1 | `GET /api/media/presign?src=<MinIO-URL>` + Bearer token | 200, `presignedUrl` `?X-Amz-` агуулсан |
| V2 | Token-гүй `GET /api/media/presign` | 401 |
| V3 | YouTube URL-тэй хичээл нээх | Network tab-д presign дуудлага харагдахгүй, iframe шууд ачаалагдана |
| V4 | Native видео дээр right-click | Context menu гарахгүй |
| V5 | PDF хэсэг дээр right-click | Context menu гарахгүй |
| V6 | Алхам 4-ийн дараа MinIO URL шууд хөтчид нээх | 403 Access Denied |
| V7 | Хуучин full-URL-тэй хичээл нээх | `parseKeyFromUrl` key олж, presign ажилла → хичээл нормал нээгдэнэ |
| V8 | Хичээл хуудас 2 удаа render | Network tab-д presign **нэг л удаа** дуудагдана |

---

## Техникийн тэмдэглэл

- **`controlsList` browser support**: Chrome/Edge дэмждэг, Firefox/Safari үл тоомсорлоно. `onContextMenu` prevention-тэй хослуулснаар энгийн татаж авалтыг хаана.
- **JWT 15мин expiry vs presigned 2h expiry**: Студент 15 минутаас дээш байвал JWT дуусч 401 → auto-logout болно. Acceptable tradeoff — DRM биш энгийн хамгаалалт.
- **Database migration шаардлагагүй**: `parseKeyFromUrl` нь DB-д хадгалагдсан full URL-ийг key болгон хөрвүүлнэ.

---