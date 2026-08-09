// t28 — 읽어주기가 성경 구절 표기를 '장·절' 로 읽는가.
//
// 폰의 읽어주기는 '창세기 1:1' 을 시계로 본다 ("한 시 일 분").
// : 는 시각이 아니라 장과 절을 가르는 기호다. 앞은 장, 뒤는 절.
//
// 읽어주기는 두 곳에서 시작한다 — 역사 이야기(startTts) 와
// 내가 쓴 기도(PrayerVoice.read). 둘 다 splitForTts 를 지나가므로
// 거기서 바꾼다. 이 시험은 두 길을 다 밟아 본다.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const R = process.argv[2] || path.join(os.homedir(), 'OneDrive', '문서', 'AlwaysonJoy');
const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].find(p => fs.existsSync(p));
if (!CHROME) { console.log('크롬 없음 — 건너뜀'); process.exit(0); }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ajoy-t28-'));
for (const d of ['css', 'js', 'icons']) {
  fs.cpSync(path.join(R, d), path.join(tmp, d), { recursive: true });
}

const probe = `
<div id="out" style="font:12px monospace;white-space:pre"></div>
<script>
window.addEventListener('load', function(){ setTimeout(run, 500); });
function run(){
  var res = { cases: [], story: null, prayer: null, err: null };
  try {
    // ── 한국어로 ──
    State.lang = 'ko';
    var K = [
      ['창세기 1:1',                  '창세기 1장 1절'],
      ['시편 23:4',                   '시편 23장 4절'],
      ['시편 121:1-2',                '시편 121장 1절에서 2절'],
      ['예레미야애가 3:22-23',        '예레미야애가 3장 22절에서 23절'],
      ['살전 5:16-18',               '살전 5장 16절에서 18절'],
      ['요한복음 3:16',               '요한복음 3장 16절'],
      ['데살로니가전서 5:16–18',      '데살로니가전서 5장 16절에서 18절'],
      // 본문 안에 섞여 있는 것도 바뀌어야 한다
      ['느헤미야 8:10은 이 앱의 정신입니다.',
       '느헤미야 8장 10절은 이 앱의 정신입니다.'],
      ['예레미야애가 3:22-23은 소망의 말씀입니다.',
       '예레미야애가 3장 22절에서 23절은 소망의 말씀입니다.'],
      // 한 문장에 둘
      ['창세기 1:1 과 요한복음 1:1 은 같은 말로 엽니다',
       '창세기 1장 1절 과 요한복음 1장 1절 은 같은 말로 엽니다']
    ];
    K.forEach(function(c){
      var got = speakBibleRefs(c[0]);
      res.cases.push({ 넣은것: c[0], 바란것: c[1], 나온것: got, ok: got === c[1] });
    });

    // ── 시각은 건드리지 않는다 ──
    // 앞에 글자가 없는 '3:30' 은 시계다. 바꾸면 "세 장 삼십 절" 이 된다.
    [['오후 3:30에 만나요', false], ['3:30', false], ['10:14', false],
     ['저녁 6:00 예배', false], ['오전 10:30 주일예배', false],
     ['해 지는 시각 19:24', false]].forEach(function(c){
      var got = speakBibleRefs(c[0]);
      res.cases.push({ 넣은것: c[0], 바란것: '그대로', 나온것: got,
        ok: got === c[0], 시각: true });
    });

    // ── 영어일 때는 손대지 않는다 ──
    State.lang = 'en';
    var enIn = 'Genesis 1:1 and Psalm 23:4';
    var enGot = speakBibleRefs(enIn);
    res.cases.push({ 넣은것: '[영어] ' + enIn, 바란것: '그대로',
      나온것: enGot, ok: enGot === enIn });
    State.lang = 'ko';

    // ── 실제로 읽어주기 길을 밟는다 ──
    // ① 역사 이야기: getTtsText() 를 splitForTts 로 나눈 결과
    var joined = splitForTts(getTtsText()).join(' ');
    res.story = {
      장절있음: /\\d+장 \\d+절/.test(joined),
      시계남음: /[가-힣A-Za-z]\\s*\\d+:\\d+/.test(joined),
      맛보기: (joined.match(/[가-힣]+ \\d+장 \\d+절[^.]{0,12}/) || [''])[0]
    };
    // ② 내가 쓴 기도: PrayerVoice 도 splitForTts 를 쓴다
    var pj = splitForTts('주님, 시편 23:4 말씀처럼 함께해 주세요').join(' ');
    res.prayer = { 나온것: pj, ok: pj.indexOf('시편 23장 4절') >= 0 };
  } catch (e) { res.err = String(e && e.message || e); }
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
  '--dump-dom', url + '?preview=story'],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 180000 });
const mm = dom.match(/<div id="out"[^>]*>(.*?)<\/div>/s);
if (!mm || !mm[1].trim()) { console.log('측정값 없음 — 앱이 안 떴다'); process.exit(1); }
const r = JSON.parse(mm[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>'));

let pass = 0, fail = 0;
const ok = (cond, name, extra) => {
  if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (extra ? '  ' + extra : '')); }
};

if (r.err) { console.log('  ✗ 터졌다: ' + r.err); process.exit(1); }

for (const c of r.cases) {
  ok(c.ok, (c.시각 ? '[시각 그대로] ' : '') + c.넣은것,
     c.ok ? '' : '바란것=' + c.바란것 + ' / 나온것=' + c.나온것);
}

ok(r.story && r.story.장절있음, '역사 이야기 읽어주기에 장·절이 있다');
ok(r.story && !r.story.시계남음, '역사 이야기에 시계꼴(숫자:숫자)이 남지 않았다',
   r.story ? '' : '');
ok(r.prayer && r.prayer.ok, '내가 쓴 기도 읽어주기도 장·절로 바뀐다',
   r.prayer ? '나온것=' + r.prayer.나온것 : '');

if (r.story && r.story.맛보기) console.log('  (실제로 읽는 말: ' + r.story.맛보기 + ')');
console.log('');
console.log('t28: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
