import Phaser from 'phaser';
import { CHARACTERS } from '../data/characters';
import { MAPS } from '../data/maps';
import { GEM_TIERS } from '../data/balance';
import { rollUpgradeOptions } from '../data/upgrades';
import type { CharacterId, MapId } from '../types';
import { RunState } from '../systems/RunState';
import { PlayerController } from '../systems/PlayerController';
import { EnemySystem, type Enemy } from '../systems/EnemySystem';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { WeaponSystem, WeaponVisuals } from '../systems/WeaponSystem';
import { PickupSystem } from '../systems/PickupSystem';
import { WaveDirector } from '../systems/WaveDirector';
import { DamageNumbers } from '../systems/DamageNumbers';
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
  enemies!: EnemySystem;
  projectiles!: ProjectileSystem;
  weapons!: WeaponSystem;
  weaponVisuals!: WeaponVisuals;
  pickups!: PickupSystem;
  waves!: WaveDirector;
  damageNumbers!: DamageNumbers;
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

    // Systems.
    this.enemies = new EnemySystem(this, this.run, this.player);
    this.projectiles = new ProjectileSystem(this, this.run, this.enemies, this.player);
    this.weapons = new WeaponSystem(this, this.run, this.enemies, this.projectiles, this.player);
    this.weaponVisuals = new WeaponVisuals(this);
    this.pickups = new PickupSystem(this, this.run, this.player);
    this.waves = new WaveDirector(this.run, this.enemies, this.player);
    this.damageNumbers = new DamageNumbers(this);
    this.damageNumbers.enabled = save?.data.settings.showDamageNumbers ?? true;

    // System wiring.
    this.enemies.onDeath = (e: Enemy) => this.onEnemyDeath(e);
    this.enemies.onEnemyShot = (x, y, tx, ty, speed, dmg) =>
      this.projectiles.fireEnemyShot(x, y, tx, ty, speed, dmg);
    this.projectiles.onHit = (x, y, dmg) => this.damageNumbers.show(x, y, dmg);
    this.weapons.onHit = (x, y, dmg) => this.damageNumbers.show(x, y, dmg);
    this.weapons.onSlash = (x, y, a, r) => this.weaponVisuals.slash(x, y, a, r);
    this.weapons.onBeam = (x, y, a, l) => this.weaponVisuals.beam(x, y, a, l);
    this.weapons.onPulse = (x, y, r) => this.weaponVisuals.pulse(x, y, r);
    this.pickups.onLevelUp = () => this.openLevelUp('levelup');
    this.waves.setViewRadius(Math.max(this.layout.vw, this.layout.vh) * 0.55);

    this.scene.launch('Hud');

    // Test hooks.
    testApi.state = () => ({
      scene: 'Game',
      enemies: this.enemies.activeCount,
      hp: this.run.hp,
      level: this.run.level,
      kills: this.run.kills,
      runTime: this.run.time,
      cooldowns: [...this.run.abilityCooldowns],
      playerX: this.player.x,
      playerY: this.player.y,
      layout: this.layout.mode,
    });
    testApi.grantXp = (n: number) => {
      if (this.run.addXp(n)) this.openLevelUp('levelup');
    };
    testApi.killPlayer = () => {
      this.run.hp = 0;
      this.run.dead = true;
      this.onDeath();
    };
  }

  private onEnemyDeath(e: Enemy): void {
    // Gem tier by XP value.
    let value = e.def.xp;
    if (e.elite) value = GEM_TIERS[4];
    this.pickups.spawnGem(e.x, e.y, value);
    if (e.elite) this.pickups.spawnSpecial(e.x + 10, e.y, 'chest');
    if (e.def.behavior === 'boss') {
      this.run.bossDefeated = true;
      this.endRun(true);
    }
  }

  openLevelUp(reason: 'levelup' | 'chest'): void {
    if (this.scene.isPaused()) return;
    const options = rollUpgradeOptions(this.run);
    if (options.length === 0) return;
    this.scene.pause();
    this.scene.pause('Hud');
    this.scene.launch('LevelUp', { options, reason });
  }

  private onDeath(): void {
    this.endRun(false);
  }

  endRun(victory: boolean): void {
    // ResultsScene lands in M4; for now return to menu after a beat.
    this.time.delayedCall(600, () => {
      this.scene.stop('Hud');
      this.registry.remove('run');
      this.scene.start('MainMenu');
    });
    void victory;
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
    this.waves?.setViewRadius(Math.max(this.layout.vw, this.layout.vh) * 0.55);
  };

  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.05) * this.timescale;
    const run = this.run;
    if (run.dead) return;

    run.time += dt;

    // Fixed system order (see plan): input/player -> weapons -> projectiles
    // -> enemies -> pickups -> waves -> camera glue.
    this.player.update(dt);
    this.enemies.rebuildGrid();
    this.weapons.update(dt);
    this.projectiles.update(dt);
    this.enemies.update(dt);
    this.pickups.update(dt);
    this.waves.update(dt);

    if (run.dead) {
      this.onDeath();
      return;
    }

    // Ground: world-space tile sprite glued to the camera; texture offset
    // keeps the pattern anchored to the world so it scrolls under the player.
    const cam = this.cameras.main;
    const cx = cam.midPoint.x;
    const cy = cam.midPoint.y;
    this.ground.setPosition(cx, cy);
    this.ground.setTilePosition(cx - this.ground.width / 2, cy - this.ground.height / 2);
  }
}
