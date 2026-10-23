/* V14.2 first-run tutorial (specs/V14.2.md §2). Runs once after "Build my profile"; replay from the profile menu.
   Everything is position:fixed and removed on close, so it never shifts layout or leaves a layer that eats clicks. */
(function(){
const KEY='ir_tour_done',$t=id=>document.getElementById(id);
const STEPS=[
 ['.fbar','Search and filter','Search every live internship, then narrow by location, field, term and class year with the filters.'],
 ['#vl .mbadge||#vl [role=listitem]','Your grade','Each card shows how well you fit, graded from your profile. Open a card for honest feedback on what would raise it.'],
 ['#vl .btn-save','Apply and Save','Save keeps an internship in your tracker. Apply opens the real application on the company site.'],
 ['a[data-t="tracker"]','My Tracker','Every saved internship becomes a row in your tracker sheet. Change its status, dates and notes in place.'],
 ['#apTab','Deadline Autopilot','Autopilot plans deadlines, reminders and follow-ups for your saved internships. Export them to Apple Calendar as an .ics file.'],
 ['a[data-t="tracker"]','Outreach','The Outreach tab inside My Tracker keeps the people you contact, and reminds you to follow up.'],
 ['#pmBtn','Profile and settings','Edit your profile under Profile. This menu has theme and data options, and Replay tutorial to see this tour again.']];
let i=0,ui=null,lastFocus=null;
const vis=el=>{if(!el)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden'};
const tgt=s=>{for(const q of s.split('||')){const e=[...document.querySelectorAll(q)].find(vis);if(e)return e}return null};
function close(done){if(!ui)return;try{localStorage.setItem(KEY,done?'done':'skipped')}catch(e){}ui.root.remove();ui=null;document.removeEventListener('keydown',key,true);removeEventListener('resize',place);removeEventListener('scroll',place,true);if(lastFocus&&lastFocus.focus)lastFocus.focus({preventScroll:true})}
function key(e){if(!ui)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(false)}else if(e.key==='ArrowRight'){e.preventDefault();step(1)}else if(e.key==='ArrowLeft'){e.preventDefault();step(-1)}
 else if(e.key==='Tab'){const f=[...ui.card.querySelectorAll('button:not([disabled])')];if(!f.length)return;const a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}else if(!ui.card.contains(document.activeElement)){e.preventDefault();a.focus()}}}
function place(){if(!ui)return;const el=tgt(STEPS[i][0]),c=ui.card,sp=ui.spot,W=innerWidth,H=innerHeight,m=12;
 if(!el){sp.style.opacity='0';c.style.left=Math.max(m,(W-c.offsetWidth)/2)+'px';c.style.top=Math.max(m,(H-c.offsetHeight)/2)+'px';return}
 const r=el.getBoundingClientRect(),pad=6;sp.style.opacity='1';sp.style.transform=`translate(${r.left-pad}px,${r.top-pad}px)`;sp.style.width=r.width+pad*2+'px';sp.style.height=r.height+pad*2+'px';
 const cw=c.offsetWidth,ch=c.offsetHeight;let top=r.bottom+pad+10;if(top+ch>H-m)top=r.top-pad-10-ch;if(top<m)top=Math.min(H-ch-m,Math.max(m,r.bottom+pad+10));
 let left=r.left+r.width/2-cw/2;left=Math.min(W-cw-m,Math.max(m,left));c.style.left=left+'px';c.style.top=Math.max(m,top)+'px'}
function render(){const [s,t,b]=STEPS[i],n=STEPS.length,c=ui.card;
 c.innerHTML=`<p class="tr-n" aria-hidden="true">${i+1} of ${n}</p><h2 id="trT">${t}</h2><p id="trB">${b}</p><div class="tr-dots" aria-hidden="true">${STEPS.map((_,k)=>`<i class="${k===i?'on':''}"></i>`).join('')}</div><p class="sr-only" aria-live="polite">Step ${i+1} of ${n}: ${t}</p>
 <div class="tr-ft"><button type="button" class="tr-skip" data-tr="skip">Skip tour</button><span><button type="button" class="btn-ghost sm" data-tr="back"${i?'':' disabled'}>Back</button><button type="button" class="btn sm" data-tr="next">${i===n-1?'Done':'Next'}</button></span></div>`;
 const el=tgt(s);if(el){const r=el.getBoundingClientRect();if(r.top<70||r.bottom>innerHeight-200)el.scrollIntoView({block:'center',behavior:'instant'})}
 place();requestAnimationFrame(place);c.querySelector('[data-tr="next"]').focus({preventScroll:true})}
function step(d){const j=i+d;if(j<0)return;if(j>=STEPS.length){close(true);return}i=j;render()}
function start(){if(ui)return;try{if(typeof go==='function'&&document.getElementById('t-db')?.hidden)go('db')}catch(e){}
 lastFocus=document.activeElement;i=0;const root=document.createElement('div');root.id='tour';root.className='tour';
 root.innerHTML='<div class="tr-spot" aria-hidden="true"></div><div class="tr-card" role="dialog" aria-modal="true" aria-labelledby="trT" aria-describedby="trB"></div>';
 document.body.appendChild(root);ui={root,spot:root.firstChild,card:root.lastChild};
 ui.card.addEventListener('click',e=>{const b=e.target.closest('[data-tr]');if(!b)return;const a=b.dataset.tr;a==='skip'?close(false):step(a==='next'?1:-1)});
 document.addEventListener('keydown',key,true);addEventListener('resize',place);addEventListener('scroll',place,true);render()}
function startWhenReady(n){n=n||0;if(tgt('#vl .mbadge||#vl [role=listitem]')||n>40)return start();setTimeout(()=>startWhenReady(n+1),150)}
window.Tour={start,startWhenReady,done:()=>{try{return!!localStorage.getItem(KEY)}catch(e){return true}},maybe(){if(!window.Tour.done())startWhenReady()}};
/* profile menu: Replay tutorial */
const pm=$t('pmMenu');if(pm&&!$t('uiTour')){const b=document.createElement('button');b.type='button';b.id='uiTour';b.textContent='Replay tutorial';b.onclick=()=>{pm.hidden=true;$t('pmBtn')?.setAttribute('aria-expanded','false');setTimeout(start,0)};pm.appendChild(b)}
})();
