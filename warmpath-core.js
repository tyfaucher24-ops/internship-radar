/* V13 Warm-path finder core: builds plain LinkedIn search links the user opens themselves, and outreach text.
   Nothing here contacts LinkedIn or reads any data from it. */
(function(root,f){const m=f();if(typeof module==='object'&&module.exports)module.exports=m;else root.WPCore=m})(this,function(){
/* School pages we have checked by hand. Any other school falls back to a people search with the school's name. */
const SCHOOL_SLUGS={'Queens University of Charlotte':'queens-university-of-charlotte'};
const LI='https://www.linkedin.com';
const q=s=>encodeURIComponent(String(s||'').replace(/\s+/g,' ').trim());
function team(title){return String(title||'').replace(/\(.*?\)/g,' ').replace(/\b(20\d\d|summer|fall|spring|winter|intern(ship)?s?|program|analyst|associate|co-?op|undergraduate|graduate|early talent|\(.*?\)|[-–—:|,])/gi,' ').replace(/\s+/g,' ').trim().split(' ').slice(0,4).join(' ')}
function links(x,p){p=p||{};const co=x.company,out=[],sc=p.school,slug=sc&&SCHOOL_SLUGS[sc];
 if(sc)out.push({k:'alumni',label:`${sc} alumni at ${co}`,why:'Alumni are the warmest way in. Most will answer a short, specific note.',url:slug?`${LI}/school/${slug}/people/?keywords=${q(co)}`:`${LI}/search/results/people/?keywords=${q(co+' '+sc)}`});
 const t=team(x.title);if(t)out.push({k:'team',label:`People in ${t} at ${co}`,why:'People doing the work can tell you what the team looks for.',url:`${LI}/search/results/people/?keywords=${q(co+' '+t)}`});
 out.push({k:'recruit',label:`Campus recruiters at ${co}`,why:'Recruiters run the process and can confirm timing.',url:`${LI}/search/results/people/?keywords=${q(co+' university recruiter')}`});
 out.push({k:'interns',label:`Past interns at ${co}`,why:'Former interns know how the interviews went.',url:`${LI}/search/results/people/?keywords=${q(co+' intern')}`});
 out.push({k:'company',label:`${co} on LinkedIn`,why:'See the company page and recent posts before you reach out.',url:`${LI}/search/results/companies/?keywords=${q(co)}`});
 return out}
const yr=p=>p.classYear?p.classYear.toLowerCase():'student';
function note(x,p,c){p=p||{};c=c||{};const first=(c.name||'').trim().split(/\s+/)[0];const who=[yr(p)==='student'?'a student':'a '+yr(p),p.school?'at '+p.school:'',p.major?'studying '+p.major:''].filter(Boolean).join(' ');
 let s=`Hi${first?' '+first:''}, I'm ${who}. I'm applying to ${x.company}'s ${x.title} and would really value 10 minutes of your perspective on the team. Thank you!`;
 if(s.length>300)s=`Hi${first?' '+first:''}, I'm ${who}. I'm applying to ${x.company}'s internship and would value 10 minutes of your perspective. Thank you!`;
 if(s.length>300)s=s.slice(0,299).trim()+'…';return s}
function email(x,p,c){p=p||{};c=c||{};const first=(c.name||'').trim().split(/\s+/)[0];
 const subject=`${p.school?p.school+' student':'Student'} applying to ${x.company}`;
 const body=`Hi${first?' '+first:''},\n\nI'm ${p.classYear?'a '+p.classYear.toLowerCase():'a student'}${p.school?' at '+p.school:''}${p.major?' studying '+p.major:''}. I'm applying to ${x.company}'s ${x.title}${c.how?' and '+c.how.trim().replace(/\.$/,'')+'':''}.\n\nWould you have 10 to 15 minutes in the next couple of weeks to share what the team looks for? Happy to work around your schedule.\n\nThank you,\n${p.name||''}`.trim();
 return{subject,body}}
function mailto(addr,m){return`mailto:${encodeURIComponent(addr||'').replace(/%40/g,'@')}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}`}
return{links,note,email,mailto,team,SCHOOL_SLUGS}});
