/* V14 audit fixes that sit on top of the existing pages */
(function(){
/* #18: the admin page link only shows with ?admin in the address */
/* V16: admin link removed from the public menu (admin.html is noindex and robots-disallowed; real auth in Phase 3). */
/* #17/#37: say plainly when an apply link only goes to a company's general careers page */
const GEN=u=>{try{const x=new URL(u,location.href),p=x.pathname.replace(/\/+$/,'');return /(^|\.)zapply\.jobs$/.test(x.hostname)&&/^\/jobs$/i.test(p)||/^\/?(careers?|jobs|join-us|work-with-us)?$/i.test(p)&&!x.search}catch(_){return false}};
document.addEventListener('radar:drawer',()=>{const b=document.getElementById('dbody'),a=document.getElementById('dAct');if(!b||!a)return;
 /* #27: the sticky action bar is always the last thing in the drawer */if(a.nextElementSibling)b.appendChild(a);
 const l=a.querySelector('a[href^="http"]');if(l&&GEN(l.href)&&!a.querySelector('.gen-link')){const s=document.createElement('span');s.className='gen-link';s.textContent='General careers page: search for this role there';l.after(s)}});
/* #31: class year follows from graduation year */
const acadEnd=()=>{const d=new Date();return d.getMonth()>=7?d.getFullYear()+1:d.getFullYear()};
document.addEventListener('input',e=>{if(e.target.id!=='obGY')return;const v=e.target.value.trim(),c=document.getElementById('obCY');if(!c||!/^\d{4}$/.test(v))return;const d=+v-acadEnd(),k=d<=0?'Senior':d===1?'Junior':d===2?'Sophomore':d===3?'Freshman':'';if(k)c.value=k});
/* #23: the no-WebGL globe shows the same green listing hubs (data/hubs.json) on the static picture */
const intro=document.getElementById('intro');
function dots(){const ph=intro&&intro.querySelector('.globe-ph');if(!ph||ph.querySelector('.ph-dots'))return;const cv=document.createElement('canvas');cv.className='ph-dots';cv.setAttribute('aria-hidden','true');ph.appendChild(cv);
 fetch('data/hubs.json'+(self.BV||'')).then(r=>r.json()).then(H=>{const w=ph.clientWidth||280,dp=Math.min(2,devicePixelRatio||1);cv.width=cv.height=w*dp;const g=cv.getContext('2d'),R=w/2*275/280,a=30*Math.PI/180,b=-98*Math.PI/180;g.scale(dp,dp);
  const mx=Math.max(...H.map(h=>h[2]));for(const [la0,lo0,n] of H){const la=la0*Math.PI/180,lo=lo0*Math.PI/180,c=Math.sin(a)*Math.sin(la)+Math.cos(a)*Math.cos(la)*Math.cos(lo-b);if(c<=0)continue;
   const x=w/2+R*Math.cos(la)*Math.sin(lo-b),y=w/2-R*(Math.cos(a)*Math.sin(la)-Math.sin(a)*Math.cos(la)*Math.cos(lo-b)),r=Math.max(.9,Math.min(2.6,.9+Math.sqrt(n/mx)*2.2))*w/560*2;
   g.fillStyle='rgba(74,222,128,.92)';g.beginPath();g.arc(x,y,r,0,7);g.fill()}}).catch(()=>{cv.remove()})}
if(intro){if(intro.classList.contains('static'))dots();else new MutationObserver((m,o)=>{if(intro.classList.contains('static')){o.disconnect();dots()}}).observe(intro,{attributes:true,attributeFilter:['class']})}
})();
