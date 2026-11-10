// Regression check: rapid taps on the listen ring must not overlap playback.
// Usage: node scripts/check-replay.mjs [baseUrl]   (expects 2 note starts, then 4)
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await page.addInitScript(() => {
  window.__starts = 0;
  const orig = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) { if (this.buffer && this.buffer.duration > 0.5) window.__starts++; return orig.apply(this, a); };
});
await page.goto((process.argv[2] ?? 'http://localhost:4173') + '/practice/intervals');
await page.getByRole('button', { name: /^Start level/ }).click();
await page.waitForTimeout(1500); // samples load
const ring = page.locator('button[data-state]');
await ring.click(); await ring.click({ delay: 0 }); await page.waitForTimeout(150); await ring.click();
await page.waitForTimeout(3000);
const afterTriple = await page.evaluate(() => window.__starts);
await ring.click();
await page.waitForTimeout(3000);
const afterReplay = await page.evaluate(() => window.__starts);
console.log(JSON.stringify({ afterTriple, afterReplay, expected: '2 then 4' }));
await browser.close();
