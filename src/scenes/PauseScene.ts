import Phaser from 'phaser';
import { C, hexToInt } from '../gfx/palettes';
import { pixText } from '../util/ui';
import type { SaveManager } from '../save/SaveManager';
import type { LayoutMode } from '../types';

/** In-run pause menu: resume, layout switch, toggles, quit. */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const u = Phaser.Math.Clamp(Math.round(Math.min(w, h) / 200), 2, 5);
    const save = this.registry.get('save') as SaveManager;

    this.add.rectangle(w / 2, h / 2, w, h, 0x0d0906, 0.78).setInteractive();

    const title = pixText(this, 0, 0, 'PAUSED', u + 1, hexToInt(C.spice3));
    title.setPosition(Math.round(w / 2 - title.width / 2), h * 0.14);

    const layoutLabel = (m: LayoutMode) =>
      m === 'auto' ? 'LAYOUT: AUTO' : m === 'landscape' ? 'LAYOUT: LANDSCAPE' : 'LAYOUT: GAMEBOY';

    let y = h * 0.32;
    const gap = Math.max(34, h * 0.09);

    this.makeButton(w / 2, y, 'RESUME', u, () => this.resumeGame());
    y += gap;

    const layoutBtn = this.makeButton(w / 2, y, layoutLabel(save.data.settings.layoutMode), u, () => {
      const order: LayoutMode[] = ['auto', 'landscape', 'gbc'];
      const cur = order.indexOf(save.data.settings.layoutMode);
      save.data.settings.layoutMode = order[(cur + 1) % order.length]!;
      save.save();
      layoutBtn.setText(layoutLabel(save.data.settings.layoutMode));
      layoutBtn.setX(Math.round(w / 2 - layoutBtn.width / 2));
      this.game.events.emit('relayout');
    });
    y += gap;

    const dmgBtn = this.makeButton(
      w / 2,
      y,
      `DAMAGE NUMBERS: ${save.data.settings.showDamageNumbers ? 'ON' : 'OFF'}`,
      u,
      () => {
        save.data.settings.showDamageNumbers = !save.data.settings.showDamageNumbers;
        save.save();
        dmgBtn.setText(`DAMAGE NUMBERS: ${save.data.settings.showDamageNumbers ? 'ON' : 'OFF'}`);
        dmgBtn.setX(Math.round(w / 2 - dmgBtn.width / 2));
        this.game.events.emit('dmgnumbers', save.data.settings.showDamageNumbers);
      },
    );
    y += gap;

    this.makeButton(w / 2, y, 'ABANDON RUN', u, () => {
      this.scene.stop('Game');
      this.scene.stop('Hud');
      this.scene.stop();
      this.registry.remove('run');
      this.scene.start('MainMenu');
    }, hexToInt(C.red));
  }

  private resumeGame(): void {
    this.scene.stop();
    this.scene.resume('Game');
    this.scene.resume('Hud');
  }

  private makeButton(
    cx: number,
    y: number,
    label: string,
    u: number,
    onTap: () => void,
    tint = hexToInt(C.sand5),
  ): Phaser.GameObjects.BitmapText {
    const t = pixText(this, 0, y, label, u, tint);
    t.setX(Math.round(cx - t.width / 2));
    t.setInteractive({ useHandCursor: true });
    t.on('pointerdown', () => {
      this.tweens.add({ targets: t, alpha: 0.4, duration: 60, yoyo: true });
      onTap();
    });
    return t;
  }
}
