// The README screenshots: a month of seeded practice, then Home, a question,
// the singing tuner and Stats, at iPhone size in the dark theme.
// Usage: node scripts/shots-readme.mjs [baseUrl] [outDir]
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const base = process.argv[2] ?? 'http://localhost:4173';
const out = process.argv[3] ?? 'docs/screenshots';
mkdirSync(out, { recursive: true });

const fakeMic = () => {
  const ac = new AudioContext();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  gain.gain.value = 0;
  const dest = ac.createMediaStreamDestination();
  osc.connect(gain).connect(dest);
  osc.start();
  window.__mic = (hz) => {
    if (hz) osc.frequency.value = hz;
    gain.gain.value = hz ? 0.4 : 0;
  };
  navigator.mediaDevices.getUserMedia = async () => (await ac.resume(), dest.stream);
};

const seed = () => {
  let s = 7;
  const rand = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pick = (xs) => xs[Math.floor(rand() * xs.length)];
  const rows = [];
  const day = 86_400_000;
  const now = Date.now();
  const plans = [
    { mode: 'intervals', level: 3, items: ['m2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'P8'], hard: { m6: 'M6', M6: 'm6', m3: 'M3', TT: 'P4', P4: 'P5' } },
    { mode: 'note-id', level: 4, items: ['0', '6', '9', '3', '4', '10', '7', '1'], hard: { '4': '3', '10': '9', '1': '0', '7': '6' } },
    { mode: 'chords', level: 2, items: ['maj', 'min', 'dim', 'aug'], hard: { aug: 'maj', dim: 'min' } },
    { mode: 'singing', level: 2, items: ['M2', 'M3', 'P4', 'P5'], hard: {} },
  ];
  for (let d = 29; d >= 0; d--) {
    if (d > 6 && rand() < 0.3) continue;
    const n = 15 + Math.floor(rand() * 45);
    for (let i = 0; i < n; i++) {
      const p = rand() < 0.55 ? plans[0] : pick(plans);
      const item = pick(p.items);
      const wrongTo = p.hard[item];
      const correct = p.mode === 'singing' ? rand() < 0.8 : wrongTo ? rand() < 0.62 : rand() < 0.93;
      const answer = correct ? item : p.mode === 'singing' ? 'miss' : (wrongTo ?? pick(p.items.filter((x) => x !== item)));
      rows.push({ mode: p.mode, level: p.level, item, answer, correct, ms: 1500, ts: now - d * day - (n - i) * 20_000 - (d === 0 ? 0 : 3_600_000) });
    }
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('pitch-trainer');
    req.onsuccess = () => {
      const tx = req.result.transaction(['attempts', 'progress'], 'readwrite');
      for (const r of rows) tx.objectStore('attempts').add(r);
      tx.oncomplete = () => resolve(rows.length);
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  });
};

const browser = await chromium.launch({ channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript(fakeMic);
const page = await ctx.newPage();
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });

await page.goto(`${base}/`);
await page.getByText('answers today').waitFor();
await page.evaluate(seed);
await page.reload();
await page.waitForTimeout(800);
await shot('home');

await page.goto(`${base}/practice/intervals`);
await page.getByRole('button', { name: /^Start level/ }).click();
await page.locator('button[data-state]').click();
await page.waitForFunction(() => document.querySelector('button[data-state]')?.dataset.state !== 'playing', null, { timeout: 15000 });
await page.getByRole('group', { name: 'Answers' }).getByRole('button').nth(1).click();
await page.waitForTimeout(700);
await shot('practice');

await page.goto(`${base}/practice/singing`);
await page.getByRole('button', { name: /^Start level/ }).click();
const micBtn = page.getByRole('button', { name: 'Turn on microphone' });
if (await micBtn.isVisible().catch(() => false)) await micBtn.click();
await page.waitForSelector('[data-stage="singing"]', { timeout: 15000 });
await page.evaluate(() => window.__mic(222));
await page.waitForTimeout(900);
await shot('singing');

await page.goto(`${base}/stats`);
await page.getByText('In detail').waitFor();
await page.waitForTimeout(500);
await shot('stats');
await page.locator('table').last().evaluate((el) => el.scrollIntoView({ block: 'center' }));
await page.waitForTimeout(300);
await shot('stats-detail');

await browser.close();
console.log('done');
