import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import { TenantProvider } from '@/lib/tenant-context';
import { DynamicTheme } from '@/components/tenant/dynamic-theme';
import { getRequestTenant } from '@/lib/get-tenant';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getRequestTenant();
  return {
    title: tenant.seo.title,
    description: tenant.seo.description,
    keywords: tenant.seo.keywords,
    openGraph: {
      title: tenant.seo.title,
      description: tenant.seo.description,
      images: tenant.seo.ogImage ? [tenant.seo.ogImage] : [],
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getRequestTenant();

  return (
    <html lang={tenant.locale === 'en' ? 'en' : 'mn'}>
      <head>
        {tenant.branding.favicon && (
          <link rel="icon" href={tenant.branding.favicon} />
        )}
      </head>
      <body className="font-sans antialiased">
        <DynamicTheme branding={tenant.branding} />
        <Providers>
          <TenantProvider config={tenant}>
            {children}
          </TenantProvider>
        </Providers>
      </body>
    </html>
  );
}
