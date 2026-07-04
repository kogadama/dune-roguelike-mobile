import Phaser from 'phaser';
import { TEST_PARAMS } from './config';
import { installTestHooks, testApi } from './util/testHooks';
import { BootScene } from './scenes/BootScene';
import { TextureGenScene } from './scenes/TextureGenScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { LevelUpScene } from './scenes/LevelUpScene';
import { PauseScene } from './scenes/PauseScene';
import { ResultsScene } from './scenes/ResultsScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { MetaUpgradeScene } from './scenes/MetaUpgradeScene';

installTestHooks();

if (TEST_PARAMS.seed !== null) {
  const { globalRng } = await import('./util/rng');
  globalRng.reseed(TEST_PARAMS.seed);
}

const game = new Phaser.Game({
  type: TEST_PARAMS.canvas ? Phaser.CANVAS : Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#120a05',
  pixelArt: true,
  roundPixels: true,
  disableContextMenu: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoRound: true,
  },
  input: {
    activePointers: 4,
  },
  fps: {
    smoothStep: true,
  },
  scene: [
    BootScene,
    TextureGenScene,
    MainMenuScene,
    GameScene,
    HudScene,
    LevelUpScene,
    PauseScene,
    ResultsScene,
    CharacterSelectScene,
    MetaUpgradeScene,
  ],
});

testApi.game = game;

// Pause the whole sim when backgrounded (audio and timers included).
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    game.loop.sleep();
  } else {
    game.loop.wake();
  }
});

// PWA service worker (vite-plugin-pwa virtual module).
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => undefined);
}
