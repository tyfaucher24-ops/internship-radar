/* V13 Warm-path finder: "Ways in" on each internship. Plain LinkedIn search links you open yourself,
   plus contacts you add by hand. Intern Index never contacts LinkedIn or reads anything from it. Saved on this device only. */
(function(){
if(typeof WPCore==='undefined')return;
const KEY='warmpaths',$w=id=>document.getElementById(id);
const st=()=>{const s=Store.get(KEY,null);return s&&s.v===1?s:{v:1,contacts:[]}};const put=s=>{Store.set(KEY,s);renderOut()};
const STAT={todo:'To contact',sent:'Messaged',replied:'Replied',met:'Talked'};
const prof=()=>(typeof profile!=='undefined'&&profile)||{};
function panel(x){const ls=WPCore.links(x,prof()),cs=st().contacts.filter(c=>c.listingId===x.id);
 return `<section class="wp" id="wpPanel" aria-labelledby="wpH"><h3 id="wpH">Ways in</h3><p class="wp-sub">Open a search on LinkedIn, find someone, then add them here. These are plain links: Intern Index doesn't connect to LinkedIn or read anything from it.${prof().school?'':' <a href="#profile" data-go="profile">Add your school</a> to see alumni.'}</p>
 <ul class="wp-links">${ls.map(l=>`<li><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.label)} ↗</a><small>${esc(l.why)}</small></li>`).join('')}</ul>
 <div class="wp-cs">${cs.map(cRow).join('')}</div>
 <details class="wp-add"><summary>Add someone you found or already know</summary><form id="wpForm" data-lid="${esc(x.id)}"><div class="wp-g"><label>Name<input name="name" required maxlength="80" autocomplete="off"></label><label>Role<input name="role" maxlength="80" placeholder="e.g. Analyst, alumna"></label><label>Email (optional)<input name="email" type="email" maxlength="120"></label><label>How you know them<input name="how" maxlength="120" placeholder="e.g. Queens alum, met at career fair"></label></div><button class="btn" type="submit">Add contact</button></form></details></section>`}
function cRow(c){const x=(typeof BYID!=='undefined'&&BYID.get(c.listingId))||{company:c.company,title:c.title,id:c.listingId};const n=WPCore.note(x,prof(),c),m=WPCore.email(x,prof(),c);
 return `<div class="wp-c" data-cid="${esc(c.id)}"><div class="wp-ch"><div><b>${esc(c.name)}</b><small>${esc([c.role,c.how].filter(Boolean).join(' · '))}</small></div><select data-wpst aria-label="Status for ${esc(c.name)}">${Object.entries(STAT).map(([k,v])=>`<option value="${k}"${c.status===k?' selected':''}>${v}</option>`).join('')}</select></div>
 <label class="wp-l">Connection note<textarea data-wpnote maxlength="300" rows="3">${esc(c.note||n)}</textarea></label><div class="wp-cf"><span class="wp-cnt" aria-live="polite">${(c.note||n).length}/300</span><span><button type="button" class="btn-ghost" data-wpcopy>Copy note</button>${c.email?`<a class="btn-ghost" href="${esc(WPCore.mailto(c.email,m))}">Email ${esc(c.name.split(' ')[0])}</a>`:''}<button type="button" class="btn-ghost" data-wprm aria-label="Remove ${esc(c.name)}">Remove</button></span></div></div>`}
function mount(x){const box=$w('dAct');if(!box||!x)return;$w('wpPanel')?.remove();const host=box.parentElement;const d=document.createElement('div');d.innerHTML=panel(x);(document.getElementById('apDrawer')||box).after(d.firstElementChild)}
document.addEventListener('radar:drawer',e=>{try{mount(e.detail)}catch(err){}});
document.addEventListener('submit',e=>{const f=e.target;if(f.id!=='wpForm')return;e.preventDefault();const fd=new FormData(f),x=BYID.get(f.dataset.lid);if(!x)return;const name=String(fd.get('name')||'').trim();if(!name)return;
 const s=st();s.contacts.push({id:'c'+Date.now().toString(36),listingId:x.id,company:x.company,title:x.title,name:name.slice(0,80),role:String(fd.get('role')||'').trim(),email:String(fd.get('email')||'').trim(),how:String(fd.get('how')||'').trim(),status:'todo',added:new Date().toISOString()});put(s);mount(x);toast(`${name} added. Find them under My Tracker → Outreach.`)});
const cOf=el=>{const r=el.closest('[data-cid]');return r&&st().contacts.find(c=>c.id===r.dataset.cid)};
const save=(id,f)=>{const s=st(),c=s.contacts.find(z=>z.id===id);if(c){f(c);c.updated=new Date().toISOString();Store.set(KEY,s)}};
document.addEventListener('input',e=>{const t=e.target;if(!t.matches('[data-wpnote]'))return;const c=cOf(t);if(!c)return;t.closest('.wp-c').querySelector('.wp-cnt').textContent=t.value.length+'/300';save(c.id,z=>z.note=t.value)});
document.addEventListener('change',e=>{const t=e.target;if(!t.matches('[data-wpst]'))return;const c=cOf(t);c&&save(c.id,z=>z.status=t.value);renderOut()});
document.addEventListener('click',async e=>{const cp=e.target.closest('[data-wpcopy]'),rm=e.target.closest('[data-wprm]');
 if(cp){const t=cp.closest('.wp-c').querySelector('textarea');try{await navigator.clipboard.writeText(t.value);toast('Note copied. Paste it into your LinkedIn connection request.')}catch(err){t.select();toast('Press Ctrl+C to copy the note.')}}
 if(rm){const c=cOf(rm);if(!c)return;const s=st();s.contacts=s.contacts.filter(z=>z.id!==c.id);put(s);rm.closest('.wp-c').remove();toast(`${c.name} removed.`,()=>{const z=st();z.contacts.push(c);put(z)})}});
/* Outreach: a sub-tab of My Tracker */
if(typeof PAGES!=='undefined'&&!PAGES.includes('outreach'))PAGES.push('outreach');
const trk=$w('t-tracker');let sec=$w('t-outreach');
function subnav(on){return `<nav class="subtabs" aria-label="Tracker views"><a href="#tracker" data-go="tracker"${on==='tracker'?' aria-current="page" class="on"':''}>Applications</a><a href="#outreach" data-go="outreach"${on==='outreach'?' aria-current="page" class="on"':''}>Outreach <span class="nbadge" data-wpn hidden></span></a></nav>`}
if(trk&&!sec){const h=trk.querySelector('.pagehead .container');h&&h.insertAdjacentHTML('beforeend',subnav('tracker'));
 sec=document.createElement('section');sec.id='t-outreach';sec.className='page';sec.hidden=true;sec.innerHTML=`<div class="pagehead"><div class="container twide"><h1>Outreach</h1><p class="lede">People you plan to reach out to, and where each conversation stands. Saved on this device only.</p>${subnav('outreach')}</div></div><div class="container twide" id="wpOut"></div>`;trk.after(sec)}
function renderOut(){document.querySelectorAll('[data-wpn]').forEach(b=>{const n=st().contacts.filter(c=>c.status==='todo').length;b.hidden=!n;b.textContent=n});const o=$w('wpOut');if(!o||sec.hidden)return;const cs=st().contacts;
 if(!cs.length){o.innerHTML='<div class="ap-empty"><h2>No contacts yet</h2><p>Open any internship and look for <b>Ways in</b>. Search LinkedIn for alumni and recruiters, then add the people you find here.</p><button type="button" class="btn" data-go="db">Find internships</button></div>';return}
 const by={};cs.forEach(c=>(by[c.listingId]=by[c.listingId]||[]).push(c));
 o.innerHTML=Object.entries(by).map(([lid,arr])=>{const x=(typeof BYID!=='undefined'&&BYID.get(lid))||null;return `<article class="ap-row wp-g2"><div class="ap-h"><div><b>${esc(arr[0].title)}</b><small>${esc(arr[0].company)}</small></div>${x?`<button type="button" class="btn-ghost" data-apopen="${esc(lid)}">Open internship</button>`:''}</div>${arr.map(cRow).join('')}</article>`}).join('')}
document.addEventListener('radar:page',e=>{if(e.detail==='outreach'){document.title='Outreach · Intern Index';renderOut()}});
let tries=0;(function boot(){if(typeof D==='undefined'||!D.length){if(++tries<200)return setTimeout(boot,150)}if(location.hash==='#outreach')go('outreach',false);renderOut()})();
})();
