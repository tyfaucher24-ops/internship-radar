/* V8 searchable dropdowns. One component for every known list on the site.
   Combo.field(host,opts)  -> a form field (single or multi; multi shows wrapping chips) that opens a searchable panel.
   Combo.list(host,opts)   -> the same searchable, virtualized, checkable list inline (used inside filter panels).
   opts: {options:[{v,label?,group?,count?,pinned?,hint?}] | ()=>[...], multi, value, placeholder, searchPlaceholder, other:true,
          onChange(value), counts:true, label (aria), maxChips}
   Fuzzy: every typed word must start a word in the option ("comp sci" -> Computer Science), or match its initials ("cs"),
   or appear inside it (3+ letters). Lists over 60 rows are virtualized (only visible rows are in the DOM). */
(function(G){
const ROW=40,VIS=9;
const nrm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9+#& ]/g,' ').replace(/\s+/g,' ').trim();
const escH=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let uid=0;
function prep(o){o=typeof o==='string'?{v:o}:o;const label=o.label||o.v;const n=nrm(label);const words=n.split(' ');const al=String(o.alias||'').split('|').map(nrm).filter(Boolean);return{...o,label,_n:n,_w:words,_i:words.map(w=>w[0]).join(''),_a:al,_aw:al.flatMap(a=>a.split(' '))}}
/* V9 ranking tiers: exact name 100 > exact alias 90 > name starts with 80 > alias starts with 70 > every word starts a word 60 >
   alias word-prefix 50 > initials 40 > fuzzy substring 20. Counts/popularity only break ties inside a tier. */
function match(o,toks,q){if(!toks.length)return 1;
 if(o._n===q)return 100;if(o._a.includes(q))return 90;if(o._n.startsWith(q))return 80;if(o._a.some(a=>a.startsWith(q)))return 70;
 if(toks.every(t=>o._w.some(w=>w.startsWith(t))))return 60;if(toks.every(t=>o._aw.some(w=>w.startsWith(t))))return 50;
 if(q.length>=2&&!q.includes(' ')&&o._i.startsWith(q))return 40;if(toks.every(t=>t.length>=3&&(o._n.includes(t)||o._a.some(a=>a.includes(t)))))return 20;return 0}
function filter(all,q,pinnedFirst){const qq=nrm(q),toks=qq?qq.split(' '):[];const t0=performance.now();let out;
 if(!toks.length){out=pinnedFirst?[...all.filter(o=>o.pinned).map(o=>({...o,group:'Popular'})),...all.filter(o=>!o.pinned||true)]:all}
 else{out=[];for(const o of all){const s=match(o,toks,qq);if(s)out.push([s,o])}const w=o=>o[0]+(o[1].boost||0)+Math.min(4,(o[1].count?Math.log10(o[1].count+1)*0.8:0)+(o[1].pinned?1:0));out.sort((a,b)=>w(b)-w(a)||a[1].label.length-b[1].label.length);G.Combo._top=out.length?out[0][0]:0;out=out.map(x=>({...x[1],group:null}))}
 G.Combo.lastSearchMs=performance.now()-t0;return out}
/* ---- the searchable list (shared by field + inline) ---- */
function makeList(box,st){const id='cb'+(++uid);
 box.innerHTML=`<div class="cb-sbox"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="6"/><path d="M14 14l4 4"/></svg><input class="cb-search" type="text" role="searchbox" autocomplete="off" spellcheck="false" placeholder="${escH(st.searchPlaceholder||'Search…')}" aria-controls="${id}" aria-label="Search ${escH(st.label||'options')}"></div><div class="cb-list" id="${id}" role="listbox" ${st.multi?'aria-multiselectable="true"':''} tabindex="-1"><div class="cb-pad"></div><div class="cb-rows"></div></div><p class="cb-none" hidden>No matches. Try fewer letters.</p>`;
 const inp=box.querySelector('.cb-search'),list=box.querySelector('.cb-list'),pad=list.querySelector('.cb-pad'),rows=list.querySelector('.cb-rows'),none=box.querySelector('.cb-none');
 let view=[],act=-1;
 function build(){const all=st.all();let f=filter(all,inp.value,st.pinnedFirst!==false&&all.some(o=>o.pinned));
  // group headers
  const v=[];let g;for(const o of f){const gg=o.group||null;if(gg&&gg!==g){v.push({hdr:gg});g=gg}else if(!gg&&g){v.push({hdr:'All'});g=null}v.push(o)}
  const q=inp.value.trim();if(st.other!==false&&st.allowOther){const exact=all.some(o=>nrm(o.label)===nrm(q));v.push({other:true,q:exact?'':q})}
  view=v;act=view.findIndex(o=>!o.hdr&&!o.other&&o.v!==undefined);if(inp.value.trim()&&(G.Combo._top||0)<50)act=-1;if(!q&&!st.multi){const si=view.findIndex(o=>!o.hdr&&isSel(o.v));if(si>=0)act=si}
  none.hidden=view.some(o=>!o.hdr&&!o.other);paint(true)}
 const isSel=v=>st.multi?st.value.includes(v):st.value===v;
 function rowHTML(o,i){if(o.hdr)return`<div class="cb-h" role="presentation" style="top:${i*ROW}px">${escH(o.hdr)}</div>`;
  if(o.other)return`<div class="cb-o cb-other${i===act?' act':''}" role="option" data-i="${i}" id="${id}-o${i}" aria-selected="false" style="top:${i*ROW}px">${o.q?`Other: use “${escH(o.q)}”`:'Other: type your own above'}</div>`;
  const s=isSel(o.v);return`<div class="cb-o${s?' sel':''}${i===act?' act':''}${st.counts&&!o.count&&!s?' dim':''}" role="option" id="${id}-o${i}" data-i="${i}" aria-selected="${s}" style="top:${i*ROW}px">${st.multi?`<span class="cb-ck" aria-hidden="true">${s?'✓':''}</span>`:''}<span class="cb-t">${escH(o.label)}</span>${o.hint?`<span class="cb-hint">${escH(o.hint)}</span>`:''}${st.counts?`<span class="cb-n">${(o.count||0).toLocaleString()}</span>`:''}${!st.multi&&s?'<span class="cb-ck1" aria-hidden="true">✓</span>':''}</div>`}
 let lastWin='';function paint(force){const n=view.length;pad.style.height=n*ROW+'px';const top=list.scrollTop,s=Math.max(0,Math.floor(top/ROW)-4),e=Math.min(n,s+VIS+12);const key=s+':'+e+':'+act;if(!force&&key===lastWin)return;lastWin=key;
  let h='';for(let i=s;i<e;i++)h+=rowHTML(view[i],i);rows.innerHTML=h;if(act>=0)inp.setAttribute('aria-activedescendant',id+'-o'+act);else inp.removeAttribute('aria-activedescendant')}
 list.addEventListener('scroll',()=>paint());
 function ensure(i){const t=i*ROW,b=t+ROW;if(t<list.scrollTop)list.scrollTop=t;else if(b>list.scrollTop+list.clientHeight)list.scrollTop=b-list.clientHeight;paint(true)}
 function move(d){if(!view.length)return;let i=act;for(let k=0;k<view.length;k++){i=(i+d+view.length)%view.length;if(!view[i].hdr)break}act=i;ensure(i)}
 function pick(i){const o=view[i];if(!o||o.hdr)return;if(o.other){const q=inp.value.trim();if(!q){inp.focus();return}st.pick(q,true);inp.value='';build();return}st.pick(o.v,false);if(st.multi){build();inp.focus()}}
 rows.addEventListener('mousedown',e=>e.preventDefault());
 rows.addEventListener('click',e=>{const r=e.target.closest('[data-i]');if(r)pick(+r.dataset.i)});
 inp.addEventListener('input',()=>{list.scrollTop=0;build()});
 inp.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();move(1)}else if(e.key==='ArrowUp'){e.preventDefault();move(-1)}else if(e.key==='Enter'){e.preventDefault();if(act>=0)pick(act)}else if(e.key==='Escape'){if(st.onEsc){e.preventDefault();e.stopPropagation();st.onEsc()}}else if(e.key==='Home'&&!inp.value){e.preventDefault();act=-1;move(1)}else if(e.key==='End'&&!inp.value){e.preventDefault();act=0;move(-1)}});
 return{build,inp,refresh:()=>paint(true)}}
/* ---- a form field that opens the list in a panel ---- */
function field(host,o){const st={multi:!!o.multi,value:o.multi?[...(o.value||[])]:(o.value||''),label:o.label,searchPlaceholder:o.searchPlaceholder,allowOther:o.other!==false,counts:!!o.counts,pinnedFirst:o.pinnedFirst};
 let raw=null;st.all=()=>{if(!raw||o.dynamic){const src=typeof o.options==='function'?o.options():o.options;raw=src.map(prep)}return raw};
 const id='cbf'+(++uid);host.classList.add('cb');host.innerHTML=`<div class="cb-field" id="${id}" role="combobox" tabindex="0" aria-haspopup="listbox" aria-expanded="false" aria-label="${escH(o.label||'')}"><div class="cb-val"></div><svg class="cb-car" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3"/></svg></div><div class="cb-pop" hidden></div>`;
 const fld=host.querySelector('.cb-field'),val=host.querySelector('.cb-val'),pop=host.querySelector('.cb-pop');let L=null;
 const lab=v=>{const x=st.all().find(p=>p.v===v);return x?x.label:v};
 function draw(){if(st.multi){val.innerHTML=st.value.length?st.value.map((v,i)=>`<span class="cb-chip">${escH(lab(v))}<button type="button" data-rm="${i}" aria-label="Remove ${escH(lab(v))}" tabindex="-1">×</button></span>`).join(''):`<span class="cb-ph">${escH(o.placeholder||'Choose…')}</span>`}
  else val.innerHTML=st.value?`<span class="cb-one">${escH(lab(st.value))}</span>`:`<span class="cb-ph">${escH(o.placeholder||'Choose…')}</span>`}
 /* V11.2: inside a scrolling column the panel is fixed to the viewport, so the card never clips it; it flips up and shifts left to stay on screen */
 function place(){pop.style.maxHeight='';pop.style.left='';pop.style.top='';pop.style.bottom='';pop.style.width='';pop.style.position='';host.classList.remove('up');
  if(host.closest('.pf-scroll,.mbox')){const f=fld.getBoundingClientRect(),w=Math.min(Math.max(f.width,280),innerWidth-16);pop.style.position='fixed';pop.style.width=w+'px';pop.style.left=Math.max(8,Math.min(f.left,innerWidth-8-w))+'px';const h=pop.getBoundingClientRect().height;
   const below=innerHeight-8-(f.bottom+6),above=f.top-6-8;pop.style.maxHeight='';if(h>below&&above>below){const hh=Math.min(h,above);pop.style.maxHeight=hh+'px';pop.style.top=(f.top-6-hh)+'px'}else{pop.style.maxHeight=Math.min(h,below)+'px';pop.style.top=(f.bottom+6)+'px'}pop.style.overflowY='auto';return}
  const r=pop.getBoundingClientRect();if(r.right>innerWidth-8)pop.style.left=Math.min(0,innerWidth-8-r.right)+'px';const rb=pop.getBoundingClientRect();host.classList.toggle('up',rb.bottom>innerHeight-8&&fld.getBoundingClientRect().top>rb.height+20)}
 addEventListener('scroll',e=>{if(!pop.hidden&&pop.style.position==='fixed'&&!pop.contains(e.target))place()},true);addEventListener('resize',()=>{if(!pop.hidden)place()});
 function open(seed){if(!pop.hidden)return;closeAll(host);if(!L)L=makeList(pop,st);pop.hidden=false;fld.setAttribute('aria-expanded','true');host.classList.add('open');L.inp.value=seed||'';L.build();
  place();
  L.inp.focus({preventScroll:true})}
 function close(focus){if(pop.hidden)return;pop.hidden=true;host.classList.remove('open','up');fld.setAttribute('aria-expanded','false');if(focus)fld.focus({preventScroll:true})}
 st.onEsc=()=>close(true);
 st.pick=(v,custom)=>{if(st.multi){if(!st.value.includes(v))st.value.push(v);if(custom&&!st.all().some(p=>p.v===v))raw.push(prep({v,group:'Your entries'}))}else{st.value=st.value===v&&!custom?st.value:v;if(custom&&!st.all().some(p=>p.v===v))raw.push(prep({v,group:'Your entries'}));close(true)}draw();o.onChange&&o.onChange(st.multi?[...st.value]:st.value)};
 fld.addEventListener('click',e=>{const rm=e.target.closest('[data-rm]');if(rm){e.stopPropagation();st.value.splice(+rm.dataset.rm,1);draw();o.onChange&&o.onChange([...st.value]);return}pop.hidden?open():close(true)});
 fld.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '||e.key==='ArrowDown'){e.preventDefault();open()}else if(e.key==='Backspace'&&st.multi&&st.value.length){st.value.pop();draw();o.onChange&&o.onChange([...st.value])}else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();open(e.key)}});
 host.addEventListener('focusout',e=>{if(!host.contains(e.relatedTarget))setTimeout(()=>{if(!host.contains(document.activeElement))close(false)},0)});
 draw();
 const api={get value(){return st.multi?[...st.value]:st.value},set(v){st.value=st.multi?[...(v||[])]:(v||'');draw()},open,close,el:host,refreshOptions(){raw=null;draw();if(L&&!pop.hidden)L.build()}};host._combo=api;return api}
function closeAll(except){document.querySelectorAll('.cb.open').forEach(h=>{if(h!==except&&h._combo)h._combo.close(false)})}
document.addEventListener('mousedown',e=>{if(!e.target.closest('.cb'))closeAll(null)});
/* ---- inline list (filter panels): staged multi-select with counts ---- */
function list(host,o){const st={multi:true,value:[...(o.value||[])],label:o.label,searchPlaceholder:o.searchPlaceholder,allowOther:false,counts:o.counts!==false,pinnedFirst:o.pinnedFirst,onEsc:o.onEsc};
 let raw=null;st.all=()=>{if(!raw){const src=typeof o.options==='function'?o.options():o.options;raw=src.map(prep)}return raw};
 st.pick=v=>{const i=st.value.indexOf(v);if(i>=0)st.value.splice(i,1);else{if(o.single)st.value=[];st.value.push(v)}o.onChange&&o.onChange([...st.value])};
 host.classList.add('cb-inline');const L=makeList(host,st);L.build();return{get value(){return[...st.value]},set(v){st.value=[...v];L.build()},focus:()=>L.inp.focus({preventScroll:true}),inp:L.inp,rebuild(){raw=null;L.build()}}}
/* auto-growing textareas */
function autogrow(root){(root||document).querySelectorAll('textarea.grow').forEach(t=>{if(t._g)return;t._g=1;const f=()=>{t.style.height='auto';t.style.height=Math.min(400,t.scrollHeight+2)+'px'};t.addEventListener('input',f);requestAnimationFrame(f)})}
G.Combo={field,list,autogrow,norm:nrm,filter:(opts,q)=>filter(opts.map(prep),q,false),lastSearchMs:0};
})(window);
