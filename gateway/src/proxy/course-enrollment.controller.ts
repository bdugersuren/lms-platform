import { All, BadGatewayException, Controller, Logger, Req, Res } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ApiExcludeController } from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';
import { lastValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';
import * as qs from 'qs';
import { TenantResolverService } from '../tenant/tenant-resolver.service';

/**
 * Intercepts enrollment/progress operations that are routed under /courses/:courseId
 * and forwards them to enrollment-service instead of course-service.
 *
 * Matched paths (NestJS evaluates these before the generic ProxyController):
 *   POST   /api/courses/:courseId/enroll        → POST   enrollment-svc /api/enrollments/by-course/:courseId
 *   DELETE /api/courses/:courseId/enroll        → DELETE enrollment-svc /api/enrollments/by-course/:courseId
 *   GET    /api/courses/:courseId/enrollments   → GET    enrollment-svc /api/enrollments/admin/course/:courseId
 */
@ApiExcludeController()
@Controller('courses/:courseId')
export class CourseEnrollmentController {
  private readonly logger = new Logger(CourseEnrollmentController.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly tenantResolver: TenantResolverService,
  ) {}

  // POST /courses/:courseId/enroll → enrollment-service POST /enrollments/by-course/:courseId
  @All('enroll')
  async proxyEnroll(
    @Req() req: FastifyRequest,
    @Res({ passthrough: false }) reply: FastifyReply,
  ): Promise<void> {
    const params = req.params as Record<string, string>;
    const courseId = params['courseId'];
    const enrollmentServiceUrl =
      process.env.ENROLLMENT_SERVICE_URL ?? 'http://enrollment-service:3004';

    const method = req.method as AxiosRequestConfig['method'];
    let path: string;

    if (method === 'POST') {
      path = `/api/enrollments/by-course/${courseId}`;
    } else if (method === 'DELETE') {
      path = `/api/enrollments/by-course/${courseId}`;
    } else {
      // Unsupported — fall through (shouldn't happen with @All('enroll'))
      reply.status(405).send({ message: 'Method not allowed' });
      return;
    }

    await this.forward(req, reply, `${enrollmentServiceUrl}${path}`);
  }

  // GET /courses/:courseId/enrollments → enrollment-service GET /enrollments/admin/course/:courseId
  @All('enrollments')
  async proxyEnrollmentList(
    @Req() req: FastifyRequest,
    @Res({ passthrough: false }) reply: FastifyReply,
  ): Promise<void> {
    const params = req.params as Record<string, string>;
    const courseId = params['courseId'];
    const enrollmentServiceUrl =
      process.env.ENROLLMENT_SERVICE_URL ?? 'http://enrollment-service:3004';
    const url = `${enrollmentServiceUrl}/api/enrollments/admin/course/${courseId}`;
    await this.forward(req, reply, url);
  }

  private async forward(
    req: FastifyRequest,
    reply: FastifyReply,
    targetUrl: string,
  ): Promise<void> {
    const queryString = qs.stringify(req.query, { encode: false, arrayFormat: 'repeat' });
    const url = queryString ? `${targetUrl}?${queryString}` : targetUrl;

    const tenantHeaders = await this.tenantResolver.buildForwardHeaders(req);
    const forwardHeaders: Record<string, string> = {
      'content-type': (req.headers['content-type'] as string) ?? 'application/json',
      'x-correlation-id': (req.headers['x-correlation-id'] as string) ?? '',
      'x-forwarded-for': req.ip ?? '',
      ...tenantHeaders,
    };

    if (req.headers['authorization']) {
      forwardHeaders['authorization'] = req.headers['authorization'] as string;
    }
    if (req.headers['x-user-id']) {
      forwardHeaders['x-user-id'] = req.headers['x-user-id'] as string;
      forwardHeaders['x-user-role'] = (req.headers['x-user-role'] as string) ?? '';
      forwardHeaders['x-user-email'] = (req.headers['x-user-email'] as string) ?? '';
    }

    const config: AxiosRequestConfig = {
      method: req.method as AxiosRequestConfig['method'],
      url,
      headers: forwardHeaders,
      data: req.body,
      responseType: 'stream',
      validateStatus: () => true,
    };

    try {
      const response = await lastValueFrom(this.httpService.request(config));
      reply.status(response.status);
      const contentType = response.headers['content-type'];
      if (contentType) void reply.header('content-type', contentType);
      const correlationId = response.headers['x-correlation-id'];
      if (correlationId) void reply.header('x-correlation-id', correlationId);
      reply.send(response.data);
    } catch (err) {
      this.logger.error(`Enrollment proxy error → ${url}`, err);
      throw new BadGatewayException('enrollment-service unavailable');
    }
  }
}
