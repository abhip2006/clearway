/**
 * API Test Helpers
 *
 * Utilities for testing API endpoints
 */

/**
 * Create a mock Request object for API route testing
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
): Request {
  const { method = 'GET', headers = {}, body } = options;

  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Create a mock Response for testing
 */
export function createMockResponse(
  data: any,
  options: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
  } = {}
): Response {
  const { status = 200, statusText = 'OK', headers = {} } = options;

  return new Response(JSON.stringify(data), {
    status,
    statusText,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Create mock authenticated request with user context
 */
export function createAuthenticatedRequest(
  url: string,
  userId: string,
  options: {
    method?: string;
    body?: any;
    organizationId?: string;
  } = {}
): Request {
  return createMockRequest(url, {
    method: options.method || 'GET',
    headers: {
      'x-user-id': userId,
      'x-organization-id': options.organizationId || '',
    },
    body: options.body,
  });
}

/**
 * Parse API response body
 */
export async function parseResponseBody(response: Response): Promise<any> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Assert API response status
 */
export function assertResponseStatus(
  response: Response,
  expectedStatus: number,
  message?: string
) {
  if (response.status !== expectedStatus) {
    throw new Error(
      message ||
        `Expected status ${expectedStatus}, got ${response.status}: ${response.statusText}`
    );
  }
}

/**
 * Assert API response contains fields
 */
export async function assertResponseContains(
  response: Response,
  fields: string[]
) {
  const body = await parseResponseBody(response);

  for (const field of fields) {
    if (!(field in body)) {
      throw new Error(`Response missing required field: ${field}`);
    }
  }
}

/**
 * Mock API call helper
 */
export async function mockApiCall<T>(
  data: T,
  delay: number = 0
): Promise<T> {
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  return data;
}

/**
 * Mock API error helper
 */
export async function mockApiError(
  message: string,
  status: number = 400,
  delay: number = 0
): Promise<never> {
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  const error = new Error(message) as any;
  error.status = status;
  throw error;
}

/**
 * Create mock fetch response
 */
export function createMockFetchResponse(
  data: any,
  options: {
    status?: number;
    headers?: Record<string, string>;
  } = {}
): Promise<Response> {
  const { status = 200, headers = {} } = options;

  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    })
  );
}

/**
 * Wait for async operation with timeout
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Retry helper for flaky tests
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
