/* V14.3 resume parser core. Input: lines from RX (resume-extract.js). Output: structured resume where every item keeps
   its source line numbers (src) and a confidence (high | medium | low). Rule: never invent. Unknown = empty.
   UMD: window/self.RC, node module. Needs RDICT (resume-dict.js). */
(function(root,f){const D=(typeof module==='object'&&module.exports)?require('./resume-dict.js'):root.RDICT;const C=f(D);if(typeof module==='object'&&module.exports)module.exports=C;else root.RC=C})(typeof self!=='undefined'?self:this,function(D){
const N=D.norm;
/* ---------- dates ---------- */
const MON={jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,jun:6,june:6,jul:7,july:7,aug:8,august:8,sep:9,sept:9,september:9,oct:10,october:10,nov:11,november:11,dec:12,december:12};
const SEA={spring:[1,5],summer:[6,8],fall:[9,12],autumn:[9,12],winter:[12,2]};
const MONR='(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?';
const YR="(?:'\\d{2}|(?:19|20)\\d{2})";
const TOK=`(?:${MONR}\\s*,?\\s*${YR}|\\d{1,2}\\s*\\/\\s*(?:19|20)\\d{2}|\\d{1,2}\\s*\\/\\s*\\d{2}(?!\\d)|(?:spring|summer|fall|autumn|winter)\\s*${YR}|(?:19|20)\\d{2})`;
const ENDW='(?:present|current|now|ongoing|today)';
const RANGE=new RegExp(`(${TOK}|${MONR})\\s*(?:–|-|to|through|until|thru)\\s*(${TOK}|${ENDW})`,'i');
const ONE=new RegExp(`(${TOK})`,'i');
function tok(s){s=s.trim().toLowerCase().replace(/\./g,'');let m;
 const y2=y=>y.startsWith("'")?2000+ +y.slice(1):+y;
 if((m=s.match(new RegExp(`^(${MONR.replace('\\.?','')})\\s*,?\\s*(${YR})$`,'i'))))return {y:y2(m[2]),m:MON[m[1].replace(/\./g,'')]||MON[m[1].slice(0,3)]};
 if((m=s.match(/^(\d{1,2})\s*\/\s*((?:19|20)\d{2})$/)))return +m[1]>=1&&+m[1]<=12?{y:+m[2],m:+m[1]}:null;
 if((m=s.match(/^(\d{1,2})\s*\/\s*(\d{2})$/)))return +m[1]>=1&&+m[1]<=12?{y:2000+ +m[2],m:+m[1]}:null;
 if((m=s.match(new RegExp(`^(spring|summer|fall|autumn|winter)\\s*(${YR})$`,'i'))))return {y:y2(m[2]),season:m[1]};
 if((m=s.match(/^((?:19|20)\d{2})$/)))return {y:+m[1]};
 if((m=s.match(new RegExp(`^(${MONR.replace('\\.?','')})$`,'i'))))return {m:MON[m[1]]||MON[m[1].slice(0,3)]};
 return null}
const ym=(y,m)=>y+(m?'-'+String(m).padStart(2,'0'):'');
function parseRange(text,today){/* -> {start,end,cur,months,raw,index,len} or null */
 let m=text.match(RANGE);
 if(m){let a=tok(m[1]),b=/^(present|current|now|ongoing|today)$/i.test(m[2])?'P':tok(m[2]);if(!a||!b)return null;
  if(b!=='P'&&a.m&&!a.y&&b.y)a.y=b.y; if(!a.y)return null;
  let sm=a.m,em=b==='P'?null:b.m;if(a.season)sm=SEA[a.season][0];if(b!=='P'&&b.season)em=SEA[b.season][1];
  const ey=b==='P'?null:(b.season==='winter'?b.y+1:b.y);
  const r={start:ym(a.y,sm),end:b==='P'?'Present':ym(ey,em),cur:b==='P',raw:m[0].trim(),index:m.index,len:m[0].length};r.months=months(r,today);return r}
 m=text.match(ONE);if(!m)return null;const a=tok(m[1]);if(!a||!a.y)return null;
 if(a.season){const [s,e]=SEA[a.season];const r={start:ym(a.y,s),end:ym(a.season==='winter'?a.y+1:a.y,e),cur:false,raw:m[0].trim(),index:m.index,len:m[0].length,single:true};r.months=months(r,today);return r}
 const r={start:ym(a.y,a.m),end:ym(a.y,a.m),cur:false,raw:m[0].trim(),index:m.index,len:m[0].length,single:true};r.months=a.m?1:null;return r}
function months(r,today){const p=s=>{const m=String(s).match(/^(\d{4})(?:-(\d{2}))?$/);return m?{y:+m[1],m:m[2]?+m[2]:null}:null};const a=p(r.start);let b;
 if(r.cur){const t=today||new Date();b={y:t.getFullYear(),m:t.getMonth()+1}}else b=p(r.end);if(!a||!b||!a.m||!b.m)return null;return (b.y-a.y)*12+(b.m-a.m)+1}
/* ---------- regex helpers ---------- */
const EMAIL=/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE=/(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;
const LINKEDIN=/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+\/?/i,GITHUB=/(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+\/?/i;
const URL=/(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.(?:com|io|dev|me|net|org|co|site|app|xyz)(?:\/[\w\-./]*)?/i;
const ST='AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|PR';
const COUNTRIES='United States|USA|Canada|United Kingdom|UK|England|Scotland|Ireland|France|Spain|Italy|Germany|Netherlands|Switzerland|Australia|Japan|China|Hong Kong|Singapore|India|South Korea|Korea|Mexico|Brazil|Argentina|Chile|Peru|Colombia|Israel|Denmark|Sweden|Norway|Portugal|Greece|Czech Republic|Austria|Belgium|UAE|United Arab Emirates|Kenya|Nigeria|South Africa|Ghana|Vietnam|Philippines|Thailand|Indonesia|Taiwan|New Zealand';
const LOC=new RegExp(`\\b([A-Z][A-Za-z.'-]+(?:[ -][A-Z][A-Za-z.'-]+){0,3}),\\s*(${ST}|${COUNTRIES})\\b(?:\\s+\\d{5})?|\\b(Remote|Hybrid|Virtual)\\b`);
const SCHOOLW=/\b(university|college|institute|school of|polytechnic|academy|conservatory|community college|high school|preparatory|prep school|secondary school|universidad|université|universit[àa]|hochschule)\b/i;
const ROLE=/\b(intern(ship)?|co-?op|summer (analyst|associate|intern|scholar|fellow|analyst intern)|analyst|associate|assistant|engineer|developer|programmer|manager|director|president|vice[- ]president|vp|treasurer|secretary|chair(man|woman|person)?|co-?chair|member|captain|co-?captain|coordinator|consultant|representative|rep|specialist|lead|leader|fellow|tutor|server|waiter|waitress|cashier|barista|bartender|host(ess)?|volunteer|founder|co-?founder|owner|officer|editor(-in-chief)?|writer|reporter|researcher|counselor|lifeguard|mentor|ambassador|student[- ]athlete|athlete|player|starter|coach|technician|aide|scribe|nurse|designer|scientist|trainee|apprentice|advisor|adviser|head|partner|chief|ceo|coo|cfo|cto|cmo|delegate|organizer|instructor|teacher|clerk|crew|team member|recruiter|planner|auditor|accountant|administrator|operator|contributor|participant|competitor|finalist|semifinalist|winner|cadet|midshipman|sergeant|lieutenant|ensign|specialist|brother|sister|pledge|staff|worker|laborer|caddie|babysitter|nanny|receptionist|attendant|associate|ta|ra|grader|marshal|liaison|historian|webmaster|photographer|producer|anchor|dj|programmer|strategist|marketer|sales|salesperson|courier|driver|dishwasher|busser|cook|chef|stocker|merchandiser|teller|guide|docent|camp counselor|scorekeeper|referee|umpire|official|steward|swimmer|runner|rower|golfer|goalkeeper|pitcher|midfielder|defender|forward|guard|catcher|outfielder|infielder|sprinter|diver|wrestler|fencer)\b/i;
const ORGW=/\b(inc|llc|llp|ltd|corp|corporation|company|co|group|partners|capital|bank|bancorp|holdings|associates|advisors|advisory|securities|management|fund|foundation|institute|university|college|school|hospital|health|healthcare|medical|center|centre|clinic|club|society|association|council|fraternity|sorority|chapter|team|lab|laboratory|labs|department|agency|studio|studios|technologies|technology|systems|solutions|consulting|ventures|network|federation|league|church|camp|restaurant|cafe|café|bakery|market|store|shop|grill|kitchen|athletics|program|initiative|project|committee|government|office|services|enterprises|industries|motors|airlines|energy|pharmaceuticals|insurance|financial|investments|realty|properties|press|magazine|journal|times|post|news|daily|review|records|media|marketing|design|works|nyc|usa|america|global|international|worldwide|corps|army|navy|air force|marine|guard|rotc|habitat|united way|ymca|red cross|nonprofit|non-profit|hackathon|competition|challenge)\b/i;
const MAJORS=['Accounting','Actuarial Science','Advertising','Aerospace Engineering','African American Studies','Agricultural Economics','Agriculture','American Studies','Anthropology','Applied Mathematics','Architecture','Art History','Asian Studies','Astronomy','Astrophysics','Athletic Training','Biochemistry','Bioengineering','Biology','Biomedical Engineering','Biomedical Sciences','Biostatistics','Business','Business Administration','Business Analytics','Business Economics','Chemical Engineering','Chemistry','Civil Engineering','Classics','Cognitive Science','Communication','Communications','Communication Studies','Comparative Literature','Computer Engineering','Computer Science','Construction Management','Criminal Justice','Criminology','Cybersecurity','Dance','Data Science','Design','Digital Media','Early Childhood Education','Earth Science','Economics','Education','Electrical Engineering','Electrical and Computer Engineering','Elementary Education','Engineering','Engineering Science','English','Entrepreneurship','Environmental Engineering','Environmental Science','Environmental Studies','Exercise Science','Film','Film Studies','Finance','Financial Engineering','Fine Arts','French','Gender Studies','Geography','Geology','German','Global Studies','Graphic Design','Health Administration','Health Policy','Health Sciences','History','Hospitality Management','Human Resources','Industrial Engineering','Industrial and Systems Engineering','Information Science','Information Systems','Information Technology','International Business','International Relations','International Studies','Journalism','Kinesiology','Latin American Studies','Linguistics','Management','Management Information Systems','Marketing','Materials Science','Materials Science and Engineering','Mathematics','Math','Mechanical Engineering','Media Studies','Microbiology','Music','Neuroscience','Nursing','Nutrition','Operations Management','Operations Research','Philosophy','Physics','Political Science','Psychology','Public Health','Public Policy','Real Estate','Religious Studies','Risk Management','Sociology','Software Engineering','Spanish','Sport Management','Statistics','Supply Chain Management','Sustainability','Theater','Urban Planning','Urban Studies','Women\'s Studies'];
const MAJN=new Map(MAJORS.map(m=>[N(m),m]));
const CAPS=t=>/[A-Z]/.test(t)&&t===t.toUpperCase();
const tc=s=>s.toLowerCase().replace(/(^|[\s\-'(])([a-z])/g,(m,a,b)=>a+b.toUpperCase()).replace(/\b(Of|And|In|At|The|For|To|On)\b/g,w=>w.toLowerCase()).replace(/^./,c=>c.toUpperCase()).replace(/\bMc([a-z])/g,(m,c)=>'Mc'+c.toUpperCase());
/* ---------- sections ---------- */
const KW=[['education',/\beducation|academic/],['experience',/\bexperience|employment|work history|career/],['leadership',/\bleadership|activities|involvement|extracurricular|organizations|affiliations/],['skills',/\bskills|competencies|proficienc|technologies|tools\b/],['certifications',/\bcertif|licens/],['projects',/\bprojects?\b/],['research',/\bresearch\b/],['publications',/\bpublications?|presentations\b/],['volunteer',/\bvolunteer|community service|community involvement/],['athletics',/\bathlet|sports?\b/],['honors',/\bawards?|honors?\b|achievements|scholarships/],['languages',/\blanguages?\b/],['interests',/\binterests|hobbies/],['coursework',/\bcoursework\b/],['summary',/\bsummary|objective|profile\b/]];
const NSK=x=>x.replace(/&|\band\b/g,'').replace(/[\s/]+/g,'');const SECTNS={};for(const k in D.SECT){SECTNS[NSK(k)]=D.SECT[k];SECTNS[k.replace(/[\s/]+/g,'')]=D.SECT[k]}
function headingKey(l,afterFirst,curKey){let t=l.t.replace(/\t.*$/,'').replace(/[:|•\-–_=*#]+$/,'').replace(/^[:|•\-–_=*#\s]+/,'').trim();if(!t||t.length>52||/@|\d{3}|https?:/.test(t)||l.b)return null;
 const k=t.toLowerCase().replace(/\s+/g,' ');if(/\t/.test(l.t)&&!(CAPS(t)||l.h))return null;if(curKey&&/^(skills|interests|languages|certifications|contact|coursework|honors)$/.test(curKey)&&!(CAPS(t)||l.h))return null;if(D.SECT[k])return D.SECT[k];const k2=k.replace(/&/g,'and');if(D.SECT[k2])return D.SECT[k2];if(CAPS(t)&&!/\s/.test(t)&&t.length>=6){const k3=k.replace(/&/g,'');if(SECTNS[k3])return SECTNS[k3]}
 const words=t.split(/\s+/);if(words.length>6||/,/.test(t))return null;
 const shaped=CAPS(t)||l.h;if(!shaped)return null;if(ROLE.test(t)&&!/\b(leadership|experience|activities|skills)\b/i.test(t))return null;
 for(const [key,re] of KW)if(re.test(k))return key;
 return (l.h&&afterFirst&&CAPS(t))?'other':null}
function sections(L){const S=[];let cur={key:'header',start:0,lines:[]};let seen=0;
 L.forEach((l,i)=>{const k=headingKey(l,seen>0,cur.key);if(k){if(cur.lines.length||cur.key!=='header')S.push(cur);cur={key:k,start:i,head:i,lines:[]};seen++}else cur.lines.push(i)});S.push(cur);
 return {S,seen}}
/* no headings: classify gap-separated blocks by their content */
function blockSections(L){const B=[];let cur=[];const YR=/\b(19|20)\d{2}\b|present/i,LAB=/^[A-Za-z][\w &/]{1,25}:\s/;
 /* without spacing information (e.g. a .docx with no paragraph gaps) fall back to content breaks */
 const soft=!L.some((l,i)=>i>1&&l.gap);
 L.forEach((l,i)=>{let brk=l.gap&&cur.length;
  if(soft&&cur.length&&!l.b&&i>1){const p=L[i-1],nx=L[i+1];
   if(cur.length&&cur[0]<2&&i>=2&&!EMAIL.test(l.t)&&!PHONE.test(l.t))brk=true;
   else if(p.b)brk=true;
   else if(LAB.test(l.t)&&!LAB.test(p.t)&&cur.length>1&&!/^(gpa|cumulative|major|minor|relevant|coursework|honors|awards|concentration|thesis|study abroad)/i.test(l.t))brk=true;
   else if(cur.length>=2&&nx&&!nx.b&&YR.test(nx.t)&&!YR.test(l.t)&&cur.some(j=>YR.test(L[j].t))&&!LAB.test(l.t))brk=true}
  if(brk){B.push(cur);cur=[]}cur.push(i)});if(cur.length)B.push(cur);
 return B.map(b=>b.filter(i=>!headingKey(L[i],true)||L[i].b)).filter(b=>b.length).map((b,bi)=>{const txt=b.map(i=>L[i].t).join('\n');let key='other';
  if(bi===0&&(EMAIL.test(txt)||PHONE.test(txt)))key='header';
  else if(SCHOOLW.test(txt)&&(/\b(gpa|bachelor|b\.?s\.?|b\.?a\.?|major|minor|expected|graduat|class of)\b/i.test(txt)))key='education';
  else if(/^(skills|technical|languages|software|tools|certifications?|interests)\s*:/im.test(txt)&&!b.some(i=>L[i].b))key='skills';
  else if(b.some(i=>L[i].b)||RANGE.test(txt))key='experience';
  return {key,start:b[0],lines:b,auto:true}})}
/* ---------- school matching ---------- */
let CIDX=null;
function collegeIndex(C){if(CIDX&&CIDX.src===C)return CIDX;const byN=new Map(),al=new Map(),tokIdx=new Map();
 const key=s=>N(s).replace(/\bthe\b/g,'').replace(/\buniv\b/g,'university').replace(/\bst\b/g,'saint').replace(/\s+/g,' ').trim();
 (C.schools||[]).forEach((s,i)=>{const k=key(s.n);byN.set(k,i);const k2=key(s.n.replace(/-Main Campus$|-Main$| Campus Immersion$/,''));if(!byN.has(k2))byN.set(k2,i);
  const k3=key(s.n.replace(/-([A-Za-z ]+)$/,' $1'));if(!byN.has(k3))byN.set(k3,i);const k4=key(s.n.replace(/-([A-Za-z ]+)$/,' at $1'));if(!byN.has(k4))byN.set(k4,i);
  (s.a||[]).forEach(a=>{const ak=key(a);if(ak.length<3)return;if(!al.has(ak))al.set(ak,new Set());al.get(ak).add(i)});
  new Set(k.split(' ')).forEach(t=>{if(t.length<3)return;if(!tokIdx.has(t))tokIdx.set(t,[]);tokIdx.get(t).push(i)})});
 const nameIdx=new Map((C.schools||[]).map((s,i)=>[s.n,i]));
 for(const a in (C.aliases||{})){const ak=key(a);const set=new Set(C.aliases[a].map(n=>nameIdx.get(n)).filter(x=>x!=null));al.set(ak,set)}
 CIDX={src:C,byN,al,tokIdx,key,S:C.schools};return CIDX}
function matchSchool(raw,C,ctx){if(!C||!C.schools)return {school:'',cands:[],conf:'low'};const I=collegeIndex(C);let k=I.key(raw);if(!k)return {school:'',cands:[],conf:'low'};
 const tries=[k,k.replace(/ (?:main )?campus$/,''),k.replace(/^(.*?) (?:at )?([a-z ]+)$/,'$1 $2')];
 const m1=raw.match(/^(.+?),\s*([A-Z][A-Za-z ]+)$/);if(m1)tries.push(I.key(m1[1]+' at '+m1[2]),I.key(m1[1]+' '+m1[2]),I.key(m1[1]));
 const m2=raw.match(/^(.+?)\s+[–-]\s+([A-Z][A-Za-z ]+)$/);if(m2)tries.push(I.key(m2[1]+' at '+m2[2]),I.key(m2[1]+' '+m2[2]));
 for(const t of tries){if(I.byN.has(t))return {school:I.S[I.byN.get(t)].n,cands:[],conf:'high'};
  if(I.al.has(t)){const c=[...I.al.get(t)];if(c.length===1)return {school:I.S[c[0]].n,cands:[],conf:'high'};
   /* ambiguous: never auto-pick. Context (state) only orders the choices. */
   const st=ctx&&ctx.state;c.sort((a,b)=>(I.S[b].s===st)-(I.S[a].s===st));return {school:'',cands:c.map(i=>I.S[i].n),conf:'low',ambiguous:true}}}
 /* fuzzy: token overlap; only accept a clear single winner */
 const toks=[...new Set(k.split(' ').filter(t=>t.length>=3&&!['university','college','the','and','school','institute','state','saint','community','technology'].includes(t)))];if(!toks.length)return {school:'',cands:[],conf:'low'};
 const sc=new Map();toks.forEach(t=>(I.tokIdx.get(t)||[]).forEach(i=>sc.set(i,(sc.get(i)||0)+1)));
 const all=new Set(k.split(' '));const ranked=[...sc.entries()].map(([i,n])=>{const nt=new Set(I.key(I.S[i].n).split(' '));const inter=[...all].filter(t=>nt.has(t)).length;return [i,n,inter/Math.max(all.size,nt.size)]}).filter(r=>r[1]===toks.length&&r[2]>=0.6).sort((a,b)=>b[2]-a[2]);
 if(ranked.length===1||(ranked.length>1&&ranked[0][2]-ranked[1][2]>=0.2&&ranked[0][2]>=0.75))return {school:I.S[ranked[0][0]].n,cands:ranked.slice(0,4).map(r=>I.S[r[0]].n),conf:'medium'};
 if(ranked.length)return {school:'',cands:ranked.slice(0,6).map(r=>I.S[r[0]].n),conf:'low',ambiguous:true};
 return {school:'',cands:[],conf:'low'}}
/* ---------- education ---------- */
const GPA=/\b(?:(major|cumulative|overall|in-major|departmental)\s+)?G\.?P\.?A\.?\s*(?:\(([^)]*)\))?\s*[:=\-–]?\s*(\d\.\d{1,3}|\d{1,2}(?:\.\d{1,2})?(?=\s*\/\s*\d))\s*(?:\/\s*(\d{1,3}(?:\.\d{1,2})?)|out of\s*(\d(?:\.\d+)?))?/ig;
const GPA2=/\b(\d\.\d{1,3})\s*(?:\/\s*(\d(?:\.\d+)?))?\s+(cumulative|overall|major)?\s*G\.?P\.?A\b/ig;
function eduEntries(lines,L){const groups=[];let cur=null;
 lines.forEach(i=>{const t=L[i].t;const isAbroad=/\b(study abroad|exchange|semester abroad|visiting student|abroad program)\b/i.test(t);
  const hasSchool=!L[i].b&&(SCHOOLW.test(t)||schoolAliasLine(t))&&!/^(relevant )?coursework|^honors|^awards|^activities|^organizations|^clubs|^societies/i.test(t)&&!/^(minor|major|concentration)s?\b/i.test(t)&&!/^(high school diploma|diploma|bachelor|master|associate|doctor|B\.?S\.?\b|B\.?A\.?\b|M\.?S\.?\b|MBA)/i.test(t);
  if(hasSchool&&!isAbroad&&(!cur||cur.hasSchool&&cur.lines.length>0)){cur={lines:[i],hasSchool:true};groups.push(cur)}
  else{if(!cur){cur={lines:[],hasSchool:false};groups.push(cur)}cur.lines.push(i)}});
 return groups.filter(g=>g.hasSchool||g.lines.some(i=>D.DEGREES.some(d=>d[1].test(L[i].t))))}
const ALIAS_LINE=/^(MIT|NYU|UCLA|USC|UNC|UVA|UIUC|CMU|Penn State|Georgia Tech|Virginia Tech|Texas A&M|UT Austin|UC Berkeley|Baruch|WashU|Rutgers|Purdue|Notre Dame|Duke|Emory|Rice|Babson|Bentley|Villanova|Fordham|Georgetown|Vanderbilt|Northeastern|Northwestern|Cornell|Harvard|Yale|Princeton|Stanford|Brown|Dartmouth|Lehigh|Bucknell|Syracuse|Tufts|Wharton|Queens|Miami|Cal Poly)\b/;
const schoolAliasLine=t=>ALIAS_LINE.test(t.trim());
function majorsFrom(s){s=s.replace(/\s*\((?:[^)]*)\)/g,'').replace(/[.;]+$/,'').trim();if(!s)return [];if(MAJN.has(N(s)))return [MAJN.get(N(s))];
 const parts=s.split(/\s*(?:,|&|\band\b|\/|\+)\s*/i).map(x=>x.trim()).filter(Boolean);if(parts.length>1&&parts.every(p=>MAJN.has(N(p))))return parts.map(p=>MAJN.get(N(p)));
 if(s.split(/\s+/).length<=6&&!/\d/.test(s))return [s];return []}
function parseEdu(g,L,C,ctx,today){const src=g.lines.slice();const ls=g.lines.map(i=>L[i].t);const all=ls.join('\n');const e={school:'',schoolRaw:'',candidates:[],level:'',degree:'',majors:[],minors:[],concentrations:[],gpa:'',gpaScale:'',majorGpa:'',gradMonth:'',gradYear:'',start:'',classYear:'',honors:[],coursework:[],studyAbroad:[],tests:[],location:'',src,conf:{}};
 /* school text */
 const sl=g.hasSchool?ls[0]:'';if(sl){const segs=sl.split(/\t|\s+\|\s+|\s+[–—]\s+|\s+·\s+|;\s+/).map(s=>s.trim()).filter(Boolean);
  let seg=segs.find(s=>SCHOOLW.test(s)||schoolAliasLine(s))||segs[0];let loc='';
  const lm=seg.match(new RegExp(`^(.*?),\\s*([A-Z][A-Za-z .'-]+),\\s*(${ST})$`));if(lm){seg=lm[1];loc=lm[2]+', '+lm[3]}
  const lm2=seg.match(new RegExp(`^(.*?)\\s*,\\s*(${ST})$`));if(!lm&&lm2){seg=lm2[1];loc=lm2[2]}
  seg=seg.replace(/\s*\((?:transfer(?:red)?|study abroad|exchange)[^)]*\)/i,'').replace(/\s+[–-]\s*$/,'').trim();
  /* strip a trailing date that shares the segment */
  seg=seg.replace(new RegExp(`\\s*,?\\s*(expected|anticipated)?\\s*(${TOK})(\\s*(–|-|to)\\s*(${TOK}|present))?\\s*$`,'i'),'').trim();
  const degIn=D.DEGREES.find(d=>d[2]!=='hs'&&d[1].test(seg));if(degIn&&!SCHOOLW.test(seg.slice(0,seg.search(degIn[1]))))seg=seg;
  e.schoolRaw=seg;if(!loc){const l2=segs.find(s=>s!==seg&&LOC.test(s)&&!SCHOOLW.test(s));if(l2)loc=l2.match(LOC)[0]}e.location=loc;
  const hs=/\b(high school|preparatory|prep school|secondary school|academy)\b/i.test(seg)&&!/\b(university|college|naval academy|military academy|air force academy|coast guard academy)\b/i.test(seg);
  if(hs){e.level='hs';e.school=seg;e.conf.school='high'}
  else{const st=(loc.match(new RegExp(`(${ST})$`))||[])[1]||ctx.state;const m=matchSchool(seg,C,{state:st});e.school=m.school;e.candidates=m.cands;e.conf.school=m.school?m.conf:'low';if(m.ambiguous)e.ambiguous=true}}
 /* degree, majors */
 const body=all;let dg=null,dm=null;for(const d of D.DEGREES){if(d[2]==='hs')continue;const m=body.match(d[1]);if(m&&(!dm||m.index<dm.index)){dg=d;dm=m}}
 if(dg){e.degree=dg[0];e.level=e.level||dg[2];e.conf.degree='high'}else if(e.level==='hs'){e.degree='High School Diploma';e.conf.degree=/diploma/i.test(body)?'high':'medium'}
 const cut=s=>s.split(/\t|\s+\|\s+|;|\s+[–—]\s+|\bGPA\b|\(|\bminors?\b|\bconcentrations?\b|\bexpected\b|\banticipated\b|\bgraduat|\bdouble major\b|\bwith\b|\btrack\b|\bhonors\b/i)[0].replace(new RegExp(`\\s*,?\\s*${TOK}.*$`,'i'),'').replace(/[,.;:\s]+$/,'').trim();
 const mm=body.match(/\b(?:double\s+)?majors?\s*(?:in|:)\s*([^\n]+)/i);
 if(dg&&dm){let after=body.slice(dm.index+dm[0].length).split('\n')[0];after=after.replace(/^\s*(?:degree\s+)?(?:in|of|,|–|-|:)\s*/i,'');
  let mj=majorsFrom(cut(after));if(!mj.length&&mm)mj=majorsFrom(cut(mm[1]));
  const dbl=body.match(/\bdouble major\b[^\n]*?\b(?:in\s+)?([A-Z][A-Za-z ]+?)(?:\s+and\s+|\s*&\s*)([A-Z][A-Za-z ]+)/);if(dbl&&!mj.length)mj=majorsFrom(dbl[1]+' and '+dbl[2]);
  const dbl2=body.match(/\b(?:second|double)\s+major\s*(?:in|:)\s*([A-Z][A-Za-z ]+)/i);if(dbl2&&mj.length===1){const x=majorsFrom(cut(dbl2[1]));x.forEach(v=>{if(!mj.includes(v))mj.push(v)})}
  e.majors=mj;e.conf.majors=mj.length?(mj.every(m=>MAJN.has(N(m)))?'high':'medium'):'low'}
 else if(mm){e.majors=majorsFrom(cut(mm[1]));e.conf.majors='medium'}
 const mn=body.match(/\bminors?\s*(?:in|:)?\s*([A-Z][^\n|;(\t]+)/i);if(mn){const v=cut(mn[1]).split(/\s*(?:,|&|\band\b)\s*/).filter(Boolean).filter(x=>x.split(' ').length<=5);e.minors=v}
 const cc=body.match(/\b(?:concentrations?|specialization|track|emphasis)\s*(?:in|:)\s*([A-Z][^\n|;(\t]+)/i);if(cc)e.concentrations=cut(cc[1]).split(/\s*(?:,|&|\band\b)\s*/).filter(Boolean);
 /* GPA: explicit only */
 let m;GPA.lastIndex=0;while((m=GPA.exec(body))){const lab=(m[1]||m[2]||'').toLowerCase();const v=+m[3],sc=m[4]?+m[4]:(m[5]?+m[5]:null);if(!(v>0))continue;if(sc&&v>sc)continue;if(!sc&&v>4.0)continue;
  if(/major|department/.test(lab)){if(!e.majorGpa)e.majorGpa=m[3]}else if(!e.gpa){e.gpa=m[3];e.gpaScale=sc?String(sc).replace(/\.0+$/,'.0'):'';if(e.gpaScale&&!/\./.test(e.gpaScale))e.gpaScale+='.0'}}
 GPA2.lastIndex=0;while((m=GPA2.exec(body))){if(/major/i.test(m[3]||'')){if(!e.majorGpa)e.majorGpa=m[1]}else if(!e.gpa){e.gpa=m[1];e.gpaScale=m[2]?(/\./.test(m[2])?m[2]:m[2]+'.0'):''}}
 if(e.gpa)e.conf.gpa='high';
 /* graduation */
 const gl=ls.map(t=>t);let grad=null;
 for(const t of gl){const x=t.replace(/\bGPA\b[^\t|;]*/ig,'');let r=x.match(/\bclass of\s*((?:19|20)\d{2})/i);if(r){grad={y:+r[1],m:null,how:'classof'};break}
  r=x.match(new RegExp(`\\b(?:expected|anticipated|graduat(?:ion|ing|ed)|grad\\.?|degree expected|conferred)\\s*(?:date)?\\s*:?\\s*(?:in\\s+)?(${TOK})`,'i'));if(r){const k=tok(r[1]);if(k&&k.y){grad={y:k.y,m:k.season?({spring:5,summer:8,fall:12,autumn:12,winter:12})[k.season]:k.m||null,how:'label'};break}}}
 if(!grad){for(const t of gl){const x=t.replace(/\bGPA\b[^\t|;]*/ig,'');const r=parseRange(x,today);if(r&&!r.single&&!r.cur){const p=r.end.split('-');grad={y:+p[0],m:p[1]?+p[1]:null,how:'range',start:r.start};break}if(r&&r.cur){e.start=r.start;grad=null;break}}}
 if(!grad){for(const t of (g.hasSchool?gl:gl)){const x=t.replace(/\bGPA\b[^\t|;]*/ig,'');const r=parseRange(x,today);if(r&&r.single){const k=tok(r.raw);if(k&&k.y){grad={y:k.y,m:k.season?({spring:5,summer:8,fall:12,autumn:12,winter:12})[k.season]:k.m||null,how:'single'};break}}}}
 if(grad){e.gradYear=String(grad.y);e.gradMonth=grad.m?String(grad.m):'';if(grad.start)e.start=grad.start;e.conf.grad=grad.how==='single'?'medium':'high'}
 /* derived class year: academic year containing today vs grad academic year */
 if(e.gradYear){const t=today||new Date();const ay=t.getFullYear()+((t.getMonth()+1)>=7?1:0);const gy=+e.gradYear+((+e.gradMonth||5)>=9?1:0);const d=gy-ay;
  e.classYear=e.level==='grad'?'Graduate':e.level==='hs'?'':d<0?'Graduated':d===0?'Senior':d===1?'Junior':d===2?'Sophomore':d===3?'Freshman':d>3?'Incoming':'';}
 /* honors, coursework, tests, study abroad */
 for(const t of ls){const c=t.match(/^\s*(?:relevant\s+|related\s+|selected\s+)?(?:coursework|courses)\s*:\s*(.+)$/i);if(c)e.coursework.push(...c[1].split(/\s*[,;]\s*/).map(s=>s.replace(/\.$/,'').trim()).filter(Boolean));
  const h=t.match(/^\s*(?:honors|awards|honors\s*(?:&|and)\s*awards|scholarships?)\s*:\s*(.+)$/i);if(h)e.honors.push(...h[1].split(/\s*[,;]\s*/).filter(Boolean));
  else{if(/\bdean'?s list\b/i.test(t)&&!e.honors.some(x=>/dean/i.test(x)))e.honors.push((t.match(/dean'?s list[^,;|\t]*/i)||[''])[0].trim());
   const lat=t.match(/\b(summa|magna)?\s*cum laude\b/i);if(lat)e.honors.push(lat[0].trim())}
  const ab=t.match(/\b(study abroad|exchange program|semester abroad|exchange student|visiting student)\b/i);if(ab)e.studyAbroad.push(t.replace(/\t/g,' | ').trim());
  const ts=[...t.matchAll(/\b(SAT|ACT|GMAT|GRE|LSAT|MCAT)\s*(?:score)?\s*:?\s*(\d{2,4})\b/g)];ts.forEach(x=>e.tests.push(x[1]+' '+x[2]))}
 return e}
/* ---------- experience ---------- */
const TYPE_RULES=[
 ['Varsity athlete',/\b(varsity|ncaa|division (i{1,3}|1|2|3)\b|d-?(i{1,3}|1|2|3)\b|naia|student[- ]athlete|collegiate (athlete|team))\b/i],
 ['Club athlete',/\bclub (soccer|basketball|lacrosse|rugby|hockey|volleyball|tennis|baseball|softball|swim|swimming|track|running|rowing|crew|ultimate|golf|sport|sports)\b|\bintramural\b/i],
 ['Military / ROTC',/\b(rotc|army|navy|marine corps|marines|air force|national guard|coast guard|military|cadet|midshipman)\b/i],
 ['Greek life',/\b(fraternity|sorority|panhellenic|interfraternity|greek life|(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)\s+(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega))\b/i],
 ['Student investment fund',/\b(student[- ]managed (investment )?fund|smif|investment fund|student investment (fund|group|club)|investment club|investment group|investment association|equity research club|value investing)\b/i],
 ['Case competition',/\bcase (competition|challenge)\b/i],['Stock pitch competition',/\b(stock pitch|pitch competition|investment competition|stock competition)\b/i],
 ['Hackathon',/\bhack(athon|[A-Z]\w+|\s?(nyu|mit|harvard|princeton|penn|ny|duke))\b|\bhackathon\b/i],['Open source',/\bopen[- ]source\b|\bcontributor\b.*\bgithub\b/i],
 ['Founder / own business',/\b(founder|co-?founder|owner|self-employed small business|founded)\b/i],['Freelance',/\b(freelance|freelancer|self-employed|independent contractor|contract (designer|developer|writer))\b/i],
 ['Family business',/\bfamily(-owned| owned)? business\b|\bfamily (restaurant|firm|company|store|farm)\b/i],
 ['Co-op',/\bco-?op\b/i],['Internship',/\b(intern|internship|summer (analyst|associate|scholar|fellow)|externship|extern)\b/i],
 ['Research assistant',/\b(research (assistant|intern|fellow|associate|aide)|undergraduate research(er)?|lab (assistant|member|technician)|research)\b/i],
 ['Teaching assistant',/\b(teaching assistant|teaching fellow|\bta\b|course assistant|grader|learning assistant|peer tutor|undergraduate assistant)\b/i],
 ['Service job',/\b(server|waiter|waitress|barista|bartender|cashier|host(ess)?|busser|dishwasher|line cook|cook|lifeguard|retail|sales associate|sales floor|stock(er| associate)|delivery|driver|caddie|camp counselor|nanny|babysitter|valet|crew member|team member|front desk|receptionist|grocery|restaurant|cafe|café|coffee|pizza|dining|starbucks|chipotle|target|walmart|trader joe'?s|whole foods|mcdonald'?s|costco)\b/i],
 ['Volunteer',/\b(volunteer|volunteered|community service|habitat for humanity|food bank|soup kitchen|red cross|big brothers|big sisters|americorps|mentor program|pro bono)\b/i]];
const LEADT=/\b(president|vice[- ]president|vp|treasurer|secretary|chair|co-?chair|director|captain|co-?captain|head|lead|leader|officer|founder|co-?founder|editor-in-chief|managing editor|chief|ceo|coo|cfo|cto|coordinator|manager|chairman|chairwoman|chairperson|organizer|board member|executive|representative|delegate|ambassador)\b/i;
function classify(x,sec){const hay=(x.title+' | '+x.org+' | '+(x.header||'')).trim(),bul=x.bullets.join(' ');
 if(sec==='athletics')return /\bclub\b|intramural/i.test(hay)?'Club athlete':'Varsity athlete';
 if(sec==='publications')return 'Publication';
 for(const [t,re] of TYPE_RULES){if(t==='Research assistant'&&!(/research/i.test(x.title)||/\blab\b/i.test(x.org)||sec==='research'))continue;
  if(t==='Founder / own business'&&!/\b(founder|co-?founder|owner)\b/i.test(x.title))continue;
  if(t==='Service job'&&!(re.test(x.title)||(re.test(x.org)&&!ROLE.test(x.title))||(re.test(x.org)&&/\b(server|associate|crew|team member|cashier|barista|host)\b/i.test(x.title))))continue;
  if(t==='Volunteer'&&!(re.test(x.title)||re.test(x.org)||sec==='volunteer'))continue;
  if(t==='Internship'&&!re.test(x.title))continue;
  if(t==='Co-op'&&!re.test(x.title))continue;
  if(t==='Teaching assistant'&&!re.test(x.title))continue;
  if(t==='Military / ROTC'&&!re.test(hay))continue;
  if(t==='Family business'&&re.test(bul))return t;
  if(re.test(hay))return t}
 if(sec==='volunteer')return 'Volunteer';
 if(sec==='projects')return /\bopen[- ]source\b/i.test(hay+bul)?'Open source':/hackathon/i.test(hay+bul)?'Hackathon':'Project';
 if(sec==='research')return /\b(published|journal|proceedings|conference paper)\b/i.test(hay)?'Publication':'Research assistant';
 if(sec==='leadership'||ORGW.test(x.org)&&/\b(club|society|association|council|chapter|organization|team|committee|union|league|fund|group)\b/i.test(x.org)&&(/\bstudent|university|college|campus|undergraduate\b/i.test(hay)||sec==='leadership'||sec==='activities'||/^(member|general member|active member|.*(president|treasurer|secretary|chair|captain|officer|vp)\b.*)$/i.test(x.title)&&!/\b(inc|llc|corp|hospital|bank|foundation|company)\b/i.test(x.org)))return LEADT.test(x.title)?'Club leadership':'Club member';
 if(/\bpart[- ]time\b/i.test(hay))return 'Part-time job';
 return 'Job'}
const KIND=Object.fromEntries(D.TYPES);
function athlete(x){const h=x.title+' '+x.org+' '+(x.header||'')+' '+x.bullets.join(' ');const sp=D.SPORTS.slice().sort((a,b)=>b.length-a.length).find(s=>new RegExp('\\b'+s.replace(/[&]/g,'\\&')+'\\b','i').test(h))||'';
 const lv=(h.match(/\b(NCAA )?Division (I{1,3}|1|2|3)\b|\bD-?(I{1,3}|1|2|3)\b|\bNAIA\b|\bNJCAA\b|\bclub\b|\bvarsity\b|\bJV\b|\bintramural\b/i)||[''])[0];
 return {sport:sp?tc(sp):'',level:lv?lv.replace(/^d-?/i,'Division ').replace(/\b1\b/,'I').replace(/\b2\b/,'II').replace(/\b3\b/,'III').replace(/^ncaa /i,'NCAA ').replace(/^(varsity|club|intramural)$/i,s=>tc(s)):'',captain:/\b(co-?)?captain\b/i.test(h),years:x.months?Math.round(x.months/12*10)/10:null}}
function splitHeader(H,sec){/* H: header lines (text). Returns {title,org,location,dates,extra,conf} */
 let joined=H.join('\n');let dates=null;const dm=parseRange(joined.replace(/\bGPA\b.*$/gim,''),null);
 if(dm){dates=dm;joined=joined.slice(0,dm.index)+' \t '+joined.slice(dm.index+dm.len)}
 let location='';const lm=joined.match(LOC);if(lm&&!(SCHOOLW.test(lm[1]||'')&&!lm[2])){location=lm[0].trim();joined=joined.slice(0,lm.index)+' \t '+joined.slice(lm.index+lm[0].length)}
 joined=joined.replace(/\((?:\s|–|-|,)*\)/g,'');
 let segs=[];joined.split('\n').forEach(line=>{line.split(/\t+|\s+\|\s+|\s+[–—]\s+|\s+·\s+|\s+•\s+|\s+-\s+|\s{2,}/).forEach(s=>{s=s.replace(/^[\s,|–—:()-]+|[\s,|–—:(-]+$/g,'').replace(/\($/,'').trim();if(s&&/[A-Za-z]/.test(s))segs.push(s)})});
 /* "Title, Org" or "Org, Title" in one segment */
 if(segs.length===1&&/,/.test(segs[0])){const i=segs[0].lastIndexOf(','),a=segs[0].slice(0,i).trim(),b=segs[0].slice(i+1).trim();const ra=ROLE.test(a),rb=ROLE.test(b);if(ra!==rb)segs=[a,b];else{const j=segs[0].indexOf(','),a2=segs[0].slice(0,j).trim(),b2=segs[0].slice(j+1).trim();if(ROLE.test(a2)!==ROLE.test(b2))segs=[a2,b2]}}
 else if(segs.length===2){/* "Summer Analyst, Goldman Sachs | ..." handled; also split a segment holding "Org, Title" */}
 const sc=s=>{const r=ROLE.test(s)?1:0,o=ORGW.test(s)?1:0;const lastRole=ROLE.test(s.split(/\s+/).slice(-1)[0])?0.5:0;return r+lastRole-o*0.8};
 let title='',org='',conf='high',extra=[];
 if(segs.length===0)conf='low';
 else if(segs.length===1){if(sec==='projects'){title=segs[0];conf='medium'}else if(ROLE.test(segs[0])&&!ORGW.test(segs[0])){title=segs[0];conf='medium'}else{org=segs[0];conf='medium'}}
 else{const s=segs.map((x,i)=>({x,i,v:sc(x)}));const best=s.slice().sort((a,b)=>b.v-a.v||a.i-b.i)[0];
  if(sec==='projects'){const PR=/^(participant|contributor|open[- ]source contributor|competitor|finalist|winner|semifinalist|hacker|team member|member)$/i;const k=segs.findIndex((x,i)=>i>0&&PR.test(x));if(k>0&&!ROLE.test(segs[0])){org=segs[0];title=segs[k];extra=segs.filter((_,i)=>i&&i!==k)}else{title=segs[0];extra=segs.slice(1)}conf='medium'}
  else if(best.v>0){title=best.x;const rest=s.filter(z=>z!==best);const o=rest.slice().sort((a,b)=>(ORGW.test(b.x)?1:0)-(ORGW.test(a.x)?1:0)||a.i-b.i)[0];org=o.x;extra=rest.filter(z=>z!==o).map(z=>z.x);
   if(ROLE.test(org)&&!ORGW.test(org))conf='low';if(s.filter(z=>z.v>0).length>1)conf=conf==='high'?'medium':conf}
  else{org=segs[0];title=segs[1];extra=segs.slice(2);conf='low'}}
 return {title,org,location,dates,extra,conf}}
const EXPSEC=new Set(['experience','leadership','athletics','volunteer','projects','research','other','publications']);
function parseExp(sec,L,today,opts){const out=[];let cur=null;const lines=sec.lines;
 const isHeader=(l,i)=>{if(l.b)return false;const t=l.t;if(/^[A-Za-z &/]{2,30}:\s/.test(t)&&!RANGE.test(t))return false;if(t.length>110)return false;if(/[.!]$/.test(t)&&t.split(/\s+/).length>8&&!RANGE.test(t))return false;return true};
 lines.forEach((i,k)=>{const l=L[i];if(isHeader(l,i)){if(!cur||cur.bul.length||cur.H.length>=3||(cur.H.length&&l.gap)||(cur.H.length>=2&&parseRange(cur.H.join(' '))&&parseRange(l.t)&&!/\t/.test(l.t)&&!(ROLE.test(l.t)&&!parseRange(l.t)))){cur={H:[l.t],src:[i],bul:[]};out.push(cur)}else{cur.H.push(l.t);cur.src.push(i)}}
  else{if(!cur){cur={H:[],src:[],bul:[]};out.push(cur)}cur.bul.push(l.t);cur.src.push(i)}});
 const res=[];
 for(const c of out){if(!c.H.length&&res.length){const p=res[res.length-1];p.bullets.push(...c.bul);p.src.push(...c.src);continue}
  if(!c.H.length)continue;const h=splitHeader(c.H,sec.key);if(!h.title&&!h.org)continue;
  const x={type:'',kind:'',org:h.org,title:h.title,location:h.location,start:h.dates?h.dates.start:'',end:h.dates?h.dates.end:'',months:h.dates?h.dates.months:null,current:!!(h.dates&&h.dates.cur),bullets:c.bul.slice(),header:c.H.join(' | '),extra:h.extra,src:c.src,conf:{entry:h.conf,dates:h.dates?(h.dates.single?'medium':'high'):'low'},flags:[]};
  x.type=classify(x,sec.key);x.kind=KIND[x.type]||'Job';if(/athlete/i.test(x.type))x.athlete=athlete(x);
  /* impossible dates */
  if(h.dates&&!h.dates.cur){const a=x.start,b=x.end;if(a&&b&&b.slice(0,4)<a.slice(0,4)||(a.length===7&&b.length===7&&b<a))x.flags.push('End date is before the start date')}
  const t=today||new Date(),ny=t.getFullYear()+1;if(x.start&&+x.start.slice(0,4)>ny)x.flags.push('Start date is in the future');if(x.start&&+x.start.slice(0,4)<1970)x.flags.push('Start date looks too early');
  if(x.flags.length)x.conf.dates='low';
  /* derived signals */
  const bt=x.bullets.join(' ');x.signals={quantified:x.bullets.filter(b=>/\d|%|\$/.test(b)).length,leadVerbs:x.bullets.map(b=>(b.match(/^[A-Za-z-]+/)||[''])[0].toLowerCase()).filter(w=>D.LEAD_VERBS.includes(w)),skills:skillsIn(bt+' '+x.title),fields:{}};
  for(const f in D.FIELDS){const re=new RegExp(D.FIELDS[f].source,'gi');const n=((x.title+' '+x.org).match(re)||[]).length*2+(bt.match(re)||[]).length;if(n)x.signals.fields[f]=Math.min(1,n/6)}
  if(opts.firms){const r=opts.firms(x.org);if(r){x.tier=r.tier||'';x.industry=r.industry||''}}
  res.push(x)}
 return res}
function skillsIn(t){const s=new Set();const low=' '+t.toLowerCase()+' ';for(const [k,c] of D.SKILLIDX){if(k.length<2||k==='r'||k==='c'||k==='go'||k==='ts'||k==='js'||k==='rest'||k==='node'||k==='shell'||k==='plc'||k==='gis'||k==='comps')continue;const i=low.indexOf(k);if(i<0)continue;const re=new RegExp('(^|[^a-z0-9+#])'+k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![a-z0-9+#])');if(re.test(low))s.add(c)}return [...s]}
/* ---------- skills / certs / languages ---------- */
const LABEL=/^\s*([A-Za-z][A-Za-z &/()-]{1,40}?)\s*:\s*(.+)$/;
const LANGRE=new RegExp('^('+D.LANGS.join('|')+')\\b','i');
function certsOf(piece){const hits=[];for(const c of D.CERTS){if(c.r.test(piece))hits.push(c)}
 const names=new Set(hits.map(h=>h.c));return hits.filter(h=>!(h.c==='CFA'&&[...names].some(n=>/^CFA Level/.test(n)))&&!(h.c==='Series 7'&&/series\s*63/i.test(piece)&&!/series\s*7(?!\d)/i.test(piece.replace(/series\s*7\s*(,|&|and|\/)\s*63/i,'series 7')))&&!(h.c==='CPR'&&names.has('BLS')&&/bls\s*\/\s*cpr|cpr\s*\/\s*bls/i.test(piece)&&false))}
function splitItems(v){const out=[];let depth=0,cur='';for(const ch of v){if(ch==='(')depth++;if(ch===')')depth=Math.max(0,depth-1);if(depth===0&&/[,;|•·\t]/.test(ch)){out.push(cur);cur='';continue}cur+=ch}out.push(cur);
 return out.flatMap(s=>s.split(/\s+\/\s+/)).map(s=>s.replace(/^\s*(and|&)\s+/i,'').replace(/[.\s]+$/,'').trim()).filter(Boolean)}
function canonSkill(s){const b=s.replace(/\s*\(([^)]*)\)\s*$/,'').trim();const k=b.toLowerCase();if(D.SKILLIDX.has(k))return D.SKILLIDX.get(k);return b}
const SOFTSET=new Set(D.SOFT);
/* ---------- contact ---------- */
function contactOf(L,hdr,all){const c={name:'',email:'',phone:'',linkedin:'',github:'',website:'',location:'',src:[]};const lines=hdr.length?hdr:all.slice(0,6);
 const txt=lines.map(i=>L[i].t);for(let k=0;k<lines.length;k++){const t=txt[k];let m;
  if(!c.email&&(m=t.match(EMAIL))){c.email=m[0];c.src.push(lines[k])}if(!c.phone&&(m=t.replace(EMAIL,'').match(PHONE))){c.phone=m[0].trim();c.src.push(lines[k])}
  if(!c.linkedin&&(m=t.match(LINKEDIN)))c.linkedin=m[0];if(!c.github&&(m=t.match(GITHUB)))c.github=m[0];
  if(!c.website&&(m=t.replace(EMAIL,'').replace(LINKEDIN,'').replace(GITHUB,'').match(URL))&&!/linkedin|github|gmail|yahoo|outlook/i.test(m[0]))c.website=m[0];
  if(!c.location){const segs=t.split(/\t|\s+\|\s+|\s+•\s+|\s+·\s+|\s{2,}/);for(const s of segs){const lm=s.trim().match(new RegExp(`^([A-Z][A-Za-z .'-]+),\\s*(${ST})(?:\\s+\\d{5})?$`));if(lm){c.location=lm[1]+', '+lm[2];break}}}}
 for(let k=0;k<Math.min(lines.length,4);k++){let t=txt[k].split(/\t|\s+\|\s+/)[0].trim();if(/^[A-Za-z][A-Za-z'.-]+$/.test(t)&&k+1<lines.length&&lines[k+1]===lines[k]+1&&/^[A-Za-z][A-Za-z'.-]+$/.test(txt[k+1].trim())&&L[lines[k]].h&&L[lines[k+1]].h){t=t+' '+txt[k+1].trim()}if(EMAIL.test(t)||/\d/.test(t)||SCHOOLW.test(t)||headingKey(L[lines[k]],false))continue;
  if(/^[A-Za-z][A-Za-z'.-]+(?:\s+[A-Za-z][A-Za-z'.-]*){1,3}$/.test(t)&&!ROLE.test(t)){c.name=CAPS(t)?tc(t):t;c.src.unshift(lines[k]);break}}
 return c}
/* ---------- main ---------- */
function parse(L,opts){opts=opts||{};
 /* table layouts put the date column first ("Aug 2023 – Dec 2027 Northeastern University"): move a leading date to the right like a tab-aligned date */
 L=L.map(l=>{if(l.b)return l;const m=l.t.match(/^((?:(?:expected|anticipated)\s+)?(?:[A-Z][a-z]{2,8}\.?\s+|[A-Z][a-z]{2,8}\s+'|\d{1,2}\/)?(?:'\d{2}|\d{4})(?:\s*[–—-]\s*(?:(?:[A-Z][a-z]{2,8}\.?\s+|\d{1,2}\/)?(?:'\d{2}|\d{4})|present|current|now))?)\s+(?=[A-Z])(.{3,})$/i);
  if(m&&!/\t/.test(l.t)&&/[a-z]{3}/.test(m[2]))return Object.assign({},l,{t:m[2]+'\t'+m[1]});return l});const today=opts.today?new Date(opts.today):new Date();const C=opts.colleges||null;
 let {S,seen}=sections(L);if(seen<2)S=blockSections(L);
 const R={contact:null,education:[],experience:[],certs:[],skills:{hard:[],languages:[],soft:[]},awards:[],publications:[],interests:[],coursework:[],workAuth:null,summary:'',sections:S.map(s=>({key:s.key,head:s.head,lines:s.lines})),lines:L.map(l=>l.t),warnings:[]};
 const hdr=S.filter(s=>s.key==='header'||s.key==='contact').flatMap(s=>s.lines);R.contact=contactOf(L,hdr,L.map((_,i)=>i));
 const ctx={state:(R.contact.location.match(new RegExp(`(${ST})$`))||[])[1]||''};
 const used=new Set();const hard=new Map(),soft=new Map(),langs=new Map(),certs=new Map();
 const addCert=(piece,i,allowOther)=>{const hits=certsOf(piece);const st=/in progress|candidate|expected|pursuing|enrolled|currently|studying/i.test(piece)?'in progress':/passed|completed|certified/i.test(piece)?'passed':'';
  if(hits.length)hits.forEach(h=>{if(!certs.has(h.c))certs.set(h.c,{name:h.c,raw:piece,status:st,fields:h.f,src:[i],conf:'high'})});
  else if(allowOther&&piece.length<=80&&/[A-Za-z]/.test(piece)){const k='other:'+N(piece);if(!certs.has(k))certs.set(k,{name:piece.replace(/\s*\((?:in progress|expected[^)]*)\)/i,'').trim(),raw:piece,status:st,fields:[],other:true,src:[i],conf:'medium'})}
  return hits.length>0};
 const addSkills=(v,i,label)=>{const lab=(label||'').toLowerCase();
  if(/language/.test(lab)&&!/programming|coding|computer|software|technical/.test(lab)){splitItems(v).forEach(it=>{const nm=it.replace(/\s*[(\-–:].*$/,'').trim();const lvm=it.match(/\(([^)]*)\)|[-–:]\s*(.+)$/);const lvtxt=lvm?(lvm[1]||lvm[2]):'';const lv=(D.LANGLVL.find(x=>x[1].test(lvtxt))||[''])[0];
   if(LANGRE.test(nm)&&nm.split(/\s+/).length<=3){if(!langs.has(nm.toLowerCase()))langs.set(nm.toLowerCase(),{name:tc(nm),level:lv,src:[i]})}else{const c=canonSkill(it);if(c&&c.length<=40)hard.set(c.toLowerCase(),{name:c,src:[i]})}});return}
  if(/interest|hobb/.test(lab)){R.interests.push(...splitItems(v));return}
  if(/certif|licen/.test(lab)){splitItems(v).forEach(p=>addCert(p,i,true));return}
  if(/coursework|courses/.test(lab)){R.coursework.push(...splitItems(v));return}
  if(/award|honor/.test(lab)){R.awards.push(...splitItems(v));return}
  if(/^soft\b|soft skills|interpersonal|personal skills/.test(lab)){splitItems(v).forEach(it=>soft.set(it.toLowerCase(),{name:it,src:[i]}));return}
  if(/^(activities|clubs|organizations|involvement|volunteer)|work auth|authori|citizen|visa|sponsor|availability|clearance|location|relocat|address|phone|email|linkedin|github|website|portfolio|references/.test(lab)){return}
  splitItems(v).forEach(it=>{if(certsOf(it).length&&!D.SKILLIDX.has(it.toLowerCase())){addCert(it,i,false);return}
   const nm=it.replace(/\s*\(([^)]*)\)\s*$/,'').trim();const lvm=it.match(/\(([^)]*)\)\s*$/);
   if(LANGRE.test(nm)&&nm.split(/\s+/).length<=3&&!D.SKILLIDX.has(nm.toLowerCase())){const lv=lvm?(D.LANGLVL.find(x=>x[1].test(lvm[1]))||[''])[0]:'';if(!langs.has(nm.toLowerCase()))langs.set(nm.toLowerCase(),{name:tc(nm),level:lv,src:[i]});return}
   if(SOFTSET.has(nm.toLowerCase())){soft.set(nm.toLowerCase(),{name:nm,src:[i]});return}
   const c=canonSkill(it);if(!c||c.length>40||c.split(/\s+/).length>5||!/[A-Za-z]/.test(c))return;if(!hard.has(c.toLowerCase()))hard.set(c.toLowerCase(),{name:c,src:[i]})})};
 for(const s of S){const key=s.key;
  if(key==='education'){eduEntries(s.lines,L).forEach(g=>{const e=parseEdu(g,L,C,ctx,today);R.education.push(e);g.lines.forEach(i=>used.add(i))});
   s.lines.forEach(i=>{if(used.has(i))return;const m=L[i].t.match(LABEL);if(m)addSkills(m[2],i,m[1])})}
  else if(key==='skills'||key==='languages'||key==='interests'||key==='additional'||key==='coursework'||key==='certifications'||key==='honors'||key==='summary'||key==='header'||key==='contact'){
   /* rejoin wrapped lines ("... Exam –" / "passed", "... Training" / "Certificate") before splitting into items */
   const MT={},skip=new Set();if(key==='certifications'||key==='skills'){let p=-1;s.lines.forEach(i=>{const t=L[i].t.trim();
    if(p>=0&&!L[i].b&&(/[–—\-,(&/]$|\b(of|and|in|for|the)$/i.test(MT[p]??L[p].t.trim())||/^[a-z(]/.test(t)||/^(certificate|certification|certified|exam|license|program|training|course|level [ivx\d]+)\b/i.test(t))&&!LABEL.test(t)){MT[p]=(MT[p]??L[p].t.trim())+' '+t;skip.add(i)}else p=i})}
   let curLab='';s.lines.forEach(i=>{if(skip.has(i))return;const t=MT[i]??L[i].t;const m=t.match(LABEL);
    if(key==='header'||key==='contact')return;
    const lo=t.match(/^\s*([A-Za-z][A-Za-z &/()-]{1,40}?)\s*:\s*$/);if(lo){curLab=lo[1];return}
    if(!m&&curLab&&key!=='summary'){addSkills(t,i,curLab);return}
    if(key==='summary'){R.summary+=(R.summary?' ':'')+t;return}
    if(key==='certifications'){if(m&&!/certif|licen/i.test(m[1])&&!certsOf(t).length){addSkills(m[2],i,m[1]);return}splitItems(m&&/certif|licen/i.test(m[1])?m[2]:t).forEach(p=>addCert(p,i,true));return}
    if(key==='honors'){if(m&&/coursework/i.test(m[1])){R.coursework.push(...splitItems(m[2]));return}R.awards.push(t.replace(/\t/g,' – '));return}
    if(key==='coursework'){R.coursework.push(...splitItems(m?m[2]:t));return}
    if(key==='interests'){if(m){addSkills(m[2],i,m[1]);return}R.interests.push(...splitItems(t));return}
    if(m)addSkills(m[2],i,m[1]);else addSkills(t,i,key==='languages'?'languages':key==='additional'?'':'')})}
  else if(EXPSEC.has(key)){
   if(key==='publications'){s.lines.forEach(i=>R.publications.push(L[i].t));continue}
   const keep=[],other=[];s.lines.forEach(i=>{const m=L[i].t.match(LABEL);if(m&&/^(skills|technical skills|languages|certifications?|interests|software|tools|programming|technologies|coursework|relevant coursework|awards|honors)$/i.test(m[1].trim()))other.push(i);else keep.push(i)});
   other.forEach(i=>{const m=L[i].t.match(LABEL);addSkills(m[2],i,m[1])});
   if(key==='other'&&s.auto&&!keep.some(i=>L[i].b))continue;
   R.experience.push(...parseExp({key,lines:keep},L,today,opts))}}
 /* work authorization: only if stated */
 L.forEach((l,i)=>{if(R.workAuth)return;const t=l.t;let v='';
  if(/\b(?:u\.?s\.?|united states|american)\s+citizen(ship)?\b/i.test(t))v='U.S. citizen';else if(/\bpermanent resident|green card\b/i.test(t))v='U.S. permanent resident';
  else if(/\b(?:no|not|without)\s+(?:visa\s+)?sponsorship\s+(?:is\s+)?(?:required|needed|necessary)\b|\b(?:no|not|without|do not|does not|don't|won't|will not)\b[^.]{0,30}\b(?:require|need)\b[^.]{0,20}\bsponsorship\b/i.test(t))v='Authorized to work in the U.S. (no sponsorship needed)';
  else if(/\b(?:require|need|will need)s?\b[^.]{0,30}\bsponsorship\b/i.test(t))v='Will need visa sponsorship';else if(/\b(?:no|not|without|do not|does not|don't)\b[^.]{0,30}\b(?:require|need)\b[^.]{0,20}\bsponsorship\b/i.test(t))v='Authorized to work in the U.S. (no sponsorship needed)';
  else if(/\bauthori[sz]ed to work\b/i.test(t))v='Authorized to work in the U.S.';else if(/\b(F-1|STEM OPT|OPT|CPT)\b/.test(t)&&/\b(visa|status|eligible|authori[sz]|work)\b/i.test(t))v='F-1 student (OPT/CPT)';
  if(v)R.workAuth={value:v,raw:t,src:[i],conf:'high'}});
 R.skills.hard=[...hard.values()];R.skills.soft=[...soft.values()];R.skills.languages=[...langs.values()];R.certs=[...certs.values()];
 if(R.coursework.length&&R.education[0])R.education[0].coursework.push(...R.coursework.filter(c=>!R.education[0].coursework.includes(c)));
 if(!R.education.length)R.warnings.push('No education found');if(!R.experience.length)R.warnings.push('No experience found');
 return R}
return {parse,parseRange,matchSchool,collegeIndex,skillsIn,splitHeader,classify,MAJORS,tok}});
