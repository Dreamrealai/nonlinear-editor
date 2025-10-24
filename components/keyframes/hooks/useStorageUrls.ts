import { useCallback, useState } from 'react';
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

export interface UseStorageUrlsReturn {
  /** Sign a storage path to create a URL */
  signStoragePath: (storagePath: string, expiresIn?: number) => Promise<string | null>;
  /** Error message if signing failed */
  signError: string | null;
  /** Clear signing error */
  clearSignError: () => void;
}

export function useStorageUrls(): UseStorageUrlsReturn {
  const [signError, setSignError] = useState<string | null>(null);

  const clearSignError = useCallback(() => {
    setSignError(null);
  }, []);

  const signStoragePath = useCallback(async (storagePath: string, expiresIn = 3600) => {
    setSignError(null);

    if (!storagePath) {
      return null;
    }

    if (storagePath.startsWith('http') || storagePath.startsWith('blob:')) {
      return storagePath;
    }

    try {
      parseStoragePathClient(storagePath);
    } catch (error) {
      const errorMessage = 'Invalid storage path';
      setSignError(errorMessage);
      browserLogger.error({ error, storagePath }, errorMessage);
      return null;
    }

    try {
      // Use signed URL cache with request deduplication
      const signedUrl = await signedUrlCache.get(undefined, storagePath, expiresIn);
      return signedUrl;
    } catch (error) {
      const errorMessage = 'Failed to sign storage path';
      setSignError(errorMessage);
      browserLogger.error({ error, storagePath }, errorMessage);
      return null;
    }
  }, []);

  return { signStoragePath, signError, clearSignError };
}
