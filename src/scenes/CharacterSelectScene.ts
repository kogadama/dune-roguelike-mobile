import Phaser from 'phaser';
import { CHARACTERS, CHARACTER_ORDER } from '../data/characters';
import { MAPS } from '../data/maps';
import { metaXpToNext } from '../data/balance';
import { skillPointsAvailable } from '../systems/MetaProgression';
import type { CharacterId, MapId } from '../types';
import { ATLAS } from '../gfx/AtlasBuilder';
import { C, hexToInt } from '../gfx/palettes';
import { centerPixText, textButton, uiBounds } from '../util/ui';
import type { SaveManager } from '../save/SaveManager';
import { sfx } from '../audio/index';

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
    // All layout happens inside the safe-area rect (Dynamic Island / home bar).
    const B = uiBounds(this);
    const ox = B.x;
    const oy = B.y;
    const w = B.w;
    const h = B.h;
    const u = Phaser.Math.Clamp(Math.round(Math.min(w, h) / 200), 2, 5);
    const save = this.registry.get('save') as SaveManager;
    const portrait = h > w;

    centerPixText(this, ox + w / 2, oy + h * 0.06, 'CHOOSE YOUR CHAMPION', u, hexToInt(C.spice3));

    // Character cards.
    const cols = portrait ? 2 : 4;
    const cardW = portrait ? w * 0.42 : Math.min(w * 0.21, 240);
    const cardH = portrait ? h * 0.2 : Math.min(h * 0.42, 300);
    const gapX = portrait ? w * 0.05 : (w - cols * cardW) / (cols + 1);
    const startY = oy + (portrait ? h * 0.12 : h * 0.14);

    CHARACTER_ORDER.forEach((id, i) => {
      const def = CHARACTERS[id];
      const cs = save.data.characters[id];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = portrait
        ? ox + w / 2 + (col === 0 ? -(cardW / 2 + gapX / 2) : cardW / 2 + gapX / 2)
        : ox + gapX + col * (cardW + gapX) + cardW / 2;
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
        if (this.selectedChar !== id) sfx.play('click');
        this.selectedChar = id;
        this.render();
      });
    });

    // Selected character detail line.
    const def = CHARACTERS[this.selectedChar];
    const cs = save.data.characters[this.selectedChar];
    const detailY = oy + (portrait ? h * 0.6 : h * 0.62);
    centerPixText(this, ox + w / 2, detailY, `${def.title} - ${def.blurb}`, Math.max(1, u - 2) || 1, hexToInt(C.sand4));
    const xpNeed = metaXpToNext(cs.level);
    centerPixText(
      this,
      ox + w / 2,
      detailY + 14 * (u / 2),
      `META ${cs.xp}/${xpNeed} XP`,
      Math.max(1, u - 2) || 1,
      hexToInt(C.blue),
    );

    // Map selector.
    const mapY = oy + (portrait ? h * 0.7 : h * 0.72);
    const mapIds: MapId[] = ['arrakeen', 'deep_desert'];
    mapIds.forEach((mid, i) => {
      const unlocked = save.data.unlockedMaps.includes(mid);
      const selected = this.selectedMap === mid;
      const mx = ox + w / 2 + (i === 0 ? -w * 0.18 : w * 0.18);
      const label = unlocked ? MAPS[mid].name : 'LOCKED';
      const tint = selected && unlocked ? hexToInt(C.spice3) : hexToInt(unlocked ? C.sand4 : C.sand2);
      if (unlocked) {
        const chip = textButton(this, mx, mapY, label, Math.max(1, u - 1), tint, () => {
          this.selectedMap = mid;
          this.render();
        });
        if (selected) {
          const g = this.add.graphics();
          g.lineStyle(1, hexToInt(C.spice3), 1);
          const ct = chip.text;
          g.strokeRect(ct.x - ct.width / 2 - 6, ct.y - ct.height / 2 - 4, ct.width + 12, ct.height + 8);
        }
      } else {
        centerPixText(this, mx, mapY, label, Math.max(1, u - 1), tint);
      }
    });

    // Action buttons.
    const btnY = oy + (portrait ? h * 0.82 : h * 0.85);
    textButton(this, ox + w * 0.28, btnY, 'UPGRADES', u, hexToInt(C.blue), () => {
      this.scene.start('MetaUpgrade', { characterId: this.selectedChar });
    }, { frame: true });

    const startBtn = textButton(this, ox + w * 0.72, btnY, 'START', u + 1, hexToInt(C.green), () => {
      this.scene.start('Game', { characterId: this.selectedChar, mapId: this.selectedMap });
    }, { frame: true, pad: 14 });
    this.tweens.add({ targets: startBtn.text, alpha: 0.55, duration: 700, yoyo: true, repeat: -1 });

    textButton(this, ox + 10, oy + 10, '< BACK', Math.max(1, u - 1), hexToInt(C.sand4),
      () => this.scene.start('MainMenu'), { align: 'topLeft' });
  };
}
