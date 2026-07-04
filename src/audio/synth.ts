/**
 * Tiny code-only synthesizer: renders SFX and music notes to Float32Array
 * sample buffers at boot. No audio assets anywhere in the project.
 */

export const SAMPLE_RATE = 22050;

export type WaveType = 'square' | 'saw' | 'triangle' | 'sine' | 'noise';

export interface Tone {
  type: WaveType;
  /** Start frequency (Hz). */
  freq: number;
  /** End frequency (Hz); defaults to freq (no slide). */
  freqEnd?: number;
  /** Total seconds. */
  dur: number;
  /** Attack seconds. */
  attack?: number;
  /** Release starts at dur*(1-releaseFrac). */
  releaseFrac?: number;
  vol?: number;
  /** Vibrato: depth in Hz, rate in Hz. */
  vibDepth?: number;
  vibRate?: number;
  /** Square duty cycle 0..1. */
  duty?: number;
  /** Start offset in the output buffer, seconds. */
  at?: number;
}

let noiseSeed = 0x1234;
function noise(): number {
  noiseSeed ^= noiseSeed << 13;
  noiseSeed ^= noiseSeed >>> 17;
  noiseSeed ^= noiseSeed << 5;
  return ((noiseSeed >>> 0) % 10000) / 5000 - 1;
}

function oscSample(type: WaveType, phase: number, duty: number): number {
  const t = phase % 1;
  switch (type) {
    case 'square':
      return t < duty ? 1 : -1;
    case 'saw':
      return t * 2 - 1;
    case 'triangle':
      return t < 0.5 ? t * 4 - 1 : 3 - t * 4;
    case 'sine':
      return Math.sin(t * Math.PI * 2);
    case 'noise':
      return noise();
  }
}

/** Render a list of tones (mixed, offset by `at`) into one buffer. */
export function render(tones: Tone[], totalDur?: number): Float32Array {
  const dur = totalDur ?? Math.max(...tones.map((t) => (t.at ?? 0) + t.dur));
  const out = new Float32Array(Math.ceil(dur * SAMPLE_RATE));
  for (const tone of tones) {
    const start = Math.floor((tone.at ?? 0) * SAMPLE_RATE);
    const n = Math.floor(tone.dur * SAMPLE_RATE);
    const attack = Math.max(1, Math.floor((tone.attack ?? 0.005) * SAMPLE_RATE));
    const relStart = Math.floor(n * (1 - (tone.releaseFrac ?? 0.5)));
    const vol = tone.vol ?? 0.5;
    const f0 = tone.freq;
    const f1 = tone.freqEnd ?? tone.freq;
    const duty = tone.duty ?? 0.5;
    let phase = 0;
    for (let i = 0; i < n && start + i < out.length; i++) {
      const p = i / n;
      let f = f0 + (f1 - f0) * p;
      if (tone.vibDepth) f += Math.sin((i / SAMPLE_RATE) * Math.PI * 2 * (tone.vibRate ?? 6)) * tone.vibDepth;
      phase += f / SAMPLE_RATE;
      let env = 1;
      if (i < attack) env = i / attack;
      else if (i > relStart) env = Math.max(0, 1 - (i - relStart) / (n - relStart));
      out[start + i] = (out[start + i] ?? 0) + oscSample(tone.type, phase, duty) * env * vol;
    }
  }
  // Soft clip.
  for (let i = 0; i < out.length; i++) {
    const s = out[i]!;
    out[i] = Math.tanh(s);
  }
  return out;
}

/** Convenience: sequence of quick arpeggio blips. */
export function arp(freqs: number[], step: number, type: WaveType = 'square', vol = 0.4): Tone[] {
  return freqs.map((f, i) => ({
    type,
    freq: f,
    dur: step * 1.6,
    at: i * step,
    vol,
    attack: 0.004,
    releaseFrac: 0.6,
  }));
}

/** Note name -> frequency (A4 = 440). n = semitones from A4. */
export function nf(n: number): number {
  return 440 * Math.pow(2, n / 12);
}
