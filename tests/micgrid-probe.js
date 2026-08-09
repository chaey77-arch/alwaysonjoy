// 좁은 폰(280px)에서 말로쓰기·다듬기·읽어주기 가 한 줄에 하나씩 서는지.
// @container 를 새로 넣었으니 정말 먹는지 재서 확인한다 (헛도는 일이 잦다).
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const R = process.argv[2] || 'c:\\Users\\yoona\\OneDrive\\문서\\AlwaysonJoy';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ajoy-mg-'));
for (const d of ['css', 'js', 'icons']) {
  fs.cpSync(path.join(R, d), path.join(tmp, d), { recursive: true });
}

const probe = `
<div id="out" style="font:12px monospace;white-space:pre"></div>
<script>
window.addEventListener('load', function(){ setTimeout(run, 600); });
function run(){
  try { switchTab('gratitude'); } catch(e){}
  document.querySelectorAll('.card.collapsible.collapsed').forEach(function(c){
    c.classList.remove('collapsed');
  });
  var res = [];
  [280, 320, 390].forEach(function(w){
    document.documentElement.style.width = w + 'px';
    document.body.style.width = w + 'px';
    void document.body.offsetHeight;
    var row = document.querySelector('#imm-steps .mic-row.full');
    if (!row) { res.push({ w: w, err: '단추줄 없음' }); return; }
    var cs = getComputedStyle(row);
    // 단추들이 몇 줄에 걸치는지 — top 값이 몇 가지인가로 센다
    var tops = [];
    [].forEach.call(row.children, function(b){
      var t = Math.round(b.getBoundingClientRect().top);
      if (!tops.some(function(x){ return Math.abs(x - t) < 3; })) tops.push(t);
    });
    var over = 0;
    var host = row.closest('.card-inner');
    [].forEach.call(row.children, function(b){
      var d = b.getBoundingClientRect().right - host.getBoundingClientRect().right
              + parseFloat(getComputedStyle(host).paddingRight || 0);
      if (d > over) over = Math.round(d);
    });
    res.push({ w: w, cols: cs.gridTemplateColumns, 줄수: tops.length,
      단추수: row.children.length, 삐짐: over,
      단추폭: Math.round(row.children[0].getBoundingClientRect().width) });
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
  '--virtual-time-budget=20000', '--user-data-dir=' + path.join(tmp, 'prof'),
  '--dump-dom', url], { encoding: 'utf8', stdio: ['ignore','pipe','ignore'], timeout: 180000 });
const mm = dom.match(/<div id="out"[^>]*>(.*?)<\/div>/s);
if (!mm || !mm[1].trim()) { console.log('측정값 없음 — 앱이 안 떴다'); process.exit(1); }
JSON.parse(mm[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&')
  .replace(/&lt;/g,'<').replace(/&gt;/g,'>'))
  .forEach(r => console.log(JSON.stringify(r, null, 0)));
