// V12.1 unit test: location normalizer (cleanCity/locParts from app.js) + no stray punctuation in shipped data.
const fs=require('fs'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/../app.js','utf8');
const lines=src.split('\n'),i=lines.findIndex(l=>l.startsWith('const cleanCity=')),j=lines.findIndex(l=>l.startsWith('const locParts='));
// V13.3 moved locParts to its own line (after STN, the state-name map); evaluate both lines as they ship
const {cleanCity,locParts}=new Function(lines[i]+'\n'+lines[j]+';return {cleanCity,locParts}')();
const cases=[[', New York','New York'],['- Austin','Austin'],['Boston,','Boston'],['  Chicago — ','Chicago'],['San Francisco','San Francisco'],['Winston-Salem','Winston-Salem'],['',''],[null,''],[', ','']];
for(const [i,o] of cases)assert.strictEqual(cleanCity(i),o,`cleanCity(${JSON.stringify(i)})`);
// V13.3 #5c: a state-only location shows the full state name (no city is guessed)
assert.deepStrictEqual(locParts({locations:[{city:', New York',state:'NY'},{city:null,state:'CA'},{city:'',state:''}]}),['New York, NY','California']);
let bad=0;for(const f of ['data/listings.json']){const j=JSON.parse(fs.readFileSync(__dirname+'/../'+f,'utf8'));const arr=Array.isArray(j)?j:(j.listings||j.items||[]);
 for(const x of arr)for(const l of x.locations||[])if(l.city&&/^[\s,\-–—]|[\s,\-–—]$/.test(l.city)){bad++;if(bad<5)console.log('dirty',f,l.city)}}
assert.strictEqual(bad,0,'dirty city values in data');
console.log('location normalizer: '+(cases.length+1)+' cases + data check PASS');
