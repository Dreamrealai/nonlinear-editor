/**
 * BackupButton Component
 *
 * Button to open the backup management modal.
 * Can be placed in editor header or toolbar.
 *
 * @module components/BackupButton
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { ProjectBackupManager } from '@/components/ProjectBackupManager';

interface BackupButtonProps {
  projectId: string;
  projectTitle?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function BackupButton({
  projectId,
  projectTitle,
  variant = 'ghost',
  size = 'sm',
  className,
}: BackupButtonProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={(): void => setIsOpen(true)}
        className={className}
        title="Project backups"
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
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
          />
        </svg>
        <span className="ml-2 hidden sm:inline">Backups</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <ProjectBackupManager projectId={projectId} projectTitle={projectTitle} />
        </DialogContent>
      </Dialog>
    </>
  );
}
