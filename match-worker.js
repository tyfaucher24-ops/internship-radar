// Bulk rescoring off the main thread. Receives slim listings once, then a profile per rescore; returns [id,pct] pairs.
importScripts('match-core.js'+self.location.search);let ROWS=[],C={},W={};
onmessage=e=>{const m=e.data;if(m.t==='init'){ROWS=m.rows;C=m.cfg;W=m.w;return}
 if(m.t==='score'){const t0=Date.now(),P=MatchCore.profile(m.profile),ids=[],pct=new Uint8Array(ROWS.length);
  for(let i=0;i<ROWS.length;i++){{const v=MatchCore.score(ROWS[i],P,C,W).pct;pct[i]=v==null?255:v}}
  postMessage({t:'scores',seq:m.seq,ids:ROWS.map(r=>r.id),pct,ms:Date.now()-t0},[pct.buffer])};
 if(m.t==='multi'){const ids=ROWS.map(r=>r.id),pcts=m.profiles.map(pr=>{const P=MatchCore.profile(pr),a=new Uint8Array(ROWS.length);for(let i=0;i<ROWS.length;i++){const v=MatchCore.score(ROWS[i],P,C,W).pct;a[i]=v==null?255:v}return a});postMessage({t:'multi',ids,pcts},pcts.map(a=>a.buffer))}};
