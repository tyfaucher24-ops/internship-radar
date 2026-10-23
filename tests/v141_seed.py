SEED="""async()=>{for(let i=0;i<100&&!(typeof BYID!=='undefined'&&BYID.size);i++)await new Promise(r=>setTimeout(r,200));
const xs=[...BYID.values()].filter(x=>x.st!=='closed');const tl=x=>(x.title||x.t||'');xs.sort((a,b)=>tl(b).length-tl(a).length);
const pick=[...xs.slice(0,3),...xs.slice(200,205)];for(const x of pick){try{await ensureDetail(x)}catch(e){};track(x.id,'Saved')}
const a=T.all();a.forEach((t,i)=>{if(i<3){t.notes='Spoke with recruiter at career fair; asked to follow up after the first round of interviews closes';t.nextStep='Send thank-you email and portfolio link'}});T.save(a);return a.length}"""
