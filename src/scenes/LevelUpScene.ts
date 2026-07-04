import Phaser from 'phaser';
import type { UpgradeOption } from '../types';
import { applyUpgrade } from '../data/upgrades';
import type { RunState } from '../systems/RunState';
import { ATLAS } from '../gfx/AtlasBuilder';
import { C, hexToInt } from '../gfx/palettes';
import { pixText } from '../util/ui';
import { sfx } from '../audio/index';

export interface LevelUpData {
  options: UpgradeOption[];
  /** 'levelup' or 'chest' (evolution reward). */
  reason: 'levelup' | 'chest';
}

/** Pick-1-of-3 overlay. Pauses Game+Hud while open. */
export class LevelUpScene extends Phaser.Scene {
  constructor() {
    super('LevelUp');
  }

  create(data: LevelUpData): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const run = this.registry.get('run') as RunState;
    const portrait = h > w;
    const u = Phaser.Math.Clamp(Math.round(Math.min(w, h) / 200), 2, 5);

    const dim = this.add.rectangle(w / 2, h / 2, w, h, 0x0d0906, 0.72);
    dim.setInteractive(); // block tap-through

    const title = data.reason === 'chest' ? 'SPOILS OF WAR' : `LEVEL ${run.level}`;
    const t = pixText(this, 0, 0, title, u + 1, hexToInt(C.spice3));
    t.setPosition(Math.round(w / 2 - t.width / 2), Math.round(h * (portrait ? 0.16 : 0.1)));

    const sub = pixText(this, 0, 0, 'CHOOSE YOUR PATH', u - 1, hexToInt(C.sand4));
    sub.setPosition(Math.round(w / 2 - sub.width / 2), t.y + t.height + 6);

    // Card geometry.
    const n = data.options.length;
    const cardW = portrait ? Math.min(w * 0.86, 420) : Math.min(w * 0.27, 300);
    const cardH = portrait ? Math.min(h * 0.16, 130) : Math.min(h * 0.42, 260);
    const gap = portrait ? 12 : Math.min(w * 0.02, 20);

    for (let i = 0; i < n; i++) {
      const cx = portrait ? w / 2 : w / 2 + (i - (n - 1) / 2) * (cardW + gap);
      const cy = portrait ? h * 0.36 + i * (cardH + gap) : h * 0.58;
      this.makeCard(cx, cy, cardW, cardH, data.options[i]!, u, portrait, i);
    }
  }

  private makeCard(
    cx: number,
    cy: number,
    cw: number,
    ch: number,
    opt: UpgradeOption,
    u: number,
    portrait: boolean,
    index: number,
  ): void {
    const run = this.registry.get('run') as RunState;
    const container = this.add.container(cx, cy);

    const g = this.add.graphics();
    g.fillStyle(hexToInt(C.sand0), 0.97);
    g.fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 8);
    g.lineStyle(2, hexToInt(opt.kind === 'weaponNew' ? C.spice3 : opt.kind === 'passive' ? C.blue : C.sand3), 1);
    g.strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 8);
    container.add(g);

    const icon = this.add.image(0, 0, ATLAS, opt.icon).setScale(u);
    const title = pixText(this, 0, 0, opt.title, u - 1, hexToInt(C.sand5));
    const desc = pixText(this, 0, 0, this.wrap(opt.desc, portrait ? 30 : 18), u >= 3 ? u - 2 : 1, hexToInt(C.sand4));
    desc.setMaxWidth(cw - 20);

    if (portrait) {
      icon.setPosition(-cw / 2 + 28, 0);
      title.setPosition(-cw / 2 + 52, -ch / 2 + 12);
      desc.setPosition(-cw / 2 + 52, -ch / 2 + 12 + title.height + 6);
    } else {
      icon.setPosition(0, -ch / 2 + 40);
      title.setPosition(Math.round(-title.width / 2), -ch / 2 + 74);
      desc.setPosition(Math.round(-desc.width / 2), -ch / 2 + 74 + title.height + 8);
    }
    container.add([icon, title, desc]);

    container.setSize(cw, ch);
    container.setInteractive({ useHandCursor: true });
    container.setAlpha(0);
    container.y += 14;
    this.tweens.add({ targets: container, alpha: 1, y: cy, duration: 200, delay: 80 + index * 70, ease: 'Cubic.Out' });

    // Debounce so a joystick drag release can't instantly pick a card.
    this.time.delayedCall(350, () => {
      container.on('pointerdown', () => {
        sfx.play('click');
        applyUpgrade(run, opt);
        this.scene.stop();
        this.scene.resume('Game');
        this.scene.resume('Hud');
      });
    });
  }

  private wrap(s: string, width: number): string {
    const words = s.split(' ');
    let line = '';
    let out = '';
    for (const word of words) {
      if (line.length + word.length + 1 > width) {
        out += line + '\n';
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    return out + line;
  }
}
