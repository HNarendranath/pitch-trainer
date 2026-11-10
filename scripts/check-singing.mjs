// End-to-end check of pitch matching with a fake microphone: an oscillator
// the script tunes, standing in for a voice.
// Usage: node scripts/check-singing.mjs [baseUrl] [outDir]
import { chromium } from 'playwright-core';
const base = process.argv[2] ?? 'http://localhost:4173';
const out = process.argv[3];
const shot = async (page, name) => out && page.screenshot({ path: `${out}/${name}.png` });

const fakeMic = (deny) => {
  if (deny) {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException('denied', 'NotAllowedError');
    };
    return;
  }
  const ac = new AudioContext();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  gain.gain.value = 0;
  const dest = ac.createMediaStreamDestination();
  osc.connect(gain).connect(dest);
  osc.start();
  window.__mic = (hz) => {
    void ac.resume();
    if (hz) osc.frequency.value = hz;
    gain.gain.value = hz ? 0.4 : 0;
  };
  navigator.mediaDevices.getUserMedia = async () => {
    await ac.resume();
    return dest.stream;
  };
};

const PCS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const pcOf = (label) => (PCS[label[0]] + (label.includes('♯') ? 1 : label.includes('♭') ? -1 : 0) + 12) % 12;
const hzFor = (semisAboveA2, cents = 0) => 110 * 2 ** ((semisAboveA2 + cents / 100) / 12);

const browser = await chromium.launch({ channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const errors = [];
const result = {};

async function open(deny = false) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  await ctx.addInitScript(fakeMic, deny);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  return page;
}

const ring = (page) => page.locator('button[data-state]').first();
const waitSinging = (page) => page.waitForSelector('button[aria-label="Hear the note again"], button[aria-label="Hear the answer"]', { timeout: 20000 });

/** Sweep through the semitones until the app locks on; returns the semitone used. */
async function sweep(page, cents = 0, snapOff) {
  for (let k = 0; k < 12; k++) {
    await page.evaluate((hz) => window.__mic(hz), hzFor(k, cents));
    await page.waitForTimeout(350);
    if (snapOff && k === 0 && (await ring(page).getAttribute('data-state')) !== 'correct') await shot(page, snapOff);
    await page.waitForTimeout(1250); // the app ignores the first 0.6 s after a note
    if ((await ring(page).getAttribute('data-state')) === 'correct') {
      await page.evaluate(() => window.__mic(0));
      return k;
    }
  }
  return -1;
}

// 1. Setup screen, primer, two matched notes and a skip on level 1.
{
  const page = await open();
  await page.goto(`${base}/practice/singing`);
  await page.getByRole('radio', { name: /Lower/ }).waitFor();
  await shot(page, 'sing-setup');
  await page.getByRole('button', { name: /^Start level/ }).click();
  await page.getByRole('button', { name: 'Turn on microphone' }).waitFor();
  await shot(page, 'sing-primer');
  await page.getByRole('button', { name: 'Turn on microphone' }).click();
  const matches = [];
  for (let i = 0; i < 2; i++) {
    await waitSinging(page);
    const k = await sweep(page, i === 1 ? 12 : 0, i === 0 ? 'sing-off' : undefined);
    const label = await ring(page).locator('span').first().innerText();
    if (i === 1) await shot(page, 'sing-matched');
    matches.push({ k, label: label.split('\n')[0], pcOk: k >= 0 && pcOf(label) === (9 + k) % 12 });
    await page.waitForSelector('button[aria-label="Hear the note again"]', { timeout: 20000 });
  }
  // Mid-hold screenshot: in tune, 12 cents sharp.
  result.matches = matches;
  await page.getByRole('button', { name: 'Skip and hear it' }).click();
  await page.getByRole('button', { name: 'Next note' }).waitFor();
  result.skipReveal = await page.getByRole('status').first().innerText();
  await shot(page, 'sing-missed');
  // Relaunch (iPhone forgets the permission): no explainer, straight to Start.
  await page.reload();
  await page.getByRole('button', { name: /^Start level/ }).click();
  await page.getByRole('button', { name: 'Start' }).waitFor({ timeout: 5000 });
  result.relaunchSkipsPrimer = !(await page.getByRole('button', { name: 'Turn on microphone' }).isVisible());
  await page.close();
}

// 2. From memory (level 5): hold a steady A3 and check the judgement.
{
  const page = await open();
  await page.goto(`${base}/practice/singing`);
  await page.getByText('Not practised yet').first().waitFor();
  await page.locator('input[name=level][value="5"]').dispatchEvent('click');
  await page.getByRole('button', { name: /^Start level/ }).click();
  await page.getByRole('button', { name: 'Turn on microphone' }).click();
  await page.waitForSelector('button[aria-label="Hear the answer"], button[data-state]');
  const prompt = await page.getByRole('status').first().innerText();
  await page.evaluate(() => window.__mic(220));
  await page.waitForTimeout(500);
  await shot(page, 'sing-blind');
  const judged = await page
    .waitForFunction(() => ['correct', 'wrong'].includes(document.querySelector('button[data-state]')?.dataset.state ?? ''), null, { timeout: 8000 })
    .then(() => true, () => false);
  if (!judged) {
    result.blindTimeout = { prompt, ring: await ring(page).innerText(), state: await ring(page).getAttribute('data-state'), body: (await page.locator('body').innerText()).slice(0, 300) };
    if (out) await shot(page, 'sing-blind-timeout');
  }
  const state = await ring(page).getAttribute('data-state');
  const reveal = await page.getByRole('status').first().innerText();
  const askedA = /Sing an A\./.test(prompt);
  result.blind = { prompt, state, reveal, consistent: askedA ? state === 'correct' : state === 'wrong' && /You sang A/.test(reveal) };
  await page.close();
}

// 3. Mic refused.
{
  const page = await open(true);
  await page.goto(`${base}/practice/singing`);
  await page.getByRole('button', { name: /^Start level/ }).click();
  await page.getByRole('button', { name: 'Turn on microphone' }).click();
  await page.getByRole('heading', { name: 'Microphone is off' }).waitFor();
  await shot(page, 'sing-denied');
  result.denied = true;
  await page.close();
}

console.log(JSON.stringify({ result, errors }, null, 1));
await browser.close();
