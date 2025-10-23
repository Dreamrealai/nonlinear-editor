import { useCallback } from 'react';
import { browserLogger } from '@/lib/browserLogger';

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
      const params = new URLSearchParams({ storageUrl: storagePath });
      if (Number.isFinite(expiresIn) && expiresIn > 0) {
        params.set('ttl', Math.round(expiresIn).toString());
      }
      const response = await fetch(`/api/assets/sign?${params.toString()}`);
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        browserLogger.error({ storagePath, status: response.status, detail }, 'Failed to sign storage path');
        return null;
      }
      const payload = (await response.json()) as { signedUrl?: string };
      return payload.signedUrl ?? null;
    } catch (error) {
      browserLogger.error({ error, storagePath }, 'Failed to sign storage path');
      return null;
    }
  }, []);

  return { signStoragePath };
}
