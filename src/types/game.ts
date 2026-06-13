export type RawStats = {
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
  color: string;       // CSS accent color for border and name text
};

export type GamePhase = 'start' | 'playing' | 'end';

export type GameOverPayload = {
  outcome: 'win' | 'lose';
  stats: RawStats;
  reason: string | null;
};
