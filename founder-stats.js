/* V17: founder analytics (#admin/stats). Admins only (public.admins via admin_stats_v17); everyone else sees "Not found".
   All numbers are aggregated in Postgres; no raw rows reach the browser. Charts are plain SVG. */
(()=>{
  const $e=id=>document.getElementById(id);const h=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const fmt=n=>n==null?'–':Number(n).toLocaleString('en-US');const pct=(a,b)=>b?Math.round(100*a/b)+'%':'–';
  const NE='<p class="fs-empty">Not enough data yet</p>';const day=d=>d.toISOString().slice(0,10);
  let range=null,data=null,busy=false;
  const sec=()=>$e('t-stats');
  const notFound=()=>{sec().innerHTML='<div class="pagehead"><div class="container"><h1>Not found</h1><p class="lede">This page doesn’t exist. <a href="#" data-go="db">Go to Find internships</a>.</p></div></div>';document.title='Not found · Intern Index'};
  function csv(name,head,rows){const q=v=>{v=String(v==null?'':v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
    const b=new Blob([[head,...rows].map(r=>r.map(q).join(',')).join('\n')+'\n'],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`intern-index-${name}-${range.from}-to-${range.to}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
  const exp=k=>`<button type="button" class="btn-ghost sm fs-csv" data-csv="${k}">Export CSV</button>`;
  function line(daily){if(!daily.length||!daily.some(d=>d.signups||d.active))return NE;
    const W=720,H=200,P=28,mx=Math.max(1,...daily.map(d=>Math.max(d.signups,d.active))),n=Math.max(1,daily.length-1);
    const pts=k=>daily.map((d,i)=>`${(P+i*(W-2*P)/n).toFixed(1)},${(H-P-(d[k]/mx)*(H-2*P)).toFixed(1)}`).join(' ');
    return `<svg class="fs-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Daily active users and signups, ${h(daily[0].day)} to ${h(daily[daily.length-1].day)}. Peak ${mx}.">
<line x1="${P}" y1="${H-P}" x2="${W-P}" y2="${H-P}" class="fs-ax"/><text x="${P}" y="${P-10}" class="fs-tx">${mx}</text><text x="${P}" y="${H-8}" class="fs-tx">${h(daily[0].day)}</text><text x="${W-P}" y="${H-8}" class="fs-tx" text-anchor="end">${h(daily[daily.length-1].day)}</text>
<polyline points="${pts('active')}" class="fs-l1"/><polyline points="${pts('signups')}" class="fs-l2"/></svg><p class="fs-key"><span class="k1"></span>Active (visitors + users) <span class="k2"></span>Signups</p>`}
  function funnel(f){const st=[['visit','Visited'],['profile_built','Built a profile'],['signup','Signed up'],['first_save','Saved a role'],['first_apply','Clicked apply']];
    if(!f||!f.visit&&!f.signup)return NE;const mx=Math.max(1,...st.map(s=>f[s[0]]||0));
    return '<ol class="fs-fun">'+st.map(([k,l],i)=>`<li><span class="fs-fl">${l}</span><span class="fs-bar"><i style="width:${Math.max(1,100*(f[k]||0)/mx).toFixed(1)}%"></i></span><b>${fmt(f[k])}</b><span class="fs-mut">${i?pct(f[k],f[st[i-1][0]])+' of previous':''}</span></li>`).join('')+'</ol>'}
  function cohorts(c){if(!c.length)return NE;return `<div class="fs-tw" tabindex="0" role="region" aria-label="Weekly retention table"><table class="fs-t"><caption class="sr">Weekly retention by signup week</caption><thead><tr><th scope="col">Signup week</th><th scope="col">Users</th>${[1,2,3,4,5,6,7,8].map(w=>`<th scope="col">Wk ${w}</th>`).join('')}</tr></thead><tbody>${c.map(r=>`<tr><th scope="row">${h(r.week)}</th><td>${fmt(r.size)}</td>${(r.weeks||[]).map(x=>{const fut=new Date(r.week).getTime()+x.w*7*864e5>Date.now();return `<td>${fut?'<span class="fs-mut">–</span>':pct(x.n,r.size)}</td>`}).join('')}</tr>`).join('')}</tbody></table></div>`}
  const top=(rows,lab)=>rows&&rows.length?`<div class="fs-tw" tabindex="0" role="region" aria-label="${lab} table"><table class="fs-t"><thead><tr><th scope="col">${lab}</th><th scope="col">Users</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${h(r.name)}</td><td>${fmt(r.n)}</td></tr>`).join('')}</tbody></table></div>`:NE;
  function draw(){const d=data,s=sec();const em=d.email||{},ub=em.unsub_by_type||{};const card=(l,v,sub)=>`<div class="fs-card"><p class="fs-cl">${l}</p><p class="fs-cv">${v}</p>${sub?`<p class="fs-cs">${sub}</p>`:''}</div>`;
    s.innerHTML=`<div class="pagehead"><div class="container fs-wrap"><h1>Founder stats</h1><p class="lede">Real counts from Intern Index. Cookie-free; aggregated in the database. Admins only.</p>
<form class="fs-range" id="fsRange"><label>From <input type="date" id="fsFrom" value="${range.from}" max="${range.to}"></label><label>To <input type="date" id="fsTo" value="${range.to}"></label><button class="btn sm" type="submit">Update</button><span class="fs-mut" role="status">${busy?'Loading…':''}</span></form></div></div>
<div class="container fs-wrap">
<div class="fs-cards">${card('Total users',fmt(d.users))}${card('New signups',fmt(d.signups_7d),'7 days · '+fmt(d.signups_30d)+' in 30 days')}${card('DAU / WAU / MAU',`${fmt(d.dau)} / ${fmt(d.wau)} / ${fmt(d.mau)}`)}${card('Stickiness (WAU/MAU)',pct(d.wau,d.mau))}${card('Saves this week',fmt(d.saves_7d))}${card('Apply clicks this week',fmt(d.apply_clicks_7d))}${card('Email subscribers',fmt(d.email_subscribers))}</div>
<section class="fs-sec"><div class="fs-sh"><h2>Daily signups and active users</h2>${exp('daily')}</div>${line(d.daily||[])}</section>
<section class="fs-sec"><div class="fs-sh"><h2>Signup funnel</h2>${exp('funnel')}</div>${funnel(d.funnel)}</section>
<section class="fs-sec"><div class="fs-sh"><h2>Weekly retention (weeks 1–8)</h2>${exp('cohorts')}</div>${cohorts(d.cohorts||[])}</section>
<div class="fs-two"><section class="fs-sec"><div class="fs-sh"><h2>Most-saved companies</h2>${exp('companies')}</div>${top(d.top_companies,'Company')}</section>
<section class="fs-sec"><div class="fs-sh"><h2>Most-saved roles</h2>${exp('roles')}</div>${top(d.top_roles,'Role')}</section></div>
<section class="fs-sec"><div class="fs-sh"><h2>Top schools</h2>${exp('schools')}</div><p class="fs-mut">Schools with fewer than 5 users are hidden.</p>${top(d.top_schools,'School')}</section>
<section class="fs-sec"><div class="fs-sh"><h2>Email</h2>${exp('email')}</div>${em.sent||em.clicks||Object.keys(ub).length?`<div class="fs-cards">${card('Emails sent',fmt(em.sent))}${card('Clicks',fmt(em.clicks))}${card('Click-through rate',pct(em.clicks,em.sent))}${card('Unsubscribes',Object.entries(ub).map(([k,v])=>h(k)+': '+fmt(v)).join(' · ')||'0')}</div>`:NE}</section>
</div>`}
  const CSV={daily:d=>[['day','signups','active'],(d.daily||[]).map(r=>[r.day,r.signups,r.active])],funnel:d=>[['step','count'],Object.entries(d.funnel||{})],
    cohorts:d=>[['week','users',...[1,2,3,4,5,6,7,8].map(w=>'wk'+w)],(d.cohorts||[]).map(r=>[r.week,r.size,...(r.weeks||[]).map(x=>x.n)])],
    companies:d=>[['company','users'],(d.top_companies||[]).map(r=>[r.name,r.n])],roles:d=>[['role','users'],(d.top_roles||[]).map(r=>[r.name,r.n])],schools:d=>[['school','users'],(d.top_schools||[]).map(r=>[r.name,r.n])],
    email:d=>{const e=d.email||{};return [['metric','value'],[['sent',e.sent],['clicks',e.clicks],...Object.entries(e.unsub_by_type||{}).map(([k,v])=>['unsubscribe_'+k,v])]]}};
  async function load(){const s=sec();if(!s)return;
    if(!(window.Cloud&&Cloud.enabled)){notFound();return}await (Cloud.ready||Promise.resolve());
    if(!Cloud.signedIn()||!(await Cloud.isAdmin())){notFound();return}
    if(!range){const t=new Date(),f=new Date(Date.now()-89*864e5);range={from:day(f),to:day(t)}}
    busy=true;if(data)draw();else s.innerHTML='<div class="pagehead"><div class="container"><h1>Founder stats</h1><p class="lede" role="status">Loading…</p></div></div>';
    try{data=await Cloud.rpc('admin_stats_v17',{p_from:range.from,p_to:range.to});busy=false;draw()}
    catch(e){busy=false;if(e.status===403||e.status===401){notFound();return}s.innerHTML=`<div class="pagehead"><div class="container"><h1>Founder stats</h1><p class="lede">Couldn’t load stats. If migration 0005 hasn’t been run yet, run it in the Supabase SQL editor.</p></div></div>`}}
  document.addEventListener('submit',e=>{if(e.target.id!=='fsRange')return;e.preventDefault();const f=$e('fsFrom').value,t=$e('fsTo').value;if(f&&t&&f<=t){range={from:f,to:t};load()}});
  document.addEventListener('click',e=>{const b=e.target.closest('[data-csv]');if(!b||!data)return;const[hd,rows]=CSV[b.dataset.csv](data);csv(b.dataset.csv,hd,rows)});
  document.addEventListener('radar:page',e=>{if(e.detail==='stats')load()});
  document.addEventListener('cloud:change',()=>{const s=sec();if(s&&!s.hidden)load()});
  window.FounderStats={load};
})();
