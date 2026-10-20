/* V5 start page: V3 concept (planet → radar ping → zoom) rebuilt in WebGL. One rAF loop; sweep, rings, flares and twinkle live in shaders.
   Static hero paints first (pure HTML/CSS); Three.js is loaded lazily, only here, and disposed when the start page closes. */
(function(){
const intro=document.getElementById('intro');if(!intro)return;
const html=document.documentElement,body=document.body;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const Q=new URLSearchParams(location.search);const SLOW=+(Q.get('introSlow')||1);
document.getElementById('replay')?.addEventListener('click',e=>{e.preventDefault();try{localStorage.removeItem('idr_introSeen')}catch(_){}location.href=location.pathname+'?intro=1'});
if(html.classList.contains('seen')){intro.remove();body.classList.add('arrived');return}
body.classList.add('intro-on');
const $i=id=>document.getElementById(id);
let ended=false,stopLoop=()=>{},dispose=()=>{},startTransition=null;
function arrive(){body.classList.remove('intro-on');body.classList.add('arriving');setTimeout(()=>{body.classList.remove('arriving');body.classList.add('arrived')},900)}
function end(fast){if(ended)return;ended=true;try{localStorage.setItem('idr_introSeen','true')}catch(_){}
 intro.classList.add(fast||RM?'fade-fast':'fade');arrive();setTimeout(()=>{stopLoop();dispose();intro.remove();const q=$i('q');q&&q.focus({preventScroll:true})},fast||RM?320:650)}
window.__introEnd=end;
$i('skipIntro').onclick=()=>end(true);
$i('goFind').onclick=()=>end(false);/* V5.1 #9: quick fade, no zoom */
addEventListener('keydown',function k(e){if(e.key==='Escape'&&!ended){end(true);removeEventListener('keydown',k)}});
/* ---------- DOM interactions: cursor glow, parallax, sky ripples, magnetic button ---------- */
const glow=document.createElement('div');
const P={mx:.5,my:.5,tx:.5,ty:.5};
intro.addEventListener('pointermove',e=>{P.tx=e.clientX/innerWidth;P.ty=e.clientY/innerHeight;glow.style.opacity=1});
intro.addEventListener('pointerleave',()=>glow.style.opacity=0);
false&&intro.addEventListener('click',e=>{if(e.target.closest('button,a,canvas,.cityprev'))return;const r=document.createElement('span');r.className='skyping';r.style.left=e.clientX+'px';r.style.top=e.clientY+'px';intro.appendChild(r);setTimeout(()=>r.remove(),1200)});
function ripple(b,e){const r=document.createElement('span');r.className='bping';const rc=b.getBoundingClientRect();r.style.left=(e.clientX-rc.left)+'px';r.style.top=(e.clientY-rc.top)+'px';b.appendChild(r);setTimeout(()=>r.remove(),700)}
const mag=$i('goFind');let magT={x:0,y:0},magC={x:0,y:0};
if(false){intro.addEventListener('pointermove',e=>{const r=mag.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,d=Math.hypot(dx,dy);
 if(d<140){magT.x=dx*.22;magT.y=dy*.3}else{magT.x=magT.y=0}})}
const clouds=[...intro.querySelectorAll('.cloud')],stars=intro.querySelector('.stars');
function domFrame(){}/* V5.1 #9: no parallax/glow/magnet — just the planet */
/* count-up for the live counter once meta arrives */
document.addEventListener('radar:meta',e=>{const el=intro.querySelector('.counter .hdrCount');if(!el||RM)return;const m=e.detail||{};const N=m.open||0,W=m.closing_this_week||0;const t0=performance.now();
 (function f(t){const k=Math.min(1,(t-t0)/1100),e2=1-Math.pow(1-k,3);el.textContent=`${Math.round(N*e2).toLocaleString()} open internships · ${Math.round(W*e2).toLocaleString()} closing this week`;if(k<1&&!ended)requestAnimationFrame(f)})(t0)});
/* ---------- reduced motion: static hero only ---------- */
if(RM){intro.classList.add('static');return}
/* ---------- WebGL planet ---------- */
const cv=$i('gl'),wrap=cv.parentElement,slot=intro.querySelector('.globe-slot');
function webglOK(){try{const c=document.createElement('canvas'),g=c.getContext('webgl2')||c.getContext('webgl');if(!g)return false;const d=g.getExtension('WEBGL_debug_renderer_info'),r=d?String(g.getParameter(d.UNMASKED_RENDERER_WEBGL)):'';window.__swGL=/swiftshader|llvmpipe|softpipe|software|basic render/i.test(r);g.getExtension('WEBGL_lose_context')?.loseContext();return true}catch(_){return false}}
if(!webglOK()||Q.get('gl')==='0'){intro.classList.add('static');let raf;(function l(){domFrame();raf=requestAnimationFrame(l)})();stopLoop=()=>cancelAnimationFrame(raf);return}
const ll2v=(lat,lng,r=1)=>{const a=lat*Math.PI/180,b=lng*Math.PI/180;return[r*Math.cos(a)*Math.sin(b),r*Math.sin(a),r*Math.cos(a)*Math.cos(b)]};
const US={lat:38.5,lng:-97};
new Promise(r=>requestAnimationFrame(()=>setTimeout(r,250))).then(()=>Promise.all([import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js'),
 Promise.resolve(null),fetch('data/hubs.json').then(r=>r.json()).catch(()=>[])])).then(([THREE,landBuf,hubs])=>{
 if(ended)return;
 const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(window.__swGL?1:Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.05,50),G=new THREE.Group();scene.add(G);
 const uC=new THREE.Vector3(...ll2v(US.lat,US.lng));const t1=new THREE.Vector3(0,1,0).cross(uC).normalize(),t2=uC.clone().cross(t1).normalize();
 const U={uTime:{value:0},uPing:{value:-1},uSweep:{value:-10},uC:{value:uC},uT1:{value:t1},uT2:{value:t2},uC2:{value:new THREE.Vector3(0,1,0)},uPing2:{value:-1},uPR:{value:renderer.getPixelRatio()},uScale:{value:1},uHover:{value:-1},uFx:{value:1}};
 const RADAR=`uniform vec3 uC,uT1,uT2,uC2;uniform float uPing,uSweep,uPing2,uTime,uFx;
  float rings(vec3 n,vec3 c,float p){return 0.;}float sweep(vec3 n){return 0.;}/* V5.1 #8: radar ping/sweep removed */`;
 // V3 planet, rebuilt: NASA Blue Marble (public domain) self-hosted at 4K (2K on small screens), sRGB + max anisotropy, day-side lighting, fresnel rim, shader radar overlay
 const big=Math.max(screen.width,screen.height)*(devicePixelRatio||1)>1600;
 const tex=new THREE.TextureLoader().load(big?'assets/earth-4k.jpg':'assets/earth-2k.jpg',()=>{earthReady=true});let earthReady=false;
 tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();tex.generateMipmaps=true;tex.minFilter=THREE.LinearMipmapLinearFilter;
 U.uMap={value:tex};
 const ocean=new THREE.Mesh(new THREE.SphereGeometry(1,96,64),new THREE.ShaderMaterial({uniforms:U,vertexShader:`varying vec3 vN,vW,vV;varying vec2 vUv;void main(){vUv=uv;vN=normalize(position);vec4 w=modelMatrix*vec4(position,1.);vW=normalize(mat3(modelMatrix)*position);vV=normalize(cameraPosition-w.xyz);gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:RADAR+`uniform sampler2D uMap;varying vec3 vN,vW,vV;varying vec2 vUv;void main(){vec3 L=normalize(vec3(-.45,.45,.95));float lam=max(dot(vW,L),0.);float fr=pow(1.-max(dot(vW,vV),0.),3.);
   vec3 tc=texture2D(uMap,vUv).rgb;vec3 col=tc*(.28+1.05*lam)+vec3(1.,.62,.85)*fr*.55+vec3(.35,.55,1.)*fr*.35;
   float r=rings(vN,uC,uPing)+rings(vN,uC2,uPing2)*.8;float s=sweep(vN);col+=vec3(.55,1.,.85)*r*.95+vec3(.35,1.,.8)*s*.35;gl_FragColor=vec4(col,1.);
   #include <colorspace_fragment>
   }`}));
 ocean.rotation.y=-Math.PI/2;/* align Three's sphere UVs with ll2v lat/lng */G.add(ocean);
 const land={geometry:{dispose(){}}};
 // real internship hubs: twinkle + flare when sweep/ping passes, pulse on hover
 const H=hubs.slice(0,1500),hp=new Float32Array(H.length*3),hs=new Float32Array(H.length),hph=new Float32Array(H.length),hid=new Float32Array(H.length);
 H.forEach((h,i)=>{hp.set(ll2v(h[0],h[1],1.006),3*i);hs[i]=Math.min(1,.25+Math.log10(1+h[2])*.32);hph[i]=Math.random()*6.28;hid[i]=i});
 const hg=new THREE.BufferGeometry();hg.setAttribute('position',new THREE.BufferAttribute(hp,3));hg.setAttribute('aS',new THREE.BufferAttribute(hs,1));hg.setAttribute('aP',new THREE.BufferAttribute(hph,1));hg.setAttribute('aI',new THREE.BufferAttribute(hid,1));
 const hubMat=new THREE.ShaderMaterial({uniforms:U,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:RADAR+`uniform float uPR,uScale,uHover;attribute float aS,aP,aI;varying float vA,vF;void main(){vec3 n=normalize(position);vec4 w=modelMatrix*vec4(position,1.);vec3 wn=normalize(mat3(modelMatrix)*n);float f=dot(wn,normalize(cameraPosition-w.xyz));
   vA=smoothstep(0.,.3,f);float tw=.8+.2*sin(uTime*1.7+aP);float hv=abs(aI-uHover)<.5?1.+.5*sin(uTime*9.):0.;vF=sweep(n)*1.6+rings(n,uC,uPing)*.8+rings(n,uC2,uPing2)+hv;vec4 mv=viewMatrix*w;gl_PointSize=uPR*uScale*(2.6+aS*4.6)*(1.+vF*.9)*tw*(3.2/-mv.z);gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`varying float vA,vF;void main(){float d=length(gl_PointCoord-.5);float core=1.-smoothstep(.12,.2,d),halo=pow(1.-smoothstep(0.,.5,d),2.);vec3 c=mix(vec3(1.,.72,.3),vec3(1.,.95,.75),clamp(vF,0.,1.));gl_FragColor=vec4(c*(core+halo*(.55+vF)),(core+halo*.8)*vA);}`});
 const hubPts=new THREE.Points(hg,hubMat);G.add(hubPts);
 // atmosphere glow
 const atm=new THREE.Mesh(new THREE.SphereGeometry(1.14,64,48),new THREE.ShaderMaterial({side:THREE.BackSide,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:`varying float vZ;void main(){vZ=normalize(normalMatrix*normal).z;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying float vZ;void main(){float i=pow(smoothstep(0.,.5,-vZ),1.8);gl_FragColor=vec4(mix(vec3(.45,.7,1.),vec3(1.,.78,.9),.55)*i*1.25,i*.9);}`}));scene.add(atm);
 /* camera fit to the bounding sphere (globe + halo + padding); recomputed on resize/orientation */
 const BOUND=1.14*1.04;let fitD=4,W=1,Hh=1,SL={cx:0,cy:0,s:1},Ctr={x:0,y:0};const tanV=Math.tan(camera.fov*Math.PI/360);
 // distance at which the halo-bounded sphere projects to radius rpx on a viewport of height Hh (exact for a sphere, includes FOV + aspect)
 const distFor=rpx=>BOUND/Math.sin(Math.atan(tanV*rpx/(Hh/2)));
 function fit(){W=Math.max(1,innerWidth);Hh=Math.max(1,innerHeight);const vv=window.visualViewport;if(vv){W=Math.round(vv.width);Hh=Math.round(vv.height)}
  renderer.setSize(W,Hh,false);camera.aspect=W/Hh;const r=slot.getBoundingClientRect();
  SL={cx:r.left+r.width/2,cy:r.top+r.height/2,s:Math.max(40,Math.min(r.width,r.height)/2*.94)};
  fitD=distFor(SL.s);camera.updateProjectionMatrix();U.uScale.value=SL.s/230;const room=Math.min(SL.cx,W-SL.cx,SL.cy,Hh-SL.cy)*.96;S.zmax=Math.max(1,fitD/distFor(Math.max(SL.s,room)));S.zt=Math.min(S.zt,S.zmax)}
 function frameCenter(k){/* k=0: centered in the slot; k=1: centered in the viewport (final zoom-in) */const cx=SL.cx+(W/2-SL.cx)*k,cy=SL.cy+(Hh/2-SL.cy)*k;camera.setViewOffset(W,Hh,W/2-cx,Hh/2-cy,W,Hh);Ctr.x=cx;Ctr.y=cy}
 new ResizeObserver(fit).observe(document.documentElement);addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);addEventListener('orientationchange',()=>setTimeout(fit,250));
 /* state */
 const S={rx:.32,ry:1.0,vx:0,vy:.05,tiltX:0,tiltY:0,tvx:0,tvy:0,zoom:1,zt:1,drag:null,idle:true,phase:'idle',t0:0,camK:0,zmax:1,ctr:0};fit();
 /* pointer: drag with inertia, wheel/pinch zoom within limits, hover tooltip, click a city */
 const tip=document.createElement('div');tip.className='gtip';wrap.appendChild(tip);const pts=new Map();let lastMove=0,downAt=null;
 cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});downAt={x:e.clientX,y:e.clientY,t:performance.now()};S.drag={x:e.clientX,y:e.clientY};S.vx=S.vy=0});
 cv.addEventListener('pointermove',e=>{S.tvx=(e.clientX-SL.cx)/(SL.s*4);S.tvy=(e.clientY-SL.cy)/(SL.s*4);
  if(pts.has(e.pointerId)){const p=pts.get(e.pointerId);if(pts.size===2){const o=[...pts.entries()].find(([k])=>k!==e.pointerId)[1];const d0=Math.hypot(p.x-o.x,p.y-o.y),d1=Math.hypot(e.clientX-o.x,e.clientY-o.y);S.zt=1}
   else if(S.drag&&S.phase==='idle'){const dx=e.clientX-S.drag.x,dy=e.clientY-S.drag.y,k=1.3/SL.s;S.ry+=dx*k;S.rx=Math.max(-1.1,Math.min(1.1,S.rx+dy*k));const now=performance.now(),dt=Math.max(8,now-lastMove);S.vy=dx*k/dt*1000;S.vx=dy*k/dt*1000;lastMove=now;S.drag={x:e.clientX,y:e.clientY}}
   p.x=e.clientX;p.y=e.clientY;tip.style.opacity=0;return}
  hover(e)});
 const up=e=>{pts.delete(e.pointerId);S.drag=null;if(downAt&&Math.hypot(e.clientX-downAt.x,e.clientY-downAt.y)<5&&performance.now()-downAt.t<400)clickCity(e);downAt=null;if(performance.now()-lastMove>90){S.vx=S.vy=0}};
 cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);cv.addEventListener('pointerleave',()=>{tip.style.opacity=0;U.uHover.value=-1});
 false&&cv.addEventListener('wheel',e=>{e.preventDefault();S.zt=Math.min(S.zmax,Math.max(.8,S.zt*Math.exp(-e.deltaY*.0012)))},{passive:false});
 const tmp=new THREE.Vector3();
 function nearestHub(e){const r=cv.getBoundingClientRect();let best=-1,bd=18*18;const cp=camera.position;
  for(let i=0;i<H.length;i++){tmp.fromArray(hp,3*i).applyMatrix4(G.matrixWorld);const facing=tmp.clone().normalize().dot(cp.clone().sub(tmp).normalize());if(facing<.15)continue;tmp.project(camera);
   const x=(tmp.x+1)/2*r.width,y=(1-tmp.y)/2*r.height,d=(x-(e.clientX-r.left))**2+(y-(e.clientY-r.top))**2;if(d<bd){bd=d;best=i}}return best}
 function hover(e){if(S.phase!=='idle')return;const i=nearestHub(e);U.uHover.value=i;cv.style.cursor=i>=0?'pointer':'grab';if(i<0){tip.style.opacity=0;return}const r=cv.getBoundingClientRect();
  tip.textContent=`${H[i][3]} · ${H[i][2].toLocaleString()} internship${H[i][2]===1?'':'s'}`;tip.style.transform=`translate3d(${e.clientX-r.left+14}px,${e.clientY-r.top-34}px,0)`;tip.style.opacity=1}
 function clickCity(e){return;const i=nearestHub(e);if(i<0)return;U.uC2.value.fromArray(hp,3*i).normalize();U.uPing2.value=0;S.ping2=performance.now();preview(H[i])}
 function preview(h){let el=intro.querySelector('.cityprev');if(!el){el=document.createElement('div');el.className='cityprev';el.setAttribute('role','status');intro.appendChild(el)}
  const [city,st]=h[3].split(', ');const L=(typeof D!=='undefined'?D:[]).filter(x=>x.st!=='closed'&&x.st!=='upcoming'&&(x.locations||[]).some(l=>l.city===city&&l.state===st)).slice(0,3);
  el.innerHTML=`<p class="cp-h"><b>${esc(h[3])}</b> · ${h[2].toLocaleString()} internships nearby</p>${L.length?`<ul>${L.map(x=>`<li><b>${esc(x.company)}</b> ${esc(x.title)}</li>`).join('')}</ul>`:'<p class="muted">Loading listings…</p>'}<button type="button" class="cbtn small" id="cpGo">See internships in ${esc(city)}</button>`;
  el.classList.add('on');el.querySelector('#cpGo').onclick=()=>{try{if(typeof F!=='undefined'){F.near=h[3];F.radius='25';update()}}catch(_){}end(false)}}
 /* transition: ease to USA 0.6s → one sonar ping (3 rings) + one sweep → camera glide → hand-off */
 const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 startTransition=()=>{if(S.phase!=='idle')return;S.phase='go';S.t0=performance.now();S.from={rx:S.rx,ry:S.ry,z:S.zoom};intro.querySelector('.cityprev')?.classList.remove('on');intro.classList.add('going');
  let to=-US.lng*Math.PI/180;while(to-S.ry>Math.PI)to-=2*Math.PI;while(S.ry-to>Math.PI)to+=2*Math.PI;S.to={rx:US.lat*Math.PI/180,ry:to}};
 /* fps watchdog → lighter globe */
 /* Adaptive quality (V5.1 #6): never stop rendering. Low fps steps the pixel ratio down (2→1.5→1→.75) instead of swapping to a static globe.
    The old 2-stage watchdog disposed WebGL after ~4.5s of <40fps (always true on software GL / during warm-up) — that was the freeze. */
 // Tiers: each one keeps as much as it can hold. Steps down on sustained slow frames, back up on sustained fast ones (hysteresis), never to a static image.
 const P0=renderer.getPixelRatio();
 const TIERS=[{pr:P0,atm:1,fx:1},{pr:Math.min(P0,1.5),atm:1,fx:1},{pr:Math.min(P0,1.25),atm:1,fx:1},{pr:1,atm:1,fx:.6},{pr:.85,atm:0,fx:.6},{pr:.7,atm:0,fx:.4}].filter((t,i,a)=>i===0||t.pr<a[i-1].pr||t.atm<a[i-1].atm||t.fx<a[i-1].fx);
 let fr=[],qi=window.__swGL?Math.min(3,TIERS.length-1):0,warm=performance.now()+1500,lastStep=0;window.__globeFrames=0;
 function applyTier(){const T=TIERS[qi];renderer.setPixelRatio(T.pr);U.uPR.value=T.pr;atm.visible=!!T.atm;U.uFx.value=T.fx;fit();intro.dataset.lite=String(qi)}
 function watchdog(dt){const now=performance.now();window.__globeFrames++;if(now<warm)return;fr.push(dt);let s=0;for(const x of fr)s+=x;while(s>2000&&fr.length>1)s-=fr.shift();if(s<1800||now-lastStep<1500)return;
  const fps=fr.length/(s/1000);if(fps<48&&qi<TIERS.length-1){qi++;lastStep=now;fr=[];applyTier()}else if(fps>58.5&&qi>0&&now-lastStep>5000){qi--;lastStep=now;fr=[];applyTier()}}
 const dead=false;
 let raf,last=performance.now(),shown=false;
 function frame(now){raf=requestAnimationFrame(frame);const dt=Math.min(64,now-last);last=now;const s=dt/1000;if(document.hidden)return;watchdog(dt);if(dead)return;U.uTime.value=now/1000;domFrame();
  if(S.phase==='idle'){if(!S.drag){S.ry+=(S.vy+.06)*s;S.rx=Math.max(-1.1,Math.min(1.1,S.rx+S.vx*s));const k=Math.pow(.05,s);S.vx*=k;S.vy=S.vy*k}
   S.zoom+=(S.zt-S.zoom)*(1-Math.pow(.004,s))}
  else{const t=(now-S.t0)/1000/SLOW;const a=ease(clamp(t/.6));S.rx=S.from.rx+(S.to.rx-S.from.rx)*a;S.ry=S.from.ry+(S.to.ry-S.from.ry)*a;S.tiltX*=.9;S.tiltY*=.9;
   
   const g=ease(clamp((t-1.0)/1.15));S.zoom=S.from.z+(2.9-S.from.z)*g;S.ctr=ease(clamp((t-.9)/.6));
   if(t>1.55&&!ended)end(false);if(t>2.4){U.uSweep.value=-10}}
  if(S.ping2&&(now-S.ping2)>1600){U.uPing2.value=-1;S.ping2=0}else if(S.ping2)U.uPing2.value=(now-S.ping2)/1000*.38;
  G.rotation.set(S.rx+S.tiltX,S.ry+S.tiltY,0);frameCenter(S.ctr||0);camera.position.set(0,0,fitD/S.zoom);camera.lookAt(0,0,0);renderer.render(scene,camera);
  if(!shown&&earthReady){shown=true;intro.classList.add('gl-on')}}
 applyTier();raf=requestAnimationFrame(frame);
 stopLoop=()=>cancelAnimationFrame(raf);
 dispose=()=>{scene.traverse(o=>{o.geometry&&o.geometry.dispose();o.material&&o.material.dispose()});renderer.dispose();renderer.forceContextLoss?.()};
}).catch(err=>{console.warn('3D globe unavailable, showing static start page',err);intro.classList.add('static');let raf;(function l(){domFrame();raf=requestAnimationFrame(l)})();stopLoop=()=>cancelAnimationFrame(raf)});
})();
