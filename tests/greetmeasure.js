// 280px 접은 폰에서 인사 한 줄이 몇 px 필요한지 / 몇 px 있는지 잰다.
// t20 이 "2줄로 갈림" 이라고만 알려 줘서, 얼마나 모자란지 알아야 고칠 수 있다.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const R = process.argv[2];
const tmp = path.join(os.tmpdir(), 'ajoy-t', 'greetm');
fs.mkdirSync(tmp, { recursive: true });

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const probe = `<script>
window.addEventListener('load', function(){ setTimeout(run, 900); });
function run(){
  var out = [];
  var GREETS = ['좋은 아침이에요!','좋은 오후예요!','좋은 저녁이에요!','평안한 밤이에요'];
  [280,320,360].forEach(function(w){
    document.documentElement.style.width = w + 'px';
    document.body.style.width = w + 'px';
    var body = document.getElementById('greet-body') ||
               document.querySelector('.greet-body');
    var hi = document.getElementById('greet-hi');
    if (!hi) { out.push({w:w, err:'no greet-hi'}); return; }
    var avail = body ? body.getBoundingClientRect().width : 0;
    // 각 인사말이 한 줄로 몇 px 필요한지 — span 에 담아 nowrap 으로 잰다
    var need = {};
    GREETS.forEach(function(g){
      var s = document.createElement('span');
      s.style.cssText = 'white-space:nowrap;position:absolute;visibility:hidden;' +
        'font:' + getComputedStyle(hi).font;
      s.textContent = g;
      document.body.appendChild(s);
      need[g] = Math.ceil(s.getBoundingClientRect().width);
      s.remove();
    });
    var cs = getComputedStyle(hi);
    out.push({ w:w, avail:Math.round(avail), need:need, font:cs.font });
  });
  document.documentElement.style.width='';
  document.body.style.width='';
  document.getElementById('out').textContent = JSON.stringify(out);
}
<\/script>`;

const idxHtml = fs.readFileSync(path.join(R, 'index.html'), 'utf8');
const seed = `<script>try{localStorage.setItem('ajoy_user',JSON.stringify(
  {name:'차정윤',joinDate:'2026-01-01T00:00:00.000Z'}));}catch(e){}<\/script>`;
const page = idxHtml
  .replace('</head>', seed + '</head>')
  .replace('</body>', '<div id="out"></div>' + probe + '</body>');
fs.writeFileSync(path.join(tmp, 'index.html'), page, 'utf8');

// 앱 파일들이 상대경로라 같은 폴더에 없으면 안 붙는다 — 복사한다
for (const d of ['js', 'css', 'icons']) {
  fs.cpSync(path.join(R, d), path.join(tmp, d), { recursive: true });
}

const url = 'file:///' + path.join(tmp, 'index.html').replace(/\\/g, '/');
const dom = execFileSync(CHROME, [
  '--headless=new', '--disable-gpu', '--virtual-time-budget=15000',
  '--user-data-dir=' + path.join(tmp, 'prof'),
  '--dump-dom', url
], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 180000 });

const m = dom.match(/<div id="out">([\s\S]*?)<\/div>/);
if (!m) { console.log('결과를 못 읽음'); process.exit(1); }
const rows = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
for (const r of rows) {
  if (r.err) { console.log(r.w + 'px  ' + r.err); continue; }
  console.log(r.w + 'px  쓸 수 있는 폭 ' + r.avail + 'px   (' + r.font + ')');
  for (const g of Object.keys(r.need)) {
    const ok = r.need[g] <= r.avail;
    console.log('        ' + (ok ? '들어감' : '모자람') +
      '  ' + g + ' → ' + r.need[g] + 'px' +
      (ok ? '' : '  (' + (r.need[g] - r.avail) + 'px 부족)'));
  }
}
