/**
 * BackupService
 *
 * Service for managing project backups with version history.
 * Supports auto-save, manual backups, restore, and local download.
 *
 * @module lib/services/backupService
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProjectId } from '@/types/branded';
import type { Timeline } from '@/types/timeline';
import type { AssetRow } from '@/types/assets';
import { HttpError } from '@/lib/errors/HttpError';

export type BackupType = 'auto' | 'manual';

export interface ProjectBackup {
  id: string;
  project_id: string;
  user_id: string;
  backup_name: string;
  backup_type: BackupType;
  project_data: ProjectData;
  timeline_data: Timeline;
  assets_snapshot: AssetRow[];
  created_at: string;
}

export interface ProjectData {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBackupParams {
  projectId: ProjectId | string;
  backupName?: string;
  backupType: BackupType;
  projectData: ProjectData;
  timelineData: Timeline;
  assets: AssetRow[];
}

export interface RestoreBackupParams {
  backupId: string;
  projectId: ProjectId | string;
}

export class BackupService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new backup of the project
   */
  async createBackup(params: CreateBackupParams): Promise<ProjectBackup> {
    const {
      projectId,
      backupName,
      backupType,
      projectData,
      timelineData,
      assets,
    } = params;

    const name = backupName || this.generateBackupName(backupType);

    const { data, error } = await this.supabase
      .from('project_backups')
      .insert({
        project_id: projectId,
        backup_name: name,
        backup_type: backupType,
        project_data: projectData,
        timeline_data: timelineData,
        assets_snapshot: assets,
      })
      .select()
      .single();

    if (error) {
      throw new HttpError('Failed to create backup', 500);
    }

    return data;
  }

  /**
   * List all backups for a project
   */
  async listBackups(projectId: ProjectId | string): Promise<ProjectBackup[]> {
    const { data, error } = await this.supabase
      .from('project_backups')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new HttpError('Failed to list backups', 500);
    }

    return data || [];
  }

  /**
   * Get a specific backup by ID
   */
  async getBackup(backupId: string): Promise<ProjectBackup | null> {
    const { data, error } = await this.supabase
      .from('project_backups')
      .select('*')
      .eq('id', backupId)
      .single();

    if (error) {
      throw new HttpError('Failed to get backup', 500);
    }

    return data;
  }

  /**
   * Restore a backup to the project
   * This updates the project and timeline with the backup data
   */
  async restoreBackup(params: RestoreBackupParams): Promise<void> {
    const { backupId, projectId } = params;

    // Get the backup
    const backup = await this.getBackup(backupId);
    if (!backup) {
      throw new HttpError('Backup not found', 404);
    }

    // Verify the backup belongs to the project
    if (backup.project_id !== projectId) {
      throw new HttpError('Backup does not belong to project', 403);
    }

    // Update project metadata
    const { error: projectError } = await this.supabase
      .from('projects')
      .update({
        title: backup.project_data.title,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (projectError) {
      throw new HttpError('Failed to restore project metadata', 500);
    }

    // Update timeline data
    const { error: timelineError } = await this.supabase
      .from('timelines')
      .upsert({
        project_id: projectId,
        timeline_data: backup.timeline_data,
        updated_at: new Date().toISOString(),
      });

    if (timelineError) {
      throw new HttpError('Failed to restore timeline', 500);
    }

    // Note: We don't restore assets since they are stored in Supabase storage
    // and the asset records should still exist. We only restore the timeline
    // references to those assets.
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    const { error } = await this.supabase
      .from('project_backups')
      .delete()
      .eq('id', backupId);

    if (error) {
      throw new HttpError('Failed to delete backup', 500);
    }
  }

  /**
   * Export a backup as JSON for local download
   */
  exportBackupAsJSON(backup: ProjectBackup): string {
    return JSON.stringify(backup, null, 2);
  }

  /**
   * Generate a backup name based on type and timestamp
   */
  private generateBackupName(type: BackupType): string {
    const date = new Date();
    const dateStr = date.toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `${type === 'auto' ? 'Auto' : 'Manual'} Backup - ${dateStr}`;
  }

  /**
   * Create an auto-backup if enough time has passed since the last one
   * Returns true if a backup was created
   */
  async createAutoBackupIfNeeded(
    projectId: ProjectId | string,
    projectData: ProjectData,
    timelineData: Timeline,
    assets: AssetRow[],
    minIntervalMinutes = 30
  ): Promise<boolean> {
    // Get the most recent auto backup
    const { data, error } = await this.supabase
      .from('project_backups')
      .select('created_at')
      .eq('project_id', projectId)
      .eq('backup_type', 'auto')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // If no error and we have a recent backup, check the interval
    if (!error && data) {
      const lastBackupTime = new Date(data.created_at).getTime();
      const now = Date.now();
      const minutesSinceLastBackup = (now - lastBackupTime) / (1000 * 60);

      if (minutesSinceLastBackup < minIntervalMinutes) {
        return false;
      }
    }

    // Create auto backup
    await this.createBackup({
      projectId,
      backupType: 'auto',
      projectData,
      timelineData,
      assets,
    });

    return true;
  }
}
