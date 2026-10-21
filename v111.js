/* V11.1: rolling digits, colour-blind grades, light/dark theme, Cmd/Ctrl+K quick search, intro ticker. Real data only. */
(function(){
const $=id=>document.getElementById(id),RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* ---- rolling digits: each digit is a 0-9 column moved with transform (position only) ---- */
function roll(el,n){if(!el)return;const s=Number(n).toLocaleString();el.setAttribute('aria-label',s);el.classList.add('roll');
 let cols=el.querySelectorAll('.rd');if(el.dataset.v===s)return;
 if(cols.length!==s.replace(/\D/g,'').length||el.textContent.length!==s.length&&!cols.length){el.innerHTML=[...s].map(ch=>/\d/.test(ch)?'<span class="rd" aria-hidden="true"><span class="rd-s">0<br>1<br>2<br>3<br>4<br>5<br>6<br>7<br>8<br>9</span></span>':`<span class="rs" aria-hidden="true">${ch}</span>`).join('');cols=el.querySelectorAll('.rd');void el.offsetWidth}
 const ds=s.replace(/\D/g,'');cols.forEach((c,i)=>{c.firstChild.style.transform=`translateY(${-ds[i]*10}%)`});el.dataset.v=s}
window.rollNum=roll;
/* lead number of a sentence ("10,827 open internships · …") */
function rollLead(el){if(!el||el.querySelector('.roll'))return;const t=el.firstChild;if(!t||t.nodeType!==3)return;const m=t.nodeValue.match(/^([\d,]+)(.*)$/s);if(!m)return;
 const sp=document.createElement('span');sp.className='mono';t.nodeValue=m[2];el.insertBefore(sp,t);roll(sp,+m[1].replace(/,/g,''))}
const obs=new MutationObserver(ms=>{for(const m of ms){const e=m.target.nodeType===1?m.target:m.target.parentElement;const h=e&&e.closest&&e.closest('.hdrCount');if(h&&!h.closest('#intro'))rollLead(h)}});
document.querySelectorAll('.hdrCount').forEach(h=>{if(!h.closest('#intro'))obs.observe(h,{childList:true})});
const dc=$('dCount');if(dc)new MutationObserver(()=>{const v=dc.textContent;if(/^[\d,]+$/.test(v)){const n=+v.replace(/,/g,'');dc.textContent='';roll(dc,n)}}).observe(dc,{childList:true});
/* market stats roll in when the panel opens */
document.addEventListener('click',e=>{if(!e.target.closest('#tkMarket'))return;setTimeout(()=>document.querySelectorAll('.mk-s b').forEach(b=>{const n=+b.textContent.replace(/,/g,'');if(!isNaN(n)){b.textContent='0';roll(b,0);requestAnimationFrame(()=>requestAnimationFrame(()=>roll(b,n)))}}),30)});
/* ---- theme + colour-blind toggles (menu) ---- */
const H=document.documentElement,P=JSON.parse(localStorage.getItem('ir_ui')||'{}');
function apply(){H.classList.toggle('dark',P.theme==='dark');H.classList.toggle('cb',!!P.cb);const t=$('uiTheme'),c=$('uiCb');
 if(t){t.textContent=P.theme==='dark'?'☀ Light mode':'☾ Dark mode';t.setAttribute('aria-pressed',P.theme==='dark')}if(c){c.textContent='Colour-blind grades: '+(P.cb?'On':'Off');c.setAttribute('aria-pressed',!!P.cb)}
 const mt=document.querySelector('meta[name=theme-color]');if(mt)mt.content=P.theme==='dark'?'#0f1220':'#5b46c9'}
const save=()=>{localStorage.setItem('ir_ui',JSON.stringify(P));apply()};
$('uiTheme')?.addEventListener('click',()=>{P.theme=P.theme==='dark'?'light':'dark';save()});
$('uiCb')?.addEventListener('click',()=>{P.cb=!P.cb;save()});apply();
/* ---- Cmd/Ctrl+K quick search ---- */
function qs(){if(typeof openModal!=='function'||typeof D==='undefined')return;
 openModal(`<div class="qk"><h2 class="qk-h">Quick search</h2><input id="qkIn" type="search" placeholder="Company or role" aria-label="Quick search" autocomplete="off"><ul id="qkRes" class="qk-res" role="listbox"></ul><p class="qk-tip"><kbd>↑</kbd><kbd>↓</kbd> to move · <kbd>Enter</kbd> to open · <kbd>Esc</kbd> to close</p></div>`);
 const inp=$('qkIn'),ul=$('qkRes');let hits=[],sel=0;
 const draw=()=>{ul.innerHTML=hits.map((x,i)=>`<li role="option" aria-selected="${i===sel}" data-qk="${esc(x.id)}"><b>${esc(x.company)}</b> <span>${esc(x.title)}</span></li>`).join('')||(inp.value.trim()?'<li class="qk-none">No open internships match.</li>':'')};
 inp.addEventListener('input',()=>{const q=inp.value.trim().toLowerCase();sel=0;hits=[];if(q){for(const x of D){if(x.st==='closed')continue;const co=(x.company||'').toLowerCase(),ti=(x.title||'').toLowerCase();if(co.includes(q)||ti.includes(q)){hits.push(x);if(hits.length>=8)break}}}draw()});
 inp.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){sel=Math.min(sel+1,hits.length-1);draw();e.preventDefault()}else if(e.key==='ArrowUp'){sel=Math.max(sel-1,0);draw();e.preventDefault()}else if(e.key==='Enter'&&hits[sel]){pickQ(hits[sel].id)}});
 ul.addEventListener('click',e=>{const li=e.target.closest('[data-qk]');if(li)pickQ(li.dataset.qk)});setTimeout(()=>inp.focus(),30)}
function pickQ(id){const x=BYID.get(String(id));if(typeof closeModal==='function')closeModal();else{const m=$('modal');if(m)m.hidden=true}if(x)openDrawer(x)}
window.quickSearch=qs;
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();qs()}});
/* ---- intro ticker: a read-only copy of the real Exchange ticker ---- */
const tr=$('tkTrack'),it=$('iTkTrack');
if(tr&&it)new MutationObserver(()=>{const box=$('iTk');if(!box||!it.isConnected)return;const src=[...tr.querySelectorAll('.tk-i:not([aria-hidden])')].slice(0,24);if(!src.length){box.hidden=true;return}
 const h=src.map(b=>`<span class="tk-i ${b.className.replace('tk-i','')}">${b.innerHTML}</span>`).join('');it.innerHTML=h+(RM?'':h);it.style.setProperty('--tk-dur',Math.max(40,src.length*5)+'s');box.hidden=false}).observe(tr,{childList:true});
})();
