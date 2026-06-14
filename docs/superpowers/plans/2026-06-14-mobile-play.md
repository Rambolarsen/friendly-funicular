# Mobile Play Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full touch-input support so players can run Dungeons & Deliverables in a mobile web browser using a virtual joystick and action buttons.

**Architecture:** A plain mutable singleton (`mobileInput`) acts as a virtual keyboard — React touch controls write into it, and the existing Phaser `Player` and `GameScene` classes read from it alongside their keyboard inputs. A responsive HUD branch in `PhaserGame.tsx` shows a compact top stats bar and `MobileControls` overlay when `useIsMobile()` returns true. A `RotatePrompt` overlay covers the entire app in portrait mode.

**Tech Stack:** React 19, Phaser (arcade physics), Tailwind CSS 3, TypeScript. No new dependencies.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `index.html` | Modify | Fix viewport meta to prevent browser zoom |
| `src/game/mobileInput.ts` | Create | Singleton virtual input state (left/right/jump/attack/ability) |
| `src/hooks/useIsMobile.ts` | Create | Reactive hook: true when touch device + width < 1280px |
| `src/components/RotatePrompt.tsx` | Create | Full-screen portrait warning overlay |
| `src/main.tsx` | Modify | Render `<RotatePrompt>` as a sibling of `<App>` |
| `src/game/entities/Player.ts` | Modify | OR in `mobileInput.left/right/jump/attack` each frame |
| `src/game/scenes/GameScene.ts` | Modify | OR in `mobileInput.ability` with edge detection |
| `src/components/MobileControls.tsx` | Create | Virtual joystick + Jump/Attack/Ability touch buttons |
| `src/game/PhaserGame.tsx` | Modify | Switch to mobile HUD (top stats bar) + render `<MobileControls>` |

---

## Task 1: Fix viewport meta and create mobileInput singleton

**Files:**
- Modify: `index.html`
- Create: `src/game/mobileInput.ts`

- [ ] **Step 1: Update viewport meta in `index.html`**

Replace the existing viewport meta tag:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
```

The full `<head>` should look like:
```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <meta
    name="description"
    content="Dungeons & Deliverables — a corporate fantasy dungeon crawler about surviving impossible AI projects."
  />
  <title>Dungeons & Deliverables</title>
</head>
```

- [ ] **Step 2: Create `src/game/mobileInput.ts`**

```ts
/**
 * Singleton virtual input state written by MobileControls (React) and read
 * by Player and GameScene (Phaser) alongside physical keyboard inputs.
 * All fields default to false (no input active).
 */
export const mobileInput = {
  left: false,
  right: false,
  jump: false,
  attack: false,
  ability: false,
};
```

- [ ] **Step 3: Verify the file lints clean**

Run:
```bash
npm run lint -- --max-warnings 0
```
Expected: no errors or warnings related to the new file.

- [ ] **Step 4: Commit**

```bash
git add index.html src/game/mobileInput.ts
git commit -m "feat(mobile): viewport meta + mobileInput singleton"
```

---

## Task 2: useIsMobile hook + RotatePrompt overlay

**Files:**
- Create: `src/hooks/useIsMobile.ts`
- Create: `src/components/RotatePrompt.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Create `src/hooks/useIsMobile.ts`**

```ts
import { useEffect, useState } from 'react';

/**
 * Returns true when the runtime looks like a touch device narrower than 1280px.
 * Re-evaluates if the window is resized across the breakpoint.
 */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(
    () => navigator.maxTouchPoints > 0 && window.innerWidth < 1280,
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

- [ ] **Step 2: Create `src/components/RotatePrompt.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';

export function RotatePrompt() {
  const isMobile = useIsMobile();
  const [isPortrait, setIsPortrait] = useState(
    () => window.matchMedia('(orientation: portrait)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const handler = () => setIsPortrait(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    // Attempt to lock orientation; silently ignored by browsers that don't support it (e.g. Safari)
    screen.orientation?.lock('landscape').catch(() => undefined);
  }, [isMobile]);

  if (!isMobile || !isPortrait) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-gray-950 text-gray-100">
      <div className="text-6xl">🔄</div>
      <p className="text-xl font-bold tracking-widest text-purple-300">
        Please rotate your device
      </p>
      <p className="text-sm text-gray-400">
        This game is best played in landscape orientation.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Render `RotatePrompt` as a global overlay in `src/main.tsx`**

Replace the existing content:
```tsx
import ReactDOM from 'react-dom/client';
import App from './App';
import { RotatePrompt } from './components/RotatePrompt';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <RotatePrompt />
  </>,
);
```

- [ ] **Step 4: Manual verification**

Run `npm run dev`, open DevTools → Device Toolbar, select a phone preset (e.g. iPhone SE), set it to portrait. Confirm the rotate overlay appears. Switch to landscape — overlay disappears.

- [ ] **Step 5: Lint**

```bash
npm run lint -- --max-warnings 0
```
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useIsMobile.ts src/components/RotatePrompt.tsx src/main.tsx
git commit -m "feat(mobile): rotate prompt + useIsMobile hook"
```

---

## Task 3: Wire mobileInput into Player.ts

**Files:**
- Modify: `src/game/entities/Player.ts`

The `Player.update()` method reads keyboard state each frame. We add `mobileInput` as an additional OR source. Attack needs rising-edge detection (fire once per button-down) so we add a `prevMobileAttack` field.

- [ ] **Step 1: Add import and prevMobileAttack field**

At the top of `src/game/entities/Player.ts`, add the import after the existing imports:
```ts
import { mobileInput } from '../mobileInput';
```

Inside the `Player` class, add a private field after `private jumpBufferTimer = 0;`:
```ts
private prevMobileAttack = false;
```

- [ ] **Step 2: Update horizontal movement in `update()`**

Find:
```ts
const goLeft  = this.cursors.left.isDown  || this.wasd.left.isDown;
const goRight = this.cursors.right.isDown || this.wasd.right.isDown;
```

Replace with:
```ts
const goLeft  = this.cursors.left.isDown  || this.wasd.left.isDown  || mobileInput.left;
const goRight = this.cursors.right.isDown || this.wasd.right.isDown || mobileInput.right;
```

- [ ] **Step 3: Update jump in `update()`**

Find:
```ts
const jumpPressed = this.cursors.up.isDown
  || (this.cursors.space as Phaser.Input.Keyboard.Key).isDown
  || this.wasd.up.isDown;
```

Replace with:
```ts
const jumpPressed = this.cursors.up.isDown
  || (this.cursors.space as Phaser.Input.Keyboard.Key).isDown
  || this.wasd.up.isDown
  || mobileInput.jump;
```

- [ ] **Step 4: Update attack in `update()`**

Find:
```ts
const attackPressed = Phaser.Input.Keyboard.JustDown(this.attackKey);
```

Replace with:
```ts
const mobileAttackJustDown = mobileInput.attack && !this.prevMobileAttack;
this.prevMobileAttack = mobileInput.attack;
const attackPressed = Phaser.Input.Keyboard.JustDown(this.attackKey) || mobileAttackJustDown;
```

- [ ] **Step 5: Lint**

```bash
npm run lint -- --max-warnings 0
```
Expected: no errors.

- [ ] **Step 6: Quick smoke test**

Run `npm run dev`. Open the game, open the browser console and run:
```js
// In browser console during gameplay:
import('/src/game/mobileInput.ts').then(m => {
  m.mobileInput.right = true;
  setTimeout(() => m.mobileInput.right = false, 1000);
});
```
Player should walk right for ~1 second without touching the keyboard.

- [ ] **Step 7: Commit**

```bash
git add src/game/entities/Player.ts
git commit -m "feat(mobile): wire mobileInput into Player movement and attack"
```

---

## Task 4: Wire mobileInput.ability into GameScene.ts

**Files:**
- Modify: `src/game/scenes/GameScene.ts`

The `Q` ability is handled in `GameScene.update()`. Add rising-edge detection on `mobileInput.ability` to trigger the ability the same way `JustDown` does.

- [ ] **Step 1: Add import**

At the top of `src/game/scenes/GameScene.ts`, add after existing imports:
```ts
import { mobileInput } from '../mobileInput';
```

- [ ] **Step 2: Add prevMobileAbility field**

In the `GameScene` class, add after the `private positionUpdateTimer = 0;` field:
```ts
private prevMobileAbility = false;
```

- [ ] **Step 3: Update the ability check in `update()`**

Find:
```ts
// Ability key — runs in both solo and multiplayer
if (Phaser.Input.Keyboard.JustDown(this.abilityKey)) {
```

Replace with:
```ts
// Ability key — runs in both solo and multiplayer
const mobileAbilityJustDown = mobileInput.ability && !this.prevMobileAbility;
this.prevMobileAbility = mobileInput.ability;
if (Phaser.Input.Keyboard.JustDown(this.abilityKey) || mobileAbilityJustDown) {
```

- [ ] **Step 4: Lint**

```bash
npm run lint -- --max-warnings 0
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/game/scenes/GameScene.ts
git commit -m "feat(mobile): wire mobileInput.ability into GameScene"
```

---

## Task 5: MobileControls component

**Files:**
- Create: `src/components/MobileControls.tsx`

This component renders a virtual joystick in the bottom-left and three action buttons (Jump, Attack, Ability) in the bottom-right. It writes directly into `mobileInput` on pointer events. It accepts cooldown progress values (0–1) from `PhaserGame` to show visual feedback on the touch buttons.

- [ ] **Step 1: Create `src/components/MobileControls.tsx`**

```tsx
import { useRef, useState } from 'react';
import { mobileInput } from '../game/mobileInput';

interface MobileControlsProps {
  attackProgress: number;    // 0 = ready, >0 = on cooldown, 1 = fully charged
  abilityProgress: number;   // same scale
  accentColor: string;       // class accent hex, e.g. '#a78bfa'
}

const DEAD_ZONE = 20;
const MAX_DRAG = 44;

export function MobileControls({ attackProgress, abilityProgress, accentColor }: MobileControlsProps) {
  const joystickRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const [dotOffset, setDotOffset] = useState({ x: 0, y: 0 });

  // ── Joystick handlers ──────────────────────────────────────────────
  function handleJoystickDown(e: React.PointerEvent) {
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    originRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  function handleJoystickMove(e: React.PointerEvent) {
    if (!originRef.current) return;
    const dx = e.clientX - originRef.current.x;
    const clamped = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, dx));
    setDotOffset({ x: clamped, y: 0 });
    mobileInput.left  = dx < -DEAD_ZONE;
    mobileInput.right = dx >  DEAD_ZONE;
  }

  function handleJoystickUp() {
    originRef.current = null;
    setDotOffset({ x: 0, y: 0 });
    mobileInput.left  = false;
    mobileInput.right = false;
  }

  // ── Action button handlers ─────────────────────────────────────────
  function makeButtonHandlers(action: 'jump' | 'attack' | 'ability') {
    return {
      onPointerDown(e: React.PointerEvent) {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        mobileInput[action] = true;
      },
      onPointerUp()     { mobileInput[action] = false; },
      onPointerCancel() { mobileInput[action] = false; },
    };
  }

  const attackDeg  = attackProgress  * 360;
  const abilityDeg = abilityProgress * 360;

  return (
    <>
      {/* ── Joystick — bottom-left ── */}
      <div
        ref={joystickRef}
        className="pointer-events-auto absolute bottom-6 left-6 flex h-24 w-24 touch-none select-none items-center justify-center rounded-full border-2 border-slate-600 bg-slate-950/60 backdrop-blur-sm"
        onPointerDown={handleJoystickDown}
        onPointerMove={handleJoystickMove}
        onPointerUp={handleJoystickUp}
        onPointerCancel={handleJoystickUp}
      >
        <div
          className="h-10 w-10 rounded-full bg-slate-400/80 shadow-md"
          style={{ transform: `translate(${dotOffset.x}px, ${dotOffset.y}px)` }}
        />
      </div>

      {/* ── Action buttons — bottom-right ── */}
      <div className="pointer-events-auto absolute bottom-6 right-6 flex flex-col items-end gap-3 touch-none select-none">
        {/* Top row: Jump */}
        <div className="flex justify-end">
          <button
            className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-sky-500/60 bg-slate-950/70 text-lg backdrop-blur-sm active:scale-95"
            {...makeButtonHandlers('jump')}
          >
            ⬆️
          </button>
        </div>

        {/* Bottom row: Ability (Q) + Attack */}
        <div className="flex gap-3">
          {/* Ability button with cooldown ring */}
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full p-[3px]"
            style={{
              background: `conic-gradient(${accentColor} 0deg ${abilityDeg}deg, rgba(15,23,42,0.72) ${abilityDeg}deg 360deg)`,
            }}
            {...makeButtonHandlers('ability')}
          >
            <div
              className="flex h-full w-full flex-col items-center justify-center rounded-full border bg-slate-950/90 backdrop-blur-sm"
              style={{ borderColor: `${accentColor}44`, color: accentColor }}
            >
              <span className="text-xs font-black leading-none">Q</span>
            </div>
          </div>

          {/* Attack button with cooldown ring */}
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full p-[3px]"
            style={{
              background: `conic-gradient(#f97316 0deg ${attackDeg}deg, rgba(15,23,42,0.72) ${attackDeg}deg 360deg)`,
            }}
            {...makeButtonHandlers('attack')}
          >
            <div
              className="flex h-full w-full flex-col items-center justify-center rounded-full border border-orange-500/30 bg-slate-950/90 backdrop-blur-sm text-orange-400"
            >
              <span className="text-base leading-none">⚔️</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Lint**

```bash
npm run lint -- --max-warnings 0
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/MobileControls.tsx
git commit -m "feat(mobile): MobileControls component (joystick + action buttons)"
```

---

## Task 6: Mobile HUD + MobileControls in PhaserGame.tsx

**Files:**
- Modify: `src/game/PhaserGame.tsx`

Add the `useIsMobile` hook and render two different HUD layouts. On mobile: a compact horizontal stats strip at the top and `<MobileControls>` at the bottom. On desktop: existing layout unchanged.

- [ ] **Step 1: Add imports**

In `src/game/PhaserGame.tsx`, add to the existing import block at the top:
```ts
import { useIsMobile } from '../hooks/useIsMobile';
import { MobileControls } from '../components/MobileControls';
```

- [ ] **Step 2: Call the hook inside the component**

Inside `PhaserGame` function, add after the existing `const abilityTheme = ...` line:
```ts
const isMobile = useIsMobile();
```

- [ ] **Step 3: Replace the desktop HUD block with a mobile/desktop branch**

The existing HUD renders a vertical stat panel (top-right) and two ability button `div`s (top-left). Wrap the entire section so mobile gets a different layout.

Find the comment `{/* HUD overlay — stat bars rendered over the Phaser canvas */}` and the two `div.group` blocks for the attack and ability buttons. Replace everything from that comment to the closing `</div>` of the outer `div.relative` with the following (the Phaser canvas `div` and home button remain unchanged — only the HUD section changes):

The full return JSX for `PhaserGame` should become:

```tsx
return (
  <div className="relative w-full h-full">
    <div ref={containerRef} className="w-full h-full" />

    {/* Home button */}
    <button
      onClick={() => setConfirmOpen(true)}
      className="pointer-events-auto absolute left-3 top-3 flex h-11 w-11 items-center justify-center rounded-xl border border-purple-800 bg-slate-950/90 text-xl backdrop-blur-sm transition-transform duration-150 hover:scale-105 hover:border-purple-600"
      title="Return to main menu"
    >
      🏠
    </button>

    {/* Confirm dialog */}
    {confirmOpen && (
      <HomeConfirmDialog
        onConfirm={onReturnHome}
        onCancel={() => setConfirmOpen(false)}
      />
    )}

    {isMobile ? (
      <>
        {/* ── Mobile HUD: compact horizontal stats bar across the top ── */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 flex items-center gap-1 bg-gray-950/80 px-3 py-1.5 backdrop-blur-sm border-b border-gray-700">
          {[
            { label: 'Budget',    value: stats.budget,           emoji: '💰', inverted: false },
            { label: 'Happy',     value: stats.clientHappiness,  emoji: '😊', inverted: false },
            { label: 'Morale',    value: stats.teamMorale,       emoji: '💪', inverted: false },
            { label: 'Delivery',  value: stats.deliveryProgress, emoji: '🚀', inverted: false },
            { label: 'Debt',      value: stats.technicalDebt,    emoji: '🕷️', inverted: true  },
            { label: 'Risk',      value: stats.complianceRisk,   emoji: '⚖️', inverted: true  },
          ].map(({ label, value, emoji, inverted }) => {
            const pct = Math.max(0, Math.min(100, value));
            let color = 'bg-green-500';
            if (inverted) {
              if (pct > 75) color = 'bg-red-500';
              else if (pct > 50) color = 'bg-orange-500';
              else if (pct > 25) color = 'bg-yellow-500';
            } else if (pct < 25) color = 'bg-red-500';
            else if (pct < 50) color = 'bg-orange-500';
            else if (pct < 75) color = 'bg-yellow-500';
            return (
              <div key={label} className="flex flex-1 flex-col items-center gap-0.5 min-w-0">
                <span className="text-[8px] text-gray-400 truncate">{emoji}</span>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                  <div className={`h-1.5 rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Mobile touch controls ── */}
        <MobileControls
          attackProgress={attackUi.progress}
          abilityProgress={abilityUi.progress}
          accentColor={abilityTheme.accent}
        />
      </>
    ) : (
      <>
        {/* ── Desktop HUD: vertical stat panel top-right ── */}
        <div className="pointer-events-none absolute right-2 top-2 w-48 rounded-xl border border-gray-700 bg-gray-950/80 p-3 backdrop-blur-sm">
          <p className="mb-2 text-[10px] font-bold tracking-widest text-purple-300">
            {selectedClass.emoji} {selectedClass.name.toUpperCase()}
          </p>
          <StatBar label="Budget"           value={stats.budget}           emoji="💰" />
          <StatBar label="Client Happiness" value={stats.clientHappiness}  emoji="😊" />
          <StatBar label="Team Morale"      value={stats.teamMorale}       emoji="💪" />
          <StatBar label="Delivery"         value={stats.deliveryProgress} emoji="🚀" />
          <StatBar label="Tech Debt"        value={stats.technicalDebt}    emoji="🕷️" inverted />
          <StatBar label="Compliance Risk"  value={stats.complianceRisk}   emoji="⚖️" inverted />
        </div>

        {/* ── Desktop ability button (Q) ── */}
        <div className="group pointer-events-auto absolute left-56 top-2">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-xl p-[3px] shadow-lg transition-transform duration-150 group-hover:scale-105"
            style={{
              background: cooldownRing,
              boxShadow: `0 0 18px ${abilityTheme.shadow}`,
            }}
          >
            <div
              className="flex h-full w-full items-center justify-center rounded-[10px] border bg-slate-950/90 backdrop-blur-sm"
              style={{
                borderColor: abilityTheme.accentSoft,
                color: abilityTheme.accent,
              }}
            >
              <span className="text-2xl font-black uppercase leading-none">Q</span>
            </div>
          </div>
          <div
            className="pointer-events-none absolute left-0 top-full mt-2 w-64 rounded-lg border bg-slate-950/95 p-3 opacity-0 shadow-lg transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100"
            style={{
              borderColor: abilityTheme.accentSoft,
              boxShadow: `0 10px 30px ${abilityTheme.shadow}`,
            }}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: abilityTheme.accent }}>
              Q · {abilityDefinition.name}
            </p>
            <p className="mt-2 text-[11px] text-slate-100">
              {abilityDefinition.description}
            </p>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: abilityTheme.accent }}>
              {abilityDefinition.rangeLabel}
            </p>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: abilityTheme.accent }}>
              {abilityUi.remainingLabel} · {totalCooldownLabel}
            </p>
          </div>
        </div>

        {/* ── Desktop attack button (E) ── */}
        <div className="group pointer-events-auto absolute left-72 top-2">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl p-[3px] shadow-lg transition-transform duration-150 group-hover:scale-105${attackUi.progress >= 1 ? ' attack-ready' : ''}`}
            style={{
              background: `conic-gradient(#f97316 0deg ${attackUi.progress * 360}deg, rgba(15, 23, 42, 0.72) ${attackUi.progress * 360}deg 360deg)`,
              boxShadow: attackUi.progress >= 1
                ? '0 0 18px rgba(251, 146, 60, 0.7), 0 0 6px rgba(239, 68, 68, 0.4)'
                : '0 0 10px rgba(251, 146, 60, 0.25)',
            }}
          >
            <div
              className="flex h-full w-full flex-col items-center justify-center rounded-[9px] border bg-slate-950/90 backdrop-blur-sm"
              style={{
                borderColor: attackUi.progress >= 1 ? 'rgba(251,146,60,0.55)' : 'rgba(251,146,60,0.2)',
                color: attackUi.progress >= 1 ? '#fb923c' : '#9a5c30',
              }}
            >
              <span className="text-[9px] leading-none">⚔️</span>
              <span className="text-[11px] font-black uppercase leading-none mt-[2px]">E</span>
            </div>
          </div>
          <div className="pointer-events-none absolute left-0 top-full mt-2 w-48 rounded-lg border border-orange-700/40 bg-slate-950/95 p-3 opacity-0 shadow-lg transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100"
            style={{ boxShadow: '0 10px 24px rgba(251, 146, 60, 0.2)' }}>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-400">
              E · Basic Attack
            </p>
            <p className="mt-2 text-[11px] text-slate-100">
              Melee strike that deals damage to enemies in range.
            </p>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-500">
              {attackDamageLabel}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-500">
              {attackUi.remainingLabel} · {(ATTACK_COOLDOWN / 1000).toFixed(1)}s cooldown
            </p>
          </div>
        </div>
      </>
    )}
  </div>
);
```

- [ ] **Step 4: Lint**

```bash
npm run lint -- --max-warnings 0
```
Expected: no errors.

- [ ] **Step 5: Manual test — desktop**

Run `npm run dev` in a regular browser window (non-mobile). Start a game, confirm:
- Vertical stat panel visible top-right ✓
- Q ability button visible top-left ✓
- E attack button visible ✓
- Gameplay works with keyboard ✓

- [ ] **Step 6: Manual test — mobile simulation**

In Chrome DevTools → Device Toolbar, pick "iPhone 14 Pro Max" (landscape). Refresh. Confirm:
- Horizontal stats strip visible at top ✓
- Virtual joystick visible bottom-left ✓
- Jump, Ability (Q), Attack (⚔️) buttons visible bottom-right ✓
- Desktop stat panel and Q/E buttons NOT visible ✓
- Touch the joystick left/right — player walks ✓
- Tap Jump — player jumps ✓
- Tap Attack — player attacks ✓
- Tap Q — class ability fires ✓

- [ ] **Step 7: Manual test — rotate prompt**

In DevTools, switch to portrait mode. Confirm the rotate overlay covers the screen. Switch back to landscape — overlay disappears.

- [ ] **Step 8: Commit**

```bash
git add src/game/PhaserGame.tsx
git commit -m "feat(mobile): mobile HUD and MobileControls integration in PhaserGame"
```
