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
  ready: boolean;
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
  ready: false,
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
