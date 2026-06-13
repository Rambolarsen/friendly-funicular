import Phaser from 'phaser';
import { CONSULTANT_CLASSES } from '../../constants/classes';
import { generateClassTextures } from '../sprites/generateClassTextures';

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
    this.load.image('loot-compliance', 'assets/sprites/loot-compliance.png');
    this.load.image('exit-sign',   'assets/sprites/exit-sign.png');
  }

  create() {
    // Generate custom pixel-art textures for each consultant class
    generateClassTextures(this);
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
      const key = `${cls.id}-sprite`;
      this.anims.create({
        key: `${cls.id}-player-walk`,
        frames: [{ key }],
        frameRate: 1, repeat: -1,
      });
      this.anims.create({
        key: `${cls.id}-player-idle`,
        frames: [{ key }],
        frameRate: 1, repeat: -1,
      });
      this.anims.create({
        key: `${cls.id}-player-jump`,
        frames: [{ key }],
        frameRate: 1, repeat: 0,
      });
    }

    const socketClient = this.registry.get('socketClient');
    const roomId = this.registry.get('roomId') as string | null;
    const multiplayer = Boolean(this.registry.get('multiplayer'));

    this.createDungeonBg();

    this.scene.start('GameScene', {
      multiplayer,
      socketClient,
      roomId: roomId ?? undefined,
    });
  }

  private createDungeonBg(): void {
    const W = 1280, H = 640;
    const gfx = this.make.graphics({ x: 0, y: 0 });

    // Dark stone base
    gfx.fillStyle(0x0d0d1a);
    gfx.fillRect(0, 0, W, H);

    // Stone brick rows
    gfx.lineStyle(1, 0x2a2a3a, 0.6);
    for (let y = 0; y < H; y += 32) {
      const offset = (Math.floor(y / 32) % 2) * 48;
      for (let x = -offset; x < W; x += 96) {
        gfx.strokeRect(x, y, 96, 32);
      }
    }

    // Dungeon floor darker stripe
    gfx.fillStyle(0x080810, 0.5);
    gfx.fillRect(0, H - 80, W, 80);

    // Torch glow spots (left, centre, right)
    for (const tx of [80, 640, 1200]) {
      gfx.fillStyle(0xf97316, 0.12);
      gfx.fillEllipse(tx, 60, 240, 240);
      gfx.fillStyle(0xfbbf24, 0.08);
      gfx.fillEllipse(tx, 60, 120, 120);
    }

    gfx.generateTexture('dungeon-bg', W, H);
    gfx.destroy();
  }
}
