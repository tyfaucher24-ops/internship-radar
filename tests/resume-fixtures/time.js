// Times extraction + parse for the multi-page fixture PDFs (Node, pdf.js legacy build). Usage: NODE_PATH=... node tests/resume-fixtures/time.js
const fs=require('fs'),R=__dirname+'/../../';const RX=require(R+'resume-extract.js'),RC=require(R+'resume-core.js');const pdfjs=require('pdfjs-dist/legacy/build/pdf.js');
const C=JSON.parse(fs.readFileSync(R+'vendor/colleges.json'));
(async()=>{const out=[];for(const id of ['f04','f17','f30','f43','f51','f57']){const buf=fs.readFileSync(__dirname+'/'+id+'/resume.pdf');const ts=[];
 for(let k=0;k<5;k++){const t0=performance.now();const doc=await pdfjs.getDocument({data:new Uint8Array(buf),verbosity:0}).promise;const pages=[];
  for(let p=1;p<=doc.numPages;p++){const pg=await doc.getPage(p);const vp=pg.getViewport({scale:1});const tc=await pg.getTextContent();pages.push({w:vp.width,h:vp.height,items:tc.items.map(i=>({s:i.str,x:i.transform[4],y:i.transform[5],w:i.width,size:Math.hypot(i.transform[2],i.transform[3])}))})}
  RC.parse(RX.fromPdf(pages),{colleges:C,today:'2026-10-23'});ts.push(performance.now()-t0)}
 ts.sort((a,b)=>a-b);out.push([id,ts[0].toFixed(0),ts[2].toFixed(0),ts[4].toFixed(0)])}
 console.log('fixture  min  median  max (ms, 5 runs, 2-page PDFs)');out.forEach(r=>console.log(r.join('  ')))})();
