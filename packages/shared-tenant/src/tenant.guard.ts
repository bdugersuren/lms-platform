import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { TenantContext, TenantHeaders, tenantFromHeaders } from './tenant-context';

interface TenantRequest {
  tenant?: TenantContext;
  headers: TenantHeaders;
}

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const tenant = tenantFromHeaders(request.headers);
    if (!tenant) {
      throw new UnauthorizedException('Tenant context is required');
    }
    request.tenant = tenant;
    return true;
  }
}
