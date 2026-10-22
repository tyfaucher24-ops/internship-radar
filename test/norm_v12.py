"""V12 regression: classification fixes found in the Phase 2 spot check. Run: python3 -m test.norm_v12"""
import sys,os;sys.path.insert(0,os.path.join(os.path.dirname(__file__),'..'))
from pipeline.norm import category as c,intern_class as i
S='Software & IT';E='Engineering & Hardware'
cases=[(c('Water/Wastewater Engineering Intern - Summer 2027','',S),E),(c('Loads & Dynamics Engineering Intern','',S),E),
 (c('Material Science/Metallurgical Engineering Intern','',S),E),(c('Body Structures Intern'),E),(c('Machine Shop Intern'),E),
 (c('Embedded Software Engineer Intern','',S),S),(c('Software Engineer Intern, Full Stack Web','',S),S),(c('Accounting Intern'),'Accounting & Audit'),
 (i('Enterprise Internship for High School Students'),'no'),(i('High School Youth Apprentice'),'no'),(i('Software Engineering Intern'),'yes')]
bad=[(k,v) for k,v in cases if k!=v];print({'pass':len(cases)-len(bad),'fail':len(bad)},bad);sys.exit(1 if bad else 0)
