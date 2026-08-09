// 유리 테마(theme-glass.css)를 앱 전체에 대고 재 본다.
//
// 시안 한 장이 아니라 탭 일곱 개 + 창 여럿을 다 입히는 일이라,
// 눈으로 훑으면 반드시 놓친다. 그래서 실제 크롬에 앱을 띄우고
// ?theme=glass 를 켠 뒤 화면마다 재고 다닌다:
//   ① 글씨 대비 4.5:1 (큰 글씨 3:1) — 유리판은 반투명이라 밑색과 섞어 셈한다
//   ② 짚는 자리 44px
//   ③ 글씨 넘침
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const R = process.argv[2] || 'c:\\Users\\yoona\\OneDrive\\文서\\AlwaysonJoy';
const REPO = fs.existsSync(R) ? R : 'c:\\Users\\yoona\\OneDrive\\문서\\AlwaysonJoy';
const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].find(p => fs.existsSync(p));
if (!CHROME) { console.log('건너뜀 — 크롬/엣지 없음'); process.exit(0); }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ajoy-glass-'));
for (const d of ['css', 'js', 'icons']) {
  const src = path.join(REPO, d);
  if (!fs.existsSync(src)) continue;
  fs.mkdirSync(path.join(tmp, d), { recursive: true });
  for (const f of fs.readdirSync(src)) {
    const p = path.join(src, f);
    if (fs.statSync(p).isFile()) fs.copyFileSync(p, path.join(tmp, d, f));
  }
}

const probe = `
<div id="out" style="font:12px monospace;white-space:pre"></div>
<script>
window.__NIGHT__ = /[?&]night=1/.test(location.search);
function rgba(s) {
  const m = String(s).match(/rgba?\\(([^)]+)\\)/);
  if (!m) return null;
  const p = m[1].split(',').map(function (x) { return parseFloat(x); });
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
}
function over(fg, bg) {
  const a = fg.a;
  return { r: fg.r*a + bg.r*(1-a), g: fg.g*a + bg.g*(1-a), b: fg.b*a + bg.b*(1-a), a: 1 };
}
function lum(c) {
  const f = v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
  return 0.2126*f(c.r) + 0.7152*f(c.g) + 0.0722*f(c.b);
}
function ratio(a, b) {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1,l2) + 0.05) / (Math.min(l1,l2) + 0.05);
}
// 그라데이션에서 가장 불리한 색을 뽑는다 (단추 바탕이 gradient 면
// backgroundColor 는 투명이라 이걸 안 읽으면 밑색을 잘못 잡는다)
function gradWorst(img, fg) {
  if (!img || img === 'none' || !/gradient/.test(img)) return null;
  const stops = [];
  const re = /rgba?\\([^)]+\\)/g;
  let m;
  while ((m = re.exec(img))) { const c = rgba(m[0]); if (c && c.a > 0) stops.push(c); }
  if (!stops.length) return null;
  let worst = null, wr = Infinity;
  stops.forEach(function (s) {
    // 반투명 stop 은 밑색과 섞어야 한다. 밑색은 낮·밤이 다르므로
    // 하드코딩하지 않고 FLOOR 를 쓴다 (밤에 #EEF4FC 로 섞으면
    // 밝은 하늘색 단추 위 짙은 글씨가 통과로 잘못 나온다)
    const base = s.a >= 0.999 ? s : over(s, FLOOR);
    const r = ratio(fg, base);
    if (r < wr) { wr = r; worst = base; }
  });
  return worst;
}
// 맨 밑색 — body::before 의 그라데이션은 getComputedStyle 로 못 읽으므로
// 손으로 적어 둔다. 언제나 **불리한 쪽**을 고른다:
//   낮  = 먹색 글씨 → 바탕이 어두울수록 불리 → 가장 어두운 파스텔 #CFE4FF
//   밤  = 흰 글씨   → 바탕이 밝을수록 불리  → 빛 두 덩이가 겹친 가장 밝은 자리
//         (rgba(61,220,245,.10) 과 rgba(167,139,250,.10) 을 #0B1220 위에 겹친 값)
const NIGHT = !!window.__NIGHT__;
const FLOOR = NIGHT ? { r: 31, g: 48, b: 73, a: 1 }
                    : { r: 207, g: 228, b: 255, a: 1 };
function bgOf(el, fg) {
  const stack = [];
  let n = el, opaque = false;
  // ⚠ body·html 에서 멈추면 안 된다. 둘 다 불투명한 바탕색을 갖고 있지만
  //   그 위에 body::before 가 빛을 한 겹 더 덮는다 — 여기서 멈추면 밤
  //   화면을 '아주 어두운 바탕' 으로 잘못 셈해서 대비가 실제보다 좋게 나온다.
  //   (예전에 이 실수로 흰 글씨가 1.08:1 인 걸 통과로 읽은 적이 있다)
  while (n && n.nodeType === 1 && n !== document.body && n !== document.documentElement) {
    const st = getComputedStyle(n);
    const g = gradWorst(st.backgroundImage, fg);
    if (g) { stack.push(g); if (g.a >= 0.999) { opaque = true; break; } }
    const c = rgba(st.backgroundColor);
    if (c && c.a > 0) { stack.push(c); if (c.a >= 0.999) { opaque = true; break; } }
    n = n.parentElement;
  }
  let acc = opaque ? stack.pop() : FLOOR;
  for (let i = stack.length - 1; i >= 0; i--) acc = over(stack[i], acc);
  return acc;
}

const EMOJI = /^[\\p{Extended_Pictographic}\\u2020-\\u27BF\\uFE0F\\u200D\\s›‹✦✝×—·]+$/u;

function scan(root, where, res) {
  if (!root) return;
  root.querySelectorAll('*').forEach(function (n) {
    if (n.children.length) return;
    const txt = n.textContent.trim();
    if (!txt) return;
    const st = getComputedStyle(n);
    if (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) < 0.1) return;
    const box = n.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) return;

    // 넘침 — 글자만 Range 로 잰다 (scrollWidth 는 장식까지 세어 헛으로 걸린다)
    if (st.whiteSpace === 'nowrap') {
      const rng = document.createRange();
      rng.selectNodeContents(n);
      const tw = rng.getBoundingClientRect().width;
      rng.detach();
      if (tw > box.width + 1) {
        res.over.push(where + ' ' + (n.className || n.tagName) + ' "' + txt.slice(0,14) + '" '
                      + Math.round(tw) + '>' + Math.round(box.width));
      }
    }
    if (EMOJI.test(txt)) return;
    const fg0 = rgba(st.color);
    if (!fg0) return;
    const bg = bgOf(n, fg0);
    const fg = fg0.a < 0.999 ? over(fg0, bg) : fg0;
    const r = ratio(fg, bg);
    const size = parseFloat(st.fontSize);
    const bold = parseInt(st.fontWeight, 10) >= 700;
    const need = (size >= 24 || (size >= 18.66 && bold)) ? 3 : 4.5;
    if (r < need) {
      res.low.push(where + ' ' + (n.className || n.tagName) + ' "' + txt.slice(0,12) + '" '
                   + r.toFixed(2) + ':1 (필요 ' + need + ') ' + Math.round(size) + 'px');
    }
  });
  root.querySelectorAll('button, [role=button], select, textarea').forEach(function (b) {
    const st = getComputedStyle(b);
    if (st.display === 'none' || st.visibility === 'hidden') return;
    const r = b.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    if (r.height < 44) {
      res.small.push(where + ' "' + (b.textContent.trim().slice(0,12) || b.tagName)
                     + '" ' + Math.round(r.height) + 'px');
    }
  });
}

const wait = ms => new Promise(r => setTimeout(r, ms));

window.addEventListener('load', function () { setTimeout(run, 700); });
async function run() {
  const res = { over: [], small: [], low: [], seen: 0, steps: [] };
  const TABS = ['home','word','story','hymn','prayer','gratitude','album'];
  try {
    // ── 첫 화면부터 본다 ──
    // 여기를 빼놓고 재고 있었다. 아래에서 사용자를 미리 심어 홈으로 바로
    // 뛰기 때문에, 처음 켠 분이 제일 먼저 보는 화면만 한 번도 안 쟀다.
    // ('어린아이와 같이' 말씀을 넣고 나서야 알았다 — 새로 넣은 글씨의
    //  진하기를 재려 했더니 재는 자리에 없었다.)
    showScreen('onboard');
    if (typeof applyLangUI === 'function') applyLangUI();
    await wait(120);
    scan(document.getElementById('screen-onboard'), 'onboard', res);
    res.steps.push('onboard');
    res.seen++;
    showScreen('main');
    await wait(80);

    for (const t of TABS) {
      switchTab(t);
      await wait(90);
      // 접힌 카드를 펼쳐야 속을 볼 수 있다
      document.querySelectorAll('#tab-'+t+' .card.collapsible.collapsed').forEach(function (c) {
        const h = c.querySelector('.card-label, .story-section-header');
        if (h) h.click();
      });
      await wait(70);
      scan(document.getElementById('tab-'+t), t, res);
      res.steps.push(t);
      res.seen++;
    }
    scan(document.querySelector('.app-header'), 'header', res);
    scan(document.querySelector('.tab-nav'), 'nav', res);

    // 성경 읽기
    switchTab('word'); await wait(60);
    openBible(1,1); await wait(160);
    scan(document.getElementById('tab-word'), 'bible', res);
    res.steps.push('bible');

    // 게임 세 가지 — 문제 화면과 마침 화면
    for (const k of ['hymn','people','pair']) {
      switchTab('album'); await wait(50);
      openGame(k); await wait(110);
      scan(document.getElementById('game-modal'), 'game:'+k, res);
      renderGameEnd(); await wait(80);
      scan(document.getElementById('game-modal'), 'gameend:'+k, res);
      closeGame(); await wait(50);
      res.steps.push('game:'+k);
    }

    // 크게 보기
    showFullscreenVerse(); await wait(110);
    scan(document.getElementById('fullscreen-verse') || document.querySelector('.fullscreen-verse'), 'fsv', res);
    closeFullscreen(); await wait(50);
    res.steps.push('fsv');

    // 기억 창 세 개
    for (const k of ['people','verses','faith']) {
      openMemoryModal(k); await wait(100);
      scan(document.getElementById('memory-modal'), 'memory:'+k, res);
      if (typeof closeMemoryModal === 'function') closeMemoryModal();
      await wait(50);
      res.steps.push('memory:'+k);
    }
  } catch (e) {
    res.err = String(e && e.message || e);
  }
  document.getElementById('out').textContent = JSON.stringify({
    seen: res.seen, steps: res.steps, err: res.err || null,
    overN: res.over.length,  over:  res.over.slice(0, 10),
    smallN: res.small.length, small: [...new Set(res.small)].slice(0, 14),
    lowN: res.low.length,     low:  [...new Set(res.low)].slice(0, 22)
  });
}
<\/script>
`;

const seed = `<script>try{
  localStorage.setItem('ajoy_user', JSON.stringify({name:'차정윤',joinDate:'2026-01-01T00:00:00.000Z'}));
  localStorage.setItem('ajoy_gratitude', JSON.stringify([{date:'2026-07-30',items:['햇살','가족','건강']}]));
  localStorage.setItem('ajoy_prayers', JSON.stringify([{date:'2026-07-30',text:'기도 한 줄',guide:'acts',cid:'p1'}]));
  localStorage.setItem('ajoy_favorites', JSON.stringify([{text:'항상 기뻐하라',ref:'살전 5:16'}]));
  localStorage.setItem('ajoy_bibleReads', JSON.stringify([{n:1,c:1},{n:1,c:2}]));
  localStorage.setItem('ajoy_memories', JSON.stringify({people:[{name:'어머니',relation:'가족',note:'기도합니다'}],myVerses:[{text:'하나님은 사랑이라',ref:'요일 4:8'}],myFaith:{baptism:'1970',church:'기쁨교회',note:'긴 이야기'}}));
  localStorage.setItem('ajoy_immanuel', JSON.stringify([{date:'2026-07-30',appreciation:'감사',memory:'산책',feeling:'평안',jesus:'가까이',word:'평화',photos:[]}]));
  localStorage.setItem('ajoy_gamePlays', JSON.stringify(3));
}catch(e){}<\/script>`;

const idx = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');
fs.writeFileSync(path.join(tmp, 'index.html'),
  idx.replace('</head>', seed + '</head>').replace('</body>', probe + '</body>'), 'utf8');

// 낮·밤 둘 다 잰다. 밤은 색만 바뀐 게 아니라 **글씨색이 뒤집힌다** —
// 낮에 통과한 것이 밤에 통과한다는 보장이 전혀 없다.
function measure(night) {
  const url = 'file:///' + path.join(tmp, 'index.html').replace(/\\/g, '/')
            + '?theme=glass&preview=home' + (night ? '&night=1' : '&night=0');
  try {
    // t26 과 같은 깃발만 쓴다. --window-size 를 얹었더니 크롬이 안 끝나고
    // 4분 뒤 죽었다 (virtual time 이 안 흐른 듯하다).
    // 프로필은 낮·밤 따로 — 같이 쓰면 두 번째가 잠금에 걸려 멈춘다.
    const dom = execFileSync(CHROME, [
      '--headless=new', '--disable-gpu', '--virtual-time-budget=25000',
      '--user-data-dir=' + path.join(tmp, 'prof-' + (night ? 'n' : 'd')),
      '--dump-dom', url
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 150000 });
    const mm = dom.match(/<div id="out"[^>]*>(.*?)<\/div>/s);
    if (!mm) return null;
    return JSON.parse(mm[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&')
                           .replace(/&lt;/g,'<').replace(/&gt;/g,'>'));
  } catch (e) {
    console.log('브라우저 실행 실패: ' + e.message);
    return null;
  }
}

console.log('유리 테마(F) — 앱 전체 재기   [390px 폰]\n');
let bad = 0, died = false;
for (const [night, name] of [[false, '☀ 낮'], [true, '🌙 밤']]) {
  const r = measure(night);
  console.log('── ' + name + ' ──');
  if (!r) { console.log('  측정값 없음 — 앱이 안 떴다\n'); died = true; continue; }
  console.log('  돌아본 화면: ' + r.steps.length + '곳');
  if (r.err) { console.log('  ⚠ 도중에 멈춤: ' + r.err); died = true; }
  console.log('  대비 기준 못 넘음 : ' + r.lowN);
  r.low.forEach(x => console.log('      → ' + x));
  console.log('  짚는 자리 44px 미만: ' + r.smallN);
  r.small.forEach(x => console.log('      → ' + x));
  console.log('  글씨 넘침         : ' + r.overN);
  r.over.forEach(x => console.log('      → ' + x));
  console.log('');
  bad += r.lowN + r.smallN + r.overN;
}
console.log(bad === 0 && !died ? '낮·밤 다 통과' : '⚠ 손볼 곳 ' + bad + '건');
if (died) process.exit(1);
