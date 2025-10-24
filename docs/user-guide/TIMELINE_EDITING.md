# Timeline Editing Guide

Master the timeline to create professional-quality videos with precision and efficiency.

## Table of Contents

1. [Timeline Overview](#timeline-overview)
2. [Grid Settings](#grid-settings)
3. [Selection Tools](#selection-tools)
4. [Timeline Minimap](#timeline-minimap)
5. [Editing Techniques](#editing-techniques)
6. [Timeline Navigation](#timeline-navigation)
7. [Tips & Tricks](#tips--tricks)
8. [Keyboard Shortcuts](#keyboard-shortcuts)

## Timeline Overview

The timeline is where you arrange, edit, and fine-tune your video clips. It's the heart of the editing process.

### Timeline Components

```
┌─────────────────────────────────────────────────────────────┐
│  [Ruler with Time Markers]                                  │ Time Ruler
├─────────────────────────────────────────────────────────────┤
│  Track 1  ┌────────┐  ┌──────────┐  ┌────┐                │ Video Track
│           │ Clip A │  │  Clip B  │  │ C  │                │
│           └────────┘  └──────────┘  └────┘                │
├─────────────────────────────────────────────────────────────┤
│  Track 2  ┌──────────────────────┐                         │ Audio Track
│           │      Audio 1         │                         │
│           └──────────────────────┘                         │
├─────────────────────────────────────────────────────────────┤
│                    [Minimap View]                           │ Minimap
└─────────────────────────────────────────────────────────────┘
```

**Key Elements**:
- **Time Ruler** - Shows time markers and current position
- **Tracks** - Horizontal lanes for video, audio, and overlays
- **Playhead** - Red vertical line showing current time position
- **Clips** - Your media arranged on tracks
- **Minimap** - Bird's-eye view of entire timeline
- **Zoom Controls** - Adjust timeline scale for precision

### Understanding Tracks

**Video Tracks**:
- Hold video clips and images
- Higher tracks appear on top (layering)
- Support transparency and compositing

**Audio Tracks**:
- Hold audio clips and music
- Can be linked to video tracks
- Support volume adjustment

**Text Overlay Tracks**:
- Hold titles and captions
- Always appear on top of video
- Support positioning and animation

## Grid Settings

Grid settings help you align clips precisely and work with consistent timing intervals.

### Opening Grid Settings

1. Look for the **Grid Settings** button in the timeline toolbar
2. Click the grid icon (usually near zoom controls)
3. The grid settings panel will appear

### Preset Intervals

Choose from common time intervals for quick setup:

- **1 Second** - Fine-grained editing, precise timing
- **5 Seconds** - Good for scene-based editing
- **10 Seconds** - Longer segments, rough cuts
- **30 Seconds** - Story beats, chapter markers
- **1 Minute** - Long-form content organization

**When to Use Each**:
- **1 Second**: Music videos, precise sync to audio
- **5 Seconds**: Most general editing tasks
- **10 Seconds**: Documentary-style rough cuts
- **30 Seconds**: Commercial breaks, chapter markers
- **1 Minute**: Long-form tutorials, podcasts

### Custom Intervals

Need a specific interval? Create your own:

1. Open Grid Settings
2. Select **"Custom"**
3. Enter your desired interval (e.g., 2.5 seconds)
4. Click **"Apply"**

**Use Cases for Custom Intervals**:
- Matching specific music tempo (e.g., 2.4s for 25 BPM)
- Frame-specific timing (e.g., 0.033s for 30fps)
- Custom animation timing

### Snap Toggle

Snap helps clips automatically align to grid lines:

**Enable Snap**:
- Click the magnet icon in the toolbar
- Or press **Cmd/Ctrl+Shift+S**

**When Snap is Enabled**:
- Clips automatically align to grid lines
- Playhead snaps to markers and clip boundaries
- Makes it easier to align clips precisely

**When Snap is Disabled**:
- Free positioning of clips
- Useful for overlays and transitions
- More precise control for micro-adjustments

**Pro Tip**: Toggle snap on and off as needed. Enable it for rough cuts, disable it for fine-tuning.

### Grid Settings Shortcut

**Cmd/Ctrl+Shift+S** - Toggle snap on/off

This is one of the most used shortcuts. Learn it early!

## Selection Tools

Efficient selection is key to fast editing. Master these techniques to speed up your workflow.

### Single Selection

**Click to Select**:
1. Click on any clip in the timeline
2. The clip will be highlighted (usually with a colored border)
3. Properties panel shows clip details

**Keyboard Navigation**:
- **Tab** - Select next clip
- **Shift+Tab** - Select previous clip

### Multiple Selection

#### Extended Selection (Shift+Click)

Select a range of clips:

1. Click on the first clip
2. Hold **Shift**
3. Click on the last clip
4. All clips in between are selected

**Use Case**: Deleting a sequence, moving multiple clips together

#### Rubber Band Selection (Drag to Select)

Select multiple clips by drawing a box:

1. Click and hold on empty timeline space
2. Drag to create a selection rectangle
3. Release to select all clips within the box

**Tips**:
- Start from empty space, not on a clip
- Selection box shows as you drag
- Works across multiple tracks

**Use Cases**:
- Selecting scattered clips
- Selecting all clips in a time range
- Cross-track selection

### Select All in Track

Select every clip on a specific track:

1. Right-click on the track header
2. Choose **"Select All in Track"**
3. All clips on that track are selected

**Use Case**: Applying effects to all clips on a track, adjusting track-wide settings

### Select All (Cmd/Ctrl+A)

Select every clip on the timeline:

1. Press **Cmd+A** (Mac) or **Ctrl+A** (Windows/Linux)
2. All clips on all tracks are selected

**Use Cases**:
- Moving entire timeline
- Applying global changes
- Checking total duration

**Warning**: Be careful with delete when all clips are selected!

### Deselecting

**Deselect All**:
- Click on empty timeline space
- Or press **Escape**

**Remove from Selection**:
- Hold **Shift** and click on a selected clip

## Timeline Minimap

The minimap provides a bird's-eye view of your entire project, making navigation effortless.

### What the Minimap Shows

```
┌──────────────────────────────────────────────────────┐
│  ▓▓░░░░▓▓▓▓░░▓▓░░░░░░░░▓▓▓▓▓▓░░░░▓▓                │
│      └─────────┘                                     │
│      Viewport Indicator                              │
└──────────────────────────────────────────────────────┘
```

**Visual Elements**:
- **Dark blocks** - Clips on the timeline
- **Light spaces** - Empty gaps
- **Viewport indicator** - Current visible area (highlighted box)
- **Playhead** - Current time position (red line)

**Information at a Glance**:
- Total project length
- Clip distribution and density
- Empty gaps in your edit
- Current position in overall timeline

### Navigating with Minimap

#### Method 1: Dragging the Viewport

1. Click and hold on the **viewport indicator** (the highlighted box)
2. Drag left or right to scroll the timeline
3. Release to stop at that position

**Benefits**:
- Smooth, continuous scrolling
- Visual feedback of position
- Precise control

#### Method 2: Clicking to Jump

1. Click anywhere on the minimap
2. The timeline instantly jumps to that position
3. The viewport centers on the clicked location

**Benefits**:
- Instant navigation
- Great for jumping between sections
- Quick review of specific parts

### Minimap Tips

**Use the Minimap For**:
- Finding empty gaps in your timeline
- Jumping to specific sections quickly
- Understanding overall project structure
- Identifying dense vs. sparse areas

**When to Watch the Minimap**:
- During rough cut to see overall pacing
- When looking for specific clips
- To ensure even distribution of content
- During final review

**Pro Tip**: Keep an eye on the minimap while editing. It helps you maintain good pacing and spot issues quickly.

## Editing Techniques

### Basic Editing Operations

#### Adding Clips to Timeline

**Method 1: Drag and Drop**
1. Find asset in Asset Panel
2. Click and hold on the asset
3. Drag onto timeline
4. Release at desired position

**Method 2: Double-Click**
1. Double-click an asset
2. It's automatically added to the end of the timeline

#### Moving Clips

1. Click and hold on a clip
2. Drag left/right to reposition
3. Drag up/down to change tracks
4. Release to place

**With Snap Enabled**: Clips align to grid lines automatically
**With Snap Disabled**: Free positioning

#### Trimming Clips

Adjust the in and out points of a clip:

**Trim Start**:
1. Hover over the left edge of a clip
2. Cursor changes to resize icon (⟷)
3. Click and drag right to trim from start

**Trim End**:
1. Hover over the right edge of a clip
2. Cursor changes to resize icon (⟷)
3. Click and drag left to trim from end

**Visual Feedback**:
- Dimmed area shows trimmed portion
- Time indicator shows new duration
- Snap lines appear at grid intervals

**Keyboard Shortcuts**:
- **[** - Trim to playhead (start)
- **]** - Trim to playhead (end)

#### Splitting Clips

Cut a clip into two separate clips:

**Method 1: Keyboard Shortcut**
1. Position playhead where you want to split
2. Click on the clip to select it
3. Press **S**

**Method 2: Context Menu**
1. Position playhead
2. Right-click on the clip
3. Choose **"Split Clip"**

**Use Cases**:
- Removing unwanted sections
- Creating separate segments for different effects
- Inserting clips in the middle

**Pro Tip**: Split, then delete the unwanted portion. This is faster than precise trimming.

#### Deleting Clips

**Method 1: Keyboard**
1. Select clip(s)
2. Press **Delete** or **Backspace**

**Method 2: Context Menu**
1. Right-click on clip
2. Choose **"Delete"**

**Ripple Delete**:
When you delete a clip, subsequent clips automatically move to fill the gap (if ripple edit is enabled).

### Advanced Editing Techniques

#### Creating Overlays

Layer multiple video tracks for picture-in-picture or compositing:

1. Add first clip to Track 1
2. Add overlay clip to Track 2 (above)
3. Overlay appears on top of background
4. Adjust overlay position and size

**Use Cases**:
- Picture-in-picture
- Lower thirds
- Watermarks
- Multiple camera angles

#### Working with Audio

**Detach Audio from Video**:
1. Right-click on video clip
2. Choose **"Detach Audio"**
3. Audio appears on separate track

**Adjust Audio Levels**:
1. Click on audio clip
2. Adjust volume slider in properties panel
3. Or drag volume handle on clip

**Audio Fade**:
1. Hover over clip edge
2. Drag fade handle to create fade in/out

#### Using Markers

Add markers for important points:

1. Position playhead at desired time
2. Press **M** or click **"Add Marker"**
3. Marker appears on timeline

**Use Cases**:
- Mark beat drops in music
- Flag sections for review
- Create chapter markers
- Note important moments

**Navigate Between Markers**:
- **Shift+M** - Next marker
- **Shift+Ctrl+M** - Previous marker

## Timeline Navigation

### Zoom Controls

Adjust the timeline scale to see more or less detail:

**Zoom In**:
- Click **+** button
- Scroll up with mouse wheel
- Pinch out on trackpad
- Press **Cmd/Ctrl + =**

**Zoom Out**:
- Click **-** button
- Scroll down with mouse wheel
- Pinch in on trackpad
- Press **Cmd/Ctrl + -**

**Zoom to Fit**:
- Click **"Fit"** button
- Press **Cmd/Ctrl + 0**
- Shows entire timeline in view

**Zoom Presets**:
Use the zoom preset dropdown for quick zoom levels:
- 1 second view
- 5 seconds view
- 10 seconds view
- 30 seconds view
- Fit all

### Scrolling

**Horizontal Scroll**:
- Drag the scrollbar
- Scroll with mouse wheel
- Two-finger swipe on trackpad
- Use minimap

**Vertical Scroll** (for multiple tracks):
- Scroll with mouse wheel (when hovering over tracks)
- Two-finger swipe on trackpad

### Playhead Movement

**Click to Position**:
- Click on timeline ruler to move playhead

**Drag Playhead**:
- Click and drag the playhead
- Scrub through video

**Keyboard Navigation**:
- **Left Arrow** - Move back 1 frame
- **Right Arrow** - Move forward 1 frame
- **Shift+Left** - Move back 1 second
- **Shift+Right** - Move forward 1 second
- **Home** - Jump to start
- **End** - Jump to end

## Tips & Tricks

### Power User Workflows

#### The Three-Point Edit

Professional editors' secret weapon:

1. Set In point on source clip
2. Set Out point on source clip
3. Set In point on timeline
4. Add to timeline - clip fills exact duration

#### J-K-L Playback

Variable speed playback control:

- **J** - Play backward
- **K** - Pause
- **L** - Play forward
- **JJ** - Play backward 2x speed
- **LL** - Play forward 2x speed

(Note: If implemented in your version)

#### Ripple Edit vs. Roll Edit

**Ripple Edit**: Changes clip duration, other clips shift
**Roll Edit**: Changes edit point, keeps overall timeline length

Use ripple for adding/removing content, roll for fine-tuning.

### Efficiency Tips

#### 1. Use Keyboard Shortcuts

Learn these essential shortcuts:
- **Space** - Play/Pause
- **S** - Split
- **Delete** - Delete clip
- **Cmd/Ctrl+Z** - Undo
- **Cmd/Ctrl+D** - Duplicate
- **Cmd/Ctrl+A** - Select all

#### 2. Work in Stages

Organize your editing process:

**Stage 1: Rough Cut**
- Get all clips on timeline
- Rough order and timing
- Don't worry about perfection

**Stage 2: Fine Cut**
- Trim precisely
- Remove gaps
- Refine pacing

**Stage 3: Polish**
- Add effects
- Color correction
- Audio mixing

#### 3. Use the Minimap Constantly

- Check pacing visually
- Find clips quickly
- Jump between sections

#### 4. Name Your Tracks

1. Right-click on track header
2. Choose **"Rename Track"**
3. Give it a descriptive name (e.g., "B-Roll", "Music", "Sound FX")

Makes organization much easier!

#### 5. Color Code Your Clips

Assign colors to clip types:
- Blue - Interview footage
- Green - B-roll
- Yellow - Music
- Red - Sound effects

Quick visual organization.

#### 6. Use Markers Liberally

Mark important points as you watch:
- Beat drops
- Important moments
- Problems to fix
- Review points

#### 7. Regular Preview

Don't wait until the end:
- Preview every few edits
- Watch entire timeline periodically
- Check pacing and flow

### Common Workflows

#### Creating a Music Video

1. Add music to audio track first
2. Add markers on beat drops
3. Add video clips at markers
4. Trim clips to match music rhythm
5. Add transitions between clips

#### Editing an Interview

1. Place interview on video track
2. Detach audio to separate track
3. Add B-roll on track above
4. Keep audio continuous
5. Cut away to B-roll for visual interest

#### Creating a Tutorial

1. Add screen recording to main track
2. Add webcam overlay on track above
3. Split at section breaks
4. Add title cards between sections
5. Add background music on audio track

#### Making a Montage

1. Add all clips to timeline
2. Use rubber band selection for groups
3. Trim all to same duration
4. Apply consistent timing
5. Add music track underneath

## Keyboard Shortcuts

Essential shortcuts for timeline editing:

### Selection
- **Click** - Select clip
- **Shift+Click** - Add to selection
- **Cmd/Ctrl+A** - Select all
- **Escape** - Deselect all

### Editing
- **S** - Split clip at playhead
- **Delete/Backspace** - Delete selected clips
- **Cmd/Ctrl+C** - Copy selected clips
- **Cmd/Ctrl+V** - Paste clips
- **Cmd/Ctrl+D** - Duplicate selected clips
- **Cmd/Ctrl+Z** - Undo
- **Cmd/Ctrl+Shift+Z** - Redo (Mac)
- **Ctrl+Y** - Redo (Windows)

### Navigation
- **Space** - Play/Pause
- **Left/Right Arrow** - Move playhead 1 frame
- **Shift+Left/Right** - Move playhead 1 second
- **Home** - Jump to start
- **End** - Jump to end
- **M** - Add marker
- **Shift+M** - Next marker

### View
- **Cmd/Ctrl + =** - Zoom in
- **Cmd/Ctrl + -** - Zoom out
- **Cmd/Ctrl + 0** - Zoom to fit

### Grid & Snap
- **Cmd/Ctrl+Shift+S** - Toggle snap

### Help
- **Cmd/Ctrl+?** - Show keyboard shortcuts help

## Troubleshooting

### Clips Won't Align Properly
- **Solution**: Enable snap (Cmd/Ctrl+Shift+S)

### Can't Select Multiple Clips
- **Solution**: Click on empty space first, then drag selection box

### Timeline Feels Sluggish
- **Solution**: Zoom out to see less detail, or close other browser tabs

### Clips Keep Snapping When I Don't Want Them To
- **Solution**: Disable snap (Cmd/Ctrl+Shift+S)

### Lost My Place in Timeline
- **Solution**: Use the minimap to navigate back

### Can't See All My Tracks
- **Solution**: Scroll vertically or adjust timeline height

## Best Practices

1. **Save Often**: Even with auto-save, manually save important milestones (Cmd/Ctrl+S)

2. **Organize Before Editing**: Set up your tracks and name them before adding clips

3. **Work Non-Destructively**: Original assets are never modified - edits are non-destructive

4. **Use Undo Liberally**: Don't be afraid to experiment - you can always undo

5. **Preview Frequently**: Catch issues early by previewing your work often

6. **Keep It Simple**: Start with basic edits, add complexity gradually

7. **Check Audio Levels**: Ensure audio is balanced across clips

8. **Leave Room for Transitions**: Don't trim clips too tight if you plan to add transitions

9. **Use Markers**: Mark important points as you review footage

10. **Maintain Consistent Pacing**: Use the minimap to visualize pacing

## Next Steps

Now that you've mastered timeline editing, explore:

- **Asset Management Guide** - Organize your media library
- **Effects and Filters** - Enhance your video with effects
- **Color Correction** - Professional color grading techniques
- **Audio Mixing** - Create balanced, professional audio
- **Export Settings** - Optimize output for different platforms

---

**Last Updated**: October 24, 2025
**Version**: 1.0.0
