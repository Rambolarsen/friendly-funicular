export enum EnemyType {
  Goblin = 'goblin',
  Wraith = 'wraith',
  Troll = 'troll',
  Spectre = 'spectre',
}

export type PlatformData = { x: number; y: number; w: number; h: number };
export type EnemySpawnData = { type: EnemyType; x: number; y: number };
export type LootData = { type: 'budget' | 'morale' | 'debt'; x: number; y: number };

export type LevelData = {
  width: number;
  height: number;
  playerStart: { x: number; y: number };
  /** x position player must reach to complete the level (skipped on boss level) */
  exitX: number;
  platforms: PlatformData[];
  enemies: EnemySpawnData[];
  loots: LootData[];
  boss?: { x: number; y: number };
};
