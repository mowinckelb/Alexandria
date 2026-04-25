const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [w,h,label] of [[1440,900,'desktop'],[1366,768,'laptop'],[1280,720,'hd']]) {
    const ctx = await b.newContext({ viewport: {width:w,height:h} });
    const p = await ctx.newPage();
    await p.goto('http://localhost:3000/draft', {waitUntil: "domcontentloaded", timeout: 10000});
    await p.waitForTimeout(700);
    const topFit = await p.evaluate(() => {
      const t = document.querySelector('.top-slide');
      const i = document.querySelector('.top-inner');
      return { slideH: t?.clientHeight, innerH: i?.scrollHeight, fits: i?.scrollHeight <= t?.clientHeight };
    });
    await p.screenshot({ path: '/tmp/fit-top-' + label + '.png' });
    await p.evaluate((y) => window.scrollTo(0, y), h * 1.2);
    await p.waitForTimeout(600);
    const botFit = await p.evaluate(() => {
      const s = document.querySelector('.bottom-slide');
      return { slideH: s?.clientHeight, scrollH: s?.scrollHeight, fits: s?.scrollHeight <= s?.clientHeight };
    });
    await p.screenshot({ path: '/tmp/fit-bot-' + label + '.png' });
    console.log(label, `${w}x${h}`, 'top:', topFit, 'bot:', botFit);
    await ctx.close();
  }
  await b.close();
})();
