'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSupabase } from '@/components/providers/SupabaseProvider';

interface EditorHeaderProps {
  projectId: string;
  currentTab: 'video-editor' | 'keyframe-editor';
}

interface Project {
  id: string;
  title: string;
}

export default function EditorHeader({ projectId, currentTab }: EditorHeaderProps) {
  const router = useRouter();
  const { supabaseClient } = useSupabase();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (!supabaseClient) return;

    const loadProjects = async () => {
      const { data } = await supabaseClient
        .from('projects')
        .select('id, title')
        .order('created_at', { ascending: false });

      if (data) {
        setProjects(data);
        const current = data.find(p => p.id === projectId);
        setCurrentProject(current || null);
      }
    };

    loadProjects();
  }, [supabaseClient, projectId]);

  const handleProjectChange = (newProjectId: string) => {
    setIsDropdownOpen(false);
    router.push(`/editor/${newProjectId}`);
  };

  return (
    <header className="border-b border-neutral-200 bg-white px-6 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Project Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-50 transition-colors"
          >
            <svg className="h-4 w-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            {currentProject?.title || 'Select Project'}
            <svg className={`h-4 w-4 text-neutral-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-lg border border-neutral-200 bg-white shadow-lg">
                <div className="max-h-64 overflow-y-auto py-1">
                  {projects.length === 0 ? (
                    <div className="px-4 py-2 text-sm text-neutral-500">No projects found</div>
                  ) : (
                    projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => handleProjectChange(project.id)}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 transition-colors ${
                          project.id === projectId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-neutral-900'
                        }`}
                      >
                        {project.title}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 rounded-lg bg-neutral-100 p-1">
          <Link
            href={`/editor/${projectId}`}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              currentTab === 'video-editor'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Video Editor
          </Link>
          <Link
            href={`/editor/${projectId}/keyframe`}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              currentTab === 'keyframe-editor'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Key Frame Editor
          </Link>
        </nav>
      </div>
    </header>
  );
}
