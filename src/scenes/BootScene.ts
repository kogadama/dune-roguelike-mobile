import Phaser from 'phaser';
import { SaveManager } from '../save/SaveManager';
import { setHapticsEnabled } from '../util/haptics';

/** Sync bootstrap: load save, install global handlers, hand off to TextureGen. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#120a05');

    // Suppress iOS gestures that fight the game.
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => e.preventDefault());

    SaveManager.load().then((save) => {
      this.registry.set('save', save);
      setHapticsEnabled(save.data.settings.haptics);
      this.scene.start('TextureGen');
    });
  }
}
