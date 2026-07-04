import { render, nf, SAMPLE_RATE, type Tone } from './synth';
import type { Sfx } from './Sfx';

export type MusicKey = 'menu' | 'map1' | 'map2' | 'boss';

type Step = number | null;

interface TrackDef {
  stepSec: number;
  /** Semitones from A4 per step, null = rest. Patterns loop to fill `bars`. */
  bass: Step[];
  lead: Step[];
  /** 'k' kick, 'h' hat, 's' snare-ish. */
  perc: Array<'k' | 'h' | 's' | null>;
  bars: number;
  bassVol: number;
  leadVol: number;
}

// Phrygian-dominant flavors of D — the desert scale.
const D2 = -31;
const TRACKS: Record<MusicKey, TrackDef> = {
  menu: {
    stepSec: 0.22,
    bars: 4,
    bassVol: 0.2,
    leadVol: 0.12,
    bass: [D2, null, null, null, D2 - 2, null, null, null, D2, null, null, null, D2 + 1, null, D2 - 2, null],
    lead: [null, null, 12 + D2 + 24, null, null, 13 + D2 + 24, null, null, null, 17 + D2 + 24, null, 13 + D2 + 24, null, null, 12 + D2 + 24, null],
    perc: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
  },
  map1: {
    stepSec: 0.15,
    bars: 8,
    bassVol: 0.22,
    leadVol: 0.1,
    bass: [D2, D2, null, D2, null, D2, D2 + 1, null, D2, D2, null, D2, D2 - 2, null, D2 + 1, D2],
    lead: [null, null, 24 + D2 + 12, null, 24 + D2 + 13, null, null, 24 + D2 + 16, null, null, 24 + D2 + 17, null, 24 + D2 + 13, null, 24 + D2 + 12, null],
    perc: ['k', null, 'h', null, 's', null, 'h', null, 'k', 'k', 'h', null, 's', null, 'h', 'h'],
  },
  map2: {
    stepSec: 0.17,
    bars: 8,
    bassVol: 0.24,
    leadVol: 0.08,
    bass: [D2 - 5, null, null, D2 - 5, null, null, D2 - 4, null, D2 - 5, null, null, D2 - 7, null, null, D2 - 4, null],
    lead: [null, null, null, 24 + D2 + 7, null, null, 24 + D2 + 8, null, null, null, 24 + D2 + 12, null, null, 24 + D2 + 8, null, null],
    perc: ['k', null, null, null, 'h', null, null, null, 'k', null, null, 'h', null, null, 's', null],
  },
  boss: {
    stepSec: 0.115,
    bars: 8,
    bassVol: 0.26,
    leadVol: 0.12,
    bass: [D2, D2, D2 + 1, D2, D2, D2 - 2, D2, D2 + 1, D2, D2, D2 + 6, D2, D2 + 1, D2, D2 - 2, D2],
    lead: [24 + D2 + 12, null, 24 + D2 + 13, null, 24 + D2 + 16, null, 24 + D2 + 13, null, 24 + D2 + 12, null, 24 + D2 + 18, null, 24 + D2 + 17, null, 24 + D2 + 13, null],
    perc: ['k', 'h', 's', 'h', 'k', 'h', 's', 'h', 'k', 'h', 's', 'h', 'k', 'k', 's', 'h'],
  },
};

function renderTrack(def: TrackDef): Float32Array {
  const tones: Tone[] = [];
  const stepsTotal = def.bars * 16;
  for (let i = 0; i < stepsTotal; i++) {
    const at = i * def.stepSec;
    const bi = i % def.bass.length;
    const b = def.bass[bi];
    if (b !== null && b !== undefined) {
      tones.push({ type: 'triangle', freq: nf(b), dur: def.stepSec * 1.9, at, vol: def.bassVol, releaseFrac: 0.4 });
    }
    const l = def.lead[i % def.lead.length];
    if (l !== null && l !== undefined) {
      // Small per-bar variation keeps the loop from feeling static.
      const detune = (Math.floor(i / 16) % 2) * 0.4;
      tones.push({
        type: 'square',
        freq: nf(l) + detune,
        dur: def.stepSec * 1.4,
        at,
        vol: def.leadVol,
        duty: 0.3,
        vibDepth: 3,
        vibRate: 5,
      });
    }
    const p = def.perc[i % def.perc.length];
    if (p === 'k') tones.push({ type: 'sine', freq: 110, freqEnd: 40, dur: 0.09, at, vol: 0.4 });
    if (p === 'h') tones.push({ type: 'noise', freq: 4000, freqEnd: 3000, dur: 0.03, at, vol: 0.07 });
    if (p === 's') tones.push({ type: 'noise', freq: 900, freqEnd: 300, dur: 0.08, at, vol: 0.14 });
  }
  return render(tones, stepsTotal * def.stepSec);
}

/** Looping pre-rendered chiptune tracks sharing the SFX AudioContext. */
export class Music {
  private buffers = new Map<MusicKey, AudioBuffer>();
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private current: MusicKey | null = null;
  private sfxRef: Sfx;
  volume = 0.5;

  constructor(sfxRef: Sfx) {
    this.sfxRef = sfxRef;
  }

  /** Render all tracks (takes ~100ms; call once at boot after Sfx.init). */
  init(): void {
    const ctx = this.sfxRef.context;
    if (!ctx || this.buffers.size > 0) return;
    for (const [key, def] of Object.entries(TRACKS) as Array<[MusicKey, TrackDef]>) {
      const samples = renderTrack(def);
      const buf = ctx.createBuffer(1, samples.length, SAMPLE_RATE);
      buf.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
      this.buffers.set(key, buf);
    }
    this.gain = ctx.createGain();
    this.gain.connect(ctx.destination);
  }

  play(key: MusicKey): void {
    const ctx = this.sfxRef.context;
    if (!ctx || !this.gain || this.current === key) return;
    this.stop();
    const buf = this.buffers.get(key);
    if (!buf) return;
    this.current = key;
    this.gain.gain.value = this.volume;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(this.gain);
    src.start();
    this.source = src;
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.gain) this.gain.gain.value = v;
  }

  stop(): void {
    if (this.source) {
      try {
        this.source.stop();
      } catch {
        // Already stopped.
      }
      this.source.disconnect();
      this.source = null;
    }
    this.current = null;
  }
}
