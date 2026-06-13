import { EnemyType, LevelData } from './types';

export const bossLevel: LevelData = {
  width: 1280,
  height: 540,
  playerStart: { x: 80, y: 420 },
  exitX: 99999, // no exit — win via boss defeat
  platforms: [
    // Main floor
    { x: 0,   y: 490, w: 1280, h: 20 },
    // Platforms for dodging boss projectiles
    { x: 160, y: 380, w: 120,  h: 16 },
    { x: 400, y: 310, w: 120,  h: 16 },
    { x: 640, y: 360, w: 120,  h: 16 },
    { x: 880, y: 300, w: 120,  h: 16 },
    { x: 1060,y: 370, w: 120,  h: 16 },
  ],
  enemies: [
    // Two adds before the boss engages
    { type: EnemyType.Troll,  x: 350,  y: 440 },
    { type: EnemyType.Wraith, x: 550,  y: 440 },
  ],
  boss: { x: 900, y: 420 },
  loots: [
    { type: 'morale', x: 220, y: 350 },
    { type: 'budget', x: 660, y: 330 },
  ],
};
