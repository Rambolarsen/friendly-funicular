import Phaser from 'phaser';
import type { MultiplayerPlayerState } from '../../types/multiplayer';

/** Sprite for a player controlled by another browser. Interpolates position. */
export class RemotePlayer extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Sprite;
  private nameTag: Phaser.GameObjects.Text;
  private targetX = 0;
  private targetY = 0;
  private quoteVisibleUntil = 0;

  constructor(scene: Phaser.Scene, state: MultiplayerPlayerState) {
    super(scene, state.x, state.y);

    this.sprite = scene.add.sprite(0, 0, 'chars', 0);
    this.sprite.setDisplaySize(28, 28);
    this.sprite.setFlipX(state.flipX);

    this.nameTag = scene.add.text(0, -22, state.name, {
      fontSize: '9px',
      color: '#facc15',
      backgroundColor: '#00000088',
      padding: { x: 3, y: 1 },
    }).setOrigin(0.5, 1);

    this.add([this.sprite, this.nameTag]);
    scene.add.existing(this);
    this.setDepth(9);

    this.targetX = state.x;
    this.targetY = state.y;
  }

  applyState(state: MultiplayerPlayerState): void {
    this.targetX = state.x;
    this.targetY = state.y;
    this.sprite.setFlipX(state.flipX);
    if (state.animKey) this.sprite.play(state.animKey, true);
  }

  preUpdate(): void {
    // Lerp toward target for smooth visuals between 20fps ticks
    this.x = Phaser.Math.Linear(this.x, this.targetX, 0.3);
    this.y = Phaser.Math.Linear(this.y, this.targetY, 0.3);
  }

  showQuote(quote: string): void {
    const now = this.scene.time.now;
    if (now < this.quoteVisibleUntil) return;
    this.quoteVisibleUntil = now + 1500;

    const text = this.scene.add.text(this.x, this.y - 40, quote, {
      color: '#ffd040',
      fontSize: '13px',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    text.setOrigin(0.5, 1);
    text.setDepth(25);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 48,
      alpha: 0,
      duration: 1500,
      ease: 'Quad.easeOut',
      onComplete: () => { text.destroy(); },
    });
  }
}
