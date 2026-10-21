// node test/elite_firms.test.js : a no-experience sophomore must score D or F (<55) at JPMorgan and Bank of America (open or upcoming listings)
global.self=global;require('../match-core.js');const fs=require('fs');process.chdir(__dirname+'/..');
const C=JSON.parse(fs.readFileSync('config.json')),W=JSON.parse(fs.readFileSync('match-weights.json')),T=JSON.parse(fs.readFileSync('test/profiles.test.json'));
const norm=s=>(s||'').toLowerCase().replace(/[^a-z0-9&+# ]/g,' ').replace(/\s+/g,' ').trim();
const L=JSON.parse(fs.readFileSync('data/listings.json')).listings.filter(x=>x.status!=='closed'&&/jp ?morgan|bank of america/i.test(x.company));
let fail=0;for(const x of L){x.industry=x.industry||x.category;x._t=norm([x.title,x.company,...(x.locations||[]).map(l=>l.city+' '+l.state)].join(' '));
 const row=['sophomoreNone','none','average','top'].map(k=>{const r=MatchCore.score(x,MatchCore.profile(T[k]),C,W);if(k==='sophomoreNone'&&r.pct>=55)fail++;return `${k} ${r.pct}% ${r.grade}`});
 console.log(`${x.company} | ${x.title.slice(0,60)} (${x.status}) -> ${row.join(' · ')}`)}
console.log(L.length?(fail?`FAIL: ${fail} listing(s) at 55%+`:`PASS: all ${L.length} under 55%`):'FAIL: no listings');process.exit(fail||!L.length?1:0)
