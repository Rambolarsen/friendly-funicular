import { GameState, GameStats } from '../types/game';

export const INITIAL_STATS: GameStats = {
  budget: 100,
  clientHappiness: 50,
  technicalDebt: 0,
  teamMorale: 70,
  deliveryProgress: 0,
  complianceRisk: 20,
};

export const INITIAL_GAME_STATE: GameState = {
  phase: 'start',
  stats: { ...INITIAL_STATS },
  selectedClass: null,
  currentRoom: null,
  roomCount: 0,
  floor: 1,
  log: [],
  outcome: null,
  loseReason: null,
  finalReport: null,
};
