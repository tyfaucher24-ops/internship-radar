/* Admin (client-side only). Working copy of listings kept in localStorage until exported as data.json. */
let META={},L=[],ashown=50;
const sha=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,'0')).join('');
function openModal(h){$('mbody').innerHTML=h;$('modal').hidden=false}function closeModal(){$('modal').hidden=true}$('mx').onclick=closeModal;
$('gForm').onsubmit=async e=>{e.preventDefault();if(await sha('idr-salt:'+$('pw').value)===window.ADMIN_HASH){sessionStorage.setItem('idr_admin','1');unlock()}else $('gMsg').textContent='Wrong password.'};
$('logout').onclick=()=>{sessionStorage.removeItem('idr_admin');location.reload()};
async function unlock(){$('gate').hidden=true;$('adm').hidden=false;$('logout').hidden=false;
 const j=await (await fetch('data.json')).json();META={generated:j.generated,schema:j.schema};const w=Store.get('adminListings',null);L=w||j.internships;$('dirty').textContent=w?'You have unsaved local edits. Export data.json and redeploy to publish.':'';render();queueUI()}
if(sessionStorage.getItem('idr_admin'))unlock();
const save=()=>{Store.set('adminListings',L);$('dirty').textContent='Local edits saved in this browser. Export data.json and redeploy to publish.';render()};
const nextId=()=>L.reduce((m,x)=>typeof x.id==='number'?Math.max(m,x.id):m,-1)+1;
function render(){const q=$('aq').value.toLowerCase().split(/\s+/).filter(Boolean);const r=L.filter(x=>{const t=(x.company+' '+x.title+' '+(x.location_text||'')+' '+x.source).toLowerCase();return q.every(w=>t.includes(w))});
 $('aStats').innerHTML=`<div><b>${L.length.toLocaleString()}</b>listings</div><div><b>${Store.get('reviewQueue',[]).filter(x=>x.queue_status==='pending').length}</b>pending review</div><div><b>${new Set(L.map(x=>x.source)).size}</b>sources</div>`;
 $('aList').innerHTML=`<p class="muted">${r.length.toLocaleString()} shown${r.length>ashown?` (first ${ashown})`:''}</p><div class="tw"><table><thead><tr><th>Company</th><th>Title</th><th>Location</th><th>Deadline</th><th>Source</th><th></th></tr></thead><tbody>${r.slice(0,ashown).map(x=>`<tr><td><b>${esc(x.company)}</b></td><td>${esc(x.title)}</td><td>${locText(x)}</td><td>${dlText(x)}</td><td class="muted">${esc(x.source)}</td><td class="nw"><button class="ghost sm" onclick="edit('${esc(x.id)}')">Edit</button> <button class="ghost sm" onclick="del('${esc(x.id)}')">Delete</button></td></tr>`).join('')}</tbody></table></div>${r.length>ashown?'<p class="more"><button class="ghost" onclick="ashown+=100;render()">Show more</button></p>':''}`}
$('aq').oninput=()=>{ashown=50;render()};
function edit(id){const i=L.findIndex(x=>String(x.id)===String(id));const x=i>=0?L[i]:{};openModal(`<h2>${i>=0?'Edit':'Add'} listing</h2><form id="eForm">${listingFormHTML(x)}<label>Source<input name="source" value="${esc(x.source||'Admin')}"></label><p><button>Save</button></p></form>`);
 $('eForm').onsubmit=e=>{e.preventDefault();const n=readListingForm(e.target,e.target.source.value||'Admin',{id:i>=0?x.id:nextId(),date_added:x.date_added});
  if(i>=0){n.industry=n.industry||x.industry;L[i]={...x,...n,past_term:x.past_term&&JSON.stringify(n.terms)===JSON.stringify(x.terms)}}else L.unshift(n);closeModal();save()}}
function del(id){const x=L.find(x=>String(x.id)===String(id));if(x&&confirm(`Delete ${x.company} — ${x.title}?`)){L=L.filter(o=>o!==x);save()}}
$('addNew').onclick=()=>edit('__new');
$('exportData').onclick=()=>{const srcs=[...new Set(L.map(x=>x.source))].sort();Store.download('data.json',{generated:new Date().toISOString().slice(0,10),schema:'v2',sources:srcs,count:L.length,internships:L})};
$('discard').onclick=()=>{if(confirm('Discard all local admin edits?')){Store.remove('adminListings');location.reload()}};
$('tpl').onclick=()=>{const h='company,title,industry,role_type,location,remote,deadline,season,year,class_years,apply_url,date_added,source,notes';const a=document.createElement('a');a.href='data:text/csv,'+encodeURIComponent(h+'\n');a.download='listings-template.csv';a.click()};
$('csv').onchange=async e=>{const f=e.target.files[0];if(!f)return;const rows=parseCSV(await f.text());let id=nextId();const ok=[],bad=[];
 rows.forEach((r,i)=>{const x=fromFlat(r,r.source||$('csvSrc').value||('CSV import: '+f.name));if(x.company&&x.title&&x.apply_url){x.id=id++;ok.push(x)}else bad.push(i+2)});
 const dup=new Set(L.map(x=>(x.company+'|'+x.title).toLowerCase()));const fresh=ok.filter(x=>!dup.has((x.company+'|'+x.title).toLowerCase()));
 $('csvOut').innerHTML=`<p>${rows.length} rows: <b>${fresh.length}</b> new, ${ok.length-fresh.length} duplicates skipped, ${bad.length} invalid (need company, title, http(s) link)${bad.length?' — rows '+bad.slice(0,20).join(', '):''}.</p>${fresh.length?'<button id="csvGo">Import '+fresh.length+' listings</button>':''}`;
 if(fresh.length)$('csvGo').onclick=()=>{L=fresh.concat(L);save();$('csvOut').innerHTML=`<p>Imported ${fresh.length} ✓</p>`};e.target.value=''};
function queueUI(){const q=Store.get('reviewQueue',[]);const p=q.filter(x=>x.queue_status==='pending');
 $('queue').innerHTML=p.length?p.map(x=>`<div class="qi"><div><b>${esc(x.company)}</b> — ${esc(x.title)}<div class="muted">${locText(x)} · ${dlText(x)} · ${x.apply_url?`<a href="${esc(x.apply_url)}" target="_blank" rel="noopener">verify link ↗</a>`:'no link'} · submitted ${esc((x.submitted||'').slice(0,10))}</div></div><div class="nw"><button class="sm" onclick="qAct('${esc(x.id)}','approved')">Approve</button> <button class="ghost sm" onclick="qAct('${esc(x.id)}','rejected')">Reject</button></div></div>`).join(''):'<p class="muted">Queue is empty.</p>'}
function qAct(id,st){const q=Store.get('reviewQueue',[]);const x=q.find(o=>o.id===id);if(!x)return;x.queue_status=st;x.reviewed=new Date().toISOString();Store.set('reviewQueue',q);
 if(st==='approved'){const {queue_status,submitted,reviewed,...clean}=x;L.unshift({...clean,id:nextId(),source:'User submission (approved)'});save()}queueUI();render()}
