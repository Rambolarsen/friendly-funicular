// src/game/eventKeys.ts

/** Emitted by scenes when stats change. Payload: RawStats */
export const STATS_CHANGED = 'stats-changed';

/** Emitted by scenes when the game ends. Payload: GameOverPayload */
export const GAME_OVER = 'game-over';

/** Emitted by scenes when an active ability is used. Payload: AbilityUsedPayload */
export const ABILITY_USED = 'ability-used';

/** Emitted by scenes when a new level scene has started. Payload: none */
export const LEVEL_STARTED = 'level-started';
