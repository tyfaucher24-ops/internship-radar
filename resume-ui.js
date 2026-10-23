/* V14.3 review-and-confirm: the parse from resume-worker.js is shown as editable cards next to the resume's own lines.
   Nothing is filled in until the person confirms. Re-uploads merge: a value the person already has is never overwritten. The difference is listed instead. */
(function(){
const $r=id=>document.getElementById(id);
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MON=['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TYPES=(self.RDICT&&RDICT.TYPES)||[['Internship','Internship'],['Job','Job'],['Research assistant','Research'],['Project','Project'],['Club member','Club'],['Club leadership','Leadership'],['Volunteer','Volunteer']];
const KIND=Object.fromEntries(TYPES);
let ST=null,DONE=null,lastFocus=null;
/* ---- worker result cache so onboarding's readFile → ingest(text) reuses the layout-aware parse ---- */
const _readFile=window.readFile;
window.readFile=async function(f){const r=await RI.analyze(f);window.__rvLast={text:r.text,res:r};return r.text};
function authOf(v){if(!v)return'';if(/citizen|permanent/i.test(v))return'citizen';if(/sponsorship needed|no sponsorship/i.test(v))return'authorized';if(/need visa|F-1/i.test(v))return'sponsor';return'authorized'}
const AUTHL={citizen:'Citizen / green card',authorized:'Other work permit (no sponsorship needed)',sponsor:'Need sponsorship'};
function classOf(c){return c==='Graduated'?'Recent grad':/^(Freshman|Sophomore|Junior|Senior)$/.test(c)?c:''}
function mark(v,conf,src){if(v===''||v==null||(Array.isArray(v)&&!v.length))return'<span class="rv-nf">Not found. Add it?</span>';if(conf&&conf!=='high')return'<span class="rv-ck">Check this</span>';return''}
function srcAttr(s){return s&&s.length?` data-src="${[...new Set(s)].join(',')}"`:''}
function fld(label,k,v,conf,src,o){o=o||{};const id='rvf-'+k.replace(/\W/g,'_');
 return `<div class="rv-f"${srcAttr(src)}><label for="${id}">${E(label)} ${o.mk||mark(v,conf,src)}</label>${o.select?`<select id="${id}" data-k="${k}">${o.select.map(([val,lab])=>`<option value="${E(val)}"${val===v?' selected':''}>${E(lab)}</option>`).join('')}</select>`:o.area?`<textarea id="${id}" data-k="${k}" rows="3">${E(v)}</textarea>`:`<input id="${id}" data-k="${k}" type="${o.type||'text'}" value="${E(v)}"${o.ph?` placeholder="${E(o.ph)}"`:''}${o.im?` inputmode="${o.im}"`:''}>`}${o.help?`<p class="rv-help">${o.help}</p>`:''}</div>`}
function build(res){const R=res.result;const c=R.contact||{};const e=R.education[0]||{};
 const ed=e.conf||{};const L=R.lines||[];
 const schoolSel=e.candidates&&e.candidates.length&&!e.school;
 const gpaOk=e.gpa&&(!e.gpaScale||e.gpaScale==='4.0'||e.gpaScale==='4');
 const gd=e.gradYear?e.gradYear+'-'+String(e.gradMonth||'').padStart(2,'0').replace(/^-?0?$/,''):'';
 const srcHtml=L.map((t,i)=>`<li id="rvl${i}" data-ln="${i}">${E(t.replace(/\t+/g,'  ·  '))||'&nbsp;'}</li>`).join('');
 const exps=R.experience.map((x,i)=>`<fieldset class="rv-card rv-exp"${srcAttr(x.src)} data-x="${i}"><legend><label class="rv-inc"><input type="checkbox" data-xk="inc" checked> Include</label> <span class="rv-xt">${E(x.title||x.org||'Entry '+(i+1))}</span> ${x.conf&&(x.conf.entry!=='high'||x.conf.dates!=='high')?'<span class="rv-ck">Check this</span>':''}</legend>
  <div class="rv-g"><div class="rv-f"><label>Type<select data-xk="type">${TYPES.map(([t])=>`<option${t===x.type?' selected':''}>${E(t)}</option>`).join('')}</select></label></div>
  <div class="rv-f"><label>Title ${x.title?'':'<span class="rv-nf">Not found. Add it?</span>'}<input data-xk="title" value="${E(x.title)}"></label></div>
  <div class="rv-f"><label>Organization ${x.org?'':'<span class="rv-nf">Not found. Add it?</span>'}<input data-xk="org" value="${E(x.org)}"></label></div>
  <div class="rv-f"><label>Start ${x.start?'':'<span class="rv-nf">Not found. Add it?</span>'}<input data-xk="start" type="month" value="${E(x.start)}"></label></div>
  <div class="rv-f"><label>End ${x.end?'':'<span class="rv-nf">Not found. Add it?</span>'}<input data-xk="end" type="month" value="${E(x.current?'':x.end)}"${x.current?' disabled':''}></label><label class="rv-inl"><input type="checkbox" data-xk="cur"${x.current?' checked':''}> Current</label></div></div></fieldset>`).join('');
 const sk=R.skills.hard.map(s=>s.name).join(', '),ce=R.certs.map(s=>s.name).join(', '),la=R.skills.languages.map(s=>s.name+(s.level?' ('+s.level+')':'')).join(', ');
 const ssrc=R.skills.hard.flatMap(s=>s.src||[]),csrc=R.certs.flatMap(s=>s.src||[]),lsrc=R.skills.languages.flatMap(s=>s.src||[]);
 return `<div class="mbox rv-box" role="document"><h2 id="rvH" tabindex="-1">Check what we read</h2>
 <p class="rv-priv">🔒 Your resume is read on your device and never uploaded. Nothing is filled in until you confirm.</p>
 <div class="rv-step" id="rvS1"><div class="rv-cols"><section class="rv-src" aria-label="Your resume text"><h3>Your resume</h3><ol id="rvSrc">${srcHtml}</ol></section>
 <section class="rv-cards" aria-label="What we found"><h3>What we found</h3>
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
 <div class="rv-foot"><button type="button" class="btn gh" id="rvManual">Build manually instead</button><button type="button" class="btn gh" id="rvCancel">Cancel</button><button type="button" class="btn pri" id="rvNext">Next: preferences</button></div></div>
 <div class="rv-step" id="rvS2" hidden><h3>Your preferences</h3><p class="rv-help">These aren’t on a resume, so we ask. You can change them later.</p>
 ${fld('Where do you want to work? (comma-separated)','locations',(PF.locations||[]).join(', ')||(c.location||''),c.location&&!(PF.locations||[]).length?'medium':'high',null,{ph:'e.g. New York, NY, Remote'})}
 ${fld('Industries you’re interested in (comma-separated)','industries',(PF.industries||[]).join(', '),'high',null,{ph:'e.g. Finance & Banking'})}
 ${fld('Roles you want (comma-separated)','interests',(PF.interests||[]).join(', '),'high',null,{ph:'e.g. Data analyst, Marketing'})}
 <div class="rv-g">${fld('Season','season',PF.season||'','high',null,{select:[['','Any season'],['Summer','Summer'],['Fall','Fall'],['Spring','Spring'],['Winter','Winter']]})}${fld('Year','seasonYear',PF.seasonYear||'','high',null,{select:[['','Any year'],...[0,1,2].map(i=>{const y=String(new Date().getFullYear()+i);return[y,y]})]})}</div>
 <label class="rv-inl"><input type="checkbox" id="rvRemote"${PF.remoteOK?' checked':''}> Remote roles are fine</label>
 <label class="rv-inl"><input type="checkbox" id="rvReloc"${PF.relocate?' checked':''}> I'm willing to relocate</label>
 <div class="rv-foot"><button type="button" class="btn gh" id="rvBack">Back</button><button type="button" class="btn pri" id="rvOk">Confirm profile</button></div></div></div>`}
function close(v){const m=$r('rvDlg');if(m){m.remove();document.body.classList.remove('rv-open')}lastFocus&&lastFocus.focus&&lastFocus.focus();const d=DONE;DONE=null;d&&d(v)}
function open(res){lastFocus=document.activeElement;$r('rvDlg')?.remove();ST=res;const m=document.createElement('div');m.className='modal wide rv-ov';m.id='rvDlg';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-labelledby','rvH');
 m.innerHTML=build(res);document.body.appendChild(m);document.body.classList.add('rv-open');$r('rvH').focus();
 m.addEventListener('focusin',ev=>{const c=ev.target.closest('[data-src]');m.querySelectorAll('#rvSrc .hl').forEach(x=>x.classList.remove('hl'));if(!c)return;const ids=c.dataset.src.split(',');ids.forEach(i=>$r('rvl'+i)?.classList.add('hl'));const f=$r('rvl'+ids[0]);if(f){const box=$r('rvSrc');box.scrollTop=f.offsetTop-box.offsetTop-24}});
 m.addEventListener('change',ev=>{if(ev.target.dataset.xk==='cur'){const en=ev.target.closest('.rv-exp').querySelector('[data-xk=end]');en.disabled=ev.target.checked;if(ev.target.checked)en.value=''}});
 m.addEventListener('keydown',ev=>{if(ev.key==='Escape')close(null);if(ev.key==='Tab'){const f=[...m.querySelectorAll('button,input,select,textarea,[tabindex="0"]')].filter(x=>!x.disabled&&x.offsetParent);if(!f.length)return;if(ev.shiftKey&&document.activeElement===f[0]){ev.preventDefault();f[f.length-1].focus()}else if(!ev.shiftKey&&document.activeElement===f[f.length-1]){ev.preventDefault();f[0].focus()}}});
 $r('rvCancel').onclick=()=>close(null);$r('rvManual').onclick=()=>{close(null);try{go('profile')}catch(_){}$r('cbSchool')?.querySelector('input')?.focus()};
 $r('rvNext').onclick=()=>{const s=m.querySelector('#rvS1 [data-k=school]');if(s&&s.tagName==='SELECT'&&!s.value){s.focus();s.setAttribute('aria-invalid','true');return}$r('rvS1').hidden=true;$r('rvS2').hidden=false;$r('rvH').focus()};
 $r('rvBack').onclick=()=>{$r('rvS2').hidden=true;$r('rvS1').hidden=false;$r('rvH').focus()};
 $r('rvOk').onclick=()=>{const v=collect(m);close(v);apply(v)}}
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
 const st=$r('rstat');if(st){st.innerHTML=`<div class="pf-review" role="status"><b>Profile updated from your resume.</b> Added ${addX} experience${addX===1?'':'s'}. ${diff.length?`We kept your values where they differ from the resume:<ul class="rv-diff">${diff.map(k=>`<li><b>${E(scal[k])}</b>: you have “${E(PF[k])}”, the resume says “${E(v[k])}”. <button type="button" class="btn small" data-rvuse="${k}">Use resume value</button></li>`).join('')}</ul>`:''}</div>`;
  st.querySelectorAll('[data-rvuse]').forEach(b=>b.onclick=()=>{const k=b.dataset.rvuse;PF[k]=v[k];if(k==='school'&&typeof SCHOOLS!=='undefined'&&SCHOOLS&&!SCHOOLS.includes(v.school))PF.schoolSrc='ipeds';pfRender();Store.set('profileDraft',PF);b.closest('li').innerHTML=`<b>${E(scal[k])}</b> now uses the resume value.`})}
 try{if(window.Tour&&!$r('t-profile')?.hidden)setTimeout(()=>window.Tour.maybe(),400)}catch(_){}}
async function fromSource(src,label){const st=$r('rstat');if(st)st.textContent='Reading '+label+' on your device…';
 try{const res=(typeof src==='string'&&window.__rvLast&&window.__rvLast.text===src)?window.__rvLast.res:await RI.analyze(src);window.__rvLast=null;if(st)st.textContent='';
  Store.set('resumeText',String(res.text||'').slice(0,30000));return await new Promise(ok=>{DONE=ok;open(res)})}
 catch(err){if(st)st.textContent='Could not read that: '+err.message+' You can paste the text instead, or build your profile manually.';throw err}}
window.RVU={fromSource,open,apply,
 paste(){lastFocus=document.activeElement;const m=document.createElement('div');m.className='modal rv-ov';m.id='rvPaste';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-labelledby','rvPH');
  m.innerHTML=`<div class="mbox"><h2 id="rvPH">Paste your resume text</h2><p class="rv-priv">🔒 Read on your device, never uploaded.</p><label for="rvPT">Resume text</label><textarea id="rvPT" rows="12"></textarea><div class="rv-foot"><button type="button" class="btn gh" id="rvPC">Cancel</button><button type="button" class="btn pri" id="rvPG">Read it</button></div></div>`;
  document.body.appendChild(m);$r('rvPT').focus();const done=()=>{m.remove();lastFocus&&lastFocus.focus()};$r('rvPC').onclick=done;m.addEventListener('keydown',e=>{if(e.key==='Escape')done()});
  $r('rvPG').onclick=()=>{const t=$r('rvPT').value;if(t.trim().length<40){$r('rvPT').setAttribute('aria-invalid','true');return}m.remove();fromSource(t,'your text').catch(()=>{})}},
 del(){['resumeText','resume','resumeParse'].forEach(k=>Store.remove(k));window.__rvLast=null;if(typeof PF!=='undefined'){delete PF.resumeConfirmedAt;Store.set('profileDraft',PF)}const st=$r('rstat');if(st)st.textContent='Your resume data was deleted from this device. Fields you confirmed stay on your profile until you edit or reset them.'}};
/* hooks: profile upload, LinkedIn PDF/text and onboarding all go through review */
readIn=async file=>{try{await fromSource(file,file.name)}catch(_){}};
ingest=async text=>{try{await fromSource(String(text||''),'your text')}catch(_){}};
function mountBar(){const d=$r('pfDrop');if(!d||$r('rvBar'))return;const b=document.createElement('div');b.id='rvBar';b.className='rv-bar';
 b.innerHTML=`<p class="rv-priv">🔒 Your resume is read on your device and never uploaded.</p><div class="rv-acts"><button type="button" class="btn gh small" id="rvPasteBtn">Paste text instead</button><button type="button" class="btn gh small" id="rvDelBtn">Delete my resume data</button></div>`;
 d.insertAdjacentElement('afterend',b);$r('rvPasteBtn').onclick=()=>RVU.paste();$r('rvDelBtn').onclick=()=>RVU.del()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountBar);else mountBar();
})();
/* V14.3: auto-grow textareas (fallback where field-sizing is unsupported) */
(function(){if(CSS.supports&&CSS.supports('field-sizing','content'))return;const g=t=>{t.style.height='auto';t.style.height=(t.scrollHeight+2)+'px'};document.addEventListener('input',e=>{const t=e.target;if(t.tagName==='TEXTAREA'&&t.closest('#t-profile,.rv-box'))g(t)})})();
/* V14.3 §5: "Why this grade" in the listing detail: reach/target/safety, Not-eligible reason, top 3 for/against with quotes, next steps, confidence */
(function(){if(typeof fbPanel!=='function')return;const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const _fb=fbPanel;
 const TAG={safety:'Safety',target:'Target',reach:'Reach'};
 const fx=f=>`<li><strong>${E(f.t)}</strong>${f.resume?`<br><span class="v143-q">Your resume: ${E(f.resume)}</span>`:''}${f.posting?`<br><span class="v143-q">The posting: ${E(f.posting)}</span>`:''}</li>`;
 fbPanel=function(d){const base=_fb(d);const v=d&&d.v143;if(!v)return base;
  const head=v.eligible?`<p class="v143-tag"><span class="v143-chip v143-${v.tag}">${TAG[v.tag]||''}</span> Fit × chance: ${v.fitXchance} of 100</p>`:`<p class="v143-ne"><strong>Not eligible:</strong> ${E(v.reason)}</p>`;
  return base+`<section class="v143" aria-label="Why this grade"><h4>Why this grade</h4>${head}<div class="v143-cols">${v.pos.length?`<div><h5>Working for you</h5><ul>${v.pos.map(fx).join('')}</ul></div>`:''}${v.neg.length?`<div><h5>Working against you</h5><ul>${v.neg.map(fx).join('')}</ul></div>`:''}</div>${v.next.length?`<h5>Next steps</h5><ul>${v.next.map(t=>`<li>${E(t)}</li>`).join('')}</ul>`:''}<p class="v143-conf">${E(v.confidence.note)}</p></section>`}})();
