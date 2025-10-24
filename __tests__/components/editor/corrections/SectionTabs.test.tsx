import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SectionTabs } from '@/components/editor/corrections/SectionTabs';
import type { SectionType } from '@/components/editor/corrections/types';

describe('SectionTabs', () => {
  const defaultProps = {
    activeSection: 'color' as SectionType,
    hasAudio: false,
    onSectionChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render Color and Transform tabs', () => {
      render(<SectionTabs {...defaultProps} />);

      expect(screen.getByText('Color')).toBeInTheDocument();
      expect(screen.getByText('Transform')).toBeInTheDocument();
    });

    it('should render Audio tab when hasAudio is true', () => {
      render(<SectionTabs {...defaultProps} hasAudio={true} />);

      expect(screen.getByText('Audio')).toBeInTheDocument();
    });

    it('should not render Audio tab when hasAudio is false', () => {
      render(<SectionTabs {...defaultProps} hasAudio={false} />);

      expect(screen.queryByText('Audio')).not.toBeInTheDocument();
    });

    it('should always render at least two tabs', () => {
      render(<SectionTabs {...defaultProps} />);

      const tabs = screen.getAllByRole('button');
      expect(tabs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Active State', () => {
    it('should highlight Color tab when active', () => {
      render(<SectionTabs {...defaultProps} activeSection="color" />);

      const colorTab = screen.getByText('Color');
      expect(colorTab).toHaveClass('bg-blue-600');
      expect(colorTab).toHaveClass('text-white');
    });

    it('should highlight Transform tab when active', () => {
      render(<SectionTabs {...defaultProps} activeSection="transform" />);

      const transformTab = screen.getByText('Transform');
      expect(transformTab).toHaveClass('bg-blue-600');
      expect(transformTab).toHaveClass('text-white');
    });

    it('should highlight Audio tab when active', () => {
      render(<SectionTabs {...defaultProps} activeSection="audio" hasAudio={true} />);

      const audioTab = screen.getByText('Audio');
      expect(audioTab).toHaveClass('bg-blue-600');
      expect(audioTab).toHaveClass('text-white');
    });

    it('should not highlight inactive tabs', () => {
      render(<SectionTabs {...defaultProps} activeSection="color" />);

      const transformTab = screen.getByText('Transform');
      expect(transformTab).toHaveClass('bg-neutral-100');
      expect(transformTab).toHaveClass('text-neutral-600');
    });
  });

  describe('User Interactions', () => {
    it('should call onSectionChange when Color tab is clicked', () => {
      const onSectionChange = jest.fn();
      render(<SectionTabs {...defaultProps} onSectionChange={onSectionChange} />);

      const colorTab = screen.getByText('Color');
      fireEvent.click(colorTab);

      expect(onSectionChange).toHaveBeenCalledWith('color');
    });

    it('should call onSectionChange when Transform tab is clicked', () => {
      const onSectionChange = jest.fn();
      render(<SectionTabs {...defaultProps} onSectionChange={onSectionChange} />);

      const transformTab = screen.getByText('Transform');
      fireEvent.click(transformTab);

      expect(onSectionChange).toHaveBeenCalledWith('transform');
    });

    it('should call onSectionChange when Audio tab is clicked', () => {
      const onSectionChange = jest.fn();
      render(<SectionTabs {...defaultProps} hasAudio={true} onSectionChange={onSectionChange} />);

      const audioTab = screen.getByText('Audio');
      fireEvent.click(audioTab);

      expect(onSectionChange).toHaveBeenCalledWith('audio');
    });

    it('should allow switching between tabs', () => {
      const onSectionChange = jest.fn();
      const { rerender } = render(
        <SectionTabs {...defaultProps} activeSection="color" onSectionChange={onSectionChange} />
      );

      const transformTab = screen.getByText('Transform');
      fireEvent.click(transformTab);

      expect(onSectionChange).toHaveBeenCalledWith('transform');

      rerender(
        <SectionTabs
          {...defaultProps}
          activeSection="transform"
          onSectionChange={onSectionChange}
        />
      );

      expect(screen.getByText('Transform')).toHaveClass('bg-blue-600');
    });
  });

  describe('Button Types', () => {
    it('should render buttons with correct type attribute', () => {
      render(<SectionTabs {...defaultProps} />);

      const colorTab = screen.getByText('Color');
      expect(colorTab).toHaveAttribute('type', 'button');

      const transformTab = screen.getByText('Transform');
      expect(transformTab).toHaveAttribute('type', 'button');
    });

    it('should prevent form submission when clicked', () => {
      const handleSubmit = jest.fn((e) => e.preventDefault());
      render(
        <form onSubmit={handleSubmit}>
          <SectionTabs {...defaultProps} />
        </form>
      );

      const colorTab = screen.getByText('Color');
      fireEvent.click(colorTab);

      // Form should not be submitted
      expect(handleSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Styling', () => {
    it('should apply active styling to selected tab', () => {
      render(<SectionTabs {...defaultProps} activeSection="color" />);

      const colorTab = screen.getByText('Color');
      expect(colorTab).toHaveClass('bg-blue-600', 'text-white', 'shadow-md');
    });

    it('should apply inactive styling to non-selected tabs', () => {
      render(<SectionTabs {...defaultProps} activeSection="color" />);

      const transformTab = screen.getByText('Transform');
      expect(transformTab).toHaveClass('bg-neutral-100', 'text-neutral-600');
    });

    it('should have hover effects on inactive tabs', () => {
      render(<SectionTabs {...defaultProps} activeSection="color" />);

      const transformTab = screen.getByText('Transform');
      expect(transformTab).toHaveClass('hover:bg-neutral-200');
    });

    it('should have transition effects', () => {
      render(<SectionTabs {...defaultProps} />);

      const colorTab = screen.getByText('Color');
      expect(colorTab).toHaveClass('transition');
    });

    it('should have consistent styling across all tabs', () => {
      render(<SectionTabs {...defaultProps} hasAudio={true} />);

      const tabs = screen.getAllByRole('button');
      tabs.forEach((tab) => {
        expect(tab).toHaveClass('rounded-lg');
        expect(tab).toHaveClass('px-4');
        expect(tab).toHaveClass('py-2');
        expect(tab).toHaveClass('text-xs');
        expect(tab).toHaveClass('font-semibold');
      });
    });
  });

  describe('Layout', () => {
    it('should render tabs in a flex container', () => {
      const { container } = render(<SectionTabs {...defaultProps} />);

      const tabsContainer = container.firstChild as HTMLElement;
      expect(tabsContainer).toHaveClass('flex');
      expect(tabsContainer).toHaveClass('gap-2');
    });

    it('should have bottom margin', () => {
      const { container } = render(<SectionTabs {...defaultProps} />);

      const tabsContainer = container.firstChild as HTMLElement;
      expect(tabsContainer).toHaveClass('mb-4');
    });

    it('should render tabs in correct order', () => {
      render(<SectionTabs {...defaultProps} hasAudio={true} />);

      const tabs = screen.getAllByRole('button');
      expect(tabs[0]).toHaveTextContent('Color');
      expect(tabs[1]).toHaveTextContent('Transform');
      expect(tabs[2]).toHaveTextContent('Audio');
    });
  });

  describe('Conditional Rendering', () => {
    it('should render 2 tabs when hasAudio is false', () => {
      render(<SectionTabs {...defaultProps} hasAudio={false} />);

      const tabs = screen.getAllByRole('button');
      expect(tabs).toHaveLength(2);
    });

    it('should render 3 tabs when hasAudio is true', () => {
      render(<SectionTabs {...defaultProps} hasAudio={true} />);

      const tabs = screen.getAllByRole('button');
      expect(tabs).toHaveLength(3);
    });

    it('should toggle Audio tab based on hasAudio prop', () => {
      const { rerender } = render(<SectionTabs {...defaultProps} hasAudio={false} />);

      expect(screen.queryByText('Audio')).not.toBeInTheDocument();

      rerender(<SectionTabs {...defaultProps} hasAudio={true} />);

      expect(screen.getByText('Audio')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button elements', () => {
      render(<SectionTabs {...defaultProps} hasAudio={true} />);

      const tabs = screen.getAllByRole('button');
      expect(tabs.length).toBeGreaterThan(0);
      tabs.forEach((tab) => {
        expect(tab).toBeInTheDocument();
      });
    });

    it('should have visible text labels', () => {
      render(<SectionTabs {...defaultProps} hasAudio={true} />);

      expect(screen.getByText('Color')).toBeVisible();
      expect(screen.getByText('Transform')).toBeVisible();
      expect(screen.getByText('Audio')).toBeVisible();
    });

    it('should be keyboard navigable', () => {
      render(<SectionTabs {...defaultProps} />);

      const colorTab = screen.getByText('Color');
      colorTab.focus();

      expect(document.activeElement).toBe(colorTab);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid tab switching', () => {
      const onSectionChange = jest.fn();
      render(<SectionTabs {...defaultProps} onSectionChange={onSectionChange} />);

      const colorTab = screen.getByText('Color');
      const transformTab = screen.getByText('Transform');

      fireEvent.click(colorTab);
      fireEvent.click(transformTab);
      fireEvent.click(colorTab);

      expect(onSectionChange).toHaveBeenCalledTimes(3);
      expect(onSectionChange).toHaveBeenNthCalledWith(1, 'color');
      expect(onSectionChange).toHaveBeenNthCalledWith(2, 'transform');
      expect(onSectionChange).toHaveBeenNthCalledWith(3, 'color');
    });

    it('should handle clicking already active tab', () => {
      const onSectionChange = jest.fn();
      render(
        <SectionTabs {...defaultProps} activeSection="color" onSectionChange={onSectionChange} />
      );

      const colorTab = screen.getByText('Color');
      fireEvent.click(colorTab);

      expect(onSectionChange).toHaveBeenCalledWith('color');
    });

    it('should maintain state when hasAudio changes', () => {
      const { rerender } = render(
        <SectionTabs {...defaultProps} activeSection="color" hasAudio={false} />
      );

      expect(screen.getByText('Color')).toHaveClass('bg-blue-600');

      rerender(<SectionTabs {...defaultProps} activeSection="color" hasAudio={true} />);

      expect(screen.getByText('Color')).toHaveClass('bg-blue-600');
    });
  });

  describe('Integration', () => {
    it('should work correctly in tab navigation flow', () => {
      const onSectionChange = jest.fn();
      const { rerender } = render(
        <SectionTabs
          {...defaultProps}
          activeSection="color"
          hasAudio={true}
          onSectionChange={onSectionChange}
        />
      );

      // Click Transform
      fireEvent.click(screen.getByText('Transform'));
      expect(onSectionChange).toHaveBeenCalledWith('transform');

      // Re-render with new active section
      rerender(
        <SectionTabs
          {...defaultProps}
          activeSection="transform"
          hasAudio={true}
          onSectionChange={onSectionChange}
        />
      );

      expect(screen.getByText('Transform')).toHaveClass('bg-blue-600');

      // Click Audio
      fireEvent.click(screen.getByText('Audio'));
      expect(onSectionChange).toHaveBeenCalledWith('audio');
    });
  });
});
