/* Single storage module. Everything the user owns lives here (localStorage today).
   To move to real accounts later, swap the backend object below for an API-backed one; callers keep using Store.get/set. */
window.Store=(()=>{
  const P='idr_',VERSION=2;
  const KEYS=['profile','resumeText','savedFilters','myListings','reviewQueue','resume','contacts','tpls','practice','tracker','prefs','filters','notify','reports','missingQueue','trackerCols','trackerSort','trackerW','profileDraft'];
  const backend={read:k=>localStorage.getItem(P+k),write:(k,v)=>localStorage.setItem(P+k,v),del:k=>localStorage.removeItem(P+k)};
  const subs=[];
  const get=(k,d)=>{try{const v=JSON.parse(backend.read(k));return v??d}catch{return d}};
  const set=(k,v)=>{backend.write(k,JSON.stringify(v));subs.forEach(f=>f(k,v))};
  const remove=k=>{backend.del(k);subs.forEach(f=>f(k,undefined))};
  const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  // one-time migration from V1 keys
  if(get('saved')&&!get('savedFilters')){set('savedFilters',get('saved',[]).map(s=>({id:uid(),name:s.n,filters:{q:s.v.q||'',industry:s.v.fld||'',state:s.v.loc||'',window:s.v.win||''}})));remove('saved')}
  if(get('profile')&&get('resume')){const p=get('profile'),r=get('resume');if(r.major&&!p.major){Object.assign(p,{major:r.major,classYear:r.year,industries:(r.fields||'').split(',').map(s=>s.trim()).filter(Boolean),locations:r.loc||''});set('profile',p)}}
  function exportAll(){const data={};KEYS.forEach(k=>{const v=get(k);if(v!==undefined&&v!==null)data[k]=v});
    return {app:'internship-deadline-radar',version:VERSION,exported:new Date().toISOString(),data}}
  function importAll(obj,{merge=false}={}){if(!obj||obj.app!=='internship-deadline-radar'||typeof obj.data!=='object')throw new Error('Not an Internship Radar export file');
    Object.entries(obj.data).forEach(([k,v])=>{if(!KEYS.includes(k))return;const cur=get(k);
      if(merge&&Array.isArray(cur)&&Array.isArray(v)){const ids=new Set(cur.map(x=>x&&x.id));set(k,cur.concat(v.filter(x=>!x||!ids.has(x.id))))}else set(k,v)});
    return Object.keys(obj.data).filter(k=>KEYS.includes(k))}
  function clear(){KEYS.forEach(remove)}
  function download(name,obj){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(obj,null,1)],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
  return {get,set,remove,uid,exportAll,importAll,clear,download,onChange:f=>subs.push(f),KEYS};
})();
/* Submissions: saved to the user's own list + a review queue. When a free endpoint exists, set SUBMIT_ENDPOINT and it is POSTed too. */
window.Submissions={SUBMIT_ENDPOINT:null,
  async submit(listing){const mine=Store.get('myListings',[]);mine.unshift(listing);Store.set('myListings',mine);
    const q=Store.get('reviewQueue',[]);q.unshift({...listing,queue_status:'pending',submitted:new Date().toISOString()});Store.set('reviewQueue',q);
    if(this.SUBMIT_ENDPOINT){try{await fetch(this.SUBMIT_ENDPOINT,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(listing)})}catch(e){console.warn('queue endpoint unreachable; kept locally')}}
    return listing}};
