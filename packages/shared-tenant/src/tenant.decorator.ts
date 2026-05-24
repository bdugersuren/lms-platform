import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext, TenantHeaders, tenantFromHeaders } from './tenant-context';

interface TenantRequest {
  tenant?: TenantContext;
  headers: TenantHeaders;
}

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext | null => {
    const request = ctx.switchToHttp().getRequest<TenantRequest>();
    return request.tenant ?? tenantFromHeaders(request.headers);
  },
);
