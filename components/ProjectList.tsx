/**
 * ProjectList Component
 *
 * Displays list of user projects with delete functionality
 * - Memoized project items for performance
 * - Delete confirmation dialog
 * - Auto-refresh after deletion
 */
'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { browserLogger } from '@/lib/browserLogger';
import { ICON_SIZES } from '@/lib/constants/ui';

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
}

/**
 * Memoized project item to prevent re-renders when other projects change
 */
const ProjectItem = React.memo<ProjectItemProps>(function ProjectItem({ project, onDelete }) {
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
        onClick={(e) => void onDelete(project, e)}
        className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 rounded-lg border border-red-300 bg-white p-2 text-red-600 hover:bg-red-50 transition-all shadow-sm"
        title="Delete project"
      >
        <svg
          className={`h-${ICON_SIZES.ICON_SIZE_SM} w-${ICON_SIZES.ICON_SIZE_SM}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  );
});

export const ProjectList = React.memo<ProjectListProps>(function ProjectList({ projects }) {
  const router = useRouter();

  const handleDeleteProject = useCallback(
    async (project: Project, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const confirmDelete = confirm(
        `Delete "${project.title || 'Untitled Project'}"? This will permanently delete the project and all its assets.`
      );
      if (!confirmDelete) return;

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
      }
    },
    [router]
  );

  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <ProjectItem key={project.id} project={project} onDelete={handleDeleteProject} />
      ))}
    </div>
  );
});
