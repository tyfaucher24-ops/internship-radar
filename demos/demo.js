(function(){
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const t=document.documentElement,btn=$('#theme');
btn.onclick=()=>{const l=t.dataset.theme==='light';t.dataset.theme=l?'dark':'light';btn.textContent=l?'Light mode':'Dark mode';btn.setAttribute('aria-pressed',String(!l));};
const today=new Date();today.setHours(0,0,0,0);
const days=d=>d?Math.round((new Date(d+'T00:00:00')-today)/864e5):null;
function pill(x){if(x.rolling)return'<span class="pill good">Rolling</span>';if(x.status==='open')return'<span class="pill good">Open</span>';return'<span class="pill muted">'+esc(x.status||'Unknown')+'</span>';}
function due(x){const n=days(x.deadline);if(n===null)return esc(x.deadline_text||'No deadline listed');if(n>=0&&n<=7)return'<span class="pill urgent">Due in '+n+'d</span> <span class="num">'+esc(x.deadline)+'</span>';return'<span class="num">'+esc(x.deadline)+'</span>';}
const av=c=>'<span class="avatar" aria-hidden="true">'+esc((c||'?').trim()[0].toUpperCase())+'</span>';
fetch('../internships.json').then(r=>r.json()).then(d=>{
 const all=d.internships||[];
 const open=all.filter(x=>x.status==='open'||x.rolling);
 const list=(open.length?open:all).slice(0,6);
 $('#count').textContent=all.length;$('#gen').textContent=d.generated||'';
 $('#listings').innerHTML=list.length?list.map(x=>`<article class="card"><div class="card-h">${av(x.company)}<div><h3>${esc(x.company)}</h3><p class="role">${esc(x.role)}</p></div></div><dl><div><dt>Location</dt><dd>${esc(x.location||'—')}</dd></div><div><dt>Industry</dt><dd>${esc(x.industry||'—')}</dd></div><div><dt>Deadline</dt><dd>${due(x)}</dd></div><div><dt>Status</dt><dd>${pill(x)}</dd></div></dl>${x.link?`<a class="apply" href="${esc(x.link)}" target="_blank" rel="noopener">Apply<span class="sr"> to ${esc(x.company)}</span></a>`:''}</article>`).join(''):'<p class="empty">No listings match yet. Try clearing filters.</p>';
 const rows=all.slice(0,4);
 const dueWk=all.filter(x=>{const n=days(x.deadline);return n!==null&&n>=0&&n<=7}).length;
 const s=$('#stats');if(s)s.innerHTML=`<div class="stat"><span class="lbl">Applied</span><span class="big num">0</span><span class="sub">Nothing tracked yet</span></div><div class="stat"><span class="lbl">Interviewing</span><span class="big num">0</span><span class="sub">Nothing tracked yet</span></div><div class="stat"><span class="lbl">Due this week (all listings)</span><span class="big num">${dueWk}</span><span class="sub">From real deadlines</span></div>`;
 $('#tracker').innerHTML=`<thead><tr><th scope="col">Company</th><th scope="col">Role</th><th scope="col">Listing status</th><th scope="col">Deadline</th><th scope="col">Link</th></tr></thead><tbody>${rows.map(x=>`<tr><td><div class="co">${av(x.company)}<strong>${esc(x.company)}</strong></div></td><td>${esc(x.role)}</td><td>${pill(x)}</td><td>${due(x)}</td><td>${x.link?`<a class="link" href="${esc(x.link)}" target="_blank" rel="noopener">Posting<span class="sr"> for ${esc(x.company)}</span></a>`:'—'}</td></tr>`).join('')}</tbody>`;
}).catch(()=>{$('#listings').innerHTML='<p class="empty">Couldn’t load listings right now. Refresh to try again.</p>';});
})();
