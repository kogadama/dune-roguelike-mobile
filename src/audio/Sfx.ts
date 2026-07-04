import { render, arp, SAMPLE_RATE, type Tone } from './synth';

export type SfxKey =
  | 'slash'
  | 'dart'
  | 'knife'
  | 'laser'
  | 'seeker'
  | 'voice'
  | 'boom'
  | 'pickup'
  | 'levelup'
  | 'hurt'
  | 'chest'
  | 'evolve'
  | 'click'
  | 'worm'
  | 'ability';

const DEFS: Record<SfxKey, () => Tone[]> = {
  slash: () => [
    { type: 'noise', freq: 900, freqEnd: 300, dur: 0.09, vol: 0.22, attack: 0.002, releaseFrac: 0.7 },
  ],
  dart: () => [
    { type: 'square', freq: 950, freqEnd: 420, dur: 0.07, vol: 0.2, duty: 0.3, releaseFrac: 0.6 },
  ],
  knife: () => [
    { type: 'noise', freq: 1200, freqEnd: 700, dur: 0.06, vol: 0.16, releaseFrac: 0.8 },
    { type: 'triangle', freq: 700, freqEnd: 350, dur: 0.06, vol: 0.14 },
  ],
  laser: () => [
    { type: 'saw', freq: 1800, freqEnd: 220, dur: 0.16, vol: 0.2, releaseFrac: 0.5 },
    { type: 'square', freq: 900, freqEnd: 110, dur: 0.16, vol: 0.1, duty: 0.2 },
  ],
  seeker: () => [
    { type: 'square', freq: 620, freqEnd: 880, dur: 0.09, vol: 0.15, duty: 0.4, vibDepth: 40, vibRate: 30 },
  ],
  voice: () => [
    { type: 'square', freq: 180, freqEnd: 70, dur: 0.28, vol: 0.34, duty: 0.35, releaseFrac: 0.5 },
    { type: 'noise', freq: 400, freqEnd: 100, dur: 0.2, vol: 0.12 },
  ],
  boom: () => [
    { type: 'noise', freq: 500, freqEnd: 60, dur: 0.5, vol: 0.4, releaseFrac: 0.7 },
    { type: 'sine', freq: 120, freqEnd: 40, dur: 0.45, vol: 0.4 },
  ],
  pickup: () => [
    { type: 'square', freq: 880, dur: 0.05, vol: 0.12, duty: 0.5 },
    { type: 'square', freq: 1320, dur: 0.07, at: 0.045, vol: 0.12 },
  ],
  levelup: () => arp([523, 659, 784, 1047], 0.07, 'square', 0.25),
  hurt: () => [
    { type: 'noise', freq: 300, freqEnd: 90, dur: 0.14, vol: 0.3 },
    { type: 'square', freq: 220, freqEnd: 90, dur: 0.12, vol: 0.2, duty: 0.3 },
  ],
  chest: () => arp([392, 494, 587, 784], 0.08, 'triangle', 0.3),
  evolve: () => [
    ...arp([262, 330, 392, 523, 659, 784], 0.07, 'square', 0.22),
    { type: 'noise', freq: 800, freqEnd: 2000, dur: 0.5, vol: 0.08, at: 0.1 },
  ],
  click: () => [{ type: 'square', freq: 660, dur: 0.035, vol: 0.12, duty: 0.4 }],
  worm: () => [
    { type: 'noise', freq: 120, freqEnd: 40, dur: 0.9, vol: 0.4, releaseFrac: 0.4 },
    { type: 'sine', freq: 70, freqEnd: 30, dur: 0.9, vol: 0.45, vibDepth: 8, vibRate: 7 },
  ],
  ability: () => [
    { type: 'sine', freq: 440, freqEnd: 880, dur: 0.16, vol: 0.2 },
    { type: 'triangle', freq: 880, freqEnd: 1320, dur: 0.1, at: 0.1, vol: 0.14 },
  ],
};

/** Pre-rendered SFX bank with throttling; unlocked on first user gesture. */
export class Sfx {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private buffers = new Map<SfxKey, AudioBuffer>();
  private lastPlayed = new Map<SfxKey, number>();
  private live = 0;
  volume = 0.8;

  /** Create context + render buffers. Call once; safe before unlock. */
  init(): void {
    if (this.ctx) return;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.gain = this.ctx.createGain();
    this.gain.connect(this.ctx.destination);
    for (const [key, def] of Object.entries(DEFS) as Array<[SfxKey, () => Tone[]]>) {
      const samples = render(def());
      const buf = this.ctx.createBuffer(1, samples.length, SAMPLE_RATE);
      buf.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
      this.buffers.set(key, buf);
    }
  }

  /** Resume on first pointer event (iOS requires a user gesture). */
  unlock(): void {
    this.ctx?.resume().catch(() => undefined);
  }

  get context(): AudioContext | null {
    return this.ctx;
  }

  get output(): GainNode | null {
    return this.gain;
  }

  play(key: SfxKey, volumeScale = 1): void {
    if (!this.ctx || !this.gain || this.ctx.state !== 'running') return;
    if (this.volume <= 0 || this.live >= 8) return;
    const now = performance.now();
    const last = this.lastPlayed.get(key) ?? 0;
    if (now - last < 45) return; // same-SFX throttle
    this.lastPlayed.set(key, now);
    const buf = this.buffers.get(key);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = this.volume * volumeScale;
    src.connect(g);
    g.connect(this.gain);
    this.live++;
    src.onended = () => {
      this.live--;
      g.disconnect();
    };
    src.start();
  }
}

export const sfx = new Sfx();
