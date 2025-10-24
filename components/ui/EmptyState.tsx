import React from 'react';
/**
 * EmptyState Component
 *
 * Displays an empty state with icon, title, description, and optional action button.
 * Used when no data is available or initial setup is needed.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<FolderOpen className="h-8 w-8 text-gray-400" />}
 *   title="No projects yet"
 *   description="Create your first project to get started"
 *   action={{
 *     label: "Create Project",
 *     onClick: () => handleCreateProject()
 *   }}
 * />
 * ```
 */
import * as React from 'react';
import { Button } from '@/components/ui/Button';

/**
 * Props for the EmptyState component
 */
interface EmptyStateProps {
  /** Icon element to display (typically from Lucide or similar) */
  icon: React.ReactNode;
  /** Main heading text */
  title: string;
  /** Descriptive text explaining the empty state */
  description: string;
  /** Optional action button configuration */
  action?: {
    /** Button text */
    label: string;
    /** Click handler for the action button */
    onClick: () => void;
  };
}

/**
 * An empty state component for when no content is available.
 *
 * Features:
 * - Centered layout with dashed border
 * - Icon in circular background
 * - Title and description text
 * - Optional call-to-action button
 *
 * @param icon - React element for the icon (e.g., Lucide icon)
 * @param title - Main heading text
 * @param description - Supporting description text
 * @param action - Optional action button with label and onClick
 * @returns A styled empty state container
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        {icon}
      </div>
      <div className="space-y-1">
        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {action && <Button onClick={action.onClick}>{action.label}</Button>}
    </div>
  );
}
