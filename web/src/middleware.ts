import { NextRequest, NextResponse } from 'next/server';

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? 'platform.mn';
const DEFAULT_TENANT = process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG ?? 'demo';

export function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') ?? 'localhost';
  const isLocalhost = hostname.startsWith('localhost') || hostname.startsWith('127.0.0.1');

  let tenantSlug: string;

  if (isLocalhost) {
    tenantSlug = DEFAULT_TENANT;
  } else if (hostname === PLATFORM_DOMAIN || hostname === `www.${PLATFORM_DOMAIN}`) {
    tenantSlug = 'www';
  } else if (hostname.endsWith(`.${PLATFORM_DOMAIN}`)) {
    const subdomain = hostname.slice(0, -(PLATFORM_DOMAIN.length + 1));
    tenantSlug = subdomain || DEFAULT_TENANT;
  } else {
    // Custom domain — gateway resolves this by domain lookup
    tenantSlug = `__domain__:${hostname}`;
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-tenant-slug', tenantSlug);
  requestHeaders.set('x-tenant-host', hostname);

  const res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  res.headers.set('x-tenant-slug', tenantSlug);
  res.headers.set('x-tenant-host', hostname);
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
