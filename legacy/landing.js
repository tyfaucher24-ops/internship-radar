/* V3 landing: globe intro + radar/sonar transition. 3D is lazy-loaded; static fallback when slow / no WebGL / reduced motion. */
(()=>{
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches,MOB=matchMedia('(max-width:700px)').matches;
const US={lat:39.3,lng:-97.5};const SP=Math.max(1,+new URLSearchParams(location.search).get('introSlow')||1);/* introSlow: test-only slow motion for screenshots */const B=document.body;
const prefs=()=>Store.get('prefs',{});let soundOn=!!prefs().sound;
let G=null,CITIES=[],DOTS=new Map(),state=B.classList.contains('landing')?'landing':'app',timers=[],raf=0,fxT0=0,fxMode=null;
const webgl=(()=>{try{const c=document.createElement('canvas');return !!(window.WebGLRenderingContext&&(c.getContext('webgl')||c.getContext('experimental-webgl')))}catch{return false}})();
const nc=navigator.connection||{};const SLOW=!webgl||nc.saveData||/(^|-)2g/.test(nc.effectiveType||'')||(navigator.deviceMemory&&navigator.deviceMemory<2)||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=2);
const fx=$('fx'),ctx=fx.getContext('2d');const DPR=Math.min(2,devicePixelRatio||1);
function size(){fx.width=innerWidth*DPR;fx.height=innerHeight*DPR;if(G)G.width(innerWidth).height(innerHeight)}addEventListener('resize',size);size();
// direct links (#find etc.) skip the intro
const startHash=location.hash.slice(1);if(startHash&&document.getElementById('t-'+startHash)){enterApp(true)}
/* ---- counter (real counts from data.json) ---- */
document.addEventListener('radar:data',()=>{const wk=D.filter(x=>x.st!=='closed'&&x.deadline&&days(x.deadline)>=0&&days(x.deadline)<=7).length;countUp($('cX'),D.length);countUp($('cY'),wk);recolor()});
function countUp(el,n){if(RM){el.textContent=n.toLocaleString();return}const t0=performance.now();const f=t=>{const p=Math.min(1,(t-t0)/900);el.textContent=Math.round(n*(1-Math.pow(1-p,3))).toLocaleString();if(p<1)requestAnimationFrame(f)};requestAnimationFrame(f)}
/* ---- sound (WebAudio, muted by default) ---- */
let AC=null;function ping(){if(!soundOn)return;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();const t=AC.currentTime;[0,.32].forEach((d,i)=>{const o=AC.createOscillator(),g=AC.createGain();o.type='sine';o.frequency.setValueAtTime(1180,t+d);o.frequency.exponentialRampToValueAtTime(620,t+d+.9);g.gain.setValueAtTime(.0001,t+d);g.gain.exponentialRampToValueAtTime(i?.05:.16,t+d+.02);g.gain.exponentialRampToValueAtTime(.0001,t+d+1.6);o.connect(g).connect(AC.destination);o.start(t+d);o.stop(t+d+1.7)})}catch(e){}}
const sndUI=()=>{$('snd').textContent=soundOn?'🔊':'🔇';$('snd').title=`Ping sound (${soundOn?'on':'off'})`;$('snd').setAttribute('aria-label',soundOn?'Sound on':'Sound off')};sndUI();
$('snd').onclick=()=>{soundOn=!soundOn;Store.set('prefs',{...prefs(),sound:soundOn});sndUI();if(soundOn)ping()};
/* ---- globe (lazy) ---- */
function loadScript(src){return new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
const idle=window.requestIdleCallback||(f=>setTimeout(f,200));
if(!SLOW&&!RM)idle(()=>Promise.all([loadScript('https://cdn.jsdelivr.net/npm/globe.gl@2.46.2/dist/globe.gl.min.js'),fetch('cities.json').then(r=>r.json())]).then(([,c])=>initGlobe(c.cities)).catch(e=>console.warn('3D globe unavailable, using static fallback',e)),{timeout:1200});
else fetch('cities.json').then(r=>r.json()).then(c=>{CITIES=c.cities});
function dotEl(c){const el=document.createElement('div');const n=c.ids.length;const s=MOB?Math.min(6,2+Math.log2(n+1)*.8):Math.min(7,2.2+Math.log2(n+1)*.9);
 el.className='gdot';el.style.cssText=`--s:${s.toFixed(1)}px;--o:${Math.min(1,.45+Math.log10(n+1)*.3).toFixed(2)};--g:${Math.min(.95,.25+Math.log10(n+1)*.35).toFixed(2)};--d:${(-Math.random()*3).toFixed(2)}s`;
 el.onmouseenter=e=>{const t=$('tip');t.textContent=`${c.city}, ${c.state} · ${n} internship${n>1?'s':''}`;t.hidden=false;t.style.left=e.clientX+'px';t.style.top=e.clientY+'px'};el.onmouseleave=()=>$('tip').hidden=true;
 el.onclick=e=>{e.stopPropagation();$('tip').hidden=true;pickCity(c)};const bb=BEST.get(c.city+'|'+c.state);if(bb)el.classList.add(bb);DOTS.set(c.city+'|'+c.state,el);return el}
function initGlobe(cities){CITIES=cities;recolor();G=Globe({animateIn:false})($('globe')).width(innerWidth).height(innerHeight).backgroundColor('rgba(0,0,0,0)')
 .globeImageUrl('https://cdn.jsdelivr.net/npm/three-globe@2.45.0/example/img/earth-blue-marble.jpg').showAtmosphere(true).atmosphereColor('#ffc8e6').atmosphereAltitude(.22)
 .htmlElementsData(cities).htmlLat('lat').htmlLng('lng').htmlAltitude(.004).htmlElement(dotEl).htmlTransitionDuration(0);
 const ctl=G.controls();ctl.enableZoom=false;ctl.enablePan=false;ctl.autoRotate=!RM&&state==='landing';ctl.autoRotateSpeed=.35;
 if(state==='app')G.pointOfView(appPOV(),0);else G.pointOfView({lat:24,lng:-60,altitude:MOB?3.9:2.5},0);
 try{const m=G.globeMaterial();m.emissive&&m.emissive.set('#3b2a6e');m.emissiveIntensity=.18}catch{}
 B.classList.add('has3d');recolor()}
const appPOV=()=>({lat:37.5,lng:-96,altitude:MOB?1.25:.85});
/* match glow: gold = Strong, teal = Realistic */
let BEST=new Map();function recolor(){if(typeof MATCHES==='undefined'||!CITIES.length)return;const best=BEST=new Map();const byId=new Map();MATCHES.forEach(m=>{if(!m.poor&&m.bucket!=='Reach')byId.set(m.x.id,m.bucket)});
 CITIES.forEach(c=>{let b=null;for(const id of c.ids){const v=byId.get(id);if(v==='Strong Match'){b='strong';break}if(v)b='real'}best.set(c.city+'|'+c.state,b)});
 DOTS.forEach((el,k)=>{el.classList.toggle('strong',best.get(k)==='strong');el.classList.toggle('real',best.get(k)==='real')})}
document.addEventListener('radar:matches',recolor);
/* tilt toward cursor */
addEventListener('pointermove',e=>{if(state!=='landing'||RM||e.pointerType==='touch')return;const dx=e.clientX/innerWidth-.5,dy=e.clientY/innerHeight-.5;$('globeWrap').style.transform=`perspective(1200px) rotateY(${dx*6}deg) rotateX(${-dy*5}deg)`});
/* ---- FX canvas: sonar rings + radar sweep ---- */
const gOff=()=>{const m=new DOMMatrixReadOnly(getComputedStyle($('globe')).transform);return m.m42||0};
function usCenter(){if(G){const p=G.getScreenCoords(US.lat,US.lng);if(p&&isFinite(p.x))return {x:p.x,y:p.y+gOff()}}const f=$('fallbackGlobe').getBoundingClientRect();return {x:f.left+f.width*.41,y:f.top+f.height*.4}}
function drawFx(t){const el=(t-fxT0)/SP;ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,innerWidth,innerHeight);const c=usCenter(),maxR=Math.hypot(innerWidth,innerHeight);
 // rings: start at 600ms, 4 rings staggered
 for(let i=0;i<4;i++){const e=(el-600-i*220)/1500;if(e<0||e>1)continue;const r=20+e*maxR*.75;ctx.beginPath();ctx.arc(c.x,c.y,r,0,7);ctx.strokeStyle=`rgba(255,240,255,${(1-e)*.75})`;ctx.lineWidth=2.2*(1-e)+.6;ctx.shadowColor='rgba(255,200,255,.9)';ctx.shadowBlur=14;ctx.stroke()}
 // sweep: 900..1900ms one full turn around the US
 const se=(el-900)/1000;if(se>=0&&se<=1.15){const R=Math.min(innerWidth,innerHeight)*(MOB?.32:.26),a=-Math.PI/2+Math.min(se,1)*Math.PI*2,al=se>1?(1.15-se)/.15:1;
  ctx.shadowBlur=0;const g=ctx.createConicGradient?ctx.createConicGradient(a-0.9,c.x,c.y):null;
  ctx.save();ctx.globalAlpha=al;ctx.beginPath();ctx.moveTo(c.x,c.y);ctx.arc(c.x,c.y,R,a-0.9,a);ctx.closePath();
  if(g){g.addColorStop(0,'rgba(140,255,220,0)');g.addColorStop(.14,'rgba(140,255,220,.32)');g.addColorStop(.1432,'rgba(140,255,220,0)');ctx.fillStyle=g}else ctx.fillStyle='rgba(140,255,220,.18)';ctx.fill();
  ctx.beginPath();ctx.moveTo(c.x,c.y);ctx.lineTo(c.x+Math.cos(a)*R,c.y+Math.sin(a)*R);ctx.strokeStyle='rgba(190,255,235,.95)';ctx.lineWidth=2;ctx.shadowColor='#9fffe0';ctx.shadowBlur=12;ctx.stroke();
  ctx.beginPath();ctx.arc(c.x,c.y,R,0,7);ctx.strokeStyle='rgba(190,255,235,.35)';ctx.lineWidth=1;ctx.stroke();ctx.restore();flareAt(a,c,R)}
 // center blip
 if(el>550&&el<2300){const p=(el-550)/1750;ctx.beginPath();ctx.arc(c.x,c.y,4+Math.sin(p*12)*1.5,0,7);ctx.fillStyle=`rgba(255,255,255,${1-p*.6})`;ctx.shadowColor='#fff';ctx.shadowBlur=16;ctx.fill()}
 if(el<2600&&fxMode)raf=requestAnimationFrame(drawFx);else ctx.clearRect(0,0,innerWidth,innerHeight)}
const flared=new Set();
function flareAt(a,c,R){if(!G)return;DOTS.forEach((el,k)=>{if(flared.has(k))return;const cc=CITIES.find(x=>x.city+'|'+x.state===k);const p=G.getScreenCoords(cc.lat,cc.lng);const dx=p.x-c.x,dy=p.y+gOff()-c.y;if(Math.hypot(dx,dy)>R*1.1)return;
 let d=Math.atan2(dy,dx)-a;d=Math.atan2(Math.sin(d),Math.cos(d));if(d<=0&&d>-0.35){flared.add(k);el.classList.remove('flare');void el.offsetWidth;el.classList.add('flare')}})}
/* ---- the radar moment ---- */
function later(ms,f){timers.push(setTimeout(f,ms))}
function startIntro(after){if(state!=='landing')return;state='intro';B.classList.add('entering');$('globeWrap').style.transform='';
 if(RM){B.style.transition='opacity .2s';later(250,()=>finish(after));return}
 if(G){G.controls().autoRotate=false;G.pointOfView({lat:US.lat,lng:US.lng,altitude:G.pointOfView().altitude},600*SP)}
 fxMode='intro';flared.clear();fxT0=performance.now();raf=requestAnimationFrame(drawFx);
 later(600*SP,ping);
 later(1300*SP,()=>{B.classList.add('deep');if(G)G.pointOfView(appPOV(),1200*SP);else $('fallbackGlobe').style.transform='scale(2.6) translate(6%,4%)'});
 later(2500*SP,()=>finish(after));
 const t0=performance.now();const sk=e=>{if(e.timeStamp-t0<40)return;removeEventListener('pointerdown',sk,true);skip(e)};addEventListener('pointerdown',sk,true)}
function skip(e){if(state!=='intro')return;timers.forEach(clearTimeout);timers=[];finish(window._afterIntro)}
function finish(after){if(state==='app')return;timers.forEach(clearTimeout);timers=[];fxMode=null;cancelAnimationFrame(raf);ctx.clearRect(0,0,fx.width,fx.height);enterApp(false);if(after)after()}
function enterApp(instant){state='app';B.classList.remove('landing','entering');B.classList.add('app-mode');$('globeWrap').style.transform='';
 if(G){G.controls().autoRotate=false;G.pointOfView(appPOV(),instant?0:300)}else $('fallbackGlobe').style.transform='scale(2.6) translate(6%,4%)';window.scrollTo(0,0)}
function ripple(btn,e){const r=btn.getBoundingClientRect(),s=document.createElement('span');s.className='rip';s.style.left=(e.clientX-r.left)+'px';s.style.top=(e.clientY-r.top)+'px';btn.appendChild(s);setTimeout(()=>s.remove(),650)}
const run=after=>{window._afterIntro=after;startIntro(after)};
$('goFind').onclick=e=>{ripple(e.currentTarget,e);run(()=>go('find'))};
$('goLogin').onclick=e=>{ripple(e.currentTarget,e);$('loginNote').hidden=false;setTimeout(()=>run(()=>{go('profile')}),RM?0:900)};
function pickCity(c){$('fCity').value=c.city+'|'+c.state;['fState','fInd','fType','fWin','fYear'].forEach(i=>$(i).value='');$('q').value='';if(typeof render==='function')render();if(state==='landing')run(()=>go('find'));else go('find')}
$('brand').onclick=()=>{location.href=location.pathname};
/* fade-in sections */
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.2});document.querySelectorAll('.fade').forEach(el=>io.observe(el));
window.Landing={startIntro:run,skip,state:()=>state,has3d:()=>!!G};
})();
