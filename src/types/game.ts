export type GameStats = {
  budget: number;
  clientHappiness: number;
  technicalDebt: number;
  teamMorale: number;
  deliveryProgress: number;
  complianceRisk: number;
};

export type ConsultantClass = {
  id: string;
  name: string;
  emoji: string;
  abilityName: string;
  description: string;
  flavor: string;
};

export type GamePhase = 'start' | 'playing' | 'end';

export type GameOverPayload = {
  outcome: 'win' | 'lose';
  stats: GameStats;
  reason: string | null;
};
