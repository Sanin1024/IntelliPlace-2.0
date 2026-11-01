/**
 * Controlled mocks for external dependencies.
 * Challenge 323: Separate internal business logic from external service integrations.
 */

type MockFn<T extends (...args: any[]) => any> = T & {
  mockClear: () => void;
  mockCalls: Parameters<T>[];
};

function createMockFn<T extends (...args: any[]) => any>(impl: T): MockFn<T> {
  const calls: Parameters<T>[] = [];
  const fn = ((...args: Parameters<T>) => {
    calls.push(args);
    return impl(...args);
  }) as MockFn<T>;
  fn.mockClear = () => {
    calls.length = 0;
  };
  fn.mockCalls = calls;
  return fn;
}

// Mock email transporter — captures emails instead of sending them
export const mockEmailTransporter = {
  sentEmails: [] as Array<{ to: string; subject: string; text: string }>,
  sendMail: createMockFn((options: any) => {
    mockEmailTransporter.sentEmails.push({
      to: options.to,
      subject: options.subject,
      text: options.text,
    });
    return Promise.resolve({ messageId: 'mock-message-id' });
  }),
  reset: () => {
    mockEmailTransporter.sentEmails = [];
    mockEmailTransporter.sendMail.mockClear();
  },
};

// Mock web-push
export const mockWebPush = {
  sentNotifications: [] as Array<{ endpoint: string; payload: any }>,
  sendNotification: createMockFn((subscription: any, payload: string) => {
    mockWebPush.sentNotifications.push({
      endpoint: subscription.endpoint,
      payload: JSON.parse(payload),
    });
    return Promise.resolve();
  }),
  reset: () => {
    mockWebPush.sentNotifications = [];
    mockWebPush.sendNotification.mockClear();
  },
};

// Mock for external API calls
export const mockExternalApi = {
  responses: new Map<string, any>(),
  setResponse: (url: string, response: any) => {
    mockExternalApi.responses.set(url, response);
  },
  fetch: createMockFn((url: string) => {
    const response = mockExternalApi.responses.get(url);
    if (response) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(response) });
    }
    return Promise.reject(new Error(`Network error: ${url}`));
  }),
  reset: () => {
    mockExternalApi.responses.clear();
    mockExternalApi.fetch.mockClear();
  },
};

