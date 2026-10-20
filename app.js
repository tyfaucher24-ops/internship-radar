/* Internship Radar V5: website layout. Find = card grid + pill filter bar; details load on demand. All user data via Store. */
let D=[],META={},profile=Store.get('profile',{}),BYID=new Map(),MSCORE=new Map();
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const ago=iso=>{if(!iso)return'never';const s=(Date.now()-new Date(iso.length===16?iso+':00Z':iso))/1000;if(s<90)return'just now';if(s<3600)return Math.round(s/60)+' min ago';if(s<86400)return Math.round(s/3600)+' h ago';return Math.round(s/86400)+' d ago'};
const pdate=x=>x.posted||x.fs||'';
const postedAgo=x=>{const d=pdate(x);if(!d)return'';const n=-days(d.slice(0,10));return n<=0?'Posted today':n===1?'Posted yesterday':n<60?`Posted ${n} days ago`:'Posted '+fmtDate(d.slice(0,10))};
const shortDate=d=>new Date(d+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
function logoHTML(x,big){const ini=esc((x.company||'?').replace(/^the /i,'').slice(0,1).toUpperCase());const hue=[...(x.company||'')].reduce((a,c)=>a+c.charCodeAt(0),0)%360;return `<span class="logo${big?' big':''}" style="--h:${hue}" aria-hidden="true">${ini}</span>`}
function closeLbl(x){if(x.st==='upcoming')return{t:x.pred?.label||'Opening soon',c:'up'};if(!x.deadline)return{t:x.rolling?'Rolling deadline':'Closing date not listed',c:'none'};const n=days(x.deadline);
 if(n<0)return{t:'Closed '+shortDate(x.deadline),c:'closed'};return{t:n===0?'Closes today':n===1?'Closes tomorrow':'Closes '+shortDate(x.deadline)+(n<7?` · ${n} days`:''),c:n<3?'red':n<7?'amber':'ok'}}
function locShort(x){const L=(x.locations||[]).map(l=>[l.city,l.state].filter(Boolean).join(', '));let s=L.slice(0,1).join('')+(L.length>1?` +${L.length-1} more`:'');if(x.remote)s=s?s+' · Remote':'Remote';return s||x.loc_label||'Remote/Unspecified'}
function locFull(x){const L=(x.locations||[]).map(l=>[l.city,l.state].filter(Boolean).join(', '));if(x.remote)L.push('Remote');return L.join(' · ')||x.loc_label||'Remote/Unspecified'}
function mbadge(x){const m=MSCORE.get(x.id);if(!m)return'';const c={'Strong Match':'b-strong','Realistic':'b-real','Reach':'b-reach','Hidden Gem':'b-gem'}[m.bucket];return`<span class="badge ${c}" title="${esc(m.reason)}">${m.bucket==='Hidden Gem'?'💎 ':''}${m.bucket}</span>`}
function saveBtn(x){if(x.st==='upcoming'){const on=Store.get('notify',[]).includes(x.id);return`<button class="btn-save${on?' on':''}" data-act="notify" aria-pressed="${on}">${on?'🔔 Notifying':'Notify me'}</button>`}
 const t=T.byListing(x.id);return t?`<button class="btn-save on" data-act="tracker" aria-label="In your tracker: ${esc(t.status)}">✓ ${esc(t.status)}</button>`:`<button class="btn-save" data-act="save" aria-label="Save ${esc(x.company)} ${esc(x.title)}">Save</button>`}
function cardHTML(x){const c=closeLbl(x);return`<article class="card${x.st==='closed'?' isclosed':''}" role="listitem" tabindex="0" data-id="${esc(x.id)}" aria-label="${esc(x.company+', '+x.title)}">
 <div class="c-top">${logoHTML(x)}<div class="c-co" title="${esc(x.company)}">${esc(x.company)}</div>${mbadge(x)}</div>
 <h3 class="c-role" title="${esc(x.title)}">${esc(x.title)}</h3>
 <p class="c-loc" title="${esc(locFull(x))}"><svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><path d="M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="2.5" fill="currentColor"/></svg>${esc(locShort(x))}</p>
 <div class="c-foot"><span class="dl dl-${c.c}">${esc(c.t)}</span>${saveBtn(x)}</div></article>`}
const card=(x,extra='')=>cardHTML(x).replace('<div class="c-foot">',extra?`<div class="c-extra">${extra}</div><div class="c-foot">`:'<div class="c-foot">');
/* ---------- navigation (hash pages, natural scroll) ---------- */
const PAGES=['db','tracker','profile','about','contact','privacy'];
function go(t,push=true){if(t==='find'||t==='home'||!PAGES.includes(t))t='db';document.querySelectorAll('.nav [data-t]').forEach(o=>{o.classList.toggle('on',o.dataset.t===t);o.toggleAttribute('aria-current',o.dataset.t===t);if(o.dataset.t===t)o.setAttribute('aria-current','page')});
 document.querySelectorAll('main>section').forEach(s=>s.hidden=s.id!=='t-'+t);const u=new URL(location);u.hash=t==='db'?'':t;history[push?'pushState':'replaceState'](null,'',u);scrollTo(0,0);
 document.title=({db:'Find internships',tracker:'My Tracker',profile:'My Profile',about:'About',contact:'Contact',privacy:'Privacy'})[t]+' · Internship Radar';
 if(t==='db')requestAnimationFrame(()=>vrender(true));if(t==='tracker'&&window.trackerRefresh)trackerRefresh();if(t==='profile')renderMatches();reveal()}
addEventListener('popstate',()=>go(location.hash.slice(1)||'db',false));
document.addEventListener('click',e=>{const a=e.target.closest('[data-go]');if(a){e.preventDefault();go(a.dataset.go)}});
function openModal(h,cls=''){$('mbody').innerHTML=h;$('modal').className='modal '+cls;$('modal').hidden=false;document.body.classList.add('noscroll');setTimeout(()=>$('mbody').querySelector('input,select,textarea,button')?.focus(),30)}
function closeModal(){$('modal').hidden=true;document.body.classList.remove('noscroll')}
$('mx').onclick=closeModal;$('modal').onclick=e=>{if(e.target.id==='modal')closeModal()};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(document.querySelector('.pop.open'))closePops();else if(!$('modal').hidden)closeModal();else if(!$('drawer').hidden)closeDrawer();else if(!$('pmMenu').hidden)pm(false)}});
function exportData(){Store.download(`internship-radar-data-${new Date().toISOString().slice(0,10)}.json`,Store.exportAll())}
function pm(open){$('pmMenu').hidden=!open;$('pmBtn').setAttribute('aria-expanded',open)}
$('pmBtn').onclick=e=>{e.stopPropagation();pm($('pmMenu').hidden)};document.addEventListener('click',e=>{if(!e.target.closest('.pmenu'))pm(false)});
$('exp').onclick=()=>{exportData();pm(false)};document.querySelector('.pm-imp').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('imp').click()}};
$('imp').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const keys=Store.importAll(JSON.parse(await f.text()));alert(`Imported: ${keys.join(', ')||'nothing'}`);location.reload()}catch(err){alert('Import failed: '+err.message)}e.target.value=''};
$('clearAll').onclick=()=>{if(confirm('Delete everything you saved on this website (in this browser)? Export first if you want a backup.')){Store.clear();location.reload()}};
/* ---------- filters ---------- */
const FDEF=[
 ['status','Status',x=>x.st==='upcoming'?['Upcoming']:x.st==='closed'?['Closed']:x.live?['Open']:[],['Open','Upcoming','Closed']],
 ['cat','Industry',x=>[x.industry||'Other']],
 ['rt','Role type',x=>[x.role_type||'Internship']],
 ['state','State',x=>x._states.length?x._states:['Not listed']],
 ['wp','Work setting',x=>[x.workplace||(x.remote?'Remote':'Not listed')],['Remote','Hybrid','On-site','Not listed']],
 ['dlw','Closing date',x=>{if(!x.deadline)return[x.rolling?'Rolling':'Not listed'];const n=days(x.deadline);return n<0?['Passed']:n<=7?['This week','This month']:n<=31?['This month']:['Later']},['This week','This month','Later','Rolling','Not listed']],
 ['posted','Date posted',x=>{const d=pdate(x);if(!d)return[];const n=-days(d.slice(0,10));return[n<=1&&'Past 24 hours',n<=3&&'Past 3 days',n<=7&&'Past 7 days',n<=30&&'Past 30 days'].filter(Boolean)},['Past 24 hours','Past 3 days','Past 7 days','Past 30 days']],
 ['term','Season',x=>x.terms&&x.terms.length?x.terms:['Not listed']],
 ['cy','Class year',x=>x.class_years&&x.class_years.length?x.class_years:['Not listed'],['Freshman','Sophomore','Junior','Senior','Graduate','Not listed']],
 ['size','Company size',x=>[x.size||'Not listed']],
 ['spons','Visa sponsorship',x=>[x.citizenship?'US citizenship required':x.sponsorship==='Not offered'?'Not offered':x.sponsorship==='Offered'?'Offered':'Not listed'],['Offered','Not offered','US citizenship required','Not listed']],
 ['paid','Pay',x=>[x.paid===true?'Paid':x.paid===false?'Unpaid':'Not listed'],['Paid','Unpaid','Not listed']]];
const FD=Object.fromEntries(FDEF.map(d=>[d[0],d]));
const DEFAULTS={status:'Open',sort:'new'};
let F={};const FK=['q','status','cat','rt','state','city','near','radius','wp','dlw','posted','term','cy','size','spons','paid','mine','hideTracked','sort'];
function loadF(){const u=new URLSearchParams(location.search);const fromUrl=FK.some(k=>u.has(k));const src=fromUrl?Object.fromEntries(FK.filter(k=>u.has(k)).map(k=>[k,u.get(k)])):Store.get('filters',{});F={...DEFAULTS,...src}}
function saveF(){const u=new URL(location);FK.forEach(k=>u.searchParams.delete(k));FK.forEach(k=>{if(F[k]&&F[k]!==DEFAULTS[k])u.searchParams.set(k,F[k])});u.searchParams.delete('intro');u.searchParams.delete('introSlow');history.replaceState(null,'',u);Store.set('filters',F)}
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
  else{const fn=FD[fail][2];for(const v of fn(x))COUNTS[fail].set(v,(COUNTS[fail].get(v)||0)+1)}}
 const s=F.sort;const cmpDl=(a,b)=>(a.deadline&&days(a.deadline)>=0?a.deadline:'9999').localeCompare(b.deadline&&days(b.deadline)>=0?b.deadline:'9999');
 out.sort(s==='deadline'?(a,b)=>cmpDl(a,b)||pdate(b).localeCompare(pdate(a)):s==='az'?(a,b)=>a.company.localeCompare(b.company)||a.title.localeCompare(b.title):s==='match'?(a,b)=>(MSCORE.get(b.id)?.score??-1)-(MSCORE.get(a.id)?.score??-1)||cmpDl(a,b):(a,b)=>pdate(b).localeCompare(pdate(a))||cmpDl(a,b));
 RES=out;window._lastFilterMs=performance.now()-t0}
const optList=k=>{const C=COUNTS[k]||new Map(),o=FD[k][3];const all=o||[...C.keys()].sort((a,b)=>k==='state'?a.localeCompare(b):(C.get(b)-C.get(a))||a.localeCompare(b));return[...new Set([...(F[k]?[F[k]]:[]),...all])].map(v=>[v,C.get(v)||0])};
function radioGroup(k,label,anyLabel='Any'){return`<fieldset class="rg"><legend>${label}</legend><div class="rg-opts"><label class="opt"><input type="radio" name="f-${k}" value=""${!F[k]?' checked':''}> ${anyLabel}</label>${optList(k).map(([v,n])=>`<label class="opt${!n&&F[k]!==v?' dim':''}"><input type="radio" name="f-${k}" value="${esc(v)}"${F[k]===v?' checked':''}${!n&&F[k]!==v?' disabled':''}> ${esc(v)} <span class="n">${n.toLocaleString()}</span></label>`).join('')}</div></fieldset>`}
const PILLS=[['cat','Industry'],['loc','Location'],['cy','Class year'],['dlw','Closing date'],['more','More filters']];
const MOREK=['status','rt','wp','posted','term','size','spons','paid'];
function pillLabel(k,l){if(k==='loc'){const v=F.city?F.city.replace('|',', ').replace(/, $/,''):F.near&&F.radius?`${F.near} +${F.radius}mi`:F.state||'';return v?`${l}: ${v}`:l}
 if(k==='more'){const n=MOREK.filter(k=>F[k]&&F[k]!==DEFAULTS[k]).length+(F.mine==='1')+(F.hideTracked==='1');return n?`${l} · ${n}`:l}return F[k]?`${l}: ${F[k]}`:l}
function renderPills(){$('pills').innerHTML=PILLS.map(([k,l])=>{const on=k==='more'?/·/.test(pillLabel(k,l)):pillLabel(k,l)!==l;return`<div class="pillwrap"><button type="button" class="pill${on?' active':''}${k==='more'?' more':''}" data-pill="${k}" aria-haspopup="${k==='more'?'dialog':'true'}" aria-expanded="false">${esc(pillLabel(k,l))}<svg aria-hidden="true" viewBox="0 0 12 12" width="12" height="12"><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button></div>`}).join('')}
function popHTML(k){if(k==='loc')return`${radioGroup('state','State','Any state')}<fieldset class="rg"><legend>Near a city</legend><div class="near"><input list="cityList" id="nearIn" placeholder="City, ST" value="${esc(F.near||'')}" aria-label="City"><select id="radIn" aria-label="Distance"><option value="">Any distance</option>${[10,25,50,100,250].map(r=>`<option value="${r}"${+F.radius===r?' selected':''}>Within ${r} mi</option>`).join('')}</select></div></fieldset><label class="opt chk"><input type="checkbox" id="remIn"${F.city==='Remote|'?' checked':''}> Remote only</label>`;
 return radioGroup(k,FD[k][1])}
function closePops(){document.querySelectorAll('.pop').forEach(p=>p.remove());document.querySelectorAll('[data-pill]').forEach(b=>b.setAttribute('aria-expanded','false'))}
$('pills').addEventListener('click',e=>{const b=e.target.closest('[data-pill]');if(!b)return;const k=b.dataset.pill;const open=b.getAttribute('aria-expanded')==='true';closePops();if(open)return;
 if(k==='more')return moreFilters();const p=document.createElement('div');p.className='pop';p.setAttribute('role','dialog');p.setAttribute('aria-label',b.textContent);p.innerHTML=popHTML(k)+`<div class="pop-foot"><button type="button" class="link" data-clear="${k}">Clear</button><button type="button" class="btn sm" data-done>Done</button></div>`;
 b.parentElement.appendChild(p);b.setAttribute('aria-expanded','true');requestAnimationFrame(()=>p.classList.add('open'));
 const r=p.getBoundingClientRect();if(r.right>innerWidth-12)p.style.left=Math.min(0,innerWidth-12-r.right)+'px';
 p.querySelector('input:checked,input,select')?.focus();
 p.addEventListener('change',ev=>{const t=ev.target;if(t.name&&t.name.startsWith('f-')){F[t.name.slice(2)]=t.value;if(t.name==='f-state'){F.city=F.city==='Remote|'?F.city:''}}
  if(t.id==='remIn'){F.city=t.checked?'Remote|':''}if(t.id==='nearIn'){F.near=t.value;if(F.near&&!F.radius)F.radius='50'}if(t.id==='radIn')F.radius=t.value;update(true)});
 p.querySelector('[data-done]').onclick=()=>{closePops();b.focus()};p.querySelector('[data-clear]').onclick=()=>{if(k==='loc'){F.state='';F.city='';F.near='';F.radius=''}else F[k]='';closePops();update();b.focus()}});
document.addEventListener('click',e=>{if(!e.target.closest('.pillwrap'))closePops()});
function moreFilters(){openModal(`<h2>More filters</h2><div class="mf">${MOREK.map(k=>radioGroup(k,FD[k][1],k==='status'?'Any status':'Any')).join('')}
 <fieldset class="rg"><legend>Personal</legend><label class="opt chk"><input type="checkbox" id="mineIn"${F.mine==='1'?' checked':''}> Only my matches</label><label class="opt chk"><input type="checkbox" id="hideIn"${F.hideTracked==='1'?' checked':''}> Hide internships I saved or applied to</label></fieldset></div>
 <div class="mf-foot"><button type="button" class="link" id="mfClear">Clear all filters</button><button type="button" class="btn" id="mfDone">Show <span id="mfN">${RES.length.toLocaleString()}</span> internships</button></div>`,'wide');
 const box=$('mbody');box.onchange=ev=>{const t=ev.target;if(t.name&&t.name.startsWith('f-'))F[t.name.slice(2)]=t.value;if(t.id==='mineIn')F.mine=t.checked?'1':'';if(t.id==='hideIn')F.hideTracked=t.checked?'1':'';update();
  const keep=t.name||t.id;const sc=box.scrollTop;moreFiltersRefresh();box.scrollTop=sc;const el=box.querySelector(`[name="${keep}"]:checked,#${keep}`);el&&el.focus()};
 $('mfDone').onclick=closeModal;$('mfClear').onclick=()=>{clearAll();closeModal()}}
function moreFiltersRefresh(){const mf=$('mbody').querySelector('.mf');if(!mf)return;const tmp=document.createElement('div');tmp.innerHTML=MOREK.map(k=>radioGroup(k,FD[k][1],k==='status'?'Any status':'Any')).join('');
 [...mf.querySelectorAll('fieldset.rg')].slice(0,MOREK.length).forEach((f,i)=>f.replaceWith(tmp.children[0]));$('mfN').textContent=RES.length.toLocaleString()}
function clearAll(){F={...DEFAULTS,sort:F.sort};$('q').value='';update()}
function chipsHTML(){const c=[];
 if(F.q)c.push(['q',`“${F.q}”`]);FDEF.forEach(([k,l])=>{if(F[k]&&!(k==='status'&&F[k]==='Open'))c.push([k,`${l}: ${F[k]}`])});if(F.city)c.push(['city',F.city==='Remote|'?'Remote only':'📍 '+F.city.replace('|',', ')]);if(F.near&&F.radius)c.push(['near',`Within ${F.radius} mi of ${F.near}`]);
 if(F.mine==='1')c.push(['mine','My matches']);if(F.hideTracked==='1')c.push(['hideTracked','Hiding saved & applied']);
 return c.map(([k,t])=>`<button class="chip" data-k="${k}" aria-label="Remove filter ${esc(t)}">${esc(t)} <span aria-hidden="true">×</span></button>`).join('')+(c.length?'<button class="link clear" data-k="__all">Clear all</button>':'')}
function update(keepPop){compute();saveF();if(!keepPop)renderPills();else{const open=document.querySelector('.pop.open');renderPillLabels();if(open){const k=open.previousElementSibling?.dataset?.pill}}
 $('chips').innerHTML=chipsHTML();$('chips').querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{const k=b.dataset.k;if(k==='__all')return clearAll();if(k==='near'){F.near='';F.radius=''}else F[k]=k==='status'?'Open':'';if(k==='q')$('q').value='';update()});
 $('sort').value=F.sort||'new';
 $('count').innerHTML=`<b>${RES.length.toLocaleString()}</b> ${F.status==='Upcoming'?'upcoming':F.status==='Closed'?'closed':F.status?'open':''} internship${RES.length===1?'':'s'}`;
 $('empty').hidden=RES.length>0;$('empty').innerHTML=`<h3>No internships match</h3><p class="muted">Try removing a filter${F.q?' or searching for something broader':''}.</p><button class="btn" type="button" onclick="clearAll()">Clear all filters</button>`;
 animateNext=true;vrender(true);if(window.mapUpdate)mapUpdate()}
function renderPillLabels(){document.querySelectorAll('[data-pill]').forEach(b=>{const p=PILLS.find(p=>p[0]===b.dataset.pill);const l=pillLabel(p[0],p[1]);b.firstChild.textContent=l;b.classList.toggle('active',p[0]==='more'?/·/.test(l):l!==p[1])})}
let qTimer;$('q').addEventListener('input',e=>{clearTimeout(qTimer);qTimer=setTimeout(()=>{F.q=e.target.value.trim();update()},120)});
$('sort').onchange=e=>{F.sort=e.target.value;update()};
/* ---------- windowed card grid (rows of N cards; only visible rows are in the DOM) ---------- */
let lastRange='',animateNext=false;
const gridCols=()=>innerWidth>=1100?3:innerWidth>=700?2:1;
const ROWH=()=>innerWidth>=700?236:226;
function vrender(force){const vl=$('vl');if($('t-db').hidden)return;const n=gridCols(),rh=ROWH(),rows=Math.ceil(RES.length/n);vl.style.height=rows*rh+'px';vl.style.setProperty('--cols',n);
 const top=vl.getBoundingClientRect().top+scrollY,vh=innerHeight;const s=Math.max(0,Math.floor((scrollY-top)/rh)-3),e=Math.min(rows,Math.ceil((scrollY-top+vh)/rh)+3);
 const key=s+':'+e+':'+RES.length+':'+n;if(!force&&key===lastRange)return;lastRange=key;
 let h='';for(let r=s;r<e;r++){h+=`<div class="grow" style="transform:translateY(${r*rh}px)">`;for(let c=0;c<n;c++){const x=RES[r*n+c];if(x)h+=cardHTML(x)}h+='</div>'}
 vl.innerHTML=h;if(animateNext&&!RM){vl.classList.remove('reflow');void vl.offsetWidth;vl.classList.add('reflow')}animateNext=false}
addEventListener('scroll',()=>requestAnimationFrame(()=>vrender()),{passive:true});let rzT;addEventListener('resize',()=>{clearTimeout(rzT);rzT=setTimeout(()=>vrender(true),60)});
// subtle tilt on hover (desktop pointers only)
if(!RM&&matchMedia('(pointer:fine)').matches){$('vl').addEventListener('pointermove',e=>{const c=e.target.closest('.card');if(!c)return;const r=c.getBoundingClientRect();c.style.setProperty('--rx',((e.clientY-r.top)/r.height-.5)*-3+'deg');c.style.setProperty('--ry',((e.clientX-r.left)/r.width-.5)*4+'deg')});
 $('vl').addEventListener('pointerout',e=>{const c=e.target.closest('.card');if(c&&!c.contains(e.relatedTarget)){c.style.removeProperty('--rx');c.style.removeProperty('--ry')}})}
/* ---------- details on demand ---------- */
const shardCache={},descCache={};
const shardOf=id=>parseInt(String(id).slice(0,2),16)%64;
async function ensureDetail(x){if(x._det||x._mine)return x;const sh=shardOf(x.id);if(!shardCache[sh])shardCache[sh]=fetch(`data/detail/${sh}.json`).then(r=>r.json()).catch(()=>({}));const d=(await shardCache[sh])[x.id]||{};Object.assign(x,d,{_det:true});if(!x.last_verified&&x.lv)x.last_verified=x.lv;return x}
async function descOf(x){if(!x.has_desc)return null;const sh=shardOf(x.id);if(!descCache[sh])descCache[sh]=fetch(`data/desc/${sh}.json`).then(r=>r.json()).catch(()=>({}));return (await descCache[sh])[x.id]||null}
async function onCardClick(e){const row=e.target.closest('[data-id]');if(!row)return;const x=BYID.get(row.dataset.id);if(!x)return;const b=e.target.closest('[data-act]');
 if(b){e.stopPropagation();const a=b.dataset.act;if(a==='save'){blip(b);await ensureDetail(x);track(x.id,'Saved');bump()}else if(a==='applied'){await ensureDetail(x);track(x.id,'Applied');bump()}else if(a==='tracker'){go('tracker');const t=T.byListing(x.id);setTimeout(()=>{const r=t&&document.querySelector(`#tTable tr[data-id="${t.id}"]`);if(r){r.scrollIntoView({block:'center'});r.classList.add('flash');r.querySelector('select')?.focus()}},50)}
  else if(a==='notify'){const n=Store.get('notify',[]);const i=n.indexOf(x.id);i<0?n.push(x.id):n.splice(i,1);Store.set('notify',n);vrender(true);renderMatches(true)}return}
 if(e.target.closest('a'))return;openDrawer(x)}
function blip(b){if(RM)return;const s=document.createElement('span');s.className='blip';b.appendChild(s);setTimeout(()=>s.remove(),700)}
function bump(){const n=$('trkN');if(!n||RM)return;n.classList.remove('bump');void n.offsetWidth;n.classList.add('bump')}
['vl','mList'].forEach(id=>{$(id).addEventListener('click',onCardClick);$(id).addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('.card'))onCardClick(e)})});
/* ---------- drawer (transform-only slide, 250ms) ---------- */
let lastFocus=null;
function fact(k,v){return`<div class="fact"><dt>${k}</dt><dd>${v}</dd></div>`}
async function openDrawer(x){lastFocus=document.activeElement;const m=MSCORE.get(x.id);const c=closeLbl(x);
 $('dbody').innerHTML=`<div class="dhead">${logoHTML(x,true)}<div><p class="lco">${esc(x.company)}</p><h2 id="dTitle">${esc(x.title)}</h2><p class="muted">${esc(locFull(x))}</p></div></div>
 <div class="drow"><span class="dl dl-${c.c}">${esc(c.t)}</span>${mbadge(x)}<span class="muted small">${postedAgo(x)}</span></div>
 ${m?`<p class="why">${esc(m.reason)}</p>`:''}${x.pred?`<p class="why">📈 ${esc(x.pred.label)} (${esc(x.pred.confidence)} confidence)<span id="predBasis"></span>.</p>`:''}
 <p class="dact" id="dAct"><span class="skel" style="width:220px;height:44px;display:inline-block"></span></p>
 <dl class="facts" id="dFacts"></dl>
 <h3>Description</h3><div id="dDesc" class="desc"><div class="skel"></div><div class="skel"></div><div class="skel short"></div></div>
 <div class="dmeta muted small" id="dMeta"></div>
 <div class="report"><b>Report an issue</b><div class="crow"><button class="btn-ghost sm" data-rep="closed">It's closed</button><button class="btn-ghost sm" data-rep="wrong">Wrong info</button><button class="btn-ghost sm" data-rep="broken">Broken link</button></div><p class="muted small" id="repMsg"></p></div>`;
 $('drawer').hidden=false;requestAnimationFrame(()=>$('drawer').classList.add('open'));document.body.classList.add('noscroll');$('dx').focus();
 $('dbody').querySelectorAll('[data-rep]').forEach(b=>b.onclick=()=>report(x,b.dataset.rep));
 await ensureDetail(x);if($('dTitle')?.textContent!==x.title)return;
 const t=T.byListing(x.id);
 $('dAct').innerHTML=`${x.apply_url?`<a class="btn big" href="${esc(x.apply_url)}" target="_blank" rel="noopener">${x.st==='upcoming'?'Open company careers page':'Apply on company site'} ↗</a>`:'<span class="nolink">Apply link not listed</span>'}<span class="acts" data-id="${esc(x.id)}">${t?`<button class="btn-ghost" data-act="tracker">✓ In tracker: ${esc(t.status)}</button>`:x.st==='upcoming'?saveBtn(x):`<button class="btn-ghost" data-act="save">Save</button><button class="btn-ghost" data-act="applied">Mark applied</button>`}</span>`;
 $('dAct').querySelector('.acts').addEventListener('click',async e=>{await onCardClick(e);if(!$('drawer').hidden&&e.target.closest('[data-act]')?.dataset.act!=='tracker')openDrawer(BYID.get(x.id))});
 $('dFacts').innerHTML=[fact('Class years',yearsText(x)),fact('GPA minimum',x.gpa_min?esc(x.gpa_min):NL),fact('Visa sponsorship',x.citizenship?'US citizenship required':x.sponsorship?esc(x.sponsorship):NL),fact('Pay',x.paid===true?esc(x.pay||'Paid'):x.paid===false?'Unpaid':NL),fact('Work setting',x.workplace?esc(x.workplace):(x.remote?'Remote':NL)),fact('Season',termText(x)),fact('Role type',esc(x.role_type||'Internship')),fact('Industry',esc(x.industry||'Other')),fact('Openings',x.openings?esc(x.openings):NL),fact('Company size',x.size?esc(x.size):NL)].join('');
 if(x.pred?.basis&&$('predBasis'))$('predBasis').textContent='. Based on: '+x.pred.basis;
 const lv=x.last_verified||x.lv;$('dMeta').innerHTML=`<p>Source: ${esc(x.source||'')}${x.also_on?` · also listed on ${esc([...new Set(x.also_on)].slice(0,3).join(', '))}`:''}</p><p>${lv?`Last verified ${ago(lv)}`:'Not verified yet'}${x.stale?' · source unreachable on last sync, showing last good data':''}</p><p>${x.deadline?`Closing date from: ${esc(x.deadline_source||'listing')} · `:''}First seen ${x.fs?fmtDate(x.fs):'—'}${x.notes?' · '+esc(x.notes):''}</p>`;
 const d=await descOf(x);const el=$('dDesc');if(el)el.innerHTML=d?esc(d).split(/\n{2,}/).map(p=>`<p>${p.replace(/\n/g,'<br>')}</p>`).join(''):`<p class="muted">${x.st==='upcoming'?'Not posted yet. This is a prediction from past posting dates.':'Full description is on the company posting.'}</p>`}
function closeDrawer(){$('drawer').classList.remove('open');document.body.classList.remove('noscroll');setTimeout(()=>{$('drawer').hidden=true},RM?0:250);lastFocus&&lastFocus.focus&&lastFocus.focus()}
$('dx').onclick=closeDrawer;$('drawer').onclick=e=>{if(e.target.id==='drawer')closeDrawer()};
const REPO='tyfaucher24-ops/internship-radar';
function report(x,type){const r=Store.get('reports',{});r[x.id]={type,at:new Date().toISOString(),company:x.company,title:x.title};Store.set('reports',r);
 if(type==='closed'){x.hidden=true;update()}
 const title=encodeURIComponent(`[listing-report:${type}] ${x.company} — ${x.title}`.slice(0,200));const body=encodeURIComponent(`Listing id: ${x.id}\nType: ${type}\nURL: ${x.apply_url||''}\n\nWhat's wrong (optional):\n`);
 $('repMsg').innerHTML=`Thanks. ${type==='closed'?'Hidden in your browser. ':''}Want it fixed for everyone? <a target="_blank" rel="noopener" href="https://github.com/${REPO}/issues/new?labels=listing-report&title=${title}&body=${body}">Send a public report ↗</a> (3+ “closed” reports hide a listing until it's re-verified).`}
/* ---------- add / seen elsewhere ---------- */
$('addBtn').onclick=e=>{e.preventDefault();openModal(`<h2>Add an internship</h2><p class="muted">Saved to your list right away and queued for review. Please link the company's own posting.</p><form id="addForm">${listingFormHTML()}<p><button class="btn">Save internship</button></p></form>`);
 $('addForm').onsubmit=async ev=>{ev.preventDefault();const x=readListingForm(ev.target,'User submission');if(!x.company||!x.title||!x.apply_url)return alert('Company, title and link are required.');x.status='open';await Submissions.submit(x);closeModal();mergeMine();update()}};
function seen(e){e.preventDefault();openModal(`<h2>I saw an internship elsewhere</h2><p class="muted">Seen it on LinkedIn, Indeed or Handshake? Tell us the company. We'll add <b>that company's own careers page</b>. We never copy listings from those sites.</p>
 <form id="seenForm"><label>Company *<input name="company" required></label><label>Company careers page (if you know it)<input name="careers" type="url" placeholder="https://company.com/careers"></label><label>Where you saw it<select name="where"><option>LinkedIn</option><option>Indeed</option><option>Handshake</option><option>Other</option></select></label><label>Role title (optional)<input name="role"></label><p><button class="btn">Send</button></p></form>`);
 $('seenForm').onsubmit=ev=>{ev.preventDefault();const f=Object.fromEntries(new FormData(ev.target));const q=Store.get('missingQueue',[]);q.unshift({...f,id:Store.uid(),at:new Date().toISOString()});Store.set('missingQueue',q);
  const t=encodeURIComponent(`[missing-company] ${f.company}`),b=encodeURIComponent(`Company: ${f.company}\nCareers page: ${f.careers||''}\nSeen on: ${f.where}\nRole: ${f.role||''}`);
  $('mbody').innerHTML=`<h2>Thanks!</h2><p>Saved. To make sure it gets added for everyone, <a target="_blank" rel="noopener" href="https://github.com/${REPO}/issues/new?labels=missing-company&title=${t}&body=${b}">open a public request ↗</a>.</p>`}}
$('seenBtn').onclick=seen;$('seenBtn2').onclick=seen;
/* ---------- map (static SVG; drawn only while visible) ---------- */
function mapToggle(on){$('mapPanel').hidden=!on;$('mapBtn').setAttribute('aria-pressed',on);$('mapBtn').textContent=on?'Hide map':'Show map';$('mapBtn').classList.toggle('active',on);Store.set('prefs',{...Store.get('prefs',{}),map:on});if(on)loadMap();vrender(true)}
$('mapBtn').onclick=()=>mapToggle($('mapPanel').hidden);
let MAPREADY=null,PROJ=null;
function loadScript(src){return new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
function loadMap(){if(MAPREADY)return MAPREADY;MAPREADY=Promise.all([loadScript('https://cdn.jsdelivr.net/npm/d3-array@3'),loadScript('https://cdn.jsdelivr.net/npm/topojson-client@3')]).then(()=>loadScript('https://cdn.jsdelivr.net/npm/d3-geo@3')).then(()=>fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-albers-10m.json')).then(r=>r.json()).then(us=>{
 PROJ=d3.geoAlbersUsa().scale(1300).translate([487.5,305]);const path=d3.geoPath();const st=topojson.feature(us,us.objects.states).features;
 $('map').innerHTML=`<svg viewBox="0 0 975 640" role="img" aria-label="US map of matching internships"><g class="states">${st.map(f=>`<path d="${path(f)}"/>`).join('')}</g><g id="mdots"></g><g id="mremote" class="mremote" tabindex="0" role="button" aria-label="Remote internships"><circle cx="900" cy="560" r="30"/><text x="900" y="564" text-anchor="middle">Remote</text><text id="mrN" x="900" y="612" text-anchor="middle" class="mrn"></text></g></svg>`;
 $('mremote').onclick=()=>{F.city=F.city==='Remote|'?'':'Remote|';update()};$('mremote').onkeydown=e=>{if(e.key==='Enter')$('mremote').onclick()};mapUpdate()}).catch(e=>{$('map').innerHTML='<p class="muted">Map could not load (offline?). Filters still work.</p>';MAPREADY=null});return MAPREADY}
window.mapUpdate=function(){if(!PROJ||$('mapPanel').hidden||document.hidden)return;const agg=new Map();let rem=0;
 for(const x of RES){if(x.remote)rem++;for(const l of x.locations||[]){if(l.lat==null)continue;const k=l.city+'|'+l.state;const a=agg.get(k)||{l,n:0};a.n++;agg.set(k,a)}}
 let h='';for(const [k,a] of agg){const p=PROJ([a.l.lng,a.l.lat]);if(!p)continue;const r=Math.min(18,2.5+Math.sqrt(a.n)*1.6);h+=`<circle class="${F.city===k?'sel':''}" data-k="${esc(k)}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${r.toFixed(1)}"><title>${esc(a.l.city)}, ${esc(a.l.state)} · ${a.n}</title></circle>`}
 $('mdots').innerHTML=h;$('mrN').textContent=rem.toLocaleString();$('mremote').classList.toggle('sel',F.city==='Remote|');
 $('mdots').onclick=e=>{const c=e.target.closest('circle');if(!c)return;F.city=F.city===c.dataset.k?'':c.dataset.k;update()};
 $('mapNote').textContent=`${agg.size.toLocaleString()} cities · click a dot to filter${F.city?' · click again to clear':''}`}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&window.mapUpdate)mapUpdate()});
/* ---------- scroll reveal ---------- */
const RIO='IntersectionObserver' in window&&!RM?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');RIO.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px'}):null;
function reveal(){document.querySelectorAll('main>section:not([hidden]) .panel, main>section:not([hidden]) .prose>*, .site-footer .fgrid>*').forEach(el=>{if(el.classList.contains('rv'))return;el.classList.add('rv');RIO?RIO.observe(el):el.classList.add('in')})}
/* ---------- data load ---------- */
const CITYIDX=new Map();
function mergeMine(){const mine=Store.get('myListings',[]).map(x=>prepare({...x,_mine:true,_det:true,id:String(x.id),source:'Added by you'}));D=mine.concat(D.filter(x=>!x._mine));BYID=new Map(D.map(x=>[String(x.id),x]));if(META.updated)markLive()}
/* One shared definition of "open": status open + verified within 24h of the last sync (same rule the sync uses for meta.open), plus listings you added yourself. */
function markLive(){const cut=META.updated?Date.parse(META.updated)-864e5:0;for(const x of D)x.live=!!x._mine||(x.status==='open'&&x.st!=='closed'&&!x.hidden&&!x.past_term&&!!x.lv&&Date.parse(x.lv+(x.lv.length<=16?':00Z':''))>=cut)}
function liveCounts(){if(!D.length||!D.some(x=>'live' in x))return{open:META.open||0,wk:META.closing_this_week||0};let o=0,w=0;for(const x of D)if(x.live){o++;if(x.deadline){const n=days(x.deadline);if(n>=0&&n<=7)w++}}return{open:o,wk:w}}
function hdrCount(){const LC=liveCounts();const t=META.updated?`${LC.open.toLocaleString()} open internships · ${LC.wk.toLocaleString()} closing this week · updated ${ago(META.updated)}`:'Live counts unavailable';document.querySelectorAll('.hdrCount').forEach(e=>{if(!e.closest('#intro'))e.textContent=t})}
async function boot(){loadF();$('q').value=F.q||'';renderPills();if(Store.get('prefs',{}).map)mapToggle(true);
 $('vl').style.height='auto';$('vl').innerHTML='<div class="grow static">'+Array.from({length:gridCols()*2},()=>'<div class="card skelcard"><div class="skel"></div><div class="skel"></div><div class="skel short"></div></div>').join('')+'</div>';
 const metaP=fetch('data/meta.json').then(r=>r.json()).catch(()=>({}));metaP.then(m=>{META=m;hdrCount();document.dispatchEvent(new CustomEvent('radar:meta',{detail:m}))});
 try{D=[];const prep=rows=>{for(const x of rows)D.push(prepare({...x,id:String(x.id),first_seen:x.fs}))};
  const loadMain=async()=>{const l=await fetch('data/index.json').then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json()});const LL=l.listings;for(let i=0;i<LL.length;i+=800){prep(LL.slice(i,i+800));await new Promise(r=>setTimeout(r,0))}};
  if(window.Worker){await new Promise((res,rej)=>{let w;try{w=new Worker('data-worker.js')}catch(_){return loadMain().then(res,rej)}const q=[];let busy=false,done=false;
   const pump=()=>{if(busy)return;busy=true;const step=()=>{const t=performance.now();while(q.length&&performance.now()-t<12)prep(q.shift());if(q.length)setTimeout(step,0);else{busy=false;if(done){w.terminate();res()}}};step()};
   w.onmessage=e=>{const m=e.data;if(m.t==='chunk'){q.push(m.rows);pump()}else if(m.t==='done'){done=true;if(!busy){w.terminate();res()}}else if(m.t==='err'){w.terminate();rej(new Error(m.msg))}};
   w.onerror=()=>{w.terminate();D=[];loadMain().then(res,rej)};w.postMessage({url:new URL('data/index.json',location.href).href})})}else await loadMain();
  mergeMine();
  const reps=Store.get('reports',{});D.forEach(x=>{if(reps[x.id]?.type==='closed')x.hidden=true;for(const L of x.locations||[])if(L.lat!=null&&L.city){const k=L.city+', '+L.state;if(!CITYIDX.has(k))CITYIDX.set(k,{lat:L.lat,lng:L.lng})}});
  const dl=document.createElement('datalist');dl.id='cityList';dl.innerHTML=[...CITYIDX.keys()].sort().map(k=>`<option value="${esc(k)}">`).join('');document.body.appendChild(dl);
 }catch(e){$('vl').innerHTML='';$('vl').style.height='auto';$('notice').innerHTML=`<div class="err" role="alert"><b>Couldn't load listings.</b> ${esc(e.message)}. <button class="btn-ghost sm" onclick="location.reload()">Retry</button></div>`;return}
 await metaP;markLive();hdrCount();setInterval(hdrCount,60000);
 const n=Store.get('notify',[]);const nowOpen=n.map(id=>BYID.get(id)).filter(x=>x&&x.st!=='upcoming');if(nowOpen.length)$('notice').innerHTML=`<div class="ok" role="status">🔔 Now open: ${nowOpen.map(x=>esc(x.company)).join(', ')}. <button class="btn-ghost sm" onclick="Store.set('notify',[]);this.parentNode.remove()">Dismiss</button></div>`;
 await new Promise(r=>setTimeout(r,0));update();document.body.classList.remove('booting');document.dispatchEvent(new Event('radar:data'));
 profileInit();trackerInit();const h=location.hash.slice(1);if(h&&$('t-'+h))go(h,false);else reveal();window._interactiveAt=performance.now();
 (window.requestIdleCallback||setTimeout)(()=>refreshMatches())}
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
