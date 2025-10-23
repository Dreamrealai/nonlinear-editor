/**
 * Environment Variable Validation
 *
 * Validates all required and optional environment variables at startup.
 * Provides helpful error messages and format validation.
 *
 * Usage:
 * - Import and call validateEnv() at application startup
 * - Use validateEnvSafe() for non-throwing validation (returns errors array)
 * - In development: throws errors for missing required vars
 * - In production: logs warnings for optional vars
 */

// =============================================================================
// Types
// =============================================================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface EnvVarConfig {
  /** Environment variable name */
  name: string;
  /** Whether this variable is required */
  required: boolean;
  /** Description of what this variable is for */
  description: string;
  /** Optional format validation function */
  validator?: (value: string) => boolean;
  /** Optional error message for validation failures */
  validationError?: string;
  /** Example value */
  example?: string;
}

// =============================================================================
// Environment Variable Definitions
// =============================================================================

const ENV_VARS: EnvVarConfig[] = [
  // Core Application
  {
    name: 'NODE_ENV',
    required: false,
    description: 'Node environment (development, production, test)',
    validator: (val) => ['development', 'production', 'test'].includes(val),
    validationError: 'NODE_ENV must be one of: development, production, test',
    example: 'development',
  },
  {
    name: 'NEXT_PUBLIC_BASE_URL',
    required: false,
    description: 'Base URL of the application (used for redirects and webhooks)',
    validator: (val) => /^https?:\/\/.+/.test(val),
    validationError: 'NEXT_PUBLIC_BASE_URL must be a valid URL starting with http:// or https://',
    example: 'https://app.dreamreal.ai',
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    required: false,
    description: 'Application URL (alternative to BASE_URL)',
    validator: (val) => /^https?:\/\/.+/.test(val),
    validationError: 'NEXT_PUBLIC_APP_URL must be a valid URL',
    example: 'https://app.dreamreal.ai',
  },

  // Supabase (Required for authentication and database)
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL',
    validator: (val) => /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(val),
    validationError: 'NEXT_PUBLIC_SUPABASE_URL must be a valid Supabase URL (https://*.supabase.co)',
    example: 'https://xxxxxxxxxxxxx.supabase.co',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous/public key',
    validator: (val) => val.length > 100 && val.startsWith('eyJ'),
    validationError: 'NEXT_PUBLIC_SUPABASE_ANON_KEY must be a valid JWT token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    description: 'Supabase service role key (admin privileges - NEVER expose to client)',
    validator: (val) => val.length > 100 && val.startsWith('eyJ'),
    validationError: 'SUPABASE_SERVICE_ROLE_KEY must be a valid JWT token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  },
  {
    name: 'SUPABASE_SERVICE_SECRET',
    required: false,
    description: 'Alternative name for SUPABASE_SERVICE_ROLE_KEY',
  },

  // Stripe (Required for payments)
  {
    name: 'STRIPE_SECRET_KEY',
    required: true,
    description: 'Stripe secret key for API access',
    validator: (val) => val.startsWith('sk_'),
    validationError: 'STRIPE_SECRET_KEY must start with sk_ (secret key)',
    example: 'sk_test_...',
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    required: true,
    description: 'Stripe webhook signing secret for webhook verification',
    validator: (val) => val.startsWith('whsec_'),
    validationError: 'STRIPE_WEBHOOK_SECRET must start with whsec_',
    example: 'whsec_...',
  },
  {
    name: 'STRIPE_PREMIUM_PRICE_ID',
    required: true,
    description: 'Stripe price ID for Premium subscription',
    validator: (val) => val.startsWith('price_'),
    validationError: 'STRIPE_PREMIUM_PRICE_ID must be a valid Stripe price ID (starts with price_)',
    example: 'price_...',
  },
  {
    name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    required: false,
    description: 'Stripe publishable key for client-side Stripe.js',
    validator: (val) => val.startsWith('pk_'),
    validationError: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with pk_',
    example: 'pk_test_...',
  },

  // Google Cloud / AI Services
  {
    name: 'GOOGLE_SERVICE_ACCOUNT',
    required: false,
    description: 'Google Cloud service account JSON for Vertex AI, GCS, and Video Intelligence',
    validator: (val) => {
      try {
        const parsed = JSON.parse(val);
        return parsed.type === 'service_account' && parsed.project_id && parsed.private_key;
      } catch {
        return false;
      }
    },
    validationError: 'GOOGLE_SERVICE_ACCOUNT must be valid service account JSON with type, project_id, and private_key',
    example: '{"type":"service_account","project_id":"...","private_key":"..."}',
  },
  {
    name: 'AISTUDIO_API_KEY',
    required: false,
    description: 'Google AI Studio API key for Gemini (preferred over GEMINI_API_KEY)',
    validator: (val) => val.length > 20,
    validationError: 'AISTUDIO_API_KEY must be a valid API key',
    example: 'AIza...',
  },
  {
    name: 'GEMINI_API_KEY',
    required: false,
    description: 'Google Gemini API key (alternative to AISTUDIO_API_KEY)',
    validator: (val) => val.length > 20,
    validationError: 'GEMINI_API_KEY must be a valid API key',
    example: 'AIza...',
  },
  {
    name: 'GCS_BUCKET_NAME',
    required: false,
    description: 'Google Cloud Storage bucket name for video processing (auto-created if not set)',
    validator: (val) => /^[a-z0-9][a-z0-9_-]{1,61}[a-z0-9]$/.test(val),
    validationError: 'GCS_BUCKET_NAME must be a valid GCS bucket name (lowercase, alphanumeric, hyphens)',
    example: 'my-project-video-processing',
  },

  // Video Generation APIs
  {
    name: 'FAL_API_KEY',
    required: false,
    description: 'Fal.ai API key for video upscaling and audio generation',
    validator: (val) => val.length > 20,
    validationError: 'FAL_API_KEY must be a valid API key',
    example: '...',
  },

  // Audio Generation APIs
  {
    name: 'ELEVENLABS_API_KEY',
    required: false,
    description: 'ElevenLabs API key for text-to-speech and sound effects',
    validator: (val) => val.length > 20,
    validationError: 'ELEVENLABS_API_KEY must be a valid API key',
    example: '...',
  },
  {
    name: 'COMET_API_KEY',
    required: false,
    description: 'Comet API key for Suno music generation',
    validator: (val) => val.length > 20,
    validationError: 'COMET_API_KEY must be a valid API key',
    example: '...',
  },
  {
    name: 'WAVESPEED_API_KEY',
    required: false,
    description: 'Wavespeed API key for audio processing',
    validator: (val) => val.length > 10,
    validationError: 'WAVESPEED_API_KEY must be a valid API key',
    example: '...',
  },

  // Logging & Monitoring
  {
    name: 'AXIOM_TOKEN',
    required: false,
    description: 'Axiom API token for logging and monitoring',
    validator: (val) => val.length > 20,
    validationError: 'AXIOM_TOKEN must be a valid API token',
    example: 'xaat-...',
  },
  {
    name: 'AXIOM_DATASET',
    required: false,
    description: 'Axiom dataset name for logs',
    validator: (val) => val.length > 0,
    validationError: 'AXIOM_DATASET must not be empty',
    example: 'genai-video-production',
  },

  // Other APIs
  {
    name: 'OPENAI_API_KEY',
    required: false,
    description: 'OpenAI API key (if using OpenAI services)',
    validator: (val) => val.startsWith('sk-'),
    validationError: 'OPENAI_API_KEY must start with sk-',
    example: 'sk-...',
  },
  {
    name: 'ANTHROPIC_API_KEY',
    required: false,
    description: 'Anthropic API key (if using Claude services)',
    validator: (val) => val.startsWith('sk-ant-'),
    validationError: 'ANTHROPIC_API_KEY must start with sk-ant-',
    example: 'sk-ant-...',
  },

  // Development & Deployment
  {
    name: 'VERCEL_TOKEN',
    required: false,
    description: 'Vercel API token for deployment automation',
    validator: (val) => val.length > 20,
    validationError: 'VERCEL_TOKEN must be a valid token',
    example: '...',
  },
  {
    name: 'CI',
    required: false,
    description: 'CI environment indicator (set by CI systems)',
    validator: (val) => ['true', 'false', '1', '0'].includes(val),
    validationError: 'CI must be true, false, 1, or 0',
    example: 'true',
  },
  {
    name: 'BASE_URL',
    required: false,
    description: 'Base URL for Playwright tests',
    validator: (val) => /^https?:\/\/.+/.test(val),
    validationError: 'BASE_URL must be a valid URL',
    example: 'http://localhost:3000',
  },

  // Email (Future use)
  {
    name: 'RESEND_API_KEY',
    required: false,
    description: 'Resend API key for transactional emails',
    validator: (val) => val.startsWith('re_'),
    validationError: 'RESEND_API_KEY must start with re_',
    example: 're_...',
  },
];

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validates a single environment variable
 */
function validateEnvVar(config: EnvVarConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const value = process.env[config.name]?.trim();

  // Check if required variable is missing
  if (config.required && !value) {
    errors.push(
      `Missing required environment variable: ${config.name}\n` +
      `  Description: ${config.description}\n` +
      (config.example ? `  Example: ${config.example}` : '')
    );
    return { isValid: false, errors, warnings };
  }

  // If optional and missing, just return valid
  if (!value) {
    return { isValid: true, errors, warnings };
  }

  // Run custom validator if provided
  if (config.validator && !config.validator(value)) {
    const errorMsg = config.validationError || `Invalid format for ${config.name}`;
    errors.push(
      `${errorMsg}\n` +
      `  Description: ${config.description}\n` +
      (config.example ? `  Example: ${config.example}` : '')
    );
    return { isValid: false, errors, warnings };
  }

  return { isValid: true, errors, warnings };
}

/**
 * Validates all environment variables (safe - doesn't throw)
 */
export function validateEnvSafe(): ValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Validate each environment variable
  for (const config of ENV_VARS) {
    const result = validateEnvVar(config);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  // Check for common issues
  checkCommonIssues(allErrors, allWarnings);

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Checks for common configuration issues
 */
function checkCommonIssues(errors: string[], warnings: string[]) {
  const env = process.env;

  // Check if at least one AI service is configured
  const hasAIService =
    env.AISTUDIO_API_KEY ||
    env.GEMINI_API_KEY ||
    env.GOOGLE_SERVICE_ACCOUNT;

  if (!hasAIService) {
    warnings.push(
      'No AI service configured. Set one of:\n' +
      '  - AISTUDIO_API_KEY (recommended for Gemini)\n' +
      '  - GEMINI_API_KEY (alternative for Gemini)\n' +
      '  - GOOGLE_SERVICE_ACCOUNT (for Vertex AI, Veo, Imagen)'
    );
  }

  // Warn if using both SUPABASE_SERVICE_ROLE_KEY and SUPABASE_SERVICE_SECRET
  if (env.SUPABASE_SERVICE_ROLE_KEY && env.SUPABASE_SERVICE_SECRET) {
    warnings.push(
      'Both SUPABASE_SERVICE_ROLE_KEY and SUPABASE_SERVICE_SECRET are set.\n' +
      '  Only one is needed. SUPABASE_SERVICE_ROLE_KEY will be used.'
    );
  }

  // Check if NEXT_PUBLIC_BASE_URL is set in production
  if (env.NODE_ENV === 'production' && !env.NEXT_PUBLIC_BASE_URL && !env.NEXT_PUBLIC_APP_URL) {
    warnings.push(
      'NEXT_PUBLIC_BASE_URL is not set in production.\n' +
      '  This may cause issues with redirects and webhooks.\n' +
      '  Set it to your production domain (e.g., https://app.dreamreal.ai)'
    );
  }

  // Warn if Stripe webhook secret is missing (needed in production)
  if (env.NODE_ENV === 'production' && !env.STRIPE_WEBHOOK_SECRET) {
    errors.push(
      'STRIPE_WEBHOOK_SECRET is required in production for webhook verification.\n' +
      '  Get it from Stripe Dashboard > Developers > Webhooks'
    );
  }

  // Warn if Axiom is configured but dataset is missing
  if (env.AXIOM_TOKEN && !env.AXIOM_DATASET) {
    warnings.push(
      'AXIOM_TOKEN is set but AXIOM_DATASET is missing.\n' +
      '  Logs will not be sent to Axiom without a dataset name.'
    );
  }

  // Check for potential typos in common variable names
  const commonTypos = [
    { correct: 'NEXT_PUBLIC_SUPABASE_URL', wrong: 'SUPABASE_URL' },
    { correct: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', wrong: 'SUPABASE_ANON_KEY' },
    { correct: 'SUPABASE_SERVICE_ROLE_KEY', wrong: 'SUPABASE_SERVICE_KEY' },
  ];

  for (const { correct, wrong } of commonTypos) {
    if (!env[correct] && env[wrong]) {
      warnings.push(
        `Found ${wrong} but expected ${correct}.\n` +
        `  Did you mean to use ${correct}?`
      );
    }
  }
}

/**
 * Validates environment variables and throws if invalid
 * Only validates in development mode by default
 */
export function validateEnv(options: {
  throwOnError?: boolean;
  mode?: 'development' | 'production' | 'all';
} = {}) {
  const {
    throwOnError = true,
    mode = 'development',
  } = options;

  // Skip validation in production unless mode is 'all' or 'production'
  const shouldValidate =
    mode === 'all' ||
    (mode === 'development' && process.env.NODE_ENV === 'development') ||
    (mode === 'production' && process.env.NODE_ENV === 'production');

  if (!shouldValidate) {
    return;
  }

  const result = validateEnvSafe();

  // Print warnings
  if (result.warnings.length > 0) {
    console.warn('\n⚠️  Environment Variable Warnings:\n');
    result.warnings.forEach((warning, i) => {
      console.warn(`${i + 1}. ${warning}\n`);
    });
  }

  // Handle errors
  if (result.errors.length > 0) {
    console.error('\n❌ Environment Variable Validation Failed:\n');
    result.errors.forEach((error, i) => {
      console.error(`${i + 1}. ${error}\n`);
    });

    if (throwOnError) {
      throw new Error(
        `Environment validation failed with ${result.errors.length} error(s). ` +
        `Check the error messages above for details.`
      );
    }
  } else {
    console.log('✅ Environment variables validated successfully\n');
  }
}

/**
 * Gets a list of all environment variables and their status
 */
export function getEnvStatus() {
  return ENV_VARS.map(config => ({
    name: config.name,
    required: config.required,
    configured: !!process.env[config.name]?.trim(),
    description: config.description,
  }));
}

/**
 * Prints environment status to console
 */
export function printEnvStatus() {
  const status = getEnvStatus();

  console.log('\n📋 Environment Variables Status:\n');

  const required = status.filter(s => s.required);
  const optional = status.filter(s => !s.required);

  console.log('Required Variables:');
  required.forEach(s => {
    const icon = s.configured ? '✅' : '❌';
    console.log(`  ${icon} ${s.name} - ${s.description}`);
  });

  console.log('\nOptional Variables:');
  optional.forEach(s => {
    const icon = s.configured ? '✅' : '⚪';
    console.log(`  ${icon} ${s.name} - ${s.description}`);
  });

  console.log('\n');
}
