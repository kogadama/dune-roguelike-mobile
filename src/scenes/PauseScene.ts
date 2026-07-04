import Phaser from 'phaser';
import { C, hexToInt } from '../gfx/palettes';
import { pixText } from '../util/ui';
import type { SaveManager } from '../save/SaveManager';
import type { LayoutMode } from '../types';
import { sfx, music } from '../audio/index';
import { applyFpsCap } from '../util/fps';
import { setHapticsEnabled } from '../util/haptics';

export interface PauseData {
  fromMenu?: boolean;
}

/** Pause menu + settings. Doubles as the settings screen from the main menu. */
export class PauseScene extends Phaser.Scene {
  private fromMenu = false;

  constructor() {
    super('Pause');
  }

  create(data: PauseData): void {
    this.fromMenu = data.fromMenu ?? false;
    const w = this.scale.width;
    const h = this.scale.height;
    const u = Phaser.Math.Clamp(Math.round(Math.min(w, h) / 200), 2, 5);
    const save = this.registry.get('save') as SaveManager;

    this.add.rectangle(w / 2, h / 2, w, h, 0x0d0906, this.fromMenu ? 1 : 0.78).setInteractive();

    const title = pixText(this, 0, 0, this.fromMenu ? 'SETTINGS' : 'PAUSED', u + 1, hexToInt(C.spice3));
    title.setPosition(Math.round(w / 2 - title.width / 2), h * 0.08);

    const vol = (v: number) => `${Math.round(v * 100)}%`;
    const layoutLabel = (m: LayoutMode) =>
      m === 'auto' ? 'LAYOUT: AUTO' : m === 'landscape' ? 'LAYOUT: LANDSCAPE' : 'LAYOUT: GAMEBOY';

    let y = h * 0.22;
    const gap = Math.max(26, h * 0.075);
    const s = save.data.settings;

    if (!this.fromMenu) {
      this.makeButton(w / 2, y, 'RESUME', u, () => this.resumeGame(), hexToInt(C.green));
      y += gap * 1.2;
    }

    const layoutBtn = this.makeButton(w / 2, y, layoutLabel(s.layoutMode), u, () => {
      const order: LayoutMode[] = ['auto', 'landscape', 'gbc'];
      s.layoutMode = order[(order.indexOf(s.layoutMode) + 1) % order.length]!;
      save.save();
      this.relabel(layoutBtn, layoutLabel(s.layoutMode));
      this.game.events.emit('relayout');
    });
    y += gap;

    const sfxBtn = this.makeButton(w / 2, y, `SFX: ${vol(s.sfxVolume)}`, u, () => {
      s.sfxVolume = Math.round(((s.sfxVolume + 0.25) % 1.25) * 100) / 100;
      sfx.volume = s.sfxVolume;
      save.save();
      this.relabel(sfxBtn, `SFX: ${vol(s.sfxVolume)}`);
    });
    y += gap;

    const musBtn = this.makeButton(w / 2, y, `MUSIC: ${vol(s.musicVolume)}`, u, () => {
      s.musicVolume = Math.round(((s.musicVolume + 0.25) % 1.25) * 100) / 100;
      music.setVolume(s.musicVolume);
      save.save();
      this.relabel(musBtn, `MUSIC: ${vol(s.musicVolume)}`);
    });
    y += gap;

    const fpsBtn = this.makeButton(w / 2, y, `FPS CAP: ${s.fpsCap}`, u, () => {
      s.fpsCap = s.fpsCap === 60 ? 30 : 60;
      applyFpsCap(this.game, s.fpsCap);
      save.save();
      this.relabel(fpsBtn, `FPS CAP: ${s.fpsCap}`);
    });
    y += gap;

    const batBtn = this.makeButton(w / 2, y, `BATTERY SAVER: ${s.batterySaver ? 'ON' : 'OFF'}`, u, () => {
      s.batterySaver = !s.batterySaver;
      save.save();
      this.relabel(batBtn, `BATTERY SAVER: ${s.batterySaver ? 'ON' : 'OFF'}`);
      this.game.events.emit('batterysaver', s.batterySaver);
    });
    y += gap;

    const dmgBtn = this.makeButton(w / 2, y, `DAMAGE NUMBERS: ${s.showDamageNumbers ? 'ON' : 'OFF'}`, u, () => {
      s.showDamageNumbers = !s.showDamageNumbers;
      save.save();
      this.relabel(dmgBtn, `DAMAGE NUMBERS: ${s.showDamageNumbers ? 'ON' : 'OFF'}`);
      this.game.events.emit('dmgnumbers', s.showDamageNumbers);
    });
    y += gap;

    const hapBtn = this.makeButton(w / 2, y, `HAPTICS: ${s.haptics ? 'ON' : 'OFF'}`, u, () => {
      s.haptics = !s.haptics;
      setHapticsEnabled(s.haptics);
      save.save();
      this.relabel(hapBtn, `HAPTICS: ${s.haptics ? 'ON' : 'OFF'}`);
    });
    y += gap * 1.1;

    if (this.fromMenu) {
      this.makeButton(w / 2, y, 'BACK', u, () => this.scene.start('MainMenu'));
    } else {
      this.makeButton(w / 2, y, 'ABANDON RUN', u, () => {
        this.scene.stop('Game');
        this.scene.stop('Hud');
        this.scene.stop();
        this.registry.remove('run');
        this.scene.start('MainMenu');
      }, hexToInt(C.red));
    }
  }

  private relabel(t: Phaser.GameObjects.BitmapText, label: string): void {
    t.setText(label);
    t.setX(Math.round(this.scale.width / 2 - t.width / 2));
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
      sfx.play('click');
      this.tweens.add({ targets: t, alpha: 0.4, duration: 60, yoyo: true });
      onTap();
    });
    return t;
  }
}
