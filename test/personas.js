// V9 grader check: score every live listing for the 7 personas; print grade mix, top 10, company concentration, role groups.
global.self=global;const core=process.argv[2]||'../match-core.js';require(core);const fs=require('fs');process.chdir(__dirname+'/..');
const C=JSON.parse(fs.readFileSync(process.argv[3]||'config.json')),W=JSON.parse(fs.readFileSync(process.argv[4]||'match-weights.json')),T=JSON.parse(fs.readFileSync('test/personas.json'));
const meta=JSON.parse(fs.readFileSync('data/meta.json'));const cut=Date.parse(meta.updated)-864e5;const norm=s=>(s||'').toLowerCase().replace(/[^a-z0-9&+# ]/g,' ').replace(/\s+/g,' ').trim();
const L=JSON.parse(fs.readFileSync('data/index.json')).listings.filter(x=>x.status==='open'&&!x.hidden&&!x.past_term&&x.lv&&Date.parse(x.lv+':00Z')>=cut);L.forEach(x=>{x.industry=x.category;x._t=norm([x.title,x.company,...(x.locations||[]).map(l=>l.city+' '+l.state)].join(' '))});
const OUT={};
for(const [k,pr] of Object.entries(T)){if(k[0]==='_')continue;const P=MatchCore.profile(pr);const R=L.map(x=>({x,r:MatchCore.score(x,P,C,W)}));const g={};R.forEach(({r})=>g[r.grade]=(g[r.grade]||0)+1);
 const sorted0=R.filter(a=>a.r.pct!=null).sort((a,b)=>b.r.pct-a.r.pct);const seen={};sorted0.forEach(a=>{const n=seen[a.x.company]=(seen[a.x.company]||0)+1;a.eff=a.r.pct-(W.grader.diversityPenalty||3)*(n-1)});const sorted=sorted0.sort((a,b)=>b.eff-a.eff);const top=sorted.slice(0,20);const cc={};top.forEach(({x})=>cc[x.company]=(cc[x.company]||0)+1);const maxCo=Object.entries(cc).sort((a,b)=>b[1]-a[1])[0];
 const elite=R.filter(({x})=>/jpmorgan|bank of america/i.test(x.company)).map(({r})=>r.pct);
 OUT[k]={grades:g,median:R.map(a=>a.r.pct??0).sort((a,b)=>a-b)[R.length>>1],ungraded:R.filter(a=>a.r.pct==null).length,maxCompanyInTop20:maxCo,top10:top.slice(0,10).map(({x,r})=>`${r.pct}% ${r.grade} | ${x.company} | ${x.title.slice(0,60)} | ${r.group||x.category}`),eliteJPM_BofA:elite.length?[Math.min(...elite),Math.max(...elite)]:null,sampleFeedback:top[0]&&top[0].r.feedback}}
console.log(JSON.stringify(OUT,null,1));
