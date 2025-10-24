'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { browserLogger } from '@/lib/browserLogger';
import toast from 'react-hot-toast';

export function CreateProjectButton() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateProject = async () => {
    setIsCreating(true);
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
      browserLogger.error({ error }, 'Error creating project');
      toast.error('Failed to create project. Please try again.');
      setIsCreating(false);
    }
  };

  return (
    <button
      onClick={handleCreateProject}
      disabled={isCreating}
      className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-neutral-800 disabled:opacity-50"
    >
      {isCreating ? 'Creating...' : 'New Project'}
    </button>
  );
}
