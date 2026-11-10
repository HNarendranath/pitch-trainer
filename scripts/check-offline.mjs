// Verifies the deployed PWA: service worker active, piano precached, app loads offline.
// Usage: node scripts/check-offline.mjs <url>
import { chromium } from 'playwright-core';
const url = process.argv[2] ?? 'http://localhost:4173';
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.goto(url);
const swState = await page.evaluate(async () => (await navigator.serviceWorker.ready).active?.state);
await page.waitForTimeout(4000); // let precache finish
const cached = await page.evaluate(async () => {
  let piano = 0, total = 0;
  for (const name of await caches.keys()) for (const req of await (await caches.open(name)).keys()) { total++; if (req.url.includes('/samples/piano/')) piano++; }
  return { piano, total };
});
await ctx.setOffline(true);
await page.goto(url + '/practice/intervals');
const offlineOk = await page.getByRole('heading', { name: 'Intervals' }).isVisible();
console.log(JSON.stringify({ swState, ...cached, offlineOk }));
await browser.close();
