import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '@/components/ui/EmptyState';

describe('EmptyState', () => {
  const defaultProps = {
    icon: <svg data-testid="empty-icon" />,
    title: 'No items found',
    description: 'Get started by creating your first item',
  };

  describe('Rendering', () => {
    it('should render empty state with required props', () => {
      render(<EmptyState {...defaultProps} />);

      expect(screen.getByTestId('empty-icon')).toBeInTheDocument();
      expect(screen.getByText('No items found')).toBeInTheDocument();
      expect(screen.getByText('Get started by creating your first item')).toBeInTheDocument();
    });

    it('should render icon in circular container', () => {
      render(<EmptyState {...defaultProps} />);
      const icon = screen.getByTestId('empty-icon');
      const iconContainer = icon.parentElement;
      expect(iconContainer).toBeInTheDocument();
    });

    it('should render title as h3', () => {
      render(<EmptyState {...defaultProps} />);
      const title = screen.getByText('No items found');
      expect(title.tagName).toBe('H3');
    });

    it('should render description as paragraph', () => {
      render(<EmptyState {...defaultProps} />);
      const description = screen.getByText('Get started by creating your first item');
      expect(description.tagName).toBe('P');
    });
  });

  describe('With Action', () => {
    it('should render action button when provided', () => {
      const handleAction = jest.fn();
      render(
        <EmptyState
          {...defaultProps}
          action={{
            label: 'Create Item',
            onClick: handleAction,
          }}
        />
      );

      expect(screen.getByRole('button', { name: 'Create Item' })).toBeInTheDocument();
    });

    it('should not render action button when not provided', () => {
      render(<EmptyState {...defaultProps} />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should call onClick handler when action button is clicked', async () => {
      const user = userEvent.setup();
      const handleAction = jest.fn();

      render(
        <EmptyState
          {...defaultProps}
          action={{
            label: 'Create Item',
            onClick: handleAction,
          }}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Create Item' }));
      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple clicks on action button', async () => {
      const user = userEvent.setup();
      const handleAction = jest.fn();

      render(
        <EmptyState
          {...defaultProps}
          action={{
            label: 'Create Item',
            onClick: handleAction,
          }}
        />
      );

      const button = screen.getByRole('button', { name: 'Create Item' });
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(handleAction).toHaveBeenCalledTimes(3);
    });
  });

  describe('Different Use Cases', () => {
    it('should render empty projects state', () => {
      const ProjectIcon = () => (
        <svg data-testid="project-icon">
          <rect />
        </svg>
      );

      render(
        <EmptyState
          icon={<ProjectIcon />}
          title="No projects yet"
          description="Create your first project to get started"
          action={{
            label: 'New Project',
            onClick: jest.fn(),
          }}
        />
      );

      expect(screen.getByTestId('project-icon')).toBeInTheDocument();
      expect(screen.getByText('No projects yet')).toBeInTheDocument();
      expect(screen.getByText('Create your first project to get started')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'New Project' })).toBeInTheDocument();
    });

    it('should render empty assets state', () => {
      const AssetIcon = () => (
        <svg data-testid="asset-icon">
          <circle />
        </svg>
      );

      render(
        <EmptyState
          icon={<AssetIcon />}
          title="No assets uploaded"
          description="Upload images, videos, or audio files to begin"
          action={{
            label: 'Upload Files',
            onClick: jest.fn(),
          }}
        />
      );

      expect(screen.getByTestId('asset-icon')).toBeInTheDocument();
      expect(screen.getByText('No assets uploaded')).toBeInTheDocument();
      expect(
        screen.getByText('Upload images, videos, or audio files to begin')
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Upload Files' })).toBeInTheDocument();
    });

    it('should render search results empty state', () => {
      const SearchIcon = () => (
        <svg data-testid="search-icon">
          <path />
        </svg>
      );

      render(
        <EmptyState
          icon={<SearchIcon />}
          title="No results found"
          description="Try adjusting your search terms"
        />
      );

      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
      expect(screen.getByText('No results found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search terms')).toBeInTheDocument();
    });

    it('should render error state', () => {
      const ErrorIcon = () => (
        <svg data-testid="error-icon">
          <polygon />
        </svg>
      );

      render(
        <EmptyState
          icon={<ErrorIcon />}
          title="Something went wrong"
          description="We encountered an error loading your content"
          action={{
            label: 'Try Again',
            onClick: jest.fn(),
          }}
        />
      );

      expect(screen.getByTestId('error-icon')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('We encountered an error loading your content')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
    });
  });

  describe('Icon Variations', () => {
    it('should render with custom icon component', () => {
      const CustomIcon = () => (
        <svg data-testid="custom-icon" width="24" height="24">
          <rect width="24" height="24" />
        </svg>
      );

      render(<EmptyState {...defaultProps} icon={<CustomIcon />} />);

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('should render with emoji icon', () => {
      render(
        <EmptyState
          icon={
            <span role="img" aria-label="folder">
              📁
            </span>
          }
          title="Empty Folder"
          description="This folder is empty"
        />
      );

      expect(screen.getByLabelText('folder')).toBeInTheDocument();
      expect(screen.getByText('📁')).toBeInTheDocument();
    });

    it('should render with text icon', () => {
      render(
        <EmptyState
          icon={<span data-testid="text-icon">0</span>}
          title="Zero Items"
          description="No items to display"
        />
      );

      expect(screen.getByTestId('text-icon')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should render with complex icon', () => {
      const ComplexIcon = () => (
        <svg data-testid="complex-icon">
          <g>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </g>
        </svg>
      );

      render(<EmptyState {...defaultProps} icon={<ComplexIcon />} />);

      expect(screen.getByTestId('complex-icon')).toBeInTheDocument();
    });
  });

  describe('Text Content', () => {
    it('should render with short title', () => {
      render(
        <EmptyState
          icon={<svg data-testid="icon" />}
          title="Empty"
          description="No content available"
        />
      );

      expect(screen.getByText('Empty')).toBeInTheDocument();
    });

    it('should render with long title', () => {
      render(
        <EmptyState
          icon={<svg data-testid="icon" />}
          title="You don't have any items in your collection yet"
          description="Start adding items to see them here"
        />
      );

      expect(
        screen.getByText("You don't have any items in your collection yet")
      ).toBeInTheDocument();
    });

    it('should render with long description', () => {
      const longDescription =
        'We could not find any results matching your search criteria. Please try using different keywords or check your filters.';

      render(
        <EmptyState
          icon={<svg data-testid="icon" />}
          title="No results"
          description={longDescription}
        />
      );

      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });

    it('should render with multiline description', () => {
      render(
        <EmptyState
          icon={<svg data-testid="icon" />}
          title="Welcome"
          description="This is your workspace. Create projects, upload assets, and start editing videos."
        />
      );

      expect(
        screen.getByText(
          'This is your workspace. Create projects, upload assets, and start editing videos.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should have centered layout', () => {
      const { container } = render(<EmptyState {...defaultProps} />);
      const wrapper = container.firstChild as HTMLElement;

      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('flex-col');
      expect(wrapper).toHaveClass('items-center');
      expect(wrapper).toHaveClass('justify-center');
    });

    it('should have dashed border', () => {
      const { container } = render(<EmptyState {...defaultProps} />);
      const wrapper = container.firstChild as HTMLElement;

      expect(wrapper).toHaveClass('border-2');
      expect(wrapper).toHaveClass('border-dashed');
    });

    it('should have proper spacing', () => {
      const { container } = render(<EmptyState {...defaultProps} />);
      const wrapper = container.firstChild as HTMLElement;

      expect(wrapper).toHaveClass('space-y-4');
      expect(wrapper).toHaveClass('p-12');
    });

    it('should have text centered', () => {
      const { container } = render(<EmptyState {...defaultProps} />);
      const wrapper = container.firstChild as HTMLElement;

      expect(wrapper).toHaveClass('text-center');
    });
  });

  describe('Interaction', () => {
    it('should support keyboard navigation for action button', async () => {
      const user = userEvent.setup();
      const handleAction = jest.fn();

      render(
        <EmptyState
          {...defaultProps}
          action={{
            label: 'Create',
            onClick: handleAction,
          }}
        />
      );

      const button = screen.getByRole('button', { name: 'Create' });
      button.focus();
      await user.keyboard('{Enter}');

      expect(handleAction).toHaveBeenCalled();
    });

    it('should support space key for action button', async () => {
      const user = userEvent.setup();
      const handleAction = jest.fn();

      render(
        <EmptyState
          {...defaultProps}
          action={{
            label: 'Create',
            onClick: handleAction,
          }}
        />
      );

      const button = screen.getByRole('button', { name: 'Create' });
      button.focus();
      await user.keyboard(' ');

      expect(handleAction).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<EmptyState {...defaultProps} />);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('No items found');
    });

    it('should be keyboard accessible when action is present', () => {
      render(
        <EmptyState
          {...defaultProps}
          action={{
            label: 'Create',
            onClick: jest.fn(),
          }}
        />
      );

      const button = screen.getByRole('button', { name: 'Create' });
      expect(button).toBeInTheDocument();
    });

    it('should have descriptive text', () => {
      render(<EmptyState {...defaultProps} />);

      expect(screen.getByText('No items found')).toBeInTheDocument();
      expect(screen.getByText('Get started by creating your first item')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty title', () => {
      render(
        <EmptyState icon={<svg data-testid="icon" />} title="" description="Description only" />
      );

      expect(screen.getByText('Description only')).toBeInTheDocument();
    });

    it('should handle empty description', () => {
      render(<EmptyState icon={<svg data-testid="icon" />} title="Title only" description="" />);

      expect(screen.getByText('Title only')).toBeInTheDocument();
    });

    it('should handle special characters in text', () => {
      render(
        <EmptyState
          icon={<svg data-testid="icon" />}
          title="No items & projects"
          description="Create <new> items"
        />
      );

      expect(screen.getByText('No items & projects')).toBeInTheDocument();
      expect(screen.getByText('Create <new> items')).toBeInTheDocument();
    });
  });
});
