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
  spriteFrame: number; // Frame index in chars.png (9×3 spritesheet, 24×24 frames, 1px gap)
};

export type GamePhase = 'start' | 'playing' | 'end';

export type GameOverPayload = {
  outcome: 'win' | 'lose';
  stats: RawStats;
  reason: string | null;
};

export type AbilityTelegraphKind =
  | 'radius'
  | 'nearest-enemy'
  | 'all-enemies'
  | 'all-loot'
  | 'all-projectiles'
  | 'wildcard';

export type AbilityDefinition = {
  id: string;
  name: string;
  cooldownMs: number;
  description: string;
  rangeLabel: string;
  telegraphKind: AbilityTelegraphKind;
  radiusPx?: number;
};

export type AbilityUsedPayload = {
  name: string;
  cooldownMs: number;
};
