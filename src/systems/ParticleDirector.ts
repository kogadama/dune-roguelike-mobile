import Phaser from 'phaser';
import { ATLAS } from '../gfx/AtlasBuilder';
import { C, hexToInt } from '../gfx/palettes';
import { PERF } from '../config';

/**
 * Budgeted particle effects. Every emitter carries a hard maxAliveParticles
 * cap; ambient (lowest-priority) effects shut off when FPS sags.
 */
export class ParticleDirector {
  private scene: Phaser.Scene;
  private dust: Phaser.GameObjects.Particles.ParticleEmitter;
  private hitSpark: Phaser.GameObjects.Particles.ParticleEmitter;
  private shimmer: Phaser.GameObjects.Particles.ParticleEmitter;
  private explosion: Phaser.GameObjects.Particles.ParticleEmitter;
  private nuke: Phaser.GameObjects.Particles.ParticleEmitter;
  private ambient: Phaser.GameObjects.Particles.ParticleEmitter;
  private fpsWindow: number[] = [];
  private ambientOn = true;
  /** Mutated in place each frame; the emit zone holds a reference. */
  private ambientRect = new Phaser.Geom.Rectangle(0, 0, 100, 100);
  batterySaver = false;
  /** Per-frame burst limiter so 30 simultaneous hits don't triple the budget. */
  private burstsThisFrame = 0;

  constructor(scene: Phaser.Scene, biome: 'arrakeen' | 'deep') {
    this.scene = scene;

    // Feet dust (gameplay feedback, medium priority).
    this.dust = scene.add.particles(0, 0, ATLAS, {
      frame: 'fx_px',
      lifespan: { min: 260, max: 420 },
      speed: { min: 4, max: 14 },
      alpha: { start: 0.7, end: 0 },
      scale: { start: 1, end: 0.4 },
      tint: hexToInt(C.sand4),
      frequency: -1,
      maxAliveParticles: 40,
    });
    this.dust.setDepth(2);

    // Hit sparks (combat readability, high priority).
    this.hitSpark = scene.add.particles(0, 0, ATLAS, {
      frame: 'fx_spark',
      lifespan: { min: 120, max: 240 },
      speed: { min: 40, max: 110 },
      alpha: { start: 1, end: 0 },
      scale: { start: 1, end: 0.3 },
      rotate: { min: 0, max: 360 },
      tint: [hexToInt(C.white), hexToInt(C.spice4), hexToInt(C.gold)],
      frequency: -1,
      maxAliveParticles: 90,
    });
    this.hitSpark.setDepth(14);

    // Holtzman shimmer (additive hexagons).
    this.shimmer = scene.add.particles(0, 0, ATLAS, {
      frame: 'fx_hex7',
      lifespan: { min: 200, max: 400 },
      speed: { min: 6, max: 22 },
      alpha: { start: 0.9, end: 0 },
      scale: { start: 1.1, end: 0.5 },
      tint: hexToInt(C.blue),
      blendMode: Phaser.BlendModes.ADD,
      frequency: -1,
      maxAliveParticles: 50,
    });
    this.shimmer.setDepth(15);

    // Explosions (thopter/elite deaths).
    this.explosion = scene.add.particles(0, 0, ATLAS, {
      frame: 'fx_dot5',
      lifespan: { min: 300, max: 560 },
      speed: { min: 30, max: 120 },
      alpha: { start: 1, end: 0 },
      scale: { start: 1.4, end: 0.2 },
      tint: [hexToInt(C.spice3), hexToInt(C.spice2), hexToInt(C.red), 0x555555],
      frequency: -1,
      maxAliveParticles: 80,
    });
    this.explosion.setDepth(15);

    // Sub-atomic Holtzman blast (rare, spectacular).
    this.nuke = scene.add.particles(0, 0, ATLAS, {
      frame: 'fx_glow16',
      lifespan: { min: 350, max: 700 },
      speed: { min: 10, max: 160 },
      alpha: { start: 0.95, end: 0 },
      scale: { start: 2.2, end: 0.2 },
      tint: [hexToInt(C.blue), hexToInt(C.white), hexToInt(C.spice4)],
      blendMode: Phaser.BlendModes.ADD,
      frequency: -1,
      maxAliveParticles: 60,
    });
    this.nuke.setDepth(16);

    // Ambient: spice glimmer / drifting dust (lowest priority, culled first).
    this.ambient = scene.add.particles(0, 0, ATLAS, {
      frame: biome === 'deep' ? 'fx_dot3' : 'fx_px',
      lifespan: { min: 900, max: 1800 },
      speedX: { min: -14, max: -30 },
      speedY: { min: -4, max: 4 },
      alpha: { start: 0, end: 0.6, ease: 'Sine.InOut' },
      scale: { start: 0.8, end: 0.3 },
      tint: biome === 'deep' ? hexToInt(C.spice3) : hexToInt(C.sand5),
      blendMode: biome === 'deep' ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL,
      frequency: 140,
      maxAliveParticles: 60,
      emitting: true,
    });
    this.ambient.setDepth(1);
    this.ambient.addEmitZone({ type: 'random', source: this.ambientRect, quantity: 1 });
  }

  /** Reposition ambient emit zone to the camera view; call each frame. */
  update(): void {
    this.burstsThisFrame = 0;
    const cam = this.scene.cameras.main;
    const v = cam.worldView;
    this.ambientRect.setTo(v.x, v.y, v.width, v.height);

    // Rolling FPS: degrade ambient when the frame rate sags.
    const fps = this.scene.game.loop.actualFps;
    this.fpsWindow.push(fps);
    if (this.fpsWindow.length > 60) this.fpsWindow.shift();
    const avg = this.fpsWindow.reduce((a, b) => a + b, 0) / this.fpsWindow.length;
    const wantAmbient = avg >= PERF.fpsDegradeThreshold && !this.batterySaver;
    if (wantAmbient !== this.ambientOn) {
      this.ambientOn = wantAmbient;
      if (wantAmbient) this.ambient.start();
      else this.ambient.stop();
    }
  }

  footDust(x: number, y: number): void {
    this.dust.emitParticleAt(x, y + 4, 1);
  }

  hit(x: number, y: number): void {
    if (this.burstsThisFrame++ > 6) return;
    this.hitSpark.emitParticleAt(x, y, 2);
  }

  shieldShimmer(x: number, y: number): void {
    this.shimmer.emitParticleAt(x, y, 6);
  }

  explode(x: number, y: number, big = false): void {
    this.explosion.emitParticleAt(x, y, big ? 22 : 10);
  }

  holtzmanBlast(x: number, y: number): void {
    this.nuke.emitParticleAt(x, y, 26);
  }
}
