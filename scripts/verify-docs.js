#!/usr/bin/env node

/**
 * Re-runs every documentation generator, then checks whether the committed
 * files still match the freshly generated output.
 *
 * See docs/architecture/decisions/0003-generate-and-commit-docs.md for the
 * reasoning behind this approach.
 *
 * Exit codes: 0 = all checks passed, 1 = one or more checks failed.
 */

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const fs   = require('fs');

// ── Colours ───────────────────────────────────────────────────────────────

const C = { reset: '\x1b[0m', bold: '\x1b[1m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m', grey: '\x1b[90m' };
const fmt = (colour, text) => `${colour}${text}${C.reset}`;

// ── Checks registry ───────────────────────────────────────────────────────
//
// To add a new generated file: append one entry here. Nothing else to change.

const ROOT = path.resolve(__dirname, '..');

const CHECKS = [
  {
    name:        'OpenAPI JSON',
    generator:   'scripts/generate-openapi.js',
    output:      'docs/api/openapi.json',
    description: 'NestJS controllers  →  OpenAPI 3.0 JSON spec',
  },
  {
    name:        'API Markdown',
    generator:   'scripts/generate-api-markdown.js',
    output:      'docs/api/reference.md',
    description: 'OpenAPI JSON  →  widdershins Markdown docs',
  },
  {
    name:        'Architecture Docs',
    generator:   'scripts/generate-docs.js',
    output:      'docs/generated/current-architecture.md',
    description: 'docker-compose.yml + config/services.yml  →  Architecture Markdown',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────

function runGenerator(scriptRelPath) {
  const scriptAbs = path.join(ROOT, scriptRelPath);
  if (!fs.existsSync(scriptAbs)) {
    return { ok: false, error: `Generator not found: ${scriptRelPath}` };
  }
  const result = spawnSync(process.execPath, [scriptAbs], {
    cwd:   ROOT,
    stdio: ['ignore', 'inherit', 'pipe'],
    env:   { ...process.env },
  });
  if (result.status !== 0) {
    const stderr = (result.stderr || Buffer.alloc(0)).toString().trim();
    return { ok: false, error: stderr || `Generator exited with code ${result.status}` };
  }
  return { ok: true };
}

/**
 * Returns 'clean' | 'modified' | 'untracked'.
 * Uses both git-diff (tracked files) and git-ls-files (untracked files)
 * because git diff cannot see files that were never committed.
 */
function gitStatus(fileRelPath) {
  const untracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard', '--', fileRelPath], { cwd: ROOT, encoding: 'utf8' });
  if ((untracked.stdout || '').trim().length > 0) return 'untracked';

  const diff = spawnSync('git', ['diff', '--name-only', 'HEAD', '--', fileRelPath], { cwd: ROOT, encoding: 'utf8' });
  if ((diff.stdout || '').trim().length > 0) return 'modified';

  return 'clean';
}

// ── Main ─────────────────────────────────────────────────────────────────

function main() {
  console.log('');
  console.log(fmt(C.bold + C.cyan, '  Documentation Drift Verification'));
  console.log(fmt(C.grey,          '  ──────────────────────────────────────────────────────'));
  console.log('');

  const results = [];

  for (const check of CHECKS) {
    console.log(fmt(C.bold, `  ▸ ${check.name}`));
    console.log(fmt(C.grey, `    ${check.description}`));

    const gen = runGenerator(check.generator);

    if (!gen.ok) {
      console.log('');
      console.log(fmt(C.red, `    ✖ Generator failed`));
      gen.error.split('\n').slice(0, 8).forEach((line) => console.log(fmt(C.grey, `      ${line}`)));
      console.log('');
      results.push({ check, outcome: 'generator-failed' });
      continue;
    }

    const status = gitStatus(check.output);
    console.log('');

    if (status === 'clean') {
      console.log(fmt(C.green, `    ✔ Up to date  →  ${check.output}`));
      results.push({ check, outcome: 'ok' });

    } else if (status === 'modified') {
      console.log(fmt(C.red,    `    ✖ Outdated    →  ${check.output}`));
      console.log(fmt(C.yellow, `      The committed file is stale. Run: pnpm docs`));
      console.log(fmt(C.yellow, `      Then commit the updated file.`));
      results.push({ check, outcome: 'outdated' });

    } else {
      console.log(fmt(C.red,    `    ✖ Not committed  →  ${check.output}`));
      console.log(fmt(C.yellow, `      Run: pnpm docs`));
      console.log(fmt(C.yellow, `      Then: git add ${check.output} && git commit -m "chore: add generated docs"`));
      results.push({ check, outcome: 'untracked' });
    }

    console.log('');
  }

  // ── Summary ───────────────────────────────────────────────────────────

  const passed = results.filter((r) => r.outcome === 'ok');
  const failed = results.filter((r) => r.outcome !== 'ok');

  console.log(fmt(C.grey, '  ──────────────────────────────────────────────────────'));

  if (failed.length === 0) {
    console.log(fmt(C.bold + C.green, `  ✔ All ${passed.length} documentation checks passed.`));
    console.log('');
    process.exit(0);
  }

  console.log(fmt(C.bold + C.red, `  ✖ ${failed.length} of ${results.length} checks failed.`));
  console.log('');

  failed.forEach(({ check, outcome }) => {
    const reason = outcome === 'generator-failed' ? 'generator threw an error' : outcome === 'outdated' ? 'committed file is stale' : 'file was never committed';
    console.log(fmt(C.red, `    ✖ ${check.name}: ${reason}`));
  });

  console.log('');
  console.log(fmt(C.bold,  '  How to fix:'));
  console.log(fmt(C.cyan,  '    pnpm docs'));
  console.log(fmt(C.cyan,  '    git add docs/'));
  console.log(fmt(C.cyan,  '    git commit -m "chore: regenerate docs"'));
  console.log('');

  process.exit(1);
}

main();
