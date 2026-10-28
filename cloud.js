/* V16 Phase 3: optional accounts + cloud sync (Supabase Auth + PostgREST over fetch; no SDK, no new dependency).
   Off unless cloud-config.js has a url + anon key. Guest mode (localStorage) is unchanged either way.
   Sign-in: email magic link or Google. Data: one row per item in public.user_items, protected by Row Level Security. */
window.Cloud=(()=>{
  const C=window.CLOUD_CONFIG||{};const off=/[?&]cloud=0\b/.test(location.search);
  const enabled=!!(C.url&&C.anonKey&&/^https:\/\/[a-z0-9-]+\.supabase\.co$|^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(C.url))&&!off;
  const SK='idr__cloud_session',MK='idr__cloud_meta';
  const api={enabled};if(!enabled)return api;
  const S=window.SyncCore;const now=()=>new Date().toISOString();
  let sess=null;try{sess=JSON.parse(localStorage.getItem(SK)||'null')}catch{}
  const save=s=>{sess=s;try{s?localStorage.setItem(SK,JSON.stringify(s)):localStorage.removeItem(SK)}catch{}};
  const emit=(n,d)=>document.dispatchEvent(new CustomEvent('cloud:'+n,{detail:d}));
  async function http(path,{method='GET',body,auth=true,headers={}}={}){
    const h={apikey:C.anonKey,'content-type':'application/json',...headers};
    if(auth){const t=await token();if(!t)throw new Error('signed out');h.authorization='Bearer '+t}
    let r;try{r=await fetch(C.url+path,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)})}catch(x){const e=new Error('network');e.code='network';throw e}
    if(r.status===401&&auth){save(null);emit('change');const e=new Error('session expired');e.code='session_expired';throw e}
    const txt=await r.text();let j=null;try{j=txt?JSON.parse(txt):null}catch{}
    if(!r.ok){const e=new Error((j&&(j.msg||j.message||j.error_description||j.error))||('HTTP '+r.status));e.status=r.status;e.code=j&&(j.error_code||j.code||(typeof j.error==='string'?j.error:''))||'';throw e}
    return j}
  async function token(){if(!sess)return null;
    if(sess.expires_at&&sess.expires_at*1000-Date.now()<60000){
      try{const j=await http('/auth/v1/token?grant_type=refresh_token',{method:'POST',auth:false,body:{refresh_token:sess.refresh_token}});save(toSess(j))}
      catch(e){if(e.status>=400&&e.status<500){save(null);emit('change')}return null}}
    return sess&&sess.access_token}
  const toSess=j=>({access_token:j.access_token,refresh_token:j.refresh_token,expires_at:j.expires_at||Math.floor(Date.now()/1000)+(+j.expires_in||3600),user:{id:j.user&&j.user.id,email:j.user&&j.user.email,created_at:j.user&&j.user.created_at}});
  const redirect=()=>location.origin+location.pathname;
  // returning from the magic link / Google: tokens arrive in the URL hash
  // errors (OAuth or an expired link) can arrive in the query string or the hash
  function readReturn(){const h=location.hash,q=location.search;const hp=new URLSearchParams(h.slice(1)),qp=new URLSearchParams(q.slice(1));
    const errP=hp.get('error')||hp.get('error_description')?hp:qp.get('error')||qp.get('error_description')?qp:null;
    if(!/access_token=/.test(h)&&!errP)return null;
    if(errP){const em=errP.get('error_description')||errP.get('error'),ec=errP.get('error_code')||errP.get('error')||'';['error','error_code','error_description'].forEach(k=>qp.delete(k));const qs=qp.toString();history.replaceState(null,'',location.pathname+(qs?'?'+qs:''));
      const e=new Error(em);e.code=ec;e.oauth=true;return {error:e}}
    history.replaceState(null,'',location.pathname+location.search);
    return {access_token:hp.get('access_token'),refresh_token:hp.get('refresh_token'),expires_at:+hp.get('expires_at')||Math.floor(Date.now()/1000)+(+hp.get('expires_in')||3600)}}
  // V16.2: plain-words messages for auth errors. Raw server strings are never shown.
  api.googleOn=!!C.google;
  api.friendly=(e,ctx)=>{const m=String(e&&e.message||e||'').toLowerCase(),c=String(e&&e.code||'').toLowerCase(),st=+(e&&e.status)||0,g=api.googleOn;
    if(c==='network'||(typeof navigator!=='undefined'&&navigator.onLine===false)||/failed to fetch|networkerror|load failed/.test(m))return "You seem to be offline. Check your connection and try again.";
    if(c==='cooldown')return 'Please wait a minute before asking for another link.';
    if(/otp_expired|expired|already used|invalid.*(link|token|grant)/.test(c+' '+m)&&c!=='session_expired')return 'That sign-in link has expired or was already used. Ask for a new one.';
    if(c==='bad_email'||c==='email_address_invalid'||c==='validation_failed'&&/email/.test(m)||/invalid.*email|email.*invalid/.test(m))return "That email address doesn't look right. Check it and try again.";
    if(/rate.?limit/.test(c+' '+m)||st===429)return 'Too many sign-in emails right now. '+(g?'Try Continue with Google or try again in a bit.':'Try again in a bit.');
    if(/provider/.test(c+' '+m)&&/not enabled|disabled|unsupported/.test(c+' '+m))return "Google sign-in isn't available right now. Use the email link instead.";
    if(c==='access_denied'||/access.?denied|cancel/.test(m))return 'Google sign-in was cancelled. You can try again or use the email link.';
    if(c==='session_expired'||c==='signed_out')return 'Your session ended. Please sign in again.';
    if(/signup.*(disabled|not allowed)/.test(c+' '+m))return 'New sign-ups are paused right now. Try again later.';
    if(st>=500||/server_error|temporarily_unavailable/.test(c))return 'Sign-in is having trouble right now. Try again in a few minutes.';
    return ctx==='sync'?"Couldn't sync right now. Your data is still saved on this device.":'Something went wrong signing in. Please try again in a bit.'};
  let lastLink=0;
  api.user=()=>sess&&sess.user;
  api.signedIn=()=>!!(sess&&sess.access_token);
  api.sendLink=async email=>{email=String(email||'').trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){const e=new Error('bad email');e.code='bad_email';throw e}
    if(Date.now()-lastLink<60000){const e=new Error('cooldown');e.code='cooldown';throw e}
    lastLink=Date.now();await http('/auth/v1/otp?redirect_to='+encodeURIComponent(redirect()),{method:'POST',auth:false,body:{email,create_user:true}})};
  api.google=()=>{if(!api.googleOn)return;location.href=C.url+'/auth/v1/authorize?provider=google&redirect_to='+encodeURIComponent(redirect())};
  api.signOut=async()=>{try{await http('/auth/v1/logout',{method:'POST'})}catch{}save(null);try{localStorage.removeItem(MK)}catch{}emit('change')};
  api.rpc=(fn,body)=>http('/rest/v1/rpc/'+encodeURIComponent(fn),{method:'POST',body:body||{}});
  api.isAdmin=async()=>{if(!api.signedIn())return false;try{return (await http('/rest/v1/rpc/is_admin',{method:'POST',body:{}}))===true}catch{return false}};
  api.deleteAccount=async()=>{await http('/rest/v1/rpc/delete_my_account',{method:'POST',body:{}});save(null);try{localStorage.removeItem(MK)}catch{}emit('change')};
  api.exportCloud=async()=>{const rows=await pull();return {app:'internship-deadline-radar',kind:'cloud-account-export',exported:now(),user:sess.user,rows}};
  // ---- sync ----
  const meta=()=>{try{const m=JSON.parse(localStorage.getItem(MK)||'null');return m&&m.uid===sess.user.id?m:{uid:sess.user.id,rows:{}}}catch{return {uid:sess.user.id,rows:{}}}};
  const saveMeta=m=>{try{localStorage.setItem(MK,JSON.stringify(m))}catch{}};
  async function pull(){let out=[],from=0;for(;;){const page=await http('/rest/v1/user_items?select=coll,item_id,data,deleted,updated_at&order=coll,item_id',{headers:{range:from+'-'+(from+999),'range-unit':'items'}});out=out.concat(page||[]);if(!page||page.length<1000)break;from+=1000}return out}
  async function push(rows){for(let i=0;i<rows.length;i+=200){const b=rows.slice(i,i+200).map(r=>({user_id:sess.user.id,...r}));
    await http('/rest/v1/user_items?on_conflict=user_id,coll,item_id',{method:'POST',body:b,headers:{prefer:'resolution=merge-duplicates,return=minimal'}})}}
  let busy=null;
  api.sync=()=>busy||(busy=(async()=>{try{if(!api.signedIn())return {applied:0,pushed:0};const m=meta();const keys=S.keysFor(Store.get('prefs',{}));const local={};keys.forEach(k=>{const v=Store.get(k);if(v!==undefined)local[k]=v});
      const cloud=await pull();const r=S.merge(local,m.rows,cloud,now(),keys,Store.mtimes());
      await push(r.push);const applied=Object.keys(r.apply);applied.forEach(k=>r.apply[k]===undefined?Store.remove(k,{remote:true}):Store.set(k,r.apply[k],{remote:true}));
      m.rows=r.meta;m.last=now();saveMeta(m);emit('synced',{applied:applied.length,pushed:r.push.length});return {applied:applied.length,pushed:r.push.length}}
    catch(e){e.ctx='sync';emit('error',e);throw e}finally{busy=null}})());
  let tmr=null;
  Store.onChange((k,v,o)=>{if(o&&o.remote||!api.signedIn())return;if(!S.keysFor(Store.get('prefs',{})).includes(k))return;clearTimeout(tmr);tmr=setTimeout(async()=>{
    // pull + merge before pushing, so a stale row on this device can't overwrite a newer edit made elsewhere
    try{const r=await api.sync();if(r.applied)emit('remote',r)}catch(e){}},1200)});
  let lastPull=0;document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&api.signedIn()&&Date.now()-lastPull>60000){lastPull=Date.now();api.sync().then(r=>r.applied&&emit('remote',r)).catch(()=>{})}});
  async function onReturn(ret){
    if(ret&&ret.error){const fire=()=>setTimeout(()=>emit('error',ret.error),0);document.readyState==='complete'?fire():addEventListener('load',fire,{once:true});return true}
    if(ret&&ret.access_token){save({...ret,user:null});try{const u=await http('/auth/v1/user');save({...sess,user:{id:u.id,email:u.email,created_at:u.created_at}});
        const first=!meta().last;const r=await api.sync();try{sessionStorage.setItem('idr__cloud_justin','1')}catch{}emit('change');if(first&&r.applied)emit('remote',{...r,first:true})}catch(e){save(null);emit('error',e)}return true}
    return false}
  // same-tab return (link opened in an already-open tab) arrives as a hash change, not a page load
  const chk=()=>{const r=readReturn();if(r)onReturn(r)};window.addEventListener('popstate',chk);window.addEventListener('hashchange',chk);
  api.ready=(async()=>{if(await onReturn(readReturn()))return;
    if(api.signedIn())api.sync().then(r=>r.applied&&emit('remote',r)).catch(()=>{})})();
  return api})();
