/* V16.1 "Sign in to save": a guests-only nav button and a one-time, non-blocking nudge.
   Shown only when accounts work (cloud-config filled in AND Supabase answers); otherwise everything stays hidden and guest mode is unchanged.
   Nudge triggers (each fires at most once per device): the first saved/tracked internship, and finishing the profile (resume or manual).
   "Not now" or dismiss snoozes the nudge for 7 days. Never a modal, never on first page load, never during the intro. */
(()=>{const H=document.documentElement,btn=document.getElementById('s2sBtn'),av=document.getElementById('acctAv');
  const C=window.Cloud;const off=()=>{H.classList.add('acct-off');H.classList.remove('acct-in')};
  if(!btn||!C||!C.enabled||!window.AccountUI){off();return}
  const LS={get:k=>{try{return localStorage.getItem(k)}catch{return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch{}}};
  const K={snooze:'idr__s2s_snooze',save:'idr__s2s_save',prof:'idr__s2s_profile',down:'idr__s2s_down'};const WEEK=7*864e5;
  const ev=n=>{try{window.Telemetry&&Telemetry.ev(n)}catch{}};
  let up=true,el=null,lastFocus=null;
  const paint=()=>{const inn=C.signedIn();H.classList.toggle('acct-in',inn);
    if(inn){const e=(C.user()&&C.user().email)||'';av.firstElementChild.textContent=(e[0]||'•').toUpperCase();av.setAttribute('aria-label','Your account'+(e?' ('+e+')':''));hideToast();const h=document.getElementById('acctH'),m=document.getElementById('modal');if(h&&m&&!m.hidden&&h.textContent==='Save your progress')(window.closeModal?closeModal():m.hidden=true)}};
  paint();document.addEventListener('cloud:change',paint);
  const openDlg=src=>{ev('save_prompt_clicked');LS.set('idr__s2s_pending',String(Date.now()));AccountUI.open()};
  btn.addEventListener('click',()=>openDlg('nav'));av.addEventListener('click',()=>AccountUI.open());
  // is Supabase reachable? one small public settings call per session (free); if not, hide the button (keeping its space) and the nudge
  (async()=>{let s=null;try{s=sessionStorage.getItem(K.down)}catch{}if(s==='0')return;if(s==='1'){up=false;H.classList.add('acct-down');return}
    try{const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),6000);
      const r=await fetch(window.CLOUD_CONFIG.url+'/auth/v1/settings',{headers:{apikey:window.CLOUD_CONFIG.anonKey},signal:ctl.signal});clearTimeout(t);up=r.ok}catch{up=false}
    try{sessionStorage.setItem(K.down,up?'0':'1')}catch{}if(!up&&!C.signedIn())H.classList.add('acct-down')})();
  // ---- toast ----
  function hideToast(){if(el&&!el.hidden){el.hidden=true;if(lastFocus&&document.activeElement&&el.contains(document.activeElement))try{lastFocus.focus()}catch{}}}
  function snooze(){LS.set(K.snooze,String(Date.now()));hideToast()}
  function show(){if(!up||C.signedIn()||H.classList.contains('acct-down')||H.classList.contains('acct-off'))return false;
    if(document.body.classList.contains('intro-on'))return false;const z=+LS.get(K.snooze)||0;if(Date.now()-z<WEEK)return false;
    if(!el){el=document.createElement('div');el.id='s2sToast';el.className='s2s-toast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');el.hidden=true;
      el.innerHTML='<p>Saved on this device. Sign in to keep it everywhere.</p><button type="button" class="s2s-go">Sign in to save</button><button type="button" class="s2s-no">Not now</button>';
      el.querySelector('.s2s-go').onclick=()=>{hideToast();openDlg('toast')};el.querySelector('.s2s-no').onclick=snooze;
      document.addEventListener('keydown',e=>{if(e.key==='Escape'&&el&&!el.hidden&&el.contains(document.activeElement))snooze()});document.body.appendChild(el)}
    const old=document.getElementById('toast');if(old)old.className='';lastFocus=document.activeElement;el.hidden=false;ev('save_prompt_shown');return true}
  // triggers: only real user changes after the page has settled (never on first load)
  const ready=Date.now();const size=v=>v?Array.isArray(v)?v.length:Object.keys(v).length:0;let prevT=Store.get('tracker',null);
  const fire=k=>{if(LS.get(k)||Date.now()-ready<1500)return;if(C.signedIn()){LS.set(k,'1');return}if(show())LS.set(k,'1')};
  Store.onChange((k,v,o)=>{if(o&&o.remote)return;
    if(k==='tracker'){const grew=size(v)>size(prevT);prevT=v;if(grew)setTimeout(()=>fire(K.save),400)}
    else if((k==='profile'&&v&&Object.keys(v).length)||(k==='resumeText'&&v))setTimeout(()=>fire(K.prof),400)});
  // after the magic link brings them back: confirm (survives the one-time reload that applies merged data)
  // cloud.js marks a completed magic-link return (survives the one-time reload that applies merged data)
  const welcome=()=>{let j=null;try{j=sessionStorage.getItem('idr__cloud_justin');sessionStorage.removeItem('idr__cloud_justin')}catch{}if(!j||!C.signedIn())return;
    if(Date.now()-(+LS.get('idr__s2s_pending')||0)<864e5)ev('save_prompt_signed_in');try{localStorage.removeItem('idr__s2s_pending')}catch{}
    if(window.toast)toast("You're signed in. Your progress is saved.")};
  document.addEventListener('cloud:change',()=>setTimeout(welcome,1500));setTimeout(welcome,600);
  window.SavePrompt={show,snooze,_keys:K};
})();
