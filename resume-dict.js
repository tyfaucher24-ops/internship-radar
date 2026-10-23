/* V14.3 resume dictionaries: section names, degrees, certifications, skills, languages, experience-type cues.
   Pure data + tiny helpers. UMD: window.RDICT in the page, self.RDICT in the worker, module.exports in node tests. */
(function(root,f){const D=f();if(typeof module==='object'&&module.exports)module.exports=D;else root.RDICT=D})(typeof self!=='undefined'?self:this,function(){
const SECTIONS={
 education:['education','academic background','academics','education and honors','education & honors','academic history','schooling','education and training','academic credentials','academic profile','academic experience'],
 experience:['experience','work experience','professional experience','relevant experience','employment','employment history','work history','professional history','career history','internship experience','internships','finance experience','industry experience','related experience','experience and leadership','experience & leadership','professional & leadership experience','professional and leadership experience','work & leadership experience','additional experience','other experience','business experience','consulting experience','technical experience','engineering experience','clinical experience','healthcare experience','marketing experience','teaching experience','military experience','military service'],
 leadership:['leadership','leadership experience','leadership and activities','leadership & activities','activities','activities and leadership','activities & leadership','extracurricular activities','extracurriculars','campus involvement','involvement','campus leadership','student organizations','organizations','affiliations','memberships','leadership & involvement','leadership and involvement','activities and interests','activities & interests','extracurricular','co-curricular activities'],
 athletics:['athletics','athletic experience','varsity athletics','sports','collegiate athletics','athletic involvement'],
 volunteer:['volunteer','volunteer experience','volunteering','community service','community involvement','service','volunteer work','community engagement','service and leadership'],
 projects:['projects','technical projects','personal projects','academic projects','selected projects','project experience','software projects','engineering projects','class projects','relevant projects'],
 research:['research','research experience','research and publications','research & publications','undergraduate research'],
 publications:['publications','papers','publications and presentations','presentations','conference presentations'],
 skills:['skills','technical skills','skills and interests','skills & interests','skills and certifications','skills & certifications','additional skills','core competencies','competencies','computer skills','software','tools','technologies','skills/interests','skills, activities & interests','skills, activities and interests','technical proficiencies','proficiencies','areas of expertise','key skills','relevant skills','skills & languages','skills and languages','languages and skills','languages & skills','technical skills and certifications','software skills'],
 certifications:['certifications','certificates','licenses','licenses and certifications','licenses & certifications','certifications and licenses','certifications & licenses','professional certifications','credentials','certifications and training','training','professional development','certifications & training'],
 coursework:['relevant coursework','coursework','courses','selected coursework','related coursework'],
 honors:['honors','awards','honors and awards','honors & awards','awards and honors','awards & honors','achievements','accomplishments','scholarships','honors & activities','recognition','awards and recognition','distinctions'],
 languages:['languages','language skills','language proficiency'],
 interests:['interests','hobbies','personal interests','hobbies and interests','hobbies & interests','personal'],
 summary:['summary','professional summary','profile','objective','career objective','about me','about','personal statement','summary of qualifications','career summary','overview'],
 additional:['additional','additional information','other','miscellaneous','additional info','other information','personal information'],
 contact:['contact','contact information','contact info','details']};
const SECT={};for(const k in SECTIONS)for(const s of SECTIONS[k])SECT[s]=k;
/* degree patterns: [canonical, regex, level] — level: hs | assoc | bach | grad */
const DEGREES=[
 ['BSBA',/\b(B\.?\s?S\.?\s?B\.?\s?A\.?|bachelor of science in business administration)\b/i,'bach'],
 ['BBA',/\b(B\.?\s?B\.?\s?A\.?|bachelor of business administration)(?![a-z])/i,'bach'],
 ['BSN',/\b(B\.?\s?S\.?\s?N\.?|bachelor of science in nursing)(?![a-z])/i,'bach'],
 ['BSE',/\b(B\.?\s?S\.?\s?E\.?|bachelor of science in engineering)(?![a-z])/i,'bach'],
 ['BEng',/\b(B\.?\s?Eng\.?|bachelor of engineering)(?![a-z])/i,'bach'],
 ['BFA',/\b(B\.?\s?F\.?\s?A\.?|bachelor of fine arts)(?![a-z])/i,'bach'],
 ['BArch',/\b(B\.?\s?Arch\.?|bachelor of architecture)(?![a-z])/i,'bach'],
 ['BS',/\b(B\.\s?S\.?(?![a-z])|BS(?![a-z.])|B\.Sc\.?|BSc|bachelor of science|bachelor['’]?s of science|bachelor['’]?s in science)/i,'bach'],
 ['BA',/\b(B\.\s?A\.?(?![a-z])|BA(?![a-z.&])|[Bb]achelor['’]?s? of [Aa]rts|BACHELOR OF ARTS|A\.B\.)/,'bach'],
 ['MBA',/\b(M\.?\s?B\.?\s?A\.?|master of business administration)(?![a-z])/i,'grad'],
 ['MPH',/\b(M\.?\s?P\.?\s?H\.?|master of public health)(?![a-z])/i,'grad'],
 ['MEng',/\b(M\.?\s?Eng\.?|master of engineering)(?![a-z])/i,'grad'],
 ['MS',/\b(M\.\s?S\.?(?![a-z])|MS(?![a-z.])|M\.Sc\.?|MSc|master of science|master['’]?s of science)/i,'grad'],
 ['MA',/\b(M\.\s?A\.?(?![a-z])|master of arts)/i,'grad'],
 ['PhD',/\b(Ph\.?\s?D\.?|doctor of philosophy)(?![a-z])/i,'grad'],
 ['JD',/\b(J\.D\.|juris doctor)(?![a-z])/i,'grad'],
 ['AS',/\b(A\.S\.(?![a-z])|associate of science|associate['’]?s degree in science)/i,'assoc'],
 ['AA',/\b(A\.A\.(?![a-z])|associate of arts|associate['’]?s degree)/i,'assoc'],
 ['High School Diploma',/\b(high school diploma|diploma|high school|secondary school|academy)\b/i,'hs']];
/* certifications: c canonical, r regex, f fields */
const CERTS=[
 {c:'Bloomberg Market Concepts (BMC)',r:/bloomberg market concepts|\bBMC\b|bloomberg (terminal )?certification|bloomberg certified/i,f:['finance']},
 {c:'Bloomberg ESG Certificate',r:/bloomberg esg/i,f:['finance']},
 {c:'SIE',r:/\bSIE\b|securities industry essentials/i,f:['finance']},
 {c:'Series 7',r:/series\s*7(?!\d)/i,f:['finance']},{c:'Series 63',r:/series\s*(?:7\s*(?:,|&|and|\/)\s*)?63\b/i,f:['finance']},
 {c:'Series 65',r:/series\s*65\b/i,f:['finance']},{c:'Series 66',r:/series\s*66\b/i,f:['finance']},{c:'Series 79',r:/series\s*79\b/i,f:['finance']},
 {c:'CFA Level I',r:/\bCFA\b[^,;|]{0,25}\b(level\s*(I|1)(?![I\d])|L1\b)/i,f:['finance']},{c:'CFA Level II',r:/\bCFA\b[^,;|]{0,25}\blevel\s*(II|2)(?![I\d])/i,f:['finance']},
 {c:'CFA Level III',r:/\bCFA\b[^,;|]{0,25}\blevel\s*(III|3)\b/i,f:['finance']},{c:'CFA',r:/\bCFA\b|chartered financial analyst/i,f:['finance']},
 {c:'CPA',r:/\bCPA\b|certified public accountant/i,f:['accounting','finance']},
 {c:'Wall Street Prep',r:/wall street prep|\bWSP\b/i,f:['finance']},{c:'Breaking Into Wall Street (BIWS)',r:/breaking into wall street|\bBIWS\b/i,f:['finance']},
 {c:'CFI FMVA',r:/\bFMVA\b|financial modeling (&|and) valuation analyst/i,f:['finance']},{c:'Training The Street',r:/training the street/i,f:['finance']},
 {c:'Microsoft Office Specialist (MOS)',r:/microsoft office specialist|\bMOS\b(?: certification| certified|:)/i,f:['business','finance','marketing']},
 {c:'Microsoft Excel Expert',r:/excel expert|MOS:? excel|microsoft certified:? excel/i,f:['business','finance']},
 {c:'AWS Certified Cloud Practitioner',r:/aws certified cloud practitioner|aws cloud practitioner/i,f:['tech','data']},
 {c:'AWS Certified Solutions Architect – Associate',r:/aws certified solutions architect|aws solutions architect/i,f:['tech']},
 {c:'AWS Certified Developer – Associate',r:/aws certified developer/i,f:['tech']},
 {c:'Microsoft Azure Fundamentals (AZ-900)',r:/az-900|azure fundamentals/i,f:['tech']},{c:'Google Cloud Associate Cloud Engineer',r:/associate cloud engineer/i,f:['tech']},
 {c:'CompTIA Security+',r:/security\s*\+|security plus/i,f:['tech']},{c:'CompTIA A+',r:/comptia a\s*\+|\bA\+ certified/i,f:['tech']},{c:'CompTIA Network+',r:/network\s*\+/i,f:['tech']},
 {c:'Google Data Analytics Certificate',r:/google data analytics/i,f:['data','tech','marketing']},{c:'Google IT Support Certificate',r:/google it support/i,f:['tech']},
 {c:'Google Project Management Certificate',r:/google project management/i,f:['business','consulting']},{c:'Google UX Design Certificate',r:/google ux design/i,f:['design','tech']},
 {c:'Google Analytics Certification',r:/google analytics (individual qualification|certification|certified|4 certification)|\bGAIQ\b|google analytics certified/i,f:['marketing','data']},
 {c:'Google Ads Certification',r:/google ads/i,f:['marketing']},{c:'HubSpot Inbound Marketing',r:/hubspot (inbound|content|email|social)?\s*marketing|hubspot certified|hubspot academy/i,f:['marketing']},
 {c:'Meta Digital Marketing Associate',r:/meta (certified )?digital marketing|facebook blueprint|meta blueprint/i,f:['marketing']},
 {c:'Salesforce Certified Administrator',r:/salesforce (certified )?admin/i,f:['tech','business']},{c:'Tableau Desktop Specialist',r:/tableau (desktop )?specialist|tableau certified/i,f:['data']},
 {c:'Microsoft Power BI Data Analyst (PL-300)',r:/pl-300|power bi data analyst/i,f:['data']},
 {c:'Six Sigma Green Belt',r:/six sigma green belt|lean six sigma green/i,f:['engineering','consulting','operations']},{c:'Six Sigma Yellow Belt',r:/six sigma yellow belt|lean six sigma yellow/i,f:['engineering','consulting','operations']},
 {c:'PMP',r:/\bPMP\b|project management professional/i,f:['business','consulting']},{c:'CAPM',r:/\bCAPM\b/i,f:['business','consulting']},
 {c:'Certified ScrumMaster (CSM)',r:/scrum ?master|\bCSM\b/i,f:['tech','business']},
 {c:'SolidWorks CSWA',r:/\bCSWA\b|certified solidworks associate/i,f:['engineering']},{c:'Autodesk Certified User',r:/autodesk certified/i,f:['engineering','design']},
 {c:'FE / EIT',r:/fundamentals of engineering|\bEIT\b|\bFE exam\b|engineer in training/i,f:['engineering']},{c:'OSHA 10',r:/osha\s*10/i,f:['engineering','operations']},{c:'OSHA 30',r:/osha\s*30/i,f:['engineering','operations']},
 {c:'BLS',r:/\bBLS\b|basic life support/i,f:['health']},{c:'CPR',r:/\bCPR\b/i,f:['health']},{c:'First Aid',r:/first aid/i,f:['health']},{c:'ACLS',r:/\bACLS\b/i,f:['health']},
 {c:'CNA',r:/\bCNA\b|certified nursing assistant/i,f:['health']},{c:'EMT',r:/\bEMT\b|emergency medical technician/i,f:['health']},{c:'Phlebotomy',r:/phlebotomy/i,f:['health']},
 {c:'CITI Human Subjects Research',r:/\bCITI\b/i,f:['health','research']},{c:'HIPAA',r:/\bHIPAA\b/i,f:['health']},{c:'ServSafe',r:/servsafe/i,f:[]},{c:'Lifeguard',r:/lifeguard certif|american red cross lifeguard/i,f:[]},
 {c:'Adobe Certified Professional',r:/adobe certified/i,f:['design','marketing']},{c:'TOEFL',r:/\bTOEFL\b/i,f:[]},{c:'IELTS',r:/\bIELTS\b/i,f:[]}];
/* hard skills: canonical -> extra spellings (canonical itself always matches) */
const SKILLS={'Excel':['microsoft excel','ms excel','advanced excel','excel (advanced)','excel modeling'],'PowerPoint':['microsoft powerpoint','ms powerpoint','power point'],'Word':['microsoft word','ms word'],
 'Microsoft Office':['ms office','microsoft office suite','office 365','microsoft 365'],'Outlook':['microsoft outlook'],'Google Workspace':['g suite','google suite','google docs','google sheets'],
 'Python':['python3'],'R':[],'SQL':['mysql','postgresql','postgres','t-sql','sql server','pl/sql','sqlite'],'Java':[],'JavaScript':['js','javascript (es6)','es6'],'TypeScript':['ts'],'C':[],'C++':['cpp'],'C#':['c sharp'],'Go':['golang'],'Rust':[],'Swift':[],'Kotlin':[],'Ruby':[],'PHP':[],'Scala':[],'MATLAB':['matlab/simulink'],'Julia':[],'Bash':['shell','shell scripting'],'HTML':['html5'],'CSS':['css3'],
 'React':['react.js','reactjs'],'Node.js':['node','nodejs'],'Angular':[],'Vue':['vue.js'],'Django':[],'Flask':[],'Spring':['spring boot'],'Express':['express.js'],'Next.js':['nextjs'],
 'Pandas':[],'NumPy':['numpy'],'scikit-learn':['sklearn','scikit learn'],'TensorFlow':[],'PyTorch':[],'Keras':[],'Spark':['apache spark','pyspark'],'Hadoop':[],'Airflow':['apache airflow'],
 'Git':['github','gitlab','git/github'],'Docker':[],'Kubernetes':['k8s'],'AWS':['amazon web services'],'Azure':['microsoft azure'],'GCP':['google cloud','google cloud platform'],'Linux':['unix'],'REST APIs':['rest','rest api','restful apis'],'GraphQL':[],'Firebase':[],'MongoDB':[],'Snowflake':[],'dbt':[],'Jira':[],'Figma':[],'Sketch':[],
 'Tableau':[],'Power BI':['powerbi','microsoft power bi'],'Looker':[],'Alteryx':[],'SAS':[],'SPSS':['ibm spss'],'Stata':[],'EViews':[],'Minitab':[],'Qualtrics':[],
 'Bloomberg Terminal':['bloomberg'],'Capital IQ':['capiq','s&p capital iq','capital iq pro'],'FactSet':[],'PitchBook':[],'Refinitiv':['refinitiv eikon','eikon','thomson reuters eikon'],'Morningstar':[],'Crunchbase':[],
 'Financial Modeling':['financial modelling','3-statement modeling','three-statement modeling','3 statement modeling'],'DCF':['discounted cash flow','dcf modeling','dcf analysis'],'LBO':['lbo modeling','leveraged buyout modeling'],'Valuation':['comparable company analysis','comps','precedent transactions'],'Accounting':['financial accounting'],'QuickBooks':[],'VBA':['excel vba','macros'],
 'Salesforce':[],'HubSpot':[],'Google Analytics':['ga4'],'Google Ads':[],'SEO':['search engine optimization'],'SEM':[],'Hootsuite':[],'Canva':[],'Mailchimp':[],'Adobe Photoshop':['photoshop'],'Adobe Illustrator':['illustrator'],'Adobe InDesign':['indesign'],'Adobe Premiere Pro':['premiere pro','premiere'],'Adobe Creative Suite':['adobe creative cloud','adobe suite'],'Final Cut Pro':[],'WordPress':[],'Shopify':[],
 'AutoCAD':[],'SolidWorks':['solid works'],'CATIA':[],'Fusion 360':['autodesk fusion 360'],'ANSYS':[],'LabVIEW':[],'Simulink':[],'Arduino':[],'Raspberry Pi':[],'PLC Programming':['plc'],'CAD':[],'3D Printing':[],'Revit':[],'SketchUp':[],'COMSOL':[],'Verilog':[],'VHDL':[],
 'Epic':['epic emr','epic systems'],'Cerner':[],'EMR':['electronic medical records','ehr','electronic health records'],'Phlebotomy':[],'Vital Signs':[],'Patient Care':[],
 'Lightroom':['adobe lightroom'],'Asana':[],'Trello':[],'Notion':[],'Slack':[],'Zoom':[],'ArcGIS':['gis'],'NVivo':[],'Westlaw':[],'LexisNexis':[],'LaTeX':[]};
const SKILLIDX=new Map();for(const c in SKILLS){SKILLIDX.set(c.toLowerCase(),c);for(const a of SKILLS[c])SKILLIDX.set(a.toLowerCase(),c)}
const LANGS=['English','Spanish','French','German','Italian','Portuguese','Mandarin','Chinese','Cantonese','Japanese','Korean','Arabic','Hindi','Urdu','Bengali','Punjabi','Russian','Ukrainian','Polish','Turkish','Hebrew','Greek','Vietnamese','Tagalog','Thai','Swahili','Farsi','Persian','Dutch','Swedish','Norwegian','Danish','Haitian Creole','American Sign Language','ASL','Gujarati','Tamil','Telugu','Marathi','Indonesian','Malay','Amharic','Somali','Yoruba','Igbo','Czech','Romanian','Hungarian','Serbian','Croatian','Albanian','Armenian','Latin'];
const LANGLVL=[['Native',/native|mother tongue|first language/i],['Bilingual',/bilingual/i],['Fluent',/fluent|fluency/i],['Professional',/professional|full professional|business/i],['Advanced',/advanced/i],['Proficient',/proficient|proficiency/i],['Intermediate',/intermediate|working/i],['Conversational',/conversational/i],['Basic',/basic|elementary|beginner|limited|novice/i]];
const SOFT=['leadership','communication','teamwork','public speaking','time management','problem solving','problem-solving','critical thinking','collaboration','adaptability','attention to detail','organization','negotiation','customer service','interpersonal skills','written communication','verbal communication','creativity','work ethic','multitasking','conflict resolution','project management','presentation skills','mentoring','relationship building','analytical thinking','decision making'];
const LEAD_VERBS=['led','lead','managed','directed','founded','co-founded','launched','spearheaded','supervised','oversaw','headed','organized','coordinated','chaired','mentored','trained','recruited','built','established','initiated','captained','elected','presided','delegated','guided','coached'];
/* experience types: label, legacy kind (for match-core), description */
const TYPES=[['Internship','Internship'],['Job','Job'],['Part-time job','Job'],['Co-op','Internship'],['Research assistant','Research'],['Teaching assistant','Job'],['Founder / own business','Job'],['Freelance','Job'],['Family business','Job'],['Student investment fund','Club'],['Case competition','Club'],['Stock pitch competition','Club'],['Club leadership','Leadership'],['Club member','Club'],['Varsity athlete','Athletics'],['Club athlete','Athletics'],['Military / ROTC','Job'],['Volunteer','Volunteer'],['Greek life','Club'],['Publication','Research'],['Hackathon','Club'],['Project','Research'],['Open source','Research'],['Service job','Job']];
const SPORTS=['baseball','softball','basketball','football','soccer','lacrosse','hockey','ice hockey','field hockey','tennis','golf','swimming','swimming and diving','swimming & diving','diving','track and field','track & field','track','cross country','cross-country','volleyball','wrestling','rowing','crew','gymnastics','fencing','water polo','rugby','squash','sailing','skiing','equestrian','bowling','cheerleading','esports','ultimate frisbee','ultimate','triathlon','beach volleyball'];
const FIELDS={finance:/financ|invest|bank|capital|equity|asset|wealth|trading|securities|fund|valuation|dcf|lbo|portfolio|credit|m&a|private equity|hedge|treasury|fp&a|accounting|audit|tax|cpa/i,
 tech:/software|engineer(?!ing (management|leadership))|developer|programming|python|java\b|javascript|react|api|cloud|aws|machine learning|data scien|backend|frontend|full[- ]stack|devops|cybersecurity|\bit\b|computer/i,
 data:/data|analytics|sql|tableau|power bi|statistic|dashboard|regression|python|r\b/i,
 consulting:/consult|strategy|client|case|market sizing|recommendation|stakeholder|operations improvement|due diligence|advisory/i,
 marketing:/marketing|brand|social media|content|campaign|seo|advertis|communications|public relations|\bpr\b|engagement|influencer|digital|email/i,
 engineering:/mechanical|electrical|civil|chemical|aerospace|industrial|manufactur|cad|solidworks|autocad|prototype|design review|matlab|circuit|structural|lab|testing/i,
 health:/patient|clinical|hospital|nurs|medical|health|care|emt|cna|clinic|pharm|vital|ehr|epic/i,
 policy:/policy|government|legislat|nonprofit|research|writing|editor|history|political|advocacy|community|education|journal/i};
const norm=s=>String(s||'').toLowerCase().replace(/&/g,' and ').replace(/[’']/g,'').replace(/[^a-z0-9+#]+/g,' ').trim();
return {SECTIONS,SECT,DEGREES,CERTS,SKILLS,SKILLIDX,LANGS,LANGLVL,SOFT,LEAD_VERBS,TYPES,SPORTS,FIELDS,norm};
});
