/** window.__test API consumed by Playwright smoke tests. */

export interface TestState {
  scene: string;
  enemies: number;
  hp: number;
  level: number;
  kills: number;
  runTime: number;
  cooldowns: number[];
  playerX: number;
  playerY: number;
  layout: string;
}

export interface TestApi {
  errors: string[];
  game: Phaser.Game | null;
  state: () => TestState | null;
  /** Debug commands registered by GameScene when a run is live. */
  grantXp: ((n: number) => void) | null;
  killPlayer: (() => void) | null;
  /** Jump the run clock (skips to later wave bands / boss). */
  warpTo: ((seconds: number) => void) | null;
  /** Kill every active enemy, bosses included. */
  slayAll: (() => void) | null;
  /** Restore the player to full HP (keeps accelerated tests alive). */
  healFull: (() => void) | null;
  ready: boolean;
  /** HUD ability button centers (canvas px), for touch simulation. */
  buttons: Array<{ x: number; y: number }>;
  /** HUD pause button center (canvas px). */
  pauseButton: { x: number; y: number } | null;
}

declare global {
  interface Window {
    __test: TestApi;
  }
}

export const testApi: TestApi = {
  errors: [],
  game: null,
  state: () => null,
  grantXp: null,
  killPlayer: null,
  warpTo: null,
  slayAll: null,
  healFull: null,
  ready: false,
  buttons: [],
  pauseButton: null,
};

export function installTestHooks(): void {
  window.__test = testApi;
  window.addEventListener('error', (e) => {
    testApi.errors.push(String(e.message));
  });
  window.addEventListener('unhandledrejection', (e) => {
    testApi.errors.push(`unhandledrejection: ${String(e.reason)}`);
  });
}
