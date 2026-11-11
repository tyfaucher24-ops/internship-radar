/* V22 UI: Find hero (live stat tiles, Search button, result count) and the Insights page.
   Every number is computed in the browser from the listings the site already loaded (D, META), so it stays current after each sync. */
(function(){
const $i=id=>document.getElementById(id);
const fmt=n=>Number(n||0).toLocaleString('en-US');
const H=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const today=()=>iso(new Date());
const dt=s=>new Date(String(s).slice(0,10)+'T12:00:00');
const md=s=>dt(s).toLocaleDateString('en-US',{month:'short',day:'numeric'});
const dayDiff=(a,b)=>Math.round((dt(a)-dt(b))/864e5);
const ready=()=>typeof D!=='undefined'&&D.length&&D.some(x=>'live' in x);

/* ---------------- Find hero ---------------- */
function updLabel(){if(typeof META==='undefined'||!META.updated)return'Live internship data';const d=new Date(META.updated);if(isNaN(d))return'Live internship data';
 const t=d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});return'Live · updated '+(iso(d)===today()?t:d.toLocaleDateString('en-US',{month:'short',day:'numeric'})+', '+t)}
/* "new today" uses the sync's own count (counts.json, America/New_York day); before it loads, nothing is shown rather than a guess */
let CNT=null,cntAt=0;function loadCounts(){if(Date.now()-cntAt<60000)return;cntAt=Date.now();fetch('data/counts.json?ts='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>{if(j&&typeof j.new_today==='number'){CNT=j;heroStats()}}).catch(()=>{})}
function heroStats(){if(!$i('fxOpen'))return;loadCounts();const LC=typeof liveCounts==='function'?liveCounts():{open:0,wk:0};let nw=CNT?CNT.new_today:'',cos='';
 if(ready()){const S=new Set();for(const x of D){if(!x.live||x._mine)continue;S.add(String(x.company||'').toLowerCase())}cos=S.size}
 else if(typeof META!=='undefined'&&META.companies_with_listings)cos=META.companies_with_listings;
 const set=(id,v)=>{const e=$i(id);if(e&&v!==''&&v!=null&&e.textContent!==fmt(v))e.textContent=fmt(v)};
 set('fxOpen',LC.open||'');set('fxWk',LC.wk);set('fxNew',nw);set('fxCos',cos);
 const u=$i('fxUpd');if(u)u.textContent=updLabel();
 const s=$i('fxSub');if(s&&LC.open&&typeof META!=='undefined'&&META.companies_tracked)s.textContent=`${fmt(LC.open)} open internships pulled straight from ${fmt(META.companies_tracked)} company career sites, checked daily, with deadlines flagged before they close.`}
function resCount(){const e=$i('fxRes');if(!e||typeof ALLN==='undefined'||!ready())return;const t=`${fmt(ALLN)} result${ALLN===1?'':'s'}`;if(e.textContent!==t)e.textContent=t}
function toResults(){const r=document.querySelector('#t-db .rhead');if(r)scrollTo({top:r.getBoundingClientRect().top+scrollY-90,behavior:'smooth'})}
function initFind(){
 const g=$i('qGo');if(g)g.addEventListener('click',()=>{const i=$i('q');if(i)i.dispatchEvent(new Event('input',{bubbles:true}));toResults()});
 const qi=$i('q');if(qi)qi.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();qi.dispatchEvent(new Event('input',{bubbles:true}));toResults()}});
 const w=$i('fxWkBtn');if(w)w.addEventListener('click',()=>{if(!fv('dlw').includes('This week')){fset('dlw',[...fv('dlw'),'This week']);update()}toResults()});
 if(typeof update==='function'&&!update.__v22){const u0=update;update=function(){const r=u0.apply(this,arguments);try{resCount()}catch(e){}return r};update.__v22=1}
 heroStats();resCount()}

/* ---------------- Insights ---------------- */
const GROUPS=[['Business majors',['Accounting & Audit','Finance & Banking','Quant & Trading','Consulting & Strategy','Business & Operations','Marketing & Sales','Supply Chain & Logistics','HR & People','Real Estate']],
 ['STEM majors',['Software & IT','Data & AI','Engineering & Hardware','Product Management','Research']],
 ['Health & science',['Healthcare & Life Sciences']],['Communications & arts',['Media & Communications','Design & Creative']],
 ['Policy, law & nonprofit',['Government & Policy','Legal','Nonprofit & Education']]];
const SHORT={'Accounting & Audit':'accounting','Finance & Banking':'finance','Quant & Trading':'quant','Consulting & Strategy':'consulting','Business & Operations':'business & operations','Marketing & Sales':'marketing & sales','Supply Chain & Logistics':'supply chain','HR & People':'HR','Real Estate':'real estate','Software & IT':'software','Data & AI':'data & AI','Engineering & Hardware':'engineering','Product Management':'product','Research':'research','Healthcare & Life Sciences':'healthcare','Media & Communications':'media & communications','Design & Creative':'design','Government & Policy':'government & policy','Legal':'legal','Nonprofit & Education':'nonprofit & education'};
const nm=f=>f==='All'?'all':SHORT[f]||String(f).toLowerCase();
const MIN={c1:40,c2:30,c3:30};
let CACHE=null,CKEY='',FIELD='All';
function summerYear(){const d=new Date();return d.getMonth()>=6?d.getFullYear()+1:d.getFullYear()}
function compute(){const key=(typeof META!=='undefined'&&META.updated||'')+'|'+D.length;if(CACHE&&CKEY===key)return CACHE;
 const t=today(),Y=summerYear(),y0=String(Y-1)+'-01-01',sep=`${Y-1}-09-01`,oct=`${Y-1}-10-01`;
 const B={};const get=f=>B[f]||(B[f]={open:0,post:[],dl:[],ug:0,fs:0,yr:{Freshman:0,Sophomore:0,Junior:0,Senior:0},co:new Map()});
 let track='';
 for(const x of D){if(x._mine)continue;const f=x.category||x.industry||'Other';const fs=String(x.fs||x.first_seen||'').slice(0,10);if(fs&&(!track||fs<track))track=fs;
  for(const b of [get('All'),get(f)]){
   if(x.status!=='upcoming'&&x.st!=='upcoming'&&x.season==='Summer'&&+x.year===Y&&x.posted&&x.posted>=y0)b.post.push(String(x.posted).slice(0,10));
   if(!x.live)continue;b.open++;
   if(x.deadline&&x.deadline>=t)b.dl.push(dayDiff(x.deadline,t));
   const cy=x.class_years||[];if(cy.length&&cy.some(c=>c!=='Graduate')){b.ug++;for(const c of cy)if(c in b.yr)b.yr[c]++;if(cy.includes('Freshman')||cy.includes('Sophomore')){b.fs++;b.co.set(x.company,(b.co.get(x.company)||0)+1)}}}}
 const out={};for(const[f,b]of Object.entries(B)){const p=b.post.sort(),d=b.dl.sort((a,c)=>a-c);
  out[f]={open:b.open,
   c1:p.length?{n:p.length,q1:p[Math.floor(p.length/4)],med:p[Math.floor(p.length/2)],q3:p[Math.floor(3*p.length/4)],pre_sep:Math.round(100*p.filter(s=>s<sep).length/p.length),pre_oct:Math.round(100*p.filter(s=>s<oct).length/p.length)}:null,
   c2:d.length?{n:d.length,w14:Math.round(100*d.filter(v=>v<=14).length/d.length),w7:Math.round(100*d.filter(v=>v<=7).length/d.length),med:d.length%2?d[(d.length-1)/2]:Math.round((d[d.length/2-1]+d[d.length/2])/2),week:d.filter(v=>v<=7).length}:null,
   c3:b.ug?{n:b.ug,under:Math.round(100*b.fs/b.ug),under_n:b.fs,yrs:Object.fromEntries(Object.entries(b.yr).map(([k,v])=>[k,Math.round(100*v/b.ug)])),top:[...b.co.entries()].sort((a,c)=>c[1]-a[1]).slice(0,3).map(e=>e[0])}:null}}
 let early=null;for(const[f,v]of Object.entries(out))if(f!=='All'&&f!=='Other'&&v.c1&&v.c1.n>=MIN.c1&&(!early||v.c1.med<out[early].c1.med))early=f;
 CACHE={F:out,Y,track,early};CKEY=key;return CACHE}
function shell(){const s=$i('t-insights');if(!s||s.dataset.v22)return;s.dataset.v22=1;
 s.innerHTML=`<div class="pagehead ins-head"><div class="container ins-wrap"><p class="ins-ey">Insights</p><h1>3 things to know before you apply</h1><p class="lede">From live internship data, updated with every sync. Pick your field to see its numbers.</p></div></div>
 <div class="container ins-wrap">
 <div class="ins-pick"><label for="insFld">What are you looking for?</label><select id="insFld"></select><span class="ins-cnt" id="insCnt"></span></div>
 <div id="insLoad" class="muted ins-load" role="status">Loading live data…</div>
 <section class="ins-card" id="k1" aria-labelledby="h1i"><div class="ins-hdr"><span class="ins-num" aria-hidden="true">1</span><h2 id="h1i">When roles post</h2></div>
  <div class="ins-row"><div><p class="ins-big" id="b1"></p><p class="ins-say" id="s1"></p><div class="ins-sec"><div><b id="x1a"></b><small id="x1al"></small></div><div><b id="x1b"></b><small id="x1bl"></small></div></div></div>
  <div><div class="ins-tl" id="tl" aria-hidden="true"></div><p class="ins-cmp" id="c1"></p></div></div>
  <div class="ins-lim" id="l1"></div><p class="ins-tip" id="t1"></p><p class="ins-fn" id="f1"></p></section>
 <section class="ins-card" id="k2" aria-labelledby="h2i"><div class="ins-hdr"><span class="ins-num" aria-hidden="true">2</span><h2 id="h2i">Deadlines move fast</h2></div>
  <div class="ins-row"><div><p class="ins-big" id="b2"></p><p class="ins-say" id="s2"></p><div class="ins-sec"><div><b id="x2a"></b><small>median days left</small></div><div><b id="x2b"></b><small>close in 7 days</small></div></div></div>
  <div class="ins-bl" id="bl2"></div></div>
  <div class="ins-lim" id="l2"></div><p class="ins-tip" id="t2"></p><p class="ins-fn" id="f2"></p></section>
 <section class="ins-card" id="k3" aria-labelledby="h3i"><div class="ins-hdr"><span class="ins-num" aria-hidden="true">3</span><h2 id="h3i">Who can apply</h2></div>
  <div class="ins-row"><div><p class="ins-big" id="b3"></p><p class="ins-say" id="s3"></p><div class="ins-sec"><div><b id="x3a"></b><small>roles open to 1st/2nd-years now</small></div></div></div>
  <div class="ins-bl" id="bl3"></div></div>
  <div class="ins-lim" id="l3"></div><p class="ins-tip" id="t3"></p><p class="ins-fn" id="f3"></p></section>
 </div>`;
 $i('insFld').addEventListener('change',e=>{FIELD=e.target.value;render()})}
function options(F){const sel=$i('insFld');const known=new Set(GROUPS.flatMap(g=>g[1]));const extra=Object.keys(F).filter(f=>f!=='All'&&f!=='Other'&&!known.has(f)&&F[f].open).sort();
 const grp=GROUPS.map(([g,fs])=>[g,fs.filter(f=>F[f]&&F[f].open)]).filter(g=>g[1].length);if(extra.length)grp.push(['Other fields',extra]);
 const h='<option value="All">All fields</option>'+grp.map(([g,fs])=>`<optgroup label="${H(g)}">`+fs.map(f=>`<option value="${H(f)}">${H(f)}</option>`).join('')+'</optgroup>').join('');
 if(sel.dataset.h!==h){sel.dataset.h=h;sel.innerHTML=h}if(!F[FIELD])FIELD='All';sel.value=FIELD}
function lim(k,c,n,min){const el=$i(c),card=$i(k);card.classList.remove('limited','none');el.textContent='';if(!n){card.classList.add('none','limited');el.textContent='Not enough data for this field yet.';return true}
 if(n<min){card.classList.add('limited');el.textContent=`Limited data: based on only ${n} roles, so treat this as a rough guide.`}return false}
const bars=(rows)=>rows.map(([l,v,g])=>`<div class="b"><span>${H(l)}</span><div class="t"><i class="${g?'g':''}" style="width:${Math.max(0,Math.min(100,v))}%"></i></div><span class="v">${v}%</span></div>`).join('');
function render(){if(!$i('t-insights'))return;shell();if(!ready()){$i('insLoad').hidden=false;return}$i('insLoad').hidden=true;
 const C=compute(),F=C.F;options(F);const f=FIELD,d=F[f],A=F.All,n=nm(f),Y=C.Y;
 $i('insCnt').textContent=fmt(d.open)+' open roles';
 const tr=C.track?md(C.track)+', '+C.track.slice(0,4):'recently';
 // card 1
 $i('h1i').textContent=f==='All'?'When roles post':`When ${f} roles post`;
 if(!lim('k1','l1',d.c1&&d.c1.n,MIN.c1)){const c=d.c1;const a0=`${Y-1}-07-01`,a1=`${Y-1}-12-01`;const span=dayDiff(a1,a0);const pos=s=>Math.max(0,Math.min(100,100*dayDiff(s<a0?a0:s>a1?a1:s,a0)/span));
  $i('b1').textContent=md(c.med);$i('s1').textContent=`is the median posting date for Summer ${Y} ${f==='All'?'internships':n+' internships'}. Half go up between ${md(c.q1)} and ${md(c.q3)}.`;
  $i('x1a').textContent=c.pre_sep+'%';$i('x1al').textContent='posted before Sep 1';$i('x1b').textContent=c.pre_oct+'%';$i('x1bl').textContent='posted before Oct 1';
  let tl=`<div class="ax"></div><div class="rng" style="left:${pos(c.q1)}%;width:${Math.max(1.5,pos(c.q3)-pos(c.q1))}%"></div><div class="md" style="left:${pos(c.med)}%"></div><div class="mdl" style="left:${pos(c.med)}%">Median ${md(c.med)}</div>`;
  if(f!=='All'&&A.c1)tl+=`<div class="avg" style="left:${pos(A.c1.med)}%">All fields</div>`;
  tl+='<div class="mo">'+[7,8,9,10,11,12].map((m,i)=>{const s=`${Y-1}-${String(m).padStart(2,'0')}-01`;return`<span style="left:${pos(s)}%;${i==0?'transform:none':i==5?'transform:translateX(-100%)':''}">${dt(s).toLocaleDateString('en-US',{month:'short'})}</span>`}).join('')+'</div>';$i('tl').innerHTML=tl;
  const diff=A.c1?dayDiff(c.med,A.c1.med):0;
  $i('c1').innerHTML=f==='All'?(C.early?`Bar = middle 50% of postings. Earliest field: <b>${H(C.early)}</b> (median ${md(F[C.early].c1.med)}).`:'Bar = middle 50% of postings.'):`Bar = middle 50% of postings. That's <b>${diff===0?'the same as':Math.abs(diff)+' day'+(Math.abs(diff)===1?'':'s')+' '+(diff<0?'earlier than':'later than')}</b> the all-fields median (${md(A.c1.med)}).`;
  $i('t1').textContent=c.pre_oct>=50?'Most of these roles are already up by October. Have your resume ready and start searching in August.':`Have your resume ready by ${md(c.q1)}, then check new postings weekly until ${md(c.q3)}. That is when most roles open.`;
  $i('f1').textContent=`Based on ${fmt(c.n)} Summer ${Y} postings, by the date the company published them. Tracking began ${tr}, so roles that opened and closed earlier are undercounted; real timing is likely a bit earlier.`}
 // card 2
 if(!lim('k2','l2',d.c2&&d.c2.n,MIN.c2)){const c=d.c2;
  $i('b2').textContent=c.w14+'%';$i('s2').textContent=`of ${f==='All'?'internships':n+' internships'} with a deadline close within 14 days.`;
  $i('x2a').textContent=c.med;$i('x2b').textContent=c.w7+'%';
  const rows=[['Within 7 days',c.w7],['Within 14 days',c.w14]];if(f!=='All'&&A.c2)rows.push(['All fields',A.c2.w14,1]);
  $i('bl2').innerHTML=bars(rows)+(f!=='All'?'<p class="ins-cmp">Grey = all fields, within 14 days.</p>':'');
  $i('t2').textContent=c.med<=10?`Apply the same week you see a role. Half close within ${c.med} days.`:`You usually have a few weeks, but ${c.w14}% close within two weeks. Don't wait past the first week.`;
  $i('f2').textContent=`Based on ${fmt(c.n)} open roles that state a deadline (many don't, and those often close without notice). ${fmt(c.week)} close in the next 7 days.`}
 // card 3
 if(!lim('k3','l3',d.c3&&d.c3.n,MIN.c3)){const c=d.c3;
  $i('b3').textContent=c.under+'%';$i('s3').textContent=`of ${f==='All'?'undergrad internships':n+' undergrad internships'} that list class years accept freshmen or sophomores.`;
  $i('x3a').textContent=fmt(c.under_n);
  $i('bl3').innerHTML=bars([['Freshman',c.yrs.Freshman],['Sophomore',c.yrs.Sophomore],['Junior',c.yrs.Junior],['Senior',c.yrs.Senior]])+(f!=='All'&&A.c3?`<p class="ins-cmp">All fields: <b>${A.c3.under}%</b> accept freshmen or sophomores.</p>`:'<p class="ins-cmp">Share of roles open to each class year (roles can list several).</p>');
  $i('t3').textContent=(c.under>=40?'Underclassmen have real options here.':'Most of these roles want juniors and up.')+(c.top.length?` Most roles for 1st/2nd-years: ${c.top.join(', ')}.`:'');
  $i('f3').textContent=`Based on ${fmt(c.n)} open undergrad roles that name eligible class years (${Math.round(100*c.n/Math.max(1,d.open))}% of ${f==='All'?'':n+' '}listings do). Roles that don't say may still accept underclassmen.`}}
const onIns=()=>{const s=$i('t-insights');return s&&!s.hidden};

/* ---------------- wiring ---------------- */
function init(){try{initFind()}catch(e){console.warn('ui22 find',e)}
 document.addEventListener('radar:meta',heroStats);
 document.addEventListener('radar:data',()=>{heroStats();resCount();if(onIns())render()});
 document.addEventListener('radar:refresh',()=>{heroStats();resCount();if(onIns())render()});
 document.addEventListener('radar:page',e=>{if(e.detail==='insights')render()});
 setInterval(heroStats,60000);
 if(onIns())render()}
init();window.renderInsights=render;
})();
document.addEventListener('click',e=>{if(e.target.closest('.pm-fb')&&typeof pm==='function')pm(false)});
