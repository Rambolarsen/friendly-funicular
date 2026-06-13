import Phaser from 'phaser';
import type { MultiplayerEnemyState } from '../../types/multiplayer';

const ANIM_MAP: Record<string, string> = {
  goblin: 'goblin-walk',
  wraith: 'wraith-walk',
  troll: 'troll-walk',
  brute: 'troll-walk',
  spectre: 'spectre-idle',
  boss: 'boss-walk',
};

const DISPLAY_SIZE: Record<string, [number, number]> = {
  goblin: [24, 24], wraith: [24, 24], troll: [28, 28],
  brute: [36, 36], spectre: [24, 24], boss: [48, 48],
};

/** Sprite for a server-owned enemy. Used in multiplayer mode. */
export class RemoteEnemy extends Phaser.GameObjects.Sprite {
  readonly enemyId: string;
  private targetX: number;
  private targetY: number;

  constructor(scene: Phaser.Scene, state: MultiplayerEnemyState) {
    super(scene, state.x, state.y, 'chars', 0);
    this.enemyId = state.id;
    this.targetX = state.x;
    this.targetY = state.y;

    const [w, h] = DISPLAY_SIZE[state.type] ?? [24, 24];
    this.setDisplaySize(w, h);
    this.setDepth(8);
    scene.add.existing(this);

    const anim = ANIM_MAP[state.type] ?? 'goblin-walk';
    this.play(anim, true);
  }

  applyState(state: MultiplayerEnemyState): void {
    this.targetX = state.x;
    this.targetY = state.y;
    this.setFlipX(state.direction === -1);
  }

  preUpdate(): void {
    this.x = Phaser.Math.Linear(this.x, this.targetX, 0.25);
    this.y = Phaser.Math.Linear(this.y, this.targetY, 0.25);
  }

  /** Axis-aligned bounding rect for attack overlap checks. */
  getBounds<T extends Phaser.Geom.Rectangle>(output?: T): T {
    const bounds = output ?? new Phaser.Geom.Rectangle() as T;
    bounds.setTo(
      this.x - this.displayWidth / 2,
      this.y - this.displayHeight / 2,
      this.displayWidth,
      this.displayHeight,
    );
    return bounds;
  }
}
