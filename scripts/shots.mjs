// Phone-size screenshots of the running app (uses the installed Chrome).
// Usage: node scripts/shots.mjs <baseUrl> <outDir> [scheme=dark|light]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const [base = 'http://localhost:4173', out = 'shots', scheme = 'dark'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

const devices = {
  iphone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  pixel: { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];
for (const [name, dev] of Object.entries(devices)) {
  const ctx = await browser.newContext({ ...dev, colorScheme: scheme });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${name} console: ${m.text()}`));
  const shot = async (label) => page.screenshot({ path: `${out}/${name}-${scheme}-${label}.png` });

  await page.goto(`${base}/`);
  await page.waitForLoadState('networkidle');
  await shot('home');

  await page.goto(`${base}/practice/intervals`);
  await page.waitForTimeout(400);
  await shot('level-setup');
  await page.getByRole('button', { name: /^Start level/ }).click();
  await page.waitForTimeout(600);
  await shot('practice-start');
  await page.getByRole('button', { name: 'Play' }).click();
  await page.waitForTimeout(400);
  await shot('practice-playing');
  await page.waitForTimeout(1800);
  // pick a (probably wrong) answer to capture feedback state
  await page.getByRole('group', { name: 'Answers' }).getByRole('button').first().click();
  await page.waitForTimeout(500);
  await shot('practice-answered');

  await page.goto(`${base}/settings`);
  await page.waitForTimeout(300);
  await shot('settings');
  await ctx.close();
}
await browser.close();
console.log(errors.length ? errors.join('\n') : 'no page errors');
