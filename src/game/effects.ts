import Phaser from 'phaser';

export function spawnDeathBurst(scene: Phaser.Scene, x: number, y: number, color: number): void {
  const count = Phaser.Math.Between(6, 8);

  for (let index = 0; index < count; index += 1) {
    const particle = scene.add.rectangle(x, y, 8, 8, color).setDepth(18);
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.Between(40, 80);

    scene.tweens.add({
      targets: particle,
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      alpha: 0,
      scaleX: 0.4,
      scaleY: 0.4,
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        particle.destroy();
      },
    });
  }
}
