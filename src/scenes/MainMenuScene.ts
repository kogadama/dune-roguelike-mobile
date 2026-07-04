import Phaser from 'phaser';
import { VIRTUAL_HEIGHT } from '../config';
import { ATLAS } from '../gfx/AtlasBuilder';
import { C, hexToInt } from '../gfx/palettes';
import { centerPixText, pixText } from '../util/ui';
import { music, sfx } from '../audio/index';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#120a05');
    music.play('menu');
    this.layout();
    this.scale.on('resize', () => this.layout());
  }

  private layout(): void {
    this.children.removeAll(true);
    const cam = this.cameras.main;
    const zoom = Math.max(1, this.scale.height / VIRTUAL_HEIGHT);
    cam.setZoom(zoom);
    const vw = this.scale.width / zoom;
    const vh = VIRTUAL_HEIGHT;
    cam.centerOn(vw / 2, vh / 2);

    // Dune horizon backdrop.
    const g = this.add.graphics();
    g.fillStyle(hexToInt(C.sand1), 1);
    g.fillRect(0, vh * 0.62, vw, vh * 0.38);
    g.fillStyle(hexToInt(C.sand2), 1);
    g.fillRect(0, vh * 0.7, vw, vh * 0.3);
    g.fillStyle(hexToInt(C.spice2), 1);
    g.fillCircle(vw * 0.72, vh * 0.5, 26); // low sun
    g.fillStyle(hexToInt(C.spice3), 1);
    g.fillCircle(vw * 0.72, vh * 0.5, 22);

    centerPixText(this, vw / 2, vh * 0.24, 'SIETCH', 6, hexToInt(C.spice3));
    centerPixText(this, vw / 2, vh * 0.4, 'SURVIVORS', 4, hexToInt(C.sand5));
    centerPixText(this, vw / 2, vh * 0.58, 'A DUNE ROGUELITE', 1, hexToInt(C.sand4));

    const prompt = centerPixText(this, vw / 2, vh * 0.78, 'TAP TO BEGIN', 2, hexToInt(C.white));
    this.tweens.add({ targets: prompt, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 });

    const paul = this.add.image(vw / 2, vh * 0.68, ATLAS, 'char_paul');
    paul.setScale(2);

    const settings = pixText(this, 8, 8, 'SETTINGS', 1, hexToInt(C.sand4));
    settings.setInteractive({ useHandCursor: true });
    settings.on('pointerdown', (p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
      sfx.play('click');
      this.scene.start('Pause', { fromMenu: true });
      void p;
    });

    this.input.once('pointerdown', () => {
      sfx.play('click');
      this.scene.start('CharacterSelect');
    });
  }
}
