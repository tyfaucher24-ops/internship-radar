/* Application tracker (V2 step 2). Data: Store 'tracker' = [{id,listingId,listing:{snapshot},status,history[],dateApplied,notes,contact,nextStep,nextDate,created,updated}] */
const TSTAT=['Saved','Applied','Online Assessment','Interview','Offer','Rejected','Withdrawn'];
const APPLIED_SET=TSTAT.slice(1);
let tView='board';
const T={all:()=>Store.get('tracker',[]),save:a=>{Store.set('tracker',a);trackerRefresh()},
 byListing:id=>T.all().find(t=>String(t.listingId)===String(id))};
(function migrate(){let a=Store.get('tracker',null);
 // V1 had no tracker; accept any legacy shape ({id:status} map or array of {id/role/status}) defensively
 if(a&&!Array.isArray(a)){a=Object.entries(a).map(([k,v])=>({listingId:k,status:typeof v==='string'?v:v.status}))}
 if(Array.isArray(a)&&a.some(t=>!t.history)){Store.set('tracker',a.map(t=>({id:t.id||Store.uid(),listingId:t.listingId??t.id,listing:t.listing||{company:t.company||'',title:t.title||t.role||''},
  status:TSTAT.includes(t.status)?t.status:'Saved',history:[TSTAT.includes(t.status)?t.status:'Saved'],dateApplied:t.dateApplied||'',notes:t.notes||'',contact:t.contact||'',nextStep:t.nextStep||'',nextDate:t.nextDate||'',created:t.created||new Date().toISOString(),updated:new Date().toISOString()})))}})();
const snap=x=>({company:x.company,title:x.title,deadline:x.deadline||null,rolling:!!x.rolling,apply_url:x.apply_url||null,location:x.location_text||(x.locations||[]).map(l=>[l.city,l.state].filter(Boolean).join(', ')).join('; ')||null});
const today=()=>new Date().toISOString().slice(0,10);
function track(id,status){const x=D.find(o=>String(o.id)===String(id));if(!x)return;const a=T.all();let t=a.find(o=>String(o.listingId)===String(id));
 if(!t){t={id:Store.uid(),listingId:x.id,listing:snap(x),status:'Saved',history:['Saved'],dateApplied:'',notes:'',contact:'',nextStep:'',nextDate:'',created:new Date().toISOString()};a.unshift(t)}
 setStatus(t,status);T.save(a)}
function setStatus(t,s){t.status=s;if(!t.history.includes(s))t.history.push(s);if(APPLIED_SET.includes(s)&&s!=='Withdrawn'&&!t.dateApplied)t.dateApplied=today();t.updated=new Date().toISOString()}
function moveTo(tid,s){const a=T.all();const t=a.find(o=>o.id===tid);if(!t||t.status===s)return;setStatus(t,s);T.save(a)}
function trackBtns(x){const t=T.byListing(x.id);if(t)return `<button class="ghost sm tk" onclick="go('tracker');editApp('${t.id}')">✓ ${esc(t.status)}</button>`;
 return `<button class="ghost sm" onclick="track('${esc(x.id)}','Saved')">Save</button><button class="ghost sm" onclick="track('${esc(x.id)}','Applied')">Mark applied</button>`}
function stats(a){const ap=a.filter(t=>t.history.some(h=>APPLIED_SET.includes(h)&&h!=='Withdrawn')||t.dateApplied);const iv=ap.filter(t=>t.history.includes('Interview')||t.history.includes('Offer'));
 return {saved:a.filter(t=>t.status==='Saved').length,applied:ap.length,rate:ap.length?Math.round(100*iv.length/ap.length):0,iv:iv.length,offers:a.filter(t=>t.history.includes('Offer')).length}}
const fmtD=d=>d?fmtDate(d):'';
function appCard(t){const L=t.listing,dl=L.deadline;const n=dl?days(dl):null;const nx=t.nextDate?days(t.nextDate):null;
 return `<div class="acard" data-id="${t.id}"><div class="row"><span class="co">${esc(L.company)}</span><span class="grip" title="Drag to move">⋮⋮</span></div><div class="role sm">${esc(L.title)}</div>
 <div class="meta">${dl?`<span>🗓 ${fmtD(dl)}${n!==null&&n>=0&&t.status==='Saved'?` · <b class="cd">${n}d</b>`:''}</span>`:''}${t.dateApplied?`<span>Applied ${fmtD(t.dateApplied)}</span>`:''}</div>
 ${t.nextStep||t.nextDate?`<div class="meta"><span>➜ ${esc(t.nextStep||'Next step')}${t.nextDate?' · '+fmtD(t.nextDate):''}${nx!==null&&nx<=0?' <b class="cd">due</b>':''}</span></div>`:''}
 <div class="row"><select aria-label="Status" onchange="moveTo('${t.id}',this.value)">${TSTAT.map(s=>`<option${s===t.status?' selected':''}>${s}</option>`).join('')}</select><button class="ghost sm" onclick="editApp('${t.id}')">Details</button></div></div>`}
function trackerRefresh(){if(!$('board'))return;const a=T.all(),s=stats(a);
 a.forEach(t=>{if(!t.listing.company){const x=D.find(o=>String(o.id)===String(t.listingId));if(x){t.listing=snap(x);Store.set('tracker',a)}else t.listing.company='(listing no longer available)'}});
 $('tStats').innerHTML=`<div><b>${a.length}</b>tracked</div><div><b>${s.applied}</b>applied</div><div><b>${s.rate}%</b>interview rate</div><div><b>${s.offers}</b>offer${s.offers==1?'':'s'}</div>`;
 $('tEmpty').hidden=a.length>0;
 $('board').hidden=tView!=='board';$('tList').hidden=tView!=='list';
 $('board').innerHTML=TSTAT.map(st=>{const c=a.filter(t=>t.status===st);return `<div class="col" data-status="${st}"><div class="colh">${st} <span>${c.length}</span></div>${c.map(appCard).join('')}</div>`}).join('');
 $('tList').innerHTML=`<div class="tw"><table><thead><tr><th>Company</th><th>Role</th><th>Status</th><th>Deadline</th><th>Applied</th><th>Next step</th><th>Contact</th><th></th></tr></thead><tbody>${a.map(t=>`<tr><td><b>${esc(t.listing.company)}</b></td><td>${esc(t.listing.title)}</td><td><select onchange="moveTo('${t.id}',this.value)">${TSTAT.map(s=>`<option${s===t.status?' selected':''}>${s}</option>`).join('')}</select></td><td>${t.listing.deadline?fmtD(t.listing.deadline):(t.listing.rolling?'Rolling':NL)}</td><td>${fmtD(t.dateApplied)}</td><td>${esc(t.nextStep)} ${fmtD(t.nextDate)}</td><td>${esc(t.contact)}</td><td><button class="ghost sm" onclick="editApp('${t.id}')">Details</button></td></tr>`).join('')}</tbody></table></div>`;
 document.dispatchEvent(new Event('radar:tracker'))}
function editApp(id){const t=T.all().find(o=>o.id===id);if(!t)return;const L=t.listing;
 openModal(`<h2>${esc(L.company)}</h2><p class="muted">${esc(L.title)}${L.location?' · '+esc(L.location):''}</p>${L.apply_url?`<p><a class="btn" href="${esc(L.apply_url)}" target="_blank" rel="noopener">Open application ↗</a></p>`:''}
 <form id="appF"><div class="grid2"><label>Status<select name="status">${TSTAT.map(s=>`<option${s===t.status?' selected':''}>${s}</option>`).join('')}</select></label><label>Date applied<input type="date" name="dateApplied" value="${esc(t.dateApplied)}"></label>
 <label>Contact name<input name="contact" value="${esc(t.contact)}"></label><label>Next step<input name="nextStep" placeholder="e.g. HireVue due, recruiter call" value="${esc(t.nextStep)}"></label><label>Next step date<input type="date" name="nextDate" value="${esc(t.nextDate)}"></label></div>
 <label>Notes<textarea name="notes" rows="4">${esc(t.notes)}</textarea></label><p class="row"><button>Save</button><button type="button" class="ghost" id="appDel">Remove from tracker</button></p></form>`);
 $('appF').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const a=T.all();const o=a.find(x=>x.id===id);Object.assign(o,{dateApplied:f.dateApplied,contact:f.contact.trim(),nextStep:f.nextStep.trim(),nextDate:f.nextDate,notes:f.notes});setStatus(o,f.status);T.save(a);closeModal()};
 $('appDel').onclick=()=>{if(confirm('Remove this application from your tracker?')){T.save(T.all().filter(x=>x.id!==id));closeModal()}}}
/* Pointer-based drag (mouse + touch). Status dropdown on every card is the fallback. */
(function dnd(){let drag=null,ghost=null,sx=0,sy=0,started=false;
 document.addEventListener('pointerdown',e=>{const g=e.target.closest('.acard .grip');if(!g)return;drag=g.closest('.acard');sx=e.clientX;sy=e.clientY;started=false;e.preventDefault()});
 document.addEventListener('pointermove',e=>{if(!drag)return;if(!started&&Math.hypot(e.clientX-sx,e.clientY-sy)<6)return;
  if(!started){started=true;ghost=drag.cloneNode(true);ghost.className='acard ghostc';ghost.style.width=drag.offsetWidth+'px';document.body.appendChild(ghost);drag.classList.add('dragging')}
  ghost.style.left=e.clientX-20+'px';ghost.style.top=e.clientY-14+'px';document.querySelectorAll('.col').forEach(c=>c.classList.remove('over'));const c=colAt(e);if(c)c.classList.add('over')});
 const colAt=e=>{if(ghost)ghost.style.display='none';const el=document.elementFromPoint(e.clientX,e.clientY);if(ghost)ghost.style.display='';return el&&el.closest('.col')};
 const end=e=>{if(!drag)return;const c=started&&colAt(e);const id=drag.dataset.id;drag.classList.remove('dragging');if(ghost)ghost.remove();ghost=null;drag=null;document.querySelectorAll('.col').forEach(c=>c.classList.remove('over'));if(c)moveTo(id,c.dataset.status)};
 document.addEventListener('pointerup',end);document.addEventListener('pointercancel',end)})();
/* .ics export: all-day events for deadlines of active saved/applied items + next-step dates (RFC 5545) */
function icsEsc(s){return String(s||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n')}
function fold(l){const out=[];let s=l;while(new TextEncoder().encode(s).length>75){let n=73;while(new TextEncoder().encode(s.slice(0,n)).length>74)n--;out.push(s.slice(0,n));s=' '+s.slice(n)}out.push(s);return out.join('\r\n')}
function buildICS(a=T.all()){const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');const ev=[];
 const add=(uid,date,summary,desc,url)=>{const d=date.replace(/-/g,'');const nd=new Date(date+'T00:00:00Z');nd.setUTCDate(nd.getUTCDate()+1);
  ev.push(['BEGIN:VEVENT',`UID:${uid}@internship-radar`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${d}`,`DTEND;VALUE=DATE:${nd.toISOString().slice(0,10).replace(/-/g,'')}`,`SUMMARY:${icsEsc(summary)}`,desc?`DESCRIPTION:${icsEsc(desc)}`:null,url?`URL:${url}`:null,
   'BEGIN:VALARM','ACTION:DISPLAY',`DESCRIPTION:${icsEsc(summary)}`,'TRIGGER:-P1D','END:VALARM','END:VEVENT'].filter(Boolean))};
 a.forEach(t=>{const L=t.listing;if(L.deadline&&['Saved','Applied'].includes(t.status)&&days(L.deadline)>=0)add('dl-'+t.id,L.deadline,`Deadline: ${L.company} – ${L.title}`,`Status: ${t.status}`,L.apply_url);
  if(t.nextDate&&!['Rejected','Withdrawn'].includes(t.status))add('nx-'+t.id,t.nextDate,`${t.nextStep||'Next step'}: ${L.company}`,`${L.title}${t.contact?'\nContact: '+t.contact:''}${t.notes?'\n'+t.notes:''}`,L.apply_url)});
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Internship Deadline Radar//Tracker//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Internship deadlines',...ev.flat(),'END:VCALENDAR'];
 return {text:lines.map(fold).join('\r\n')+'\r\n',count:ev.length}}
function exportICS(){const {text,count}=buildICS();if(!count){alert('No upcoming deadlines or next-step dates in your tracker yet. Note: most listings don\'t publish a deadline; add next-step dates in Details.');return}
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/calendar'}));a.download='internship-deadlines.ics';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function trackerInit(){$('tb').onclick=()=>{tView='board';$('tb').className='on';$('tl').className='';trackerRefresh()};$('tl').onclick=()=>{tView='list';$('tl').className='on';$('tb').className='';trackerRefresh()};$('ics').onclick=exportICS;trackerRefresh()}
