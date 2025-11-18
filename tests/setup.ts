import '@testing-library/jest-dom';
import { expect, afterEach, vi, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock environment variables for testing
beforeAll(() => {
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_mock_key_123456789';
  process.env.CLERK_SECRET_KEY = 'sk_test_mock_secret_123456789';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/clearway_test';
  process.env.OPENAI_API_KEY = 'sk-test-mock-openai-key';
  process.env.AZURE_DI_ENDPOINT = 'https://test.cognitiveservices.azure.com/';
  process.env.AZURE_DI_KEY = 'test_azure_di_key';
  process.env.R2_ENDPOINT = 'https://test.r2.cloudflarestorage.com';
  process.env.R2_ACCESS_KEY_ID = 'test_access_key';
  process.env.R2_SECRET_ACCESS_KEY = 'test_secret_key';
  process.env.R2_BUCKET_NAME = 'clearway-test';
  process.env.RESEND_API_KEY = 're_test_key';
  process.env.NODE_ENV = 'test';
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/test-path',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Suppress console errors in tests (optional - uncomment if needed)
// global.console = {
//   ...console,
//   error: vi.fn(),
//   warn: vi.fn(),
// };
