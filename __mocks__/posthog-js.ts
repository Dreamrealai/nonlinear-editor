/**
 * Mock for posthog-js package
 * Used for testing analytics tracking without sending actual events
 */

export const mockCapture = jest.fn();
export const mockIdentify = jest.fn();
export const mockAlias = jest.fn();
export const mockGroup = jest.fn();
export const mockReset = jest.fn();
export const mockRegister = jest.fn();
export const mockUnregister = jest.fn();
export const mockGetFeatureFlag = jest.fn();
export const mockIsFeatureEnabled = jest.fn();
export const mockOnFeatureFlags = jest.fn();

export const posthog = {
  init: jest.fn(),
  capture: mockCapture,
  identify: mockIdentify,
  alias: mockAlias,
  group: mockGroup,
  reset: mockReset,
  register: mockRegister,
  unregister: mockUnregister,
  getFeatureFlag: mockGetFeatureFlag,
  isFeatureEnabled: mockIsFeatureEnabled,
  onFeatureFlags: mockOnFeatureFlags,
  opt_in_capturing: jest.fn(),
  opt_out_capturing: jest.fn(),
  has_opted_in_capturing: jest.fn(() => false),
  has_opted_out_capturing: jest.fn(() => false),
};

export default posthog;

/**
 * Helper to mock feature flag enabled
 */
export function mockFeatureFlagEnabled(flag: string, enabled = true) {
  mockIsFeatureEnabled.mockImplementation((flagName: string) => {
    return flagName === flag ? enabled : false;
  });
  mockGetFeatureFlag.mockImplementation((flagName: string) => {
    return flagName === flag ? enabled : undefined;
  });
}

/**
 * Reset all mocks
 */
export function resetPostHogMocks() {
  mockCapture.mockReset();
  mockIdentify.mockReset();
  mockAlias.mockReset();
  mockGroup.mockReset();
  mockReset.mockReset();
  mockRegister.mockReset();
  mockUnregister.mockReset();
  mockGetFeatureFlag.mockReset();
  mockIsFeatureEnabled.mockReset();
  mockOnFeatureFlags.mockReset();
}
