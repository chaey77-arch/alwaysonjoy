// 첫 화면 말씀 한 줄이 왜 화면 밖으로 나가는지 잰다.
// 그림으로 보니 넘쳐 있었다 — 눈으로 짐작하지 않고 실제 폭을 본다.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const R = process.argv[2];
const tmp = path.join(os.tmpdir(), 'ajoy-t', 'obm');
fs.mkdirSync(tmp, { recursive: true });
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const probe = `<script>
window.addEventListener('load', function(){ setTimeout(run, 800); });
function run(){
  var el = document.getElementById('ob-welcome-verse');
  var form = document.querySelector('.ob-form');
  var wrap = document.querySelector('.ob-welcome');
  var scr = document.getElementById('screen-onboard');
  function box(n, name){
    if(!n) return {name:name, err:'없음'};
    var r = n.getBoundingClientRect();
    var cs = getComputedStyle(n);
    return {name:name, left:Math.round(r.left), right:Math.round(r.right),
            w:Math.round(r.width), sw:n.scrollWidth,
            ws:cs.whiteSpace, wb:cs.wordBreak, ow:cs.overflowWrap,
            fs:cs.fontSize, mw:cs.maxWidth};
  }
  // 글자 그대로 (nbsp 를 ␣ 로 보이게)
  var raw = el ? el.textContent.replace(/\\u00A0/g,'~') : '';
  // 각 덩어리가 몇 px 인지
  var chunks = raw.split(' ').map(function(c){
    var s=document.createElement('span');
    s.style.cssText='white-space:nowrap;position:absolute;visibility:hidden;font:'+
      (el?getComputedStyle(el).font:'15px sans-serif');
    s.textContent=c.replace(/~/g,'\\u00A0');
    document.body.appendChild(s);
    var w=Math.ceil(s.getBoundingClientRect().width); s.remove();
    return {t:c, w:w};
  });
  document.getElementById('out').textContent = JSON.stringify({
    boxes:[box(scr,'screen-onboard'),box(form,'ob-form'),
           box(wrap,'ob-welcome'),box(el,'ob-welcome-verse')],
    raw: raw, chunks: chunks,
    innerW: window.innerWidth
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
    '--window-size=390,740',
    '--user-data-dir=' + path.join(tmp, 'prof-' + tag),
    '--dump-dom', url + q
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 120000 });
  const m = dom.match(/<div id="out">([\s\S]*?)<\/div>/);
  console.log('── ' + tag + ' ──');
  if (!m) { console.log('  결과 없음'); continue; }
  const r = JSON.parse(m[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&')
                           .replace(/&lt;/g,'<').replace(/&gt;/g,'>'));
  console.log('  창 폭 ' + r.innerW + 'px');
  for (const b of r.boxes) {
    if (b.err) { console.log('  ' + b.name + ' — ' + b.err); continue; }
    console.log('  ' + b.name.padEnd(18) + ' 폭 ' + String(b.w).padStart(4) +
      '  왼 ' + String(b.left).padStart(4) + '  오른 ' + String(b.right).padStart(4) +
      '  속폭 ' + b.sw + '  maxW ' + b.mw);
  }
  console.log('  글자: ' + r.raw);
  console.log('  덩어리 (~ 는 붙여 둔 자리):');
  for (const c of r.chunks) console.log('      ' + String(c.w).padStart(4) + 'px  ' + c.t);
}
