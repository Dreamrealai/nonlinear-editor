# Easter Eggs

This document describes the fun hidden features and easter eggs in the Non-Linear Editor. These are secret features that users can discover through specific key combinations or actions.

## What Are Easter Eggs?

Easter eggs are hidden features, messages, or jokes that are intentionally placed in software for users to discover. They add an element of fun and delight to the user experience without interfering with normal functionality.

## Implemented Easter Eggs

### 1. Konami Code

**Activation:** Press the following sequence: ↑ ↑ ↓ ↓ ← → ← → B A

**Effect:**

- Activates a rainbow gradient background animation
- Spawns 50 colorful confetti pieces that fall from the top of the screen
- Plays a secret sound effect (C note)
- Shows a success toast notification
- Effect lasts for 5 seconds

**Inspiration:** The classic Konami Code, originally from the game Contra (1988), is one of the most famous video game cheat codes in history.

### 2. Secret Developer Mode

**Activation:** Press the "D" key 5 times quickly (within 2 seconds)

**Effect:**

- Enables advanced developer features
- Adds a "DEV MODE" indicator badge in the top-right corner
- Stores the state in localStorage (persists across sessions)
- Shows an info toast notification
- The badge pulses to indicate active status

**Purpose:** Unlocks additional debugging tools and advanced features for power users.

### 3. Matrix Rain Effect

**Activation:** Press the "M" key 3 times quickly (within 2 seconds)

**Effect:**

- Creates a full-screen Matrix-style "digital rain" effect
- Green characters cascade down the screen
- Uses HTML5 Canvas for smooth animation
- Effect lasts for 10 seconds
- Shows "The Matrix has you..." toast message

**Inspiration:** The iconic falling code effect from The Matrix (1999).

### 4. Disco Mode

**Activation:** Type the word "disco" (d-i-s-c-o)

**Effect:**

- Background rapidly cycles through vibrant colors
- Colors change every 200ms
- Color palette: Red, Cyan, Blue, Yellow, Green, Purple
- Effect lasts for 5 seconds
- Shows "Disco time!" toast notification

**Purpose:** Adds a fun, energetic visual effect for celebrations.

### 5. Gravity Mode

**Activation:** Type the word "gravity" (g-r-a-v-i-t-y)

**Effect:**

- Random elements (buttons, cards, images) fall off the screen
- Elements rotate as they fall for added effect
- Affects approximately 30% of page elements
- Elements return to normal position after 2 seconds
- Shows "Gravity reversed!" toast notification

**Purpose:** A playful physics-based visual effect.

## Technical Implementation

### Architecture

Easter eggs are implemented using a custom React hook (`useEasterEggs`) that:

1. **Listens for keyboard events** globally across the application
2. **Tracks key sequences** with a sliding window approach
3. **Maintains key press counts** for rapid-press easter eggs
4. **Implements timeout logic** to reset sequences after 2 seconds of inactivity
5. **Ignores input fields** to prevent interference with normal typing
6. **Injects CSS animations** dynamically for visual effects

### Key Components

- **Hook:** `/lib/hooks/useEasterEggs.ts`
- **Provider:** `/components/providers/EasterEggProvider.tsx`
- **CSS Animations:** Injected dynamically via `<style>` tag

### Configuration

Easter eggs can be:

- **Enabled/disabled** via the `enabled` prop on `EasterEggProvider`
- **Tracked** - the hook returns which easter eggs have been triggered
- **Reset** - via the `resetEasterEggs()` function
- **Customized** - new easter eggs can be added to the configuration array

### Example: Adding a New Easter Egg

```typescript
{
  id: 'myegg',
  keys: ['h', 'e', 'l', 'l', 'o'],
  action: () => {
    toast('Hello easter egg activated!', 'success');
    // Your custom effect here
  },
  description: 'Type "hello" - Shows a greeting',
}
```

## User Experience Guidelines

### Discovery

Easter eggs should be:

- **Discoverable but not obvious** - Users should feel rewarded when they find them
- **Non-intrusive** - They should never interfere with normal workflows
- **Delightful** - They should bring joy and surprise
- **Temporary** - Visual effects should be time-limited

### Best Practices

1. **Never block functionality** - Easter eggs should be purely additive
2. **Keep effects brief** - Most effects last 5-10 seconds
3. **Provide feedback** - Toast notifications confirm activation
4. **Allow reset** - Users should be able to clear easter egg state
5. **Document internally** - Keep this file up to date with new additions

## Testing Easter Eggs

### Manual Testing

1. Open the application in a browser
2. Make sure you're not focused in an input field
3. Try each activation sequence listed above
4. Verify the expected effect occurs
5. Confirm the effect ends after the specified duration

### Automated Testing

Easter eggs are tested in:

- **Unit tests** - Test the detection logic in isolation
- **Integration tests** - Test the full activation flow
- **E2E tests** - Verify effects render correctly in the browser

## Performance Considerations

- **Minimal overhead** - Easter egg detection adds negligible performance impact
- **Efficient animations** - CSS animations use GPU acceleration
- **Cleanup** - All effects properly remove DOM elements and clear intervals
- **No memory leaks** - Event listeners are properly cleaned up

## Future Ideas

Potential easter eggs to implement:

1. **Retro mode** - Apply a CRT screen effect with scan lines
2. **Party mode** - Play celebration sound with confetti
3. **Time travel** - Show old-school UI themes
4. **Achievement system** - Track and display discovered easter eggs
5. **Secret level** - Unlock a hidden game or tool
6. **Developer credits** - Show team member info in a fun way
7. **Seasonal themes** - Holiday-specific effects

## Credits

Easter eggs designed and implemented to add joy and personality to the Non-Linear Editor. Inspired by classic video game secrets and modern web animations.

## Changelog

- **2025-10-24** - Initial implementation of 5 easter eggs
  - Konami Code with rainbow effect
  - Secret Developer Mode
  - Matrix Rain Effect
  - Disco Mode
  - Gravity Mode
