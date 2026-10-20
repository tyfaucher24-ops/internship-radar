/* V4 intro: short, first visit only. Stylized dot-matrix globe (2D canvas, no stock imagery) with real listing dots. */
(function(){const intro=$('intro');const seen=Store.get('introSeen',false);const forced=/[?&]intro=1/.test(location.search);
 const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;const slow=+(new URLSearchParams(location.search).get('introSlow')||1);
 $('replay').onclick=e=>{e.preventDefault();show(true)};
 if(seen&&!forced)return;show(false);
 function show(replay){intro.hidden=false;document.body.classList.add('intro-on');const dur=(RM?1800:4200)*slow;let raf,done=false,t0=performance.now();
  const end=()=>{if(done)return;done=true;cancelAnimationFrame(raf);Store.set('introSeen',true);intro.classList.add('out');setTimeout(()=>{intro.hidden=true;intro.classList.remove('out');document.body.classList.remove('intro-on');$('q').focus({preventScroll:true})},RM?0:450)};
  $('skipIntro').onclick=end;$('goFind').onclick=end;const esc=e=>{if(e.key==='Escape'){end();removeEventListener('keydown',esc)}};addEventListener('keydown',esc);$('skipIntro').focus();
  const g=$('globe');g.innerHTML='<canvas></canvas>';const cv=g.firstChild,cx=cv.getContext('2d');let W,R,DPR=Math.min(2,devicePixelRatio||1);
  const size=()=>{const s=Math.min(innerWidth*0.9,innerHeight*0.62,560);cv.width=cv.height=s*DPR;cv.style.width=cv.style.height=s+'px';W=s*DPR;R=W*0.46};size();addEventListener('resize',size);
  let LAND=[],PTS=[];
  // land mask: rasterize world-atlas land into an equirectangular grid, sample it into a dot matrix
  const load=s=>new Promise((ok,no)=>{if(document.querySelector(`script[src="${s}"]`))return ok();const e=document.createElement('script');e.src=s;e.onload=ok;e.onerror=no;document.head.appendChild(e)});
  Promise.all([load('https://cdn.jsdelivr.net/npm/d3-array@3'),load('https://cdn.jsdelivr.net/npm/topojson-client@3')]).then(()=>load('https://cdn.jsdelivr.net/npm/d3-geo@3')).then(()=>fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json')).then(r=>r.json()).then(w=>{
   const c=document.createElement('canvas');c.width=720;c.height=360;const x=c.getContext('2d');const p=d3.geoEquirectangular().scale(360/Math.PI).translate([360,180]);x.fillStyle='#000';x.beginPath();d3.geoPath(p,x)(topojson.feature(w,w.objects.land));x.fill();
   const px=x.getImageData(0,0,720,360).data;for(let lat=-58;lat<=78;lat+=2.2){const step=2.2/Math.max(.25,Math.cos(lat*Math.PI/180));for(let lng=-180;lng<180;lng+=step){const i=((Math.round(180-lat*2))*720+Math.round((lng+180)*2))*4;if(px[i+3]>0)LAND.push([lng,lat])}}}).catch(()=>{});
  const setPts=()=>{const m=new Map();(typeof D!=='undefined'?D:[]).forEach(x=>{if(x.st==='open'||x.st==='closing_soon')(x.locations||[]).forEach(l=>{if(l.lat!=null){const k=(Math.round(l.lat*2)/2)+','+(Math.round(l.lng*2)/2);m.set(k,(m.get(k)||0)+1)}})});PTS=[...m].map(([k,n])=>{const [a,b]=k.split(',').map(Number);return[b,a,n]})};
  if(typeof D!=='undefined'&&D.length)setPts();document.addEventListener('radar:data',setPts,{once:true});
  const proj=(lng,lat,rot,tilt)=>{const l=(lng+rot)*Math.PI/180,p=lat*Math.PI/180,t=tilt*Math.PI/180;const x=Math.cos(p)*Math.sin(l),y=Math.sin(p),z=Math.cos(p)*Math.cos(l);const y2=y*Math.cos(t)-z*Math.sin(t),z2=y*Math.sin(t)+z*Math.cos(t);return[W/2+x*R,W/2-y2*R,z2]};
  function frame(now){const k=Math.min(1,(now-t0)/dur);const e=1-Math.pow(1-k,3);const rot=RM?96:-20+e*116,tilt=RM?38:10+e*28;
   cx.clearRect(0,0,W,W);const gr=cx.createRadialGradient(W*.42,W*.38,R*.1,W/2,W/2,R);gr.addColorStop(0,'#2b3f8f');gr.addColorStop(1,'#141c4a');cx.fillStyle=gr;cx.beginPath();cx.arc(W/2,W/2,R,0,7);cx.fill();
   cx.strokeStyle='rgba(140,200,255,.35)';cx.lineWidth=2*DPR;cx.stroke();
   cx.fillStyle='rgba(150,190,255,.55)';const d=1.3*DPR;for(const [a,b] of LAND){const p=proj(a,b,rot,tilt);if(p[2]>0)cx.fillRect(p[0]-d/2,p[1]-d/2,d,d)}
   const pulse=.5+.5*Math.sin(now/260);for(const [a,b,n] of PTS){const p=proj(a,b,rot,tilt);if(p[2]<=0)continue;const r=(1.6+Math.min(5,Math.sqrt(n)*.7))*DPR*(k<.6?k/.6:1);cx.fillStyle='rgba(255,196,64,.95)';cx.beginPath();cx.arc(p[0],p[1],r,0,7);cx.fill();if(n>20){cx.strokeStyle=`rgba(255,196,64,${.4*pulse})`;cx.beginPath();cx.arc(p[0],p[1],r+4*DPR*pulse,0,7);cx.stroke()}}
   if(!RM){const ang=now/700;cx.save();cx.beginPath();cx.arc(W/2,W/2,R,0,7);cx.clip();const sw=cx.createConicGradient?cx.createConicGradient(ang,W/2,W/2):null;if(sw){sw.addColorStop(0,'rgba(120,255,200,.28)');sw.addColorStop(.08,'rgba(120,255,200,0)');sw.addColorStop(1,'rgba(120,255,200,0)');cx.fillStyle=sw;cx.fillRect(0,0,W,W)}cx.restore()}
   if(k>=1){end();return}raf=requestAnimationFrame(frame)}
  raf=requestAnimationFrame(frame);if(RM)setTimeout(()=>{},0)}
})();
