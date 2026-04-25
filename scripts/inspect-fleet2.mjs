import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const requests = [];
page.on('request', req => requests.push({ url: req.url(), type: req.resourceType(), method: req.method() }));
page.on('response', async (res) => {
  const url = res.url();
  if (/\.(mp4|webm|mov|json|lottie)(\?|$)/.test(url)) {
    console.log('MEDIA RESPONSE:', res.status(), url);
  }
});

await page.goto('https://www.fleetai.com', { waitUntil: 'networkidle' });
await page.waitForTimeout(5000);

// Scroll through to trigger any lazy loads
for (let y = 0; y < 3000; y += 400) {
  await page.evaluate(yy => window.scrollTo(0, yy), y);
  await page.waitForTimeout(500);
}
await page.waitForTimeout(2000);

console.log('\n=== IMAGES (possibly the orbs) ===');
requests.filter(r => r.type === 'image' || /\.(png|webp|jpg|jpeg|svg|avif)(\?|$)/.test(r.url))
  .forEach(r => console.log(r.url));

console.log('\n=== MEDIA ===');
requests.filter(r => r.type === 'media' || /\.(mp4|webm|mov|lottie)(\?|$)/.test(r.url))
  .forEach(r => console.log(r.url));

console.log('\n=== JSON (may be lottie) ===');
requests.filter(r => /\.json(\?|$)/.test(r.url))
  .forEach(r => console.log(r.url));

console.log('\n=== SCRIPTS (libraries: look for three, gsap, lottie, framer, lenis) ===');
const scripts = requests.filter(r => r.type === 'script').map(r => r.url);
scripts.filter(u => /(three|gsap|lottie|framer|lenis|motion|scroll|anim)/i.test(u)).forEach(u => console.log(u));

console.log('\n=== DOM: canvas, video, img, svg animations ===');
const dom = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll('img')].map(i => ({
    src: i.currentSrc || i.src, w: i.clientWidth, h: i.clientHeight, alt: i.alt?.slice(0,40)
  }));
  const canvases = [...document.querySelectorAll('canvas')].length;
  const videos = [...document.querySelectorAll('video')].length;
  const svgs = [...document.querySelectorAll('svg')].length;
  const iframes = [...document.querySelectorAll('iframe')].map(i => i.src);
  return { canvases, videos, svgs, iframes, imgCount: imgs.length, imgs: imgs.slice(0, 20) };
});
console.log(JSON.stringify(dom, null, 2));

// look for WebGL contexts
const gl = await page.evaluate(() => {
  const cs = [...document.querySelectorAll('canvas')];
  return cs.map(c => {
    const ctx = c.getContext('webgl2') || c.getContext('webgl');
    return { hasWebGL: !!ctx, w: c.width, h: c.height };
  });
});
console.log('WebGL contexts:', gl);

await browser.close();
