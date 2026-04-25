const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: {width:1280,height:720} });
  const p = await ctx.newPage();
  await p.goto('http://localhost:3000/draft', {waitUntil: "networkidle"});
  await p.waitForTimeout(1500);
  // First check static layout (no scroll)
  const m1 = await p.evaluate(() => {
    const get = sel => {
      const e = document.querySelector(sel);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      const cs = window.getComputedStyle(e);
      return { 
        w: Math.round(r.width), 
        h: Math.round(r.height),
        position: cs.position,
        gridCols: cs.gridTemplateColumns,
      };
    };
    return {
      vw: window.innerWidth,
      vh: window.innerHeight,
      bottomSlide: get('.bottom-slide'),
      upper: get('.upper'),
      orn: get('.orn'),
      lower: get('.lower'),
    };
  });
  console.log(JSON.stringify(m1, null, 2));
  await b.close();
})();
