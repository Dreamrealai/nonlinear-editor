const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Must come first to override any Next.js defaults
  moduleNameMapper: {
    // Mock lucide-react FIRST to avoid ESM issues - this must be before @/ alias
    '^lucide-react$': '<rootDir>/__mocks__/lucide-react.js',
    // Handle module aliases
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Add polyfills before any imports
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/jest.setup-after-env.js'],
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'state/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/jest.config.js',
    '!**/jest.setup*.js',
    '!**/__tests__/**',
    '!**/test-utils/**',
    '!**/types/**',
    '!app/**/layout.tsx',
    '!app/**/loading.tsx',
    '!app/**/error.tsx',
    '!app/**/not-found.tsx',
    '!lib/supabase/client.ts',
    '!lib/supabase/server.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/e2e/', '/k6/', '/__tests__/helpers/'],
  // Transform ESM packages - critical for lucide-react and other ESM-only packages
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      'lucide-react|' +
      '@radix-ui|' +
      '@scalar|' +
      'uuid|' +
      'nanoid|' +
      'bailiff|' +
      'decode-uri-component|' +
      'filter-obj|' +
      'query-string|' +
      'split-on-first|' +
      '@google-cloud' +
      ')/)',
  ],
  modulePathIgnorePatterns: ['<rootDir>/.next/standalone'],
  // Memory and performance optimizations
  maxWorkers: 3,
  workerIdleMemoryLimit: '1024MB',
  // Reduce memory by clearing caches
  clearMocks: true,
  resetMocks: false,
  restoreMocks: false,
  // Faster test execution
  maxConcurrency: 5,
  // Detect memory leaks
  detectLeaks: false,
  detectOpenHandles: false,
  // Force exit to prevent hanging
  forceExit: true,
  // Timeout for tests
  testTimeout: 10000,
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = async () => {
  const nextJestConfig = await createJestConfig(customJestConfig)();

  // Override/merge moduleNameMapper to ensure lucide-react mock is applied
  return {
    ...nextJestConfig,
    moduleNameMapper: {
      // Mock lucide-react and all its internal imports to avoid ESM issues
      '^lucide-react$': '<rootDir>/__mocks__/lucide-react.js',
      '^lucide-react/(.*)$': '<rootDir>/__mocks__/lucide-react.js',
      // Then spread the rest of next's config
      ...nextJestConfig.moduleNameMapper,
    },
  };
};
