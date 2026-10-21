/* Resume parsing + scoring config (config.json, editable in admin.html). Scoring itself lives in match-core.js. */
let CFG=null;
const cfgReady=fetch('config.json').then(r=>r.json()).then(c=>{CFG=Store.get('adminConfig',null)||c;return CFG}).catch(()=>CFG={});
/* ---------- parsing ---------- */
const HEAD={education:/^(education|academics?)$/,experience:/^(work |professional |relevant |internship |research |work & leadership )?experience|^employment|^work history$/,skills:/^(technical |top )?skills|^skills ?&|^languages ?& ?skills|^certifications? ?& ?skills/,
 leadership:/^leadership/,athletics:/^(athletics|varsity athletics)$/,clubs:/^(activities|clubs|involvement|campus involvement|organizations|extracurricular)/,projects:/^projects?/,other:/^(honors|awards|summary|about|certifications?|interests|languages|contact|references)/};
const MON='(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';
const DATE_RX=new RegExp(`((${MON}|summer|fall|spring|winter)\\s*)?20\\d\\d\\s*(–|-|—|to)\\s*((${MON}|summer|fall|spring|winter)\\s*)?(20\\d\\d|present|current)`,'i');
function sections(text){const lines=text.split(/\n/).map(l=>l.replace(/\s+/g,' ').trim()).filter(Boolean);const S={top:[]};let cur='top';
 lines.forEach(l=>{const k=l.toLowerCase().replace(/[:|]/g,'').trim();const h=l.length<45&&!/\d/.test(l)&&l.split(/\s+/).length<=5&&Object.keys(HEAD).find(h=>HEAD[h].test(k));if(h){cur=h;S[h]=S[h]||[];return}(S[cur]=S[cur]||[]).push(l)});return S}
const bullet=l=>l.replace(/^[•●▪◦\-–*·]\s*/,'').trim();
function classFromGrad(y,m){/* academic year boundary: now Oct 2026 */const now=new Date();const ay=now.getMonth()>=7?now.getFullYear()+1:now.getFullYear();const d=y-ay;return d<=0?'Senior':d===1?'Junior':d===2?'Sophomore':'Freshman'}
function findSchool(edu,nameLine){const L=(typeof SCHOOLS!=='undefined'&&SCHOOLS)||window._SCHOOLS||[];const A=(typeof LISTS!=='undefined'&&LISTS.SCHOOL_ALIAS)||{};
 const txt=' '+edu.replace(/\s+/g,' ')+' ';let best=null;
 for(const n of L){const i=txt.indexOf(n);if(i>=0&&(!best||n.length>best.n.length||(n.length===best.n.length&&i<best.i)))best={n,i}}
 if(!best){for(const [n,al] of Object.entries(A))for(const a of al.split('|')){if(a.length<3&&a!==a.toUpperCase())continue;const m=new RegExp('(^|[^A-Za-z])'+a.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([^A-Za-z]|$)',a.length<=4?'':'i').exec(txt);if(m&&(!best||m.index<best.i))best={n,i:m.index}}}
 if(best)return best.n;
 /* V11.2: never free text. Match short forms ("Queens University") to ONE list entry by whole words; otherwise leave School empty. */
 const cands=[];const re=/((?:[A-Z][A-Za-z&.'-]+\s){0,3}(?:University|College|Institute)(?:\s(?:of|at)\s(?:[A-Z][A-Za-z&.'-]+\s?){1,3})?)/g;let m;while((m=re.exec(edu.replace(/\s+/g,' '))))cands.push(m[1].trim());
 const words=s=>s.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w&&!['the','of','at','and'].includes(w));
 for(const c of cands){if(nameLine&&c.startsWith(nameLine.trim()))continue;const cw=words(c);if(cw.length<2)continue;
  const hits=L.filter(n=>{const nw=words(n);return cw.every(w=>nw.includes(w))&&(nw.join(' ').startsWith(cw.join(' '))||cw.length>=nw.length-1)});
  if(hits.length===1)return hits[0];if(hits.length>1){const st=hits.filter(n=>words(n).join(' ').startsWith(cw.join(' ')));if(st.length===1)return st[0]}}
 return ''}
window.findSchool=findSchool;
/* V11.2 parser: every field lands in its own box or stays empty and goes on the "Check these" list. Never free text in School. */
function joinWrapped(text){/* narrow PDF columns wrap one line into several; glue the pieces back together */
 const L=text.split(/\n/).map(l=>l.replace(/\s+/g,' ').trim()).filter(Boolean),out=[];
 const isHead=l=>l.length<45&&!/\d/.test(l)&&Object.values(HEAD).some(h=>h.test(l.toLowerCase().replace(/[:|]/g,'').trim()));
 for(const l of L){const prev=out[out.length-1];
  if(prev&&!isHead(prev)&&!isHead(l)&&!/^[•●▪◦\-*·]\s/.test(l)&&(/[,—–&]$|\b(of|in|and|&|for|at|the)$/i.test(prev)||/^(and|&|of|in)\s+[A-Z]/.test(l)||(/^(–|—|-)\s*\S/.test(l)&&!/^[-–—]\s+[A-Z][a-z]/.test(l)||/^(–|—|-)\s*((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(19|20)\d\d|present|current)\b/i.test(l)&&/(19|20)\d\d$/.test(prev))||/^(19|20)\d\d\b/.test(l)&&/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?$/i.test(prev)||/^(Engineering|Science|Administration|Management|Studies|Arts)\b/.test(l)&&!/[|·]/.test(prev.slice(-3))))out[out.length-1]=prev+' '+l;
  else out.push(l)}
 return out.join('\n')}
const STOPW=/\s*(?:[|·•;(]|—|–| - |\bMinor\b|\bSecondary\b|\bConcentration\b|\bGPA\b|\bExpected\b|\bGraduat|\bClass of\b|\bDean|\bHonors\b|\bCum\b|,\s*(?:[A-Z][a-z]+,\s*)?[A-Z]{2}\b|\b(?:19|20)\d\d\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b|\b(?:Spring|Fall|Summer|Winter)\b|\b(?:Freshman|Sophomore|Junior|Senior)\b).*$/;
const cleanField=v=>{v=String(v||'').replace(STOPW,'').replace(/[,.:\s]+$/,'').replace(/^(?:in|of|:)\s+/i,'').trim();return v&&v.split(/\s+/).length<=6&&/^[A-Z]/.test(v)&&!/[@\d|]/.test(v)?v:''};
function parseResume(text){text=joinWrapped(text);const S=sections(text),all=text.replace(/\s+/g,' '),lo=all.toLowerCase();const review=[];
 const eduL=S.education||[];const edu=eduL.join('\n')||all;
 const top=(S.top||[]);const nameLine=top[0]||'';
 // name: first line if it reads like a person's name
 let name=nameLine.replace(/\(.*?\)/g,'').replace(/[|•·].*$/,'').trim();if(/[@\d]/.test(name)||!/^[A-Za-zÀ-ÿ'’.\- ]{3,40}$/.test(name)||name.split(/\s+/).length<2||name.split(/\s+/).length>4)name='';
 if(name&&name===name.toUpperCase())name=name.toLowerCase().replace(/(^|[\s'’-])\S/g,c=>c.toUpperCase());if(!name)review.push('name');
 const school=findSchool(edu,nameLine);if(!school)review.push('school');
 // the education entry that belongs to the chosen school (a transfer student lists two)
 let blk=edu;if(school&&eduL.length){const A=(typeof LISTS!=='undefined'&&LISTS.SCHOOL_ALIAS&&LISTS.SCHOOL_ALIAS[school]||'').split('|').filter(Boolean);const keys=[school,...A,...school.split(/[,\-]/).map(x=>x.trim()).filter(x=>x.split(' ').length>=2)];
  let i=eduL.findIndex(l=>keys.some(k=>l.toLowerCase().includes(k.toLowerCase())));if(i<0)i=0;
  const sch=(typeof SCHOOLS!=='undefined'&&SCHOOLS)||window._SCHOOLS||[];const isOther=l=>/\b(University|College|Institute)\b/.test(l)&&!keys.some(k=>l.toLowerCase().includes(k.toLowerCase()));
  let j=i+1;while(j<eduL.length&&!isOther(eduL[j]))j++;const own=eduL.slice(i,j);
  // degree on the same line as the school ("X College — Associate of ...") stays with it; otherwise use the block
  blk=own.join('\n')}
 const DEG=/\b(Associate(?:'s)?|Bachelor(?:'s)?|Master(?:'s)?)\s+(?:of|in)\s+(Applied Science|Business Administration|Fine Arts|Science|Arts|Engineering)\b|(?<![A-Za-z])(A\.A\.S\.?|A\.A\.|A\.S\.|A\.B\.|B\.S\.B\.A\.?|B\.S\.|B\.A\.|BBA|BSBA|BSN|BS|BA|B\.Eng\.?|M\.S\.|MBA|MS)(?=[\s,]|$)/;
 let degree='',major='',minor='';const dm=blk.match(DEG)||edu.match(DEG);
 if(dm){degree=dm[0].trim();if(degree==='BSN')degree='Bachelor of Science';const src=blk.match(DEG)?blk:edu;const after=src.slice(src.indexOf(dm[0])+dm[0].length);
  const m1=after.match(/^\s*(?:\(\w+\)\s*)?(?:degree\s*)?(?:in\s+|,\s*|:\s*|\s+|\s*[—–-]\s*)([A-Z][A-Za-z&]*(?:[ \t]+(?:and|&|of|in)?[ \t]*[A-Z][A-Za-z&]*){0,5})/);if(m1)major=cleanField(m1[1])}
 // explicit labels beat the degree line: "Finance Major", "Major: X", "Concentration: X", "Degree, Finance"
 const ml=blk.match(/(?:^|[\s,•|·])([A-Z][A-Za-z&]+(?:\s(?:and|&)?\s?[A-Z][A-Za-z&]+){0,3})\s+Major\b/)||blk.match(/\bMajor(?:s)?\s*(?:in|:|-)\s*([A-Z][A-Za-z&]+(?:\s(?:and|&|of)?\s?[A-Z][A-Za-z&]+){0,4})/)||blk.match(/\bConcentrations?\s*(?:in|:)\s*([A-Z][A-Za-z&]+(?:\s(?:and|&|of)?\s?[A-Z][A-Za-z&]+){0,3})/);
 if(ml&&cleanField(ml[1]))major=cleanField(ml[1]);
 else if(/^(business administration|business)$/i.test(major)){const m2=blk.match(/(?:Business Administration|BBA)\s*,\s*([A-Z][A-Za-z&]+(?:\s(?:and|&)?\s?[A-Z][A-Za-z&]+){0,3})/);if(m2&&cleanField(m2[1]))major=cleanField(m2[1])}
 if(/^(arts|science|applied science|fine arts|major)$/i.test(major))major='';
 if(!major){const m=MAJORS.slice().sort((a,b)=>b.length-a.length).find(m=>new RegExp('\\b'+m.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test(blk.replace(DEG,'').replace(/\bminor\b.*$/gim,'').replace(/^.*\b(?:School|College) of [A-Z][^\n]*$/gm,'').replace(/^.*\b(?:University|College|Institute)\b.*$/m,'')));if(m)major=m.replace(/\b\w/g,c=>c.toUpperCase())}
 if(!major&&/^(BBA|BSBA|B\.S\.B\.A\.?|Bachelor of Business Administration)$/i.test(degree))major='Business Administration';if(!major)review.push('major');
 const mn=blk.match(/\b(?:Minors?|Secondary)\s*(?:in\b|:|-)?\s*([A-Z][A-Za-z&]+(?:[ \t]+(?:and|&|of)?[ \t]*[A-Z][A-Za-z&]+){0,4})/);if(mn)minor=cleanField(mn[1]);
 // GPA: cumulative/overall first; only 0-4.0 scale numbers; anything else is left empty and flagged
 let gpa='';const g1=all.match(/(?:cumulative|overall|cum\.?)\s*GPA[:\s]*([0-4]\.\d{1,2})\b/i)||all.match(/\bGPA[:\s]*([0-4]\.\d{1,2})\b(?!\s*\/\s*(?:5|10|100))/i)||all.match(/\b([0-4]\.\d{1,2})\s*\/\s*4\.0+\b/);
 if(g1&&+g1[1]<=4)gpa=String((+g1[1]).toFixed(2)).replace(/(\.\d)0$/,'$10').replace(/^(\d\.\d)$/,'$10');if(gpa&&!/\d\.\d\d/.test(gpa))gpa=(+gpa).toFixed(2);
 if(!gpa&&/\bGPA\b/i.test(all))review.push('gpa');
 // work authorization: only when the resume says it
 let workAuth='';const wa=lo;
 if(/(without|no|not require|does not require|don.t need|do not need)\s+(?:employer\s+|visa\s+)?sponsorship|authorized to work[^.]{0,40}without/.test(wa))workAuth=/citizen|green card|permanent resident/.test(wa)?'citizen':'authorized';
 else if(/(require|need|will need|requires)\s+(?:an?\s+)?(?:h-?1b\s+|visa\s+|employer\s+)?sponsorship|\bf-?1\b|\bh-?1b\b|\bopt\b|\bcpt\b|international student/.test(wa))workAuth='sponsor';
 else if(/\bu\.?s\.? citizen\b|\bus citizen\b|permanent resident|green card/.test(wa))workAuth='citizen';
 let classYear='';if(/\bsophomore\b/.test(lo))classYear='Sophomore';else if(/\bfreshman\b|\bfirst-year\b/.test(lo))classYear='Freshman';else if(/\bjunior\b(?!\s+(?:college|varsity|analyst|associate|developer|engineer))/.test(lo))classYear='Junior';
 const MONS={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12,spring:5,summer:8,fall:12,winter:12};
 let gyear='',gmon='';const ex=blk.match(/(?:expected|anticipated|graduat(?:ion|ing)|class of|degree expected)[:\s]*(?:in\s+)?((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?|spring|summer|fall|winter)?\s*(20\d\d)/i)||edu.match(/(?:expected|anticipated|graduat(?:ion|ing)|class of|degree expected)[:\s]*(?:in\s+)?((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?|spring|summer|fall|winter)?\s*(20\d\d)/i);
 if(ex){gyear=ex[2];gmon=ex[1]?MONS[ex[1].slice(0,3).toLowerCase()]||MONS[ex[1].toLowerCase()]:''}
 else{const rg=blk.match(/20\d\d\s*(?:–|-|—|to)\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(20\d\d)/i);if(rg){gyear=rg[2];gmon=rg[1]?MONS[rg[1].trim().slice(0,3).toLowerCase()]:''}
  else{const ys=[...blk.matchAll(/((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+|(?:spring|summer|fall|winter)\s+)?(20\d\d)/gi)].filter(m=>+m[2]>=2020&&+m[2]<=2034);if(ys.length){const m=ys.sort((a,b)=>b[2]-a[2])[0];gyear=m[2];gmon=m[1]?MONS[m[1].trim().slice(0,3).toLowerCase()]:''}}}
 const gradDate=gyear?gyear+'-'+String(gmon||5).padStart(2,'0'):'';
 if(!classYear&&gyear)classYear=classFromGrad(+gyear,+gmon||5);if(!classYear)review.push('classYear');
 // experience: an entry starts at a line with a date range; "Org | Title | dates" or "Title, Org" + dates
 const exp=[];const E=[...(S.experience||[])];E.forEach((l,i)=>{if(!DATE_RX.test(l))return;const dates=l.match(DATE_RX)[0];let head=l.replace(dates,'').replace(/[|,·–—-]\s*$/,'').replace(/\s*\|\s*$/,'').trim();
  const prev=i>0?E[i-1]:'';const prevFree=prev&&!DATE_RX.test(prev)&&!/^[•●▪\-–*]/.test(prev)&&prev.length<80&&!exp.some(x=>x.body.includes(prev));
  if(head.length<3&&prevFree)head=prev;else if(prevFree&&!/\|/.test(head)&&!/,\s*[A-Z]/.test(head.replace(/,\s*[A-Z]{2}\b/,'')))head=prev+' — '+head;else if(prevFree&&/^[A-Z][^|]*,\s*[A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*[A-Z]{2}$/.test(prev))head=prev+' — '+head;
  const body=[];for(let j=i+1;j<E.length&&!DATE_RX.test(E[j]);j++){if(j+1<E.length&&DATE_RX.test(E[j+1])&&!/^[•●▪\-–*]/.test(E[j]))break;body.push(E[j])}
  let title=head,org='';const pp=head.split(/\s*\|\s*/);if(pp.length>=2){org=pp[0];title=pp.slice(1).join(', ')}else{const dd=head.split(/\s+—\s+/);if(dd.length>=2){org=dd[0].replace(/,\s*[A-Z][a-z]+(?:\s[A-Z][a-z]+)?,\s*[A-Z]{2}$/,'');title=dd.slice(1).join(' — ')}}
  exp.push({title:title.replace(/\s+—\s*$/,''),org,dates,body:body.join(' '),text:body.map(bullet).join(' ')})});
 exp.forEach(x=>delete x.body);
 const skillText=(S.skills||[]).filter(l=>!/citizen|sponsorship|authorized|visa|green card/i.test(l)).join(', ');
 const listed=skillText.split(/[,;|•●\n]|\s{2,}/).map(s=>s.replace(/^[A-Za-z ]{2,20}:\s*/,'').replace(/\s*\(.*?\)\s*/g,'').trim()).filter(s=>s&&s.length<40&&!/@|\d{3}/.test(s));
 const found=SKILLS.filter(s=>new RegExp('(^|[^a-z])'+s.replace(/[+#.]/g,'\\$&')+'([^a-z]|$)').test(skillText.toLowerCase()));
 const skills=[...new Set([...listed,...found].map(s=>s.toLowerCase()))];if(!skills.length)review.push('skills');
 const lines=k=>(S[k]||[]).map(bullet).filter(l=>l.length>2&&!DATE_RX.test(l)||/[A-Za-z]{4}/.test(l)).slice(0,12);
 return {name,school,major,minor,degree,gradDate,gpa,classYear,workAuth,experience:exp,skills,leadership:lines('leadership'),clubs:lines('clubs'),athletics:lines('athletics'),review,parsedAt:new Date().toISOString()}}

/* V6: scoring moved to match-core.js (one match % + letter grade). */
