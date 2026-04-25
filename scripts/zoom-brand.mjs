import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/draft', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// Clip to just the nav brand area
await page.screenshot({ path: '/tmp/brand-zoom.png', clip: { x: 0, y: 0, width: 320, height: 80 } });
console.log('done');
await browser.close();
