/* Internship Deadline Radar V2 — step 1. All user data goes through Store (store.js). */
let D=[],BASE=[],view='cards',shown=60,profile=Store.get('profile',{});
const card=(x,extra='')=>`<article class="card"><div class="row"><span class="co">${esc(x.company)}</span><span class="badge b-${x.st}">${LBL[x.st]}</span></div><div class="role">${esc(x.title)}</div>
<div class="meta"><span>📍 ${locText(x)}</span><span>${esc(x.industry||'Industry not listed')}</span>${x.role_type&&x.role_type!=='Internship'?`<span>${esc(x.role_type)}</span>`:''}</div>
<div class="meta"><span>🗓 ${dlText(x)}</span><span class="cd">${cd(x)}</span><span>${termText(x)}</span></div><div class="meta"><span>🎓 ${yearsText(x)}</span>${x._mine?'<span class="mine">Added by you</span>':''}${extra}</div>
<div class="row">${applyBtn(x)}<span class="acts">${typeof trackBtns==='function'?trackBtns(x):''}<button class="ghost sm" onclick="connect('${esc(x.id)}')">Connect</button></span></div></article>`;
const cd=x=>{if(!x.deadline||x.st==='closed')return'';const n=days(x.deadline);return n===0?'Closes today':`${n} day${n==1?'':'s'} left`};
const applyBtn=x=>x.apply_url?`<a class="btn" href="${esc(x.apply_url)}" target="_blank" rel="noopener">Apply ↗</a>`:'<span class="nolink">Apply link not listed</span>';
// tabs
function go(t){document.querySelectorAll('.tabs button').forEach(o=>o.classList.toggle('on',o.dataset.t===t));document.querySelectorAll('main>section').forEach(s=>s.hidden=s.id!=='t-'+t);if(t==='foryou')match();if(location.hash!=='#'+t)history.replaceState(null,'','#'+t);window.scrollTo(0,0)}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>go(b.dataset.t));
document.addEventListener('click',e=>{const a=e.target.closest('[data-go]');if(a){e.preventDefault();go(a.dataset.go)}});
function openModal(h){$('mbody').innerHTML=h;$('modal').hidden=false}function closeModal(){$('modal').hidden=true}$('mx').onclick=closeModal;$('modal').onclick=e=>{if(e.target.id==='modal')closeModal()};
// export / import
function exportData(){Store.download(`internship-radar-data-${new Date().toISOString().slice(0,10)}.json`,Store.exportAll())}
$('exp').onclick=exportData;
$('imp').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const keys=Store.importAll(JSON.parse(await f.text()));alert(`Imported: ${keys.join(', ')||'nothing'}`);location.reload()}catch(err){alert('Import failed: '+err.message)}e.target.value=''};
$('clearAll').onclick=()=>{if(confirm('Delete everything you saved in this browser? Export first if you want a backup.')){Store.clear();location.reload()}};
// data
function mergeMine(){const mine=Store.get('myListings',[]).map(x=>({...prepare(x),_mine:true}));D=mine.concat(BASE)}
fetch('data.json').then(r=>r.json()).then(j=>{BASE=j.internships.map(prepare);mergeMine();
 const fill=(id,arr)=>arr.forEach(v=>$(id).add(new Option(v,v)));
 const IC={};D.forEach(x=>{if(x.industry)IC[x.industry]=(IC[x.industry]||0)+1});Object.keys(IC).sort().forEach(f=>$('fInd').add(new Option(`${f} (${IC[f]})`,f)));
 const S=new Set();D.forEach(x=>x._states.forEach(s=>S.add(s)));fill('fState',[...S].sort());
 fill('fType',ROLE_TYPES.filter(t=>D.some(x=>x.role_type===t)));fill('fYear',CLASS_YEARS);
 const live=D.filter(x=>!x.past_term&&x.st!=='closed');
 $('stats').innerHTML=`<div><b>${live.length.toLocaleString()}</b>open US listings</div><div><b>${D.filter(x=>x.deadline&&x.st!=='closed').length}</b>with a known deadline</div><div><b>${Object.keys(IC).length}</b>industries</div><div><b>${(j.sources||[]).length}</b>public sources</div>`;
 $('foot').innerHTML=`Free, no ads, no login. Data (updated ${esc(j.generated)}): ${(j.sources||[]).map(esc).join(' · ')}. US only. Missing details show as “not listed”. Always confirm on the employer's site before applying.`;
 ['q','fInd','fState','fType','fWin','fYear','fRemote','fHide','fPast'].forEach(i=>$(i).addEventListener('input',()=>{shown=60;render()}));
 $('hq').addEventListener('keydown',e=>{if(e.key==='Enter'){$('q').value=$('hq').value;go('find');render()}});
 savedUI();render();home();initPractice();initConnect();profileUI();addUI();
 trackerInit();matcherUI();const h=location.hash.slice(1);if(h&&$('t-'+h))go(h)}).catch(e=>{$('stats').textContent='Could not load listings: '+e.message});
$('vc').onclick=()=>{view='cards';$('vc').className='on';$('vt').className='';render()};$('vt').onclick=()=>{view='table';$('vt').className='on';$('vc').className='';render()};
$('moreBtn').onclick=()=>{shown+=90;render()};
const rank={closing_soon:0,open:1,not_open:2,closed:3};
function sortFn(a,b){const ad=a.deadline&&a.st!=='closed',bd=b.deadline&&b.st!=='closed';if(ad&&bd)return a.deadline.localeCompare(b.deadline);if(ad!==bd)return ad?-1:1;return (b._mine?1:0)-(a._mine?1:0)||rank[a.st]-rank[b.st]||(b.date_added||'').localeCompare(a.date_added||'')}
// filters
const FKEYS={q:'q',industry:'fInd',state:'fState',type:'fType',window:'fWin',classYear:'fYear',remote:'fRemote',hideClosed:'fHide',past:'fPast'};
const getF=()=>Object.fromEntries(Object.entries(FKEYS).map(([k,id])=>[k,$(id).type==='checkbox'?$(id).checked:$(id).value]));
function setF(f){Object.entries(FKEYS).forEach(([k,id])=>{const el=$(id);if(el.type==='checkbox')el.checked=k==='hideClosed'?f[k]!==false:!!f[k];else el.value=f[k]||''})}
function inWindow(x,w){const n=x.deadline?days(x.deadline):null;if(w==='week')return n!==null&&n>=0&&n<=7;if(w==='month')return n!==null&&n>=0&&n<=31;if(w==='dated')return n!==null&&n>=0;if(w==='rolling')return x.rolling;return true}
function filtered(f=getF()){const q=f.q.toLowerCase().trim().split(/\s+/).filter(Boolean);
 return D.filter(x=>{if(f.hideClosed&&x.st==='closed')return false;if(!f.past&&x.past_term)return false;if(f.industry&&x.industry!==f.industry)return false;
  if(f.state&&!x._states.includes(f.state))return false;if(f.type&&x.role_type!==f.type)return false;if(f.window&&!inWindow(x,f.window))return false;
  if(f.classYear&&!(x.class_years||[]).includes(f.classYear))return false;if(f.remote&&!x.remote)return false;return q.every(w=>x._t.includes(w))}).sort(sortFn)}
function render(){const r=filtered();$('count').textContent=`Showing ${Math.min(shown,r.length).toLocaleString()} of ${r.length.toLocaleString()} matching`+($('fYear').value?' · class-year filter only keeps listings that state eligible years':'');$('moreBtn').hidden=r.length<=shown;const v=r.slice(0,shown);
 if(!v.length){$('list').innerHTML='<p class="muted empty">No internships match those filters.</p>';return}
 $('list').innerHTML=view==='cards'?`<div class="grid">${v.map(x=>card(x)).join('')}</div>`:`<div class="tw"><table><thead><tr><th>Company</th><th>Role</th><th>Industry</th><th>Location</th><th>Deadline</th><th>Term</th><th>Class years</th><th></th></tr></thead><tbody>${v.map(x=>`<tr><td><b>${esc(x.company)}</b></td><td>${esc(x.title)}</td><td>${esc(x.industry||'')||NL}</td><td>${locText(x)}</td><td>${dlText(x)}<br><span class="badge b-${x.st}">${LBL[x.st]}</span></td><td>${termText(x)}</td><td>${yearsText(x)}</td><td>${applyBtn(x)}</td></tr>`).join('')}</tbody></table></div>`}
// saved filters: named, editable, deletable
function savedUI(){const s=Store.get('savedFilters',[]);$('savedList').innerHTML=s.map(x=>`<span class="sf"><button class="pill" onclick="applySaved('${x.id}')" title="Apply">${esc(x.name)}</button><button class="pill ic" title="Rename" onclick="renSaved('${x.id}')">✎</button><button class="pill ic" title="Replace with current filters" onclick="updSaved('${x.id}')">⟳</button><button class="pill ic" title="Delete" onclick="delSaved('${x.id}')">×</button></span>`).join('')}
const descF=f=>[f.q,f.industry,f.state,f.type,{week:'this week',month:'this month',dated:'dated',rolling:'rolling'}[f.window],f.classYear,f.remote&&'remote'].filter(Boolean).join(' · ');
$('saveF').onclick=()=>{const f=getF();const n=prompt('Name this search:',descF(f)||'My search');if(!n)return;const s=Store.get('savedFilters',[]);s.push({id:Store.uid(),name:n.trim(),filters:f,created:new Date().toISOString()});Store.set('savedFilters',s);savedUI()};
const modSaved=(id,fn)=>{const s=Store.get('savedFilters',[]);const i=s.findIndex(x=>x.id===id);if(i<0)return;fn(s,i);Store.set('savedFilters',s);savedUI()};
function applySaved(id){const x=Store.get('savedFilters',[]).find(o=>o.id===id);if(!x)return;setF(x.filters);shown=60;go('find');render()}
function renSaved(id){modSaved(id,(s,i)=>{const n=prompt('Rename search:',s[i].name);if(n)s[i].name=n.trim()})}
function updSaved(id){modSaved(id,(s,i)=>{if(confirm(`Replace “${s[i].name}” with the current filters?`))s[i].filters=getF()})}
function delSaved(id){modSaved(id,(s,i)=>{if(confirm(`Delete “${s[i].name}”?`))s.splice(i,1)})}
// home
function home(){const wk=D.filter(x=>x.st!=='closed'&&inWindow(x,'week')).sort(sortFn);
 if(wk.length){$('weekNote').textContent=`${wk.length} listing${wk.length>1?'s':''} close in the next 7 days.`;$('week').innerHTML=wk.slice(0,9).map(x=>card(x)).join('')}
 else{const nx=D.filter(x=>x.st!=='closed'&&inWindow(x,'dated')).sort(sortFn).slice(0,6);$('weekNote').textContent=`Nothing we know of closes in the next 7 days. Next known deadlines:`;$('week').innerHTML=nx.map(x=>card(x)).join('')||'<p class="muted">No upcoming deadlines listed.</p>'}
 $('weekNote').innerHTML+=` <span class="muted">Most sources don't publish deadlines, so many open roles aren't counted here. <a href="#" data-go="find">Browse all</a>.</span>`}
// profile
function profileUI(){const f=$('profForm');CLASS_YEARS.forEach(c=>f.classYear.add(new Option(c,c)));
 $('pInd').innerHTML=INDUSTRIES.filter(i=>i!=='Other').map(i=>`<label class="chk"><input type="checkbox" name="industries" value="${esc(i)}"> ${esc(i)}</label>`).join('');
 ['name','school','major','classYear','gpa','locations'].forEach(k=>f[k].value=profile[k]||'');f.querySelectorAll('[name=industries]').forEach(c=>c.checked=(profile.industries||[]).includes(c.value));
 f.onsubmit=e=>{e.preventDefault();const fd=new FormData(f);profile={...profile,...Object.fromEntries(['name','school','major','classYear','gpa','locations'].map(k=>[k,(fd.get(k)||'').trim()])),industries:fd.getAll('industries'),updated:new Date().toISOString()};
  Store.set('profile',profile);if(typeof match==='function')match();$('profMsg').textContent='Saved in this browser ✓';setTimeout(()=>$('profMsg').textContent='',2500)}}
// add an internship
function addUI(){$('addForm').innerHTML=listingFormHTML();mineUI();
 $('addForm').onsubmit=async e=>{e.preventDefault();const x=readListingForm(e.target,'User submission');if(!x.company||!x.title||!x.apply_url){$('addMsg').textContent='Company, title and a link are required.';return}
  await Submissions.submit(x);e.target.reset();$('addMsg').textContent='Saved to your list and queued for review ✓';mergeMine();mineUI();render();home()}}
function mineUI(){const m=Store.get('myListings',[]);$('mine').innerHTML=m.length?m.map(x=>card({...prepare(x),_mine:true},`<button class="ghost sm" onclick="delMine('${esc(x.id)}')">Remove</button>`)).join(''):'<p class="muted">Nothing added yet.</p>'}
function delMine(id){if(!confirm('Remove from your list? (Any pending review copy stays queued.)'))return;Store.set('myListings',Store.get('myListings',[]).filter(x=>x.id!==id));mergeMine();mineUI();render();home()}
const SKILLS=['excel','powerpoint','word','sql','python','java','javascript','typescript','react','c++','c#','r','tableau','power bi','matlab','sas','spss','aws','azure','git','linux','figma','adobe','photoshop','illustrator','canva','autocad','solidworks','salesforce','hubspot','google analytics','seo','social media','content','copywriting','marketing','sales','finance','accounting','financial modeling','valuation','bloomberg','quickbooks','audit','tax','banking','investment','wealth','real estate','statistics','machine learning','data analysis','analytics','research','writing','public speaking','leadership','project management','customer service','operations','supply chain','logistics','consulting','strategy','healthcare','clinical','biology','chemistry','lab','nursing','public health','policy','government','nonprofit','education','teaching','journalism','communications','video','design','ux','ui','product','spanish','french','crm','economics','risk','compliance','legal','hr','recruiting'];
const MAJORS=['finance','accounting','economics','business administration','business','marketing','management','computer science','data science','information technology','information systems','mathematics','statistics','engineering','mechanical engineering','electrical engineering','civil engineering','biology','chemistry','nursing','public health','psychology','communications','journalism','political science','international relations','english','graphic design','art','sociology','education','kinesiology','exercise science','sport management','criminal justice','history'];
async function readFile(f){const n=f.name.toLowerCase();if(n.endsWith('.txt'))return f.text();const buf=await f.arrayBuffer();
 if(n.endsWith('.pdf')){pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';const pdf=await pdfjsLib.getDocument({data:buf}).promise;let t='';for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i);t+=(await p.getTextContent()).items.map(o=>o.str+(o.hasEOL?'\n':' ')).join('')+'\n'}return t}
 if(n.endsWith('.docx'))return(await mammoth.extractRawText({arrayBuffer:buf})).value;throw new Error('Use PDF, DOCX or TXT')}
const TPL={"LinkedIn connection note (≤300 chars)":"Hi {contact}, I'm {name}, a student at {school} interested in the {role} internship at {company}. I'd love to hear how you got started there. Would you be open to a quick 15-minute chat?",
"Alumni email":"Subject: {school} student, quick question about {company}\n\nHi {contact},\n\nI'm {name}, a student at {school}. I saw you work at {company} and I'm applying for the {role} internship. Would you have 15 minutes in the next couple of weeks to share your experience and any advice?\n\nThank you,\n{name}",
"Follow-up (1 week later)":"Hi {contact}, just following up on my note last week. I know you're busy, so even 10 minutes to hear about your experience at {company} would mean a lot. Thanks again, {name}",
"Thank-you":"Hi {contact}, thank you for taking the time to talk today. Your advice about {company} was really helpful, and I've submitted my application for the {role} internship. I hope we can stay in touch. Best, {name}"};
const tpls=()=>Object.assign({},TPL,Store.get('tpls',{}));
function initConnect(){$('tpls').innerHTML=Object.entries(tpls()).map(([k,v],i)=>`<div class="tpl"><b>${esc(k)}</b> <button class="ghost sm" onclick="resetT(${i})">Reset</button><textarea rows="4" data-k="${esc(k)}">${esc(v)}</textarea></div>`).join('');
 $('tpls').querySelectorAll('textarea').forEach(t=>t.oninput=()=>{const s=Store.get('tpls',{});s[t.dataset.k]=t.value;Store.set('tpls',s)});contactsUI()}
function resetT(i){const k=Object.keys(TPL)[i];const s=Store.get('tpls',{});delete s[k];Store.set('tpls',s);initConnect()}
const fill=(t,x)=>t.replace(/\{name\}/g,profile.name||'[Your name]').replace(/\{school\}/g,profile.school||'[Your school]').replace(/\{company\}/g,x.company).replace(/\{role\}/g,x.title.replace(/\s+intern(ship)?$/i,'')).replace(/\{contact\}/g,'[First name]');
function connect(id){const x=D.find(o=>String(o.id)===String(id)),co=x.company.replace(/\s*\(.*?\)/g,'').split('/')[0].trim(),sch=profile.school||'[Your school]',L=k=>'https://www.linkedin.com/search/results/people/?keywords='+encodeURIComponent(k);
 const roleKw=x.title.replace(/\(.*?\)|summer|2026|2027|intern(ship)?|program|[—–-]/gi,' ').replace(/\s+/g,' ').trim().split(' ').slice(0,3).join(' ');
 openModal(`<h2>Connect: ${esc(x.company)}</h2><p class="muted">${esc(x.title)}</p><h3>Find people on LinkedIn</h3><div class="links">
 <a target="_blank" rel="noopener" href="${L(co+' '+sch)}">${esc(sch)} alumni at ${esc(co)} ↗</a><a target="_blank" rel="noopener" href="${L(co+' '+roleKw)}">${esc(co)} people in ${esc(roleKw||'this team')} ↗</a>
 <a target="_blank" rel="noopener" href="${L(co+' recruiter')}">${esc(co)} recruiters ↗</a><a target="_blank" rel="noopener" href="${L(co+' intern')}">Current / past ${esc(co)} interns ↗</a></div>
 <h3>Messages (filled in for this role)</h3>${Object.entries(tpls()).map(([k,v])=>`<div class="tpl"><b>${esc(k)}</b><textarea rows="4">${esc(fill(v,x))}</textarea><button class="ghost sm" onclick="navigator.clipboard.writeText(this.previousElementSibling.value);this.textContent='Copied'">Copy</button></div>`).join('')}
 <h3>Track a contact</h3><div class="crow"><input id="mcN" placeholder="Name"><input id="mcD" type="date"><button onclick="addContact({name:mcN.value,company:'${esc(co).replace(/'/g,"\\'")}',status:'To contact',next:mcD.value});this.textContent='Added'">Add</button></div>`)}
function addContact(c){if(!c.name)return;const a=Store.get('contacts',[]);a.push(c);Store.set('contacts',a);contactsUI()}
$('cForm').onsubmit=e=>{e.preventDefault();addContact(Object.fromEntries(new FormData(e.target)));e.target.reset()};
function contactsUI(){const a=Store.get('contacts',[]).map((c,i)=>({...c,i})).sort((x,y)=>(x.next||'9').localeCompare(y.next||'9'));const ST=['To contact','Messaged','Replied','Call scheduled','Thanked'];
 $('cBody').innerHTML=a.length?a.map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.company)}</td><td><select onchange="updC(${c.i},'status',this.value)">${ST.map(s=>`<option${s===c.status?' selected':''}>${s}</option>`).join('')}</select></td><td><input type="date" value="${esc(c.next)}" onchange="updC(${c.i},'next',this.value)">${c.next&&days(c.next)<=0?' <span class="cd">due</span>':''}</td><td><button class="ghost sm" onclick="updC(${c.i})">Remove</button></td></tr>`).join(''):'<tr><td colspan="5" class="muted">No contacts yet. Use Connect on any internship or add one above.</td></tr>'}
function updC(i,k,v){const a=Store.get('contacts',[]);if(k)a[i][k]=v;else a.splice(i,1);Store.set('contacts',a);contactsUI()}
// practice
let timer,qLeft,cur;
function initPractice(){Object.keys(QB.technical).forEach(f=>$('qField').add(new Option(f,f)));histUI()}
function pick(){const t=$('qType').value,b=t==='technical'?QB.technical[$('qField').value]:QB[t];return b[Math.floor(Math.random()*b.length)]}
function startQ(){clearInterval(timer);cur={q:pick(),type:$('qType').value,field:$('qField').value,rating:0};$('qText').textContent=cur.q;$('qNotes').value='';$('qDone').textContent='';$('qCard').hidden=false;stars();qLeft=+$('qTime').value;tick();timer=setInterval(tick,1000)}
function tick(){$('qClock').textContent=`${Math.floor(qLeft/60)}:${String(qLeft%60).padStart(2,'0')}`;$('qClock').classList.toggle('low',qLeft<=15);if(qLeft--<=0){clearInterval(timer);$('qDone').textContent="Time's up. Rate yourself, then try the next one.";}}
function stars(){$('stars').innerHTML=[1,2,3,4,5].map(n=>`<button class="${n<=cur.rating?'on':''}" onclick="cur.rating=${n};stars();saveQ()">★</button>`).join('')}
function saveQ(){const h=Store.get('practice',[]);h.unshift({q:cur.q,r:cur.rating,n:$('qNotes').value,d:new Date().toLocaleDateString()});Store.set('practice',h.slice(0,50));histUI()}
function histUI(){const h=Store.get('practice',[]);if(h.length)$('qHist').innerHTML=h.slice(0,10).map(x=>`<div>${'★'.repeat(x.r)}${'☆'.repeat(5-x.r)} · ${esc(x.q)} <span class="muted">(${esc(x.d)})</span></div>`).join('')}
$('qStart').onclick=startQ;$('qNext').onclick=()=>{if(cur&&!cur.rating&&$('qNotes').value)saveQ();startQ()};

function trackerInit(){$('tb').onclick=()=>{tView='board';$('tb').className='on';$('tl').className='';trackerRefresh()};$('tl').onclick=()=>{tView='list';$('tl').className='on';$('tb').className='';trackerRefresh()};$('ics').onclick=exportICS;trackerRefresh()}
