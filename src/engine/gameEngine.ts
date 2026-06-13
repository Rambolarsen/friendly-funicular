import { GameStats, LogEntry } from '../types/game';

export function clampStatChange(change: number): number {
  return Math.max(-20, Math.min(20, change));
}

export function clampStat(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function applyStatChanges(current: GameStats, changes: Partial<GameStats>): GameStats {
  const next = { ...current };
  for (const key of Object.keys(changes) as (keyof GameStats)[]) {
    const clamped = clampStatChange(changes[key] ?? 0);
    next[key] = clampStat(current[key] + clamped);
  }
  return next;
}

export function checkWinLose(
  stats: GameStats,
  isBossDefeated: boolean,
): { outcome: 'win' | 'lose' | null; reason: string | null } {
  if (stats.budget <= 0) return { outcome: 'lose', reason: 'The project ran out of budget. The CFO has spoken.' };
  if (stats.teamMorale <= 0) return { outcome: 'lose', reason: 'The team quit. Every last one of them. Even the intern.' };
  if (stats.technicalDebt >= 100) return { outcome: 'lose', reason: 'Technical debt consumed the system. Production is down. It will never come back.' };
  if (stats.complianceRisk >= 100) return { outcome: 'lose', reason: 'A regulator arrived. The project — and three careers — are over.' };
  if (isBossDefeated && stats.deliveryProgress >= 70) return { outcome: 'win', reason: null };
  return { outcome: null, reason: null };
}

export function makeLogEntry(type: LogEntry['type'], text: string): LogEntry {
  return { id: Math.random().toString(36).slice(2), type, text, timestamp: Date.now() };
}

export function formatStatChange(key: keyof GameStats, change: number): string {
  const labels: Record<keyof GameStats, string> = {
    budget: 'Budget',
    clientHappiness: 'Client Happiness',
    technicalDebt: 'Technical Debt',
    teamMorale: 'Team Morale',
    deliveryProgress: 'Delivery Progress',
    complianceRisk: 'Compliance Risk',
  };
  const sign = change > 0 ? '+' : '';
  return `${labels[key]}: ${sign}${change}`;
}
