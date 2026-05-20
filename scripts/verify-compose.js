#!/usr/bin/env node

/**
 * Purpose:
 * Validate docker-compose.yml against platform conventions.
 *
 * This does NOT run the generators. It reads the compose file directly
 * and checks that the expanded (anchor-resolved) config follows the rules
 * defined in the architecture analysis.
 *
 * Checks:
 *   1. Port binding    — NestJS services must bind to 127.0.0.1, not 0.0.0.0
 *   2. Health checks   — every built (non-image) service must have a healthcheck
 *   3. Container names — must follow the lms-{service-name} convention
 *   4. Profiles        — every non-infrastructure service must declare a profile
 *   5. Service naming  — built domain services must end in -service
 *
 * Exit codes: 0 = all checks passed, 1 = one or more issues found.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const YAML = require('yaml');
const { parseComposeFile } = require('./lib/compose-parser');

const ROOT         = path.resolve(__dirname, '..');
const COMPOSE_PATH = path.join(ROOT, 'docker-compose.yml');

// ── Colours ───────────────────────────────────────────────────────────────────

const C = { reset: '\x1b[0m', bold: '\x1b[1m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m', grey: '\x1b[90m' };
const fmt = (colour, text) => `${colour}${text}${C.reset}`;

// ── Convention rules ──────────────────────────────────────────────────────────

// Services allowed to bind ports to 0.0.0.0 (publicly reachable).
const PUBLIC_BINDING_ALLOWED = new Set(['gateway', 'nginx']);

// Infrastructure services — they have no compose profile (always start).
const INFRA_SERVICES = new Set(['postgres', 'redis', 'rabbitmq', 'minio']);

// Known non-service-suffixed names that are valid.
// These are built/managed services that intentionally don't follow the -service suffix rule.
const NO_SUFFIX_EXCEPTIONS = new Set(['gateway', 'web', 'nginx', 'ollama']);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Return the expected container name for a service.
 * Convention: lms-{service-name}
 * Examples: auth-service → lms-auth-service, gateway → lms-gateway, web → lms-web
 */
function expectedContainerName(serviceName) {
  return 'lms-' + serviceName;
}

/**
 * Load the raw compose YAML (with anchors resolved via merge:true).
 * Used for fields the compose-parser doesn't extract (healthcheck, restart).
 */
function loadRaw() {
  return YAML.parse(fs.readFileSync(COMPOSE_PATH, 'utf8'), { merge: true });
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log('');
  console.log(fmt(C.bold + C.cyan, '  Compose Convention Verification'));
  console.log(fmt(C.grey, '  ──────────────────────────────────────────────────────'));
  console.log(fmt(C.grey, '  docker-compose.yml'));
  console.log('');

  const composeData = parseComposeFile(COMPOSE_PATH);
  const rawCompose  = loadRaw();
  const rawServices = rawCompose.services || {};

  const issues = [];
  const passed = [];

  for (const svc of composeData.services) {
    const raw        = rawServices[svc.name] || {};
    const isBuilt    = svc.hasBuild;
    const isInfra    = !isBuilt && Boolean(svc.image);
    const serviceIssues = [];

    // ── Check 1: Port binding ─────────────────────────────────────────────────
    for (const port of svc.ports) {
      const host = port.host || '';
      const isPublic = host === '' || host === '0.0.0.0';
      if (isPublic && !PUBLIC_BINDING_ALLOWED.has(svc.name)) {
        serviceIssues.push({
          check: 'port-binding',
          detail: `Port ${port.raw} binds to 0.0.0.0 (public). Only gateway and nginx should have public ports.`,
          fix:    `Change to "127.0.0.1:${port.published}:${port.target}" in docker-compose.yml`,
        });
      }
    }

    // ── Check 2: Health check ─────────────────────────────────────────────────
    if (isBuilt && !raw.healthcheck) {
      serviceIssues.push({
        check: 'healthcheck-missing',
        detail: 'Built service has no healthcheck. All NestJS services must expose GET /api/health.',
        fix:    'Add a healthcheck block. Use *nestjs-healthcheck anchor for timing.',
      });
    }

    // ── Check 3: Container naming ─────────────────────────────────────────────
    if (svc.containerName) {
      const expected = expectedContainerName(svc.name);
      if (svc.containerName !== expected) {
        serviceIssues.push({
          check: 'container-name',
          detail: `container_name is "${svc.containerName}", expected "${expected}".`,
          fix:    `Set container_name: ${expected}`,
        });
      }
    }

    // ── Check 4: Profile presence ─────────────────────────────────────────────
    const hasDefaultProfile = svc.profiles.length === 0 || svc.profiles[0] === 'default';
    if (!INFRA_SERVICES.has(svc.name) && hasDefaultProfile && isBuilt) {
      serviceIssues.push({
        check: 'missing-profile',
        detail: 'Built service has no compose profile. Assign to core, learn, finance, ops, ai, or frontend.',
        fix:    'Add: profiles: [<profile-name>]',
      });
    }

    // ── Check 5: Service naming ───────────────────────────────────────────────
    if (isBuilt && !svc.name.endsWith('-service') && !NO_SUFFIX_EXCEPTIONS.has(svc.name)) {
      serviceIssues.push({
        check: 'service-naming',
        detail: `Service name "${svc.name}" does not end in -service.`,
        fix:    `Rename to "${svc.name}-service" (and update all references).`,
      });
    }

    if (serviceIssues.length === 0) {
      passed.push(svc.name);
    } else {
      issues.push({ service: svc.name, problems: serviceIssues });
    }
  }

  // ── Report ────────────────────────────────────────────────────────────────

  for (const { service, problems } of issues) {
    for (const p of problems) {
      const label = p.check.replace(/-/g, ' ');
      console.log(fmt(C.red, `  ✖  [${service}] ${label}`));
      console.log(fmt(C.grey,   `       ${p.detail}`));
      console.log(fmt(C.yellow, `       Fix: ${p.fix}`));
      console.log('');
    }
  }

  const totalIssues = issues.reduce((n, e) => n + e.problems.length, 0);

  console.log(fmt(C.grey, '  ──────────────────────────────────────────────────────'));

  if (totalIssues === 0) {
    console.log(fmt(C.bold + C.green, `  ✔  ${passed.length} service(s) passed all convention checks.`));
    console.log('');
    process.exit(0);
  }

  console.log(fmt(C.bold + C.red, `  ✖  ${totalIssues} issue(s) found across ${issues.length} service(s).`));
  console.log('');
  console.log(fmt(C.bold, '  How to fix:'));
  console.log(fmt(C.cyan, '    Edit docker-compose.yml to address the issues above.'));
  console.log(fmt(C.cyan, '    Then run: pnpm docs:compose && pnpm verify:compose'));
  console.log('');

  process.exit(1);
}

main();
