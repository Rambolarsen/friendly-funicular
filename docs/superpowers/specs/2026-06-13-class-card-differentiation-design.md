# Class Card Visual Differentiation

**Date:** 2026-06-13  
**Status:** Approved

## Problem

All consultant class cards on the StartScreen look identical — same border color, same background, same text styling. Players cannot distinguish classes at a glance.

## Design

### Approach
Each class card gets:
1. **A unique accent color** — used for the card border and class name text
2. **A unique sprite** — a 48×48 pixel-art character from `chars.png` (frames 11–18), replacing the emoji

### Class → Color + Sprite Mapping

| Class          | Frame | Accent Color |
|----------------|-------|--------------|
| Architect       | 11    | `#f59e0b` (amber)   |
| Developer       | 12    | `#22d3ee` (cyan)    |
| UX Designer     | 13    | `#f472b6` (pink)    |
| Data Scientist  | 14    | `#a78bfa` (violet)  |
| Project Manager | 15    | `#34d399` (emerald) |
| Security        | 16    | `#fb923c` (orange)  |
| Account Manager | 17    | `#fbbf24` (yellow)  |
| Intern          | 18    | `#e879f9` (fuchsia) |

Frames 0–10 and 21–22 are reserved for in-game player/enemy animations and must not be reused here.

### Sprite Rendering

Sprites are rendered in React using the CSS sprite technique against `/assets/sprites/chars.png`:

```
background-image: url('/assets/sprites/chars.png')
background-size: 448px 148px   (2× the 224×74 original)
background-position: -(col*50)px -(row*50)px
image-rendering: pixelated
width/height: 48px
```

Where `col = frame % 9`, `row = Math.floor(frame / 9)`, and each cell is 25px in the original (24px frame + 1px gap), so 50px at 2×.

### Type Changes

Add two fields to `ConsultantClass` in `src/types/game.ts`:

```ts
color: string;       // CSS accent color for border and name
spriteFrame: number; // Frame index in chars.png
```

### Component Changes

**`src/constants/classes.ts`** — add `color` and `spriteFrame` to each class entry.

**`src/components/ClassCard.tsx`** — update to:
- Use `cls.color` for the border (selected and hover states) and name text color
- Replace the `cls.emoji` `<div>` with a sprite `<div>` using CSS background-position
- Keep ability name, description, and flavor text unchanged

## Out of Scope

- No changes to in-game sprites or Phaser scenes
- No changes to stat system or game logic
- The `emoji` field remains on the type (used in other places) but is no longer rendered on the card
