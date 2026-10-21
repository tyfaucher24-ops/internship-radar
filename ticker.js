/* V11 Internship Exchange: a ticker of REAL changes from the latest sync diff (data/changes.json).
   No events file, or no events, means no ticker. Nothing is simulated. */
(function(){
const $=id=>document.getElementById(id);const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
let CH=null,lastUpd='';
const KL={new:'▲ NEW',closed:'▼ CLOSED',deadline:'● DEADLINE MOVED'};
const fmtT=t=>new Date(t).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
const fmtD=d=>{const x=new Date(d+'T12:00:00');return x.toLocaleDateString([],{month:'short',day:'numeric'})};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function has(id){try{return typeof BYID!=='undefined'&&BYID.has(String(id))}catch(_){return false}}
function item(e){const det=e.k==='deadline'?`${esc(e.co)} → ${fmtD(e.to)}`:`${esc(e.co)}`;
 const ti=e.k==='deadline'?`<span class="tk-t">${esc(e.ti)} (was ${fmtD(e.from)})</span>`:`<span class="tk-t">${esc(e.ti)}${e.loc?' · '+esc(e.loc):''}</span>`;
 const ok=has(e.id);
 return `<button type="button" class="tk-i tk-${e.k}" data-tk="${esc(e.id)}"${ok?'':' disabled'} title="${esc(KL[e.k]+' · '+e.co+' · '+e.ti+' · seen in the sync at '+fmtT(e.t))}"><span class="tk-k">${KL[e.k]}</span><span class="tk-co">${det}</span>${ti}<span class="tk-tm">${fmtT(e.t)}</span></button>`}
function pick(ev){/* latest sync first; interleave kinds so one kind doesn't fill the bar; cap the DOM size */
 const latest=ev.filter(e=>e.t===ev[0].t),by={new:[],deadline:[],closed:[]};latest.forEach(e=>by[e.k]&&by[e.k].push(e));
 const out=[];for(let i=0;out.length<36&&i<200;i++)for(const k of ['deadline','new','closed']){if(by[k][i])out.push(by[k][i])}return out.slice(0,36)}
function render(){const T=$('ticker');if(!T)return;const ev=(CH&&CH.events)||[];if(!ev.length){T.hidden=true;return}
 const L=pick(ev);const h=L.map(item).join('');$('tkTrack').innerHTML=h+(RM?'':h.replace(/<button /g,'<button aria-hidden="true" tabindex="-1" '));
 $('tkTrack').style.setProperty('--tk-dur',Math.max(40,L.length*5)+'s');$('tkAsOf').textContent='as of '+fmtT(ev[0].t);T.hidden=false}
async function load(){try{const r=await fetch('data/changes.json?ts='+Date.now(),{cache:'no-store'});if(!r.ok)return;const j=await r.json();if(j.updated===lastUpd)return;lastUpd=j.updated;CH=j;render()}catch(_){}}
function whenReady(f){let n=0;(function w(){if(has('__')||(typeof BYID!=='undefined'&&BYID.size)||n++>60)f();else setTimeout(w,500)})()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-tk]');if(!b||b.disabled)return;const x=BYID.get(b.dataset.tk);if(x)openDrawer(x)});
function market(){if(!CH)return;const ev=CH.events||[],at=ev.length?ev[0].t:CH.updated,cur=ev.filter(e=>e.t===at);const c=k=>(CH.counts&&at===CH.updated&&CH.counts[k]!=null)?CH.counts[k]:cur.filter(e=>e.k===k).length;
 const byco={};cur.forEach(e=>{const o=byco[e.co]||(byco[e.co]={n:0,c:0});e.k==='new'?o.n++:e.k==='closed'?o.c++:0});
 const top=(f)=>Object.entries(byco).filter(([,o])=>f(o)>0).sort((a,b)=>f(b[1])-f(a[1])).slice(0,6).map(([n,o])=>`<li><span>${esc(n)}</span><b>${f(o)}</b></li>`).join('')||'<li>None</li>';
 const feedNote=()=>CH.counts&&cur.length<(CH.counts.new+CH.counts.closed+CH.counts.deadline)?`<p class="mk-sub">Showing up to 150 of each kind.</p>`:'';const feed=k=>cur.filter(e=>!k||e.k===k).slice(0,150).map(e=>`<li class="tk-${e.k}"><span class="tk-k">${KL[e.k]}</span><span>${has(e.id)?`<a href="#" data-tk="${esc(e.id)}">${esc(e.co)}</a>`:esc(e.co)} · ${esc(e.ti)}${e.k==='deadline'?` · ${fmtD(e.from)} → ${fmtD(e.to)}`:''}</span></li>`).join('')||'<li>None in this sync.</li>';
 openModal(`<div class="mk"><h2 class="mk-h">Market Activity</h2><p class="mk-sub">Real changes found by the sync at ${new Date(at).toLocaleString([],{weekday:'short',hour:'numeric',minute:'2-digit'})}, comparing it with the previous sync. ▲ = first seen in this sync, ▼ = no longer open at the source, ● = closing date changed.</p>
 <div class="mk-stats"><div class="mk-s up"><b>▲ ${c('new')}</b><span>added</span></div><div class="mk-s dn"><b>▼ ${c('closed')}</b><span>closed</span></div><div class="mk-s mv"><b>● ${c('deadline')}</b><span>deadline moved</span></div></div>
 <div id="mkSpark"></div>
 <h3 class="mk-sec">Top movers</h3><div class="mk-movers"><div><b>Most added</b><ol>${top(o=>o.n)}</ol></div><div><b>Most closed</b><ol>${top(o=>o.c)}</ol></div></div>
 <h3 class="mk-sec">Feed</h3><div class="mk-tabs" role="group" aria-label="Filter feed"><button type="button" data-mk="" aria-pressed="true">All</button><button type="button" data-mk="new" aria-pressed="false">Added</button><button type="button" data-mk="closed" aria-pressed="false">Closed</button><button type="button" data-mk="deadline" aria-pressed="false">Deadline moved</button></div>${feedNote()}<ul class="mk-feed" id="mkFeed">${feed('')}</ul></div>`);
 document.querySelectorAll('[data-mk]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-mk]').forEach(o=>o.setAttribute('aria-pressed',o===b));$('mkFeed').innerHTML=feed(b.dataset.mk)});
 $('mkFeed').addEventListener('click',e=>{const a=e.target.closest('[data-tk]');if(a){e.preventDefault();closeModal();const x=BYID.get(a.dataset.tk);if(x)openDrawer(x)}});
 fetch('data/sync_history.json?ts='+Date.now()).then(r=>r.ok?r.json():[]).then(h=>{const el=$('mkSpark');if(!el)return;const P=(h||[]).filter(x=>x.open_visible);
  if(P.length<2){el.innerHTML=`<p class="mk-sub">A trend line of open internships appears once there are at least two syncs on record.</p>`;return}
  const v=P.map(x=>x.open_visible),mn=Math.min(...v),mx=Math.max(...v),W=300,H=48,pts=v.map((y,i)=>`${(i/(v.length-1)*W).toFixed(1)},${(H-4-(mx===mn?.5:(y-mn)/(mx-mn))*(H-8)).toFixed(1)}`).join(' ');
  el.innerHTML=`<svg class="mk-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Open internships over the last ${v.length} syncs: from ${v[0].toLocaleString()} to ${v[v.length-1].toLocaleString()}"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.5"/></svg><p class="mk-sub">Open internships over the last ${v.length} syncs: ${v[0].toLocaleString()} → ${v[v.length-1].toLocaleString()}</p>`}).catch(()=>{})}
window.openMarket=market;
function boot(){whenReady(()=>{load();setInterval(load,5*60*1000)});$('tkMarket')&&($('tkMarket').onclick=market)}
const go=()=>('requestIdleCallback' in window?requestIdleCallback(boot,{timeout:2500}):setTimeout(boot,1200));
document.readyState==='complete'?go():addEventListener('load',go);
})();
