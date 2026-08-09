// 감사 탭 · 임마누엘 일기 — 짚는 자리와 글씨 크기를 실제로 잰다.
// 어머니(1949년생) 기준: 짚는 곳 44px 이상, 본문 글씨 16px 이상이 편하다.
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

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ajoy-big-'));
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
window.addEventListener('load', function(){ setTimeout(run, 500); });
function run(){
  document.documentElement.style.width = '390px';
  document.body.style.width = '390px';
  try { if (typeof switchTab === 'function') switchTab('gratitude'); } catch(e){}
  // 접힌 카드를 모두 펼친다 — 안 펼치면 크기를 잴 수 없다
  document.querySelectorAll('.collapsible.collapsed').forEach(function(c){
    c.classList.remove('collapsed');
  });
  void document.body.offsetHeight;

  var rows = [];
  function m(sel, label){
    document.querySelectorAll(sel).forEach(function(el, i){
      var b = el.getBoundingClientRect();
      if (b.width < 1 && b.height < 1) return;
      var cs = getComputedStyle(el);
      rows.push({ what: label + (i ? '#'+(i+1) : ''),
        w: Math.round(b.width), h: Math.round(b.height),
        font: cs.fontSize, minH: cs.minHeight, pad: cs.padding,
        tap: Math.round(Math.min(b.width, b.height)) });
    });
  }
  m('#tab-gratitude .g-input', '감사 입력칸');
  m('#tab-gratitude .g-badge', '감사 번호');
  m('#tab-gratitude .btn-primary', '감사 저장 단추');
  m('#tab-gratitude .card-label', '카드 제목');
  m('#imm-steps .imm-step-input, #imm-steps textarea, #imm-steps input', '임마누엘 입력칸');
  m('.imm-step-num', '임마누엘 번호');
  m('.imm-step-title', '임마누엘 물음');
  m('#imm-size-btn', '글씨크기 단추');
  m('#imm-photo-btn', '사진 단추');
  m('.streak-main', '감사 몇일째');
  document.documentElement.style.width=''; document.body.style.width='';
  document.getElementById('out').textContent = JSON.stringify(rows);
}
<\/script>`;

const seed = `<script>try{localStorage.setItem('ajoy_user',JSON.stringify(
  {name:'차정윤',joinDate:'2026-01-01T00:00:00.000Z'}));}catch(e){}<\/script>`;
const idx = fs.readFileSync(path.join(R, 'index.html'), 'utf8');
fs.writeFileSync(path.join(tmp, 'index.html'),
  idx.replace('</head>', seed + '</head>').replace('</body>', probe + '</body>'), 'utf8');

const url = 'file:///' + path.join(tmp, 'index.html').replace(/\\/g, '/');
const dom = execFileSync(CHROME, ['--headless=new', '--disable-gpu',
  '--virtual-time-budget=20000', '--user-data-dir=' + path.join(tmp, 'prof'),
  '--dump-dom', url + '?preview=home'],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 180000 });
const mm = dom.match(/<div id="out"[^>]*>(.*?)<\/div>/s);
if (!mm) { console.log('측정값 없음'); process.exit(1); }
const rows = JSON.parse(mm[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
console.log('무엇                     폭 x 높이   글씨    짚는자리');
for (const r of rows) {
  const warn = r.tap < 44 ? '  ← 44px 미만' : '';
  console.log(String(r.what).padEnd(24) + (r.w + 'x' + r.h).padEnd(11) +
              String(r.font).padEnd(8) + String(r.tap).padStart(4) + warn);
}
