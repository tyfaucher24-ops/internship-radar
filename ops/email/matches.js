// V17: top new matches per user with the site's own MatchCore (same scoring + eligibility; ineligible roles never returned).
// stdin: {"listings":"<path to listings.json>","users":[{"id":..,"profile":{..},"since":"YYYY-MM-DD","exclude":[ids]}]}
// stdout: {"<id>":[{"id":..,"pct":..}, ...up to 5]}
global.self=global;const path=require('path'),fs=require('fs'),R=path.join(__dirname,'..','..');
require(path.join(R,'us-cities.js'));require(path.join(R,'match-core.js'));const MC=self.MatchCore;
const C=JSON.parse(fs.readFileSync(path.join(R,'config.json'))),W=JSON.parse(fs.readFileSync(path.join(R,'match-weights.json')));
const inp=JSON.parse(fs.readFileSync(0,'utf8'));const L=JSON.parse(fs.readFileSync(inp.listings)).listings||[];
const MIN=inp.min_pct||60,out={};
for(const u of inp.users||[]){out[u.id]=[];if(!u.profile||!MC.hasProfile(u.profile))continue;
  const P=MC.profile(u.profile),ex=new Set((u.exclude||[]).map(String)),res=[];
  for(const x of L){if(x.status!=='open'||x.hidden||ex.has(String(x.id))||!(x.first_seen&&x.first_seen>u.since))continue;
    let r;try{r=MC.score(x,P,C,W)}catch{continue}
    if(r.ineligible||!MC.rankable({x,r})||r.pct<MIN)continue;res.push({id:x.id,pct:r.pct})}
  out[u.id]=res.sort((a,b)=>b.pct-a.pct).slice(0,5)}
process.stdout.write(JSON.stringify(out));
