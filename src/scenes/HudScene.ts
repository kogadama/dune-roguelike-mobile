import Phaser from 'phaser';
import { controls } from '../systems/Controls';
import { computeLayout, type LayoutInfo } from '../systems/Layout';
import { C, GBC_SHELL, hexToInt } from '../gfx/palettes';
import { pixText } from '../util/ui';
import { ATLAS } from '../gfx/AtlasBuilder';
import { ABILITIES } from '../data/abilities';
import type { AbilityDef } from '../types';
import type { RunState } from '../systems/RunState';
import type { SaveManager } from '../save/SaveManager';
import { testApi } from '../util/testHooks';

const STICK_R = 44;
const DEAD_ZONE = 0.16;

interface AbilityButton {
  x: number;
  y: number;
  r: number;
  def: AbilityDef;
  icon: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.BitmapText | null;
}

/**
 * Parallel UI scene: right-thumb floating joystick, left-thumb ability
 * buttons, bars/timer, GBC shell in portrait, pause button.
 */
export class HudScene extends Phaser.Scene {
  private layout!: LayoutInfo;
  private shell!: Phaser.GameObjects.Graphics;
  private stickG!: Phaser.GameObjects.Graphics;
  private buttonsG!: Phaser.GameObjects.Graphics;
  private bars!: Phaser.GameObjects.Graphics;
  private timerText!: Phaser.GameObjects.BitmapText;
  private killText!: Phaser.GameObjects.BitmapText;
  private levelText!: Phaser.GameObjects.BitmapText;
  private bossText!: Phaser.GameObjects.BitmapText;
  private pauseZone: { x: number; y: number; r: number } = { x: 0, y: 0, r: 0 };
  private buttons: AbilityButton[] = [];
  private movePointerId = -1;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  /** UI pixel scale (integer, from screen size). */
  private u = 2;

  constructor() {
    super('Hud');
  }

  create(): void {
    this.rebuild();
    this.scale.on('resize', this.rebuild, this);
    this.game.events.on('relayout', this.rebuild, this);
    // Overlays (Pause/LevelUp) pause this scene, swallowing the pointerup of
    // any in-flight touch; without a reset the stick stays "held" and the
    // player drifts (and the old pointer id blocks a fresh stick grab).
    this.events.on(Phaser.Scenes.Events.PAUSE, this.resetControls, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.rebuild, this);
      this.game.events.off('relayout', this.rebuild, this);
      this.events.off(Phaser.Scenes.Events.PAUSE, this.resetControls, this);
      this.resetControls();
    });

    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    this.input.on('pointerupoutside', this.onUp, this);

    const kb = this.input.keyboard;
    if (kb) {
      this.keys = {
        W: kb.addKey('W'),
        A: kb.addKey('A'),
        S: kb.addKey('S'),
        D: kb.addKey('D'),
        UP: kb.addKey('UP'),
        LEFT: kb.addKey('LEFT'),
        DOWN: kb.addKey('DOWN'),
        RIGHT: kb.addKey('RIGHT'),
        ONE: kb.addKey('ONE'),
        TWO: kb.addKey('TWO'),
        THREE: kb.addKey('THREE'),
        ESC: kb.addKey('ESC'),
      };
    }
  }

  private resetControls = (): void => {
    controls.moveX = 0;
    controls.moveY = 0;
    controls.stick.active = false;
    controls.stick.dx = 0;
    controls.stick.dy = 0;
    controls.abilityPressed[0] = false;
    controls.abilityPressed[1] = false;
    controls.abilityPressed[2] = false;
    this.movePointerId = -1;
  };

  private rebuild = (): void => {
    const save = this.registry.get('save') as SaveManager | undefined;
    const mode = save?.data.settings.layoutMode ?? 'auto';
    this.layout = computeLayout(this.scale.width, this.scale.height, mode);
    this.u = Phaser.Math.Clamp(Math.round(Math.min(this.layout.w, this.layout.h) / 200), 2, 5);

    this.children.removeAll(true);
    this.buttons = [];
    this.shell = this.add.graphics().setDepth(0);
    this.bars = this.add.graphics().setDepth(10);
    this.buttonsG = this.add.graphics().setDepth(15);
    this.stickG = this.add.graphics().setDepth(20);
    const u = this.u;
    this.timerText = pixText(this, 0, 0, '0:00', u, hexToInt(C.white)).setDepth(11);
    this.killText = pixText(this, 0, 0, '0', Math.max(1, u - 1), hexToInt(C.spice4)).setDepth(11);
    this.levelText = pixText(this, 0, 0, 'LV 1', Math.max(1, u - 1), hexToInt(C.sand5)).setDepth(11);
    this.bossText = pixText(this, 0, 0, '', Math.max(1, u - 1), hexToInt(C.red)).setDepth(11).setVisible(false);
    this.drawShell();
    this.buildAbilityButtons();
  };

  /** Static chrome: GBC shell body in portrait, minimal frame in landscape. */
  private drawShell(): void {
    const g = this.shell;
    const L = this.layout;
    g.clear();
    if (L.mode === 'gbc') {
      const bx = L.view.x - 8;
      const by = L.view.y - 8;
      const bw = L.view.w + 16;
      const bh = L.view.h + 16;
      // Shell body fills everything AROUND the screen window (the game
      // camera renders underneath this scene, so never paint over it).
      g.fillStyle(hexToInt(GBC_SHELL.body), 1);
      g.fillRect(0, 0, L.w, by); // top
      g.fillRect(0, by + bh, L.w, L.h - (by + bh)); // bottom
      g.fillRect(0, by, bx, bh); // left
      g.fillRect(bx + bw, by, L.w - (bx + bw), bh); // right
      // Bezel: thick stroke frame around the screen window.
      g.lineStyle(16, hexToInt(GBC_SHELL.screenBezel), 1);
      g.strokeRoundedRect(bx, by, bw, bh, 10);
      g.fillStyle(hexToInt(GBC_SHELL.bodyDark), 1);
      g.fillRect(0, by + bh + 6, L.w, 3);
      g.lineStyle(2, hexToInt(GBC_SHELL.bodyLight), 1);
      g.strokeRoundedRect(bx - 3, by - 3, bw + 6, bh + 6, 12);
      // Speaker grille, bottom-right corner flourish.
      g.fillStyle(hexToInt(GBC_SHELL.bodyDark), 1);
      for (let i = 0; i < 5; i++) {
        g.fillRoundedRect(L.w - 60 + i * 9, L.h - L.safe.bottom - 34 + i * 3, 4, 26 - i * 4, 2);
      }
    }
  }

  private buildAbilityButtons(): void {
    const run = this.registry.get('run') as RunState | undefined;
    if (!run) return;
    const L = this.layout;
    const u = this.u;
    // Slots come from the live AbilitySystem so the meta-capstone third
    // ability gets a touch button too (the character def only lists two).
    const gameScene = this.scene.get('Game') as import('./GameScene').GameScene | null;
    const defs = gameScene?.abilities?.slots ?? run.character.abilities.map((id) => ABILITIES[id]);
    const r = (L.mode === 'gbc' ? 34 : 30) * (u / 2.5);

    for (let i = 0; i < defs.length; i++) {
      const def = defs[i]!;
      let x: number;
      let y: number;
      if (L.mode === 'gbc') {
        // GBC-style cluster left of the shell: a zig-zag diagonal (B low,
        // A high, C low again) that also fits the third capstone slot.
        const { y: cy } = this.gbcStickCenter();
        x = L.w * 0.14 + i * r * 1.9;
        y = cy + (i % 2 === 0 ? r * 0.7 : -r * 0.7);
      } else {
        // Bottom-left arc.
        x = L.safe.left + r + 18 + i * (r * 2.4);
        y = L.h - L.safe.bottom - r - 14 - (i === 1 ? r * 1.1 : 0);
      }
      const icon = this.add.image(x, y, ATLAS, def.icon).setDepth(16).setScale(u * 0.6);
      const label =
        L.mode === 'gbc'
          ? pixText(this, x - 2, y + r + 4, ['B', 'A', 'C'][i] ?? '', 1, hexToInt(GBC_SHELL.text)).setDepth(16)
          : null;
      this.buttons.push({ x, y, r, def, icon, label });
    }

    testApi.buttons = this.buttons.map((b) => ({ x: b.x, y: b.y }));

    // Pause button: START pill on the shell in GBC mode, top-right circle in
    // landscape. Both give a >=48px tap circle (hit test adds +8).
    if (L.mode === 'gbc') {
      const { y: cy } = this.gbcStickCenter();
      this.pauseZone = { x: L.w * 0.55, y: cy, r: Math.max(16, u * 8) };
      const startLabel = pixText(this, 0, 0, 'START', 1, hexToInt(GBC_SHELL.text)).setDepth(16);
      startLabel.setPosition(
        Math.round(this.pauseZone.x - startLabel.width / 2),
        Math.round(this.pauseZone.y + Math.max(9, u * 4) / 2 + 4),
      );
    } else {
      const pr = Math.max(16, u * 8);
      this.pauseZone = { x: L.w - L.safe.right - pr - 10, y: L.safe.top + pr + 10, r: pr };
    }
    testApi.pauseButton = { x: this.pauseZone.x, y: this.pauseZone.y };
  }

  // ---- Touch input ----

  private inMoveZone(x: number): boolean {
    return x > this.layout.w * 0.45;
  }

  private controlAreaY(): number {
    return this.layout.mode === 'gbc'
      ? this.layout.view.y + this.layout.view.h + 8
      : this.layout.safe.top;
  }

  private onDown(p: Phaser.Input.Pointer): void {
    // Pause button?
    const pz = this.pauseZone;
    if (Math.hypot(p.x - pz.x, p.y - pz.y) < pz.r + 8) {
      this.openPause();
      return;
    }
    // Ability buttons (left thumb).
    for (let i = 0; i < this.buttons.length; i++) {
      const b = this.buttons[i]!;
      if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + 6) {
        controls.abilityPressed[i as 0 | 1 | 2] = true;
        return;
      }
    }
    // Movement stick (right thumb).
    if (this.movePointerId === -1 && this.inMoveZone(p.x) && p.y > this.controlAreaY()) {
      this.movePointerId = p.id;
      controls.stick.active = true;
      if (this.layout.mode === 'gbc') {
        // Fixed stick well: joystick centered on the well, thumb offsets from it.
        const c = this.gbcStickCenter();
        controls.stick.originX = c.x;
        controls.stick.originY = c.y;
        this.onMove(p);
      } else {
        controls.stick.originX = p.x;
        controls.stick.originY = p.y;
      }
      controls.stick.dx = 0;
      controls.stick.dy = 0;
    }
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id !== this.movePointerId) return;
    const dx = p.x - controls.stick.originX;
    const dy = p.y - controls.stick.originY;
    const len = Math.hypot(dx, dy);
    const r = STICK_R * (this.u / 2);
    const cl = Math.min(len, r);
    const nx = len > 0 ? (dx / len) * cl : 0;
    const ny = len > 0 ? (dy / len) * cl : 0;
    controls.stick.dx = nx;
    controls.stick.dy = ny;
    const mag = cl / r;
    if (mag < DEAD_ZONE) {
      controls.moveX = 0;
      controls.moveY = 0;
    } else {
      const m = (mag - DEAD_ZONE) / (1 - DEAD_ZONE);
      controls.moveX = (nx / cl) * m;
      controls.moveY = (ny / cl) * m;
    }
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id === this.movePointerId) {
      this.movePointerId = -1;
      controls.moveX = 0;
      controls.moveY = 0;
      controls.stick.active = false;
    }
  }

  private openPause(): void {
    if (this.scene.isPaused('Game')) return;
    this.scene.pause('Game');
    this.scene.pause();
    // Explicit data: Phaser keeps a scene's previous settings.data when
    // launched without any, so a stale {fromMenu:true} from the main-menu
    // settings screen would otherwise hide RESUME/ABANDON here.
    this.scene.launch('Pause', { fromMenu: false });
  }

  override update(): void {
    this.updateKeyboard();
    this.drawStick();
    this.drawButtons();
    this.drawBars();
  }

  private updateKeyboard(): void {
    if (!this.keys) return;
    const k = this.keys;
    if (Phaser.Input.Keyboard.JustDown(k.ONE!)) controls.abilityPressed[0] = true;
    if (Phaser.Input.Keyboard.JustDown(k.TWO!)) controls.abilityPressed[1] = true;
    if (Phaser.Input.Keyboard.JustDown(k.THREE!)) controls.abilityPressed[2] = true;
    if (Phaser.Input.Keyboard.JustDown(k.ESC!)) {
      this.openPause();
      return;
    }
    if (controls.stick.active) return;
    let x = 0;
    let y = 0;
    if (k.A!.isDown || k.LEFT!.isDown) x -= 1;
    if (k.D!.isDown || k.RIGHT!.isDown) x += 1;
    if (k.W!.isDown || k.UP!.isDown) y -= 1;
    if (k.S!.isDown || k.DOWN!.isDown) y += 1;
    if (x !== 0 || y !== 0) {
      const len = Math.hypot(x, y);
      controls.moveX = x / len;
      controls.moveY = y / len;
    } else {
      controls.moveX = 0;
      controls.moveY = 0;
    }
  }

  private drawStick(): void {
    const g = this.stickG;
    g.clear();
    const s = controls.stick;
    const r = STICK_R * (this.u / 2);
    if (this.layout.mode === 'gbc') {
      const { x, y } = this.gbcStickCenter();
      g.fillStyle(hexToInt(GBC_SHELL.buttonShadow), 1);
      g.fillCircle(x, y + 3, r * 1.05);
      g.fillStyle(hexToInt(GBC_SHELL.bodyDark), 1);
      g.fillCircle(x, y, r * 1.05);
      const kx = x + (s.active ? s.dx : 0);
      const ky = y + (s.active ? s.dy : 0);
      g.fillStyle(hexToInt(GBC_SHELL.screenBezel), 1);
      g.fillCircle(kx, ky + 2, r * 0.5);
      g.fillStyle(hexToInt('#3a2c20'), 1);
      g.fillCircle(kx, ky, r * 0.5);
      g.fillStyle(hexToInt('#4a3828'), 1);
      g.fillCircle(kx - r * 0.12, ky - r * 0.14, r * 0.3);
    } else if (s.active) {
      g.lineStyle(2, hexToInt(C.sand5), 0.5);
      g.strokeCircle(s.originX, s.originY, r);
      g.fillStyle(hexToInt(C.sand5), 0.22);
      g.fillCircle(s.originX, s.originY, r);
      g.fillStyle(hexToInt(C.spice3), 0.85);
      g.fillCircle(s.originX + s.dx, s.originY + s.dy, r * 0.4);
    }
  }

  private drawButtons(): void {
    const run = this.registry.get('run') as RunState | undefined;
    const g = this.buttonsG;
    g.clear();
    if (!run) return;
    if (this.buttons.length === 0) this.buildAbilityButtons();
    const gbc = this.layout.mode === 'gbc';

    for (let i = 0; i < this.buttons.length; i++) {
      const b = this.buttons[i]!;
      const cd = run.abilityCooldowns[i] ?? 0;
      const total = b.def.cooldown;
      const ready = cd <= 0;

      // Base.
      if (gbc) {
        g.fillStyle(hexToInt(GBC_SHELL.buttonShadow), 1);
        g.fillCircle(b.x, b.y + 3, b.r);
        g.fillStyle(ready ? b.def.color : hexToInt(GBC_SHELL.bodyDark), 1);
        g.fillCircle(b.x, b.y, b.r);
      } else {
        g.fillStyle(0x0d0906, ready ? 0.55 : 0.75);
        g.fillCircle(b.x, b.y, b.r);
        g.lineStyle(2, ready ? b.def.color : 0x666666, ready ? 1 : 0.5);
        g.strokeCircle(b.x, b.y, b.r);
      }

      // Cooldown wipe (pie from 12 o'clock).
      if (!ready) {
        const frac = cd / total;
        g.fillStyle(0x000000, 0.6);
        g.slice(b.x, b.y, b.r - (gbc ? 0 : 2), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac, false);
        g.fillPath();
      } else if (!gbc) {
        g.fillStyle(b.def.color, 0.18);
        g.fillCircle(b.x, b.y, b.r - 2);
      }
      b.icon.setAlpha(ready ? 1 : 0.45);
    }
  }

  private gbcStickCenter(): { x: number; y: number } {
    const L = this.layout;
    const cy = (L.view.y + L.view.h + (L.h - L.safe.bottom)) / 2 + 12;
    return { x: L.w * 0.76, y: cy };
  }

  private drawBars(): void {
    const run = this.registry.get('run') as RunState | undefined;
    const g = this.bars;
    g.clear();
    if (!run) {
      this.timerText.setVisible(false);
      this.killText.setVisible(false);
      this.levelText.setVisible(false);
      return;
    }
    const L = this.layout;
    const u = this.u;

    const topY = L.mode === 'gbc' ? L.view.y - 6 : L.safe.top + 4;
    const barX = L.mode === 'gbc' ? L.view.x : L.safe.left + 8;
    const barW = L.mode === 'gbc' ? L.view.w : Math.min(L.w * 0.34, 320);

    const hpH = 3 * u - 2;
    g.fillStyle(0x000000, 0.55);
    g.fillRect(barX, topY, barW, hpH);
    const hpFrac = Phaser.Math.Clamp(run.hp / run.stats.maxHp, 0, 1);
    g.fillStyle(hpFrac > 0.35 ? hexToInt(C.green) : hexToInt(C.red), 0.95);
    g.fillRect(barX + 1, topY + 1, (barW - 2) * hpFrac, hpH - 2);

    const xpY = topY + hpH + 2;
    g.fillStyle(0x000000, 0.55);
    g.fillRect(barX, xpY, barW, u + 1);
    g.fillStyle(hexToInt(C.blue), 0.9);
    g.fillRect(barX + 1, xpY + 1, (barW - 2) * Phaser.Math.Clamp(run.xp / run.xpNeeded, 0, 1), u - 1);

    // Pause button.
    const pz = this.pauseZone;
    if (L.mode === 'gbc') {
      // START pill on the shell, GBC style.
      const pw = Math.max(30, u * 15);
      const ph = Math.max(9, u * 4);
      g.fillStyle(hexToInt(GBC_SHELL.buttonShadow), 1);
      g.fillRoundedRect(pz.x - pw / 2, pz.y - ph / 2 + 2, pw, ph, ph / 2);
      g.fillStyle(hexToInt(GBC_SHELL.bodyDark), 1);
      g.fillRoundedRect(pz.x - pw / 2, pz.y - ph / 2, pw, ph, ph / 2);
    } else {
      g.fillStyle(0x0d0906, 0.45);
      g.fillCircle(pz.x, pz.y, pz.r);
      g.lineStyle(2, 0xffffff, 0.3);
      g.strokeCircle(pz.x, pz.y, pz.r);
      const pbw = Math.max(4, Math.round(u * 2));
      const pbh = Math.max(12, Math.round(u * 6));
      const pgap = Math.max(3, Math.round(u * 1.5));
      g.fillStyle(0xffffff, 0.75);
      g.fillRect(pz.x - pgap / 2 - pbw, pz.y - pbh / 2, pbw, pbh);
      g.fillRect(pz.x + pgap / 2, pz.y - pbh / 2, pbw, pbh);
    }

    const mins = Math.floor(run.time / 60);
    const secs = Math.floor(run.time % 60);
    this.timerText.setVisible(true).setText(`${mins}:${secs.toString().padStart(2, '0')}`);
    const timerX = L.mode === 'gbc' ? L.view.x + L.view.w / 2 : L.w / 2;
    this.timerText.setPosition(Math.round(timerX - this.timerText.width / 2), topY);

    this.levelText.setVisible(true).setText(`LV ${run.level}`);
    this.levelText.setPosition(barX + barW + 6, topY);

    this.killText.setVisible(true).setText(`${run.kills}`);
    // Landscape: sit left of the pause button so they never overlap.
    const killX = L.mode === 'gbc'
      ? L.view.x + L.view.w - this.killText.width
      : L.w - L.safe.right - pz.r * 2 - 24 - this.killText.width;
    this.killText.setPosition(killX, topY + hpH + 4 + u);

    // Boss health bar during boss fights.
    if (run.bossActive && !run.bossDefeated) {
      const gameScene = this.scene.get('Game') as import('./GameScene').GameScene;
      const boss = gameScene.enemies?.enemies.find((e) => e.active && e.def.behavior === 'boss');
      if (boss) {
        const bw = L.mode === 'gbc' ? L.view.w * 0.9 : L.w * 0.5;
        const bx = (L.mode === 'gbc' ? L.view.x + L.view.w / 2 : L.w / 2) - bw / 2;
        const by = L.mode === 'gbc' ? L.view.y + L.view.h - 14 : L.h - L.safe.bottom - 18;
        g.fillStyle(0x000000, 0.6);
        g.fillRect(bx, by, bw, 6);
        g.fillStyle(hexToInt(C.red), 0.95);
        g.fillRect(bx + 1, by + 1, (bw - 2) * Phaser.Math.Clamp(boss.hp / boss.maxHp, 0, 1), 4);
        this.bossText.setVisible(true).setText(boss.def.name);
        this.bossText.setPosition(Math.round(bx + bw / 2 - this.bossText.width / 2), by - this.bossText.height - 2);
      }
    } else {
      this.bossText.setVisible(false);
    }
  }
}
