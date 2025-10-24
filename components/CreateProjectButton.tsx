/**
 * CreateProjectButton Component
 *
 * Button component for creating new projects
 * - Handles project creation with loading state
 * - Shows success/error feedback via toast
 * - Redirects to editor on success
 */
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { browserLogger } from '@/lib/browserLogger';

export function CreateProjectButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateProject = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Untitled Project',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const project = await response.json();
      toast.success('Project created successfully');
      router.push(`/editor/${project.id}`);
    } catch (error) {
      browserLogger.error({ error }, 'Failed to create project');
      toast.error('Failed to create project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleCreateProject}
      disabled={isLoading}
      className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isLoading ? 'Creating...' : 'New Project'}
    </button>
  );
}
