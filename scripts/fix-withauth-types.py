#!/usr/bin/env python3
"""
Script to fix withAuth type parameters for Next.js 16 compatibility
"""

import re
import os

# Map of file paths to their parameter names
FILE_PARAMS = {
    # Assets routes
    "app/api/assets/[assetId]/tags/route.ts": ["assetId"],
    "app/api/assets/[assetId]/thumbnail/route.ts": ["assetId"],
    "app/api/assets/[assetId]/update/route.ts": ["assetId"],
    "app/api/assets/[assetId]/versions/[versionId]/revert/route.ts": ["assetId", "versionId"],
    "app/api/assets/[assetId]/versions/route.ts": ["assetId"],
    # Export routes
    "app/api/export/queue/[jobId]/pause/route.ts": ["jobId"],
    "app/api/export/queue/[jobId]/priority/route.ts": ["jobId"],
    "app/api/export/queue/[jobId]/resume/route.ts": ["jobId"],
    "app/api/export/queue/[jobId]/route.ts": ["jobId"],
    # Frame routes
    "app/api/frames/[frameId]/edit/route.ts": ["frameId"],
    # Join routes
    "app/api/join/[token]/route.ts": ["token"],
    # Project routes
    "app/api/projects/[projectId]/activity/route.ts": ["projectId"],
    "app/api/projects/[projectId]/backups/[backupId]/restore/route.ts": ["projectId", "backupId"],
    "app/api/projects/[projectId]/backups/[backupId]/route.ts": ["projectId", "backupId"],
    "app/api/projects/[projectId]/backups/route.ts": ["projectId"],
    "app/api/projects/[projectId]/chat/messages/route.ts": ["projectId"],
    "app/api/projects/[projectId]/collaborators/[collaboratorId]/route.ts": ["projectId", "collaboratorId"],
    "app/api/projects/[projectId]/collaborators/route.ts": ["projectId"],
    "app/api/projects/[projectId]/invites/[inviteId]/route.ts": ["projectId", "inviteId"],
    "app/api/projects/[projectId]/invites/route.ts": ["projectId"],
    "app/api/projects/[projectId]/route.ts": ["projectId"],
    "app/api/projects/[projectId]/share-links/[linkId]/route.ts": ["projectId", "linkId"],
    "app/api/projects/[projectId]/share-links/route.ts": ["projectId"],
}

def fix_file(filepath, params):
    """Fix withAuth type parameters in a single file"""
    # Build type string like: { assetId: string } or { projectId: string; backupId: string }
    type_str = "{ " + "; ".join([f"{p}: string" for p in params]) + " }"

    try:
        with open(filepath, 'r') as f:
            content = f.read()

        # Check if file already has the type parameter
        if f"withAuth<{type_str}>" in content:
            print(f"✓ Already fixed: {filepath}")
            return False

        # Replace withAuth(async with withAuth<{ params }>(async
        original_content = content
        content = re.sub(
            r'withAuth\(async',
            f'withAuth<{type_str}>(async',
            content
        )

        if content != original_content:
            with open(filepath, 'w') as f:
                f.write(content)
            print(f"✓ Fixed: {filepath} with params {type_str}")
            return True
        else:
            print(f"⚠ No changes needed: {filepath}")
            return False
    except Exception as e:
        print(f"✗ Error fixing {filepath}: {e}")
        return False

def main():
    base_dir = "/Users/davidchen/Projects/non-linear-editor"
    fixed_count = 0

    for rel_path, params in FILE_PARAMS.items():
        filepath = os.path.join(base_dir, rel_path)
        if os.path.exists(filepath):
            if fix_file(filepath, params):
                fixed_count += 1
        else:
            print(f"⚠ File not found: {filepath}")

    print(f"\nDone! Fixed {fixed_count} files.")

if __name__ == "__main__":
    main()
