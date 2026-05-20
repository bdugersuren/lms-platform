/**
 * Purpose:
 * Parse docker-compose.yml into a small, documentation-friendly object.
 *
 * Docker Compose structure, simplified:
 * - The top-level `services` object contains every container definition.
 * - Each service can define `ports`, `depends_on`, `profiles`, and `environment`.
 * - `ports` can be strings such as "127.0.0.1:3001:3001" or "80:80".
 * - `depends_on` can be a list or a map with conditions.
 * - `profiles` controls which optional service groups start together.
 *
 * This parser does not try to reimplement Docker Compose. It only extracts the
 * fields needed for generated documentation.
 */

const fs = require('fs');
const YAML = require('yaml');

/**
 * Parse a single Docker Compose port string.
 *
 * Common examples:
 * - "80:80"                   -> published 80, target 80
 * - "127.0.0.1:3001:3001"     -> host 127.0.0.1, published 3001, target 3001
 * - "127.0.0.1:9000-9001:9000-9001" -> range mapping
 *
 * The parser keeps the original value too, so docs remain accurate even when a
 * port format is unusual.
 */
function parsePort(port) {
  if (typeof port === 'number') {
    return {
      raw: String(port),
      host: '',
      published: String(port),
      target: String(port),
    };
  }

  if (typeof port === 'object' && port !== null) {
    return {
      raw: JSON.stringify(port),
      host: port.host_ip || '',
      published: port.published || '',
      target: port.target || '',
    };
  }

  const raw = String(port);
  const parts = raw.split(':');

  if (parts.length === 3) {
    return {
      raw,
      host: parts[0],
      published: parts[1],
      target: parts[2],
    };
  }

  if (parts.length === 2) {
    return {
      raw,
      host: '',
      published: parts[0],
      target: parts[1],
    };
  }

  return {
    raw,
    host: '',
    published: raw,
    target: '',
  };
}

/**
 * Normalize depends_on.
 *
 * Docker Compose supports:
 * - depends_on: [postgres, redis]
 * - depends_on:
 *     postgres:
 *       condition: service_healthy
 *
 * The docs only need dependency name + optional condition.
 */
function parseDependsOn(dependsOn) {
  if (!dependsOn) return [];

  if (Array.isArray(dependsOn)) {
    return dependsOn.map((name) => ({ name: String(name), condition: '' }));
  }

  return Object.entries(dependsOn)
    .filter(([name]) => name !== '<<')
    .map(([name, value]) => ({
      name,
      condition: value && typeof value === 'object' ? value.condition || '' : '',
    }));
}

/**
 * Normalize environment variables.
 *
 * Docker Compose supports both:
 * - environment:
 *     PORT: 3000
 *     NODE_ENV: development
 * - environment:
 *     - PORT=3000
 *
 * YAML anchors/merge keys may also appear as `<<`. We skip that because it is
 * structure, not an environment variable users need documented.
 */
function parseEnvironment(environment) {
  if (!environment) return [];

  if (Array.isArray(environment)) {
    return environment.map((entry) => {
      const [name, ...rest] = String(entry).split('=');
      return { name, value: rest.join('=') };
    });
  }

  return Object.entries(environment)
    .filter(([name]) => name !== '<<')
    .map(([name, value]) => ({
      name,
      value: value === null || value === undefined ? '' : String(value),
    }));
}

/**
 * Parse docker-compose.yml.
 *
 * YAML parsing:
 * - fs.readFileSync reads the file as text.
 * - YAML.parse turns YAML into JavaScript objects.
 * - Docker Compose extension keys such as `x-restart` are ignored because only
 *   `services` represents runtime containers.
 */
function parseComposeFile(composePath) {
  const composeText = fs.readFileSync(composePath, 'utf8');
  const compose = YAML.parse(composeText, { merge: true });
  const services = compose.services || {};

  const parsedServices = Object.entries(services).map(([name, service]) => {
    const ports = (service.ports || []).map(parsePort);
    const profiles = service.profiles || ['default'];
    const dependencies = parseDependsOn(service.depends_on);
    const environment = parseEnvironment(service.environment);

    return {
      name,
      image: service.image || '',
      containerName: service.container_name || '',
      profiles,
      ports,
      dependencies,
      environment,
      hasBuild: Boolean(service.build),
      envFile: service.env_file || '',
    };
  });

  const profiles = {};
  parsedServices.forEach((service) => {
    service.profiles.forEach((profileName) => {
      if (!profiles[profileName]) profiles[profileName] = [];
      profiles[profileName].push(service.name);
    });
  });

  return {
    services: parsedServices,
    profiles,
  };
}

module.exports = {
  parseComposeFile,
  parsePort,
  parseDependsOn,
  parseEnvironment,
};
