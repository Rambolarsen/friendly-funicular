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

export type Action = {
  id: string;
  label: string;
  effectHint: string;
};

export type Room = {
  id: string;
  floor: number;
  roomNumber: number;
  roomName: string;
  description: string;
  enemy: string;
  actions: Action[];
  isBoss: boolean;
};

export type Resolution = {
  narration: string;
  statChanges: Partial<GameStats>;
  loot?: string;
};

export type GamePhase = 'start' | 'playing' | 'resolving' | 'end';

export type LogEntry = {
  id: string;
  type: 'narration' | 'stat' | 'room' | 'system';
  text: string;
  timestamp: number;
};

export type GameState = {
  phase: GamePhase;
  stats: GameStats;
  selectedClass: ConsultantClass | null;
  currentRoom: Room | null;
  roomCount: number;
  floor: number;
  log: LogEntry[];
  outcome: 'win' | 'lose' | null;
  loseReason: string | null;
  finalReport: string | null;
};
