/**
 * Collaboration and Sharing Types
 *
 * Types for project sharing, invites, and collaboration features
 */

export type CollaboratorRole = 'owner' | 'editor' | 'viewer';

export interface ProjectCollaborator {
  id: string;
  project_id: string;
  user_id: string;
  role: CollaboratorRole;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  last_seen_at: string | null;
  is_online: boolean;
  created_at: string;

  // Extended fields (from joins)
  user_email?: string;
  user_name?: string;
  inviter_email?: string;
}

export interface ShareLink {
  id: string;
  project_id: string;
  token: string;
  role: CollaboratorRole;
  created_by: string;
  created_at: string;
  expires_at: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
}

export interface ProjectInvite {
  id: string;
  project_id: string;
  email: string;
  role: CollaboratorRole;
  invited_by: string;
  invited_at: string;
  expires_at: string;
  accepted_at: string | null;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
}

export interface CollaborationActivity {
  id: string;
  project_id: string;
  user_id: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;

  // Extended fields
  user_email?: string;
  user_name?: string;
}

export interface ShareProjectRequest {
  email: string;
  role: CollaboratorRole;
  message?: string;
}

export interface CreateShareLinkRequest {
  role: CollaboratorRole;
  expires_in_hours?: number;
  max_uses?: number;
}

export interface CreateShareLinkResponse {
  link: ShareLink;
  url: string;
}

export interface AcceptInviteRequest {
  token: string;
}

export interface UpdateCollaboratorRequest {
  role?: CollaboratorRole;
}

export const COLLABORATOR_PERMISSIONS = {
  owner: {
    canView: true,
    canEdit: true,
    canDelete: true,
    canShare: true,
    canManageCollaborators: true,
    canExport: true,
  },
  editor: {
    canView: true,
    canEdit: true,
    canDelete: false,
    canShare: false,
    canManageCollaborators: false,
    canExport: true,
  },
  viewer: {
    canView: true,
    canEdit: false,
    canDelete: false,
    canShare: false,
    canManageCollaborators: false,
    canExport: false,
  },
} as const;

export function getPermissions(role: CollaboratorRole) {
  return COLLABORATOR_PERMISSIONS[role];
}

export function canUserPerformAction(
  role: CollaboratorRole,
  action: keyof typeof COLLABORATOR_PERMISSIONS.owner
): boolean {
  return COLLABORATOR_PERMISSIONS[role][action];
}
