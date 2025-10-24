/**
 * Onboarding Types
 *
 * Types for user onboarding and guided tours
 */

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector for the element to highlight
  placement?: 'top' | 'bottom' | 'left' | 'right';
  action?: string; // Optional action text (e.g., "Click here", "Upload a video")
  highlightPadding?: number; // Padding around highlighted element
}

export interface OnboardingTour {
  id: string;
  name: string;
  description: string;
  steps: OnboardingStep[];
  autoStart?: boolean;
  showOnce?: boolean;
}

export interface UserOnboardingState {
  user_id: string;
  tours_completed: string[];
  tours_skipped: string[];
  current_tour_id: string | null;
  current_step_index: number;
  created_at: string;
  updated_at: string;
}

export const EDITOR_TOUR: OnboardingTour = {
  id: 'editor-basics',
  name: 'Editor Basics',
  description: 'Learn the fundamentals of the video editor',
  autoStart: true,
  showOnce: true,
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to the Video Editor!',
      description: 'Let\'s take a quick tour of the editor interface and learn the basics.',
      target: 'body',
      placement: 'bottom',
    },
    {
      id: 'asset-panel',
      title: 'Asset Panel',
      description: 'Upload and manage your video, audio, and image files here. Drag files from your computer or click to browse.',
      target: '[data-tour="asset-panel"]',
      placement: 'right',
      action: 'Try uploading a video file',
    },
    {
      id: 'preview-player',
      title: 'Preview Player',
      description: 'Watch your video composition in real-time. Use the playback controls to play, pause, and scrub through your timeline.',
      target: '[data-tour="preview-player"]',
      placement: 'bottom',
    },
    {
      id: 'timeline',
      title: 'Timeline',
      description: 'Arrange your clips on the timeline. Drag clips to reorder them, and use multiple tracks for overlays and effects.',
      target: '[data-tour="timeline"]',
      placement: 'top',
      action: 'Drag an asset to the timeline',
    },
    {
      id: 'timeline-controls',
      title: 'Timeline Controls',
      description: 'Use these tools to edit your timeline: split clips, add transitions, adjust zoom, and more.',
      target: '[data-tour="timeline-controls"]',
      placement: 'bottom',
    },
    {
      id: 'playback-controls',
      title: 'Playback Controls',
      description: 'Control video playback with play/pause, step forward/backward, and fullscreen mode.',
      target: '[data-tour="playback-controls"]',
      placement: 'top',
    },
    {
      id: 'keyboard-shortcuts',
      title: 'Keyboard Shortcuts',
      description: 'Speed up your workflow with keyboard shortcuts. Press "?" to view all available shortcuts.',
      target: 'body',
      placement: 'bottom',
      action: 'Press "?" to see shortcuts',
    },
    {
      id: 'export',
      title: 'Export Your Video',
      description: 'When you\'re done editing, click the Export button to render your final video.',
      target: '[data-tour="export-button"]',
      placement: 'left',
    },
  ],
};

export const AI_GENERATION_TOUR: OnboardingTour = {
  id: 'ai-generation',
  name: 'AI Video Generation',
  description: 'Learn how to generate videos with AI',
  autoStart: false,
  showOnce: true,
  steps: [
    {
      id: 'ai-intro',
      title: 'AI Video Generation',
      description: 'Create videos from text descriptions using AI. Just describe what you want to see!',
      target: '[data-tour="ai-panel"]',
      placement: 'right',
    },
    {
      id: 'prompt-input',
      title: 'Enter Your Prompt',
      description: 'Describe the video you want to generate. Be specific about the scene, style, and motion.',
      target: '[data-tour="prompt-input"]',
      placement: 'bottom',
      action: 'Try: "A sunset over the ocean with gentle waves"',
    },
    {
      id: 'generation-settings',
      title: 'Adjust Settings',
      description: 'Choose video duration, aspect ratio, and quality settings for your generated video.',
      target: '[data-tour="generation-settings"]',
      placement: 'bottom',
    },
    {
      id: 'generate',
      title: 'Generate Video',
      description: 'Click Generate to start creating your video. This may take a few minutes.',
      target: '[data-tour="generate-button"]',
      placement: 'left',
    },
  ],
};

export const COLLABORATION_TOUR: OnboardingTour = {
  id: 'collaboration',
  name: 'Team Collaboration',
  description: 'Learn how to share projects and collaborate',
  autoStart: false,
  showOnce: true,
  steps: [
    {
      id: 'share-intro',
      title: 'Share Your Project',
      description: 'Collaborate with your team by sharing projects. You can invite people by email or create share links.',
      target: '[data-tour="share-button"]',
      placement: 'bottom',
    },
    {
      id: 'invite-users',
      title: 'Invite by Email',
      description: 'Send email invitations to specific team members with viewer or editor permissions.',
      target: '[data-tour="invite-tab"]',
      placement: 'bottom',
    },
    {
      id: 'share-links',
      title: 'Create Share Links',
      description: 'Generate shareable links that anyone can use to access your project. Set expiration dates and usage limits.',
      target: '[data-tour="links-tab"]',
      placement: 'bottom',
    },
    {
      id: 'collaborators',
      title: 'Manage Collaborators',
      description: 'View who has access to your project and manage their permissions.',
      target: '[data-tour="collaborators-tab"]',
      placement: 'bottom',
    },
  ],
};

export const ALL_TOURS: OnboardingTour[] = [EDITOR_TOUR, AI_GENERATION_TOUR, COLLABORATION_TOUR];
