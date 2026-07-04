import Phaser from 'phaser';
import { C, hexToInt } from '../gfx/palettes';
import { pixText, centerPixText } from '../util/ui';
import { metaXpForRun } from '../data/balance';
import { ATLAS } from '../gfx/AtlasBuilder';
import type { SaveManager } from '../save/SaveManager';
import type { CharacterId, MapId } from '../types';
import { CHARACTERS } from '../data/characters';
import { addMetaXp } from '../systems/MetaProgression';

export interface ResultsData {
  victory: boolean;
  kills: number;
  timeSec: number;
  level: number;
  characterId: CharacterId;
  mapId: MapId;
}

export class ResultsScene extends Phaser.Scene {
  constructor() {
    super('Results');
  }

  create(data: ResultsData): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const u = Phaser.Math.Clamp(Math.round(Math.min(w, h) / 200), 2, 5);
    const save = this.registry.get('save') as SaveManager;
    const character = CHARACTERS[data.characterId];

    const metaXp = metaXpForRun(data.kills, data.timeSec, data.victory);
    const levelsGained = addMetaXp(save, data.characterId, metaXp, data);

    this.cameras.main.setBackgroundColor(data.victory ? '#132213' : '#1a0d08');

    const title = data.victory ? 'ARRAKIS PREVAILS' : 'THE DESERT TAKES YOU';
    const t = centerPixText(this, w / 2, h * 0.14, title, u + 1, hexToInt(data.victory ? C.green : C.red));
    t.setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 500 });

    this.add.image(w / 2, h * 0.3, ATLAS, character.spriteKey).setScale(u * 1.6);
    centerPixText(this, w / 2, h * 0.42, character.name, u - 1, hexToInt(C.sand5));

    const mins = Math.floor(data.timeSec / 60);
    const secs = Math.floor(data.timeSec % 60);
    const lines = [
      [`SURVIVED`, `${mins}:${secs.toString().padStart(2, '0')}`],
      [`KILLS`, `${data.kills}`],
      [`LEVEL`, `${data.level}`],
      [`META XP`, `+${metaXp}`],
    ];
    let y = h * 0.52;
    for (const [k, v] of lines) {
      const left = pixText(this, 0, y, k!, u - 1, hexToInt(C.sand4));
      left.setX(Math.round(w * 0.32));
      const right = pixText(this, 0, y, v!, u - 1, hexToInt(C.white));
      right.setX(Math.round(w * 0.68 - right.width));
      y += Math.max(18, h * 0.05);
    }

    if (levelsGained > 0) {
      const lvlUp = centerPixText(
        this,
        w / 2,
        y + 8,
        `${character.name.toUpperCase()} REACHED LV ${save.data.characters[data.characterId].level}!`,
        u - 1,
        hexToInt(C.gold),
      );
      this.tweens.add({ targets: lvlUp, scale: { from: 0.6, to: 1 }, duration: 400, ease: 'Back.Out' });
      y += Math.max(22, h * 0.06);
    }

    const prompt = centerPixText(this, w / 2, Math.min(h * 0.9, y + h * 0.08), 'TAP TO CONTINUE', u, hexToInt(C.white));
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    this.time.delayedCall(600, () => {
      this.input.once('pointerdown', () => {
        this.scene.start('MainMenu');
      });
    });
  }
}
