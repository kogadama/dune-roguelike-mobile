import Phaser from 'phaser';
import { CHARACTERS } from '../data/characters';
import { treeForCharacter } from '../data/metaTree';
import { buyNode, skillPointsAvailable } from '../systems/MetaProgression';
import type { CharacterId } from '../types';
import { C, hexToInt } from '../gfx/palettes';
import { pixText, centerPixText, uiBounds } from '../util/ui';
import type { SaveManager } from '../save/SaveManager';

export interface MetaUpgradeData {
  characterId: CharacterId;
}

/** Per-character skill tree: spend meta level points on permanent upgrades. */
export class MetaUpgradeScene extends Phaser.Scene {
  private characterId: CharacterId = 'paul';

  constructor() {
    super('MetaUpgrade');
  }

  create(data: MetaUpgradeData): void {
    this.characterId = data.characterId ?? 'paul';
    this.cameras.main.setBackgroundColor('#120a05');
    this.render();
    this.scale.on('resize', this.render, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.render, this));
  }

  private render = (): void => {
    this.children.removeAll(true);
    // Lay out inside the safe-area rect (Dynamic Island / home bar).
    const B = uiBounds(this);
    const ox = B.x;
    const oy = B.y;
    const w = B.w;
    const h = B.h;
    const u = Phaser.Math.Clamp(Math.round(Math.min(w, h) / 200), 2, 5);
    const save = this.registry.get('save') as SaveManager;
    const def = CHARACTERS[this.characterId];
    const cs = save.data.characters[this.characterId];
    const pts = skillPointsAvailable(save, this.characterId);
    const portrait = h > w;

    centerPixText(this, ox + w / 2, oy + h * 0.05, `${def.name.toUpperCase()} - TRAINING`, u, hexToInt(C.spice3));
    centerPixText(this, ox + w / 2, oy + h * 0.05 + 16 * (u / 2), `LV ${cs.level}   POINTS: ${pts}`, Math.max(1, u - 1), hexToInt(C.gold));

    const nodes = treeForCharacter(this.characterId);
    const cols = portrait ? 2 : 3;
    const cellW = (w * 0.92) / cols;
    const cellH = portrait ? h * 0.115 : h * 0.17;
    const x0 = ox + w * 0.04;
    const y0 = oy + h * 0.16;

    nodes.forEach((node, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = x0 + col * cellW + cellW / 2;
      const cy = y0 + row * (cellH + 6) + cellH / 2;
      const rank = cs.nodes[node.id] ?? 0;
      const maxed = rank >= node.maxRank;
      const reqMet = !node.requires || node.requires.every((r) => (cs.nodes[r] ?? 0) > 0);
      const affordable = pts >= node.cost && !maxed && reqMet;

      const g = this.add.graphics();
      g.fillStyle(maxed ? hexToInt(C.atrGreen1) : hexToInt(C.sand0), 0.95);
      g.fillRoundedRect(cx - cellW / 2 + 4, cy - cellH / 2, cellW - 8, cellH, 6);
      g.lineStyle(2, maxed ? hexToInt(C.green) : affordable ? hexToInt(C.spice3) : hexToInt(C.sand2), reqMet ? 1 : 0.4);
      g.strokeRoundedRect(cx - cellW / 2 + 4, cy - cellH / 2, cellW - 8, cellH, 6);

      const smallU = Math.max(1, u - 2) || 1;
      const name = pixText(this, cx - cellW / 2 + 12, cy - cellH / 2 + 8, node.name, smallU, hexToInt(reqMet ? C.sand5 : C.sand2));
      pixText(this, cx - cellW / 2 + 12, name.y + name.height + 4, node.desc, smallU, hexToInt(reqMet ? C.sand4 : C.sand2)).setMaxWidth(cellW - 24);

      // Rank pips.
      const pipY = cy + cellH / 2 - 10;
      for (let p = 0; p < node.maxRank; p++) {
        const pg = this.add.graphics();
        pg.fillStyle(p < rank ? hexToInt(C.gold) : hexToInt(C.sand2), 1);
        pg.fillRect(cx - cellW / 2 + 12 + p * 10, pipY, 6, 4);
      }
      if (!maxed && reqMet) {
        pixText(this, cx + cellW / 2 - 40, pipY - 2, `${node.cost}PT`, smallU, hexToInt(affordable ? C.green : C.red));
      }

      if (affordable) {
        const zone = this.add.zone(cx, cy, cellW - 8, cellH).setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => {
          if (buyNode(save, this.characterId, node.id)) {
            this.cameras.main.flash(120, 60, 200, 90, true);
            this.render();
          }
        });
      }
    });

    const backBtn = pixText(this, ox + 10, oy + 10, '< BACK', Math.max(1, u - 1), hexToInt(C.sand4));
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('CharacterSelect'));
  };
}
