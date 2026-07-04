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

function realError(e: string): boolean {
  // SwiftShader / headless GL warnings are not app bugs.
  if (e.includes('swiftshader') || e.includes('GPU stall')) return false;
  if (e.includes('Failed to load resource') && e.includes('favicon')) return false;
  return true;
}
