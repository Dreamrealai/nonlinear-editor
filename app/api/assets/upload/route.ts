import { ensureHttpsProtocol } from '@/lib/supabase';
import crypto from 'crypto';
import sanitize from 'sanitize-filename';
import { serverLogger } from '@/lib/serverLogger';
import { badRequestResponse, errorResponse, successResponse } from '@/lib/api/response';
import { validateUUID, validateEnum, validateAll } from '@/lib/api/validation';
import { withAuth } from '@/lib/api/withAuth';
import type { AuthenticatedHandler } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';

const VALID_ASSET_TYPES = ['image', 'video', 'audio'] as const;

/**
 * Upload a media file (image, video, or audio) to a project.
 *
 * Uploads a file to Supabase storage and creates an asset record in the database.
 * Files are stored in user-specific folders and validated for type and size.
 *
 * @route POST /api/assets/upload
 *
 * @param {File} request.formData.file - The file to upload (max 100MB)
 * @param {string} request.formData.projectId - UUID of the project to upload to
 * @param {string} request.formData.type - Asset type ('image', 'video', or 'audio')
 *
 * @returns {object} Upload result with asset details
 * @returns {string} returns.assetId - UUID of the created asset
 * @returns {string} returns.storageUrl - Internal storage URL (supabase://assets/...)
 * @returns {string} returns.publicUrl - Public HTTPS URL to access the file
 * @returns {boolean} returns.success - Always true on success
 *
 * @throws {401} Unauthorized - User not authenticated
 * @throws {403} Forbidden - User doesn't own the specified project
 * @throws {400} Bad Request - No file provided, invalid project ID, or invalid type
 * @throws {413} Payload Too Large - File exceeds 100MB limit
 * @throws {415} Unsupported Media Type - File MIME type not allowed for asset type
 * @throws {429} Too Many Requests - Rate limit exceeded (10 requests per minute)
 * @throws {500} Internal Server Error - Storage or database error
 *
 * @ratelimit 10 requests per minute (TIER 2 - Resource Creation)
 *
 * @authentication Required - Session cookie (supabase-auth-token)
 *
 * @security
 * - File size limited to 100MB
 * - MIME type validation per asset type
 * - Ownership verification for project access
 * - Unique filenames with UUID to prevent collisions
 * - Original filename sanitized to prevent path traversal attacks
 *
 * Allowed MIME types:
 * - image: image/jpeg, image/png, image/gif, image/webp, image/avif
 * - video: video/mp4, video/webm, video/quicktime, video/x-msvideo
 * - audio: audio/mpeg, audio/wav, audio/ogg, audio/webm
 *
 * @example
 * POST /api/assets/upload
 * Content-Type: multipart/form-data
 *
 * FormData:
 * - file: [binary file data]
 * - projectId: "123e4567-e89b-12d3-a456-426614174000"
 * - type: "video"
 *
 * Response:
 * {
 *   "assetId": "789e4567-e89b-12d3-a456-426614174000",
 *   "storageUrl": "supabase://assets/user-id/project-id/video/uuid.mp4",
 *   "publicUrl": "https://storage.example.com/assets/user-id/project-id/video/uuid.mp4",
 *   "success": true
 * }
 */
const handleAssetUpload: AuthenticatedHandler = async (request, { user, supabase }) => {
  const startTime = Date.now();

  serverLogger.info(
    {
      event: 'assets.upload.request_started',
      userId: user.id,
    },
    'Asset upload request received'
  );

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const projectId = (formData.get('projectId') as string) || '';
  const type = (formData.get('type') as string) || 'image';

  serverLogger.debug(
    {
      event: 'assets.upload.file_received',
      userId: user.id,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      assetType: type,
      projectId,
    },
    'Upload file received'
  );

  if (!file) {
    serverLogger.warn(
      {
        event: 'assets.upload.no_file',
        userId: user.id,
      },
      'No file provided in upload request'
    );
    return badRequestResponse('No file provided');
  }

  if (!projectId) {
    serverLogger.warn(
      {
        event: 'assets.upload.no_project',
        userId: user.id,
      },
      'No project ID provided'
    );
    return badRequestResponse('Project ID required');
  }

  // Validate inputs
  const validation = validateAll([
    validateUUID(projectId, 'projectId'),
    validateEnum(type, 'type', VALID_ASSET_TYPES, false),
  ]);

  if (!validation.valid) {
    return errorResponse(
      validation.errors[0]?.message ?? 'Invalid input',
      400,
      validation.errors[0]?.field
    );
  }

  // SECURITY: Verify user owns the project
  const { verifyProjectOwnership } = await import('@/lib/api/project-verification');
  const projectVerification = await verifyProjectOwnership(supabase, projectId, user.id, 'id');

  if (!projectVerification.hasAccess) {
    serverLogger.warn(
      {
        event: 'assets.upload.project_not_found',
        userId: user.id,
        projectId,
        error: projectVerification.error,
      },
      'Project not found or unauthorized'
    );
    return errorResponse(projectVerification.error!, projectVerification.status!);
  }

  // SECURITY: File size validation (100MB max)
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  if (file.size > MAX_FILE_SIZE) {
    serverLogger.warn(
      {
        event: 'assets.upload.file_too_large',
        userId: user.id,
        projectId,
        fileSize: file.size,
        maxSize: MAX_FILE_SIZE,
        fileName: file.name,
      },
      `File size ${file.size} exceeds maximum ${MAX_FILE_SIZE}`
    );
    return badRequestResponse('File too large - maximum file size is 100MB');
  }

  // SECURITY: MIME type validation
  const ALLOWED_MIME_TYPES = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'],
    video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
  };

  const allowedTypes =
    ALLOWED_MIME_TYPES[type as keyof typeof ALLOWED_MIME_TYPES] || ALLOWED_MIME_TYPES.image;
  if (!allowedTypes.includes(file.type)) {
    serverLogger.warn(
      {
        event: 'assets.upload.invalid_mime_type',
        userId: user.id,
        projectId,
        fileType: file.type,
        assetType: type,
        allowedTypes,
      },
      `Invalid MIME type ${file.type} for asset type ${type}`
    );
    return badRequestResponse(
      `Invalid file type. Allowed types for ${type}: ${allowedTypes.join(', ')}`
    );
  }

  // Generate unique filename with safe extension fallback
  const originalName = (file.name || '').trim();
  const extFromName = originalName.includes('.') ? originalName.split('.').pop() : '';
  const extFromMime = file.type?.split('/')[1];
  const resolvedExt = (extFromName || extFromMime || 'bin').replace(/[^a-zA-Z0-9]/g, '');
  const fileName = `${crypto.randomUUID()}.${resolvedExt}`;
  const folder = type === 'audio' ? 'audio' : type === 'video' ? 'video' : 'image';
  const filePath = `${user.id}/${projectId}/${folder}/${fileName}`;

  serverLogger.debug(
    {
      event: 'assets.upload.uploading_to_storage',
      userId: user.id,
      projectId,
      filePath,
      fileSize: file.size,
      folder,
    },
    'Uploading file to storage'
  );

  // Convert File to ArrayBuffer then to Buffer for upload
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to Supabase storage
  const { error: uploadError } = await supabase.storage.from('assets').upload(filePath, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    serverLogger.error(
      {
        event: 'assets.upload.storage_error',
        userId: user.id,
        projectId,
        filePath,
        error: uploadError.message,
        code: uploadError.name,
      },
      'Failed to upload file to storage'
    );
    return errorResponse(uploadError.message, 500);
  }

  serverLogger.debug(
    {
      event: 'assets.upload.storage_success',
      userId: user.id,
      projectId,
      filePath,
      fileSize: file.size,
    },
    'File uploaded to storage successfully'
  );

  // Get public URL and ensure it has the https:// protocol
  const {
    data: { publicUrl: rawPublicUrl },
  } = supabase.storage.from('assets').getPublicUrl(filePath);
  const publicUrl = ensureHttpsProtocol(rawPublicUrl);

  // Get image dimensions if it's an image
  // Note: In a production app, you might want to use an image processing library
  // to extract actual dimensions. For now, we'll leave them null.
  const width: number | null = null;
  const height: number | null = null;

  // Create asset record in database (schema alignment)
  const assetId = crypto.randomUUID();
  const storageUrl = `supabase://assets/${filePath}`;

  // SECURITY: Sanitize the original filename to prevent path traversal attacks
  // This removes dangerous characters like '../', '\', and null bytes that could be used
  // to escape the intended directory or cause filesystem issues. The actual stored file
  // uses a UUID-based name for security, but we sanitize the display name in metadata.
  const sanitizedOriginalName = sanitize(originalName || fileName);

  const { error: dbError } = await supabase.from('assets').insert({
    id: assetId,
    project_id: projectId,
    user_id: user.id,
    storage_url: storageUrl,
    type,
    mime_type: file.type,
    width,
    height,
    source: 'upload',
    metadata: {
      filename: sanitizedOriginalName,
      mimeType: file.type,
      sourceUrl: publicUrl,
      size: file.size,
    },
  });

  if (dbError) {
    serverLogger.error(
      {
        event: 'assets.upload.db_error',
        userId: user.id,
        projectId,
        assetId,
        filePath,
        error: dbError.message,
        code: dbError.code,
      },
      'Failed to create asset record in database'
    );
    // Try to delete the uploaded file
    await supabase.storage.from('assets').remove([filePath]);
    return errorResponse(dbError.message, 500);
  }

  const duration = Date.now() - startTime;
  serverLogger.info(
    {
      event: 'assets.upload.success',
      userId: user.id,
      projectId,
      assetId,
      assetType: type,
      fileSize: file.size,
      fileName: file.name,
      mimeType: file.type,
      storageUrl,
      duration,
    },
    `Asset uploaded successfully in ${duration}ms`
  );

  // Log to activity history
  const activityTypeMap: Record<string, string> = {
    image: 'image_upload',
    video: 'video_upload',
    audio: 'audio_upload',
  };

  await supabase.from('user_activity_history').insert({
    user_id: user.id,
    project_id: projectId,
    activity_type: activityTypeMap[type] || 'image_upload',
    title: sanitizedOriginalName,
    description: `Uploaded ${type}`,
    asset_id: assetId,
    metadata: {
      fileSize: file.size,
      mimeType: file.type,
    },
  });

  return successResponse({
    assetId,
    storageUrl,
    publicUrl,
    success: true,
  });
};

export const POST = withAuth(handleAssetUpload, {
  route: '/api/assets/upload',
  rateLimit: RATE_LIMITS.tier2_resource_creation,
});
