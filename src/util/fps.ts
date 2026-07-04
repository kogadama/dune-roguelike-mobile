import Phaser from 'phaser';

/**
 * Runtime FPS cap toggle. TimeStep binds its step function at start/wake,
 * so after flipping the limit fields we bounce the loop to rebind.
 */
export function applyFpsCap(game: Phaser.Game, cap: 30 | 60): void {
  const loop = game.loop as Phaser.Core.TimeStep & { _limitRate: number };
  if (cap >= 60) {
    loop.fpsLimit = 0;
    loop.hasFpsLimit = false;
    loop._limitRate = 0;
  } else {
    loop.fpsLimit = cap;
    loop.hasFpsLimit = true;
    loop._limitRate = 1000 / cap;
  }
  if (loop.running) {
    loop.sleep();
    loop.wake();
  }
}
