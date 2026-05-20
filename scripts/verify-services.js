#!/usr/bin/env node

/**
 * Purpose:
 * Semantic validation — compare config/services.yml against docker-compose.yml.
 *
 * This is different from verify-docs.js, which checks git drift.
 * This script checks whether the metadata registry matches the actual runtime config.
 *
 * Checks performed:
 * - Missing services: in services.yml but not in compose (unless status: reserved)
 * - Unknown services: in compose but not in services.yml
 * - Port mismatches: services.yml port vs compose port mapping
 * - Profile mismatches: services.yml profile vs compose profiles
 * - Container name mismatches: services.yml container vs compose container_name
 *
 * Exit codes: 0 = all checks passed, 1 = one or more issues found.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const { parseComposeFile } = require('./lib/compose-parser');

const ROOT = path.resolve(__dirname, '..');
const SERVICES_PATH = path.join(ROOT, 'config', 'services.yml');
const COMPOSE_PATH = path.join(ROOT, 'docker-compose.yml');

// ── Colours ───────────────────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  grey: '\x1b[90m',
};
const fmt = (colour, text) => `${colour}${text}${C.reset}`;

// ── Loaders ───────────────────────────────────────────────────────────────────

function loadServicesConfig() {
  const text = fs.readFileSync(SERVICES_PATH, 'utf8');
  return YAML.parse(text);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract the primary internal port from a compose service's parsed ports array.
 * Returns null when a service has no host port mapping (e.g. web, which is internal only).
 */
function primaryPort(parsedPorts) {
  if (!parsedPorts || parsedPorts.length === 0) return null;
  const target = parsedPorts[0].target;
  if (!target) return null;
  const num = parseInt(target, 10);
  return isNaN(num) ? null : num;
}

/**
 * Extract the first profile from a compose service's profiles array.
 * Services without a profiles key start under the "default" profile.
 */
function primaryProfile(parsedService) {
  return parsedService.profiles[0] || 'default';
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log('');
  console.log(fmt(C.bold + C.cyan, '  Service Registry Verification'));
  console.log(fmt(C.grey, '  ──────────────────────────────────────────────────────'));
  console.log(fmt(C.grey, '  config/services.yml  ↔  docker-compose.yml'));
  console.log('');

  const servicesConfig = loadServicesConfig();
  const composeData = parseComposeFile(COMPOSE_PATH);

  // Build lookup maps.
  const metaServices = servicesConfig.services || [];
  const metaByName = new Map(metaServices.map((s) => [s.name, s]));
  const composeByName = new Map(composeData.services.map((s) => [s.name, s]));

  const issues = [];
  const reserved = [];
  const ok = [];

  // ── Check every metadata service against compose ───────────────────────────

  for (const meta of metaServices) {
    if (meta.status === 'reserved') {
      reserved.push(meta.name);
      continue;
    }

    const compose = composeByName.get(meta.name);

    if (!compose) {
      issues.push({
        service: meta.name,
        type: 'missing-in-compose',
        detail: 'Defined in services.yml but not found in docker-compose.yml.',
        fix: `Add "${meta.name}" to docker-compose.yml or set status: reserved in services.yml.`,
      });
      continue;
    }

    let serviceOk = true;

    // Port check — only when compose has a host port mapping.
    const composePort = primaryPort(compose.ports);
    if (composePort !== null && meta.port && composePort !== meta.port) {
      issues.push({
        service: meta.name,
        type: 'port-mismatch',
        detail: `services.yml: ${meta.port}  ≠  compose port mapping: ${composePort}`,
        fix: `Align the port field in services.yml with the ports: entry in docker-compose.yml.`,
      });
      serviceOk = false;
    }

    // Profile check.
    const composeProfile = primaryProfile(compose);
    if (meta.profile && composeProfile !== meta.profile) {
      issues.push({
        service: meta.name,
        type: 'profile-mismatch',
        detail: `services.yml: "${meta.profile}"  ≠  compose profiles: "${composeProfile}"`,
        fix: `Align the profile field in services.yml with the profiles: entry in docker-compose.yml.`,
      });
      serviceOk = false;
    }

    // Container name check — only when both sides declare it.
    const composeContainer = compose.containerName || '';
    if (meta.container && composeContainer && meta.container !== composeContainer) {
      issues.push({
        service: meta.name,
        type: 'container-name-mismatch',
        detail: `services.yml: "${meta.container}"  ≠  compose container_name: "${composeContainer}"`,
        fix: `Align the container field in services.yml with the container_name: in docker-compose.yml.`,
      });
      serviceOk = false;
    }

    if (serviceOk) ok.push(meta.name);
  }

  // ── Check for compose services not in metadata ─────────────────────────────

  for (const compose of composeData.services) {
    if (!metaByName.has(compose.name)) {
      issues.push({
        service: compose.name,
        type: 'missing-in-metadata',
        detail: 'Found in docker-compose.yml but not defined in config/services.yml.',
        fix: `Add "${compose.name}" to config/services.yml.`,
      });
    }
  }

  // ── Report ────────────────────────────────────────────────────────────────

  if (reserved.length > 0) {
    console.log(fmt(C.yellow, `  ↷  Reserved (skipped): ${reserved.join(', ')}`));
    console.log('');
  }

  for (const issue of issues) {
    const label = issue.type.replace(/-/g, ' ');
    console.log(fmt(C.red, `  ✖  [${issue.service}] ${label}`));
    console.log(fmt(C.grey, `       ${issue.detail}`));
    console.log(fmt(C.yellow, `       Fix: ${issue.fix}`));
    console.log('');
  }

  console.log(fmt(C.grey, '  ──────────────────────────────────────────────────────'));

  if (issues.length === 0) {
    console.log(fmt(C.bold + C.green, `  ✔  ${ok.length} service(s) verified. No mismatches found.`));
    console.log('');
    process.exit(0);
  }

  console.log(fmt(C.bold + C.red, `  ✖  ${issues.length} issue(s) found across ${ok.length + issues.length} checked service(s).`));
  console.log('');
  console.log(fmt(C.bold, '  How to fix:'));
  console.log(fmt(C.cyan, '    Edit config/services.yml to match docker-compose.yml (or vice versa).'));
  console.log(fmt(C.cyan, '    Then run: pnpm docs:generate && pnpm docs:verify:services'));
  console.log('');

  process.exit(1);
}

main();
