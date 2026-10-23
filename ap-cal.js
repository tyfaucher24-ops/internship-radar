/* V13.4 Autopilot calendar: month/week calendar (left), selected day's tasks (right), upcoming 7 days (below).
   Built only from the user's real data: Autopilot plans (stated deadlines + reminders), tracker follow-ups/interviews,
   Outreach contacts you've messaged, and tasks you add yourself. Nothing is invented; days with nothing show an empty state. */
(function(){
if(typeof APCore==='undefined'||!window.Autopilot)return;
const $c=id=>document.getElementById(id),AP=window.Autopilot;
const TY={deadline:'Deadline',apply:'Apply-by reminder',follow:'Follow-up',interview:'Interview'};
const key=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const day=s=>{const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})/);return m?new Date(+m[1],+m[2]-1,+m[3]):null};
const sod=d=>{const x=new Date(d);x.setHours(0,0,0,0);return x};
const addD=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const L=id=>(id!=null&&typeof BYID!=='undefined'&&BYID.get(String(id)))||null;
const cs=()=>{const s=Store.get('apCal',null);return s&&s.v===1?s:{v:1,done:{},tasks:[]}};
const cput=s=>Store.set('apCal',s);
const tm=at=>{const d=new Date(at);return d.getHours()===0&&d.getMinutes()===0?'':d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})};
/* step key -> type. Deadline day = red; warm-path note/follow-up = blue; every other plan reminder points at applying = purple. */
const STEPTY=k=>k==='d0'?'deadline':(k==='p2'||k==='p4')?'follow':'apply';
function tasks(){const out=[],seenDl=new Set(),cal=cs(),done=cal.done||{};
 /* 1. Autopilot plans */
 AP.list().forEach(r=>{r.p.steps.forEach(s=>{const ty=STEPTY(s.key);if(ty==='deadline')seenDl.add(String(r.id));
  out.push({id:'ap:'+r.id+':'+s.key,ty,at:new Date(s.at),label:ty==='deadline'?'Deadline day':s.label,co:r.x.company,ti:r.x.title,lid:r.id,url:r.x.apply_url||'',
   time:ty==='deadline'?'':tm(s.at),done:r.it.done.includes(s.key),src:'ap',k:s.key})})});
 /* 2. Tracker: stated deadlines of saved listings, follow-up dates, interviews */
 const tr=typeof T!=='undefined'?T.all():[];
 tr.forEach(t=>{const Lx=t.listing||{},x=L(t.listingId),dl=day((x&&x.deadline)||Lx.deadline),closed=['Rejected','Withdrawn','Ghosted','Closed','Accepted'].includes(t.status);
  if(dl&&!seenDl.has(String(t.listingId))&&!closed){seenDl.add(String(t.listingId));const id='tr:'+t.id+':dl';out.push({id,ty:'deadline',at:dl,label:'Deadline day',co:Lx.company,ti:Lx.title,lid:t.listingId,url:(x&&x.apply_url)||Lx.apply_url||'',time:'',done:!!done[id]||APPLIED.includes(t.status),src:'trdl',tid:t.id})}
  const f=day(t.followUp||t.nextDate);if(f&&!closed){const iv=t.status==='Interviewing';const id='tr:'+t.id+':fu:'+key(f);
   out.push({id,ty:iv?'interview':'follow',at:f,label:t.nextStep||(iv?'Interview':'Follow up on your application'),co:Lx.company,ti:Lx.title,lid:t.listingId,url:'',time:'',done:!!done[id],src:'trfu',tid:t.id})}});
 /* 3. Outreach: people you've messaged get a follow-up one week after the last update */
 const wp=Store.get('warmpaths',null);((wp&&wp.contacts)||[]).forEach(c=>{if(c.status!=='sent')return;const base=day((c.updated||c.added||'').slice(0,10));if(!base)return;const at=addD(base,7),id='wp:'+c.id+':'+key(at);
  out.push({id,ty:'follow',at,label:'Follow up with '+c.name,co:c.company,ti:c.title,lid:c.listingId,url:'',time:'',done:!!done[id]||!!c.followedUp,src:'wp',cid:c.id})});
 /* 4. Your own tasks */
 (cal.tasks||[]).forEach(u=>{const at=day(u.date);if(!at)return;const x=L(u.lid);out.push({id:'u:'+u.id,ty:u.type,at,label:u.title,co:x?x.company:'',ti:x?x.title:'',lid:u.lid||null,url:x?x.apply_url||'':'',time:'',done:!!u.done,src:'u',uid:u.id})});
 return out.sort((a,b)=>a.at-b.at)}
const APPLIED=['Applied','Online Assessment','Interviewing','Offer','Accepted','Rejected','Ghosted'];
let view='m',cur=sod(new Date()),sel=sod(new Date()),off=new Set(Store.get('apCalOff',[]));
function byDay(all){const m=new Map();all.forEach(t=>{const k=key(t.at);m.has(k)||m.set(k,[]);m.get(k).push(t)});return m}
const dot=ty=>`<i class="cd cd-${ty}" aria-hidden="true"></i>`;
const fdL=d=>d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
const fdW=d=>d.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'});
function mount(){const list=$c('apList');if(!list||$c('apCal'))return!!$c('apCal');
 const w=document.createElement('div');w.id='apCal';w.className='apc';
 w.innerHTML=`<div class="apc-top"><p class="apc-sub">Your deadlines, reminders and follow-ups in one calendar.</p><button type="button" class="btn sm" id="apcAdd">+ Quick add task</button></div>
 <div class="apc-grid"><section class="apc-card apc-calc" aria-label="Calendar"><div class="apc-bar"><button type="button" class="btn-ghost sm apc-nv" id="apcPrev" aria-label="Previous">‹</button><button type="button" class="btn-ghost sm apc-nv" id="apcNext" aria-label="Next">›</button><h2 id="apcTtl" aria-live="polite"></h2><button type="button" class="btn-ghost sm" id="apcToday">Today</button><div class="apc-seg" role="group" aria-label="Calendar view"><button type="button" data-v="m" aria-pressed="true">Month</button><button type="button" data-v="w" aria-pressed="false">Week</button></div></div>
 <div class="apc-chips" role="group" aria-label="Show task types">${Object.entries(TY).map(([k,v])=>`<button type="button" class="apc-chip" data-ty="${k}" aria-pressed="true">${dot(k)}${v}</button>`).join('')}</div>
 <div class="apc-dow" aria-hidden="true">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<span>${d}</span>`).join('')}</div><div class="apc-days" id="apcDays" role="grid" aria-label="Days"></div></section>
 <aside class="apc-side"><section class="apc-card apc-day" aria-labelledby="apcSelT"><h3 id="apcSelT"></h3><div class="apc-scroll" id="apcSelL"></div></section>
 <section class="apc-card apc-up" aria-labelledby="apcUpT"><h3 id="apcUpT">Upcoming 7 days</h3><div class="apc-scroll"><ul class="apc-ul" id="apcUp"></ul></div></section></aside></div>`;
 list.before(w);return true}
function render(){if(!mount())return;const all=tasks().filter(t=>!off.has(t.ty)),m=byDay(all),today=sod(new Date());
 $c('apcTtl').textContent=view==='m'?cur.toLocaleDateString('en-US',{month:'long',year:'numeric'}):(()=>{const s=addD(cur,-cur.getDay());return 'Week of '+s.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})})();
 let start,n;if(view==='m'){const f=new Date(cur.getFullYear(),cur.getMonth(),1);start=addD(f,-f.getDay());n=42}else{start=addD(cur,-cur.getDay());n=7}
 const g=$c('apcDays');g.classList.toggle('wk',view==='w');let h='';
 for(let i=0;i<n;i++){const d=addD(start,i),k=key(d),ts=m.get(k)||[],out=view==='m'&&d.getMonth()!==cur.getMonth(),isT=+d===+today,isS=+d===+sel;
  const tys=[...new Set(ts.map(t=>t.ty))];
  h+=`${i%7===0?'<div class="apc-row" role="row">':''}<button type="button" role="gridcell" class="apc-d${out?' out':''}${isT?' today':''}${isS?' sel':''}" data-day="${k}" tabindex="${isS?0:-1}" aria-selected="${isS}" aria-label="${esc(fdW(d))}${isT?', today':''}${ts.length?`, ${ts.length} task${ts.length===1?'':'s'}: ${tys.map(t=>TY[t]).join(', ')}`:', no tasks'}"><span class="apc-n">${d.getDate()}</span><span class="apc-dots">${tys.map(dot).join('')}</span></button>${i%7===6?'</div>':''}`}
 g.innerHTML=h;
 document.querySelectorAll('.apc-seg [data-v]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===view));
 document.querySelectorAll('.apc-chip').forEach(b=>b.setAttribute('aria-pressed',!off.has(b.dataset.ty)));
 const st=m.get(key(sel))||[],isT=+sel===+today,open=st.filter(t=>!t.done).length;
 $c('apcSelT').innerHTML=`${isT?'Today · ':''}${esc(fdL(sel))} <span class="apc-k">· ${st.length?`${st.length} task${st.length===1?'':'s'}${open<st.length?`, ${st.length-open} done`:''}`:'no tasks'}</span>`;
 $c('apcSelL').innerHTML=st.length?st.map(card).join(''):`<div class="apc-empty"><p>${isT?'Nothing due today.':'Nothing on this day.'} Save internships or add them to Autopilot and their deadlines and reminders show up here.</p><button type="button" class="btn sm" data-go="db">Find internships</button></div>`;
 $c('apcSelL').scrollTop=0;/* job-specific apply links load with the listing detail */
 $c('apcSelL').querySelectorAll('.apc-apply[href="#"]').forEach(a=>{const x=L(a.dataset.apclid);x&&typeof ensureDetail==='function'&&ensureDetail(x).then(()=>{if(x.apply_link)a.href=x.apply_link}).catch(()=>{})});
 const up=all.filter(t=>t.at>=today&&t.at<addD(today,7)&&!t.done);
 $c('apcUp').innerHTML=up.length?up.map(t=>`<li><button type="button" class="apc-ui" data-apcopen="${esc(t.id)}"><span class="apc-dt">${esc(t.at.toLocaleDateString('en-US',{month:'short',day:'numeric'}))} ${esc(t.at.toLocaleDateString('en-US',{weekday:'short'}))}</span>${dot(t.ty)}<span class="apc-what"><b>${esc(t.co||t.label)}</b>${t.co?` · ${esc(t.ti||t.label)}`:''}</span><span class="apc-ty">${TY[t.ty]}</span></button></li>`).join(''):`<li class="apc-none">Nothing in the next 7 days.</li>`}
function card(t){const x=L(t.lid),co=t.co||'Your task';const lg=x&&typeof logoHTML==='function'?logoHTML(x,false,'sm'):`<span class="logo sm apc-av" aria-hidden="true">${esc((co[0]||'?').toUpperCase())}</span>`;
 const href=(x&&x.apply_link)||t.url||'',showApply=(href||(x&&x.ak&&x.st!=='closed'&&x.st!=='upcoming'))&&(t.ty==='deadline'||t.ty==='apply')&&!t.done;
 return `<article class="apc-t${t.done?' done':''}" data-tid="${esc(t.id)}">${lg}<div class="apc-m"><b class="apc-r">${esc(t.ti||t.label)}</b><span class="apc-meta">${t.co?esc(t.co)+' · ':''}${dot(t.ty)}${TY[t.ty]}${t.time?' · '+esc(t.time):''}</span>${t.ti&&t.label!==TY[t.ty]?`<span class="apc-lbl">${esc(t.label)}</span>`:''}</div>
 <div class="apc-acts">${showApply?`<a class="btn sm apc-apply" data-apclid="${esc(t.lid)}" href="${esc(href||'#')}" target="_blank" rel="noopener noreferrer" aria-label="Apply to ${esc(t.ti||'this internship')} at ${esc(co)} (opens the application)">Apply</a>`:''}${x?`<button type="button" class="btn-ghost sm" data-apcopen="${esc(t.id)}">Open</button>`:''}<button type="button" class="btn-ghost sm" data-apcdone="${esc(t.id)}" aria-pressed="${t.done}">${t.done?'Undo':'✓ Mark done'}</button>${t.src==='u'?`<button type="button" class="btn-ghost sm" data-apcdel="${esc(t.id)}" aria-label="Delete task ${esc(t.label)}">Delete</button>`:''}</div></article>`}
function markDone(t){const on=!t.done,cal=cs();cal.done=cal.done||{};
 if(t.src==='ap'){const s=Store.get('autopilot',null);const it=s&&s.items[t.lid];if(it){it.done=on?[...new Set(it.done.concat(t.k))]:it.done.filter(k=>k!==t.k);Store.set('autopilot',s);document.dispatchEvent(new CustomEvent('radar:autopilot'))}
  /* Apply reminder done: mark Applied in the tracker if the listing is tracked */
  if(on&&t.k==='p3'&&typeof T!=='undefined'){const a=T.all(),r=a.find(o=>String(o.listingId)===String(t.lid));if(r&&r.status==='Saved'){setStatus(r,'Applied');T.save(a)}}}
 else if(t.src==='u'){cal.tasks.forEach(u=>{if('u:'+u.id===t.id)u.done=on})}
 else{if(on)cal.done[t.id]=1;else delete cal.done[t.id];
  if(t.src==='trfu'&&on&&typeof T!=='undefined'){const a=T.all(),r=a.find(o=>o.id===t.tid);if(r){r.history=r.history||[];r.lastFollowUp=key(new Date());r.updated=new Date().toISOString();Store.set('tracker',a)}}
  if(t.src==='wp'){const w=Store.get('warmpaths',null),c=w&&w.contacts.find(z=>z.id===t.cid);if(c){if(on)c.followedUp=new Date().toISOString();else delete c.followedUp;Store.set('warmpaths',w)}}}
 cput(cal);render();toast(on?'Marked done.':'Marked not done.')}
function quickAdd(){const opts=[];const seen=new Set();(typeof T!=='undefined'?T.all():[]).forEach(t=>{if(t.listingId!=null&&!seen.has(String(t.listingId))){seen.add(String(t.listingId));opts.push([t.listingId,t.listing.company+' · '+t.listing.title])}});
 AP.list().forEach(r=>{if(!seen.has(String(r.id))){seen.add(String(r.id));opts.push([r.id,r.x.company+' · '+r.x.title])}});
 openModal(`<h2>Quick add task</h2><form id="apcForm" class="apc-form"><label>Title<input name="title" required maxlength="120" autocomplete="off"></label><label>Date<input name="date" type="date" required value="${key(sel)}"></label>
 <label>Type<select name="type">${Object.entries(TY).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label>
 <label>Linked internship (optional)<select name="lid"><option value="">None</option>${opts.map(([v,l])=>`<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select></label>
 <div class="mf-foot"><button type="button" class="link" id="apcNo">Cancel</button><button type="submit" class="btn">Add task</button></div></form>`);
 $c('apcNo').onclick=closeModal;$c('apcForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),title=String(f.get('title')||'').trim(),d=day(f.get('date'));if(!title||!d)return;
  const cal=cs();cal.tasks.push({id:Store.uid(),title,date:key(d),type:TY[f.get('type')]?f.get('type'):'apply',lid:f.get('lid')||null,done:false,created:new Date().toISOString()});cput(cal);closeModal();sel=d;cur=new Date(d);render();toast('Task added.')}}
function pick(k,focus){const d=day(k);if(!d)return;const moved=view==='m'?d.getMonth()!==cur.getMonth()||d.getFullYear()!==cur.getFullYear():Math.abs(addD(d,-d.getDay())-addD(cur,-cur.getDay()))>0;sel=d;if(moved)cur=new Date(d);render();if(focus)document.querySelector(`.apc-d[data-day="${k}"]`)?.focus()}
document.addEventListener('click',e=>{const t=e.target;if(!t.closest||!t.closest('#apCal,#modal'))return;
 const ap=t.closest('.apc-apply[href="#"]');if(ap){e.preventDefault();const x=L(ap.dataset.apclid);if(x)ensureDetail(x).then(()=>x.apply_link?window.open(x.apply_link,'_blank','noopener'):openDrawer(x));return}
 const d=t.closest('.apc-d');if(d){pick(d.dataset.day);return}
 if(t.closest('#apcPrev,#apcNext')){const s=t.closest('#apcPrev')?-1:1;cur=view==='m'?new Date(cur.getFullYear(),cur.getMonth()+s,1):addD(cur,7*s);render();return}
 if(t.closest('#apcToday')){cur=sod(new Date());sel=sod(new Date());render();return}
 const v=t.closest('.apc-seg [data-v]');if(v){view=v.dataset.v;cur=new Date(sel);render();return}
 const c=t.closest('.apc-chip');if(c){const ty=c.dataset.ty;off.has(ty)?off.delete(ty):off.add(ty);Store.set('apCalOff',[...off]);render();return}
 if(t.closest('#apcAdd')){quickAdd();return}
 const all=()=>tasks();
 const o=t.closest('[data-apcopen]');if(o){const k=all().find(z=>z.id===o.dataset.apcopen);if(!k)return;const x=L(k.lid);if(o.closest('.apc-ui')){sel=sod(k.at);cur=new Date(sel);render();if(x)openDrawer(x);else $c('apcSelL')?.scrollIntoView({block:'nearest',behavior:'smooth'})}else if(x)openDrawer(x);return}
 const dn=t.closest('[data-apcdone]');if(dn){const k=all().find(z=>z.id===dn.dataset.apcdone);k&&markDone(k);return}
 const dl=t.closest('[data-apcdel]');if(dl){const cal=cs(),id=dl.dataset.apcdel.slice(2),keep=cal.tasks.find(u=>u.id===id);cal.tasks=cal.tasks.filter(u=>u.id!==id);cput(cal);render();toast('Task deleted.',()=>{const z=cs();z.tasks.push(keep);cput(z);render()})}});
document.addEventListener('keydown',e=>{const d=e.target.closest&&e.target.closest('.apc-d');if(!d)return;const mv={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[e.key];
 if(mv){e.preventDefault();pick(key(addD(day(d.dataset.day),mv)),true)}else if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(d.dataset.day,true)}});
['radar:autopilot','radar:tracker'].forEach(ev=>document.addEventListener(ev,()=>{if(!$c('t-autopilot')?.hidden)render()}));
window.APCal={render,tasks};
})();
document.addEventListener('radar:page',e=>{if(e.detail==='autopilot'&&window.APCal)APCal.render()});
