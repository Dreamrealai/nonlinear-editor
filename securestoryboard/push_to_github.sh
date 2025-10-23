#!/bin/bash

# Script to push SecureStoryboard changes to GitHub
# This will prompt for GitHub credentials if needed

cd /Users/davidchen/Desktop/Tech/DreamRealTech/SecureStoryboard/

# Update version timestamp first
echo "Updating version timestamp..."
node update-version.js

# Add the updated index.html
git add public/index.html

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "No version changes to commit"
else
    git commit -m "Update version timestamp"
fi

echo "Current branch and status:"
git branch -v
git status

echo -e "\nAttempting to push to GitHub..."
echo "You may be prompted for your GitHub username and password/token."
echo "Note: GitHub now requires Personal Access Tokens instead of passwords."
echo "Create one at: https://github.com/settings/tokens"
echo ""

# Try to push
git push origin main

if [ $? -eq 0 ]; then
    echo -e "\nSuccess! Changes have been pushed to GitHub."
    echo "Version has been updated with current NY time."
else
    echo -e "\nPush failed. Please check your credentials."
    echo "To create a Personal Access Token:"
    echo "1. Go to https://github.com/settings/tokens"
    echo "2. Click 'Generate new token'"
    echo "3. Give it 'repo' permissions"
    echo "4. Use the token as your password when prompted"
fi
