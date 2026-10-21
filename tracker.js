/* My Tracker (V4 §11): an automated spreadsheet. Store 'tracker' = [{id,listingId,listing:{company,title,location,apply_url,deadline,rolling},status,history[],
   dateSaved,dateApplied,followUp,nextStep,notes,priority,contact,resumeVersion,coverLetter,closeReason,statusAt,created,updated}] */
const TSTAT=['Saved','Applied','Online Assessment','Interviewing','Offer','Accepted','Rejected','Ghosted','Withdrawn','Closed'];
const APPLIED_SET=['Applied','Online Assessment','Interviewing','Offer','Accepted','Rejected','Ghosted'];
const today=()=>new Date().toISOString().slice(0,10);const addDays=(d,n)=>{const x=new Date(d+'T00:00:00');x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};
const T={all:()=>Store.get('tracker',[]),save:a=>{Store.set('tracker',a);trackerRefresh()},byListing:id=>T.all().find(t=>String(t.listingId)===String(id))};
(function migrate(){let a=Store.get('tracker',null);if(!a)return;if(!Array.isArray(a))a=Object.entries(a).map(([k,v])=>({listingId:k,status:typeof v==='string'?v:v.status}));
 const MAP={Interview:'Interviewing'};let ch=false;a=a.map(t=>{const s=MAP[t.status]||(TSTAT.includes(t.status)?t.status:'Saved');if(t.dateSaved&&s===t.status&&t.history)return t;ch=true;
  return {...t,id:t.id||Store.uid(),listingId:'listingId' in t?t.listingId:t.id,listing:t.listing||{company:t.company||'',title:t.title||t.role||''},status:s,history:(t.history||[s]).map(h=>MAP[h]||h),
   dateSaved:t.dateSaved||(t.created||new Date().toISOString()).slice(0,10),dateApplied:t.dateApplied||'',followUp:t.followUp||t.nextDate||'',nextStep:t.nextStep||'',notes:t.notes||'',contact:t.contact||'',
   priority:t.priority||0,resumeVersion:t.resumeVersion||'',coverLetter:t.coverLetter||'',closeReason:t.closeReason||'',statusAt:t.statusAt||t.updated||t.created||new Date().toISOString(),created:t.created||new Date().toISOString()}});
 if(ch)Store.set('tracker',a)})();
const snap=x=>({company:x.company,title:x.title,deadline:x.deadline||null,rolling:!!x.rolling,apply_url:x.apply_url||null,location:(x.locations||[]).map(l=>[l.city,l.state].filter(Boolean).join(', ')).join('; ')+(x.remote?((x.locations||[]).length?'; ':'')+'Remote':'')||null});
function toast(msg){let el=$('toast');if(!el){el=document.createElement('div');el.id='toast';el.setAttribute('role','status');document.body.appendChild(el)}el.textContent=msg;el.className='show';clearTimeout(el._t);el._t=setTimeout(()=>el.className='',3200)}
function newRow(L,listingId){const n=new Date().toISOString();return{id:Store.uid(),listingId:listingId??null,listing:L,status:'Saved',history:['Saved'],dateSaved:today(),dateApplied:'',followUp:'',nextStep:'',notes:'',contact:'',priority:0,resumeVersion:'',coverLetter:'',closeReason:'',statusAt:n,created:n,updated:n}}
function track(id,status){const x=(typeof BYID!=='undefined'&&BYID.get(String(id)))||D.find(o=>String(o.id)===String(id));if(!x)return;const a=T.all();let t=a.find(o=>String(o.listingId)===String(id));
 if(t){if(t.status===status||(status==='Saved')){toast(`Already in your tracker as “${t.status}”.`);return}if(status==='Applied'&&t.dateApplied){toast(`Already marked applied on ${fmtDate(t.dateApplied)}.`);return}}
 else{t=newRow(snap(x),x.id);a.unshift(t)}setStatus(t,status);T.save(a);toast(status==='Applied'?'Marked applied · follow-up set for 7 days from today':'Saved to your tracker')}
function setStatus(t,s){if(t.status===s)return;t.status=s;if(!t.history.includes(s))t.history.push(s);t.statusAt=t.updated=new Date().toISOString();
 if(s==='Applied'&&!t.dateApplied){t.dateApplied=today();if(!t.followUp)t.followUp=addDays(t.dateApplied,7)}}
/* ---------- table ---------- */
const COLS=[['company','Company',1],['title','Role',1],['status','Status',1],['closes','Closes In',1],['dateApplied','Date Applied',1],['nextStep','Next Step',1],['notes','Notes',1],['link','Link',1],
 ['location','Location',0],['priority','Priority',0],['followUp','Follow-up Date',0],['contact','Contact/Referral',0],['resumeVersion','Resume Version',0],['coverLetter','Cover Letter',0],['closeReason','Close Reason',0],['dateSaved','Date Saved',0]];
const SEG=[['All',()=>true],['Saved',t=>t.status==='Saved'],['Applied',t=>['Applied','Online Assessment'].includes(t.status)],['Interviewing',t=>t.status==='Interviewing'],['Offers',t=>['Offer','Accepted'].includes(t.status)],['Rejections',t=>['Rejected','Ghosted','Withdrawn'].includes(t.status)]];
let tSeg='All',tSort=Store.get('trackerSort',{k:'closes',d:1});
const visCols=()=>{const v=Store.get('trackerCols',null);let c=COLS.filter(c=>v?v.includes(c[0]):c[2]);if(matchMedia('(max-width:860px)').matches){const s=c.find(x=>x[0]==='status');if(s)c=[c[0],s,...c.slice(1).filter(x=>x!==s)]}return c};
const stkC=(c,i,cols)=>i===0?'stk':(i===1&&c[0]==='status'&&matchMedia('(max-width:860px)').matches?'stk stk2':'');
const CLOSEDST=['Rejected','Ghosted','Withdrawn','Closed','Accepted'];
function postingClosed(t){if(t.listingId==null||typeof BYID==='undefined'||!BYID.size)return false;const x=BYID.get(String(t.listingId));return !x||x.st==='closed'}
function closesIn(t){const L=t.listing;if(postingClosed(t))return{txt:'Posting closed',n:-1,cls:'closed'};if(!L.deadline)return{txt:L.rolling?'Rolling':'Not listed',n:9999,cls:''};const n=days(L.deadline);
 if(n<0)return{txt:'Closed '+fmtDate(L.deadline),n:-1,cls:'closed'};return{txt:n===0?'Closes today':n===1?'1 day':n+' days',n,cls:n<3?'red':n<7?'amber':''}}
function sortVal(t,k){const L=t.listing;return k==='closes'?closesIn(t).n:k==='company'?L.company||'':k==='title'?L.title||'':k==='location'?L.location||'':k==='link'?L.apply_url||'':k==='status'?TSTAT.indexOf(t.status):k==='priority'?-(t.priority||0):(t[k]||'')}
const pill=s=>'st-'+s.toLowerCase().replace(/\s+/g,'-');
function cell(t,k){const L=t.listing;const inp=(f,v,type='text',ph='')=>`<input class="ce" data-f="${f}" type="${type}" value="${esc(v||'')}" placeholder="${ph}" aria-label="${f}">`;
 switch(k){case 'company':return `<div class="coc">${window.logoHTML?logoHTML({company:L.company||''},false,'sm'):''}<textarea class="ce ta" rows="2" data-f="company" aria-label="company" title="${esc(L.company||'')}">${esc(L.company||'')}</textarea></div>`;case 'title':return `<textarea class="ce ta" rows="2" data-f="title" aria-label="title" title="${esc(L.title||'')}">${esc(L.title||'')}</textarea>`;case 'location':return inp('location',L.location);
 case 'status':return`<select class="ce pill ${pill(t.status)}" data-f="status" aria-label="Status">${TSTAT.map(s=>`<option${s===t.status?' selected':''}>${s}</option>`).join('')}</select>`;
 case 'closes':{const c=closesIn(t);return`<span class="cin ${c.cls}">${esc(c.txt)}</span>${L.deadline&&!postingClosed(t)?'':''}<input class="ce dl" data-f="deadline" type="date" value="${esc(L.deadline||'')}" aria-label="Closing date" title="Closing date">`}
 case 'dateApplied':return inp('dateApplied',t.dateApplied,'date');case 'followUp':return inp('followUp',t.followUp,'date');case 'dateSaved':return inp('dateSaved',t.dateSaved,'date');
 case 'nextStep':return inp('nextStep',t.nextStep,'text','e.g. send thank-you');case 'notes':return inp('notes',t.notes);case 'contact':return inp('contact',t.contact);case 'resumeVersion':return inp('resumeVersion',t.resumeVersion);
 case 'closeReason':return inp('closeReason',t.closeReason);case 'coverLetter':return`<select class="ce" data-f="coverLetter" aria-label="Cover letter"><option value=""></option><option${t.coverLetter==='Y'?' selected':''}>Y</option><option${t.coverLetter==='N'?' selected':''}>N</option></select>`;
 case 'priority':return`<span class="stars" role="radiogroup" aria-label="Priority">${[1,2,3,4,5].map(i=>`<button type="button" class="star${i<=(t.priority||0)?' on':''}" data-star="${i}" aria-label="${i} star${i>1?'s':''}">★</button>`).join('')}</span>`;
 case 'link':return`${L.apply_url?`<a href="${esc(L.apply_url)}" target="_blank" rel="noopener">Open ↗</a>`:''}<input class="ce lk" data-f="apply_url" type="url" value="${esc(L.apply_url||'')}" placeholder="https://" aria-label="Link">`}}
function trackerRefresh(){if(!$('tTable'))return;const a=T.all();$('trkN')&&($('trkN').textContent=a.length||'');
 const wk=a.filter(t=>{const c=closesIn(t);return c.n>=0&&c.n<=7&&!CLOSEDST.includes(t.status)}).length;
 $('tStats').innerHTML=[['Saved',a.filter(t=>t.status==='Saved').length],['Applied',a.filter(t=>t.dateApplied||APPLIED_SET.includes(t.status)).length],['Interviews',a.filter(t=>t.history.includes('Interviewing')).length],['Offers',a.filter(t=>t.history.includes('Offer')||t.status==='Accepted').length],['Closing this week',wk]].map(([l,n])=>`<span class="tst"><b>${n}</b>${l}</span>`).join('');
 $('tSeg').innerHTML=SEG.map(([n,f])=>`<button type="button" class="${tSeg===n?'on':''}" data-seg="${n}" aria-pressed="${tSeg===n}">${n} <small>${a.filter(f).length}</small></button>`).join('');
 const cols=visCols();const f=SEG.find(s=>s[0]===tSeg)[1];const rows=a.filter(f).sort((x,y)=>{const A=sortVal(x,tSort.k),B=sortVal(y,tSort.k);return (A<B?-1:A>B?1:0)*tSort.d});
 const W=Store.get('trackerW',{});$('tEmpty').hidden=a.length>0;
 $('tTable').innerHTML=`<thead><tr>${cols.map((c,i)=>`<th scope="col" data-k="${c[0]}" class="${stkC(c,i)} c-${c[0]}" style="${W[c[0]]?'width:'+W[c[0]]+'px':''}" aria-sort="${tSort.k===c[0]?(tSort.d>0?'ascending':'descending'):'none'}"><button type="button" class="th">${c[1]}${tSort.k===c[0]?(tSort.d>0?' ▲':' ▼'):''}</button></th>`).join('')}<th class="c-x"><span class="sr">Actions</span></th></tr></thead>
 <tbody>${rows.map(t=>{const c=closesIn(t);const over=t.followUp&&days(t.followUp)<0&&!CLOSEDST.includes(t.status);const stale=['Applied','Online Assessment','Interviewing'].includes(t.status)&&(Date.now()-new Date(t.statusAt||t.updated))/864e5>=14;
  const tint=CLOSEDST.includes(t.status)||c.cls==='closed'?'r-gray':c.cls==='red'?'r-red':c.cls==='amber'?'r-amber':'';
  return`<tr data-id="${t.id}" class="${tint}${over?' r-over':''}">${cols.map((col,i)=>`<td class="${stkC(col,i)} c-${col[0]}">${cell(t,col[0])}${col[0]==='status'&&stale?`<button type="button" class="ghostq" data-ghost="1">Mark as Ghosted?</button>`:''}${col[0]==='company'&&postingClosed(t)&&!CLOSEDST.includes(t.status)?'<span class="pc">Posting closed</span>':''}${col[0]==='nextStep'&&over?'<span class="ov">Follow-up overdue</span>':''}</td>`).join('')}<td class="c-x"><button type="button" class="ghost sm" data-del="1" aria-label="Delete row">✕</button></td></tr>`}).join('')}</tbody>`;
 $('tCols').innerHTML=COLS.map(c=>`<label class="chk"><input type="checkbox" value="${c[0]}"${cols.includes(c)?' checked':''}> ${c[1]}</label>`).join('');
 document.dispatchEvent(new Event('radar:tracker'))}
function upd(id,fn){const a=T.all();const t=a.find(o=>o.id===id);if(!t)return;fn(t);t.updated=new Date().toISOString();Store.set('tracker',a);return t}
function trackerInit(){const tb=$('tTable');
 tb.addEventListener('change',e=>{const el=e.target.closest('.ce');if(!el)return;const id=el.closest('tr').dataset.id,f=el.dataset.f,v=el.value.trim();
  upd(id,t=>{if(f==='status')setStatus(t,v);else if(['company','title','location','apply_url','deadline'].includes(f))t.listing[f]=v||null;else t[f]=v;if(f==='dateApplied'&&v&&!t.followUp)t.followUp=addDays(v,7)});
  const keep=document.activeElement===el?[id,f]:null;trackerRefresh();if(keep){const n=tb.querySelector(`tr[data-id="${keep[0]}"] [data-f="${keep[1]}"]`);n&&n.focus()}});
 tb.addEventListener('click',e=>{const th=e.target.closest('th[data-k]');if(th&&e.target.closest('.th')){const k=th.dataset.k;tSort=tSort.k===k?{k,d:-tSort.d}:{k,d:1};Store.set('trackerSort',tSort);trackerRefresh();return}
  const tr=e.target.closest('tr[data-id]');if(!tr)return;const id=tr.dataset.id;
  if(e.target.dataset.star){const n=+e.target.dataset.star;upd(id,t=>t.priority=t.priority===n?0:n);trackerRefresh()}
  else if(e.target.dataset.ghost){upd(id,t=>setStatus(t,'Ghosted'));trackerRefresh()}
  else if(e.target.dataset.del){const t=T.all().find(o=>o.id===id);if(t&&confirm(`Remove ${t.listing.company||'this row'} from your tracker?`)){T.save(T.all().filter(o=>o.id!==id))}}});
 tb.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.classList.contains('ta')){e.preventDefault();e.target.blur();return}});
 tb.addEventListener('keydown',e=>{const td=e.target.closest('td');if(!td||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;const isText=(e.target.tagName==='TEXTAREA'||e.target.tagName==='INPUT')&&!['date'].includes(e.target.type);
  if(isText&&(e.key==='ArrowLeft'&&e.target.selectionStart>0||e.key==='ArrowRight'&&e.target.selectionEnd<e.target.value.length))return;if(e.target.tagName==='SELECT'&&(e.key==='ArrowUp'||e.key==='ArrowDown')&&!e.altKey)return;
  if(e.target.type==='date'&&(e.key==='ArrowUp'||e.key==='ArrowDown'))return;
  const tr=td.parentElement,ci=[...tr.children].indexOf(td);let tgt=null;if(e.key==='ArrowLeft')tgt=tr.children[ci-1];if(e.key==='ArrowRight')tgt=tr.children[ci+1];
  if(e.key==='ArrowUp')tgt=tr.previousElementSibling?.children[ci];if(e.key==='ArrowDown')tgt=tr.nextElementSibling?.children[ci];
  const f=tgt&&tgt.querySelector('input,select,button,a');if(f){e.preventDefault();f.focus()}});
 // resizable columns: remember widths
 new ResizeObserver(()=>{}).observe(tb);tb.addEventListener('mouseup',()=>{const W={};tb.querySelectorAll('th[data-k]').forEach(th=>{if(th.style.width)W[th.dataset.k]=parseInt(th.style.width)});
  tb.querySelectorAll('th[data-k]').forEach(th=>{const w=th.offsetWidth;if(th._w&&th._w!==w)W[th.dataset.k]=w;th._w=w});if(Object.keys(W).length)Store.set('trackerW',{...Store.get('trackerW',{}),...W})});
 $('tSeg').onclick=e=>{const b=e.target.closest('[data-seg]');if(b){tSeg=b.dataset.seg;trackerRefresh()}};
 $('tColBtn').onclick=()=>{const m=$('tColMenu');m.hidden=!m.hidden;$('tColBtn').setAttribute('aria-expanded',!m.hidden)};
 const colClose=()=>{$('tColMenu').hidden=true;$('tColBtn').setAttribute('aria-expanded','false')};$('tColDone').onclick=()=>{colClose();$('tColBtn').focus()};
 document.addEventListener('click',e=>{if(!$('tColMenu').hidden&&!e.target.closest('.colwrap'))colClose()});$('tColMenu').addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();colClose();$('tColBtn').focus()}});
 $('tCols').onchange=()=>{Store.set('trackerCols',[...$('tCols').querySelectorAll('input:checked')].map(i=>i.value));trackerRefresh()};
 $('tAdd').onclick=()=>{openModal(`<h2>Add a row</h2><form id="trAdd"><label>Company *<input name="company" required></label><label>Role *<input name="title" required></label><label>Location<input name="location"></label><label>Link<input name="apply_url" type="url" placeholder="https://"></label><label>Closing date<input name="deadline" type="date"></label><p><button>Add</button></p></form>`);
  $('trAdd').onsubmit=ev=>{ev.preventDefault();const f=Object.fromEntries(new FormData(ev.target));const a=T.all();const dup=a.find(t=>(t.listing.company||'').toLowerCase()===f.company.trim().toLowerCase()&&(t.listing.title||'').toLowerCase()===f.title.trim().toLowerCase());
   if(dup&&!confirm(`You already track ${f.company} – ${f.title} (${dup.status}). Add it again?`))return;a.unshift(newRow({company:f.company.trim(),title:f.title.trim(),location:f.location||null,apply_url:f.apply_url||null,deadline:f.deadline||null,rolling:false}));T.save(a);closeModal()}};
 $('tImp').onchange=async e=>{const file=e.target.files[0];if(!file)return;const rows=parseCSV(await file.text());e.target.value='';if(rows.length<2)return alert('No rows found.');
  const h=rows[0].map(s=>s.trim().toLowerCase());const ix=n=>h.findIndex(x=>n.includes(x));const g=(r,n)=>{const i=ix(n);return i>=0?(r[i]||'').trim():''};const a=T.all();let n=0,d=0;
  rows.slice(1).forEach(r=>{const co=g(r,['company']),ti=g(r,['role','title','position']);if(!co&&!ti)return;if(a.some(t=>t.listing.company===co&&t.listing.title===ti)){d++;return}
   const t=newRow({company:co,title:ti,location:g(r,['location'])||null,apply_url:g(r,['link','url','apply_url'])||null,deadline:/^\d{4}-\d\d-\d\d$/.test(g(r,['closing date','deadline']))?g(r,['closing date','deadline']):null,rolling:false});
   const st=g(r,['status']);if(TSTAT.includes(st))t.status=st,t.history=[st];['dateApplied:date applied','nextStep:next step','notes:notes','followUp:follow-up date','contact:contact/referral','resumeVersion:resume version','coverLetter:cover letter','closeReason:close reason'].forEach(p=>{const [k,l]=p.split(':');const v=g(r,[l]);if(v)t[k]=v});
   const pr=parseInt(g(r,['priority']));if(pr)t.priority=pr;a.push(t);n++});T.save(a);toast(`Imported ${n} row${n===1?'':'s'}${d?`, skipped ${d} duplicate${d===1?'':'s'}`:''}.`)};
 $('tCsv').onclick=()=>exportTracker('csv');$('tXls').onclick=()=>exportTracker('xls');$('ics').onclick=exportICS;trackerRefresh()}
function trackerTable(){const all=COLS.map(c=>c[1]).map(h=>h==='Closes In'?'Closing Date':h);const rows=T.all().map(t=>{const L=t.listing;return[L.company,L.title,t.status,L.deadline||(L.rolling?'Rolling':''),t.dateApplied,t.nextStep,t.notes,L.apply_url,L.location,t.priority||'',t.followUp,t.contact,t.resumeVersion,t.coverLetter,t.closeReason,t.dateSaved].map(v=>v==null?'':String(v))});return[all,...rows]}
function exportTracker(kind){const R=trackerTable();const day=today();
 if(kind==='csv'){const q=v=>/[",\n]/.test(v)?`"${v.replace(/"/g,'""')}"`:v;dl(`internship-tracker-${day}.csv`,'\ufeff'+R.map(r=>r.map(q).join(',')).join('\r\n'),'text/csv');return}
 const x=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');const xml=`<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="h"><Font ss:Bold="1"/></Style></Styles><Worksheet ss:Name="Tracker"><Table>${R.map((r,i)=>`<Row>${r.map(v=>`<Cell${i?'':' ss:StyleID="h"'}><Data ss:Type="String">${x(v)}</Data></Cell>`).join('')}</Row>`).join('')}</Table></Worksheet></Workbook>`;
 dl(`internship-tracker-${day}.xls`,xml,'application/vnd.ms-excel')}
function dl(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function icsEsc(s){return String(s||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n')}
function fold(l){const out=[];let s=l;while(new TextEncoder().encode(s).length>75){let n=73;while(new TextEncoder().encode(s.slice(0,n)).length>74)n--;out.push(s.slice(0,n));s=' '+s.slice(n)}out.push(s);return out.join('\r\n')}
function buildICS(a=T.all()){const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');const ev=[];
 const add=(uid,date,summary,desc,url)=>{const d=date.replace(/-/g,'');const nd=new Date(date+'T00:00:00Z');nd.setUTCDate(nd.getUTCDate()+1);
  ev.push(['BEGIN:VEVENT',`UID:${uid}@internship-radar`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${d}`,`DTEND;VALUE=DATE:${nd.toISOString().slice(0,10).replace(/-/g,'')}`,`SUMMARY:${icsEsc(summary)}`,desc?`DESCRIPTION:${icsEsc(desc)}`:null,url?`URL:${url}`:null,
   'BEGIN:VALARM','ACTION:DISPLAY',`DESCRIPTION:${icsEsc(summary)}`,'TRIGGER:-P1D','END:VALARM','END:VEVENT'].filter(Boolean))};
 a.forEach(t=>{const L=t.listing;if(L.deadline&&['Saved','Applied'].includes(t.status)&&days(L.deadline)>=0)add('dl-'+t.id,L.deadline,`Deadline: ${L.company} – ${L.title}`,`Status: ${t.status}`,L.apply_url);
  if((t.followUp||t.nextDate)&&!['Rejected','Withdrawn','Ghosted','Closed','Accepted'].includes(t.status))add('nx-'+t.id,t.followUp||t.nextDate,`${t.nextStep||'Follow up'}: ${L.company}`,`${L.title}${t.contact?'\nContact: '+t.contact:''}${t.notes?'\n'+t.notes:''}`,L.apply_url)});
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Internship Radar//Tracker//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Internship deadlines',...ev.flat(),'END:VCALENDAR'];
 return {text:lines.map(fold).join('\r\n')+'\r\n',count:ev.length}}
function exportICS(){const {text,count}=buildICS();if(!count){alert('No upcoming deadlines or next-step dates in your tracker yet. Note: most listings don\'t publish a deadline; add next-step dates in Details.');return}
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/calendar'}));a.download='internship-deadlines.ics';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
