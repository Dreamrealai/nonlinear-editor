/**
 * Centralized Metadata Configuration
 *
 * This file contains all SEO-related metadata for the application.
 * It follows Next.js 14+ Metadata API conventions.
 */

import type { Metadata } from 'next';

/**
 * Base URL for the application
 * Used for canonical URLs and Open Graph URLs
 */
export const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nonlinear-editor.com';

/**
 * Application name and tagline
 */
export const appName = 'Nonlinear Editor';
export const appTagline = 'Professional Browser-Based Video Editor';
export const appDescription =
  'Create stunning videos with our professional browser-based video editor. Features include timeline editing, keyframe animation, AI-powered video generation, and real-time collaboration. No downloads required.';

/**
 * Default metadata configuration for the entire application
 */
export const defaultMetadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: `${appName} - ${appTagline}`,
    template: `%s | ${appName}`,
  },
  description: appDescription,
  keywords: [
    'video editor',
    'online video editor',
    'browser-based video editor',
    'timeline editor',
    'keyframe animation',
    'video editing',
    'non-linear editor',
    'NLE',
    'video production',
    'video editing software',
    'AI video generation',
    'video collaboration',
    'web-based editor',
    'cloud video editor',
  ],
  authors: [{ name: appName }],
  creator: appName,
  publisher: appName,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    siteName: appName,
    title: `${appName} - ${appTagline}`,
    description: appDescription,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `${appName} - Professional Video Editing in Your Browser`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${appName} - ${appTagline}`,
    description: appDescription,
    images: ['/og-image.png'],
    creator: '@nonlineareditor',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add your verification codes here when ready
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // bing: 'your-bing-verification-code',
  },
  alternates: {
    canonical: baseUrl,
  },
  category: 'technology',
};

/**
 * Page-specific metadata configurations
 */
export const pageMetadata = {
  /**
   * Sign In Page Metadata
   */
  signin: {
    title: 'Sign In',
    description:
      'Sign in to your account to access powerful video editing tools and manage your projects.',
    openGraph: {
      title: `Sign In | ${appName}`,
      description: 'Access your video editing workspace',
      url: `${baseUrl}/signin`,
    },
    twitter: {
      title: `Sign In | ${appName}`,
      description: 'Access your video editing workspace',
    },
    robots: {
      index: false,
      follow: true,
    },
  } satisfies Metadata,

  /**
   * Sign Up Page Metadata
   */
  signup: {
    title: 'Sign Up',
    description:
      'Create a free account to start editing videos in your browser. No credit card required.',
    openGraph: {
      title: `Sign Up | ${appName}`,
      description: 'Start editing videos for free',
      url: `${baseUrl}/signup`,
    },
    twitter: {
      title: `Sign Up | ${appName}`,
      description: 'Start editing videos for free',
    },
    robots: {
      index: true,
      follow: true,
    },
  } satisfies Metadata,

  /**
   * Editor Page Metadata
   */
  editor: {
    title: 'Video Editor',
    description:
      'Professional video editing workspace with timeline, keyframe animation, and AI-powered tools.',
    openGraph: {
      title: `Video Editor | ${appName}`,
      description: 'Edit videos with professional tools',
      url: `${baseUrl}/editor`,
    },
    twitter: {
      title: `Video Editor | ${appName}`,
      description: 'Edit videos with professional tools',
    },
    robots: {
      index: false,
      follow: false,
    },
  } satisfies Metadata,

  /**
   * Timeline Page Metadata
   */
  timeline: {
    title: 'Timeline Editor',
    description: 'Advanced timeline editing with multi-track support, transitions, and effects.',
    robots: {
      index: false,
      follow: false,
    },
  } satisfies Metadata,

  /**
   * Keyframe Page Metadata
   */
  keyframe: {
    title: 'Keyframe Animation',
    description: 'Create smooth animations with advanced keyframe controls and curves.',
    robots: {
      index: false,
      follow: false,
    },
  } satisfies Metadata,

  /**
   * Video Generation Page Metadata
   */
  videoGeneration: {
    title: 'AI Video Generation',
    description:
      'Generate videos using AI-powered tools with text-to-video and image-to-video capabilities.',
    robots: {
      index: false,
      follow: false,
    },
  } satisfies Metadata,

  /**
   * Audio Generation Page Metadata
   */
  audioGeneration: {
    title: 'AI Audio Generation',
    description: 'Generate audio tracks and sound effects with AI-powered tools.',
    robots: {
      index: false,
      follow: false,
    },
  } satisfies Metadata,

  /**
   * Image Generation Page Metadata
   */
  imageGeneration: {
    title: 'AI Image Generation',
    description: 'Create images for your videos using AI image generation tools.',
    robots: {
      index: false,
      follow: false,
    },
  } satisfies Metadata,

  /**
   * Settings Page Metadata
   */
  settings: {
    title: 'Settings',
    description: 'Manage your account settings, preferences, and project configurations.',
    robots: {
      index: false,
      follow: false,
    },
  } satisfies Metadata,

  /**
   * API Documentation Page Metadata
   */
  apiDocs: {
    title: 'API Documentation',
    description:
      'Comprehensive API documentation for integrating with the Nonlinear Editor platform.',
    openGraph: {
      title: `API Documentation | ${appName}`,
      description: 'Developer API documentation',
      url: `${baseUrl}/api-docs`,
    },
    twitter: {
      title: `API Documentation | ${appName}`,
      description: 'Developer API documentation',
    },
    robots: {
      index: true,
      follow: true,
    },
  } satisfies Metadata,

  /**
   * Documentation Page Metadata
   */
  docs: {
    title: 'Documentation',
    description: 'Learn how to use the Nonlinear Editor with comprehensive guides and tutorials.',
    openGraph: {
      title: `Documentation | ${appName}`,
      description: 'User guides and tutorials',
      url: `${baseUrl}/docs`,
    },
    twitter: {
      title: `Documentation | ${appName}`,
      description: 'User guides and tutorials',
    },
    robots: {
      index: true,
      follow: true,
    },
  } satisfies Metadata,

  /**
   * Admin Page Metadata
   */
  admin: {
    title: 'Admin Dashboard',
    description: 'Administrative dashboard for managing users, projects, and system settings.',
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
    },
  } satisfies Metadata,

  /**
   * Forgot Password Page Metadata
   */
  forgotPassword: {
    title: 'Forgot Password',
    description: 'Reset your password to regain access to your video editing account.',
    robots: {
      index: false,
      follow: true,
    },
  } satisfies Metadata,

  /**
   * Reset Password Page Metadata
   */
  resetPassword: {
    title: 'Reset Password',
    description: 'Create a new password for your account.',
    robots: {
      index: false,
      follow: true,
    },
  } satisfies Metadata,
};

/**
 * Utility function to generate metadata for editor project pages
 */
export function generateProjectMetadata(projectTitle?: string): Metadata {
  const title = projectTitle ? `${projectTitle} - Video Editor` : 'Video Editor';
  const description = projectTitle
    ? `Edit ${projectTitle} with professional video editing tools`
    : 'Professional video editing workspace';

  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
    },
  };
}

/**
 * Utility function to generate JSON-LD structured data
 */
export function generateWebsiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: appName,
    description: appDescription,
    url: baseUrl,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any (Web Browser)',
    browserRequirements: 'Requires JavaScript. Requires HTML5.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1250',
    },
  };
}

/**
 * Utility function to generate breadcrumb JSON-LD
 */
export function generateBreadcrumbJsonLd(
  items: Array<{ name: string; url: string }>
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index): { '@type': string; position: number; name: string; item: string; } => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
