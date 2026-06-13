import Phaser from 'phaser';
import { CONSULTANT_CLASSES } from '../../constants/classes';

/**
 * Loads Kenney Pixel Platformer sprite assets and defines all character animations.
 * Characters use the 'chars' spritesheet (9×3 grid, 24×24 px frames, 1px gap).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    this.load.spritesheet('chars', 'assets/sprites/chars.png', {
      frameWidth: 24, frameHeight: 24, spacing: 1,
    });
    this.load.image('platform',    'assets/sprites/platform.png');
    this.load.image('loot-budget', 'assets/sprites/loot-budget.png');
    this.load.image('loot-morale', 'assets/sprites/loot-morale.png');
    this.load.image('loot-debt',   'assets/sprites/loot-debt.png');
    this.load.image('exit-sign',   'assets/sprites/exit-sign.png');
  }

  create() {
    // ── Player animations (frames 0-3: blue alien, row 0) ────────────────────
    this.anims.create({
      key: 'player-walk',
      frames: this.anims.generateFrameNumbers('chars', { frames: [0, 1, 2, 3] }),
      frameRate: 10, repeat: -1,
    });
    this.anims.create({
      key: 'player-idle',
      frames: this.anims.generateFrameNumbers('chars', { frames: [0] }),
      frameRate: 1, repeat: -1,
    });
    this.anims.create({
      key: 'player-jump',
      frames: this.anims.generateFrameNumbers('chars', { frames: [3] }),
      frameRate: 1, repeat: 0,
    });

    // ── Enemy animations ──────────────────────────────────────────────────────
    this.anims.create({
      key: 'goblin-walk',
      frames: this.anims.generateFrameNumbers('chars', { frames: [4, 5] }),
      frameRate: 6, repeat: -1,
    });
    this.anims.create({
      key: 'wraith-walk',
      frames: this.anims.generateFrameNumbers('chars', { frames: [6, 7] }),
      frameRate: 6, repeat: -1,
    });
    this.anims.create({
      key: 'troll-walk',
      frames: this.anims.generateFrameNumbers('chars', { frames: [9, 10] }),
      frameRate: 4, repeat: -1,
    });
    this.anims.create({
      key: 'spectre-idle',
      frames: this.anims.generateFrameNumbers('chars', { frames: [8] }),
      frameRate: 1, repeat: -1,
    });
    this.anims.create({
      key: 'boss-walk',
      frames: this.anims.generateFrameNumbers('chars', { frames: [21, 22] }),
      frameRate: 5, repeat: -1,
    });

    // ── Per-class player animations (single frame each) ──────────────────────
    for (const cls of CONSULTANT_CLASSES) {
      const f = cls.spriteFrame;
      this.anims.create({
        key: `${cls.id}-player-walk`,
        frames: this.anims.generateFrameNumbers('chars', { frames: [f] }),
        frameRate: 1, repeat: -1,
      });
      this.anims.create({
        key: `${cls.id}-player-idle`,
        frames: this.anims.generateFrameNumbers('chars', { frames: [f] }),
        frameRate: 1, repeat: -1,
      });
      this.anims.create({
        key: `${cls.id}-player-jump`,
        frames: this.anims.generateFrameNumbers('chars', { frames: [f] }),
        frameRate: 1, repeat: 0,
      });
    }

    this.scene.start('GameScene');
  }
}
