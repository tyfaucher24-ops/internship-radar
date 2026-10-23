/* V14.3 resume text extraction: turns pdf.js text items, mammoth HTML or plain text into ordered, normalized lines.
   Two-column reading order, repeating header/footer removal, bullet + wrapped-line merging, heading signals.
   Line = {t, h (1 = looks like a heading by size), b (bullet), x, page, gap (blank space before)}. UMD (window/self.RX, node). */
(function(root,f){const X=f();if(typeof module==='object'&&module.exports)module.exports=X;else root.RX=X})(typeof self!=='undefined'?self:this,function(){
const BUL=/^[\s]*([•●▪■◦○◆◇►▸➢➤✓✔∙⁃‣\uF0B7\uF0A7\uF076\uF0D8\uF0FC\uF06E\uF0A8*]|-(?=\s)|–(?=\s))\s*/;
function norm(s){s=String(s||'');
 s=s.replace(/\uFB00/g,'ff').replace(/\uFB01/g,'fi').replace(/\uFB02/g,'fl').replace(/\uFB03/g,'ffi').replace(/\uFB04/g,'ffl').replace(/[\uFB05\uFB06]/g,'st');
 s=s.replace(/[\u2018\u2019\u201A\u201B\u2032`´]/g,"'").replace(/[\u201C\u201D\u201E\u201F\u2033]/g,'"');
 s=s.replace(/[\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D]/g,'–').replace(/\u2010|\u2011/g,'-');
 s=s.replace(/[\u00A0\u2007\u202F\u2002\u2003\u2009\u200A]/g,' ').replace(/[\u200B-\u200D\uFEFF\u00AD]/g,'');
 s=s.replace(/[\uF0B7\uF0A7\uF076\uF0D8\uF0FC\uF06E\uF0A8●▪■◦○◆◇►▸➢➤✓✔∙⁃‣]/g,'•');
 // letter-spaced headings ("E X P E R I E N C E" / "W O R K  E X P E R I E N C E")
 if(/^(?:[A-Za-z&] ){3,}[A-Za-z]$/.test(s.trim().replace(/ {2,}/g,' \u0001 ').replace(/ \u0001 /g,' ')))s=s.trim().split(/ {2,}/).map(w=>w.replace(/ /g,'')).join(' ');
 return s}
const isBul=t=>BUL.test(t)&&!/^\s*-\d/.test(t)&&!/^\s*–\s*\d{4}/.test(t);
const stripBul=t=>t.replace(BUL,'').trim();
const DATEISH=/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*'?\d{2,4}\b|\b(19|20)\d{2}\b|\bpresent\b|\b(spring|summer|fall|autumn|winter)\b/i;
const LOCISH=/^[A-Z][A-Za-z .'-]+,\s*([A-Z]{2}|[A-Z][a-z]+)(\s+\d{5})?$|^(remote|hybrid|virtual|on-?site)$/i;
function finish(lines){/* normalize text, mark bullets, merge wrapped bullets, drop empties */
 const out=[];for(const l of lines){let t=norm(l.t).replace(/[ ]{2,}/g,' ').replace(/ *\t+ */g,'\t').trim();if(!t){if(out.length)out[out.length-1]._gapAfter=true;continue}
  const b=l.b||isBul(t);if(b)t=stripBul(t);if(!t)continue;
  const o={t,h:l.h||0,b,x:l.x||0,page:l.page||1,gap:!!l.gap,cont:l.cont};
  const p=out[out.length-1];
  if(p&&p._gapAfter){o.gap=true;delete p._gapAfter}
  if(p&&o.cont&&!b&&p.b&&!o.gap){p.t=(p.t.endsWith('-')&&/^[a-z]/.test(t))?p.t.slice(0,-1)+t:p.t+' '+t;continue}
  out.push(o)}
 out.forEach(o=>{delete o._gapAfter;delete o.cont});return out}
/* ---------- PDF ---------- pages: [{w,h,items:[{s,x,y,w,size}]}] (y = baseline from bottom, pdf.js convention) */
function linesOf(items,page){const its=items.filter(i=>i.s&&i.s.trim()).sort((a,b)=>b.y-a.y||a.x-b.x);const rows=[];
 for(const it of its){const r=rows.find(r=>Math.abs(r.y-it.y)<=Math.max(2,Math.min(r.size,it.size)*0.45));if(r){r.items.push(it);r.size=Math.max(r.size,it.size)}else rows.push({y:it.y,size:it.size,items:[it]})}
 rows.sort((a,b)=>b.y-a.y);
 return rows.map(r=>{r.items.sort((a,b)=>a.x-b.x);let t='',end=null;for(const it of r.items){if(end!==null){const gap=it.x-end;if(gap>Math.max(it.size*1.0,6))t+='\t';else if(gap>it.size*0.12&&!/\s$/.test(t)&&!/^\s/.test(it.s))t+=' '}t+=it.s;end=it.x+it.w}
  return {t,x:r.items[0].x,y:r.y,size:r.size,page}})}
function columns(items,W){/* returns gutter x or null */
 const its=items.filter(i=>i.s&&i.s.trim());if(its.length<12)return null;let best=null,run=null;const tol=Math.max(1,Math.round(its.length*0.03));
 for(let x=W*0.18;x<=W*0.82;x+=2){const cross=its.filter(i=>i.x<x-1&&i.x+i.w>x+1).length;if(cross<=tol){if(!run)run={a:x,b:x};else run.b=x}else{if(run&&(!best||run.b-run.a>best.b-best.a))best=run;run=null}}
 if(run&&(!best||run.b-run.a>best.b-best.a))best=run;if(!best||best.b-best.a<8)return null;const g=(best.a+best.b)/2;
 const L=its.filter(i=>i.x+i.w<=g),R=its.filter(i=>i.x>=g);if(L.length<5||R.length<5)return null;
 const span=a=>[Math.min(...a.map(i=>i.y)),Math.max(...a.map(i=>i.y))];const [l0,l1]=span(L),[r0,r1]=span(R);const ov=Math.min(l1,r1)-Math.max(l0,r0),un=Math.max(l1,r1)-Math.min(l0,r0);if(ov<un*0.3)return null;
 /* a side made mostly of dates/locations is a date column of a one-column resume, not a real column */
 const side=a=>{const ls=linesOf(a,0).map(l=>l.t.trim());const dl=ls.filter(t=>t.length<=32&&(DATEISH.test(t)||LOCISH.test(t))).length;return dl/Math.max(1,ls.length)};
 if(side(R)>=0.5||side(L)>=0.5)return null;return g}
function fromPdf(pages){let all=[];
 pages.forEach((pg,pi)=>{const its=pg.items.filter(i=>i.s&&i.s.trim());const g=columns(its,pg.w);let ls;
  if(g){const L=its.filter(i=>i.x+i.w<=g+0.5),R=its.filter(i=>i.x>=g-0.5),C=its.filter(i=>!(i.x+i.w<=g+0.5)&&!(i.x>=g-0.5));
   const colTop=Math.max(...L.concat(R).map(i=>i.y));const top=C.filter(i=>i.y>=colTop-1),bot=C.filter(i=>i.y<colTop-1);
   /* sidebar first if it is the narrower column on the left; otherwise left then right */
   ls=[...linesOf(top,pi+1),...linesOf(L.concat(bot.filter(i=>i.x<g)),pi+1),...linesOf(R.concat(bot.filter(i=>i.x>=g)),pi+1)]}
  else ls=linesOf(its,pi+1);
  ls.forEach((l,i)=>{const p=ls[i-1];l.gap=p&&p.page===l.page&&(p.y-l.y)>Math.max(p.size,l.size)*2.1&&l.y<p.y});
  all.push(ls)});
 /* repeating headers / footers: first/last line text (digits stripped) that recurs on 2+ pages */
 if(all.length>1){const key=t=>t.toLowerCase().replace(/\d+/g,'#').replace(/\s+/g,' ').trim();const cnt=new Map();
  all.forEach(ls=>{const c=new Set([ls[0],ls[1],ls[ls.length-1],ls[ls.length-2]].filter(Boolean).map(l=>key(l.t)));c.forEach(k=>cnt.set(k,(cnt.get(k)||0)+1))});
  all=all.map(ls=>ls.filter((l,i)=>!((i<2||i>=ls.length-2)&&cnt.get(key(l.t))>=2)))}
 let flat=[].concat(...all).filter(l=>!/^\s*(page\s*)?\d+\s*(of\s*\d+)?\s*$/i.test(l.t));
 const sizes=flat.map(l=>l.size).sort((a,b)=>a-b),med=sizes[Math.floor(sizes.length/2)]||10;
 flat.forEach((l,i)=>{l.h=l.size>=med*1.12&&l.t.trim().split(/\s+/).length<=7?1:0;const p=flat[i-1];
  /* wrapped bullet text: indented past the bullet glyph, or same x but clearly mid-sentence */
  if(p&&p.page===l.page&&!l.gap&&!isBul(norm(l.t))&&!l.h&&!/\t/.test(l.t)&&(l.x>p.x+2.5||(Math.abs(l.x-p.x)<2&&/^[a-z(]/.test(l.t.trim())&&!/[.:]$/.test(p.t.trim()))))l.cont=true});
 return finish(flat)}
/* ---------- DOCX (mammoth HTML) ---------- */
const ENT={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',ndash:'–',mdash:'—',bull:'•',hellip:'…',rsquo:"'",lsquo:"'",rdquo:'"',ldquo:'"'};
const dec=s=>s.replace(/&(#x?[0-9a-f]+|\w+);/gi,(m,e)=>e[0]==='#'?String.fromCodePoint(e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):+e.slice(1)):(ENT[e.toLowerCase()]??m));
const txt=h=>dec(h.replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'')).replace(/[ \u00A0]+/g,' ');
function blocks(h){/* top-level block list from an html fragment (no tables inside) */const out=[];const re=/<(p|h[1-6]|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;let m;
 while((m=re.exec(h))){const tag=m[1].toLowerCase(),inner=m[2];const t=txt(inner);const strong=/^\s*<strong>[\s\S]*<\/strong>\s*$/i.test(inner);
  for(const part of t.split('\n'))out.push({t:part,h:/^h[1-3]$/.test(tag)?1:0,b:tag==='li',bold:strong})}return out}
function fromHtml(html){const lines=[];let i=0;const T=/<table\b[\s\S]*?<\/table>/gi;let m;
 while((m=T.exec(html))){lines.push(...blocks(html.slice(i,m.index)));i=m.index+m[0].length;
  const rows=m[0].match(/<tr\b[\s\S]*?<\/tr>/gi)||[];
  for(const r of rows){const cells=(r.match(/<t[dh]\b[\s\S]*?<\/t[dh]>/gi)||[]).map(c=>{const b=blocks(c);return b.length?b:[{t:txt(c),h:0,b:false}]});
   const ne=cells.map(c=>c.filter(x=>x.t.trim()));
   /* a short single-line cell (dates, location) beside a multi-line content cell: read it as the right-hand text of the content's first line */
   if(ne.length===2&&ne.filter(c=>c.length===1&&c[0].t.trim().length<=40&&!c[0].b).length===1&&ne.some(c=>c.length>1)){const s1=ne.find(c=>c.length===1&&c[0].t.trim().length<=40),mc=ne.find(c=>c!==s1);mc.forEach((x,k)=>lines.push(k===0?{...x,t:x.t.trim()+'\t'+s1[0].t.trim()}:x));lines.push({t:''})}
   else if(cells.some(c=>c.filter(x=>x.t.trim()).length>1))cells.forEach(c=>{c.forEach(x=>lines.push(x));lines.push({t:''})});
   else{const t=cells.map(c=>(c[0]||{t:''}).t.trim()).filter(Boolean).join('\t');lines.push({t,b:cells.some(c=>c[0]&&c[0].b)})}}}
 lines.push(...blocks(html.slice(i)));
 return finish(lines.map(l=>({...l,gap:false})))}
/* ---------- plain text / paste ---------- */
function fromText(text){const raw=String(text||'').replace(/\r\n?/g,'\n').replace(/\f/g,'\n').split('\n');const lines=[];let gap=false;
 for(const r of raw){if(!r.trim()){gap=true;continue}lines.push({t:r.trim().replace(/ {3,}/g,'\t'),gap,x:(r.match(/^\s*/)[0].length)});gap=false}
 lines.forEach((l,i)=>{const p=lines[i-1];if(p&&!l.gap&&isBul(norm(p.t))&&!isBul(norm(l.t))&&l.x>p.x&&!/\t/.test(l.t))l.cont=true});
 return finish(lines)}
return {norm,fromPdf,fromHtml,fromText,isBul,stripBul,columns}});
