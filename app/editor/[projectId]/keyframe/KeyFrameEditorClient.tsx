'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { v4 as uuid } from 'uuid';
import toast, { Toaster } from 'react-hot-toast';
import EditorHeader from '@/components/EditorHeader';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { browserLogger } from '@/lib/browserLogger';

interface KeyFrameEditorClientProps {
  projectId: string;
}

interface KeyFrame {
  id: string;
  storage_url: string;
  metadata: {
    filename?: string;
    mimeType?: string;
    sourceUrl?: string;
    thumbnail?: string;
    sceneId?: string;
    frameType?: 'first' | 'last' | 'uploaded';
  } | null;
  created_at: string;
}

interface EditHistory {
  id: string;
  prompt: string;
  inputImages: string[];
  outputImage: string;
  timestamp: string;
}

export default function KeyFrameEditorClient({ projectId }: KeyFrameEditorClientProps) {
  const { supabaseClient } = useSupabase();
  const [keyframes, setKeyframes] = useState<KeyFrame[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editHistory, setEditHistory] = useState<EditHistory[]>([]);
  const [uploadPending, setUploadPending] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Load keyframes from database
  const loadKeyframes = useCallback(async () => {
    if (!supabaseClient) return;

    try {
      const { data, error } = await supabaseClient
        .from('keyframes')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        browserLogger.error({ error, projectId }, 'Failed to load keyframes');
        toast.error('Failed to load keyframes');
        return;
      }

      if (data) {
        setKeyframes(data as KeyFrame[]);
      }
    } catch (error) {
      browserLogger.error({ error, projectId }, 'Error loading keyframes');
      toast.error('Error loading keyframes');
    }
  }, [supabaseClient, projectId]);

  useEffect(() => {
    loadKeyframes();
  }, [loadKeyframes]);

  // Real-time subscriptions
  useEffect(() => {
    if (!supabaseClient) return;

    const channel = supabaseClient
      .channel(`keyframes:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'keyframes',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          loadKeyframes();
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [supabaseClient, projectId, loadKeyframes]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !supabaseClient) return;

    setUploadPending(true);
    toast.loading('Uploading images...', { id: 'upload' });

    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      for (const file of Array.from(files)) {
        const fileId = uuid();
        const fileName = `${fileId}-${file.name}`;
        const storagePath = `${user.id}/${projectId}/keyframes/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabaseClient.storage
          .from('assets')
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabaseClient.storage
          .from('assets')
          .getPublicUrl(storagePath);

        // Create keyframe record
        await supabaseClient
          .from('keyframes')
          .insert({
            id: fileId,
            user_id: user.id,
            project_id: projectId,
            storage_url: storagePath,
            metadata: {
              filename: file.name,
              mimeType: file.type,
              sourceUrl: publicUrl,
              frameType: 'uploaded',
            },
          });
      }

      toast.success('Images uploaded successfully!', { id: 'upload' });
      loadKeyframes();
    } catch (error) {
      browserLogger.error({ error, projectId }, 'Upload failed');
      toast.error(error instanceof Error ? error.message : 'Upload failed', { id: 'upload' });
    } finally {
      setUploadPending(false);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = '';
      }
    }
  };

  const toggleImageSelection = (imageUrl: string) => {
    setSelectedImages(prev =>
      prev.includes(imageUrl)
        ? prev.filter(url => url !== imageUrl)
        : [...prev, imageUrl]
    );
  };

  const handleEditImages = async () => {
    if (selectedImages.length === 0 || !editPrompt.trim() || !supabaseClient) {
      toast.error('Please select images and enter a prompt');
      return;
    }

    setIsEditing(true);
    toast.loading('Editing images with Gemini...', { id: 'edit' });

    try {
      const response = await fetch('/api/ai/edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrls: selectedImages,
          prompt: editPrompt,
          projectId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Image editing failed');
      }

      toast.success('Image edited successfully!', { id: 'edit' });

      // Add to history
      const historyEntry: EditHistory = {
        id: uuid(),
        prompt: editPrompt,
        inputImages: selectedImages,
        outputImage: data.imageUrl,
        timestamp: new Date().toISOString(),
      };
      setEditHistory(prev => [historyEntry, ...prev]);

      // Clear selection and prompt
      setSelectedImages([]);
      setEditPrompt('');

      // Reload keyframes to show new result
      loadKeyframes();
    } catch (error) {
      browserLogger.error({ error, projectId }, 'Image editing failed');
      toast.error(error instanceof Error ? error.message : 'Image editing failed', { id: 'edit' });
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteKeyframe = async (keyframe: KeyFrame) => {
    if (!supabaseClient) return;
    if (!confirm('Delete this keyframe?')) return;

    try {
      // Delete from database
      const { error } = await supabaseClient
        .from('keyframes')
        .delete()
        .eq('id', keyframe.id);

      if (error) throw error;

      // Delete from storage
      await supabaseClient.storage
        .from('assets')
        .remove([keyframe.storage_url]);

      toast.success('Keyframe deleted');
      loadKeyframes();
    } catch (error) {
      browserLogger.error({ error, projectId }, 'Delete failed');
      toast.error('Failed to delete keyframe');
    }
  };

  return (
    <div className="flex h-full flex-col">
      <EditorHeader projectId={projectId} currentTab="keyframe-editor" />
      <Toaster position="bottom-right" />

      <div className="grid h-full grid-cols-[280px_1fr_320px] gap-6 p-6">
        {/* Keyframes Gallery */}
        <aside className="flex flex-col gap-4 overflow-hidden rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-neutral-900">Keyframes</h2>
            <div className="flex items-center gap-2">
              <input
                ref={uploadInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                disabled={uploadPending}
                className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-75"
              >
                {uploadPending ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {keyframes.length === 0 ? (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-8 text-center text-xs text-neutral-600">
                No keyframes yet. Upload images to begin editing.
              </div>
            ) : (
              keyframes.map((keyframe) => {
                const imageUrl = keyframe.metadata?.sourceUrl || keyframe.storage_url;
                const isSelected = selectedImages.includes(imageUrl);
                return (
                  <div key={keyframe.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => toggleImageSelection(imageUrl)}
                      className={`w-full rounded-lg border-2 transition ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-transparent hover:border-neutral-300'
                      }`}
                    >
                      <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                        <Image
                          src={imageUrl}
                          alt={keyframe.metadata?.filename || 'Keyframe'}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="p-2">
                        <p className="truncate text-xs font-medium text-neutral-900">
                          {keyframe.metadata?.filename || 'Keyframe'}
                        </p>
                        {keyframe.metadata?.frameType && (
                          <p className="text-xs text-neutral-500 capitalize">
                            {keyframe.metadata.frameType} frame
                          </p>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() => void handleDeleteKeyframe(keyframe)}
                      className="absolute right-2 top-2 z-10 rounded-md bg-red-500 p-1.5 text-white shadow-lg transition-all hover:bg-red-600"
                      title="Delete keyframe"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Main Editor Area */}
        <main className="flex flex-col gap-4 overflow-hidden">
          {/* Selected Images Preview */}
          <section className="flex-1 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm overflow-hidden">
            <h3 className="mb-3 text-sm font-semibold text-neutral-900">
              Selected Images ({selectedImages.length})
            </h3>
            {selectedImages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mb-3 flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-blue-100">
                    <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-neutral-900">Select images to edit</p>
                  <p className="mt-1 text-xs text-neutral-500">Click on images in the gallery to select them</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 overflow-y-auto" style={{ maxHeight: 'calc(100% - 2rem)' }}>
                {selectedImages.map((imageUrl, idx) => (
                  <div key={idx} className="relative aspect-video overflow-hidden rounded-lg border border-neutral-200">
                    <Image
                      src={imageUrl}
                      alt={`Selected ${idx + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Edit Prompt */}
          <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-neutral-900">Edit with Gemini 2.5 Flash</h3>
            <div className="flex gap-3">
              <textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="Describe how you want to edit the images... (e.g., 'Remove the background', 'Make it black and white', 'Add a sunset in the background')"
                rows={3}
                className="flex-1 resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                onClick={handleEditImages}
                disabled={isEditing || selectedImages.length === 0 || !editPrompt.trim()}
                className="rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 px-6 py-2 text-sm font-semibold text-white hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEditing ? 'Editing...' : 'Edit'}
              </button>
            </div>
          </section>
        </main>

        {/* Edit History */}
        <aside className="flex flex-col gap-4 overflow-hidden rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">Edit History</h2>
          <div className="flex-1 overflow-y-auto space-y-3">
            {editHistory.length === 0 ? (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-8 text-center text-xs text-neutral-600">
                No edits yet
              </div>
            ) : (
              editHistory.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 space-y-2">
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-neutral-200">
                    <Image
                      src={entry.outputImage}
                      alt="Edited result"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <p className="text-xs text-neutral-700 line-clamp-2">{entry.prompt}</p>
                  <p className="text-xs text-neutral-500">
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
