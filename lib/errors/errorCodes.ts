/**
 * Error Code Constants
 *
 * Centralized error codes to replace magic strings throughout the application.
 * This provides type safety, better IDE support, and easier maintenance.
 *
 * @module lib/errors/errorCodes
 */

/**
 * PostgreSQL/PostgREST Error Codes
 *
 * Error codes returned by Supabase PostgREST API for database operations.
 *
 * @see https://postgrest.org/en/stable/errors.html
 */
export enum PostgresErrorCode {
  /** Resource not found (404) - No rows returned by query */
  NOT_FOUND = 'PGRST116',

  /** Invalid request format */
  INVALID_REQUEST = 'PGRST100',

  /** Invalid range */
  INVALID_RANGE = 'PGRST103',

  /** Schema cache outdated */
  SCHEMA_CACHE_OUTDATED = 'PGRST200',

  /** Ambiguous embedding */
  AMBIGUOUS_EMBED = 'PGRST201',

  /** Invalid body */
  INVALID_BODY = 'PGRST102',

  /** JWT token invalid */
  JWT_INVALID = 'PGRST301',
}

/**
 * HTTP Status Codes
 *
 * Standard HTTP status codes used throughout the API.
 * Use these instead of magic numbers for better readability.
 */
export enum HttpStatusCode {
  // Success codes (2xx)
  /** Request succeeded */
  OK = 200,

  /** Resource created successfully */
  CREATED = 201,

  /** Request accepted, processing asynchronously */
  ACCEPTED = 202,

  /** No content to return */
  NO_CONTENT = 204,

  // Client error codes (4xx)
  /** Invalid request format or parameters */
  BAD_REQUEST = 400,

  /** Authentication required or failed */
  UNAUTHORIZED = 401,

  /** Authenticated but not authorized for this resource */
  FORBIDDEN = 403,

  /** Resource not found */
  NOT_FOUND = 404,

  /** Method not allowed for this resource */
  METHOD_NOT_ALLOWED = 405,

  /** Resource conflict (e.g., duplicate) */
  CONFLICT = 409,

  /** Rate limit exceeded */
  RATE_LIMITED = 429,

  // Server error codes (5xx)
  /** Internal server error */
  INTERNAL_SERVER_ERROR = 500,

  /** Service temporarily unavailable */
  SERVICE_UNAVAILABLE = 503,

  /** Gateway timeout */
  GATEWAY_TIMEOUT = 504,
}

/**
 * Stripe Webhook Event Types
 *
 * Event types emitted during Stripe operations for logging and monitoring.
 * These are application-level events, not Stripe's webhook events.
 */
export enum StripeEventCode {
  // Checkout events
  CHECKOUT_REQUEST_STARTED = 'stripe.checkout.request_started',
  CHECKOUT_UNAUTHORIZED = 'stripe.checkout.unauthorized',
  CHECKOUT_USER_AUTHENTICATED = 'stripe.checkout.user_authenticated',
  CHECKOUT_PROFILE_ERROR = 'stripe.checkout.profile_error',
  CHECKOUT_PROFILE_FETCHED = 'stripe.checkout.profile_fetched',
  CHECKOUT_ALREADY_SUBSCRIBED = 'stripe.checkout.already_subscribed',
  CHECKOUT_CUSTOMER_LOOKUP = 'stripe.checkout.customer_lookup',
  CHECKOUT_CUSTOMER_READY = 'stripe.checkout.customer_ready',
  CHECKOUT_CUSTOMER_UPDATE_ERROR = 'stripe.checkout.customer_update_error',
  CHECKOUT_CUSTOMER_SAVED = 'stripe.checkout.customer_saved',
  CHECKOUT_PRICE_SELECTED = 'stripe.checkout.price_selected',
  CHECKOUT_CONFIG_ERROR = 'stripe.checkout.config_error',
  CHECKOUT_SESSION_CREATING = 'stripe.checkout.session_creating',
  CHECKOUT_SESSION_CREATED = 'stripe.checkout.session_created',
  CHECKOUT_ERROR = 'stripe.checkout.error',
  CHECKOUT_STARTED = 'stripe.checkout.started',
  CHECKOUT_USER_NOT_FOUND = 'stripe.checkout.user_not_found',
  CHECKOUT_DB_ERROR = 'stripe.checkout.db_error',
  CHECKOUT_COMPLETED = 'stripe.checkout.completed',

  // Portal events
  PORTAL_REQUEST_STARTED = 'stripe.portal.request_started',
  PORTAL_UNAUTHORIZED = 'stripe.portal.unauthorized',
  PORTAL_USER_AUTHENTICATED = 'stripe.portal.user_authenticated',
  PORTAL_NO_CUSTOMER = 'stripe.portal.no_customer',
  PORTAL_CUSTOMER_FOUND = 'stripe.portal.customer_found',
  PORTAL_SESSION_CREATING = 'stripe.portal.session_creating',
  PORTAL_SESSION_CREATED = 'stripe.portal.session_created',
  PORTAL_ERROR = 'stripe.portal.error',

  // Subscription events
  SUBSCRIPTION_RETRIEVE = 'stripe.subscription.retrieve',
  SUBSCRIPTION_NO_ITEMS = 'stripe.subscription.no_items',
  SUBSCRIPTION_DATA = 'stripe.subscription.data',
  SUBSCRIPTION_UPDATE_STARTED = 'stripe.subscription.update_started',
  SUBSCRIPTION_USER_NOT_FOUND = 'stripe.subscription.user_not_found',
  SUBSCRIPTION_UPDATE_NO_ITEMS = 'stripe.subscription_update.no_items',
  SUBSCRIPTION_TIER_CHANGE = 'stripe.subscription.tier_change',
  SUBSCRIPTION_DB_ERROR = 'stripe.subscription.db_error',
  SUBSCRIPTION_UPDATED = 'stripe.subscription.updated',
  SUBSCRIPTION_UPDATE_ERROR = 'stripe.subscription.update_error',
  SUBSCRIPTION_DELETE_STARTED = 'stripe.subscription.delete_started',
  SUBSCRIPTION_DELETE_DB_ERROR = 'stripe.subscription.delete_db_error',
  SUBSCRIPTION_DELETED = 'stripe.subscription.deleted',
  SUBSCRIPTION_DELETE_ERROR = 'stripe.subscription.delete_error',
  SUBSCRIPTION_CREATED = 'stripe.subscription.created',

  // Webhook events
  WEBHOOK_RECEIVED = 'stripe.webhook.received',
  WEBHOOK_MISSING_SIGNATURE = 'stripe.webhook.missing_signature',
  WEBHOOK_CONFIG_ERROR = 'stripe.webhook.config_error',
  WEBHOOK_VERIFIED = 'stripe.webhook.verified',
  WEBHOOK_VERIFICATION_FAILED = 'stripe.webhook.verification_failed',
  WEBHOOK_PROCESSING = 'stripe.webhook.processing',
  WEBHOOK_UNHANDLED = 'stripe.webhook.unhandled',
  WEBHOOK_COMPLETED = 'stripe.webhook.completed',
  WEBHOOK_ERROR = 'stripe.webhook.error',

  // Customer events
  CUSTOMER_RETRIEVE_FAILED = 'stripe.customer.retrieve_failed',
}

/**
 * Supabase/Database Event Codes
 *
 * Application-level event codes for database operations.
 */
export enum DatabaseEventCode {
  /** Query executed successfully */
  QUERY_SUCCESS = 'database.query.success',

  /** Query failed */
  QUERY_ERROR = 'database.query.error',

  /** Connection established */
  CONNECTION_ESTABLISHED = 'database.connection.established',

  /** Connection failed */
  CONNECTION_FAILED = 'database.connection.failed',

  /** Transaction started */
  TRANSACTION_STARTED = 'database.transaction.started',

  /** Transaction committed */
  TRANSACTION_COMMITTED = 'database.transaction.committed',

  /** Transaction rolled back */
  TRANSACTION_ROLLBACK = 'database.transaction.rollback',
}

/**
 * Google Cloud Error Codes
 *
 * Common error codes from Google Cloud services (Storage, Vision API, etc.)
 */
export enum GoogleCloudErrorCode {
  /** Resource not found */
  NOT_FOUND = 404,

  /** Permission denied */
  PERMISSION_DENIED = 403,

  /** Rate limit exceeded */
  RATE_LIMITED = 429,

  /** Internal server error */
  INTERNAL_ERROR = 500,

  /** Service unavailable */
  SERVICE_UNAVAILABLE = 503,

  /** Bucket already exists */
  BUCKET_EXISTS = 409,
}

/**
 * Custom Application Error Codes
 *
 * Application-specific error codes for business logic errors.
 */
export enum AppErrorCode {
  /** User not authenticated */
  NOT_AUTHENTICATED = 'APP_NOT_AUTHENTICATED',

  /** User not authorized for this action */
  NOT_AUTHORIZED = 'APP_NOT_AUTHORIZED',

  /** Resource not found */
  RESOURCE_NOT_FOUND = 'APP_RESOURCE_NOT_FOUND',

  /** Invalid input parameters */
  INVALID_INPUT = 'APP_INVALID_INPUT',

  /** Resource already exists */
  RESOURCE_EXISTS = 'APP_RESOURCE_EXISTS',

  /** Quota exceeded */
  QUOTA_EXCEEDED = 'APP_QUOTA_EXCEEDED',

  /** Operation timeout */
  TIMEOUT = 'APP_TIMEOUT',

  /** External service error */
  EXTERNAL_SERVICE_ERROR = 'APP_EXTERNAL_SERVICE_ERROR',

  /** Configuration error */
  CONFIG_ERROR = 'APP_CONFIG_ERROR',

  /** Unknown error */
  UNKNOWN_ERROR = 'APP_UNKNOWN_ERROR',
}

/**
 * Helper function to check if an HTTP status code is a client error (4xx)
 */
export function isClientError(statusCode: number): boolean {
  return statusCode >= 400 && statusCode < 500;
}

/**
 * Helper function to check if an HTTP status code is a server error (5xx)
 */
export function isServerError(statusCode: number): boolean {
  return statusCode >= 500 && statusCode < 600;
}

/**
 * Helper function to check if an HTTP status code is successful (2xx)
 */
export function isSuccessStatus(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 300;
}

/**
 * Helper function to check if an error is a Postgres NOT_FOUND error
 */
export function isPostgresNotFound(error: { code?: string }): boolean {
  return error.code === PostgresErrorCode.NOT_FOUND;
}

/**
 * Helper function to determine if a status code should trigger a retry
 */
export function shouldRetryOnStatus(statusCode: number): boolean {
  return (
    statusCode === HttpStatusCode.RATE_LIMITED ||
    statusCode >= HttpStatusCode.INTERNAL_SERVER_ERROR
  );
}
