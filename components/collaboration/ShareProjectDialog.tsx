/**
 * ShareProjectDialog Component
 *
 * Dialog for managing project sharing:
 * - Invite users by email
 * - Generate share links
 * - View and manage collaborators
 * - View activity log
 */
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  Mail,
  Link as LinkIcon,
  Users,
  Copy,
  Check,
  X,
  Clock,
  Activity,
  Trash2,
  Shield,
  Eye,
  Edit3,
} from 'lucide-react';
import { browserLogger } from '@/lib/browserLogger';
import type {
  ProjectCollaborator,
  ShareLink,
  ProjectInvite,
  CollaborationActivity,
  CollaboratorRole,
} from '@/types/collaboration';

interface ShareProjectDialogProps {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'invite' | 'links' | 'collaborators' | 'activity';

const ROLE_LABELS: Record<CollaboratorRole, string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
};

const ROLE_ICONS: Record<CollaboratorRole, React.ReactNode> = {
  owner: <Shield className="h-4 w-4" />,
  editor: <Edit3 className="h-4 w-4" />,
  viewer: <Eye className="h-4 w-4" />,
};

export function ShareProjectDialog({ projectId, projectName, isOpen, onClose }: ShareProjectDialogProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('invite');
  const [loading, setLoading] = useState(false);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<CollaboratorRole>('viewer');
  const [invites, setInvites] = useState<ProjectInvite[]>([]);

  // Share link state
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [linkRole, setLinkRole] = useState<CollaboratorRole>('viewer');
  const [linkExpireHours, setLinkExpireHours] = useState(168); // 7 days
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // Collaborators state
  const [collaborators, setCollaborators] = useState<ProjectCollaborator[]>([]);

  // Activity state
  const [activities, setActivities] = useState<CollaborationActivity[]>([]);

  useEffect((): void => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, activeTab]);

  const loadData = async (): Promise<void> => {
    setLoading(true);
    try {
      if (activeTab === 'invite') {
        await loadInvites();
      } else if (activeTab === 'links') {
        await loadShareLinks();
      } else if (activeTab === 'collaborators') {
        await loadCollaborators();
      } else if (activeTab === 'activity') {
        await loadActivity();
      }
    } catch (error) {
      browserLogger.error({ error, projectId }, 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadInvites = async (): Promise<void> => {
    const res = await fetch(`/api/projects/${projectId}/invites`);
    if (res.ok) {
      const data = await res.json();
      setInvites(data.invites || []);
    }
  };

  const loadShareLinks = async (): Promise<void> => {
    const res = await fetch(`/api/projects/${projectId}/share-links`);
    if (res.ok) {
      const data = await res.json();
      setShareLinks(data.links || []);
    }
  };

  const loadCollaborators = async (): Promise<void> => {
    const res = await fetch(`/api/projects/${projectId}/collaborators`);
    if (res.ok) {
      const data = await res.json();
      setCollaborators(data.collaborators || []);
    }
  };

  const loadActivity = async (): Promise<void> => {
    const res = await fetch(`/api/projects/${projectId}/activity?limit=20`);
    if (res.ok) {
      const data = await res.json();
      setActivities(data.activities || []);
    }
  };

  const sendInvite = async (): Promise<void> => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      if (res.ok) {
        setInviteEmail('');
        await loadInvites();
      } else {
        const error = await res.json();
        browserLogger.error({ error, projectId }, 'Failed to send invite');
      }
    } catch (error) {
      browserLogger.error({ error, projectId }, 'Error sending invite');
    } finally {
      setLoading(false);
    }
  };

  const createShareLink = async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/share-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: linkRole,
          expires_in_hours: linkExpireHours,
        }),
      });

      if (res.ok) {
        await loadShareLinks();
      } else {
        const error = await res.json();
        browserLogger.error({ error, projectId }, 'Failed to create share link');
      }
    } catch (error) {
      browserLogger.error({ error, projectId }, 'Error creating share link');
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = async (link: ShareLink): Promise<void> => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/join/${link.token}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedLinkId(link.id);
      setTimeout((): void => setCopiedLinkId(null), 2000);
    } catch (error) {
      browserLogger.error({ error }, 'Failed to copy link');
    }
  };

  const deleteShareLink = async (linkId: string): Promise<void> => {
    if (!confirm('Are you sure you want to delete this share link?')) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/share-links/${linkId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await loadShareLinks();
      }
    } catch (error) {
      browserLogger.error({ error, linkId }, 'Error deleting share link');
    } finally {
      setLoading(false);
    }
  };

  const revokeInvite = async (inviteId: string): Promise<void> => {
    if (!confirm('Are you sure you want to revoke this invite?')) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/invites/${inviteId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await loadInvites();
      }
    } catch (error) {
      browserLogger.error({ error, inviteId }, 'Error revoking invite');
    } finally {
      setLoading(false);
    }
  };

  const removeCollaborator = async (collaboratorId: string): Promise<void> => {
    if (!confirm('Are you sure you want to remove this collaborator?')) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators/${collaboratorId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await loadCollaborators();
      }
    } catch (error) {
      browserLogger.error({ error, collaboratorId }, 'Error removing collaborator');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share &ldquo;{projectName}&rdquo;</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border pb-2 mb-4">
          <Button
            variant={activeTab === 'invite' ? 'default' : 'ghost'}
            size="sm"
            onClick={(): void => setActiveTab('invite')}
          >
            <Mail className="h-4 w-4 mr-2" />
            Invite
          </Button>
          <Button
            variant={activeTab === 'links' ? 'default' : 'ghost'}
            size="sm"
            onClick={(): void => setActiveTab('links')}
          >
            <LinkIcon className="h-4 w-4 mr-2" />
            Share Links
          </Button>
          <Button
            variant={activeTab === 'collaborators' ? 'default' : 'ghost'}
            size="sm"
            onClick={(): void => setActiveTab('collaborators')}
          >
            <Users className="h-4 w-4 mr-2" />
            Collaborators
          </Button>
          <Button
            variant={activeTab === 'activity' ? 'default' : 'ghost'}
            size="sm"
            onClick={(): void => setActiveTab('activity')}
          >
            <Activity className="h-4 w-4 mr-2" />
            Activity
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Invite Tab */}
          {activeTab === 'invite' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Email address"
                  value={inviteEmail}
                  onChange={(e): void => setInviteEmail(e.target.value)}
                  className="flex-1"
                />
                <select
                  value={inviteRole}
                  onChange={(e): void => setInviteRole(e.target.value as CollaboratorRole)}
                  className="px-3 py-2 border border-border rounded-md bg-background"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <Button onClick={sendInvite} disabled={loading || !inviteEmail}>
                  {loading ? <LoadingSpinner size="sm" /> : 'Send Invite'}
                </Button>
              </div>

              {loading ? (
                <LoadingSpinner />
              ) : invites.length > 0 ? (
                <div className="space-y-2">
                  {invites.map((invite): JSX.Element => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-3 border border-border rounded-md"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{invite.email}</div>
                        <div className="text-sm text-muted-foreground">
                          {ROLE_LABELS[invite.role]} • {invite.status}
                          {invite.expires_at && ` • Expires ${new Date(invite.expires_at).toLocaleDateString()}`}
                        </div>
                      </div>
                      {invite.status === 'pending' && (
                        <Button variant="ghost" size="sm" onClick={(): Promise<void> => revokeInvite(invite.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">No invites yet</div>
              )}
            </div>
          )}

          {/* Share Links Tab */}
          {activeTab === 'links' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <select
                  value={linkRole}
                  onChange={(e): void => setLinkRole(e.target.value as CollaboratorRole)}
                  className="px-3 py-2 border border-border rounded-md bg-background"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <select
                  value={linkExpireHours}
                  onChange={(e): void => setLinkExpireHours(Number(e.target.value))}
                  className="px-3 py-2 border border-border rounded-md bg-background"
                >
                  <option value={24}>24 hours</option>
                  <option value={168}>7 days</option>
                  <option value={720}>30 days</option>
                  <option value={0}>Never</option>
                </select>
                <Button onClick={createShareLink} disabled={loading}>
                  {loading ? <LoadingSpinner size="sm" /> : 'Create Link'}
                </Button>
              </div>

              {loading ? (
                <LoadingSpinner />
              ) : shareLinks.length > 0 ? (
                <div className="space-y-2">
                  {shareLinks.map((link): JSX.Element => (
                    <div key={link.id} className="flex items-center gap-2 p-3 border border-border rounded-md">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {ROLE_ICONS[link.role as CollaboratorRole]}
                          <span className="font-medium">{ROLE_LABELS[link.role as CollaboratorRole]} Link</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Used {link.current_uses} times
                          {link.expires_at && (
                            <>
                              {' '}
                              • Expires {new Date(link.expires_at).toLocaleDateString()}
                            </>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(): Promise<void> => copyShareLink(link)}
                        className="flex items-center gap-2"
                      >
                        {copiedLinkId === link.id ? (
                          <>
                            <Check className="h-4 w-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy
                          </>
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(): Promise<void> => deleteShareLink(link.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">No share links yet</div>
              )}
            </div>
          )}

          {/* Collaborators Tab */}
          {activeTab === 'collaborators' && (
            <div className="space-y-2">
              {loading ? (
                <LoadingSpinner />
              ) : collaborators.length > 0 ? (
                collaborators.map((collaborator): JSX.Element => (
                  <div
                    key={collaborator.id}
                    className="flex items-center justify-between p-3 border border-border rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                        <span className="font-semibold text-purple-600 dark:text-purple-400">
                          {collaborator.user_email?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{collaborator.user_email}</div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {ROLE_ICONS[collaborator.role]}
                          <span>{ROLE_LABELS[collaborator.role]}</span>
                          {collaborator.is_online && (
                            <>
                              <span>•</span>
                              <span className="text-green-500">Online</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {collaborator.role !== 'owner' && (
                      <Button variant="ghost" size="sm" onClick={(): Promise<void> => removeCollaborator(collaborator.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">No collaborators yet</div>
              )}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {loading ? (
                <LoadingSpinner />
              ) : activities.length > 0 ? (
                activities.map((activity): JSX.Element => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 border border-border rounded-md">
                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium">{activity.action.replace(/_/g, ' ')}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(activity.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">No activity yet</div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
