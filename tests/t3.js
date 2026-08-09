const fs=require('fs'),path=require('path');const {JSDOM}=require('jsdom');
const ROOT=process.argv[2];
let pass=0,fail=0;const ok=(n,c)=>{c?(pass++,console.log('  PASS '+n)):(fail++,console.log('  FAIL '+n));};
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const bundle=['js/data.js','js/bible-story.js','js/app.js'].map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n;\n');

// index.html 인라인 테마 로더를 그대로 뽑아 임의 시각으로 실행한다
const m = html.match(/<script>\s*\(function \(\) \{\s*var q = new URLSearchParams[\s\S]*?\}\)\(\);\s*<\/script>/);
if(!m){console.log('  FAIL 테마 로더 스크립트를 찾지 못함');process.exit(1);}
const loader = m[0].replace(/<\/?script>/g,'');

function themeAt(hour, search){
  const d=new JSDOM('<!DOCTYPE html><html><head><meta name="theme-color" content="#000"></head><body></body></html>',
    {url:'http://x/'+(search||''),runScripts:'outside-only'});
  const w=d.window;
  let written='';
  w.document.write=(s)=>{written+=s;};
  // 시각을 고정한다. getHours 만 주면 안 된다 — isNight() 가 getMinutes·
  // getMonth 도 부르기 때문에 없으면 TypeError 로 죽는다 (실제로 죽었다).
  w.eval(`var __RD=Date; Date=function(){var o=new __RD(2020,0,1,${hour},0,0);
          return {getHours:function(){return ${hour};},
                  getMinutes:o.getMinutes.bind(o),
                  getMonth:o.getMonth.bind(o),
                  valueOf:o.valueOf.bind(o)};};
          Date.now=__RD.now;`);
  w.eval(loader);
  const mm = written.match(/theme-(\w+)\.css/);
  return {theme: mm?mm[1]:'', bar: w.document.querySelector('meta[name="theme-color"]').getAttribute('content')};
}

// app.js 의 getTimeChar 를 같은 시각으로 호출
const d0=new JSDOM(html,{url:'http://x/?preview=home',runScripts:'outside-only',pretendToBeVisual:true});
d0.window.eval(bundle+'\n;window.__g=getTimeChar;');
const getTimeChar=d0.window.__g;

// 평소 화면은 유리(F) 다 — 어머니가 고르셨다. 시각에 따라 색이 바뀌지 않는다.
// (밝기는 해 지는 시각을 보고 밤 덧칠로 처리한다 — 그건 t27 이 지킨다)
console.log('평소 화면은 언제 열어도 유리다 (24시간 전수)');
for(let h=0;h<24;h++){
  const {theme}=themeAt(h);
  ok(`${String(h).padStart(2,'0')}시  theme=${theme}`, theme==='glass');
}

// 캐릭터는 여전히 하루 세 번 바뀐다 — 테마와 달리 이건 그대로 두었다.
// 시간대별 그림이 사라지면 어머니가 알아보시는 얼굴이 없어진다.
console.log('캐릭터는 하루 세 번 그대로 바뀐다');
[[7,'sun'],[13,'forest'],[20,'jesus'],[2,'jesus']].forEach(([h,c])=>
  ok(`${h}시 char=${getTimeChar(h)}`, getTimeChar(h)===c));

console.log('theme-color 메타 동기화');
ok('평소 theme-color=#EEF4FC', themeAt(13).bar==='#EEF4FC');
[[7,'#F8FBFF','sky'],[13,'#F7FBF9','mint'],[20,'#FFFAF7','peach']].forEach(([h,c,t])=>
  ok(`?theme=${t} 일 때 theme-color=${c}`, themeAt(h,'?theme='+t).bar===c));

console.log('?theme= 강제 / none');
ok('?theme=peach 는 유리 대신 나온다', themeAt(7,'?theme=peach').theme==='peach');
ok('?theme=mint 는 유리 대신 나온다',  themeAt(20,'?theme=mint').theme==='mint');
ok('?theme=sky 는 유리 대신 나온다',   themeAt(13,'?theme=sky').theme==='sky');
ok('?theme=glass 도 그대로 유리',      themeAt(13,'?theme=glass').theme==='glass');
ok('?theme=none 은 테마 없음',  themeAt(13,'?theme=none').theme==='');
ok('?theme=bogus 는 평소 화면(유리)', themeAt(13,'?theme=bogus').theme==='glass');

console.log('CSS 파일 존재');
['mint','sky','peach','glass','glass-night'].forEach(t=>ok(`css/theme-${t}.css`, fs.existsSync(path.join(ROOT,'css',`theme-${t}.css`))));

console.log('preview.html 구조');
const pv=fs.readFileSync(path.join(ROOT,'preview.html'),'utf8');
['sky','mint','peach'].forEach(s=>ok(`data-slot="${s}"`, pv.includes(`data-slot="${s}"`)));
ok('PAIR 매핑 존재', /PAIR\s*=\s*\{\s*sky:\s*'sun',\s*mint:\s*'forest',\s*peach:\s*'jesus'\s*\}/.test(pv));
ok('시간대 짝 모드 버튼', pv.includes('data-char=""'));
ok('now-line 요소', pv.includes('id="now-line"'));

console.log(`\n${pass}/${pass+fail} 통과`+(fail?`  (${fail} 실패)`:''));
process.exit(fail?1:0);
