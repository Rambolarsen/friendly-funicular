import { useRef, useState } from 'react';
import { mobileInput } from '../game/mobileInput';

interface MobileControlsProps {
  attackProgress: number;   // 0 = on cooldown, 1 = ready
  abilityProgress: number;  // same scale
  accentColor: string;      // class accent hex, e.g. '#a78bfa'
}

const DEAD_ZONE = 20;
const MAX_DRAG = 44;

export function MobileControls({ attackProgress, abilityProgress, accentColor }: MobileControlsProps) {
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
      <div className="pointer-events-auto absolute bottom-6 right-6 flex touch-none select-none flex-col items-end gap-3">
        {/* Top row: Jump */}
        <div className="flex justify-end">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-sky-500/60 bg-slate-950/70 text-lg backdrop-blur-sm active:scale-95"
            {...makeButtonHandlers('jump')}
          >
            ⬆️
          </div>
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
