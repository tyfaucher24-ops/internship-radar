// V13.1 core unit tests: resume parser (#5-#8), warm-path whole-word rule (#2), grade calibration (#9).
global.self=global;const fs=require('fs'),path=require('path');
const R=require('../resume-v131.js'),W=require('../warmpath-core.js');let f=0;const ok=(n,c)=>{console.log((c?'PASS':'FAIL')+' | '+n);if(!c)f++};
// Fixture = text extracted (pdftotext) from qa-v13/Jordan_Ellis_Resume.pdf, the real QA resume.
const J=R.parse(fs.readFileSync(path.join(__dirname,'fixtures/jordan_ellis_resume.txt'),'utf8'));
ok('#7 contact name',J.contact.name==='Jordan M. Ellis');ok('#7 contact email',J.contact.email==='jordan.ellis@queens.edu');ok('#7 contact phone',J.contact.phone==='(704) 555-0182');
ok('grad year 2029',J.gradYear==='2029');ok('#6 D1 athlete',J.d1===true);
ok('#5 four experience cards',J.experience.length===4);
ok('#5 no "()" or ", NC" titles',J.experience.every(e=>!/\(\)|,\s*[A-Z]{2}\b/.test(e.title)));
ok('#5 bullets kept separate',J.experience.some(e=>e.bullets.length>=2)&&J.experience.every(e=>e.bullets.every(b=>!/•/.test(b))));
ok('#6 athletics classified',J.experience.some(e=>e.kind==='Athletics'));
ok('#5 uncertain dates flagged, not invented',J.experience.filter(e=>(e.check||[]).includes('dates')).every(e=>!e.start||!e.end));
const sk=J.skills;ok('#7 skills deduped',new Set(sk).size===sk.length);ok('#7 no fragments',sk.every(s=>!/[()]/.test(s)));
ok('#7 skills from resume',['excel','financial modeling','python'].every(s=>sk.includes(s)));
ok('parseDates Present',(()=>{const d=R.parseDates('Sep 2025 – Present');return d&&d.end==='Present'&&d.start==='2025-09'})());
ok('interestsFromMajor Finance',R.interestsFromMajor('Finance').includes('Finance & Banking'));
ok('canon strips parentheses',R.canon('Excel (VLOOKUP, pivot tables)')==='excel');
// #2 warm path
const lab=t=>W.links({company:'Citi',title:t},{}).map(l=>l.label+' '+l.url).join(' ');
ok('#2 Internal kept',/Internal%20Audit/.test(lab('Internal Audit Summer Analyst')));
ok('#2 International kept',/International/.test(lab('International Tax Intern')));
ok('#2 Internship Program removed',!/Internship/.test(lab('Finance Internship Program')));
ok('#2 Intern - Finance',/Finance/.test(lab('Intern - Finance'))&&!/Intern%20/.test(lab('Intern - Finance')));
// #9 calibration
const C=require('./calib_v131.js');ok('#9 max < 100 ('+C.max+')',C.max<100);ok('#9 top-20 distinct >= 5 ('+C.distinct+')',C.distinct>=5);
ok('#9 missing location is not a match',C.noLocScoreVsWithout&&C.noLocScoreVsWithout[0]<=C.noLocScoreVsWithout[1]);
process.exit(f?1:0);
