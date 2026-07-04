import { spawnRateScale } from '../data/balance';
import type { MapDef, WaveEvent } from '../types';
import type { EnemySystem } from './EnemySystem';
import type { PlayerController } from './PlayerController';
import type { RunState } from './RunState';
import { globalRng } from '../util/rng';

/** Walks the map's wave bands against the run clock and feeds the spawner. */
export class WaveDirector {
  private run: RunState;
  private map: MapDef;
  private enemies: EnemySystem;
  private player: PlayerController;
  /** Spawn accumulators keyed by band-index:entry-index. */
  private acc = new Map<string, number>();
  private firedEvents = new Set<WaveEvent>();
  private screenHalf = 240;
  onBossSpawn: ((name: string) => void) | null = null;

  constructor(run: RunState, enemies: EnemySystem, player: PlayerController) {
    this.run = run;
    this.map = run.map;
    this.enemies = enemies;
    this.player = player;
  }

  setViewRadius(r: number): void {
    this.screenHalf = r;
  }

  private spawnRing(): { x: number; y: number } {
    const a = globalRng.range(0, Math.PI * 2);
    const r = this.screenHalf + 30 + globalRng.range(0, 40);
    return { x: this.player.x + Math.cos(a) * r, y: this.player.y + Math.sin(a) * r };
  }

  update(dt: number): void {
    const t = this.run.time;
    const rateMul = spawnRateScale(t / 60);

    for (let bi = 0; bi < this.map.waves.length; bi++) {
      const band = this.map.waves[bi]!;
      if (t < band.t0 || t >= band.t1) continue;

      for (let si = 0; si < band.spawns.length; si++) {
        const entry = band.spawns[si]!;
        const key = `${bi}:${si}`;
        let acc = (this.acc.get(key) ?? 0) + entry.ratePerSec * rateMul * dt;
        while (acc >= 1) {
          acc -= 1;
          // Per-type cap: count actives of this type only when near cap risk.
          let count = 0;
          for (const e of this.enemies.enemies) {
            if (e.active && e.def.id === entry.enemy) count++;
          }
          if (count < entry.cap) {
            const pos = this.spawnRing();
            this.enemies.spawn(entry.enemy, pos.x, pos.y);
          }
        }
        this.acc.set(key, acc);
      }

      if (band.events) {
        for (const ev of band.events) {
          if (t >= ev.at && !this.firedEvents.has(ev)) {
            this.firedEvents.add(ev);
            this.fireEvent(ev);
          }
        }
      }
    }
  }

  private fireEvent(ev: WaveEvent): void {
    switch (ev.type) {
      case 'eliteSpawn': {
        const pos = this.spawnRing();
        this.enemies.spawn(ev.enemy ?? 'trooper', pos.x, pos.y, true);
        break;
      }
      case 'ring': {
        const n = ev.count ?? 16;
        const r = this.screenHalf + 20;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          this.enemies.spawn(ev.enemy ?? 'trooper', this.player.x + Math.cos(a) * r, this.player.y + Math.sin(a) * r);
        }
        break;
      }
      case 'ornithopterRun': {
        for (let i = 0; i < 2; i++) {
          const a = globalRng.range(0, Math.PI * 2);
          const r = this.screenHalf + 80 + i * 60;
          this.enemies.spawn('ornithopter', this.player.x + Math.cos(a) * r, this.player.y + Math.sin(a) * r);
        }
        break;
      }
      case 'boss': {
        const pos = this.spawnRing();
        const boss = this.enemies.spawn(ev.enemy ?? this.map.boss, pos.x, pos.y);
        if (boss) {
          this.run.bossActive = true;
          this.onBossSpawn?.(boss.def.name);
        }
        break;
      }
    }
  }
}
