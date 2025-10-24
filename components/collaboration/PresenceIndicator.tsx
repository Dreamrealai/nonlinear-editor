/**
 * PresenceIndicator Component
 *
 * Shows active users viewing/editing the current project
 * - Displays user avatars
 * - Shows online status
 * - Tooltip with user details
 */
'use client';

import { useProjectPresence } from '@/lib/hooks/useProjectPresence';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PresenceIndicatorProps {
  projectId: string;
  className?: string;
}

/**
 * Component to display active users in a project
 */
export function PresenceIndicator({ projectId, className }: PresenceIndicatorProps): JSX.Element {
  const { activeUsers, isLoading } = useProjectPresence({
    projectId,
    enabled: true,
  });

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
        <Users className="h-4 w-4" />
        <span>Loading...</span>
      </div>
    );
  }

  const userCount = activeUsers.length;

  if (userCount === 0) {
    return (
      <div
        className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}
        title="No other users online"
      >
        <Users className="h-4 w-4" />
        <span>Just you</span>
      </div>
    );
  }

  return (
    <div
      className={cn('flex items-center gap-2 text-sm', className)}
      title={`${userCount} ${userCount === 1 ? 'user' : 'users'} online`}
    >
      <Users className="h-4 w-4 text-green-500" />
      <span className="text-green-500 font-medium">{userCount}</span>
      <span className="text-muted-foreground">
        {userCount === 1 ? 'viewer' : 'viewers'} online
      </span>

      {/* User Avatars */}
      <div className="flex -space-x-2">
        {activeUsers.slice(0, 3).map((user, index): JSX.Element => (
          <div
            key={user.user_id}
            className="relative inline-block h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center"
            style={{ zIndex: 10 - index }}
            title={user.email || user.name || 'Anonymous User'}
          >
            <span className="text-xs font-semibold text-muted-foreground">
              {(user.email?.[0] || user.name?.[0] || '?').toUpperCase()}
            </span>
            {/* Online indicator */}
            <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border border-background" />
          </div>
        ))}
        {userCount > 3 && (
          <div
            className="relative inline-block h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground"
            style={{ zIndex: 7 }}
            title={`+${userCount - 3} more`}
          >
            +{userCount - 3}
          </div>
        )}
      </div>
    </div>
  );
}

export default PresenceIndicator;
