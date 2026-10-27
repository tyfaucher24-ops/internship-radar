/* V16: only http(s)/mailto/tel/relative links may become an href; anything else (javascript:, data:, vbscript:) becomes '#'. */
window.safeUrl=u=>{const s=String(u??'').trim();if(!s)return '';const k=s.replace(/[\u0000-\u0020]/g,'').toLowerCase();const m=k.match(/^([a-z][a-z0-9+.\-]*):/);return m&&!/^(https?|mailto|tel)$/.test(m[1])?'#':s};
/* V16 CSP: no inline event handlers. Markup uses data-act="name" (+data-*) and these delegated listeners instead. */
window.ACT=window.ACT||{};
ACT.quickSearch=()=>window.quickSearch&&quickSearch();ACT.reload=()=>location.reload();ACT.clearAll=()=>window.clearAll&&clearAll();
ACT.dismissNotify=el=>{Store.set('notify',[]);el.parentNode.remove()};
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act]');if(b&&ACT[b.dataset.act])ACT[b.dataset.act](b,e)});
document.addEventListener('keydown',e=>{const b=e.target.closest&&e.target.closest('[data-keyclick]');if(b&&(e.key==='Enter'||e.key===' ')){e.preventDefault();const t=document.getElementById(b.dataset.keyclick);t&&t.click()}});
document.addEventListener('submit',e=>{if(e.target&&e.target.id==='pf')e.preventDefault()});
/* broken company logo -> coloured initials tile (was an inline onerror) */
document.addEventListener('error',e=>{const i=e.target;if(!(i&&i.tagName==='IMG'&&i.dataset&&i.dataset.ini!=null))return;const p=i.parentNode;p.classList.remove('has-img');p.style.setProperty('--h',i.dataset.hue);i.replaceWith(document.createTextNode(i.dataset.ini))},true);
document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[href]');if(a&&/^(javascript|vbscript):/i.test(a.getAttribute('href').replace(/[\u0000-\u0020]/g,'')))e.preventDefault()},true);
/* Single storage module. Everything the user owns lives here (localStorage today).
   To move to real accounts later, swap the backend object below for an API-backed one; callers keep using Store.get/set. */
window.Store=(()=>{
  const P='idr_',VERSION=2;
  const KEYS=['profile','resumeText','savedFilters','myListings','reviewQueue','resume','contacts','tpls','practice','tracker','prefs','filters','notify','reports','missingQueue','trackerCols','trackerSort','trackerW','profileDraft','resumeParse','warmpaths','autopilot','apSeen','apCal','apCalOff','sortPicked'];
  /* V12: never crash and never lose data silently. Private mode / disabled storage falls back to memory;
     a full disk keeps the old value and tells the user; unreadable JSON is backed up before anything overwrites it. */
  const MEM=new Map();let LS=null;try{LS=window.localStorage;const t=P+'__t';LS.setItem(t,'1');LS.removeItem(t)}catch{LS=null}
  const warn=msg=>{window.STORE_WARN=msg;try{document.dispatchEvent(new CustomEvent('store:warn',{detail:msg}))}catch{}};
  if(!LS)setTimeout(()=>warn('Your browser is blocking storage (private mode?). Changes work for this visit but won’t be saved.'),0);
  const backend={read:k=>LS?LS.getItem(P+k):(MEM.has(k)?MEM.get(k):null),
    write:(k,v)=>{if(!LS){MEM.set(k,v);return true}try{LS.setItem(P+k,v);return true}catch(e){warn('Your browser storage is full, so the last change was not saved. Export your data (Profile → Export) and clear old items.');return false}},
    del:k=>{if(LS)try{LS.removeItem(P+k)}catch{}MEM.delete(k)}};
  const subs=[];
  const get=(k,d)=>{let raw=null;try{raw=backend.read(k)}catch{return d}if(raw==null)return d;try{const v=JSON.parse(raw);return v??d}catch{
    try{if(LS&&!LS.getItem(P+k+'__corrupt'))LS.setItem(P+k+'__corrupt',raw)}catch{}console.info('Intern Index: saved "'+k+'" was unreadable; a copy was kept as '+P+k+'__corrupt');return d}};
  /* V16 P3: remember when each key last changed on this device (used for last-write-wins when syncing) */
  const touch=k=>{if(k==='_mtime')return;try{const m=JSON.parse(backend.read('_mtime')||'{}');m[k]=new Date().toISOString();backend.write('_mtime',JSON.stringify(m))}catch{}};
  const set=(k,v,o)=>{const ok=backend.write(k,JSON.stringify(v));if(ok){if(!(o&&o.remote))touch(k);subs.forEach(f=>f(k,v,o))}return ok};
  const remove=(k,o)=>{backend.del(k);if(!(o&&o.remote))touch(k);subs.forEach(f=>f(k,undefined,o))};
  const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  // one-time migration from V1 keys
  if(get('saved')&&!get('savedFilters')){set('savedFilters',get('saved',[]).map(s=>({id:uid(),name:s.n,filters:{q:s.v.q||'',industry:s.v.fld||'',state:s.v.loc||'',window:s.v.win||''}})));remove('saved')}
  if(get('profile')&&get('resume')){const p=get('profile'),r=get('resume');if(r.major&&!p.major){Object.assign(p,{major:r.major,classYear:r.year,industries:(r.fields||'').split(',').map(s=>s.trim()).filter(Boolean),locations:r.loc||''});set('profile',p)}}
  function exportAll(){const data={};KEYS.forEach(k=>{const v=get(k);if(v!==undefined&&v!==null)data[k]=v});
    return {app:'internship-deadline-radar',version:VERSION,exported:new Date().toISOString(),data}}
  function importAll(obj,{merge=false}={}){if(!obj||obj.app!=='internship-deadline-radar'||typeof obj.data!=='object')throw new Error('Not an Intern Index export file');
    Object.entries(obj.data).forEach(([k,v])=>{if(!KEYS.includes(k))return;const cur=get(k);
      if(merge&&Array.isArray(cur)&&Array.isArray(v)){const ids=new Set(cur.map(x=>x&&x.id));set(k,cur.concat(v.filter(x=>!x||!ids.has(x.id))))}else set(k,v)});
    return Object.keys(obj.data).filter(k=>KEYS.includes(k))}
  function clear(){KEYS.forEach(remove)}
  function download(name,obj){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(obj,null,1)],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
  const mtimes=()=>{try{return JSON.parse(backend.read('_mtime')||'{}')}catch{return {}}};
  return {get,set,remove,uid,exportAll,importAll,clear,download,onChange:f=>subs.push(f),KEYS,mtimes};
})();
/* Submissions: saved to the user's own list + a review queue. When a free endpoint exists, set SUBMIT_ENDPOINT and it is POSTed too. */
window.Submissions={SUBMIT_ENDPOINT:null,
  async submit(listing){const mine=Store.get('myListings',[]);mine.unshift(listing);Store.set('myListings',mine);
    const q=Store.get('reviewQueue',[]);q.unshift({...listing,queue_status:'pending',submitted:new Date().toISOString()});Store.set('reviewQueue',q);
    if(this.SUBMIT_ENDPOINT){try{await fetch(this.SUBMIT_ENDPOINT,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(listing)})}catch(e){console.warn('queue endpoint unreachable; kept locally')}}
    return listing}};
