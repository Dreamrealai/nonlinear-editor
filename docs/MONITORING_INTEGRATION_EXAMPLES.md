# Monitoring and Analytics Integration Examples

> **Practical examples demonstrating how to integrate Sentry error tracking and PostHog analytics in common scenarios.**

**Last Updated:** October 24, 2025

---

## Table of Contents

1. [API Route Example](#api-route-example)
2. [Client Component Example](#client-component-example)
3. [AI Generation Example](#ai-generation-example)
4. [Form Submission Example](#form-submission-example)
5. [File Upload Example](#file-upload-example)
6. [User Authentication Example](#user-authentication-example)
7. [Performance Monitoring Example](#performance-monitoring-example)
8. [Error Handling Example](#error-handling-example)

---

## API Route Example

Complete example showing error tracking, analytics, and performance monitoring in an API route:

```typescript
// app/api/video/generate/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { captureError, addBreadcrumb, BreadcrumbCategory, setContext } from '@/lib/sentry';
import { trackError, ErrorCategory, ErrorSeverity } from '@/lib/errorTracking';
import { validateRequired, validateString, validateEnum } from '@/lib/validation';

export async function POST(request: Request) {
  const startTime = Date.now();
  const supabase = await createServerClient();

  try {
    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      // Track unauthorized access attempt
      addBreadcrumb({
        message: 'Unauthorized API access attempt',
        category: BreadcrumbCategory.AUTH,
        level: 'warning',
      });

      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse and validate request
    const body = await request.json();

    addBreadcrumb({
      message: 'Validating video generation parameters',
      category: BreadcrumbCategory.VIDEO,
      data: {
        hasPrompt: !!body.prompt,
        duration: body.duration,
      },
    });

    validateRequired(body.prompt, 'Prompt');
    validateString(body.prompt, 'Prompt', { minLength: 3, maxLength: 1000 });
    validateEnum(body.duration, 'Duration', [5, 10] as const);

    // 3. Set context for error tracking
    setContext('video_generation', {
      userId: user.id,
      prompt: body.prompt,
      duration: body.duration,
      provider: 'fal',
    });

    // 4. Call AI service
    addBreadcrumb({
      message: 'Calling FAL API for video generation',
      category: BreadcrumbCategory.API,
      level: 'info',
    });

    const result = await generateVideo({
      prompt: body.prompt,
      duration: body.duration,
    });

    // 5. Track success metrics
    const duration = Date.now() - startTime;

    addBreadcrumb({
      message: 'Video generation completed successfully',
      category: BreadcrumbCategory.VIDEO,
      data: {
        videoId: result.id,
        duration_ms: duration,
      },
    });

    // Note: Analytics tracked on client-side after success response
    // This prevents blocking the API response

    return NextResponse.json({ video: result });

  } catch (error) {
    const duration = Date.now() - startTime;

    // Track error with full context
    captureError(error, {
      tags: {
        operation: 'video_generation',
        provider: 'fal',
        errorType: 'generation_failed',
      },
      context: {
        userId: user?.id,
        duration_ms: duration,
        endpoint: '/api/video/generate',
      },
      level: 'error',
    });

    // Also track in error tracking service
    trackError(error, {
      category: ErrorCategory.EXTERNAL_SERVICE,
      severity: ErrorSeverity.HIGH,
      userId: user?.id,
      context: {
        endpoint: '/api/video/generate',
        duration_ms: duration,
      },
    });

    // Return user-friendly error
    return NextResponse.json(
      { error: 'Failed to generate video' },
      { status: 500 }
    );
  }
}
```

---

## Client Component Example

Example showing client-side error tracking and analytics:

```typescript
// components/VideoGenerator.tsx
'use client';

import { useState } from 'react';
import { analyticsService, AnalyticsEvents } from '@/lib/services/analyticsService';
import { addBreadcrumb, BreadcrumbCategory, captureError } from '@/lib/sentry';
import { trackUserAction } from '@/lib/sentry';

export function VideoGenerator() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    const startTime = Date.now();

    try {
      // Track user action (Sentry breadcrumb)
      trackUserAction({
        action: 'generate_video_clicked',
        category: BreadcrumbCategory.VIDEO,
        data: {
          promptLength: prompt.length,
          location: 'video_gen_page',
        },
      });

      // Track analytics event (PostHog)
      analyticsService.track(AnalyticsEvents.AI_GENERATION_STARTED, {
        type: 'video',
        prompt_length: prompt.length,
        timestamp: new Date().toISOString(),
      });

      setLoading(true);

      // Add breadcrumb before API call
      addBreadcrumb({
        message: 'Calling video generation API',
        category: BreadcrumbCategory.API,
        data: { endpoint: '/api/video/generate' },
      });

      const response = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, duration: 5 }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      // Track success
      addBreadcrumb({
        message: 'Video generation succeeded',
        category: BreadcrumbCategory.VIDEO,
        level: 'info',
        data: { videoId: data.video.id, duration_ms: duration },
      });

      analyticsService.track(AnalyticsEvents.AI_GENERATION_COMPLETED, {
        type: 'video',
        video_id: data.video.id,
        duration_ms: duration,
        prompt_length: prompt.length,
      });

      toast.success('Video generated successfully!');
      onSuccess(data.video);

    } catch (error) {
      const duration = Date.now() - startTime;

      // Track error with context
      captureError(error, {
        tags: {
          component: 'VideoGenerator',
          action: 'generate_video',
        },
        context: {
          promptLength: prompt.length,
          duration_ms: duration,
        },
        level: 'error',
      });

      // Track analytics
      analyticsService.track(AnalyticsEvents.AI_GENERATION_FAILED, {
        type: 'video',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: duration,
        prompt_length: prompt.length,
      });

      toast.error('Failed to generate video');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe your video..."
      />
      <button
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
      >
        {loading ? 'Generating...' : 'Generate Video'}
      </button>
    </div>
  );
}
```

---

## AI Generation Example

Complete AI generation flow with monitoring:

```typescript
// lib/services/videoGenerationService.ts
import { captureError, addBreadcrumb, BreadcrumbCategory, setContext, startTransaction } from '@/lib/sentry';
import { analyticsService, AnalyticsEvents } from '@/lib/services/analyticsService';

export async function generateVideoWithMonitoring(params: {
  prompt: string;
  duration: number;
  userId: string;
  projectId: string;
}) {
  // Start performance transaction
  const transaction = startTransaction({
    name: 'video_generation',
    op: 'ai.generate',
    data: {
      provider: 'fal',
      duration: params.duration,
    },
  });

  const startTime = Date.now();

  try {
    // Set context for error tracking
    setContext('video_params', {
      prompt: params.prompt,
      duration: params.duration,
      userId: params.userId,
      projectId: params.projectId,
    });

    // Track generation start
    addBreadcrumb({
      message: 'Starting video generation',
      category: BreadcrumbCategory.VIDEO,
      data: {
        provider: 'fal',
        duration: params.duration,
      },
    });

    // Call FAL API
    addBreadcrumb({
      message: 'Calling FAL API',
      category: BreadcrumbCategory.API,
      level: 'info',
    });

    const result = await callFalAPI(params);

    // Track polling
    addBreadcrumb({
      message: 'Polling for video status',
      category: BreadcrumbCategory.API,
      data: { requestId: result.request_id },
    });

    const video = await pollForCompletion(result.request_id);

    const duration = Date.now() - startTime;

    // Track success
    addBreadcrumb({
      message: 'Video generation completed',
      category: BreadcrumbCategory.VIDEO,
      level: 'info',
      data: {
        videoId: video.id,
        duration_ms: duration,
      },
    });

    transaction?.setStatus('ok');

    return {
      success: true,
      video,
      metadata: {
        duration_ms: duration,
        provider: 'fal',
      },
    };

  } catch (error) {
    const duration = Date.now() - startTime;

    // Determine error type
    const errorType = error instanceof TimeoutError
      ? 'timeout'
      : error instanceof RateLimitError
      ? 'rate_limit'
      : 'generation_failed';

    // Track error
    captureError(error, {
      tags: {
        operation: 'video_generation',
        provider: 'fal',
        errorType,
      },
      context: {
        userId: params.userId,
        projectId: params.projectId,
        duration_ms: duration,
        params,
      },
      level: errorType === 'timeout' ? 'warning' : 'error',
    });

    transaction?.setStatus('error');

    throw error;

  } finally {
    transaction?.finish();
  }
}
```

---

## Form Submission Example

Example with validation, error tracking, and analytics:

```typescript
// components/ProjectForm.tsx
'use client';

import { useState } from 'react';
import { analyticsService, AnalyticsEvents } from '@/lib/services/analyticsService';
import { addBreadcrumb, BreadcrumbCategory, captureError, trackUserAction } from '@/lib/sentry';

export function ProjectForm() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Track form submission attempt
    trackUserAction({
      action: 'project_form_submitted',
      category: BreadcrumbCategory.PROJECT,
      data: {
        hasName: !!name,
        hasDescription: !!description,
      },
    });

    // Client-side validation
    const validationErrors: Record<string, string> = {};

    if (!name.trim()) {
      validationErrors.name = 'Name is required';
    } else if (name.length > 100) {
      validationErrors.name = 'Name must be at most 100 characters';
    }

    if (description.length > 1000) {
      validationErrors.description = 'Description must be at most 1000 characters';
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);

      // Track validation errors
      analyticsService.track('form_validation_failed', {
        form: 'project_create',
        errors: Object.keys(validationErrors),
      });

      return;
    }

    try {
      addBreadcrumb({
        message: 'Creating project',
        category: BreadcrumbCategory.API,
        data: { name, hasDescription: !!description },
      });

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create project');
      }

      const data = await response.json();

      // Track success
      analyticsService.track(AnalyticsEvents.PROJECT_CREATED, {
        project_id: data.project.id,
        has_description: !!description,
        name_length: name.length,
      });

      addBreadcrumb({
        message: 'Project created successfully',
        category: BreadcrumbCategory.PROJECT,
        level: 'info',
        data: { projectId: data.project.id },
      });

      toast.success('Project created!');
      router.push(`/editor/${data.project.id}`);

    } catch (error) {
      // Track error
      captureError(error, {
        tags: {
          component: 'ProjectForm',
          action: 'create_project',
        },
        context: {
          nameLength: name.length,
          hasDescription: !!description,
        },
        level: 'error',
      });

      analyticsService.track('api_error', {
        endpoint: '/api/projects',
        method: 'POST',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      toast.error('Failed to create project');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="name">Project Name</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
        />
        {errors.name && <span className="error">{errors.name}</span>}
      </div>

      <div>
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
        />
        {errors.description && <span className="error">{errors.description}</span>}
      </div>

      <button type="submit">Create Project</button>
    </form>
  );
}
```

---

## File Upload Example

Example showing file upload with validation and monitoring:

```typescript
// components/AssetUploader.tsx
'use client';

import { useState } from 'react';
import { analyticsService, AnalyticsEvents } from '@/lib/services/analyticsService';
import { addBreadcrumb, BreadcrumbCategory, captureError, setContext } from '@/lib/sentry';
import { trackPerformance } from '@/lib/errorTracking';

export function AssetUploader({ projectId }: { projectId: string }) {
  const [uploading, setUploading] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const startTime = Date.now();

    try {
      // Validate file
      addBreadcrumb({
        message: 'Validating file upload',
        category: BreadcrumbCategory.STORAGE,
        data: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        },
      });

      // Client-side validation
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        throw new Error('File size exceeds 100MB limit');
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type');
      }

      // Set context for error tracking
      setContext('file_upload', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        projectId,
      });

      // Track upload start
      analyticsService.track(AnalyticsEvents.ASSET_UPLOADED, {
        file_type: file.type,
        file_size: file.size,
        project_id: projectId,
        status: 'started',
      });

      setUploading(true);

      // Upload file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);

      addBreadcrumb({
        message: 'Uploading file to server',
        category: BreadcrumbCategory.API,
        data: { endpoint: '/api/assets/upload' },
      });

      const response = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      // Track performance
      trackPerformance('asset_upload', duration, {
        fileSize: file.size,
        fileType: file.type,
      });

      // Track success
      addBreadcrumb({
        message: 'File uploaded successfully',
        category: BreadcrumbCategory.STORAGE,
        level: 'info',
        data: {
          assetId: data.asset.id,
          duration_ms: duration,
        },
      });

      analyticsService.track(AnalyticsEvents.ASSET_UPLOADED, {
        asset_id: data.asset.id,
        file_type: file.type,
        file_size: file.size,
        duration_ms: duration,
        project_id: projectId,
        status: 'completed',
      });

      toast.success('File uploaded successfully!');

    } catch (error) {
      const duration = Date.now() - startTime;

      // Track error
      captureError(error, {
        tags: {
          component: 'AssetUploader',
          action: 'file_upload',
        },
        context: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          duration_ms: duration,
          projectId,
        },
        level: 'error',
      });

      analyticsService.track('asset_upload_failed', {
        file_type: file.type,
        file_size: file.size,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: duration,
      });

      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input
        type="file"
        onChange={handleFileUpload}
        disabled={uploading}
        accept="image/*,video/mp4"
      />
      {uploading && <p>Uploading...</p>}
    </div>
  );
}
```

---

## User Authentication Example

Example showing auth flow with monitoring:

```typescript
// components/SignInForm.tsx
'use client';

import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { analyticsService, AnalyticsEvents } from '@/lib/services/analyticsService';
import { addBreadcrumb, BreadcrumbCategory, captureError, setUserContext } from '@/lib/sentry';

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Track sign-in attempt
      addBreadcrumb({
        message: 'User attempting to sign in',
        category: BreadcrumbCategory.AUTH,
        data: { email },
      });

      const supabase = createBrowserSupabaseClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error('No user returned');
      }

      // Set user context for future errors
      setUserContext({
        id: data.user.id,
        email: data.user.email,
      });

      // Identify user in analytics
      analyticsService.identify(data.user.id, {
        email: data.user.email,
        signedInAt: new Date().toISOString(),
      });

      // Track successful sign-in
      analyticsService.track(AnalyticsEvents.USER_SIGNED_IN, {
        method: 'email_password',
        timestamp: new Date().toISOString(),
      });

      addBreadcrumb({
        message: 'User signed in successfully',
        category: BreadcrumbCategory.AUTH,
        level: 'info',
        data: { userId: data.user.id },
      });

      toast.success('Signed in successfully!');
      router.push('/dashboard');

    } catch (error) {
      // Track sign-in failure
      captureError(error, {
        tags: {
          component: 'SignInForm',
          action: 'sign_in',
          method: 'email_password',
        },
        context: {
          email, // Safe to log email in error context
        },
        level: 'warning', // Auth errors are warnings, not critical
      });

      analyticsService.track('sign_in_failed', {
        method: 'email_password',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      toast.error(error instanceof Error ? error.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSignIn}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
```

---

## Performance Monitoring Example

Example showing detailed performance tracking:

```typescript
// lib/monitoring/performanceMonitor.ts
import { startTransaction, addBreadcrumb, BreadcrumbCategory } from '@/lib/sentry';
import { trackPerformance } from '@/lib/errorTracking';
import { analyticsService } from '@/lib/services/analyticsService';

export class PerformanceMonitor {
  private transaction: ReturnType<typeof startTransaction>;
  private startTime: number;
  private operationName: string;

  constructor(operationName: string, op: string, metadata?: Record<string, unknown>) {
    this.operationName = operationName;
    this.startTime = Date.now();

    // Start Sentry transaction
    this.transaction = startTransaction({
      name: operationName,
      op,
      data: metadata,
    });

    // Add breadcrumb
    addBreadcrumb({
      message: `Started operation: ${operationName}`,
      category: BreadcrumbCategory.API,
      level: 'info',
      data: metadata,
    });
  }

  /**
   * Mark a checkpoint in the operation
   */
  checkpoint(name: string, data?: Record<string, unknown>) {
    const elapsed = Date.now() - this.startTime;

    addBreadcrumb({
      message: `Checkpoint: ${name}`,
      category: BreadcrumbCategory.API,
      level: 'debug',
      data: {
        ...data,
        elapsed_ms: elapsed,
      },
    });
  }

  /**
   * Complete the operation successfully
   */
  complete(metadata?: Record<string, unknown>) {
    const duration = Date.now() - this.startTime;

    this.transaction?.setStatus('ok');
    this.transaction?.finish();

    // Track performance metric
    trackPerformance(this.operationName, duration, metadata);

    // Track in analytics
    analyticsService.track('operation_completed', {
      operation: this.operationName,
      duration_ms: duration,
      ...metadata,
    });

    addBreadcrumb({
      message: `Completed operation: ${this.operationName}`,
      category: BreadcrumbCategory.API,
      level: 'info',
      data: {
        duration_ms: duration,
        ...metadata,
      },
    });

    return duration;
  }

  /**
   * Mark the operation as failed
   */
  fail(error: unknown, metadata?: Record<string, unknown>) {
    const duration = Date.now() - this.startTime;

    this.transaction?.setStatus('error');
    this.transaction?.finish();

    addBreadcrumb({
      message: `Failed operation: ${this.operationName}`,
      category: BreadcrumbCategory.ERROR,
      level: 'error',
      data: {
        duration_ms: duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        ...metadata,
      },
    });

    return duration;
  }
}

// Usage Example
export async function monitoredVideoGeneration(params: VideoGenerationParams) {
  const monitor = new PerformanceMonitor('video_generation', 'ai.generate', {
    provider: 'fal',
    duration: params.duration,
  });

  try {
    // Validate parameters
    monitor.checkpoint('validation');
    validateParams(params);

    // Call API
    monitor.checkpoint('api_call');
    const result = await callFalAPI(params);

    // Poll for completion
    monitor.checkpoint('polling', { requestId: result.request_id });
    const video = await pollForCompletion(result.request_id);

    // Complete successfully
    const duration = monitor.complete({
      videoId: video.id,
      videoUrl: video.url,
    });

    return { video, duration };

  } catch (error) {
    monitor.fail(error);
    throw error;
  }
}
```

---

## Error Handling Example

Comprehensive error handling with monitoring:

```typescript
// lib/errors/errorHandler.ts
import { captureError, addBreadcrumb, BreadcrumbCategory } from '@/lib/sentry';
import { trackError, ErrorCategory, ErrorSeverity } from '@/lib/errorTracking';
import { analyticsService } from '@/lib/services/analyticsService';

export class ApplicationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export function handleError(
  error: unknown,
  context: {
    component?: string;
    action?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  }
) {
  // Determine error type
  const errorType = error instanceof ApplicationError
    ? error.code
    : error instanceof TypeError
    ? 'type_error'
    : error instanceof SyntaxError
    ? 'syntax_error'
    : 'unknown_error';

  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  // Track in Sentry
  captureError(error, {
    tags: {
      component: context.component || 'unknown',
      action: context.action || 'unknown',
      errorType,
    },
    context: {
      ...context.metadata,
      userId: context.userId,
    },
    level: error instanceof ApplicationError && error.statusCode < 500
      ? 'warning'
      : 'error',
  });

  // Track in error tracking service
  trackError(error, {
    category: ErrorCategory.CLIENT,
    severity: error instanceof ApplicationError && error.statusCode < 500
      ? ErrorSeverity.MEDIUM
      : ErrorSeverity.HIGH,
    userId: context.userId,
    context: context.metadata,
  });

  // Track in analytics
  analyticsService.track('error_occurred', {
    error_type: errorType,
    error_message: errorMessage,
    component: context.component,
    action: context.action,
  });

  // Add breadcrumb for context
  addBreadcrumb({
    message: `Error in ${context.component}: ${errorMessage}`,
    category: BreadcrumbCategory.ERROR,
    level: 'error',
    data: {
      errorType,
      ...context.metadata,
    },
  });

  // Return user-friendly message
  if (error instanceof ApplicationError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  return {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
  };
}
```

---

## Additional Resources

- [Analytics and Monitoring Guide](/docs/ANALYTICS_AND_MONITORING.md)
- [Error Tracking Utilities](/lib/sentry.ts)
- [Analytics Service](/lib/services/analyticsService.ts)
- [Error Tracking Service](/lib/errorTracking.ts)

---

**Remember:** Good monitoring provides visibility into your application's health and user experience. Track errors comprehensively, monitor performance carefully, and use analytics to drive product decisions.
