/**
 * Mock for stripe package
 * Used for testing Stripe integration without making actual API calls
 */

export const mockCreateCheckoutSession = jest.fn();
export const mockRetrieveCheckoutSession = jest.fn();
export const mockCreateSubscription = jest.fn();
export const mockRetrieveSubscription = jest.fn();
export const mockUpdateSubscription = jest.fn();
export const mockCancelSubscription = jest.fn();
export const mockCreateCustomer = jest.fn();
export const mockRetrieveCustomer = jest.fn();
export const mockUpdateCustomer = jest.fn();
export const mockCreateBillingPortalSession = jest.fn();
export const mockConstructWebhookEvent = jest.fn();

class MockStripe {
  constructor(apiKey: string, config?: any) {
    // Mock constructor
  }

  checkout = {
    sessions: {
      create: mockCreateCheckoutSession,
      retrieve: mockRetrieveCheckoutSession,
      list: jest.fn(),
      expire: jest.fn(),
    },
  };

  subscriptions = {
    create: mockCreateSubscription,
    retrieve: mockRetrieveSubscription,
    update: mockUpdateSubscription,
    cancel: mockCancelSubscription,
    list: jest.fn(),
    del: mockCancelSubscription,
  };

  customers = {
    create: mockCreateCustomer,
    retrieve: mockRetrieveCustomer,
    update: mockUpdateCustomer,
    list: jest.fn(),
    del: jest.fn(),
  };

  billingPortal = {
    sessions: {
      create: mockCreateBillingPortalSession,
    },
  };

  webhooks = {
    constructEvent: mockConstructWebhookEvent,
  };

  prices = {
    retrieve: jest.fn(),
    list: jest.fn(),
  };

  products = {
    retrieve: jest.fn(),
    list: jest.fn(),
  };
}

export default MockStripe;

/**
 * Reset all mocks
 */
export function resetStripeMocks() {
  mockCreateCheckoutSession.mockReset();
  mockRetrieveCheckoutSession.mockReset();
  mockCreateSubscription.mockReset();
  mockRetrieveSubscription.mockReset();
  mockUpdateSubscription.mockReset();
  mockCancelSubscription.mockReset();
  mockCreateCustomer.mockReset();
  mockRetrieveCustomer.mockReset();
  mockUpdateCustomer.mockReset();
  mockCreateBillingPortalSession.mockReset();
  mockConstructWebhookEvent.mockReset();
}
