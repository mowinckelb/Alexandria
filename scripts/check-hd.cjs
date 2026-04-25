const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: {width:1280,height:720}, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto('http://localhost:3000/draft', {waitUntil: "networkidle"});
  await p.waitForTimeout(1500);
  await p.evaluate(() => window.scrollTo(0, 1400));
  await p.waitForTimeout(700);
  await p.screenshot({ path: '/tmp/hd-back.png' });
  // Inspect ornament wrapping element
  const info = await p.evaluate(() => {
    const orn = document.querySelector('.orn');
    const ow = document.querySelector('.ornament-wrap');
    const ul = document.querySelector('.upper-left');
    const u = document.querySelector('.upper');
    const wb = document.querySelector('.wordmark-block');
    const r = e => e ? { w: e.clientWidth, h: e.clientHeight, top: e.getBoundingClientRect().top, bottom: e.getBoundingClientRect().bottom } : null;
    return {
      upper: r(u),
      upperLeft: r(ul),
      wordmarkBlock: r(wb),
      ornamentWrap: r(ow),
      orn: r(orn),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await b.close();
})();
