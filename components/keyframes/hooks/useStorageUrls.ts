import { useCallback } from 'react';
import { browserLogger } from '@/lib/browserLogger';
import { signedUrlCache } from '@/lib/signedUrlCache';

function parseStoragePathClient(storagePath: string): { bucket: string; key: string } {
  const clean = storagePath.replace('supabase://', '');
  const [bucket, ...keyParts] = clean.split('/');
  const key = keyParts.join('/');
  if (!bucket || !key) {
    throw new Error(`Invalid storage path: ${storagePath}`);
  }
  return { bucket, key };
}

export function useStorageUrls() {
  const signStoragePath = useCallback(async (storagePath: string, expiresIn = 3600) => {
    if (!storagePath) {
      return null;
    }

    if (storagePath.startsWith('http') || storagePath.startsWith('blob:')) {
      return storagePath;
    }

    try {
      parseStoragePathClient(storagePath);
    } catch (error) {
      browserLogger.error({ error, storagePath }, 'Invalid storage path');
      return null;
    }

    try {
      // Use signed URL cache with request deduplication
      const signedUrl = await signedUrlCache.get(undefined, storagePath, expiresIn);
      return signedUrl;
    } catch (error) {
      browserLogger.error({ error, storagePath }, 'Failed to sign storage path');
      return null;
    }
  }, []);

  return { signStoragePath };
}
