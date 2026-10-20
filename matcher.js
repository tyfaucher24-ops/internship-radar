/* V2 step 3: realistic matcher. Fully client-side. All scoring inputs come from config.json (editable in admin.html). */
let CFG=null,MATCHES=[],mFilter='all';
const cfgReady=fetch('config.json').then(r=>r.json()).then(c=>{CFG=Store.get('adminConfig',null)||c;return CFG}).catch(()=>CFG={});
/* ---------- parsing ---------- */
const HEAD={education:/^(education|academics?)$/,experience:/^(work |professional |relevant |internship )?experience|^employment|^work history$/,skills:/^(technical |top )?skills|^skills ?&|^languages ?& ?skills|^certifications? ?& ?skills/,
 leadership:/^leadership/,clubs:/^(activities|clubs|involvement|campus involvement|organizations|extracurricular)/,projects:/^projects?/,other:/^(honors|awards|summary|about|certifications?|interests|languages|contact|references)/};
const MON='(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';
const DATE_RX=new RegExp(`((${MON}|summer|fall|spring|winter)\\s*)?20\\d\\d\\s*(–|-|—|to)\\s*((${MON}|summer|fall|spring|winter)\\s*)?(20\\d\\d|present|current)`,'i');
function sections(text){const lines=text.split(/\n/).map(l=>l.replace(/\s+/g,' ').trim()).filter(Boolean);const S={top:[]};let cur='top';
 lines.forEach(l=>{const k=l.toLowerCase().replace(/[:|]/g,'').trim();const h=l.length<45&&Object.keys(HEAD).find(h=>HEAD[h].test(k));if(h){cur=h;S[h]=S[h]||[];return}(S[cur]=S[cur]||[]).push(l)});return S}
const bullet=l=>l.replace(/^[•●▪◦\-–*·]\s*/,'').trim();
function classFromGrad(y,m){/* academic year boundary: now Oct 2026 */const now=new Date();const ay=now.getMonth()>=7?now.getFullYear()+1:now.getFullYear();const d=y-ay;return d<=0?'Senior':d===1?'Junior':d===2?'Sophomore':'Freshman'}
function parseResume(text){const S=sections(text),all=text.replace(/\s+/g,' '),lo=all.toLowerCase();const edu=(S.education||[]).join('\n')||all;
 const school=((edu.match(/[^\n,|]*(University|College|Institute of Technology|Institute)[^\n,|]*/)||[])[0]||'').replace(/\s*(20\d\d|expected|graduat).*/i,'').trim();
 let major=(edu.match(/(?:Bachelor of (?:Science|Arts|Business Administration)|B\.?S\.?B?\.?A?\.?|B\.?A\.?|BBA|Major)\s*(?:in|,|:|-)?\s*([A-Z][A-Za-z&]+(?:\s(?:and|&)?\s?[A-Z][A-Za-z&]+){0,3})/)||[])[1]||'';
 if(!major){const m=MAJORS.find(m=>edu.toLowerCase().includes(m));if(m)major=m.replace(/\b\w/g,c=>c.toUpperCase())}
 const gpa=(all.match(/GPA[:\s]*([0-4]\.\d{1,2})/i)||all.match(/([0-4]\.\d{1,2})\s*\/\s*4\.0/)||[])[1]||'';
 let classYear='';if(/\bsophomore\b/.test(lo))classYear='Sophomore';else if(/\bfreshman|first-year\b/.test(lo))classYear='Freshman';else if(/\bjunior\b/.test(lo))classYear='Junior';
 const gy=edu.match(/(?:expected|graduation|grad\.?|class of|anticipated)?[^0-9\n]{0,25}(?:may|june|december|dec|spring|fall)?\s*(20\d\d)(?!\s*[-–])/i);if(!classYear&&gy)classYear=classFromGrad(+gy[1]);
 // experience: an entry starts at a line with a date range; title/org = that line + previous line
 const exp=[];const E=S.experience||[];E.forEach((l,i)=>{if(!DATE_RX.test(l))return;const dates=l.match(DATE_RX)[0];let head=l.replace(dates,'').replace(/[|,–-]\s*$/,'').trim();
  if(head.length<3&&i>0)head=E[i-1];else if(i>0&&!DATE_RX.test(E[i-1])&&!/^[•●▪\-–*]/.test(E[i-1])&&E[i-1].length<70&&!exp.some(x=>x.text.includes(E[i-1])))head=E[i-1]+' — '+head;
  const body=[];for(let j=i+1;j<E.length&&!DATE_RX.test(E[j]);j++){if(j+1<E.length&&DATE_RX.test(E[j+1])&&!/^[•●▪\-–*]/.test(E[j]))break;body.push(bullet(E[j]))}
  exp.push({title:head.replace(/\s+—\s*$/,''),dates,text:body.join(' ')})});
 const skillText=(S.skills||[]).join(', ');
 const listed=skillText.split(/[,;|•●\n]|\s{2,}/).map(s=>s.replace(/^[A-Za-z ]{2,20}:\s*/,'').trim()).filter(s=>s&&s.length<40);
 const found=SKILLS.filter(s=>new RegExp('(^|[^a-z])'+s.replace(/[+#.]/g,'\\$&')+'([^a-z]|$)').test(lo));
 const skills=[...new Set([...listed,...found].map(s=>s.toLowerCase()))];
 const lines=k=>(S[k]||[]).map(bullet).filter(l=>l.length>2&&!DATE_RX.test(l)||/[A-Za-z]{4}/.test(l)).slice(0,12);
 return {school,major,gpa,classYear,experience:exp,skills,leadership:lines('leadership'),clubs:lines('clubs'),parsedAt:new Date().toISOString()}}

/* ---------- V4 competition score (0 = few applicants expected, 100 = very crowded). Only real inputs; unknowns left out and named. ---------- */
function competition(x,firm){const parts=[],why=[],easy=[],unknown=[];
 const sz=x.size||'';if(/^Small|1[–-]200|^\d{1,2}-person/i.test(sz)){parts.push(20);easy.push(`${/\d+-person/.test(sz)?sz:'small firm'}`)}else if(/^Mid/i.test(sz))parts.push(50);else if(/^Large|5,?000\+/i.test(sz)){parts.push(80);why.push('large, well-known employer')}else unknown.push('company size');
 if(firm&&firm.tier){const t=+firm.tier;parts.push(t<=1?95:t===2?75:55);if(t<=1)why.push('top-tier brand')}else unknown.push('brand tier');
 const mp=x.metro_pop||Math.max(0,...(x.locations||[]).map(l=>l.pop||0));if(x.remote){parts.push(85);why.push('remote (national applicant pool)')}else if(mp){const c=mp>=1e6?70:mp>=3e5?55:mp>=1e5?40:25;parts.push(c);if(c<=40)easy.push(mp>=1e5?'mid-size city':'small town')}else unknown.push('metro size');
 const fs=x.posted||(x.first_seen||'').slice(0,10);if(fs){const d=-days(fs.slice(0,10));parts.push(d<=3?70:d<=14?55:d<=45?45:35);if(d>45)easy.push(`open ${d} days`)}
 const cy=x.class_years||[];if(cy.length){const under=cy.includes('Freshman')||cy.includes('Sophomore');parts.push(under?35:cy.length>=3?50:60);if(cy.includes('Freshman'))easy.push('accepts freshmen');else if(under)easy.push('accepts sophomores')}else unknown.push('eligible years');
 if(x.gpa_min==null||x.gpa_min===''){if(x.has_desc){easy.push('no GPA cutoff listed')}}else if(+x.gpa_min>=3.5){parts.push(75);why.push(`GPA ${x.gpa_min}+ required`)}
 const op=parseInt(x.openings)||0;if(op>=5){parts.push(30);easy.push(`${op} openings`)}else if(op>=2)parts.push(45);
 const score=parts.length>=2?Math.round(parts.reduce((a,b)=>a+b,0)/parts.length):null;return {score,easy,why,unknown}}
/* ---------- scoring ---------- */
const norm=s=>(s||'').toLowerCase().replace(/[^a-z0-9&+# ]/g,' ').replace(/\s+/g,' ').trim();
const TSTOP=new Set('intern internship summer fall spring winter 2026 2027 2028 and the of for in to a with program analyst co op coop student university new grad'.split(' '));
function firmRow(co){const n=norm(co);return (CFG.firmTiers||[]).filter(f=>!f.placeholder).find(f=>{const k=norm(f.firm);return k&&(n===k||n.startsWith(k+' ')||k.startsWith(n+' '))})}
function avgW(parts,w){let s=0,t=0;parts.forEach(([k,v])=>{if(v==null)return;s+=v*(+w[k]||0);t+=(+w[k]||0)});return t?Math.round(s/t):null}
function scoreListing(x,P){const W=CFG.weights||{},T=CFG.thresholds||{},title=norm(x.title),ind=x.industry||'';
 const kws=new Set([...(CFG.industryKeywords?.[ind]||'').split(',').map(s=>s.trim()).filter(Boolean),...title.split(' ').filter(w=>w.length>2&&!TSTOP.has(w))]);
 const sk=P.skills.filter(s=>[...kws].some(k=>k===s||(s.length>3&&(k.includes(s)||s.includes(k)))));
 const majInd=Object.entries(CFG.majorIndustries||{}).filter(([m])=>norm(P.major).includes(m)).map(([,v])=>v);
 const fInd=P.industries.includes(ind)?100:majInd.includes(ind)?75:0;
 const fSkill=Math.min(100,sk.length*25);
 const relExp=P.experience.filter(e=>{const t=norm(e.title+' '+e.text);return [...kws].filter(k=>k.length>2&&t.includes(k)).length>=2||title.split(' ').some(w=>w.length>4&&!TSTOP.has(w)&&t.includes(w))});
 const fExp=P.experience.length?Math.min(100,relExp.length*60+(P.experience.length?10:0)):0;
 const fLoc=!P.locs.length?null:(P.locs.some(l=>x._t.includes(l))||(x.remote&&P.locs.includes('remote')))?100:0;
 const fit=avgW([['industry',fInd],['skills',fSkill],['experience',fExp],['location',fLoc]],W.fit||{})??0;
 // odds: unknown inputs are left out (not guessed) and named in the reason
 const firm=firmRow(x.company),unknown=[],why=[];let hard=false;
 let oTier=null;if(firm&&firm.tier){oTier=+(CFG.tierOdds||{})[firm.tier]||null}else unknown.push('tier');
 const tList=(CFG.targetSchools||[]).find(r=>!r.placeholder&&r.industry===ind);const tSchools=tList?tList.schools.split(/[;\n]/).map(norm).filter(Boolean):[];
 const isTarget=P.school&&tSchools.some(s=>norm(P.school).includes(s)||s.includes(norm(P.school)));
 let oSchool=null;if(firm&&firm.targetSchoolsOnly){oSchool=isTarget?85:20;if(!isTarget)why.push('this firm mostly recruits from target schools')}else if(tSchools.length){oSchool=isTarget?80:45}else unknown.push('target schools');
 const bar=firm&&firm.gpaBar?+firm.gpaBar:+((CFG.industryGpaBars||[]).find(r=>!r.placeholder&&r.industry===ind)||{}).gpaBar||null;let oGpa=null;
 if(bar&&P.gpa){const d=P.gpa-bar;oGpa=d>=0?85:d>=-0.2?50:15;if(d<0)why.push(`your GPA is below its usual bar (${bar})`)}else if(!bar)unknown.push('GPA bar');
 let oYear=null;const cy=x.class_years||[];if(cy.length&&P.classYear){if(cy.includes(P.classYear))oYear=95;else{oYear=5;hard=true;why.push(`it lists ${cy.join('/')} students and you're a ${P.classYear}`)}}else oYear=cy.length?null:60;
 const oExp=P.experience.length?Math.min(95,35+relExp.length*30):25;
 const base=avgW([['firmTier',oTier],['school',oSchool],['gpa',oGpa],['classYear',oYear],['experience',oExp]],CFG.weights?.odds||{})??50;
 const C=competition(x,firm);const cOdds=C.score==null?null:Math.round(100*Math.pow(1-C.score/100,1.6));// rises sharply as competition falls
 const odds=cOdds==null?base:Math.min(100,Math.round(base*0.55+cOdds*0.45*(C.score<35?1.6:1)));
 let bucket=fit>=(T.strongFit??65)&&odds>=(T.strongOdds??65)?'Strong Match':fit>=(T.realisticFit??45)&&odds>=(T.realisticOdds??45)?'Realistic':'Reach';if(hard)bucket='Reach';
 const gem=!hard&&C.score!=null&&C.score<=(T.gemCompetitionMax??40)&&fit>=(T.gemFit??35)&&C.easy.length>=2;if(gem&&bucket!=='Strong Match')bucket='Hidden Gem';
 const poor=fit<(T.poorFitBelow??25);
 // plain-English reason
 const good=[];if(sk.length)good.push(`your ${sk.slice(0,3).join(', ')} skill${sk.length>1?'s':''} match${sk.length>1?'':'es'} the role`);if(relExp.length)good.push(`you've done related work (${relExp[0].title.split(' — ')[0].slice(0,40)})`);if(fInd===100)good.push(`it's in your target industry`);else if(fInd)good.push(`it fits your ${P.major} major`);
 if(!x.class_years?.length)unknown.push('eligible class years');
 let r=bucket+': ';if(bucket==='Hidden Gem'){const e=C.easy.slice(0,3);r+=`Strong odds: ${e.join(', ')}. `+(good[0]?good[0][0].toUpperCase()+good[0].slice(1):'')}else if(bucket==='Reach'&&why.length)r+=why.join(' and ');else r+=(good.slice(0,2).join(' and ')||'little overlap with your skills or experience');
 if(bucket!=='Reach'&&why.length)r+='; but '+why.join(' and ');if(poor)r+='. Poor fit: few of your skills or experiences line up';
 const unk=unknown.filter(u=>u!=='eligible class years');const used=[oTier!=null&&'firm tier',oSchool!=null&&'school',oGpa!=null&&'GPA',oYear!=null&&'class year','experience'].filter(Boolean);
 const lst=a=>a.length>1?a.slice(0,-1).join(', ')+' or '+a[a.length-1]:a[0];
 if(unk.length)r+=`. No data on this firm's ${lst(unk)}, so odds use your ${used.join(' and ').replace(/ and (?=.* and )/g,', ')} only`;
 if(C.score!=null&&bucket!=='Hidden Gem')r+=`. Competition ${C.score<=40?'low':C.score<=60?'moderate':'high'}${C.why.length?' ('+C.why.slice(0,2).join(', ')+')':''}`;
 return {x,fit,odds,bucket,poor,reason:r.replace(/\.\s*$/,'')+'.',hard,comp:C.score,compWhy:C,score:Math.round(fit*odds/100)}}
function profileForMatch(){const R=Store.get('resume',{}),pr=Store.get('profile',{});return {school:pr.school||R.school||'',major:pr.major||R.major||'',gpa:parseFloat(pr.gpa||R.gpa)||null,classYear:pr.classYear||R.classYear||'',
 industries:pr.industries||[],locs:(pr.locations||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean),skills:(Array.isArray(R.skills)?R.skills:String(R.skills||'').split(',')).map(s=>s.trim()).filter(Boolean).map(s=>s.toLowerCase()),experience:R.experience||[]}}
async function runMatch(){await cfgReady;const P=profileForMatch();if(!P.skills.length&&!P.major&&!P.industries.length&&!P.experience.length){MATCHES=[];return MATCHES}
 const order={'Strong Match':0,'Hidden Gem':1,'Realistic':2,'Reach':3};
 MATCHES=D.filter(x=>x.st!=='closed'&&x.st!=='upcoming'&&!x.past_term).map(x=>scoreListing(x,P)).sort((a,b)=>(a.poor-b.poor)||order[a.bucket]-order[b.bucket]||(b.score-a.score));return MATCHES}
