'use client';

import { UserMenu } from '@/components/UserMenu';
import { CreateProjectButton } from '@/components/CreateProjectButton';

export function HomeHeader() {
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
