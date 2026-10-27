/* V16 Phase 5: cookie-free usage counts, an in-app "Report a problem", and a small error log.
   Sends only whitelisted event names (no ids, no URLs, no profile or resume data) to Supabase RPCs from migration 0003.
   Off when cloud-config.js is empty, with ?cloud=0, or when the browser sends Do Not Track / Global Privacy Control
   (reports you choose to send still go through). If 0003 isn't installed yet, it switches itself off quietly. */
window.Telemetry=(()=>{
  const C=window.CLOUD_CONFIG||{};const on=!!(C.url&&C.anonKey)&&!/[?&]cloud=0\b/.test(location.search);
  const quiet=navigator.doNotTrack==='1'||window.doNotTrack==='1'||navigator.globalPrivacyControl===true;
  const OFF='idr__tel_off';let dead=false;try{dead=sessionStorage.getItem(OFF)==='1'}catch{}
  const rpc=async(fn,body,keepalive)=>{if(!on||dead)return null;
    const r=await fetch(C.url+'/rest/v1/rpc/'+fn,{method:'POST',keepalive:!!keepalive,headers:{apikey:C.anonKey,'content-type':'application/json'},body:JSON.stringify(body)});
    if(r.status===404){dead=true;try{sessionStorage.setItem(OFF,'1')}catch{}return null}
    if(!r.ok)throw new Error('HTTP '+r.status);const t=await r.text();return t?JSON.parse(t):true};
  let q=[],tmr=null;
  const flush=ka=>{if(!q.length)return;const ev=q.splice(0,20);rpc('track',{events:ev},ka).catch(()=>{})};
  const ev=name=>{if(!on||dead||quiet)return;q.push(name);clearTimeout(tmr);if(q.length>=20)flush();else tmr=setTimeout(flush,4000)};
  addEventListener('pagehide',()=>flush(true));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush(true)});
  // scrub anything that could identify someone before an error leaves the browser
  const scrub=s=>String(s||'').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g,'<email>').replace(/(https?:\/\/[^\s?#]+)[?#]\S*/g,'$1').replace(/\b(eyJ[\w-]+\.[\w-]+\.[\w-]+|sb_[\w-]{10,}|[A-Za-z0-9_-]{32,})\b/g,'<token>').replace(/\d{6,}/g,'<n>').slice(0,300);
  let nerr=0;const seen=new Set();
  const logErr=(msg,src)=>{if(!on||dead||quiet||nerr>=5)return;msg=scrub(msg);if(!msg||seen.has(msg))return;seen.add(msg);nerr++;
    rpc('log_error',{p_msg:msg,p_src:scrub(src).slice(0,200),p_build:String(window.BUILD||'').slice(0,20)}).catch(()=>{})};
  addEventListener('error',e=>{if(e&&e.message)logErr(e.message,(e.filename||'').replace(location.origin,'')+':'+(e.lineno||0))});
  addEventListener('unhandledrejection',e=>{const r=e&&e.reason;logErr('Unhandled: '+(r&&r.message||r),'')});
  const report=async(kind,listingId,note,page)=>{ev('report');
    try{return (await rpc('submit_report',{p_kind:kind,p_listing_id:listingId||null,p_note:note?String(note).slice(0,1000):null,p_page:page||null}))===true}catch{return false}};
  // hooks
  if(on&&!quiet){
    let lastPage='';const pv=()=>{const p=(document.querySelector('.page:not([hidden])')||{}).id||'';if(p&&p!==lastPage){lastPage=p;ev('pageview');if(p==='t-feedback')ev('feedback_view')}};
    const mo=new MutationObserver(()=>pv());const start=()=>{pv();document.querySelectorAll('.page').forEach(s=>mo.observe(s,{attributes:true,attributeFilter:['hidden']}))};
    document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();
    document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a.btn-apply,a[data-apply]');if(a)ev('apply_click')},true);
    const size=v=>v?Array.isArray(v)?v.length:Object.keys(v).length:0;
    if(window.Store&&Store.onChange)Store.onChange((k,v,o)=>{if(o&&o.remote)return;
      if(k==='tracker'&&size(v)>size(o&&o.prev!==undefined?o.prev:prevT)){ev('save')}if(k==='tracker')prevT=v;
      if(k==='resumeText'&&v)ev('resume_upload')});
    let prevT=window.Store?Store.get('tracker',null):null;
    document.addEventListener('cloud:change',()=>{try{const u=window.Cloud&&Cloud.user&&Cloud.user();if(!u||!u.created_at)return;const f='idr__tel_su_'+String(u.id).slice(0,8);
      if(Date.now()-Date.parse(u.created_at)<30*60e3&&!localStorage.getItem(f)){localStorage.setItem(f,'1');ev('signup')}}catch{}});
  }
  return {enabled:on,quiet,ev,report,_scrub:scrub,available:()=>on&&!dead};
})();
