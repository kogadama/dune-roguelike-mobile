import Phaser from 'phaser';
import { controls } from '../systems/Controls';
import { computeLayout, type LayoutInfo } from '../systems/Layout';
import { C, GBC_SHELL, hexToInt } from '../gfx/palettes';
import { pixText } from '../util/ui';
import type { RunState } from '../systems/RunState';
import type { SaveManager } from '../save/SaveManager';

const STICK_R = 44;
const DEAD_ZONE = 0.16;

/**
 * Parallel UI scene: right-thumb floating joystick, left-thumb ability
 * buttons, bars/timer, and the GBC shell in portrait mode.
 */
export class HudScene extends Phaser.Scene {
  private layout!: LayoutInfo;
  private shell!: Phaser.GameObjects.Graphics;
  private stickG!: Phaser.GameObjects.Graphics;
  private bars!: Phaser.GameObjects.Graphics;
  private timerText!: Phaser.GameObjects.BitmapText;
  private killText!: Phaser.GameObjects.BitmapText;
  private levelText!: Phaser.GameObjects.BitmapText;
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
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.rebuild, this);
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
      };
    }
  }

  private resetControls(): void {
    controls.moveX = 0;
    controls.moveY = 0;
    controls.stick.active = false;
    this.movePointerId = -1;
  }

  private rebuild = (): void => {
    const save = this.registry.get('save') as SaveManager | undefined;
    const mode = save?.data.settings.layoutMode ?? 'auto';
    this.layout = computeLayout(this.scale.width, this.scale.height, mode);
    this.u = Phaser.Math.Clamp(Math.round(Math.min(this.layout.w, this.layout.h) / 200), 2, 5);

    this.children.removeAll(true);
    this.shell = this.add.graphics().setDepth(0);
    this.bars = this.add.graphics().setDepth(10);
    this.stickG = this.add.graphics().setDepth(20);
    const u = this.u;
    this.timerText = pixText(this, 0, 0, '0:00', u, hexToInt(C.white)).setDepth(11);
    this.killText = pixText(this, 0, 0, '0', u - 1, hexToInt(C.spice4)).setDepth(11);
    this.levelText = pixText(this, 0, 0, 'LV 1', u - 1, hexToInt(C.sand5)).setDepth(11);
    this.drawShell();
  };

  /** Static chrome: GBC shell body in portrait, minimal frame in landscape. */
  private drawShell(): void {
    const g = this.shell;
    const L = this.layout;
    g.clear();
    if (L.mode === 'gbc') {
      // Shell body fills everything outside the screen window.
      g.fillStyle(hexToInt(GBC_SHELL.body), 1);
      g.fillRect(0, 0, L.w, L.h);
      // Screen bezel.
      const bx = L.view.x - 8;
      const by = L.view.y - 8;
      const bw = L.view.w + 16;
      const bh = L.view.h + 16;
      g.fillStyle(hexToInt(GBC_SHELL.screenBezel), 1);
      g.fillRoundedRect(bx, by, bw, bh, 10);
      // Cut the actual screen hole (drawn under the game camera viewport).
      g.fillStyle(0x000000, 1);
      g.fillRect(L.view.x, L.view.y, L.view.w, L.view.h);
      // Shell shading details.
      g.fillStyle(hexToInt(GBC_SHELL.bodyDark), 1);
      g.fillRect(0, by + bh + 6, L.w, 3);
      g.lineStyle(2, hexToInt(GBC_SHELL.bodyLight), 1);
      g.strokeRoundedRect(bx - 2, by - 2, bw + 4, bh + 4, 12);
    }
  }

  // ---- Touch input ----

  private inMoveZone(x: number): boolean {
    // Right half moves; in GBC mode only the shell area below the screen.
    return x > this.layout.w * 0.45;
  }

  private controlAreaY(): number {
    return this.layout.mode === 'gbc'
      ? this.layout.view.y + this.layout.view.h + 16
      : this.layout.safe.top;
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (this.movePointerId === -1 && this.inMoveZone(p.x) && p.y > this.controlAreaY()) {
      this.movePointerId = p.id;
      controls.stick.active = true;
      controls.stick.originX = p.x;
      controls.stick.originY = p.y;
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

  override update(): void {
    this.updateKeyboard();
    this.drawStick();
    this.drawBars();
  }

  private updateKeyboard(): void {
    if (!this.keys || controls.stick.active) return;
    const k = this.keys;
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
    } else if (!controls.stick.active) {
      controls.moveX = 0;
      controls.moveY = 0;
    }
  }

  private drawStick(): void {
    const g = this.stickG;
    g.clear();
    const s = controls.stick;
    const r = STICK_R * (this.u / 2);
    if (s.active) {
      g.lineStyle(2, hexToInt(C.sand5), 0.5);
      g.strokeCircle(s.originX, s.originY, r);
      g.fillStyle(hexToInt(C.sand5), 0.25);
      g.fillCircle(s.originX, s.originY, r);
      g.fillStyle(hexToInt(C.spice3), 0.85);
      g.fillCircle(s.originX + s.dx, s.originY + s.dy, r * 0.4);
    } else if (this.layout.mode === 'gbc') {
      // Fixed stick well on the shell, right side.
      const { x, y } = this.gbcStickCenter();
      g.fillStyle(hexToInt(GBC_SHELL.buttonShadow), 1);
      g.fillCircle(x, y + 2, r * 0.9);
      g.fillStyle(hexToInt(GBC_SHELL.bodyDark), 1);
      g.fillCircle(x, y, r * 0.9);
      g.fillStyle(hexToInt(GBC_SHELL.screenBezel), 1);
      g.fillCircle(x, y, r * 0.45);
    }
  }

  private gbcStickCenter(): { x: number; y: number } {
    const L = this.layout;
    const cy = (L.view.y + L.view.h + L.h - L.safe.bottom) / 2 + 10;
    return { x: L.w * 0.74, y: cy };
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

    // Bars sit above the screen area (landscape: top of screen; gbc: top bezel).
    const topY = L.mode === 'gbc' ? L.view.y - 6 : L.safe.top + 4;
    const barX = L.mode === 'gbc' ? L.view.x : L.safe.left + 8;
    const barW = L.mode === 'gbc' ? L.view.w : Math.min(L.w * 0.34, 320);

    // HP bar.
    const hpH = 3 * u - 2;
    g.fillStyle(0x000000, 0.55);
    g.fillRect(barX, topY, barW, hpH);
    const hpFrac = Phaser.Math.Clamp(run.hp / run.stats.maxHp, 0, 1);
    g.fillStyle(hpFrac > 0.35 ? hexToInt(C.green) : hexToInt(C.red), 0.95);
    g.fillRect(barX + 1, topY + 1, (barW - 2) * hpFrac, hpH - 2);

    // XP bar under it.
    const xpY = topY + hpH + 2;
    g.fillStyle(0x000000, 0.55);
    g.fillRect(barX, xpY, barW, u + 1);
    g.fillStyle(hexToInt(C.blue), 0.9);
    g.fillRect(barX + 1, xpY + 1, (barW - 2) * Phaser.Math.Clamp(run.xp / run.xpNeeded, 0, 1), u - 1);

    // Timer centered at top of play area.
    const mins = Math.floor(run.time / 60);
    const secs = Math.floor(run.time % 60);
    this.timerText.setVisible(true).setText(`${mins}:${secs.toString().padStart(2, '0')}`);
    const timerX = L.mode === 'gbc' ? L.view.x + L.view.w / 2 : L.w / 2;
    this.timerText.setPosition(Math.round(timerX - this.timerText.width / 2), topY);

    this.levelText.setVisible(true).setText(`LV ${run.level}`);
    this.levelText.setPosition(barX + barW + 6, topY);

    this.killText.setVisible(true).setText(`${run.kills}`);
    const killX = L.mode === 'gbc' ? L.view.x + L.view.w - this.killText.width : L.w - L.safe.right - 8 - this.killText.width;
    this.killText.setPosition(killX, topY + hpH + 4 + u);
  }
}
