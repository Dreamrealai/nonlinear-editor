#!/usr/bin/env python3
"""
Systematically fix all remaining export modal integration test failures.
"""

import re

def fix_tests():
    filepath = '__tests__/components/integration/export-modal-integration.test.tsx'

    with open(filepath, 'r') as f:
        content = f.read()

    # Fix 1: "should show loading spinner" - ensure promise resolves with correct structure
    content = re.sub(
        r"resolveExportPromise!\(\{\s*ok: true,\s*json: async \(\) => \(\{ jobId: 'export-job-123' \}\),\s*\}\);",
        "resolveExportPromise!({\n          ok: true,\n          json: async () => ({ data: { jobId: 'export-job-123' }, message: 'Export started' }),\n        });",
        content
    )

    # Fix 2: Replace any remaining mockResolvedValueOnce for announce export status
    # Find line around 930 and replace
    content = re.sub(
        r"\(global\.fetch as jest\.Mock\)\.mockResolvedValueOnce\(\{\s*ok: true,\s*json: async \(\) => \(\{ jobId: 'export-job-123' \}\),\s*\}\);",
        """(global.fetch as jest.Mock).mockImplementation(async (url: string) => {
        if (url === '/api/export-presets') {
          return {
            ok: true,
            json: async () => ({ data: { presets: mockPresets } }),
          };
        }
        if (url === '/api/export') {
          return {
            ok: true,
            json: async () => ({ data: { jobId: 'export-job-123' }, message: 'Export started' }),
          };
        }
        return { ok: false, json: async () => ({ error: 'Not mocked' }) };
      });""",
        content
    )

    # Fix 3: Network error handling
    content = re.sub(
        r"\(global\.fetch as jest\.Mock\)\.mockRejectedValueOnce\(new Error\('Network error'\)\);",
        """(global.fetch as jest.Mock).mockImplementation(async (url: string) => {
        if (url === '/api/export-presets') {
          return {
            ok: true,
            json: async () => ({ data: { presets: mockPresets } }),
          };
        }
        if (url === '/api/export') {
          throw new Error('Network error');
        }
        return { ok: false, json: async () => ({ error: 'Not mocked' }) };
      });""",
        content
    )

    # Fix 4: Invalid API responses
    pattern = r"\(global\.fetch as jest\.Mock\)\.mockResolvedValueOnce\(\{\s*ok: false,\s*status: 500,\s*json: async \(\) => \(\{ error: 'Internal server error' \}\),\s*\}\);"
    replacement = """(global.fetch as jest.Mock).mockImplementation(async (url: string) => {
        if (url === '/api/export-presets') {
          return {
            ok: true,
            json: async () => ({ data: { presets: mockPresets } }),
          };
        }
        if (url === '/api/export') {
          return {
            ok: false,
            status: 500,
            json: async () => ({ error: 'Internal server error' }),
          };
        }
        return { ok: false, json: async () => ({ error: 'Not mocked' }) };
      });"""
    content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)

    # Fix 5: Malformed export data
    pattern2 = r"\(global\.fetch as jest\.Mock\)\.mockResolvedValueOnce\(\{\s*ok: true,\s*json: async \(\) => \(\{ jobId: null \}\),.*?\}\);"
    replacement2 = """(global.fetch as jest.Mock).mockImplementation(async (url: string) => {
        if (url === '/api/export-presets') {
          return {
            ok: true,
            json: async () => ({ data: { presets: mockPresets } }),
          };
        }
        if (url === '/api/export') {
          return {
            ok: true,
            json: async () => ({ jobId: null }),
          };
        }
        return { ok: false, json: async () => ({ error: 'Not mocked' }) };
      });"""
    content = re.sub(pattern2, replacement2, content, flags=re.MULTILINE | re.DOTALL)

    with open(filepath, 'w') as f:
        f.write(content)

    print("Fixed all remaining tests!")
    print("Run: npm test -- __tests__/components/integration/export-modal-integration.test.tsx")

if __name__ == '__main__':
    fix_tests()
