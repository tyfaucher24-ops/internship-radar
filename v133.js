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
