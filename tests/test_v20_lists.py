"""V20 Part 3a: README tables from speedyapply, zshah101, awesome-ml and jobbie-bot become listing leads.
Fixtures copy each list's real row shape (2026-11-04)."""
import sys
sys.path.insert(0,'.')
from pipeline import discover as D, sync as S
ok=0;n=0
def t(c,m):
    global ok,n;n+=1;ok+=bool(c);print(('PASS ' if c else 'FAIL ')+m)
SPEEDY='''| Company | Position | Location | Salary | Posting | Age |
|---|---|---|---|---|---|
| <a href="https://www.microsoft.com"><strong>Microsoft</strong></a> | Software Engineer: Internship Opportunities | Aliso Viejo, CA | $52/hr | <a href="https://apply.careers.microsoft.com/careers/job/1970393557044764"><img src="https://i.imgur.com/JpkfjIq.png" alt="Apply" width="70"/></a> | 2d |

| Company | Position | Location | Posting | Age |
|---|---|---|---|---|
| <a href="https://x.com"><strong>Black Cape</strong></a> | Software Intern | Arlington, VA | <a href="https://blackcape.applytojob.com/apply/7o6"><img src="https://i.imgur.com/a.png"/></a> | 1d |
'''
ZSHAH='''| Company | Role | Apply | Location | Skills | Date Posted |
|---|---|---|---|---|---|
| Centene 🆁 | AI Business Strategy Intern (Undergraduate Summer 2027) 🆕 | [Apply](https://centene.wd5.myworkdayjobs.com/Centene_External/job/Remote-MO/AI_1667703-1) | Remote-MO | No skills listed | Nov 04, 2026 |
| Copart | Software Engineering Intern _(2 openings)_ | [Apply](https://copart.wd12.myworkdayjobs.com/copart/job/Dallas/SWE_JR1) | Dallas, TX | Python | Jul 30, 2026 |
| 🧰 **Skill tags** | Every posting's text | [dashboard](https://zshah101.github.io/x/) | | | |
'''
JOBBIE='''| Company | Role | Location | Date posted | Link | Apply |
|---|---|---|---|---|---|
| Sun Life | Business Operations Software Engineer 2027 Co-op · $22/hr | Wellesley, MA | 2026-11-03 | [Job listing](https://sunlife.wd3.myworkdayjobs.com/experienced/job/W/BO_JR1) | <a href="https://jobbie.bot/register?job=5"><img src="https://raw.githubusercontent.com/jobbie-bot/x/main/a.png"></a> |
'''
r=D.md_table_rows(SPEEDY,D.MD_TABLES['speedyapply/2027-SWE-College-Jobs'])
t(len(r)==2,'speedyapply: both tables read although their columns differ')
t(r[0]=={'company':'Microsoft','title':'Software Engineer: Internship Opportunities','url':'https://apply.careers.microsoft.com/careers/job/1970393557044764','locations':['Aliso Viejo, CA'],'posted':None},'speedyapply: employer link, not the company homepage or image')
t(r[1]['url'].startswith('https://blackcape.applytojob.com'),'speedyapply: 5-column table uses its own Posting column')
z=D.md_table_rows(ZSHAH,D.MD_TABLES['zshah101/Automated-List-Of-Summer-2027-and-Fall-2026-Tech-Internships'])
t(len(z)==2,'zshah101: feature table row with a list-owner link ignored')
t(z[0]['company']=='Centene' and z[0]['title'].endswith('Summer 2027)') and z[0]['posted']=='2026-11-04','zshah101: emoji stripped, date parsed')
t(z[1]['title']=='Software Engineering Intern','zshah101: "(2 openings)" dropped from the title')
j=D.md_table_rows(JOBBIE,D.MD_TABLES['jobbie-bot/Summer-2027-Tech-Internships'])
t(len(j)==1 and 'jobbie.bot' not in j[0]['url'] and j[0]['title']=='Business Operations Software Engineer 2027 Co-op' and j[0]['posted']=='2026-11-03','jobbie-bot: job listing link, not the sign-up link; pay suffix dropped')
names=[x[0] for x in D.GITHUB_LISTS]
t(all(k in names for k in D.MD_TABLES),'every table layout is a list that is read')
t(not any('dreamworkhq' in x or 'pittcsc' in x.lower() or 'northwesternfintech' in x.lower() for x in names),'dreamworkhq / pittcsc / northwesternfintech not added')
src=open('pipeline/sync.py').read()
t(src.index('name in MD_TABLES')<src.index("'zapply' in name"),'awesome-ml (a zapply repo) uses the table parser, not the zapply row regex')
t('verify_link(rec[\'apply_url\'])' in src,'leads are still verified against the employer posting')
print(f'{ok}/{n}');sys.exit(ok!=n)
