// V12: run the 60-pair calibration set (test/calibration.json; ranges were committed before this grader existed).
global.self=global;require('../match-core.js');const fs=require('fs');process.chdir(__dirname+'/..');
const C=JSON.parse(fs.readFileSync('config.json'));C.schoolTiers=JSON.parse(fs.readFileSync('data/school_tiers.json'));C.h1b=JSON.parse(fs.readFileSync('data/h1b.json')).employers;
const W=JSON.parse(fs.readFileSync('match-weights.json')),PS=JSON.parse(fs.readFileSync('test/personas.json')),K=JSON.parse(fs.readFileSync('test/calibration.json'));
const order=['F','D-','D','D+','C-','C','C+','B-','B','B+','A-','A','A+'];let ok=0,n=0;const miss=[];const today=new Date().toISOString().slice(0,10);
for(const [pk,row] of Object.entries(K.expected)){const P=MatchCore.profile(PS[pk]);for(const [lk,rng] of Object.entries(row)){const x={...K.listings[lk],first_seen:today,status:'open'};x.industry=x.category;
 const r=MatchCore.score(x,P,C,W);n++;const gi=order.indexOf(r.grade),good=(rng[2]===r.grade)||(gi>=order.indexOf(rng[0])&&gi<=order.indexOf(rng[1]));if(good)ok++;else miss.push(`${pk} × ${lk}: got ${r.grade} (${r.pct}), expected ${rng[0]}–${rng[1]}`);
 if(process.argv[2]==='-v')console.log(pk.padEnd(15),lk.padEnd(13),String(r.grade).padEnd(3),r.pct,good?'':'  <-- expected '+rng.slice(0,2).join('–'),r.feedback.breakdown?r.feedback.breakdown.map(b=>b.k[0]+':'+(b.v==null?'-':Math.round(b.v))).join(' '):'')}}
console.log(`calibration: ${ok}/${n} within range (${Math.round(100*ok/n)}%)`);miss.forEach(m=>console.log('  outlier:',m));
if(ok/n<0.9)process.exit(1);
