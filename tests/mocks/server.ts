import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW server for Node.js environment (tests)
 *
 * This server intercepts HTTP requests during testing and
 * returns mock responses defined in handlers.ts
 *
 * Usage in tests:
 *
 * import { server } from '@/tests/mocks/server';
 *
 * beforeAll(() => server.listen());
 * afterEach(() => server.resetHandlers());
 * afterAll(() => server.close());
 */

export const server = setupServer(...handlers);

// Enable request logging in development
if (process.env.NODE_ENV === 'development') {
  server.events.on('request:start', ({ request }) => {
    console.log('MSW intercepted:', request.method, request.url);
  });
}
