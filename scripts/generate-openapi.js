#!/usr/bin/env node

/**
 * Generate the OpenAPI document for backend APIs.
 *
 * Package installation commands, if a fresh checkout is missing dependencies:
 *   pnpm install
 *   pnpm --filter @lms/auth-service add @nestjs/swagger swagger-ui-express
 *   pnpm add -D ts-node tsconfig-paths
 *
 * This script intentionally creates a small documentation-only Nest module.
 * It imports controllers and DTOs so Swagger can read their decorators, but it
 * does not import the full AppModule. That keeps docs generation fast and avoids
 * opening database, Redis, or RabbitMQ connections while generating JSON.
 */

require('reflect-metadata');

const path = require('path');

process.env.TS_NODE_PROJECT =
  process.env.TS_NODE_PROJECT ??
  path.resolve(__dirname, '../services/auth-service/tsconfig.json');
process.env.TS_NODE_TRANSPILE_ONLY = process.env.TS_NODE_TRANSPILE_ONLY ?? 'true';

require('ts-node/register/transpile-only');
require('tsconfig-paths/register');

const fs = require('fs');
const { Module, ValidationPipe, VersioningType } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { SwaggerModule } = require('@nestjs/swagger');

const {
  AuthController,
} = require('../services/auth-service/src/auth/auth.controller');
const { AuthService } = require('../services/auth-service/src/auth/auth.service');
const {
  buildAuthSwaggerConfig,
} = require('../services/auth-service/src/swagger');

/**
 * The controller constructor needs AuthService, but OpenAPI generation never
 * calls business logic. A small mocked provider is enough for Nest to create the
 * controller and let @nestjs/swagger inspect routes, request bodies, responses,
 * query parameters, security decorators, and DTO validation metadata.
 */
const authServiceForDocs = {
  register: async () => null,
  login: async () => null,
  refreshTokens: async () => null,
  logout: async () => null,
  logoutAll: async () => null,
  getMe: async () => null,
  changePassword: async () => null,
  listUsers: async () => null,
  updateUserStatus: async () => null,
};

/**
 * This is the documentation module. Add more controllers here as other backend
 * services are prepared for OpenAPI generation.
 */
class OpenApiAuthModule {}

Module({
  controllers: [AuthController],
  providers: [
    {
      provide: AuthService,
      useValue: authServiceForDocs,
    },
  ],
})(OpenApiAuthModule);

async function generateOpenApi() {
  const rootDir = path.resolve(__dirname, '..');
  const outputPath = path.join(rootDir, 'docs', 'api', 'openapi.json');

  /**
   * Create a Nest application context for documentation only.
   * The global prefix and validation pipe mirror the real service bootstrap so
   * generated paths and DTO behavior stay aligned with runtime behavior.
   */
  const app = await NestFactory.create(OpenApiAuthModule, { logger: false });
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  /**
   * SwaggerModule reads TypeScript decorators from controllers and DTO classes.
   * The result is plain JSON that can be used by frontend tools, SDK generators,
   * Postman imports, contract tests, and API documentation sites.
   */
  const document = SwaggerModule.createDocument(app, buildAuthSwaggerConfig(), {
    ignoreGlobalPrefix: true,
    operationIdFactory: (controllerKey, methodKey) =>
      `${controllerKey}_${methodKey}`,
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`);

  await app.close();
  console.log(`Generated ${path.relative(rootDir, outputPath)}`);
}

generateOpenApi().catch((error) => {
  console.error('Failed to generate OpenAPI documentation');
  console.error(error);
  process.exit(1);
});
