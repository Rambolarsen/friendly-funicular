# Custom Class Sprites — Design Spec

**Date:** 2026-06-13  
**Status:** Approved

## Overview

Replace the existing per-class sprite approach (single frames from `chars.png`) with programmatically generated 24×24 pixel art textures that visually represent each consultant class. Each class gets a unique character: distinct hat/hair, class-coloured body, and a held item matching their role.

---

## Visual Design

Each character shares the same base silhouette (head, body, arms, legs at 24×24 px) and is differentiated by:

| Class           | Color     | Hat/Hair          | Held Item        |
|-----------------|-----------|-------------------|------------------|
| Architect       | `#f59e0b` | Yellow hard hat   | Blueprint scroll |
| Developer       | `#1d6e8a` | Dark hoodie       | Laptop           |
| UX Designer     | `#9d3060` | Pink beret        | Pencil           |
| Data Scientist  | `#5b21b6` | Purple spiky hair + glasses | Bar chart tablet |
| PM              | `#0f6b4a` | Short hair + red tie | Clipboard     |
| Security        | `#7c2d12` | Tactical helmet   | Shield           |
| Account Manager | `#7a5a00` | Slick dark hair   | Briefcase        |
| Intern          | `#7e1d91` | Wild magenta hair | Coffee cup       |

---

## Architecture

### New files

**`src/game/sprites/classSprites.ts`**  
Exports a `CLASS_SPRITE_DATA` record keyed by class ID. Each entry contains:
- `color: string` — hex body colour
- `hat: [number, number, string][]` — pixel overrides for head/hat area (x, y, hex)
- `item: [number, number, string][]` — pixel overrides for held item (x, y, hex)

The base silhouette (skin, eyes, neck, legs, arms) is defined once in a shared `makeBasePixels(bodyColor, hat, item)` helper function that returns a flat `string[]` of length 576 (24×24) where each entry is a hex colour or `''` for transparent.

**`src/game/sprites/generateClassTextures.ts`**  
Exports `generateClassTextures(scene: Phaser.Scene): void`.

For each class in `CONSULTANT_CLASSES`:
1. Create a `Phaser.GameObjects.Graphics` object
2. Iterate the flat pixel array from `makeBasePixels`; for each non-empty pixel, call `graphics.fillStyle(color, 1)` + `graphics.fillRect(x, y, 1, 1)`
3. Call `graphics.generateTexture('<classId>-sprite', 24, 24)`
4. Destroy the graphics object

### Modified files

**`src/game/scenes/BootScene.ts`**  
- Import and call `generateClassTextures(this)` at the start of `create()`
- Update per-class animation registration: replace `generateFrameNumbers('chars', { frames: [f] })` with `[{ key: '<classId>-sprite', frame: 0 }]`

**`src/constants/classes.ts`**  
- Remove `spriteFrame: number` from all class entries

**`src/types/game.ts`**  
- Remove `spriteFrame` field from `ConsultantClass` type

---

## Data Flow

```
BootScene.create()
  → generateClassTextures(scene)
      → for each class: Graphics → generateTexture('<classId>-sprite')
  → register animations using '<classId>-sprite' texture key
  → GameScene starts
      → Player.ts selects animations by '<classId>-player-walk' etc.
         (no changes needed in Player.ts)
```

---

## What Does NOT Change

- `Player.ts` — already uses `${classId}-player-walk/idle/jump` animation keys
- Enemy and boss sprites — still use `chars.png` frames
- `chars.png` — still loaded (used by enemies/boss)
- HUD, stat system, game logic — untouched

---

## Out of Scope

- Walk cycle animation (multi-frame). All per-class animations remain single-frame. Can be added later by generating a small spritesheet texture per class.
- Enemy custom sprites
