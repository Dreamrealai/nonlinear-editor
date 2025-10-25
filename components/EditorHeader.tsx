/**
 * EditorHeader - Main navigation and controls for the video editor
 *
 * Provides the top navigation bar for the editor with project switching,
 * tab navigation, export controls, theme toggle, backup, and user menu.
 * Supports both desktop and mobile layouts with responsive hamburger menu.
 *
 * Features:
 * - Project switching dropdown with search
 * - Project renaming and deletion
 * - Tab navigation (Video Editor, Generate Video, Generate Audio, Image Editor)
 * - Export button integration
 * - Auto-save indicator with last saved timestamp
 * - Theme toggle (light/dark/system)
 * - Backup button
 * - Generation dashboard access
 * - User menu with account controls
 * - Mobile-responsive hamburger menu
 *
 * @param projectId - The ID of the current project being edited
 * @param currentTab - The currently active editor tab
 * @param onExport - Optional callback function to trigger export
 * @param lastSaved - Optional timestamp of last successful save
 * @param isSaving - Optional boolean indicating if save is in progress
 *
 * @example
 * ```tsx
 * <EditorHeader
 *   projectId="550e8400-e29b-41d4-a716-446655440000"
 *   currentTab="video-editor"
 *   onExport={() => setShowExportModal(true)}
 *   lastSaved={new Date()}
 *   isSaving={false}
 * />
 * ```
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { UserMenu } from '@/components/UserMenu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BackupButton } from '@/components/BackupButton';
import { LastSavedIndicator } from '@/components/LastSavedIndicator';
import toast from 'react-hot-toast';
import { browserLogger } from '@/lib/browserLogger';
import {
  GenerationDashboard,
  useGenerationDashboardModal,
} from '@/components/generation/GenerationDashboard';

interface EditorHeaderProps {
  projectId: string;
  currentTab: 'video-editor' | 'generate-video' | 'generate-audio' | 'image-editor';
  onExport?: () => void;
  onExportProject?: (format: 'json' | 'edl' | 'xml') => void;
  onImportProject?: () => void;
  lastSaved?: Date | null;
  isSaving?: boolean;
}

interface Project {
  id: string;
  title: string;
}

export function EditorHeader({
  projectId,
  currentTab,
  onExport,
  onExportProject,
  onImportProject,
  lastSaved,
  isSaving,
}: EditorHeaderProps): React.ReactElement {
  const router = useRouter();
  const { supabaseClient } = useSupabase();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExportProjectDropdownOpen, setIsExportProjectDropdownOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const dashboard = useGenerationDashboardModal();

  useEffect((): void => {
    if (!supabaseClient) return;

    const loadProjects = async (): Promise<void> => {
      const { data } = await supabaseClient
        .from('projects')
        .select('id, title')
        .order('created_at', { ascending: false });

      if (data) {
        setProjects(data);
        const current = data.find((p): boolean => p.id === projectId);
        setCurrentProject(current || null);
      }
    };

    void loadProjects();
  }, [supabaseClient, projectId]);

  const handleProjectChange = useCallback(
    (newProjectId: string): void => {
      setIsDropdownOpen(false);
      router.push(`/editor/${newProjectId}`);
    },
    [router]
  );

  const handleRenameClick = useCallback(
    (e?: React.MouseEvent): void => {
      e?.stopPropagation(); // Prevent dropdown from toggling
      setRenameValue(currentProject?.title || '');
      setIsRenaming(true);
      setIsDropdownOpen(false);
    },
    [currentProject?.title]
  );

  const handleRenameSubmit = useCallback(async (): Promise<void> => {
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
      setProjects(
        projects.map((p): Project => (p.id === projectId ? { ...p, title: renameValue.trim() } : p))
      );
      toast.success('Project renamed successfully');
      setIsRenaming(false);
    } catch (error) {
      browserLogger.error({ error, projectId }, 'Failed to rename project');
      toast.error('Failed to rename project');
    }
  }, [supabaseClient, renameValue, projectId, projects]);

  const handleDeleteProject = useCallback(async (): Promise<void> => {
    if (!supabaseClient) return;

    const confirmDelete = confirm(
      `Delete "${currentProject?.title}"? This will permanently delete the project and all its assets.`
    );
    if (!confirmDelete) return;

    setIsDeleting(true);

    try {
      const { error } = await supabaseClient.from('projects').delete().eq('id', projectId);

      if (error) throw error;

      toast.success('Project deleted successfully');
      router.push('/');
    } catch (error) {
      browserLogger.error({ error, projectId }, 'Failed to delete project');
      toast.error('Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  }, [supabaseClient, projectId, currentProject?.title, router]);

  return (
    <header className="border-b border-neutral-200 bg-white px-3 sm:px-6 py-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        {/* Mobile Menu Button */}
        <button
          onClick={(): void => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden rounded-lg border border-neutral-300 bg-white p-2 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          aria-label="Toggle menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isMobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>

        {/* Project Dropdown and Actions */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="relative">
            {isRenaming ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e): void => setRenameValue(e.target.value)}
                  onKeyDown={(e): void => {
                    if (e.key === 'Enter') void handleRenameSubmit();
                    if (e.key === 'Escape') setIsRenaming(false);
                  }}
                  className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 focus:border-neutral-500 focus:outline-none"
                  aria-label="Rename project"
                />
                <button
                  onClick={(): undefined => void handleRenameSubmit()}
                  className="rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-700"
                >
                  Save
                </button>
                <button
                  onClick={(): void => setIsRenaming(false)}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={(): void => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-50 transition-colors"
              >
                <svg
                  className="h-4 w-4 text-neutral-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
                {currentProject?.title || 'Select Project'}
                <svg
                  className={`h-4 w-4 text-neutral-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            )}

            {isDropdownOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10"
                  onClick={(): void => setIsDropdownOpen(false)}
                  onKeyDown={(e): void => {
                    if (e.key === 'Escape') setIsDropdownOpen(false);
                  }}
                  aria-label="Close dropdown"
                  style={{ background: 'transparent', border: 'none', cursor: 'default' }}
                />
                <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-lg border border-neutral-200 bg-white shadow-lg">
                  <div className="max-h-64 overflow-y-auto py-1">
                    {projects.length === 0 ? (
                      <div className="px-4 py-2 text-sm text-neutral-500">No projects found</div>
                    ) : (
                      projects.map(
                        (project): React.ReactElement => (
                          <div
                            key={project.id}
                            className={`w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 transition-colors flex items-center justify-between group ${
                              project.id === projectId
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-neutral-900'
                            }`}
                          >
                            <button
                              onClick={(): void =>
                                project.id === projectId
                                  ? handleRenameClick()
                                  : handleProjectChange(project.id)
                              }
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
                                  <svg
                                    className="h-3.5 w-3.5 text-blue-500 opacity-60 group-hover:opacity-100"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                    />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e): void => {
                                    e.stopPropagation();
                                    void handleDeleteProject();
                                  }}
                                  disabled={isDeleting}
                                  className="p-1 rounded hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={isDeleting ? 'Deleting...' : 'Delete project'}
                                >
                                  {isDeleting ? (
                                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-500 border-t-transparent"></div>
                                  ) : (
                                    <svg
                                      className="h-3.5 w-3.5 text-red-500 opacity-60 group-hover:opacity-100"
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
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      )
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Navigation Tabs - Desktop */}
        <nav className="hidden lg:flex items-center gap-1 rounded-lg bg-neutral-100 p-1">
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

        {/* Export Video Button, Theme Toggle, and User Menu - Desktop */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Generation Dashboard Button - Always visible */}
          <button
            onClick={dashboard.open}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 transition-colors flex items-center gap-2"
            title="View all AI generations"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <span className="hidden sm:inline">Generations</span>
          </button>

          {currentTab === 'video-editor' && (
            <>
              {/* Last Saved Indicator */}
              {(lastSaved !== undefined || isSaving !== undefined) && (
                <LastSavedIndicator lastSaved={lastSaved ?? null} isSaving={isSaving ?? false} />
              )}

              {/* Backup Button */}
              <BackupButton
                projectId={projectId}
                projectTitle={currentProject?.title}
                variant="outline"
                size="sm"
              />

              {/* Keyboard Shortcuts Help Button */}
              <button
                onClick={(): void => {
                  // Trigger keyboard shortcuts modal via custom event
                  window.dispatchEvent(new CustomEvent('show-shortcuts-help'));
                }}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 transition-colors flex items-center gap-2"
                title="View keyboard shortcuts (Cmd+?)"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="hidden sm:inline">Shortcuts</span>
              </button>
              {/* Export Project Button with Dropdown */}
              {onExportProject && (
                <div className="relative">
                  <button
                    onClick={(): void =>
                      setIsExportProjectDropdownOpen(!isExportProjectDropdownOpen)
                    }
                    className="rounded-lg border border-blue-600 bg-white px-4 py-2 text-sm font-semibold text-blue-600 shadow hover:bg-blue-50 transition-colors flex items-center gap-2"
                    title="Export project in different formats"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span className="hidden sm:inline">Export Project</span>
                    <svg
                      className={`h-3 w-3 transition-transform ${isExportProjectDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {isExportProjectDropdownOpen && (
                    <>
                      <button
                        type="button"
                        className="fixed inset-0 z-10"
                        onClick={(): void => setIsExportProjectDropdownOpen(false)}
                        aria-label="Close dropdown"
                        style={{ background: 'transparent', border: 'none', cursor: 'default' }}
                      />
                      <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-800">
                        <div className="py-1">
                          <button
                            onClick={(): void => {
                              onExportProject('json');
                              setIsExportProjectDropdownOpen(false);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-3 text-neutral-900 dark:text-neutral-100"
                          >
                            <svg
                              className="h-4 w-4 text-blue-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            <div>
                              <div className="font-medium">JSON Format</div>
                              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                Full project backup
                              </div>
                            </div>
                          </button>
                          <button
                            onClick={(): void => {
                              onExportProject('edl');
                              setIsExportProjectDropdownOpen(false);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-3 text-neutral-900 dark:text-neutral-100"
                          >
                            <svg
                              className="h-4 w-4 text-purple-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                              />
                            </svg>
                            <div>
                              <div className="font-medium">EDL Format</div>
                              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                DaVinci Resolve compatible
                              </div>
                            </div>
                          </button>
                          <button
                            onClick={(): void => {
                              onExportProject('xml');
                              setIsExportProjectDropdownOpen(false);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-3 text-neutral-900 dark:text-neutral-100"
                          >
                            <svg
                              className="h-4 w-4 text-orange-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                              />
                            </svg>
                            <div>
                              <div className="font-medium">FCP XML</div>
                              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                Final Cut Pro / Premiere
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {onExport && (
                <button
                  onClick={onExport}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 transition-colors flex items-center gap-2"
                  title="Export/Render video (Cmd+E)"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span className="hidden sm:inline">Export Video</span>
                </button>
              )}

              {/* More Menu with Import Project */}
              {onImportProject && (
                <div className="relative">
                  <button
                    onClick={(): void => setIsMoreMenuOpen(!isMoreMenuOpen)}
                    className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 transition-colors flex items-center gap-2"
                    title="More options"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                      />
                    </svg>
                  </button>

                  {isMoreMenuOpen && (
                    <>
                      <button
                        type="button"
                        className="fixed inset-0 z-10"
                        onClick={(): void => setIsMoreMenuOpen(false)}
                        aria-label="Close menu"
                        style={{ background: 'transparent', border: 'none', cursor: 'default' }}
                      />
                      <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-lg border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-800">
                        <div className="py-1">
                          <button
                            onClick={(): void => {
                              onImportProject();
                              setIsMoreMenuOpen(false);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-3 text-neutral-900 dark:text-neutral-100"
                          >
                            <svg
                              className="h-4 w-4 text-green-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                              />
                            </svg>
                            <span className="font-medium">Import Project</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
          <ThemeToggle />
          <UserMenu />
        </div>

        {/* Generation Dashboard Modal */}
        <GenerationDashboard
          projectId={projectId}
          isOpen={dashboard.isOpen}
          onClose={dashboard.close}
          variant="modal"
        />

        {/* Mobile: Current Tab Title, Theme Toggle, and User Menu */}
        <div className="flex lg:hidden items-center gap-2">
          <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-[120px]">
            {currentTab === 'video-editor' && 'Video Editor'}
            {currentTab === 'generate-video' && 'Generate'}
            {currentTab === 'generate-audio' && 'Audio'}
            {currentTab === 'image-editor' && 'Image'}
          </span>
          <ThemeToggle size="sm" />
          <UserMenu />
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={(): void => setIsMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-80 bg-white shadow-xl z-50 lg:hidden overflow-y-auto dark:bg-neutral-900">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Menu
                </h2>
                <button
                  onClick={(): void => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-neutral-100"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Project Selector - Mobile */}
              {currentProject && (
                <div className="mb-4">
                  <p className="text-xs text-neutral-500 mb-1">Current Project</p>
                  <button
                    onClick={(): void => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
                  >
                    <svg
                      className="h-4 w-4 text-neutral-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      />
                    </svg>
                    <span className="flex-1 text-left truncate">{currentProject.title}</span>
                    <svg
                      className={`h-4 w-4 text-neutral-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {isDropdownOpen && (
                    <div className="mt-2 border border-neutral-200 rounded-lg bg-white">
                      <div className="max-h-48 overflow-y-auto">
                        {projects.map(
                          (project): React.ReactElement => (
                            <button
                              key={project.id}
                              onClick={(): void => {
                                handleProjectChange(project.id);
                                setIsMobileMenuOpen(false);
                              }}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 ${project.id === projectId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-neutral-900'}`}
                            >
                              {project.title}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Navigation Links - Mobile */}
            <nav className="p-4">
              <p className="text-xs text-neutral-500 mb-2">Navigation</p>
              <div className="space-y-1">
                <Link
                  href={`/editor/${projectId}/timeline`}
                  onClick={(): void => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium ${currentTab === 'video-editor' ? 'bg-blue-50 text-blue-700' : 'text-neutral-700 hover:bg-neutral-50'}`}
                >
                  Video Editor
                </Link>
                <Link
                  href={`/editor/${projectId}`}
                  onClick={(): void => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium ${currentTab === 'generate-video' ? 'bg-blue-50 text-blue-700' : 'text-neutral-700 hover:bg-neutral-50'}`}
                >
                  Generate Video
                </Link>
                <Link
                  href={`/editor/${projectId}/generate-audio`}
                  onClick={(): void => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium ${currentTab === 'generate-audio' ? 'bg-blue-50 text-blue-700' : 'text-neutral-700 hover:bg-neutral-50'}`}
                >
                  Generate Audio
                </Link>
                <Link
                  href={`/editor/${projectId}/keyframe`}
                  onClick={(): void => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium ${currentTab === 'image-editor' ? 'bg-blue-50 text-blue-700' : 'text-neutral-700 hover:bg-neutral-50'}`}
                >
                  Image Editor
                </Link>
              </div>
            </nav>

            {/* Actions - Mobile */}
            <div className="p-4 border-t border-neutral-200 space-y-2">
              {/* Generation Dashboard - Always visible */}
              <button
                onClick={(): void => {
                  dashboard.open();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 flex items-center justify-center gap-2"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                View Generations
              </button>

              {currentTab === 'video-editor' && (
                <>
                  <button
                    onClick={(): void => {
                      window.dispatchEvent(new CustomEvent('show-shortcuts-help'));
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 flex items-center justify-center gap-2"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Keyboard Shortcuts
                  </button>
                  {onExportProject && (
                    <>
                      <button
                        onClick={(): void => {
                          onExportProject('json');
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full rounded-lg border border-blue-600 bg-white px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-2"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        Export Project (JSON)
                      </button>
                      <button
                        onClick={(): void => {
                          onExportProject('edl');
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full rounded-lg border border-purple-600 bg-white px-3 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 flex items-center justify-center gap-2"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                        Export for DaVinci (EDL)
                      </button>
                    </>
                  )}
                  {onExport && (
                    <button
                      onClick={(): void => {
                        onExport();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Export Video
                    </button>
                  )}
                  {onImportProject && (
                    <button
                      onClick={(): void => {
                        onImportProject();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full rounded-lg border border-green-600 bg-white px-3 py-2 text-sm font-medium text-green-600 hover:bg-green-50 flex items-center justify-center gap-2"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      Import Project
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
