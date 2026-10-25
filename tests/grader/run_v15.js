/* V15 §5 + addenda bars. Exit 1 on any failure. Usage: node tests/grader/run_v15.js [--json out.json] [--quick]
   Profiles: tests/grader/v15_profiles.json (169 SYNTHETIC, fictional profiles; real school names only as the school field).
   Listings: the live data/ snapshot in this repo (real postings). Every metric here is computed independently of the
   ranking code where it can be (relevance by role group, eligibility by class year, location by lat/long radius). */
const fs=require('fs'),path=require('path'),cp=require('child_process');const R=path.join(__dirname,'../..');
global.self=global;require(path.join(R,'match-core.js'));require(path.join(R,'us-cities.js'));const MC=global.MatchCore,USC=global.USC;
const C=JSON.parse(fs.readFileSync(path.join(R,'config.json')));C.schoolTiers=JSON.parse(fs.readFileSync(path.join(R,'data/school_tiers.json')));
const W=JSON.parse(fs.readFileSync(path.join(R,'match-weights.json')));
const RC=require(path.join(R,'resume-core.js')),RX=require(path.join(R,'resume-extract.js'));const COL=JSON.parse(fs.readFileSync(path.join(R,'vendor/colleges.json')));
const QUICK=process.argv.includes('--quick');const TODAY='2026-10-24';
const days=d=>Math.round((Date.parse(d+'T00:00:00')-Date.parse(TODAY+'T00:00:00'))/864e5);
function statusOf(x){if(x.status==='upcoming')return'upcoming';if(x.status==='closed'||x.status==='not_open')return x.status;if(x.deadline){const n=days(x.deadline);if(n<0)return'closed';if(n<=14)return'closing_soon'}return'open'}
const FULL=new Map(JSON.parse(fs.readFileSync(path.join(R,'data/listings.json'))).listings.map(x=>[String(x.id),x]));
const ROWS=JSON.parse(fs.readFileSync(path.join(R,'data/index.json'))).listings.map(x=>{x={...x,id:String(x.id),first_seen:x.fs};if(x.category&&!x.industry)x.industry=x.category;x.st=statusOf(x);
 x._t=[x.company,x.title,x.industry,x.role_type,x.sector,(x.locations||[]).map(l=>(l.city||'')+' '+(l.state||'')).join(' '),x.remote?'remote':''].join(' ').toLowerCase();return x}).filter(x=>x.st!=='closed');
const PR=JSON.parse(fs.readFileSync(path.join(__dirname,'v15_profiles.json')));for(const k of Object.keys(PR))if(typeof PR[k]!=='object')delete PR[k];
const IDS=Object.keys(PR).slice(0,QUICK?40:undefined);
const rng=seed=>{let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}};
const L2N={A:4,B:3,C:2,D:1,F:0};const gnum=g=>{if(!g||g==='—')return null;let v=L2N[g[0]];if(g[1]==='+')v+=1/3;if(g[1]==='-')v-=1/3;return v};
const pc=(a,b)=>b?Math.round(1000*a/b)/10:null;const mean=a=>a.length?Math.round(10*a.reduce((x,y)=>x+y,0)/a.length)/10:null;
// field -> role groups that count as relevant (same map as the QA V15 harness)
const FG={swe:['swe'],data:['data','swe','quant'],ib:['ib','pe','finance','sandt'],consulting:['consulting','finance','ops'],marketing:['marketing'],mech:['mech','eng','hardware'],health:['health','nursing'],accounting:['accounting','finance'],libarts:['marketing','ops','_none','consulting','design'],ops:['ops','consulting']};
const IN={swe:['swe'],data:['data'],ib:['ib','pe','finance'],consulting:['consulting'],marketing:['marketing'],mech:['mech','eng'],health:['health'],accounting:['accounting'],libarts:['marketing','_none'],ops:['ops']};
const SW={ivy:'Harvard University',flagship_target:'University of Michigan',semi:'Indiana University',flagship_unlisted:'Ohio State University',mid:'Appalachian State University',small_private:'Queens University of Charlotte',cc_transfer:'Central Piedmont Community College',hbcu_listed:'Howard University',hbcu_unlisted:'North Carolina A&T State University',unranked:'Western Governors University',missing:''};
const grp=x=>MC.groupOf(x,C)||'_none';
// stratified listing sample: up to 30 real, non-placeholder rows per role group (seeded)
const R7=rng(77),byG=new Map();for(const x of ROWS){if(/\(expected\)/i.test(x.title)||x.st==='upcoming')continue;const g=grp(x);if(!byG.has(g))byG.set(g,[]);byG.get(g).push(x)}
const SAMPLE=new Map();for(const [g,a] of byG){const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(R7()*(i+1));[b[i],b[j]]=[b[j],b[i]]}SAMPLE.set(g,b.slice(0,QUICK?10:30))}
const OUT={bars:[]};const bar=(id,metric,value,ok,detail)=>{OUT.bars.push({id,metric,value,pass:!!ok,...(detail?{detail}:{})});console.log((ok?'PASS':'FAIL').padEnd(5),id.padEnd(34),String(value).padEnd(22),metric)};
const t0=Date.now();
/* ---------- 1. school swap, blank school, blank GPA, standout, safety, novice, tag, grammar ---------- */
let ibcSub=0,big=0,swPairs=0,ibcN=0,ibcLetter=0,blankHi=0,blankN=0,gpaN=0,gpaBad=0,safety=0,graded=0,tagN=0,tagBad=0,novA=0,novN=0,projN=0,projBad=0;
const dT={},gram={ifYou:0,coreFor:0,dupLoc:0,unsourcedPct:0},gramEx=[];const MAPK={realistic:'target',safety:'safety',target:'target',reach:'reach',long:'reach',longshot:'reach'};
for(const id of IDS){const pr=PR[id],f=pr._meta.field;const PS=Object.fromEntries(Object.entries(SW).map(([t,s])=>[t,MC.profile({...pr,school:s})]));
 const P0=MC.profile(pr),Pg=MC.profile({...pr,gpa:'3.0'}),Pb=MC.profile({...pr,gpa:''});const projOnly=(pr.experience||[]).length&&(pr.experience||[]).every(e=>e.kind==='Project');
 for(const g of IN[f])for(const x of SAMPLE.get(g)||[]){
  const r={};for(const t in PS)r[t]=MC.score(x,PS[t],C,W);if(Object.values(r).some(v=>v.pct==null))continue;swPairs++;
  const gn=Object.values(r).map(v=>gnum(v.grade));if(Math.max(...gn)-Math.min(...gn)>1+1e-9)big++;
  const gk=['ib','pe','consulting'].includes(g)?g:'other';dT[gk]=dT[gk]||{n:0,ivy:0,flag:0};dT[gk].n++;dT[gk].ivy+=r.ivy.pct-r.flagship_unlisted.pct;dT[gk].flag+=r.flagship_target.pct-r.flagship_unlisted.pct;
  if(['ib','consulting'].includes(g)){ibcN++;if(new Set(Object.values(r).map(v=>v.grade[0])).size>1)ibcLetter++;if(new Set(Object.values(r).map(v=>v.grade)).size>1)ibcSub++}
  blankN+=2;if(r.missing.pct>r.flagship_unlisted.pct)blankHi++;if(r.missing.pct>r.unranked.pct)blankHi++;
  const a=MC.score(x,Pb,C,W).pct,b=MC.score(x,Pg,C,W).pct;if(a!=null&&b!=null){gpaN++;if(a>b)gpaBad++}
  const s=MC.score(x,P0,C,W);if(s.pct==null)continue;graded++;const fb=s.feedback||{};
  if(s.tag&&s.tag.k==='safety'&&fb.tier&&fb.tier.known===false)safety++;
  if(s.tag&&s.v143&&s.v143.tag){tagN++;if((s.tag.t143||MAPK[s.tag.k])!==s.v143.tag)tagBad++}
  if(pr._meta.archetype==='freshman_novice'){novN++;if(s.grade[0]==='A')novA++}
  if(projOnly){const e=(fb.breakdown||[]).find(b=>b.k==='Experience');if(e){projN++;if(e.v>65)projBad++}}
  const v=fb.verdict||{};const all=[v.t,v.why,...(fb.actions||[]),...(fb.strengths||[]),...(fb.gaps||[]),...(fb.breakdown||[]).flatMap(b=>[b.t,b.s]),fb.tag&&fb.tag.why].filter(Boolean);const txt=all.join(' || ');
  if(/if you it's/i.test(txt)){gram.ifYou++;gramEx.push(txt.match(/[^|]*if you it's[^|]*/i)[0])}if(/, core for/.test(txt)){gram.coreFor++;gramEx.push(txt.match(/[^|]*, core for[^|]*/)[0])}
  const locS=all.filter(t=>/relocat|outside your (chosen|picked)|not a location you picked/i.test(t)).map(t=>t.trim());if(locS.length>1){gram.dupLoc++;gramEx.push(locS.join(' // '))}
  for(const m of txt.match(/[^.|]*\d+(\.\d+)?\s?%[^.|]*/g)||[])if(!(fb.tier&&fb.tier.src)&&!/\bmatch\b/i.test(m)){gram.unsourcedPct++;gramEx.push(m.trim())}}}
const dTr=Object.fromEntries(Object.entries(dT).map(([k,v])=>[k,{pairs:v.n,meanTargetMinusUnlisted:Math.round(10*Math.max(v.ivy,v.flag)/v.n)/10}]));OUT.schoolSwap=dTr;
bar('school_swap.moves_gt_1_letter','pairs (0)',`${big} / ${swPairs}`,big===0);
const capOK=['ib','pe','consulting'].every(k=>!dTr[k]||dTr[k].meanTargetMinusUnlisted<=4.0);bar('school_swap.mean_ib_pe_consulting','≤ 4.0 pts',['ib','pe','consulting'].map(k=>k+' '+(dTr[k]?dTr[k].meanTargetMinusUnlisted:'n/a')).join(', '),capOK);
bar('school_swap.mean_elsewhere','0.0 pts',dTr.other?dTr.other.meanTargetMinusUnlisted:'n/a',!dTr.other||Math.abs(dTr.other.meanTargetMinusUnlisted)<0.05);
bar('school_swap.letter_changes_ib_consulting','≤ 25% (full letter)',pc(ibcLetter,ibcN)+'% (any +/- step: '+pc(ibcSub,ibcN)+'%)',pc(ibcLetter,ibcN)<=25);
bar('blank_school_above_unlisted','0 pairs',`${blankHi} / ${blankN}`,blankHi===0);
bar('blank_gpa_le_gpa_3_0','100% of pairs',pc(gpaN-gpaBad,gpaN)+'%',gpaBad===0);
bar('estimated_tier_safety_tags','0',safety,safety===0);
bar('novice_A_share','≤ 5%',pc(novA,novN)+'% of '+novN,pc(novA,novN)<=5);
bar('project_only_experience','≤ 65 (0 over)',`${projBad} over / ${projN}`,projBad===0);
bar('tag_consistency','100%',pc(tagN-tagBad,tagN)+'%',tagBad===0);
bar('grammar','0 matches',JSON.stringify(gram),Object.values(gram).every(v=>v===0),gramEx.slice(0,6));
/* ---------- tier-1 standout: zero grade difference from school outside ib/pe/consulting ---------- */
let t1N=0,t1Diff=0;const t1=ROWS.filter(x=>{const t=MC.tierOf(x,C,50);return t&&t.t===1&&!/\(expected\)/i.test(x.title)&&!['ib','pe','consulting'].includes(grp(x))});
for(const id of IDS.filter((_,i)=>i%2===0)){const pr=PR[id];const Ps=['Harvard University','Ohio State University','Queens University of Charlotte',''].map(s=>MC.profile({...pr,school:s}));
 for(const x of t1.filter(x=>IN[pr._meta.field].includes(grp(x))).slice(0,25)){const g=Ps.map(P=>MC.score(x,P,C,W).grade);if(g.includes('—'))continue;t1N++;if(new Set(g).size>1)t1Diff++}}
bar('tier1_standout_school_effect','0 grade diffs',`${t1Diff} / ${t1N}`,t1Diff===0);
/* ---------- resume parse: school-missing resumes keep GPA + major, drift ≤ 3 ---------- */
const GY={Freshman:2030,Sophomore:2029,Junior:2028,Senior:2027};const mo=s=>{if(!s||s==='Present')return'Present';const [y,m]=s.split('-');return['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]+' '+y};
function render(p,o={}){const b=o.bullet||'•',L=[p.name,'test.person@example.com | (555) 010-0000 | Charlotte, NC','','EDUCATION'];if(p.school&&!o.noSchool)L.push(p.school);
 if(p.major||p.gpa)L.push(`${p.major?'Bachelor of Science in '+p.major:'Bachelor of Arts'}, Expected May ${GY[p.classYear]||2028}`+(p.gpa?` | GPA: ${p.gpa}/4.0`:''));
 L.push('','EXPERIENCE');for(const e of p.experience||[]){L.push(`${e.title}${e.org?', '+e.org:''}${o.sep||'    '}${mo(e.start)} – ${mo(e.end)}`);for(const x of e.bullets||[])L.push(b+' '+x)}
 L.push('','SKILLS','Technical: '+(p.skills||[]).join(', '));return L.join(o.crlf?'\r\n':'\n')}
function fromResume(txt){const Rs=RC.parse(RX.fromText(txt),{colleges:COL,today:TODAY});const e=Rs.education[0]||{};return{savedAt:1,school:e.school||'',major:(e.majors||[])[0]||'',gpa:e.gpa&&(e.gpaScale||'4.0')==='4.0'?e.gpa:'',classYear:e.classYear||'',skills:(Rs.skills.hard||[]).map(s=>s.name),industries:[],interests:[],locations:[],sponsorship:'',experience:(Rs.experience||[]).map(x=>({kind:x.kind||x.type,title:x.title,org:x.org,start:x.start,end:x.end,bullets:x.bullets||[]}))}}
const RS=ROWS.filter((x,i)=>i%60===0&&!/\(expected\)/i.test(x.title));let keepG=0,keepGN=0,keepM=0,keepMN=0;const drift=[];
for(const id of IDS.filter((_,i)=>i%3===0)){const p=PR[id];if(!p.school)continue;const q=fromResume(render(p,{noSchool:true}));
 if(p.gpa){keepGN++;if(+q.gpa===+p.gpa)keepG++}if(p.major){keepMN++;if(q.major&&q.major.toLowerCase()===p.major.toLowerCase())keepM++}
 const qs=fromResume(render(p));const Pa=MC.profile({...qs,school:''}),Pb=MC.profile(q);const d=[];for(const x of RS){const a=MC.score(x,Pa,C,W).pct,b=MC.score(x,Pb,C,W).pct;if(a!=null&&b!=null)d.push(Math.abs(b-a))}drift.push(mean(d)||0)}
bar('resume_no_school_keeps_gpa_major','100% kept',`GPA ${pc(keepG,keepGN)}%, major ${pc(keepM,keepMN)}%`,keepG===keepGN&&keepM===keepMN);
bar('resume_parse_drift','≤ 3 pts mean',mean(drift),mean(drift)<=3);
/* ---------- stability ---------- */
let stabN=0,stabBad=0;const stabEx=[];
for(const id of IDS.filter((_,i)=>i%4===0)){const p=PR[id];const xs=RS.slice(0,40);const A=MC.profile(p),B=MC.profile(JSON.parse(JSON.stringify(p))),Nm=MC.profile({...p,name:'Someone Else Entirely'});
 const r1=fromResume(render(p)),r2=fromResume(render(p,{bullet:'-',sep:' | ',crlf:true}));const RA=MC.profile(r1),RB=MC.profile(r2);
 for(const x of xs){const s=[MC.score(x,A,C,W),MC.score(x,B,C,W),MC.score(x,A,C,W),MC.score(x,Nm,C,W)];const t=[MC.score(x,RA,C,W),MC.score(x,RB,C,W)];stabN++;
  const k=s.map(r=>r.pct+r.grade+(r.tag&&r.tag.k));const kr=t.map(r=>r.pct+r.grade);if(new Set(k).size>1||kr[0]!==kr[1]){stabBad++;if(stabEx.length<5)stabEx.push({id,listing:x.id,k,kr})}}}
bar('stability_identical_and_irrelevant','0 changes',`${stabBad} / ${stabN}`,stabBad===0,stabEx);
/* ---------- match / ranking (rank143 top 10 + app sort via rankKey) ---------- */
const cityLL=s=>{const m=/^(.+?),\s*([A-Z]{2})$/.exec(s.trim());return m?USC[m[1].toLowerCase()+'|'+m[2]]:null};
const mi=(a,b)=>{const r=Math.PI/180,dl=(b[0]-a[0])*r,dg=(b[1]-a[1])*r,h=Math.sin(dl/2)**2+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dg/2)**2;return 7917.6*Math.asin(Math.sqrt(h))};
function inPref(x,pr){const fx=FULL.get(x.id)||x;const want=pr.locations||[];if(!want.length)return null;const remoteOK=pr.remoteOK||want.includes('remote');if(fx.remote&&remoteOK)return true;
 const locs=fx.locations||[];for(const w of want){if(w.startsWith('state:')){if(locs.some(l=>(l.state||'').toLowerCase()===w.slice(6)))return true;continue}const c=cityLL(w);if(!c)continue;
  for(const l of locs){const ll=l.lat!=null?[l.lat,l.lng]:USC[(l.city||'').toLowerCase()+'|'+l.state];if(ll&&mi(c,ll)<=50)return true}}return false}
const ST=new Set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY PR'.split(' '));
const nonUS=x=>{const fx=FULL.get(x.id)||x;const l=fx.locations||[];return x.country!=null||(l.length>0&&!fx.remote&&l.every(z=>!ST.has(z.state)))};
const cyOK=(x,cy)=>{const c=x.class_years;if(!c||!c.length)return true;const m=/Community college/.test(cy)?'Sophomore':/Graduate/.test(cy)?'Graduate':cy;return c.includes(cy)||c.includes(m)};
const isOpen=x=>x.st!=='upcoming'&&x.st!=='closed'&&!/\(expected\)/i.test(x.title)&&!(x.posted&&days(x.posted)<-120);
const M={n:0,top:{rel:0,elig:0,open:0,ph:0,link:0,direct:0,all4:0,nonUS:0,uniq:[]},app:{rel:0,elig:0,open:0,ph:0,link:0,nonUS:0,uniq:[]},prefN:0,prefIn:0,prefProfiles:0,tgtQ:[],neutral:{n:0,bad:0,ex:[]}};
for(const id of IDS){const pr=PR[id],f=pr._meta.field;const P=MC.profile(pr);const items=ROWS.map(x=>({x,r:MC.score(x,P,C,W)}));const {top}=MC.rank143(items,10);
 const app=items.filter(i=>i.r.pct!=null).sort((a,b)=>MC.rankKey(b)-MC.rankKey(a)||b.r.pct-a.r.pct).slice(0,10);
 for(const [k,L] of [['top',top],['app',app]]){const A=M[k];const cos=new Set();for(const i of L){const x=i.x,fx=FULL.get(x.id)||{};const rel=FG[f].includes(grp(x)),el=cyOK(x,pr.classYear),op=isOpen(x),ln=fx.apply_kind==='direct'||fx.apply_kind==='posting';
   A.rel+=rel;A.elig+=el;A.open+=op;A.ph+=(x.st==='upcoming'||/\(expected\)/i.test(x.title));A.link+=ln;A.nonUS+=nonUS(x);cos.add(x.company);if(k==='top'){A.direct+=fx.apply_kind==='direct';A.all4+=rel&&el&&op&&ln}}A.uniq.push(cos.size)}
 M.n+=top.length;
 if((pr.locations||[]).length){M.prefProfiles++;for(const i of top){M.prefN++;if(inPref(i.x,pr))M.prefIn++}
  const pool=items.filter(i=>MC.rankable(i)&&FG[f].includes(grp(i.x))&&inPref(i.x,{...pr,remoteOK:false,locations:pr.locations.filter(w=>w!=='remote')}));
  if(pr.locations.some(w=>w!=='remote')&&pool.length>=30)M.tgtQ.push(top.filter(i=>inPref(i.x,{...pr,remoteOK:false,locations:pr.locations.filter(w=>w!=='remote')})).length/Math.max(1,top.length))}
 else{/* neutral = no preference boost or penalty: loc kind 'none', no rank-key location bonus, no location wording in Fit.
   (Market competitiveness estimated from metro size is company difficulty, not a preference, and is allowed to vary.) */
  const xs=items.filter(i=>i.r.pct!=null).slice(0,60);for(const i of xs){M.neutral.n++;const k=(i.r.loc||{}).k;const bonus=MC.rankKey(i)-i.r.pct;const fit=((i.r.feedback||{}).breakdown||[]).find(b=>b.k==='Fit');
   if((k&&k!=='none')||![0,-100,-200,-300,-500,-600,-700,-800].some(v=>Math.abs(bonus-v)<1e-9)||(fit&&/location|relocat/i.test(fit.t+' '+fit.s))){M.neutral.bad++;if(M.neutral.ex.length<4)M.neutral.ex.push({id,listing:i.x.id,k,bonus,fit:fit&&fit.t})}}}}
const T=M.top,n=M.n||1;
bar('match.eligible','≥ 98%',pc(T.elig,n)+'%',pc(T.elig,n)>=98);bar('match.relevant','≥ 90%',pc(T.rel,n)+'%',pc(T.rel,n)>=90);
bar('match.placeholders','0%',pc(T.ph,n)+'%',T.ph===0);bar('match.open','≥ 95%',pc(T.open,n)+'%',pc(T.open,n)>=95);
bar('match.unique_companies','≥ 8 (mean)',mean(T.uniq),mean(T.uniq)>=8,{min:Math.min(...T.uniq)});
bar('match.non_us','0',T.nonUS+M.app.nonUS,T.nonUS+M.app.nonUS===0);
bar('match.pref_locations_or_remote','≥ 80% (prefs set)',pc(M.prefIn,M.prefN)+'% of '+M.prefProfiles+' profiles',pc(M.prefIn,M.prefN)>=80);
const tq=M.tgtQ.length?Math.round(1000*M.tgtQ.reduce((a,b)=>a+b,0)/M.tgtQ.length)/10:null;bar('match.target_in_chosen_locations','≥ 35% (≥30 eligible there)',tq+'% mean, '+M.tgtQ.filter(v=>v<0.35).length+' profiles under',tq>=35,{profiles:M.tgtQ.length});
bar('match.no_prefs_location_neutral','0 boosts/penalties',`${M.neutral.bad} / ${M.neutral.n}`,M.neutral.bad===0,M.neutral.ex);
bar('recommend.169_all_four','≥ 95% relevant+eligible+open+apply link',pc(T.all4,n)+'% ('+IDS.length+' profiles)',pc(T.all4,n)>=95,{relevant:pc(T.rel,n),eligible:pc(T.elig,n),open:pc(T.open,n),applyLink:pc(T.link,n),directApplyOnly:pc(T.direct,n)});
OUT.appSort={relevant:pc(M.app.rel,n),eligible:pc(M.app.elig,n),open:pc(M.app.open,n),placeholders:pc(M.app.ph,n),uniqueCompaniesMean:mean(M.app.uniq)};
/* ---------- gold set ---------- */
const GOLD=JSON.parse(fs.readFileSync(path.join(__dirname,'v15_gold.json')));let gIn=0,g2=0;const gOut=[];
for(const c of GOLD.pairs){const x=ROWS.find(z=>z.id===String(c.listing))||(()=>{const f=FULL.get(String(c.listing));if(!f)return null;const y={...f,id:String(f.id),first_seen:f.first_seen,industry:f.category};y.st=statusOf(y);return y})();
 if(!x){gOut.push({id:c.id,missing:true});continue}const r=MC.score(x,MC.profile(c.profile),C,W);const g=r.grade,lo=L2N[c.band[1]],hi=L2N[c.band[0]],v=g&&g!=='—'?L2N[g[0]]:null;
 const ok=v!=null&&v>=lo-1e-9&&v<=hi+1e-9;const off=v==null?9:v<lo?lo-v:v>hi?v-hi:0;if(ok)gIn++;if(off>=2-1e-9)g2++;gOut.push({id:c.id,expected:c.band.join('–'),got:g+' '+r.pct,inBand:ok,off:Math.round(off*100)/100})}
OUT.gold=gOut;bar('gold.in_band','≥ 90%',pc(gIn,GOLD.pairs.length)+'% of '+GOLD.pairs.length,pc(gIn,GOLD.pairs.length)>=90);bar('gold.off_by_2plus_letters','0',g2,g2===0);
/* ---------- persona grader floor (tests/grader/run.js) ---------- */
if(!QUICK){const tmp=path.join(require('os').tmpdir(),'v15_run.json');try{cp.execFileSync('node',[path.join(__dirname,'run.js'),'--json',tmp],{stdio:'ignore'})}catch(_){}
 try{const j=JSON.parse(fs.readFileSync(tmp));const acc=j.res.accuracy;const out=(j.out||[]).map(o=>o.persona);const gr=j.rows.filter(r=>r.got&&r.got!=='—');const ash=pc(gr.filter(r=>r.got[0]==='A').length,gr.length);
  bar('persona_grader_in_band','≥ 93.0%',acc+'%',acc>=93);bar('persona_g34_g39_fixed','both in band',out.filter(o=>/g34|g39/.test(o)).join(',')||'both fixed',!out.some(o=>/g34|g39/.test(o)));bar('persona_A_share','≤ 15%',ash+'%',ash<=15)}catch(e){bar('persona_grader_in_band','≥ 93.0%','could not read run.js output: '+e.message,false)}}
OUT.seconds=Math.round((Date.now()-t0)/1000);const fails=OUT.bars.filter(b=>!b.pass);console.log(`\n${OUT.bars.length-fails.length}/${OUT.bars.length} bars pass in ${OUT.seconds}s`);
const j=process.argv.indexOf('--json');if(j>0)fs.writeFileSync(process.argv[j+1],JSON.stringify(OUT,null,1));process.exit(fails.length?1:0);
