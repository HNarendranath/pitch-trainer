// Seeds a month of plausible practice into a fresh browser, then screenshots
// the Stats screen in dark and light. Usage: node scripts/shots-stats.mjs [baseUrl] outDir
import { chromium } from 'playwright-core';
const base = process.argv[2] ?? 'http://localhost:4173';
const out = process.argv[3];

const seed = () => {
  // Deterministic random so screenshots are comparable run to run.
  let s = 7;
  const rand = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pick = (xs) => xs[Math.floor(rand() * xs.length)];
  const rows = [];
  const day = 86_400_000;
  const now = Date.now();
  const plans = [
    { mode: 'intervals', level: 3, items: ['m2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'P8'], hard: { m6: 'M6', M6: 'm6', m3: 'M3', TT: 'P4', P4: 'P5' } },
    { mode: 'note-id', level: 4, items: ['0', '6', '9', '3', '4', '10', '7', '1'], hard: { '4': '3', '10': '9', '1': '0', '7': '6' } },
    { mode: 'progressions', level: 2, items: ['I–IV–V–I', 'I–V–vi–IV', 'I–vi–IV–V', 'vi–IV–I–V'], hard: { 'I–vi–IV–V': 'I–V–vi–IV', 'vi–IV–I–V': 'I–V–vi–IV' } },
    { mode: 'singing', level: 2, items: ['M2', 'M3', 'P4', 'P5'], hard: {} },
  ];
  for (let d = 29; d >= 0; d--) {
    if (d > 3 && rand() < 0.3) continue; // some days off, last few days unbroken
    const n = 15 + Math.floor(rand() * 45);
    for (let i = 0; i < n; i++) {
      const p = rand() < 0.55 ? plans[0] : pick(plans);
      const item = pick(p.items);
      const wrongTo = p.hard[item];
      const correct = p.mode === 'singing' ? rand() < 0.8 : wrongTo ? rand() < 0.62 : rand() < 0.93;
      const answer = correct ? item : p.mode === 'singing' ? 'miss' : (wrongTo ?? pick(p.items.filter((x) => x !== item)));
      rows.push({ mode: p.mode, level: p.level, item, answer, correct, ms: 1500, ts: now - d * day - (n - i) * 20_000 });
    }
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('pitch-trainer');
    req.onsuccess = () => {
      const tx = req.result.transaction('attempts', 'readwrite');
      for (const r of rows) tx.objectStore('attempts').add(r);
      tx.oncomplete = () => resolve(rows.length);
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  });
};

const browser = await chromium.launch({ channel: 'chrome' });
for (const scheme of ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${base}/`);
  await page.getByText('answers today').waitFor(); // the app has created its database
  if (scheme === 'light') await page.evaluate(() => localStorage.setItem('pt-settings', JSON.stringify({ state: { theme: 'light' }, version: 1 })));
  const n = await page.evaluate(seed);
  await page.goto(`${base}/stats`);
  await page.getByText('In detail').waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/stats-${scheme}.png`, fullPage: true });
  // Tap a day and a heatmap cell, then the note-id and progressions details.
  await page.getByRole('radio', { name: 'Intervals' }).check({ force: true });
  const plot = page.locator('[class*=dailyPlot]');
  const box = await plot.boundingBox();
  await page.mouse.click(box.x + box.width * 0.9, box.y + box.height - 4);
  await page.locator('td[data-step]').first().click();
  await page.screenshot({ path: `${out}/stats-${scheme}-tapped.png`, fullPage: true });
  for (const name of ['Perfect pitch', 'Progressions']) {
    await page.getByRole('radio', { name }).check({ force: true });
    await page.waitForTimeout(300);
    await page.locator('#detail-h').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/stats-${scheme}-${name.split(' ')[0].toLowerCase()}.png`, fullPage: true });
  }
  console.log(scheme, 'seeded', n);
  await ctx.close();
}
await browser.close();
