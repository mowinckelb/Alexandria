import { chromium } from 'playwright';
import fs from 'fs';

fs.mkdirSync('/tmp/fleet-variants', { recursive: true });
const browser = await chromium.launch();

for (let i = 0; i < 6; i++) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('https://www.fleetai.com', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `/tmp/fleet-variants/v${i}.png`, fullPage: false });
  console.log(`v${i} captured`);
  await ctx.close();
}
await browser.close();
