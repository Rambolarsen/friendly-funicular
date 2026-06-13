import { RawStats } from '../../types/game';

export function checkWinLose(
  stats: RawStats,
  isBossDefeated: boolean,
): { outcome: 'win' | 'lose' | null; reason: string | null } {
  if (stats.budget <= 0)
    return { outcome: 'lose', reason: 'The project ran out of budget. The CFO has spoken.' };
  if (stats.teamMorale <= 0)
    return { outcome: 'lose', reason: 'The team quit. Every last one of them. Even the intern.' };
  if (stats.technicalDebt >= 100)
    return { outcome: 'lose', reason: 'Technical debt consumed the system. Production is down. It will never come back.' };
  if (stats.complianceRisk >= 100)
    return { outcome: 'lose', reason: 'A regulator arrived. The project — and three careers — are over.' };
  if (isBossDefeated && stats.deliveryProgress >= 70)
    return { outcome: 'win', reason: null };
  return { outcome: null, reason: null };
}
