// t27 — 해가 지면 화면이 저절로 어두워지는지
//
// 어머니 말씀: "해질 때 저절로 어두워지게 만들어줘"
//
// 이 시험이 지키는 것:
//   ① 계절을 따른다 — 17시 못박기가 아니다. 여름 저녁 6시는 아직 낮이고,
//      겨울 저녁 6시는 이미 밤이다. 못박아 두면 여름엔 환한데 화면이
//      캄캄해지고 겨울엔 어두운데 화면이 하얗게 눈을 찌른다
//   ② 손으로 고른 것이 저절로보다 세다 — 어머니가 '밝게' 로 두시면
//      해가 져도 밝아야 한다. 안 그러면 고를 수 있는 뜻이 없다
//   ③ 밤 CSS 는 유리 테마에서만 얹힌다 (다른 테마에 섞이면 글씨가 사라진다)
//   ④ 낮·밤 표가 두 군데(index.html · app.js) 있는데 서로 같다
//   ⑤ 밤 CSS 가 글씨색과 유리판을 다 뒤집는다 — 하나라도 빠지면
//      어두운 판에 어두운 글씨가 남는다
//   ⑥ 이 설정은 서버에 안 올린다 (폰마다 다를 수 있다)
//   ⑦ sw.js 가 밤 CSS 를 담아 둔다 — 오프라인에서 덧칠이 빠지면
//      "고쳤다더니 그대로네" 가 된다
const fs = require('fs');
const path = require('path');

const R = process.argv[2] || 'c:\\Users\\yoona\\OneDrive\\문서\\AlwaysonJoy';
let pass = 0, fail = 0;
const fails = [];
function ok(name, cond) {
  if (cond) { pass++; return; }
  fail++; fails.push(name);
  console.log('  x ' + name);
}

const idx   = fs.readFileSync(path.join(R, 'index.html'), 'utf8');
const app   = fs.readFileSync(path.join(R, 'js/app.js'), 'utf8');
const day   = fs.readFileSync(path.join(R, 'css/theme-glass.css'), 'utf8');
const night = fs.readFileSync(path.join(R, 'css/theme-glass-night.css'), 'utf8');
const sw    = fs.readFileSync(path.join(R, 'sw.js'), 'utf8');
const data  = fs.readFileSync(path.join(R, 'js/data.js'), 'utf8');

// ── ① 계절을 따르는가 ──
function table(src, name) {
  const m = src.match(new RegExp(name + '\\s*=\\s*\\[([^\\]]+)\\]'));
  return m ? m[1].split(',').map(Number) : null;
}
const idxSunset  = table(idx, 'SUNSET');
const idxSunrise = table(idx, 'SUNRISE');
const appSunset  = table(app, 'SUNSET_H');
const appSunrise = table(app, 'SUNRISE_H');

ok('index.html 에 월별 일몰표가 있다', !!idxSunset && idxSunset.length === 12);
ok('index.html 에 월별 일출표가 있다', !!idxSunrise && idxSunrise.length === 12);
ok('app.js 에 월별 일몰표가 있다',   !!appSunset && appSunset.length === 12);
ok('app.js 에 월별 일출표가 있다',   !!appSunrise && appSunrise.length === 12);

// ④ 두 군데 표가 같은가 — 한쪽만 고치면 화면과 안내글이 어긋난다
if (idxSunset && appSunset) {
  ok('두 파일의 일몰표가 같다', JSON.stringify(idxSunset) === JSON.stringify(appSunset));
}
if (idxSunrise && appSunrise) {
  ok('두 파일의 일출표가 같다', JSON.stringify(idxSunrise) === JSON.stringify(appSunrise));
}

// 표가 계절을 정말 담고 있는가 — 다 같은 값이면 못박은 것과 다를 게 없다
if (idxSunset) {
  const lo = Math.min(...idxSunset), hi = Math.max(...idxSunset);
  ok('여름과 겨울 일몰이 1시간 이상 다르다 (계절을 따른다)', hi - lo >= 1);
  // 우리나라 안이면 이 범위를 벗어나지 않는다 (12월 5시 17분 ~ 6월 7시 56분)
  ok('일몰이 우리나라 범위 안이다 (17~20시)', lo >= 17 && hi <= 20);
  ok('12월 일몰이 6월보다 이르다', idxSunset[11] < idxSunset[5]);
}
if (idxSunrise) {
  ok('일출이 우리나라 범위 안이다 (5~8시)',
     Math.min(...idxSunrise) >= 5 && Math.max(...idxSunrise) <= 8);
  ok('12월 일출이 6월보다 늦다', idxSunrise[11] > idxSunrise[5]);
}

// 실제로 계절마다 다르게 판단하는지 — 표를 그대로 써서 셈해 본다
if (idxSunset && idxSunrise) {
  const isNight = (month, hour) =>
    hour >= idxSunset[month] || hour < idxSunrise[month];
  // 6월(=5) 저녁 6시 반은 아직 환하다
  ok('6월 저녁 6시 반은 낮이다', isNight(5, 18.5) === false);
  // 12월(=11) 저녁 6시 반은 이미 어둡다
  ok('12월 저녁 6시 반은 밤이다', isNight(11, 18.5) === true);
  // 그 둘이 다르다는 것이 이 기능의 핵심이다
  ok('같은 시각이 계절에 따라 낮/밤이 갈린다',
     isNight(5, 18.5) !== isNight(11, 18.5));
  // 한밤중과 한낮은 계절과 무관하게 같아야 한다
  ok('새벽 3시는 사철 밤이다', [0,3,5,8,11].every(m => isNight(m, 3) === true));
  ok('낮 1시는 사철 낮이다',   [0,3,5,8,11].every(m => isNight(m, 13) === false));
}

// ── ② 손으로 고른 것이 저절로보다 센가 ──
const fn = idx.match(/function isNight\(\)\s*\{([\s\S]*?)\n      \}/);
ok('index.html 에 isNight() 가 있다', !!fn);
if (fn) {
  const b = fn[1];
  ok('저장된 설정(ajoy_screenMode)을 읽는다', /ajoy_screenMode/.test(b));
  // 순서가 중요하다 — 시각 계산이 먼저 return 하면 고른 것이 무시된다.
  // ⚠ 그냥 "'night'" 을 찾으면 안 된다. 같은 함수 안의 get('night')
  //   (미리보기 깃발)에 걸려서, 고른 것을 지워도 통과해 버린다 —
  //   실제로 그렇게 적었다가 망가뜨려 보니 한쪽만 걸렸다.
  //   반드시 pick 을 견주는 곳을 찾아야 한다.
  const pDay   = b.search(/pick\s*===\s*'day'/);
  const pNight = b.search(/pick\s*===\s*'night'/);
  const pClock = b.search(/getHours/);
  ok("'night' 로 고른 것을 시각보다 먼저 본다", pNight > -1 && pNight < pClock);
  ok("'day' 로 고른 것을 시각보다 먼저 본다",   pDay   > -1 && pDay   < pClock);
  ok('밤이면 true 를 돌려준다', /return true/.test(b));
}

// ── ③ 밤 CSS 는 밤 덧칠이 있는 테마에서만 ──
// 예전엔 유리(glass) 하나뿐이라 theme==='glass' 로 못박았지만, 이제
// calm 도 밤 덧칠이 있어 NIGHT 맵(테마→밤 상단바색)으로 골라 얹는다.
// 맵에 없는 테마(sky·mint·peach)엔 밤 CSS 가 안 얹혀야 글씨가 안 사라진다.
ok('밤 CSS 를 NIGHT 맵에 있는 테마에서만 얹는다',
   /NIGHT\[theme\]\s*&&\s*isNight\(\)/.test(idx));
ok('밤 덧칠 파일 이름을 테마에서 만들어 붙인다',
   /theme-'\s*\+\s*theme\s*\+\s*'-night\.css/.test(idx));
// 밤 덧칠(동적 이름)을 낮 덧칠 document.write 뒤에서 쓰는가
ok('밤 CSS 를 낮 CSS 뒤에 얹는다',
   idx.indexOf("-night.css") > idx.indexOf("'<link rel=\"stylesheet\" href=\"css/theme-'"));
ok('밤에는 주소창 색도 어둡게 바꾼다', /#0B1220/.test(idx));

// ── ⑤ 밤 CSS 가 글씨와 유리판을 다 뒤집는가 ──
for (const v of ['--ink', '--ink2', '--ink3', '--ink4',
                 '--gl', '--gl-thin', '--gl-mid', '--gl-solid', '--gl-line',
                 '--bg', '--wash', '--gold', '--on-accent', '--track', '--scrim']) {
  ok('밤 CSS 가 ' + v + ' 를 다시 정한다',
     new RegExp('\\' + v + '\\s*:').test(night));
}
// 낮 파일이 그 변수들을 실제로 쓰고 있는지 — 안 쓰면 밤에 아무 일도 안 난다
for (const v of ['--gl', '--gl-mid', '--on-accent', '--track', '--wash', '--scrim']) {
  ok('낮 CSS 가 ' + v + ' 를 쓴다', new RegExp('var\\(\\' + v + '\\)').test(day));
}
// 밤 글씨는 밝아야 한다 (먹색이 남아 있으면 어두운 판에 어두운 글씨)
const nInk = (night.match(/--ink:\s*(#[0-9A-Fa-f]{6})/) || [])[1];
ok('밤 본문 글씨가 밝다 (' + nInk + ')', !!nInk && parseInt(nInk.slice(1, 3), 16) > 0xC0);
const dInk = (day.match(/--ink:\s*(#[0-9A-Fa-f]{6})/) || [])[1];
ok('낮 본문 글씨는 어둡다 (' + dInk + ')', !!dInk && parseInt(dInk.slice(1, 3), 16) < 0x60);
// 포인트색 위 글씨가 낮·밤 서로 다르다 — 같으면 한쪽이 안 보인다
const dOn = (day.match(/--on-accent:\s*(#[0-9A-Fa-f]{6})/i) || [])[1];
const nOn = (night.match(/--on-accent:\s*(#[0-9A-Fa-f]{6})/i) || [])[1];
ok('포인트색 위 글씨가 낮과 밤에 다르다 (' + dOn + ' / ' + nOn + ')',
   !!dOn && !!nOn && dOn.toUpperCase() !== nOn.toUpperCase());
// 밤에도 유리 못 쓰는 폰 대비가 있는가
ok('밤에도 유리 못 쓰는 폰용 칸이 있다', /@supports not/.test(night));
// 밤 파일에 크기·짚는자리 규칙이 없어야 한다 (두 군데 적으면 한쪽만 고쳐진다)
ok('밤 CSS 에는 min-height 를 다시 적지 않았다', !/min-height/.test(night));

// ── 손으로 고르는 칸 ──
ok('화면 밝기 고르는 칸이 있다', /id="screenmode-card"/.test(idx));
for (const k of ['auto', 'day', 'night']) {
  ok("'" + k + "' 단추가 있다", new RegExp('id="sm-' + k + '"').test(idx));
  ok("'" + k + "' 를 누르면 저장한다",
     new RegExp("setScreenMode\\('" + k + "'\\)").test(idx));
}
ok('setScreenMode 가 app.js 에 있다', /function setScreenMode\(/.test(app));
ok('고른 것을 저장한다', /Store\.save\('screenMode'/.test(app));
ok('renderAll 이 지금 고른 것을 보여준다', /renderScreenMode\(\)/.test(app));
// 짚는 자리 — 세 단추 다 44px 이상
const smRule = day.match(/\.screenmode-btn\s*\{([^}]*)\}/);
ok('.screenmode-btn 규칙이 있다', !!smRule);
if (smRule) {
  const mh = (smRule[1].match(/min-height:\s*(\d+)px/) || [])[1];
  ok('화면밝기 단추가 44px 이상이다 (지금 ' + mh + 'px)', Number(mh) >= 44);
}
// 미리보기 깃발이 저장한 것을 영구히 덮지 않는가
ok('고른 뒤 ?night= 를 주소에서 지운다', /searchParams\.delete\('night'\)/.test(app));

// ── ⑥ 서버에 안 올린다 ──
const cloud = fs.readFileSync(path.join(R, 'js/cloud.js'), 'utf8');
ok('설정을 서버에 올리지 않는다', !/screenMode/.test(cloud));

// ── ⑦ 오프라인에서도 밤 CSS 가 있는가 ──
ok('sw.js 가 밤 CSS 를 담아 둔다', /theme-glass-night\.css/.test(sw));
ok('sw.js 가 낮 CSS 도 담아 둔다', /theme-glass\.css/.test(sw));

// ── 안내글 — 어머니가 읽으실 글 ──
for (const k of ['screenModeTitle', 'screenModeAuto', 'screenModeAutoSub',
                 'screenModeDay', 'screenModeNight', 'screenModeSaved']) {
  const ko = new RegExp(k + ":\\s*'[^']*[가-힣]").test(data);
  ok(k + ' 한글 문구가 있다', ko);
  // 영어 쪽도 있는지 (한글이 남아 있으면 keycheck 가 따로 잡는다)
  ok(k + ' 가 두 번 나온다 (ko·en)',
     (data.match(new RegExp(k + ':', 'g')) || []).length >= 2);
}
// '저절로' 밑에 몇 시에 어두워지는지 사람이 읽을 수 있게 넣는가
ok('해 지는 시각을 사람 말로 적어준다', /function sunsetLabel\(/.test(app));
ok('시각을 오후 O시로 적는다', /오후 \$\{h12\}시/.test(app));
ok('안내글에 시각이 끼워진다', /replace\('\{time\}'/.test(app));
// 낱말이 줄 끝에서 갈리지 않게 — 이 앱의 규칙이다
ok("'저절로' 안내글을 setPhrase 로 넣는다",
   /setPhrase\('sm-auto-sub'/.test(app));

console.log('\nt27: ' + pass + ' pass, ' + fail + ' fail');
if (fail) { console.log('안 된 것:'); fails.forEach(f => console.log('  - ' + f)); }
process.exit(fail ? 1 : 0);
