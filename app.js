/* Internship Radar V4: the homepage is the database. All user data via Store (store.js). */
let D=[],META={},profile=Store.get('profile',{}),BYID=new Map(),MSCORE=new Map();
const H={DESK:134,MOB:176};const isMob=()=>matchMedia('(max-width:860px)').matches;
const ago=iso=>{if(!iso)return'never';const s=(Date.now()-new Date(iso))/1000;if(s<90)return'just now';if(s<3600)return Math.round(s/60)+' min ago';if(s<86400)return Math.round(s/3600)+' h ago';return Math.round(s/86400)+' d ago'};
const postedAgo=x=>{const d=x.posted||(x.first_seen||'').slice(0,10);if(!d)return'';const n=-days(d.slice(0,10));return n<=0?'Posted today':n===1?'Posted 1 day ago':n<60?`Posted ${n} days ago`:'Posted '+fmtDate(d.slice(0,10))};
const ATSHOST=/greenhouse|lever\.co|ashbyhq|smartrecruiters|workable|recruitee|bamboohr|myworkday|icims|oraclecloud|jobvite|taleo|successfactors|usajobs|eightfold|rippling|applytojob|github|ultipro|paylocity|adp\.com/i;
function logoHTML(x){let dom='';try{const h=new URL(x.apply_url).hostname;if(!ATSHOST.test(h))dom=h.replace(/^(www|careers|jobs|job|apply|recruiting)\./,'')}catch{}
 const ini=esc((x.company||'?').replace(/^the /i,'').slice(0,1).toUpperCase());const hue=[...x.company].reduce((a,c)=>a+c.charCodeAt(0),0)%360;
 return `<span class="logo" style="--h:${hue}" aria-hidden="true">${ini}</span>`}
function urg(x){if(x.st==='upcoming')return`<span class="dl dl-up">${esc(x.pred?.label||'Upcoming')}</span>`;if(!x.deadline)return`<span class="dl dl-none">${x.rolling?'Rolling':'Deadline not listed'}</span>`;const n=days(x.deadline);
 if(n<0)return`<span class="dl dl-closed">Closed ${fmtDate(x.deadline)}</span>`;const c=n<3?'dl-red':n<7?'dl-amber':'dl-ok';return`<span class="dl ${c}">${n===0?'Due today':n===1?'Due tomorrow':`Due ${fmtDate(x.deadline)} · ${n}d`}</span>`}
function locShort(x){const L=(x.locations||[]).map(l=>[l.city,l.state].filter(Boolean).join(', '));let s=L.slice(0,2).join(' · ')+(L.length>2?` +${L.length-2}`:'');if(x.remote)s=s?s+' · Remote':'Remote';return s||'Location not listed'}
function tags(x){const t=[x.industry,x.role_type!=='Internship'&&x.role_type,x.workplace&&x.workplace!=='Remote'&&x.workplace,x.paid===true&&(x.pay?'Paid · '+x.pay.slice(0,24):'Paid'),x.paid===false&&'Unpaid',(x.terms||[])[0]].filter(Boolean);return t.map(v=>`<span class="tag">${esc(v)}</span>`).join('')}
function mbadge(x){const m=MSCORE.get(x.id);if(!m)return'';const c={'Strong Match':'b-strong','Realistic':'b-real','Reach':'b-reach','Hidden Gem':'b-gem'}[m.bucket];return`<span class="badge ${c}" title="${esc(m.reason)}">${m.bucket}${m.poor?' · poor fit':''}</span>`}
function actBtns(x){if(x.st==='upcoming'){const on=(Store.get('notify',[])).includes(x.id);return`<button class="ghost sm" data-act="notify" aria-pressed="${on}">${on?'🔔 Notifying':'Notify me'}</button>`}
 const t=T.byListing(x.id);if(t)return`<button class="ghost sm tk" data-act="tracker">✓ ${esc(t.status)}</button>`;return`<button class="ghost sm" data-act="save">Save</button><button class="ghost sm" data-act="applied">Applied</button>`}
function rowHTML(x){return`<article class="lrow${x.st==='closed'?' isclosed':''}" role="listitem" tabindex="0" data-id="${esc(x.id)}" aria-label="${esc(x.company+', '+x.title)}">${logoHTML(x)}<div class="lmain">
 <div class="l1"><span class="lco">${esc(x.company)}</span><span class="lpost">${postedAgo(x)}</span>${urg(x)}</div><div class="l2">${esc(x.title)}</div>
 <div class="l3"><span>📍 ${esc(locShort(x))}</span>${tags(x)}</div><div class="l4">${mbadge(x)}<span class="sp"></span>${actBtns(x)}</div></div></article>`}
const card=(x,extra='')=>`<div class="mcard">${rowHTML(x).replace('<div class="l4">','<div class="l4">'+extra)}</div>`;
/* ---------- navigation ---------- */
function go(t){if(t==='find'||t==='home')t='db';if(t==='foryou')t='profile';document.querySelectorAll('.tabs button').forEach(o=>{o.classList.toggle('on',o.dataset.t===t);o.setAttribute('aria-current',o.dataset.t===t?'page':'false')});
 document.querySelectorAll('main>section').forEach(s=>s.hidden=s.id!=='t-'+t);const u=new URL(location);u.hash=t==='db'?'':t;history.replaceState(null,'',u);if(t==='db')requestAnimationFrame(vrender);if(t==='tracker'&&window.trackerRefresh)trackerRefresh();if(t==='profile')renderMatches()}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>go(b.dataset.t));
document.addEventListener('click',e=>{const a=e.target.closest('[data-go]');if(a){e.preventDefault();go(a.dataset.go)}});
function openModal(h){$('mbody').innerHTML=h;$('modal').hidden=false;setTimeout(()=>$('mbody').querySelector('input,select,textarea,button')?.focus(),30)}function closeModal(){$('modal').hidden=true}
$('mx').onclick=closeModal;$('modal').onclick=e=>{if(e.target.id==='modal')closeModal()};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('modal').hidden)closeModal();else if(!$('drawer').hidden)closeDrawer();else if(document.body.classList.contains('sheet-open'))sheet(false)}});
function exportData(){Store.download(`internship-radar-data-${new Date().toISOString().slice(0,10)}.json`,Store.exportAll())}
$('exp').onclick=exportData;document.querySelector('label.btnlike').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('imp').click()}};
$('imp').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const keys=Store.importAll(JSON.parse(await f.text()));alert(`Imported: ${keys.join(', ')||'nothing'}`);location.reload()}catch(err){alert('Import failed: '+err.message)}e.target.value=''};
$('clearAll').onclick=()=>{if(confirm('Delete everything you saved in this browser? Export first if you want a backup.')){Store.clear();location.reload()}};
/* ---------- filters ---------- */
const FDEF=[
 ['status','Status',x=>[x.st==='upcoming'?'Upcoming':x.st==='closed'?'Closed':'Open'],['Open','Upcoming','Closed']],
 ['cat','Category',x=>[x.industry||'Other']],
 ['rt','Role type',x=>[x.role_type||'Internship']],
 ['state','State',x=>x._states.length?x._states:['Not listed']],
 ['wp','Work setting',x=>[x.workplace||(x.remote?'Remote':'Not listed')],['Remote','Hybrid','On-site','Not listed']],
 ['dlw','Deadline',x=>{if(!x.deadline)return[x.rolling?'Rolling':'Not listed'];const n=days(x.deadline);return n<0?['Passed']:n<=7?['This week','This month']:n<=31?['This month']:['Later']},['This week','This month','Later','Rolling','Not listed']],
 ['posted','Date posted',x=>{const d=x.posted||(x.first_seen||'').slice(0,10);if(!d)return[];const n=-days(d.slice(0,10));return[n<=1&&'Past 24 hours',n<=3&&'Past 3 days',n<=7&&'Past 7 days',n<=30&&'Past 30 days'].filter(Boolean)},['Past 24 hours','Past 3 days','Past 7 days','Past 30 days']],
 ['term','Season',x=>x.terms&&x.terms.length?x.terms:['Not listed']],
 ['cy','Class year',x=>x.class_years&&x.class_years.length?x.class_years:['Not listed'],['Freshman','Sophomore','Junior','Senior','Graduate','Not listed']],
 ['size','Company size',x=>[x.size||'Not listed']],
 ['spons','Visa sponsorship',x=>[x.citizenship?'US citizenship required':x.sponsorship==='Not offered'?'Not offered':x.sponsorship==='Offered'?'Offered':'Not listed'],['Offered','Not offered','US citizenship required','Not listed']],
 ['paid','Pay',x=>[x.paid===true?'Paid':x.paid===false?'Unpaid':'Not listed'],['Paid','Unpaid','Not listed']]];
const DEFAULTS={status:'Open',sort:'new'};
let F={};const FK=['q','status','cat','rt','state','city','near','radius','wp','dlw','posted','term','cy','size','spons','paid','mine','hideTracked','sort'];
function loadF(){const u=new URLSearchParams(location.search);const fromUrl=FK.some(k=>u.has(k));const src=fromUrl?Object.fromEntries(FK.filter(k=>u.has(k)).map(k=>[k,u.get(k)])):Store.get('filters',{});F={...DEFAULTS,...src}}
function saveF(){const u=new URL(location);FK.forEach(k=>u.searchParams.delete(k));FK.forEach(k=>{if(F[k]&&F[k]!==DEFAULTS[k])u.searchParams.set(k,F[k])});history.replaceState(null,'',u);Store.set('filters',F)}
let TRACKED=new Set();
const R=3958.8,rad=d=>d*Math.PI/180,hav=(a,b)=>2*R*Math.asin(Math.sqrt(Math.sin(rad(b.lat-a.lat)/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(rad(b.lng-a.lng)/2)**2));
let NEAR=null;
function baseOK(x,q){if(x.hidden)return false;if(q.length&&!q.every(w=>x._t.includes(w)))return false;
 if(F.city){const [c,s]=F.city.split('|');if(c==='Remote'){if(!x.remote)return false}else if(!(x.locations||[]).some(l=>l.city===c&&l.state===s))return false}
 if(NEAR&&+F.radius){if(!(x.locations||[]).some(l=>l.lat!=null&&hav(NEAR,l)<=+F.radius))return false}
 if(F.mine==='1'){const m=MSCORE.get(x.id);if(!m||m.poor||m.bucket==='Reach')return false}
 if(F.hideTracked==='1'&&TRACKED.has(String(x.id)))return false;
 if(x.past_term&&F.status!=='Closed')return false;return true}
let RES=[],COUNTS={};
function compute(){const t0=performance.now();const q=(F.q||'').toLowerCase().trim().split(/\s+/).filter(Boolean);TRACKED=new Set(T.all().map(t=>String(t.listingId)));
 NEAR=null;if(F.near&&+F.radius){const c=CITYIDX.get(F.near);if(c)NEAR=c}
 const act=FDEF.filter(([k])=>F[k]);COUNTS=Object.fromEntries(FDEF.map(([k])=>[k,new Map()]));const out=[];
 for(const x of D){if(!baseOK(x,q))continue;let fail=null,nf=0;
  for(const [k,,fn] of act){if(!fn(x).includes(F[k])){nf++;fail=k;if(nf>1)break}}
  if(nf>1)continue;
  if(nf===0){out.push(x);for(const [k,,fn] of FDEF)for(const v of fn(x))COUNTS[k].set(v,(COUNTS[k].get(v)||0)+1)}
  else{const fn=FDEF.find(d=>d[0]===fail)[2];for(const v of fn(x))COUNTS[fail].set(v,(COUNTS[fail].get(v)||0)+1)}}
 const s=F.sort;const cmpDl=(a,b)=>(a.deadline&&days(a.deadline)>=0?a.deadline:'9999').localeCompare(b.deadline&&days(b.deadline)>=0?b.deadline:'9999');
 const pd=x=>x.posted||(x.first_seen||'').slice(0,10)||'';
 out.sort(s==='deadline'?(a,b)=>cmpDl(a,b)||pd(b).localeCompare(pd(a)):s==='az'?(a,b)=>a.company.localeCompare(b.company)||a.title.localeCompare(b.title):s==='match'?(a,b)=>(MSCORE.get(b.id)?.score??-1)-(MSCORE.get(a.id)?.score??-1)||cmpDl(a,b):(a,b)=>pd(b).localeCompare(pd(a))||cmpDl(a,b));
 RES=out;window._lastFilterMs=performance.now()-t0}
function fbodyHTML(){const sel=(k,label,vals,opts)=>{const C=COUNTS[k]||new Map();const all=opts||[...C.keys()].sort((a,b)=>k==='state'?a.localeCompare(b):(C.get(b)-C.get(a))||a.localeCompare(b));
  const list=[...new Set([...(F[k]?[F[k]]:[]),...all])];return`<label>${label}<select data-f="${k}"><option value="">${k==='status'?'Any status':'Any'}</option>${list.map(v=>`<option value="${esc(v)}"${F[k]===v?' selected':''}${!C.get(v)&&F[k]!==v?' disabled':''}>${esc(v)} (${(C.get(v)||0).toLocaleString()})</option>`).join('')}</select></label>`};
 return FDEF.map(([k,l,,o])=>sel(k,l,null,o)).join('')+`<fieldset class="near"><legend>Near a city</legend><input list="cityList" data-f="near" placeholder="City, ST" value="${esc(F.near||'')}" aria-label="City for radius search"><select data-f="radius" aria-label="Radius"><option value="">Any distance</option>${[10,25,50,100,250].map(r=>`<option value="${r}"${+F.radius===r?' selected':''}>Within ${r} mi</option>`).join('')}</select></fieldset>
 <label class="chk"><input type="checkbox" data-f="mine"${F.mine==='1'?' checked':''}> Only my matches</label><label class="chk"><input type="checkbox" data-f="hideTracked"${F.hideTracked==='1'?' checked':''}> Hide saved &amp; applied</label>
 <p class="fbtns"><button class="ghost sm" id="clearF" type="button">Clear all</button></p><p class="muted small">Counts update live. “Not listed” means the posting doesn't say.</p>`}
let fTimer;
function renderFilters(){const fb=$('fbody');const foc=document.activeElement&&fb.contains(document.activeElement)?document.activeElement.dataset.f:null;fb.innerHTML=fbodyHTML();
 fb.querySelectorAll('[data-f]').forEach(el=>{const k=el.dataset.f;const ev=el.tagName==='INPUT'&&el.type!=='checkbox'?'change':'change';el.addEventListener(ev,()=>{F[k]=el.type==='checkbox'?(el.checked?'1':''):el.value;if(k==='near'&&F.near&&!F.radius)F.radius='50';update()})});
 $('clearF').onclick=clearAll;if(foc){const el=fb.querySelector(`[data-f="${foc}"]`);el&&el.focus()}}
function clearAll(){F={...DEFAULTS,sort:F.sort};$('q').value='';update()}
function chipsHTML(){const lab=Object.fromEntries(FDEF.map(d=>[d[0],d[1]]));const c=[];
 if(F.q)c.push(['q',`“${F.q}”`]);FDEF.forEach(([k])=>{if(F[k]&&!(k==='status'&&F[k]==='Open'))c.push([k,`${lab[k]}: ${F[k]}`])});if(F.city)c.push(['city','📍 '+F.city.replace('|',', ')]);if(F.near&&F.radius)c.push(['near',`Within ${F.radius} mi of ${F.near}`]);
 if(F.mine==='1')c.push(['mine','My matches']);if(F.hideTracked==='1')c.push(['hideTracked','Hiding saved/applied']);
 return c.map(([k,t])=>`<button class="chip" data-k="${k}" aria-label="Remove filter ${esc(t)}">${esc(t)} <span aria-hidden="true">×</span></button>`).join('')+(c.length?'<button class="chip clear" data-k="__all">Clear all</button>':'')}
function update(){compute();saveF();renderFilters();$('chips').innerHTML=chipsHTML();$('chips').querySelectorAll('.chip').forEach(b=>b.onclick=()=>{const k=b.dataset.k;if(k==='__all')return clearAll();if(k==='near'){F.near='';F.radius=''}else F[k]=k==='status'?'Open':'';if(k==='q')$('q').value='';update()});
 const nF=FK.filter(k=>F[k]&&F[k]!==DEFAULTS[k]&&k!=='sort'&&k!=='q').length;$('fN').textContent=nF||'';$('sort').value=F.sort||'new';
 $('count').textContent=`${RES.length.toLocaleString()} ${F.status==='Upcoming'?'upcoming':F.status==='Closed'?'closed':F.status?'open':''} internship${RES.length===1?'':'s'}`+(window._lastFilterMs!=null?'':'');
 $('empty').hidden=RES.length>0;$('empty').innerHTML=`<h3>No internships match</h3><p class="muted">Try removing a filter${F.q?' or searching for something broader':''}.</p><button class="ghost" type="button" onclick="clearAll()">Clear all filters</button>`;
 vrender(true);if(window.mapUpdate)mapUpdate()}
let qTimer;$('q').addEventListener('input',e=>{clearTimeout(qTimer);qTimer=setTimeout(()=>{F.q=e.target.value.trim();update()},120)});
$('sort').onchange=e=>{F.sort=e.target.value;update()};
/* ---------- virtual list ---------- */
let rowH=H.DESK,lastRange='';
function vrender(force){const vl=$('vl');if($('t-db').hidden)return;rowH=isMob()?H.MOB:H.DESK;vl.style.height=RES.length*rowH+'px';
 const top=vl.getBoundingClientRect().top+scrollY,vh=innerHeight;const s=Math.max(0,Math.floor((scrollY-top)/rowH)-6),e=Math.min(RES.length,Math.ceil((scrollY-top+vh)/rowH)+6);
 const key=s+':'+e+':'+RES.length+':'+rowH;if(!force&&key===lastRange)return;lastRange=key;
 let h='';for(let i=s;i<e;i++)h+=`<div class="vrow" style="transform:translateY(${i*rowH}px);height:${rowH}px">${rowHTML(RES[i])}</div>`;vl.innerHTML=h}
addEventListener('scroll',()=>requestAnimationFrame(()=>vrender()),{passive:true});addEventListener('resize',()=>vrender(true));
function onRowClick(e){const row=e.target.closest('[data-id]');if(!row)return;const x=BYID.get(row.dataset.id);if(!x)return;const b=e.target.closest('[data-act]');
 if(b){e.stopPropagation();const a=b.dataset.act;if(a==='save')track(x.id,'Saved');else if(a==='applied')track(x.id,'Applied');else if(a==='tracker'){go('tracker');const t=T.byListing(x.id);t&&editApp(t.id)}
  else if(a==='notify'){const n=Store.get('notify',[]);const i=n.indexOf(x.id);i<0?n.push(x.id):n.splice(i,1);Store.set('notify',n);vrender(true);renderMatches(true)}return}
 if(e.target.closest('a'))return;openDrawer(x)}
['vl','mList'].forEach(id=>{$(id).addEventListener('click',onRowClick);$(id).addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('.lrow'))onRowClick(e)})});
/* ---------- drawer ---------- */
let lastFocus=null;const shardCache={};
async function descOf(x){if(!x.has_desc)return null;const sh=parseInt(String(x.id).slice(0,2),16)%64;if(!shardCache[sh])shardCache[sh]=fetch(`data/desc/${sh}.json`).then(r=>r.json()).catch(()=>({}));return (await shardCache[sh])[x.id]||null}
function fact(k,v){return`<div class="fact"><dt>${k}</dt><dd>${v}</dd></div>`}
function openDrawer(x){lastFocus=document.activeElement;const m=MSCORE.get(x.id);
 const elig=[fact('Class years',yearsText(x)),fact('GPA minimum',x.gpa_min?esc(x.gpa_min):NL),fact('Visa sponsorship',x.citizenship?'US citizenship required':x.sponsorship?esc(x.sponsorship):NL),fact('Pay',x.paid===true?esc(x.pay||'Paid'):x.paid===false?'Unpaid':NL),fact('Work setting',x.workplace?esc(x.workplace):(x.remote?'Remote':NL)),fact('Season',termText(x)),fact('Openings',x.openings?esc(x.openings):NL),fact('Company size',x.size?esc(x.size):NL)].join('');
 $('dbody').innerHTML=`<div class="dhead">${logoHTML(x)}<div><p class="lco">${esc(x.company)}</p><h2 id="dTitle">${esc(x.title)}</h2><p class="muted">📍 ${esc(locShort(x))}${(x.locations||[]).length>2?` <details class="inl"><summary>all ${x.locations.length}</summary>${x.locations.map(l=>esc([l.city,l.state].filter(Boolean).join(', '))).join('; ')}</details>`:''}</p></div></div>
 <div class="drow">${urg(x)}<span class="muted small">${postedAgo(x)}</span>${mbadge(x)}</div>
 ${m?`<p class="why">${esc(m.reason)}</p>`:''}${x.pred?`<p class="why">📈 ${esc(x.pred.label)} (${esc(x.pred.confidence)} confidence). Based on: ${esc(x.pred.basis)}.</p>`:''}
 <p class="dact">${x.apply_url?`<a class="btn big" href="${esc(x.apply_url)}" target="_blank" rel="noopener">${x.st==='upcoming'?'Open company careers page':'Apply on company site'} ↗</a>`:'<span class="nolink">Apply link not listed</span>'} <span class="acts" data-id="${esc(x.id)}">${actBtns(x)}</span></p>
 <dl class="facts">${elig}</dl>
 ${x.deadline?`<p class="muted small">Deadline source: ${esc(x.deadline_source||'listing')}</p>`:''}
 <h3>Description</h3><div id="dDesc" class="desc"><div class="skel"></div><div class="skel"></div><div class="skel short"></div></div>
 <div class="dmeta muted small"><p>Source: ${esc(x.source)}${x.also_on?` · also listed on ${esc([...new Set(x.also_on)].slice(0,3).join(', '))}`:''}</p><p>${x.last_verified?`Last verified ${ago(x.last_verified)} (${new Date(x.last_verified).toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'})} ET)`:'Not verified yet'}${x.stale?' · source unreachable on last sync, showing last good data':''}</p><p>First seen ${x.first_seen?fmtDate(x.first_seen.slice(0,10)):'—'}${x.notes?' · '+esc(x.notes):''}</p></div>
 <div class="report"><b>Report an issue</b><div class="crow"><button class="ghost sm" data-rep="closed">It's closed</button><button class="ghost sm" data-rep="wrong">Wrong info</button><button class="ghost sm" data-rep="broken">Broken link</button></div><p class="muted small" id="repMsg"></p></div>`;
 $('drawer').hidden=false;document.body.classList.add('drawer-open');$('dx').focus();
 $('dbody').querySelector('.acts').addEventListener('click',e=>{onRowClick(e);setTimeout(()=>openDrawer(BYID.get(x.id)),0)});
 $('dbody').querySelectorAll('[data-rep]').forEach(b=>b.onclick=()=>report(x,b.dataset.rep));
 descOf(x).then(t=>{const el=$('dDesc');if(!el)return;el.innerHTML=t?esc(t).split(/\n{2,}/).map(p=>`<p>${p.replace(/\n/g,'<br>')}</p>`).join(''):`<p class="muted">${x.st==='upcoming'?'Not posted yet. This is a prediction from past posting dates.':'Full description is on the company posting.'}</p>`})}
function closeDrawer(){$('drawer').hidden=true;document.body.classList.remove('drawer-open');lastFocus&&lastFocus.focus&&lastFocus.focus()}
$('dx').onclick=closeDrawer;$('drawer').onclick=e=>{if(e.target.id==='drawer')closeDrawer()};
const REPO='tyfaucher24-ops/internship-radar';
function report(x,type){const r=Store.get('reports',{});r[x.id]={type,at:new Date().toISOString(),company:x.company,title:x.title};Store.set('reports',r);
 if(type==='closed'){x.hidden=true;update()}
 const title=encodeURIComponent(`[listing-report:${type}] ${x.company} — ${x.title}`.slice(0,200));const body=encodeURIComponent(`Listing id: ${x.id}\nType: ${type}\nURL: ${x.apply_url||''}\n\nWhat's wrong (optional):\n`);
 $('repMsg').innerHTML=`Thanks. ${type==='closed'?'Hidden in your browser. ':''}Want it fixed for everyone? <a target="_blank" rel="noopener" href="https://github.com/${REPO}/issues/new?labels=listing-report&title=${title}&body=${body}">Send a public report ↗</a> (3+ “closed” reports auto-hide a listing until it's re-verified).`}
/* ---------- add / seen elsewhere ---------- */
$('addBtn').onclick=e=>{e.preventDefault();openModal(`<h2>Add an internship</h2><p class="muted">Saved to your list right away and queued for review. Please link the company's own posting.</p><form id="addForm">${listingFormHTML()}<p><button>Save internship</button></p></form>`);
 $('addForm').onsubmit=async ev=>{ev.preventDefault();const x=readListingForm(ev.target,'User submission');if(!x.company||!x.title||!x.apply_url)return alert('Company, title and link are required.');x.status='open';await Submissions.submit(x);closeModal();mergeMine();update()}};
$('seenBtn').onclick=e=>{e.preventDefault();openModal(`<h2>I saw an internship elsewhere</h2><p class="muted">Seen it on LinkedIn, Indeed or Handshake? Tell us the company. We'll add <b>that company's own careers page</b>. We never copy listings from those sites.</p>
 <form id="seenForm"><label>Company *<input name="company" required></label><label>Company careers page (if you know it)<input name="careers" type="url" placeholder="https://company.com/careers"></label><label>Where you saw it<select name="where"><option>LinkedIn</option><option>Indeed</option><option>Handshake</option><option>Other</option></select></label><label>Role title (optional)<input name="role"></label><p><button>Send</button></p></form>`);
 $('seenForm').onsubmit=ev=>{ev.preventDefault();const f=Object.fromEntries(new FormData(ev.target));const q=Store.get('missingQueue',[]);q.unshift({...f,id:Store.uid(),at:new Date().toISOString()});Store.set('missingQueue',q);
  const t=encodeURIComponent(`[missing-company] ${f.company}`),b=encodeURIComponent(`Company: ${f.company}\nCareers page: ${f.careers||''}\nSeen on: ${f.where}\nRole: ${f.role||''}`);
  $('mbody').innerHTML=`<h2>Thanks!</h2><p>Saved. To make sure it gets added for everyone, <a target="_blank" rel="noopener" href="https://github.com/${REPO}/issues/new?labels=missing-company&title=${t}&body=${b}">open a public request ↗</a>.</p>`}};
/* ---------- mobile sheet + map toggle ---------- */
function sheet(open){document.body.classList.toggle('sheet-open',open);$('fBtn').setAttribute('aria-expanded',open);if(open)$('fDone').focus()}
$('fBtn').onclick=()=>sheet(true);$('fDone').onclick=()=>sheet(false);
function mapToggle(on){$('mapPanel').hidden=!on;$('mapBtn').setAttribute('aria-pressed',on);$('dbgrid').classList.toggle('withmap',on);Store.set('prefs',{...Store.get('prefs',{}),map:on});if(on)loadMap()}
$('mapBtn').onclick=()=>mapToggle($('mapPanel').hidden);$('mapClose').onclick=()=>mapToggle(false);
/* ---------- compact US map (d3-geo, us-atlas; lazy) ---------- */
let MAPREADY=null,PROJ=null;
function loadScript(src){return new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
function loadMap(){if(MAPREADY)return MAPREADY;MAPREADY=Promise.all([loadScript('https://cdn.jsdelivr.net/npm/d3-array@3'),loadScript('https://cdn.jsdelivr.net/npm/topojson-client@3')]).then(()=>loadScript('https://cdn.jsdelivr.net/npm/d3-geo@3')).then(()=>fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-albers-10m.json')).then(r=>r.json()).then(us=>{
 PROJ=d3.geoAlbersUsa().scale(1300).translate([487.5,305]);const path=d3.geoPath();const st=topojson.feature(us,us.objects.states).features;
 $('map').innerHTML=`<svg viewBox="0 0 975 640" role="img" aria-label="US map of matching internships"><g class="states">${st.map(f=>`<path d="${path(f)}"/>`).join('')}</g><g id="mdots"></g><g id="mremote" class="mremote" tabindex="0" role="button" aria-label="Remote internships"><circle cx="900" cy="560" r="30"/><text x="900" y="564" text-anchor="middle">Remote</text><text id="mrN" x="900" y="612" text-anchor="middle" class="mrn"></text></g></svg>`;
 $('mremote').onclick=()=>{F.city=F.city==='Remote|'?'':'Remote|';update()};$('mremote').onkeydown=e=>{if(e.key==='Enter')$('mremote').onclick()};mapUpdate()}).catch(e=>{$('map').innerHTML='<p class="muted">Map could not load (offline?). Filters still work.</p>';MAPREADY=null});return MAPREADY}
window.mapUpdate=function(){if(!PROJ||$('mapPanel').hidden)return;const agg=new Map();let rem=0;
 for(const x of RES){if(x.remote)rem++;for(const l of x.locations||[]){if(l.lat==null)continue;const k=l.city+'|'+l.state;const a=agg.get(k)||{l,n:0};a.n++;agg.set(k,a)}}
 let h='',unmapped=0;for(const [k,a] of agg){const p=PROJ([a.l.lng,a.l.lat]);if(!p){unmapped++;continue}const r=Math.min(18,2.5+Math.sqrt(a.n)*1.6);h+=`<circle class="${F.city===k?'sel':''}" data-k="${esc(k)}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${r.toFixed(1)}" tabindex="-1"><title>${esc(a.l.city)}, ${esc(a.l.state)} · ${a.n}</title></circle>`}
 $('mdots').innerHTML=h;$('mrN').textContent=rem.toLocaleString();$('mremote').classList.toggle('sel',F.city==='Remote|');
 $('mdots').onclick=e=>{const c=e.target.closest('circle');if(!c)return;F.city=F.city===c.dataset.k?'':c.dataset.k;update()};
 $('mapNote').textContent=`${agg.size.toLocaleString()} cities · click a dot to filter${F.city?' · click again to clear':''}`}
/* ---------- data load ---------- */
const CITYIDX=new Map();
function mergeMine(){const mine=Store.get('myListings',[]).map(x=>prepare({...x,_mine:true,id:String(x.id),source:'Added by you'}));D=mine.concat(D.filter(x=>!x._mine));BYID=new Map(D.map(x=>[String(x.id),x]))}
function hdrCount(){const t=META.updated?`${(META.open||0).toLocaleString()} open internships · ${(META.closing_this_week||0).toLocaleString()} closing this week · updated ${ago(META.updated)}`:'Live counts unavailable';document.querySelectorAll('.hdrCount').forEach(e=>e.textContent=t)}
async function boot(){loadF();$('q').value=F.q||'';if(Store.get('prefs',{}).map&&!isMob())mapToggle(true);
 $('vl').innerHTML=Array.from({length:6},()=>'<div class="vrow skelrow"><div class="skel"></div><div class="skel short"></div></div>').join('');$('vl').style.height='auto';
 try{const [m,l]=await Promise.all([fetch('data/meta.json').then(r=>r.json()).catch(()=>({})),fetch('data/listings.json').then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json()})]);META=m;
  D=l.listings.map(x=>prepare({...x,id:String(x.id)}));mergeMine();
  const reps=Store.get('reports',{});D.forEach(x=>{if(reps[x.id]?.type==='closed')x.hidden=true;for(const L of x.locations||[])if(L.lat!=null&&L.city){const k=L.city+', '+L.state;if(!CITYIDX.has(k))CITYIDX.set(k,{lat:L.lat,lng:L.lng})}});
  const dl=document.createElement('datalist');dl.id='cityList';dl.innerHTML=[...CITYIDX.keys()].sort().map(k=>`<option value="${esc(k)}">`).join('');document.body.appendChild(dl);
 }catch(e){$('vl').innerHTML='';$('notice').innerHTML=`<div class="err" role="alert"><b>Couldn't load listings.</b> ${esc(e.message)}. <button class="ghost sm" onclick="location.reload()">Retry</button></div>`;hdrCount();return}
 hdrCount();setInterval(hdrCount,60000);
 const n=Store.get('notify',[]);const nowOpen=n.map(id=>BYID.get(id)).filter(x=>x&&x.st!=='upcoming');if(nowOpen.length)$('notice').innerHTML=`<div class="ok" role="status">🔔 Now open: ${nowOpen.map(x=>esc(x.company)).join(', ')}. <button class="ghost sm" onclick="Store.set('notify',[]);this.parentNode.remove()">Dismiss</button></div>`;
 update();document.body.classList.remove('booting');document.dispatchEvent(new Event('radar:data'));
 profileInit();trackerInit();await refreshMatches();const h=location.hash.slice(1);if(h&&$('t-'+h))go(h);window._interactiveAt=performance.now()}
/* ---------- profile ---------- */
const PFIELDS=['school','major','classYear','gradDate','gpa','home','relocate','dream','roles','locations','seasons','remoteOk','workAuth','paidOnly','sizePref','minMatch'];
const RFIELDS=['skills','experience','coursework','clubs','leadership','certs'];
function profileInit(){const f=$('parsedForm');CLASS_YEARS.forEach(c=>f.classYear.add(new Option(c,c)));
 $('pInd').innerHTML=INDUSTRIES.filter(i=>i!=='Other').map(i=>`<label class="chk"><input type="checkbox" name="industries" value="${esc(i)}"> ${esc(i)}</label>`).join('');fillProfile();strength();
 let t;f.addEventListener('input',()=>{clearTimeout(t);$('saveMsg').textContent='Saving…';t=setTimeout(saveProfile,350)});f.addEventListener('change',()=>{clearTimeout(t);t=setTimeout(saveProfile,50)});f.onsubmit=e=>{e.preventDefault();saveProfile()};
 const onFile=async e=>{const file=e.target.files[0];if(!file)return;$('rstat').textContent='Reading…';try{ingest(await readFile(file),file.name)}catch(err){$('rstat').textContent='Could not read file: '+err.message}e.target.value=''};
 $('resume').onchange=onFile;$('liPdf').onchange=onFile;$('liGo').onclick=()=>{const t=$('liText').value.trim();if(t.length<40){$('rstat').textContent='Paste your full LinkedIn profile text first.';return}ingest(t,'pasted LinkedIn text')}}
function fillProfile(){const f=$('parsedForm'),p=profile,r=Store.get('resume',{});PFIELDS.forEach(k=>{const el=f[k];if(!el)return;if(el.type==='checkbox')el.checked=!!p[k];else el.value=p[k]||''});
 f.querySelectorAll('[name=industries]').forEach(c=>c.checked=(p.industries||[]).includes(c.value));
 f.skills.value=Array.isArray(r.skills)?r.skills.join(', '):(r.skills||'');f.experience.value=(r.experience||[]).map(e=>[e.title,e.dates&&`(${e.dates})`].filter(Boolean).join(' ')+(e.text?' :: '+e.text:'')).join('\n');
 ['coursework','certs'].forEach(k=>f[k].value=r[k]||'');['clubs','leadership'].forEach(k=>f[k].value=(r[k]||[]).join('\n'))}
function ingest(text,label){const R=parseResume(text);const cur=Store.get('resume',{});Store.set('resume',{...cur,...R,source:label});
 ['school','major','gpa','classYear'].forEach(k=>{if(R[k]&&!profile[k])profile[k]=R[k]});Store.set('profile',profile);fillProfile();strength();refreshMatches();
 $('rstat').textContent=`Read ${label}: ${R.skills.length} skills, ${R.experience.length} experience entries${R.school?', '+R.school:''}. Check the form below and fix anything wrong.`}
function saveProfile(){const f=$('parsedForm'),fd=new FormData(f);PFIELDS.forEach(k=>{const el=f[k];if(!el)return;profile[k]=el.type==='checkbox'?el.checked:(fd.get(k)||'').trim()});profile.industries=fd.getAll('industries');profile.updated=new Date().toISOString();Store.set('profile',profile);
 const exp=f.experience.value.split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{const [h,t]=l.split(' :: ');const d=(h.match(/\(([^)]*20\d\d[^)]*)\)\s*$/)||[])[1]||'';return{title:h.replace(/\s*\([^)]*\)\s*$/,'').trim(),dates:d,text:t||''}});
 Store.set('resume',{...Store.get('resume',{}),skills:f.skills.value.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean),experience:exp,coursework:f.coursework.value,certs:f.certs.value,clubs:f.clubs.value.split('\n').filter(Boolean),leadership:f.leadership.value.split('\n').filter(Boolean),edited:new Date().toISOString()});
 $('saveMsg').textContent='Saved in this browser ✓';strength();refreshMatches()}
function strength(){const p=profile,r=Store.get('resume',{});const sk=Array.isArray(r.skills)?r.skills:[];
 const items=[['school',!!p.school,10,'your school'],['major',!!p.major,10,'your major'],['classYear',!!p.classYear,12,'your class year'],['industries',(p.industries||[]).length>0,12,'target categories'],['skills',sk.length>=5,14,'at least 5 skills (or upload a resume)'],
  ['experience',(r.experience||[]).length>0,12,'any experience (jobs, volunteering, projects count)'],['locations',!!p.locations||!!p.remoteOk,8,'preferred locations'],['workAuth',!!p.workAuth,6,'work authorization'],['clubs',(r.clubs||[]).length>0||(r.leadership||[]).length>0,6,'clubs or leadership'],['gradDate',!!p.gradDate,4,'graduation date'],['gpa',!!p.gpa,3,'GPA (optional)'],['coursework',!!r.coursework,3,'relevant coursework']];
 const pct=Math.round(items.reduce((a,i)=>a+(i[1]?i[2]:0),0));const next=items.filter(i=>!i[1]).sort((a,b)=>b[2]-a[2])[0];window._strength=pct;$('sFill').style.width=pct+'%';$('sPct').textContent=pct+'%';$('sNext').textContent=next?'Add next: '+next[3]:'Looking great!'}
/* ---------- matches ---------- */
let mTab='best',mShown=20;
async function refreshMatches(){await runMatch();MSCORE=new Map(MATCHES.map(m=>[m.x.id,m]));if(F.mine==='1'||F.sort==='match')update();else vrender(true);renderMatches()}
function renderMatches(){const el=$('mList');if(!el)return;if(!MATCHES.length){$('mTabs').innerHTML='';$('mCounts').textContent='';el.innerHTML='<p class="muted">Add a few skills or a target category above (or upload a resume) and your matches appear here instantly.</p>';$('mMore').hidden=true;return}
 const B=[['best','Best'],['Hidden Gem','Hidden Gems'],['Strong Match','Strong'],['Realistic','Realistic'],['Reach','Reach']].filter(([k])=>k!=='Hidden Gem'||MATCHES.some(m=>m.bucket==='Hidden Gem'));
 const min=profile.minMatch;const ok=m=>!m.poor&&(!min||(min==='Strong Match'?m.bucket==='Strong Match'||m.bucket==='Hidden Gem':m.bucket!=='Reach'))&&(!profile.paidOnly||m.x.paid!==false);
 let L=MATCHES.filter(m=>ok(m)&&(mTab==='best'||m.bucket===mTab));
 if(mTab==='best'&&(window._strength||0)<50)L=[...L.filter(m=>m.bucket==='Hidden Gem'),...L.filter(m=>m.bucket!=='Hidden Gem')];// thin profile: gems first
 $('mTabs').innerHTML=B.map(([k,l])=>`<button type="button" class="${mTab===k?'on':''}" data-b="${k}">${l} <small>${(k==='best'?MATCHES.filter(ok):MATCHES.filter(m=>ok(m)&&m.bucket===k)).length}</small></button>`).join('');
 $('mTabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{mTab=b.dataset.b;mShown=20;renderMatches()});
 $('mCounts').textContent=`${MATCHES.filter(ok).length.toLocaleString()} matches out of ${MATCHES.length.toLocaleString()} open listings`;
 el.innerHTML=L.length?L.slice(0,mShown).map(m=>card(m.x,`<span class="sc">Match <b>${m.score}</b></span><span class="sc">Fit ${m.fit} × Odds ${m.odds}</span>${m.comp!=null?`<span class="sc">Competition ${m.comp}</span>`:''}`)+`<p class="why mwhy">${esc(m.reason)}</p>`).join(''):'<p class="muted">None in this group yet.</p>';$('mMore').hidden=L.length<=mShown}
$('mMore').onclick=()=>{mShown+=20;renderMatches()};
document.addEventListener('radar:tracker',()=>{vrender(true);$('trkN').textContent=T.all().length||''});
boot();
