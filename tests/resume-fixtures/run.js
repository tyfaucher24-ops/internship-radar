/* V14.3 resume accuracy suite. Parses every fixture (PDF via pdf.js, DOCX via mammoth, TXT) with the SAME
   resume-extract.js + resume-core.js the website uses, and scores against expected.json.
   Usage: NODE_PATH=<dir with pdfjs-dist (3.x or 4.x) and mammoth> node tests/resume-fixtures/run.js [--json out.json] [--only f01]
   Exit 1 if any pass bar is missed. */
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','..');
const RX=require(path.join(ROOT,'resume-extract.js')),RC=require(path.join(ROOT,'resume-core.js'));
const COL=JSON.parse(fs.readFileSync(path.join(ROOT,'vendor','colleges.json'),'utf8'));
const mammoth=require('mammoth');let pdfjs=null;/* V16: pdfjs-dist 4.x is ESM-only (legacy/build/pdf.mjs); 3.x is CommonJS */
async function PJ(){if(!pdfjs){try{pdfjs=require('pdfjs-dist/legacy/build/pdf.js')}catch(e){const m=require.resolve('pdfjs-dist/legacy/build/pdf.mjs');pdfjs=await import(require('url').pathToFileURL(m).href)}}return pdfjs}
const args=process.argv.slice(2),only=args.includes('--only')?args[args.indexOf('--only')+1]:null,jout=args.includes('--json')?args[args.indexOf('--json')+1]:null,verbose=args.includes('-v');
async function pdfItems(buf){const doc=await (await PJ()).getDocument({data:new Uint8Array(buf),disableFontFace:true,useSystemFonts:false,verbosity:0}).promise;const pages=[];
 for(let p=1;p<=doc.numPages;p++){const pg=await doc.getPage(p);const vp=pg.getViewport({scale:1});const tc=await pg.getTextContent();
  pages.push({w:vp.width,h:vp.height,items:tc.items.filter(i=>i.str!==undefined).map(i=>({s:i.str,x:i.transform[4],y:i.transform[5],w:i.width,size:Math.hypot(i.transform[2],i.transform[3])||i.height}))})}
 return pages}
async function linesOf(file){const buf=fs.readFileSync(file);if(file.endsWith('.pdf'))return RX.fromPdf(await pdfItems(buf));if(file.endsWith('.docx'))return RX.fromHtml((await mammoth.convertToHtml({buffer:buf})).value);return RX.fromText(buf.toString('utf8'))}
const n=s=>String(s==null?'':s).toLowerCase().replace(/&/g,' and ').replace(/[’']/g,'').replace(/[^a-z0-9+#]+/g,' ').trim();
const same=(a,b)=>n(a)===n(b);
function matchExp(E,P){/* greedy match expected entries to parsed by org+title */const used=new Set(),pairs=[];
 const sc=(e,p)=>{let s=0;if(e.org&&same(e.org,p.org))s+=2;else if(e.org&&p.org&&(n(p.org).includes(n(e.org))||n(e.org).includes(n(p.org))))s+=1;if(e.title&&same(e.title,p.title))s+=2;else if(e.title&&p.title&&(n(p.title).includes(n(e.title))||n(e.title).includes(n(p.title))))s+=1;if(!e.org&&!p.org)s+=0.5;return s};
 const cand=[];E.forEach((e,i)=>P.forEach((p,j)=>{const s=sc(e,p);if(s>=2)cand.push([s,i,j])}));cand.sort((a,b)=>b[0]-a[0]);const ue=new Set();
 for(const [s,i,j] of cand){if(ue.has(i)||used.has(j))continue;ue.add(i);used.add(j);pairs.push([E[i],P[j],s])}return {pairs,unE:E.filter((_,i)=>!ue.has(i)),unP:P.filter((_,j)=>!used.has(j))}}
const M={};const add=(k,ok,t=1)=>{M[k]=M[k]||[0,0];M[k][0]+=ok?1:0;M[k][1]+=t};
const PRF={skills:{tp:0,fp:0,fn:0},certs:{tp:0,fp:0,fn:0}};const misses=[];const halluc=[];const byFmt={};const times=[];
function inText(v,txt){return !v||n(txt).includes(n(v))}
(async()=>{
 const dirs=fs.readdirSync(__dirname).filter(d=>/^f\d\d$/.test(d)&&(!only||d===only)).sort();
 for(const d of dirs){const X=JSON.parse(fs.readFileSync(path.join(__dirname,d,'expected.json'),'utf8'));
  for(const f of X.files){const file=path.join(__dirname,d,f);const t0=Date.now();let L;try{L=await linesOf(file)}catch(e){misses.push([d,f,'read',String(e)]);continue}
   const R=RC.parse(L,{colleges:COL,today:X.today});const ms=Date.now()-t0;times.push([d+'/'+f,ms]);const tag=d+'/'+f;const txt=R.lines.join('\n');
   const F=byFmt[X.format+'/'+f.split('.')[1]]=byFmt[X.format+'/'+f.split('.')[1]]||{ok:0,t:0};const fa=(k,ok)=>{add(k,ok);F.t++;F.ok+=ok?1:0;if(!ok)misses.push([tag,k])};
   /* contact */
   fa('contact.name',same(R.contact.name,X.contact.name));fa('contact.email',R.contact.email===X.contact.email);fa('contact.phone',same(R.contact.phone,X.contact.phone));
   /* education: align by order of appearance */
   X.education.forEach((e,i)=>{const p=R.education[i]||{};const fl=(k,ok,got)=>{fa('edu.'+k,ok);if(!ok&&verbose)console.log(tag,'edu.'+k,'exp=',JSON.stringify(e[k]),'got=',JSON.stringify(got))};
    fl('school',e.ambiguous?(!p.school&&p.ambiguous):same(p.school,e.school),p.school);fl('degree',same(p.degree,e.degree),p.degree);
    fl('major',JSON.stringify((p.majors||[]).map(n).sort())===JSON.stringify(e.majors.map(n).sort()),p.majors);
    fl('grad',String(p.gradYear||'')===e.gradYear&&String(p.gradMonth||'')===e.gradMonth,[p.gradYear,p.gradMonth]);
    fl('gpa',String(p.gpa||'')===e.gpa&&String(p.gpaScale||'')===e.gpaScale&&String(p.majorGpa||'')===e.majorGpa,[p.gpa,p.gpaScale,p.majorGpa]);
    fl('classYear',(p.classYear||'')===e.classYear,p.classYear);
    if(!e.gpa&&p.gpa)halluc.push([tag,'gpa',p.gpa]);if(!e.gradMonth&&p.gradMonth)halluc.push([tag,'gradMonth',p.gradMonth]);if(e.ambiguous&&p.school)halluc.push([tag,'school auto-picked',p.school])});
   if(R.education.length>X.education.length)R.education.slice(X.education.length).forEach(p=>{misses.push([tag,'edu.extra',p.schoolRaw]);add('edu.extraEntries',false)});
   /* experience */
   const {pairs,unE,unP}=matchExp(X.experience,R.experience);
   M['exp.recall']=M['exp.recall']||[0,0];M['exp.recall'][0]+=pairs.length;M['exp.recall'][1]+=X.experience.length;M['exp.precision']=M['exp.precision']||[0,0];M['exp.precision'][0]+=pairs.length;M['exp.precision'][1]+=R.experience.length;
   unE.forEach(e=>misses.push([tag,'exp.missed',e.title+' @ '+e.org]));unP.forEach(p=>misses.push([tag,'exp.extra',p.title+' @ '+p.org+' <'+p.header+'>']));
   for(const [e,p] of pairs){fa('exp.type',e.type===p.type);if(e.type!==p.type&&verbose)console.log(tag,'type',e.type,'got',p.type,'|',p.title,'@',p.org);
    const dok=e.start===p.start&&e.end===p.end&&(e.months??null)===(p.months??null);fa('exp.dates',dok);if(!dok&&verbose)console.log(tag,'dates exp',e.start,e.end,e.months,'got',p.start,p.end,p.months,'|',p.header);
    fa('exp.orgTitle',same(e.org,p.org)&&same(e.title,p.title));if(verbose&&!(same(e.org,p.org)&&same(e.title,p.title)))console.log(tag,'orgtitle exp',e.title,'@',e.org,'got',p.title,'@',p.org);
    fa('exp.location',same(e.location,p.location))}
   /* skills */
   const es=new Set(X.skills.map(n)),ps=new Set(R.skills.hard.map(s=>n(s.name)));es.forEach(s=>ps.has(s)?PRF.skills.tp++:(PRF.skills.fn++,misses.push([tag,'skill.missed',s])));ps.forEach(s=>{if(!es.has(s)){PRF.skills.fp++;misses.push([tag,'skill.extra',s])}});
   const ec=new Set(X.certs.map(n)),pc=new Set(R.certs.map(c=>n(c.name)));ec.forEach(s=>pc.has(s)?PRF.certs.tp++:(PRF.certs.fn++,misses.push([tag,'cert.missed',s])));pc.forEach(s=>{if(!ec.has(s)){PRF.certs.fp++;misses.push([tag,'cert.extra',s]);halluc.push([tag,'cert',s])}});
   fa('languages',JSON.stringify(X.languages.map(l=>n(l.name)+':'+n(l.level)).sort())===JSON.stringify(R.skills.languages.map(l=>n(l.name)+':'+n(l.level)).sort()));
   fa('workAuth',(R.workAuth?R.workAuth.value:'')===X.workAuth);if(!X.workAuth&&R.workAuth)halluc.push([tag,'workAuth',R.workAuth.value]);
   /* grounding: every extracted free-text value must appear in the resume text */
   for(const p of R.experience)for(const k of ['org','title','location'])if(!inText(p[k],txt))halluc.push([tag,'exp.'+k+' not in text',p[k]]);
   for(const e of R.education){if(e.gpa&&!txt.includes(e.gpa))halluc.push([tag,'gpa not in text',e.gpa]);(e.majors||[]).forEach(m=>{if(!inText(m,txt))halluc.push([tag,'major not in text',m])})}
   for(const s of R.skills.hard)if(!inText(s.name,txt)&&!require(path.join(ROOT,'resume-dict.js')).SKILLS[s.name])halluc.push([tag,'skill not in text',s.name]);
  }}
 const pct=a=>a?(100*a[0]/a[1]):NaN;const f1=o=>{const p=o.tp/(o.tp+o.fp||1),r=o.tp/(o.tp+o.fn||1);return {p:100*p,r:100*r,f1:200*p*r/((p+r)||1)}};
 const core=['edu.school','edu.degree','edu.major','edu.grad','edu.gpa'];const coreAgg=core.reduce((a,k)=>[a[0]+(M[k]||[0])[0],a[1]+(M[k]||[0,0])[1]],[0,0]);
 const sk=f1(PRF.skills),ce=f1(PRF.certs);
 const bars=[['School, degree, major, grad date, GPA (exact)',pct(coreAgg),98],['Experience entries recall',pct(M['exp.recall']),95],['Experience entries precision',pct(M['exp.precision']),95],['Experience type classification',pct(M['exp.type']),90],['Dates and duration',pct(M['exp.dates']),95],['Certifications normalized (recall)',ce.r,95],['Certifications normalized (precision)',ce.p,95],['Skills F1',sk.f1,90],['Hallucinated fields (count)',halluc.length,0]];
 const out={fixtures:dirs.length,files:times.length,metrics:Object.fromEntries(Object.entries(M).map(([k,v])=>[k,{ok:v[0],n:v[1],pct:+pct(v).toFixed(2)}])),skills:sk,certs:ce,bars:bars.map(b=>({name:b[0],value:+(+b[1]).toFixed(2),bar:b[2],pass:b[2]===0?b[1]===0:b[1]>=b[2]})),hallucinations:halluc,byFormat:Object.fromEntries(Object.entries(byFmt).map(([k,v])=>[k,+(100*v.ok/v.t).toFixed(1)])),timing:{max:Math.max(...times.map(t=>t[1])),mean:+(times.reduce((a,t)=>a+t[1],0)/times.length).toFixed(1)},misses};
 if(jout)fs.writeFileSync(jout,JSON.stringify(out,null,1));
 console.log(`fixtures ${dirs.length}, files ${times.length}`);for(const [k,v] of Object.entries(out.metrics))console.log(k.padEnd(20),`${v.ok}/${v.n}`.padStart(9),v.pct+'%');
 console.log('skills P/R/F1',sk.p.toFixed(1),sk.r.toFixed(1),sk.f1.toFixed(1),' certs P/R',ce.p.toFixed(1),ce.r.toFixed(1));
 for(const b of out.bars)console.log((b.pass?'PASS ':'FAIL ')+b.name+': '+b.value+' (bar '+(b.bar===0?'0':'≥'+b.bar)+')');
 if(verbose||args.includes('-m')){const c={};misses.forEach(m=>{c[m[1]]=(c[m[1]]||0)+1});console.log(c);misses.slice(0,args.includes('-m')?400:60).forEach(m=>console.log(' ',m.join(' | ')));halluc.slice(0,40).forEach(h=>console.log(' H',h.join(' | ')))}
 process.exit(out.bars.every(b=>b.pass)?0:1)})();
