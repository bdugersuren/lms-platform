import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function buildAuthSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('LMS Auth API')
    .setDescription('Authentication, session, and user administration endpoints')
    .setVersion('1.0.0')
    .addServer('/api', 'Gateway or service API prefix')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste the accessToken returned by /auth/login.',
      },
      'access-token',
    )
    .addTag('Auth', 'Authentication and current-user endpoints')
    .addTag('Users', 'Admin user management endpoints')
    .addTag('Health', 'Service health checks')
    .build();
}

export function setupAuthSwagger(app: INestApplication): void {
  const document = SwaggerModule.createDocument(app, buildAuthSwaggerConfig(), {
    ignoreGlobalPrefix: true,
  });
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
    jsonDocumentUrl: 'docs-json',
  });
}
