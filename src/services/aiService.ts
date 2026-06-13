import { Action, GameState, Resolution, Room } from '../types/game';

const API_BASE = '/api';

export async function generateRoom(gameState: GameState, roomNumber: number, isBoss: boolean): Promise<Room | null> {
  try {
    const response = await fetch(`${API_BASE}/generate-room`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameState, roomNumber, isBoss }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      id: `room-${Date.now()}`,
      floor: Math.ceil(roomNumber / 2),
      roomNumber,
      roomName: data.roomName,
      description: data.description,
      enemy: data.enemy,
      actions: data.actions.map((item: { label: string; effectHint: string }, index: number) => ({
        id: `action-${index}`,
        label: item.label,
        effectHint: item.effectHint,
      })),
      isBoss: data.isBoss ?? isBoss,
    };
  } catch {
    return null;
  }
}

export async function resolveAction(
  gameState: GameState,
  room: Room,
  chosenAction: Action,
  customAction?: string,
): Promise<Resolution | null> {
  try {
    const response = await fetch(`${API_BASE}/resolve-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameState, room, chosenAction, customAction }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      narration: data.narration,
      statChanges: data.statChanges ?? {},
      loot: data.loot,
    };
  } catch {
    return null;
  }
}

export async function generateFinalReport(gameState: GameState): Promise<string> {
  try {
    const response = await fetch(`${API_BASE}/final-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameState }),
    });
    if (!response.ok) throw new Error('Failed');
    const data = await response.json();
    return data.report;
  } catch {
    return generateFallbackReport(gameState);
  }
}

function generateFallbackReport(gameState: GameState): string {
  const { stats, outcome, selectedClass } = gameState;
  if (outcome === 'win') {
    return `PROJECT CLOSURE REPORT\n\nEngagement: Dungeons & Deliverables\nConsultant Class: ${selectedClass?.name ?? 'Unknown'}\nStatus: DELIVERED ✅\n\nDespite unprecedented obstacles — vague requirements, legacy systems, procurement trolls, and at least one dragon — the team delivered.\n\nFinal Stats:\n- Budget Remaining: ${stats.budget}%\n- Client Happiness: ${stats.clientHappiness}%\n- Technical Debt: ${stats.technicalDebt}%\n- Team Morale: ${stats.teamMorale}%\n- Delivery Progress: ${stats.deliveryProgress}%\n- Compliance Risk: ${stats.complianceRisk}%\n\nThe AI is live. The client is (mostly) happy. The team has already received invitations to do it all again next quarter.\n\nRecommendations for Phase 2: Just say no.`;
  }

  return `PROJECT POST-MORTEM\n\nEngagement: Dungeons & Deliverables\nConsultant Class: ${selectedClass?.name ?? 'Unknown'}\nStatus: FAILED 💀\n\nThe project has been formally archived.\n\nFinal Stats:\n- Budget Remaining: ${stats.budget}%\n- Client Happiness: ${stats.clientHappiness}%\n- Technical Debt: ${stats.technicalDebt}%\n- Team Morale: ${stats.teamMorale}%\n- Delivery Progress: ${stats.deliveryProgress}%\n- Compliance Risk: ${stats.complianceRisk}%\n\nLessons Learned: Many.\n\nNext Steps: A very long off-site and some quiet reflection about career choices.`;
}
