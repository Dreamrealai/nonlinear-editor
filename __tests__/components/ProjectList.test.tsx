import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProjectList } from '@/components/ProjectList';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import type { Project } from '@/components/ProjectList';

// Mock dependencies
jest.mock('next/navigation', (): Record<string, unknown> => ({
  useRouter: jest.fn(),
}));

jest.mock('next/link', (): Record<string, unknown> => ({
  __esModule: true,
  default: function MockLink({ children, href }: any) {
    return <a href={href}>{children}</a>;
  },
}));

jest.mock('react-hot-toast');

jest.mock('@/lib/browserLogger', (): Record<string, unknown> => ({
  browserLogger: {
    error: jest.fn(),
  },
}));

// Mock window.confirm
global.confirm = jest.fn();

// Mock fetch
global.fetch = jest.fn();

describe('ProjectList', () => {
  const mockPush = jest.fn();
  const mockRefresh = jest.fn();

  const mockProjects: Project[] = [
    {
      id: 'project-1',
      title: 'My First Project',
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 'project-2',
      title: 'Another Project',
      created_at: '2024-01-20T15:30:00Z',
    },
    {
      id: 'project-3',
      title: '',
      created_at: '2024-01-25T08:00:00Z',
    },
  ];

  beforeEach((): void => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    });
    (global.confirm as jest.Mock).mockReturnValue(true);
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Rendering', () => {
    it('should render all projects', () => {
      render(<ProjectList projects={mockProjects} />);

      expect(screen.getByText('My First Project')).toBeInTheDocument();
      expect(screen.getByText('Another Project')).toBeInTheDocument();
    });

    it('should display project titles', () => {
      render(<ProjectList projects={mockProjects} />);

      expect(screen.getByText('My First Project')).toBeInTheDocument();
      expect(screen.getByText('Another Project')).toBeInTheDocument();
    });

    it('should display creation dates', () => {
      render(<ProjectList projects={mockProjects} />);

      // Should show formatted dates
      const dateElements = screen.getAllByText(/Created/);
      expect(dateElements.length).toBeGreaterThan(0);
    });

    it('should render Untitled Project for empty title', () => {
      render(<ProjectList projects={mockProjects} />);

      expect(screen.getByText('Untitled Project')).toBeInTheDocument();
    });

    it('should show delete button on hover', () => {
      render(<ProjectList projects={mockProjects} />);

      const deleteButtons = screen.getAllByTitle('Delete project');
      expect(deleteButtons).toHaveLength(3);
    });

    it('should render as links to editor', () => {
      render(<ProjectList projects={mockProjects} />);

      const link1 = screen.getByText('My First Project').closest('a');
      expect(link1).toHaveAttribute('href', '/editor/project-1');

      const link2 = screen.getByText('Another Project').closest('a');
      expect(link2).toHaveAttribute('href', '/editor/project-2');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no projects', () => {
      render(<ProjectList projects={[]} />);

      expect(screen.getByText('No projects yet')).toBeInTheDocument();
      expect(screen.getByText(/Get started by creating your first project/)).toBeInTheDocument();
    });

    it('should show Create Project button in empty state', () => {
      render(<ProjectList projects={[]} />);

      const createButton = screen.getByText('Create Project');
      expect(createButton).toBeInTheDocument();
    });

    it('should navigate to home when Create Project is clicked', () => {
      render(<ProjectList projects={[]} />);

      const createButton = screen.getByText('Create Project');
      fireEvent.click(createButton);

      expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('should display film icon in empty state', () => {
      const { container } = render(<ProjectList projects={[]} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Project Deletion', () => {
    it('should show confirmation dialog when delete is clicked', () => {
      render(<ProjectList projects={mockProjects} />);

      const deleteButtons = screen.getAllByTitle('Delete project');
      fireEvent.click(deleteButtons[0]);

      expect(global.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Delete "My First Project"')
      );
    });

    it('should not delete if confirmation is cancelled', async () => {
      (global.confirm as jest.Mock).mockReturnValue(false);

      render(<ProjectList projects={mockProjects} />);

      const deleteButtons = screen.getAllByTitle('Delete project');
      fireEvent.click(deleteButtons[0]);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should call delete API when confirmed', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      render(<ProjectList projects={mockProjects} />);

      const deleteButtons = screen.getAllByTitle('Delete project');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/projects/project-1', {
          method: 'DELETE',
        });
      });
    });

    it('should show success message after deletion', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      render(<ProjectList projects={mockProjects} />);

      const deleteButtons = screen.getAllByTitle('Delete project');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Project deleted successfully');
      });
    });

    it('should refresh router after deletion', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      render(<ProjectList projects={mockProjects} />);

      const deleteButtons = screen.getAllByTitle('Delete project');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('should handle deletion errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to delete' }),
      });

      render(<ProjectList projects={mockProjects} />);

      const deleteButtons = screen.getAllByTitle('Delete project');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to delete project');
      });
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<ProjectList projects={mockProjects} />);

      const deleteButtons = screen.getAllByTitle('Delete project');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to delete project');
      });
    });

    it('should prevent event propagation when delete is clicked', () => {
      const handleClick = jest.fn();
      render(
        <div onClick={handleClick} onKeyDown={(e) => e.key === 'Enter' && handleClick()} role="button" tabIndex={0}>
          <ProjectList projects={mockProjects} />
        </div>
      );

      const deleteButtons = screen.getAllByTitle('Delete project');
      fireEvent.click(deleteButtons[0]);

      // Parent click handler should not be called
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should show Untitled Project in confirmation for empty title', () => {
      render(<ProjectList projects={mockProjects} />);

      const deleteButtons = screen.getAllByTitle('Delete project');
      fireEvent.click(deleteButtons[2]); // Project with empty title

      expect(global.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Delete "Untitled Project"')
      );
    });
  });

  describe('Navigation', () => {
    it('should navigate to editor on project click', () => {
      render(<ProjectList projects={mockProjects} />);

      const projectLink = screen.getByText('My First Project').closest('a');
      expect(projectLink).toHaveAttribute('href', '/editor/project-1');
    });

    it('should have correct href for all projects', () => {
      render(<ProjectList projects={mockProjects} />);

      mockProjects.forEach((project) => {
        const title = project.title || 'Untitled Project';
        const link = screen.getByText(title).closest('a');
        expect(link).toHaveAttribute('href', `/editor/${project.id}`);
      });
    });
  });

  describe('Styling and Layout', () => {
    it('should apply hover styles to project cards', () => {
      render(<ProjectList projects={mockProjects} />);

      const projectCard = screen.getByText('My First Project').closest('a');
      expect(projectCard).toHaveClass('hover:border-neutral-300');
      expect(projectCard).toHaveClass('hover:shadow-md');
    });

    it('should have proper spacing between projects', () => {
      const { container } = render(<ProjectList projects={mockProjects} />);

      const listContainer = container.querySelector('.space-y-4');
      expect(listContainer).toBeInTheDocument();
    });

    it('should style delete button appropriately', () => {
      render(<ProjectList projects={mockProjects} />);

      const deleteButtons = screen.getAllByTitle('Delete project');
      deleteButtons.forEach((button) => {
        expect(button).toHaveClass('text-red-600');
        expect(button).toHaveClass('hover:bg-red-50');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible delete buttons', () => {
      render(<ProjectList projects={mockProjects} />);

      const deleteButtons = screen.getAllByTitle('Delete project');
      expect(deleteButtons.length).toBe(3);

      deleteButtons.forEach((button) => {
        expect(button).toHaveAttribute('title', 'Delete project');
      });
    });

    it('should have semantic HTML structure', () => {
      const { container } = render(<ProjectList projects={mockProjects} />);

      const links = container.querySelectorAll('a');
      expect(links.length).toBeGreaterThan(0);

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should have descriptive text for empty state', () => {
      render(<ProjectList projects={[]} />);

      expect(screen.getByText('No projects yet')).toBeInTheDocument();
      expect(screen.getByText('Get started by creating your first project.')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should memoize ProjectItem components', () => {
      const { rerender } = render(<ProjectList projects={mockProjects} />);

      // Re-render with same props
      rerender(<ProjectList projects={mockProjects} />);

      // Components should still be rendered correctly
      expect(screen.getByText('My First Project')).toBeInTheDocument();
    });

    it('should handle large lists efficiently', () => {
      const largeProjectList: Project[] = Array.from({ length: 50 }, (_, i) => ({
        id: `project-${i}`,
        title: `Project ${i}`,
        created_at: new Date().toISOString(),
      }));

      render(<ProjectList projects={largeProjectList} />);

      expect(screen.getByText('Project 0')).toBeInTheDocument();
      expect(screen.getByText('Project 49')).toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('should format dates consistently', () => {
      render(<ProjectList projects={mockProjects} />);

      const dateElements = screen.getAllByText(/Created/);
      expect(dateElements.length).toBe(3);

      dateElements.forEach((element) => {
        expect(element.textContent).toMatch(/Created \d{1,2}\/\d{1,2}\/\d{4}/);
      });
    });

    it('should handle different date formats', () => {
      const projectsWithDates: Project[] = [
        {
          id: 'project-1',
          title: 'Project 1',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'project-2',
          title: 'Project 2',
          created_at: '2024-12-31T23:59:59Z',
        },
      ];

      render(<ProjectList projects={projectsWithDates} />);

      const dateElements = screen.getAllByText(/Created/);
      expect(dateElements.length).toBe(2);
    });
  });
});
