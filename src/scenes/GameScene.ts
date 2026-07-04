import Phaser from 'phaser';
import { CHARACTERS } from '../data/characters';
import { MAPS } from '../data/maps';
import type { CharacterId, MapId } from '../types';
import { RunState } from '../systems/RunState';
import { PlayerController } from '../systems/PlayerController';
import { computeLayout, type LayoutInfo } from '../systems/Layout';
import { TEST_PARAMS } from '../config';
import { testApi } from '../util/testHooks';
import type { SaveManager } from '../save/SaveManager';

export interface GameSceneData {
  characterId: CharacterId;
  mapId: MapId;
}

export class GameScene extends Phaser.Scene {
  run!: RunState;
  player!: PlayerController;
  layout!: LayoutInfo;
  private ground!: Phaser.GameObjects.TileSprite;
  private timescale = 1;

  constructor() {
    super('Game');
  }

  create(data: GameSceneData): void {
    const character = CHARACTERS[data.characterId] ?? CHARACTERS.paul;
    const map = MAPS[data.mapId] ?? MAPS.arrakeen;
    const save = this.registry.get('save') as SaveManager | undefined;
    // Meta stat bonuses land in M5; empty for now.
    this.run = new RunState(character, map, {});
    this.registry.set('run', this.run);
    this.timescale = TEST_PARAMS.timescale;

    this.applyLayout();
    this.scale.on('resize', this.applyLayout, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.applyLayout, this);
    });

    const biome = map.palette === 'deep' ? 'deep' : 'arrakeen';
    this.ground = this.add
      .tileSprite(0, 0, this.layout.vw + 96, this.layout.vh + 96, `ground_${biome}`)
      .setOrigin(0.5)
      .setDepth(0);

    this.player = new PlayerController(this, this.run, 0, 0);
    this.cameras.main.startFollow(this.player.sprite, false, 0.12, 0.12);

    this.scene.launch('Hud');

    // Test hooks.
    testApi.state = () => ({
      scene: 'Game',
      enemies: 0,
      hp: this.run.hp,
      level: this.run.level,
      kills: this.run.kills,
      runTime: this.run.time,
      cooldowns: [...this.run.abilityCooldowns],
      playerX: this.player.x,
      playerY: this.player.y,
      layout: this.layout.mode,
    });
    testApi.grantXp = (n: number) => this.run.addXp(n);
    testApi.killPlayer = () => {
      this.run.hp = 0;
      this.run.dead = true;
    };
    void save;
  }

  private applyLayout = (): void => {
    const save = this.registry.get('save') as SaveManager | undefined;
    const mode = save?.data.settings.layoutMode ?? 'auto';
    this.layout = computeLayout(this.scale.width, this.scale.height, mode);
    const cam = this.cameras.main;
    cam.setViewport(this.layout.view.x, this.layout.view.y, this.layout.view.w, this.layout.view.h);
    cam.setZoom(this.layout.zoom);
    if (this.ground) {
      this.ground.setSize(this.layout.vw + 96, this.layout.vh + 96);
    }
  };

  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.05) * this.timescale;
    const run = this.run;

    run.time += dt;
    this.player.update(dt);

    // Ground: world-space tile sprite glued to the camera; texture offset
    // keeps the pattern anchored to the world so it scrolls under the player.
    const cam = this.cameras.main;
    const cx = cam.midPoint.x;
    const cy = cam.midPoint.y;
    this.ground.setPosition(cx, cy);
    this.ground.setTilePosition(cx - this.ground.width / 2, cy - this.ground.height / 2);
  }
}
