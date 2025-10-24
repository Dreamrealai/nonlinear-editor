/**
 * ProjectList Component
 *
 * Displays list of user projects with delete functionality
 * - Memoized project items for performance
 * - Delete confirmation dialog
 * - Auto-refresh after deletion
 */
'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { browserLogger } from '@/lib/browserLogger';
import { ICON_SIZES } from '@/lib/constants/ui';
import { EmptyState } from '@/components/ui/EmptyState';
import { Film, Trash2 } from 'lucide-react';

export interface Project {
  id: string;
  title: string;
  created_at: string;
}

export interface ProjectListProps {
  projects: Project[];
}

interface ProjectItemProps {
  project: Project;
  onDelete: (project: Project, e: React.MouseEvent) => Promise<void>;
  isDeleting: boolean;
}

/**
 * Memoized project item to prevent re-renders when other projects change
 */
const ProjectItem = React.memo<ProjectItemProps>(function ProjectItem({ project, onDelete, isDeleting }): React.ReactElement {
  return (
    <div key={project.id} className="group relative">
      <Link
        href={`/editor/${project.id}`}
        className="block rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:border-neutral-300 hover:shadow-md"
      >
        <h2 className="text-lg font-semibold text-neutral-900">
          {project.title || 'Untitled Project'}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Created {new Date(project.created_at).toLocaleDateString()}
        </p>
      </Link>
      <button
        onClick={(e): undefined => void onDelete(project, e)}
        disabled={isDeleting}
        className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 rounded-lg border border-red-300 bg-white p-2 text-red-600 hover:bg-red-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        title={isDeleting ? 'Deleting...' : 'Delete project'}
      >
        {isDeleting ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
        ) : (
          <Trash2 className={`h-${ICON_SIZES.ICON_SIZE_SM} w-${ICON_SIZES.ICON_SIZE_SM}`} />
        )}
      </button>
    </div>
  );
});

export const ProjectList = React.memo<ProjectListProps>(function ProjectList({ projects }): React.ReactElement {
  const router = useRouter();
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  const handleDeleteProject = useCallback(
    async (project: Project, e: React.MouseEvent): Promise<void> => {
      e.preventDefault();
      e.stopPropagation();

      const confirmDelete = confirm(
        `Delete "${project.title || 'Untitled Project'}"? This will permanently delete the project and all its assets.`
      );
      if (!confirmDelete) return;

      setDeletingProjectId(project.id);

      try {
        // Use API endpoint instead of direct database access
        const response = await fetch(`/api/projects/${project.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete project');
        }

        toast.success('Project deleted successfully');
        router.refresh();
      } catch (error) {
        browserLogger.error({ error, projectId: project.id }, 'Failed to delete project');
        toast.error('Failed to delete project');
      } finally {
        setDeletingProjectId(null);
      }
    },
    [router]
  );

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={<Film className="h-10 w-10 text-gray-400" />}
        title="No projects yet"
        description="Get started by creating your first project."
        action={{
          label: 'Create Project',
          onClick: (): void => router.push('/'),
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {projects.map((project): React.ReactElement => (
        <ProjectItem key={project.id} project={project} onDelete={handleDeleteProject} isDeleting={deletingProjectId === project.id} />
      ))}
    </div>
  );
});
