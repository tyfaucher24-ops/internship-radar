/* V13 onboarding: the five-step "Build my profile" flow on the intro (specs/V13.md, APPROVED INTRO).
   Everything is saved on this device only. Matches on the last step are real, graded listings. */
(function(){
const intro=document.getElementById('intro');if(!intro||!intro.classList.contains('v13'))return;
const $o=id=>document.getElementById(id),card=$o('obCard'),skipAll=$o('obSkipAll');
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* ---- live ticker: real "added" events from changes.json ---- */
(async function(){try{const r=await fetch('data/changes.json'+(self.BV||''));if(!r.ok)return;const c=await r.json();
 const A=(c.events||[]).filter(e=>e.co&&e.ti),N=A.filter(e=>e.k==='new').slice(0,30),C=A.filter(e=>e.k==='closed').slice(0,10),ev=[];while(N.length||C.length){ev.push(...N.splice(0,2));C.length&&ev.push(C.shift())}const T=t=>t.length>44?t.slice(0,43).trim()+'…':t;if(!ev.length)return;
 const one=ev.map(e=>`<span class="tk-i"><span class="${e.k==='new'?'up':'dn'}">${e.k==='new'?'▲':'▼'}</span> <span class="tk-co">${E(e.co)}</span> · ${E(T(e.ti))} · ${e.k==='new'?'added':'closed'}</span>`).join('');
 const tr=$o('iTkTrack');tr.innerHTML=one+one;tr.style.setProperty('--tk-dur',Math.max(40,ev.length*4)+'s');$o('iTk').hidden=false}catch(e){}})();
/* ---- the draft we edit: the same PF draft the Profile page uses ---- */
const D0=()=>{const p=(typeof PF!=='undefined'&&PF)||{v:6};p.experience=p.experience||[];p.skills=p.skills||[];p.locations=p.locations||[];p.industries=p.industries||[];return p};
function persist(){const p=D0();try{Store.set('profileDraft',p)}catch(e){}try{typeof pfRender==='function'&&pfRender()}catch(e){}}
const YEARS=[2027,2028,2029,2030],YCLS={2027:'Senior',2028:'Junior',2029:'Sophomore',2030:'Freshman'};
const INT=[['Investment Banking','Finance & Banking'],['Private Equity','Finance & Banking'],['Quant','Quant & Trading'],['Software Engineering','Software & IT'],['Consulting','Consulting & Strategy'],['Data','Data & AI'],['Product','Product Management'],['Marketing','Marketing & Sales'],['Accounting','Accounting & Audit']];
const LOCS=['New York, NY','Charlotte, NC','Boston, MA','Chicago, IL','San Francisco, CA','Washington, DC'];
const ATH=[['D1 Athlete','NCAA Division I Athlete'],['Club sport','Club sport'],['Intramural','Intramural sports']];
const CLUBS=['Finance Club','Investment Club','Team captain','Student government'];
let step=0,pickedInt=null,SCH=null;
const P=n=>`<div class="prog" aria-hidden="true">${[1,2,3,4,5].map(i=>`<span class="${i<=n?'on':''}"></span>`).join('')}</div><div class="stp"><span>Step ${n} of 5</span><span>Saved on this device</span></div>`;
const FT=(l='Continue')=>`<div class="foot"><button type="button" class="sk" data-ob="skip">Skip this step</button><div class="r"><button type="button" class="btn gh" data-ob="back">Back</button><button type="button" class="btn pri" data-ob="next">${l}</button></div></div>`;
const chip=(label,on,data)=>`<button type="button" class="chip${on?' on':''}" aria-pressed="${on?'true':'false'}" ${data}>${E(label)}</button>`;
function hasExp(t){return D0().experience.some(e=>(e.title||'').toLowerCase()===t.toLowerCase())}
function render(n){const p=D0();let h='';
 if(n===1)h=P(1)+`<h2 id="obH">Start with your resume</h2><p class="lead">Optional. We'll prefill the next steps for you.</p><label class="drop" id="obDrop"><div class="ic" aria-hidden="true">📄</div><b>Drop your resume here</b><p>PDF or DOCX · parsed in your browser — never uploaded</p><span class="btn gh" role="button">Choose file</span><input type="file" id="obFile" accept=".pdf,.docx,.txt" aria-label="Choose your resume file"></label><p class="rstat" id="obRs" role="status"></p>`+FT();
 if(n===2){const y=(p.gradDate||'').slice(0,4);h=P(2)+`<h2 id="obH">Your school</h2><p class="lead">Used to grade how well you match each internship.</p><label for="obSchool">School</label><div class="sugg"><input class="in" id="obSchool" autocomplete="off" placeholder="Start typing your school" value="${E(p.school)}" role="combobox" aria-expanded="false" aria-controls="obSL" aria-autocomplete="list"><ul id="obSL" role="listbox" hidden></ul></div><div class="row"><div><label for="obMajor">Major</label><input class="in" id="obMajor" placeholder="e.g. Finance" value="${E(p.major)}"></div><div><label for="obGpa">GPA (optional)</label><input class="in" id="obGpa" inputmode="decimal" placeholder="e.g. 3.5" value="${E(p.gpa)}"></div></div><p class="err" id="obErr" hidden></p><span class="lab" id="obYL">Class year</span><div class="chips" role="group" aria-labelledby="obYL">${YEARS.map(Y=>chip(String(Y),y===String(Y),`data-year="${Y}"`)).join('')}</div>`+FT()}
 if(n===3){if(!pickedInt)pickedInt=new Set(INT.filter(i=>p.industries.includes(i[1])).map(i=>i[0]));
  const locs=[...new Set(LOCS.concat(p.locations))];h=P(3)+`<h2 id="obH">What are you looking for?</h2><p class="lead">Pick as many as you like.</p><span class="lab" id="obIL">Interests</span><div class="chips" role="group" aria-labelledby="obIL">${INT.map(i=>chip(i[0],pickedInt.has(i[0]),`data-int="${E(i[0])}"`)).join('')}</div><span class="lab" id="obLL">Locations</span><div class="chips" role="group" aria-labelledby="obLL">${locs.map(l=>chip(l,p.locations.includes(l),`data-loc="${E(l)}"`)).join('')}${chip('Remote ok',!!p.remoteOK,'data-remote="1"')}</div>`+FT()}
 if(n===4){const ex=p.experience.filter(e=>!ATH.some(a=>a[1]===e.title)&&!CLUBS.includes(e.title));const extra=p.experience.filter(e=>e.kind==='Club'&&!ATH.some(a=>a[1]===e.title)&&!CLUBS.includes(e.title)&&!e.org).map(e=>e.title);
  h=P(4)+`<h2 id="obH">Your experience</h2><p class="lead">Internships, jobs, leadership and athletics all count.</p><label for="obExp">Experience</label><ul class="exl">${ex.map((e,i)=>`<li><span>${E([e.org,e.title].filter(Boolean).join(' · '))}</span><button type="button" data-rmx="${E(e.title)}" aria-label="Remove ${E(e.title)}">×</button></li>`).join('')}</ul><input class="in" id="obExp" placeholder="Firm · Role · Season, then press Enter"><span class="lab" id="obAL">Athletics</span><div class="chips" role="group" aria-labelledby="obAL">${ATH.map(a=>chip(a[0],hasExp(a[1]),`data-ath="${E(a[1])}"`)).join('')}</div><span class="lab" id="obCL">Clubs &amp; leadership</span><div class="chips" role="group" aria-labelledby="obCL">${CLUBS.map(c=>chip(c,hasExp(c),`data-club="${E(c)}"`)).join('')}<button type="button" class="chip add" id="obAddC">+ Add</button></div>`+FT()}
 if(n===5)h=P(5)+`<h2 id="obH">Your top matches</h2><p class="lead">Graded against your profile.</p><div id="obM" role="status" aria-live="polite"><p class="lead">Grading internships…</p></div><div class="foot"><button type="button" class="sk" data-ob="ap" id="obAp">Start Autopilot for these</button><div class="r"><button type="button" class="btn pri" data-ob="all">See all my matches →</button></div></div>`;
 card.innerHTML=h;card.className='obcard'+(n===5?' wide s-tall':'');card.hidden=false;void card.offsetWidth;card.classList.add('in');
 intro.className=intro.className.replace(/\bs\d\b|\breveal\b/g,'').trim()+' s'+n+(n===5?' reveal':'');
 wire(n);const f=$o('obH');f&&(f.tabIndex=-1,f.focus({preventScroll:true}));if(n===5)reveal()}
function show(n){step=n;skipAll.hidden=false;intro.classList.add('ob');if(card.hidden||RM){render(n);return}card.classList.add('out');setTimeout(()=>render(n),RM?0:280)}
function save2(){const s=$o('obSchool'),m=$o('obMajor'),g=$o('obGpa');if(!s)return true;const p=D0();p.school=s.value.trim();p.major=m.value.trim();const gv=g.value.trim().replace(/\s*\/\s*4(\.0+)?$/,'');
 if(gv&&(isNaN(+gv)||+gv<0||+gv>4.5)){const e=$o('obErr');e.textContent='GPA should be between 0 and 4.5.';e.hidden=false;g.focus();return false}p.gpa=gv;persist();return true}
function wire(n){const p=D0();
 if(n===1){const f=$o('obFile'),dr=$o('obDrop'),rs=$o('obRs');const take=async file=>{if(!file)return;rs.textContent='Reading '+file.name+' in your browser…';try{const t=await readFile(file);await ingest(t);rs.textContent='Done. We prefilled what we found. Check it on the next steps.'}catch(e){rs.textContent="We couldn't read that file. You can fill things in on the next steps."}};
  f.onchange=()=>take(f.files[0]);['dragenter','dragover'].forEach(t=>dr.addEventListener(t,e=>{e.preventDefault();dr.classList.add('hov')}));['dragleave','drop'].forEach(t=>dr.addEventListener(t,e=>{e.preventDefault();dr.classList.remove('hov')}));dr.addEventListener('drop',e=>take(e.dataTransfer.files[0]))}
 if(n===2){const s=$o('obSchool'),L=$o('obSL');let act=-1;const pick=v=>{s.value=v;L.hidden=true;s.setAttribute('aria-expanded','false');save2()};
  const upd=async()=>{if(!SCH)try{SCH=await (await fetch('data/schools.json'+(self.BV||''))).json()}catch(e){SCH=[]}const q=s.value.trim().toLowerCase();act=-1;if(q.length<2){L.hidden=true;return}
   const r=SCH.filter(x=>x.toLowerCase().includes(q)).sort((a,b)=>a.toLowerCase().indexOf(q)-b.toLowerCase().indexOf(q)).slice(0,6);L.innerHTML=r.map((x,i)=>`<li role="option" id="obSo${i}" data-v="${E(x)}">${E(x)}</li>`).join('');L.hidden=!r.length;s.setAttribute('aria-expanded',r.length?'true':'false')};
  s.addEventListener('input',upd);L.addEventListener('mousedown',e=>{const li=e.target.closest('li');if(li){e.preventDefault();pick(li.dataset.v)}});
  s.addEventListener('keydown',e=>{const o=[...L.querySelectorAll('li')];if(L.hidden||!o.length)return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();act=(act+(e.key==='ArrowDown'?1:-1)+o.length)%o.length;o.forEach((x,i)=>x.setAttribute('aria-selected',i===act));s.setAttribute('aria-activedescendant','obSo'+act)}else if(e.key==='Enter'&&act>=0){e.preventDefault();pick(o[act].dataset.v)}else if(e.key==='Escape')L.hidden=true});
  s.addEventListener('blur',()=>setTimeout(()=>{L.hidden=true;save2()},120));['obMajor','obGpa'].forEach(i=>$o(i).addEventListener('change',save2))}
 if(n===4){const x=$o('obExp');x.addEventListener('keydown',e=>{if(e.key!=='Enter')return;e.preventDefault();addExp()})}}
function addExp(){const x=$o('obExp');if(!x||!x.value.trim())return;const parts=x.value.split(/\s*[·|,–—-]\s*/).filter(Boolean);const org=parts.length>1?parts[0]:'',title=parts.length>1?parts[1]:parts[0];
 D0().experience.push({kind:/intern|co-op/i.test(title)?'Internship':/research/i.test(title)?'Research':'Job',title:title.slice(0,80),org:org.slice(0,80),start:'',end:'',bullets:[]});persist();render(4);$o('obExp').focus()}
function toggleExp(t){const p=D0();const i=p.experience.findIndex(e=>(e.title||'')===t);if(i>=0)p.experience.splice(i,1);else p.experience.push({kind:/captain|president|chair/i.test(t)?'Leadership':'Club',title:t,org:'',start:'',end:'',bullets:[]});persist()}
card.addEventListener('click',e=>{const c=e.target.closest('.chip'),b=e.target.closest('[data-ob]'),p=D0();
 if(c){if(c.id==='obAddC'){const v=prompt('Club or leadership role');if(v&&v.trim()){toggleExp(v.trim().slice(0,80));CLUBS.includes(v.trim())||CLUBS.push(v.trim().slice(0,80));render(4)}return}
  const on=!c.classList.contains('on');
  if(c.dataset.year){card.querySelectorAll('[data-year]').forEach(z=>{z.classList.remove('on');z.setAttribute('aria-pressed','false')});if(on){p.gradDate=c.dataset.year+'-05';p.classYear=YCLS[c.dataset.year]}else{p.gradDate='';p.classYear=''}}
  else if(c.dataset.int){on?pickedInt.add(c.dataset.int):pickedInt.delete(c.dataset.int);const keep=new Set(p.industries.filter(i=>!INT.some(z=>z[1]===i)));INT.forEach(z=>pickedInt.has(z[0])&&keep.add(z[1]));p.industries=[...keep]}
  else if(c.dataset.loc){const l=c.dataset.loc;p.locations=on?[...new Set(p.locations.concat(l))]:p.locations.filter(z=>z!==l)}
  else if(c.dataset.remote)p.remoteOK=on;
  else if(c.dataset.ath||c.dataset.club){toggleExp(c.dataset.ath||c.dataset.club)}
  c.classList.toggle('on',on);c.setAttribute('aria-pressed',on);persist();return}
 const rm=e.target.closest('[data-rmx]');if(rm){p.experience=p.experience.filter(z=>z.title!==rm.dataset.rmx);persist();render(4);return}
 if(!b)return;const a=b.dataset.ob;
 if(a==='next'||a==='skip'){if(step===2&&a==='next'&&!save2())return;if(step===4&&$o('obExp')?.value.trim())addExp();show(step+1)}
 else if(a==='back'){if(step===2)save2();if(step>1)show(step-1);else{card.hidden=true;skipAll.hidden=true;intro.classList.remove('gone','ob','s1');window.__gAct=performance.now()}}
 else if(a==='all')finish(false);else if(a==='ap')finish(true)});
let TOP=[];
async function reveal(){const p=D0(),box=$o('obM');if(!(p.major||p.industries.length||p.skills.length||p.experience.length)){box.innerHTML='<p class="lead">Add a major, an interest or an experience so we can grade internships for you.</p>';$o('obAp').hidden=true;return}
 profile={...JSON.parse(JSON.stringify(p)),v:6,savedAt:new Date().toISOString()};Store.set('profile',profile);Store.set('profileDraft',p);
 if(!D.length){await new Promise(r=>{const t=setInterval(()=>{if(D.length){clearInterval(t);r()}},150)})}
 await rescore();TOP=D.filter(x=>x.live&&MSCORE.has(x.id)).sort((a,b)=>MSCORE.get(b.id).pct-MSCORE.get(a.id).pct).slice(0,4);
 if(!TOP.length){box.innerHTML='<p class="lead">No open internships match yet. See the whole database and adjust your profile any time.</p>';$o('obAp').hidden=true;return}
 box.innerHTML=TOP.map(x=>{const m=MSCORE.get(x.id),c=closeLbl(x),loc=x.remote?'Remote':((x.locations||[])[0]?[x.locations[0].city,x.locations[0].state].filter(Boolean).join(', '):'Location not listed');
  return `<div class="m"><div class="lg">${logoHTML(x,false,'sm')}</div><div><b>${E(x.title)}</b><small>${E(x.company)} · ${E(loc)} · ${E(c.t)}</small></div><span class="gp${m.pct<70?' c':m.pct<80?' b':''}">${m.pct}% · ${E(m.grade)}</span></div>`}).join('')}
function finish(ap){if(ap&&TOP.length&&window.Autopilot){const k=Autopilot.addMany(TOP.map(x=>x.id));setTimeout(()=>typeof toast==='function'&&toast(`Autopilot is on for ${k} internship${k===1?'':'s'}.`),700)}
 window.__introEnd&&window.__introEnd(false);if(typeof F!=='undefined'){F.sort='match';const so=$o('sort');so&&(so.value='match')}setTimeout(()=>{try{go(ap&&window.Autopilot?'autopilot':'db');update();vrender(true)}catch(e){}},40)}
$o('goBuild').addEventListener('click',()=>{if(window.__introExit)window.__introExit();setTimeout(()=>show(1),RM?0:820)});
skipAll.addEventListener('click',()=>{persist();window.__introEnd&&window.__introEnd(false)});
})();
