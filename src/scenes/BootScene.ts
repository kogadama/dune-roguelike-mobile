import Phaser from 'phaser';
import { SaveManager } from '../save/SaveManager';
import { setHapticsEnabled } from '../util/haptics';
import { sfx } from '../audio/Sfx';
import { music } from '../audio/index';
import { applyFpsCap } from '../util/fps';

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

      // Audio: context starts suspended; first pointer gesture resumes it.
      sfx.init();
      music.init();
      sfx.volume = save.data.settings.sfxVolume;
      music.setVolume(save.data.settings.musicVolume);
      const unlock = () => sfx.unlock();
      window.addEventListener('pointerdown', unlock, { once: true });

      applyFpsCap(this.game, save.data.settings.fpsCap);
      this.scene.start('TextureGen');
    });
  }
}
