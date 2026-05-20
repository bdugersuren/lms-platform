import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupUserSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('LMS User Service API')
    .setDescription('User profile, display identity, locale, and onboarding metadata')
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
    .addTag('Users', 'User profile endpoints')
    .addTag('Health', 'Service health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    ignoreGlobalPrefix: true,
  });

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
    jsonDocumentUrl: 'docs-json',
  });
}
