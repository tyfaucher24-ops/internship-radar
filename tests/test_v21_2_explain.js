// V21.2: experience feedback quotes resume bullets, never a title-only "closest match".
// Fixture listings are labeled TEST DATA and are not written into data/.
global.self = global;
require('../match-core.js');
const MC = global.MatchCore;
let f = 0;
const ok = (n, c, info) => { console.log((c ? 'PASS' : 'FAIL') + ' | ' + n + (c || info == null ? '' : ' ' + info)); if (!c) f++; };
const LONG = 'Internship – Private Wealth Management (Phoenix, AZ) Summer Analyst Program for undergraduates interested in markets';
const base = {
  v: 6, savedAt: '2026-01-01T00:00:00.000Z', major: 'Finance', skills: ['excel'],
  experience: [
    { title: 'DEXCOM & BEYOND T1D AMBASSADOR', org: 'Campus Org', kind: 'Club', bullets: ['Hosted campus events for students'] },
    { title: 'Finance Intern', org: 'Local Credit Union', kind: 'Internship', bullets: ['Built weekly Excel models for client reports'] }
  ]
};
const P = MC.profile(base);
const hit = MC.evidenceList({ title: LONG, company: 'TEST DATA', req: { sk: ['Excel', 'Python'] } }, P);
ok('evidenced experience is one bullet item', hit.items.length === 1, hit.items.length);
ok('bullet names the experience', /Finance Intern/.test(hit.items[0].name));
ok('evidence quotes the resume bullet first', hit.items[0].evidence.indexOf('Built weekly Excel models') >= 0 && hit.items[0].evidence.indexOf('Your resume says') === 0);
ok('why names the posting requirement', /Excel/.test(hit.items[0].why) && /requirement/.test(hit.items[0].why));
ok('why does not repeat the long posting title', !hit.items[0].why.includes('Private Wealth') && !hit.items[0].evidence.includes('Private Wealth'));
ok('title-only ambassador is not listed as a match', !hit.items.some(i => /AMBASSADOR|DEXCOM/.test(i.name + i.evidence + i.why)));
const miss = MC.evidenceList({ title: LONG, company: 'TEST DATA', req: { sk: ['Python', 'financial modeling'] } }, P);
ok('missing evidence is not a match item', miss.items.length === 0);
ok('missing evidence says the connection is not established', /not established/i.test(miss.note) && /Python/.test(miss.note));
ok('missing note does not use the experience title or posting title', !/AMBASSADOR|Private Wealth|closest match/i.test(miss.note));
const titleOnly = MC.evidenceList(
  { title: LONG, company: 'TEST DATA', req: { sk: ['Excel'] } },
  MC.profile({ experience: [{ title: 'Excel Specialist at DEXCOM & BEYOND T1D AMBASSADOR', org: 'X', bullets: ['Greeted customers at the front desk every Saturday'] }], skills: [] })
);
ok('a title that merely contains the skill is not evidence', titleOnly.items.length === 0 && /not established/i.test(titleOnly.note) && !/closest match/i.test(titleOnly.note));
const blob = JSON.stringify(hit) + JSON.stringify(miss) + JSON.stringify(titleOnly);
ok('no closest-match copy', !/closest match/i.test(blob));
ok('confidence logic still exists', typeof MC.score === 'function' && /Lower confidence|High confidence/.test(String(require('fs').readFileSync(require('path').join(__dirname, '../match-core.js')))));
if (f) { console.log(f + ' failed'); process.exit(1); }
console.log('V21.2 explain ok');
