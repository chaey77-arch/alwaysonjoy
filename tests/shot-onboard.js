// 첫 화면을 그림으로 떠 준다 — 눈으로도 보고 결정하려고.
// (SVG·화면은 눈감고 고치지 않는다는 원칙)
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const R = process.argv[2];
const OUT = process.argv[3] || path.join(os.homedir(), 'Desktop', 'ajoy-sian');
const tmp = path.join(os.tmpdir(), 'ajoy-t', 'shot');
fs.mkdirSync(tmp, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

for (const d of ['js', 'css', 'icons']) {
  fs.cpSync(path.join(R, d), path.join(tmp, d), { recursive: true });
}

// ── 390px 폰처럼 찍는 방법 ──
// --window-size=390 은 안 통한다. 헤드리스 크롬은 innerWidth 를 500px 밑으로
// 내려 주지 않는다 (재 봤다: 390 요청 → inner=500). 그래서 500px 로 짜 놓고
// 390px 만 잘라 찍어, 멀쩡한 화면이 글씨가 넘친 것처럼 보였다.
// 없는 흠을 고치러 갈 뻔했다.
//
// 그래서 다른 시험들과 같은 방법을 쓴다 — 창을 줄이는 게 아니라 판 자체를
// 390px 로 좁힌다. 창은 넉넉히 열고 가운데 390px 만 폰인 셈으로 둔다.
const shrink = `<style>
  html, body { width: 390px !important; margin: 0 auto !important; }
  #screen-onboard { width: 390px !important; }
</style>`;
const idxSrc = fs.readFileSync(path.join(R, 'index.html'), 'utf8');
fs.writeFileSync(path.join(tmp, 'index.html'),
  idxSrc.replace('</head>', shrink + '</head>'), 'utf8');

const url = 'file:///' + path.join(tmp, 'index.html').replace(/\\/g, '/');
const shots = [
  ['첫화면-낮.png',  '?theme=glass&preview=onboard&night=0'],
  ['첫화면-밤.png',  '?theme=glass&preview=onboard&night=1'],
  ['첫화면-지금앱.png', '?preview=onboard'],
];

for (const [name, q] of shots) {
  const dest = path.join(OUT, name);
  try {
    execFileSync(CHROME, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars',
      '--virtual-time-budget=8000',
      '--user-data-dir=' + path.join(tmp, 'prof-' + name),
      '--screenshot=' + dest,
      // 창은 넉넉히 — 판을 390px 로 좁혀 놨으니 창이 클수록 잘릴 일이 없다.
      // 세로는 폰 한 화면(740). 여기까지 다 들어오는지가 볼 것이다.
      '--window-size=520,740',
      '--force-device-scale-factor=1',   /* 윈도 확대배율이 끼어들지 않게 */
      url + q
    ], { stdio: ['ignore', 'ignore', 'ignore'], timeout: 120000 });
    const kb = Math.round(fs.statSync(dest).size / 1024);
    console.log('  ' + name + '  ' + kb + 'KB');
  } catch (e) {
    console.log('  ' + name + '  실패: ' + e.message.slice(0, 60));
  }
}
