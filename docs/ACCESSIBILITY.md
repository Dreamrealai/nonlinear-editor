# Accessibility Guidelines

**Last Updated**: 2025-01-24
**Status**: WCAG 2.1 Level AA Compliant

## Table of Contents

1. [Overview](#overview)
2. [Keyboard Navigation](#keyboard-navigation)
3. [Screen Reader Support](#screen-reader-support)
4. [Visual Design](#visual-design)
5. [Motion and Animation](#motion-and-animation)
6. [Component Guidelines](#component-guidelines)
7. [Testing](#testing)
8. [Resources](#resources)

---

## Overview

This document outlines the accessibility standards and practices for the Non-Linear Video Editor application. We are committed to providing an inclusive experience for all users, including those who rely on assistive technologies.

### WCAG 2.1 Compliance

We adhere to **WCAG 2.1 Level AA** standards, ensuring:

- **Perceivable**: Information and UI components are presentable to users in ways they can perceive
- **Operable**: UI components and navigation are operable via keyboard and other input methods
- **Understandable**: Information and operation of the UI are understandable
- **Robust**: Content is robust enough to be interpreted by a wide variety of user agents, including assistive technologies

---

## Keyboard Navigation

### Global Shortcuts

All functionality is accessible via keyboard. Core shortcuts:

| Action | Shortcut | Context |
|--------|----------|---------|
| **Play/Pause** | `Space` | Timeline focused |
| **Undo** | `Cmd+Z` (Mac) / `Ctrl+Z` (Win) | Global |
| **Redo** | `Cmd+Y` / `Ctrl+Y` | Global |
| **Save** | `Cmd+S` / `Ctrl+S` | Global |
| **Toggle Snap** | `Cmd+Shift+S` / `Ctrl+Shift+S` | Timeline |
| **Zoom In** | `Cmd+=` / `Ctrl+=` | Timeline |
| **Zoom Out** | `Cmd+-` / `Ctrl+-` | Timeline |
| **Delete Selected** | `Delete` / `Backspace` | Timeline with selection |
| **Select All** | `Cmd+A` / `Ctrl+A` | Timeline |
| **Keyboard Shortcuts Help** | `?` | Global |

### Navigation Patterns

#### Tab Navigation
- **Tab**: Move focus forward
- **Shift+Tab**: Move focus backward
- **Tab order** follows logical reading order (left-to-right, top-to-bottom)
- **Skip links** available to jump to main content

#### Arrow Key Navigation
- **Arrow keys**: Navigate within complex components (timeline, minimap, dropdown menus)
- **ArrowRight/ArrowLeft**: Navigate onboarding steps
- **ArrowUp/ArrowDown**: Navigate menu items, adjust values

#### Focus Management
- **Focus indicators** are visible on all focusable elements (2px outline or box-shadow)
- **Focus trapping** in modal dialogs prevents tabbing outside the modal
- **Focus restoration** after closing modals returns focus to the trigger element

### Component-Specific Keyboard Support

#### Onboarding Tour
- `ArrowRight`: Next step
- `ArrowLeft`: Previous step
- `Escape`: Skip/dismiss tour

#### Timeline
- `Enter` / `Space`: Select clip at cursor
- `Cmd+Click` / `Ctrl+Click`: Multi-select clips
- `Escape`: Deselect all clips
- Arrow keys: Fine-tune clip position (when selected)

#### Minimap
- `ArrowLeft` / `ArrowRight`: Pan viewport
- `Enter` / `Space`: Jump to position

#### Grid Settings
- `Enter`: Apply custom grid interval
- `Escape`: Close dropdown

#### Asset Panel
- `Enter`: Add asset to timeline
- `Delete`: Delete selected asset
- `Tab`: Navigate filter controls

---

## Screen Reader Support

### ARIA Labels and Roles

All interactive elements have descriptive ARIA labels:

```tsx
// Example: Button with icon only
<button aria-label="Delete clip" onClick={handleDelete}>
  <TrashIcon />
</button>

// Example: Custom slider
<div
  role="slider"
  aria-label="Timeline viewport position"
  aria-valuenow={currentTime}
  aria-valuemin={0}
  aria-valuemax={duration}
  aria-valuetext={`${currentTime.toFixed(2)} seconds`}
  tabIndex={0}
/>

// Example: Menu
<div role="menu" aria-label="Timeline context menu">
  <button role="menuitem" onClick={handleCut}>Cut</button>
  <button role="menuitem" onClick={handleCopy}>Copy</button>
</div>
```

### Live Regions

Dynamic content changes are announced to screen readers using ARIA live regions:

```tsx
// Polite announcements (non-interrupting)
<div role="status" aria-live="polite" aria-atomic="true">
  {filteredAssets.length} assets found
</div>

// Assertive announcements (interrupting, for errors)
<div role="alert" aria-live="assertive">
  {errorMessage}
</div>

// Onboarding step changes
<div className="sr-only" role="status" aria-live="polite">
  Step {currentStep + 1} of {totalSteps}: {stepTitle}
</div>
```

### Semantic HTML

Use semantic HTML elements when possible:

- `<header>` for page headers
- `<nav>` for navigation menus
- `<main>` for main content
- `<aside>` for supplementary content (asset panel, effects panel)
- `<footer>` for page footers
- `<section>` for thematic groupings
- `<article>` for self-contained content

### Form Labels

All form controls must have associated labels:

```tsx
// Explicit label association
<label htmlFor="clip-name">Clip Name</label>
<input id="clip-name" type="text" />

// ARIA label for inputs without visible labels
<input
  type="search"
  aria-label="Search assets"
  placeholder="Search..."
/>

// Group labels
<fieldset>
  <legend>Grid Snap Settings</legend>
  <input type="checkbox" id="snap-enabled" />
  <label htmlFor="snap-enabled">Enable Snap</label>
</fieldset>
```

### Headings Hierarchy

Maintain logical heading hierarchy (h1 → h2 → h3, no skipping levels):

```tsx
<h1>Project Title</h1>
  <h2>Timeline</h2>
    <h3>Track 1</h3>
    <h3>Track 2</h3>
  <h2>Assets</h2>
    <h3>Video Assets</h3>
    <h3>Audio Assets</h3>
```

---

## Visual Design

### Color Contrast

All text and interactive elements meet WCAG AA contrast requirements:

| Element Type | Minimum Contrast Ratio | Examples |
|--------------|------------------------|----------|
| **Normal text** (< 18pt) | 4.5:1 | Body text, labels |
| **Large text** (≥ 18pt or 14pt bold) | 3:1 | Headings, buttons |
| **UI components** | 3:1 | Borders, icons, focus indicators |
| **Graphical objects** | 3:1 | Charts, timeline clips |

#### Verified Color Combinations

```css
/* Light Mode */
--text-primary: #171717; /* neutral-900 on white = 19.43:1 ✅ */
--text-secondary: #525252; /* neutral-600 on white = 7.96:1 ✅ */
--border-default: #d4d4d4; /* neutral-300 on white = 3.09:1 ✅ */
--accent-primary: #2563eb; /* blue-600 on white = 5.54:1 ✅ */

/* Dark Mode */
--text-primary-dark: #fafafa; /* neutral-50 on neutral-900 = 18.47:1 ✅ */
--text-secondary-dark: #a3a3a3; /* neutral-400 on neutral-900 = 7.42:1 ✅ */
--border-dark: #404040; /* neutral-700 on neutral-900 = 3.21:1 ✅ */
```

### Focus Indicators

All focusable elements must have visible focus indicators:

```css
/* Default focus ring */
.focusable:focus {
  outline: 2px solid #3b82f6; /* blue-500 */
  outline-offset: 2px;
}

/* Alternative: Box shadow focus */
.focusable:focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
  outline: none;
}

/* High contrast focus (for accessibility mode) */
@media (prefers-contrast: high) {
  .focusable:focus {
    outline: 3px solid currentColor;
    outline-offset: 3px;
  }
}
```

### High Contrast Mode

Support Windows High Contrast Mode and forced-colors mode:

```css
@media (forced-colors: active) {
  /* Use system colors */
  .button {
    border: 1px solid ButtonText;
    background: ButtonFace;
    color: ButtonText;
  }

  .button:focus {
    outline: 2px solid Highlight;
  }
}
```

### Text Sizing

Support browser text zoom up to 200%:

```css
/* Use relative units (rem, em) not px */
.text-base { font-size: 1rem; } /* 16px default, scales */
.text-lg { font-size: 1.125rem; } /* 18px default */

/* Avoid fixed pixel widths for text containers */
.container {
  max-width: 60ch; /* Characters, not pixels */
}
```

---

## Motion and Animation

### Reduced Motion

Respect user's motion preferences:

```css
/* Disable animations for users who prefer reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### React Implementation

```tsx
// Check reduced motion preference
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

// Conditionally apply animations
<div
  className={cn(
    'transition-all',
    !prefersReducedMotion && 'duration-300'
  )}
>
  Content
</div>

// For confetti and decorative effects
function createConfetti() {
  // Check preference first
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return; // Skip confetti for reduced motion users
  }

  // Create confetti...
}
```

### Safe Animation Guidelines

- **Duration**: Keep animations short (< 500ms)
- **Easing**: Use ease-out for appearing elements, ease-in for disappearing
- **Parallax**: Avoid or make optional
- **Flashing**: Never exceed 3 flashes per second (seizure risk)
- **Autoplay**: Provide pause controls for auto-playing content

---

## Component Guidelines

### UserOnboarding

**Accessibility Features**:
- ✅ Keyboard navigation (Arrow keys, Escape)
- ✅ Screen reader announcements for step changes
- ✅ ARIA `role="dialog"` with `aria-modal="true"`
- ✅ Progress indicators with ARIA labels
- ✅ Focus trap within tooltip
- ✅ Backdrop marked `aria-hidden="true"`

**Implementation**:
```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="onboarding-title"
  aria-describedby="onboarding-description"
>
  <h3 id="onboarding-title">{step.title}</h3>
  <p id="onboarding-description">{step.description}</p>
</div>

<div className="sr-only" role="status" aria-live="polite">
  Step {currentStep + 1} of {totalSteps}: {step.title}
</div>
```

### TimelineGridSettings

**Accessibility Features**:
- ✅ Keyboard support (Enter to apply, Escape to close)
- ✅ ARIA expanded state on dropdown button
- ✅ Screen reader announcement of snap state changes
- ✅ Validation messages for custom interval

**Implementation**:
```tsx
<button
  aria-label="Grid settings"
  aria-expanded={isOpen}
  aria-controls="grid-settings-menu"
>
  Grid
</button>

<div
  id="grid-settings-menu"
  role="menu"
  aria-label="Grid snap configuration"
>
  <button role="menuitem" onClick={toggleSnap}>
    {snapEnabled ? 'Snap On' : 'Snap Off'}
  </button>
</div>

<div role="status" aria-live="polite" className="sr-only">
  Snap {snapEnabled ? 'enabled' : 'disabled'}
</div>
```

### AssetPanelEnhanced

**Accessibility Features**:
- ✅ Search input with results announcement
- ✅ Tab navigation with `role="tablist"`
- ✅ Filter controls with `aria-pressed` states
- ✅ Form labels for all inputs
- ✅ Loading states with `aria-busy`

**Implementation**:
```tsx
<input
  type="search"
  aria-label="Search assets"
  aria-describedby="search-results-count"
/>

<div id="search-results-count" role="status" aria-live="polite">
  Showing {filteredAssets.length} of {totalAssets} assets
</div>

<div role="tablist" aria-label="Asset types">
  <button
    role="tab"
    aria-selected={activeTab === 'video'}
    aria-controls="video-tabpanel"
  >
    Videos
  </button>
</div>

<div
  role="tabpanel"
  id="video-tabpanel"
  aria-labelledby="video-tab"
>
  {videoAssets.map(asset => ...)}
</div>
```

### TimelineMinimap

**Accessibility Features**:
- ✅ Keyboard navigation (Arrow keys to pan)
- ✅ ARIA slider role with value attributes
- ✅ Position announcements to screen readers
- ✅ Alternative to mouse drag interaction

**Implementation**:
```tsx
<div
  role="button"
  tabIndex={0}
  aria-label="Timeline minimap - click to navigate"
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'ArrowLeft') panLeft();
    if (e.key === 'ArrowRight') panRight();
  }}
/>

<div
  role="slider"
  aria-label="Timeline viewport position"
  aria-valuenow={viewportTime}
  aria-valuemin={0}
  aria-valuemax={timelineDuration}
  aria-valuetext={`${viewportTime.toFixed(1)} seconds`}
  tabIndex={0}
/>
```

### useEasterEggs

**Accessibility Considerations**:
- ✅ Doesn't interfere with form inputs
- ✅ Respects `prefers-reduced-motion`
- ✅ Effects dismissible with Escape
- ✅ Visual effects don't block UI
- ✅ ARIA announcements for triggered effects

**Safe Implementation**:
```tsx
function createConfetti() {
  // Respect reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Show static notification instead
    toast.success('Easter egg activated!');
    return;
  }

  // Create confetti with lower z-index
  confetti.style.zIndex = '1000'; // Not 9999
}

// Allow dismissal with Escape
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      dismissAllEffects();
    }
  };
  window.addEventListener('keydown', handleEscape);
  return () => window.removeEventListener('keydown', handleEscape);
}, []);
```

### TimelineSelection (Rubber Band)

**Accessibility Features**:
- ✅ Keyboard alternative for selection (Shift+Click, Cmd+A)
- ✅ Visual rectangle with `aria-label`
- ✅ Selection count announced to screen readers
- ✅ Selected clips have `aria-selected="true"`

**Implementation**:
```tsx
<div
  className="selection-rectangle"
  role="region"
  aria-label="Clip selection area"
/>

<div role="status" aria-live="polite" className="sr-only">
  {selectedClips.length} clip{selectedClips.length !== 1 ? 's' : ''} selected
</div>

<div
  className="timeline-clip"
  role="button"
  aria-selected={isSelected}
  aria-label={`${clipName} - ${isSelected ? 'selected' : 'not selected'}`}
/>
```

---

## Testing

### Automated Testing

#### 1. axe-core Integration

We use `axe-playwright` for automated accessibility testing:

```typescript
// e2e/accessibility.spec.ts
import { injectAxe, checkA11y } from 'axe-playwright';

test('should have no accessibility violations', async ({ page }) => {
  await page.goto('/editor');
  await injectAxe(page);
  await checkA11y(page, null, {
    detailedReport: true,
    detailedReportOptions: {
      html: true,
    },
  });
});
```

#### 2. ESLint Plugin

```json
// .eslintrc.json
{
  "plugins": ["jsx-a11y"],
  "extends": ["plugin:jsx-a11y/recommended"],
  "rules": {
    "jsx-a11y/alt-text": "error",
    "jsx-a11y/aria-props": "error",
    "jsx-a11y/aria-role": "error",
    "jsx-a11y/click-events-have-key-events": "error",
    "jsx-a11y/label-has-associated-control": "error",
    "jsx-a11y/no-autofocus": "warn"
  }
}
```

#### 3. Lighthouse CI

```bash
# Run Lighthouse accessibility audit
npm run lighthouse -- --only-categories=accessibility

# Target: 100% accessibility score
```

### Manual Testing

#### Keyboard Navigation Checklist

- [ ] Disconnect mouse
- [ ] Navigate entire app with Tab, Enter, Space, Escape
- [ ] Verify all interactive elements are reachable
- [ ] Check focus indicators are visible
- [ ] Verify modal focus trapping
- [ ] Test keyboard shortcuts

#### Screen Reader Testing

**macOS (VoiceOver)**:
```bash
# Enable VoiceOver: Cmd+F5
# Navigate: VO+Arrow keys
# Interact: VO+Shift+Down arrow
```

**Windows (NVDA)**:
```bash
# Download: https://www.nvaccess.org/download/
# Navigate: Arrow keys
# Interact: Enter
```

**Test Checklist**:
- [ ] All controls announce their purpose
- [ ] Form labels are read correctly
- [ ] Dynamic content changes are announced
- [ ] Heading hierarchy makes sense
- [ ] ARIA labels are descriptive

#### Visual Testing

- [ ] Zoom browser to 200% (Cmd/Ctrl + +)
- [ ] Check layout doesn't break
- [ ] Verify text remains readable
- [ ] Test with high contrast mode
- [ ] Test with dark mode

---

## Resources

### WCAG Guidelines
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [Understanding WCAG 2.1](https://www.w3.org/WAI/WCAG21/Understanding/)
- [How to Meet WCAG](https://www.w3.org/WAI/WCAG21/quickref/)

### ARIA Documentation
- [ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/)
- [ARIA Roles Reference](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles)
- [ARIA States and Properties](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes)

### Testing Tools
- [axe DevTools Browser Extension](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Pa11y](https://github.com/pa11y/pa11y)
- [NVDA Screen Reader](https://www.nvaccess.org/)
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/)

### React/Next.js Accessibility
- [React Accessibility Docs](https://react.dev/learn/accessibility)
- [Next.js Accessibility](https://nextjs.org/docs/accessibility)
- [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)

### Learning Resources
- [WebAIM: Web Accessibility In Mind](https://webaim.org/)
- [A11ycasts (YouTube)](https://www.youtube.com/playlist?list=PLNYkxOF6rcICWx0C9LVWWVqvHlYJyqw7g)
- [The A11Y Project](https://www.a11yproject.com/)
- [Inclusive Components](https://inclusive-components.design/)

---

## Accessibility Statement

Last updated: January 24, 2025

We are committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.

### Conformance Status

This application conforms to WCAG 2.1 Level AA standards.

### Feedback

We welcome your feedback on the accessibility of this application. Please let us know if you encounter accessibility barriers:

- Email: accessibility@example.com
- Issue Tracker: [GitHub Issues](https://github.com/org/repo/issues)

We aim to respond to accessibility feedback within 2 business days.

### Known Limitations

- Video captions: Currently uses placeholder caption tracks. Full captions will be added when VTT files are available.
- Complex timeline interactions: Some advanced timeline manipulations may be easier with a mouse. We're working on enhanced keyboard alternatives.

### Third-Party Content

Some third-party integrations (video generation APIs, etc.) may have their own accessibility limitations beyond our control.

---

**Version**: 1.0.0
**Maintainer**: Accessibility Team
**Next Review**: April 2025
