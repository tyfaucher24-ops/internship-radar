/* V13 Deadline Autopilot: on-site reminders for internships you pick. Saved on this device only.
   Email reminders are not built yet (toggle is shown disabled: "coming soon"). */
(function(){
if(typeof APCore==='undefined')return;
const KEY='autopilot',$a=id=>document.getElementById(id);
const st=()=>{const s=Store.get(KEY,null);return s&&s.v===1?s:{v:1,items:{}}};
const put=s=>{Store.set(KEY,s);badge();document.dispatchEvent(new CustomEvent('radar:autopilot'))};
const L=id=>(typeof BYID!=='undefined'&&BYID.get(id))||null;
function snapOf(x){return{co:x.company,ti:x.title,dl:x.deadline||'',ro:!!x.rolling}}
const AP=window.Autopilot={
 has:id=>!!st().items[id],
 add(id){const s=st();if(s.items[id])return false;const x=L(id);if(!x)return false;s.items[id]={added:new Date().toISOString(),done:[],snap:snapOf(x)};put(s);return true},
 addMany(ids){let n=0;ids.forEach(id=>{AP.add(id)&&n++});return n},
 remove(id){const s=st();delete s.items[id];put(s)},
 list(){const s=st();return Object.keys(s.items).map(id=>{const it=s.items[id],x=L(id)||{id,company:it.snap.co,title:it.snap.ti,deadline:it.snap.dl,rolling:it.snap.ro,st:L(id)?undefined:'closed'};return{id,it,x,p:APCore.plan(x,it.added)}})},
 due(){return AP.list().flatMap(r=>APCore.dueSteps(r.p,r.it.done).map(s=>({r,s})))}};
function done(id,key){const s=st();const it=s.items[id];if(!it)return;it.done=[...new Set(it.done.concat(key))];put(s)}
/* ---- nav tab + badge ---- */
const nav=document.querySelector('.nav');if(nav&&!$a('apTab')){const a=document.createElement('a');a.href='#autopilot';a.dataset.go='autopilot';a.dataset.t='autopilot';a.id='apTab';a.innerHTML='Autopilot <span class="nbadge" id="apN" hidden></span>';const tr=nav.querySelector('[data-t=tracker]');tr?tr.after(a):nav.prepend(a)}
function badge(){const n=AP.due().length,b=$a('apN');if(!b)return;b.hidden=!n;b.textContent=n||'';b.setAttribute('aria-label',n+' reminder'+(n===1?'':'s')+' due')}
/* ---- page ---- */
if(typeof PAGES!=='undefined'&&!PAGES.includes('autopilot'))PAGES.push('autopilot');
const main=$a('main');let sec=$a('t-autopilot');
if(main&&!sec){sec=document.createElement('section');sec.id='t-autopilot';sec.className='page';sec.hidden=true;
 sec.innerHTML=`<div class="pagehead"><div class="container"><h1>Deadline Autopilot</h1><p class="lede">Pick internships and we'll remind you here before each deadline. Reminders use the deadline the posting states. Saved on this device only.</p></div></div>
 <div class="container ap-wrap"><div class="ap-bar"><button type="button" class="btn" id="apIcs">Add to my calendar (.ics)</button><button type="button" class="btn-ghost" id="apNotif" hidden>Also show browser notifications</button><label class="ap-email" title="Email reminders are coming soon"><input type="checkbox" disabled aria-describedby="apEmailNote"> Email reminders — coming soon</label><span id="apEmailNote" class="sr-only">Email reminders aren't available yet. Reminders show on this website.</span></div>
 <div id="apDue" class="ap-due" role="region" aria-label="Reminders due"></div><div id="apList" class="ap-list"></div></div>`;
 const after=$a('t-tracker');after?after.after(sec):main.appendChild(sec)}
const KL={stated:'Deadline',rolling:'Rolling',unknown:'No deadline listed',closed:'Closed'};
const fd=d=>new Date(d).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
function render(){if(!sec||sec.hidden)return;const rows=AP.list().sort((a,b)=>(a.p.due?new Date(a.p.due):Infinity)-(b.p.due?new Date(b.p.due):Infinity)),due=AP.due();
 $a('apDue').innerHTML=due.length?`<h2>Due now</h2>`+due.map(({r,s})=>`<div class="ap-rem"><span class="ap-k ap-${r.p.kind}">${esc(KL[r.p.kind])}</span><div><b>${esc(r.x.company)}: ${esc(s.label)}</b><small>${esc(r.x.title)}</small></div><div class="ap-ra"><button type="button" class="btn-ghost" data-apopen="${esc(r.id)}">Open</button><button type="button" class="btn" data-apdone="${esc(r.id)}" data-key="${esc(s.key)}">Done</button></div></div>`).join(''):'';
 if(!rows.length){$a('apList').innerHTML=`<div class="ap-empty"><h2>No internships on Autopilot yet</h2><p>Open any internship and choose <b>Add to Autopilot</b>. We'll remind you on this website before its deadline.</p><button type="button" class="btn" data-go="db">Find internships</button>${typeof T!=='undefined'&&T.all().length?` <button type="button" class="btn-ghost" id="apFromT">Add my ${T.all().length} tracked internship${T.all().length===1?'':'s'}</button>`:''}</div>`;const f=$a('apFromT');f&&(f.onclick=()=>{const k=AP.addMany(T.all().map(t=>t.listingId).filter(Boolean));toast(`Autopilot is on for ${k} internship${k===1?'':'s'}.`);render()});return}
 $a('apList').innerHTML=`<h2>On Autopilot <span class="ap-n">${rows.length}</span></h2>`+rows.map(r=>{const nx=APCore.nextStep(r.p,r.it.done),moved=r.x.deadline!==undefined&&r.it.snap.dl&&r.x.deadline&&r.x.deadline!==r.it.snap.dl;
  return `<article class="ap-row"><div class="ap-h"><div><b>${esc(r.x.title)}</b><small>${esc(r.x.company)}</small></div><span class="ap-k ap-${r.p.kind}">${esc(r.p.summary)}</span></div>
  ${moved?`<p class="ap-note">The deadline changed from ${esc(r.it.snap.dl)} to ${esc(r.x.deadline)}. Reminders were moved.</p>`:''}
  <ol class="ap-steps">${r.p.steps.map(s=>`<li class="${r.it.done.includes(s.key)?'ok':new Date(s.at)<=new Date()?'due':''}"><span>${esc(fd(s.at))}</span> ${esc(s.label)}</li>`).join('')}</ol>
  <div class="ap-ft"><span>${nx?'Next reminder '+esc(fd(nx.at)):r.p.kind==='closed'?'This posting has closed.':'No more reminders.'}</span><span><button type="button" class="btn-ghost" data-apopen="${esc(r.id)}">Open</button><button type="button" class="btn-ghost" data-aprm="${esc(r.id)}">Turn off</button></span></div></article>`}).join('')}
document.addEventListener('click',e=>{const o=e.target.closest('[data-apopen]'),d=e.target.closest('[data-apdone]'),rm=e.target.closest('[data-aprm]'),ad=e.target.closest('[data-apadd]');
 if(o){const x=L(o.dataset.apopen);x&&openDrawer(x)}
 if(d){done(d.dataset.apdone,d.dataset.key);render()}
 if(rm){const id=rm.dataset.aprm,s=st(),keep=s.items[id];AP.remove(id);render();toast('Autopilot turned off.',()=>{const z=st();z.items[id]=keep;put(z);render()})}
 if(ad){const id=ad.dataset.apadd;if(AP.has(id)){AP.remove(id);toast('Autopilot turned off.')}else{AP.add(id);const p=APCore.plan(L(id),new Date());toast(p.kind==='stated'?`Autopilot on. We'll remind you here before ${p.summary.replace('Deadline ','')}.`:p.kind==='rolling'?"Autopilot on. Rolling deadline, so we'll nudge you to apply early.":"Autopilot on. No deadline is listed, so we'll remind you to check it.")}apBtn(ad,id)}});
function apBtn(b,id){const on=AP.has(id);b.textContent=on?'✓ On Autopilot':'Add to Autopilot';b.setAttribute('aria-pressed',on)}
$a('apIcs')&&($a('apIcs').onclick=()=>{const rows=AP.list().filter(r=>r.p.steps.length);if(!rows.length){toast('Nothing to export yet. Add an internship to Autopilot first.');return}
 const blob=new Blob([APCore.ics(rows.map(r=>({x:r.x,p:r.p,url:r.x.apply_url||''})))],{type:'text/calendar'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='intern-index-deadlines.ics';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)});
/* Browser notifications: only asked for after the user clicks. Shown while the website is open. */
const nb=$a('apNotif');if(nb&&'Notification' in window&&Notification.permission!=='denied'){nb.hidden=Notification.permission==='granted';nb.onclick=async()=>{const r=await Notification.requestPermission();nb.hidden=r!=='default';if(r==='granted')toast('Browser notifications are on while Intern Index is open.')}}
function notifyDue(){const due=AP.due();if(!due.length)return;const seen=Store.get('apSeen',[]),fresh=due.filter(d=>!seen.includes(d.r.id+d.s.key));if(!fresh.length)return;Store.set('apSeen',seen.concat(fresh.map(d=>d.r.id+d.s.key)).slice(-300));
 if('Notification' in window&&Notification.permission==='granted')fresh.slice(0,3).forEach(d=>{try{new Notification(d.r.x.company+': '+d.s.label,{body:d.r.x.title,tag:d.r.id+d.s.key})}catch(e){}});
 else setTimeout(()=>{if(!document.getElementById('intro'))toast(`${fresh.length} Autopilot reminder${fresh.length===1?'':'s'} due. Open Autopilot to see ${fresh.length===1?'it':'them'}.`)},1500)}
/* drawer: Add to Autopilot next to Apply/Save */
if(typeof openDrawer==='function'){const od=openDrawer;openDrawer=async function(x){const r=await od.apply(this,arguments);try{const box=$a('dAct');document.getElementById('apDrawer')?.remove();if(box&&x&&x.st!=='closed'){const w=document.createElement('p');w.id='apDrawer';w.className='ap-drawer';const b=document.createElement('button');b.type='button';b.className='btn-ghost ap-add';b.dataset.apadd=x.id;w.appendChild(b);box.after(w);apBtn(b,x.id)}}catch(e){}document.dispatchEvent(new CustomEvent('radar:drawer',{detail:x}));return r}}
document.addEventListener('radar:page',e=>{if(e.detail==='autopilot'){document.title='Deadline Autopilot · Intern Index';render()}});
let tries=0;(function boot(){if(typeof D==='undefined'||!D.length){if(++tries<200)return setTimeout(boot,150)}badge();notifyDue();if(location.hash==='#autopilot')go('autopilot',false);render()})();
setInterval(()=>{badge();notifyDue()},6e4);
})();
