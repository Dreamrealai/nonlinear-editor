/**
 * useProjectPresence Hook
 *
 * Track user presence in a project using Supabase Realtime
 * - Shows who's currently viewing the project
 * - Updates presence status in real-time
 * - Cleans up on unmount
 */

import { useEffect, useState, useCallback } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { browserLogger } from '@/lib/browserLogger';

export interface PresenceUser {
  user_id: string;
  email?: string;
  name?: string;
  last_seen_at: string;
  is_online: boolean;
}

export interface UseProjectPresenceOptions {
  projectId: string;
  enabled?: boolean;
}

export interface UseProjectPresenceReturn {
  activeUsers: PresenceUser[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to track user presence in a project
 *
 * @param options - Configuration options
 * @returns Active users and loading state
 */
export function useProjectPresence({
  projectId,
  enabled = true,
}: UseProjectPresenceOptions): UseProjectPresenceReturn {
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchActiveUsers = useCallback(async (): Promise<void> => {
    if (!enabled || !projectId) {
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createBrowserSupabaseClient();

      const { data, error: fetchError } = await supabase
        .from('project_collaborators')
        .select('user_id, is_online, last_seen_at')
        .eq('project_id', projectId)
        .eq('is_online', true);

      if (fetchError) {
        throw fetchError;
      }

      setActiveUsers(
        (data || []).map((user): { user_id: any; is_online: any; last_seen_at: any; } => ({
          user_id: user.user_id,
          is_online: user.is_online,
          last_seen_at: user.last_seen_at,
        }))
      );
      setError(null);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Failed to fetch active users');
      setError(errorObj);
      browserLogger.error({ error: err, projectId }, 'Failed to fetch active users');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, enabled]);

  const updatePresence = useCallback(
    async (isOnline: boolean): Promise<void> => {
      if (!enabled || !projectId) return;

      try {
        const supabase = createBrowserSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          browserLogger.warn({ projectId }, 'Cannot update presence: user not authenticated');
          return;
        }

        // Call the RPC function to update presence
        const { error: rpcError } = await supabase.rpc('update_collaborator_presence', {
          p_project_id: projectId,
          p_user_id: user.id,
          p_is_online: isOnline,
        });

        if (rpcError) {
          // If RPC fails, it might mean the collaborator record doesn't exist yet
          // This is okay for now - we'll just skip the update
          browserLogger.debug(
            { error: rpcError, projectId, userId: user.id },
            'Presence update skipped (user may not be a collaborator)'
          );
        } else {
          browserLogger.debug({ projectId, userId: user.id, isOnline }, 'Presence updated');
        }
      } catch (err) {
        browserLogger.error({ error: err, projectId }, 'Failed to update presence');
      }
    },
    [projectId, enabled]
  );

  useEffect((): (() => void) | undefined => {
    if (!enabled || !projectId) {
      return;
    }

    // Initial fetch
    fetchActiveUsers();

    // Set up Supabase Realtime subscription
    const supabase = createBrowserSupabaseClient();

    const channel = supabase
      .channel(`project:${projectId}:presence`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_collaborators',
          filter: `project_id=eq.${projectId}`,
        },
        (payload): void => {
          browserLogger.debug({ payload, projectId }, 'Presence change detected');
          // Refetch active users when any collaborator record changes
          fetchActiveUsers();
        }
      )
      .subscribe();

    // Mark user as online
    updatePresence(true);

    // Set up heartbeat to keep presence alive
    const heartbeatInterval = setInterval(
      (): void => {
        updatePresence(true);
      },
      30000
    ); // Every 30 seconds

    // Cleanup function
    return (): void => {
      clearInterval(heartbeatInterval);
      updatePresence(false);
      supabase.removeChannel(channel);
    };
  }, [projectId, enabled, fetchActiveUsers, updatePresence]);

  return {
    activeUsers,
    isLoading,
    error,
  };
}
