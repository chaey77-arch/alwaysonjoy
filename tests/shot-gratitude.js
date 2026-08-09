// 감사 탭(감사노트 + 임마누엘 일기)을 그림으로 떠 준다.
// 눈으로 보고 고친다 — 화면은 눈감고 손대지 않는다.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const R = process.argv[2] || 'c:\\Users\\yoona\\OneDrive\\문서\\AlwaysonJoy';
const OUT = process.argv[3] || path.join(os.homedir(), 'Desktop', 'ajoy-sian');
const tag = process.argv[4] || '';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ajoy-gshot-'));
fs.mkdirSync(OUT, { recursive: true });

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
for (const d of ['js', 'css', 'icons']) {
  fs.cpSync(path.join(R, d), path.join(tmp, d), { recursive: true });
}

// 판을 390px 로 좁힌다 (헤드리스 창은 500px 밑으로 안 내려간다)
const shrink = `<style>
  html, body { width: 390px !important; margin: 0 auto !important; }
</style>`;

// 어머니 이름을 심고, 감사 탭으로 옮기고, 접힌 카드를 펼친다
const seed = `<script>try{localStorage.setItem('ajoy_user',JSON.stringify(
  {name:'차정윤',joinDate:'2026-01-01T00:00:00.000Z'}));}catch(e){}<\/script>`;
const drive = `<script>
window.addEventListener('load', function(){
  setTimeout(function(){
    try { switchTab('gratitude'); } catch(e){}
    document.querySelectorAll('.card.collapsible.collapsed').forEach(function(c){
      // 기록 카드는 접힌 채로 둔다 — 입력 화면만 본다
      var lb = c.querySelector('.card-label');
      if (lb && /기록/.test(lb.textContent)) return;
      c.classList.remove('collapsed');
    });
    window.scrollTo(0, 0);
  }, 400);
});
<\/script>`;

const idxSrc = fs.readFileSync(path.join(R, 'index.html'), 'utf8');
fs.writeFileSync(path.join(tmp, 'index.html'),
  idxSrc.replace('</head>', shrink + seed + '</head>')
        .replace('</body>', drive + '</body>'), 'utf8');

const url = 'file:///' + path.join(tmp, 'index.html').replace(/\\/g, '/');
const shots = [
  ['감사탭' + tag + '-위.png',  '?night=0', 740],
  ['감사탭' + tag + '-전체.png', '?night=0', 2400],
];

for (const [name, q, h] of shots) {
  const dest = path.join(OUT, name);
  try {
    execFileSync(CHROME, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars',
      '--virtual-time-budget=9000',
      '--user-data-dir=' + path.join(tmp, 'prof-' + name),
      '--screenshot=' + dest,
      '--window-size=520,' + h,
      '--force-device-scale-factor=1',
      url + q
    ], { stdio: ['ignore', 'ignore', 'ignore'], timeout: 120000 });
    const kb = Math.round(fs.statSync(dest).size / 1024);
    console.log('  ' + name + '  ' + kb + 'KB');
  } catch (e) {
    console.log('  ' + name + '  실패: ' + e.message.slice(0, 80));
  }
}
