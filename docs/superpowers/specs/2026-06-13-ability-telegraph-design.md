# Ability Telegraph Design — Dungeons & Deliverables

**Date:** 2026-06-13  
**Scope:** Active ability cooldown visibility and per-class range/effect telegraphs  
**Assumption:** The user is away, so proceed with the most readable arcade-style solution without waiting for visual preference feedback.

---

## Goal

Make the active ability impossible to miss during play and teach each class's effective range or coverage area without forcing the player to infer it from the side stat panel or trial-and-error.

---

## Approaches Considered

### 1. Top HUD ability strip + brief on-press telegraphs **(recommended)**
- Move the cooldown UI from the side stat stack into a compact strip at the top of the screen, to the right of the level and HP labels.
- Keep the ability copy visible at all times with `Q`, ability name, status, description, and a short range label.
- Add a subtle world-space telegraph that matches the class effect:
  - radius ring for `developer`
  - target tether/reticle for `accountmanager`
  - highlighted affected actors or viewport-wide aura for global abilities

**Why this wins:** it is visible during play, teaches the ability clearly, and avoids taking over the bottom of the screen with a large action card.

### 2. Floating widget above the player + telegraphs only when ready
- Attach the cooldown UI near the player sprite instead of to the screen.
- Show telegraphs only while the ability is ready.

**Trade-off:** better diegetic feel, but less stable to read during movement and less reliable for learning.

### 3. Keep the side panel and add one-time tutorial flashes
- Leave the cooldown in the stat panel.
- Add a short onboarding flash at level start and on first ability use.

**Trade-off:** cheapest change, but it does not fix the discoverability problem the player called out.

---

## Chosen Design

### 1. Shared ability UI metadata

Promote class ability presentation from implicit behavior to explicit metadata so the HUD and telegraphs use the same source of truth.

Add a shared ability definition model that covers:
- display name
- cooldown
- short effect summary
- range label
- telegraph kind

The definitions stay close to the existing ability logic in `src/game/abilities.ts`, so the numbers used for gameplay and the numbers shown to the player cannot drift apart.

### 2. Primary cooldown UI

Replace the small cooldown row inside the right-hand stat card with a compact top-left ability strip in `PhaserGame.tsx`, positioned to the right of the level and HP labels.

The new panel should:
- stay visible even before the first use
- show a large `Q` prompt
- show class emoji + ability name
- show a short effect/range line
- show `READY` vs remaining seconds
- use a thicker progress bar with a high-contrast fill

The right-hand stat HUD stays focused on stats only.

### 3. Range/effect telegraphs in the scene

Add a lightweight telegraph layer inside `GameScene` that only appears for 500ms after the player presses the ability key.

Telegraph treatments:

| Ability class | Telegraph |
|---|---|
| `developer` | Circular ring centered on the player with a `180px` melee burst radius |
| `accountmanager` | Line from player to nearest enemy plus a small reticle on that enemy |
| `architect` | Soft pulse over all active enemies to signal room-wide enemy slow |
| `ux` | Frost-tinted pulse over all active enemies to signal room-wide freeze |
| `pm` | Amber pulse over all active enemies to signal room-wide flee/reversal |
| `security` | Protective halo around player plus pulse over active projectiles to signal projectile-wide defense |
| `datascientist` | Blue pulse over active loot to show the ability targets all loot drops |
| `intern` | Purple wildcard halo plus HUD text that explicitly says it copies another class effect most of the time |

These are intentionally simple Phaser shapes/tints, not new art assets.

### 4. Behavior rules

- Telegraphs should be subtle enough not to obscure enemies, platforms, or loot.
- Telegraphs should use slight opacity and disappear after the 500ms teaching window.
- For classes with room-wide or target-type-wide effects, the HUD range label should say that directly instead of pretending there is a fixed radius.
- The telegraph should disappear automatically with destroyed enemies/projectiles/loot and re-evaluate as groups change.

### 5. Data flow

- `abilities.ts` exposes reusable ability definitions and continues to execute the actual effects.
- `GameScene` reads the selected class's definition to draw/update telegraphs.
- `PhaserGame.tsx` reads the same definition to render the persistent top HUD strip and cooldown state.
- `ABILITY_USED` still reports runtime cooldown activation so the progress bar can animate from actual use time.

### 6. Error handling and safety

- If a class ID is unknown, fall back to the existing developer/default behavior rather than crashing.
- Telegraph updates must ignore inactive or destroyed game objects.
- The HUD should continue to render even before any cooldown event has fired.

### 7. Validation

- `npm run build`
- `npm run lint`

---

## Affected Files

| File | Change |
|---|---|
| `docs/superpowers/specs/2026-06-13-ability-telegraph-design.md` | New design spec |
| `src/game/abilities.ts` | Add shared ability metadata alongside effect logic |
| `src/game/PhaserGame.tsx` | Replace small side cooldown row with a top HUD ability strip |
| `src/game/scenes/GameScene.ts` | Add a brief on-press telegraph layer |
| `src/types/game.ts` | Extend ability UI/runtime payload types if needed |

---

## Out of Scope

- Rebinding controls
- New sprite art
- Ability balance changes beyond surfacing the already-implemented ranges/effects
