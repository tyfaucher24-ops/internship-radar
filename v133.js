/* V13.3: intro dot timing, Apply button + "Mark as applied?" prompt */
(function(){
/* #4: randomise blink period (1.2–2s) and delay so the dots never blink in sync */
document.querySelectorAll('#intro .dot').forEach(d=>{d.style.setProperty('--bd',(1.2+Math.random()*.8).toFixed(2)+'s');d.style.setProperty('--bdl',(-Math.random()*2).toFixed(2)+'s')});
})();
/* V13.3 #5b: Apply links. Cards carry only the kind (index ak); the job-specific link lives in the detail shard, fetched on hover/focus/touch so the click opens it directly. */
(function(){
 const fill=async a=>{if(a.dataset.ok)return a.getAttribute('href');const x=typeof BYID!=='undefined'&&BYID.get(a.dataset.apply);if(!x)return'';await ensureDetail(x);if(x.apply_link){a.href=x.apply_link;a.dataset.ok=1}return x.apply_link||''};
 const pre=e=>{const a=e.target.closest&&e.target.closest('a[data-apply]');if(a)fill(a)};
 ['pointerover','focusin','touchstart'].forEach(t=>document.addEventListener(t,pre,{passive:true,capture:true}));
 function ask(x){if(!x||typeof T==='undefined')return;const t=T.byListing(x.id);if(t&&t.status!=='Saved')return;let el=document.getElementById('apAsk');if(!el){el=document.createElement('div');el.id='apAsk';el.className='ap-ask';el.setAttribute('role','dialog');el.setAttribute('aria-label','Mark as applied');document.body.appendChild(el)}
  el.innerHTML=`<span>Applied to <b></b>?</span><button type="button" class="btn btn-sz" data-y>Mark as applied</button><button type="button" class="btn-ghost btn-sz" data-n>Not yet</button>`;el.querySelector('b').textContent=x.company;el.hidden=false;
  el.querySelector('[data-y]').onclick=()=>{track(x.id,'Applied');typeof bump==='function'&&bump();el.hidden=true};el.querySelector('[data-n]').onclick=()=>{el.hidden=true}}
 document.addEventListener('click',async e=>{const a=e.target.closest&&e.target.closest('a[data-apply]');if(!a)return;e.stopPropagation();const x=typeof BYID!=='undefined'&&BYID.get(a.dataset.apply);
  if(!a.dataset.ok&&a.getAttribute('href')==='#'){e.preventDefault();const w=window.open('','_blank');const l=await fill(a);if(w){try{w.opener=null}catch(_){}l?w.location.replace(l):w.close()}}
  setTimeout(()=>ask(x),400)},true);
})();

/* V13.3 §7g: "Your honest snapshot" on the Profile page. Computed from your saved profile against your 30 best
   Realistic and 30 best Reach listings with the same grader as the cards: the parts of your profile that score lowest are gaps, the highest are strengths. */
window.snapRender=function(){const el=document.getElementById('snap');if(!el)return;
 if(typeof MSCORE==='undefined'||!MSCORE.size||!MatchCore.hasProfile(profile)){el.hidden=true;return}
 const P=MatchCore.profile(profile),best=k=>[...MSCORE.entries()].filter(([,m])=>m.tk===k).sort((a,b)=>b[1].pct-a[1].pct).slice(0,30).map(([id])=>BYID.get(id)).filter(Boolean),nRe=best(3).length,top=best(3).concat(best(2));if(!top.length){el.hidden=true;return}
 const acc={},acts=new Map();let nR=0,nP=0;for(const m of MSCORE.values()){if(m.tk===3)nR++;else if(m.tk===2)nP++}
 for(const x of top){const r=MatchCore.score({...x,industry:x.industry||x.category},P,CFG,MW),f=r.feedback||{};
  for(const b of f.breakdown||[]){if(b.v==null||!b.t||!['School','GPA','Experience','Skills','Fit'].includes(b.k))continue;const a=acc[b.k]||(acc[b.k]={n:0,s:0,t:new Map()});a.n++;a.s+=b.v;a.t.set(b.t,(a.t.get(b.t)||0)+1)}
  for(const s of (f.actions||[]).slice(0,2))acts.set(s,(acts.get(s)||0)+1)}
 const rows=Object.entries(acc).map(([k,a])=>({k,v:Math.round(a.s/a.n),t:[...a.t.entries()].sort((p,q)=>q[1]-p[1])[0][0].replace(/^Your /,'Matches your ')}));
 const gaps=rows.filter(r=>r.v<65).sort((a,b)=>a.v-b.v).slice(0,3),str=rows.filter(r=>r.v>=65).sort((a,b)=>b.v-a.v).slice(0,3);
 const e=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));const li=a=>a.map(r=>`<li><b>${e(r.k)}</b> <span class="muted">(${r.v}/100)</span>: ${e(r.t)}</li>`).join('');
 const next=[...acts.entries()].sort((a,b)=>b[1]-a[1])[0];
 el.innerHTML=`<h2 id="snapH">Your honest snapshot</h2><p class="muted small">From your ${nRe} best Realistic listings and ${top.length-nRe} best Reach picks, so the gaps show what stands between you and the harder roles. ${nR.toLocaleString()} are Realistic for you and ${nP.toLocaleString()} are Reach picks.</p>
 <div class="snap-cols"><div><h3>Top gaps</h3>${gaps.length?`<ul>${li(gaps)}</ul>`:'<p class="muted">Nothing scores below 65 even on your Reach picks. Your limit is how selective the companies are, not your profile.</p>'}</div><div><h3>Top strengths</h3>${str.length?`<ul>${li(str)}</ul>`:'<p class="muted">No part of your profile scores 65 or higher on these listings yet.</p>'}</div></div>
 ${next?`<p class="snap-next"><b>Do this next:</b> ${e(next[0])}</p>`:''}<p class="small"><a href="#db" data-go="db" id="snapReal">See listings that are Realistic for you →</a></p>`;el.hidden=false;
 const a=document.getElementById('snapReal');a.onclick=()=>{F.tagf='realistic';const s=document.getElementById('tagf');if(s)s.value='realistic';setTimeout(()=>update(),0)}};
