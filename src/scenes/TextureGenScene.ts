import Phaser from 'phaser';
import { buildAtlas } from '../gfx/AtlasBuilder';
import { TEST_PARAMS } from '../config';
import { testApi } from '../util/testHooks';

/** Generates the runtime atlas + font, then routes to menu or autostart. */
export class TextureGenScene extends Phaser.Scene {
  constructor() {
    super('TextureGen');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#120a05');

    // Atlas gen takes well under a second — no progress UI needed, but keep
    // the frame alive so a slow device still paints the background first.
    this.time.delayedCall(0, () => {
      buildAtlas(this);
      testApi.ready = true;
      if (TEST_PARAMS.autostart) {
        this.scene.start('Game', {
          characterId: TEST_PARAMS.autostart.character,
          mapId: TEST_PARAMS.autostart.map,
        });
      } else {
        this.scene.start('MainMenu');
      }
    });
  }
}
