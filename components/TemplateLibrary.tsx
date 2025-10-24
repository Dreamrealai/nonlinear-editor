/**
 * TemplateLibrary Component
 *
 * Browse and use project templates
 * - Filter by category
 * - Search templates
 * - Preview template details
 * - Create project from template
 */
'use client';

import React, {  useState, useEffect  } from 'react';
import toast from 'react-hot-toast';
import { browserLogger } from '@/lib/browserLogger';
import type { ProjectTemplate, TemplateCategory } from '@/types/template';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Input } from '@/components/ui/Input';
import {
  Search,
  Film,
  Sparkles,
  TrendingUp,
  Type,
  Layers,
  Clock,
  Star,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TemplateLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: ProjectTemplate) => void;
}

const CATEGORY_ICONS: Record<TemplateCategory, React.ComponentType<{ className?: string }>> = {
  intro: Film,
  outro: Film,
  transition: Layers,
  title: Type,
  social_media: TrendingUp,
  commercial: Sparkles,
  tutorial: FileText,
  slideshow: Clock,
  lower_third: Type,
  custom: Star,
};

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  intro: 'Intros',
  outro: 'Outros',
  transition: 'Transitions',
  title: 'Titles',
  social_media: 'Social Media',
  commercial: 'Commercial',
  tutorial: 'Tutorial',
  slideshow: 'Slideshow',
  lower_third: 'Lower Third',
  custom: 'Custom',
};

export function TemplateLibrary({ isOpen, onClose, onSelectTemplate }: TemplateLibraryProps): React.ReactElement {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect((): void => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen, searchQuery, selectedCategory, currentPage]);

  const fetchTemplates = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: '12',
      });

      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      // Show featured first
      params.append('is_featured', 'true');

      const response = await fetch(`/api/templates?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch templates');
      }

      setTemplates(data.data.templates);
      setTotalPages(data.data.totalPages);
    } catch (err) {
      browserLogger.error({ error: err }, 'Failed to fetch templates');
      toast.error('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTemplate = async (template: ProjectTemplate): Promise<void> => {
    try {
      // Increment usage count
      await fetch(`/api/templates/${template.id}/use`, { method: 'POST' });

      onSelectTemplate(template);
      onClose();
    } catch (err) {
      browserLogger.error({ error: err, templateId: template.id }, 'Failed to use template');
      // Still allow selection even if usage count increment fails
      onSelectTemplate(template);
      onClose();
    }
  };

  const categories: Array<TemplateCategory | 'all'> = [
    'all',
    'intro',
    'outro',
    'transition',
    'title',
    'social_media',
    'commercial',
    'tutorial',
    'slideshow',
    'lower_third',
    'custom',
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Template Library</DialogTitle>
          <DialogDescription>
            Browse and select from our collection of video templates to jumpstart your project
          </DialogDescription>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="space-y-4 py-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e): void => {
                setSearchQuery(e.target.value);
                setCurrentPage(0); // Reset to first page on search
              }}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category): React.ReactElement => {
              const Icon = category === 'all' ? Star : CATEGORY_ICONS[category];
              const label = category === 'all' ? 'All' : CATEGORY_LABELS[category];

              return (
                <button
                  key={category}
                  onClick={(): void => {
                    setSelectedCategory(category);
                    setCurrentPage(0);
                  }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm whitespace-nowrap transition-all',
                    selectedCategory === category
                      ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                      : 'border-border hover:border-blue-500/50'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner variant="branded" size={40} />
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No templates found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || selectedCategory !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'No templates available yet'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 pb-4">
              {templates.map((template): React.ReactElement => {
                const Icon = CATEGORY_ICONS[template.category];

                return (
                  <button
                    key={template.id}
                    onClick={(): Promise<void> => handleSelectTemplate(template)}
                    className="group relative rounded-lg border border-border overflow-hidden hover:border-blue-500 transition-all text-left"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video bg-muted/50 flex items-center justify-center relative">
                      {template.thumbnail_url ? (
                        <img
                          src={template.thumbnail_url}
                          alt={template.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Icon className="h-12 w-12 text-muted-foreground" />
                      )}

                      {/* Featured Badge */}
                      {template.is_featured && (
                        <div className="absolute top-2 right-2 bg-yellow-500 text-black px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          Featured
                        </div>
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white font-semibold">Use Template</span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-sm line-clamp-1">{template.name}</h3>
                        <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      </div>

                      {template.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {template.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {template.duration_seconds && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {Math.ceil(template.duration_seconds)}s
                          </div>
                        )}
                        {template.usage_count !== undefined && template.usage_count > 0 && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {template.usage_count}
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      {template.tags && template.tags.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {template.tags.slice(0, 3).map((tag): React.ReactElement => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t pt-4">
            <div className="text-sm text-muted-foreground">
              Page {currentPage + 1} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(): void => setCurrentPage((p): number => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(): void => setCurrentPage((p): number => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
