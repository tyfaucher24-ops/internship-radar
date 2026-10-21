"""TEST FIXTURES ONLY. Every person, email, phone and employer detail below is fictional and made up for parser testing.
Each fixture: id, fmt (txt | docx | pdf | pdf2col), text (the resume as written), expect (ground truth for every field).
workAuth: citizen | authorized | sponsor | '' (not stated). classYear is relative to the 2026-27 school year."""
F=[]
def R(id,fmt,text,**e):F.append({'id':id,'fmt':fmt,'text':text.strip('\n'),'expect':e})

R('01-ty-like-queens','pdf','''Jordan Whitaker (TEST FIXTURE)
Charlotte, NC | jordan.whitaker@example.com | (555) 010-0101
EDUCATION
Queens University of Charlotte, McColl School of Business
Bachelor of Science in Business Administration, Finance Major
Finance Major • GPA 3.92 • Division I lacrosse • Queens University Investment Club Class of 2029
EXPERIENCE
Queens University Investment Club | Analyst | Sep 2025 – Present
• Pitched two consumer stocks to the club portfolio committee
Charlotte Youth Lacrosse | Volunteer Coach | Jun 2024 – Aug 2025
• Coached 14 U-12 players through a summer season
ATHLETICS
NCAA Division I Women's Lacrosse, Queens University of Charlotte
SKILLS
Excel, PowerPoint, Bloomberg Terminal (basic), Financial Modeling
U.S. Citizen
''',name='Jordan Whitaker',school='Queens University of Charlotte',degree='Bachelor of Science',major='Finance',minor='',classYear='Sophomore',gpa='3.92',workAuth='citizen',skills=['excel','powerpoint','financial modeling'],experience=['Queens University Investment Club','Charlotte Youth Lacrosse'])

R('02-community-college','txt','''MARIA DELGADO (TEST FIXTURE)
Miami, FL · maria.d@example.com
EDUCATION
Miami Dade College — Associate in Arts, Business Administration
Expected Graduation: May 2027 | GPA: 3.45
WORK EXPERIENCE
Publix Super Markets — Customer Service Associate
Aug 2023 – Present
- Handle 200+ customer interactions per shift
SKILLS
Customer Service, Excel, Spanish (fluent), Cash Handling
''',name='Maria Delgado',school='Miami Dade College',degree='Associate in Arts',major='Business Administration',minor='',classYear='Senior',gpa='3.45',workAuth='',skills=['customer service','excel','spanish'],experience=['Publix Super Markets'])

R('03-state-school-cs','docx','''Kevin Tran (TEST FIXTURE)
kevin.tran@example.com | github.com/example-kt
Education
Arizona State University, Tempe, AZ
B.S. Computer Science, Minor in Mathematics, Aug 2024 - May 2028
GPA: 3.61/4.0
Experience
Software Engineering Intern, Example Logistics Co.
May 2025 – Aug 2025
- Built an internal dashboard in React and TypeScript
Projects
Course Planner — Python, Flask
Technical Skills
Languages: Python, Java, JavaScript, TypeScript, SQL
Tools: Git, Linux, AWS
''',name='Kevin Tran',school='Arizona State University',degree='B.S.',major='Computer Science',minor='Mathematics',classYear='Junior',gpa='3.61',workAuth='',skills=['python','java','javascript','typescript','sql','git','aws'],experience=['Example Logistics Co.'])

R('04-ivy-econ','pdf','''Eleanor Price (TEST FIXTURE)
eleanor.price@example.com | New York, NY
EDUCATION
Harvard University, Cambridge, MA
A.B. in Economics, Secondary in Statistics | Class of 2027
GPA: 3.88
EXPERIENCE
Example Capital Partners, New York, NY
Summer Analyst, Private Equity | Jun 2026 – Aug 2026
• Built LBO models for two middle-market deals
Harvard Undergraduate Consulting Club, Cambridge, MA
Project Lead | Sep 2024 – Present
SKILLS
Excel, Financial Modeling, Valuation, Python, Stata
Work authorization: U.S. citizen
''',name='Eleanor Price',school='Harvard University',degree='A.B.',major='Economics',minor='Statistics',classYear='Senior',gpa='3.88',workAuth='citizen',skills=['excel','financial modeling','valuation','python'],experience=['Example Capital Partners','Harvard Undergraduate Consulting Club'])

R('05-international-f1','pdf','''Wei Zhang (TEST FIXTURE)
wei.zhang@example.com | +1 555 010 0505
EDUCATION
Boston University, Questrom School of Business
Bachelor of Science in Business Administration, Concentration: Finance; Minor: Data Science
Expected May 2028 · GPA 3.74
Work authorization: F-1 student visa; will require H-1B sponsorship
EXPERIENCE
Example Securities (Shanghai) — Research Intern
Jun 2025 – Aug 2025
• Wrote 3 sector notes on Chinese EV makers
SKILLS
Excel, Python, SQL, Mandarin (native), Bloomberg
''',name='Wei Zhang',school='Boston University',degree='Bachelor of Science',major='Finance',minor='Data Science',classYear='Junior',gpa='3.74',workAuth='sponsor',skills=['excel','python','sql','bloomberg'],experience=['Example Securities (Shanghai)'])

R('06-career-changer','docx','''Daniel Ortiz (TEST FIXTURE)
daniel.ortiz@example.com
SUMMARY
Former restaurant manager moving into supply chain analytics.
EDUCATION
Georgia Institute of Technology — Master of Science in Supply Chain Engineering
Expected December 2027
Bachelor of Arts in History, 2016
PROFESSIONAL EXPERIENCE
General Manager, Example Bistro Group
2018 – 2025
- Ran a $3M restaurant with 40 staff; cut food waste 18%
SKILLS
Excel, Tableau, SQL, Operations, Logistics
Authorized to work in the U.S. without sponsorship
''',name='Daniel Ortiz',school='Georgia Institute of Technology',degree='Master of Science',major='Supply Chain Engineering',minor='',classYear='Senior',gpa='',workAuth='authorized',skills=['excel','tableau','sql','operations','logistics'],experience=['Example Bistro Group'])

R('07-athlete-d1-football','pdf2col','''Marcus Bell (TEST FIXTURE)
marcus.bell@example.com | Columbus, OH
EDUCATION
Ohio State University - Columbus
Bachelor of Science in Sport Industry; Minor in Business
Class of 2029 | Cumulative GPA: 3.10
ATHLETICS
Varsity Football, NCAA Division I (2025 – Present)
EXPERIENCE
Example Athletic Club | Front Desk Associate | May 2025 – Aug 2025
• Checked in 300+ members a day
SKILLS
Public Speaking, Leadership, Excel, Social Media
''',name='Marcus Bell',school='Ohio State University - Columbus',degree='Bachelor of Science',major='Sport Industry',minor='Business',classYear='Sophomore',gpa='3.10',workAuth='',skills=['public speaking','leadership','excel','social media'],experience=['Example Athletic Club'])

R('08-freshman-nursing','txt','''Aisha Khan (TEST FIXTURE)
aisha.khan@example.com
Education
University of North Carolina at Chapel Hill
Bachelor of Science in Nursing (BSN), expected May 2030
Freshman
Experience
CNA Volunteer, Example Senior Living | Sep 2025 – Present
Skills
CPR/BLS certified, Patient Care, Spanish
''',name='Aisha Khan',school='University of North Carolina at Chapel Hill',degree='Bachelor of Science',major='Nursing',minor='',classYear='Freshman',gpa='',workAuth='',skills=['spanish'],experience=['Example Senior Living'])

R('09-marketing-junior','docx','''Chloe Martin (TEST FIXTURE)
chloe.martin@example.com | Austin, TX
EDUCATION
The University of Texas at Austin
Bachelor of Business Administration in Marketing | Minor in Communication Studies
May 2028 | GPA 3.55
EXPERIENCE
Social Media Intern — Example Coffee Roasters
Jan 2026 – May 2026
• Grew Instagram following 22% in one semester
Marketing Chair — Example Sorority Chapter
Aug 2025 – Present
SKILLS
Canva, Adobe Photoshop, HubSpot, Google Analytics, Copywriting
''',name='Chloe Martin',school='The University of Texas at Austin',degree='Bachelor of Business Administration',major='Marketing',minor='Communication Studies',classYear='Junior',gpa='3.55',workAuth='',skills=['canva','hubspot','google analytics','copywriting'],experience=['Example Coffee Roasters','Example Sorority Chapter'])

R('10-hbcu-accounting','pdf','''Jasmine Carter (TEST FIXTURE)
jasmine.carter@example.com | Atlanta, GA
EDUCATION
Spelman College, Atlanta, GA
B.A. Economics, Minor in Accounting
Expected Graduation: May 2027
GPA: 3.81/4.00
EXPERIENCE
Example Accounting LLP | Audit Intern | Jun 2026 – Aug 2026
• Tested revenue controls for two nonprofit clients
VITA Tax Program | Volunteer Preparer | Jan 2025 – Apr 2025
SKILLS
Excel, QuickBooks, Audit, Tax
US Citizen
''',name='Jasmine Carter',school='Spelman College',degree='B.A.',major='Economics',minor='Accounting',classYear='Senior',gpa='3.81',workAuth='citizen',skills=['excel','quickbooks','audit','tax'],experience=['Example Accounting LLP','VITA Tax Program'])

R('11-engineering-coop','pdf2col','''Liam O'Connor (TEST FIXTURE)
liam.oconnor@example.com
EDUCATION
Purdue University - West Lafayette
Bachelor of Science in Mechanical Engineering
Aug 2023 – May 2027 · GPA 3.42
EXPERIENCE
Manufacturing Engineering Co-op, Example Engines Inc.
Jan 2026 – Aug 2026
- Redesigned a fixture that cut cycle time 12%
SKILLS
SolidWorks, AutoCAD, MATLAB, Python
''',name="Liam O'Connor",school='Purdue University',degree='Bachelor of Science',major='Mechanical Engineering',minor='',classYear='Senior',gpa='3.42',workAuth='',skills=['solidworks','autocad','matlab','python'],experience=['Example Engines Inc.'])

R('12-cuny-baruch','txt','''Priya Patel (TEST FIXTURE)
priya.patel@example.com | Queens, NY
EDUCATION
CUNY Baruch College, Zicklin School of Business
BBA in Finance & Investments, Minor in Statistics — Expected June 2028
GPA: 3.67
EXPERIENCE
Example Credit Union | Teller | Sep 2024 – Present
SKILLS
Excel, Financial Modeling, SQL
Permanent resident (green card)
''',name='Priya Patel',school='CUNY Baruch College',degree='BBA',major='Finance & Investments',minor='Statistics',classYear='Junior',gpa='3.67',workAuth='citizen',skills=['excel','financial modeling','sql'],experience=['Example Credit Union'])

R('13-gpa-scale-out-of-range','txt','''Noah Fischer (TEST FIXTURE)
noah.fischer@example.com
EDUCATION
Michigan State University
Bachelor of Arts in Political Science, Class of 2028
GPA 87/100 (transfer transcript)
EXPERIENCE
Example State Senate Office | Legislative Intern | Jan 2026 – May 2026
SKILLS
Research, Writing, Public Speaking
''',name='Noah Fischer',school='Michigan State University',degree='Bachelor of Arts',major='Political Science',minor='',classYear='Junior',gpa='',workAuth='',skills=['research','writing','public speaking'],experience=['Example State Senate Office'])

R('14-santa-monica-transfer','docx','''Sofia Rossi (TEST FIXTURE)
sofia.rossi@example.com | Los Angeles, CA
EDUCATION
Santa Monica College — Associate of Science in Mathematics, 2025
University of California, Los Angeles — B.S. Statistics and Data Science, expected June 2027
GPA: 3.70
EXPERIENCE
Example Analytics Startup — Data Intern
Jun 2026 – Sep 2026
SKILLS
R, Python, SQL, Tableau, Statistics
''',name='Sofia Rossi',school='University of California, Los Angeles',degree='B.S.',major='Statistics and Data Science',minor='',classYear='Senior',gpa='3.70',workAuth='',skills=['r','python','sql','tableau','statistics'],experience=['Example Analytics Startup'])

R('15-no-school-match','txt','''Ethan Brooks (TEST FIXTURE)
ethan.brooks@example.com
EDUCATION
Example Coastal Institute of Arts (not accredited in US list)
Diploma in Graphic Design, 2027
EXPERIENCE
Example Print Shop | Designer | 2024 – Present
SKILLS
Figma, Illustrator, Photoshop
''',name='Ethan Brooks',school='',degree='',major='Graphic Design',minor='',classYear='Senior',gpa='',workAuth='',skills=['figma','illustrator','photoshop'],experience=['Example Print Shop'])

R('16-howard-polisci','pdf','''Tiana Robinson (TEST FIXTURE)
tiana.robinson@example.com | Washington, DC
EDUCATION
Howard University, Washington, DC
Bachelor of Arts in Political Science | Minor: Economics
Expected May 2029 | GPA: 3.93
LEADERSHIP
Student Government Association | Sophomore Class Senator | 2025 – Present
EXPERIENCE
Example Policy Institute | Research Assistant | Jun 2026 – Aug 2026
SKILLS
Research, Writing, Excel, Policy
''',name='Tiana Robinson',school='Howard University',degree='Bachelor of Arts',major='Political Science',minor='Economics',classYear='Sophomore',gpa='3.93',workAuth='',skills=['research','writing','excel','policy'],experience=['Example Policy Institute'])

R('17-rutgers-alias','txt','''Ryan Murphy (TEST FIXTURE)
ryan.murphy@example.com
EDUCATION
Rutgers Business School, New Brunswick
B.S. in Supply Chain Management · Minor in Economics · Graduation: May 2028 · GPA: 3.38
EXPERIENCE
Example Distribution Center — Warehouse Associate
May 2024 – Aug 2025
SKILLS
Excel, SAP, Logistics
''',name='Ryan Murphy',school='Rutgers University',degree='B.S.',major='Supply Chain Management',minor='Economics',classYear='Junior',gpa='3.38',workAuth='',skills=['excel','logistics'],experience=['Example Distribution Center'])

R('18-international-no-auth','pdf2col','''Lucas Silva (TEST FIXTURE)
lucas.silva@example.com | São Paulo, Brazil
EDUCATION
Northeastern University, Boston, MA
Bachelor of Science in Economics, expected December 2027
GPA 3.58
EXPERIENCE
Example Bank Brasil | Summer Intern, Corporate Banking | Jun 2025 – Aug 2025
SKILLS
Excel, PowerPoint, Portuguese, Spanish
''',name='Lucas Silva',school='Northeastern University',degree='Bachelor of Science',major='Economics',minor='',classYear='Senior',gpa='3.58',workAuth='',skills=['excel','powerpoint','spanish'],experience=['Example Bank Brasil'])

R('19-duke-biology-premed','docx','''Grace Liu (TEST FIXTURE)
grace.liu@example.com
EDUCATION
Duke University, Durham, NC
B.S. in Biology, Minor in Chemistry · Class of 2028 · GPA 3.79
RESEARCH EXPERIENCE
Undergraduate Researcher, Example Neuroscience Lab | Sep 2025 – Present
• Ran 60+ PCR assays
SKILLS
Lab, Biology, Chemistry, R, Python
''',name='Grace Liu',school='Duke University',degree='B.S.',major='Biology',minor='Chemistry',classYear='Junior',gpa='3.79',workAuth='',skills=['biology','chemistry','r','python'],experience=['Example Neuroscience Lab'])

R('20-gpa-in-honors-line','txt','''Owen Harris (TEST FIXTURE)
owen.harris@example.com
EDUCATION
Appalachian State University — Bachelor of Science in Accounting
May 2029 · Dean's List (Fall 2025) · Major GPA 3.95, Cumulative GPA 3.71
EXPERIENCE
Example Hardware Store | Cashier | Jun 2025 – Present
SKILLS
Excel, QuickBooks, Accounting
''',name='Owen Harris',school='Appalachian State University',degree='Bachelor of Science',major='Accounting',minor='',classYear='Sophomore',gpa='3.71',workAuth='',skills=['excel','quickbooks','accounting'],experience=['Example Hardware Store'])

R('21-name-with-school-word','pdf','''College Johnson (TEST FIXTURE)
college.johnson@example.com
EDUCATION
Davidson College, Davidson, NC
Bachelor of Arts in Mathematics | Expected May 2028 | GPA 3.66
EXPERIENCE
Example Math Camp | Counselor | Jun 2025 – Aug 2025
SKILLS
Mathematics, Python, Teaching
''',name='College Johnson',school='Davidson College',degree='Bachelor of Arts',major='Mathematics',minor='',classYear='Junior',gpa='3.66',workAuth='',skills=['python','teaching'],experience=['Example Math Camp'])

R('22-houston-cc-it','txt','''Carlos Mendez (TEST FIXTURE)
carlos.mendez@example.com | Houston, TX
EDUCATION
Houston Community College
Associate of Applied Science in Information Technology — Spring 2027
GPA: 3.20
EXPERIENCE
IT Help Desk Technician, Example School District
Sep 2024 – Present
SKILLS
Windows, Linux, Customer Service, Networking
U.S. citizen
''',name='Carlos Mendez',school='Houston Community College',degree='Associate of Applied Science',major='Information Technology',minor='',classYear='Senior',gpa='3.20',workAuth='citizen',skills=['linux','customer service'],experience=['Example School District'])

R('23-berkeley-haas-sponsor','pdf2col','''Hana Sato (TEST FIXTURE)
hana.sato@example.com
EDUCATION
University of California, Berkeley — Haas School of Business
Bachelor of Science in Business Administration · Expected May 2027 · GPA 3.85
International student (F-1). Will need visa sponsorship.
EXPERIENCE
Example Consulting Group | Business Analyst Intern | Jun 2026 – Aug 2026
Berkeley Example Investment Society | Analyst | Sep 2024 – Present
SKILLS
Excel, PowerPoint, Strategy, Japanese
''',name='Hana Sato',school='University of California, Berkeley',degree='Bachelor of Science',major='Business Administration',minor='',classYear='Senior',gpa='3.85',workAuth='sponsor',skills=['excel','powerpoint','strategy'],experience=['Example Consulting Group','Berkeley Example Investment Society'])

R('24-notre-dame-finance-soph','docx','''Patrick Kelly (TEST FIXTURE)
patrick.kelly@example.com
EDUCATION
University of Notre Dame, Mendoza College of Business
Bachelor of Business Administration, Finance | Sophomore | GPA: 3.70
ACTIVITIES
Investment Club, Member
Club Rugby
EXPERIENCE
Example Golf Club | Caddie | Summers 2023 – 2025
SKILLS
Excel, PowerPoint
''',name='Patrick Kelly',school='University of Notre Dame',degree='Bachelor of Business Administration',major='Finance',minor='',classYear='Sophomore',gpa='3.70',workAuth='',skills=['excel','powerpoint'],experience=['Example Golf Club'])

R('25-elon-comms-gpa-slash','pdf','''Ava Thompson (TEST FIXTURE)
ava.thompson@example.com
EDUCATION
Elon University, Elon, NC
B.A. Strategic Communications, Minor in Business Administration
Graduation: May 2029
3.48/4.0
EXPERIENCE
Example PR Agency | PR Intern | Jun 2026 – Aug 2026
SKILLS
Writing, Social Media, Canva
''',name='Ava Thompson',school='Elon College',degree='B.A.',major='Strategic Communications',minor='Business Administration',classYear='Sophomore',gpa='3.48',workAuth='',skills=['writing','social media','canva'],experience=['Example PR Agency'])

R('26-valencia-hospitality','pdf2col','''Jamal Wright (TEST FIXTURE)
jamal.wright@example.com | Orlando, FL
EDUCATION
Valencia College — A.S. Hospitality and Tourism Management
Expected Graduation: December 2026 | GPA: 3.05
EXPERIENCE
Front Desk Agent, Example Resort & Spa
Mar 2024 – Present
SKILLS
Customer Service, Operations, Spanish
''',name='Jamal Wright',school='Valencia College',degree='A.S.',major='Hospitality and Tourism Management',minor='',classYear='Senior',gpa='3.05',workAuth='',skills=['customer service','operations','spanish'],experience=['Example Resort & Spa'])
