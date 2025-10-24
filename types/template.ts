/**
 * Project Template Types
 *
 * Types for project template system
 */

import type { Timeline } from './timeline';

export type TemplateCategory =
  | 'intro'
  | 'outro'
  | 'transition'
  | 'title'
  | 'social_media'
  | 'commercial'
  | 'tutorial'
  | 'slideshow'
  | 'lower_third'
  | 'custom';

export interface ProjectTemplate {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  thumbnail_url?: string;
  timeline_data: Timeline;
  is_public: boolean;
  is_featured: boolean;
  tags?: string[];
  duration_seconds?: number;
  created_at: string;
  updated_at: string;
  usage_count?: number;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  category: TemplateCategory;
  thumbnail_url?: string;
  timeline_data: Timeline;
  is_public?: boolean;
  tags?: string[];
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  thumbnail_url?: string;
  timeline_data?: Timeline;
  is_public?: boolean;
  tags?: string[];
}

export interface TemplateSearchFilters {
  category?: TemplateCategory;
  tags?: string[];
  is_public?: boolean;
  is_featured?: boolean;
  search?: string;
}

export interface TemplateListResponse {
  templates: ProjectTemplate[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
