import Phaser from 'phaser';
import { C, hexToInt } from '../gfx/palettes';
import { centerPixText, textButton, uiBounds, type TextButton } from '../util/ui';
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
    this.scale.on('resize', this.onResize, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.onResize, this));
    // Dim layer goes full-bleed; content stays inside the safe area.
    const fullW = this.scale.width;
    const fullH = this.scale.height;
    const B = uiBounds(this);
    const ox = B.x;
    const oy = B.y;
    const w = B.w;
    const h = B.h;
    const portrait = h > w;
    const u = Phaser.Math.Clamp(Math.round(Math.min(w, h) / 200), 2, 5);
    const save = this.registry.get('save') as SaveManager;
    const cx = ox + w / 2;

    this.add.rectangle(fullW / 2, fullH / 2, fullW, fullH, 0x0d0906, this.fromMenu ? 1 : 0.78).setInteractive();

    centerPixText(this, cx, oy + h * 0.08, this.fromMenu ? 'SETTINGS' : 'PAUSED', u + 1, hexToInt(C.spice3));

    const vol = (v: number) => `${Math.round(v * 100)}%`;
    // Snap to the 0/25/50/75/100 grid — the 0.8/0.5 defaults land on it after one tap.
    const nextVol = (v: number) => ((Math.round(v * 4) + 1) % 5) / 4;
    const layoutLabel = (m: LayoutMode) =>
      m === 'auto' ? 'LAYOUT: AUTO' : m === 'landscape' ? 'LAYOUT: LANDSCAPE' : 'LAYOUT: GAMEBOY';

    const s = save.data.settings;

    // Settings rows: label() re-evaluated after every tap to refresh the text
    // (and, via TextButton.setLabel, the hit area — a plain setText would
    // leave the old hit rect behind).
    const rows: Array<{ label: () => string; onTap: () => void }> = [
      {
        label: () => layoutLabel(s.layoutMode),
        onTap: () => {
          const order: LayoutMode[] = ['auto', 'landscape', 'gbc'];
          s.layoutMode = order[(order.indexOf(s.layoutMode) + 1) % order.length]!;
          save.save();
          this.game.events.emit('relayout');
        },
      },
      {
        label: () => `SFX: ${vol(s.sfxVolume)}`,
        onTap: () => {
          s.sfxVolume = nextVol(s.sfxVolume);
          sfx.volume = s.sfxVolume;
          save.save();
        },
      },
      {
        label: () => `MUSIC: ${vol(s.musicVolume)}`,
        onTap: () => {
          s.musicVolume = nextVol(s.musicVolume);
          music.setVolume(s.musicVolume);
          save.save();
        },
      },
      {
        label: () => `FPS CAP: ${s.fpsCap}`,
        onTap: () => {
          s.fpsCap = s.fpsCap === 60 ? 30 : 60;
          applyFpsCap(this.game, s.fpsCap);
          save.save();
        },
      },
      {
        label: () => `BATTERY SAVER: ${s.batterySaver ? 'ON' : 'OFF'}`,
        onTap: () => {
          s.batterySaver = !s.batterySaver;
          save.save();
          this.game.events.emit('batterysaver', s.batterySaver);
        },
      },
      {
        label: () => `DAMAGE NUMBERS: ${s.showDamageNumbers ? 'ON' : 'OFF'}`,
        onTap: () => {
          s.showDamageNumbers = !s.showDamageNumbers;
          save.save();
          this.game.events.emit('dmgnumbers', s.showDamageNumbers);
        },
      },
      {
        label: () => `HAPTICS: ${s.haptics ? 'ON' : 'OFF'}`,
        onTap: () => {
          s.haptics = !s.haptics;
          setHapticsEnabled(s.haptics);
          save.save();
        },
      },
    ];

    // Geometry: single column in portrait; two columns in landscape so the
    // >=44px touch targets fit the short axis without overlapping.
    const rowGap = portrait ? Math.max(52, Math.round(h * 0.08)) : Math.max(46, Math.round(h * 0.125));
    let y = oy + h * (portrait ? 0.2 : 0.22);

    if (!this.fromMenu) {
      textButton(this, cx, y, 'RESUME', u, hexToInt(C.green), () => this.resumeGame(), { frame: true });
      y += rowGap;
    }

    const addRow = (row: { label: () => string; onTap: () => void }, rx: number, ry: number): void => {
      const btn: TextButton = textButton(this, rx, ry, row.label(), u, hexToInt(C.sand5), () => {
        row.onTap();
        btn.setLabel(row.label());
      });
    };

    if (portrait) {
      for (const row of rows) {
        addRow(row, cx, y);
        y += rowGap;
      }
    } else {
      const colX = [ox + w * 0.27, ox + w * 0.73];
      rows.forEach((row, i) => {
        addRow(row, colX[i % 2]!, y + Math.floor(i / 2) * rowGap);
      });
      y += Math.ceil(rows.length / 2) * rowGap;
    }

    y += rowGap * 0.15;
    if (this.fromMenu) {
      textButton(this, cx, y, 'BACK', u, hexToInt(C.sand5), () => this.scene.start('MainMenu'), { frame: true });
    } else {
      textButton(this, cx, y, 'ABANDON RUN', u, hexToInt(C.red), () => {
        this.scene.stop('Game');
        this.scene.stop('Hud');
        this.scene.stop();
        this.registry.remove('run');
        this.scene.start('MainMenu');
      });
    }
  }

  private onResize = (): void => {
    this.scene.restart({ fromMenu: this.fromMenu });
  };

  private resumeGame(): void {
    this.scene.stop();
    this.scene.resume('Game');
    this.scene.resume('Hud');
  }
}
