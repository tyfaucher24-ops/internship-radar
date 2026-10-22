/* V6 match core: one match % (0-100) + letter grade per internship. Pure functions, no DOM: used by the page (drawer reasons)
   and by match-worker.js (bulk rescoring). Weights live in match-weights.json; firm tiers / target schools / GPA bars / keywords in config.json.
   Unknown inputs are left out (never guessed) and lower the confidence. */
(function(G){
const MC={};
const dayN=s=>Math.round((Date.parse(String(s).slice(0,10)+'T00:00:00')-Date.parse(new Date().toISOString().slice(0,10)+'T00:00:00'))/864e5);
const norm=s=>(s||'').toLowerCase().replace(/[^a-z0-9&+# ]/g,' ').replace(/\s+/g,' ').trim();
const TSTOP=new Set('intern internship interns summer fall spring winter 2026 2027 2028 and the of for in to a with program analyst co op coop student students university new grad early career careers'.split(' '));
MC.grade=(p,W)=>{for(const [m,g] of (W.grades||[]))if(p>=m)return g;return'F'};
MC.band=p=>p>=90?'g5':p>=75?'g4':p>=60?'g3':p>=45?'g2':p>=30?'g1':'g0';
function avgW(parts,w){let s=0,t=0,n=0;for(const [k,v] of parts){if(v==null)continue;const ww=+w[k]||0;s+=v*ww;t+=ww;n++}return t?{v:s/t,n}:{v:null,n:0}}
function firmRow(C,co){const n=norm(co);return (C.firmTiers||[]).filter(f=>!f.placeholder).find(f=>{const k=norm(f.firm);return [f.firm,...(f.aliases||[])].map(norm).some(k=>k&&(n===k||n.startsWith(k+' ')||k.startsWith(n+' ')))})}
// competition: 0 = few applicants expected, 100 = very crowded. Real inputs only.
function competition(x,firm){const parts=[],why=[],easy=[];
 const sz=x.size||'';if(/^Small|1[–-]200/i.test(sz)){parts.push(20);easy.push('a small firm')}else if(/^Mid/i.test(sz))parts.push(50);else if(/^Large|5,?000\+/i.test(sz)){parts.push(80);why.push('a large, well-known employer')}
 if(firm&&firm.tier){const t=+firm.tier;parts.push(t<=1?95:t===2?75:55);if(t<=1)why.push('a top-tier brand')}
 const mp=x.metro_pop||Math.max(0,...(x.locations||[]).map(l=>l.pop||0));
 if(x.remote){parts.push(85);why.push('remote (national applicant pool)')}else if(mp){const c=mp>=1e6?70:mp>=3e5?55:mp>=1e5?40:25;parts.push(c);if(c<=40)easy.push(mp>=1e5?'a mid-size city':'a small town')}
 const fs=x.posted||x.fs||(x.first_seen||'').slice(0,10);if(fs){const d=-dayN(fs);parts.push(d<=3?70:d<=14?55:d<=45?45:35);if(d>45)easy.push(`open ${d} days`)}
 const cy=x.class_years||[];if(cy.length){const under=cy.includes('Freshman')||cy.includes('Sophomore');parts.push(under?35:cy.length>=3?50:60);if(under)easy.push(cy.includes('Freshman')?'open to freshmen':'open to sophomores')}
 if(x.gpa_min!=null&&x.gpa_min!==''&&+x.gpa_min>=3.5){parts.push(75);why.push(`a ${x.gpa_min}+ GPA bar`)}
 const op=parseInt(x.openings)||0;if(op>=5){parts.push(30);easy.push(`${op} openings`)}else if(op>=2)parts.push(45);
 return {score:parts.length>=2?Math.round(parts.reduce((a,b)=>a+b,0)/parts.length):null,easy,why}}
MC.competition=competition;
// V9 role groups (config.json roleGroups): the title decides the group; the listing's category is only a fallback.
const RGC=new WeakMap();function rgs(C){let r=RGC.get(C);if(!r){r=(C.roleGroups||[]).map(g=>({...g,rx:new RegExp(g.re,'i')}));RGC.set(C,r)}return r}
function groupOf(x,C){const t=x.title||'';for(const g of rgs(C))if(g.rx.test(t))return g.g;const ig=(C.industryGroups||{})[x.industry||x.category];return ig?ig[0]:null}
MC.groupOf=groupOf;MC.groupLabel=(g,C)=>((C.roleGroups||[]).find(r=>r.g===g)||{}).label||g;
function groupsFromText(t,C){const out=new Set();for(const g of rgs(C))if(g.rx.test(t))out.add(g.g);return out}
// P = normalized profile (see MC.profile)
MC.score=function(x,P,C,W){const title=norm(x.title),ind=x.industry||x.category||'',text=x._t||norm(x.title+' '+x.company);
 const kws=[...new Set([...(String((C.industryKeywords||{})[ind]||'')).split(',').map(s=>norm(s)).filter(Boolean),...title.split(' ').filter(w=>w.length>2&&!TSTOP.has(w))])];
 const pos=[],neg=[];let unknown=0,ineligible=null;
 // ---- Fit ----
 const majInd=Object.entries(C.majorIndustries||{}).filter(([m])=>P.majorN&&P.majorN.includes(m)).map(([,v])=>v);
 let fInt=null;if(P.industries.length||majInd.length){fInt=P.industries.includes(ind)?100:majInd.includes(ind)?80:20;if(P.industries.includes(ind))pos.push(`it's in ${ind}, one of your interests`)}else unknown++;
 let fMaj=null;if(P.majorN){fMaj=majInd.includes(ind)||kws.some(k=>k.length>3&&P.majorN.includes(k))?100:35;if(fMaj===100&&!P.industries.includes(ind))pos.push(`it fits your ${P.major} major`)}else unknown++;
 const sk=P.skills.filter(s=>kws.some(k=>k===s||(s.length>3&&(k.includes(s)||s.includes(k))))||(s.length>3&&title.includes(s)));
 let fSk=25;if(P.skills.length){fSk=Math.min(100,25+sk.length*25);if(sk.length)pos.push(`your ${sk.slice(0,3).join(', ')} skill${sk.length>1?'s':''} match${sk.length>1?'':'es'} the role`)}else{unknown++;neg.push('you haven\u2019t listed any skills yet')}/* V9: no skills listed counts as a gap, not as unknown */
 const gx=groupOf(x,C);P._g=P._g||profileGroups(P,C);
 const rel=P.exp.filter(e=>(gx&&e.g&&e.g.has(gx))||kws.filter(k=>k.length>3&&e.n.includes(k)).length>=2||title.split(' ').some(w=>w.length>4&&!TSTOP.has(w)&&e.n.includes(w)));
 let fRole=null;if(gx&&(P._g.all.size||P._g.exp.size)){const adj=new Set(((C.roleGroups||[]).find(r=>r.g===gx)||{}).adj||[]);const adjE=[...P._g.exp].some(g=>adj.has(g)),inM=P._g.maj.has(gx),inI=P._g.ind.has(gx),inE=P._g.exp.has(gx);
  // the major outranks a past job's title (a marketing major with a retail sales job gets marketing roles first)
  fRole=inM&&inE?100:inM?(adjE?97:95):inI&&inE?88:inI?82:inE?78:([...P._g.all].some(g=>adj.has(g))||adjE)?50:15;
  if(fRole>=78){const gl=MC.groupLabel(gx,C).toLowerCase();pos.push(inE?`you've done this kind of work before (${gl})`:inM?`it's ${gl}, which fits your ${P.major} major`:adjE?`it's ${gl}, close to work you've done`:`it's ${gl}, which fits your interests`)}else if(fRole<=15)neg.push(`it's a ${MC.groupLabel(gx,C).toLowerCase()} role, which doesn't match your major or experience`)}
 const coN=norm(x.company);const pastEmp=coN&&P.employers.some(e=>e===coN||e.startsWith(coN+' ')||coN.startsWith(e+' '));if(pastEmp)pos.unshift(`you've worked at ${x.company} before, and past employees often get a closer look`);
 const firm=firmRow(C,x.company),comp=competition(x,firm);
 // no experience: entry-level, low-competition roles don't expect any, so the gap counts less as competition falls (match-weights.json noExperience)
 const NE=W.noExperience||{},neV=comp.score==null?(NE.base??50):Math.round((NE.base??50)+((NE.max??50)-(NE.base??50))*Math.max(0,((NE.reliefBelow??50)-comp.score)/(NE.reliefBelow??50)));
 const fExp=P.exp.length?Math.min(100,50+rel.length*30):neV;if(rel.length)pos.push(`you've done related work (${rel[0].title.length>50?rel[0].title.slice(0,50).replace(/\s+\S*$/,'')+'…':rel[0].title.trim()})`);
 const fit=avgW([['role',fRole],['interest',fInt],['major',fMaj],['skills',fSk],['experience',fExp]],W.fitParts||{});
 // ---- Odds ----
 const OC=W.oddsCurve||{exponent:1.3,lowBelow:40,lowBonus:25};
 // a strong candidate (high GPA, related experience) feels a crowded applicant pool less: competition is discounted by profile strength
 const strength=Math.min(1,(P.gpa?Math.max(0,(P.gpa-3.3)/0.6):0)*0.5+Math.min(1,rel.length/2)*0.5);
 const cEff=(comp.score==null?(OC.unknownAs??55):comp.score)*(1-(OC.strengthRelief||0)*strength);
 const cOdds=Math.min(100,Math.round(100*Math.pow(1-cEff/100,OC.exponent)+(cEff<OC.lowBelow?OC.lowBonus:0)));
 let oYear=null;const cy=x.class_years||[];if(cy.length&&P.classYear){const EQ={'Graduate / Master’s':['Graduate'],'PhD':['Graduate','PhD'],'Community college (1st year)':['Freshman'],'Community college (2nd year)':['Sophomore'],'Recent grad':['Recent grad','Graduate']},mine=EQ[P.classYear]||[P.classYear];if(mine.some(v=>cy.includes(v)))oYear=95;else ineligible=`it lists ${cy.join('/')} students and you're a ${P.classYear}`}else unknown++;
 const bar=x.gpa_min!=null&&x.gpa_min!==''?+x.gpa_min:(firm&&firm.gpaBar?+firm.gpaBar:null);let oGpa=null;
 if(bar&&P.gpa){oGpa=P.gpa>=bar?90:P.gpa>=bar-0.2?50:15;if(P.gpa<bar)neg.push(`your GPA is under its ${bar} bar`)}
 const tl=(C.targetSchools||[]).find(r=>!r.placeholder&&r.industry===ind);let oSch=null;
 if(tl&&P.schoolN){const ts=tl.schools.split(/[;\n]/).map(norm).filter(Boolean);oSch=ts.some(s=>P.schoolN.includes(s)||s.includes(P.schoolN))?85:45}
 const eliteOrg=P.exp.map(e=>firmRow(C,e.org||'')).find(f=>f&&+f.tier<=1);const finG=['ib','pe','sandt','finance','quant'];
 const oExp=P.exp.length?Math.min(95,55+rel.length*20+(eliteOrg&&finG.includes(gx)?25:0)):neV;if(eliteOrg&&finG.includes(gx))pos.unshift(`your ${eliteOrg.firm} internship is one of the strongest signals in finance recruiting`);
 const odds=avgW([['competition',cOdds],['classYear',oYear],['gpa',oGpa],['school',oSch],['experience',oExp],['employer',pastEmp?95:null]],W.oddsParts||{});
 if(comp.score!=null&&comp.score<40&&comp.easy.length)pos.push(`competition looks low (${comp.easy.slice(0,2).join(', ')})`);else if(comp.score!=null&&comp.score>=65)neg.push(`competition is high${comp.why.length?' ('+comp.why[0]+')':''}`);
 // ---- Preferences ----
 let pLoc=null;const ST=P.states||[];if(P.locs.length||ST.length||P.remoteOK){const tt=' '+text+' ';const hL=P.locs.find(l=>text.includes(l))||ST.find(c=>tt.includes(' '+c+' '));const hit=!!hL;pLoc=hit?100:(x.remote&&P.remoteOK)?100:P.relocate?60:20;if(hit){const l0=(x.locations||[])[0];pos.push(`it's in ${l0&&l0.city?l0.city+(l0.state?', '+l0.state:''):String(hL).toUpperCase()}, a location you picked`)}}
 const pRem=x.remote==null||!P.remoteOK?null:(x.remote?100:70);
 const pYear=oYear==null?null:100;const pPaid=x.paid===true?100:null;
 const prefs=avgW([['location',pLoc],['remote',pRem],['classYear',pYear],['paid',pPaid]],W.prefParts||{});
 // ---- Hard filters ----
 if(P.sponsor===true&&(x.sponsorship==='Not offered'||x.citizenship===true))ineligible=ineligible||(x.citizenship===true?'it requires US citizenship and you need sponsorship':'it doesn\u2019t sponsor visas and you need sponsorship');
 // ---- Combine (missing parts are left out and their weight re-spread) ----
 const parts=[[fit.v,W.fit],[odds.v,W.odds],[prefs.v,W.prefs]].filter(p=>p[0]!=null);const tw=parts.reduce((a,p)=>a+p[1],0)||1;
 let pct=parts.reduce((a,p)=>a+p[0]*p[1],0)/tw;
 const B=W.lowCompetitionBoost||{};if(comp.score!=null&&comp.score<(B.below||35))pct+=(100-pct)*((B.below-comp.score)/B.below)*(B.strength||.5);
 // strictness curve: pct^k pulls every score down and the top hardest in absolute terms, so A grades are rare (match-weights.json strictness)
 if(W.strictness&&W.strictness!==1)pct=100*Math.pow(Math.max(0,pct)/100,W.strictness);
 // elite firms (sub-1% acceptance, cited in config.json): a weak profile can't grade above D/C-
 const EF=W.eliteFirm;let elite=null;if(EF&&firm&&+firm.tier<=EF.maxTier){if(!rel.length){pct=Math.min(pct,EF.noRelatedExpCap);elite=`${firm.firm} accepts under 1% of intern applicants, and you have no related experience yet`}else if(!P.gpa||P.gpa<(+firm.gpaBar||0)){pct=Math.min(pct,EF.belowGpaBarCap);elite=`${firm.firm} accepts under 1% of intern applicants${P.gpa?`; your GPA is under the ${firm.gpaBar} most applicants have`:'; add your GPA'}`}}
 if(ineligible)pct=Math.min(pct,W.ineligibleCap||40);
 pct=Math.max(0,Math.min(100,Math.round(pct)));
 const known=fit.n+odds.n+prefs.n,conf=known>=9?'high':known>=6?'medium':'low';
 const reasons=ineligible?[`Not eligible: ${ineligible}`]:elite?[elite,...pos.slice(0,2)]:[...pos.slice(0,3),...neg.slice(0,1)].slice(0,3);
 let tip=null;if(!ineligible&&pct<60){tip=!P.skills.length?'Add your skills (or upload a resume) to sharpen this score.':!P.exp.length?'Add any experience: part-time jobs, clubs and projects all count.':sk.length===0&&kws.length?`Roles like this ask for ${kws.slice(0,3).join(', ')}; add them if you have them.`:(comp.score!=null&&comp.score>=65?`${x.company} gets many applicants for ${MC.groupLabel(gx,C)||'roles like this'}; similar roles at smaller firms in your list grade higher for you.`:null)}
 // V9: not enough info -> no score (never a misleading number)
 const GR=W.grader||{};const pParts=[P.majorN,P.industries.length,P.skills.length,P.exp.length].filter(Boolean).length;const need=[];
 if(!P.majorN)need.push('your major');if(!P.industries.length)need.push('the fields you\u2019re interested in');if(!P.skills.length)need.push('a few skills');if(!P.exp.length)need.push('any experience (jobs, clubs, projects)');
 const ungraded=pParts<(GR.minProfileParts??2)?'profile':(known<(GR.minKnown??5)?'listing':null);
 // honest feedback panel
 const V=GR.verdict||{strong:75,worth:55};const missSk=kws.filter(k=>k.length>3&&!P.skills.some(s=>s===k||k.includes(s)||s.includes(k))&&!/^(and|with|team|work|role)$/.test(k)).slice(0,3);
 const acts=[];if(ineligible)acts.push(cy.length?`Look for roles open to ${P.classYear||'your class year'}s; this one lists ${cy.join('/')} only.`:(x.citizenship===true?`${x.company} requires US citizenship for this role; filter to roles that match your work authorization.`:`${x.company} doesn't sponsor visas for this role; filter to roles that match your work authorization.`));
 else{if(missSk.length&&sk.length<2)acts.push(`Build or show these skills the role asks for: ${missSk.join(', ')}. A short course or a small project you can talk about counts.`);
  if(!rel.length)acts.push(gx?`Add one ${MC.groupLabel(gx,C).toLowerCase()} experience: a class project, club role or part-time job you can describe in 2 bullets.`:'Add one related experience, even a class project.');
  if(elite||(comp.score!=null&&comp.score>=65))acts.push(`Get a referral: message 2–3 alumni or recruiters at ${x.company} before applying. At crowded employers a referral matters more than another bullet.`);
  if(bar&&P.gpa&&P.gpa<bar)acts.push(`Lead with experience and projects; your GPA is under the ${bar} this employer screens for.`);
  if(!P.gpa&&(bar||elite))acts.push('Add your GPA. Firms with GPA screens can\u2019t be scored in your favor without it.');
  if(pLoc!=null&&pLoc<=20&&!P.relocate){const l0=(x.locations||[])[0];acts.push(`It's in ${l0&&l0.city?l0.city+(l0.state?', '+l0.state:''):'a city outside your picks'}, not a location you picked. Tick “open to relocating” if you'd move for it.`)}
  if(pct>=V.strong||!acts.length)acts.push(rel.length?`Apply, and put your ${rel[0].title.length>60?rel[0].title.slice(0,60).replace(/\s+\S*$/,'')+'…':rel[0].title.trim()} experience first on your resume; it's the closest match to “${x.title.slice(0,50)}”.`:sk.length?`Apply, and lead your resume with ${sk.slice(0,2).join(' and ')}, which “${x.title.slice(0,50)}” asks for.`:`Apply if “${x.title.slice(0,50)}” at ${x.company} interests you; nothing in your profile matches it closely yet.`)}
 const verdict=ineligible?{k:'no',t:'Not eligible',why:ineligible}:pct>=V.strong?{k:'strong',t:'Strong shot',why:pos[0]?pos[0]:`your profile lines up with ${x.title.slice(0,50)}`}:pct>=V.worth?{k:'worth',t:'Worth applying',why:`worth it if you ${acts[0]?acts[0].replace(/\.$/,'').replace(/^./,c=>c.toLowerCase()):'tailor your resume to it'}`}:{k:'long',t:'Long shot',why:neg[0]||elite||(fRole!=null&&fRole<=15?`${x.title.slice(0,50)} doesn't match your ${P.major||'major'} or experience`:`none of your skills${P.major?' or your '+P.major+' major':''} line up with ${x.title.slice(0,50)}`)};
 const feedback={strengths:pos.slice(0,3),gaps:[...(ineligible?[`not eligible: ${ineligible}`]:[]),...(elite?[elite]:[]),...neg].slice(0,3),actions:acts.slice(0,3),verdict};
 if(ungraded)return {pct:null,ungraded,need:ungraded==='profile'?need:['this listing has too little detail (no class year, size or location) to grade fairly'],grade:'—',band:'gna',reasons:['Not enough info to grade'],conf:'low',feedback,group:gx,fit:null,odds:null,prefs:null,comp:comp.score,ineligible:!!ineligible};
 return {pct,grade:MC.grade(pct,W),band:MC.band(pct),group:gx,feedback,pastEmployer:pastEmp,fit:Math.round(fit.v??0),odds:Math.round(odds.v??0),prefs:prefs.v==null?null:Math.round(prefs.v),comp:comp.score,reasons:reasons.length?reasons:['Little overlap with your profile yet'],tip,conf,ineligible:!!ineligible}};
MC.profile=function(pr){const sk=(pr.skills||[]).map(s=>norm(s)).filter(Boolean);
 return {school:pr.school||'',schoolN:norm(pr.school),major:pr.major||'',majorN:norm([pr.major,pr.minor].filter(Boolean).join(' ')),classYear:pr.classYear||'',gpa:parseFloat(pr.gpa)||null,
  sponsor:pr.sponsorship==='yes'?true:pr.sponsorship==='no'?false:null,industries:pr.industries||[],locs:(pr.locations||[]).filter(l=>!/^state:|^remote$/i.test(l)).map(l=>norm(String(l).split(',')[0])).filter(Boolean),states:(pr.locations||[]).filter(l=>/^state:/.test(l)).map(l=>l.slice(6).toLowerCase()),
  remoteOK:!!pr.remoteOK||(pr.locations||[]).some(l=>/^remote$/i.test(l)),relocate:!!pr.relocate,skills:[...new Set(sk)],exp:(pr.experience||[]).filter(e=>e&&(e.title||e.org)).map(e=>({title:[e.title,e.org].filter(Boolean).join(' at '),org:e.org||'',n:norm([e.title,e.org,...(e.bullets||[])].join(' '))})),employers:(pr.experience||[]).filter(e=>e&&e.org&&/job|intern/i.test(e.kind||'job')).map(e=>norm(e.org)).filter(s=>s.length>2)}};
function profileGroups(P,C){const all=new Set(),exp=new Set(),maj=new Set(),ind=new Set();for(const [m,gs] of Object.entries(C.majorGroups||{}))if(P.majorN&&new RegExp('\\b'+m+'\\b').test(P.majorN))gs.forEach(g=>{maj.add(g);all.add(g)});
 for(const i of P.industries)((C.industryGroups||{})[i]||[]).forEach(g=>{ind.add(g);all.add(g)});for(const e of P.exp){e.g=groupsFromText(e.title,C);e.g.forEach(g=>{exp.add(g);all.add(g)})}return{all,exp,maj,ind}}
MC.hasProfile=pr=>!!(pr&&pr.savedAt);
G.MatchCore=MC;
})(typeof self!=='undefined'?self:window);
