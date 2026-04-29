/**
 * HTML templates — shared across modules.
 * Callback page HTML for OAuth signup flow.
 */

function getWebsiteUrl() { return process.env.WEBSITE_URL || 'https://mowinckel.ai'; }

// ---------------------------------------------------------------------------
// Inline SVG icons — small enough to inline, no external deps
// ---------------------------------------------------------------------------

const ICON_COPY = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const ICON_CHECK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_INFO = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;

// ---------------------------------------------------------------------------
// Auth error page — shown when OAuth callback can't complete
// ---------------------------------------------------------------------------

export function authErrorHtml(message: string): string {
  const WEBSITE_URL = getWebsiteUrl();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>alexandria.</title>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400&display=swap" rel="stylesheet">
</head>
<body style="font-family:'EB Garamond',Georgia,serif;background:#f5f0e8;color:#3d3630;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:2rem;text-align:center">
<div style="max-width:420px">
<p style="font-size:1.05rem;line-height:1.9;color:#8a8078;margin:0 0 1.5rem">${message}</p>
<p style="font-size:1.05rem;line-height:1.9;margin:0"><a href="${WEBSITE_URL}/signup" style="color:#3d3630;text-decoration:none">start again</a></p>
</div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Callback page — the first brand moment after signup
// ---------------------------------------------------------------------------

export function callbackPageHtml(apiKey: string): string {
  const WEBSITE_URL = getWebsiteUrl();
  const isReturning = !apiKey;
  const curlCmd = isReturning ? '' : `curl -fsSL https://raw.githubusercontent.com/mowinckelb/alexandria/main/factory/setup.sh | bash -s -- ${apiKey}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>alexandria.</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="icon" href="${WEBSITE_URL}/favicon.png" type="image/png">
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400&display=swap" rel="stylesheet">
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
  .welcome { font-size: 1.5rem; font-weight: 400; line-height: 1.4; }
  .line { font-size: 1.1rem; line-height: 1.9; }
  .trust { font-size: 0.85rem; line-height: 1.7; color: #bbb4aa; margin-top: 2.5rem; }
  .trust .action { color: #8a8078; }
  .welcome-back { color: #8a8078; margin-top: 1.5rem; }
  .steps { margin-top: 2.5rem; }
  .action {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    color: inherit;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    vertical-align: baseline;
    gap: 6px;
    transition: opacity 0.15s;
  }
  .action:hover { opacity: 0.6; }
  .action:focus-visible { outline: 1px dotted #8a8078; outline-offset: 3px; border-radius: 2px; }
  .action .icon { display: inline-flex; align-items: center; color: #bbb4aa; transition: color 0.15s; }
  .action:hover .icon { color: #3d3630; }
  .action.done .icon { color: #3d3630; }
  .action .icon .icon-check { display: none; }
  .action.done .icon .icon-copy { display: none; }
  .action.done .icon .icon-check { display: inline; }
  .info {
    background: none;
    border: none;
    padding: 0;
    display: inline-flex;
    align-items: center;
    color: #bbb4aa;
    cursor: pointer;
    transition: color 0.15s;
    vertical-align: middle;
    margin-left: 4px;
    position: relative;
  }
  .info:hover, .info:focus-visible { color: #8a8078; outline: none; }
  .tooltip {
    display: none;
    position: absolute;
    bottom: calc(100% + 8px);
    right: -8px;
    background: #3d3630;
    color: #f5f0e8;
    font-size: 0.78rem;
    line-height: 1.6;
    padding: 10px 14px;
    border-radius: 6px;
    width: 260px;
    max-width: calc(100vw - 4rem);
    text-align: left;
    z-index: 10;
  }
  .tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    right: 14px;
    border: 6px solid transparent;
    border-top-color: #3d3630;
  }
  .info.active .tooltip { display: block; }
</style>
</head>
<body>
<div class="container">
  <h1 class="welcome">welcome to alexandria.</h1>
  ${isReturning ? `<p class="line welcome-back">you're already set up. /a in your cli to start.</p>` : `<div class="steps">
    <p class="line"><button type="button" class="action" onclick="copyCmd(this)" aria-label="copy install command">1. install <span class="icon"><span class="icon-copy">${ICON_COPY}</span><span class="icon-check">${ICON_CHECK}</span></span></button> &mdash; paste in terminal <button type="button" class="info" onclick="toggleTip(this)" aria-label="what this does">${ICON_INFO}<span class="tooltip">creates ~/alexandria/, checks your prerequisites, configures your cli and ide. everything local, nothing sent anywhere.</span></button></p>
    <p class="line"><button type="button" class="action" onclick="copyBlock(this)" aria-label="copy begin block">2. begin <span class="icon"><span class="icon-copy">${ICON_COPY}</span><span class="icon-check">${ICON_CHECK}</span></span></button> &mdash; paste in a new cli chat <button type="button" class="info" onclick="toggleTip(this)" aria-label="what this does">${ICON_INFO}<span class="tooltip">opens your first session. it reads your files and builds your starter constitution.</span></button></p>
  </div>
  <p class="trust">we never see your data &mdash; <button type="button" class="action" onclick="copyTrust(this)" aria-label="copy Trust.md">Trust.md <span class="icon"><span class="icon-copy">${ICON_COPY}</span><span class="icon-check">${ICON_CHECK}</span></span></button></p>`}
</div>
<script>
function flash(el) {
  el.classList.add('done');
  setTimeout(function() { el.classList.remove('done'); }, 2000);
}
function copyText(text, el) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(function() { flash(el); }).catch(function() { manualCopy(text, el); });
  }
  manualCopy(text, el);
  return Promise.resolve();
}
function manualCopy(text, el) {
  try {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    flash(el);
  } catch (e) {
    window.prompt('copy this:', text);
  }
}
function copyRemote(url, el) {
  return fetch(url).then(function(r) {
    if (!r.ok) throw new Error('fetch ' + r.status);
    return r.text();
  }).then(function(text) { return copyText(text, el); }).catch(function() {
    window.open(url, '_blank', 'noopener');
  });
}
function copyCmd(el) { copyText(${JSON.stringify(curlCmd)}, el); }
function copyBlock(el) { copyRemote('https://raw.githubusercontent.com/mowinckelb/alexandria/main/factory/block.md', el); }
function copyTrust(el) { copyRemote('${WEBSITE_URL}/docs/Trust.md', el); }
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
