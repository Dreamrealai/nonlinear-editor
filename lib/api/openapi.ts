/**
 * OpenAPI Specification Utilities
 *
 * Provides utilities for generating and managing OpenAPI 3.0 specifications
 * for the API. Supports automatic schema generation from JSDoc annotations.
 *
 * @module lib/api/openapi
 */

/**
 * OpenAPI 3.0 Specification Types
 */
export interface OpenAPISpec {
  openapi: '3.0.0' | '3.0.1' | '3.0.2' | '3.0.3' | '3.1.0';
  info: OpenAPIInfo;
  servers?: OpenAPIServer[];
  paths: OpenAPIPaths;
  components?: OpenAPIComponents;
  security?: OpenAPISecurityRequirement[];
  tags?: OpenAPITag[];
  externalDocs?: OpenAPIExternalDocs;
}

export interface OpenAPIInfo {
  title: string;
  description?: string;
  termsOfService?: string;
  contact?: OpenAPIContact;
  license?: OpenAPILicense;
  version: string;
}

export interface OpenAPIContact {
  name?: string;
  url?: string;
  email?: string;
}

export interface OpenAPILicense {
  name: string;
  url?: string;
}

export interface OpenAPIServer {
  url: string;
  description?: string;
  variables?: Record<string, OpenAPIServerVariable>;
}

export interface OpenAPIServerVariable {
  enum?: string[];
  default: string;
  description?: string;
}

export type OpenAPIPaths = Record<string, OpenAPIPathItem>;

export interface OpenAPIPathItem {
  summary?: string;
  description?: string;
  get?: OpenAPIOperation;
  post?: OpenAPIOperation;
  put?: OpenAPIOperation;
  delete?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  options?: OpenAPIOperation;
  head?: OpenAPIOperation;
  trace?: OpenAPIOperation;
  parameters?: OpenAPIParameter[];
}

export interface OpenAPIOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: OpenAPIResponses;
  security?: OpenAPISecurityRequirement[];
  deprecated?: boolean;
}

export interface OpenAPIParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema: OpenAPISchema;
  example?: unknown;
}

export interface OpenAPIRequestBody {
  description?: string;
  content: Record<string, OpenAPIMediaType>;
  required?: boolean;
}

export interface OpenAPIMediaType {
  schema: OpenAPISchema;
  example?: unknown;
  examples?: Record<string, OpenAPIExample>;
}

export interface OpenAPIExample {
  summary?: string;
  description?: string;
  value?: unknown;
  externalValue?: string;
}

export type OpenAPIResponses = Record<string, OpenAPIResponse>;

export interface OpenAPIResponse {
  description: string;
  headers?: Record<string, OpenAPIHeader>;
  content?: Record<string, OpenAPIMediaType>;
  links?: Record<string, OpenAPILink>;
}

export interface OpenAPIHeader {
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema: OpenAPISchema;
}

export interface OpenAPILink {
  operationRef?: string;
  operationId?: string;
  parameters?: Record<string, unknown>;
  requestBody?: unknown;
  description?: string;
}

export interface OpenAPIComponents {
  schemas?: Record<string, OpenAPISchema>;
  responses?: Record<string, OpenAPIResponse>;
  parameters?: Record<string, OpenAPIParameter>;
  examples?: Record<string, OpenAPIExample>;
  requestBodies?: Record<string, OpenAPIRequestBody>;
  headers?: Record<string, OpenAPIHeader>;
  securitySchemes?: Record<string, OpenAPISecurityScheme>;
}

export interface OpenAPISchema {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  format?: string;
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  properties?: Record<string, OpenAPISchema>;
  required?: string[];
  items?: OpenAPISchema;
  oneOf?: OpenAPISchema[];
  anyOf?: OpenAPISchema[];
  allOf?: OpenAPISchema[];
  not?: OpenAPISchema;
  nullable?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  example?: unknown;
  deprecated?: boolean;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minProperties?: number;
  maxProperties?: number;
  $ref?: string;
}

export interface OpenAPISecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
  flows?: OpenAPIOAuthFlows;
  openIdConnectUrl?: string;
}

export interface OpenAPIOAuthFlows {
  implicit?: OpenAPIOAuthFlow;
  password?: OpenAPIOAuthFlow;
  clientCredentials?: OpenAPIOAuthFlow;
  authorizationCode?: OpenAPIOAuthFlow;
}

export interface OpenAPIOAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

export type OpenAPISecurityRequirement = Record<string, string[]>;

export interface OpenAPITag {
  name: string;
  description?: string;
  externalDocs?: OpenAPIExternalDocs;
}

export interface OpenAPIExternalDocs {
  description?: string;
  url: string;
}

/**
 * Creates a basic OpenAPI specification skeleton
 */
export function createOpenAPISpec(info: OpenAPIInfo, servers?: OpenAPIServer[]): OpenAPISpec {
  return {
    openapi: '3.0.3',
    info,
    servers: servers || [
      {
        url: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
        description: 'API Server',
      },
    ],
    paths: {},
    components: {
      schemas: {},
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'supabase-auth-token',
          description: 'Supabase session cookie authentication',
        },
      },
    },
    security: [{ cookieAuth: [] }],
    tags: [],
  };
}

/**
 * Common OpenAPI schemas for reuse
 */
export const CommonSchemas = {
  Error: {
    type: 'object' as const,
    properties: {
      error: { type: 'string' as const, description: 'Error message' },
      field: {
        type: 'string' as const,
        description: 'Field that caused the error (if applicable)',
      },
      details: { type: 'object' as const, description: 'Additional error details' },
    },
    required: ['error'],
  },

  UUID: {
    type: 'string' as const,
    format: 'uuid',
    pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    example: '123e4567-e89b-12d3-a456-426614174000',
  },

  Timestamp: {
    type: 'string' as const,
    format: 'date-time',
    example: '2025-10-23T12:00:00.000Z',
  },

  RateLimitError: {
    type: 'object' as const,
    properties: {
      error: { type: 'string' as const, example: 'Rate limit exceeded' },
      limit: { type: 'integer' as const, description: 'Maximum requests allowed' },
      remaining: { type: 'integer' as const, description: 'Remaining requests' },
      resetAt: { type: 'integer' as const, description: 'Unix timestamp when limit resets' },
      retryAfter: { type: 'integer' as const, description: 'Seconds until retry allowed' },
    },
    required: ['error', 'limit', 'remaining', 'resetAt', 'retryAfter'],
  },

  SuccessResponse: {
    type: 'object' as const,
    properties: {
      success: { type: 'boolean' as const, example: true },
      message: { type: 'string' as const, description: 'Success message' },
    },
  },
} as const;

/**
 * Common OpenAPI responses for reuse
 */
export const CommonResponses = {
  BadRequest: {
    description: 'Bad Request - Invalid input parameters',
    content: {
      'application/json': {
        schema: CommonSchemas.Error,
        example: {
          error: 'Invalid request parameters',
          field: 'projectId',
        },
      },
    },
  },

  Unauthorized: {
    description: 'Unauthorized - Authentication required',
    content: {
      'application/json': {
        schema: CommonSchemas.Error,
        example: {
          error: 'Unauthorized',
        },
      },
    },
  },

  Forbidden: {
    description: 'Forbidden - Insufficient permissions',
    content: {
      'application/json': {
        schema: CommonSchemas.Error,
        example: {
          error: 'Access denied',
        },
      },
    },
  },

  NotFound: {
    description: 'Not Found - Resource does not exist',
    content: {
      'application/json': {
        schema: CommonSchemas.Error,
        example: {
          error: 'Resource not found',
        },
      },
    },
  },

  Conflict: {
    description: 'Conflict - Resource already exists',
    content: {
      'application/json': {
        schema: CommonSchemas.Error,
        example: {
          error: 'Resource already exists',
        },
      },
    },
  },

  RateLimitExceeded: {
    description: 'Too Many Requests - Rate limit exceeded',
    content: {
      'application/json': {
        schema: CommonSchemas.RateLimitError,
      },
    },
    headers: {
      'X-RateLimit-Limit': {
        description: 'Request limit per window',
        schema: { type: 'integer' as const },
      },
      'X-RateLimit-Remaining': {
        description: 'Remaining requests in window',
        schema: { type: 'integer' as const },
      },
      'X-RateLimit-Reset': {
        description: 'Time when limit resets (ISO 8601)',
        schema: { type: 'string' as const, format: 'date-time' },
      },
      'Retry-After': {
        description: 'Seconds until retry allowed',
        schema: { type: 'integer' as const },
      },
    },
  },

  InternalServerError: {
    description: 'Internal Server Error',
    content: {
      'application/json': {
        schema: CommonSchemas.Error,
        example: {
          error: 'Internal server error',
        },
      },
    },
  },

  ServiceUnavailable: {
    description: 'Service Unavailable - External service error',
    content: {
      'application/json': {
        schema: CommonSchemas.Error,
        example: {
          error: 'Service temporarily unavailable',
        },
      },
    },
  },
} as const;

/**
 * Adds a path to the OpenAPI spec
 */
export function addPath(spec: OpenAPISpec, path: string, pathItem: OpenAPIPathItem): OpenAPISpec {
  return {
    ...spec,
    paths: {
      ...spec.paths,
      [path]: pathItem,
    },
  };
}

/**
 * Adds a schema to the OpenAPI spec
 */
export function addSchema(spec: OpenAPISpec, name: string, schema: OpenAPISchema): OpenAPISpec {
  return {
    ...spec,
    components: {
      ...spec.components,
      schemas: {
        ...spec.components?.schemas,
        [name]: schema,
      },
    },
  };
}

/**
 * Adds a tag to the OpenAPI spec
 */
export function addTag(spec: OpenAPISpec, tag: OpenAPITag): OpenAPISpec {
  return {
    ...spec,
    tags: [...(spec.tags || []), tag],
  };
}

/**
 * Creates a reference to a component schema
 */
export function schemaRef(name: string): OpenAPISchema {
  return {
    $ref: `#/components/schemas/${name}`,
  };
}

/**
 * Creates a reference to a component response
 */
export function responseRef(name: string): string {
  return `#/components/responses/${name}`;
}

/**
 * Creates a reference to a component parameter
 */
export function parameterRef(name: string): string {
  return `#/components/parameters/${name}`;
}
