/**
 * Tests for ResizableAssetPanel Component
 *
 * Tests asset panel with resize functionality
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResizableAssetPanel } from '@/components/editor/ResizableAssetPanel';

// Mock AssetPanel
jest.mock('@/components/editor/AssetPanel', () => ({
  AssetPanel: ({ assets }: any) => (
    <div data-testid="asset-panel">Asset Panel with {assets.length} assets</div>
  ),
}));

const mockAsset = {
  id: 'asset-1',
  storage_url: 'supabase://bucket/test.mp4',
  type: 'video' as const,
  metadata: { filename: 'test.mp4' },
};

const mockProps = {
  assets: [mockAsset],
  projectId: 'project-1',
  loadingAssets: false,
  assetError: null,
  uploadPending: false,
  activeTab: 'video' as const,
  onTabChange: jest.fn(),
  onFileSelect: jest.fn(),
  onAssetAdd: jest.fn(),
  onAssetDelete: jest.fn(),
};

describe('ResizableAssetPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default width', () => {
    const { container } = render(<ResizableAssetPanel {...mockProps} />);

    const panel = container.querySelector('.relative.flex-shrink-0');
    expect(panel).toHaveStyle({ width: '280px' });
  });

  it('renders with custom initial width', () => {
    const { container } = render(<ResizableAssetPanel {...mockProps} initialWidth={350} />);

    const panel = container.querySelector('.relative.flex-shrink-0');
    expect(panel).toHaveStyle({ width: '350px' });
  });

  it('renders AssetPanel component', () => {
    render(<ResizableAssetPanel {...mockProps} />);

    expect(screen.getByTestId('asset-panel')).toBeInTheDocument();
    expect(screen.getByText('Asset Panel with 1 assets')).toBeInTheDocument();
  });

  it('displays resize handle', () => {
    const { container } = render(<ResizableAssetPanel {...mockProps} />);

    const resizeHandle = container.querySelector('.cursor-ew-resize');
    expect(resizeHandle).toBeInTheDocument();
  });

  it('has accessible resize handle label', () => {
    render(<ResizableAssetPanel {...mockProps} />);

    expect(screen.getByLabelText('Resize asset panel')).toBeInTheDocument();
  });

  it('shows hover state on resize handle', () => {
    const { container } = render(<ResizableAssetPanel {...mockProps} />);

    const resizeHandle = screen.getByLabelText('Resize asset panel');

    act(() => {
      fireEvent.mouseEnter(resizeHandle);
    });

    // Hover state should be applied
    expect(resizeHandle).toHaveClass('bg-neutral-400');
  });

  it('hides hover state on mouse leave', () => {
    const { container } = render(<ResizableAssetPanel {...mockProps} />);

    const resizeHandle = screen.getByLabelText('Resize asset panel');

    act(() => {
      fireEvent.mouseEnter(resizeHandle);
      fireEvent.mouseLeave(resizeHandle);
    });

    expect(resizeHandle).toHaveClass('bg-neutral-300');
  });

  it('starts resizing on mouse down', () => {
    const { container } = render(<ResizableAssetPanel {...mockProps} />);

    const resizeHandle = screen.getByLabelText('Resize asset panel');

    act(() => {
      fireEvent.mouseDown(resizeHandle, { clientX: 280 });
    });

    expect(resizeHandle).toHaveClass('bg-blue-500');
  });

  it('resizes panel on mouse move', () => {
    const { container } = render(<ResizableAssetPanel {...mockProps} initialWidth={280} />);

    const resizeHandle = screen.getByLabelText('Resize asset panel');
    const panel = container.querySelector('.relative.flex-shrink-0');

    // Start resize
    act(() => {
      fireEvent.mouseDown(resizeHandle, { clientX: 280 });
    });

    // Move mouse to resize
    act(() => {
      fireEvent.mouseMove(document, { clientX: 350 });
    });

    // Panel width should increase
    expect(panel).toHaveStyle({ width: '350px' });

    // End resize
    act(() => {
      fireEvent.mouseUp(document);
    });
  });

  it('enforces minimum width constraint', () => {
    const { container } = render(
      <ResizableAssetPanel {...mockProps} initialWidth={280} minWidth={200} />
    );

    const resizeHandle = screen.getByLabelText('Resize asset panel');
    const panel = container.querySelector('.relative.flex-shrink-0');

    act(() => {
      fireEvent.mouseDown(resizeHandle, { clientX: 280 });
      fireEvent.mouseMove(document, { clientX: 100 }); // Try to resize below min
      fireEvent.mouseUp(document);
    });

    // Should be clamped to minWidth
    expect(panel).toHaveStyle({ width: '200px' });
  });

  it('enforces maximum width constraint', () => {
    const { container } = render(
      <ResizableAssetPanel {...mockProps} initialWidth={280} maxWidth={400} />
    );

    const resizeHandle = screen.getByLabelText('Resize asset panel');
    const panel = container.querySelector('.relative.flex-shrink-0');

    act(() => {
      fireEvent.mouseDown(resizeHandle, { clientX: 280 });
      fireEvent.mouseMove(document, { clientX: 600 }); // Try to resize above max
      fireEvent.mouseUp(document);
    });

    // Should be clamped to maxWidth
    expect(panel).toHaveStyle({ width: '400px' });
  });

  it('prevents text selection while resizing', () => {
    const { container } = render(<ResizableAssetPanel {...mockProps} />);

    const resizeHandle = screen.getByLabelText('Resize asset panel');

    act(() => {
      fireEvent.mouseDown(resizeHandle, { clientX: 280 });
    });

    expect(document.body.style.userSelect).toBe('none');
    expect(document.body.style.cursor).toBe('ew-resize');

    act(() => {
      fireEvent.mouseUp(document);
    });

    expect(document.body.style.userSelect).toBe('');
    expect(document.body.style.cursor).toBe('');
  });

  it('passes all props to AssetPanel', () => {
    render(<ResizableAssetPanel {...mockProps} />);

    // AssetPanel should receive assets
    expect(screen.getByText('Asset Panel with 1 assets')).toBeInTheDocument();
  });

  it('handles resizing with separator element', () => {
    const { container } = render(<ResizableAssetPanel {...mockProps} />);

    const separator = container.querySelector('[role="separator"]');
    expect(separator).toBeInTheDocument();

    act(() => {
      fireEvent.mouseDown(separator!, { clientX: 280 });
      fireEvent.mouseMove(document, { clientX: 320 });
      fireEvent.mouseUp(document);
    });

    const panel = container.querySelector('.relative.flex-shrink-0');
    expect(panel).toHaveStyle({ width: '320px' });
  });

  it('cleans up event listeners on unmount', () => {
    const { unmount, container } = render(<ResizableAssetPanel {...mockProps} />);

    const resizeHandle = screen.getByLabelText('Resize asset panel');

    act(() => {
      fireEvent.mouseDown(resizeHandle, { clientX: 280 });
    });

    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
  });

  it('shows grip pattern when hovering', () => {
    const { container } = render(<ResizableAssetPanel {...mockProps} />);

    const resizeHandle = screen.getByLabelText('Resize asset panel');

    act(() => {
      fireEvent.mouseEnter(resizeHandle);
    });

    const gripPattern = container.querySelector('.opacity-100');
    expect(gripPattern).toBeInTheDocument();
  });
});
