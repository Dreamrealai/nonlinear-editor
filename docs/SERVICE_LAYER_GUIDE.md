# Service Layer Guide

This guide explains how to use and extend the service layer in the non-linear video editor application.

## Table of Contents

1. [Overview](#overview)
2. [Benefits of Service Layer](#benefits-of-service-layer)
3. [Available Services](#available-services)
4. [Usage Patterns](#usage-patterns)
5. [Creating New Services](#creating-new-services)
6. [Best Practices](#best-practices)
7. [Caching Strategy](#caching-strategy)
8. [Error Handling](#error-handling)

## Overview

The service layer separates business logic from API route handlers, providing:

- **Testability**: Business logic can be unit tested independently
- **Reusability**: Services can be used across multiple API routes
- **Maintainability**: Centralized logic is easier to update and maintain
- **Caching**: Built-in caching reduces database queries
- **Error Tracking**: Consistent error handling and logging

## Benefits of Service Layer

### Before Service Layer

```typescript
// API route with embedded business logic
export const POST = async (request: NextRequest) => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const body = await request.json();

  // Complex business logic embedded in route
  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      title: body.title,
      user_id: user.id,
      timeline_state_jsonb: {},
    })
    .select()
    .single();

  if (error) {
    return errorResponse(error.message, 500);
  }

  return successResponse(project);
};
```

### After Service Layer

```typescript
// Clean API route using service layer
export const POST = async (request: NextRequest) => {
  const supabase = await createServerSupabaseClient();
  const authService = new AuthService(supabase);
  const projectService = new ProjectService(supabase);

  const user = await authService.getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }

  const body = await request.json();

  // Simple, readable business logic
  const project = await projectService.createProject(user.id, {
    title: body.title,
  });

  return successResponse(project);
};
```

## Available Services

### 1. AuthService

Handles user authentication and profile management.

```typescript
import { AuthService } from '@/lib/services/authService';

const authService = new AuthService(supabase);

// Get current authenticated user
const user = await authService.getCurrentUser();

// Require authentication (throws if not authenticated)
const user = await authService.requireAuth();

// Get user profile with caching
const profile = await authService.getUserProfile(userId);

// Update user profile
const updated = await authService.updateUserProfile(userId, {
  tier: 'pro',
});

// Sign out
await authService.signOut();

// Delete user account and all data
await authService.deleteUserAccount(userId);
```

### 2. ProjectService

Manages video editing projects with caching.

```typescript
import { ProjectService } from '@/lib/services/projectService';

const projectService = new ProjectService(supabase);

// Create a new project
const project = await projectService.createProject(userId, {
  title: 'My Video Project',
  initialState: {},
});

// Get user's projects (cached)
const projects = await projectService.getUserProjects(userId);

// Get single project by ID (cached)
const project = await projectService.getProjectById(projectId, userId);

// Verify project ownership
const hasAccess = await projectService.verifyOwnership(projectId, userId);

// Update project title
const updated = await projectService.updateProjectTitle(projectId, userId, 'New Title');

// Update project timeline state
const updated = await projectService.updateProjectState(projectId, userId, newTimelineState);

// Delete project
await projectService.deleteProject(projectId, userId);
```

### 3. AssetService

Manages media assets (images, videos, audio).

```typescript
import { AssetService } from '@/lib/services/assetService';

const assetService = new AssetService(supabase);

// Create image asset
const asset = await assetService.createImageAsset(userId, projectId, imageBuffer, {
  filename: 'image.png',
  mimeType: 'image/png',
  metadata: {
    provider: 'flux',
    model: 'flux-1.1-pro',
    prompt: 'A beautiful sunset',
  },
});

// Get project assets (cached)
const assets = await assetService.getProjectAssets(projectId, userId);

// Delete asset
await assetService.deleteAsset(assetId, userId);

// Batch create image assets
const assets = await assetService.createImageAssetBatch(userId, projectId, [
  { buffer: imageBuffer1, options: { filename: 'img1.png', mimeType: 'image/png' } },
  { buffer: imageBuffer2, options: { filename: 'img2.png', mimeType: 'image/png' } },
]);
```

### 4. VideoService

Handles video generation and status polling.

```typescript
import { VideoService } from '@/lib/services/videoService';

const videoService = new VideoService(supabase);

// Generate video with Google Veo
const result = await videoService.generateVideo(userId, projectId, {
  prompt: 'A serene lake at sunset',
  model: 'veo-3.1-generate-preview',
  duration: 5,
  aspectRatio: '16:9',
  resolution: '1080p',
});

// Generate video with FAL.ai Seedance
const result = await videoService.generateVideo(userId, projectId, {
  prompt: 'Cat walking across the room',
  model: 'seedance-1.0-pro',
  duration: 4,
  aspectRatio: '16:9',
});

// Check video generation status
const status = await videoService.checkVideoStatus(userId, projectId, result.operationName);

if (status.done && status.asset) {
  console.log('Video ready:', status.storageUrl);
}
```

### 5. AudioService

Manages audio generation (TTS, music, SFX).

```typescript
import { AudioService } from '@/lib/services/audioService';

const audioService = new AudioService(supabase);

// Generate text-to-speech
const result = await audioService.generateTTS(userId, projectId, {
  text: 'Hello, world!',
  voiceId: 'EXAVITQu4vr4xnSDxMaL',
  stability: 0.6,
  similarity: 0.8,
});

// Generate sound effects
const result = await audioService.generateSFX(userId, projectId, {
  text: 'Door creaking open',
  duration: 3,
  promptInfluence: 0.5,
});

// Delete audio asset
await audioService.deleteAudio(assetId, userId);
```

## Usage Patterns

### Pattern 1: API Route with Service Layer

```typescript
import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { AuthService } from '@/lib/services/authService';
import { ProjectService } from '@/lib/services/projectService';
import { unauthorizedResponse, successResponse, errorResponse } from '@/lib/api/response';

export const GET = async (request: NextRequest) => {
  try {
    // Initialize services
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const projectService = new ProjectService(supabase);

    // Check authentication
    const user = await authService.getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    // Use service layer
    const projects = await projectService.getUserProjects(user.id);

    return successResponse({ projects });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
};
```

### Pattern 2: Combining Multiple Services

```typescript
export const POST = async (request: NextRequest) => {
  const supabase = await createServerSupabaseClient();
  const authService = new AuthService(supabase);
  const projectService = new ProjectService(supabase);
  const assetService = new AssetService(supabase);

  // Require authentication
  const user = await authService.requireAuth();

  const body = await request.json();

  // Create project
  const project = await projectService.createProject(user.id, {
    title: body.title,
  });

  // Add initial assets if provided
  if (body.initialAssets) {
    await assetService.createImageAssetBatch(user.id, project.id, body.initialAssets);
  }

  return successResponse({ project });
};
```

### Pattern 3: Service-to-Service Communication

```typescript
// Inside a service method
class VideoService {
  async checkVideoStatus(userId: string, projectId: string, operationName: string) {
    // ... check status ...

    if (done && videoUrl) {
      // Use AssetService to create asset
      const assetService = new AssetService(this.supabase);
      const asset = await assetService.createImageAsset(userId, projectId, videoBinary, {
        filename,
        mimeType,
      });

      return { done: true, asset };
    }
  }
}
```

## Creating New Services

### Service Template

````typescript
/**
 * [Name] Service Layer
 *
 * Handles all business logic related to [domain]:
 * - [Operation 1]
 * - [Operation 2]
 * - [Operation 3]
 *
 * Usage:
 * ```typescript
 * import { [Name]Service } from '@/lib/services/[name]Service';
 *
 * const service = new [Name]Service(supabase);
 * const result = await service.someMethod();
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { trackError, ErrorCategory, ErrorSeverity } from '../errorTracking';
import { validateUUID } from '../validation';
import { cache, CacheKeys, CacheTTL } from '../cache';
import {
  invalidate[Domain]Cache
} from '../cacheInvalidation';

export interface [Domain]Entity {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  // ... other fields
}

export class [Name]Service {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get entity by ID with caching
   *
   * @param entityId - Entity ID
   * @param userId - User ID for ownership verification
   * @returns Entity or null
   * @throws Error if database query fails
   *
   * @example
   * const entity = await service.getById(entityId, userId);
   */
  async getById(
    entityId: string,
    userId: string
  ): Promise<[Domain]Entity | null> {
    try {
      validateUUID(entityId, 'Entity ID');

      // Try cache first
      const cacheKey = `[domain]:${entityId}`;
      const cached = await cache.get<[Domain]Entity>(cacheKey);

      if (cached && cached.user_id === userId) {
        return cached;
      }

      // Fetch from database
      const { data, error } = await this.supabase
        .from('[table_name]')
        .select('*')
        .eq('id', entityId)
        .eq('user_id', userId)
        .single();

      if (error) {
        trackError(error, {
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.MEDIUM,
          context: { entityId, userId },
        });
        throw new Error(`Failed to fetch entity: ${error.message}`);
      }

      // Cache the result
      if (data) {
        await cache.set(cacheKey, data, CacheTTL.medium);
      }

      return data as [Domain]Entity | null;
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.MEDIUM,
        context: { entityId, userId },
      });
      throw error;
    }
  }

  /**
   * Create entity and invalidate cache
   *
   * @param userId - User ID
   * @param data - Entity data
   * @returns Created entity
   * @throws Error if creation fails
   *
   * @example
   * const entity = await service.create(userId, { field: 'value' });
   */
  async create(
    userId: string,
    data: Partial<[Domain]Entity>
  ): Promise<[Domain]Entity> {
    try {
      const { data: entity, error } = await this.supabase
        .from('[table_name]')
        .insert({
          user_id: userId,
          ...data
        })
        .select()
        .single();

      if (error) {
        trackError(error, {
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.HIGH,
          context: { userId, data },
        });
        throw new Error(`Failed to create entity: ${error.message}`);
      }

      // Invalidate related caches
      await invalidate[Domain]Cache(userId);

      return entity as [Domain]Entity;
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.HIGH,
        context: { userId, data },
      });
      throw error;
    }
  }
}
````

## Best Practices

### 1. Always Use Services in API Routes

**Bad:**

```typescript
export const GET = async (request: NextRequest) => {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from('projects').select('*');
  return successResponse({ data });
};
```

**Good:**

```typescript
export const GET = async (request: NextRequest) => {
  const supabase = await createServerSupabaseClient();
  const authService = new AuthService(supabase);
  const projectService = new ProjectService(supabase);

  const user = await authService.requireAuth();
  const projects = await projectService.getUserProjects(user.id);

  return successResponse({ projects });
};
```

### 2. Use Comprehensive JSDoc Documentation

```typescript
/**
 * Update project title and invalidate cache
 *
 * Updates the project's title field and automatically invalidates
 * related cache entries to ensure consistency.
 *
 * @param projectId - UUID of the project to update
 * @param userId - UUID of the user (for ownership verification)
 * @param title - New title for the project (1-200 characters)
 * @returns Updated project object
 * @throws {Error} If project not found, access denied, or database error
 *
 * @example
 * const project = await projectService.updateProjectTitle(
 *   '123e4567-e89b-12d3-a456-426614174000',
 *   'user-uuid',
 *   'My New Project Title'
 * );
 */
async updateProjectTitle(
  projectId: string,
  userId: string,
  title: string
): Promise<Project> {
  // Implementation
}
```

### 3. Implement Proper Error Handling

```typescript
async someMethod(userId: string) {
  try {
    const { data, error } = await this.supabase
      .from('table')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      trackError(error, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.MEDIUM,
        context: { userId },
      });
      throw new Error(`Failed to fetch data: ${error.message}`);
    }

    return data;
  } catch (error) {
    trackError(error, {
      category: ErrorCategory.DATABASE,
      severity: ErrorSeverity.MEDIUM,
      context: { userId },
    });
    throw error;
  }
}
```

### 4. Validate Input Parameters

```typescript
async getProjectById(projectId: string, userId: string) {
  // Always validate UUIDs
  validateUUID(projectId, 'Project ID');
  validateUUID(userId, 'User ID');

  // Then proceed with logic
  const { data } = await this.supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  return data;
}
```

### 5. Cache Read Operations, Invalidate on Writes

```typescript
// READ: Use cache
async getUserProjects(userId: string): Promise<Project[]> {
  const cacheKey = CacheKeys.userProjects(userId);
  const cached = await cache.get<Project[]>(cacheKey);

  if (cached) {
    return cached;
  }

  const { data } = await this.supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId);

  await cache.set(cacheKey, data, CacheTTL.userProjects);
  return data;
}

// WRITE: Invalidate cache
async createProject(userId: string, options: any): Promise<Project> {
  const { data } = await this.supabase
    .from('projects')
    .insert({ user_id: userId, ...options })
    .select()
    .single();

  // Invalidate user's projects list
  await invalidateUserProjects(userId);

  return data;
}
```

## Caching Strategy

### Cache TTL Guidelines

- **User Profile**: 5 minutes (frequently accessed, rarely changes)
- **User Settings**: 10 minutes (infrequently accessed, rarely changes)
- **User Subscription**: 1 minute (pricing-sensitive data)
- **Project Metadata**: 2 minutes (moderate change frequency)
- **Project Lists**: 2 minutes (frequently updated)
- **Assets**: 5 minutes (rarely change after creation)

### When to Cache

- **Cache**: Read operations that are frequently called
- **Don't Cache**: Real-time data, user-specific generated content
- **Invalidate**: On any write operation that modifies cached data

### Cache Keys

Use the centralized `CacheKeys` object:

```typescript
import { CacheKeys } from '@/lib/cache';

const cacheKey = CacheKeys.userProjects(userId);
const cacheKey = CacheKeys.projectMetadata(projectId);
const cacheKey = CacheKeys.userAssets(userId, projectId);
```

## Error Handling

### Error Categories

```typescript
import { ErrorCategory } from '@/lib/errorTracking';

ErrorCategory.DATABASE; // Database query errors
ErrorCategory.VALIDATION; // Input validation errors
ErrorCategory.AUTH; // Authentication/authorization errors
ErrorCategory.EXTERNAL_SERVICE; // Third-party API errors
ErrorCategory.BUSINESS_LOGIC; // Business rule violations
```

### Error Severity Levels

```typescript
import { ErrorSeverity } from '@/lib/errorTracking';

ErrorSeverity.LOW; // Minor issues, non-blocking
ErrorSeverity.MEDIUM; // Important issues, degraded functionality
ErrorSeverity.HIGH; // Critical issues, blocking operations
ErrorSeverity.CRITICAL; // System-wide failures
```

### Error Tracking Example

```typescript
trackError(error, {
  category: ErrorCategory.DATABASE,
  severity: ErrorSeverity.HIGH,
  context: {
    userId,
    projectId,
    operation: 'updateProject',
    additionalInfo: 'Failed during transaction',
  },
});
```

## Migration Guide

### Migrating Existing API Routes

1. **Identify Business Logic**: Find database queries and business rules in route
2. **Create or Extend Service**: Move logic to appropriate service method
3. **Update Route**: Replace direct database calls with service methods
4. **Add Caching**: Implement caching in service method if applicable
5. **Test**: Verify functionality matches original implementation

### Example Migration

**Before:**

```typescript
export const POST = async (request: NextRequest) => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const body = await request.json();

  const { data, error } = await supabase
    .from('projects')
    .insert({ title: body.title, user_id: user.id })
    .select()
    .single();

  if (error) {
    return errorResponse(error.message, 500);
  }

  await invalidateUserProjects(user.id);

  return successResponse(data);
};
```

**After:**

```typescript
export const POST = async (request: NextRequest) => {
  const supabase = await createServerSupabaseClient();
  const authService = new AuthService(supabase);
  const projectService = new ProjectService(supabase);

  const user = await authService.getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }

  const body = await request.json();

  const project = await projectService.createProject(user.id, {
    title: body.title,
  });

  return successResponse(project);
};
```

## Testing Services

### Unit Testing Example

```typescript
import { ProjectService } from '@/lib/services/projectService';
import { createMockSupabaseClient } from '@/test/helpers';

describe('ProjectService', () => {
  let supabase: any;
  let projectService: ProjectService;

  beforeEach(() => {
    supabase = createMockSupabaseClient();
    projectService = new ProjectService(supabase);
  });

  it('should create a project', async () => {
    const mockProject = {
      id: 'project-id',
      user_id: 'user-id',
      title: 'Test Project',
      timeline_state_jsonb: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    supabase.from().insert().select().single.mockResolvedValue({
      data: mockProject,
      error: null,
    });

    const result = await projectService.createProject('user-id', {
      title: 'Test Project',
    });

    expect(result).toEqual(mockProject);
  });
});
```

## Summary

The service layer provides:

- Clean separation of concerns
- Reusable business logic
- Built-in caching
- Consistent error handling
- Better testability
- Improved maintainability

By following this guide, you can effectively use and extend the service layer to build robust, maintainable API routes.
