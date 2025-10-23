'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import UserMenu from '@/components/UserMenu';
import toast from 'react-hot-toast';
import { browserLogger } from '@/lib/browserLogger';

interface EditorHeaderProps {
  projectId: string;
  currentTab: 'video-editor' | 'generate-video' | 'generate-audio' | 'image-editor';
  onExport?: () => void;
}

interface Project {
  id: string;
  title: string;
}

export default function EditorHeader({ projectId, currentTab, onExport }: EditorHeaderProps) {
  const router = useRouter();
  const { supabaseClient } = useSupabase();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

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

  const handleRenameClick = (e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent dropdown from toggling
    setRenameValue(currentProject?.title || '');
    setIsRenaming(true);
    setIsDropdownOpen(false);
  };

  const handleRenameSubmit = async () => {
    if (!supabaseClient || !renameValue.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    try {
      const { error } = await supabaseClient
        .from('projects')
        .update({ title: renameValue.trim() })
        .eq('id', projectId);

      if (error) throw error;

      setCurrentProject({ id: projectId, title: renameValue.trim() });
      setProjects(projects.map(p => p.id === projectId ? { ...p, title: renameValue.trim() } : p));
      toast.success('Project renamed successfully');
      setIsRenaming(false);
    } catch (error) {
      browserLogger.error({ error, projectId }, 'Failed to rename project');
      toast.error('Failed to rename project');
    }
  };

  const handleDeleteProject = async () => {
    if (!supabaseClient) return;

    const confirmDelete = confirm(`Delete "${currentProject?.title}"? This will permanently delete the project and all its assets.`);
    if (!confirmDelete) return;

    try {
      const { error } = await supabaseClient
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      toast.success('Project deleted successfully');
      router.push('/');
    } catch (error) {
      browserLogger.error({ error, projectId }, 'Failed to delete project');
      toast.error('Failed to delete project');
    }
  };

  return (
    <header className="border-b border-neutral-200 bg-white px-6 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Project Dropdown and Actions */}
        <div className="flex items-center gap-2">
          <div className="relative">
            {isRenaming ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleRenameSubmit();
                    if (e.key === 'Escape') setIsRenaming(false);
                  }}
                  className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 focus:border-neutral-500 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={() => void handleRenameSubmit()}
                  className="rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsRenaming(false)}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
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
            )}

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
                        <div
                          key={project.id}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 transition-colors flex items-center justify-between group ${
                            project.id === projectId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-neutral-900'
                          }`}
                        >
                          <button
                            onClick={() => project.id === projectId ? handleRenameClick() : handleProjectChange(project.id)}
                            className="flex-1 text-left"
                          >
                            <span>{project.title}</span>
                          </button>
                          {project.id === projectId && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={handleRenameClick}
                                className="p-1 rounded hover:bg-blue-100 transition-colors"
                                title="Rename project"
                              >
                                <svg className="h-3.5 w-3.5 text-blue-500 opacity-60 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDeleteProject();
                                }}
                                className="p-1 rounded hover:bg-red-100 transition-colors"
                                title="Delete project"
                              >
                                <svg className="h-3.5 w-3.5 text-red-500 opacity-60 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 rounded-lg bg-neutral-100 p-1">
          <Link
            href={`/editor/${projectId}/timeline`}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              currentTab === 'video-editor'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Video Editor
          </Link>
          <Link
            href={`/editor/${projectId}`}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              currentTab === 'generate-video'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Generate Video
          </Link>
          <Link
            href={`/editor/${projectId}/generate-audio`}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              currentTab === 'generate-audio'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Generate Audio
          </Link>
          <Link
            href={`/editor/${projectId}/keyframe`}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              currentTab === 'image-editor'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Image Editor
          </Link>
        </nav>

        {/* Export Video Button and User Menu */}
        <div className="flex items-center gap-3">
          {onExport && currentTab === 'video-editor' && (
            <button
              onClick={onExport}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 transition-colors flex items-center gap-2"
              title="Export/Render video"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Video
            </button>
          )}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
