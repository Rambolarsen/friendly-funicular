import { RawStats } from '../../types/game';

export function clampStat(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function clampStatChange(change: number): number {
  return Math.max(-20, Math.min(20, change));
}

export function applyStatChanges(current: RawStats, changes: Partial<RawStats>): RawStats {
  const next = { ...current };
  for (const key of Object.keys(changes) as (keyof RawStats)[]) {
    const clamped = clampStatChange(changes[key] ?? 0);
    next[key] = clampStat(current[key] + clamped);
  }
  return next;
}
