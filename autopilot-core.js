/* V13 Deadline Autopilot core: pure functions, no DOM. Only uses what a listing actually states.
   kind: 'stated' (a real deadline date), 'rolling' (company reviews as applications arrive), 'unknown' (no deadline listed). */
(function(root,f){const m=f();if(typeof module==='object'&&module.exports)module.exports=m;else root.APCore=m})(this,function(){
const DAY=864e5;
function parseDay(s){if(!s)return null;const m=String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);if(!m)return null;return new Date(+m[1],+m[2]-1,+m[3],9,0,0)}
function sod(d){const x=new Date(d);x.setHours(0,0,0,0);return x}
function fmt(d){return d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}
/* V13.1 #14: the first step is the next 9:00 AM local after the user turned Autopilot on (today if it's before 9, else tomorrow). */
function next9(added){const d=new Date(added);const t=new Date(d);t.setHours(9,0,0,0);if(t<=d)t.setDate(t.getDate()+1);return t}
function addD(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
/* Build the week-by-week plan for one listing (V13 §1.3): tailor resume → warm path → apply → follow up, plus deadline reminders.
   added = when the user turned Autopilot on. Every step is at 9:00 AM local and never in the past. */
function plan(x,added,now){now=now?new Date(now):new Date();added=added?new Date(added):now;const dl=parseDay(x&&x.deadline);let kind,steps=[];
 if(x&&x.st==='closed')return{kind:'closed',due:null,steps:[],summary:'This posting has closed'};
 const b=next9(added),push=(key,at,label)=>{if(at>=b&&!steps.some(s=>s.key===key))steps.push({key,at:at.toISOString(),label})};
 if(dl&&dl>=b){kind='stated';const span=Math.max(0,Math.round((dl-b)/DAY));
  const ap=span>=6?addD(dl,-3):span>=2?addD(b,span-1):b;
  push('p1',b,'Week 1: tailor your resume to this posting');
  push('p2',span>=4?addD(b,Math.min(3,Math.floor(span/3))):b,'Find a warm path: message one person on the team');
  push('p3',ap,'Apply: submit your application');
  [[14,'Two weeks left: start your application'],[7,'One week left: finish your materials'],[1,'Closes tomorrow: submit today']].forEach(([d,l])=>push('d'+d,addD(dl,-d),l));
  push('d0',dl,'Deadline day');push('p4',addD(ap,7),'Follow up: check your status or send a short note');
  steps.sort((p,q)=>p.at.localeCompare(q.at));return{kind,due:dl.toISOString(),steps,summary:'Deadline '+fmt(dl)}}
 kind=x&&x.rolling?'rolling':'unknown';
 push('p1',b,'Week 1: tailor your resume to this posting');
 push('p2',addD(b,2),'Find a warm path: message one person on the team');
 push('p3',addD(b,kind==='rolling'?3:5),kind==='rolling'?'Apply: rolling roles fill early':'Apply: no deadline is listed, so apply soon');
 push(kind==='rolling'?'r7':'u7',addD(b,7),kind==='rolling'?'Still open? Rolling roles can close any day':'No deadline listed: check the posting is still open');
 push('p4',addD(b,kind==='rolling'?10:12),'Follow up: check your status or send a short note');
 return{kind,due:null,steps,summary:kind==='rolling'?'Rolling deadline: apply early':'No deadline listed'}}
/* Reminders that are due now and not yet dismissed. */
function dueSteps(p,done,now){now=now?new Date(now):new Date();done=done||[];return(p.steps||[]).filter(s=>new Date(s.at)<=now&&!done.includes(s.key))}
function nextStep(p,done,now){now=now?new Date(now):new Date();done=done||[];return(p.steps||[]).find(s=>new Date(s.at)>now&&!done.includes(s.key))||null}
/* iCalendar export. Only real dates; all-day events on the stated deadline, timed alerts for reminders. */
function icsEsc(s){return String(s||'').replace(/\\/g,'\\\\').replace(/[,;]/g,m=>'\\'+m).replace(/\r?\n/g,'\\n')}
function stamp(d){return new Date(d).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}
/* Wall-clock time in America/New_York for TZID=America/New_York */
function nyLocal(d){const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(new Date(d)).map(o=>[o.type,o.value]));return p.year+p.month+p.day+'T'+p.hour+p.minute+p.second}
const VTZ=['BEGIN:VTIMEZONE','TZID:America/New_York','BEGIN:DAYLIGHT','TZOFFSETFROM:-0500','TZOFFSETTO:-0400','TZNAME:EDT','DTSTART:19700308T020000','RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU','END:DAYLIGHT','BEGIN:STANDARD','TZOFFSETFROM:-0400','TZOFFSETTO:-0500','TZNAME:EST','DTSTART:19701101T020000','RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU','END:STANDARD','END:VTIMEZONE'];
function fold(l){const o=[];while(l.length>74){o.push(l.slice(0,74));l=' '+l.slice(74)}o.push(l);return o.join('\r\n')}
/* iCalendar export: only future steps (a reminder in the past is useless), times in America/New_York. */
function ics(items,now){now=now?new Date(now):new Date();const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Intern Index//Deadline Autopilot//EN','CALSCALE:GREGORIAN',...VTZ];
 items.forEach(({x,p,url})=>{(p.steps||[]).filter(s=>new Date(s.at)>now).forEach(s=>{L.push('BEGIN:VEVENT','UID:'+icsEsc(x.id+'-'+s.key)+'@intern-index','DTSTAMP:'+stamp(now),'DTSTART;TZID=America/New_York:'+nyLocal(s.at),'DTEND;TZID=America/New_York:'+nyLocal(new Date(new Date(s.at).getTime()+18e5)),'SUMMARY:'+icsEsc(x.company+': '+s.label),'DESCRIPTION:'+icsEsc(x.title+(url?'\n'+url:'')),'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+icsEsc(s.label),'TRIGGER:PT0M','END:VALARM','END:VEVENT')})});
 L.push('END:VCALENDAR');return L.map(fold).join('\r\n')+'\r\n'}
return{plan,dueSteps,nextStep,ics,parseDay,next9,nyLocal}});
