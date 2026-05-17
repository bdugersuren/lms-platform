# WSL2 + Docker Desktop — Performance Optimization Guide

This guide documents every optimization applied to make the LMS platform
build and run efficiently on Windows 11 + WSL2 + Docker Desktop.

---

## 1. WSL2 Memory Configuration (CRITICAL — do this first)

Create or edit `C:\Users\<YourUser>\.wslconfig`:

```ini
[wsl2]
# Total RAM WSL2 can use. Set to ~50% of your physical RAM.
# If you have 16GB: memory=8GB
# If you have 32GB: memory=16GB
memory=8GB

# CPU cores WSL2 can use. Leave 2-4 cores for Windows.
processors=8

# Swap space. Keep small — swap causes massive perf degradation.
swap=2GB

# Enable Hyper-V firewall (better Docker networking)
nestedVirtualization=true

# Reclaim memory from WSL2 back to Windows after use.
# Prevents WSL2 from holding onto RAM indefinitely.
[experimental]
autoMemoryReclaim=gradual
```

Apply: open PowerShell as admin, run `wsl --shutdown`, then restart Docker Desktop.

---

## 2. Docker Desktop Configuration

Open Docker Desktop → Settings:

### Resources → WSL Integration
- Enable integration with your Ubuntu distro
- Do NOT enable all distros (each consumes RAM)

### Resources → Advanced
- CPUs: 4-8 (depends on your machine)
- Memory: This is now controlled by `.wslconfig` above
- Swap: Controlled by `.wslconfig`

### Features in Development
- Enable: "Use containerd for pulling and storing images" (faster image pulls)
- Enable: "Use Rosetta for x86/amd64 emulation" (macOS only, ignore on Windows)

### General
- Enable: "Use Docker Compose V2" (already default)
- Enable: "Use Buildx as default builder" (enables all BuildKit features)

---

## 3. The Filesystem Rule (Most Impactful Single Change)

**ALWAYS keep project files on the Linux filesystem, never on /mnt/c.**

```
FAST:  /home/bd/lms-platform/   ← Linux ext4 filesystem (WSL2 native)
SLOW:  /mnt/c/Users/bd/lms/     ← Windows NTFS through 9P protocol (10-100x slower)
```

The project is already at `/home/bd/lms-platform/` — this is correct.

Do NOT move it to `/mnt/c/`. Every `pnpm install`, TypeScript compile,
and Prisma generate touches thousands of files. On NTFS via WSL2, this
is 10-100x slower than on ext4.

---

## 4. Docker Build Caching Architecture

### Problem: Every build re-downloads all npm packages

Old Dockerfile pattern:
```dockerfile
RUN pnpm install --no-frozen-lockfile  # downloads 500MB+ every build
```

### Solution: BuildKit cache mounts (already applied)

Every Dockerfile now uses:
```dockerfile
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --no-frozen-lockfile
```

The `--mount=type=cache` instruction tells BuildKit to persist the pnpm
content-addressable store between builds. The store lives in Docker Desktop's
BuildKit cache storage on the host. Packages downloaded once are never
re-downloaded.

**Cache ID `pnpm-store` is shared across ALL service builds**, so when
auth-service and course-service both need `@nestjs/common`, it's downloaded
once and reused everywhere.

### Verify cache is working

```bash
# First build: downloads packages (slow)
DOCKER_BUILDKIT=1 docker compose build auth-service

# Second build: all packages from cache (fast)
DOCKER_BUILDKIT=1 docker compose build auth-service
```

On the second build, the `pnpm install` layer should complete in seconds
instead of minutes.

---

## 5. The Lockfile Problem (Do This!)

`pnpm-lock.yaml` is currently in `.gitignore`. This causes two problems:

1. Every `pnpm install` resolves versions from the registry (network round-trips)
2. `--frozen-lockfile` cannot be used (skips resolution, 2-3x faster)

### Fix

```bash
# Remove pnpm-lock.yaml from .gitignore
sed -i '/pnpm-lock.yaml/d' /home/bd/lms-platform/.gitignore

# Generate lockfile
cd /home/bd/lms-platform
pnpm install

# Commit it
git add pnpm-lock.yaml
git commit -m "chore: commit pnpm lockfile for reproducible builds"
```

### After committing lockfile: switch Dockerfiles to --frozen-lockfile

In every Dockerfile, change:
```dockerfile
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --no-frozen-lockfile
```
To:
```dockerfile
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
```

This makes Docker layer caching even more predictable — the layer only
invalidates when the lockfile changes, not when `package.json` changes.

---

## 6. pnpm deploy — Eliminating Double Install

### Old approach (current runner stage problem)

```dockerfile
# builder stage: pnpm install (full deps)
# runner stage:  pnpm install --prod   ← SECOND full install!
```

### New approach with pnpm deploy

```dockerfile
# builder stage: pnpm install + build
# deploy stage:  pnpm deploy → flat self-contained /deploy folder
# runner stage:  COPY from /deploy — NO pnpm needed at all
```

`pnpm deploy` creates a standalone deployment directory:
- Flat `node_modules/` with only production deps (no symlinks)
- Workspace packages (@lms/shared-*) are bundled in directly
- The result is completely self-contained

**Result:** Runner image has no pnpm, no corepack, no devDeps. Build time
reduced by ~30-60 seconds per service (eliminated the `pnpm install --prod` step).

---

## 7. Docker Layer Cache Strategy

Every Dockerfile follows this layer order (least-changed → most-changed):

```
Layer 1: FROM node:20-alpine + system packages  (cache: permanent)
Layer 2: package.json + pnpm-workspace.yaml      (cache: until deps change)
Layer 3: shared package manifests only           (cache: until shared deps change)
Layer 4: service manifest + prisma schema        (cache: until service deps change)
Layer 5: pnpm install (with cache mount)         (cache: until layer 4 changes)
Layer 6: build shared packages                   (cache: until shared source changes)
Layer 7: prisma generate                         (cache: until schema changes)
Layer 8: service source COPY                     (invalidates on source change)
Layer 9: tsc build                               (always runs if source changed)
```

**Key insight:** Source code (most frequently changed) is copied LAST. This
means changing a single .ts file only invalidates layers 8-9, while all
dependency installation layers stay cached.

---

## 8. TurboRepo — Incremental Builds

TurboRepo is now configured in `turbo.json`. For local development (outside Docker):

```bash
# Install turbo globally
npm install -g turbo

# Build only what changed since last build
turbo run build

# Build a specific service and its dependencies
turbo run build --filter=@lms/auth-service

# Build everything in parallel
turbo run build --parallel
```

Turbo hashes source files and skips rebuilding packages whose inputs haven't
changed. For the shared packages, this means they're only rebuilt when their
`src/` or `tsconfig` files change.

---

## 9. Parallel Docker Builds

Instead of building services sequentially:

```bash
# Build all services in parallel (uses available CPU cores)
DOCKER_BUILDKIT=1 docker compose build --parallel

# Or via the root package.json script
pnpm docker:build
```

Docker Compose V2 with BuildKit builds independent images in parallel.
Services are independent (no shared build context), so all 14 images
can build concurrently limited only by CPU/RAM.

**Warning for WSL2:** Building all services in parallel is CPU-intensive.
If you have < 16GB RAM configured for WSL2, build 4-5 services at a time:

```bash
docker compose build auth-service course-service quiz-service enrollment-service
docker compose build wallet-service payment-service notification-service
docker compose build media-service certificate-service analytics-service
docker compose build gateway web
```

---

## 10. Running Only What You Need (Dev Workflow)

You don't need all services running locally during development.
Start infrastructure + the specific service you're working on:

```bash
# Start only infrastructure
docker compose up -d postgres redis rabbitmq minio

# Start only the services you need
docker compose up -d gateway auth-service course-service web nginx

# Add more as needed
docker compose up -d quiz-service enrollment-service
```

This reduces RAM from ~4GB (all services) to ~1.5GB (infra + 3 services).

---

## 11. Memory Budget

With the `deploy:resources:limits` in docker-compose.yml:

| Service              | Limit  |
|----------------------|--------|
| postgres             | 512M   |
| redis                | 320M   |
| rabbitmq             | 512M   |
| minio                | 256M   |
| nginx                | 64M    |
| gateway              | 256M   |
| web (Next.js)        | 256M   |
| each NestJS service  | 256M   |
| ollama (AI profile)  | 4096M  |

**Core stack (no AI):** ~3.5GB RAM
**Full stack (with AI):** ~7.5GB RAM

Configure WSL2 with at least 8GB (`memory=8GB` in `.wslconfig`).

---

## 12. Windows Terminal / VSCode WSL Tips

### Open project directly in WSL2 (no cross-filesystem I/O)

```bash
# From Windows Terminal
wsl
cd /home/bd/lms-platform
code .  # opens VSCode in WSL2 mode
```

### Check WSL2 memory usage

```bash
# In WSL2 terminal
free -h
cat /proc/meminfo | grep MemAvailable
```

### Monitor Docker resource usage

```bash
# Live stats for all running containers
docker stats
```

### Clear Docker build cache (when things go wrong)

```bash
# Remove only dangling build cache (safe)
docker builder prune

# Remove ALL build cache (nuclear option — next build re-downloads everything)
docker builder prune -a
```

---

## 13. Quick Reference: Build Commands

```bash
# First time setup
bash scripts/bootstrap.sh

# Start infrastructure only (fastest for local dev)
docker compose up -d postgres redis rabbitmq minio

# Build a single service (fast after first build)
DOCKER_BUILDKIT=1 docker compose build auth-service

# Build all services in parallel
pnpm docker:build

# Build with no cache (for debugging)
pnpm docker:build:nocache

# Start everything
docker compose up -d

# Start AI profile too
docker compose --profile ai up -d

# Check health of all services
docker compose ps

# View logs
docker compose logs -f auth-service
```
