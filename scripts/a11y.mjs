// Accessibility scan: axe-core (WCAG 2.1 A/AA) on every screen in both themes,
// plus touch targets under 44px and the keyboard tab order on Home.
// Usage: node scripts/a11y.mjs [baseUrl]
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';

const base = process.argv[2] ?? 'http://localhost:4173';
const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

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

async function scan(page, name, findings) {
  await page.addScriptTag({ content: axeSource });
  const res = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 4).map((n) => n.target.join(' ') + (n.any[0]?.message ? ` | ${n.any[0].message}` : '')) }));
  });
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('button, a, input, select, [role=button], label:has(input)')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 0 && cs.visibility !== 'hidden' && !el.closest('.sr-only') && (r.width < 44 || r.height < 44) && !(el.tagName === 'INPUT' && el.closest('label'));
      })
      .map((el) => `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 24)}" ${Math.round(el.getBoundingClientRect().width)}×${Math.round(el.getBoundingClientRect().height)}`),
  );
  findings.push({ screen: name, axe: res, smallTargets: [...new Set(small)] });
}

const browser = await chromium.launch({ channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const report = [];
for (const theme of ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(fakeMic);
  await ctx.addInitScript((t) => {
    if (!localStorage.getItem('pt-settings')) localStorage.setItem('pt-settings', JSON.stringify({ state: { theme: t }, version: 1 }));
  }, theme);
  const page = await ctx.newPage();
  const at = async (name, fn) => {
    await fn();
    await page.waitForTimeout(350);
    await scan(page, `${theme}: ${name}`, report);
  };

  await at('home', () => page.goto(`${base}/`));
  await at('setup', () => page.goto(`${base}/practice/intervals`));
  await at('practice (before play)', () => page.getByRole('button', { name: /^Start level/ }).click());
  await at('practice (answered)', async () => {
    await page.locator('button[data-state]').click();
    await page.waitForFunction(() => document.querySelector('button[data-state]')?.dataset.state !== 'playing', null, { timeout: 15000 });
    await page.getByRole('group', { name: 'Answers' }).getByRole('button').first().click();
  });
  await at('summary', async () => {
    for (let i = 0; i < 40 && !(await page.getByText(/right in intervals/).isVisible()); i++) {
      const next = page.getByRole('button', { name: 'Next question' });
      if (await next.isVisible()) await next.click();
      await page.waitForFunction(() => document.querySelector('button[data-state]')?.dataset.state !== 'playing', null, { timeout: 15000 }).catch(() => {});
      const keys = page.getByRole('group', { name: 'Answers' }).getByRole('button');
      if (await keys.count()) await keys.first().click().catch(() => {});
      await page.waitForTimeout(250);
    }
  });
  await at('singing setup', () => page.goto(`${base}/practice/singing`));
  await at('mic primer', () => page.getByRole('button', { name: /^Start level/ }).click());
  await at('singing session', async () => {
    await page.getByRole('button', { name: 'Turn on microphone' }).click();
    await page.waitForSelector('[data-stage="singing"]', { timeout: 15000 });
    await page.evaluate(() => window.__mic(196));
  });
  await at('settings', () => page.goto(`${base}/settings`));
  await at('stats', () => page.goto(`${base}/stats`));

  // Keyboard: tab through Home and record what gets focus.
  if (theme === 'dark') {
    await page.goto(`${base}/`);
    const order = [];
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('Tab');
      order.push(
        await page.evaluate(() => {
          const el = document.activeElement;
          const outline = getComputedStyle(el).outlineStyle !== 'none' || getComputedStyle(el).boxShadow !== 'none';
          return `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 30)}"${outline ? '' : ' [NO VISIBLE FOCUS]'}`;
        }),
      );
    }
    report.push({ screen: 'keyboard: home tab order', order });
  }
  await ctx.close();
}
console.log(JSON.stringify(report, null, 1));
await browser.close();
