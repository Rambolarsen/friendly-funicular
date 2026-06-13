import Phaser from 'phaser';

/** Generates all placeholder textures from Phaser Graphics objects. No external files needed. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    this.makeRect('player',       24, 40,  0x60a5fa); // blue
    this.makeRect('platform',     32, 16,  0x6b7280); // gray
    this.makeRect('enemy-goblin', 20, 28,  0x4ade80); // green
    this.makeRect('enemy-wraith', 18, 30,  0xa78bfa); // purple
    this.makeRect('enemy-troll',  28, 36,  0x78350f); // brown
    this.makeRect('enemy-spectre',20, 28,  0x67e8f9); // cyan
    this.makeRect('boss',         56, 64,  0xef4444); // red
    this.makeRect('loot-budget',  18, 18,  0xfbbf24); // gold
    this.makeRect('loot-morale',  18, 18,  0x34d399); // mint
    this.makeRect('loot-debt',    18, 18,  0xf87171); // red-light
    this.makeRect('exit-sign',    24, 48,  0x22c55e); // bright green

    this.scene.start('GameScene');
  }

  private makeRect(key: string, w: number, h: number, color: number) {
    const g = this.make.graphics();
    g.fillStyle(color, 1);
    g.fillRoundedRect(0, 0, w, h, 4);
    g.lineStyle(1, 0x000000, 0.4);
    g.strokeRoundedRect(0, 0, w, h, 4);
    g.generateTexture(key, w, h);
    g.destroy();
  }
}
