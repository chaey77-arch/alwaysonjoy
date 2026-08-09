// 첫 화면에서 '가로로 넘치는 것' 이 무엇인지 찾는다.
// obmeasure 에서 screen-onboard 속폭이 598px(칸은 518px)로 나왔다.
// 넘치는 놈을 이름으로 집어낸다.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const R = process.argv[2];
const tmp = path.join(os.tmpdir(), 'ajoy-t', 'obw');
fs.mkdirSync(tmp, { recursive: true });
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const probe = `<script>
window.addEventListener('load', function(){ setTimeout(run, 800); });
function run(){
  var W = 390;
  // 시험들과 같은 방법으로 폰 폭을 흉내낸다
  document.documentElement.style.width = W + 'px';
  document.body.style.width = W + 'px';
  void document.body.offsetHeight;
  var scr = document.getElementById('screen-onboard');
  var out = [];
  scr.querySelectorAll('*').forEach(function(n){
    var r = n.getBoundingClientRect();
    if (r.width === 0) return;
    if (r.right > W + 0.5 || r.left < -0.5) {
      out.push({ tag:n.tagName.toLowerCase(),
                 cls:(n.className||'').toString().slice(0,40),
                 id:n.id||'',
                 left:Math.round(r.left), right:Math.round(r.right),
                 w:Math.round(r.width) });
    }
  });
  document.getElementById('out').textContent = JSON.stringify({
    innerW: window.innerWidth,
    scrW: Math.round(scr.getBoundingClientRect().width),
    scrollW: scr.scrollWidth,
    docScrollW: document.documentElement.scrollWidth,
    bad: out
  });
}
<\/script>`;

for (const d of ['js', 'css', 'icons']) {
  fs.cpSync(path.join(R, d), path.join(tmp, d), { recursive: true });
}
const idx = fs.readFileSync(path.join(R, 'index.html'), 'utf8');
fs.writeFileSync(path.join(tmp, 'index.html'),
  idx.replace('</body>', '<div id="out"></div>' + probe + '</body>'), 'utf8');

const url = 'file:///' + path.join(tmp, 'index.html').replace(/\\/g, '/');
for (const [tag, q] of [['유리', '?theme=glass&preview=onboard&night=0'],
                        ['지금앱', '?preview=onboard']]) {
  const dom = execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--virtual-time-budget=9000',
    '--user-data-dir=' + path.join(tmp, 'prof-' + tag),
    '--dump-dom', url + q
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 120000 });
  const m = dom.match(/<div id="out">([\s\S]*?)<\/div>/);
  console.log('── ' + tag + ' ──');
  if (!m) { console.log('  결과 없음'); continue; }
  const r = JSON.parse(m[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&')
                           .replace(/&lt;/g,'<').replace(/&gt;/g,'>'));
  console.log('  창 ' + r.innerW + '  화면칸 ' + r.scrW +
              '  속폭 ' + r.scrollW + '  문서속폭 ' + r.docScrollW);
  if (!r.bad.length) { console.log('  390px 밖으로 나간 것: 없음'); continue; }
  console.log('  390px 밖으로 나간 것 ' + r.bad.length + '개:');
  for (const b of r.bad) {
    console.log('      <' + b.tag + '> ' + (b.id ? '#' + b.id + ' ' : '') +
      b.cls + '  왼 ' + b.left + ' 오른 ' + b.right + ' 폭 ' + b.w);
  }
}
