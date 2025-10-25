import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRouter } from 'next/navigation';
import { EditorHeader } from '@/components/EditorHeader';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import toast from 'react-hot-toast';

// Mock dependencies
jest.mock(
  'next/navigation',
  () => ({
    useRouter: jest.fn(),
  })
);

jest.mock(
  '@/components/providers/SupabaseProvider',
  () => ({
    useSupabase: jest.fn(),
  })
);

jest.mock(
  '@/components/UserMenu',
  () => ({
    UserMenu: function MockUserMenu(): JSX.Element {
      return <div data-testid="user-menu">User Menu</div>;
    },
  })
);

jest.mock(
  '@/components/ui/Tooltip',
  () => ({
    TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  })
);

jest.mock(
  'react-hot-toast',
  () => ({
    success: jest.fn(),
    error: jest.fn(),
  })
);

// Mock confirm
global.confirm = jest.fn(() => true);

describe('EditorHeader', () => {
  const mockPush = jest.fn();
  const mockSupabaseClient = {
    from: jest.fn(),
  };

  beforeEach((): void => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (useSupabase as jest.Mock).mockReturnValue({
      supabaseClient: mockSupabaseClient,
    });
  });

  it('should render the component with project title', async () => {
    const mockProjects = [
      { id: 'project-1', title: 'Test Project' },
      { id: 'project-2', title: 'Another Project' },
    ];

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockProjects,
        }),
      }),
    });

    render(<EditorHeader projectId="project-1" currentTab="video-editor" />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
  });

  it('should show all navigation tabs', () => {
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [],
        }),
      }),
    });

    render(<EditorHeader projectId="project-1" currentTab="video-editor" />);

    expect(screen.getByText('Video Editor')).toBeInTheDocument();
    expect(screen.getByText('Generate Video')).toBeInTheDocument();
    expect(screen.getByText('Generate Audio')).toBeInTheDocument();
    expect(screen.getByText('Image Editor')).toBeInTheDocument();
  });

  it('should highlight the current tab', () => {
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [],
        }),
      }),
    });

    const { container } = render(
      <EditorHeader projectId="project-1" currentTab="generate-video" />
    );

    const generateVideoLink = screen.getByText('Generate Video').closest('a');
    expect(generateVideoLink).toHaveClass('bg-white');
  });

  it('should open project dropdown when clicked', async () => {
    const mockProjects = [
      { id: 'project-1', title: 'Project One' },
      { id: 'project-2', title: 'Project Two' },
    ];

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockProjects,
        }),
      }),
    });

    render(<EditorHeader projectId="project-1" currentTab="video-editor" />);

    await waitFor(() => {
      expect(screen.getByText('Project One')).toBeInTheDocument();
    });

    const dropdownButton = screen.getByText('Project One').closest('button');
    fireEvent.click(dropdownButton!);

    await waitFor(() => {
      expect(screen.getByText('Project Two')).toBeInTheDocument();
    });
  });

  it('should switch projects when selecting from dropdown', async () => {
    const mockProjects = [
      { id: 'project-1', title: 'Project One' },
      { id: 'project-2', title: 'Project Two' },
    ];

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockProjects,
        }),
      }),
    });

    render(<EditorHeader projectId="project-1" currentTab="video-editor" />);

    await waitFor(() => {
      expect(screen.getByText('Project One')).toBeInTheDocument();
    });

    // Open dropdown
    const dropdownButton = screen.getByText('Project One').closest('button');
    fireEvent.click(dropdownButton!);

    // Click on Project Two
    await waitFor(() => {
      const projectTwoButton = screen.getByText('Project Two').closest('button');
      fireEvent.click(projectTwoButton!);
    });

    expect(mockPush).toHaveBeenCalledWith('/editor/project-2');
  });

  it('should enter rename mode when clicking current project in dropdown', async () => {
    const mockProjects = [{ id: 'project-1', title: 'Project One' }];

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockProjects,
        }),
      }),
    });

    render(<EditorHeader projectId="project-1" currentTab="video-editor" />);

    await waitFor(() => {
      expect(screen.getByText('Project One')).toBeInTheDocument();
    });

    // Open dropdown
    const dropdownButton = screen.getByText('Project One').closest('button');
    fireEvent.click(dropdownButton!);

    const renameButton = await screen.findByTitle('Rename project');
    fireEvent.click(renameButton);

    // Should show rename input
    await waitFor(() => {
      const input = screen.getByDisplayValue('Project One') as HTMLInputElement;
      expect(input).toBeInTheDocument();
    });
  });

  it('should rename project successfully', async () => {
    const mockProjects = [{ id: 'project-1', title: 'Old Name' }];

    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockProjects,
        }),
      }),
      update: mockUpdate,
    });

    render(<EditorHeader projectId="project-1" currentTab="video-editor" />);

    await waitFor(() => {
      expect(screen.getByText('Old Name')).toBeInTheDocument();
    });

    // Open dropdown and click rename option
    const dropdownButton = screen.getByText('Old Name').closest('button');
    fireEvent.click(dropdownButton!);

    const renameButton = await screen.findByTitle('Rename project');
    fireEvent.click(renameButton);

    // Type new name
    const input = (await screen.findByDisplayValue('Old Name')) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'New Name' } });

    // Submit
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ title: 'New Name' });
      expect(toast.success).toHaveBeenCalledWith('Project renamed successfully');
    });
  });

  it('should delete project when delete button is clicked', async () => {
    const mockProjects = [{ id: 'project-1', title: 'Project To Delete' }];

    const mockDelete = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockProjects,
        }),
      }),
      delete: mockDelete,
    });

    render(<EditorHeader projectId="project-1" currentTab="video-editor" />);

    await waitFor(() => {
      expect(screen.getByText('Project To Delete')).toBeInTheDocument();
    });

    const dropdownButton = screen.getByText('Project To Delete').closest('button');
    fireEvent.click(dropdownButton!);

    const deleteButton = await screen.findByTitle('Delete project');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Project deleted successfully');
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('should show error when rename fails', async () => {
    const mockProjects = [{ id: 'project-1', title: 'Project' }];

    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: new Error('Update failed') }),
    });

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockProjects,
        }),
      }),
      update: mockUpdate,
    });

    render(<EditorHeader projectId="project-1" currentTab="video-editor" />);

    await waitFor(() => {
      expect(screen.getByText('Project')).toBeInTheDocument();
    });

    const dropdownButton = screen.getByText('Project').closest('button');
    fireEvent.click(dropdownButton!);

    const renameButton = await screen.findByTitle('Rename project');
    fireEvent.click(renameButton);

    const input = (await screen.findByDisplayValue('Project')) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'New Name' } });

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to rename project');
    });
  });

  it('should cancel rename when Cancel button is clicked', async () => {
    const mockProjects = [{ id: 'project-1', title: 'Project' }];

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockProjects,
        }),
      }),
    });

    render(<EditorHeader projectId="project-1" currentTab="video-editor" />);

    await waitFor(() => {
      expect(screen.getByText('Project')).toBeInTheDocument();
    });

    const dropdownButton = screen.getByText('Project').closest('button');
    fireEvent.click(dropdownButton!);

    const renameButton = await screen.findByTitle('Rename project');
    fireEvent.click(renameButton);

    const input = (await screen.findByDisplayValue('Project')) as HTMLInputElement;
    expect(input).toBeInTheDocument();

    // Click cancel
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Should exit rename mode
    await waitFor(() => {
      expect(screen.queryByDisplayValue('Project')).not.toBeInTheDocument();
      expect(screen.getByText('Project')).toBeInTheDocument();
    });
  });

  it('should show "Select Project" when no project is found', async () => {
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [],
        }),
      }),
    });

    render(<EditorHeader projectId="unknown-id" currentTab="video-editor" />);

    await waitFor(() => {
      expect(screen.getByText('Select Project')).toBeInTheDocument();
    });
  });
});
