/**
 * TypeScript Environment Variable Definitions
 *
 * This file provides type definitions for all environment variables used in the application.
 * It enables autocomplete and type checking when accessing process.env variables.
 *
 * Benefits:
 * - IDE autocomplete for environment variables
 * - Type safety when accessing env vars
 * - Documentation of all available variables
 * - Prevents typos in variable names
 */

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // =============================================================================
      // Core Application
      // =============================================================================

      /** Node environment (development, production, test) */
      NODE_ENV: 'development' | 'production' | 'test';

      /** Base URL of the application (used for redirects and webhooks) */
      NEXT_PUBLIC_BASE_URL?: string;

      /** Application URL (alternative to BASE_URL) */
      NEXT_PUBLIC_APP_URL?: string;

      // =============================================================================
      // Supabase (Authentication & Database)
      // =============================================================================

      /** Supabase project URL (format: https://*.supabase.co) */
      NEXT_PUBLIC_SUPABASE_URL: string;

      /** Supabase anonymous/public key (safe to expose to client) */
      NEXT_PUBLIC_SUPABASE_ANON_KEY: string;

      /** Supabase service role key (admin privileges - NEVER expose to client) */
      SUPABASE_SERVICE_ROLE_KEY: string;

      /** Alternative name for SUPABASE_SERVICE_ROLE_KEY */
      SUPABASE_SERVICE_SECRET?: string;

      // =============================================================================
      // Stripe (Payment Processing)
      // =============================================================================

      /** Stripe secret key for API access (starts with sk_) */
      STRIPE_SECRET_KEY: string;

      /** Stripe publishable key for client-side Stripe.js (starts with pk_) */
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;

      /** Stripe webhook signing secret for webhook verification (starts with whsec_) */
      STRIPE_WEBHOOK_SECRET: string;

      /** Stripe price ID for Premium subscription (starts with price_) */
      STRIPE_PREMIUM_PRICE_ID: string;

      // =============================================================================
      // Google Cloud & AI Services
      // =============================================================================

      /**
       * Google Cloud service account JSON (used for Vertex AI, GCS, Video Intelligence)
       * Format: {"type":"service_account","project_id":"...","private_key":"..."}
       */
      GOOGLE_SERVICE_ACCOUNT?: string;

      /**
       * Google AI Studio API key for Gemini (preferred over GEMINI_API_KEY)
       * Supports "latest" model aliases like gemini-flash-latest
       */
      AISTUDIO_API_KEY?: string;

      /**
       * Google Gemini API key (alternative to AISTUDIO_API_KEY)
       * For direct Gemini API access without Vertex AI
       */
      GEMINI_API_KEY?: string;

      /**
       * Google Cloud Storage bucket name for video processing
       * Auto-created if not specified using format: {project_id}-video-processing
       */
      GCS_BUCKET_NAME?: string;

      // =============================================================================
      // Video Generation APIs
      // =============================================================================

      /** Fal.ai API key for video upscaling and audio generation */
      FAL_API_KEY?: string;

      // =============================================================================
      // Audio Generation APIs
      // =============================================================================

      /** ElevenLabs API key for text-to-speech and sound effects */
      ELEVENLABS_API_KEY?: string;

      /** Comet API key for Suno music generation */
      COMET_API_KEY?: string;

      /** Wavespeed API key for audio processing */
      WAVESPEED_API_KEY?: string;

      // =============================================================================
      // Logging & Monitoring
      // =============================================================================

      /** Axiom API token for logging and monitoring (starts with xaat-) */
      AXIOM_TOKEN?: string;

      /** Axiom dataset name for logs */
      AXIOM_DATASET?: string;

      // =============================================================================
      // Other AI/ML APIs
      // =============================================================================

      /** OpenAI API key (if using OpenAI services, starts with sk-) */
      OPENAI_API_KEY?: string;

      /** Anthropic API key (if using Claude services, starts with sk-ant-) */
      ANTHROPIC_API_KEY?: string;

      // =============================================================================
      // Email Services
      // =============================================================================

      /** Resend API key for transactional emails (starts with re_) */
      RESEND_API_KEY?: string;

      // =============================================================================
      // Development & Deployment
      // =============================================================================

      /** Vercel API token for deployment automation */
      VERCEL_TOKEN?: string;

      /** CI environment indicator (set by CI systems like GitHub Actions) */
      CI?: string;

      /** Base URL for Playwright tests (defaults to http://localhost:3000) */
      BASE_URL?: string;
    }
  }
}

// This export is required to make this a module and avoid global scope pollution
export {};
