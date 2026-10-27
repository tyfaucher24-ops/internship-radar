/* Admin (client-side only). Working copy of listings kept in localStorage until exported as data/manual.json. */
let META={},L=[],ashown=50;
const sha=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,'0')).join('');
function openModal(h){$('mbody').innerHTML=h;$('modal').hidden=false}function closeModal(){$('modal').hidden=true}$('mx').onclick=closeModal;
$('gForm').onsubmit=async e=>{e.preventDefault();if(window.Cloud&&Cloud.enabled)return;if(await sha('idr-salt:'+$('pw').value)===window.ADMIN_HASH){sessionStorage.setItem('idr_admin','1');unlock()}else $('gMsg').textContent='Wrong password.'};
$('logout').onclick=()=>{sessionStorage.removeItem('idr_admin');location.reload()};
async function unlock(){$('gate').hidden=true;$('adm').hidden=false;$('logout').hidden=false;
 const j=await (await fetch('data/manual.json')).json();META={};const w=Store.get('adminListings',null);L=w||j;$('dirty').textContent=w?'You have unsaved local edits. Export manual.json, commit it to data/ and the next sync publishes it.':'';render();queueUI();loadCfg();healthUI();dashUI()}
/* V16 Phase 3: when accounts are on, the page opens only for a signed-in user with the Supabase admin role
   (public.admins, granted in the Supabase SQL editor). The old password and the session flag are ignored. */
if(window.Cloud&&Cloud.enabled){$('gForm').hidden=true;sessionStorage.removeItem('idr_admin');
  $('gMsg').textContent='Checking your account…';
  Cloud.ready.then(Cloud.isAdmin).then(ok=>{if(ok){$('logout').onclick=async()=>{await Cloud.signOut();location.href='./'};unlock()}
    else $('gMsg').innerHTML=Cloud.signedIn()?'This account is not an admin.':'Sign in with an admin account first: <a href="./#signin">sign in</a>, then come back here.'})}
else if(sessionStorage.getItem('idr_admin'))unlock();
const save=()=>{Store.set('adminListings',L);$('dirty').textContent='Local edits saved in this browser. Export manual.json, commit it to data/ and the next sync publishes it.';render()};
const nextId=()=>L.reduce((m,x)=>typeof x.id==='number'?Math.max(m,x.id):m,-1)+1;
function render(){const q=$('aq').value.toLowerCase().split(/\s+/).filter(Boolean);const r=L.filter(x=>{const t=(x.company+' '+x.title+' '+(x.location_text||'')+' '+x.source).toLowerCase();return q.every(w=>t.includes(w))});
 $('aStats').innerHTML=`<div><b>${L.length.toLocaleString()}</b>listings</div><div><b>${Store.get('reviewQueue',[]).filter(x=>x.queue_status==='pending').length}</b>pending review</div><div><b>${new Set(L.map(x=>x.source)).size}</b>sources</div>`;
 $('aList').innerHTML=`<p class="muted">${r.length.toLocaleString()} shown${r.length>ashown?` (first ${ashown})`:''}</p><div class="tw"><table><thead><tr><th>Company</th><th>Title</th><th>Location</th><th>Deadline</th><th>Source</th><th></th></tr></thead><tbody>${r.slice(0,ashown).map(x=>`<tr><td><b>${esc(x.company)}</b></td><td>${esc(x.title)}</td><td>${locText(x)}</td><td>${dlText(x)}</td><td class="muted">${esc(x.source)}</td><td class="nw"><button class="ghost sm" data-act="aEdit" data-id="${esc(x.id)}">Edit</button> <button class="ghost sm" data-act="aDel" data-id="${esc(x.id)}">Delete</button></td></tr>`).join('')}</tbody></table></div>${r.length>ashown?'<p class="more"><button class="ghost" data-act="aMore">Show more</button></p>':''}`}
$('aq').oninput=()=>{ashown=50;render()};
function edit(id){const i=L.findIndex(x=>String(x.id)===String(id));const x=i>=0?L[i]:{};openModal(`<h2>${i>=0?'Edit':'Add'} listing</h2><form id="eForm">${listingFormHTML(x)}<label>Source<input name="source" value="${esc(x.source||'Admin')}"></label><p><button>Save</button></p></form>`);
 $('eForm').onsubmit=e=>{e.preventDefault();const n=readListingForm(e.target,e.target.source.value||'Admin',{id:i>=0?x.id:nextId(),date_added:x.date_added});
  if(i>=0){n.industry=n.industry||x.industry;L[i]={...x,...n,past_term:x.past_term&&JSON.stringify(n.terms)===JSON.stringify(x.terms)}}else L.unshift(n);closeModal();save()}}
function del(id){const x=L.find(x=>String(x.id)===String(id));if(x&&confirm(`Delete ${x.company} — ${x.title}?`)){L=L.filter(o=>o!==x);save()}}
$('addNew').onclick=()=>edit('__new');
$('exportData').onclick=()=>Store.download('manual.json',L);
$('discard').onclick=()=>{if(confirm('Discard all local admin edits?')){Store.remove('adminListings');location.reload()}};
$('tpl').onclick=()=>{const h='company,title,industry,role_type,location,remote,deadline,season,year,class_years,apply_url,date_added,source,notes';const a=document.createElement('a');a.href='data:text/csv,'+encodeURIComponent(h+'\n');a.download='listings-template.csv';a.click()};
$('csv').onchange=async e=>{const f=e.target.files[0];if(!f)return;const rows=parseCSV(await f.text());let id=nextId();const ok=[],bad=[];
 rows.forEach((r,i)=>{const x=fromFlat(r,r.source||$('csvSrc').value||('CSV import: '+f.name));if(x.company&&x.title&&x.apply_url){x.id=id++;ok.push(x)}else bad.push(i+2)});
 const dup=new Set(L.map(x=>(x.company+'|'+x.title).toLowerCase()));const fresh=ok.filter(x=>!dup.has((x.company+'|'+x.title).toLowerCase()));
 $('csvOut').innerHTML=`<p>${rows.length} rows: <b>${fresh.length}</b> new, ${ok.length-fresh.length} duplicates skipped, ${bad.length} invalid (need company, title, http(s) link)${bad.length?' — rows '+bad.slice(0,20).join(', '):''}.</p>${fresh.length?'<button id="csvGo">Import '+fresh.length+' listings</button>':''}`;
 if(fresh.length)$('csvGo').onclick=()=>{L=fresh.concat(L);save();$('csvOut').innerHTML=`<p>Imported ${fresh.length} ✓</p>`};e.target.value=''};
function queueUI(){const q=Store.get('reviewQueue',[]);const p=q.filter(x=>x.queue_status==='pending');
 $('queue').innerHTML=p.length?p.map(x=>`<div class="qi"><div><b>${esc(x.company)}</b> — ${esc(x.title)}<div class="muted">${locText(x)} · ${dlText(x)} · ${x.apply_url?`<a href="${esc(safeUrl(x.apply_url))}" target="_blank" rel="noopener">verify link ↗</a>`:'no link'} · submitted ${esc((x.submitted||'').slice(0,10))}</div></div><div class="nw"><button class="sm" data-act="aQ" data-id="${esc(x.id)}" data-v="approved">Approve</button> <button class="ghost sm" data-act="aQ" data-id="${esc(x.id)}" data-v="rejected">Reject</button></div></div>`).join(''):'<p class="muted">Queue is empty.</p>'}
function qAct(id,st){const q=Store.get('reviewQueue',[]);const x=q.find(o=>o.id===id);if(!x)return;x.queue_status=st;x.reviewed=new Date().toISOString();Store.set('reviewQueue',q);
 if(st==='approved'){const {queue_status,submitted,reviewed,...clean}=x;L.unshift({...clean,id:nextId(),source:'User submission (approved)'});save()}queueUI();render()}
/* ---------- matcher config editor ---------- */
let C=null;
async function loadCfg(){const base=await (await fetch('config.json')).json();C=Store.get('adminConfig',null)||base;cfgUI()}
const cfgSave=()=>{Store.set('adminConfig',C);cfgUI()};
const ph=o=>o&&(o.placeholder||o._placeholder)?'<span class="badge b-closing_soon">PLACEHOLDER</span>':'';
function tableEd(key,cols){const rows=C[key]||[];return `<div class="tw"><table><thead><tr>${cols.map(c=>`<th>${c[1]}</th>`).join('')}<th></th></tr></thead><tbody>${rows.map((r,i)=>`<tr>${cols.map(([k,,t])=>`<td>${t==='bool'?`<input type="checkbox" data-k="${key}" data-i="${i}" data-f="${k}"${r[k]?' checked':''}>`:`<input data-k="${key}" data-i="${i}" data-f="${k}" ${t==='num'?'type="number" step="0.01"':''} value="${esc(r[k]??'')}">`}</td>`).join('')}<td class="nw">${ph(r)} <button class="ghost sm" data-act="aRowDel" data-key="${key}" data-i="${i}">×</button></td></tr>`).join('')}</tbody></table></div><button class="ghost sm" data-act="aRowAdd" data-key="${key}">+ Row</button>`}
function kvEd(path,obj){return `<div class="kv">${Object.entries(obj).filter(([k])=>!k.startsWith('_')).map(([k,v])=>`<label>${esc(k)}<input data-path="${path}" data-f="${esc(k)}" ${typeof v==='number'?'type="number"':''} value="${esc(v)}"></label>`).join('')}</div>`}
function cfgUI(){$('cfg').innerHTML=`<h3>Firm tiers &amp; GPA bars</h3><p class="muted">Firm name must match the listing's company. Tier 1 = most selective.</p>${tableEd('firmTiers',[['firm','Firm'],['tier','Tier (1-3)','num'],['gpaBar','GPA bar','num'],['targetSchoolsOnly','Mostly target schools','bool']])}
 <h3>Target schools per industry</h3><p class="muted">Schools separated by ;</p>${tableEd('targetSchools',[['industry','Industry'],['schools','Schools']])}
 <h3>Default GPA bar per industry</h3>${tableEd('industryGpaBars',[['industry','Industry'],['gpaBar','GPA bar','num']])}
 <h3>Match % weights</h3><p class="muted">Set in match-weights.json in the repo (Fit 45% · Odds 40% · Preferences 15%).</p>
 
 <h3>Industry keywords</h3><p class="muted">Comma separated skills that count toward Fit for each industry.</p>${kvEd('industryKeywords',C.industryKeywords)}
 <h3>Major → industry</h3>${kvEd('majorIndustries',C.majorIndustries)}`;
 $('cfg').querySelectorAll('input[data-k]').forEach(el=>el.onchange=()=>{const r=C[el.dataset.k][+el.dataset.i];r[el.dataset.f]=el.type==='checkbox'?el.checked:el.type==='number'?(el.value===''?null:+el.value):el.value.trim();delete r.placeholder;Store.set('adminConfig',C)});
 $('cfg').querySelectorAll('input[data-path]').forEach(el=>el.onchange=()=>{const o=el.dataset.path.split('.').reduce((a,k)=>a[k],C);o[el.dataset.f]=el.type==='number'?+el.value:el.value;Store.set('adminConfig',C)})}
$('cfgExport').onclick=()=>Store.download('config.json',C);
$('cfgReset').onclick=()=>{if(confirm('Discard config edits?')){Store.remove('adminConfig');loadCfg()}};

/* ---------- V4: data health, review, missing companies, registry ---------- */
const J=u=>fetch(u,{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
/* V15 addendum 2: the public "Live" badge hides when the last successful sync is over 60 minutes old; log that here */
function liveAdmin(m){const t=Date.parse(m.updated||''),min=isNaN(t)?Infinity:(Date.now()-t)/6e4,stale=min>60;let L=[];try{L=JSON.parse(localStorage.getItem('liveStaleLog')||'[]')}catch(e){}
 if(stale&&!L.some(x=>x.sync===(m.updated||null))){L.push({sync:m.updated||null,at:new Date().toISOString(),from:'admin'});try{localStorage.setItem('liveStaleLog',JSON.stringify(L.slice(-20)))}catch(e){}}
 return `<p id="liveAdmin" class="${stale?'warn':'muted'}"><b>Live badge: ${stale?'hidden (last successful sync is over 60 minutes old)':'shown (last sync within 60 minutes)'}</b> · sync mode ${esc(m.mode||'full')}${m.conditional?` · conditional requests ${m.conditional.sent}, not modified ${m.conditional.not_modified}`:''}</p>${L.length?`<details><summary>Stale-sync log (${L.length})</summary><ul class="small">${L.slice().reverse().map(x=>`<li>badge hidden at ${esc(new Date(x.at).toLocaleString())}; last sync ${x.sync?esc(new Date(x.sync).toLocaleString()):'unknown'}</li>`).join('')}</ul></details>`:''}`}
async function healthUI(){const [h,m,rv,ms]=await Promise.all([J('data/health.json'),J('data/meta.json'),J('data/review.json'),J('data/missing.json')]);const el=$('health');
 if(!h||!m){el.innerHTML='<p class="muted">No health data yet (the sync has not run).</p>';return}
 const ad=Object.entries(h.adapters||{}).sort((a,b)=>b[1].postings-a[1].postings);
 el.innerHTML=`<div class="stats"><div class="stat"><b>${(m.open||0).toLocaleString()}</b><span>open + verified 24h</span></div><div class="stat"><b>${(m.open_all||0).toLocaleString()}</b><span>open (all)</span></div><div class="stat"><b>${h.pct_verified_24h}%</b><span>verified in 24h</span></div><div class="stat"><b>${h.deadline_coverage_pct}%</b><span>with a deadline</span></div><div class="stat"><b>${h.stale}</b><span>stale</span></div><div class="stat"><b>${h.duplicate_rate_pct}%</b><span>possible duplicates</span></div><div class="stat"><b>${h.review_queue}</b><span>review queue</span></div><div class="stat"><b>${(m.upcoming||0).toLocaleString()}</b><span>upcoming predictions</span></div></div>
 ${liveAdmin(m)}<p class="muted">Last sync ${new Date(m.updated).toLocaleString()} (${m.duration_s||'?'}s) · ${m.companies_tracked} companies tracked, ${m.companies_with_listings} with open listings${m.last_error?` · <b style="color:#b42318">last error: ${esc(m.last_error)}</b>`:''}${m.linkcheck?` · link check ${new Date(m.linkcheck.at).toLocaleString()}: ${m.linkcheck.live} live, ${m.linkcheck.dead} closed, ${m.linkcheck.unknown} unknown`:''}</p>
 <div class="tw"><table><thead><tr><th>Source</th><th>Boards</th><th>Sync success</th><th>Postings</th><th>Errors (sample)</th></tr></thead><tbody>${ad.map(([k,v])=>`<tr><td>${esc(k)}</td><td>${v.boards}</td><td>${v.boards?Math.round(100*v.ok/v.boards):0}%</td><td>${v.postings}</td><td><details><summary>${v.errors.length}</summary>${v.errors.map(esc).join('<br>')}</details></td></tr>`).join('')}</tbody></table></div>
 <h3>By category</h3><p>${Object.entries(h.by_category||{}).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${esc(k)} <b>${v}</b>`).join(' · ')}</p>
 <h3>By source type</h3><p>${Object.entries(h.listings_by_source_type||{}).map(([k,v])=>`${esc(k)} <b>${v}</b>`).join(' · ')}</p>
 <h3>Gap report</h3><p>Categories under 25 open listings: ${(h.gap_report?.categories_under_25||[]).map(esc).join(', ')||'none'}. Registry companies with no open listings: ${h.gap_report?.companies_in_registry_without_listings??'?'}.</p>`;
 const R=(rv||[]).slice(0,300);$('review').innerHTML=`<p class="muted">${(rv||[]).length} postings the intern detector was unsure about (not published). Add clear ones to data/manual.json.</p>`+(R.length?`<div class="tw"><table><thead><tr><th>Company</th><th>Title</th><th>Why</th></tr></thead><tbody>${R.map(r=>`<tr><td>${esc(r.company)}</td><td>${r.url?`<a href="${esc(safeUrl(r.url))}" target="_blank" rel="noopener">${esc(r.title)}</a>`:esc(r.title)}</td><td>${esc(r.reason||'')}</td></tr>`).join('')}</tbody></table></div>`:'');
 const loc=Store.get('missingQueue',[]);const all=[...loc.map(x=>({company:x.company,body:`${x.careers||''} · seen on ${x.where}${x.role?' · '+x.role:''}`,url:'',state:'this browser',at:x.at})),...(ms||[])];
 $('missing').innerHTML=all.length?`<div class="tw"><table><thead><tr><th>Company</th><th>Details</th><th>From</th></tr></thead><tbody>${all.map(x=>`<tr><td>${esc(x.company)}</td><td class="small">${esc(x.body).slice(0,200)}</td><td>${x.url?`<a href="${esc(safeUrl(x.url))}" target="_blank" rel="noopener">GitHub (${esc(x.state)})</a>`:esc(x.state)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">No missing-company requests yet.</p>'}
$('regGo').onclick=()=>{const rows=$('regIn').value.split('\n').map(l=>l.trim()).filter(Boolean);const out=['name,domain,ats,slug,size,industry,hq_state,careers_url,discovered_via,notes'];const bad=[];
 const det=u=>{let m;if(m=u.match(/boards(?:-api)?\.greenhouse\.io\/(?:v1\/boards\/)?([\w-]+)|job-boards\.greenhouse\.io\/([\w-]+)/))return['greenhouse',m[1]||m[2]];if(m=u.match(/jobs\.lever\.co\/([\w.-]+)/))return['lever',m[1]];if(m=u.match(/jobs\.ashbyhq\.com\/([\w.%-]+)/))return['ashby',m[1]];
  if(m=u.match(/(?:jobs|careers)\.smartrecruiters\.com\/([\w-]+)/))return['smartrecruiters',m[1]];if(m=u.match(/apply\.workable\.com\/([\w-]+)/))return['workable',m[1]];if(m=u.match(/([\w-]+)\.recruitee\.com/))return['recruitee',m[1]];if(m=u.match(/([\w-]+)\.bamboohr\.com/))return['bamboohr',m[1]];
  if(m=u.match(/([\w-]+)\.(wd\d+)\.myworkdayjobs\.com\/(?:[a-z]{2}-[A-Z]{2}\/)?([\w-]+)/))return['workday',`${m[1]}|${m[2]}|${m[3]}`];return['jsonld',u]};
 rows.forEach(l=>{const [name,url,industry='',size='']=l.split(',').map(s=>s.trim());if(!name||!/^https?:/.test(url||'')){bad.push(l);return}const [ats,slug]=det(url);const q=v=>/[",]/.test(v)?`"${v.replace(/"/g,'""')}"`:v;out.push([name,'',ats,slug,size,industry,'',url,'admin bulk add',''].map(q).join(','))});
 $('regOut').innerHTML=`<p>${out.length-1} rows ready${bad.length?`, ${bad.length} skipped (need “Name, https://careers-url”)`:''}. Append them to <code>data/companies.csv</code>; the next sync picks them up.</p>`;if(out.length>1)Store.download('companies-additions.csv',out.join('\n')+'\n')};

/* V16 CSP: delegated actions (store.js dispatches data-act clicks) instead of inline onclick */
Object.assign(window.ACT,{aEdit:b=>edit(b.dataset.id),aDel:b=>del(b.dataset.id),aMore:()=>{ashown+=100;render()},aQ:b=>qAct(b.dataset.id,b.dataset.v),
 aRowDel:b=>{C[b.dataset.key].splice(+b.dataset.i,1);cfgSave()},aRowAdd:b=>{(C[b.dataset.key]=C[b.dataset.key]||[]).push({});cfgSave()}});

/* ---------- V16.5: launch dashboard (sync health from status.json; signups, usage, reports, errors from Supabase admin_stats) ---------- */
async function dashUI(){const el=$('dash');if(!el)return;const e=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let st=null;try{st=await (await fetch('data/status.json?t='+Date.now())).json()}catch{}
 const age=st&&st.last_success_at?Math.round((Date.now()-Date.parse(st.last_success_at))/60000):null;
 let h=`<h3>Sync</h3><p>${st?`Last good sync <b>${age} min ago</b> · ${st.last_run_ok?'last run OK':'<b>last run failed</b>'} · ${st.consecutive_failures||0} failures in a row · ${(st.open_listings||0).toLocaleString()} open listings · mode ${e(st.mode)}`:'No status.json yet.'}</p>`;
 if(!(window.Cloud&&Cloud.enabled&&Cloud.signedIn())){el.innerHTML=h+'<p class="muted">Sign in with your admin account to see signups, usage and reports.</p>';return}
 let d;try{d=await Cloud.rpc('admin_stats')}catch(x){el.innerHTML=h+`<p class="muted">${x.status===404?'Usage and reports need migration 0003 (supabase/migrations/20261027000003_feedback_analytics.sql). Run it once in the Supabase SQL editor.':'Could not load stats: '+e(x.message)}</p>`;return}
 const u=d.usage_7d||{};const k=(n,l)=>`<div class="stat"><b>${(+n||0).toLocaleString()}</b><span>${l}</span></div>`;
 h+=`<h3>Last 7 days</h3><div class="stats">${k(d.users,'accounts')}${k(d.signups_7d,'new accounts')}${k(u.pageview,'page views')}${k(u.save,'saves')}${k(u.apply_click,'Apply clicks')}${k(u.resume_upload,'resume uploads')}${k(u.feedback_view,'feedback views')}${k(d.reports_open,'open reports')}${k(d.errors_24h,'errors (24h)')}</div>`;
 const rr=d.reports_recent||[];h+=`<h3>Recent reports</h3>${rr.length?`<table class="tbl"><thead><tr><th>When</th><th>Kind</th><th>Listing</th><th>Note</th><th>Status</th></tr></thead><tbody>${rr.map(r=>`<tr><td>${e(new Date(r.created_at).toLocaleString())}</td><td>${e(r.kind)}</td><td>${e(r.listing_id||'—')}</td><td>${e(r.note||'')}</td><td>${e(r.status)}</td></tr>`).join('')}</tbody></table>`:'<p class="muted">No reports yet.</p>'}`;
 const er=d.errors_recent||[];h+=`<h3>Top errors (7 days)</h3>${er.length?`<ul>${er.map(x=>`<li><code>${e(x.msg)}</code> × ${+x.n}</li>`).join('')}</ul>`:'<p class="muted">No errors logged.</p>'}`;
 el.innerHTML=h}
