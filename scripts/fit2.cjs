const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [w,h,label] of [[1440,900,'desktop'],[1366,768,'laptop'],[1280,720,'hd']]) {
    const ctx = await b.newContext({ viewport: {width:w,height:h} });
    const p = await ctx.newPage();
    await p.goto('http://localhost:3000/draft', {waitUntil: "networkidle"});
    await p.waitForTimeout(1000);
    // Measure WITHOUT scrolling - bottom slide is fixed so dimensions don't depend on scroll
    const botFit = await p.evaluate(() => {
      const s = document.querySelector('.bottom-slide');
      const i = document.querySelector('.bottom-inner');
      const upper = document.querySelector('.upper');
      const lower = document.querySelector('.lower');
      const stmt = document.querySelector('.statement');
      const cols = document.querySelector('.upper-cols');
      return { 
        slideH: s?.clientHeight, 
        scrollH: s?.scrollHeight, 
        innerH: i?.clientHeight,
        upperH: upper?.clientHeight,
        lowerH: lower?.clientHeight,
        stmtH: stmt?.clientHeight,
        colsH: cols?.clientHeight,
        fits: s?.scrollHeight <= s?.clientHeight 
      };
    });
    await p.evaluate((y) => window.scrollTo(0, y), h * 1.2);
    await p.waitForTimeout(500);
    await p.screenshot({ path: '/tmp/fit-bot-' + label + '.png' });
    console.log(label, `${w}x${h}`, 'bot:', botFit);
    await ctx.close();
  }
  await b.close();
})();
