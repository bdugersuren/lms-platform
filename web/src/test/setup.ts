import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';
import React from 'react';

// next/navigation must be mocked before any component imports it
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}));

// next/image renders a plain img in tests (no JSX in .ts file — use createElement)
vi.mock('next/image', () => ({
  default: (props: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    onError?: () => void;
    className?: string;
  }) => {
    const { src, alt, width, height, onError, className } = props;
    return React.createElement('img', { src, alt, width, height, onError, className });
  },
}));

// sessionStorage and localStorage start empty each test
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});
