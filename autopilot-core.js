/* V13 Deadline Autopilot core: pure functions, no DOM. Only uses what a listing actually states.
   kind: 'stated' (a real deadline date), 'rolling' (company reviews as applications arrive), 'unknown' (no deadline listed). */
(function(root,f){const m=f();if(typeof module==='object'&&module.exports)module.exports=m;else root.APCore=m})(this,function(){
const DAY=864e5;
function parseDay(s){if(!s)return null;const m=String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);if(!m)return null;return new Date(+m[1],+m[2]-1,+m[3],9,0,0)}
function sod(d){const x=new Date(d);x.setHours(0,0,0,0);return x}
function fmt(d){return d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}
/* Build the reminder plan for one listing. added = when the user turned Autopilot on. */
function plan(x,added,now){now=now?new Date(now):new Date();added=added?new Date(added):now;const dl=parseDay(x&&x.deadline);let kind,steps=[];
 if(x&&x.st==='closed')return{kind:'closed',due:null,steps:[],summary:'This posting has closed'};
 if(dl){kind='stated';
  [[14,'Two weeks left: start your application'],[7,'One week left: finish your materials'],[3,'Three days left: submit soon'],[1,'Closes tomorrow: submit today']].forEach(([d,l])=>{const at=new Date(dl.getTime()-d*DAY);if(at>=sod(added)||d===1)steps.push({key:'d'+d,at:at.toISOString(),label:l})});
  steps.push({key:'d0',at:dl.toISOString(),label:'Deadline day'});
  return{kind,due:dl.toISOString(),steps,summary:'Deadline '+fmt(dl)}}
 if(x&&x.rolling){kind='rolling';const a=sod(added);
  steps=[{key:'r2',at:new Date(a.getTime()+2*DAY+9*36e5).toISOString(),label:'Rolling deadline: apply early, before spots fill'},{key:'r7',at:new Date(a.getTime()+7*DAY+9*36e5).toISOString(),label:'Still open? Rolling roles can close any day'}];
  return{kind,due:null,steps,summary:'Rolling deadline: apply early'}}
 kind='unknown';const a=sod(added);steps=[{key:'u7',at:new Date(a.getTime()+7*DAY+9*36e5).toISOString(),label:'No deadline listed: check the posting is still open'},{key:'u14',at:new Date(a.getTime()+14*DAY+9*36e5).toISOString(),label:'Two weeks on: apply or let it go'}];
 return{kind,due:null,steps,summary:'No deadline listed'}}
/* Reminders that are due now and not yet dismissed. */
function dueSteps(p,done,now){now=now?new Date(now):new Date();done=done||[];return(p.steps||[]).filter(s=>new Date(s.at)<=now&&!done.includes(s.key))}
function nextStep(p,done,now){now=now?new Date(now):new Date();done=done||[];return(p.steps||[]).find(s=>new Date(s.at)>now&&!done.includes(s.key))||null}
/* iCalendar export. Only real dates; all-day events on the stated deadline, timed alerts for reminders. */
function icsEsc(s){return String(s||'').replace(/\\/g,'\\\\').replace(/[,;]/g,m=>'\\'+m).replace(/\r?\n/g,'\\n')}
function stamp(d){return new Date(d).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}
function fold(l){const o=[];while(l.length>74){o.push(l.slice(0,74));l=' '+l.slice(74)}o.push(l);return o.join('\r\n')}
function ics(items,now){now=now||new Date();const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Intern Index//Deadline Autopilot//EN','CALSCALE:GREGORIAN'];
 items.forEach(({x,p,url})=>{(p.steps||[]).forEach(s=>{L.push('BEGIN:VEVENT','UID:'+icsEsc(x.id+'-'+s.key)+'@intern-index','DTSTAMP:'+stamp(now),'DTSTART:'+stamp(s.at),'DTEND:'+stamp(new Date(new Date(s.at).getTime()+18e5)),'SUMMARY:'+icsEsc(x.company+': '+s.label),'DESCRIPTION:'+icsEsc(x.title+(url?'\n'+url:'')),'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+icsEsc(s.label),'TRIGGER:PT0M','END:VALARM','END:VEVENT')})});
 L.push('END:VCALENDAR');return L.map(fold).join('\r\n')+'\r\n'}
return{plan,dueSteps,nextStep,ics,parseDay}});
