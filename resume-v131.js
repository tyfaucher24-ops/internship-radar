/* V13.1 resume extras (specs/V13.1.md P1 #5-#8 + onboarding upgrade 4). Pure functions, no DOM: used by the website and by node tests.
   Rule: only what is actually written in the resume. Anything uncertain stays blank and is flagged with check:[field]. */
(function(root){
const MON={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,sept:9,oct:10,nov:11,dec:12};
const MRX='(?:jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\\.?';
const SEAS={spring:3,summer:6,fall:9,winter:12};
const SRX='(?:spring|summer|fall|winter)';
const PT='(?:'+MRX+'|'+SRX+')';
const RANGE=new RegExp('\\(?\\s*('+PT+')?\\s*((?:19|20)\\d\\d)?\\s*(?:–|—|-|to)\\s*('+PT+')?\\s*((?:19|20)\\d\\d|present|current|now)\\s*\\)?','i');
const ONE=new RegExp('\\(?\\s*('+PT+')\\s+((?:19|20)\\d\\d)\\s*\\)?','i');
const mnum=s=>{if(!s)return 0;s=s.toLowerCase().replace(/\./,'');return MON[s.slice(0,4)]||MON[s.slice(0,3)]||SEAS[s]||0};
const ym=(y,m)=>y?(m?y+'-'+String(m).padStart(2,'0'):String(y)):'';
/* "Sept 2025 – Present" | "Jun–Aug 2026" | "June 2026 – August 2026" | "May 2029" */
function parseDates(s){s=String(s||'');const r=s.match(RANGE);
 if(r&&(r[2]||/\d/.test(r[4])||r[1])&&(r[1]||r[2])){const endPresent=/present|current|now/i.test(r[4]);const ey=endPresent?'':r[4];const sy=r[2]||ey;
  if(!sy&&!endPresent)return null;
  const start=ym(sy,mnum(r[1])),end=endPresent?'Present':ym(ey,mnum(r[3]));if(!start&&!end)return null;return{start,end,raw:r[0].trim()}}
 const o=s.match(ONE);if(o)return{start:ym(o[2],mnum(o[1])),end:'',raw:o[0].trim(),single:true};return null}
const ST='AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY';
const LOCRX=new RegExp('(?:,\\s*|\\s+[|·]\\s*|^)([A-Z][a-zA-Z.\'-]+(?:\\s[A-Z][a-zA-Z.\'-]+){0,2}),\\s*('+ST+')\\b\\.?\\s*$');
const ROLE=/\b(intern|analyst|associate|assistant|agent|coach|manager|engineer|developer|co-?op|counselor|technician|cashier|teller|lead|chair|president|vice president|treasurer|secretary|researcher|designer|caddie|volunteer|member|captain|student-athlete|athlete|tutor|fellow|consultant|representative|server|specialist|officer|director|founder|editor|writer|instructor|scholar)s?\b/i;
const SPORT=/\b(lacrosse|football|soccer|basketball|baseball|softball|volleyball|tennis|golf|swim(?:ming)?|track|cross country|rowing|crew|hockey|wrestling|field hockey|water polo|gymnastics|fencing|squash|rugby)\b/i;
const D1=/\b(ncaa|division\s+(?:i|1)\b|d-?1\b|d-?i\b|varsity)/i;
function classify(t,org,sec){const s=(t+' '+org);
 if((D1.test(s)&&(SPORT.test(s)||/athlet/i.test(s)))||(/athlet/i.test(s)&&SPORT.test(s))||sec==='athletics')return'Athletics';
 if(/\bintern(ship)?\b|co-?op/i.test(t))return'Internship';
 if(/research/i.test(s))return'Research';
 if(/volunteer/i.test(s))return'Volunteer';
 if(/\b(club|society|association|council|student government|fraternity|sorority|student[- ]\w+ fund|chapter)\b/i.test(org||t)||/^member$/i.test(t))return'Club';
 if(sec==='leadership'||/\b(president|captain|chair|treasurer|secretary|founder)\b/i.test(t))return'Leadership';
 return'Job'}
/* one header line -> {title, org, location} without the dates; never emits "()" */
function splitHead(h){h=h.replace(/\(\s*\)/g,'').replace(/\s+/g,' ').replace(/[\s|,·–—-]+$/,'').trim();const check=[];let loc='';
 let parts=h.split(/\s+[—–|]\s+|\s+-\s+/).map(x=>x.trim()).filter(Boolean);
 const pullLoc=s=>{const m=s.match(LOCRX);if(m){loc=m[1]+', '+m[2];return s.slice(0,m.index).replace(/[\s,|·]+$/,'').trim()}return s};
 parts=parts.map((p,i)=>i===parts.length-1||!loc?pullLoc(p):p).filter(Boolean);
 parts=parts.filter(p=>!(p.match(LOCRX)&&p.replace(LOCRX,'').trim()===''));
 let title='',org='';
 if(parts.length>=2){const a=parts[0],b=parts.slice(1).join(' — ');if(ROLE.test(b)&&!ROLE.test(a)){org=a;title=b}else if(ROLE.test(a)&&!ROLE.test(b)){title=a;org=b}else{org=a;title=b;check.push('title','org')}}
 else if(parts.length===1){const c=parts[0].match(/^(.*?),\s*(.+)$/);if(c&&ROLE.test(c[1])&&!ROLE.test(c[2])){title=c[1];org=c[2]}else if(c&&ROLE.test(c[2])&&!ROLE.test(c[1])){org=c[1];title=c[2]}else if(ROLE.test(parts[0])&&parts[0].split(' ').length<=4)title=parts[0];else{org=parts[0];check.push('title')}}
 return{title:title.trim(),org:org.trim(),location:loc,check}}
const GLYPH=/^\s*[•●▪◦‣∙·\-–*]\s*/;
const HEADS={experience:/^(work |professional |relevant |internship |research )?experience$|^employment$|^work history$/i,leadership:/^leadership( & (athletics|activities|involvement))?$|^leadership and athletics$/i,athletics:/^(athletics|varsity athletics)$/i,clubs:/^(activities|clubs|involvement|campus involvement|organizations|extracurriculars?)$/i,
 education:/^education$/i,skills:/^(technical )?skills( & \w+)?$/i,other:/^(projects?|honors|awards|summary|certifications?|interests|languages|references|coursework)$/i};
function secOf(l){const k=l.replace(/[:|]/g,'').trim();if(k.length>45||/\d/.test(k))return null;for(const h in HEADS)if(HEADS[h].test(k))return /athletics/i.test(k)&&h==='leadership'?'leadership':h;return null}
function lines(text){return String(text||'').replace(/\r/g,'').split('\n').map(l=>l.replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').trim()).filter(Boolean)}
/* experiences from EXPERIENCE / LEADERSHIP / ATHLETICS / ACTIVITIES sections */
function glue(L){const o=[];const mEnd=new RegExp('(?:[–—-]|\\b'+PT+')\\s*$','i');for(const l of L){const p=o[o.length-1];if(p&&!GLYPH.test(l)&&mEnd.test(p)&&/^((19|20)\d\d|present|current|[A-Z][a-z]{2,8}\.?\s+(19|20)\d\d)/i.test(l)&&/\d{4}|[–—-]\s*$/.test(p))o[o.length-1]=p+' '+l;else o.push(l)}return o}
const dateOnly=l=>{const d=parseDates(l);return d&&l.replace(d.raw,'').replace(/[()\s|,·–—-]/g,'')===''?d:null};
function experiences(text){const L=glue(lines(text)),out=[];let sec=null,cur=null,pend=null;
 const isHeader=(l,next)=>{if(GLYPH.test(l))return false;const d=parseDates(l);if(d&&!d.single)return true;if(d&&d.single&&/\(/.test(l))return true;
  return /\s[—–|]\s/.test(l)&&l.length<110&&!/[.;]$/.test(l)&&ROLE.test(l)};
 for(let i=0;i<L.length;i++){const l=L[i];const s=secOf(l);if(s){sec=s;cur=null;continue}
  if(!['experience','leadership','athletics','clubs'].includes(sec))continue;
  if(/^[a-z]/.test(l)&&cur&&!cur.bullets.length)continue;
  const dO=dateOnly(l);if(dO){if(cur&&!cur.start&&!cur.end&&!cur.bullets.length){cur.start=dO.start;cur.end=dO.end;cur.check=cur.check.filter(c=>c!=='dates')}continue}
  const nextDated=sec==='experience'&&!GLYPH.test(l)&&l.length<100&&!/;$|[a-z]{4,}\.$/.test(l)&&[L[i+1],L[i+2]].some(n=>n&&dateOnly(n));
  if(sec==='experience'&&!GLYPH.test(l)&&!parseDates(l)&&!ROLE.test(l)&&LOCRX.test(l)&&l.length<90&&(!cur||cur.bullets.length||cur.start)){pend=l;continue}
  if(isHeader(l)||nextDated){const d=parseDates(l);const head=d?l.replace(d.raw,' '):l;const h=splitHead(head);
   if(pend&&h.title&&(!h.org||ROLE.test(h.org)===false&&!/\s[—–|]\s/.test(head.replace(/[\s|,]+$/,''))&&h.org.split(' ').length<=3)){const ph=splitHead(pend);if(!h.org||h.title){if(h.org&&!h.title.includes(h.org))h.title=h.title+', '+h.org;h.org=ph.org||ph.title;h.location=h.location||ph.location;h.check=h.check.filter(c=>c!=='org')}}pend=null;
   cur={kind:'',title:h.title,org:h.org,location:h.location,start:d?d.start:'',end:d?d.end:'',bullets:[],check:h.check.slice(),_sec:sec};
   if(!d)cur.check.push('dates');cur.kind=classify(cur.title,cur.org,sec);out.push(cur);continue}
  if(cur&&(GLYPH.test(l)||/^[A-Z]/.test(l)&&l.split(' ').length>=4)){cur.bullets.push(l.replace(GLYPH,'').trim());continue}
  if(cur&&cur.bullets.length&&/^[a-z(0-9$]/.test(l)){cur.bullets[cur.bullets.length-1]+=' '+l;continue}
  /* short line with no dates in an activities-type section: one entry, dates left blank */
  if(sec!=='experience'&&l.length<80&&!/[.;]$/.test(l)){const h=splitHead(l);cur={kind:classify(h.title,h.org||l,sec),title:h.title||(h.org?'':l),org:h.org||'',location:h.location,start:'',end:'',bullets:[],check:['dates'].concat(h.check),_sec:sec};if(!cur.title&&!cur.org)cur.org=l;out.push(cur)}}
 out.forEach(e=>{if(e.kind==='Athletics'&&!e.title){const t=[e.org].join('');const ps=t.split(/,\s*/);const i=ps.findIndex(x=>D1.test(x)||SPORT.test(x));if(i>=0){e.title=ps[i];e.org=ps.filter((x,j)=>j!==i).join(', ')}e.check=e.check.filter(c=>c!=='title'&&c!=='org')}
  e.bullets=e.bullets.map(b=>b.replace(/\s+/g,' ').trim()).filter(b=>b.length>3);delete e._sec;e.check=[...new Set(e.check)]});return out}
/* skills: commas outside parentheses only; case-insensitive + alias dedupe */
const ALIAS={'bloomberg terminal':'bloomberg','bloomberg':'bloomberg','microsoft excel':'excel','ms excel':'excel','excel':'excel','microsoft powerpoint':'powerpoint','ms powerpoint':'powerpoint','powerpoint':'powerpoint','microsoft word':'word','ms word':'word','python 3':'python','py':'python','js':'javascript','node':'node.js','nodejs':'node.js','ms office':'microsoft office','google sheets':'google sheets','powerbi':'power bi','tableau desktop':'tableau'};
const canon=s=>{const k=s.toLowerCase().replace(/\s*\(.*?\)\s*/g,' ').replace(/\s+/g,' ').trim();return ALIAS[k]||k};
function splitOutside(s){const out=[];let d=0,b='';for(const c of s){if(c==='('||c==='[')d++;else if(c===')'||c===']')d=Math.max(0,d-1);if(d===0&&/[,;|•]/.test(c)){out.push(b);b=''}else b+=c}out.push(b);return out}
function skills(text){const L=lines(text);let sec=null;const raw=[];
 for(const l of L){const s=secOf(l);if(s){sec=s;continue}if(sec!=='skills')continue;if(/citizen|sponsorship|authorized|visa|green card/i.test(l))continue;
  splitOutside(l.replace(/^[A-Za-z &/]{2,24}:\s*/,'')).forEach(x=>{x=x.replace(GLYPH,'').trim();if(x&&x.length<48&&!/@|\d{3}/.test(x))raw.push(x)})}
 const seen=new Set(),out=[];raw.forEach(x=>{const c=canon(x);if(c&&!seen.has(c)){seen.add(c);out.push(c)}});return out}
function contact(text){const t=String(text||'');const email=(t.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)||[''])[0];
 const ph=t.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/);const phone=ph?ph[0].trim():'';
 const L=lines(t);let name='';let n0=(L[0]||'').replace(/\(.*?\)/g,'').replace(/[|•·].*$/,'').trim();if(n0&&n0===n0.toUpperCase())n0=n0.toLowerCase().replace(/(^|[\s'’-])\S/g,c=>c.toUpperCase());if(/^[A-Z][A-Za-z'’-]+(?:\s[A-Z]\.?|\s[A-Z][A-Za-z'’-]+){1,3}$/.test(n0)&&!/@|\d/.test(n0))name=n0;
 let city='',state='';for(const l of L.slice(0,4)){for(const seg of l.split(/\s*[|·•]\s*/)){const m=seg.trim().match(new RegExp('^([A-Z][a-zA-Z.\'-]+(?:\\s[A-Z][a-zA-Z.\'-]+){0,2}),\\s*('+ST+')$'));if(m){city=m[1];state=m[2];break}}if(city)break}
 return{name,email,phone,city,state}}
const MAJOR_IND=[[/finance|financial/i,'Finance & Banking'],[/accounting/i,'Accounting & Audit'],[/computer science|software/i,'Software & IT'],[/data science|analytics/i,'Data & AI'],[/marketing/i,'Marketing & Sales']];
function interestsFromMajor(major){const o=[];MAJOR_IND.forEach(([r,v])=>{if(r.test(major||''))o.push(v)});return o}
function gradYear(text){const m=String(text||'').match(/\b(?:expected|anticipated|graduat(?:ion|ing)|class of)[:\s]*(?:in\s+)?(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+|(?:spring|summer|fall|winter)\s+)?(20\d\d)\b/i);return m?m[1]:''}
function athlete(exps){return exps.some(e=>e.kind==='Athletics'&&D1.test(e.title+' '+e.org))}
function parse(text){const ex=experiences(text);return{contact:contact(text),experience:ex,skills:skills(text),gradYear:gradYear(text),d1:athlete(ex)}}
const API={parse,parseDates,splitHead,experiences,skills,contact,interestsFromMajor,gradYear,classify,canon};
if(typeof module!=='undefined'&&module.exports)module.exports=API;root.RV131=API})(typeof self!=='undefined'?self:this);
