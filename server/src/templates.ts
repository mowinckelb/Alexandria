/**
 * HTML templates — shared across modules.
 * Extracted to break circular dependency between prosumer.ts and billing.ts.
 */

function getServerUrl() { return process.env.SERVER_URL || 'https://mcp.mowinckel.ai'; }
function getWebsiteUrl() { return process.env.WEBSITE_URL || 'https://mowinckel.ai'; }

// ---------------------------------------------------------------------------
// Inline SVG icons — small enough to inline, no external deps
// ---------------------------------------------------------------------------

const ICON_COPY = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const ICON_CHECK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_DOWNLOAD = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
const ICON_INFO = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;

// ---------------------------------------------------------------------------
// Callback page — the first brand moment after signup
// ---------------------------------------------------------------------------

export function callbackPageHtml(login: string, apiKey: string): string {
  const SERVER_URL = getServerUrl();
  const WEBSITE_URL = getWebsiteUrl();
  const curlCmd = `curl -s ${SERVER_URL}/setup | bash -s ${apiKey}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>alexandria.</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="icon" href="${WEBSITE_URL}/favicon.png" type="image/png">
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'EB Garamond', Georgia, 'Times New Roman', serif;
    background: #f5f0e8;
    color: #3d3630;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
  }
  .container { max-width: 420px; text-align: center; }
  .section { margin-bottom: 2.5rem; }
  .label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.15em; color: #bbb4aa; margin-bottom: 0.8rem; }
  .bullet { color: #d4cec6; }
  .line { font-size: 1.1rem; font-weight: 400; line-height: 1.9; color: #3d3630; }
  .action {
    color: #3d3630;
    text-decoration: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: opacity 0.15s;
  }
  .action:hover { opacity: 0.6; }
  .action .icon { display: inline-flex; align-items: center; color: #bbb4aa; transition: color 0.15s; }
  .action:hover .icon { color: #3d3630; }
  .action.done .icon { color: #3d3630; }
  .info {
    display: inline-flex;
    align-items: center;
    color: #bbb4aa;
    cursor: pointer;
    transition: color 0.15s;
    vertical-align: middle;
    margin-left: 4px;
    position: relative;
  }
  .info:hover { color: #8a8078; }
  .tooltip {
    display: none;
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    background: #3d3630;
    color: #f5f0e8;
    font-size: 0.78rem;
    font-weight: 400;
    line-height: 1.6;
    padding: 10px 14px;
    border-radius: 6px;
    width: 260px;
    text-align: left;
    white-space: normal;
    z-index: 10;
  }
  .tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: #3d3630;
  }
  .info.active .tooltip { display: block; }
  .closing { font-size: 1.15rem; color: #3d3630; margin-top: 2.5rem; }
  .footer { font-size: 0.78rem; color: #bbb4aa; margin-top: 2rem; }
  .footer .action { font-size: 0.78rem; color: #8a8078; }
  .footer .action .icon { color: #bbb4aa; }
</style>
</head>
<body>
<div class="container">
  <div class="section">
    <p class="label">now</p>
    <p class="line"><a class="action" onclick="copyCmd(this)">1. curl <span class="icon">${ICON_COPY}</span></a> &mdash; paste in terminal</p>
    <p class="line"><a class="action" onclick="copyBlock(this)">2. block <span class="icon">${ICON_COPY}</span></a> &mdash; paste in new tab <span class="info" onclick="toggleTip(this)">${ICON_INFO}<span class="tooltip">open a new tab in your ai tool. paste the block. it scans your machine, builds your starter constitution, and loads your notepad for the first session. takes a while — let it work.</span></span></p>
    <p class="line">3. /a &mdash; type when it's ready <span class="info" onclick="toggleTip(this)">${ICON_INFO}<span class="tooltip">the ramp. your first real session. the block loaded the notepad — /a uses it. this is the product.</span></span></p>
  </div>
  <div class="section">
    <p class="label">always</p>
    <p class="line"><span class="bullet">&middot;</span> <a class="action" href="${WEBSITE_URL}/shortcut" target="_blank">share <span class="icon">${ICON_DOWNLOAD}</span></a> to a. <span class="info" onclick="toggleTip(this)">${ICON_INFO}<span class="tooltip">add the shortcut to your phone. voice notes, articles, podcasts, screenshots — anything with signal. hit share, pick alexandria, done. the more you share, the more /a has to work with.</span></span></p>
    <p class="line"><span class="bullet">&middot;</span> /a to start</p>
    <p class="line"><span class="bullet">&middot;</span> a. to close</p>
  </div>
  <p class="closing">welcome to alexandria.</p>
  <p class="footer"><a class="action" href="${WEBSITE_URL}/docs/Trust.md" target="_blank" style="font-size: 0.78rem; color: #bbb4aa;">Trust.md</a></p>
</div>
<script>
function copyCmd(el) {
  navigator.clipboard.writeText(${JSON.stringify(curlCmd)}).then(function() {
    el.querySelector('.icon').innerHTML = '${ICON_CHECK}';
    el.classList.add('done');
    setTimeout(function() {
      el.querySelector('.icon').innerHTML = '${ICON_COPY}';
      el.classList.remove('done');
    }, 2000);
  });
}
function copyBlock(el) {
  fetch('${SERVER_URL}/block').then(function(r) { return r.text(); }).then(function(text) {
    navigator.clipboard.writeText(text).then(function() {
      el.querySelector('.icon').innerHTML = '${ICON_CHECK}';
      el.classList.add('done');
      setTimeout(function() {
        el.querySelector('.icon').innerHTML = '${ICON_COPY}';
        el.classList.remove('done');
      }, 2000);
    });
  });
}
function toggleTip(el) {
  var wasActive = el.classList.contains('active');
  document.querySelectorAll('.info.active').forEach(function(e) { e.classList.remove('active'); });
  if (!wasActive) el.classList.add('active');
}
document.addEventListener('click', function(e) {
  if (!e.target.closest('.info')) {
    document.querySelectorAll('.info.active').forEach(function(el) { el.classList.remove('active'); });
  }
});
</script>
</body>
</html>`;
}
