// 감사 탭 아래쪽(사진칸 · 저장 단추 · 접힌 기록 카드)을 찍는다.
// 위쪽만 보고 고치면 아래에 생긴 흠을 못 본다.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const R = process.argv[2] || 'c:\\Users\\yoona\\OneDrive\\문서\\AlwaysonJoy';
const OUT = process.argv[3] || path.join(os.homedir(), 'Desktop', 'ajoy-sian');
const tag = process.argv[4] || '';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ajoy-tail-'));
fs.mkdirSync(OUT, { recursive: true });
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
for (const d of ['js', 'css', 'icons']) {
  fs.cpSync(path.join(R, d), path.join(tmp, d), { recursive: true });
}

const shrink = `<style>html, body { width: 390px !important; margin: 0 auto !important; }</style>`;
const seed = `<script>try{localStorage.setItem('ajoy_user',JSON.stringify(
  {name:'차정윤',joinDate:'2026-01-01T00:00:00.000Z'}));}catch(e){}<\/script>`;
// 임마누엘은 펼치되 다섯 단계 칸은 접어 감춰 아래쪽이 화면에 오게 한다
const drive = `<script>
window.addEventListener('load', function(){
  setTimeout(function(){
    try { switchTab('gratitude'); } catch(e){}
    document.querySelectorAll('.card.collapsible.collapsed').forEach(function(c){
      c.classList.remove('collapsed');
    });
    var st = document.getElementById('imm-steps');
    if (st) st.style.display = 'none';       // 다섯 단계는 이미 봤다
    window.scrollTo(0, 0);
  }, 400);
});
<\/script>`;

const idxSrc = fs.readFileSync(path.join(R, 'index.html'), 'utf8');
fs.writeFileSync(path.join(tmp, 'index.html'),
  idxSrc.replace('</head>', shrink + seed + '</head>')
        .replace('</body>', drive + '</body>'), 'utf8');

const url = 'file:///' + path.join(tmp, 'index.html').replace(/\\/g, '/');
for (const [name, q] of [['감사탭' + tag + '-아래.png', '?night=0'],
                          ['감사탭' + tag + '-밤.png', '?night=1']]) {
  const dest = path.join(OUT, name);
  try {
    execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
      '--virtual-time-budget=9000',
      '--user-data-dir=' + path.join(tmp, 'prof-' + name),
      '--screenshot=' + dest, '--window-size=520,1500',
      '--force-device-scale-factor=1', url + q],
      { stdio: ['ignore', 'ignore', 'ignore'], timeout: 120000 });
    console.log('  ' + name + '  ' + Math.round(fs.statSync(dest).size / 1024) + 'KB');
  } catch (e) { console.log('  ' + name + '  실패: ' + e.message.slice(0, 80)); }
}
