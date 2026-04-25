import { chromium } from 'playwright';
import fs from 'fs';

const OUT = '/tmp/fleet-scroll';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto('https://www.fleetai.com', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

// total height
const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight);
const viewportHeight = 900;
console.log('totalHeight', totalHeight, 'viewport', viewportHeight);

// Capture slices at each viewport
let i = 0;
for (let y = 0; y < totalHeight; y += Math.floor(viewportHeight * 0.85)) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(900);
  const p = `${OUT}/slice_${String(i).padStart(2, '0')}_y${y}.png`;
  await page.screenshot({ path: p, fullPage: false });
  console.log(p);
  i++;
  if (i > 20) break;
}

// Also one true full-page
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/full.png`, fullPage: true });
console.log(`${OUT}/full.png`);

await browser.close();
