#!/usr/bin/env node

/**
 * Purpose:
 * Generate docs/generated/docker-architecture.md from docker-compose.yml.
 *
 * Why a separate script from generate-docs.js:
 * - This doc covers compose-specific conventions (anchors, memory tiers, bindings).
 * - generate-docs.js covers the service registry and topology.
 * - Keeping them separate makes each script easier to reason about.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const YAML = require('yaml');
const { parseComposeFile } = require('./lib/compose-parser');

const ROOT              = path.resolve(__dirname, '..');
const COMPOSE_PATH      = path.join(ROOT, 'docker-compose.yml');
const SERVICES_CFG_PATH = path.join(ROOT, 'config', 'services.yml');
const OUTPUT_DIR        = path.join(ROOT, 'docs', 'generated');
const OUTPUT_PATH       = path.join(OUTPUT_DIR, 'docker-architecture.md');

// ── Helpers ───────────────────────────────────────────────────────────────────

function cell(v) {
  if (v === undefined || v === null || v === '') return '—';
  return String(v).replace(/\|/g, '\\|');
}

function mdTable(columns, rows) {
  const header = '| ' + columns.map(c => cell(c.label)).join(' | ') + ' |';
  const sep    = '| ' + columns.map(() => '---').join(' | ') + ' |';
  const body   = rows.map(r => '| ' + columns.map(c => cell(r[c.key])).join(' | ') + ' |');
  return [header, sep, ...body].join('\n');
}

// ── Data extraction ───────────────────────────────────────────────────────────

/**
 * Parse the raw compose YAML for fields the compose-parser doesn't extract
 * (healthcheck, deploy.resources.limits.memory, restart).
 * We parse with merge:true so anchors are already resolved.
 */
function loadRaw() {
  return YAML.parse(fs.readFileSync(COMPOSE_PATH, 'utf8'), { merge: true });
}

function loadServicesConfig() {
  return YAML.parse(fs.readFileSync(SERVICES_CFG_PATH, 'utf8'));
}

function memoryOf(rawService) {
  try { return rawService.deploy.resources.limits.memory; } catch { return null; }
}

function healthcheckOf(rawService) {
  return rawService.healthcheck || null;
}

// ── Section builders ──────────────────────────────────────────────────────────

function buildProfilesSection(composeData, servicesConfig) {
  const profileDescs = (servicesConfig.docker_compose_profiles) || {};

  const rows = Object.entries(composeData.profiles).map(([name, list]) => ({
    name,
    count:       String(list.length),
    description: profileDescs[name] ? profileDescs[name].description : 'Defined by compose',
    services:    list.join(', '),
  }));

  const profileTable = mdTable(
    [
      { label: 'Profile',      key: 'name' },
      { label: '# Services',  key: 'count' },
      { label: 'Description', key: 'description' },
      { label: 'Service list', key: 'services' },
    ],
    rows,
  );

  return [
    '## Compose Profiles',
    '',
    'Profiles allow progressive startup — only start what you need.',
    '',
    profileTable,
    '',
    '### Quick-start commands',
    '',
    '```bash',
    '# Infrastructure only — postgres, redis, rabbitmq, minio  (~1.2 GB)',
    'docker compose up -d',
    '',
    '# Core backend — adds nginx, gateway, auth, course, enrollment  (~2.0 GB)',
    'docker compose --profile core up -d',
    '',
    '# Full backend — adds quiz, assignment, wallet, payment, notification, media, certificate, analytics  (~3.7 GB)',
    'docker compose --profile core --profile learn --profile finance --profile ops up -d',
    '',
    '# Full stack — adds web frontend  (~4.0 GB)',
    'docker compose --profile core --profile learn --profile finance --profile ops --profile frontend up -d',
    '',
    '# Add AI inference to any of the above  (~+4.5 GB)',
    'docker compose --profile core --profile ai up -d',
    '```',
  ].join('\n');
}

function buildAnchorsSection() {
  const anchorTable = mdTable(
    [
      { label: 'Anchor',         key: 'anchor' },
      { label: 'Expands to',     key: 'expands' },
      { label: 'Used by',        key: 'usedBy' },
    ],
    [
      { anchor: '*restart',            expands: 'restart: unless-stopped',                           usedBy: 'All services via *nestjs-common' },
      { anchor: '*networks',           expands: 'networks: [lms-net]',                               usedBy: 'All services via *nestjs-common' },
      { anchor: '*nestjs-build',       expands: 'build.context + build.target: runner',              usedBy: 'All built NestJS services' },
      { anchor: '*nestjs-healthcheck', expands: 'interval: 30s / timeout: 10s / 3 retries / 40s start', usedBy: 'All NestJS services' },
      { anchor: '*nestjs-resources',   expands: 'deploy.resources.limits.memory: 192M',             usedBy: 'Standard NestJS services via *nestjs-common' },
      { anchor: '*nestjs-common',      expands: 'restart + networks + nestjs-resources + env_file', usedBy: 'All standard NestJS services' },
      { anchor: '*nestjs-env',         expands: 'NODE_OPTIONS, NODE_ENV',                           usedBy: 'Every NestJS environment block' },
      { anchor: '*minio-env',          expands: '6 shared MinIO connection vars (endpoint, port, ssl, keys, public URL)', usedBy: 'media-service, certificate-service' },
      { anchor: '*heavy-common',       expands: 'restart + networks + env_file + 320M',             usedBy: 'media-service' },
      { anchor: '*infra-depends',      expands: 'postgres + redis + rabbitmq all service_healthy',  usedBy: 'All domain NestJS services' },
    ],
  );

  return [
    '## YAML Anchors Reference',
    '',
    'Anchors are defined at the top of `docker-compose.yml` using the `x-*` extension key convention.',
    'The YAML parser expands them inline before Docker Compose processes the file.',
    '',
    '> **Why a single compose file?**',
    '> YAML anchors cannot cross file boundaries. An anchor defined in `docker-compose.infra.yml`',
    '> cannot be referenced in `docker-compose.core.yml`. Splitting into per-profile files would',
    '> require duplicating every anchor in every file — which is worse than a single 600-line file.',
    '> The profile system already gives you selective startup without file splitting.',
    '',
    anchorTable,
  ].join('\n');
}

function buildMemorySection(composeData, rawCompose) {
  const TIERS = [
    { label: 'AI inference',       memory: '4096M', services: 'ollama' },
    { label: 'AI service',         memory: '384M',  services: 'ai-service' },
    { label: 'Heavy (file I/O)',   memory: '320M',  services: 'media-service' },
    { label: 'Infrastructure',     memory: '256–384M', services: 'postgres (384M), redis (256M), rabbitmq (384M)' },
    { label: 'Web frontend',       memory: '256M',  services: 'web' },
    { label: 'Standard NestJS',    memory: '192M',  services: 'all other domain services' },
    { label: 'nginx',              memory: '64M',   services: 'nginx' },
  ];

  const perServiceRows = composeData.services
    .map(svc => ({ name: svc.name, profile: svc.profiles.join(', ') || 'default', memory: memoryOf(rawCompose.services[svc.name] || {}) }))
    .filter(r => r.memory)
    .sort((a, b) => (parseInt(b.memory) || 0) - (parseInt(a.memory) || 0));

  return [
    '## Memory Tiers',
    '',
    'Memory limits are set by compose anchors and deploy overrides, not by the services themselves.',
    '',
    '### Tier overview',
    '',
    mdTable(
      [
        { label: 'Tier',         key: 'label' },
        { label: 'Limit',        key: 'memory' },
        { label: 'Services',     key: 'services' },
      ],
      TIERS,
    ),
    '',
    '### Per-service limits',
    '',
    mdTable(
      [
        { label: 'Service', key: 'name' },
        { label: 'Profile', key: 'profile' },
        { label: 'Memory',  key: 'memory' },
      ],
      perServiceRows,
    ),
  ].join('\n');
}

function buildPortsSection(composeData) {
  const rows = composeData.services
    .filter(svc => svc.ports.length > 0)
    .map(svc => {
      const firstPort = svc.ports[0];
      const binding   = firstPort.host || '0.0.0.0';
      const isPublic  = binding === '0.0.0.0' || binding === '';
      return {
        name:    svc.name,
        profile: svc.profiles.join(', ') || 'default',
        binding: isPublic ? '0.0.0.0 (public)' : '127.0.0.1 (localhost)',
        ports:   svc.ports.map(p => p.raw).join(', '),
      };
    });

  return [
    '## Port Allocations and Binding Rules',
    '',
    '### Rule: localhost-only by default',
    '',
    'Every service except `gateway` and `nginx` binds to `127.0.0.1`.',
    'This means service ports are not reachable from outside the host in development.',
    'All external traffic enters through nginx (port 80), which proxies to gateway (port 3000).',
    '',
    '`gateway` binds to `0.0.0.0` so host browsers can reach the API directly during development.',
    'This is intentional — do not change it to `127.0.0.1` without considering the dev workflow.',
    '',
    mdTable(
      [
        { label: 'Service',     key: 'name' },
        { label: 'Profile',     key: 'profile' },
        { label: 'Host Binding', key: 'binding' },
        { label: 'Port Mapping', key: 'ports' },
      ],
      rows,
    ),
  ].join('\n');
}

function buildHealthcheckSection(composeData, rawCompose) {
  const rows = composeData.services
    .map(svc => {
      const hc = healthcheckOf(rawCompose.services[svc.name] || {});
      if (!hc) return null;
      const test = Array.isArray(hc.test) ? hc.test.slice(1).join(' ') : String(hc.test || '');
      return {
        name:         svc.name,
        command:      test,
        interval:     hc.interval     || '—',
        start_period: hc.start_period || '—',
      };
    })
    .filter(Boolean);

  return [
    '## Health Check Conventions',
    '',
    'Every NestJS service must expose `GET /api/health` returning HTTP 200.',
    'The healthcheck start period (40s) covers Prisma client init + NestJS bootstrap (~10–20s).',
    '',
    '**Two health check commands:**',
    '',
    '- `curl -f` — used by all NestJS services (curl is present in the production image)',
    '- `wget -qO-` — used by `gateway` and `nginx` (Alpine base images prefer wget)',
    '',
    mdTable(
      [
        { label: 'Service',      key: 'name' },
        { label: 'Command',      key: 'command' },
        { label: 'Interval',     key: 'interval' },
        { label: 'Start Period', key: 'start_period' },
      ],
      rows,
    ),
  ].join('\n');
}

function buildGroupingSection() {
  return [
    '## Service Grouping Strategy',
    '',
    'All profiles share the same `lms-net` Docker network.',
    'Any running service can reach any other running service by its compose service key (Docker DNS).',
    '',
    '### Profile dependency hierarchy',
    '',
    '```',
    'default (infra: postgres, redis, rabbitmq, minio)',
    '  └── core     (nginx, gateway, auth-service, course-service, enrollment-service)',
    '        ├── learn    (quiz-service, assignment-service)',
    '        ├── finance  (wallet-service, payment-service)',
    '        ├── ops      (notification-service, media-service, certificate-service, analytics-service)',
    '        ├── frontend (web)',
    '        └── ai       (ollama, ai-service)',
    '```',
    '',
    'Compose does not enforce this hierarchy — starting `learn` without `core` will fail at runtime',
    'because services cannot find their dependencies. Always start profiles bottom-up.',
    '',
    '### Adding a new service',
    '',
    '1. Add an entry to `config/services.yml` (set `status: reserved` if compose is not ready yet).',
    '2. Add a service block to `docker-compose.yml` — use `*nestjs-common` and `*infra-depends`.',
    '3. Use the next available port (3015+). Ports 3001–3013 are allocated; 3014 is reserved for user-service.',
    '4. Bind to `127.0.0.1` — not `0.0.0.0` — unless the service needs public access.',
    '5. Implement `GET /api/health` returning HTTP 200.',
    '6. Add a dev entry in `docker-compose.override.yml` following the existing pattern.',
    '7. Run `pnpm docs:generate && pnpm docs:compose` and commit the updated docs.',
    '8. Run `pnpm verify:compose && pnpm docs:verify:services` to confirm no regressions.',
  ].join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const servicesConfig = loadServicesConfig();
  const composeData    = parseComposeFile(COMPOSE_PATH);
  const rawCompose     = loadRaw();

  const header = [
    '<!--',
    'Purpose:',
    'This file is generated by scripts/generate-compose-docs.js.',
    'Do not edit by hand. Update docker-compose.yml or config/services.yml, then run:',
    '',
    '  pnpm docs:compose',
    '-->',
    '',
    '# Docker Compose Architecture',
    '',
    'Generated from: `docker-compose.yml`',
    '',
    '---',
    '',
  ].join('\n');

  const sections = [
    buildProfilesSection(composeData, servicesConfig),
    buildAnchorsSection(),
    buildMemorySection(composeData, rawCompose),
    buildPortsSection(composeData),
    buildHealthcheckSection(composeData, rawCompose),
    buildGroupingSection(),
  ];

  const md = header + sections.join('\n\n---\n\n') + '\n';

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, md, 'utf8');
  console.log('Generated ' + path.relative(ROOT, OUTPUT_PATH));
}

main();
