# Home Button + Confirm Dialog

**Date:** 2026-06-14  
**Status:** Approved

## Summary

Add a home button to the in-game HUD that allows the player to return to the start screen at any time during solo or multiplayer. Clicking the button opens a themed confirm dialog before navigating away.

## Button

- Icon-only 🏠 rendered as a small square icon box (`w-9 h-9`, `rounded-xl`) at `absolute left-2 top-2` in the HUD overlay
- Styled to match the Q/E ability icons: `bg-slate-950/90` background, `border border-purple-800`, hover scale transition
- Sits to the left of the Q ability icon (Q is currently at `left-56`; home button shifts Q/E right slightly or sits independently at `left-2`)
- `pointer-events-auto` so clicks register through the overlay

## Confirm Dialog

A new `HomeConfirmDialog` React component in `src/components/HomeConfirmDialog.tsx`.

### Layout
- Full-screen overlay: `fixed inset-0 z-50 bg-black/60 flex items-center justify-center`
- Dialog card: `bg-gray-950 border-2 border-purple-700 rounded-2xl p-8 text-center max-w-sm w-full shadow-[0_0_40px_rgba(124,58,237,0.3)]`

### Content
- 📋 emoji (large, decorative)
- Heading: **"RESIGN CONTRACT?"** — Cinzel Decorative font, `text-purple-300`, `tracking-widest`, `font-black`
- Subtext: *"The client will escalate to your manager."* — `text-gray-400`, `text-sm`, `italic`
- Buttons (side by side):
  - **"RESIGN"** — `bg-purple-700 hover:bg-purple-600`, white text, `rounded-xl`, `font-bold tracking-widest` — triggers return home
  - **"STAY ON PROJECT"** — `bg-gray-800 hover:bg-gray-700`, gray text, `border border-gray-700`, `rounded-xl` — dismisses dialog

## Behaviour

- Clicking 🏠 sets local React state `confirmOpen: true`, rendering the dialog
- The Phaser game continues running behind the overlay (no pause required for this scope)
- **Confirm ("RESIGN"):** calls `onReturnHome()` prop, which in `App.tsx` resets `gamePhase` back to `'start'`. The Phaser instance is destroyed via the existing cleanup in `PhaserGame`'s `useEffect` return
- **Cancel ("STAY ON PROJECT"):** sets `confirmOpen: false`, dialog disappears, game resumes normally
- Behaviour is identical in solo and multiplayer modes

## Props

### PhaserGame
Add `onReturnHome: () => void` to `PhaserGameProps`.

### HomeConfirmDialog
```ts
interface HomeConfirmDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/HomeConfirmDialog.tsx` | New component |
| `src/game/PhaserGame.tsx` | Add 🏠 button, `confirmOpen` state, `onReturnHome` prop, render `HomeConfirmDialog` |
| `src/App.tsx` | Pass `onReturnHome` handler that resets phase to `'start'` |

## Out of Scope

- Pausing the Phaser game while the dialog is open
- A full pause menu with additional options
