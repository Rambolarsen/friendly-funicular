import Phaser from 'phaser';
import { CONSULTANT_CLASSES } from '../../constants/classes';
import { CLASS_SPRITE_DATA, makeBasePixels } from '../../constants/classSprites';

/**
 * Generates a 24×24 texture for each consultant class using Phaser's Graphics API.
 * Textures are stored in the cache under the key `<classId>-sprite`.
 * Call once during BootScene.create() before registering animations.
 */
export function generateClassTextures(scene: Phaser.Scene): void {
  const gfx = scene.add.graphics();

  for (const cls of CONSULTANT_CLASSES) {
    const data = CLASS_SPRITE_DATA[cls.id];
    if (!data) continue;

    gfx.clear();
    const pixels = makeBasePixels(data.color, data.hat, data.item);

    pixels.forEach((color, i) => {
      if (!color) return;
      const x = i % 24;
      const y = Math.floor(i / 24);
      const hex = parseInt(color.replace('#', ''), 16);
      gfx.fillStyle(hex, 1);
      gfx.fillRect(x, y, 1, 1);
    });

    gfx.generateTexture(`${cls.id}-sprite`, 24, 24);
  }

  gfx.destroy();
}
