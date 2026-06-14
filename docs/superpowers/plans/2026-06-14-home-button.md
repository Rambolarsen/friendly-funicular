# Home Button + Confirm Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 🏠 icon button to the in-game HUD that opens a "RESIGN CONTRACT?" confirm dialog, allowing the player to return to the start screen from any game mode.

**Architecture:** A new `HomeConfirmDialog` component handles the overlay + dialog UI. `PhaserGame` gains an `onReturnHome` prop and local `confirmOpen` state. `App.tsx` passes an `onReturnHome` handler that resets phase to `'start'` and cleans up socket state — the same teardown path used by the existing restart flow.

**Tech Stack:** React, TypeScript, Tailwind CSS

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/HomeConfirmDialog.tsx` | Create | Dialog overlay component |
| `src/game/PhaserGame.tsx` | Modify | Add 🏠 button, `confirmOpen` state, `onReturnHome` prop, render dialog |
| `src/App.tsx` | Modify | Pass `onReturnHome` handler to `PhaserGame` |

---

### Task 1: Create `HomeConfirmDialog` component

**Files:**
- Create: `src/components/HomeConfirmDialog.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/HomeConfirmDialog.tsx

interface HomeConfirmDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function HomeConfirmDialog({ onConfirm, onCancel }: HomeConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="w-full max-w-sm rounded-2xl border-2 border-purple-700 bg-gray-950 p-8 text-center"
        style={{ boxShadow: '0 0 40px rgba(124, 58, 237, 0.3)' }}
      >
        <div className="mb-4 text-5xl">📋</div>
        <h2
          className="mb-2 text-xl font-black tracking-widest text-purple-300"
          style={{ fontFamily: 'Cinzel Decorative, serif' }}
        >
          RESIGN CONTRACT?
        </h2>
        <p className="mb-6 text-sm italic text-gray-400">
          The client will escalate to your manager.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={onConfirm}
            className="cursor-pointer rounded-xl bg-purple-700 px-6 py-3 text-sm font-bold tracking-widest text-white transition-all duration-200 hover:bg-purple-600 active:scale-95"
          >
            RESIGN
          </button>
          <button
            onClick={onCancel}
            className="cursor-pointer rounded-xl border border-gray-700 bg-gray-800 px-6 py-3 text-sm font-bold tracking-widest text-gray-300 transition-all duration-200 hover:bg-gray-700 active:scale-95"
          >
            STAY ON PROJECT
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/HomeConfirmDialog.tsx
git commit -m "feat: add HomeConfirmDialog component"
```

---

### Task 2: Add 🏠 button and dialog state to `PhaserGame`

**Files:**
- Modify: `src/game/PhaserGame.tsx`

- [ ] **Step 1: Add `onReturnHome` to `PhaserGameProps`**

Find this block:
```tsx
interface PhaserGameProps {
  selectedClass: ConsultantClass;
  onGameOver: (outcome: 'win' | 'lose', stats: RawStats, reason: string | null, multiplayerResult?: MultiplayerResult) => void;
  socket?: SocketClient;
  roomId?: string;
}
```

Replace with:
```tsx
interface PhaserGameProps {
  selectedClass: ConsultantClass;
  onGameOver: (outcome: 'win' | 'lose', stats: RawStats, reason: string | null, multiplayerResult?: MultiplayerResult) => void;
  onReturnHome: () => void;
  socket?: SocketClient;
  roomId?: string;
}
```

- [ ] **Step 2: Destructure the new prop and add `confirmOpen` state**

Find:
```tsx
export function PhaserGame({ selectedClass, onGameOver, socket, roomId }: PhaserGameProps) {
```

Replace with:
```tsx
export function PhaserGame({ selectedClass, onGameOver, onReturnHome, socket, roomId }: PhaserGameProps) {
```

Then find the line:
```tsx
  const abilityDefinition = useMemo(() => getAbilityDefinition(selectedClass.id), [selectedClass.id]);
```

Add `confirmOpen` state directly after it:
```tsx
  const abilityDefinition = useMemo(() => getAbilityDefinition(selectedClass.id), [selectedClass.id]);
  const [confirmOpen, setConfirmOpen] = useState(false);
```

- [ ] **Step 3: Add the `HomeConfirmDialog` import**

At the top of `PhaserGame.tsx`, add to the existing component imports:
```tsx
import { HomeConfirmDialog } from '../components/HomeConfirmDialog';
```

- [ ] **Step 4: Add the 🏠 button and render the dialog in the JSX**

Find the return block opening and the HUD stats panel:
```tsx
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* HUD overlay — stat bars rendered over the Phaser canvas */}
      <div className="pointer-events-none absolute right-2 top-2 w-48 ...">
```

Add the home button and dialog right after `<div ref={containerRef} ... />` and before the stats panel comment:
```tsx
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Home button */}
      <button
        onClick={() => setConfirmOpen(true)}
        className="pointer-events-auto absolute left-2 top-2 flex h-9 w-9 items-center justify-center rounded-xl border border-purple-800 bg-slate-950/90 text-lg backdrop-blur-sm transition-transform duration-150 hover:scale-105 hover:border-purple-600"
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

      {/* HUD overlay — stat bars rendered over the Phaser canvas */}
```

- [ ] **Step 5: Commit**

```bash
git add src/game/PhaserGame.tsx
git commit -m "feat: add home button and confirm dialog to PhaserGame HUD"
```

---

### Task 3: Wire `onReturnHome` in `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Pass `onReturnHome` to `PhaserGame`**

Find:
```tsx
      <PhaserGame
        selectedClass={selectedClass!}
        socket={socket ?? undefined}
        roomId={roomId ?? undefined}
        onGameOver={(outcome, stats, reason, multiplayerResult) => {
          setResult({ outcome, stats, loseReason: reason, selectedClass: selectedClass!, multiplayerResult });
          setPhase('end');
        }}
      />
```

Replace with:
```tsx
      <PhaserGame
        selectedClass={selectedClass!}
        socket={socket ?? undefined}
        roomId={roomId ?? undefined}
        onGameOver={(outcome, stats, reason, multiplayerResult) => {
          setResult({ outcome, stats, loseReason: reason, selectedClass: selectedClass!, multiplayerResult });
          setPhase('end');
        }}
        onReturnHome={() => {
          SocketClient.reset();
          setSocket(null);
          setRoomId(null);
          setResult(null);
          setPhase('start');
        }}
      />
```

- [ ] **Step 2: Run lint to verify no type errors**

```bash
npm run lint
```

Expected: no errors (zero warnings related to new code).

- [ ] **Step 3: Run build to verify TypeScript compiles cleanly**

```bash
npm run build
```

Expected: build succeeds with no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire onReturnHome in App to reset phase to start"
```

---

### Task 4: Manual smoke test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Open `http://localhost:5173`.

- [ ] **Step 2: Solo mode — verify button appears**

Select a class, start solo. Confirm the 🏠 icon appears in the top-left corner of the HUD, styled consistently with the Q/E buttons.

- [ ] **Step 3: Solo mode — verify dialog**

Click 🏠. Confirm the dim overlay and "RESIGN CONTRACT?" dialog appear over the running game. Click **STAY ON PROJECT** — dialog closes, game continues. Click 🏠 again, then **RESIGN** — app navigates back to the start screen.

- [ ] **Step 4: Multiplayer mode — verify same behaviour**

Start a multiplayer game (two tabs or single player in a room). Confirm 🏠 appears and both dialog actions work identically.

- [ ] **Step 5: Final commit if any tweaks were needed**

```bash
git add -A
git commit -m "fix: home button smoke test tweaks"
```
