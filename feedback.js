/* V6.2 Honest feedback page. Everything is computed from the live listings, the user's saved profile and the same
   scoring engine (match-core.js) that grades the homepage. "What if" lifts are real re-scores in the match worker. Local only. */
(function(){
const norm=s=>(s||'').toLowerCase().replace(/[^a-z0-9&+# ]/g,' ').replace(/\s+/g,' ').trim();
const N=n=>Number(n).toLocaleString();
const GR=()=>(MW.grades||[]).map(g=>g[1]);              // A+ ... F
const gIdx=p=>GR().indexOf(MatchCore.grade(p,MW));     // 0 = best
const letter=g=>g[0];
function kwsFor(x){const ind=x.industry||x.category||'';return new Set([...String((CFG.industryKeywords||{})[ind]||'').split(',').map(norm).filter(Boolean),...norm(x.title).split(' ').filter(w=>w.length>2)])}
function skillHit(s,k){return k.has(s)||[...k].some(w=>s.length>3&&(w.includes(s)||s.includes(w)))}
function resumeChecks(){const t=Store.get('resumeText','')||'';const out=[];const pr=profile;
 if(t){const words=t.split(/\s+/).filter(Boolean).length;
  if(words<250)out.push(['bad',`Your resume is ${N(words)} words. Most one-page student resumes run 350–600; yours is probably missing detail.`]);else out.push(['ok',`Length: ${N(words)} words.`]);
  const lines=t.split(/\n+/).map(s=>s.trim()).filter(Boolean),bul=lines.filter(l=>/^[•\-–*▪●]/.test(l)||l.length>60),q=bul.filter(l=>/\d|%|\$/.test(l));
  if(bul.length)out.push([q.length/bul.length<0.3?'bad':'ok',`${N(q.length)} of ${N(bul.length)} bullet lines contain a number (%, $, counts).${q.length/bul.length<0.3?' Recruiters skim for results; add numbers.':''}`]);
  const dates=(t.match(/\b(19|20)\d{2}\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(19|20)\d{2}/gi)||[]).length;
  out.push([dates<2?'bad':'ok',dates<2?'Almost no dates found. Every role and your graduation need a month and year.':`${N(dates)} dates found.`]);
  out.push([/\bskills?\b/i.test(t)?'ok':'bad',/\bskills?\b/i.test(t)?'Has a skills section.':'No skills section found. Applicant tracking systems look for one.']);
  out.push([/@/.test(t)?'ok':'bad',/@/.test(t)?'Has an email address.':'No email address found.'])}
 else out.push(['bad','No resume uploaded, so these checks use your profile entries only. Upload one on My Profile for a full check.']);
 const ex=pr.experience||[];if(ex.length){const nd=ex.filter(e=>!e.start&&!e.end).length,nb=ex.filter(e=>!(e.bullets||[]).filter(Boolean).length).length;
  if(nd)out.push(['bad',`${nd} of ${ex.length} experience entr${ex.length===1?'y has':'ies have'} no dates.`]);if(nb)out.push(['bad',`${nb} of ${ex.length} experience entr${ex.length===1?'y has':'ies have'} no bullet points describing what you did.`])}
 return out}
async function multi(profiles){const rows=slimRows();if(!window._fbW){window._fbW=new Worker('match-worker.js');window._fbW.postMessage({t:'init',rows,cfg:CFG,w:MW})}
 const w=window._fbW;return new Promise(res=>{w.onmessage=e=>{if(e.data.t==='multi')res(e.data)};w.postMessage({t:'multi',profiles})})}
window.renderFeedback=async function(){const el=$('fbBody');if(!MatchCore.hasProfile(profile)){el.innerHTML=`<div class="fb-card"><h2>Save your profile first</h2><p class="muted">Feedback is based on your saved profile and your grades on real listings.</p><a class="btn pri" href="#profile" data-go="profile">Go to My Profile</a></div>`;return}
 el.innerHTML='<p class="muted">Reviewing your profile against every live listing…</p>';const t0=performance.now();
 await cfgReady;await MWready;if(!MSCORE.size)await rescore();
 const P=MatchCore.profile(profile),live=D.filter(x=>x.live&&MSCORE.has(x.id)),ints=P.industries.length?live.filter(x=>P.industries.includes(x.industry||x.category)):live;
 // 1. standing
 const cnt={A:0,B:0,C:0,D:0,F:0};live.forEach(x=>cnt[letter(MSCORE.get(x.id).grade)]++);const ab=cnt.A+cnt.B,pcts=live.map(x=>MSCORE.get(x.id).pct).sort((a,b)=>a-b),med=pcts[pcts.length>>1];
 const verdict=cnt.A>=20?'You are competitive for a real set of roles. Apply to your A’s first and widely.':ab>=100?'You have realistic shots, but mostly at B-level roles. Most of the market grades you C or lower.':ab>=10?'Right now only a small slice of the market is a realistic fit. You need to apply broadly and improve the gaps below.':'Honestly, you are not competitive for most internships yet. That is fixable, but it starts with the changes below, not with more applications.';
 // 2. gaps
 const sk=new Map();ints.forEach(x=>{const k=kwsFor(x);for(const s of (typeof SKILLS!=='undefined'?SKILLS:[]))if(!P.skills.includes(s)&&skillHit(s,k))sk.set(s,(sk.get(s)||0)+1)});
 const topSk=[...sk].sort((a,b)=>b[1]-a[1]).slice(0,5);
 const gaps=[];if(topSk.length)gaps.push(`<b>Skills you have not listed that the matcher looks for</b> in your interest areas (number of the ${N(ints.length)} live listings that ask for each): ${topSk.map(([s,n])=>`${esc(s)} (${N(n)})`).join(', ')}.`);
 if(!P.exp.length)gaps.push('<b>No experience listed.</b> The scorer counts jobs, internships, clubs and projects. With none, your odds are rated low everywhere, and capped at elite firms.');
 const cyN=P.classYear?ints.filter(x=>(x.class_years||[]).length&&!(x.class_years||[]).includes(P.classYear)).length:0;if(cyN)gaps.push(`<b>Class year:</b> ${N(cyN)} listings in your interests are limited to other class years, so you’re not eligible.`);
 if(P.gpa){const gb=ints.filter(x=>x.gpa_min&&+x.gpa_min>P.gpa).length;if(gb)gaps.push(`<b>GPA:</b> ${N(gb)} listings in your interests state a minimum GPA above your ${P.gpa}.`)}else gaps.push('<b>No GPA given.</b> Firms with GPA bars can’t be scored in your favor without it.');
 if(P.sponsor===true){const sp=ints.filter(x=>x.sponsorship==='Not offered'||x.citizenship===true).length;if(sp)gaps.push(`<b>Sponsorship:</b> ${N(sp)} listings in your interests don’t sponsor visas or require citizenship.`)}
 const elite=live.filter(x=>{const n=norm(x.company);return (CFG.firmTiers||[]).some(f=>!f.placeholder&&+f.tier<=1&&[f.firm,...(f.aliases||[])].map(norm).some(k=>n===k||n.startsWith(k+' ')))});
 if(elite.length){const ef=elite.filter(x=>MSCORE.get(x.id).pct<55).length;if(ef)gaps.push(`<b>Elite firms:</b> you grade D or F at ${N(ef)} of ${N(elite.length)} live listings at firms that accept under 1% of applicants.`)}
 // 3. where you can land
 const byInd=new Map();live.forEach(x=>{const k=x.industry||x.category||'Other',m=MSCORE.get(x.id);const a=byInd.get(k)||{n:0,good:0,sum:0};a.n++;a.sum+=m.pct;if(/^[AB]/.test(m.grade))a.good++;byInd.set(k,a)});
 const bestInd=[...byInd].filter(([,a])=>a.n>=10).sort((p,q)=>q[1].good-p[1].good||q[1].sum/q[1].n-p[1].sum/p[1].n).slice(0,3);
 const cb={low:[],mid:[],high:[]};live.forEach(x=>{const c=MatchCore.competition(x,null).score;if(c!=null)cb[c<45?'low':c<60?'mid':'high'].push(MSCORE.get(x.id).pct)});const avg=a=>a.length?Math.round(a.reduce((s,v)=>s+v,0)/a.length):null;
 const best=live.slice().sort((a,b)=>MSCORE.get(b.id).pct-MSCORE.get(a.id).pct).slice(0,6);
 // 4. what-if re-scores
 const base=profile,cands=[];const add=(label,pr)=>cands.push({label,pr:{...JSON.parse(JSON.stringify(base)),...pr}});
 topSk.slice(0,3).forEach(([s])=>add(`Add ${s} to your skills (only if you can back it up)`,{skills:[...(base.skills||[]),s]}));
 const ti=P.industries[0]||(bestInd[0]&&bestInd[0][0])||'';const tk=[...String((CFG.industryKeywords||{})[ti]||'').split(',').map(s=>s.trim()).filter(Boolean)].slice(0,3);
 if(ti)add(`Add one relevant experience entry in ${ti} (a project, club role or part-time job using ${tk.join(', ')||'the core skills'})`,{experience:[...(base.experience||[]),{kind:'Project',title:`${ti} project`,org:'',bullets:[tk.join(' ')]}]});
 if(!P.gpa)add('Add your GPA (shown here for a 3.5)',{gpa:'3.5'});
 if(!base.relocate)add('Say you’re open to relocating',{relocate:true});
 if(!base.remoteOK)add('Say remote is OK',{remoteOK:true});
 const r=await multi(cands.map(c=>c.pr));const ids=r.ids,idx=new Map(ids.map((id,i)=>[id,i]));
 const lifts=cands.map((c,j)=>{const arr=r.pcts[j];let up=0,toB=0;for(const x of live){const i=idx.get(x.id);if(i==null)continue;const o=MSCORE.get(x.id).pct,nw=arr[i];if(gIdx(nw)<gIdx(o)){up++;if(!/^[AB]/.test(MatchCore.grade(o,MW))&&/^[AB]/.test(MatchCore.grade(nw,MW)))toB++}}return{...c,up,toB}}).filter(c=>c.up>0).sort((a,b)=>b.up-a.up).slice(0,3);
 const checks=resumeChecks();window._fbMs=Math.round(performance.now()-t0);
 const bar=Object.entries(cnt).map(([g,n])=>`<div class="fb-g"><span class="mbadge ${({A:'g5',B:'g4',C:'g3',D:'g2',F:'g0'})[g]}">${g}</span><b>${N(n)}</b><i style="width:${Math.max(1,Math.round(100*n/live.length))}%"></i></div>`).join('');
 el.innerHTML=`
 <div class="fb-card"><h2>1. Where you stand</h2><p class="fb-lede">${verdict}</p><div class="fb-dist">${bar}</div>
  <p class="muted">${N(live.length)} live internships graded. Median match ${med}%. ${N(ab)} are a B- or better (${(100*ab/live.length).toFixed(1)}%).</p></div>
 <div class="fb-card"><h2>2. What’s holding you back</h2>${gaps.length?`<ul class="fb-list">${gaps.map(g=>`<li>${g}</li>`).join('')}</ul>`:'<p>No major gaps found against the listings in your interests.</p>'}</div>
 <div class="fb-card"><h2>3. Where you can realistically land now</h2>
  <ul class="fb-list">${bestInd.map(([k,a])=>`<li><b>${esc(k)}</b>: ${N(a.good)} of ${N(a.n)} listings at B- or better, average ${Math.round(a.sum/a.n)}%</li>`).join('')}
  <li><b>By competition</b>: average ${avg(cb.low)??'n/a'}% at low-competition roles, ${avg(cb.mid)??'n/a'}% at medium, ${avg(cb.high)??'n/a'}% at crowded ones.${avg(cb.low)>avg(cb.high)+5?' Smaller firms and less crowded locations are your best bet.':''}</li></ul>
  <h3>Your best matches right now</h3><ol class="fb-top">${best.map(x=>{const m=MSCORE.get(x.id);return `<li>${logoHTML(x,false,'sm')}<a href="#" data-fbopen="${esc(x.id)}">${esc(x.title)}</a> <span class="muted">${esc(x.company)}</span> <span class="mbadge ${m.band}">${m.pct}% · ${m.grade}</span></li>`}).join('')}</ol></div>
 <div class="fb-card"><h2>4. The changes that would move your grades most</h2>${lifts.length?`<ol class="fb-list">${lifts.map(l=>`<li><b>${esc(l.label)}</b>: raises <b>${N(l.up)}</b> listings by one grade or more${l.toB?`, and ${N(l.toB)} of them up to a B- or better`:''}.</li>`).join('')}</ol><p class="muted small">Each number comes from re-scoring every live listing with that one change. It is an estimate of grades, not of offers.</p>`:'<p>None of the simple changes we can test would raise a grade. Your gaps are in experience depth, so build more of it.</p>'}</div>
 <div class="fb-card"><h2>5. Resume checks</h2><ul class="fb-checks">${checks.map(([k,t])=>`<li class="${k}">${k==='ok'?'✓':'✗'} ${esc(t)}</li>`).join('')}</ul></div>`;
 el.querySelectorAll('[data-fbopen]').forEach(a=>a.onclick=e=>{e.preventDefault();const x=BYID.get(a.dataset.fbopen);if(x)openDrawer(x)})};
})();
