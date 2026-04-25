import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/draft', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const result = await page.evaluate(() => {
  const el = document.querySelector('.nav-brand');
  if (!el) return { error: 'no .nav-brand found' };
  const cs = getComputedStyle(el);
  const rootStyle = getComputedStyle(document.documentElement);
  return {
    fontFamily: cs.fontFamily,
    fontSize: cs.fontSize,
    fontStyle: cs.fontStyle,
    fontWeight: cs.fontWeight,
    varBodoni: rootStyle.getPropertyValue('--font-bodoni'),
    varInter: rootStyle.getPropertyValue('--font-inter'),
    varInstrument: rootStyle.getPropertyValue('--font-instrument'),
    rootClassName: document.body.firstElementChild?.className || '?',
    outerHTML: el.outerHTML.slice(0, 300),
  };
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
