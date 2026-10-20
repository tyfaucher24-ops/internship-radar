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
 const odds=avgW([['firmTier',oTier],['school',oSchool],['gpa',oGpa],['classYear',oYear],['experience',oExp]],CFG.weights?.odds||{})??50;
 let bucket=fit>=(T.strongFit??65)&&odds>=(T.strongOdds??65)?'Strong Match':fit>=(T.realisticFit??45)&&odds>=(T.realisticOdds??45)?'Realistic':'Reach';if(hard)bucket='Reach';
 const poor=fit<(T.poorFitBelow??25);
 // plain-English reason
 const good=[];if(sk.length)good.push(`your ${sk.slice(0,3).join(', ')} skill${sk.length>1?'s':''} match${sk.length>1?'':'es'} the role`);if(relExp.length)good.push(`you've done related work (${relExp[0].title.split(' — ')[0].slice(0,40)})`);if(fInd===100)good.push(`it's in your target industry`);else if(fInd)good.push(`it fits your ${P.major} major`);
 if(!x.class_years?.length)unknown.push('eligible class years');
 let r=bucket+': ';if(bucket==='Reach'&&why.length)r+=why.join(' and ');else r+=(good.slice(0,2).join(' and ')||'little overlap with your skills or experience');
 if(bucket!=='Reach'&&why.length)r+='; but '+why.join(' and ');if(poor)r+='. Poor fit: few of your skills or experiences line up';
 const unk=unknown.filter(u=>u!=='eligible class years');const used=[oTier!=null&&'firm tier',oSchool!=null&&'school',oGpa!=null&&'GPA',oYear!=null&&'class year','experience'].filter(Boolean);
 const lst=a=>a.length>1?a.slice(0,-1).join(', ')+' or '+a[a.length-1]:a[0];
 if(unk.length)r+=`. No data on this firm's ${lst(unk)}, so odds use your ${used.join(' and ').replace(/ and (?=.* and )/g,', ')} only`;
 return {x,fit,odds,bucket,poor,reason:r+'.',hard}}
function profileForMatch(){const R=Store.get('resume',{}),pr=Store.get('profile',{});return {school:pr.school||R.school||'',major:pr.major||R.major||'',gpa:parseFloat(pr.gpa||R.gpa)||null,classYear:pr.classYear||R.classYear||'',
 industries:pr.industries||[],locs:(pr.locations||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean),skills:(Array.isArray(R.skills)?R.skills:String(R.skills||'').split(',')).map(s=>s.trim()).filter(Boolean).map(s=>s.toLowerCase()),experience:R.experience||[]}}
async function runMatch(){await cfgReady;const P=profileForMatch();if(!P.skills.length&&!P.major&&!P.industries.length&&!P.experience.length){MATCHES=[];return MATCHES}
 const order={'Strong Match':0,'Realistic':1,'Reach':2};
 MATCHES=D.filter(x=>x.st!=='closed'&&!x.past_term).map(x=>scoreListing(x,P)).sort((a,b)=>(a.poor-b.poor)||order[a.bucket]-order[b.bucket]||(b.fit+b.odds)-(a.fit+a.odds));return MATCHES}
/* ---------- UI ---------- */
const BCLS={'Strong Match':'b-strong','Realistic':'b-real','Reach':'b-reach'};
const mCard=m=>card(m.x,`</div><div class="mrow"><span class="badge ${BCLS[m.bucket]}">${m.bucket}</span>${m.poor?'<span class="badge b-poor">Poor fit</span>':''}<span class="sc">Fit <b>${m.fit}</b></span><span class="sc">Odds <b>${m.odds}</b></span></div><p class="why">${esc(m.reason)}</p><div class="meta">`);
function parsedFormFill(R){const f=$('parsedForm');if(!f)return;const pr=Store.get('profile',{});
 f.school.value=pr.school||R.school||'';f.major.value=pr.major||R.major||'';f.gpa.value=pr.gpa||R.gpa||'';f.classYear.value=pr.classYear||R.classYear||'';
 f.skills.value=(Array.isArray(R.skills)?R.skills.join(', '):R.skills||'');f.experience.value=(R.experience||[]).map(e=>[e.title,e.dates&&`(${e.dates})`].filter(Boolean).join(' ')+(e.text?' :: '+e.text:'')).join('\n');f.leadership.value=(R.leadership||[]).join('\n');f.clubs.value=(R.clubs||[]).join('\n')}
async function ingestText(text,label){const R=parseResume(text);R.source=label;Store.set('resume',R);parsedFormFill(R);$('parsedBox').hidden=false;
 $('rstat').textContent=`Read ${label}: ${R.skills.length} skills, ${R.experience.length} experience entries${R.school?', '+R.school:''}. Check below, fix anything wrong, then Save & match.`}
function matcherUI(){const f=$('parsedForm');CLASS_YEARS.forEach(c=>f.classYear.add(new Option(c,c)));const R=Store.get('resume',null);if(R&&R.parsedAt){parsedFormFill(R);$('parsedBox').hidden=false}
 const onFile=async(e,label)=>{const file=e.target.files[0];if(!file)return;$('rstat').textContent='Reading…';try{await ingestText(await readFile(file),file.name)}catch(err){$('rstat').textContent='Could not read file: '+err.message}e.target.value=''};
 $('resume').onchange=e=>onFile(e);$('liPdf').onchange=e=>onFile(e);
 $('liGo').onclick=()=>{const t=$('liText').value.trim();if(t.length<40){$('rstat').textContent='Paste your full LinkedIn profile text first.';return}ingestText(t,'pasted LinkedIn text')};
 f.onsubmit=e=>{e.preventDefault();const fd=Object.fromEntries(new FormData(f));const exp=fd.experience.split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{const [h,t]=l.split(' :: ');const d=(h.match(/\(([^)]*20\d\d[^)]*)\)\s*$/)||[])[1]||'';return {title:h.replace(/\s*\([^)]*\)\s*$/,'').trim(),dates:d,text:t||''}});
  const R={...Store.get('resume',{}),school:fd.school,major:fd.major,gpa:fd.gpa,classYear:fd.classYear,skills:fd.skills.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean),experience:exp,leadership:fd.leadership.split('\n').filter(Boolean),clubs:fd.clubs.split('\n').filter(Boolean),edited:new Date().toISOString()};
  Store.set('resume',R);profile={...profile,school:fd.school,major:fd.major,gpa:fd.gpa,classYear:fd.classYear};Store.set('profile',profile);if(typeof profileUI==='function'){const pf=$('profForm');['school','major','gpa','classYear'].forEach(k=>pf[k].value=profile[k]||'')}
  match();$('mResults').scrollIntoView({behavior:'smooth'})};
 document.querySelectorAll('#mTabs button').forEach(b=>b.onclick=()=>{mFilter=b.dataset.b;document.querySelectorAll('#mTabs button').forEach(o=>o.classList.toggle('on',o===b));showMatches()});
 $('mMore').onclick=()=>{mShown+=24;showMatches()};match()}
let mShown=24;
async function match(){await runMatch();mShown=24;showMatches();homeMatches()}
function showMatches(){if(!MATCHES.length){$('mCounts').textContent='';$('mList').innerHTML='<p class="muted">Upload a resume or LinkedIn PDF, or paste your LinkedIn text, then Save &amp; match.</p>';$('mMore').hidden=true;return}
 const c=b=>MATCHES.filter(m=>b==='poor'?m.poor:m.bucket===b&&!m.poor).length;
 $('mCounts').innerHTML=`<b>${c('Strong Match')}</b> strong · <b>${c('Realistic')}</b> realistic · <b>${c('Reach')}</b> reach · <b>${c('poor')}</b> poor fit, out of ${MATCHES.length.toLocaleString()} open listings`;
 const L=MATCHES.filter(m=>mFilter==='all'?!m.poor:mFilter==='poor'?m.poor:m.bucket===mFilter&&!m.poor);
 $('mList').innerHTML=L.length?`<div class="grid">${L.slice(0,mShown).map(mCard).join('')}</div>`:'<p class="muted">None in this bucket.</p>';$('mMore').hidden=L.length<=mShown}
function homeMatches(){const top=MATCHES.filter(m=>!m.poor&&m.bucket!=='Reach').slice(0,6);const slot=$('topSlot');
 if(!MATCHES.length){slot.className='panel placeholder';slot.innerHTML='<p class="muted">Upload your resume in <a href="#" data-go="foryou">For you</a> to see realistic matches here.</p>';return}
 slot.className='';slot.innerHTML=(top.length?`<div class="grid">${top.map(mCard).join('')}</div>`:'<p class="muted">No strong or realistic matches yet. See Reach roles in For you.</p>')+'<p><a href="#" data-go="foryou">See all matches →</a></p>'}
