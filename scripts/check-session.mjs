// End-to-end: play a full interval session, then check that progress was saved.
// Usage: node scripts/check-session.mjs [baseUrl] [outDir]
import { chromium } from 'playwright-core';
const base = process.argv[2] ?? 'http://localhost:4173';
const out = process.argv[3];
const browser = await chromium.launch({ channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark' })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${base}/#/practice/intervals`);
await page.getByRole('button', { name: /^Start level/ }).click();
const ring = page.locator('button[data-state]');
await ring.click(); // first play needs a tap
let wrongs = 0;
for (let i = 0; i < 20; i++) {
  await page.waitForFunction(() => document.querySelector('button[data-state]')?.dataset.state !== 'playing');
  const keys = page.getByRole('group', { name: 'Answers' }).getByRole('button');
  // Alternate a guess pattern so we get both right and wrong answers.
  await keys.nth(i % 3).click();
  await page.waitForTimeout(150);
  const next = page.getByRole('button', { name: 'Next question' });
  if (await next.isVisible()) {
    wrongs++;
    if (i === 3 && out) await page.screenshot({ path: `${out}/session-wrong.png` });
    await next.click();
  } else {
    await page.waitForTimeout(1000); // auto-advance after a right answer
  }
}
await page.getByText(/right in intervals, level 1/).waitFor();
if (out) await page.screenshot({ path: `${out}/session-summary.png` });
const summary = await page.locator('main, body').innerText();
await page.getByRole('button', { name: 'Done' }).click();
await page.waitForTimeout(500);
const home = await page.locator('body').innerText();
if (out) await page.screenshot({ path: `${out}/home-after.png` });
await page.goto(`${base}/#/practice/intervals`);
await page.waitForTimeout(500);
if (out) await page.screenshot({ path: `${out}/setup-after.png` });
const setup = await page.locator('body').innerText();
console.log(JSON.stringify({
  wrongs,
  summaryHasMixups: summary.includes('Mixed up') === wrongs > 0,
  homeCount: /20 of 40/.test(home),
  setupAccuracy: (setup.match(/\d+% over your last 20/) ?? [null])[0],
  errors,
}));
await browser.close();
