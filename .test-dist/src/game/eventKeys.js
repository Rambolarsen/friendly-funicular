"use strict";
// src/game/eventKeys.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEVEL_STARTED = exports.ABILITY_USED = exports.GAME_OVER = exports.STATS_CHANGED = void 0;
/** Emitted by scenes when stats change. Payload: RawStats */
exports.STATS_CHANGED = 'stats-changed';
/** Emitted by scenes when the game ends. Payload: GameOverPayload */
exports.GAME_OVER = 'game-over';
/** Emitted by scenes when an active ability is used. Payload: AbilityUsedPayload */
exports.ABILITY_USED = 'ability-used';
/** Emitted by scenes when a new level scene has started. Payload: none */
exports.LEVEL_STARTED = 'level-started';
