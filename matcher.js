/* Resume parsing + scoring config (config.json, editable in admin.html). Scoring itself lives in match-core.js. */
let CFG=null;
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
function parseResume(text){const S=sections(text),all=text.replace(/\s+/g,' '),lo=all.toLowerCase();const edu=(S.education||[]).join('\n')||all;
 // V9: school from the known list (+ aliases like MIT, Rutgers, Wharton) first; the regex is only a fallback, and never
 // takes the person's name line. Degrees ("Associate in Arts", "Bachelor of Science") are degrees, not majors.
 const top=(S.top||[]).slice(0,2).join(' ');const nameLine=(S.top||[])[0]||'';
 const school=findSchool(edu,nameLine);
 const DEG=/\b(Associate(?:'s)?|Bachelor(?:'s)?|Master(?:'s)?)\s+(?:of|in)\s+(Applied Science|Business Administration|Fine Arts|Science|Arts|Engineering)\b|\b(A\.A\.S?|A\.S|B\.S\.?B?\.?A?|B\.A|BBA|BSBA|B\.Eng|M\.S|MBA)\.?(?=[\s,])/i;
 let degree='',major='';const dm=edu.match(DEG);
 if(dm){degree=dm[0].trim();const after=edu.slice(dm.index+dm[0].length);const mm=after.match(/^\s*(?:degree\s*)?(?:in|,|:|-|–|—)\s*([A-Z][A-Za-z&]+(?:[ \t](?:and|&|of)?[ \t]?[A-Z][A-Za-z&]+){0,4})/);if(mm)major=mm[1]}
 if(!major){const mm=edu.match(/\bMajor(?:s)?\s*(?:in|:|-)?\s*([A-Z][A-Za-z&]+(?:[ \t](?:and|&|of)?[ \t]?[A-Z][A-Za-z&]+){0,3})/);if(mm)major=mm[1]}
 major=major.replace(/\s+(Minor|GPA|Expected|Graduation|Dean|Honors|Concentration).*$/i,'').trim();
 if(/^(arts|science|applied science|fine arts)$/i.test(major))major='';
 if(!major){const m=MAJORS.find(m=>new RegExp('\\b'+m.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test(edu.replace(DEG,'')));if(m)major=m.replace(/\b\w/g,c=>c.toUpperCase())}
 const gpa=(all.match(/GPA[:\s]*([0-4]\.\d{1,2})/i)||all.match(/([0-4]\.\d{1,2})\s*\/\s*4\.0/)||[])[1]||'';
 let classYear='';if(/\bsophomore\b/.test(lo))classYear='Sophomore';else if(/\bfreshman|first-year\b/.test(lo))classYear='Freshman';else if(/\bjunior\b/.test(lo))classYear='Junior';
 // graduation: explicit "Expected/Graduation/Class of" first, then the END of a date range in Education, then a lone year in Education
 const MONS={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12,spring:5,summer:8,fall:12,winter:12};
 let gyear='',gmon='';const ex=edu.match(/(?:expected|anticipated|graduat(?:ion|ing)|class of|degree expected)[:\s]*(?:in\s+)?((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?|spring|summer|fall|winter)?\s*(20\d\d)/i);
 if(ex){gyear=ex[2];gmon=ex[1]?MONS[ex[1].slice(0,3).toLowerCase()]||MONS[ex[1].toLowerCase()]:''}
 else{const rg=edu.match(/20\d\d\s*(?:–|-|—|to)\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(20\d\d)/i);if(rg){gyear=rg[2];gmon=rg[1]?MONS[rg[1].trim().slice(0,3).toLowerCase()]:''}
  else{const ys=[...edu.matchAll(/((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(20\d\d)/gi)].filter(m=>+m[2]>=2020&&+m[2]<=2034);if(ys.length){const m=ys.sort((a,b)=>b[2]-a[2])[0];gyear=m[2];gmon=m[1]?MONS[m[1].trim().slice(0,3).toLowerCase()]:''}}}
 const gradDate=gyear?gyear+'-'+String(gmon||5).padStart(2,'0'):'';
 const gy=gyear?[0,gyear]:null;if(!classYear&&gy)classYear=classFromGrad(+gy[1]);
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
 return {school,major,degree,gradDate,gpa,classYear,experience:exp,skills,leadership:lines('leadership'),clubs:lines('clubs'),parsedAt:new Date().toISOString()}}

/* V6: scoring moved to match-core.js (one match % + letter grade). */
