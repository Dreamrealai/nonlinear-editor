/**
 * Tests for TextOverlayEditor Component
 *
 * Tests text overlay editing functionality with draggable text boxes
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TextOverlayEditor } from '@/components/TextOverlayEditor';
import type { TextOverlay } from '@/types/timeline';

// Mock Zustand store
const mockUpdateTextOverlay = jest.fn();
const mockRemoveTextOverlay = jest.fn();

jest.mock('@/state/useEditorStore', () => ({
  useEditorStore: (selector: (state: any) => any) => {
    const state = {
      updateTextOverlay: mockUpdateTextOverlay,
      removeTextOverlay: mockRemoveTextOverlay,
    };
    return selector(state);
  },
}));

const createMockOverlay = (overrides: Partial<TextOverlay> = {}): TextOverlay => ({
  id: 'overlay-1',
  text: 'Test Text',
  x: 50,
  y: 50,
  fontSize: 48,
  color: '#ffffff',
  fontFamily: 'sans-serif',
  timelinePosition: 0,
  duration: 5,
  ...overrides,
});

describe('TextOverlayEditor', () => {
  const containerRef = React.createRef<HTMLDivElement>();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without overlays', () => {
    const { container } = render(
      <TextOverlayEditor textOverlays={[]} currentTime={0} containerRef={containerRef} />
    );

    expect(
      container.querySelector('[role="button"][aria-label="Text overlay workspace"]')
    ).toBeInTheDocument();
  });

  it('renders visible text overlays at current time', () => {
    const overlay = createMockOverlay({ text: 'Visible Text', timelinePosition: 0, duration: 10 });

    render(
      <TextOverlayEditor textOverlays={[overlay]} currentTime={5} containerRef={containerRef} />
    );

    expect(screen.getByText('Visible Text')).toBeInTheDocument();
  });

  it('hides overlays outside time range', () => {
    const overlay = createMockOverlay({ text: 'Hidden Text', timelinePosition: 10, duration: 5 });

    render(
      <TextOverlayEditor textOverlays={[overlay]} currentTime={0} containerRef={containerRef} />
    );

    expect(screen.queryByText('Hidden Text')).not.toBeInTheDocument();
  });

  it('selects overlay on click', () => {
    const overlay = createMockOverlay();

    render(
      <TextOverlayEditor textOverlays={[overlay]} currentTime={2} containerRef={containerRef} />
    );

    const overlayElement = screen.getByText('Test Text');
    fireEvent.click(overlayElement);

    // Toolbar should appear
    expect(screen.getByLabelText(/font family/i)).toBeInTheDocument();
  });

  it('displays formatting toolbar when overlay is selected', () => {
    const overlay = createMockOverlay();

    const { rerender } = render(
      <TextOverlayEditor textOverlays={[overlay]} currentTime={2} containerRef={containerRef} />
    );

    // Click to select overlay
    const overlayElement = screen.getByText('Test Text');
    fireEvent.click(overlayElement);

    rerender(
      <TextOverlayEditor textOverlays={[overlay]} currentTime={2} containerRef={containerRef} />
    );

    // Check toolbar elements
    expect(screen.getByLabelText(/font family/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/font size/i)).toBeInTheDocument();
    expect(screen.getByText(/color/i)).toBeInTheDocument();
  });

  it('changes font family', () => {
    const overlay = createMockOverlay();

    render(
      <TextOverlayEditor textOverlays={[overlay]} currentTime={2} containerRef={containerRef} />
    );

    const overlayElement = screen.getByText('Test Text');
    fireEvent.click(overlayElement);

    const fontSelect = screen.getByLabelText(/font family/i) as HTMLSelectElement;
    fireEvent.change(fontSelect, { target: { value: 'serif' } });

    expect(mockUpdateTextOverlay).toHaveBeenCalledWith('overlay-1', { fontFamily: 'serif' });
  });

  it('changes font size', () => {
    const overlay = createMockOverlay();

    render(
      <TextOverlayEditor textOverlays={[overlay]} currentTime={2} containerRef={containerRef} />
    );

    const overlayElement = screen.getByText('Test Text');
    fireEvent.click(overlayElement);

    const sizeSelect = screen.getByLabelText(/size/i) as HTMLSelectElement;
    fireEvent.change(sizeSelect, { target: { value: '64' } });

    expect(mockUpdateTextOverlay).toHaveBeenCalledWith('overlay-1', { fontSize: 64 });
  });

  it('deletes overlay when delete button is clicked', () => {
    const overlay = createMockOverlay();

    render(
      <TextOverlayEditor textOverlays={[overlay]} currentTime={2} containerRef={containerRef} />
    );

    const overlayElement = screen.getByText('Test Text');
    fireEvent.click(overlayElement);

    const deleteButton = screen.getByRole('button', { name: /delete text overlay/i });
    fireEvent.click(deleteButton);

    expect(mockRemoveTextOverlay).toHaveBeenCalledWith('overlay-1');
  });

  it('applies animation type', () => {
    const overlay = createMockOverlay();

    render(
      <TextOverlayEditor textOverlays={[overlay]} currentTime={2} containerRef={containerRef} />
    );

    const overlayElement = screen.getByText('Test Text');
    fireEvent.click(overlayElement);

    const animationSelect = screen.getByLabelText(/animation/i) as HTMLSelectElement;
    fireEvent.change(animationSelect, { target: { value: 'fade-in' } });

    expect(mockUpdateTextOverlay).toHaveBeenCalledWith(
      'overlay-1',
      expect.objectContaining({
        animation: expect.objectContaining({ type: 'fade-in' }),
      })
    );
  });

  it('shows animation controls when animation is selected', () => {
    const overlay = createMockOverlay({
      animation: {
        type: 'fade-in',
        duration: 1,
        delay: 0,
        easing: 'ease-out',
        repeat: 0,
        direction: 'normal',
      },
    });

    render(
      <TextOverlayEditor textOverlays={[overlay]} currentTime={2} containerRef={containerRef} />
    );

    const overlayElement = screen.getByText('Test Text');
    fireEvent.click(overlayElement);

    expect(screen.getByLabelText(/duration/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/delay/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/easing/i)).toBeInTheDocument();
  });

  it('deselects overlay when clicking outside', () => {
    const overlay = createMockOverlay();

    const { container } = render(
      <TextOverlayEditor textOverlays={[overlay]} currentTime={2} containerRef={containerRef} />
    );

    const overlayElement = screen.getByText('Test Text');
    fireEvent.click(overlayElement);

    // Toolbar should be visible
    expect(screen.getByLabelText(/font family/i)).toBeInTheDocument();

    // Click on workspace
    const workspace = container.querySelector(
      '[role="button"][aria-label="Text overlay workspace"]'
    );
    if (workspace) {
      fireEvent.click(workspace);
    }

    // Toolbar should be hidden
    expect(screen.queryByLabelText(/font family/i)).not.toBeInTheDocument();
  });

  it('enables text editing on double-click', () => {
    const overlay = createMockOverlay();

    render(
      <TextOverlayEditor textOverlays={[overlay]} currentTime={2} containerRef={containerRef} />
    );

    const overlayElement = screen.getByText('Test Text');
    fireEvent.doubleClick(overlayElement);

    // Input field should be rendered
    const input = screen.getByDisplayValue('Test Text') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.type).toBe('text');
  });

  it('updates text on input change', () => {
    const overlay = createMockOverlay();

    render(
      <TextOverlayEditor textOverlays={[overlay]} currentTime={2} containerRef={containerRef} />
    );

    const overlayElement = screen.getByText('Test Text');
    fireEvent.doubleClick(overlayElement);

    const input = screen.getByDisplayValue('Test Text') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Updated Text' } });

    expect(mockUpdateTextOverlay).toHaveBeenCalledWith('overlay-1', { text: 'Updated Text' });
  });

  it('applies overlay styles correctly', () => {
    const overlay = createMockOverlay({
      fontSize: 64,
      color: '#ff0000',
      fontFamily: 'serif',
    });

    const { container } = render(
      <TextOverlayEditor textOverlays={[overlay]} currentTime={2} containerRef={containerRef} />
    );

    const overlayElement = screen.getByText('Test Text');
    const styles = window.getComputedStyle(overlayElement);

    expect(overlayElement).toHaveStyle({
      color: '#ff0000',
      fontFamily: 'serif',
    });
  });
});
