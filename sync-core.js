/* V16 Phase 3: pure cloud-sync logic (no network, no DOM) so it can be unit-tested in Node.
   Each synced Store key becomes rows: arrays of {id,...} objects -> one row per item (item_id = id),
   anything else -> one row with item_id "_". Conflicts: last write wins per row by updated_at. Deletes are tombstones. */
(function(root){
  // what syncs. Raw resume text only with the opt-in toggle (prefs.cloudResume). Admin keys never sync here.
  const SYNC_KEYS=['profile','savedFilters','myListings','contacts','tpls','practice','tracker','prefs','filters','trackerCols','trackerSort','trackerW','warmpaths','autopilot','apSeen','apCal','apCalOff','sortPicked','missingQueue','reports'];
  const OPT_IN_KEYS=['resumeText','resumeParse'];
  const keysFor=prefs=>prefs&&prefs.cloudResume?SYNC_KEYS.concat(OPT_IN_KEYS):SYNC_KEYS.slice();
  const stable=v=>JSON.stringify(v,(k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.keys(x).sort().reduce((o,kk)=>(o[kk]=x[kk],o),{}):x);
  const hash=v=>{const s=stable(v)||'';let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)+':'+s.length};
  const isRowArray=v=>Array.isArray(v)&&v.length>0&&v.every(x=>x&&typeof x==='object'&&(typeof x.id==='string'||typeof x.id==='number')&&String(x.id).length<=80)&&new Set(v.map(x=>String(x.id))).size===v.length;
  function explode(v){const out={};
    if(v===undefined)return out;
    if(isRowArray(v))v.forEach((x,i)=>{out[String(x.id)]={v:x,pos:i}});
    else out['_']={v};
    return out}
  function implode(rows){ // rows: {item_id:{data,deleted}}
    const live=Object.entries(rows).filter(([,r])=>!r.deleted&&r.data);
    if(rows['_']&&!rows['_'].deleted)return rows['_'].data.v;
    const items=live.filter(([id])=>id!=='_');
    if(!items.length)return Object.keys(rows).some(id=>id!=='_')?[]:undefined;
    return items.sort((a,b)=>(a[1].data.pos??0)-(b[1].data.pos??0)).map(([,r])=>r.data.v)}
  /* Compare the current local value of `key` with what was last synced (meta[key] = {item:{h,t}}).
     Returns rows to push and updates meta in place. */
  // row change = item content changed; a row only moving position (pos) is not an edit, so it can't clobber a newer edit elsewhere
  const mk=(d,t)=>{const o={h:hv(d),t};const j=stable(d);if(j&&j.length<=20000)o.b=d;return o};
  const isObj=x=>x&&typeof x==='object'&&!Array.isArray(x);
  const hv=d=>hash(d&&typeof d==='object'&&'v' in d?d.v:d);
  function diffLocal(key,value,meta,nowIso){const m=meta[key]||(meta[key]={});const rows=explode(value);const out=[];
    for(const [id,data] of Object.entries(rows)){const h=hv(data);if(!m[id]||m[id].h!==h||m[id].d){m[id]={h,t:nowIso};out.push({coll:key,item_id:id,data,deleted:false,updated_at:nowIso})}}
    for(const id of Object.keys(m))if(!rows[id]&&!m[id].d){m[id]={h:'',t:nowIso,d:1};out.push({coll:key,item_id:id,data:null,deleted:true,updated_at:nowIso})}
    return out}
  /* First sign-in or any pull. local: {key:value}, meta: last-synced info (empty on first sign-in), cloud: rows from the server.
     Returns {push:[rows], apply:{key:newValue}, meta}. No data loss: anything only on one side survives; same row on both -> newer wins. */
  function merge(local,meta,cloud,nowIso,keys,mtimes){mtimes=mtimes||{};meta=meta||{};const push=[],apply={};const byKey={};
    cloud.forEach(r=>{(byKey[r.coll]||(byKey[r.coll]={}))[r.item_id]=r});
    for(const key of keys){const m=meta[key]||(meta[key]={});const lrows=explode(local[key]);const crow=byKey[key]||{};const result={};let changed=false;
      // a whole-value row and per-item rows can't mix: if the shapes differ, the newer shape wins for the key
      const ids=new Set([...Object.keys(lrows),...Object.keys(crow),...Object.keys(m)]);
      for(const id of ids){const L=lrows[id],C=crow[id];
        // local row time: last sync time if unchanged since, else when this key last changed on this device (Store mtime)
        const lt=L?(m[id]&&!m[id].d&&m[id].h===hv(L)?m[id].t:(mtimes[key]||'1970-01-01T00:00:00.000Z')):(m[id]&&m[id].d?m[id].t:null);
        const ct=C?C.updated_at:null;
        if(L&&!C){result[id]={data:L};push.push({coll:key,item_id:id,data:L,deleted:false,updated_at:lt});m[id]=mk(L,lt);continue}
        if(!L&&C){if(m[id]&&m[id].d&&m[id].t>ct){push.push({coll:key,item_id:id,data:null,deleted:true,updated_at:m[id].t});continue}
          if(m[id]&&!m[id].d&&!C.deleted&&Date.parse(m[id].t)>=Date.parse(ct)){ // deleted locally since last sync
            const t=nowIso;push.push({coll:key,item_id:id,data:null,deleted:true,updated_at:t});m[id]={h:'',t,d:1};continue}
          if(!C.deleted){result[id]={data:C.data};changed=true}m[id]=C.deleted?{h:'',t:ct,d:1}:mk(C.data,ct);continue}
        if(L&&C){const same=!C.deleted&&hv(C.data)===hv(L);
          if(same){result[id]={data:L};m[id]=mk(L,ct>lt?ct:lt);continue}
          // both sides changed since the last sync: merge field by field against the synced base, so an edit to
          // one field (or app-added defaults) on this device can't wipe a different field edited elsewhere
          const B=m[id]&&!m[id].d&&m[id].b;
          if(B&&!C.deleted&&hv(L)!==m[id].h&&hv(C.data)!==m[id].h&&isObj(B.v)&&isObj(L.v)&&isObj(C.data.v)){
            const lNew=Date.parse(lt)>=Date.parse(ct),out={...C.data.v};
            for(const k of Object.keys(L.v)){const lch=stable(L.v[k])!==stable(B.v[k]),cch=stable(C.data.v[k])!==stable(B.v[k]);if(lch&&(!cch||lNew))out[k]=L.v[k]}
            const d={v:out,pos:L.pos},t=Date.parse(nowIso)>Date.parse(ct)?nowIso:new Date(Date.parse(ct)+1).toISOString();
            result[id]={data:d};changed=changed||hv(d)!==hv(L);if(hv(d)!==hv(C.data))push.push({coll:key,item_id:id,data:d,deleted:false,updated_at:t});m[id]=mk(d,t);continue}
          if(Date.parse(lt)>=Date.parse(ct)){result[id]={data:L};push.push({coll:key,item_id:id,data:L,deleted:false,updated_at:lt});m[id]=mk(L,lt)}
          else{changed=true;if(!C.deleted)result[id]={data:C.data};m[id]=C.deleted?{h:'',t:ct,d:1}:mk(C.data,ct)}}}
      if(changed){const v=implode(result);apply[key]=v}}
    return {push,apply,meta}}
  const api={SYNC_KEYS,OPT_IN_KEYS,keysFor,hash,explode,implode,diffLocal,merge};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SyncCore=api;
})(typeof self!=='undefined'?self:this);
