/**
 * AssetSkeleton - Loading placeholder components for assets
 *
 * Provides skeleton screens while assets are loading to improve
 * perceived performance and user experience.
 *
 * @module components/AssetSkeleton
 */
'use client';

/**
 * Base skeleton component with pulsing animation
 */
function SkeletonBase({
  className = '',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={`animate-pulse rounded bg-neutral-200 ${className}`} style={style} />;
}

/**
 * Skeleton for asset thumbnail in grid view
 *
 * @example
 * ```tsx
 * {isLoading ? <AssetThumbnailSkeleton /> : <AssetThumbnail asset={asset} />}
 * ```
 */
export function AssetThumbnailSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <SkeletonBase className="aspect-video w-full" />
      <div className="p-3">
        <SkeletonBase className="mb-2 h-4 w-3/4" />
        <SkeletonBase className="h-3 w-1/2" />
      </div>
    </div>
  );
}

/**
 * Skeleton for asset card in list view
 *
 * @example
 * ```tsx
 * {isLoading ? <AssetCardSkeleton /> : <AssetCard asset={asset} />}
 * ```
 */
export function AssetCardSkeleton() {
  return (
    <div className="flex gap-3 rounded-lg border border-neutral-200 bg-white p-3">
      <SkeletonBase className="h-16 w-16 flex-shrink-0 rounded" />
      <div className="flex-1">
        <SkeletonBase className="mb-2 h-4 w-1/2" />
        <SkeletonBase className="mb-1 h-3 w-1/3" />
        <SkeletonBase className="h-3 w-1/4" />
      </div>
    </div>
  );
}

/**
 * Skeleton for asset preview in modal/detail view
 *
 * @example
 * ```tsx
 * {isLoading ? <AssetPreviewSkeleton /> : <AssetPreview asset={asset} />}
 * ```
 */
export function AssetPreviewSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonBase className="aspect-video w-full rounded-lg" />
      <div className="space-y-2">
        <SkeletonBase className="h-6 w-2/3" />
        <SkeletonBase className="h-4 w-1/2" />
        <SkeletonBase className="h-4 w-3/4" />
      </div>
    </div>
  );
}

/**
 * Skeleton for asset grid (multiple thumbnails)
 *
 * @param count - Number of skeleton items to show (default: 6)
 *
 * @example
 * ```tsx
 * {isLoading ? <AssetGridSkeleton count={9} /> : <AssetGrid assets={assets} />}
 * ```
 */
export function AssetGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <AssetThumbnailSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for asset list (multiple cards)
 *
 * @param count - Number of skeleton items to show (default: 5)
 *
 * @example
 * ```tsx
 * {isLoading ? <AssetListSkeleton count={10} /> : <AssetList assets={assets} />}
 * ```
 */
export function AssetListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <AssetCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Inline skeleton for asset name/metadata
 *
 * Useful for showing loading state in compact spaces
 *
 * @example
 * ```tsx
 * {isLoading ? <AssetInlineSkeleton /> : <span>{asset.name}</span>}
 * ```
 */
export function AssetInlineSkeleton({ width = '100px' }: { width?: string }) {
  return <SkeletonBase className="inline-block h-4" style={{ width }} />;
}

/**
 * Skeleton for asset panel header
 *
 * @example
 * ```tsx
 * {isLoading ? <AssetPanelHeaderSkeleton /> : <AssetPanelHeader />}
 * ```
 */
export function AssetPanelHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between border-b border-neutral-200 p-4">
      <div className="flex items-center gap-3">
        <SkeletonBase className="h-8 w-32" />
        <SkeletonBase className="h-6 w-16" />
      </div>
      <div className="flex gap-2">
        <SkeletonBase className="h-9 w-24" />
        <SkeletonBase className="h-9 w-9" />
      </div>
    </div>
  );
}

/**
 * Full asset panel skeleton with header and grid
 *
 * @example
 * ```tsx
 * {isLoading ? <AssetPanelSkeleton /> : <AssetPanel assets={assets} />}
 * ```
 */
export function AssetPanelSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <AssetPanelHeaderSkeleton />
      <div className="flex-1 overflow-auto p-4">
        <AssetGridSkeleton count={6} />
      </div>
    </div>
  );
}
