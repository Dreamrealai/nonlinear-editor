/**
 * Mock for auditLog
 */

export const auditSecurityEvent = jest.fn();
export const auditRateLimitViolation = jest.fn();
export enum AuditAction {
  SECURITY_UNAUTHORIZED_ACCESS = 'SECURITY_UNAUTHORIZED_ACCESS',
}
