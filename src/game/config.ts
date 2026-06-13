import Phaser from 'phaser';
import { INITIAL_STATS } from '../constants/initialState';
import { ConsultantClass } from '../types/game';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';

export function createGameConfig(
  parent: HTMLElement,
  selectedClass: ConsultantClass,
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    backgroundColor: '#1a1a2e',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 960,
      height: 540,
      parent,
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 1800 }, debug: false },
    },
    scene: [BootScene, GameScene],
    callbacks: {
      preBoot: (game: Phaser.Game) => {
        game.registry.set('selectedClass', selectedClass);
        game.registry.set('stats', { ...INITIAL_STATS });
        game.registry.set('levelIndex', 0);
      },
    },
  };
}
