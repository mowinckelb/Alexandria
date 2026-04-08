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
  const isReturning = !apiKey;
  const curlCmd = isReturning ? '' : `curl -s ${SERVER_URL}/setup | bash -s ${apiKey}`;
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
  .line { font-size: 1.1rem; font-weight: 400; line-height: 1.9; color: #3d3630; }
  .action {
    color: #3d3630;
    text-decoration: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    vertical-align: baseline;
    gap: 6px;
    transition: opacity 0.15s;
  }
  .action:hover { opacity: 0.6; }
  .action .icon { display: inline-flex; align-items: center; color: #bbb4aa; transition: color 0.15s; }
  .action:hover .icon { color: #3d3630; }
  .action.done .icon { color: #3d3630; }
  .action .icon .icon-check { display: none; }
  .action.done .icon .icon-copy { display: none; }
  .action.done .icon .icon-check { display: inline; }
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
  <div class="section" style="margin-bottom: 1.5rem;">
    <p class="line" style="font-size: 0.95rem; color: #8a8078; line-height: 1.7;">these three steps put files on your machine and tell your cli how to use them. no program. no app. just markdown and shell scripts you can read. we never see your data &mdash; it is <a class="action" onclick="copyTrust(this)" style="font-size: inherit;">architecturally impossible <span class="icon"><span class="icon-copy">${ICON_COPY}</span><span class="icon-check">${ICON_CHECK}</span></span></a></p>
    <p class="line" style="font-size: 0.88rem; color: #bbb4aa; line-height: 1.6; margin-top: 0.4rem;">questions during setup? read the <a class="action" onclick="copyTrust(this)" style="font-size: inherit; color: #8a8078;">Trust.md <span class="icon"><span class="icon-copy">${ICON_COPY}</span><span class="icon-check">${ICON_CHECK}</span></span></a> &mdash; full disclosure of every file, every network call. or just ask in your cli or ide &mdash; it can read everything alexandria installs. once you're set up, it knows everything you know. ask it anything, give it feedback, make it yours.</p>
  </div>
  ${isReturning ? `<div class="section">
    <p class="label">welcome back</p>
    <p class="line" style="color: #8a8078;">you're already set up. /a to start a session.</p>
  </div>` : `<div class="section">
    <p class="label">setup</p>
    <p class="line"><a class="action" onclick="copyPrime(this)">1. prime <span class="icon"><span class="icon-copy">${ICON_COPY}</span><span class="icon-check">${ICON_CHECK}</span></span></a> &mdash; paste in terminal <span class="info" onclick="toggleTip(this)">${ICON_INFO}<span class="tooltip">checks your machine has what alexandria needs. if github cli is installed, it logs you in for private backup. run this first.</span></span></p>
    <p class="line"><a class="action" onclick="copyCmd(this)">2. curl <span class="icon"><span class="icon-copy">${ICON_COPY}</span><span class="icon-check">${ICON_CHECK}</span></span></a> &mdash; paste in terminal <span class="info" onclick="toggleTip(this)">${ICON_INFO}<span class="tooltip">installs alexandria on your machine. creates ~/.alexandria/, configures your cli and ide. everything local, nothing sent anywhere.</span></span></p>
    <p class="line"><a class="action" onclick="copyBlock(this)">3. block <span class="icon"><span class="icon-copy">${ICON_COPY}</span><span class="icon-check">${ICON_CHECK}</span></span></a> &mdash; paste in new tab <span class="info" onclick="toggleTip(this)">${ICON_INFO}<span class="tooltip">open a new conversation in your cli or ide. paste the block. it reads your files to understand you — builds your starter constitution. let it work.</span></span></p>
  </div>`}
  <div class="section">
    <p class="label">you're set up</p>
    <p class="line">/a to start a session. a. to close it.</p>
    <p class="line"><a href="${WEBSITE_URL}/shortcut" target="_blank" style="color: #8a8078; text-decoration: none; transition: opacity 0.15s;" onmouseover="this.style.opacity='0.6'" onmouseout="this.style.opacity='1'">share</a> to feed the vault. <span class="info" onclick="toggleTip(this)">${ICON_INFO}<span class="tooltip">add the shortcut to your phone. voice notes, articles, podcasts, screenshots — anything with signal. hit share, pick alexandria, done. the more you share, the more /a has to work with.</span></span></p>
    <p class="line" style="font-size: 0.95rem; color: #8a8078;">want something different? just say it in your cli or ide. feedback flows directly to the team.</p>
  </div>
  <div class="section">
    <p class="label">kin</p>
    <p class="line"><a class="action" onclick="copyKin(this)">your link <span class="icon"><span class="icon-copy">${ICON_COPY}</span><span class="icon-check">${ICON_CHECK}</span></span></a> <span class="info" onclick="toggleTip(this)">${ICON_INFO}<span class="tooltip">5 active kin and alexandria is free. send this to anyone who builds things.</span></span></p>
  </div>
  <p class="closing">welcome to alexandria.</p>
  <p class="footer"><a class="action" onclick="copyTrust(this)">Trust.md <span class="icon"><span class="icon-copy">${ICON_COPY}</span><span class="icon-check">${ICON_CHECK}</span></span></a></p>
</div>
<script>
function flash(el) {
  el.classList.add('done');
  setTimeout(function() { el.classList.remove('done'); }, 2000);
}
function copyPrime(el) {
  var prime = 'echo "checking prerequisites..." && { command -v git &>/dev/null && echo "  git: ok" || echo "  git: missing — install from https://git-scm.com"; } && { command -v node &>/dev/null && echo "  node: ok" || echo "  node: missing — install from https://nodejs.org"; } && { if command -v gh &>/dev/null; then if gh auth status &>/dev/null 2>&1; then echo "  github: ok"; else echo "  github: logging in..." && gh auth login; fi; else echo "" && echo "  github cli not found. it enables cloud backup and overnight processing." && echo "  install: brew install gh (mac) or https://cli.github.com" && echo "  then re-run this prime. or skip it — everything else still works."; fi; } && echo "" && echo "ready. run the curl."';
  navigator.clipboard.writeText(prime).then(function() { flash(el); });
}
function copyCmd(el) {
  navigator.clipboard.writeText(${JSON.stringify(curlCmd)}).then(function() { flash(el); });
}
function copyBlock(el) {
  fetch('${SERVER_URL}/block').then(function(r) { return r.text(); }).then(function(text) {
    navigator.clipboard.writeText(text).then(function() { flash(el); });
  });
}
function copyKin(el) {
  navigator.clipboard.writeText(${JSON.stringify(`${WEBSITE_URL}/signup?ref=${login}`)}).then(function() { flash(el); });
}
function copyTrust(el) {
  fetch('${WEBSITE_URL}/docs/Trust.md').then(function(r) { return r.text(); }).then(function(text) {
    navigator.clipboard.writeText(text).then(function() { flash(el); });
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
