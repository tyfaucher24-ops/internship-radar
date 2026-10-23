// Bulk rescoring off the main thread. Receives slim listings once, then a profile per rescore; returns [id,pct] pairs.
importScripts('match-core.js'+self.location.search);let ROWS=[],C={},W={};const TK={long:1,reach:2,realistic:3};/* V13.3 §7g: tag codes (0 = none) */
onmessage=e=>{const m=e.data;if(m.t==='init'){ROWS=m.rows;C=m.cfg;W=m.w;return}
 if(m.t==='score'){const t0=Date.now(),P=MatchCore.profile(m.profile),ids=[],pct=new Uint8Array(ROWS.length),tag=new Uint8Array(ROWS.length),od=new Uint8Array(ROWS.length);
  for(let i=0;i<ROWS.length;i++){{const r=MatchCore.score(ROWS[i],P,C,W),v=r.pct;pct[i]=v==null?255:v;tag[i]=r.tag?TK[r.tag.k]:0;od[i]=Math.max(0,Math.min(100,Math.round(r.odds||0)))}}
  postMessage({t:'scores',seq:m.seq,ids:ROWS.map(r=>r.id),pct,tag,od,ms:Date.now()-t0},[pct.buffer,tag.buffer,od.buffer])};
 if(m.t==='multi'){const ids=ROWS.map(r=>r.id),pcts=m.profiles.map(pr=>{const P=MatchCore.profile(pr),a=new Uint8Array(ROWS.length);for(let i=0;i<ROWS.length;i++){const v=MatchCore.score(ROWS[i],P,C,W).pct;a[i]=v==null?255:v}return a});postMessage({t:'multi',ids,pcts},pcts.map(a=>a.buffer))}};
