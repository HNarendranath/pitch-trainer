// Smoke test every listening mode: start level N, play, answer, check the reveal.
// Usage: node scripts/check-modes.mjs [baseUrl] [outDir] [level]
import { chromium } from 'playwright-core';
const base = process.argv[2] ?? 'http://localhost:4173';
const out = process.argv[3];
const levelArg = process.argv[4];
const modes = ['intervals', 'chords', 'note-id', 'scale-degrees', 'scales', 'progressions'];
const browser = await chromium.launch({ channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const results = {};
for (const mode of modes) {
  await page.goto(`${base}/#/practice/${mode}`);
  if (levelArg) await page.locator(`input[name=level][value="${levelArg}"]`).check({ force: true });
  await page.getByRole('button', { name: /^Start level/ }).click();
  const ring = page.locator('button[data-state]');
  await ring.click();
  await page.waitForTimeout(400);
  if (out) await page.screenshot({ path: `${out}/${mode}-playing.png` });
  await page.waitForFunction(() => document.querySelector('button[data-state]')?.dataset.state !== 'playing', null, { timeout: 15000 });
  const keys = page.getByRole('group', { name: 'Answers' }).getByRole('button');
  const n = await keys.count();
  await keys.nth(n - 1).click();
  await page.waitForTimeout(200);
  const reveal = await page.getByRole('status').first().innerText();
  if (out) await page.screenshot({ path: `${out}/${mode}-answered.png` });
  results[mode] = { keys: n, reveal };
}
console.log(JSON.stringify({ results, errors }, null, 1));
await browser.close();
