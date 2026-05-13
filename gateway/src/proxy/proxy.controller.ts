import {
  All,
  BadGatewayException,
  Controller,
  Logger,
  NotFoundException,
  Req,
  Res,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ApiExcludeController } from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';
import { lastValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';
import { SERVICE_ROUTES } from './services.config';

@ApiExcludeController()
@Controller(':service')
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);

  constructor(private readonly httpService: HttpService) {}

  @All()
  proxyBase(
    @Req() req: FastifyRequest,
    @Res({ passthrough: false }) reply: FastifyReply,
  ): Promise<void> {
    return this.proxy(req, reply);
  }

  @All('*')
  async proxy(
    @Req() req: FastifyRequest,
    @Res({ passthrough: false }) reply: FastifyReply,
  ): Promise<void> {
    const params = req.params as Record<string, string>;
    const service = params['service'];
    const wildcard = params['*'] ?? '';

    const upstreamBase = SERVICE_ROUTES[service];
    if (!upstreamBase) {
      throw new NotFoundException(`Service '${service}' not found`);
    }

    const targetUrl = `${upstreamBase}/api/${service}${wildcard ? `/${wildcard}` : ''}`;
    const queryString = new URLSearchParams(
      req.query as Record<string, string>,
    ).toString();
    const url = queryString ? `${targetUrl}?${queryString}` : targetUrl;

    const forwardHeaders: Record<string, string> = {
      'content-type': (req.headers['content-type'] as string) ?? 'application/json',
      'x-correlation-id': (req.headers['x-correlation-id'] as string) ?? '',
      'x-forwarded-for': req.ip ?? '',
    };

    if (req.headers['authorization']) {
      forwardHeaders['authorization'] = req.headers['authorization'] as string;
    }

    // Forward decoded user context set by JWT guard upstream
    if (req.headers['x-user-id']) {
      forwardHeaders['x-user-id'] = req.headers['x-user-id'] as string;
      forwardHeaders['x-user-role'] = req.headers['x-user-role'] as string ?? '';
      forwardHeaders['x-user-email'] = req.headers['x-user-email'] as string ?? '';
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
      if (contentType) {
        void reply.header('content-type', contentType);
      }

      const correlationId = response.headers['x-correlation-id'];
      if (correlationId) {
        void reply.header('x-correlation-id', correlationId);
      }

      reply.send(response.data);
    } catch (err) {
      this.logger.error(`Proxy error → ${url}`, err);
      throw new BadGatewayException(`Upstream service '${service}' unavailable`);
    }
  }
}
