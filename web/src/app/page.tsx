'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { HomepageBuilder } from '@/components/cms/homepage-builder';

export default function RootPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: `rgb(var(--color-primary))`, borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <>
      <Header />
      <main>
        <HomepageBuilder />
      </main>
      <Footer />
    </>
  );
}
