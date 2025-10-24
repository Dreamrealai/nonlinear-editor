import * as React from 'react';
import { Button } from '@/components/ui/Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
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
