import Phaser from 'phaser';
import { BootScene } from './phaser/scenes/BootScene';
import { PreloadScene } from './phaser/scenes/PreloadScene';
import { GameScene } from './phaser/scenes/GameScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 430,
    height: 760,
  },
  input: {
    activePointers: 2,
    touch: { capture: true },
  },
  scene: [BootScene, PreloadScene, GameScene],
});
