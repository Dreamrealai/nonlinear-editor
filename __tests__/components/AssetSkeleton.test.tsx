/**
 * Tests for AssetSkeleton Components
 *
 * Tests loading placeholder components for assets
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  AssetThumbnailSkeleton,
  AssetCardSkeleton,
  AssetPreviewSkeleton,
  AssetGridSkeleton,
  AssetListSkeleton,
  AssetInlineSkeleton,
  AssetPanelHeaderSkeleton,
  AssetPanelSkeleton,
} from '@/components/AssetSkeleton';

describe('AssetSkeleton Components', () => {
  describe('AssetThumbnailSkeleton', () => {
    it('renders thumbnail skeleton with correct structure', () => {
      const { container } = render(<AssetThumbnailSkeleton />);

      const card = container.querySelector('.rounded-lg.border');
      expect(card).toBeInTheDocument();
    });

    it('has pulsing animation on skeleton elements', () => {
      const { container } = render(<AssetThumbnailSkeleton />);

      const pulsingElements = container.querySelectorAll('.animate-pulse');
      expect(pulsingElements.length).toBeGreaterThan(0);
    });

    it('displays aspect-video placeholder', () => {
      const { container } = render(<AssetThumbnailSkeleton />);

      const aspectVideo = container.querySelector('.aspect-video');
      expect(aspectVideo).toBeInTheDocument();
    });
  });

  describe('AssetCardSkeleton', () => {
    it('renders card skeleton with flexbox layout', () => {
      const { container } = render(<AssetCardSkeleton />);

      const card = container.querySelector('.flex.gap-3');
      expect(card).toBeInTheDocument();
    });

    it('includes thumbnail and text placeholders', () => {
      const { container } = render(<AssetCardSkeleton />);

      const pulsingElements = container.querySelectorAll('.animate-pulse');
      expect(pulsingElements.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('AssetPreviewSkeleton', () => {
    it('renders preview skeleton with correct spacing', () => {
      const { container } = render(<AssetPreviewSkeleton />);

      const spaceContainer = container.querySelector('.space-y-4');
      expect(spaceContainer).toBeInTheDocument();
    });

    it('includes aspect-video placeholder for preview', () => {
      const { container } = render(<AssetPreviewSkeleton />);

      const aspectVideo = container.querySelector('.aspect-video');
      expect(aspectVideo).toBeInTheDocument();
    });
  });

  describe('AssetGridSkeleton', () => {
    it('renders default count of 6 skeleton items', () => {
      const { container } = render(<AssetGridSkeleton />);

      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
      expect(grid?.children).toHaveLength(6);
    });

    it('renders custom count of skeleton items', () => {
      const { container } = render(<AssetGridSkeleton count={9} />);

      const grid = container.querySelector('.grid');
      expect(grid?.children).toHaveLength(9);
    });

    it('uses responsive grid layout', () => {
      const { container } = render(<AssetGridSkeleton />);

      const grid = container.querySelector('.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3');
      expect(grid).toBeInTheDocument();
    });

    it('handles count of 0', () => {
      const { container } = render(<AssetGridSkeleton count={0} />);

      const grid = container.querySelector('.grid');
      expect(grid?.children).toHaveLength(0);
    });
  });

  describe('AssetListSkeleton', () => {
    it('renders default count of 5 skeleton items', () => {
      const { container } = render(<AssetListSkeleton />);

      const list = container.querySelector('.space-y-3');
      expect(list).toBeInTheDocument();
      expect(list?.children).toHaveLength(5);
    });

    it('renders custom count of skeleton items', () => {
      const { container } = render(<AssetListSkeleton count={10} />);

      const list = container.querySelector('.space-y-3');
      expect(list?.children).toHaveLength(10);
    });

    it('handles count of 1', () => {
      const { container } = render(<AssetListSkeleton count={1} />);

      const list = container.querySelector('.space-y-3');
      expect(list?.children).toHaveLength(1);
    });
  });

  describe('AssetInlineSkeleton', () => {
    it('renders inline skeleton with default width', () => {
      const { container } = render(<AssetInlineSkeleton />);

      const skeleton = container.querySelector('.inline-block');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveStyle({ width: '100px' });
    });

    it('renders inline skeleton with custom width', () => {
      const { container } = render(<AssetInlineSkeleton width="200px" />);

      const skeleton = container.querySelector('.inline-block');
      expect(skeleton).toHaveStyle({ width: '200px' });
    });

    it('has correct height for inline text', () => {
      const { container } = render(<AssetInlineSkeleton />);

      const skeleton = container.querySelector('.h-4');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('AssetPanelHeaderSkeleton', () => {
    it('renders header skeleton with correct layout', () => {
      const { container } = render(<AssetPanelHeaderSkeleton />);

      const header = container.querySelector('.flex.items-center.justify-between');
      expect(header).toBeInTheDocument();
    });

    it('includes border at bottom', () => {
      const { container } = render(<AssetPanelHeaderSkeleton />);

      const header = container.querySelector('.border-b');
      expect(header).toBeInTheDocument();
    });

    it('has multiple skeleton elements for controls', () => {
      const { container } = render(<AssetPanelHeaderSkeleton />);

      const pulsingElements = container.querySelectorAll('.animate-pulse');
      expect(pulsingElements.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('AssetPanelSkeleton', () => {
    it('renders full panel skeleton with header and grid', () => {
      const { container } = render(<AssetPanelSkeleton />);

      const panel = container.querySelector('.flex.h-full.flex-col');
      expect(panel).toBeInTheDocument();
    });

    it('includes AssetPanelHeaderSkeleton', () => {
      const { container } = render(<AssetPanelSkeleton />);

      const header = container.querySelector('.border-b.border-neutral-200');
      expect(header).toBeInTheDocument();
    });

    it('includes AssetGridSkeleton with 6 items', () => {
      const { container } = render(<AssetPanelSkeleton />);

      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
      expect(grid?.children).toHaveLength(6);
    });

    it('has scrollable content area', () => {
      const { container } = render(<AssetPanelSkeleton />);

      const scrollable = container.querySelector('.overflow-auto');
      expect(scrollable).toBeInTheDocument();
    });
  });

  describe('Animation and Styling', () => {
    it('all skeletons have pulse animation', () => {
      const components = [
        <AssetThumbnailSkeleton key="1" />,
        <AssetCardSkeleton key="2" />,
        <AssetPreviewSkeleton key="3" />,
        <AssetInlineSkeleton key="4" />,
      ];

      components.forEach((component) => {
        const { container } = render(component);
        const pulsingElements = container.querySelectorAll('.animate-pulse');
        expect(pulsingElements.length).toBeGreaterThan(0);
      });
    });

    it('all skeletons have rounded corners', () => {
      const components = [
        <AssetThumbnailSkeleton key="1" />,
        <AssetCardSkeleton key="2" />,
        <AssetPreviewSkeleton key="3" />,
      ];

      components.forEach((component) => {
        const { container } = render(component);
        const roundedElements = container.querySelectorAll('[class*="rounded"]');
        expect(roundedElements.length).toBeGreaterThan(0);
      });
    });

    it('all skeletons have neutral background colors', () => {
      const { container } = render(<AssetThumbnailSkeleton />);

      const neutralBg = container.querySelector('.bg-neutral-200');
      expect(neutralBg).toBeInTheDocument();
    });
  });
});
