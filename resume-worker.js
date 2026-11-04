/* V14.3 resume worker: reads a PDF / DOCX / TXT (or pasted text) entirely on this device and returns the structured parse.
   Nothing is uploaded. Libraries are vendored (vendor/pdfjs 4.10.38 legacy build, vendor/mammoth 1.13.0 (V16 security upgrade)). */
const V=(self.location.search||'');
importScripts('vendor/mammoth/mammoth.browser.min.js'+V,'resume-dict.js'+V,'resume-extract.js'+V,'resume-core.js'+V);
/* pdf.js 4 is ESM-only: load it with dynamic import() (works in classic workers). Its parser runs in a nested
   module worker (vendor/pdfjs/pdf.worker.min.mjs); importing that file into this thread would hijack our onmessage. */
let PDFJS=null;
async function pdfjs(){if(!PDFJS){PDFJS=await import('./vendor/pdfjs/pdf.min.mjs'+V);PDFJS.GlobalWorkerOptions.workerSrc=new URL('vendor/pdfjs/pdf.worker.min.mjs'+V,self.location.href).href}return PDFJS}
let COLLEGES=null;
async function colleges(){if(!COLLEGES){try{COLLEGES=await (await fetch('vendor/colleges.json'+V)).json()}catch(e){COLLEGES={schools:[]}}}return COLLEGES}
/* V19: real progress. Each message marks a finished stage (file opened, page N of M read, sections found, each section parsed). */
let PROG=null;const prog=(p,step,next)=>{if(PROG)self.postMessage({id:PROG,prog:{p:Math.round(p),step,next:next||''}})};
async function pdfPages(buf){const doc=await (await pdfjs()).getDocument({data:new Uint8Array(buf),verbosity:0,isEvalSupported:false}).promise;const pages=[];prog(15,'Opening the file','Page 1');
 for(let p=1;p<=doc.numPages;p++){const pg=await doc.getPage(p);const vp=pg.getViewport({scale:1});const tc=await pg.getTextContent();
  pages.push({w:vp.width,h:vp.height,items:tc.items.map(i=>({s:i.str,x:i.transform[4],y:i.transform[5],w:i.width,size:Math.hypot(i.transform[2],i.transform[3])}))});prog(15+45*p/doc.numPages,'Page '+p+' of '+doc.numPages,p<doc.numPages?'Page '+(p+1):'Sections')}
 return pages}
self.onmessage=async ev=>{const {id,name,buf,text,today}=ev.data||{};const t0=performance.now();PROG=ev.data&&ev.data.prog?id:null;
 try{let L;const n=String(name||'').toLowerCase();
  if(text!=null)L=RX.fromText(String(text));
  else if(n.endsWith('.pdf')){const pages=await pdfPages(buf);if(!pages.some(p=>p.items.some(i=>/\S/.test(i.s))))throw new Error('This PDF has no readable text (it may be a scan). Paste the text instead.');L=RX.fromPdf(pages)}
  else if(n.endsWith('.docx')){prog(15,'Opening the file','Text');L=RX.fromHtml((await self.mammoth.convertToHtml({arrayBuffer:buf})).value);prog(60,'Text read','Sections')}
  else if(n.endsWith('.txt'))L=RX.fromText(new TextDecoder().decode(buf));
  else throw new Error('Use a PDF, DOCX or TXT file, or paste the text.');
  prog(64,'Finding sections','Schools list');const CL=await colleges();prog(70,'Schools list','Sections');
  const R=RC.parse(L,{colleges:CL,onStage:(k,i,n,nx)=>prog(70+25*i/Math.max(1,n),k,nx),today:today||new Date().toISOString().slice(0,10)});
  prog(96,'Filling your profile','');
  self.postMessage({id,ok:true,result:R,text:L.map(l=>l.t).join('\n'),ms:Math.round(performance.now()-t0)})}
 catch(e){self.postMessage({id,ok:false,error:String(e&&e.message||e)})}};
