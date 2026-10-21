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

/* V6: scoring moved to match-core.js (one match % + letter grade). */
