// 온보딩 첫 화면이 여러 폰 높이에서 스크롤 없이 들어오는지 확인
const fs=require('fs'),path=require('path');
const {JSDOM}=require('jsdom');
const ROOT=process.argv[2];let pass=0,fail=0;
const ok=(n,c,extra)=>{c?(pass++,console.log('  PASS '+n)):(fail++,console.log('  FAIL '+n+(extra?'  '+extra:'')));};

// clamp(min, pref, max) 를 주어진 화면 높이에서 손으로 계산한다
// (jsdom 은 실제 레이아웃을 안 하므로 CSS 값을 직접 파싱해 합산)
const css=fs.readFileSync(path.join(ROOT,'css','style.css'),'utf8');
function rule(sel){
  const m=css.match(new RegExp('(?:^|\\})\\s*'+sel.replace('.','\\.').replace('#','#')+'\\s*\\{([^}]*)\\}','m'));
  return m?m[1]:null;
}
// px 또는 clamp(a,bvh,c) 를 vh 높이에 대해 계산
function px(val,H){
  val=val.trim();
  const c=val.match(/^clamp\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\)$/);
  if(c) {
    const lo=px(c[1],H), pref=px(c[2],H), hi=px(c[3],H);
    return Math.min(Math.max(lo,pref),hi);
  }
  let m=val.match(/^([\d.]+)px$/); if(m) return parseFloat(m[1]);
  m=val.match(/^([\d.]+)vh$/); if(m) return parseFloat(m[1])/100*H;
  m=val.match(/^([\d.]+)$/); if(m) return parseFloat(m[1]);
  throw new Error('알 수 없는 값: '+val);
}
function prop(sel,name,H){
  const body=rule(sel); if(!body) throw new Error('규칙 없음: '+sel);
  // clamp( 안의 쉼표를 건드리지 않도록 선언 단위로 자른다
  const decls=body.split(/;(?![^(]*\))/);
  for(const d of decls){
    const i=d.indexOf(':'); if(i<0) continue;
    if(d.slice(0,i).trim()===name) return d.slice(i+1);
  }
  return null;
}
function shorthandParts(sel,name,H){
  const raw=prop(sel,name,H); if(raw===null) return null;
  // 최상위 공백으로 분리 (clamp(...) 내부 공백 무시)
  const parts=[]; let depth=0,cur='';
  for(const ch of raw.trim()){
    if(ch==='(')depth++; if(ch===')')depth--;
    if(ch===' '&&depth===0){ if(cur){parts.push(cur);cur='';} } else cur+=ch;
  }
  if(cur)parts.push(cur);
  return parts.map(p=>px(p,H));
}

const HEIGHTS=[{n:'스크린샷 폰 (표시영역 650)',H:650},{n:'작은 폰 (568)',H:568},
               {n:'일반 폰 (740)',H:740},{n:'큰 폰 (860)',H:860}];

console.log('온보딩 필요 높이 계산');
for(const {n,H} of HEIGHTS){
  const padTop=shorthandParts('#screen-onboard','padding',H)[0];
  const padBot=shorthandParts('#screen-onboard','padding',H)[2];
  const charH=px(prop('.ob-char','height',H),H);
  const charMb=px(prop('.ob-char','margin-bottom',H),H);
  const titleFs=px(prop('.ob-title','font-size',H),H);
  const titleH=titleFs*1.35;                       // serif 한 줄
  const titleMb=px(prop('.ob-title','margin-bottom',H),H);
  const subH=13*1.4, subMb=px(prop('.ob-sub','margin-bottom',H),H);
  const vcPadV=shorthandParts('.ob-verse-card','padding',H)[0]*2;
  const vcMb=px(prop('.ob-verse-card','margin-bottom',H),H);
  const lineLh=px(prop('.ob-verse-line','line-height',H),H);
  const verseH=lineLh*3;                           // 3줄 (line-height 가 px)
  const refMt=px(prop('.ob-verse-ref','margin-top',H),H), refH=12*1.4;
  const lblH=13*1.4, lblMb=px(prop('.ob-label','margin-bottom',H),H);
  const inPadV=shorthandParts('.ob-input','padding',H)[0]*2;
  const inH=inPadV+17*1.3+3, inMb=px(prop('.ob-input','margin-bottom',H),H);
  // 연령대 네 칸이 있던 자리 — 이제 '어린아이와 같이' 말씀 한 덩이다.
  // 나이를 묻지 않기로 했다 (index.html 의 같은 자리에 이유가 있다).
  // 여기서 세는 것이 중요하다: 없앤 칸이 130px 쯤이었으므로 새 덩이가
  // 그보다 커지면 '시작하기' 단추가 화면 밖으로 밀린다. 이 시험이 그것을 막는다.
  const welPadT=shorthandParts('.ob-welcome','padding',H)[0];
  const welLh=px(prop('.ob-welcome-verse','line-height',H),H);
  const welVerseH=welLh*3;                         // 석 줄
  const welRefMt=px(prop('.ob-welcome-ref','margin-top',H),H), welRefH=12*1.4;
  const welH=welPadT+welVerseH+welRefMt+welRefH+1; // +1 은 위쪽 실선
  const welMb=px(prop('.ob-welcome','margin-bottom',H),H);
  const btnPadV=px(prop('.ob-start-btn','padding',H),H)*2;
  const btnH=btnPadV+16*1.3;

  const total=padTop+charH+charMb+titleH+titleMb+subH+subMb
    +vcPadV+verseH+refMt+refH+vcMb
    +lblH+lblMb+inH+inMb          // 이름
    +welH+welMb                   // 어린아이와 같이 (이름표 없음 — 물음이 아니다)
    +btnH+padBot;
  ok(`${n}: 필요 ${Math.round(total)}px <= ${H}px`, total<=H,
     `초과 ${Math.round(total-H)}px`);
}

console.log('반응형 규칙이 들어갔는지');
ok('.screen 에 dvh 사용', /\.screen \{[^}]*min-height:\s*100dvh/.test(css));
ok('#screen-onboard 에 dvh 사용', /#screen-onboard \{[^}]*100dvh/s.test(css));
ok('#screen-onboard padding clamp', /#screen-onboard \{[^}]*padding:\s*clamp/s.test(css));
ok('.ob-char 높이 clamp', /\.ob-char \{[^}]*height:\s*clamp/s.test(css));
ok('.ob-start-btn padding clamp', /\.ob-start-btn \{[^}]*padding:\s*clamp/s.test(css));
ok('세로 가운데 정렬', /#screen-onboard \{[^}]*justify-content:\s*center/s.test(css));
ok('큰 화면 최대값 유지 (112px)', /clamp\(60px,\s*10\.5vh,\s*112px\)/.test(css));

// 나이를 다시 묻지 않는지 — 화면에서도, 규칙에서도, 말모음에서도.
// 되돌아오기 쉬운 변경이라(칸 하나 붙이면 끝) 시험으로 못을 박는다.
console.log('나이를 묻지 않는지');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const glass=fs.readFileSync(path.join(ROOT,'css','theme-glass.css'),'utf8');
const dataJs=fs.readFileSync(path.join(ROOT,'js','data.js'),'utf8');
const appJs=fs.readFileSync(path.join(ROOT,'js','app.js'),'utf8');
// 주석은 뺀다 — 왜 없앴는지 적어 둔 설명이 걸리면 안 된다
const noCmt=s=>s.replace(/<!--[\s\S]*?-->/g,'').replace(/\/\*[\s\S]*?\*\//g,'')
                 .replace(/^\s*\/\/.*$/gm,'');
ok('첫 화면에 나이 고르는 칸이 없다', !/ob-age|연령대/.test(noCmt(html)));
ok('style.css 에 죽은 ob-age 규칙이 없다', !/ob-age/.test(noCmt(css)));
ok('theme-glass.css 에도 없다', !/ob-age/.test(noCmt(glass)));
ok('말모음에 obAge 열쇠가 없다', !/obAge/.test(noCmt(dataJs)));
ok('DATA.ageGroups 표가 없다', !/ageGroups\s*:/.test(noCmt(dataJs)));
ok('저장할 때 ageGroup 을 넣지 않는다', !/ageGroup\s*:/.test(noCmt(appJs)));
// 대신 들어간 것 — 없앤 자리가 빈 칸으로 남지 않았는지
ok('어린아이와 같이 말씀이 들어갔다', /ob-welcome-verse/.test(html));
ok('말모음에 ko·en 둘 다 있다',
   (dataJs.match(/obWelcomeVerse/g)||[]).length>=2 &&
   (dataJs.match(/obWelcomeRef/g)||[]).length>=2);
ok('저작권 있는 번역이 아니다 (개역한글/WEB)',
   /개역한글/.test(dataJs) && /WEB/.test(dataJs));
ok('setPhrase 로 낱말이 갈리지 않게 넣는다',
   /setPhrase\(\s*'ob-welcome-verse'/.test(appJs));

console.log(`\n${pass}/${pass+fail} 통과`+(fail?`  (${fail} 실패)`:''));
process.exit(fail?1:0);
