/**
 * Purpose:
 * Generate markdown from parsed system config and parsed Docker Compose data.
 *
 * Markdown generation flow:
 * 1. Merge stable descriptions from config/system.yml with runtime facts from
 *    docker-compose.yml.
 * 2. Build small markdown tables from normalized JavaScript arrays.
 * 3. Join those sections into one generated document.
 *
 * The generator does not read files. It receives already-parsed objects so it
 * stays easy to test and reuse.
 */

/**
 * Escape markdown table cells.
 *
 * Markdown tables use "|" between columns, so any literal "|" in content must
 * be escaped to avoid breaking the table.
 */
function cell(value) {
  if (value === undefined || value === null || value === '') return '-';
  return String(value).replace(/\|/g, '\\|');
}

/**
 * Build a markdown table from column definitions and row objects.
 */
function markdownTable(columns, rows) {
  const header = `| ${columns.map((column) => cell(column.label)).join(' | ')} |`;
  const separator = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => {
    const values = columns.map((column) => cell(row[column.key]));
    return `| ${values.join(' | ')} |`;
  });

  return [header, separator, ...body].join('\n');
}

/**
 * Merge config/services.yml with docker-compose.yml.
 *
 * config/services.yml owns human-friendly metadata:
 * - kind, database, description, container, host_binding, status
 *
 * docker-compose.yml owns runtime facts:
 * - actual ports, dependencies, profiles, environment variables
 *
 * Reserved services (status: reserved) are appended at the end of the table
 * with a note, because they exist in the registry but not yet in compose.
 */
function mergeServices(systemConfig, composeData) {
  const configServicesByName = new Map(
    (systemConfig.services || []).map((service) => [service.name, service]),
  );

  // Build compose-driven rows (all services currently in docker-compose.yml).
  const rows = composeData.services.map((composeService) => {
    const configService = configServicesByName.get(composeService.name) || {};
    const firstPort = composeService.ports[0];

    return {
      name: composeService.name,
      kind: configService.kind || (composeService.image ? 'infrastructure' : 'service'),
      port: firstPort ? firstPort.target || firstPort.published : configService.port,
      publishedPorts: composeService.ports.map((port) => port.raw).join(', '),
      profiles: composeService.profiles.join(', '),
      database: configService.database || '',
      dependencies: composeService.dependencies.map((dependency) => dependency.name).join(', '),
      description: configService.description || '',
      environment: composeService.environment,
    };
  });

  // Append reserved services — exist in services.yml but not yet in docker-compose.yml.
  const composeNames = new Set(composeData.services.map((s) => s.name));
  for (const configService of systemConfig.services || []) {
    if (configService.status !== 'reserved') continue;
    if (composeNames.has(configService.name)) continue;
    rows.push({
      name: configService.name,
      kind: configService.kind || 'backend-service',
      port: configService.port || '',
      publishedPorts: '',
      profiles: configService.profile || '',
      database: configService.database || '',
      dependencies: '',
      description: `${configService.description || ''} *(reserved — not yet in docker-compose.yml)*`,
      environment: [],
    });
  }

  return rows;
}

function buildPortRows(services) {
  return services.flatMap((service) =>
    service.publishedPorts
      ? service.publishedPorts.split(', ').map((raw) => ({ service: service.name, mapping: raw }))
      : [],
  );
}

function buildProfileRows(systemConfig, composeData) {
  const configProfiles = systemConfig.docker_compose_profiles || {};

  return Object.entries(composeData.profiles).map(([name, services]) => ({
    name,
    description: configProfiles[name] ? configProfiles[name].description : 'Defined by docker-compose.yml',
    services: services.join(', '),
  }));
}

function buildDependencyRows(composeData) {
  return composeData.services
    .filter((service) => service.dependencies.length > 0)
    .flatMap((service) =>
      service.dependencies.map((dependency) => ({
        service: service.name,
        dependency: dependency.name,
        condition: dependency.condition,
      })),
    );
}

function buildEnvironmentRows(composeData) {
  return composeData.services
    .filter((service) => service.environment.length > 0 || service.envFile)
    .map((service) => ({
      service: service.name,
      envFile: Array.isArray(service.envFile) ? service.envFile.join(', ') : service.envFile,
      variables: service.environment.map((entry) => entry.name).join(', '),
    }));
}

function buildSeedRows(systemConfig) {
  return Object.entries(systemConfig.seed_credentials || {})
    .filter(([key]) => key !== 'note')
    .map(([role, credentials]) => ({
      role,
      email: credentials.email,
      password: credentials.password,
    }));
}

function runtimeTopologyList(services) {
  return services
    .map((service) => {
      const deps = service.dependencies || 'no compose dependencies';
      const ports = service.publishedPorts || 'internal only';
      return `- **${service.name}** (${service.profiles}) -> ports: ${ports}; depends on: ${deps}`;
    })
    .join('\n');
}

/**
 * Generate the current architecture document.
 */
function generateCurrentArchitectureMarkdown({ systemConfig, composeData, sourceFiles }) {
  const services = mergeServices(systemConfig, composeData);
  const portRows = buildPortRows(services);
  const profileRows = buildProfileRows(systemConfig, composeData);
  const dependencyRows = buildDependencyRows(composeData);
  const environmentRows = buildEnvironmentRows(composeData);
  const seedRows = buildSeedRows(systemConfig);

  const servicesTable = markdownTable(
    [
      { label: 'Service', key: 'name' },
      { label: 'Kind', key: 'kind' },
      { label: 'Profiles', key: 'profiles' },
      { label: 'Internal Port', key: 'port' },
      { label: 'Published Ports', key: 'publishedPorts' },
      { label: 'Database', key: 'database' },
      { label: 'Description', key: 'description' },
    ],
    services,
  );

  const portsTable = markdownTable(
    [
      { label: 'Service', key: 'service' },
      { label: 'Compose Port Mapping', key: 'mapping' },
    ],
    portRows,
  );

  const profilesTable = markdownTable(
    [
      { label: 'Profile', key: 'name' },
      { label: 'Description', key: 'description' },
      { label: 'Services', key: 'services' },
    ],
    profileRows,
  );

  const dependenciesTable = markdownTable(
    [
      { label: 'Service', key: 'service' },
      { label: 'Depends On', key: 'dependency' },
      { label: 'Condition', key: 'condition' },
    ],
    dependencyRows,
  );

  const environmentTable = markdownTable(
    [
      { label: 'Service', key: 'service' },
      { label: 'env_file', key: 'envFile' },
      { label: 'Environment Variables', key: 'variables' },
    ],
    environmentRows,
  );

  const seedTable = markdownTable(
    [
      { label: 'Role', key: 'role' },
      { label: 'Email', key: 'email' },
      { label: 'Password', key: 'password' },
    ],
    seedRows,
  );

  return `<!--
Purpose:
This file is generated by scripts/generate-docs.js.
Do not edit this file by hand. Update ${sourceFiles.systemConfig} or ${sourceFiles.compose}, then run:

  pnpm docs:generate
-->

# Current Architecture

Generated from:

- \`${sourceFiles.systemConfig}\`
- \`${sourceFiles.compose}\`

## Platform

- **Name:** ${cell(systemConfig.platform && systemConfig.platform.name)}
- **Description:** ${cell(systemConfig.platform && systemConfig.platform.description)}

## Services

${servicesTable}

## Ports

${portsTable}

## Docker Compose Profiles

${profilesTable}

## Dependency Graph

${dependenciesTable}

## Runtime Topology

${runtimeTopologyList(services)}

## Environment Variables

${environmentTable}

## Seed Credentials

${cell(systemConfig.seed_credentials && systemConfig.seed_credentials.note)}

${seedTable}
`;
}

module.exports = {
  generateCurrentArchitectureMarkdown,
  mergeServices,
  markdownTable,
};
