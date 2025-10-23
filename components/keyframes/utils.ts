export interface AssetRow {
  id: string;
  title?: string | null;
  storage_url: string;
  metadata: Record<string, unknown> | null;
}

export const getAssetLabel = (asset: AssetRow) => {
  const meta = asset.metadata as { filename?: string } | null;
  return meta?.filename ?? asset.title ?? asset.id;
};

export const formatMs = (ms: number) => {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export function parseStoragePathClient(storagePath: string): { bucket: string; key: string } {
  const clean = storagePath.replace('supabase://', '');
  const [bucket, ...keyParts] = clean.split('/');
  const key = keyParts.join('/');
  if (!bucket || !key) {
    throw new Error(`Invalid storage path: ${storagePath}`);
  }
  return { bucket, key };
}
