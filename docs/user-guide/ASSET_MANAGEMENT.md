# Managing Your Assets

Learn how to efficiently upload, organize, search, and manage your media assets in the Non-Linear Video Editor.

## Table of Contents

1. [Asset Overview](#asset-overview)
2. [Uploading Assets](#uploading-assets)
3. [Searching & Filtering](#searching--filtering)
4. [Organizing Assets](#organizing-assets)
5. [Asset Properties](#asset-properties)
6. [Version History](#version-history)
7. [Best Practices](#best-practices)
8. [Advanced Features](#advanced-features)

## Asset Overview

Assets are the building blocks of your video projects - videos, audio files, images, and more. Efficient asset management is key to a smooth editing workflow.

### What Are Assets?

**Supported Asset Types**:

- **Video Files** - MP4, MOV, AVI, WebM, MKV
- **Audio Files** - MP3, WAV, AAC, M4A, FLAC
- **Image Files** - JPG, PNG, GIF, WebP, SVG
- **Document Files** - PDF (for storyboards, scripts)

### Asset Panel

The Asset Panel is your media library, located on the left side of the editor.

```
┌─────────────────────┐
│  ASSET LIBRARY      │
│                     │
│  [Search Box]       │
│  [Filters ▼]        │
│                     │
│  ┌───────┐          │
│  │ IMG   │ Video 1  │
│  └───────┘          │
│                     │
│  ┌───────┐          │
│  │ 🎵    │ Audio 1  │
│  └───────┘          │
│                     │
│  [Upload]           │
└─────────────────────┘
```

**Key Features**:

- Visual thumbnails for video and images
- File name and duration display
- Type icons for quick identification
- Drag-and-drop to timeline
- Right-click context menu

## Uploading Assets

### Method 1: Drag and Drop

The fastest way to upload multiple files:

1. Open your file browser (Finder on Mac, Explorer on Windows)
2. Select one or more files
3. Drag them into the Asset Panel
4. Drop when you see the upload zone highlight
5. Wait for upload to complete

**Benefits**:

- Upload multiple files at once
- Visual feedback during upload
- No clicking required

**Tips**:

- You can drag entire folders
- Upload progress shows for each file
- Continue editing while uploads happen in background

### Method 2: File Browser

Select files through a dialog:

1. Click the **"Upload"** button in Asset Panel
2. Browse to your files
3. Select one or multiple files (Cmd/Ctrl+Click for multiple)
4. Click **"Open"**
5. Wait for upload to complete

**Benefits**:

- Familiar interface
- Can browse multiple folders
- Preview files before uploading

### Upload Progress

While files are uploading:

```
Uploading: video-clip.mp4
▓▓▓▓▓▓▓▓░░░░░░░░ 45%
2.1 MB / 4.7 MB
```

**Progress Indicators**:

- Progress bar shows completion percentage
- File size uploaded / total size
- Estimated time remaining
- Ability to cancel upload

**Multiple Uploads**:

- Each file shows individual progress
- Uploads happen in parallel (up to 3 at once)
- Failed uploads can be retried

### Supported Formats

#### Video Formats

- **MP4** - Most common, best compatibility
- **MOV** - Apple format, high quality
- **AVI** - Windows format, larger files
- **WebM** - Web-optimized, smaller files
- **MKV** - Container format, multiple tracks

**Recommended**: MP4 (H.264) for best compatibility and quality

#### Audio Formats

- **MP3** - Universal compatibility, compressed
- **WAV** - Uncompressed, high quality, large files
- **AAC** - Better compression than MP3
- **M4A** - Apple format, good quality
- **FLAC** - Lossless compression

**Recommended**: MP3 or AAC for balance of quality and size

#### Image Formats

- **JPG** - Photographs, compressed
- **PNG** - Graphics, supports transparency
- **GIF** - Animated images
- **WebP** - Modern format, smaller files
- **SVG** - Vector graphics, scalable

**Recommended**: PNG for graphics/overlays, JPG for photos

### File Size Limits

**Free Plan**:

- Maximum file size: 500 MB per file
- Total storage: 5 GB

**Pro Plan**:

- Maximum file size: 5 GB per file
- Total storage: 100 GB

**Enterprise Plan**:

- Maximum file size: 10 GB per file
- Total storage: Unlimited

**Tips for Large Files**:

- Compress video before uploading
- Use appropriate codecs (H.264 for video)
- Consider breaking long videos into segments
- Upload during off-peak hours for faster speeds

### Troubleshooting Uploads

#### Upload Failed

**Common Causes**:

- File too large
- Unsupported format
- Poor internet connection
- Storage limit reached

**Solutions**:

1. Check file size and format
2. Try uploading again
3. Compress the file
4. Upgrade your plan

#### Upload Stuck

**Solutions**:

1. Check internet connection
2. Refresh the page
3. Cancel and retry upload
4. Try a different browser
5. Contact support if issue persists

#### File Not Appearing

**Solutions**:

1. Wait a few seconds for processing
2. Refresh the Asset Panel
3. Check if upload completed
4. Look in "Recent Uploads" filter

## Searching & Filtering

Find assets quickly in large libraries with powerful search and filtering tools.

### Search by Name

The search box at the top of the Asset Panel:

1. Click in the search box
2. Type part of the file name
3. Results filter in real-time
4. Clear search to see all assets

**Search Tips**:

- Search is case-insensitive
- Searches file name and tags
- Use specific keywords for better results
- Use quotation marks for exact phrases

**Examples**:

- `interview` - Finds "interview-1.mp4", "interview-final.mp4"
- `"take 2"` - Finds exact phrase "take 2"
- `background` - Finds all assets with "background" in name or tags

### Filter by Type

Show only specific asset types:

**Available Filters**:

- **All** - Show everything (default)
- **Videos** - Video files only
- **Audio** - Audio files only
- **Images** - Image files only
- **Documents** - PDF and document files

**How to Filter**:

1. Click the **"Filter"** dropdown
2. Select desired type
3. Asset Panel updates instantly
4. Click "All" to clear filter

**Use Cases**:

- Finding background music (Audio filter)
- Selecting B-roll footage (Videos filter)
- Choosing graphics and logos (Images filter)

### Filter by Usage

See which assets are used in your project:

**Usage Filters**:

- **All Assets** - Everything in library
- **Used in Project** - Assets currently on timeline
- **Unused** - Assets not yet used
- **Recently Added** - Last 7 days

**How to Use**:

1. Click **"Usage"** dropdown
2. Select filter option
3. View filtered results

**Use Cases**:

- Finding unused assets to remove: "Unused"
- Seeing what's already in use: "Used in Project"
- Working with new uploads: "Recently Added"

### Filter by Tags

Organize with custom tags:

1. Click **"Tags"** dropdown
2. See all available tags
3. Click a tag to filter by it
4. Click multiple tags to filter by all

**Tag Examples**:

- `B-roll` - Alternative footage
- `Interview` - Talking head footage
- `Music` - Audio tracks
- `SFX` - Sound effects
- `Graphics` - Logos, lower thirds
- `Archive` - Old or backup files

### Combining Filters

Use multiple filters simultaneously:

**Example 1**: Find unused B-roll footage

- Type: Videos
- Usage: Unused
- Tags: B-roll

**Example 2**: Find recent music additions

- Type: Audio
- Usage: Recently Added
- Tags: Music

**Example 3**: Find used graphics

- Type: Images
- Usage: Used in Project
- Tags: Graphics

### Sorting Options

Change the order assets are displayed:

**Sort By**:

- **Name (A-Z)** - Alphabetical
- **Name (Z-A)** - Reverse alphabetical
- **Date Added (Newest)** - Most recent first
- **Date Added (Oldest)** - Oldest first
- **File Size (Largest)** - Biggest files first
- **File Size (Smallest)** - Smallest files first
- **Duration (Longest)** - Longest clips first
- **Duration (Shortest)** - Shortest clips first

**How to Sort**:

1. Click the **"Sort"** dropdown
2. Select sort option
3. Assets reorder instantly

**Use Cases**:

- Finding large files to delete: "File Size (Largest)"
- Organizing by import date: "Date Added"
- Finding short clips for transitions: "Duration (Shortest)"

## Organizing Assets

### Adding Tags

Tags help categorize and find assets quickly:

**Method 1: Single Asset**

1. Right-click on asset
2. Select **"Edit Tags"**
3. Type tag name (or select existing)
4. Press Enter to add
5. Add multiple tags as needed

**Method 2: Bulk Tagging**

1. Select multiple assets (Shift+Click)
2. Right-click on selection
3. Choose **"Add Tags"**
4. Enter tags to apply to all

**Tag Best Practices**:

- Use consistent naming (lowercase, no spaces)
- Create a tag system before starting
- Common tags: scene, type, quality, location
- Don't over-tag - keep it simple

**Example Tag System**:

```
Type:
- video
- audio
- image
- graphics

Scene:
- intro
- main
- outro
- b-roll

Quality:
- raw
- edited
- final

Location:
- studio
- outdoor
- office
```

### Renaming Assets

Give assets descriptive names:

1. Right-click on asset
2. Choose **"Rename"**
3. Type new name
4. Press Enter to save

**Naming Best Practices**:

- Use descriptive names: "interview-john-doe.mp4"
- Include dates: "footage-2025-10-24.mp4"
- Use consistent format: "project-scene-take.mp4"
- Avoid special characters: use hyphens or underscores
- Keep names concise but meaningful

**Bad Names**:

- `IMG_1234.jpg`
- `video.mp4`
- `untitled.mov`
- `asdf.mp3`

**Good Names**:

- `product-demo-take3.mp4`
- `background-music-upbeat.mp3`
- `logo-transparent-white.png`
- `interview-jane-intro.mp4`

### Deleting Assets

Remove assets from your library:

**Delete Single Asset**:

1. Right-click on asset
2. Choose **"Delete"**
3. Confirm deletion

**Delete Multiple Assets**:

1. Select multiple assets
2. Right-click on selection
3. Choose **"Delete Selected"**
4. Confirm deletion

**Important Notes**:

- Deleted assets go to Trash (recoverable for 30 days)
- Assets used in projects are marked with warning
- Deleting doesn't remove from timeline (clips remain)
- Deleted assets are removed from storage quota

**Safety Check**:
Before deleting, the system warns you:

```
⚠️ This asset is used in 2 projects:
- Summer Vacation Video
- Product Launch 2025

Are you sure you want to delete it?
```

### Creating Collections

Group related assets together (Pro feature):

1. Click **"New Collection"**
2. Name your collection
3. Drag assets into collection
4. Collections appear in sidebar

**Use Cases**:

- Organizing by project
- Grouping by shoot day
- Separating client assets
- Creating reusable asset packs

**Example Collections**:

- "Intro Templates"
- "Background Music"
- "Client Logo Variations"
- "Product Shots - Shoot 1"

### Asset Properties

View detailed information about any asset:

1. Click on an asset
2. Properties panel appears on right
3. View all metadata

**Property Information**:

- **File Name** - Original file name
- **Type** - Video, Audio, Image
- **Format** - MP4, MP3, PNG, etc.
- **Duration** - Length (for video/audio)
- **Dimensions** - Width x Height (for video/images)
- **File Size** - Size in MB
- **Date Added** - Upload date
- **Date Modified** - Last edit date
- **Used In** - List of projects using this asset
- **Tags** - Applied tags
- **Custom Metadata** - User-defined fields

**Editing Properties**:

- Click edit icon next to any field
- Modify and save
- Properties sync across all uses

## Version History

Track changes to assets over time (Pro feature):

### Viewing Version History

1. Right-click on asset
2. Select **"Version History"**
3. See all versions with dates
4. Preview any version
5. Restore previous version if needed

**Version History Shows**:

- Upload date and time
- User who uploaded
- File size and format
- Preview thumbnail
- Notes or comments

**Example Timeline**:

```
v3 - Oct 24, 2025 2:30 PM - Current
    Final color correction applied

v2 - Oct 24, 2025 1:15 PM
    Updated with client feedback

v1 - Oct 23, 2025 4:00 PM - Original
    Initial upload
```

### Creating New Versions

Update an asset while keeping history:

1. Right-click on asset
2. Choose **"Upload New Version"**
3. Select updated file
4. Add version notes (optional)
5. New version becomes current

**Benefits**:

- Keep all versions in one place
- Easy rollback if needed
- Track changes over time
- Clients can review iterations

### Restoring Previous Versions

Made a mistake? Restore an older version:

1. Open Version History
2. Click on desired version
3. Choose **"Restore This Version"**
4. Confirm restoration
5. Old version becomes current (creates new version entry)

**Important**: Restoring doesn't delete current version - it creates a new version based on the old one.

## Best Practices

### Asset Organization Strategy

**1. Name Assets Before Uploading**

- Rename files on your computer first
- Use consistent naming convention
- Include project name, scene, take number

**2. Tag Immediately**

- Tag assets as you upload them
- Don't let untagged assets pile up
- Create tag system before starting project

**3. Delete Unused Assets Regularly**

- Review unused assets weekly
- Keep library lean and organized
- Archive old projects

**4. Use Collections for Projects**

- One collection per project
- Easier to find project-specific assets
- Can share collections with team

**5. Regular Maintenance**

- Weekly: Delete unused assets
- Monthly: Review and reorganize tags
- Quarterly: Archive completed projects

### Storage Management

**Keep Storage Under Control**:

1. **Delete Unused Assets**: Clear out assets you'll never use
2. **Compress Files**: Use appropriate compression before upload
3. **Download and Delete**: Archive old projects locally, then delete from cloud
4. **Upgrade Plan**: Get more storage if needed

**Storage Tips**:

- Videos: Use H.264 compression
- Audio: Use MP3 or AAC, not WAV
- Images: Use JPG for photos, PNG only when transparency needed
- Check storage usage regularly

### Workflow Optimization

**Efficient Asset Workflow**:

```
1. PREPARE
   ↓ Name files descriptively
   ↓ Organize in folders on computer
   ↓ Plan tag system

2. UPLOAD
   ↓ Drag and drop batch upload
   ↓ Tag immediately after upload
   ↓ Add to appropriate collection

3. EDIT
   ↓ Use search and filters to find assets
   ↓ Drag to timeline
   ↓ Mark assets as used

4. CLEANUP
   ↓ Delete unused assets
   ↓ Archive project
   ↓ Free up storage
```

## Advanced Features

### Smart Search (Pro Feature)

AI-powered search of video content:

1. Search for objects: "cat", "car", "ocean"
2. Search for scenes: "sunset", "office", "beach"
3. Search for actions: "running", "talking", "typing"
4. Results show matching frames

**Example Searches**:

- "blue car" - Finds clips with blue cars
- "person talking" - Finds interview segments
- "outdoor sunset" - Finds sunset scenes

### Auto-Tagging (Pro Feature)

Automatically tag assets based on content:

1. Upload asset
2. AI analyzes content
3. Suggests relevant tags
4. Accept or modify suggestions

**Auto-Detected Tags**:

- Objects and scenes
- Colors and lighting
- Audio characteristics
- Quality metrics

### Batch Operations

Perform actions on multiple assets:

**Available Batch Operations**:

- Add tags to multiple assets
- Remove tags from multiple assets
- Move to collection
- Delete multiple assets
- Download multiple assets
- Change metadata

**How to Use**:

1. Select multiple assets (Shift+Click or Cmd+A)
2. Right-click on selection
3. Choose batch operation
4. Apply changes

### Asset Analytics (Pro Feature)

Track asset usage and performance:

**Metrics Available**:

- Times used in projects
- Total views in previews
- Storage used
- Upload/download history
- Most/least used assets

**Use Cases**:

- Identify frequently used assets
- Find orphaned assets to delete
- Optimize storage usage
- Track team asset usage

## Troubleshooting

### Can't Find Asset

**Solutions**:

1. Clear all filters (click "All")
2. Clear search box
3. Check if asset is in different project
4. Look in Trash folder
5. Check Recent Uploads

### Asset Won't Upload

**Solutions**:

1. Check file size limit
2. Verify file format is supported
3. Check internet connection
4. Try different browser
5. Compress file and retry

### Asset Shows Error

**Solutions**:

1. Re-upload the file
2. Check file isn't corrupted
3. Convert to different format
4. Contact support with error details

### Asset Deleted by Mistake

**Solutions**:

1. Open Trash folder
2. Find deleted asset
3. Click "Restore"
4. Asset returns to library

(Works for 30 days after deletion)

## Quick Reference

### Keyboard Shortcuts

- **Cmd/Ctrl+U** - Upload assets
- **Cmd/Ctrl+F** - Focus search box
- **Delete** - Delete selected asset
- **Cmd/Ctrl+A** - Select all visible assets
- **Enter** - Add selected asset to timeline

### Common Tasks

**Upload Multiple Files**:
Drag and drop folder → All files upload

**Find Unused Assets**:
Filter > Usage > Unused

**Bulk Tag Assets**:
Select multiple → Right-click → Add Tags

**Quick Add to Timeline**:
Double-click asset

**Preview Asset**:
Click thumbnail → Space to play

## Next Steps

Master asset management and explore:

- **Timeline Editing** - Use your organized assets efficiently
- **Project Collaboration** - Share asset libraries with team
- **Export Settings** - Output your finished videos
- **Advanced Effects** - Apply effects to your assets

---

**Last Updated**: October 24, 2025
**Version**: 1.0.0
