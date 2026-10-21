/* Internship Radar V5: website layout. Find = card grid + pill filter bar; details load on demand. All user data via Store. */
let D=[],META={},profile=Store.get('profile',{}),BYID=new Map(),MSCORE=new Map(),UNGR=new Set();
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const ago=iso=>{if(!iso)return'never';const s=(Date.now()-new Date(iso.length===16?iso+':00Z':iso))/1000;if(s<90)return'just now';if(s<3600)return Math.round(s/60)+' min ago';if(s<86400)return Math.round(s/3600)+' h ago';return Math.round(s/86400)+' d ago'};
const pdate=x=>x.posted||x.fs||'';
const postedAgo=x=>{const d=pdate(x);if(!d)return'';const n=-days(d.slice(0,10));return n<=0?'Posted today':n===1?'Posted yesterday':n<60?`Posted ${n} days ago`:'Posted '+fmtDate(d.slice(0,10))};
const shortDate=d=>new Date(d+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
let LOGOS=null,logosAsked=false;function loadLogos(){if(logosAsked)return;logosAsked=true;fetch('data/logo-map.json').then(r=>r.json()).then(m=>{LOGOS=m;const vis=()=>{if(D.length&&!$('t-db')?.hidden)vrender(true);if(!$('t-tracker')?.hidden&&window.trackerRefresh)trackerRefresh()};(window.requestAnimationFrame||setTimeout)(vis)}).catch(()=>{LOGOS={}})}
/* V6.1: logo map is fetched after load when the browser is idle, never during first paint or the intro */
addEventListener('load',()=>{const go=()=>(window.requestIdleCallback||((f)=>setTimeout(f,1500)))(loadLogos,{timeout:5000});document.body.classList.contains('intro-on')?setTimeout(go,3000):go()});
function logoHTML(x,big,cls){const sz=cls==='sm'?28:big?56:40,co=x.company||'';const f=LOGOS&&LOGOS[co];const ini=esc(co.replace(/^the /i,'').slice(0,1).toUpperCase()||'?');const hue=[...co].reduce((a,c)=>a+c.charCodeAt(0),0)%360;
 const k=`logo${big?' big':''}${cls?' '+cls:''}`;return f?`<span class="${k} has-img" aria-hidden="true"><img src="assets/logos/${esc(f)}" alt="" width="${sz}" height="${sz}" loading="lazy" decoding="async" onerror="this.parentNode.classList.remove('has-img');this.parentNode.style.setProperty('--h','${hue}');this.replaceWith(document.createTextNode('${ini}'))"></span>`:`<span class="${k}" style="--h:${hue}" aria-hidden="true">${ini}</span>`}
function closeLbl(x){if(x.st==='upcoming')return{t:x.pred?.label?'Expected '+x.pred.label.replace(/^Usually opens\s*/i,''):'Expected soon',c:'up',b:x.pred?.basis?'Basis: '+x.pred.basis+(x.pred.confidence?` (${x.pred.confidence} confidence)`:''):''};if(!x.deadline)return{t:x.rolling?'Rolling deadline':'Closing date not listed',c:'none'};const n=days(x.deadline);
 if(n<0)return{t:'Closed '+shortDate(x.deadline),c:'closed'};return{t:n===0?'Closes today':n===1?'Closes tomorrow':'Closes '+shortDate(x.deadline)+(n<7?` · ${n} days`:''),c:n<3?'red':n<7?'amber':'ok'}}
function locShort(x){const L=(x.locations||[]).map(l=>[l.city,l.state].filter(Boolean).join(', '));let s=L.slice(0,1).join('')+(L.length>1?` +${L.length-1} more`:'');if(x.remote)s=s?s+' · Remote':'Remote';return s||(x.loc_label&&x.loc_label!=='Remote/Unspecified'?x.loc_label:'Location not listed')}
function locFull(x){const L=(x.locations||[]).map(l=>[l.city,l.state].filter(Boolean).join(', '));if(x.remote)L.push('Remote');return L.join(' · ')||(x.loc_label&&x.loc_label!=='Remote/Unspecified'?x.loc_label:'Location not listed')}
function mbadge(x){const m=MSCORE.get(x.id);if(!m)return UNGR.has(x.id)?'<span class="mbadge gna" title="Not enough info to grade this one. Open it to see what to add.">Not enough info</span>':'';const v=m.pct>=(MW?.grader?.verdict?.strong??75)?['strong','Strong shot']:m.pct>=(MW?.grader?.verdict?.worth??55)?['worth','Worth applying']:['long','Long shot'];return`<span class="mbadge ${m.band}" title="Match ${m.pct}%, grade ${m.grade}">${m.pct}% · ${m.grade}</span><span class="verd v-${v[0]}">${v[1]}</span>`}
function saveBtn(x){if(x.st==='upcoming'){const on=Store.get('notify',[]).includes(x.id);return`<button class="btn-save${on?' on':''}" data-act="notify" aria-pressed="${on}">${on?'🔔 Notifying':'Notify me'}</button>`}
 const t=T.byListing(x.id);return t?`<button class="btn-save on" data-act="tracker" aria-label="In your tracker: ${esc(t.status)}">✓ ${esc(t.status)}</button>`:`<button class="btn-save" data-act="save" aria-label="Save ${esc(x.company)} ${esc(x.title)}">Save</button>`}
function cardHTML(x){const c=closeLbl(x);return`<article class="card${x.st==='closed'?' isclosed':''}" role="listitem" tabindex="0" data-id="${esc(x.id)}" aria-label="${esc(x.company+', '+x.title)}">
 <div class="c-top">${logoHTML(x)}<div class="c-co" title="${esc(x.company)}">${esc(x.company)}</div></div>
 <h3 class="c-role" title="${esc(x.title)}">${esc(x.title)}</h3>
 <p class="c-loc" title="${esc(locFull(x))}"><svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><path d="M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="2.5" fill="currentColor"/></svg>${esc(locShort(x))}</p>${(MSCORE.size||UNGR.size)?`<p class="c-verd">${mbadge(x)}</p>`:''}
 <div class="c-foot"><span class="dl dl-${c.c}"${c.b?` title="${esc(c.b)}"`:''}>${esc(c.t)}</span>${grpBtn(x)}${saveBtn(x)}</div></article>`}
function grpBtn(x){const e=GRP.get(x.id);if(!e||e.n<2||e.ids[0]!==x.id)return'';const o=GEXP.has(e.k);return`<button type="button" class="grp" data-grp="${esc(e.k)}" aria-expanded="${o}" title="${o?'Hide':'Show'} ${e.n-1} similar role${e.n>2?'s':''} at ${esc(x.company)}">${o?"Hide":`+${e.n-1} similar`}</button>`}
const card=(x,extra='')=>cardHTML(x).replace('<div class="c-foot">',extra?`<div class="c-extra">${extra}</div><div class="c-foot">`:'<div class="c-foot">');
/* ---------- navigation (hash pages, natural scroll) ---------- */
const PAGES=['db','tracker','profile','feedback','about','contact','privacy'];
function go(t,push=true){if(t==='find'||t==='home'||!PAGES.includes(t))t='db';document.querySelectorAll('.nav [data-t]').forEach(o=>{o.classList.toggle('on',o.dataset.t===t);o.toggleAttribute('aria-current',o.dataset.t===t);if(o.dataset.t===t)o.setAttribute('aria-current','page')});
 document.querySelectorAll('main>section').forEach(s=>s.hidden=s.id!=='t-'+t);const u=new URL(location);u.hash=t==='db'?'':t;history[push?'pushState':'replaceState'](null,'',u);scrollTo(0,0);
 document.title=({db:'Find internships',tracker:'My Tracker',profile:'My Profile',feedback:'Honest feedback',about:'About',contact:'Contact',privacy:'Privacy'})[t]+' · Internship Radar';
 if(t==='db')requestAnimationFrame(()=>vrender(true));if(t==='tracker'&&window.trackerRefresh)trackerRefresh();if($('fbNudge'))$('fbNudge').hidden=!MatchCore.hasProfile(profile);if(t==='profile'&&$('fbLink'))$('fbLink').hidden=!MatchCore.hasProfile(profile);if(t==='feedback')(window.renderFeedback?Promise.resolve():loadScript('feedback.js')).then(()=>renderFeedback());document.body.classList.toggle('on-profile',t==='profile');document.dispatchEvent(new CustomEvent('radar:page',{detail:t}));reveal()}
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
/* ---------- filters ---------- */
const FDEF=[
 ['status','Status',x=>x.st==='upcoming'?['Upcoming']:x.st==='closed'?['Closed']:x.live?['Open']:[],['Open','Upcoming','Closed']],
 ['cat','Industry',x=>[x.industry||'Other']],
 ['rt','Role type',x=>[x.role_type||'Internship']],
 ['loc','Location',x=>x._lk||(x._lk=locKeys(x))],
 ['wp','Work setting',x=>[x.workplace||(x.remote?'Remote':'Not listed')],['Remote','Hybrid','On-site','Not listed']],
 ['dlw','Closing date',x=>{if(!x.deadline)return[x.rolling?'Rolling':'Not listed'];const n=days(x.deadline);return n<0?['Passed']:n<=7?['This week','This month']:n<=31?['This month']:['Later']},['This week','This month','Later','Rolling','Not listed']],
 ['posted','Date posted',x=>{const d=pdate(x);if(!d)return[];const n=-days(d.slice(0,10));return[n<=1&&'Past 24 hours',n<=3&&'Past 3 days',n<=7&&'Past 7 days',n<=30&&'Past 30 days'].filter(Boolean)},['Past 24 hours','Past 3 days','Past 7 days','Past 30 days']],
 ['term','Season',x=>x.terms&&x.terms.length?x.terms:['Not listed']],
 ['cy','Class year',x=>x.class_years&&x.class_years.length?x.class_years:['Not listed'],['Freshman','Sophomore','Junior','Senior','Graduate','Not listed']],
 ['size','Company size',x=>[x.size||'Not listed']],
 ['spons','Visa sponsorship',x=>[x.citizenship?'US citizenship required':x.sponsorship==='Not offered'?'Not offered':x.sponsorship==='Offered'?'Offered':'Not listed'],['Offered','Not offered','US citizenship required','Not listed']],
 ['paid','Pay',x=>[x.paid===true?'Paid':x.paid===false?'Unpaid':'Not listed'],['Paid','Unpaid','Not listed']]];
const FD=Object.fromEntries(FDEF.map(d=>[d[0],d]));
const DEFAULTS={status:'Open',sort:'deadline'};
let F={};const FK=['q','status','cat','rt','loc','state','city','near','radius','wp','dlw','posted','term','cy','size','spons','paid','minm','hideTracked','sort'];
function loadF(){const u=new URLSearchParams(location.search);const fromUrl=FK.some(k=>u.has(k));const src=fromUrl?Object.fromEntries(FK.filter(k=>u.has(k)).map(k=>[k,u.get(k)])):Store.get('filters',{});F={...DEFAULTS,...src};/* V8 migrate old single-value location keys */if(F.state){F.loc=[...(F.loc?F.loc.split('~'):[]),'st:'+F.state].join('~');F.state=''}if(F.city){F.loc=[...(F.loc?F.loc.split('~'):[]),F.city==='Remote|'?'Remote':'c:'+F.city].join('~');F.city=''}if(F.sort==='new'&&!src.sort)F.sort=DEFAULTS.sort}
function saveF(){const u=new URL(location);FK.forEach(k=>u.searchParams.delete(k));FK.forEach(k=>{if(F[k]&&F[k]!==DEFAULTS[k])u.searchParams.set(k,F[k])});u.searchParams.delete('intro');u.searchParams.delete('introSlow');history.replaceState(null,'',u);Store.set('filters',F)}
/* ---------- V8 filters: multi-select, searchable panels with live counts, staged Apply/Clear ---------- */
const SEP='~';const fv=k=>F[k]?String(F[k]).split(SEP).filter(Boolean):[];const fset=(k,a)=>{F[k]=a.join(SEP)};
const METRO_OF=(()=>{const m=new Map();for(const [name,cs] of Object.entries(LISTS.METROS))for(const [c,s] of cs)m.set(c+'|'+s,name);return m})();
function locKeys(x){const k=new Set();if(x.remote)k.add('Remote');for(const l of x.locations||[]){if(l.state)k.add('st:'+l.state);if(l.city&&l.state){k.add('c:'+l.city+'|'+l.state);const m=METRO_OF.get(l.city+'|'+l.state);if(m)k.add('m:'+m)}}if(!k.size)k.add('Not listed');return[...k]}
const locLabel=v=>v==='Remote'?'Remote':v.startsWith('st:')?`Anywhere in ${LISTS.STATES[v.slice(3)]||v.slice(3)}`:v.startsWith('c:')?v.slice(2).replace('|',', '):v.startsWith('m:')?v.slice(2):v;
let TRACKED=new Set();
const R=3958.8,rad=d=>d*Math.PI/180,hav=(a,b)=>2*R*Math.asin(Math.sqrt(Math.sin(rad(b.lat-a.lat)/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(rad(b.lng-a.lng)/2)**2));
let NEAR=null;
/* search syntax: company:google  location:nyc  "exact phrase"  plain words */
const LOCALIAS={nyc:'new york',ny:'new york',sf:'san francisco',la:'los angeles',dc:'washington',philly:'philadelphia',chi:'chicago',atl:'atlanta',bay:'san francisco'};
function parseQ(s){const out={words:[],phrases:[],company:[],location:[]};s=String(s||'').toLowerCase();
 s=s.replace(/(company|location|loc):"([^"]+)"/g,(_,k,v)=>{out[k==='company'?'company':'location'].push(v.trim());return' '}).replace(/(company|location|loc):(\S+)/g,(_,k,v)=>{out[k==='company'?'company':'location'].push(v.replace(/[-_]/g,' '));return' '})
  .replace(/"([^"]+)"/g,(_,p)=>{out.phrases.push(p.replace(/\s+/g,' ').trim());return' '});
 out.words=s.split(/\s+/).filter(Boolean);out.location=out.location.map(l=>LOCALIAS[l]||l);return out}
function baseOK(x,q){if(x.hidden)return false;
 if(q.words.length&&!q.words.every(w=>x._t.includes(w)))return false;if(q.phrases.length&&!q.phrases.every(p=>x._t.includes(p)))return false;
 if(q.company.length){const c=(x.company||'').toLowerCase();if(!q.company.some(w=>c.includes(w)))return false}
 if(q.location.length){const ls=(x.locations||[]).map(l=>((l.city||'')+' '+(l.state||'')+' '+(LISTS.STATES[l.state]||'')).toLowerCase()).join(' | ')+(x.remote?' | remote':'');if(!q.location.some(w=>ls.includes(w)||(w.length===2&&(x.locations||[]).some(l=>(l.state||'').toLowerCase()===w))))return false}
 if(NEAR&&+F.radius){if(!(x.locations||[]).some(l=>l.lat!=null&&hav(NEAR,l)<=+F.radius))return false}
 if(F.minm&&MSCORE.size){const m=MSCORE.get(x.id);if(!m||m.pct<+F.minm)return false}
 if(F.hideTracked==='1'&&TRACKED.has(String(x.id)))return false;
 if(x.past_term&&!fv('status').includes('Closed'))return false;return true}
let RES=[],COUNTS={};
function compute(){const t0=performance.now();const q=parseQ(F.q);TRACKED=new Set(T.all().map(t=>String(t.listingId)));
 NEAR=null;if(F.near&&+F.radius){const c=CITYIDX.get(F.near);if(c)NEAR=c}
 const act=FDEF.filter(([k])=>F[k]).map(d=>[d[0],d[2],new Set(fv(d[0]))]);COUNTS=Object.fromEntries(FDEF.map(([k])=>[k,new Map()]));const out=[];
 for(const x of D){if(!baseOK(x,q))continue;let fail=null,nf=0;
  for(const [k,fn,S] of act){if(!fn(x).some(v=>S.has(v))){nf++;fail=k;if(nf>1)break}}
  if(nf>1)continue;
  if(nf===0){out.push(x);for(const [k,,fn] of FDEF)for(const v of fn(x))COUNTS[k].set(v,(COUNTS[k].get(v)||0)+1)}
  else{const fn=FD[fail][2];for(const v of fn(x))COUNTS[fail].set(v,(COUNTS[fail].get(v)||0)+1)}}
 const s=F.sort;const cmpDl=(a,b)=>(a.deadline&&days(a.deadline)>=0?a.deadline:'9999').localeCompare(b.deadline&&days(b.deadline)>=0?b.deadline:'9999');
 out.sort(s==='deadline'?(a,b)=>cmpDl(a,b)||pdate(b).localeCompare(pdate(a)):s==='az'?(a,b)=>a.company.localeCompare(b.company)||a.title.localeCompare(b.title):s==='match'?(a,b)=>(MSCORE.get(b.id)?.pct??-1)-(MSCORE.get(a.id)?.pct??-1)||cmpDl(a,b):(a,b)=>pdate(b).localeCompare(pdate(a))||cmpDl(a,b));
 if(s==='match'){/* V9: one company can't take over the top: each extra role from the same company ranks a few points lower (the score itself is unchanged) */const pen=MW?.grader?.diversityPenalty??3,seen=new Map(),eff=new Map();for(const x of out){const m=MSCORE.get(x.id);if(!m)continue;const k=x.company,n=(seen.get(k)||0);seen.set(k,n+1);eff.set(x.id,m.pct-pen*n)}out.sort((a,b)=>(eff.get(b.id)??-99)-(eff.get(a.id)??-99)||cmpDl(a,b))}
 /* V9: group near-duplicate roles (same company, same title apart from location/year/parentheses) into one card */
 ALLN=out.length;GRP=new Map();const gk=x=>x.company+'|'+x.title.toLowerCase().replace(/\([^)]*\)|\[[^\]]*\]/g,'').replace(/\s[-–—|,:]\s.*$/,'').replace(/\b(19|20)\d\d\b|summer|fall|spring|winter/g,'').replace(/[^a-z]+/g,' ').trim();
 const first=new Map(),g=[],mem=new Map();for(const x of out){const k=gk(x),f=first.get(k);if(f===undefined){first.set(k,x);g.push(x);GRP.set(x.id,{k,n:1,ids:[x.id]})}else{const e=GRP.get(f.id);e.n++;e.ids.push(x.id);if(GEXP.has(k))(mem.get(f.id)||mem.set(f.id,[]).get(f.id)).push(x)}}
 RES=mem.size?g.flatMap(x=>[x,...(mem.get(x.id)||[])]):g;window._lastFilterMs=performance.now()-t0}
let ALLN=0,GRP=new Map();const GEXP=new Set();
function optList(k){const C=COUNTS[k]||new Map(),o=FD[k][3],sel=fv(k);const all=o||[...C.keys()].sort((a,b)=>(C.get(b)-C.get(a))||a.localeCompare(b));
 if(k==='loc'){const opts=[],seen=new Set();const add=(v,extra)=>{if(seen.has(v+(extra.pinned?'*':'')))return;seen.add(v+(extra.pinned?'*':''));opts.push({v,label:locLabel(v),count:C.get(v)||0,...extra})};
  add('Remote',{pinned:true});Object.keys(LISTS.METROS).filter(m=>C.get('m:'+m)).sort((a,b)=>C.get('m:'+b)-C.get('m:'+a)).forEach(m=>add('m:'+m,{pinned:true,group:'Metro areas',boost:3,alias:({'New York City area':'NYC|New York|NY metro','SF Bay Area':'Bay Area|San Francisco Bay Area|SF|Silicon Valley','Washington DC area':'DC|DMV|Washington DC','Dallas–Fort Worth':'DFW|Dallas|Fort Worth','Los Angeles area':'LA','Chicago area':'Chicago','Boston area':'Boston','Seattle area':'Seattle','Denver area':'Denver'})[m]||''}));
  Object.keys(LISTS.STATES).filter(s=>C.get('st:'+s)||sel.includes('st:'+s)).sort((a,b)=>LISTS.STATES[a].localeCompare(LISTS.STATES[b])).forEach(s=>add('st:'+s,{group:'States',alias:s+'|'+LISTS.STATES[s],boost:5}));
  [...C.keys()].filter(v=>v.startsWith('c:')).sort().forEach(v=>add(v,{group:'Cities',alias:LISTS.STATES[v.slice(-2)]||''}));sel.filter(v=>!seen.has(v)).forEach(v=>add(v,{}));return opts}
 return[...new Set([...sel,...all])].map(v=>({v,count:C.get(v)||0}))}
const PILLS0=[['cat','Industry'],['loc','Location'],['cy','Class year'],['dlw','Closing date'],['minm','Minimum match'],['more','More filters']];const pillList=()=>PILLS0.filter(([k])=>k!=='minm'||MSCORE.size);
const MOREK=['size','spons','paid','posted','term','status','rt','wp'];
const MINM=[['','Any'],['60','60%+ (C or better)'],['75','75%+ (B or better)'],['90','90%+ (A range)']];
function pillLabel(k,l){if(k==='loc'){const v=fv('loc'),n=v.length+(F.near&&F.radius?1:0);return n===1?`${l}: ${v[0]?locLabel(v[0]):`${F.near} +${F.radius}mi`}`:n?`${l} · ${n}`:l}
 if(k==='more'){const n=MOREK.filter(k=>F[k]&&F[k]!==DEFAULTS[k]).length+(F.hideTracked==='1');return n?`${l} · ${n}`:l}if(k==='minm')return F.minm?`${l}: ${F.minm}%+`:l;const v=fv(k);return v.length===1?`${l}: ${v[0]}`:v.length?`${l} · ${v.length}`:l}
function renderPills(){$('pills').innerHTML=pillList().map(([k,l])=>{const on=pillLabel(k,l)!==l;return`<div class="pillwrap"><button type="button" class="pill${on?' active':''}${k==='more'?' more':''}" data-pill="${k}" aria-haspopup="dialog" aria-expanded="false">${esc(pillLabel(k,l))}<svg aria-hidden="true" viewBox="0 0 12 12" width="12" height="12"><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button></div>`}).join('')}
function closePops(){document.querySelectorAll('.pop').forEach(p=>p.remove());document.querySelectorAll('[data-pill]').forEach(b=>b.setAttribute('aria-expanded','false'))}
/* count what Apply would show, for the staged selection */
function stagedCount(patch){const keep={};for(const k in patch){keep[k]=F[k];F[k]=patch[k]}const r0=RES,c0=COUNTS;compute();const n=ALLN;for(const k in keep)F[k]=keep[k];RES=r0;COUNTS=c0;return n}
$('pills').addEventListener('click',e=>{const b=e.target.closest('[data-pill]');if(!b)return;const k=b.dataset.pill;const open=b.getAttribute('aria-expanded')==='true';closePops();if(open)return;
 if(k==='more')return moreFilters();const p=document.createElement('div');p.className='pop fpanel';p.setAttribute('role','dialog');p.setAttribute('aria-label',FD[k]?FD[k][1]:b.textContent);
 p.innerHTML=`<div class="fp-list"></div>${k==='loc'?`<fieldset class="rg fp-near"><legend>Near a city</legend><div class="near"><div id="nearCb"></div><select id="radIn" aria-label="Distance"><option value="">Any distance</option>${[10,25,50,100,250].map(r=>`<option value="${r}"${+F.radius===r?' selected':''}>Within ${r} mi</option>`).join('')}</select></div></fieldset>`:''}<div class="pop-foot"><button type="button" class="link" data-clear>Clear</button><button type="button" class="btn sm" data-apply>Apply</button></div>`;
 b.parentElement.appendChild(p);b.setAttribute('aria-expanded','true');requestAnimationFrame(()=>p.classList.add('open'));
 const r=p.getBoundingClientRect();if(r.right>innerWidth-8)p.style.left=Math.min(0,innerWidth-8-r.right)+'px';
 let staged=k==='minm'?[F.minm||'']:fv(k),near=F.near||'',radius=F.radius||'';
 const patch=()=>k==='minm'?{minm:staged[0]||''}:k==='loc'?{loc:staged.join(SEP),near,radius:near?radius||'50':''}:{[k]:staged.join(SEP)};
 const btn=p.querySelector('[data-apply]');const refresh=()=>{const t0=performance.now();btn.textContent=`Show ${stagedCount(patch()).toLocaleString()}`;window._stagedMs=performance.now()-t0};
 const L=Combo.list(p.querySelector('.fp-list'),{label:FD[k]?FD[k][1]:'Minimum match',single:k==='minm',counts:k!=='minm',searchPlaceholder:k==='loc'?'Any city or state, e.g. “austin” or “TX”':`Search ${(FD[k]?FD[k][1]:'options').toLowerCase()}`,
  options:()=>k==='minm'?MINM.map(([v,t])=>({v,label:t})):optList(k),value:staged,onChange:v=>{staged=v;refresh()},onEsc:()=>{closePops();b.focus()}});
 if(k==='loc'){const nc=Combo.field($('nearCb'),{label:'Near a city',placeholder:'City, ST',searchPlaceholder:'Type a city',options:()=>[...CITYIDX.keys()].map(v=>({v})),other:false,value:near,onChange:v=>{near=v;if(near&&!radius){radius='50';$('radIn').value='50'}refresh()}});$('radIn').onchange=e=>{radius=e.target.value;refresh()}}
 refresh();L.focus();
 btn.onclick=()=>{Object.assign(F,patch());closePops();update();document.querySelector(`[data-pill="${k}"]`)?.focus()};
 p.querySelector('[data-clear]').onclick=()=>{if(k==='loc'){F.loc='';F.near='';F.radius=''}else F[k]='';closePops();update();document.querySelector(`[data-pill="${k}"]`)?.focus()};
 p.addEventListener('keydown',ev=>{if(ev.key==='Escape'){ev.stopPropagation();closePops();b.focus()}})});
document.addEventListener('mousedown',e=>{if(!e.target.closest('.pillwrap'))closePops()});
function moreFilters(){openModal(`<h2>More filters</h2><p class="muted">Pick as many as you like, then press Show.</p><div class="mf mf8">${MOREK.map(k=>`<section class="mf-sec"><h3>${esc(FD[k][1])}</h3><div class="mf-l" data-k="${k}"></div></section>`).join('')}
 <section class="mf-sec"><h3>Personal</h3><label class="opt chk"><input type="checkbox" id="hideIn"${F.hideTracked==='1'?' checked':''}> Hide internships I saved or applied to</label></section></div>
 <div class="mf-foot"><button type="button" class="link" id="mfClear">Clear these filters</button><button type="button" class="btn" id="mfDone">Show <span id="mfN">${RES.length.toLocaleString()}</span> internships</button></div>`,'wide');
 const st=Object.fromEntries(MOREK.map(k=>[k,fv(k)]));let hide=F.hideTracked==='1';const patch=()=>({...Object.fromEntries(MOREK.map(k=>[k,st[k].join(SEP)])),hideTracked:hide?'1':''});
 const ref=()=>{$('mfN').textContent=stagedCount(patch()).toLocaleString()};
 $('mbody').querySelectorAll('.mf-l').forEach(h=>{const k=h.dataset.k;Combo.list(h,{label:FD[k][1],searchPlaceholder:`Search ${FD[k][1].toLowerCase()}`,options:()=>optList(k),value:st[k],onChange:v=>{st[k]=v;ref()}})});
 $('hideIn').onchange=e=>{hide=e.target.checked;ref()};ref();
 $('mfDone').onclick=()=>{Object.assign(F,patch());closeModal();update()};$('mfClear').onclick=()=>{MOREK.forEach(k=>F[k]=k==='status'?'Open':'');F.hideTracked='';closeModal();update()}}
function clearAll(){F={...DEFAULTS,sort:F.sort};$('q').value='';update()}
function chipsHTML(){const c=[];
 if(F.q)c.push(['q','',`Search: “${F.q}”`]);FDEF.forEach(([k,l])=>{fv(k).forEach(v=>{if(k==='status'&&v==='Open'&&fv(k).length===1)return;c.push([k,v,`${k==='loc'?'📍 ':l+': '}${k==='loc'?locLabel(v):v}`])})});if(F.near&&F.radius)c.push(['near','',`Within ${F.radius} mi of ${F.near}`]);
 if(F.minm&&MSCORE.size)c.push(['minm','',`Match ${F.minm}%+`]);if(F.hideTracked==='1')c.push(['hideTracked','','Hiding saved & applied']);
 return c.map(([k,v,t])=>`<button class="chip" data-k="${k}" data-v="${esc(v)}" aria-label="Remove filter ${esc(t)}">${esc(t)} <span aria-hidden="true">×</span></button>`).join('')+(c.length?'<button class="link clear" data-k="__all">Clear all</button>':'')}
function begInit(){const el=$('beg');if(!el)return;const n=stagedCount({cy:'Freshman~Sophomore'});
 el.hidden=localStorage.getItem("ir_beg_x")==="1"||!n||!!F.cy;$("begGo").textContent=`Show ${n.toLocaleString()} roles open to freshmen or sophomores`;
 $('begGo').onclick=()=>{F.cy='Freshman~Sophomore';el.hidden=true;update()};$('begX').onclick=()=>{localStorage.setItem('ir_beg_x','1');el.hidden=true}}
function update(keepPop){compute();saveF();if(!keepPop)renderPills();else renderPillLabels();
 $('chips').innerHTML=chipsHTML();$('chips').querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{const k=b.dataset.k,v=b.dataset.v;if(k==='__all')return clearAll();if(k==='near'){F.near='';F.radius=''}else if(v&&FD[k]){fset(k,fv(k).filter(x=>x!==v));if(k==='status'&&!F.status)F.status=''}else F[k]='';if(k==='q')$('q').value='';update()});
 $('sort').value=F.sort||'new';const sv=fv('status');
 $('count').innerHTML=`<b>${ALLN.toLocaleString()}</b> ${sv.length===1?({Upcoming:'upcoming',Closed:'closed',Open:'open'})[sv[0]]:''} internship${ALLN===1?'':'s'}${ALLN>RES.length?` <span class="grpn">· similar roles grouped</span>`:''}`;
 $('empty').hidden=RES.length>0;$('empty').innerHTML=`<h3>No internships match all of that</h3><p class="muted">${F.q?'Try fewer or broader search words, or ':''}remove a filter below. Tip: start with just Industry and Location, then narrow down.</p><button class="btn" type="button" onclick="clearAll()">Clear all filters</button>`;
 animateNext=true;vrender(true);if(window.mapUpdate)mapUpdate()}
function renderPillLabels(){document.querySelectorAll('[data-pill]').forEach(b=>{const p=PILLS0.find(p=>p[0]===b.dataset.pill);const l=pillLabel(p[0],p[1]);b.firstChild.textContent=l;b.classList.toggle('active',l!==p[1])})}
let qTimer;$('q').addEventListener('input',e=>{clearTimeout(qTimer);qTimer=setTimeout(()=>{F.q=e.target.value.trim();update()},120)});
$('sort').onchange=e=>{F.sort=e.target.value;update()};
/* ---------- windowed card grid (rows of N cards; only visible rows are in the DOM) ---------- */
let lastRange='',animateNext=false;
const gridCols=()=>innerWidth>=1100?3:innerWidth>=700?2:1;
const ROWH=()=>(innerWidth>=700?236:226)+((MSCORE.size||UNGR.size)?30:0);
function vrender(force){document.body.classList.toggle('graded',!!(MSCORE.size||UNGR.size));const vl=$('vl');if($('t-db').hidden)return;const n=gridCols(),rh=ROWH(),rows=Math.ceil(RES.length/n);vl.style.height=rows*rh+'px';vl.style.setProperty('--cols',n);
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
async function onCardClick(e){const gb=e.target.closest('[data-grp]');if(gb){e.stopPropagation();const k=gb.dataset.grp;GEXP.has(k)?GEXP.delete(k):GEXP.add(k);update(true);return}const row=e.target.closest('[data-id]');if(!row)return;const x=BYID.get(row.dataset.id);if(!x)return;const b=e.target.closest('[data-act]');
 if(b){e.stopPropagation();const a=b.dataset.act;if(a==='save'){blip(b);await ensureDetail(x);track(x.id,'Saved');bump()}else if(a==='applied'){await ensureDetail(x);track(x.id,'Applied');bump()}else if(a==='tracker'){go('tracker');const t=T.byListing(x.id);setTimeout(()=>{const r=t&&document.querySelector(`#tTable tr[data-id="${t.id}"]`);if(r){r.scrollIntoView({block:'center'});r.classList.add('flash');r.querySelector('select')?.focus()}},50)}
  else if(a==='notify'){const n=Store.get('notify',[]);const i=n.indexOf(x.id);i<0?n.push(x.id):n.splice(i,1);Store.set('notify',n);vrender(true)}return}
 if(e.target.closest('a'))return;openDrawer(x)}
function blip(b){if(RM)return;const s=document.createElement('span');s.className='blip';b.appendChild(s);setTimeout(()=>s.remove(),700)}
function bump(){const n=$('trkN');if(!n||RM)return;n.classList.remove('bump');void n.offsetWidth;n.classList.add('bump')}
['vl'].forEach(id=>{$(id).addEventListener('click',onCardClick);$(id).addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('.card'))onCardClick(e)})});
/* ---------- drawer (transform-only slide, 250ms) ---------- */
let lastFocus=null;
/* V9 honest feedback panel (drawer): verdict, strengths, gaps, actions */
function fbPanel(d){const cap=s=>esc(s[0].toUpperCase()+s.slice(1));const f=d.feedback||{};const v=f.verdict||{};
 if(d.pct==null)return`<section class="fbp fbp-gna" aria-label="Match feedback"><p class="fbp-h"><span class="mbadge gna">Not enough info to grade</span></p><p>We won't show a score we can't back up. To grade this one, add ${esc((d.need||[]).join(', '))}.</p>${d.ungraded==='profile'?'<p><a href="#profile" data-go="profile" class="btn small">Add to my profile</a></p>':''}</section>`;
 const li=a=>a.map(s=>`<li>${cap(String(s).replace(/\.+$/,''))}.</li>`).join('');
 return`<section class="fbp fbp-${esc(v.k||'long')}" aria-label="Match feedback"><div class="fbp-top"><span class="mbadge ${d.band}">${d.pct}% · ${d.grade}</span><button type="button" class="tip" data-tip="Match %" aria-label="What is match %?">?</button><span class="fbp-verdict">${esc(v.t||'')}</span><span class="muted small">${esc(d.conf)} confidence</span></div>
 <p class="fbp-why">${cap(String(v.why||'').replace(/\.+$/,''))}.</p>
 <div class="fbp-cols">${f.strengths&&f.strengths.length?`<div><h4>Why it's a match</h4><ul>${li(f.strengths)}</ul></div>`:''}${f.gaps&&f.gaps.length?`<div><h4>What's holding you back</h4><ul>${li(f.gaps)}</ul></div>`:''}${f.actions&&f.actions.length?`<div><h4>What to do to improve your odds</h4><ul>${li(f.actions)}</ul></div>`:''}</div></section>`}
let H1B=null;fetch('data/h1b.json').then(r=>r.ok?r.json():null).then(j=>{H1B=j}).catch(()=>{});
function h1bText(x){if(!H1B)return NL;const e=H1B.employers[x.company];const src=`<a href="${esc(H1B.source_url)}" target="_blank" rel="noopener">USCIS H-1B data, FY${H1B.fiscal_year}</a>`;
 if(!e)return`No record under this exact name <span class="muted small">(${src})</span>`;
 return`${e.new.toLocaleString()} new + ${e.cont.toLocaleString()} continuing H-1B approval${e.new+e.cont===1?'':'s'} <span class="muted small">(${src}; past sponsorship isn't a promise)</span>`}
function fact(k,v){return`<div class="fact"><dt>${k}</dt><dd>${v}</dd></div>`}
async function openDrawer(x){lastFocus=document.activeElement;const m=MSCORE.get(x.id);const c=closeLbl(x);
 $('dbody').innerHTML=`<div class="dhead">${logoHTML(x,true)}<div><p class="lco">${esc(x.company)}</p><h2 id="dTitle">${esc(x.title)}</h2><p class="muted">${esc(locFull(x))}</p></div></div>
 <div class="drow"><span class="dl dl-${c.c}">${esc(c.t)}</span><span class="muted small">${x.st==='upcoming'?'':postedAgo(x)}</span></div><div class="gloss" id="dGloss">${glossHTML(x.title+' '+c.t+' '+(x.sponsorship||'')+(x.citizenship?' sponsorship':''))}</div>
 ${(m||UNGR.has(x.id))?(()=>{const d=matchDetail(x);return d?fbPanel(d):''})():''}${x.pred?`<p class="why">📈 Expected (not yet posted): ${esc(x.pred.label.replace(/^Usually opens\s*/i,''))} (${esc(x.pred.confidence)} confidence)<span id="predBasis"></span>.</p>`:''}
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
 {const FF=[fact('Class years',yearsText(x)),fact('GPA minimum',x.gpa_min?esc(x.gpa_min):NL),fact('Visa sponsorship',x.citizenship?'US citizenship required':x.sponsorship?esc(x.sponsorship):NL),fact('H-1B history',h1bText(x)),fact('Pay',x.paid===true?esc(x.pay||'Paid'):x.paid===false?'Unpaid':NL),fact('Work setting',x.workplace?esc(x.workplace):(x.remote?'Remote':NL)),fact('Season',termText(x)),fact('Role type',esc(x.role_type||'Internship')),fact('Industry',esc(x.industry||'Other')),fact('Openings',x.openings?esc(x.openings):NL),fact('Company size',x.size?esc(x.size):NL)];const kn=FF.filter(h=>!h.includes('class="nl"')),un=FF.filter(h=>h.includes('class="nl"')).map(h=>(h.match(/<dt>(.*?)<\/dt>/)||[])[1]).filter(Boolean);
  $('dFacts').innerHTML=kn.join('')+(un.length?`<div class="fact fact-nl"><dt>Not listed by the employer</dt><dd>${un.join(' · ')}</dd></div>`:'')}
 if(x.pred?.basis&&$('predBasis'))$('predBasis').textContent='. Based on: '+x.pred.basis;
 const lv=x.last_verified||x.lv;const srcT=(x.source||'').replace(/\s*\(found via[^)]*\)/i,'');const also=[...new Set(x.also_on||[])].filter(a=>!/github|simplify|found via|repo/i.test(a)).map(a=>a.replace(/\s*\(found via[^)]*\)/i,''));$('dMeta').innerHTML=`<p>Source: ${esc(srcT)}${also.length?` · also listed on ${esc(also.slice(0,3).join(', '))}`:''}</p><p>${lv?`Last verified ${ago(lv)}`:'Not verified yet'}${x.stale?' · source unreachable on last sync, showing last good data':''}</p><p>${x.deadline?`Closing date from: ${esc(x.deadline_source||'listing')} · `:''}First seen ${x.fs?fmtDate(x.fs):'—'}${x.notes?' · '+esc(x.notes):''}</p>`;
 const d=await descOf(x);const el=$('dDesc');if(d&&$('dGloss'))$('dGloss').innerHTML=glossHTML(x.title+' '+c.t+' '+(x.sponsorship||'')+(x.citizenship?' sponsorship':'')+' '+d);if(el)el.innerHTML=d?esc(d).split(/\n{2,}/).map(p=>`<p>${p.replace(/\n/g,'<br>')}</p>`).join(''):`<p class="muted">${x.st==='upcoming'?`Not posted yet. Expected window is a prediction from past posting dates${x.pred?.basis?': '+esc(x.pred.basis):''}.`:'Full description is on the company posting.'}</p>`}
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
 $('mremote').onclick=()=>{const v=fv('loc');fset('loc',v.includes('Remote')?v.filter(x=>x!=='Remote'):[...v,'Remote']);update()};$('mremote').onkeydown=e=>{if(e.key==='Enter')$('mremote').onclick()};mapUpdate()}).catch(e=>{$('map').innerHTML='<p class="muted">Map could not load (offline?). Filters still work.</p>';MAPREADY=null});return MAPREADY}
window.mapUpdate=function(){if(!PROJ||$('mapPanel').hidden||document.hidden)return;const agg=new Map();let rem=0;
 for(const x of RES){if(x.remote)rem++;for(const l of x.locations||[]){if(l.lat==null)continue;const k=l.city+'|'+l.state;const a=agg.get(k)||{l,n:0,co:new Map()};a.n++;a.co.set(x.company,(a.co.get(x.company)||0)+1);agg.set(k,a)}}
 window._mapAgg=agg;
 let h='';for(const [k,a] of agg){const p=PROJ([a.l.lng,a.l.lat]);if(!p)continue;const r=Math.min(18,2.5+Math.sqrt(a.n)*1.6);h+=`<circle class="${fv('loc').includes('c:'+k)?'sel':''}" data-k="${esc(k)}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${r.toFixed(1)}"></circle>`}
 $('mdots').innerHTML=h;$('mrN').textContent=rem.toLocaleString();$('mremote').classList.toggle('sel',fv('loc').includes('Remote'));
 const tip=$('mapTip')||Object.assign(document.createElement('div'),{id:'mapTip',className:'maptip',hidden:true});if(!tip.parentNode){$('map').style.position='relative';$('map').appendChild(tip)}
 $('mdots').onmouseover=e=>{const c=e.target.closest('circle');if(!c)return;const a=agg.get(c.dataset.k);if(!a)return;const top=[...a.co].sort((p,q)=>q[1]-p[1]).slice(0,3);
  tip.innerHTML=`<b>${esc(a.l.city)}, ${esc(a.l.state)}</b> · ${a.n.toLocaleString()}<div class="mt-co">${top.map(([co,n])=>`<span>${logoHTML({company:co},false,'sm')}${esc(co)} <i>${n}</i></span>`).join('')}</div>`;
  const R=$('map').getBoundingClientRect(),C=c.getBoundingClientRect();tip.style.left=Math.min(R.width-240,Math.max(0,C.left-R.left+C.width/2-120))+'px';tip.style.top=(C.top-R.top+C.height+8)+'px';tip.hidden=false};
 $('mdots').onmouseout=e=>{if(e.target.closest('circle'))tip.hidden=true};
 $('mdots').onclick=e=>{const c=e.target.closest('circle');if(!c)return;const v=fv('loc'),key='c:'+c.dataset.k;fset('loc',v.includes(key)?v.filter(x=>x!==key):[...v,key]);update()};
 $('mapNote').textContent=`${agg.size.toLocaleString()} cities · click a dot to filter${fv('loc').some(v=>v.startsWith('c:'))?' · click again to clear':''}`}
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
function hdrCount(){const LC=liveCounts();{const dc=document.getElementById('dCount'),du=document.getElementById('dUpd');if(dc&&LC.open)dc.textContent=LC.open.toLocaleString();if(du&&META.updated)du.textContent=ago(META.updated)}const age=META.updated?(Date.now()-Date.parse(META.updated))/36e5:0,stale=age>4;const t=META.updated?`${LC.open.toLocaleString()} open internships · ${LC.wk.toLocaleString()} closing this week · Updated ${ago(META.updated)}`:'Live counts unavailable';document.querySelectorAll('.hdrCount').forEach(e=>{if(!e.closest('#intro')){e.textContent=t;if(stale){const w=document.createElement('span');w.className='stalewarn';w.title='The automatic update has not run for over 4 hours. Listings were verified at the time shown; some may have closed since.';w.textContent=' · ⚠ Data may be out of date';e.appendChild(w)}}})}
setInterval(()=>{if(META.updated)hdrCount()},60000);
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
 await metaP;markLive();hdrCount();setInterval(hdrCount,60000);try{begInit()}catch(e){}
 const n=Store.get('notify',[]);const nowOpen=n.map(id=>BYID.get(id)).filter(x=>x&&x.st!=='upcoming');if(nowOpen.length)$('notice').innerHTML=`<div class="ok" role="status">🔔 Now open: ${nowOpen.map(x=>esc(x.company)).join(', ')}. <button class="btn-ghost sm" onclick="Store.set('notify',[]);this.parentNode.remove()">Dismiss</button></div>`;
 await new Promise(r=>setTimeout(r,0));update();document.body.classList.remove('booting');document.dispatchEvent(new Event('radar:data'));
 profileInit();trackerInit();const h=location.hash.slice(1);if(h&&$('t-'+h))go(h,false);else reveal();window._interactiveAt=performance.now();
 (window.requestIdleCallback||setTimeout)(()=>refreshMatches())}
/* ---------- V6 profile: matching-only, single column, autosaved draft; Save & Search grades every card ---------- */
const MWready=fetch('match-weights.json').then(r=>r.json()).catch(()=>({fit:.45,odds:.4,prefs:.15}));let MW=null;MWready.then(w=>MW=w);
function migrateProfile(p){if(!p||p.v===6)return p||{};const r=Store.get('resume',{});const loc=Array.isArray(p.locations)?p.locations:String(p.locations||'').split(',').map(s=>s.trim()).filter(s=>s&&!/^remote$/i.test(s));
 return {v:6,school:p.school||r.school||'',major:p.major||r.major||'',minor:'',classYear:p.classYear||r.classYear||'',gradDate:p.gradDate||'',gpa:p.gpa||r.gpa||'',sponsorship:p.workAuth==='sponsor'?'yes':(p.workAuth?'no':''),
  industries:p.industries||[],locations:loc,remoteOK:!!p.remoteOk||/remote/i.test(String(p.locations||'')),relocate:!!p.relocate,
  experience:(r.experience||[]).map(e=>({kind:'Job',title:e.title||'',org:'',start:'',end:'',bullets:e.text?[e.text.slice(0,200)]:[]})),skills:Array.isArray(r.skills)?r.skills:[]}}
profile=migrateProfile(profile);
let PF=Store.get('profileDraft',null)||JSON.parse(JSON.stringify(profile));PF.experience=PF.experience||[];PF.skills=PF.skills||[];PF.locations=PF.locations||[];PF.industries=PF.industries||[];
/* ---------- V8 profile: three buckets (Resume · About you · Experience), searchable dropdowns, autosaved draft ---------- */
const CB={};let SCHOOLS=null;
const titleCase=s=>String(s).replace(/\b([a-z])/g,c=>c.toUpperCase()).replace(/\bAnd\b/g,'and');
function locOptions(){const cnt=new Map(),st=new Map();let rem=0;for(const x of D){if(!x.live)continue;if(x.remote)rem++;for(const l of x.locations||[]){if(!l.city||!l.state)continue;const k=l.city+', '+l.state;cnt.set(k,(cnt.get(k)||0)+1);st.set(l.state,(st.get(l.state)||0)+1)}}
 const top=[...cnt].sort((a,b)=>b[1]-a[1]).slice(0,8).map(a=>a[0]);
 return [{v:'Remote',label:'Remote',count:rem,pinned:true},...top.map(c=>({v:c,count:cnt.get(c),pinned:true,group:'Cities'})),
  ...Object.entries(LISTS.STATES).map(([a,n])=>({v:'state:'+a,label:`Anywhere in ${n}`,alias:a+'|'+n,boost:5,count:st.get(a)||0,group:'States'})),
  ...[...cnt].sort((a,b)=>a[0].localeCompare(b[0])).map(([c,n])=>({v:c,count:n,group:'Cities',alias:LISTS.STATES[c.slice(-2)]||''}))]}
function indOptions(){const c=new Map();for(const x of D)if(x.live){const k=x.industry||x.category;c.set(k,(c.get(k)||0)+1)}const top=[...c].sort((a,b)=>b[1]-a[1]).slice(0,5).map(a=>a[0]);return INDUSTRIES.filter(i=>i!=='Other').map(i=>({v:i,count:c.get(i)||0,pinned:top.includes(i)}))}
function gpaVal(g){if(!g)return'';const n=+g;if(isNaN(n))return'';const b=LISTS.GPA.find(o=>n>=+o.v);return LISTS.GPA.some(o=>o.v===String(g))?String(g):(b&&Math.abs(n-+b.v)<1e-9?b.v:String(g))}
function authFromPF(){return PF.workAuth||(PF.sponsorship==='yes'?'sponsor':PF.sponsorship==='no'?'citizen':'')}
function gpaInit(){const h=$('cbGpa');h.innerHTML=`<input id="gpaIn" class="pf-num" type="text" inputmode="decimal" autocomplete="off" placeholder="e.g. 3.40 (optional)" aria-label="GPA" aria-describedby="gpaMsg"><p class="pf-err" id="gpaMsg" role="alert" hidden></p>`;const i=$('gpaIn');i.value=PF.gpa||'';
 CB.gpa={get value(){return i.value},set(v){i.value=v||''}};
 const chk=()=>{const t=i.value.trim(),m=$('gpaMsg');if(!t){m.hidden=true;i.removeAttribute('aria-invalid');PF.gpa='';pfDraft();return}const n=Number(t);if(!/^\d(\.\d{1,3})?$/.test(t)||n>4.0){m.hidden=false;m.textContent='Enter your GPA on a 4.0 scale, like 3.4 or 3.62.';i.setAttribute('aria-invalid','true');return}m.hidden=true;i.removeAttribute('aria-invalid');PF.gpa=String(n);pfDraft()};
 i.addEventListener('input',chk);i.addEventListener('blur',()=>{if(i.value.trim()&&!i.getAttribute('aria-invalid'))i.value=Number(i.value).toFixed(2)})}
function pfMake(){const set=(k)=>v=>{PF[k]=v;pfDraft()};
 CB.school=Combo.field($('cbSchool'),{label:'School',placeholder:'Search your school',searchPlaceholder:'Type your school, e.g. “penn st”',options:()=>(SCHOOLS||[]).map(v=>({v,alias:LISTS.SCHOOL_ALIAS[v]||''})),dynamic:true,value:PF.school,onChange:set('school')});
 const maj=()=>LISTS.MAJ.map(o=>({...o}));
 CB.major=Combo.field($('cbMajor'),{label:'Major',placeholder:'Choose your major',searchPlaceholder:'e.g. “comp sci”',options:maj,value:PF.major,onChange:set('major')});
 CB.minor=Combo.field($('cbMinor'),{label:'Minor',placeholder:'None',options:maj,value:PF.minor,onChange:set('minor')});
 CB.year=Combo.field($('cbYear'),{label:'Class year',placeholder:'Choose…',options:LISTS.CLASS,other:false,value:PF.classYear,onChange:set('classYear')});
 const [gy,gm]=(PF.gradDate||'').split('-');
 CB.gradM=Combo.field($('cbGradM'),{label:'Graduation month',placeholder:'Month',options:LISTS.gradMonths,other:false,value:gm||'',onChange:v=>{PF.gradDate=(CB.gradY.value||String(new Date().getFullYear()+2))+'-'+v;if(!CB.gradY.value)CB.gradY.set(PF.gradDate.slice(0,4));pfDraft()}});
 CB.gradY=Combo.field($('cbGradY'),{label:'Graduation year',placeholder:'Year',options:LISTS.gradYears,other:false,value:gy||'',onChange:v=>{PF.gradDate=v+'-'+(CB.gradM.value||'05');if(!CB.gradM.value)CB.gradM.set('05');pfDraft()}});
 gpaInit();
 CB.auth=Combo.field($('cbAuth'),{label:'Work authorization',placeholder:'Choose…',options:LISTS.AUTH,other:false,value:authFromPF(),onChange:v=>{PF.workAuth=v;PF.sponsorship=v==='sponsor'?'yes':v?'no':'';pfDraft()}});
 CB.ind=Combo.field($('cbInd'),{label:'Interests',multi:true,placeholder:'Choose industries',options:indOptions,dynamic:true,counts:true,other:false,value:PF.industries,onChange:set('industries')});
 CB.loc=Combo.field($('cbLoc'),{label:'Preferred locations',multi:true,placeholder:'Choose states or cities',searchPlaceholder:'Any city or state, e.g. “austin” or “TX”',options:locOptions,dynamic:true,counts:true,value:PF.locations,onChange:set('locations')});
 CB.skills=Combo.field($('cbSkills'),{label:'Skills',multi:true,placeholder:'Choose skills',searchPlaceholder:'e.g. “excel”, “python”',options:()=>SKILLS.map(s=>({v:s,label:titleCase(s),pinned:LISTS.PSKILLS.includes(s)})),value:PF.skills,onChange:set('skills')})}
let OPENEXP=-1;
const ymLabel=v=>v==='present'?'Present':v?`${LISTS.MONTHS[+v.slice(5)-1]?.slice(0,3)||''} ${v.slice(0,4)}`:'';
function expHTML(e,i){const sum=[e.title||'Untitled',e.org].filter(Boolean).join(' · '),dt=[ymLabel(e.start),ymLabel(e.end||(e.start?'present':''))].filter(Boolean).join(' – ');
 return`<div class="pf-exp${i===OPENEXP?' open':''}" data-i="${i}"><button type="button" class="pf-expsum" data-tog="${i}" aria-expanded="${i===OPENEXP}"><span class="pf-kind">${esc(e.kind||'Job')}</span><span class="pf-et">${esc(sum)}</span><span class="pf-ed muted">${esc(dt||'Add dates')}</span></button>
 ${i===OPENEXP?`<div class="pf-expbody"><div class="pf-f"><span class="pf-lab">Type</span><div class="cbx" data-c="kind"></div></div>
 <label class="pf-l">Title<input data-e="title" value="${esc(e.title||'')}" placeholder="e.g. Sales Associate"></label><label class="pf-l">Organization<input data-e="org" value="${esc(e.org||'')}" placeholder="e.g. Target"></label>
 <div class="pf-row2"><div class="pf-f"><span class="pf-lab">Start</span><div class="cbx" data-c="start"></div></div><div class="pf-f"><span class="pf-lab">End</span><div class="cbx" data-c="end"></div></div></div>
 <label class="pf-l">What you did <small>one point per line</small><textarea class="grow" data-e="bullets" rows="3" placeholder="e.g. Trained 4 new hires&#10;Cut checkout wait time by 20%">${esc((e.bullets||[]).join('\n'))}</textarea></label>
 <div class="pf-expfoot"><button type="button" class="link" data-delexp="${i}">Remove</button><button type="button" class="btn-ghost sm" data-tog="${i}">Done</button></div></div>`:''}</div>`}
function expRender(){$('expList').innerHTML=PF.experience.map(expHTML).join('')||'<p class="pf-empty">No experience yet. Add a job, club, class project or volunteer role. Everything counts.</p>';
 const d=$('expList').querySelector('.pf-exp.open');if(d){const e=PF.experience[OPENEXP];const mk=(c,o)=>Combo.field(d.querySelector(`[data-c="${c}"]`),o);
  mk('kind',{label:'Experience type',options:LISTS.KINDS,other:false,value:e.kind||'Job',onChange:v=>{e.kind=v;pfDraft();d.querySelector('.pf-kind').textContent=v}});
  const ym=LISTS.ymList();mk('start',{label:'Start date',placeholder:'Month year',searchPlaceholder:'e.g. “jun 2025”',options:ym.filter(o=>o.v!=='present'),other:false,value:e.start||'',onChange:v=>{e.start=v;pfDraft()}});
  mk('end',{label:'End date',placeholder:'Present',searchPlaceholder:'e.g. “aug 2025”',options:ym,other:false,value:e.end||'present',onChange:v=>{e.end=v==='present'?'':v;pfDraft()}});Combo.autogrow(d)}}
function pfRender(){$('pf').remoteOK.checked=!!PF.remoteOK;$('pf').relocate.checked=!!PF.relocate;
 if(CB.school){CB.school.set(PF.school);CB.major.set(PF.major);CB.minor.set(PF.minor);CB.year.set(PF.classYear);const [y,m]=(PF.gradDate||'').split('-');CB.gradY.set(y||'');CB.gradM.set(m||'');CB.gpa.set(PF.gpa?Number(PF.gpa).toFixed(2):"");CB.auth.set(authFromPF());CB.ind.set(PF.industries);CB.loc.set(PF.locations);CB.skills.set(PF.skills)}
 expRender();pfProgress()}
function pfRead(){const f=$('pf');PF.remoteOK=f.remoteOK.checked;PF.relocate=f.relocate.checked;return PF}
function pfProgress(){const items=[['school',!!PF.school],['major',!!PF.major],['class year',!!PF.classYear],['interests',PF.industries.length>0],['locations',PF.locations.length>0||PF.remoteOK],['experience',PF.experience.some(e=>e.title||e.org)],['skills',PF.skills.length>=3],['work authorization',!!PF.sponsorship]];
 const pct=Math.round(100*items.filter(i=>i[1]).length/items.length);$('pfFill').style.width=pct+'%';$('pfPct').textContent=pct+'%';const nx=items.find(i=>!i[1]);$('pfNext').textContent=nx?`· Next: add your ${nx[0]}`:'· Looking great'}
let pfT;function pfDraft(){clearTimeout(pfT);pfT=setTimeout(()=>{pfRead();Store.set('profileDraft',PF);pfProgress();$('pfMsg').textContent='Draft saved'},250)}
function profileInit(){const f=$('pf');pfMake();pfRender();
 f.addEventListener('change',e=>{if(e.target.name==='remoteOK'||e.target.name==='relocate')pfDraft()});
 $('expList').addEventListener('input',e=>{const t=e.target.closest('[data-e]');if(!t)return;const i=+t.closest('.pf-exp').dataset.i,ex=PF.experience[i];if(t.dataset.e==='bullets')ex.bullets=t.value.split('\n').map(s=>s.replace(/^[•\-–*]\s*/,'').trim()).filter(Boolean);else ex[t.dataset.e]=t.value;
  const sm=t.closest('.pf-exp').querySelector('.pf-et');if(sm)sm.textContent=[ex.title||'Untitled',ex.org].filter(Boolean).join(' · ');pfDraft()});
 $('expList').addEventListener('click',e=>{const tg=e.target.closest('[data-tog]');if(tg){const i=+tg.dataset.tog;OPENEXP=OPENEXP===i?-1:i;expRender();const d=$('expList').querySelector('.pf-exp.open [data-e=title]');d&&d.focus();if(OPENEXP<0)$('expList').querySelector(`[data-tog="${i}"]`)?.focus();return}
  const de=e.target.closest('[data-delexp]');if(de){PF.experience.splice(+de.dataset.delexp,1);OPENEXP=-1;expRender();pfDraft()}});
 $('addExp').onclick=()=>{PF.experience.push({kind:'Job',title:'',org:'',start:'',end:'',bullets:[]});OPENEXP=PF.experience.length-1;expRender();pfDraft();$('expList').querySelector('.pf-exp.open [data-e=title]')?.focus()};
 const drop=$('pfDrop');['dragenter','dragover'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.add('over')}));['dragleave','drop'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.remove('over')}));
 drop.addEventListener('drop',e=>{const file=e.dataTransfer.files[0];if(file)readIn(file)});
 const onFile=e=>{const file=e.target.files[0];if(file)readIn(file);e.target.value=''};$('resume').onchange=onFile;$('liPdf').onchange=onFile;
 $('liGo').onclick=()=>{const t=$('liText').value.trim();if(t.length<40){$('rstat').textContent='Paste your full LinkedIn profile text first.';return}ingest(t)};
 $('pfSave').onclick=saveAndSearch;$('pfReset').onclick=resetProfile;Combo.autogrow($('pf'));
 let lists=false;const fillLists=()=>{if(lists)return;lists=true;fetch('data/schools.json').then(r=>r.json()).then(a=>{SCHOOLS=a;CB.school.refreshOptions()}).catch(()=>{})};
 document.addEventListener('radar:page',e=>{if(e.detail==='profile'){fillLists();CB.ind.refreshOptions();CB.loc.refreshOptions()}});if(!$('t-profile').hidden)fillLists()}
async function readIn(file){$('rstat').textContent='Reading '+file.name+'…';try{ingest(await readFile(file))}catch(err){$('rstat').textContent='Could not read that file: '+err.message}}
async function ingest(text){if(!SCHOOLS)try{SCHOOLS=await (await fetch('data/schools.json')).json();CB.school&&CB.school.refreshOptions()}catch(e){}const R=parseResume(text);Store.set('resumeText',String(text||'').slice(0,30000));pfRead();let n=0;const got=[];const set=(k,v)=>{if(v&&!PF[k]){PF[k]=String(v);n++;got.push(k)}};set('school',R.school);set('major',R.major?titleCase(R.major):'');set('gpa',R.gpa);set('classYear',R.classYear);set('gradDate',R.gradDate);
 const sk=(R.skills||[]).map(s=>s.toLowerCase()).filter(s=>!PF.skills.includes(s));if(sk.length){PF.skills.push(...sk);n+=sk.length}
 const ex=(R.experience||[]).filter(e=>e.title&&!PF.experience.some(p=>p.title===e.title)).map(e=>{const [t,o]=e.title.split(' — ');return{kind:/intern/i.test(t)?'Internship':'Job',title:(t||'').trim(),org:(o||'').trim(),start:'',end:'',bullets:(e.text||'').split(/(?<=\.)\s+|\s*•\s*/).map(x=>x.trim()).filter(x=>x.length>3).slice(0,3)}});
 const cl=(R.clubs||[]).concat(R.leadership||[]).slice(0,3).filter(c=>!PF.experience.some(p=>p.title===c)).map(c=>({kind:'Club',title:c.slice(0,80),org:'',start:'',end:'',bullets:[]}));
 PF.experience.push(...ex,...cl);n+=ex.length+cl.length;if(sk.length)got.push('skills');if(ex.length+cl.length)got.push('experience');pfRender();Store.set('profileDraft',PF);
 const HOST={school:'cbSchool',major:'cbMajor',gpa:'cbGpa',classYear:'cbYear',gradDate:'cbGradM',skills:'cbSkills',experience:'expList'};
 document.querySelectorAll('.pf-check').forEach(e=>e.classList.remove('pf-check'));got.forEach(k=>$(HOST[k])?.closest('.pf-f,.pf-col')?.classList.add('pf-check'));
 const NM={school:'School',major:'Major',gpa:'GPA',classYear:'Class year',gradDate:'Graduation',skills:'Skills',experience:'Experience'};
 $('rstat').innerHTML=n?`<div class="pf-review" role="status"><b>Check these.</b> We read ${got.map(k=>NM[k]).join(', ')} from your resume${R.degree?` (degree: ${esc(R.degree)})`:''}. Resume reading can get things wrong, so look over the highlighted fields and fix anything that's off. <button type="button" class="btn small" id="rvOk">Looks right</button></div>`:'We could not find details to fill in. Add them below.';
 if($('rvOk'))$('rvOk').onclick=()=>{document.querySelectorAll('.pf-check').forEach(e=>e.classList.remove('pf-check'));$('rstat').textContent='Thanks. Your details are saved as a draft.'}}
function toastMsg(m){if(typeof toast==='function')toast(m)}
async function saveAndSearch(){pfRead();const errs=[];if(PF.gpa&&(isNaN(+PF.gpa)||+PF.gpa<0||+PF.gpa>4.5))errs.push('GPA should be between 0 and 4.5');
 if(!PF.industries.length&&!PF.major&&!PF.skills.length&&!PF.experience.length)errs.push('add at least your major, an interest, a skill or an experience');
 if(errs.length){$('pfMsg').textContent='Please '+errs.join(' and ')+'.';$('pfMsg').classList.add('err');return}$('pfMsg').classList.remove('err');
 profile={...JSON.parse(JSON.stringify(PF)),v:6,savedAt:new Date().toISOString()};Store.set('profile',profile);Store.set('profileDraft',PF);
 $('pfSave').disabled=true;$('pfMsg').textContent='Grading internships…';await rescore();const n=D.filter(x=>x.live&&MSCORE.has(x.id)).length;$('pfSave').disabled=false;$('pfMsg').textContent='Saved';
 F.sort='match';$('sort').value='match';go('db');update();vrender(true);toastMsg(`Showing your matches. ${n.toLocaleString()} internships graded.`);$('pfMsg').innerHTML='Saved · <a href="#feedback" data-go="feedback">See honest feedback</a>';const fl=$('fbLink');if(fl)fl.hidden=false;if($('fbNudge'))$('fbNudge').hidden=false}
function resetProfile(){const nT=(typeof T!=='undefined'?T.all().length:0),nP=Store.get('savedFilters',[]).length;openModal(`<h2>Reset to default?</h2><div class="rs-cols"><div><h3>This clears</h3><ul><li>Your profile (school, major, GPA, skills, experience)</li><li>Your uploaded resume text</li><li>All match grades and feedback</li><li>Your current search and filters</li></ul></div><div><h3>This keeps</h3><ul><li>Your tracker (${nT} saved internship${nT===1?'':'s'})</li><li>Saved filter presets (${nP})</li></ul></div></div>${nT?`<label class="rs-tr"><input type="checkbox" id="rsTr"> Also clear my tracker (${nT} internship${nT===1?'':'s'}). This can't be undone.</label>`:''}<div class="mf-foot"><button type="button" class="link" id="rsNo">Cancel</button><button type="button" class="btn danger" id="rsYes">Reset</button></div>`);
 $('rsNo').onclick=closeModal;$('rsYes').onclick=()=>{Store.remove('profile');Store.remove('profileDraft');Store.remove('resume');Store.remove('resumeText');profile={v:6};UNGR=new Set();PF={v:6,experience:[],skills:[],locations:[],industries:[]};OPENEXP=-1;MSCORE=new Map();
  const clrT=$('rsTr')?.checked;if(clrT)T.save([]);F={...DEFAULTS};$('q').value='';saveF();renderPills();if($('fbNudge'))$('fbNudge').hidden=true;$('sort').value=F.sort;closeModal();pfRender();$('rstat').textContent='';go('db');update();vrender(true);toastMsg(clrT?'Profile, filters and tracker cleared.':'Profile and filters reset. Your tracker was kept.')}}
/* ---------- grading: Web Worker rescoring (falls back to time-sliced main thread) ---------- */
let MWK=null,mwInit=false,mwSeq=0;
function slimRows(){return D.filter(x=>x.st!=='closed').map(x=>({id:x.id,title:x.title,company:x.company,industry:x.industry||x.category,class_years:x.class_years,size:x.size,metro_pop:x.metro_pop,remote:x.remote,posted:x.posted,fs:x.first_seen,gpa_min:x.gpa_min,openings:x.openings,paid:x.paid,sponsorship:x.sponsorship,citizenship:x.citizenship,locations:(x.locations||[]).map(l=>({pop:l.pop})),_t:x._t}))}
async function rescore(){if(!MatchCore.hasProfile(profile)){MSCORE=new Map();UNGR=new Set();return 0}await cfgReady;await MWready;const t0=performance.now();
 const apply=(ids,pct)=>{if(!MatchCore.hasProfile(profile)){MSCORE=new Map();UNGR=new Set();return 0}const M=new Map();UNGR=new Set();for(let i=0;i<ids.length;i++){const p=pct[i];if(p==null||p===255){UNGR.add(ids[i]);continue}M.set(ids[i],{pct:p,grade:MatchCore.grade(p,MW),band:MatchCore.band(p)})}MSCORE=M;window._rescoreMs=Math.round(performance.now()-t0);return M.size};
 if(window.Worker){try{if(!MWK){MWK=new Worker('match-worker.js')}if(!mwInit){MWK.postMessage({t:'init',rows:slimRows(),cfg:CFG,w:MW});mwInit=true}
  const seq=++mwSeq;return await new Promise((res,rej)=>{MWK.onmessage=e=>{if(e.data.seq===seq)res(apply(e.data.ids,e.data.pct))};MWK.onerror=rej;MWK.postMessage({t:'score',seq,profile})})}catch(_){MWK=null}}
 const P=MatchCore.profile(profile),rows=D.filter(x=>x.st!=='closed'),ids=[],pct=[];for(let i=0;i<rows.length;i++){ids.push(rows[i].id);pct.push(MatchCore.score({...rows[i],industry:rows[i].industry||rows[i].category},P,CFG,MW).pct);if(i%1500===1499)await new Promise(r=>setTimeout(r,0))}return apply(ids,pct)}
async function refreshMatches(){await rescore();if(!MSCORE.size&&F.minm)F.minm='';renderPills();vrender(true);if(F.sort==='match')update(true)}
function matchDetail(x){if(!(MSCORE.has(x.id)||UNGR.has(x.id))||!CFG||!MW)return null;return MatchCore.score({...x,industry:x.industry||x.category},MatchCore.profile(profile),CFG,MW)}
document.addEventListener('radar:tracker',()=>{vrender(true);$('trkN').textContent=T.all().length||''});

boot();

/* ---------- V8 beginner help: "?" tooltips, glossary, first-visit tip, How it works ---------- */
const GLOSS=[['Online Assessment',/online assessment|\bOA\b|hirevue|codesignal|hackerrank/i],['Rolling deadline',/rolling/i],['Co-op',/\bco-?op\b/i],['Summer Analyst',/summer analyst/i],['Sponsorship',/sponsor/i]];
function glossHTML(t){const hit=GLOSS.filter(([,re])=>re.test(t||''));return hit.length?`<span class="muted small">Terms:</span> ${hit.map(([k])=>`<button type="button" class="gterm" data-tip="${esc(k)}">${esc(k)} <span aria-hidden="true">?</span></button>`).join('')}`:''}
LISTS.TIPS.classyear='Your year in school this coming fall: Freshman (1st year), Sophomore (2nd), Junior (3rd), Senior (4th) or Graduate. Many internships are only for certain years.';
let tipFor=null;function showTip(btn){const k=btn.dataset.tip,t=LISTS.TIPS[k];if(!t)return;const el=$('tip');el.className='tipbub';el.innerHTML=`<b>${esc(k==='classyear'?'Class year':k)}</b><br>${esc(t)}`;el.hidden=false;tipFor=btn;btn.setAttribute('aria-describedby','tip');
 const r=btn.getBoundingClientRect();el.style.position='fixed';el.style.left=Math.max(8,Math.min(innerWidth-316,r.left-20))+'px';const below=r.bottom+8;el.style.top=below+'px';const h=el.offsetHeight;if(below+h>innerHeight-8)el.style.top=Math.max(8,r.top-h-8)+'px'}
function hideTip(){if(!tipFor)return;$('tip').hidden=true;tipFor.removeAttribute('aria-describedby');tipFor=null}
document.addEventListener('mouseover',e=>{const b=e.target.closest('[data-tip]');if(b)showTip(b)});document.addEventListener('mouseout',e=>{if(e.target.closest('[data-tip]'))hideTip()});
document.addEventListener('focusin',e=>{const b=e.target.closest('[data-tip]');if(b)showTip(b);else hideTip()});
document.addEventListener('click',e=>{const b=e.target.closest('[data-tip]');if(b){e.preventDefault();e.stopPropagation();tipFor===b&&!$('tip').hidden?hideTip():showTip(b)}else hideTip()},true);
addEventListener('scroll',hideTip,{passive:true});
function glossaryHTML(){return`<dl class="glossary">${Object.entries(LISTS.TIPS).filter(([k])=>k!=='classyear').map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`}
function firstTip(){const pr=Store.get('prefs',{});if(pr.tipDone||$('firstTip'))return;const d=document.createElement('div');d.id='firstTip';d.className='firsttip';d.setAttribute('role','note');
 d.innerHTML=`<span class="ft-i" aria-hidden="true">💡</span><p><b>New here?</b> Start by searching or filtering, save what you like, then add your profile for match %. <button type="button" class="link" id="ftTerms">What do the terms mean?</button></p><button type="button" class="ft-x" id="ftX" aria-label="Dismiss tip">Got it</button>`;
 $('chips').closest('.chipsrow').before(d);$('ftX').onclick=()=>{Store.set('prefs',{...Store.get('prefs',{}),tipDone:1});d.remove()};$('ftTerms').onclick=()=>openModal(`<h2>Internship terms, in plain English</h2>${glossaryHTML()}`)}
/* How it works -> the Details screen on the intro */
(function(){const nav=document.querySelector('.site-footer nav[aria-label="Footer"]');if(nav&&!$('howBtn')){const a=document.createElement('a');a.href='./?intro=1#details';a.id='howBtn';a.textContent='How it works';nav.prepend(a)}})();
/* ---------- V8 advanced: shortcuts, share + saved filters ---------- */
const SHORTCUTS=[['/','Jump to search'],['s','Save the open (or focused) internship'],['Esc','Close the drawer, panel or dialog'],['?','Show this list']];
function shortcutsModal(){openModal(`<h2>Keyboard shortcuts</h2><table class="kbd">${SHORTCUTS.map(([k,t])=>`<tr><td><kbd>${esc(k)}</kbd></td><td>${esc(t)}</td></tr>`).join('')}</table>
 <h3>Search tricks</h3><table class="kbd"><tr><td><code>company:google</code></td><td>Only that company (use quotes for spaces: <code>company:"jp morgan"</code>)</td></tr><tr><td><code>location:nyc</code></td><td>A city, state or “remote” (nyc, sf, la, dc work too)</td></tr><tr><td><code>"exact phrase"</code></td><td>Those words in that order</td></tr></table><h3>Terms</h3>${glossaryHTML()}`)}
document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;const t=e.target;if(t.closest&&t.closest('input,textarea,select,[contenteditable="true"],.cb-pop'))return;
 if(e.key==='/'){e.preventDefault();if($('t-db').hidden)go('db');$('q').focus();$('q').select()}
 else if(e.key==='?'){e.preventDefault();shortcutsModal()}
 else if(e.key==='s'||e.key==='S'){const b=!$('drawer').hidden?$('drawer').querySelector('[data-act=save]'):document.activeElement?.closest?.('.card')?.querySelector('[data-act=save]');if(b){e.preventDefault();b.click()}}});
function presetsInit(){const host=document.querySelector('.rtools');if(!host||$('shareBtn'))return;const w=document.createElement('span');w.className='presets';
 w.innerHTML=`<button type="button" class="pill" id="shareBtn" title="Copy a link to these exact filters">Copy link</button><div class="pillwrap"><button type="button" class="pill" id="presetBtn" aria-haspopup="dialog" aria-expanded="false">Saved filters</button></div>`;host.prepend(w);
 $('shareBtn').onclick=async()=>{saveF();try{await navigator.clipboard.writeText(location.href);toastMsg('Link copied. Anyone with it sees these filters.')}catch(_){prompt('Copy this link:',location.href)}};
 $('presetBtn').onclick=e=>{e.stopPropagation();const b=$('presetBtn');if(b.nextElementSibling){b.nextElementSibling.remove();b.setAttribute('aria-expanded','false');return}const P=Store.get('savedFilters',[]);const p=document.createElement('div');p.className='pop open presetpop';p.setAttribute('role','dialog');p.setAttribute('aria-label','Saved filters');
  p.innerHTML=`<p class="pp-h">Saved filters</p>${P.length?`<ul class="pp-l">${P.map((x,i)=>`<li><button type="button" class="link" data-ap="${i}">${esc(x.name)}</button><button type="button" class="pp-x" data-dp="${i}" aria-label="Delete ${esc(x.name)}">×</button></li>`).join('')}</ul>`:'<p class="muted small">None yet. Set some filters, then save them here.</p>'}
  <form class="pp-f"><input id="ppName" placeholder="Name these filters, e.g. NYC finance" aria-label="Preset name" maxlength="40"><button class="btn sm" type="submit">Save current</button></form>`;b.after(p);b.setAttribute('aria-expanded','true');$('ppName').focus();
  const r=p.getBoundingClientRect();if(r.right>innerWidth-8)p.style.left=Math.min(0,innerWidth-8-r.right)+'px';
  p.onclick=ev=>{ev.stopPropagation();const ap=ev.target.closest('[data-ap]'),dp=ev.target.closest('[data-dp]');if(ap){const x=P[+ap.dataset.ap];const u=new URLSearchParams(x.qs);F={...DEFAULTS,...Object.fromEntries(FK.filter(k=>u.has(k)).map(k=>[k,u.get(k)]))};$('q').value=F.q||'';p.remove();update();toastMsg(`Applied “${x.name}”`)}if(dp){P.splice(+dp.dataset.dp,1);Store.set('savedFilters',P);p.remove();$('presetBtn').click()}};
  p.querySelector('form').onsubmit=ev=>{ev.preventDefault();const n=$('ppName').value.trim()||`Filters ${P.length+1}`;saveF();P.push({name:n,qs:location.search});Store.set('savedFilters',P);p.remove();b.setAttribute('aria-expanded','false');toastMsg(`Saved “${n}”`)};
  p.addEventListener('keydown',ev=>{if(ev.key==='Escape'){ev.stopPropagation();p.remove();b.setAttribute('aria-expanded','false');b.focus()}})};
 document.addEventListener('mousedown',e=>{if(!e.target.closest('.presets')){document.querySelector('.presetpop')?.remove();$('presetBtn')?.setAttribute('aria-expanded','false')}})}
document.addEventListener('radar:data',()=>{firstTip();presetsInit()});
