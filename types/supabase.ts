/**
 * Supabase Database Types
 *
 * Auto-generated type definitions for the Supabase database schema.
 * These types provide type safety for database operations.
 *
 * Generated from migration files in /supabase/migrations/
 * Last updated: 2025-10-24
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/**
 * Database schema definition
 */
export interface Database {
  public: {
    Tables: {
      // ===================================================================
      // Core Tables
      // ===================================================================

      projects: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          timeline_state_jsonb: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          timeline_state_jsonb?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          timeline_state_jsonb?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'projects_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      assets: {
        Row: {
          id: string;
          project_id: string | null;
          user_id: string;
          storage_url: string;
          type: 'video' | 'audio' | 'image';
          duration_seconds: number | null;
          metadata: Json;
          source: 'upload' | 'genai' | 'ingest';
          file_path: string | null;
          mime_type: string | null;
          duration_sec: number | null;
          width: number | null;
          height: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          user_id: string;
          storage_url: string;
          type: 'video' | 'audio' | 'image';
          duration_seconds?: number | null;
          metadata?: Json;
          source?: 'upload' | 'genai' | 'ingest';
          file_path?: string | null;
          mime_type?: string | null;
          duration_sec?: number | null;
          width?: number | null;
          height?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          user_id?: string;
          storage_url?: string;
          type?: 'video' | 'audio' | 'image';
          duration_seconds?: number | null;
          metadata?: Json;
          source?: 'upload' | 'genai' | 'ingest';
          file_path?: string | null;
          mime_type?: string | null;
          duration_sec?: number | null;
          width?: number | null;
          height?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'assets_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assets_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      scenes: {
        Row: {
          id: string;
          project_id: string | null;
          asset_id: string | null;
          start_ms: number;
          end_ms: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          asset_id?: string | null;
          start_ms: number;
          end_ms: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          asset_id?: string | null;
          start_ms?: number;
          end_ms?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'scenes_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'scenes_asset_id_fkey';
            columns: ['asset_id'];
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
        ];
      };

      timelines: {
        Row: {
          id: string;
          project_id: string;
          timeline_data: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          timeline_data: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          timeline_data?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'timelines_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };

      // ===================================================================
      // Keyframe Editor Tables
      // ===================================================================

      scene_frames: {
        Row: {
          id: string;
          project_id: string;
          asset_id: string;
          scene_id: string | null;
          kind: 'first' | 'middle' | 'last' | 'custom';
          t_ms: number;
          storage_path: string;
          width: number | null;
          height: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          asset_id: string;
          scene_id?: string | null;
          kind: 'first' | 'middle' | 'last' | 'custom';
          t_ms: number;
          storage_path: string;
          width?: number | null;
          height?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          asset_id?: string;
          scene_id?: string | null;
          kind?: 'first' | 'middle' | 'last' | 'custom';
          t_ms?: number;
          storage_path?: string;
          width?: number | null;
          height?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'scene_frames_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'scene_frames_asset_id_fkey';
            columns: ['asset_id'];
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'scene_frames_scene_id_fkey';
            columns: ['scene_id'];
            referencedRelation: 'scenes';
            referencedColumns: ['id'];
          },
        ];
      };

      frame_edits: {
        Row: {
          id: string;
          frame_id: string;
          project_id: string;
          asset_id: string;
          version: number;
          mode: 'global' | 'crop';
          prompt: string;
          model: string;
          crop_x: number | null;
          crop_y: number | null;
          crop_size: number | null;
          feather_px: number | null;
          harmonized: boolean | null;
          input_refs: Json | null;
          output_storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          frame_id: string;
          project_id: string;
          asset_id: string;
          version: number;
          mode: 'global' | 'crop';
          prompt: string;
          model: string;
          crop_x?: number | null;
          crop_y?: number | null;
          crop_size?: number | null;
          feather_px?: number | null;
          harmonized?: boolean | null;
          input_refs?: Json | null;
          output_storage_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          frame_id?: string;
          project_id?: string;
          asset_id?: string;
          version?: number;
          mode?: 'global' | 'crop';
          prompt?: string;
          model?: string;
          crop_x?: number | null;
          crop_y?: number | null;
          crop_size?: number | null;
          feather_px?: number | null;
          harmonized?: boolean | null;
          input_refs?: Json | null;
          output_storage_path?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'frame_edits_frame_id_fkey';
            columns: ['frame_id'];
            referencedRelation: 'scene_frames';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'frame_edits_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'frame_edits_asset_id_fkey';
            columns: ['asset_id'];
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
        ];
      };

      // ===================================================================
      // Processing Jobs
      // ===================================================================

      processing_jobs: {
        Row: {
          id: string;
          user_id: string;
          project_id: string;
          asset_id: string | null;
          job_type:
            | 'video-generation'
            | 'video-upscale'
            | 'video-to-audio'
            | 'audio-generation'
            | 'scene-detection'
            | 'audio-extraction'
            | 'frame-extraction'
            | 'frame-edit'
            | 'video-export';
          status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
          provider: string;
          provider_job_id: string | null;
          config: Json | null;
          metadata: Json | null;
          result_asset_id: string | null;
          result_data: Json | null;
          error_message: string | null;
          progress_percentage: number | null;
          created_at: string;
          started_at: string | null;
          completed_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id: string;
          asset_id?: string | null;
          job_type:
            | 'video-generation'
            | 'video-upscale'
            | 'video-to-audio'
            | 'audio-generation'
            | 'scene-detection'
            | 'audio-extraction'
            | 'frame-extraction'
            | 'frame-edit'
            | 'video-export';
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
          provider: string;
          provider_job_id?: string | null;
          config?: Json | null;
          metadata?: Json | null;
          result_asset_id?: string | null;
          result_data?: Json | null;
          error_message?: string | null;
          progress_percentage?: number | null;
          created_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string;
          asset_id?: string | null;
          job_type?:
            | 'video-generation'
            | 'video-upscale'
            | 'video-to-audio'
            | 'audio-generation'
            | 'scene-detection'
            | 'audio-extraction'
            | 'frame-extraction'
            | 'frame-edit'
            | 'video-export';
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
          provider?: string;
          provider_job_id?: string | null;
          config?: Json | null;
          metadata?: Json | null;
          result_asset_id?: string | null;
          result_data?: Json | null;
          error_message?: string | null;
          progress_percentage?: number | null;
          created_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'processing_jobs_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'processing_jobs_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'processing_jobs_asset_id_fkey';
            columns: ['asset_id'];
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'processing_jobs_result_asset_id_fkey';
            columns: ['result_asset_id'];
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
        ];
      };

      // ===================================================================
      // User Management & Subscriptions
      // ===================================================================

      user_profiles: {
        Row: {
          id: string;
          email: string;
          tier: 'free' | 'premium' | 'admin';
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          stripe_price_id: string | null;
          subscription_status: string | null;
          subscription_current_period_start: string | null;
          subscription_current_period_end: string | null;
          subscription_cancel_at_period_end: boolean | null;
          video_minutes_limit: number;
          ai_requests_limit: number;
          storage_gb_limit: number;
          video_minutes_used: number;
          ai_requests_used: number;
          storage_gb_used: number;
          usage_reset_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          tier?: 'free' | 'premium' | 'admin';
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          subscription_status?: string | null;
          subscription_current_period_start?: string | null;
          subscription_current_period_end?: string | null;
          subscription_cancel_at_period_end?: boolean | null;
          video_minutes_limit?: number;
          ai_requests_limit?: number;
          storage_gb_limit?: number;
          video_minutes_used?: number;
          ai_requests_used?: number;
          storage_gb_used?: number;
          usage_reset_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          tier?: 'free' | 'premium' | 'admin';
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          subscription_status?: string | null;
          subscription_current_period_start?: string | null;
          subscription_current_period_end?: string | null;
          subscription_cancel_at_period_end?: boolean | null;
          video_minutes_limit?: number;
          ai_requests_limit?: number;
          storage_gb_limit?: number;
          video_minutes_used?: number;
          ai_requests_used?: number;
          storage_gb_used?: number;
          usage_reset_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_profiles_id_fkey';
            columns: ['id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      subscription_history: {
        Row: {
          id: string;
          user_id: string;
          previous_tier: 'free' | 'premium' | 'admin' | null;
          new_tier: 'free' | 'premium' | 'admin';
          changed_by: string | null;
          change_reason: string | null;
          stripe_event_id: string | null;
          stripe_subscription_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          previous_tier?: 'free' | 'premium' | 'admin' | null;
          new_tier: 'free' | 'premium' | 'admin';
          changed_by?: string | null;
          change_reason?: string | null;
          stripe_event_id?: string | null;
          stripe_subscription_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          previous_tier?: 'free' | 'premium' | 'admin' | null;
          new_tier?: 'free' | 'premium' | 'admin';
          changed_by?: string | null;
          change_reason?: string | null;
          stripe_event_id?: string | null;
          stripe_subscription_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subscription_history_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscription_history_changed_by_fkey';
            columns: ['changed_by'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      usage_tracking: {
        Row: {
          id: string;
          user_id: string;
          period_start: string;
          period_end: string;
          video_minutes_used: number;
          ai_requests_used: number;
          storage_gb_used: number;
          video_minutes_limit: number;
          ai_requests_limit: number;
          storage_gb_limit: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          period_start: string;
          period_end: string;
          video_minutes_used?: number;
          ai_requests_used?: number;
          storage_gb_used?: number;
          video_minutes_limit: number;
          ai_requests_limit: number;
          storage_gb_limit: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          period_start?: string;
          period_end?: string;
          video_minutes_used?: number;
          ai_requests_used?: number;
          storage_gb_used?: number;
          video_minutes_limit?: number;
          ai_requests_limit?: number;
          storage_gb_limit?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'usage_tracking_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      user_activity_history: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          activity_type:
            | 'video_generation'
            | 'audio_generation'
            | 'image_upload'
            | 'video_upload'
            | 'audio_upload'
            | 'frame_edit'
            | 'video_upscale';
          title: string | null;
          description: string | null;
          model: string | null;
          asset_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          activity_type:
            | 'video_generation'
            | 'audio_generation'
            | 'image_upload'
            | 'video_upload'
            | 'audio_upload'
            | 'frame_edit'
            | 'video_upscale';
          title?: string | null;
          description?: string | null;
          model?: string | null;
          asset_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          activity_type?:
            | 'video_generation'
            | 'audio_generation'
            | 'image_upload'
            | 'video_upload'
            | 'audio_upload'
            | 'frame_edit'
            | 'video_upscale';
          title?: string | null;
          description?: string | null;
          model?: string | null;
          asset_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_activity_history_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_activity_history_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_activity_history_asset_id_fkey';
            columns: ['asset_id'];
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
        ];
      };

      user_onboarding_state: {
        Row: {
          id: string;
          user_id: string;
          completed_steps: string[];
          current_step: string | null;
          skipped: boolean;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          completed_steps?: string[];
          current_step?: string | null;
          skipped?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          completed_steps?: string[];
          current_step?: string | null;
          skipped?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_onboarding_state_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      // ===================================================================
      // Collaboration
      // ===================================================================

      project_collaborators: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: 'owner' | 'editor' | 'viewer';
          invited_by: string | null;
          invited_at: string;
          accepted_at: string | null;
          last_seen_at: string | null;
          is_online: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role?: 'owner' | 'editor' | 'viewer';
          invited_by?: string | null;
          invited_at?: string;
          accepted_at?: string | null;
          last_seen_at?: string | null;
          is_online?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: 'owner' | 'editor' | 'viewer';
          invited_by?: string | null;
          invited_at?: string;
          accepted_at?: string | null;
          last_seen_at?: string | null;
          is_online?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_collaborators_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_collaborators_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_collaborators_invited_by_fkey';
            columns: ['invited_by'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      collaboration_activity: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          activity_type: string;
          activity_data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          activity_type: string;
          activity_data?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          activity_type?: string;
          activity_data?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'collaboration_activity_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'collaboration_activity_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      // ===================================================================
      // Easter Eggs & Achievements
      // ===================================================================

      easter_egg_achievements: {
        Row: {
          id: string;
          user_id: string;
          egg_id: 'konami' | 'devmode' | 'matrix' | 'disco' | 'gravity';
          discovered_at: string;
          activation_count: number;
          total_duration_ms: number;
          last_activated_at: string | null;
          shared: boolean | null;
          shared_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          egg_id: 'konami' | 'devmode' | 'matrix' | 'disco' | 'gravity';
          discovered_at?: string;
          activation_count?: number;
          total_duration_ms?: number;
          last_activated_at?: string | null;
          shared?: boolean | null;
          shared_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          egg_id?: 'konami' | 'devmode' | 'matrix' | 'disco' | 'gravity';
          discovered_at?: string;
          activation_count?: number;
          total_duration_ms?: number;
          last_activated_at?: string | null;
          shared?: boolean | null;
          shared_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'easter_egg_achievements_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      easter_egg_feedback: {
        Row: {
          id: string;
          user_id: string;
          rating: number;
          favorite_egg: 'konami' | 'devmode' | 'matrix' | 'disco' | 'gravity' | 'none' | null;
          suggestions: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          rating: number;
          favorite_egg?: 'konami' | 'devmode' | 'matrix' | 'disco' | 'gravity' | 'none' | null;
          suggestions?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          rating?: number;
          favorite_egg?: 'konami' | 'devmode' | 'matrix' | 'disco' | 'gravity' | 'none' | null;
          suggestions?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'easter_egg_feedback_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      // ===================================================================
      // Chat Messages
      // ===================================================================

      chat_messages: {
        Row: {
          id: string;
          project_id: string;
          role: 'user' | 'assistant';
          content: string;
          model: string | null;
          attachments: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          role: 'user' | 'assistant';
          content: string;
          model?: string | null;
          attachments?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          role?: 'user' | 'assistant';
          content?: string;
          model?: string | null;
          attachments?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_messages_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };

      // ===================================================================
      // Project Features
      // ===================================================================

      project_backups: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          backup_data: Json;
          backup_type: 'manual' | 'auto';
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          backup_data: Json;
          backup_type?: 'manual' | 'auto';
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          backup_data?: Json;
          backup_type?: 'manual' | 'auto';
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_backups_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_backups_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      share_links: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          token: string;
          permission: 'view' | 'comment';
          expires_at: string | null;
          password_hash: string | null;
          access_count: number;
          last_accessed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          token: string;
          permission?: 'view' | 'comment';
          expires_at?: string | null;
          password_hash?: string | null;
          access_count?: number;
          last_accessed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          token?: string;
          permission?: 'view' | 'comment';
          expires_at?: string | null;
          password_hash?: string | null;
          access_count?: number;
          last_accessed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'share_links_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'share_links_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      export_presets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          is_default: boolean;
          config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          is_default?: boolean;
          config: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          is_default?: boolean;
          config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'export_presets_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      project_templates: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          thumbnail_url: string | null;
          category: string;
          is_public: boolean;
          created_by: string;
          template_data: Json;
          use_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          thumbnail_url?: string | null;
          category: string;
          is_public?: boolean;
          created_by: string;
          template_data: Json;
          use_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          thumbnail_url?: string | null;
          category?: string;
          is_public?: boolean;
          created_by?: string;
          template_data?: Json;
          use_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_templates_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      asset_versions: {
        Row: {
          id: string;
          asset_id: string;
          version_number: number;
          storage_url: string;
          changes_description: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          asset_id: string;
          version_number: number;
          storage_url: string;
          changes_description?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          asset_id?: string;
          version_number?: number;
          storage_url?: string;
          changes_description?: string | null;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'asset_versions_asset_id_fkey';
            columns: ['asset_id'];
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'asset_versions_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      // ===================================================================
      // Rate Limiting
      // ===================================================================

      rate_limits: {
        Row: {
          key: string;
          count: number;
          reset_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          count?: number;
          reset_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          key?: string;
          count?: number;
          reset_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };

    Views: {
      active_processing_jobs: {
        Row: {
          id: string;
          user_id: string;
          project_id: string;
          asset_id: string | null;
          job_type: string;
          status: string;
          provider: string;
          provider_job_id: string | null;
          config: Json | null;
          metadata: Json | null;
          result_asset_id: string | null;
          result_data: Json | null;
          error_message: string | null;
          progress_percentage: number | null;
          created_at: string;
          started_at: string | null;
          completed_at: string | null;
          updated_at: string;
        };
        Relationships: [];
      };

      recent_completed_jobs: {
        Row: {
          id: string;
          user_id: string;
          project_id: string;
          asset_id: string | null;
          job_type: string;
          status: string;
          provider: string;
          provider_job_id: string | null;
          config: Json | null;
          metadata: Json | null;
          result_asset_id: string | null;
          result_data: Json | null;
          error_message: string | null;
          progress_percentage: number | null;
          created_at: string;
          started_at: string | null;
          completed_at: string | null;
          updated_at: string;
        };
        Relationships: [];
      };

      easter_egg_leaderboard: {
        Row: {
          user_id: string;
          email: string;
          eggs_discovered: number;
          first_discovery: string | null;
          last_discovery: string | null;
          discovery_duration: string | null;
          total_activations: number;
          eggs_shared: number;
        };
        Relationships: [];
      };
    };

    Functions: {
      record_easter_egg_activation: {
        Args: {
          p_egg_id: string;
          p_duration_ms?: number;
        };
        Returns: Json;
      };

      record_easter_egg_share: {
        Args: {
          p_egg_id: string;
        };
        Returns: boolean;
      };

      submit_easter_egg_feedback: {
        Args: {
          p_rating: number;
          p_favorite_egg?: string | null;
          p_suggestions?: string | null;
        };
        Returns: string;
      };

      update_collaborator_presence: {
        Args: {
          p_project_id: string;
          p_user_id: string;
          p_is_online: boolean;
        };
        Returns: void;
      };

      get_job_by_provider_id: {
        Args: {
          p_provider: string;
          p_provider_job_id: string;
        };
        Returns: Database['public']['Tables']['processing_jobs']['Row'];
      };

      update_job_status: {
        Args: {
          p_job_id: string;
          p_status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
          p_progress?: number | null;
          p_error_message?: string | null;
          p_result_data?: Json | null;
        };
        Returns: Database['public']['Tables']['processing_jobs']['Row'];
      };

      reset_monthly_usage: {
        Args: Record<string, never>;
        Returns: void;
      };

      increment_rate_limit: {
        Args: {
          rate_key: string;
          window_seconds?: number;
        };
        Returns: {
          current_count: number;
          reset_time: string;
        }[];
      };

      check_rate_limit: {
        Args: {
          rate_key: string;
        };
        Returns: {
          current_count: number;
          reset_time: string;
        }[];
      };

      cleanup_expired_rate_limits: {
        Args: Record<string, never>;
        Returns: number;
      };
    };

    Enums: {
      user_tier: 'free' | 'premium' | 'admin';
      job_status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
      job_type:
        | 'video-generation'
        | 'video-upscale'
        | 'video-to-audio'
        | 'audio-generation'
        | 'scene-detection'
        | 'audio-extraction'
        | 'frame-extraction'
        | 'frame-edit'
        | 'video-export';
      frame_kind: 'first' | 'middle' | 'last' | 'custom';
    };

    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
