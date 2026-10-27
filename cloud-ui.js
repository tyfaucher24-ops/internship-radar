/* V16 Phase 3: account UI (profile menu item + dialog). Only runs when accounts are on (cloud-config.js filled in). */
(()=>{if(!window.Cloud||!Cloud.enabled)return;const menu=document.getElementById('pmMenu');if(!menu)return;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const btn=document.createElement('button');btn.type='button';btn.id='acctBtn';menu.insertBefore(btn,menu.firstChild);
  const label=()=>{btn.textContent=Cloud.signedIn()?'Account · synced':'Sign in to sync'};label();
  const say=m=>window.toast?toast(m):console.info(m);
  function open(){const m=document.getElementById('modal'),b=document.getElementById('mbody');if(!m||!b)return;
    const u=Cloud.user(),p=Store.get('prefs',{})||{};
    const html=Cloud.signedIn()?`<h2 id="acctH">Your account</h2><p class="muted">Signed in as <b>${esc(u&&u.email)}</b>. Your profile, saved internships, tracker, outreach, Autopilot and preferences sync across devices. Everything still works offline on this device.</p>
      <label class="acct-chk"><input type="checkbox" id="acctResume" ${p.cloudResume?'checked':''}> Also sync my resume text (off by default)</label>
      <p class="crow"><button type="button" id="acctSync">Sync now</button><button type="button" id="acctExport" class="ghost">Export my data</button><button type="button" id="acctOut" class="ghost">Sign out</button></p>
      <p id="acctMsg" class="muted" role="status"></p>
      <details><summary>Delete account</summary><p class="muted">Deletes your account and everything stored in the cloud. Data on this device stays until you use Clear everything on My Profile. Type DELETE to confirm.</p><p class="crow"><input id="acctDelTxt" aria-label="Type DELETE to confirm" autocomplete="off"><button type="button" id="acctDel" class="danger">Delete my account</button></p></details>`
     :`<h2 id="acctH">Sign in to sync</h2><p class="muted">Optional. Without an account everything keeps working and stays on this device. With one, your tracker, profile and saved items follow you to other devices. We never store your resume file.</p>
      <label for="acctEmail">Email</label><p class="crow"><input id="acctEmail" type="email" autocomplete="email" placeholder="you@school.edu"><button type="button" id="acctLink">Email me a sign-in link</button></p>
      ${(window.CLOUD_CONFIG||{}).google?'<p><button type="button" id="acctGoogle" class="ghost">Continue with Google</button></p>':''}
      <p id="acctMsg" class="muted" role="status"></p>`;
    if(window.openModal)openModal(html);else{b.innerHTML=html;m.hidden=false}m.setAttribute('aria-labelledby','acctH');const $=id=>document.getElementById(id),msg=t=>{$('acctMsg').textContent=t};
    if(!Cloud.signedIn()){$('acctLink').onclick=async()=>{msg('Sending…');try{await Cloud.sendLink($('acctEmail').value);msg('Check your email for a sign-in link. You can close this tab’s dialog.')}catch(e){msg(e.message)}};
      $('acctGoogle')&&($('acctGoogle').onclick=()=>Cloud.google());return}
    $('acctResume').onchange=e=>{const q=Store.get('prefs',{})||{};q.cloudResume=e.target.checked;Store.set('prefs',q);msg(e.target.checked?'Resume text will sync.':'Resume text stays on this device.')};
    $('acctSync').onclick=async()=>{msg('Syncing…');try{const r=await Cloud.sync();msg(`Synced. ${r.pushed} sent, ${r.applied} updated here.`);r.applied&&offerReload()}catch(e){msg('Sync failed: '+e.message)}};
    $('acctExport').onclick=async()=>{try{const c=await Cloud.exportCloud();Store.download('intern-index-my-data.json',{...Store.exportAll(),cloud:c})}catch(e){msg('Export failed: '+e.message)}};
    $('acctOut').onclick=async()=>{await Cloud.signOut();(window.closeModal?closeModal():m.hidden=true);say('Signed out. Your data stays on this device.')};
    $('acctDel').onclick=async()=>{if($('acctDelTxt').value!=='DELETE'){msg('Type DELETE to confirm.');return}msg('Deleting…');try{await Cloud.deleteAccount();(window.closeModal?closeModal():m.hidden=true);say('Account deleted.')}catch(e){msg('Delete failed: '+e.message)}}}
  function offerReload(){say('Synced changes from your other devices. Reload to see them.')}
  btn.addEventListener('click',()=>{menu.hidden=true;open()});
  document.addEventListener('cloud:change',label);
  document.addEventListener('cloud:remote',e=>{if(e.detail&&e.detail.first)location.reload();else offerReload()});
  document.addEventListener('cloud:error',e=>say('Account: '+e.detail));
  if(/[#&]signin\b/.test(location.hash))setTimeout(open,0);
})();
