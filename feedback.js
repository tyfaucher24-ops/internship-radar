/* V14.4 Honest feedback, rebuilt around three questions: How strong am I? What helps me? What should I do next?
   Every number comes from the same grader (match-core.js) that grades the cards, run on the live listings and the
   saved profile. Quotes come from the profile itself. Nothing is invented: a factor with no data is hidden. Local only. */
(function(){
const N=n=>Number(n).toLocaleString();
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const RM=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const tick=()=>new Promise(r=>setTimeout(r,0));
const FACT=[['GPA','GPA'],['Experience','Relevant experience'],['Skills','Skills and certifications'],['School','School']];
const lvl=v=>v>=70?'hi':v>=50?'mid':'lo';
const TAGW={safety:'Safety',target:'Target',reach:'Reach'};
const LEAD=/\b(president|vice president|captain|co-?captain|chair|founder|co-?founder|head|director|treasurer|lead|leader|officer|manager|coordinator)\b/i;
const ATH=/\b(varsity|ncaa|athlet\w*|division (i|ii|iii|1|2|3)|d1|d2|d3)\b/i;
const expLine=e=>[e.title,e.org].filter(Boolean).join(', ');
/* real quotes from the saved profile; empty when the profile has none */
function quotes(pr){const ex=(pr.experience||[]).filter(e=>e&&(e.title||e.org));const rel=ex.find(e=>/intern|job/i.test(e.kind||e.type||''))||ex[0];
 const sk=(pr.skills||[]).slice(0,3),ce=(pr.certs||[]).slice(0,2);
 const lead=ex.find(e=>/leadership/i.test(e.kind||e.type||'')||LEAD.test(e.title||''));
 const ath=ex.find(e=>ATH.test([e.title,e.org,e.kind,...(e.bullets||[])].join(' ')));
 return{GPA:pr.gpa?`GPA ${pr.gpa}`:'',Experience:rel?expLine(rel):'',Skills:[...sk,...ce].join(', '),School:pr.school||'',lead:lead?expLine(lead):'',ath:ath?expLine(ath):''}}
async function multi(profiles){const rows=slimRows();if(!window._fbW){window._fbW=new Worker('match-worker.js'+self.BV);window._fbW.postMessage({t:'init',rows,cfg:CFG,w:MW})}
 const w=window._fbW;return new Promise(res=>{w.onmessage=e=>{if(e.data.t==='multi')res(e.data)};w.postMessage({t:'multi',profiles})})}
async function scoreAll(rows,P){const out=[];for(let i=0;i<rows.length;i++){if(i%200===199)await tick();let r=null;try{r=MatchCore.score(rows[i],P,CFG,MW)}catch(_){}if(r&&r.pct!=null)out.push({x:rows[i],r})}return out}
const ring=(pct,grade,label)=>{const C=2*Math.PI*52;return`<div class="fx-ring" role="img" aria-label="${E(label)}: ${pct} of 100, grade ${E(grade)}"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="fx-ring-bg" cx="60" cy="60" r="52"/><circle class="fx-ring-fg fx-${lvl(pct)}" cx="60" cy="60" r="52" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${C.toFixed(1)}" data-off="${(C*(1-pct/100)).toFixed(1)}"/></svg><div class="fx-ring-in" aria-hidden="true"><b data-count="${pct}">0</b><span>${E(grade)}</span></div></div>`};
function barsHTML(rows){return`<ul class="fx-bars">${rows.map((b,i)=>b.v==null?`<li class="fx-row fx-flag"><span class="fx-k">${E(b.label)}</span><span class="fx-chip ${b.q?'fx-yes':'fx-no'}">${b.q?'On your resume':'Not on your profile'}</span>${b.q?`<button type="button" class="fx-i" aria-describedby="fxt${i}" aria-label="${E(b.label)} details">i</button><span class="fx-tip" role="tooltip" id="fxt${i}">Your resume: “${E(b.q)}”</span>`:''}</li>`
 :`<li class="fx-row" style="--i:${i}"><button type="button" class="fx-btn" aria-describedby="fxt${i}"><span class="fx-k">${E(b.label)}</span><span class="fx-n" data-count="${b.v}">0</span><span class="fx-track" aria-hidden="true"><i class="fx-fill fx-${lvl(b.v)}" style="--w:${b.v}%"></i></span><span class="sr-only">${b.v} of 100</span></button><span class="fx-tip" role="tooltip" id="fxt${i}">${b.q?`Your resume: “${E(b.q)}”. `:''}${E(b.t||'')}</span></li>`).join('')}</ul>`}
function cardsHTML(title,items,cls){if(!items.length)return'';return`<section class="fx-card ${cls}" aria-labelledby="h-${cls}"><h2 id="h-${cls}">${title}</h2><ul class="fx-list">${items.map(s=>`<li><b>${E(s.t)}</b>${s.q?`<span class="fx-q">${E(s.q)}</span>`:''}${s.n?`<span class="fx-m">${E(s.n)}</span>`:''}</li>`).join('')}</ul></section>`}
function animate(root){const rm=RM();root.querySelectorAll('.fx-ring-fg').forEach(c=>{if(rm){c.style.transition='none';c.style.strokeDashoffset=c.dataset.off}else requestAnimationFrame(()=>requestAnimationFrame(()=>c.style.strokeDashoffset=c.dataset.off))});
 if(rm)root.classList.add('fx-rm','fx-go');else requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.add('fx-go')));
 root.querySelectorAll('[data-count]').forEach((el,k)=>{const to=+el.dataset.count;if(rm){el.textContent=to;return}const row=el.closest('.fx-row'),d=row?(+getComputedStyle(row).getPropertyValue('--i')||0)*110:0,dur=row?750:900,t0=performance.now()+d;
  const f=t=>{const p=Math.min(1,Math.max(0,(t-t0)/dur)),e=1-Math.pow(1-p,3);el.textContent=Math.round(to*e);if(p<1)requestAnimationFrame(f)};requestAnimationFrame(f)})}
function wire(el){el.querySelectorAll('[data-fbopen]').forEach(a=>a.onclick=e=>{e.preventDefault();const x=BYID.get(a.dataset.fbopen);if(x)openDrawer(x)});
 el.querySelectorAll('[data-tagf]').forEach(a=>a.onclick=e=>{e.preventDefault();F.tagf=a.dataset.tagf;const s=document.getElementById('tagf');if(s)s.value=F.tagf;go('db');update()});
 el.querySelectorAll('.fx-more').forEach(b=>b.onclick=()=>{const t=document.getElementById(b.getAttribute('aria-controls'));const o=b.getAttribute('aria-expanded')==='true';b.setAttribute('aria-expanded',String(!o));t.hidden=o;b.textContent=o?'Show more':'Show less'});
 el.querySelectorAll('.fx-btn,.fx-i').forEach(b=>b.addEventListener('click',()=>{const on=!b.parentElement.classList.contains('tip-on');el.querySelectorAll('.tip-on').forEach(x=>x.classList.remove('tip-on'));if(on)b.parentElement.classList.add('tip-on')}))}
function emptyState(el){el.innerHTML=`<section class="fx-card fx-empty"><h2>Upload your resume to see your honest feedback</h2><p>We grade you against real, live internships. Nothing leaves this browser.</p><a class="btn pri" href="#profile" data-go="profile" id="fxUpload">Upload your resume</a></section>`}
/* ---------- per-posting view ---------- */
/* ---------- overall view ---------- */
async function renderOverall(el,pr,P){
 const rowsAll=slimRows().filter(x=>MSCORE.has(x.id));const inInt=P.industries.length?rowsAll.filter(x=>P.industries.includes(x.industry)):rowsAll;const rows=inInt.length?inInt:rowsAll;
 const S=await scoreAll(rows,P);if(!S.length){emptyState(el);return}
 const Q=quotes(pr),pcts=S.map(o=>o.r.pct).sort((a,b)=>a-b),med=pcts[pcts.length>>1],grade=MatchCore.grade(med,MW);
 const cnt={safety:0,target:0,reach:0,ne:0};S.forEach(o=>{const t=o.r.v143&&o.r.v143.tag;cnt[t||'ne']++});
 const elite=S.filter(o=>o.r.feedback&&o.r.feedback.tier&&+o.r.feedback.tier.t<=1),eliteR=elite.filter(o=>!o.r.v143||o.r.v143.tag!=='safety'&&o.r.v143.tag!=='target').length;
 const n=S.length,good=cnt.safety+cnt.target,area=P.industries.length===1?` in ${P.industries[0]}`:'';
 let say=good>=.3*n?`You’re competitive for a real share of internships${area}: ${N(good)} of ${N(n)} are targets or safeties.`:good>0?`You have some realistic shots${area}, but most are reaches: ${N(good)} of ${N(n)} are targets or safeties.`:`Right now internships${area} are long shots for you: none of ${N(n)} grade as a target or safety.`;
 if(elite.length>=3&&eliteR/elite.length>=.8)say+=` The most selective firms are reaches right now.`;
 /* factor bars: average of the grader's own per-posting scores */
 const bars=FACT.map(([k,label])=>{const vs=[];S.forEach(o=>{const b=((o.r.feedback||{}).breakdown||[]).find(z=>z.k===k&&z.v!=null);if(b)vs.push(b)});if(!vs.length)return null;
  const avg=Math.round(vs.reduce((s,b)=>s+b.v,0)/vs.length),rep=vs.slice().sort((a,b)=>Math.abs(a.v-avg)-Math.abs(b.v-avg))[0];return{label,v:avg,t:rep.t||'',q:Q[k]}}).filter(Boolean);
 bars.push({label:'Leadership',v:null,q:Q.lead},{label:'Athletics',v:null,q:Q.ath});
 /* strengths and gaps: the grader's own factors, most common across your matches */
 const agg=(key,qk)=>{const m=new Map();S.forEach(o=>((o.r.v143||{})[key]||[]).forEach(f=>{const t=f.k==='gate'?'Not eligible at some postings':f.t;const a=m.get(t)||{t,c:0,qs:new Map()};a.c++;const q=f[qk];if(q)a.qs.set(q,(a.qs.get(q)||0)+1);m.set(t,a)}));
  return[...m.values()].sort((a,b)=>b.c-a.c).slice(0,3).map(a=>{const q=[...a.qs].sort((x,y)=>y[1]-x[1])[0];return{t:a.t,q:q?(qk==='resume'?'Your resume: ':'Postings ask for: ')+q[0]:'',n:`At ${N(a.c)} of ${N(n)} of your matches`}})};
 const str=agg('pos','resume'),gap=agg('neg','posting');
 if(Q.lead&&str.length<3)str.push({t:'Leadership role',q:'Your resume: '+Q.lead,n:''});if(Q.ath&&str.length<3)str.push({t:'Athletics',q:'Your resume: '+Q.ath,n:''});
 const sv=new Set(T.all().map(t=>String(t.listingId)));const saved=S.filter(o=>sv.has(String(o.x.id))),sc={safety:0,target:0,reach:0};saved.forEach(o=>{const t=o.r.v143&&o.r.v143.tag;if(t)sc[t]++});
 const best=MatchCore.rank143(S,5).top;/* V15 §3: same ranking as the Top list (eligible, open, your locations first, max 2 per company) */
 el.innerHTML=`<section class="fx-card fx-snap" aria-labelledby="h-snap"><h2 id="h-snap" class="sr-only">How strong am I?</h2><div class="fx-top">${ring(med,grade,'Your typical match')}<div><p class="fx-kicker">How strong am I?</p><p class="fx-say">${E(say)}</p><p class="fx-m">Your median match across ${N(n)} live internships${area}.</p></div></div></section>
 <section class="fx-card" aria-labelledby="h-bars"><h2 id="h-bars">What drives your grades</h2><p class="fx-m">Tap or hover a bar to see why.</p>${barsHTML(bars)}</section>
 <div class="fx-two">${cardsHTML('What helps you',str,'fx-str')}${cardsHTML('What holds you back',gap,'fx-gap')}</div>
 <section class="fx-card" aria-labelledby="h-next"><h2 id="h-next">What should I do next?</h2><div id="fxNext"><p class="fx-m">Testing which changes would raise your grades…</p></div></section>
 <section class="fx-card" aria-labelledby="h-odds"><h2 id="h-odds">Your odds by tier</h2><div class="fx-tiers">${['reach','target','safety'].map(k=>`<div class="fx-tier fx-t-${k}"><b>${N(cnt[k])}</b><span>${TAGW[k]}</span></div>`).join('')}</div>
  <p class="fx-m">Of ${N(n)} live matches${area}.${cnt.ne?` ${N(cnt.ne)} more you’re not eligible for.`:''}${saved.length?` Your ${N(saved.length)} saved: ${N(sc.reach)} reach, ${N(sc.target)} target, ${N(sc.safety)} safety.`:''}</p>
  <p class="fx-links"><a href="#" data-tagf="reach">See your reaches</a><a href="#" data-tagf="realistic">See your realistic picks</a></p>
  ${best.length?`<button type="button" class="btn gh small fx-more" aria-expanded="false" aria-controls="fxBest">Show more</button><div id="fxBest" hidden><h3>Your best odds right now</h3><ol class="fx-best">${best.map(o=>{const x=BYID.get(String(o.x.id));return x?`<li><a href="#" data-fbopen="${E(x.id)}">${E(x.title)}</a> <span class="fx-m">${E(x.company)} · ${o.r.pct}% · ${E(o.r.grade)} · ${TAGW[o.r.v143.tag]}</span>${o.outside?'<span class="c-out"> · Outside your picks</span>':''}</li>`:''}).join('')}</ol></div>`:''}</section>`;
 wire(el);animate(el);
 /* next steps: real re-scores of every live listing with one change each */
 const base=pr,cands=[],add=(label,gain,p2)=>cands.push({label,gain,pr:{...JSON.parse(JSON.stringify(base)),...p2}});
 const miss=new Map();S.forEach(o=>((o.x.req||{}).sk||[]).forEach(s=>{const k=String(s).toLowerCase();if(!P.skills.includes(k))miss.set(s,(miss.get(s)||0)+1)}));
 [...miss].sort((a,b)=>b[1]-a[1]).slice(0,3).forEach(([s,c])=>add(`Learn ${s} and add it to your skills`,`Skills: ${N(c)} of your matches ask for it`,{skills:[...(base.skills||[]),s]}));
 if(!base.relocate)add('Say you’re open to relocating','Location',{relocate:true});
 if(!base.remoteOK)add('Say remote roles are OK','Location',{remoteOK:true});
 let steps=[];try{if(cands.length){const r=await multi(cands.map(c=>c.pr));const idx=new Map(r.ids.map((id,i)=>[id,i])),gi=p=>(MW.grades||[]).findIndex(g=>p>=g[0]);
  steps=cands.map((c,j)=>{let up=0;for(const o of S){const i=idx.get(o.x.id);if(i==null)continue;const nw=r.pcts[j][i];if(nw===255)continue;if(gi(nw)<gi(o.r.pct))up++}return{...c,up}}).filter(c=>c.up>0).sort((a,b)=>b.up-a.up).slice(0,3)}}catch(_){}
 if(!steps.length){const m=new Map();S.forEach(o=>(((o.r.feedback||{}).actions)||[]).forEach(a=>m.set(a,(m.get(a)||0)+1)));steps=[...m].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([label,c])=>({label,gain:`Comes up at ${N(c)} of your matches`,up:0}))}
 const nx=el.querySelector('#fxNext');if(nx)nx.innerHTML=steps.length?`<ol class="fx-steps">${steps.map(s=>`<li><b>${E(s.label)}</b><span class="fx-m">${s.up?`Raises ${N(s.up)} of your ${N(n)} matches by a grade or more. Improves: ${E(s.gain)}.`:E(s.gain)}</span></li>`).join('')}</ol><p class="fx-m">Each count comes from re-grading your matches with that one change. It estimates grades, not offers.</p>`:'<p>None of the simple changes we can test would raise a grade. Your gap is depth of experience, so build more of it.</p>'}
window.renderFeedback=async function(){const el=$('fbBody');if(!el)return;el.classList.remove('fx-go','fx-rm');
 if(!MatchCore.hasProfile(profile)){emptyState(el);return}
 el.dataset.ready='';el.innerHTML='<p class="fx-m fx-load">Grading you against every live internship…</p>';const t0=performance.now();
 await cfgReady;await MWready;if(!MSCORE.size)await rescore();const pr=profile,P=MatchCore.profile(pr);
 await renderOverall(el,pr,P);window._fbMs=Math.round(performance.now()-t0);el.dataset.ready='1'};
})();
