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
function firmRow(C,co){const n=norm(co);return (C.firmTiers||[]).filter(f=>!f.placeholder).find(f=>{const k=norm(f.firm);return k&&(n===k||n.startsWith(k+' ')||k.startsWith(n+' '))})}
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
// P = normalized profile (see MC.profile)
MC.score=function(x,P,C,W){const title=norm(x.title),ind=x.industry||x.category||'',text=x._t||norm(x.title+' '+x.company);
 const kws=[...new Set([...(String((C.industryKeywords||{})[ind]||'')).split(',').map(s=>norm(s)).filter(Boolean),...title.split(' ').filter(w=>w.length>2&&!TSTOP.has(w))])];
 const pos=[],neg=[];let unknown=0,ineligible=null;
 // ---- Fit ----
 const majInd=Object.entries(C.majorIndustries||{}).filter(([m])=>P.majorN&&P.majorN.includes(m)).map(([,v])=>v);
 let fInt=null;if(P.industries.length||majInd.length){fInt=P.industries.includes(ind)?100:majInd.includes(ind)?80:20;if(P.industries.includes(ind))pos.push(`it's in ${ind}, one of your interests`)}else unknown++;
 let fMaj=null;if(P.majorN){fMaj=majInd.includes(ind)||kws.some(k=>k.length>3&&P.majorN.includes(k))?100:35;if(fMaj===100&&!P.industries.includes(ind))pos.push(`it fits your ${P.major} major`)}else unknown++;
 const sk=P.skills.filter(s=>kws.some(k=>k===s||(s.length>3&&(k.includes(s)||s.includes(k))))||(s.length>3&&title.includes(s)));
 let fSk=null;if(P.skills.length){fSk=Math.min(100,25+sk.length*25);if(sk.length)pos.push(`your ${sk.slice(0,3).join(', ')} skill${sk.length>1?'s':''} match${sk.length>1?'':'es'} the role`)}else unknown++;
 const rel=P.exp.filter(e=>{const t=e.n;return kws.filter(k=>k.length>3&&t.includes(k)).length>=2||title.split(' ').some(w=>w.length>4&&!TSTOP.has(w)&&t.includes(w))});
 const fExp=P.exp.length?Math.min(100,50+rel.length*30):50;if(rel.length)pos.push(`you've done related work (${rel[0].title.slice(0,40)})`);
 const fit=avgW([['interest',fInt],['major',fMaj],['skills',fSk],['experience',fExp]],W.fitParts||{});
 // ---- Odds ----
 const firm=firmRow(C,x.company),comp=competition(x,firm);
 const cOdds=comp.score==null?null:Math.round(100*Math.pow(1-comp.score/100,1.3)+ (comp.score<40?25:0));
 let oYear=null;const cy=x.class_years||[];if(cy.length&&P.classYear){if(cy.includes(P.classYear))oYear=95;else ineligible=`it lists ${cy.join('/')} students and you're a ${P.classYear}`}else unknown++;
 const bar=x.gpa_min!=null&&x.gpa_min!==''?+x.gpa_min:(firm&&firm.gpaBar?+firm.gpaBar:null);let oGpa=null;
 if(bar&&P.gpa){oGpa=P.gpa>=bar?90:P.gpa>=bar-0.2?50:15;if(P.gpa<bar)neg.push(`your GPA is under its ${bar} bar`)}
 const tl=(C.targetSchools||[]).find(r=>!r.placeholder&&r.industry===ind);let oSch=null;
 if(tl&&P.schoolN){const ts=tl.schools.split(/[;\n]/).map(norm).filter(Boolean);oSch=ts.some(s=>P.schoolN.includes(s)||s.includes(P.schoolN))?85:45}
 const oExp=P.exp.length?Math.min(95,55+rel.length*20):50;
 const odds=avgW([['competition',cOdds],['classYear',oYear],['gpa',oGpa],['school',oSch],['experience',oExp]],W.oddsParts||{});
 if(comp.score!=null&&comp.score<40&&comp.easy.length)pos.push(`competition looks low (${comp.easy.slice(0,2).join(', ')})`);else if(comp.score!=null&&comp.score>=65)neg.push(`competition is high${comp.why.length?' ('+comp.why[0]+')':''}`);
 // ---- Preferences ----
 let pLoc=null;if(P.locs.length||P.remoteOK){const hit=P.locs.some(l=>text.includes(l));pLoc=hit?100:(x.remote&&P.remoteOK)?100:P.relocate?60:20;if(hit)pos.push('it\u2019s in a location you picked');}
 const pRem=x.remote==null||!P.remoteOK?null:(x.remote?100:70);
 const pYear=oYear==null?null:100;const pPaid=x.paid===true?100:null;
 const prefs=avgW([['location',pLoc],['remote',pRem],['classYear',pYear],['paid',pPaid]],W.prefParts||{});
 // ---- Hard filters ----
 if(P.sponsor===true&&(x.sponsorship==='Not offered'||x.citizenship===true))ineligible=ineligible||(x.citizenship===true?'it requires US citizenship and you need sponsorship':'it doesn\u2019t sponsor visas and you need sponsorship');
 // ---- Combine (missing parts are left out and their weight re-spread) ----
 const parts=[[fit.v,W.fit],[odds.v,W.odds],[prefs.v,W.prefs]].filter(p=>p[0]!=null);const tw=parts.reduce((a,p)=>a+p[1],0)||1;
 let pct=parts.reduce((a,p)=>a+p[0]*p[1],0)/tw;
 const B=W.lowCompetitionBoost||{};if(comp.score!=null&&comp.score<(B.below||35))pct+=(100-pct)*((B.below-comp.score)/B.below)*(B.strength||.5);
 if(ineligible)pct=Math.min(pct,W.ineligibleCap||40);
 pct=Math.max(0,Math.min(100,Math.round(pct)));
 const known=fit.n+odds.n+prefs.n,conf=known>=9?'high':known>=6?'medium':'low';
 const reasons=ineligible?[`Not eligible: ${ineligible}`]:[...pos.slice(0,3),...neg.slice(0,1)].slice(0,3);
 let tip=null;if(!ineligible&&pct<60){tip=!P.skills.length?'Add your skills (or upload a resume) to sharpen this score.':!P.exp.length?'Add any experience: part-time jobs, clubs and projects all count.':sk.length===0&&kws.length?`Roles like this ask for ${kws.slice(0,3).join(', ')}; add them if you have them.`:'Look for similar roles at smaller or local firms, where your odds are higher.'}
 return {pct,grade:MC.grade(pct,W),band:MC.band(pct),fit:Math.round(fit.v??0),odds:Math.round(odds.v??0),prefs:prefs.v==null?null:Math.round(prefs.v),comp:comp.score,reasons:reasons.length?reasons:['Little overlap with your profile yet'],tip,conf,ineligible:!!ineligible}};
MC.profile=function(pr){const sk=(pr.skills||[]).map(s=>norm(s)).filter(Boolean);
 return {school:pr.school||'',schoolN:norm(pr.school),major:pr.major||'',majorN:norm([pr.major,pr.minor].filter(Boolean).join(' ')),classYear:pr.classYear||'',gpa:parseFloat(pr.gpa)||null,
  sponsor:pr.sponsorship==='yes'?true:pr.sponsorship==='no'?false:null,industries:pr.industries||[],locs:(pr.locations||[]).map(l=>norm(String(l).split(',')[0])).filter(Boolean),
  remoteOK:!!pr.remoteOK,relocate:!!pr.relocate,skills:[...new Set(sk)],exp:(pr.experience||[]).filter(e=>e&&(e.title||e.org)).map(e=>({title:[e.title,e.org].filter(Boolean).join(' at '),n:norm([e.title,e.org,...(e.bullets||[])].join(' '))}))}};
MC.hasProfile=pr=>!!(pr&&pr.savedAt);
G.MatchCore=MC;
})(typeof self!=='undefined'?self:window);
