'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Download, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { useEditorStore } from '@/state/useEditorStore';
import {
  exportProjectToJSON,
  downloadProjectJSON,
  importProjectFromFile,
  mergeTimelines,
  type ExportedProject,
} from '@/lib/utils/projectExportImport';
import toast from 'react-hot-toast';

interface ProjectExportImportProps {
  projectId: string;
  projectName: string;
}

/**
 * ProjectExportImport Component
 *
 * Provides UI for exporting and importing projects as JSON
 * Allows users to backup projects locally or transfer between systems
 */
export function ProjectExportImport({ projectId, projectName }: ProjectExportImportProps): JSX.Element {
  const timeline = useEditorStore((state): Timeline | null => state.timeline);
  const setTimeline = useEditorStore((state): (timeline: Timeline) => void => state.setTimeline);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ExportedProject | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Export current project
  const handleExport = useCallback((): void => {
    if (!timeline) {
      toast.error('No timeline to export');
      return;
    }

    try {
      const exportedProject = exportProjectToJSON(projectId, projectName, timeline);
      downloadProjectJSON(exportedProject, projectName);
      toast.success('Project exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export project: ' + (error as Error).message);
    }
  }, [timeline, projectId, projectName]);

  // Trigger file input
  const handleImportClick = useCallback((): void => {
    fileInputRef.current?.click();
  }, []);

  // Handle file selection
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const result = await importProjectFromFile(file);

      if (!result.success || !result.project) {
        toast.error(result.error || 'Failed to import project');
        setIsImporting(false);
        return;
      }

      // Show import preview/confirmation
      setImportPreview(result.project);
      setShowImportModal(true);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import project: ' + (error as Error).message);
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  // Confirm import (replace timeline)
  const handleConfirmImport = useCallback(
    (mode: 'replace' | 'merge'): void => {
      if (!importPreview || !timeline) {
        toast.error('Invalid import state');
        return;
      }

      try {
        if (mode === 'replace') {
          // Replace entire timeline
          const importedTimeline = {
            ...importPreview.timeline,
            projectId: timeline.projectId, // Keep current project ID
          };
          setTimeline(importedTimeline);
          toast.success('Project imported successfully!');
        } else {
          // Merge timelines
          const mergedTimeline = mergeTimelines(timeline, importPreview.timeline, {
            replaceAll: false,
            offsetTime: 0, // Could be configurable
            offsetTrack: 0,
          });
          setTimeline(mergedTimeline);
          toast.success('Clips merged into current project!');
        }

        setShowImportModal(false);
        setImportPreview(null);
      } catch (error) {
        console.error('Import confirmation error:', error);
        toast.error('Failed to apply import: ' + (error as Error).message);
      }
    },
    [importPreview, timeline, setTimeline]
  );

  // Cancel import
  const handleCancelImport = useCallback((): void => {
    setShowImportModal(false);
    setImportPreview(null);
  }, []);

  return (
    <>
      {/* Export/Import Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleExport}
          disabled={!timeline}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors"
          title="Export project as JSON file"
        >
          <Download className="h-4 w-4" />
          Export Project
        </button>

        <button
          type="button"
          onClick={handleImportClick}
          disabled={isImporting}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors"
          title="Import project from JSON file"
        >
          <Upload className="h-4 w-4" />
          {isImporting ? 'Importing...' : 'Import Project'}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Import project file"
        />
      </div>

      {/* Import Confirmation Modal */}
      {showImportModal && importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Import Project
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Review project details before importing
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Project Info */}
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                      {importPreview.projectName}
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Exported: {new Date(importPreview.exportDate).toLocaleString()}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Version: {importPreview.version}
                    </p>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {importPreview.metadata.clipCount}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Clips</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {importPreview.metadata.tracks}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Tracks</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {importPreview.metadata.duration.toFixed(1)}s
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Duration</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="flex gap-2">
                    {importPreview.metadata.hasAudio && (
                      <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                        Audio
                      </span>
                    )}
                    {importPreview.metadata.hasTextOverlays && (
                      <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                        Text
                      </span>
                    )}
                    {importPreview.metadata.hasMarkers && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                        Markers
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Features</div>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">
                      Import Mode
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      Choose whether to replace your current timeline or merge the imported clips
                      into it.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex gap-3">
              <button
                type="button"
                onClick={handleCancelImport}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(): void => handleConfirmImport('merge')}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Merge Clips
              </button>
              <button
                type="button"
                onClick={(): void => handleConfirmImport('replace')}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Replace Timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ProjectExportImport;
