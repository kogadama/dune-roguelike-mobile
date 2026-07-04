import Phaser from 'phaser';
import { CHARACTERS, CHARACTER_ORDER } from '../data/characters';
import { MAPS } from '../data/maps';
import { metaXpToNext } from '../data/balance';
import { skillPointsAvailable } from '../systems/MetaProgression';
import type { CharacterId, MapId } from '../types';
import { ATLAS } from '../gfx/AtlasBuilder';
import { C, hexToInt } from '../gfx/palettes';
import { pixText, centerPixText } from '../util/ui';
import type { SaveManager } from '../save/SaveManager';

export class CharacterSelectScene extends Phaser.Scene {
  private selectedChar: CharacterId = 'paul';
  private selectedMap: MapId = 'arrakeen';

  constructor() {
    super('CharacterSelect');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#120a05');
    this.render();
    this.scale.on('resize', this.render, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.render, this));
  }

  private render = (): void => {
    this.children.removeAll(true);
    const w = this.scale.width;
    const h = this.scale.height;
    const u = Phaser.Math.Clamp(Math.round(Math.min(w, h) / 200), 2, 5);
    const save = this.registry.get('save') as SaveManager;
    const portrait = h > w;

    centerPixText(this, w / 2, h * 0.06, 'CHOOSE YOUR CHAMPION', u, hexToInt(C.spice3));

    // Character cards.
    const cols = portrait ? 2 : 4;
    const cardW = portrait ? w * 0.42 : Math.min(w * 0.21, 240);
    const cardH = portrait ? h * 0.2 : Math.min(h * 0.42, 300);
    const gapX = portrait ? w * 0.05 : (w - cols * cardW) / (cols + 1);
    const startY = portrait ? h * 0.12 : h * 0.14;

    CHARACTER_ORDER.forEach((id, i) => {
      const def = CHARACTERS[id];
      const cs = save.data.characters[id];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = portrait
        ? w / 2 + (col === 0 ? -(cardW / 2 + gapX / 2) : cardW / 2 + gapX / 2)
        : gapX + col * (cardW + gapX) + cardW / 2;
      const cy = startY + row * (cardH + (portrait ? h * 0.025 : 0)) + cardH / 2;

      const selected = id === this.selectedChar;
      const g = this.add.graphics();
      g.fillStyle(selected ? hexToInt(C.sand1) : hexToInt(C.sand0), 0.95);
      g.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 8);
      g.lineStyle(2, selected ? hexToInt(C.spice3) : hexToInt(C.sand2), 1);
      g.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 8);

      const sprite = this.add.image(cx, cy - cardH * 0.22, ATLAS, def.spriteKey);
      sprite.setScale(selected ? u * 1.5 : u * 1.2);

      const shortName = id.charAt(0).toUpperCase() + id.slice(1);
      const name = centerPixText(this, cx, cy + cardH * 0.08, shortName, Math.max(1, u - 1), hexToInt(C.sand5));
      centerPixText(this, cx, name.y + name.height + 4, `LV ${cs.level}`, Math.max(1, u - 2) || 1, hexToInt(C.gold));
      const pts = skillPointsAvailable(save, id);
      if (pts > 0) {
        centerPixText(this, cx, cy + cardH * 0.34, `${pts} PTS!`, Math.max(1, u - 2) || 1, hexToInt(C.green));
      }

      const zone = this.add.zone(cx, cy, cardW, cardH).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.selectedChar = id;
        this.render();
      });
    });

    // Selected character detail line.
    const def = CHARACTERS[this.selectedChar];
    const cs = save.data.characters[this.selectedChar];
    const detailY = portrait ? h * 0.6 : h * 0.62;
    centerPixText(this, w / 2, detailY, `${def.title} - ${def.blurb}`, Math.max(1, u - 2) || 1, hexToInt(C.sand4));
    const xpNeed = metaXpToNext(cs.level);
    centerPixText(
      this,
      w / 2,
      detailY + 14 * (u / 2),
      `META ${cs.xp}/${xpNeed} XP`,
      Math.max(1, u - 2) || 1,
      hexToInt(C.blue),
    );

    // Map selector.
    const mapY = portrait ? h * 0.7 : h * 0.72;
    const mapIds: MapId[] = ['arrakeen', 'deep_desert'];
    mapIds.forEach((mid, i) => {
      const unlocked = save.data.unlockedMaps.includes(mid);
      const selected = this.selectedMap === mid;
      const mx = w / 2 + (i === 0 ? -w * 0.18 : w * 0.18);
      const label = unlocked ? MAPS[mid].name : 'LOCKED';
      const chip = centerPixText(this, mx, mapY, label, Math.max(1, u - 1), selected && unlocked ? hexToInt(C.spice3) : hexToInt(unlocked ? C.sand4 : C.sand2));
      if (selected && unlocked) {
        const g = this.add.graphics();
        g.lineStyle(1, hexToInt(C.spice3), 1);
        g.strokeRect(chip.x - chip.width / 2 - 6, chip.y - chip.height / 2 - 4, chip.width + 12, chip.height + 8);
      }
      if (unlocked) {
        chip.setInteractive({ useHandCursor: true });
        chip.on('pointerdown', () => {
          this.selectedMap = mid;
          this.render();
        });
      }
    });

    // Action buttons.
    const btnY = portrait ? h * 0.82 : h * 0.85;
    const upBtn = centerPixText(this, w * 0.28, btnY, 'UPGRADES', u, hexToInt(C.blue));
    upBtn.setInteractive({ useHandCursor: true });
    upBtn.on('pointerdown', () => {
      this.scene.start('MetaUpgrade', { characterId: this.selectedChar });
    });

    const startBtn = centerPixText(this, w * 0.72, btnY, 'START', u + 1, hexToInt(C.green));
    startBtn.setInteractive({ useHandCursor: true });
    startBtn.on('pointerdown', () => {
      this.scene.start('Game', { characterId: this.selectedChar, mapId: this.selectedMap });
    });
    this.tweens.add({ targets: startBtn, alpha: 0.55, duration: 700, yoyo: true, repeat: -1 });

    const backBtn = pixText(this, 10, 10, '< BACK', Math.max(1, u - 1), hexToInt(C.sand4));
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MainMenu'));
  };
}
