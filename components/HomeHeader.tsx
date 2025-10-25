'use client';

import React from 'react';
/**
 * HomeHeader - Main header for the projects homepage
 *
 * Displays the page title and primary actions for the projects page.
 * Provides quick access to creating new projects and user account settings.
 *
 * Features:
 * - "My Projects" page title
 * - Create new project button
 * - User menu with account options
 * - Responsive layout with flexbox alignment
 *
 * @example
 * ```tsx
 * <HomeHeader />
 * ```
 */

import { UserMenu } from '@/components/UserMenu';
import { CreateProjectButton } from '@/components/CreateProjectButton';

export function HomeHeader(): React.ReactElement {
  return (
    <div className="mb-8 flex items-center justify-between">
      <h1 className="text-3xl font-bold text-neutral-900">My Projects</h1>
      <div className="flex gap-3">
        <CreateProjectButton />
        <UserMenu />
      </div>
    </div>
  );
}
