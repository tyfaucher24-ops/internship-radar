/* V17: Email alerts settings (Profile), one-click unsubscribe links, ?ref=email deep links, and V17 usage events.
   Events go to track_events (migration 0005): whitelisted names only, a per-day random id in sessionStorage (no cookies),
   user_id only from the signed-in token. Do Not Track / Global Privacy Control: no anonymous events at all. */
(()=>{
  const C=window.CLOUD_CONFIG||{};const on=!!(window.Cloud&&Cloud.enabled);const $e=id=>document.getElementById(id);
  const quiet=navigator.doNotTrack==='1'||window.doNotTrack==='1'||navigator.globalPrivacyControl===true;
  const h=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const anonRpc=async(fn,body)=>{const r=await fetch(C.url+'/rest/v1/rpc/'+fn,{method:'POST',headers:{apikey:C.anonKey,'content-type':'application/json'},body:JSON.stringify(body)});
    if(!r.ok)throw new Error('HTTP '+r.status);const t=await r.text();return t?JSON.parse(t):null};
  /* ---- events ---- */
  const aid=()=>{const d=new Date().toISOString().slice(0,10);try{let v=JSON.parse(sessionStorage.getItem('idr__aid')||'null');
    if(!v||v.d!==d){const a=new Uint8Array(12);crypto.getRandomValues(a);v={d,a:[...a].map(b=>(b%36).toString(36)).join('')};sessionStorage.setItem('idr__aid',JSON.stringify(v))}return v.a}catch{return null}};
  let q=[],tm=null,dead=false;
  const flush=()=>{if(!q.length||dead)return;const b=q.splice(0,25);const s=Cloud.signedIn&&Cloud.signedIn();
    (s?Cloud.rpc('track_events',{p_events:b}):anonRpc('track_events',{p_events:b})).catch(e=>{if(/404/.test(e.message)||e.status===404)dead=true})};
  const ev=(e,r)=>{if(!on)return;const s=Cloud.signedIn&&Cloud.signedIn();if(quiet&&!s)return;const o={e};if(!quiet)o.a=aid();if(r)o.r=String(r).slice(0,40);
    q.push(o);clearTimeout(tm);if(q.length>=25)flush();else tm=setTimeout(flush,3000)};
  addEventListener('pagehide',flush);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush()});
  window.Events17={ev,flush,quiet,_q:()=>q};
  /* ---- deep links: ?ref=email#l=<listing id> ---- */
  const ref=new URLSearchParams(location.search).get('ref');const lm=/^#l=([\w.:-]{1,120})$/.exec(location.hash);
  if(ref==='email')ev('email_click',(new URLSearchParams(location.search).get('t')||'').replace(/[^a-z]/g,'')||null);
  if(lm)document.addEventListener('radar:data',()=>{try{const x=BYID.get(lm[1]);history.replaceState(null,'',location.pathname+location.search);
    if(x)setTimeout(()=>openDrawer(x),50);else{const n=$e('notice');if(n)n.innerHTML='<div class="ok" role="status">That internship is no longer listed. It may have closed.</div>'}}catch{}},{once:true});
  /* ---- unsubscribe: #unsub=<token>&t=<all|digest|reminders|matches> (no login needed) ---- */
  const um=/^#unsub=([a-f0-9]{40,80})(?:&t=(all|digest|reminders|matches))?$/.exec(location.hash);
  if(um){history.replaceState(null,'',location.pathname);const t=um[2]||'all';const what={all:'all Intern Index emails',digest:'the weekly digest',reminders:'deadline reminders',matches:'new match emails'}[t];
    const show=html=>{const go=()=>{const n=$e('notice');if(n){n.innerHTML=html;n.scrollIntoView&&n.scrollIntoView({block:'nearest'})}};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',go):go();setTimeout(go,1500)};
    if(!C.url){show('<div class="err" role="alert">Unsubscribe isn’t available right now. Reply to the email and we’ll remove you.</div>')}
    else anonRpc('email_unsubscribe',{p_token:um[1],p_type:t}).then(ok=>show(ok?`<div class="ok" role="status" id="unsubOk">You’re unsubscribed from ${h(what)}. You can turn emails back on in My Profile.</div>`:'<div class="err" role="alert">That unsubscribe link didn’t match an account. It may be old. Reply to the email and we’ll remove you.</div>'))
      .catch(()=>show('<div class="err" role="alert">Couldn’t unsubscribe right now. Try the link again in a minute.</div>'))}
  /* ---- Profile: Email alerts ---- */
  const DOW=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const hr=n=>(n%12||12)+(n<12?' AM':' PM');
  const tz=()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'America/New_York'}catch{return 'America/New_York'}};
  let prefs=null,loading=false;
  function box(){let b=$e('emailAlerts');if(b)return b;const w=document.querySelector('#t-profile .pf3-wrap');if(!w)return null;
    b=document.createElement('section');b.id='emailAlerts';b.className='ea-box';b.setAttribute('aria-labelledby','eaH');w.appendChild(b);
    b.addEventListener('change',onChange);b.addEventListener('click',e=>{if(e.target.id==='eaSignIn'){e.preventDefault();window.AccountUI&&AccountUI.open?AccountUI.open():(location.hash='signin')}});return b}
  function render(){const b=box();if(!b)return;
    if(!on){b.hidden=true;return}b.hidden=false;
    if(!Cloud.signedIn()){b.innerHTML=`<h2 id="eaH">Email alerts</h2><p class="ea-help">Get a reminder before your saved internships close and a weekly list of new matches.</p><button type="button" class="btn" id="eaSignIn">Sign in to get deadline alerts</button>`;return}
    if(!prefs){b.innerHTML=`<h2 id="eaH">Email alerts</h2><p class="ea-help" role="status">${loading?'Loading your email settings…':'Couldn’t load your email settings. Try again later.'}</p>`;return}
    const p=prefs,dis=p.opted_in?'':' disabled';
    b.innerHTML=`<h2 id="eaH">Email alerts</h2>
<label class="ea-opt"><input type="checkbox" id="eaOpt"${p.opted_in?' checked':''}> Email me about my saved deadlines and new matches.</label>
<p class="ea-help">Sent to ${h((Cloud.user()||{}).email||'your sign-in email')}. No emails unless this is checked. Every email has a one-click unsubscribe link.</p>
<fieldset class="ea-set"${dis}><legend class="ea-leg">What to send</legend>
<label class="pf-tog"><input type="checkbox" id="eaDigest"${p.digest?' checked':''}><span></span> Weekly digest</label>
<label class="pf-tog"><input type="checkbox" id="eaRem"${p.reminders?' checked':''}><span></span> Deadline reminders (7 days and 2 days before)</label>
<label class="pf-tog"><input type="checkbox" id="eaMatch"${p.matches?' checked':''}><span></span> New top matches in the digest</label>
<div class="ea-when"><label>Digest day <select id="eaDow">${DOW.map((d,i)=>`<option value="${i}"${i===p.digest_dow?' selected':''}>${d}</option>`).join('')}</select></label>
<label>Time <select id="eaHour">${Array.from({length:24},(_,i)=>`<option value="${i}"${i===p.digest_hour?' selected':''}>${hr(i)}</option>`).join('')}</select></label></div>
<p class="ea-help">Time zone: ${h(p.tz)}</p></fieldset><p id="eaMsg" class="ea-msg" role="status" aria-live="polite"></p>`}
  async function load(){if(!on||!Cloud.signedIn()){prefs=null;render();return}loading=true;render();
    try{prefs=await Cloud.rpc('save_email_prefs',{p:{}});if(prefs&&prefs.tz!==tz()&&!prefs.opted_in)prefs=await Cloud.rpc('save_email_prefs',{p:{tz:tz()}})}catch{prefs=null}loading=false;render()}
  async function onChange(){const g=id=>$e(id);const p={opted_in:g('eaOpt').checked,tz:tz()};
    if(g('eaDigest')){Object.assign(p,{digest:g('eaDigest').checked,reminders:g('eaRem').checked,matches:g('eaMatch').checked,digest_dow:+g('eaDow').value,digest_hour:+g('eaHour').value})}
    try{prefs=await Cloud.rpc('save_email_prefs',{p});render();$e('eaMsg').textContent='Saved.'}catch(e){render();$e('eaMsg').textContent='Couldn’t save. Try again.'}}
  document.addEventListener('radar:page',e=>{if(e.detail==='profile')load()});
  document.addEventListener('cloud:change',()=>{prefs=null;if($e('t-profile')&&!$e('t-profile').hidden)load()});
  /* ---- event hooks ---- */
  if(on){
    if(!quiet)ev('visit');
    let wasIn=Cloud.signedIn();
    document.addEventListener('cloud:change',()=>{const s=Cloud.signedIn();if(s&&!wasIn){const u=Cloud.user()||{};ev(u.created_at&&Date.now()-Date.parse(u.created_at)<30*60e3?'signup':'sign_in')}wasIn=s});
    document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a.btn-apply,a[data-apply],a.apc-apply');if(a)ev('apply_click')},true);
    const arr=v=>!v?[]:Array.isArray(v)?v:Object.values(v);
    const st=v=>new Map(arr(v).filter(t=>t&&t.listingId!=null).map(t=>[String(t.listingId),t.status||'']));
    if(window.Store&&Store.onChange){let prev=st(Store.get('tracker',null));let built=window.MatchCore&&MatchCore.hasProfile&&MatchCore.hasProfile(Store.get('profile',{}));
      Store.onChange((k,v,o)=>{if(o&&o.remote)return;
        if(k==='tracker'){const cur=st(v);for(const[id,s]of cur){if(!prev.has(id))ev('save');else if(prev.get(id)!==s)ev('tracker_status_change',s)}for(const id of prev.keys())if(!cur.has(id))ev('unsave');prev=cur}
        if(k==='resumeText'&&v)ev('resume_uploaded');
        if(k==='profile'&&!built&&window.MatchCore&&MatchCore.hasProfile&&MatchCore.hasProfile(v)){built=true;ev('profile_built')}})}
  }
  const init=()=>{render();if(!$e('t-profile').hidden)load()};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
