/** Global engine configuration, perf budgets, and URL test parameters. */

/** Virtual resolution: fixed height, variable width (fills any aspect). */
export const VIRTUAL_HEIGHT = 270;

/** Hard caps that keep the sim mobile-friendly. */
export const PERF = {
  maxEnemies: 250,
  enemyPoolSize: 400,
  maxProjectiles: 220,
  maxGems: 180,
  maxParticles: 400,
  maxDamageNumbers: 40,
  /** Rolling FPS below this halves ambient particle budgets. */
  fpsDegradeThreshold: 55,
} as const;

export interface TestParams {
  seed: number | null;
  /** e.g. "paul:arrakeen" — skip menus, jump straight into a run. */
  autostart: { character: string; map: string } | null;
  /** Simulation speed multiplier for accelerated smoke tests. */
  timescale: number;
  /** Force canvas renderer (headless WebGL fallback). */
  canvas: boolean;
}

export function readTestParams(): TestParams {
  const q = new URLSearchParams(location.search);
  const auto = q.get('autostart');
  let autostart: TestParams['autostart'] = null;
  if (auto && auto.includes(':')) {
    const [character = '', map = ''] = auto.split(':');
    autostart = { character, map };
  }
  const seed = q.get('seed');
  return {
    seed: seed !== null ? Number(seed) : null,
    autostart,
    timescale: Math.max(0.1, Math.min(32, Number(q.get('timescale') ?? 1) || 1)),
    canvas: q.get('renderer') === 'canvas',
  };
}

export const TEST_PARAMS = readTestParams();
