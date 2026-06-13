// src/game/eventKeys.ts

/** Emitted by scenes when stats change. Payload: GameStats */
export const STATS_CHANGED = 'stats-changed';

/** Emitted by scenes when the game ends. Payload: { outcome, stats, reason } */
export const GAME_OVER = 'game-over';
