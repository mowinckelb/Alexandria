import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto('https://www.fleetai.com', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
// Scroll until back slide is fully revealed
const innerH = 900;
for (const [name, y] of [['top', 0], ['mid', innerH * 0.5], ['rev', innerH * 1.05], ['end', innerH * 1.4]]) {
  await page.evaluate(yy => window.scrollTo(0, yy), y);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `/tmp/fleet-${name}.png`, fullPage: false });
  console.log(`/tmp/fleet-${name}.png @ y=${y}`);
}
await browser.close();
