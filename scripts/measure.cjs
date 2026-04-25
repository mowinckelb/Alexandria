const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: {width:1280,height:720} });
  const p = await ctx.newPage();
  await p.goto('http://localhost:3000/draft', {waitUntil: "networkidle"});
  await p.waitForTimeout(1000);
  await p.evaluate(() => window.scrollTo(0, 1400));
  await p.waitForTimeout(500);
  const m = await p.evaluate(() => {
    const get = sel => {
      const e = document.querySelector(sel);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom) };
    };
    return {
      bottomSlide: get('.bottom-slide'),
      bottomInner: get('.bottom-inner'),
      upper: get('.upper'),
      ornamentWrap: get('.ornament-wrap'),
      orn: get('.orn'),
      upperRight: get('.upper-right'),
      statement: get('.statement'),
      upperCols: get('.upper-cols'),
      lower: get('.lower'),
      wordmarkBlock: get('.wordmark-block'),
      bigWord: get('.big-word'),
      dictLine: get('.dict-line'),
      mottoCenter: get('.motto-center'),
      copyright: get('.copyright'),
    };
  });
  console.log(JSON.stringify(m, null, 2));
  await b.close();
})();
