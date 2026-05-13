Read CLAUDE.md and follow all architecture and engineering rules strictly.

Generate the initial backend foundation for this LMS platform.

Tasks:

1. Generate root monorepo structure
2. Generate docker-compose.yml
3. Generate gateway service
4. Generate auth-service
5. Generate shared packages:
   - shared-types
   - shared-utils
   - shared-auth
   - shared-config
6. Configure RabbitMQ integration
7. Configure PostgreSQL integration
8. Configure Prisma
9. Configure Redis
10. Configure Swagger
11. Configure health checks
12. Configure structured logging
13. Configure centralized exception handling

Requirements:
- Use NestJS
- Use TypeScript only
- Use Prisma ORM
- Use Docker Compose
- Use clean architecture
- Use modular architecture
- Use production-ready patterns

IMPORTANT:
- Do not simplify architecture
- Do not generate pseudo code
- Do not generate fake implementations
- Keep services isolated
- Keep architecture Kubernetes-ready
- Follow CLAUDE.md strictly

Generate code incrementally and explain generated structure briefly.