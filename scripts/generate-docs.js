#!/usr/bin/env node

/**
 * Purpose:
 * Entry point for the documentation generator.
 *
 * This file intentionally stays small. The detailed work is split into:
 * - scripts/lib/compose-parser.js      -> reads docker-compose.yml
 * - scripts/lib/markdown-generator.js  -> turns parsed data into markdown
 *
 * Keeping the entry point small makes the generator easier to maintain as the
 * project grows.
 */

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const { parseComposeFile } = require('./lib/compose-parser');
const { generateCurrentArchitectureMarkdown } = require('./lib/markdown-generator');

const ROOT_DIR = path.resolve(__dirname, '..');
const SERVICES_CONFIG_PATH = path.join(ROOT_DIR, 'config', 'services.yml');
const COMPOSE_PATH = path.join(ROOT_DIR, 'docker-compose.yml');
const OUTPUT_DIR = path.join(ROOT_DIR, 'docs', 'generated');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'current-architecture.md');

/**
 * Read config/services.yml — the centralized service registry (ENG-001).
 *
 * YAML parsing:
 * - fs.readFileSync loads the YAML file as plain text.
 * - YAML.parse converts that text into a JavaScript object.
 * - That object is merged with docker-compose.yml data later.
 */
function readServicesConfig() {
  const yamlText = fs.readFileSync(SERVICES_CONFIG_PATH, 'utf8');
  return YAML.parse(yamlText);
}

/**
 * Main generation flow:
 * 1. Read human-maintained system config.
 * 2. Parse real Docker Compose runtime configuration.
 * 3. Merge both sources inside the markdown generator.
 * 4. Write the generated markdown file.
 */
function main() {
  const servicesConfig = readServicesConfig();
  const composeData = parseComposeFile(COMPOSE_PATH);

  const markdown = generateCurrentArchitectureMarkdown({
    systemConfig: servicesConfig,
    composeData,
    sourceFiles: {
      systemConfig: 'config/services.yml',
      compose: 'docker-compose.yml',
    },
  });

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, markdown, 'utf8');

  console.log(`Generated ${path.relative(ROOT_DIR, OUTPUT_PATH)}`);
}

main();
