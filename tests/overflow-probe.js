// 감사 탭에서 '카드 밖으로 삐져나간 것' 을 찾는다.
// 그림에서 입력칸이 카드 오른쪽 밖으로 나가 보였다 — 눈이 맞는지 잰다.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const R = process.argv[2] || 'c:\\Users\\yoona\\OneDrive\\문서\\AlwaysonJoy';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ajoy-ov-'));
for (const d of ['css', 'js', 'icons']) {
  fs.cpSync(path.join(R, d), path.join(tmp, d), { recursive: true });
}

const probe = `
<div id="out" style="font:12px monospace;white-space:pre"></div>
<script>
window.addEventListener('load', function(){ setTimeout(run, 600); });
function run(){
  document.documentElement.style.width = '390px';
  document.body.style.width = '390px';
  try { switchTab('gratitude'); } catch(e){}
  document.querySelectorAll('.card.collapsible.collapsed').forEach(function(c){
    c.classList.remove('collapsed');
  });
  void document.body.offsetHeight;

  var rows = [];
  function m(sel, label){
    document.querySelectorAll(sel).forEach(function(el, i){
      var b = el.getBoundingClientRect();
      if (b.width < 1 && b.height < 1) return;
      var host = el.closest('.card-inner') || el.closest('.card') || document.body;
      var hb = host.getBoundingClientRect();
      var cs = getComputedStyle(el);
      rows.push({ what: label + (i ? '#'+(i+1) : ''),
        w: Math.round(b.width), h: Math.round(b.height),
        font: cs.fontSize, box: cs.boxSizing.slice(0,6),
        over: Math.round(b.right - hb.right + parseFloat(getComputedStyle(host).paddingRight||0)),
        tap: Math.round(Math.min(b.width, b.height)) });
    });
  }
  m('#tab-gratitude .g-input', '감사 입력칸');
  m('#tab-gratitude .g-badge', '감사 번호');
  m('#tab-gratitude .btn-primary', '저장 단추');
  m('#imm-steps .imm-input', '임마누엘 칸');
  m('.imm-step-num', '단계 번호');
  m('.mic-row', '단추 줄');
  m('.mic-btn', '작은 단추');
  m('#imm-size-btn', '글씨크기');
  m('#imm-photo-btn', '사진 단추');
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
  '--dump-dom', url],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 180000 });
const mm = dom.match(/<div id="out"[^>]*>(.*?)<\/div>/s);
if (!mm || !mm[1].trim()) { console.log('측정값 없음 — 앱이 안 떴다'); process.exit(1); }
const rows = JSON.parse(mm[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
console.log('무엇             폭x높이     글씨   칸계산   삐짐  짚는자리');
for (const r of rows) {
  const w = [];
  if (r.tap < 44) w.push('짚는곳<44');
  if (r.over > 1) w.push('카드밖 ' + r.over + 'px');
  console.log(String(r.what).padEnd(16) + (r.w + 'x' + r.h).padEnd(11) +
    String(r.font).padEnd(7) + String(r.box).padEnd(9) +
    String(r.over).padStart(4) + String(r.tap).padStart(6) +
    (w.length ? '   ← ' + w.join(' · ') : ''));
}
