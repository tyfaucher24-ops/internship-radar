/* V16 Phase 3: account UI (profile menu item + dialog). Only runs when accounts are on (cloud-config.js filled in). */
(()=>{if(!window.Cloud||!Cloud.enabled)return;const menu=document.getElementById('pmMenu');if(!menu)return;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const btn=document.createElement('button');btn.type='button';btn.id='acctBtn';menu.insertBefore(btn,menu.firstChild);
  const label=()=>{btn.textContent=Cloud.signedIn()?'Account · synced':'Sign in to save'};label();
  const say=m=>window.toast?toast(m):console.info(m);
  function open(){const m=document.getElementById('modal'),b=document.getElementById('mbody');if(!m||!b)return;
    const u=Cloud.user(),p=Store.get('prefs',{})||{};
    const html=Cloud.signedIn()?`<h2 id="acctH">Your account</h2><p class="muted">Signed in as <b>${esc(u&&u.email)}</b>. Your profile, saved internships, tracker, outreach, Autopilot and preferences sync across devices. Everything still works offline on this device.</p>
      <label class="acct-chk"><input type="checkbox" id="acctResume" ${p.cloudResume?'checked':''}> Also sync my resume text (off by default)</label>
      <p class="crow"><button type="button" id="acctSync">Sync now</button><button type="button" id="acctExport" class="ghost">Export my data</button><button type="button" id="acctOut" class="ghost">Sign out</button></p>
      <p id="acctMsg" class="muted" role="status"></p>
      <details><summary>Delete account</summary><p class="muted">Deletes your account and everything stored in the cloud. Data on this device stays until you use Clear everything on My Profile. Type DELETE to confirm.</p><p class="crow"><input id="acctDelTxt" aria-label="Type DELETE to confirm" autocomplete="off"><button type="button" id="acctDel" class="danger">Delete my account</button></p></details>`
     :(Cloud.googleOn?`<h2 id="acctH">Save your progress</h2><p class="muted">Sign in with Google or get an email link. No password. Your saved internships, tracker and profile carry over.</p>
      <button type="button" id="acctGoogle" class="gsi-btn"><svg class="gsi-g" width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg><span>Continue with Google</span></button>
      <div class="acct-or" role="separator" aria-label="or"><span>or</span></div>`:`<h2 id="acctH">Save your progress</h2><p class="muted">We'll email you a sign-in link. No password. Your saved internships, tracker and profile carry over.</p>`)+`
      <label for="acctEmail">Email</label><p class="crow"><input id="acctEmail" type="email" autocomplete="email" placeholder="you@school.edu"><button type="button" id="acctLink">Email me a sign-in link</button></p>
      <p id="acctMsg" class="muted" role="status"></p>`;
    if(window.openModal)openModal(html);else{b.innerHTML=html;m.hidden=false}m.setAttribute('aria-labelledby','acctH');const $=id=>document.getElementById(id),msg=(t,err)=>{$('acctMsg').textContent=t;$('acctMsg').classList.toggle('acct-err',!!err)};
    if(!Cloud.signedIn()){$('acctLink').onclick=async()=>{msg('Sending…');try{await Cloud.sendLink($('acctEmail').value);msg('Check your email for a sign-in link. You can close this tab’s dialog.')}catch(e){msg(Cloud.friendly(e),1)}};
      $('acctGoogle')&&($('acctGoogle').onclick=()=>{msg('Opening Google…');Cloud.google()});return}
    $('acctResume').onchange=e=>{const q=Store.get('prefs',{})||{};q.cloudResume=e.target.checked;Store.set('prefs',q);msg(e.target.checked?'Resume text will sync.':'Resume text stays on this device.')};
    $('acctSync').onclick=async()=>{msg('Syncing…');try{const r=await Cloud.sync();msg(`Synced. ${r.pushed} sent, ${r.applied} updated here.`);r.applied&&offerReload()}catch(e){msg(Cloud.friendly(e,'sync'),1)}};
    $('acctExport').onclick=async()=>{try{const c=await Cloud.exportCloud();Store.download('intern-index-my-data.json',{...Store.exportAll(),cloud:c})}catch(e){msg(Cloud.friendly(e,'sync'),1)}};
    $('acctOut').onclick=async()=>{await Cloud.signOut();(window.closeModal?closeModal():m.hidden=true);say('Signed out. Your data stays on this device.')};
    $('acctDel').onclick=async()=>{if($('acctDelTxt').value!=='DELETE'){msg('Type DELETE to confirm.');return}msg('Deleting…');try{await Cloud.deleteAccount();(window.closeModal?closeModal():m.hidden=true);say('Account deleted.')}catch(e){msg(Cloud.friendly(e),1)}}}
  function offerReload(){say('Synced changes from your other devices. Reload to see them.')}
  btn.addEventListener('click',()=>{menu.hidden=true;open()});
  document.addEventListener('cloud:change',label);
  document.addEventListener('cloud:remote',e=>{if(e.detail&&e.detail.first)location.reload();else offerReload()});
  document.addEventListener('cloud:error',e=>{const d=e.detail,t=Cloud.friendly(d,d&&d.ctx),m=document.getElementById('acctMsg');
    // a failed sign-in return (Google cancelled, expired link): show it in the sign-in dialog so the next step is right there
    if(d&&d.oauth&&!Cloud.signedIn()){let touched=false;const mark=()=>{touched=true};addEventListener('pointerdown',mark,{once:true});addEventListener('keydown',mark,{once:true});
      const show=()=>{if(touched||Cloud.signedIn())return;if(!document.getElementById('acctMsg')||document.getElementById('modal').hidden)open();const n=document.getElementById('acctMsg');if(n){n.textContent=t;n.classList.add('acct-err')}};
      // wait for the page to settle (first render can reset the modal), then show it once more if something closed it
      setTimeout(show,700);setTimeout(show,2500);return}
    if(m&&!document.getElementById('modal').hidden){m.textContent=t;m.classList.add('acct-err');return}say(t)});
  window.AccountUI={open};
  if(/[#&]signin\b/.test(location.hash))setTimeout(open,0);
})();
