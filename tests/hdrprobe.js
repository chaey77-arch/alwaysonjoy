// 머리글 280px 실측 — t20 과 같은 방식(--dump-dom). 무엇이 폭을 먹는지 본다.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const R = process.argv[2] || 'c:\\Users\\yoona\\OneDrive\\문서\\AlwaysonJoy';
const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].find(p => fs.existsSync(p));
if (!CHROME) { console.log('크롬 없음'); process.exit(0); }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ajoy-hdr-'));
for (const d of ['css', 'js', 'icons']) {
  const src = path.join(R, d);
  if (!fs.existsSync(src)) continue;
  fs.mkdirSync(path.join(tmp, d), { recursive: true });
  for (const f of fs.readdirSync(src)) {
    const p = path.join(src, f);
    if (fs.statSync(p).isFile()) fs.copyFileSync(p, path.join(tmp, d, f));
  }
}

const probe = `
<div id="out" style="font:12px monospace;white-space:pre"></div>
<script>
window.addEventListener('load', function(){ setTimeout(run, 120); });
function run(){
  var res = [];
  var NAME = '박정순할머니';
  [280, 320, 390].forEach(function(w){
    document.documentElement.style.width = w + 'px';
    document.body.style.width = w + 'px';
    var el   = document.getElementById('header-name');
    var left = document.querySelector('.hdr-left');
    var hdr  = document.querySelector('.app-header');
    var right= hdr.children[1];
    var lang = document.getElementById('lang-toggle-btn');
    var bell = document.getElementById('companion-trigger');
    el.textContent = NAME + '님, 주님\\u00A0안에서\\u00A0🌿';
    void document.body.offsetHeight;
    var csh = getComputedStyle(hdr), csn = getComputedStyle(el);
    // 이름 첫 덩어리('박정순할머니님,')가 몇 줄에 걸치는지 Range 로 잰다
    var node = el.firstChild, chunk = NAME + '님,';
    var r = document.createRange();
    r.setStart(node, 0); r.setEnd(node, chunk.length);
    var tops = [];
    [].forEach.call(r.getClientRects(), function(x){
      if (x.width > 0.5 && x.height > 0.5 &&
          !tops.some(function(t){ return Math.abs(t - x.top) < 3; })) tops.push(x.top);
    });
    res.push({ w: w,
      hdrW: Math.round(hdr.getBoundingClientRect().width),
      padL: csh.paddingLeft, padR: csh.paddingRight, gap: csh.gap,
      leftW: Math.round(left.getBoundingClientRect().width),
      rightW: Math.round(right.getBoundingClientRect().width),
      langW: Math.round(lang.getBoundingClientRect().width),
      bellW: Math.round(bell.getBoundingClientRect().width),
      nameFont: csn.fontSize,
      nameRows: Math.round(el.getBoundingClientRect().height /
                (parseFloat(csn.lineHeight) || 20) * 10) / 10,
      chunkRows: tops.length,
      containerOnLeft: getComputedStyle(left).containerType });
  });
  document.documentElement.style.width=''; document.body.style.width='';
  document.getElementById('out').textContent = JSON.stringify(res);
}
<\/script>`;

const seed = `<script>try{localStorage.setItem('ajoy_user',JSON.stringify(
  {name:'차정윤',joinDate:'2026-01-01T00:00:00.000Z'}));}catch(e){}<\/script>`;
const idx = fs.readFileSync(path.join(R, 'index.html'), 'utf8');
fs.writeFileSync(path.join(tmp, 'index.html'),
  idx.replace('</head>', seed + '</head>').replace('</body>', probe + '</body>'), 'utf8');

const url = 'file:///' + path.join(tmp, 'index.html').replace(/\\/g, '/');
const dom = execFileSync(CHROME, ['--headless=new', '--disable-gpu',
  '--virtual-time-budget=15000', '--user-data-dir=' + path.join(tmp, 'prof'),
  '--dump-dom', url + '?char=jesus'],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 180000 });
const mm = dom.match(/<div id="out"[^>]*>(.*?)<\/div>/s);
if (!mm) { console.log('측정값 없음'); process.exit(1); }
JSON.parse(mm[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>'))
  .forEach(r => console.log(JSON.stringify(r)));
