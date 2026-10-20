/* Shared listing helpers (site + admin). Schema documented in normalize.py. */
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TODAY=new Date();TODAY.setHours(0,0,0,0);const days=d=>Math.round((new Date(d+'T00:00:00')-TODAY)/864e5);
const NL='<span class="nl">not listed</span>';
const INDUSTRIES=['Accounting & Audit','Business & Operations','Consulting & Strategy','Data & AI','Design & Creative','Engineering & Hardware','Finance & Banking','Government & Policy','Healthcare & Life Sciences','HR & People','Legal','Marketing & Sales','Media & Communications','Nonprofit & Education','Product Management','Quant & Trading','Real Estate','Research','Software & IT','Supply Chain & Logistics','Other'];
const ROLE_TYPES=['Internship','Co-op','Early-insight program','Research internship','Fellowship','Apprenticeship','Externship','Part-time internship','Student position'];
const CLASS_YEARS=['Freshman','Sophomore','Junior','Senior','Graduate'];
const STATES='AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA PR RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');
const LBL={open:'Open',closing_soon:'Closing soon',closed:'Closed',not_open:'Upcoming',upcoming:'Upcoming'};
function statusOf(x){if(x.status==='upcoming')return'upcoming';if(x.status==='closed'||x.status==='not_open')return x.status;if(x.deadline){const n=days(x.deadline);if(n<0)return'closed';if(n<=14)return'closing_soon'}return'open'}
const fmtDate=d=>new Date(d+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
const dlText=x=>x.deadline?fmtDate(x.deadline):(x.rolling?'Rolling':'Deadline '+NL);
const locText=x=>{const L=(x.locations||[]).map(l=>[l.city,l.state].filter(Boolean).join(', ')||l.region).filter(Boolean);let s=L.length?L.slice(0,3).join(' · ')+(L.length>3?` +${L.length-3}`:''):(x.location_text||'');if(x.remote&&!/remote/i.test(s))s=(s?s+' · ':'')+'Remote';return s?esc(s):'Location '+NL};
const termText=x=>x.terms&&x.terms.length?esc(x.terms.join(', ')):(x.season?esc(x.season+' '+(x.year||'')):'Term '+NL);
const yearsText=x=>x.class_years&&x.class_years.length?esc(x.class_years.join(', ')):'Class years '+NL;
function prepare(x){if(x.category&&!x.industry)x.industry=x.category;if(!x.date_added)x.date_added=x.posted||(x.first_seen||'').slice(0,10);const st=statusOf(x);
  return Object.assign(x,{st,_states:(x.locations||[]).map(l=>l.state).filter(Boolean),_t:[x.company,x.title,x.industry,x.role_type,x.sector,(x.locations||[]).map(l=>(l.city||'')+' '+(l.state||'')).join(' '),x.remote?'remote':''].join(' ').toLowerCase()})}
/* Parse "City, ST; City2, ST2; Remote" into schema locations */
function parseLocations(s){const out=[];let remote=false;(s||'').split(/[;|]/).map(t=>t.trim()).filter(Boolean).forEach(t=>{if(/remote/i.test(t)){remote=true;return}
  const m=t.match(/^(.+?),\s*([A-Za-z]{2})$/);if(m&&STATES.includes(m[2].toUpperCase()))out.push({city:m[1].trim(),state:m[2].toUpperCase()});else if(STATES.includes(t.toUpperCase()))out.push({city:null,state:t.toUpperCase()});else out.push({city:t,state:null})});return{locations:out,remote}}
/* Build a schema listing from a flat form/CSV record. Unknown -> null/[] (never guessed). */
function fromFlat(r,source){const g=k=>{const v=r[k];return v==null?'':String(v).trim()};const L=parseLocations(g('location'));
  const dl=g('deadline');const rolling=/^rolling$/i.test(dl)||/^(true|yes|1)$/i.test(g('rolling'));const iso=/^\d{4}-\d{2}-\d{2}$/.test(dl)?dl:null;
  const season=(g('season').match(/^(Summer|Fall|Spring|Winter)/i)||[])[1];const year=+(g('year')||(g('season').match(/20\d\d/)||[])[0])||null;
  return {id:r.id||('u-'+Store.uid()),company:g('company'),title:g('title')||g('role'),industry:g('industry')||null,role_type:g('role_type')||'Internship',
    locations:L.locations,location_text:g('location')||null,remote:L.remote||/^(true|yes|1)$/i.test(g('remote')),deadline:iso,deadline_text:dl||null,rolling:rolling&&!iso,
    season:season?season[0].toUpperCase()+season.slice(1).toLowerCase():null,year,terms:season&&year?[`${season[0].toUpperCase()+season.slice(1).toLowerCase()} ${year}`]:[],past_term:false,
    class_years:g('class_years').split(/[,;]/).map(s=>s.trim()).filter(s=>CLASS_YEARS.includes(s)),apply_url:/^https?:\/\//.test(g('apply_url')||g('link'))?(g('apply_url')||g('link')):null,
    date_added:g('date_added')||new Date().toISOString().slice(0,10),source:source||g('source')||'User submission',status:'open',notes:g('notes')||null}}
const toFlat=x=>({company:x.company,title:x.title,industry:x.industry||'',role_type:x.role_type||'',location:x.location_text||(x.locations||[]).map(l=>[l.city,l.state].filter(Boolean).join(', ')).join('; ')+(x.remote?'; Remote':''),
  remote:x.remote?'yes':'',deadline:x.deadline||(x.rolling?'rolling':''),season:x.season||'',year:x.year||'',class_years:(x.class_years||[]).join(', '),apply_url:x.apply_url||'',date_added:x.date_added||'',source:x.source||'',notes:x.notes||''});
/* Minimal RFC-4180 CSV parser */
function parseCSV(t){const rows=[];let row=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c=='"'){if(t[i+1]=='"'){f+='"';i++}else q=false}else f+=c}else if(c=='"')q=true;else if(c==','){row.push(f);f=''}else if(c=='\n'||c=='\r'){if(c=='\r'&&t[i+1]=='\n')i++;row.push(f);rows.push(row);row=[];f=''}else f+=c}
  if(f||row.length){row.push(f);rows.push(row)}const h=(rows.shift()||[]).map(s=>s.trim().toLowerCase().replace(/\s+/g,'_'));return rows.filter(r=>r.some(v=>v.trim())).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]??''])))}
/* Shared listing form (Add page + admin) */
function listingFormHTML(x={}){const f=x.company?toFlat(x):{};const v=k=>esc(f[k]||'');const opt=(arr,sel,blank)=>`<option value="">${blank}</option>`+arr.map(a=>`<option${a===sel?' selected':''}>${esc(a)}</option>`).join('');
  return `<div class="grid2"><label>Company *<input name="company" required value="${v('company')}"></label><label>Role title *<input name="title" required value="${v('title')}"></label>
  <label>Industry<select name="industry">${opt(INDUSTRIES,f.industry,'Not listed')}</select></label><label>Role type<select name="role_type">${opt(ROLE_TYPES,f.role_type||'Internship','Not listed')}</select></label>
  <label>Location (City, ST; separate several with ;)<input name="location" placeholder="Charlotte, NC; Remote" value="${v('location')}"></label><label class="chk"><input type="checkbox" name="remote"${f.remote?' checked':''}> Remote option</label>
  <label>Deadline (leave blank if unknown)<input name="deadline" type="date" value="${/^\d{4}/.test(f.deadline||'')?v('deadline'):''}"></label><label class="chk"><input type="checkbox" name="rolling"${f.deadline==='rolling'?' checked':''}> Rolling deadline</label>
  <label>Season<select name="season">${opt(['Summer','Fall','Spring','Winter'],f.season,'Not listed')}</select></label><label>Year<input name="year" type="number" min="2025" max="2030" value="${v('year')}"></label></div>
  <fieldset class="cy"><legend>Eligible class years (leave empty if not stated)</legend>${CLASS_YEARS.map(c=>`<label class="chk"><input type="checkbox" name="cy" value="${c}"${(x.class_years||[]).includes(c)?' checked':''}> ${c}</label>`).join('')}</fieldset>
  <label>Application link *<input name="apply_url" type="url" required placeholder="https://…" value="${v('apply_url')}"></label><label>Notes<input name="notes" value="${v('notes')}"></label>`}
function readListingForm(form,source,keep={}){const fd=new FormData(form);const r=Object.fromEntries(fd);r.class_years=fd.getAll('cy').join(',');r.remote=fd.get('remote')?'yes':'';
  r.rolling=fd.get('rolling')?'yes':'';if(r.rolling&&!r.deadline)r.deadline='rolling';const x=fromFlat({...r,id:keep.id},source);if(keep.date_added)x.date_added=keep.date_added;return x}
