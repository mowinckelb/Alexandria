import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/draft', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

for (const [name, y] of [['00-top', 0], ['25pct', 225], ['50pct', 450], ['75pct', 675], ['end', 1400]]) {
  await page.evaluate(yy => window.scrollTo(0, yy), y);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `/tmp/draft-${name}.png`, fullPage: false });
  console.log(`/tmp/draft-${name}.png @ y=${y}`);
}
await browser.close();
