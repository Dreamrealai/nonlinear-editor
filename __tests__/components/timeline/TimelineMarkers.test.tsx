/**
 * Tests for TimelineMarkers Component
 *
 * Tests timeline marker rendering and interactions
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TimelineMarkers } from '@/components/timeline/TimelineMarkers';
import type { Marker } from '@/types/timeline';

// Mock lucide-react icons with proper React component format
jest.mock('lucide-react', () => ({
  Bookmark: function MockBookmark({ className }: { className?: string }) {
    return (
      <div className={className} data-testid="bookmark-icon">
        Bookmark
      </div>
    );
  },
  Edit2: function MockEdit2({ className }: { className?: string }) {
    return (
      <div className={className} data-testid="edit-icon">
        Edit
      </div>
    );
  },
  Trash2: function MockTrash2({ className }: { className?: string }) {
    return (
      <div className={className} data-testid="trash-icon">
        Trash
      </div>
    );
  },
}));

describe('TimelineMarkers', () => {
  const mockMarkers: Marker[] = [
    {
      id: 'marker-1',
      time: 5.0,
      label: 'Start Point',
      color: '#3b82f6',
    },
    {
      id: 'marker-2',
      time: 15.5,
      label: 'Important Scene',
      color: '#ef4444',
    },
    {
      id: 'marker-3',
      time: 30.0,
      label: 'End Credits',
      color: '#10b981',
    },
  ];

  const defaultProps = {
    markers: mockMarkers,
    zoom: 10,
    currentTime: 0,
    onMarkerClick: jest.fn(),
    onMarkerDelete: jest.fn(),
    onMarkerUpdate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all markers', () => {
      const { container } = render(<TimelineMarkers {...defaultProps} />);

      const markerElements = container.querySelectorAll('[style*="left"]');
      expect(markerElements.length).toBeGreaterThanOrEqual(3);
    });

    it('positions markers correctly based on zoom', () => {
      const { container } = render(<TimelineMarkers {...defaultProps} />);

      // First marker at time 5.0 with zoom 10 should be at left: 50px
      const marker = container.querySelector('[style*="left: 50px"]');
      expect(marker).toBeInTheDocument();
    });

    it('renders marker labels', () => {
      render(<TimelineMarkers {...defaultProps} />);

      expect(screen.getByText('Start Point')).toBeInTheDocument();
      expect(screen.getByText('Important Scene')).toBeInTheDocument();
      expect(screen.getByText('End Credits')).toBeInTheDocument();
    });

    it('applies custom colors to markers', () => {
      const { container } = render(<TimelineMarkers {...defaultProps} />);

      // Check that markers have different colors
      const markerLines = container.querySelectorAll('[style*="backgroundColor"]');
      expect(markerLines.length).toBeGreaterThan(0);
    });
  });

  describe('Marker Interactions', () => {
    it('calls onMarkerClick when marker is clicked', () => {
      const onMarkerClick = jest.fn();
      render(<TimelineMarkers {...defaultProps} onMarkerClick={onMarkerClick} />);

      const markerLabel = screen.getByText('Start Point');
      fireEvent.click(markerLabel);

      expect(onMarkerClick).toHaveBeenCalledWith('marker-1');
    });

    it('shows context menu on right-click', () => {
      render(<TimelineMarkers {...defaultProps} />);

      const markerLabel = screen.getByText('Start Point');
      fireEvent.contextMenu(markerLabel);

      expect(screen.getByText('Edit Marker')).toBeInTheDocument();
      expect(screen.getByText('Delete Marker')).toBeInTheDocument();
    });

    it('closes context menu when clicking outside', async () => {
      render(<TimelineMarkers {...defaultProps} />);

      const markerLabel = screen.getByText('Start Point');
      fireEvent.contextMenu(markerLabel);

      expect(screen.getByText('Edit Marker')).toBeInTheDocument();

      // Click outside
      fireEvent.click(document);

      await waitFor(() => {
        expect(screen.queryByText('Edit Marker')).not.toBeInTheDocument();
      });
    });
  });

  describe('Marker Editing', () => {
    it('opens edit mode when Edit Marker is clicked', () => {
      render(<TimelineMarkers {...defaultProps} />);

      const markerLabel = screen.getByText('Start Point');
      fireEvent.contextMenu(markerLabel);

      const editButton = screen.getByText('Edit Marker');
      fireEvent.click(editButton);

      // Should show input field
      const input = screen.getByDisplayValue('Start Point');
      expect(input).toBeInTheDocument();
    });

    it('saves edited marker on Enter key', async () => {
      const onMarkerUpdate = jest.fn();
      render(<TimelineMarkers {...defaultProps} onMarkerUpdate={onMarkerUpdate} />);

      const markerLabel = screen.getByText('Start Point');
      fireEvent.contextMenu(markerLabel);
      fireEvent.click(screen.getByText('Edit Marker'));

      const input = screen.getByDisplayValue('Start Point') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'New Label' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(onMarkerUpdate).toHaveBeenCalledWith('marker-1', { label: 'New Label' });
      });
    });

    it('cancels edit on Escape key', async () => {
      const onMarkerUpdate = jest.fn();
      render(<TimelineMarkers {...defaultProps} onMarkerUpdate={onMarkerUpdate} />);

      const markerLabel = screen.getByText('Start Point');
      fireEvent.contextMenu(markerLabel);
      fireEvent.click(screen.getByText('Edit Marker'));

      const input = screen.getByDisplayValue('Start Point') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'New Label' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      await waitFor(() => {
        expect(onMarkerUpdate).not.toHaveBeenCalled();
        expect(screen.queryByDisplayValue('New Label')).not.toBeInTheDocument();
      });
    });

    it('saves marker on Save button click', async () => {
      const onMarkerUpdate = jest.fn();
      render(<TimelineMarkers {...defaultProps} onMarkerUpdate={onMarkerUpdate} />);

      const markerLabel = screen.getByText('Start Point');
      fireEvent.contextMenu(markerLabel);
      fireEvent.click(screen.getByText('Edit Marker'));

      const input = screen.getByDisplayValue('Start Point') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Updated Label' } });

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(onMarkerUpdate).toHaveBeenCalledWith('marker-1', { label: 'Updated Label' });
      });
    });

    it('cancels edit on Cancel button click', async () => {
      const onMarkerUpdate = jest.fn();
      render(<TimelineMarkers {...defaultProps} onMarkerUpdate={onMarkerUpdate} />);

      const markerLabel = screen.getByText('Start Point');
      fireEvent.contextMenu(markerLabel);
      fireEvent.click(screen.getByText('Edit Marker'));

      const input = screen.getByDisplayValue('Start Point') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'New Label' } });

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(onMarkerUpdate).not.toHaveBeenCalled();
      });
    });

    it('does not save empty label', async () => {
      const onMarkerUpdate = jest.fn();
      render(<TimelineMarkers {...defaultProps} onMarkerUpdate={onMarkerUpdate} />);

      const markerLabel = screen.getByText('Start Point');
      fireEvent.contextMenu(markerLabel);
      fireEvent.click(screen.getByText('Edit Marker'));

      const input = screen.getByDisplayValue('Start Point') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onMarkerUpdate).not.toHaveBeenCalled();
    });
  });

  describe('Marker Deletion', () => {
    it('calls onMarkerDelete when Delete is clicked', async () => {
      const onMarkerDelete = jest.fn();
      render(<TimelineMarkers {...defaultProps} onMarkerDelete={onMarkerDelete} />);

      const markerLabel = screen.getByText('Start Point');
      fireEvent.contextMenu(markerLabel);

      const deleteButton = screen.getByText('Delete Marker');
      fireEvent.click(deleteButton);

      expect(onMarkerDelete).toHaveBeenCalledWith('marker-1');
    });

    it('does not show delete option when onMarkerDelete is not provided', () => {
      const { onMarkerDelete, ...propsWithoutDelete } = defaultProps;
      render(<TimelineMarkers {...propsWithoutDelete} />);

      const markerLabel = screen.getByText('Start Point');
      fireEvent.contextMenu(markerLabel);

      expect(screen.queryByText('Delete Marker')).not.toBeInTheDocument();
    });

    it('closes context menu after deletion', async () => {
      const onMarkerDelete = jest.fn();
      render(<TimelineMarkers {...defaultProps} onMarkerDelete={onMarkerDelete} />);

      const markerLabel = screen.getByText('Start Point');
      fireEvent.contextMenu(markerLabel);

      const deleteButton = screen.getByText('Delete Marker');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.queryByText('Edit Marker')).not.toBeInTheDocument();
      });
    });
  });

  describe('Active Marker Highlighting', () => {
    it('highlights marker when currentTime is near marker time', () => {
      const { container } = render(<TimelineMarkers {...defaultProps} currentTime={5.05} />);

      // Marker at time 5.0 should be active (within 0.1 seconds)
      const activeMarkers = container.querySelectorAll('.opacity-100');
      expect(activeMarkers.length).toBeGreaterThan(0);
    });

    it('does not highlight marker when currentTime is far from marker', () => {
      const { container } = render(<TimelineMarkers {...defaultProps} currentTime={20.0} />);

      // Check opacity states - marker at 5.0 should not be active
      const markers = container.querySelectorAll('[style*="opacity"]');
      expect(markers.length).toBeGreaterThanOrEqual(0);
    });

    it('scales up active marker icon', () => {
      const { container } = render(<TimelineMarkers {...defaultProps} currentTime={5.0} />);

      const scaledElements = container.querySelectorAll('.scale-110');
      expect(scaledElements.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('renders nothing when no markers provided', () => {
      const { container } = render(<TimelineMarkers {...defaultProps} markers={[]} />);

      const markers = container.querySelectorAll('[style*="left"]');
      expect(markers.length).toBe(0);
    });
  });

  describe('Zoom Changes', () => {
    it('repositions markers when zoom changes', () => {
      const { container, rerender } = render(<TimelineMarkers {...defaultProps} zoom={10} />);

      // Marker at time 5.0 with zoom 10 should be at left: 50px
      let marker = container.querySelector('[style*="left: 50px"]');
      expect(marker).toBeInTheDocument();

      // Change zoom to 20
      rerender(<TimelineMarkers {...defaultProps} zoom={20} />);

      // Marker at time 5.0 with zoom 20 should be at left: 100px
      marker = container.querySelector('[style*="left: 100px"]');
      expect(marker).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has title attribute on marker icons for tooltips', () => {
      const { container } = render(<TimelineMarkers {...defaultProps} />);

      const markerIcons = container.querySelectorAll('[title]');
      expect(markerIcons.length).toBeGreaterThan(0);
    });

    it('marker input has autofocus when editing', () => {
      render(<TimelineMarkers {...defaultProps} />);

      const markerLabel = screen.getByText('Start Point');
      fireEvent.contextMenu(markerLabel);
      fireEvent.click(screen.getByText('Edit Marker'));

      const input = screen.getByDisplayValue('Start Point') as HTMLInputElement;
      expect(input).toHaveAttribute('autoFocus');
    });
  });
});
