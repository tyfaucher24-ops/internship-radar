// V16 Phase 3: local<->cloud merge, last-write-wins per row, tombstones. node test/sync_core.test.js
const S=require('../sync-core.js');let ok=0,n=0;const t=(c,m)=>{n++;if(c)ok++;console.log((c?'PASS ':'FAIL ')+m)};
const T=(m)=>new Date(Date.UTC(2026,9,27,0,m)).toISOString();
const keys=['tracker','profile'];
// explode/implode round trip
const tr=[{id:'a',co:'A'},{id:'b',co:'B'}];
const ex=S.explode(tr);const back=S.implode(Object.fromEntries(Object.entries(ex).map(([k,d])=>[k,{data:d}])));
t(JSON.stringify(back)===JSON.stringify(tr),'array of {id} round-trips in order');
t(Object.keys(S.explode({gpa:3.5}))[0]==='_','object -> single row');
t(Object.keys(S.explode([1,2])).join()==='_','array without ids -> single row');
t(Object.keys(S.explode([{id:'x'},{id:'x'}])).join()==='_','duplicate ids -> single row (safe)');
// first sign-in: guest data + cloud data from another device -> union, nothing lost
let local={tracker:[{id:'g1',co:'Guest Co'}],profile:{name:'Ty',gpa:3.6}};
let cloud=[{coll:'tracker',item_id:'c1',data:{v:{id:'c1',co:'Cloud Co'},pos:0},updated_at:T(5)},{coll:'profile',item_id:'_',data:{v:{name:'Ty',gpa:3.4}},updated_at:T(5)}];
let r=S.merge(local,{},cloud,T(30),keys,{tracker:T(10),profile:T(20)});
t(r.apply.tracker&&r.apply.tracker.length===2&&r.apply.tracker.some(x=>x.id==='g1')&&r.apply.tracker.some(x=>x.id==='c1'),'first sign-in: tracker union (guest + cloud)');
t(r.push.some(x=>x.coll==='tracker'&&x.item_id==='g1'),'guest row pushed to cloud');
t(!r.apply.profile&&r.push.some(x=>x.coll==='profile'&&x.data.v.gpa===3.6),'profile: local newer (20) beats cloud (5)');
// cloud newer wins
r=S.merge({profile:{gpa:3.6}},{},[{coll:'profile',item_id:'_',data:{v:{gpa:3.9}},updated_at:T(25)}],T(30),['profile'],{profile:T(20)});
t(r.apply.profile&&r.apply.profile.gpa===3.9&&!r.push.length,'cloud newer (25) beats local (20)');
// unchanged-since-sync local row loses to newer cloud edit
let meta={};S.diffLocal('tracker',[{id:'a',st:'applied'}],meta,T(1));
r=S.merge({tracker:[{id:'a',st:'applied'}]},meta,[{coll:'tracker',item_id:'a',data:{v:{id:'a',st:'interview'},pos:0},updated_at:T(3)}],T(9),['tracker']);
t(r.apply.tracker&&r.apply.tracker[0].st==='interview','other device edit applied to unchanged local row');
// per-row: two devices edit different rows -> both kept
meta={};S.diffLocal('tracker',[{id:'a',s:1},{id:'b',s:1}],meta,T(1));
r=S.merge({tracker:[{id:'a',s:2},{id:'b',s:1}]},meta,[{coll:'tracker',item_id:'a',data:{v:{id:'a',s:1},pos:0},updated_at:T(1)},{coll:'tracker',item_id:'b',data:{v:{id:'b',s:3},pos:1},updated_at:T(4)}],T(9),['tracker'],{tracker:T(5)});
t(r.apply.tracker.find(x=>x.id==='a').s===2&&r.apply.tracker.find(x=>x.id==='b').s===3,'row-level LWW: local edit of a + cloud edit of b both survive');
// deletes
meta={};let ch=S.diffLocal('tracker',[{id:'a'},{id:'b'}],meta,T(1));t(ch.length===2,'diffLocal: 2 new rows');
ch=S.diffLocal('tracker',[{id:'a'}],meta,T(2));t(ch.length===1&&ch[0].deleted&&ch[0].item_id==='b','diffLocal: removed row -> tombstone');
ch=S.diffLocal('tracker',[{id:'a'}],meta,T(3));t(ch.length===0,'diffLocal: no change -> nothing pushed');
r=S.merge({tracker:[{id:'a'},{id:'z'}]},{},[{coll:'tracker',item_id:'z',deleted:true,data:null,updated_at:T(9)}],T(10),['tracker'],{tracker:T(5)});
t(r.apply.tracker&&r.apply.tracker.length===1&&r.apply.tracker[0].id==='a','cloud tombstone newer than local -> row removed');
r=S.merge({tracker:[{id:'a'},{id:'z'}]},{},[{coll:'tracker',item_id:'z',deleted:true,data:null,updated_at:T(1)}],T(10),['tracker'],{tracker:T(5)});
t(!r.apply.tracker&&r.push.some(x=>x.item_id==='z'&&!x.deleted),'local re-add newer than old tombstone -> kept + pushed');
meta={};S.diffLocal('tracker',[{id:'a'},{id:'b'}],meta,T(1));
r=S.merge({tracker:[{id:'a'}]},meta,[{coll:'tracker',item_id:'a',data:{v:{id:'a'},pos:0},updated_at:T(1)},{coll:'tracker',item_id:'b',data:{v:{id:'b'},pos:1},updated_at:T(1)}],T(4),['tracker']);
t(r.push.some(x=>x.item_id==='b'&&x.deleted)&&!r.apply.tracker,'offline local delete is pushed, not undone by pull');
// 3-way field merge: this device added default fields + edited notes; other device changed status
meta={};r=S.merge({tracker:[{id:'q',status:'Saved'}]},meta,[],T(1),['tracker'],{tracker:T(1)});
r=S.merge({tracker:[{id:'q',status:'Saved',notes:'hi',extra:''}]},meta,[{coll:'tracker',item_id:'q',data:{v:{id:'q',status:'Applied'},pos:0},updated_at:T(3)}],T(5),['tracker'],{tracker:T(4)});
const q=r.apply.tracker&&r.apply.tracker[0];t(q&&q.status==='Applied'&&q.notes==='hi'&&q.extra==='','both-changed row: cloud field edit + local field edit both kept');
t(r.push.some(x=>x.item_id==='q'&&x.data.v.status==='Applied'&&x.data.v.notes==='hi'&&x.updated_at>T(3)),'merged row pushed with newer time');
t(S.keysFor({}).indexOf('resumeText')<0&&S.keysFor({cloudResume:true}).indexOf('resumeText')>=0,'raw resume text syncs only with opt-in');
t(!S.SYNC_KEYS.includes('adminListings')&&!S.SYNC_KEYS.includes('adminConfig'),'admin keys never sync as user data');
console.log(`${ok}/${n}`);process.exit(ok===n?0:1);
