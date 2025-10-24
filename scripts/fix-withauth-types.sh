#!/bin/bash

# Script to fix withAuth type parameters for Next.js 16 compatibility

# Array of files and their param types
declare -A FILE_PARAMS

# Assets routes
FILE_PARAMS["/Users/davidchen/Projects/non-linear-editor/app/api/assets/[assetId]/tags/route.ts"]="assetId"
FILE_PARAMS["/Users/davidchen/Projects/non-linear-editor/app/api/assets/[assetId]/thumbnail/route.ts"]="assetId"
FILE_PARAMS["/Users/davidchen/Projects/non-linear-editor/app/api/assets/[assetId]/update/route.ts"]="assetId"
FILE_PARAMS["/Users/davidchen/Projects/non-linear-editor/app/api/assets/[assetId]/versions/[versionId]/revert/route.ts"]="assetId,versionId"
FILE_PARAMS["/Users/davidchen/Projects/non-linear-editor/app/api/assets/[assetId]/versions/route.ts"]="assetId"

# Export routes
FILE_PARAMS["/Users/davidchen/Projects/non-linear-editor/app/api/export/queue/[jobId]/pause/route.ts"]="jobId"
FILE_PARAMS["/Users/davidchen/Projects/non-linear-editor/app/api/export/queue/[jobId]/priority/route.ts"]="jobId"
FILE_PARAMS["/Users/davidchen/Projects/non-linear-editor/app/api/export/queue/[jobId]/resume/route.ts"]="jobId"
FILE_PARAMS["/Users/davidchen/Projects/non-linear-editor/app/api/export/queue/[jobId]/route.ts"]="jobId"

# Frame routes
FILE_PARAMS["/Users/davidchen/Projects/non-linear-editor/app/api/frames/[frameId]/edit/route.ts"]="frameId"

# Join routes
FILE_PARAMS["/Users/davidchen/Projects/non-linear-editor/app/api/join/[token]/route.ts"]="token"

# Project routes
FILE_PARAMS["/Users/davidchen/Projects/non-linear-editor/app/api/projects/[projectId]/activity/route.ts"]="projectId"
FILE_PARAMS["/Users/davidchen/Projects/non-linear-editor/app/api/projects/[projectId]/backups/[backupId]/restore/route.ts"]="projectId,backupId"
FILE_PARAMS["/Users/davidchen/Projects/non-linear-editor/app/api/projects/[projectId]/backups/[backupId]/route.ts"]="projectId,backupId"
FILE_PARAMS["/Users/davidchen/Projects/non-linear-editor/app/api/projects/[projectId]/backups/route.ts"]="projectId"
FILE_PARAMS["/Users/davidchen/Projects/non-linear-editor/app/api/projects/[projectId]/chat/messages/route.ts"]="projectId"
FILE_PARAMS["/Users/davidchen/Projects/non-linear-editor/app/api/projects/[projectId]/collaborators/[collaboratorId]/route.ts"]="projectId,collaboratorId"
FILE_PARAMS["/Users/davidchen/Projects/non-linear-editor/app/api/projects/[projectId]/collaborators/route.ts"]="projectId"
FILE_PARAMS["/Users/davidchen/Projects/non-linear-editor/app/api/projects/[projectId]/invites/[inviteId]/route.ts"]="projectId,inviteId"
FILE_PARAMS["/Users/davidchen/Projects/non-linear-editor/app/api/projects/[projectId]/invites/route.ts"]="projectId"
FILE_PARAMS["/Users/davidchen/Projects/non-linear-editor/app/api/projects/[projectId]/route.ts"]="projectId"
FILE_PARAMS["/Users/davidchen/Projects/non-linear-editor/app/api/projects/[projectId]/share-links/[linkId]/route.ts"]="projectId,linkId"
FILE_PARAMS["/Users/davidchen/Projects/non-linear-editor/app/api/projects/[projectId]/share-links/route.ts"]="projectId"

# Process each file
for file in "${!FILE_PARAMS[@]}"; do
  params="${FILE_PARAMS[$file]}"

  # Build the TypeScript type
  type_params=""
  IFS=',' read -ra PARAM_ARRAY <<< "$params"
  for param in "${PARAM_ARRAY[@]}"; do
    if [ -z "$type_params" ]; then
      type_params="$param: string"
    else
      type_params="$type_params; $param: string"
    fi
  done

  echo "Fixing $file with params: { $type_params }"

  # Use sed to replace withAuth( with withAuth<{ type_params }>(
  sed -i '' "s/withAuth(async/withAuth<{ $type_params }>(async/g" "$file"
done

echo "Done!"
