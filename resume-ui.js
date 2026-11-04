/* V14.5: the parse from resume-worker.js goes straight into the profile with no pop-up; preferences are set only on the profile page. Re-uploads merge: a value the person already has is never overwritten. The difference is listed instead. */
(function(){
const $r=id=>document.getElementById(id);
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MON=['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TYPES=(self.RDICT&&RDICT.TYPES)||[['Internship','Internship'],['Job','Job'],['Research assistant','Research'],['Project','Project'],['Club member','Club'],['Club leadership','Leadership'],['Volunteer','Volunteer']];
const KIND=Object.fromEntries(TYPES);
let ST=null,lastFocus=null;
/* ---- worker result cache so onboarding's readFile → ingest(text) reuses the layout-aware parse ---- */
const _readFile=window.readFile;
/* V19.1: the one progress source. Every real stage the worker finishes is broadcast as 'ir:resume'; the Profile and intro drop zones both listen. */
const emit=d=>document.dispatchEvent(new CustomEvent('ir:resume',{detail:d}));
window.readFile=async function(f){emit({st:'reading',p:2,step:'Starting',next:'File',file:f&&f.name?{name:f.name,size:f.size}:null});
 try{const r=await RI.analyze(f,pr=>emit(Object.assign({st:'reading'},pr)));window.__rvLast={text:r.text,res:r,file:f&&f.name?{name:f.name,size:f.size}:null};return r.text}
 catch(e){emit({st:'error'});throw e}};
function authOf(v){if(!v)return'';if(/citizen|permanent/i.test(v))return'citizen';if(/sponsorship needed|no sponsorship/i.test(v))return'authorized';if(/need visa|F-1/i.test(v))return'sponsor';return'authorized'}
const AUTHL={citizen:'Citizen / green card',authorized:'Other work permit (no sponsorship needed)',sponsor:'Need sponsorship'};
function classOf(c){return c==='Graduated'?'Recent grad':/^(Freshman|Sophomore|Junior|Senior)$/.test(c)?c:''}
/* V14.4: no review step, no flags, no source highlighting. Parsed values go straight to the profile. */
function mark(){return''}
function srcAttr(){return''}
function fld(label,k,v,conf,src,o){o=o||{};const id='rvf-'+k.replace(/\W/g,'_');
 return `<div class="rv-f"${srcAttr(src)}><label for="${id}">${E(label)} ${o.mk||mark(v,conf,src)}</label>${o.select?`<select id="${id}" data-k="${k}">${o.select.map(([val,lab])=>`<option value="${E(val)}"${val===v?' selected':''}>${E(lab)}</option>`).join('')}</select>`:o.area?`<textarea id="${id}" data-k="${k}" rows="3">${E(v)}</textarea>`:`<input id="${id}" data-k="${k}" type="${o.type||'text'}" value="${E(v)}"${o.ph?` placeholder="${E(o.ph)}"`:''}${o.im?` inputmode="${o.im}"`:''}>`}${o.help?`<p class="rv-help">${o.help}</p>`:''}</div>`}
function build(res){const R=res.result;const c=R.contact||{};const e=R.education[0]||{};
 const ed=e.conf||{};const L=R.lines||[];
 const schoolSel=e.candidates&&e.candidates.length&&!e.school;
 const gpaOk=e.gpa&&(!e.gpaScale||e.gpaScale==='4.0'||e.gpaScale==='4');
 const gd=e.gradYear?e.gradYear+'-'+String(e.gradMonth||'').padStart(2,'0').replace(/^-?0?$/,''):'';
 const exps=R.experience.map((x,i)=>`<fieldset class="rv-card rv-exp"${srcAttr(x.src)} data-x="${i}"><legend><label class="rv-inc"><input type="checkbox" data-xk="inc" checked> Include</label> <span class="rv-xt">${E(x.title||x.org||'Entry '+(i+1))}</span></legend>
  <div class="rv-g"><div class="rv-f"><label>Type<select data-xk="type">${TYPES.map(([t])=>`<option${t===x.type?' selected':''}>${E(t)}</option>`).join('')}</select></label></div>
  <div class="rv-f"><label>Title ${x.title?'':''}<input data-xk="title" value="${E(x.title)}"></label></div>
  <div class="rv-f"><label>Organization ${x.org?'':''}<input data-xk="org" value="${E(x.org)}"></label></div>
  <div class="rv-f"><label>Start ${x.start?'':''}<input data-xk="start" type="month" value="${E(x.start)}"></label></div>
  <div class="rv-f"><label>End ${x.end?'':''}<input data-xk="end" type="month" value="${E(x.current?'':x.end)}"${x.current?' disabled':''}></label><label class="rv-inl"><input type="checkbox" data-xk="cur"${x.current?' checked':''}> Current</label></div></div></fieldset>`).join('');
 const sk=R.skills.hard.map(s=>s.name).join(', '),ce=R.certs.map(s=>s.name).join(', '),la=R.skills.languages.map(s=>s.name+(s.level?' ('+s.level+')':'')).join(', ');
 const ssrc=R.skills.hard.flatMap(s=>s.src||[]),csrc=R.certs.flatMap(s=>s.src||[]),lsrc=R.skills.languages.flatMap(s=>s.src||[]);
 return `<div class="mbox rv-box" role="document"> <div class="rv-step" id="rvS1" hidden><div><section class="rv-cards">
 <fieldset class="rv-card"${srcAttr(c.src)}><legend>Contact</legend><div class="rv-g">${fld('Name','name',c.name||'','high',c.src)}${fld('Email','email',c.email||'','high',c.src,{type:'email'})}${fld('Phone','phone',c.phone||'','high',c.src,{type:'tel'})}</div></fieldset>
 <fieldset class="rv-card"${srcAttr(e.src)}><legend>Education</legend><div class="rv-g">
 ${schoolSel?fld('School','school','',ed.school||'low',e.src,{mk:'<span class="rv-ck">Pick one</span>',select:[['','Pick your school…'],...e.candidates.map(n=>[n,n]),['__none','None of these']],help:`Your resume says “${E(e.schoolRaw)}”, which matches more than one school. Please pick yours.`}):fld('School','school',e.school||'',ed.school,e.src,{help:e.schoolRaw&&!e.school?`Your resume says “${E(e.schoolRaw)}”. We couldn’t match it to a school.`:''})}
 ${fld('Degree','degree',e.degree||'',ed.degree,e.src)}${fld('Major','major',(e.majors||[]).join(', '),ed.majors,e.src)}${fld('Minor','minor',(e.minors||[]).join(', '),'high',e.src)}
 ${fld('GPA','gpa',gpaOk?e.gpa:'',ed.gpa,e.src,{im:'decimal',help:e.gpa&&!gpaOk?`Your resume lists ${E(e.gpa)}/${E(e.gpaScale)}. We don’t convert other scales, so add a 4.0 GPA only if you have one.`:'Only filled when your resume states it.'})}
 ${fld('Graduation','gradDate',/^\d{4}-\d{2}$/.test(gd)?gd:'',ed.grad,e.src,{type:'month'})}
 ${fld('Class year','classYear',classOf(e.classYear),e.classYear?'medium':'',e.src,{select:[['','Choose…'],...['Freshman','Sophomore','Junior','Senior','Recent grad'].map(v=>[v,v])],help:e.classYear?'Worked out from your graduation date. Check it.':''})}
 </div></fieldset>
 <h3 class="rv-sub">Experience <span class="rv-cnt">(${R.experience.length})</span></h3>${exps||'<p class="rv-nf">No experience found. You can add it on your profile.</p>'}
 <fieldset class="rv-card"><legend>Skills, certifications, languages</legend>
 ${fld('Skills','skills',sk,'high',ssrc,{area:1})}${fld('Certifications','certs',ce,'high',csrc,{area:1})}${fld('Languages','languages',la,'high',lsrc)}
 ${fld('Work authorization','workAuth',authOf(R.workAuth&&R.workAuth.value),R.workAuth?'medium':'',R.workAuth&&R.workAuth.src,{select:[['','Not stated'],...Object.entries(AUTHL)],help:R.workAuth?`Your resume says: “${E(R.workAuth.raw)}”.`:'Only filled when your resume states it.'})}
 </fieldset></section></div>
 </div>
 </div>`}
function val(m,k){const e=m.querySelector(`[data-k="${k}"]`);return e?String(e.value||'').trim():''}
const list=s=>String(s||'').split(/\s*[,;]\s*/).map(x=>x.trim()).filter(Boolean);
function collect(m){const o={};['name','email','phone','school','degree','major','minor','gpa','gradDate','classYear','workAuth'].forEach(k=>o[k]=val(m,k));if(o.school==='__none')o.school='';
 o.skills=list(val(m,'skills'));o.certs=list(val(m,'certs'));o.languages=list(val(m,'languages'));o.locations=list(val(m,'locations'));o.industries=list(val(m,'industries'));o.remoteOK=!!$r('rvRemote')?.checked;o.relocate=!!$r('rvReloc')?.checked;o.interests=list(val(m,'interests'));o.season=val(m,'season');o.seasonYear=val(m,'seasonYear');
 o.experience=[...m.querySelectorAll('.rv-exp')].filter(f=>f.querySelector('[data-xk=inc]').checked).map(f=>{const g=k=>f.querySelector(`[data-xk=${k}]`);const x=ST.result.experience[+f.dataset.x];const type=g('type').value;
  return{kind:KIND[type]||'Job',type,title:g('title').value.trim(),org:g('org').value.trim(),location:x.location||'',start:g('start').value,end:g('cur').checked?'Present':g('end').value,bullets:(x.bullets||[]).slice(0,6),fromResume:true}}).filter(x=>x.title||x.org);
 return o}
/* merge: fill empties, keep anything the person already has, list differences with a one-click swap */
function apply(v){if(!v)return;pfRead();const diff=[];const conf=new Set(PF.confirmed||[]);
 const scal={name:'Name',email:'Email',phone:'Phone',school:'School',degree:'Degree',major:'Major',minor:'Minor',gpa:'GPA',gradDate:'Graduation',classYear:'Class year',workAuth:'Work authorization'};
 Object.keys(scal).forEach(k=>{const nv=v[k];if(!nv)return;conf.add(k);if(!PF[k]){PF[k]=nv}else if(String(PF[k])!==nv)diff.push(k)});
 if(v.school&&typeof SCHOOLS!=='undefined'&&SCHOOLS&&!SCHOOLS.includes(v.school)&&PF.school===v.school)PF.schoolSrc='ipeds';
 if(PF.workAuth)PF.sponsorship=PF.workAuth==='sponsor'?'yes':'no';
 const have=new Set((PF.skills||[]).map(s=>String(s).toLowerCase()));v.skills.forEach(s=>{if(!have.has(s.toLowerCase())){PF.skills.push(s);have.add(s.toLowerCase())}});if(v.skills.length)conf.add('skills');
 PF.certs=PF.certs||[];v.certs.forEach(s=>{if(!PF.certs.some(c=>c.toLowerCase()===s.toLowerCase()))PF.certs.push(s)});if(v.certs.length)conf.add('certs');
 PF.languages=PF.languages||[];v.languages.forEach(s=>{if(!PF.languages.includes(s))PF.languages.push(s)});if(v.languages.length)conf.add('languages');
 let addX=0;v.experience.forEach(x=>{const ex=PF.experience.find(p=>(p.title||'').toLowerCase()===x.title.toLowerCase()&&(p.org||'').toLowerCase()===x.org.toLowerCase());if(!ex){PF.experience.push(x);addX++}});if(v.experience.length)conf.add('experience');
 PF.locations=PF.locations||[];v.locations.forEach(s=>{if(!PF.locations.includes(s))PF.locations.push(s)});PF.industries=PF.industries||[];v.industries.forEach(s=>{if(!PF.industries.includes(s))PF.industries.push(s)});PF.remoteOK=v.remoteOK||PF.remoteOK;PF.relocate=v.relocate||!!PF.relocate;PF.interests=PF.interests||[];v.interests.forEach(s=>{if(!PF.interests.includes(s))PF.interests.push(s)});if(v.season)PF.season=v.season;if(v.seasonYear)PF.seasonYear=v.seasonYear;
 PF.confirmed=[...conf];PF.resumeConfirmedAt=new Date().toISOString();
 Store.set('resumeParse',{at:PF.resumeConfirmedAt,values:v});try{pfRender();fixSchool()}catch(_){}Store.set('profileDraft',PF);try{pfProgress()}catch(_){}
 const st=$r('rstat');if(st){st.innerHTML=diff.length?`<div class="pf-review">${`We kept your values where they differ from the resume:<ul class="rv-diff">${diff.map(k=>`<li><b>${E(scal[k])}</b>: you have “${E(PF[k])}”, the resume says “${E(v[k])}”. <button type="button" class="btn small" data-rvuse="${k}">Use resume value</button></li>`).join('')}</ul>`}</div>`:'';
  st.querySelectorAll('[data-rvuse]').forEach(b=>b.onclick=()=>{const k=b.dataset.rvuse;PF[k]=v[k];if(k==='school'&&typeof SCHOOLS!=='undefined'&&SCHOOLS&&!SCHOOLS.includes(v.school))PF.schoolSrc='ipeds';pfRender();Store.set('profileDraft',PF);b.closest('li').innerHTML=`<b>${E(scal[k])}</b> now uses the resume value.`})}
}
/* V14.5: no pop-up. The parse fills the profile directly. Preferences (locations, industries, roles, season, remote, relocation) are never taken or guessed from a resume. */
function fill(res){ST=res;const m=document.createElement('div');m.innerHTML=build(res);const v=collect(m);
 Object.assign(v,{locations:[],industries:[],interests:[],season:'',seasonYear:'',remoteOK:false,relocate:false});apply(v);return v}
async function fromSource(src,label){const st=$r('rstat');if(st)st.textContent='';
 try{const cached=typeof src==='string'&&window.__rvLast&&window.__rvLast.text===src;const file=cached?window.__rvLast.file:(src&&src.name?{name:src.name,size:src.size}:null);
  const res=cached?window.__rvLast.res:await window.readFile(src).then(()=>window.__rvLast.res);window.__rvLast=null;
  Store.set('resumeText',String(res.text||'').slice(0,30000));const v=fill(res);const R=res.result||{};
  const counts={roles:(R.experience||[]).length,schools:(R.education||[]).filter(e=>e.school||e.schoolRaw).length,skills:((R.skills||{}).hard||[]).length};
  const rp=Store.get('resumeParse',{})||{};rp.file=file||{name:label==='your text'?'Pasted text':String(label||''),size:0};rp.counts=counts;Store.set('resumeParse',rp);
  emit({st:'done',p:100,counts,file:rp.file});return v}
 catch(err){emit({st:'error'});throw err}}
window.RVU={fromSource,fill,apply,
 paste(){lastFocus=document.activeElement;const m=document.createElement('div');m.className='modal rv-ov';m.id='rvPaste';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-labelledby','rvPH');
  m.innerHTML=`<div class="mbox"><h2 id="rvPH">Paste your resume text</h2><p class="rv-priv">🔒 Read on your device, never uploaded.</p><label for="rvPT">Resume text</label><textarea id="rvPT" rows="12"></textarea><div class="rv-foot"><button type="button" class="btn gh" id="rvPC">Cancel</button><button type="button" class="btn pri" id="rvPG">Read it</button></div></div>`;
  document.body.appendChild(m);$r('rvPT').focus();const done=()=>{m.remove();lastFocus&&lastFocus.focus()};$r('rvPC').onclick=done;m.addEventListener('keydown',e=>{if(e.key==='Escape')done()});
  $r('rvPG').onclick=()=>{const t=$r('rvPT').value;if(t.trim().length<40){$r('rvPT').setAttribute('aria-invalid','true');return}m.remove();fromSource(t,'your text').catch(()=>{})}},
 del(){['resumeText','resume','resumeParse'].forEach(k=>Store.remove(k));window.__rvLast=null;if(typeof PF!=='undefined'){delete PF.resumeConfirmedAt;Store.set('profileDraft',PF)}const st=$r('rstat');if(st)st.textContent='';emit({st:'empty',removed:true})}};
/* hooks: profile upload, LinkedIn PDF/text and onboarding all fill the profile directly */
readIn=async file=>{try{await fromSource(file,file.name);if(typeof saveAndSearch==='function'&&!$r('t-profile').hidden)await saveAndSearch()}catch(_){}};
ingest=async text=>{try{await fromSource(String(text||''),'your text')}catch(_){}};
function mountBar(){const d=$r('pfDrop');if(!d||$r('rvBar'))return;const b=document.createElement('div');b.id='rvBar';b.className='rv-bar';
 b.innerHTML=`<p class="rv-priv">🔒 Your resume is read on your device and never uploaded.</p><div class="rv-acts"><button type="button" class="btn gh small" id="rvPasteBtn">Paste text instead</button><button type="button" class="btn gh small" id="rvDelBtn">Delete my resume data</button></div>`;
 d.insertAdjacentElement('afterend',b);$r('rvPasteBtn').onclick=()=>RVU.paste();$r('rvDelBtn').onclick=()=>RVU.del()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountBar);else mountBar();
})();
/* V14.3: auto-grow textareas (fallback where field-sizing is unsupported) */
(function(){if(CSS.supports&&CSS.supports('field-sizing','content'))return;const g=t=>{t.style.height='auto';t.style.height=(t.scrollHeight+2)+'px'};document.addEventListener('input',e=>{const t=e.target;if(t.tagName==='TEXTAREA'&&t.closest('#t-profile,.rv-box'))g(t)})})();
/* V14.3 §5: "How you match this posting" in the listing detail: reach/target/safety, Not-eligible reason, top 3 for/against with quotes, next steps, confidence */
(function(){if(typeof fbPanel!=='function')return;const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const _fb=fbPanel;
 const TAG={safety:'Safety',target:'Target',reach:'Reach'};
 const fx=f=>`<li><strong>${E(f.t)}</strong>${f.resume?`<br><span class="v143-q">Your resume: ${E(f.resume)}</span>`:''}${f.posting?`<br><span class="v143-q">The posting: ${E(f.posting)}</span>`:''}</li>`;
 fbPanel=function(d){const base=_fb(d);const v=d&&d.v143;if(!v)return base;
  const head=v.eligible?`<p class="v143-tag"><span class="v143-chip v143-${v.tag}">${TAG[v.tag]||''}</span> Fit × chance: ${v.fitXchance} of 100</p>`:`<p class="v143-ne"><strong>Not eligible:</strong> ${E(v.reason)}</p>`;
  return base+`<section class="v143" aria-label="How you match this posting"><h4>How you match this posting</h4>${head}<div class="v143-cols">${v.pos.length?`<div><h5>Working for you</h5><ul>${v.pos.map(fx).join('')}</ul></div>`:''}${v.neg.length?`<div><h5>Working against you</h5><ul>${v.neg.map(fx).join('')}</ul></div>`:''}</div>${v.next.length?`<h5>Next steps</h5><ul>${v.next.map(t=>`<li>${E(t)}</li>`).join('')}</ul>`:''}<p class="v143-conf">${E(v.confidence.note)}</p></section>`}})();
/* V19 / V19.1: one resume drop zone with four states (empty, reading, done, error) for #pfDrop (Profile) and #obDrop (intro step 1).
   Progress comes only from the 'ir:resume' events the readFile wrapper emits at real parse stages. The done state is rebuilt from the saved parse on load. */
(function(){
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const C=2*Math.PI*28,Z=[];
const kb=n=>!n?'':n<1e6?Math.max(1,Math.round(n/1024))+' KB':(n/1048576).toFixed(1)+' MB';
const plural=(n,a)=>n+' '+a+(n===1?'':'s');
const RING=(p,ok)=>`<svg class="rz-ring" viewBox="0 0 64 64" aria-hidden="true"><circle class="rz-trk" cx="32" cy="32" r="28"/><circle class="rz-bar" cx="32" cy="32" r="28" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${(C*(1-p/100)).toFixed(2)}"/>${ok?'<circle class="rz-dot" cx="32" cy="32" r="21"/><path class="rz-tick" d="M22.5 32.5l6.5 6.5 12.5-13" pathLength="1"/>':`<text class="rz-pct" x="32" y="32" dy=".36em" text-anchor="middle">${Math.round(p)}%</text>`}</svg>`;
const ARROW='<svg class="rz-arrow" aria-hidden="true" viewBox="0 0 24 24" width="32" height="32"><path d="M12 16V4m0 0l-5 5m5-5l5 5M4 20h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const WARN='<svg class="rz-warn" aria-hidden="true" viewBox="0 0 24 24" width="40" height="40"><path d="M12 3l10 18H2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 10v5m0 3v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
function saved(){const r=Store.get('resumeParse',null);if(!r||!r.at)return null;const v=r.values||{};
 const counts=r.counts||{roles:(v.experience||[]).length,schools:v.school?1:0,skills:(v.skills||[]).length};return{counts,file:r.file||null}}
function mount(label,kind){if(!label||label.__rz)return;const input=label.querySelector('input[type=file]');if(!input)return;
 let wrap=label.parentElement;if(!wrap.classList.contains('rz')){wrap=document.createElement('div');wrap.className='rz rz-'+kind;label.before(wrap);wrap.appendChild(label)}
 [...label.childNodes].forEach(n=>{if(n!==input)n.remove()});const body=document.createElement('span');body.className='rz-b';label.appendChild(body);
 const acts=document.createElement('div');acts.className='rz-acts';wrap.appendChild(acts);
 const live=document.createElement('p');live.className='sr-only';live.setAttribute('role','status');live.setAttribute('aria-live','polite');wrap.appendChild(live);
 const z={label,input,wrap,body,acts,live,kind,st:'',p:0};label.__rz=z;Z.push(z);
 const s=saved();if(s)set(z,'done',{counts:s.counts,file:s.file},true);else set(z,'empty',{},true)}
function say(z,t){z.live.textContent='';setTimeout(()=>{z.live.textContent=t},60)}
function set(z,st,d,quiet){d=d||{};const prev=z.st;if(st===prev&&st!=='reading'&&!d.force)return;
 if(st==='reading'&&prev==='reading'){z.p=Math.max(z.p,d.p||0);const bar=z.body.querySelector('.rz-bar'),pt=z.body.querySelector('.rz-pct'),sl=z.body.querySelector('.rz-step');
  if(bar)bar.setAttribute('stroke-dashoffset',(C*(1-z.p/100)).toFixed(2));if(pt)pt.textContent=Math.round(z.p)+'%';if(sl&&d.step)sl.textContent=d.step+(d.next?' · '+d.next+' next':'');return}
 z.st=st;z.wrap.dataset.st=st;z.label.dataset.st=st;z.wrap.classList.toggle('rz-instant',!!quiet);z.acts.innerHTML='';
 if(st==='empty'){z.p=0;z.body.innerHTML=z.kind==='ob'?`${ARROW}<b>Drop your resume here</b><span>PDF or DOCX · read in your browser, never uploaded</span><span class="btn gh" aria-hidden="true">Choose file</span>`:`${ARROW}<b>Drop your resume here</b><span>or click to choose a PDF or DOCX file</span>`;if(!quiet&&d.removed)say(z,'Resume removed')}
 else if(st==='reading'){z.p=Math.max(2,d.p||0);z.body.innerHTML=`${RING(z.p)}<b>Reading your resume</b><span class="rz-step">${E(d.step||'Starting')}${d.next?' · '+E(d.next)+' next':''}</span>`;if(!quiet)say(z,'Reading your resume')}
 else if(st==='done'){const c=d.counts||{},chips=[['roles','role'],['schools','school'],['skills','skill']].filter(([k])=>c[k]>0).map(([k,w])=>`<span class="rz-chip">${plural(c[k],w)}</span>`);
  const any=chips.length>0,f=d.file;
  z.body.innerHTML=`${RING(100,1)}<b>${any?(z.kind==='ob'?'Resume read — we’ll fill in the next steps':'Resume read'):'Resume saved, nothing filled in automatically'}</b>${any?`<span class="rz-chips">${chips.join('')}</span>`:''}${f&&f.name?`<span class="rz-file">${E(f.name)}${f.size?' · '+kb(f.size):''}</span>`:''}<span class="sr-only">Choose a file to replace it.</span>`;
  z.acts.innerHTML='<button type="button" class="rz-link" aria-expanded="false">Replace or remove</button>';const b=z.acts.firstChild;
  b.onclick=()=>{z.acts.innerHTML='<button type="button" class="rz-btn" data-a="rep">Replace file</button><button type="button" class="rz-btn rz-del" data-a="del">Remove resume</button>';
   z.acts.querySelector('[data-a=rep]').onclick=()=>z.input.click();z.acts.querySelector('[data-a=del]').onclick=()=>{RVU.del();z.input.focus()};z.acts.querySelector('button').focus()};
  if(!quiet){const k=[['roles','role'],['schools','school'],['skills','skill']].find(([k])=>c[k]>0);say(z,k?'Resume read, '+plural(c[k[0]],k[1])+' found':'Resume saved, nothing filled in automatically')}}
 else if(st==='error'){z.body.innerHTML=`${WARN}<b>That file didn’t open. Try a PDF or DOCX under 10 MB.</b>`;z.acts.innerHTML='<button type="button" class="rz-btn">Try another file</button>';z.acts.firstChild.onclick=()=>z.input.click();if(!quiet)say(z,'Resume could not be read')}}
document.addEventListener('ir:resume',e=>{const d=e.detail||{};Z.forEach(z=>{if(!z.label.isConnected)return;set(z,d.st,d)})});
function scan(){mount(document.getElementById('pfDrop'),'pf');mount(document.getElementById('obDrop'),'ob')}
window.RZ={scan};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan);else scan();
})();
