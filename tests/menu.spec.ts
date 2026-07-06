import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const ART = 'tests/artifacts';
mkdirSync(ART, { recursive: true });

// Portrait phone: menus must be tappable one-handed at their visible labels.
test.use({
  viewport: { width: 402, height: 874 },
  deviceScaleFactor: 2,
  hasTouch: true,
});

async function waitReady(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__test?.ready === true, undefined, { timeout: 30_000 });
}

/**
 * Screen-space center of the first visible BitmapText in `sceneKey` whose
 * text starts with `label`. Tapping exactly where the label is drawn is the
 * regression check: hit areas must cover their labels.
 */
async function labelPoint(page: Page, sceneKey: string, label: string): Promise<{ x: number; y: number }> {
  const pt = await page.evaluate(([scParam, lbParam]) => {
    const game = window.__test.game;
    if (!game) return null;
    const scene = game.scene.getScene(scParam!);
    if (!scene) return null;
    interface TextObj { type: string; text?: string; x: number; y: number; visible: boolean }
    const list = scene.children.list as unknown as TextObj[];
    const t = list.find((c) => c.type === 'BitmapText' && c.visible && (c.text ?? '').startsWith(lbParam!));
    if (!t) return null;
    const cam = scene.cameras.main;
    return {
      x: (t.x - cam.worldView.x) * cam.zoom,
      y: (t.y - cam.worldView.y) * cam.zoom,
    };
  }, [sceneKey, label] as const);
  expect(pt, `label "${label}" in scene ${sceneKey}`).toBeTruthy();
  return pt!;
}

async function tapLabel(page: Page, sceneKey: string, label: string): Promise<void> {
  const pt = await labelPoint(page, sceneKey, label);
  await page.touchscreen.tap(Math.round(pt.x), Math.round(pt.y));
}

async function waitSceneActive(page: Page, key: string): Promise<void> {
  await page.waitForFunction(
    (k) => window.__test.game?.scene.isActive(k) === true,
    key,
    { timeout: 10_000 },
  );
}

test('every menu button responds to a tap on its label (portrait)', async ({ page }) => {
  await page.goto('/');
  await waitReady(page);
  await page.waitForTimeout(400);

  // Main menu -> settings (tiny top-left button; must not fall through to
  // the tap-to-begin handler).
  await tapLabel(page, 'MainMenu', 'SETTINGS');
  await waitSceneActive(page, 'Pause');
  await page.screenshot({ path: `${ART}/20-settings.png` });

  // Volume steps snap to the 25% grid from the 80% default.
  await tapLabel(page, 'Pause', 'SFX');
  await page.waitForTimeout(150);
  expect(
    await page.evaluate(
      () => (window.__test.game!.registry.get('save') as { data: { settings: { sfxVolume: number } } }).data.settings.sfxVolume,
    ),
  ).toBe(1);
  await labelPoint(page, 'Pause', 'SFX: 100%'); // label + hit area refreshed

  await tapLabel(page, 'Pause', 'BACK');
  await waitSceneActive(page, 'MainMenu');

  // Tap-to-begin still works anywhere outside the settings button.
  await page.touchscreen.tap(201, 500);
  await waitSceneActive(page, 'CharacterSelect');
  await page.screenshot({ path: `${ART}/21-charselect.png` });

  await tapLabel(page, 'CharacterSelect', 'UPGRADES');
  await waitSceneActive(page, 'MetaUpgrade');
  await page.screenshot({ path: `${ART}/22-metaupgrade.png` });

  await tapLabel(page, 'MetaUpgrade', '< BACK');
  await waitSceneActive(page, 'CharacterSelect');

  await tapLabel(page, 'CharacterSelect', 'START');
  await page.waitForFunction(() => window.__test.state()?.scene === 'Game', undefined, { timeout: 10_000 });
  await page.waitForTimeout(400);

  // In-game pause button (GBC START pill in portrait), then resume.
  const pause = await page.evaluate(() => window.__test.pauseButton);
  expect(pause).toBeTruthy();
  await page.touchscreen.tap(pause!.x, pause!.y);
  await waitSceneActive(page, 'Pause');
  await page.screenshot({ path: `${ART}/23-ingame-pause.png` });

  await tapLabel(page, 'Pause', 'RESUME');
  await waitSceneActive(page, 'Game');
});

test('pause settings lay out in two tappable columns (landscape)', async ({ browser }) => {
  const ctx = await browser.newContext({
    viewport: { width: 874, height: 402 },
    deviceScaleFactor: 2,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4173/');
  await waitReady(page);
  await page.waitForTimeout(400);

  await tapLabel(page, 'MainMenu', 'SETTINGS');
  await waitSceneActive(page, 'Pause');
  await page.screenshot({ path: `${ART}/24-settings-landscape.png` });

  // Right-column row (MUSIC) and a left-column row (BATTERY) both respond.
  await tapLabel(page, 'Pause', 'MUSIC');
  await page.waitForTimeout(150);
  expect(
    await page.evaluate(
      () => (window.__test.game!.registry.get('save') as { data: { settings: { musicVolume: number } } }).data.settings.musicVolume,
    ),
  ).toBe(0.75);

  await tapLabel(page, 'Pause', 'BATTERY SAVER');
  await page.waitForTimeout(150);
  expect(
    await page.evaluate(
      () => (window.__test.game!.registry.get('save') as { data: { settings: { batterySaver: boolean } } }).data.settings.batterySaver,
    ),
  ).toBe(true);

  await tapLabel(page, 'Pause', 'BACK');
  await waitSceneActive(page, 'MainMenu');
  await ctx.close();
});
