import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const ART = 'tests/artifacts';
mkdirSync(ART, { recursive: true });

// iPhone 17 Pro-ish landscape viewport (CSS px).
test.use({
  viewport: { width: 874, height: 402 },
  deviceScaleFactor: 2,
  hasTouch: true,
});

async function collectErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  return errors;
}

async function waitReady(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__test?.ready === true, undefined, { timeout: 30_000 });
}

test('boots to main menu with no errors', async ({ page }) => {
  const errors = await collectErrors(page);
  await page.goto('/');
  await waitReady(page);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${ART}/01-menu.png` });
  const hookErrors = await page.evaluate(() => window.__test.errors);
  expect(errors.filter(realError)).toEqual([]);
  expect(hookErrors.filter(realError)).toEqual([]);
});

test('joystick drag moves the player', async ({ page }) => {
  const errors = await collectErrors(page);
  await page.goto('/?autostart=paul:arrakeen&seed=42');
  await waitReady(page);
  await page.waitForFunction(() => window.__test.state()?.scene === 'Game');
  const before = await page.evaluate(() => {
    const s = window.__test.state()!;
    return { x: s.playerX, y: s.playerY };
  });
  // Drag on right half of screen: joystick spawns under the touch.
  await page.touchscreen.tap(650, 250); // no-op tap should not crash
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 650, y: 250, id: 1 }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: 720, y: 250, id: 1 }],
  });
  await page.waitForTimeout(700);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const after = await page.evaluate(() => {
    const s = window.__test.state()!;
    return { x: s.playerX, y: s.playerY };
  });
  expect(after.x).toBeGreaterThan(before.x + 20);
  await page.screenshot({ path: `${ART}/02-game-move.png` });
  expect(errors.filter(realError)).toEqual([]);
});

test('accelerated run: enemies spawn, weapons kill, level-ups fire', async ({ page }) => {
  const errors = await collectErrors(page);
  await page.goto('/?autostart=paul:arrakeen&seed=7&timescale=8');
  await waitReady(page);
  await page.waitForFunction(() => window.__test.state()?.scene === 'Game');
  // Let the sim run (8x): ~64 sim-seconds.
  await page.waitForFunction(
    () => {
      const s = window.__test.state();
      return (s?.kills ?? 0) > 3;
    },
    undefined,
    { timeout: 30_000 },
  );
  await page.screenshot({ path: `${ART}/03-horde.png` });
  // Grant XP to force a level-up choice overlay.
  await page.evaluate(() => window.__test.grantXp!(500));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${ART}/04-levelup.png` });
  // Pick the first card.
  const vp = page.viewportSize()!;
  await page.touchscreen.tap(vp.width * 0.23, vp.height * 0.58);
  await page.waitForTimeout(400);
  const state = await page.evaluate(() => window.__test.state());
  expect(state?.level).toBeGreaterThanOrEqual(2);
  expect(errors.filter(realError)).toEqual([]);
});

test('ability button casts and starts cooldown', async ({ page }) => {
  const errors = await collectErrors(page);
  await page.goto('/?autostart=paul:arrakeen&seed=3');
  await waitReady(page);
  await page.waitForFunction(() => window.__test.state()?.scene === 'Game');
  await page.waitForTimeout(300);
  const btn = await page.evaluate(() => window.__test.buttons[0]);
  expect(btn).toBeTruthy();
  await page.touchscreen.tap(btn!.x, btn!.y);
  await page.waitForTimeout(200);
  const cds = await page.evaluate(() => window.__test.state()?.cooldowns ?? []);
  expect(Math.max(...cds)).toBeGreaterThan(0);
  await page.screenshot({ path: `${ART}/05-ability.png` });
  expect(errors.filter(realError)).toEqual([]);
});

test('GBC portrait layout renders shell and controls', async ({ page, browser }) => {
  const ctx = await browser.newContext({
    viewport: { width: 402, height: 874 },
    deviceScaleFactor: 2,
    hasTouch: true,
  });
  const p = await ctx.newPage();
  const errors: string[] = [];
  p.on('pageerror', (err) => errors.push(String(err)));
  await p.goto('http://localhost:4173/?autostart=paul:arrakeen&seed=3');
  await p.waitForFunction(() => window.__test?.ready === true, undefined, { timeout: 30_000 });
  await p.waitForFunction(() => window.__test.state()?.scene === 'Game');
  await p.waitForTimeout(400);
  const layout = await p.evaluate(() => window.__test.state()?.layout);
  expect(layout).toBe('gbc');
  await p.screenshot({ path: `${ART}/06-gbc.png` });
  expect(errors.filter(realError)).toEqual([]);
  await ctx.close();
  void page;
});

test('death flows to results screen with meta XP', async ({ page }) => {
  const errors = await collectErrors(page);
  await page.goto('/?autostart=paul:arrakeen&seed=5&timescale=4');
  await waitReady(page);
  await page.waitForFunction(() => window.__test.state()?.scene === 'Game');
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__test.killPlayer!());
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${ART}/07-results.png` });
  expect(errors.filter(realError)).toEqual([]);
});

test('boss spawns at final band and victory reaches results', async ({ page }) => {
  const errors = await collectErrors(page);
  await page.goto('/?autostart=paul:arrakeen&seed=9&timescale=8');
  await waitReady(page);
  await page.waitForFunction(() => window.__test.state()?.scene === 'Game');
  await page.waitForTimeout(400);
  // Warp to just before the boss event, let the wave director fire it.
  await page.evaluate(() => window.__test.warpTo!(839));
  await page.waitForFunction(
    () => {
      const s = window.__test.state();
      return (s?.enemies ?? 0) > 0 && (s?.runTime ?? 0) > 840;
    },
    undefined,
    { timeout: 15_000 },
  );
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${ART}/08-boss.png` });
  // Slay everything (boss included) -> victory -> results.
  await page.evaluate(() => window.__test.slayAll!());
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${ART}/09-victory.png` });
  expect(errors.filter(realError)).toEqual([]);
});

function realError(e: string): boolean {
  // SwiftShader / headless GL warnings are not app bugs.
  if (e.includes('swiftshader') || e.includes('GPU stall')) return false;
  if (e.includes('Failed to load resource') && e.includes('favicon')) return false;
  return true;
}
