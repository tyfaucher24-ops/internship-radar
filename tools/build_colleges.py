"""Builds vendor/colleges.json from IPEDS HD2023 (NCES, public domain) plus a short hand-checked alias list.
Usage: python3 tools/build_colleges.py path/to/HD2023.csv
Keeps active, degree-granting 4-year and 2-year institutions. Aliases that point at more than one school are kept
as ambiguous on purpose: the parser then asks the user instead of guessing."""
import csv,json,sys,re,os
src=sys.argv[1] if len(sys.argv)>1 else 'HD2023.csv'
rows=[r for r in csv.DictReader(open(src,encoding='latin-1')) if r['ICLEVEL'] in('1','2') and r['DEGGRANT']=='1' and r['CYACTIVE']=='1']
names={r['INSTNM'] for r in rows}
# alias -> exact IPEDS INSTNM (or several, meaning ambiguous). Each target is checked against IPEDS below.
MAN={
 'MIT':['Massachusetts Institute of Technology'],'NYU':['New York University'],'UCLA':['University of California-Los Angeles'],
 'USC':['University of Southern California','University of South Carolina-Columbia'],
 'UNC':['University of North Carolina at Chapel Hill'],'UNC Chapel Hill':['University of North Carolina at Chapel Hill'],'UNC-Chapel Hill':['University of North Carolina at Chapel Hill'],
 'University of North Carolina':['University of North Carolina at Chapel Hill'],'UNC Charlotte':['University of North Carolina at Charlotte'],
 'UVA':['University of Virginia-Main Campus'],'University of Virginia':['University of Virginia-Main Campus'],
 'UMich':['University of Michigan-Ann Arbor'],'University of Michigan':['University of Michigan-Ann Arbor'],'Michigan Ross':['University of Michigan-Ann Arbor'],
 'Penn State':['Pennsylvania State University-Main Campus'],'Penn State University':['Pennsylvania State University-Main Campus'],'Pennsylvania State University':['Pennsylvania State University-Main Campus'],
 'Georgia Tech':['Georgia Institute of Technology-Main Campus'],'Georgia Institute of Technology':['Georgia Institute of Technology-Main Campus'],
 'Virginia Tech':['Virginia Polytechnic Institute and State University'],'Texas A&M':['Texas A & M University-College Station'],'Texas A&M University':['Texas A & M University-College Station'],
 'UT Austin':['The University of Texas at Austin'],'University of Texas at Austin':['The University of Texas at Austin'],'University of Texas':['The University of Texas at Austin'],
 'UC Berkeley':['University of California-Berkeley'],'Berkeley':['University of California-Berkeley'],'University of California, Berkeley':['University of California-Berkeley'],
 'CMU':['Carnegie Mellon University'],'BU':['Boston University'],'BC':['Boston College'],'GW':['George Washington University'],'GWU':['George Washington University'],
 'Penn':['University of Pennsylvania'],'UPenn':['University of Pennsylvania'],'Wharton':['University of Pennsylvania'],
 'UIUC':['University of Illinois Urbana-Champaign'],'University of Illinois':['University of Illinois Urbana-Champaign'],
 'UW-Madison':['University of Wisconsin-Madison'],'University of Wisconsin':['University of Wisconsin-Madison'],'UW':['University of Washington-Seattle Campus','University of Wisconsin-Madison'],
 'University of Washington':['University of Washington-Seattle Campus'],
 'Ohio State':['Ohio State University-Main Campus'],'Ohio State University':['Ohio State University-Main Campus'],'The Ohio State University':['Ohio State University-Main Campus'],
 'OSU':['Ohio State University-Main Campus','Oregon State University','Oklahoma State University-Main Campus'],
 'Michigan State':['Michigan State University'],'Rutgers':['Rutgers University-New Brunswick'],'Rutgers University':['Rutgers University-New Brunswick'],
 'Purdue':['Purdue University-Main Campus'],'Purdue University':['Purdue University-Main Campus'],'ASU':['Arizona State University Campus Immersion'],'Arizona State University':['Arizona State University Campus Immersion'],
 'FSU':['Florida State University'],'UF':['University of Florida'],'UGA':['University of Georgia'],'UMD':['University of Maryland-College Park'],'University of Maryland':['University of Maryland-College Park'],
 'UConn':['University of Connecticut'],'UMass Amherst':['University of Massachusetts-Amherst'],'Miami':['University of Miami','Miami University-Oxford'],'Miami University':['Miami University-Oxford'],
 'Queens':['CUNY Queens College','Queens University of Charlotte'],'Queens College':['CUNY Queens College'],'Baruch':['CUNY Bernard M Baruch College'],'Baruch College':['CUNY Bernard M Baruch College'],
 'WashU':['Washington University in St Louis'],'Washington University in St. Louis':['Washington University in St Louis'],'Pitt':['University of Pittsburgh-Pittsburgh Campus'],'University of Pittsburgh':['University of Pittsburgh-Pittsburgh Campus'],
 'CU Boulder':['University of Colorado Boulder'],'Mizzou':['University of Missouri-Columbia'],'LSU':['Louisiana State University and Agricultural & Mechanical College'],'Ole Miss':['University of Mississippi'],
 'Cal Poly':['California Polytechnic State University-San Luis Obispo','California State Polytechnic University-Pomona'],'Indiana University':['Indiana University-Bloomington'],'Kelley School of Business':['Indiana University-Bloomington'],
 'Binghamton University':['Binghamton University'],'Binghamton':['Binghamton University'],'Stony Brook University':['Stony Brook University'],'University of Minnesota':['University of Minnesota-Twin Cities'],
 'University of Southern California':['University of Southern California'],'University of South Carolina':['University of South Carolina-Columbia'],'University of Pennsylvania':['University of Pennsylvania'],
 'Columbia':['Columbia University in the City of New York'],'Columbia University':['Columbia University in the City of New York'],'University of Colorado':['University of Colorado Boulder'],
 'University of Missouri':['University of Missouri-Columbia'],'University of Alabama':['The University of Alabama'],'University of Tennessee':['The University of Tennessee-Knoxville'],
 'University of Iowa':['University of Iowa'],'Iowa State':['Iowa State University'],'UC San Diego':['University of California-San Diego'],'UCSD':['University of California-San Diego'],'UC Davis':['University of California-Davis'],
 'UC Irvine':['University of California-Irvine'],'UCSB':['University of California-Santa Barbara'],'UC Santa Barbara':['University of California-Santa Barbara'],
 'University of Arizona':['University of Arizona'],'University of Houston':['University of Houston'],'University of Cincinnati':['University of Cincinnati-Main Campus'],
 'University of Nebraska':['University of Nebraska-Lincoln'],'University of Oklahoma':['University of Oklahoma-Norman Campus'],'University of Kansas':['University of Kansas'],
 'University of Kentucky':['University of Kentucky'],'University of Utah':['University of Utah'],'University of Oregon':['University of Oregon'],'University of Delaware':['University of Delaware'],
 'Temple':['Temple University'],'Drexel':['Drexel University'],'Villanova':['Villanova University'],'Fordham':['Fordham University'],'Georgetown':['Georgetown University'],'Vanderbilt':['Vanderbilt University'],
 'Northeastern':['Northeastern University'],'Northwestern':['Northwestern University'],'Notre Dame':['University of Notre Dame'],'Duke':['Duke University'],'Emory':['Emory University'],'Rice':['Rice University'],
 'Babson':['Babson College'],'Bentley':['Bentley University'],'Lehigh':['Lehigh University'],'Bucknell':['Bucknell University'],'Syracuse':['Syracuse University'],'Tufts':['Tufts University'],'Cornell':['Cornell University'],
 'Harvard':['Harvard University'],'Yale':['Yale University'],'Princeton':['Princeton University'],'Stanford':['Stanford University'],'Brown':['Brown University'],'Dartmouth':['Dartmouth College'],
}
bad={a:[t for t in v if t not in names] for a,v in MAN.items()};bad={a:v for a,v in bad.items() if v}
if bad:print('ALIAS TARGETS NOT IN IPEDS:',bad);sys.exit(1)
out=[]
for r in sorted(rows,key=lambda r:r['INSTNM']):
    al=[a.strip() for a in re.split(r'[|;,]',r['IALIAS']) if 2<=len(a.strip())<=60] if r['IALIAS'].strip() else []
    out.append({'n':r['INSTNM'],'c':r['CITY'],'s':r['STABBR'],'a':al,'l':int(r['ICLEVEL'])})
json.dump({'_source':'IPEDS HD2023 (NCES), active degree-granting 2- and 4-year institutions; manual aliases in tools/build_colleges.py','schools':out,'aliases':MAN},
          open(os.path.join(os.path.dirname(__file__),'..','vendor','colleges.json'),'w'),separators=(',',':'))
print(len(out),'schools',len(MAN),'aliases')
