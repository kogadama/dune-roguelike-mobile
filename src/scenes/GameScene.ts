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
import { AbilitySystem } from '../systems/AbilitySystem';
import { ParticleDirector } from '../systems/ParticleDirector';
import { availableEvolution } from '../data/upgrades';
import { WEAPONS } from '../data/weapons';
import { metaStatsFor, hasThirdSlot } from '../systems/MetaProgression';
import { FONT } from '../gfx/AtlasBuilder';
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
  abilities!: AbilitySystem;
  particles!: ParticleDirector;
  private dustTimer = 0;
  private ground!: Phaser.GameObjects.TileSprite;
  private timescale = 1;
  private ended = false;

  constructor() {
    super('Game');
  }

  create(data: GameSceneData): void {
    const character = CHARACTERS[data.characterId] ?? CHARACTERS.paul;
    const map = MAPS[data.mapId] ?? MAPS.arrakeen;
    const save = this.registry.get('save') as SaveManager | undefined;
    const metaStats = save ? metaStatsFor(save, character.id) : {};
    this.run = new RunState(character, map, metaStats);
    this.ended = false;
    this.dustTimer = 0;
    this.registry.set('run', this.run);
    this.timescale = TEST_PARAMS.timescale;

    this.applyLayout();
    this.scale.on('resize', this.applyLayout, this);
    this.game.events.on('relayout', this.applyLayout, this);
    const onDmgToggle = (on: boolean) => {
      this.damageNumbers.enabled = on;
    };
    this.game.events.on('dmgnumbers', onDmgToggle);
    const onHidden = () => {
      if (document.visibilityState === 'hidden' && this.scene.isActive()) {
        this.scene.pause();
        this.scene.pause('Hud');
        this.scene.launch('Pause');
      }
    };
    document.addEventListener('visibilitychange', onHidden);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.applyLayout, this);
      this.game.events.off('relayout', this.applyLayout, this);
      this.game.events.off('dmgnumbers', onDmgToggle);
      document.removeEventListener('visibilitychange', onHidden);
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

    this.particles = new ParticleDirector(this, map.palette === 'deep' ? 'deep' : 'arrakeen');
    this.particles.batterySaver = save?.data.settings.batterySaver ?? false;

    // System wiring.
    this.enemies.onDeath = (e: Enemy) => this.onEnemyDeath(e);
    this.enemies.onEnemyShot = (x, y, tx, ty, speed, dmg) =>
      this.projectiles.fireEnemyShot(x, y, tx, ty, speed, dmg);
    // Shai-Hulud staging: worm sign dust, charge-line telegraph, emergence.
    let wormDustGate = 0;
    this.enemies.onWormSign = (x, y) => {
      if (this.time.now > wormDustGate) {
        wormDustGate = this.time.now + 90;
        this.particles.footDust(x, y);
        this.particles.footDust(x + 6, y + 3);
      }
    };
    this.enemies.onWormTelegraph = (x, y, dx, dy) => {
      this.weaponVisuals.beam(x, y, Math.atan2(dy, dx), 200, 0xe0b36c);
      this.cameras.main.shake(500, 0.002);
    };
    this.enemies.onWormEmerge = (x, y) => {
      this.particles.explode(x, y, true);
      this.cameras.main.shake(250, 0.008);
    };
    this.projectiles.onHit = (x, y, dmg) => {
      this.damageNumbers.show(x, y, dmg);
      this.particles.hit(x, y);
    };
    this.weapons.onHit = (x, y, dmg) => {
      this.damageNumbers.show(x, y, dmg);
      this.particles.hit(x, y);
    };
    this.weapons.onSlash = (x, y, a, r) => this.weaponVisuals.slash(x, y, a, r);
    this.weapons.onBeam = (x, y, a, l) => this.weaponVisuals.beam(x, y, a, l);
    this.weapons.onPulse = (x, y, r, weaponId) => {
      if (weaponId === 'holtzman_cataclysm') {
        this.weaponVisuals.pulse(x, y, r, 0x3fd0ff);
        this.particles.holtzmanBlast(x, y);
        this.cameras.main.shake(180, 0.006);
      } else {
        this.weaponVisuals.pulse(x, y, r);
      }
    };
    this.pickups.onLevelUp = () => this.openLevelUp('levelup');
    this.pickups.onChest = () => this.handleChest();
    this.waves.setViewRadius(Math.max(this.layout.vw, this.layout.vh) * 0.55);

    const thirdSlot =
      save && hasThirdSlot(save, character.id) ? (character.capstoneAbility ?? null) : null;
    this.abilities = new AbilitySystem(this.run, this.enemies, this.player, thirdSlot);
    this.abilities.onPulseVisual = (x, y, r, tint) => this.weaponVisuals.pulse(x, y, r, tint);
    this.abilities.onCast = (def) => {
      if (def.effect.kind === 'worldSlow') {
        // Prescience: blue vision flash + slight punch-in.
        this.cameras.main.flash(220, 30, 90, 140, true);
        this.cameras.main.zoomTo(this.layout.zoom * 1.06, 180, 'Cubic.easeOut', false, (_c, p) => {
          if (p === 1) this.cameras.main.zoomTo(this.layout.zoom, 900, 'Cubic.easeOut');
        });
      } else if (def.effect.kind === 'knockbackRing' || def.effect.kind === 'aoeStun') {
        this.cameras.main.shake(120, 0.004);
      }
    };

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
    testApi.warpTo = (seconds: number) => {
      this.run.time = seconds;
    };
    testApi.slayAll = () => {
      for (const e of this.enemies.enemies) {
        if (e.active) this.enemies.kill(e);
      }
    };
  }

  private onEnemyDeath(e: Enemy): void {
    // Gem tier by XP value.
    let value = e.def.xp;
    if (e.elite) value = GEM_TIERS[4];
    this.pickups.spawnGem(e.x, e.y, value);
    if (e.elite) {
      this.pickups.spawnSpecial(e.x + 10, e.y, 'chest');
      this.particles.explode(e.x, e.y, true);
    }
    if (e.def.id === 'ornithopter') {
      this.particles.explode(e.x, e.y, true);
      this.cameras.main.shake(100, 0.003);
    }
    // Occasional water drop from tough enemies.
    if (e.def.xp >= 4 && !e.elite && Math.random() < 0.06) {
      this.pickups.spawnSpecial(e.x - 8, e.y, 'water');
    }
    if (e.def.behavior === 'boss') {
      this.run.bossDefeated = true;
      this.particles.explode(e.x, e.y, true);
      this.cameras.main.shake(400, 0.01);
      this.endRun(true);
    }
  }

  /** Elite chests: weapon evolution if a recipe is ready, else a spice cache. */
  private handleChest(): void {
    const evo = availableEvolution(this.run);
    if (evo) {
      const idx = this.run.weapons.findIndex((w) => w.id === evo.from);
      if (idx !== -1) {
        this.run.weapons[idx] = { id: evo.into, level: 1, timer: 0.3 };
        const evolved = WEAPONS[evo.into];
        this.particles.holtzmanBlast(this.player.x, this.player.y);
        this.cameras.main.flash(300, 63, 208, 255, true);
        this.banner(`${evolved.name.toUpperCase()}!`);
      }
    } else {
      this.run.hp = Math.min(this.run.stats.maxHp, this.run.hp + 25);
      this.run.addXp(20);
      this.banner('SPICE CACHE');
    }
  }

  /** Floating world-space announcement above the player. */
  private banner(text: string): void {
    const t = this.add
      .bitmapText(this.player.x, this.player.y - 26, FONT, text)
      .setOrigin(0.5)
      .setScale(2)
      .setTint(0xffd23f)
      .setDepth(30);
    this.tweens.add({
      targets: t,
      y: t.y - 18,
      alpha: { from: 1, to: 0 },
      duration: 1600,
      ease: 'Cubic.Out',
      onComplete: () => t.destroy(),
    });
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
    if (this.ended) return;
    this.ended = true;
    const data = {
      victory,
      kills: this.run.kills,
      timeSec: this.run.time,
      level: this.run.level,
      characterId: this.run.character.id,
      mapId: this.run.map.id,
    };
    this.time.delayedCall(victory ? 1200 : 700, () => {
      this.scene.stop('Hud');
      this.registry.remove('run');
      this.scene.start('Results', data);
    });
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
    this.abilities.update(dt);
    this.weapons.update(dt);
    this.projectiles.update(dt);
    this.enemies.update(dt);
    this.pickups.update(dt);
    this.waves.update(dt);
    this.particles.update();

    // Feet dust while moving.
    this.dustTimer -= dt;
    if (this.dustTimer <= 0 && (this.player.sprite.rotation !== 0)) {
      this.dustTimer = 0.13;
      this.particles.footDust(this.player.x, this.player.y + 4);
    }

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
