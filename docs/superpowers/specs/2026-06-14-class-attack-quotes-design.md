# Class Attack Quotes — Design Spec

**Date:** 2026-06-14  
**Status:** Approved

## Problem

The game has 8 distinct consultant classes but attacks feel identical across them. Adding class-specific one-liners when attacking adds personality, humor, and reinforces each class's identity.

## Feature Description

When the player fires their main attack, there is a **15% chance** a short class-specific quote appears above the player as floating golden text. The text drifts upward and fades out over ~1.5 seconds.

## Visual Style

- **Color:** `#ffd040` (golden yellow)
- **No border, no background box** — just the raw text against the dungeon
- **Font:** Phaser `add.text()`, bold, size 13, with a thin black stroke for readability
- **Animation:** Float up ~48px + fade to alpha 0 over 1500ms (`Quad.easeOut`)
- **Depth:** Rendered above the player (depth 25)
- **No stacking:** If a quote is still visible, the roll is skipped

## Quotes

3–4 quotes per class, picked at random. All written in the character's voice.

### architect
- "Have you considered a microservices approach?"
- "The monolith must die."
- "We should decouple this."
- "This needs an event sourcing layer."

### developer
- "It works on my machine."
- "Just push to prod."
- "I'll fix it after the release."
- "Ship it."

### ux
- "Did you test this with real users?"
- "The button should be bigger."
- "More whitespace."
- "Users don't read."

### datascientist
- "Correlation isn't causation."
- "The model needs more data."
- "Statistically insignificant."
- "I'll just train another model."

### pm
- "Per my last email…"
- "Let's sync on this."
- "Can we park that?"
- "Moving the deadline forward."

### security
- "That's a security risk."
- "Password must be 64 characters."
- "We need a pentest."
- "Zero trust."

### accountmanager
- "I'll set up a call."
- "The client loves this."
- "Just say yes for now."
- "Let's manage expectations."

### intern
- "I Googled it."
- "ChatGPT wrote this."
- "Is this right?"
- "I just started Monday."

## Architecture

### Data (`src/constants/classes.ts`)
Add a new exported constant:
```ts
export const CLASS_ATTACK_QUOTES: Record<string, string[]> = { ... }
```

### Display logic (`src/game/entities/Player.ts`)
- Add `private quoteVisibleUntil = 0` timer field
- Add private method `maybeShowAttackQuote(time: number): void`
  - Guard: if `time < this.quoteVisibleUntil`, return early
  - Roll: `Math.random() < 0.15`, return early on miss
  - Pick a random quote from `CLASS_ATTACK_QUOTES[this.classId]`
  - Create `this.scene.add.text(this.x, this.y - 40, quote, { color: '#ffd040', fontSize: '13px', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 })`
  - Set depth 25
  - Tween: `{ y: text.y - 48, alpha: 0, duration: 1500, ease: 'Quad.easeOut', onComplete: () => text.destroy() }`
  - Set `this.quoteVisibleUntil = time + 1500`
- Call `maybeShowAttackQuote(time)` inside the attack block in `update()` (alongside `soundManager.attack()`)

### No new files required
All changes are confined to `src/constants/classes.ts` and `src/game/entities/Player.ts`.

## Out of Scope
- Quotes on ability use (Q key) — not included
- Multiplayer quote sync — local only, no socket events
- Quotes on kill — not included
