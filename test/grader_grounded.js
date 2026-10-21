// V11.2: every strength, gap, action and verdict reason must cite something real from the profile or the listing.
// For each persona (incl. Ty's), checks top 40 + JPMorgan/BofA listings. Prints failures and samples. Exit 1 on any ungrounded line.
global.self=global;require('../match-core.js');const fs=require('fs');process.chdir(__dirname+'/..');
const C=JSON.parse(fs.readFileSync('config.json')),W=JSON.parse(fs.readFileSync('match-weights.json')),T=JSON.parse(fs.readFileSync('test/personas.json'));
const norm=s=>(s||'').toLowerCase().replace(/[^a-z0-9&+# ]/g,' ').replace(/\s+/g,' ').trim();
const L=JSON.parse(fs.readFileSync('data/index.json')).listings.filter(x=>x.status==='open'&&!x.hidden);L.forEach(x=>{x.industry=x.category;x._t=norm([x.title,x.company,...(x.locations||[]).map(l=>l.city+' '+l.state)].join(' '))});
let bad=0,lines=0;const samples={};
for(const [k,pr] of Object.entries(T)){if(k[0]==='_')continue;const P=MatchCore.profile(pr);
 const R=L.map(x=>({x,r:MatchCore.score(x,P,C,W)})).filter(a=>a.r.pct!=null);R.sort((a,b)=>b.r.pct-a.r.pct);
 const pick=[...R.slice(0,40),...R.filter(a=>/jpmorgan|bank of america/i.test(a.x.company)).slice(0,5),...R.slice(-5)];
 for(const {x,r} of pick){const f=r.feedback;const toks=[x.company,...norm(x.title).split(' ').filter(w=>w.length>3),pr.major,pr.school,pr.classYear,pr.gpa,...(pr.skills||[]),...(pr.industries||[]),...(pr.locations||[]).flatMap(l=>l.split(/,\s*/)),...(x.locations||[]).map(l=>l.city),...(pr.experience||[]).flatMap(e=>[e.title,e.org]),r.group&&MatchCore.groupLabel(r.group,C),x.category,...(x.class_years||[]),'GPA','skills','experience','sponsorship','citizenship','class year','profile','resume','competition','applicants','location'].filter(Boolean).map(t=>String(t).toLowerCase());
  for(const s of [...f.strengths,...f.gaps,...f.actions,f.verdict.why]){lines++;const lo=String(s).toLowerCase();if(!toks.some(t=>t.length>2&&lo.includes(t))){bad++;console.log('UNGROUNDED',k,'|',x.company,'|',s)}}
  if(!samples[k]&&/jpmorgan/i.test(x.company))samples[k+' @JPMorgan']={pct:r.pct,grade:r.grade,company:x.company,title:x.title,feedback:f}}
 samples[k+' top']={pct:R[0].r.pct,grade:R[0].r.grade,company:R[0].x.company,title:R[0].x.title,feedback:R[0].r.feedback}}
console.log(JSON.stringify(samples,null,1));console.log(`grounded ${lines-bad}/${lines}`);process.exit(bad?1:0)
