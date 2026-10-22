// V12.1 unit test: location normalizer (cleanCity/locParts from app.js) + no stray punctuation in shipped data.
const fs=require('fs'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/../app.js','utf8');
const line=src.split('\n').find(l=>l.startsWith('const cleanCity='));
const {cleanCity,locParts}=new Function(line.split(';const locParts')[0]+';const locParts'+line.split(';const locParts')[1].split(';')[0]+';return {cleanCity,locParts}')();
const cases=[[', New York','New York'],['- Austin','Austin'],['Boston,','Boston'],['  Chicago — ','Chicago'],['San Francisco','San Francisco'],['Winston-Salem','Winston-Salem'],['',''],[null,''],[', ','']];
for(const [i,o] of cases)assert.strictEqual(cleanCity(i),o,`cleanCity(${JSON.stringify(i)})`);
assert.deepStrictEqual(locParts({locations:[{city:', New York',state:'NY'},{city:null,state:'CA'},{city:'',state:''}]}),['New York, NY','CA']);
let bad=0;for(const f of ['data/listings.json']){const j=JSON.parse(fs.readFileSync(__dirname+'/../'+f,'utf8'));const arr=Array.isArray(j)?j:(j.listings||j.items||[]);
 for(const x of arr)for(const l of x.locations||[])if(l.city&&/^[\s,\-–—]|[\s,\-–—]$/.test(l.city)){bad++;if(bad<5)console.log('dirty',f,l.city)}}
assert.strictEqual(bad,0,'dirty city values in data');
console.log('location normalizer: '+(cases.length+1)+' cases + data check PASS');
