# Mobile Play — Design Spec

## Problem

Dungeons & Deliverables is keyboard-only. Mobile users (phone/tablet in a browser) have no way to play. This spec covers full touch-input support for solo and multiplayer horde mode, targeting all orientations and form factors via the web browser.

## Decisions

| Topic | Decision |
|---|---|
| Target platform | Web browser (PWA/browser tab) — no native app wrapper |
| Form factors | Phones (portrait + landscape) and tablets |
| Control style | Virtual joystick (left) + discrete action buttons (right) |
| Portrait handling | Force landscape; show rotate prompt in portrait |
| HUD on mobile | Compact horizontal stats bar on top; controls at bottom corners |
| Desktop HUD | Unchanged |
| Dependencies | None added |

---

## Architecture

### 1. Input Bridge — `src/game/mobileInput.ts`

A plain mutable singleton that acts as a virtual keyboard:

```ts
export const mobileInput = {
  left: false,
  right: false,
  jump: false,
  attack: false,
  ability: false,
};
```

- `Player.ts` already reads `cursors` and `wasd` each frame. It will additionally OR in `mobileInput.left`, `mobileInput.right`, `mobileInput.jump`, and `mobileInput.attack` (the `E` attack key is owned by `Player.ts`).
- `GameScene.ts` reads `mobileInput.ability` alongside the existing `Q` key check (ability is owned by `GameScene.ts` via `abilityKey`).
- No Phaser API is involved — just an extra boolean source.
- Jump is a **discrete button** (not a joystick up-flick) to preserve platformer precision. The existing 120ms jump buffer in `Player.ts` already handles brief presses.

### 2. MobileControls component — `src/components/MobileControls.tsx`

A React component rendered inside `PhaserGame.tsx`'s overlay `div`. Renders only when `isMobile` is true.

**Virtual joystick (bottom-left):**
- Outer circle: fixed 96px container, semi-transparent, `touch-none` to prevent scroll.
- Inner dot: draggable, tracks pointer offset from circle center.
- Dead zone: ±20px. Beyond that, sets `mobileInput.left` or `mobileInput.right`.
- On `pointerup` / `pointercancel`: both reset to `false`.
- The joystick handles left/right only. No up-flick jump.

**Action buttons (bottom-right), three circular buttons (≥56px each):**
- **Jump** 🆙 (blue) — `pointerdown` sets `mobileInput.jump = true`, `pointerup` resets to `false`.
- **Attack** ⚔️ (orange) — same pattern for `mobileInput.attack`.
- **Ability** Q (class accent colour passed as prop) — same for `mobileInput.ability`.

All buttons use `onPointerDown` / `onPointerUp` / `onPointerCancel`. `touch-action: none` prevents default browser scroll handling.

### 3. Responsive HUD — `src/game/PhaserGame.tsx` + `src/hooks/useIsMobile.ts`

**`useIsMobile` hook:**
```ts
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(
    () => navigator.maxTouchPoints > 0 && window.innerWidth < 1280
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1279px)');
    const handler = () => setMobile(navigator.maxTouchPoints > 0 && mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return mobile;
}
```

**`PhaserGame.tsx` layout:**
- When `isMobile` is `false` → existing desktop HUD (stat panel top-right, Q/E buttons top-left). No change.
- When `isMobile` is `true`:
  - Hide the existing vertical stat panel and Q/E ability indicator buttons.
  - Render a compact full-width horizontal strip at the very top: 6 mini stat bars in a row, each with emoji label. Same `StatBar` component, just laid out horizontally with smaller text.
  - Render `<MobileControls>` at the bottom corners.
  - The cooldown feedback is shown on the touch buttons themselves (orange/accent ring overlay matching desktop style).

### 4. Rotate Prompt + Viewport — `src/components/RotatePrompt.tsx` + `index.html`

**`index.html` — viewport meta:**
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
```
Prevents browser zoom-on-double-tap and ensures the full canvas scales correctly.

**`RotatePrompt.tsx`:**
- Listens to `window.matchMedia('(orientation: portrait)')`.
- Rendered only when `isMobile && isPortrait`.
- Full-screen `z-50` overlay with a dark background and "🔄 Please rotate your device to landscape" message.
- Also attempts `screen.orientation.lock('landscape')` on mount (Safari ignores this silently; the prompt is the visual fallback for all browsers).

**`App.tsx`:** Renders `<RotatePrompt>` as a global overlay wrapping the entire app, so it covers all screens (start, lobby, game, end).

---

## Files Changed / Created

| File | Change |
|---|---|
| `index.html` | Add proper mobile viewport meta tag |
| `src/game/mobileInput.ts` | **NEW** — singleton virtual input state |
| `src/hooks/useIsMobile.ts` | **NEW** — responsive mobile detection hook |
| `src/components/MobileControls.tsx` | **NEW** — virtual joystick + action buttons overlay |
| `src/components/RotatePrompt.tsx` | **NEW** — portrait orientation warning overlay |
| `src/game/entities/Player.ts` | Read `mobileInput.left/right/jump/attack` alongside keyboard in `update()` |
| `src/game/scenes/GameScene.ts` | Read `mobileInput.ability` alongside `Q` key check |
| `src/game/PhaserGame.tsx` | Add `isMobile` branch: horizontal HUD + `MobileControls` |
| `src/App.tsx` | Render `<RotatePrompt>` globally |

---

## Out of Scope

- PWA manifest / service worker / installability
- Native app wrapping (Capacitor, Cordova)
- Gamepad/controller support
- Multiplayer-specific mobile UI changes beyond the shared input layer
