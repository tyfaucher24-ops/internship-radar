"""HELD-OUT TEST FIXTURES (fictional people). Written after the parser was tuned on fixtures.py and never used for tuning; scored once."""
F=[]
def R(id,fmt,text,**e):F.append({'id':id,'fmt':fmt,'text':text.strip('\n'),'expect':e})
R('h1-uga-ag','pdf','''Caleb Turner (TEST FIXTURE)
caleb.turner@example.com · Athens, GA
EDUCATION
University of Georgia — Bachelor of Science in Agricultural Economics
Minor: Food Science · May 2028 · GPA 3.52
EXPERIENCE
Example Family Farms | Operations Assistant | May 2025 – Aug 2025
• Tracked inventory for 400 acres
SKILLS
Excel, Operations, Spanish
''',name='Caleb Turner',school='University of Georgia',degree='Bachelor of Science',major='Agricultural Economics',minor='Food Science',classYear='Junior',gpa='3.52',workAuth='',skills=['excel','operations','spanish'],experience=['Example Family Farms'])
R('h2-nyu-stern-intl','pdf2col','''Arjun Mehta (TEST FIXTURE)
arjun.mehta@example.com
EDUCATION
New York University, Stern School of Business
B.S. in Business, Concentrations: Finance and Accounting
Expected May 2027 | GPA: 3.77
Visa status: F-1, will require sponsorship
EXPERIENCE
Example Bank | Summer Analyst, Investment Banking | Jun 2026 – Aug 2026
Stern Example Finance Society | VP Education | Sep 2024 – Present
SKILLS
Excel, Financial Modeling, Valuation, Python
''',name='Arjun Mehta',school='New York University',degree='B.S.',major='Finance and Accounting',minor='',classYear='Senior',gpa='3.77',workAuth='sponsor',skills=['excel','financial modeling','valuation','python'],experience=['Example Bank','Stern Example Finance Society'])
R('h3-cc-nursing','docx','''Brianna Lewis (TEST FIXTURE)
brianna.lewis@example.com
Education
Central Piedmont Community College
Associate in Applied Science, Nursing — expected May 2027
Experience
Patient Care Tech, Example Hospital
Feb 2025 – Present
Skills
Patient Care, Spanish, Excel
''',name='Brianna Lewis',school='Central Piedmont Community College',degree='Associate in Applied Science',major='Nursing',minor='',classYear='Senior',gpa='',workAuth='',skills=['spanish','excel'],experience=['Example Hospital'])
R('h4-michigan-ross-alias','txt','''Megan Walsh (TEST FIXTURE)
megan.walsh@example.com
EDUCATION
University of Michigan, Ross School of Business
BBA, Expected April 2029
Overall GPA: 3.89
EXPERIENCE
Example Ice Cream Shop | Shift Lead | Jun 2024 – Aug 2025
SKILLS
Excel, Leadership, Customer Service
U.S. Citizen
''',name='Megan Walsh',school='University of Michigan - Ann Arbor',degree='BBA',major='Business Administration',minor='',classYear='Sophomore',gpa='3.89',workAuth='citizen',skills=['excel','leadership','customer service'],experience=['Example Ice Cream Shop'])
R('h5-asu-online-changer','docx','''Tom Becker (TEST FIXTURE)
tom.becker@example.com
SUMMARY
Army veteran studying data analytics.
EDUCATION
Arizona State University
Bachelor of Applied Science in Data Analytics, expected Dec 2027, GPA 3.64
EXPERIENCE
Logistics Specialist, U.S. Army | 2018 – 2024
SKILLS
SQL, Tableau, Excel, Logistics
''',name='Tom Becker',school='Arizona State University',degree='Bachelor of Applied Science',major='Data Analytics',minor='',classYear='Senior',gpa='3.64',workAuth='',skills=['sql','tableau','excel','logistics'],experience=['U.S. Army'])
R('h6-swimmer-d1','pdf','''Olivia Grant (TEST FIXTURE)
olivia.grant@example.com
EDUCATION
University of Notre Dame
Bachelor of Arts in Psychology, Minor in Business Economics | Class of 2030
ATHLETICS
NCAA Division I Swimming & Diving
SKILLS
Research, SPSS, Writing
''',name='Olivia Grant',school='University of Notre Dame',degree='Bachelor of Arts',major='Psychology',minor='Business Economics',classYear='Freshman',gpa='',workAuth='',skills=['research','spss','writing'],experience=[])
R('h7-allcaps-name','txt','''DEREK NGUYEN (TEST FIXTURE)
derek.nguyen@example.com
EDUCATION
Texas A&M University - College Station
B.S. Industrial Engineering · May 2028 · 3.58/4.0
EXPERIENCE
Example Plastics Co. | Process Engineering Intern | May 2026 – Aug 2026
SKILLS
MATLAB, Excel, SolidWorks
''',name='Derek Nguyen',school='Texas A&M University - College Station',degree='B.S.',major='Industrial Engineering',minor='',classYear='Junior',gpa='3.58',workAuth='',skills=['matlab','excel','solidworks'],experience=['Example Plastics Co.'])
R('h8-no-gpa-no-year','txt','''Sam Rivera (TEST FIXTURE)
sam.rivera@example.com
EDUCATION
Florida Atlantic University
Bachelor of Science in Marketing
EXPERIENCE
Example Surf Shop | Sales Associate | 2023 – Present
SKILLS
Sales, Social Media, Canva
''',name='Sam Rivera',school='Florida Atlantic University',degree='Bachelor of Science',major='Marketing',minor='',classYear='',gpa='',workAuth='',skills=['sales','social media','canva'],experience=['Example Surf Shop'])
