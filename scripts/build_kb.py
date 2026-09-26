import re, json, math, collections, os
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
H=str(ROOT/'data'/'hpo')+'/'
OUT=ROOT/'build'; OUT.mkdir(exist_ok=True)
# ---- parse ontology
terms={}; cur=None
for line in open(H+'hp.obo', encoding='utf8'):
    line=line.rstrip('\n')
    if line=='[Term]': cur={'parents':[], 'syn':[], 'obs':False}; continue
    if line.startswith('[') : cur=None; continue
    if cur is None: continue
    if line.startswith('id: '): cur['id']=line[4:]; terms[cur['id']]=cur
    elif line.startswith('name: '): cur['name']=line[6:]
    elif line.startswith('is_a: '): cur['parents'].append(line[6:16])
    elif line.startswith('is_obsolete: true'): cur['obs']=True
    elif line.startswith('synonym: '):
        m=re.match(r'synonym: "(.*?)" (EXACT|RELATED|NARROW|BROAD)', line)
        if m and m.group(2)=='EXACT': cur['syn'].append(m.group(1))
terms={k:v for k,v in terms.items() if not v['obs']}
print('terms', len(terms))
anc_cache={}
def anc(t):
    if t in anc_cache: return anc_cache[t]
    s={t}
    for p in terms.get(t,{}).get('parents',[]):
        if p in terms: s|=anc(p)
    anc_cache[t]=frozenset(s); return anc_cache[t]
import sys; sys.setrecursionlimit(10000)
# French labels
fr={}
for line in open(H+'hp-fr.babelon.tsv', encoding='utf8'):
    c=line.rstrip('\r\n').split('\t')
    if len(c)>7 and c[3]=='rdfs:label' and c[6]=='OFFICIAL': fr[c[0]]=c[7]
# ---- annotations
ann=collections.defaultdict(list); names={}
for line in open(H+'phenotype.hpoa', encoding='utf8'):
    if line.startswith('#') or line.startswith('database_id'): continue
    c=line.rstrip('\n').split('\t')
    if len(c)<11: continue
    names[c[0]]=c[1]
    ann[c[0]].append(dict(q=c[2],h=c[3],ref=c[4],onset=c[6],freq=c[7],aspect=c[10]))
# IC over all diseases
count=collections.Counter(); N=0
for d,lst in ann.items():
    s=set()
    for a in lst:
        if a['aspect']=='P' and a['q']!='NOT' and a['h'] in terms: s|=anc(a['h'])
    if s: N+=1; count.update(s)
print('N diseases',N)
# ---- target diseases
T=[
 ('xp','Xeroderma pigmentosum',['ORPHA:910','OMIM:278720','OMIM:278700'],['XPC','XPA'],True),
 ('wilson','Maladie de Wilson',['ORPHA:905','OMIM:277900'],['ATP7B'],True),
 ('usher1b','Syndrome de Usher type 1 (1B)',['ORPHA:231169','OMIM:276900'],['MYO7A'],True),
 ('dfnb1','Surdité récessive non syndromique (DFNB1)',['OMIM:220290'],['GJB2'],True),
 ('mhc2','Déficit immunitaire MHC classe II',['ORPHA:572','OMIM:209920'],['CIITA','RFXANK','RFX5','RFXAP'],True),
 ('scd','Drépanocytose',['ORPHA:232','OMIM:603903'],['HBB'],True),
 ('btal','Bêta-thalassémie',['ORPHA:848','OMIM:613985'],['HBB'],True),
 ('hsnsp','Neuropathie sensitive héréditaire avec paraplégie spastique',['OMIM:256840'],['CCT5'],True),
 ('pn','Poïkilodermie avec neutropénie',['OMIM:604173'],['USB1'],True),
 ('arsacs','ARSACS (ataxie spastique de Charlevoix-Saguenay)',['ORPHA:98','OMIM:270550'],['SACS'],True),
 ('fmf','Fièvre méditerranéenne familiale',['ORPHA:342','OMIM:249100'],['MEFV'],True),
 ('pku','Phénylcétonurie',['ORPHA:716','OMIM:261600'],['PAH'],True),
 ('sma','Amyotrophie spinale proximale (SMA)',['ORPHA:70','OMIM:253300'],['SMN1'],True),
 ('cah','Hyperplasie congénitale des surrénales (21-OH)',['ORPHA:90794','OMIM:201910'],['CYP21A2'],True),
 ('fanconi','Anémie de Fanconi',['ORPHA:84','OMIM:227650'],['FANCA','FANC*'],True),
 ('aved','Ataxie avec déficit isolé en vitamine E (AVED)',['ORPHA:96','OMIM:277460'],['TTPA'],False),
 ('frda','Ataxie de Friedreich',['ORPHA:95','OMIM:229300'],['FXN'],False),
 ('lgmdr5','Dystrophie des ceintures R5 (γ-sarcoglycanopathie)',['ORPHA:353','OMIM:253700'],['SGCG'],False),
 ('cf','Mucoviscidose',['ORPHA:586','OMIM:219700'],['CFTR'],False),
 ('at','Ataxie-télangiectasie',['ORPHA:100','OMIM:208900'],['ATM'],False),
]
FREQ={'HP:0040280':1.0,'HP:0040281':0.895,'HP:0040282':0.545,'HP:0040283':0.17,'HP:0040284':0.025,'HP:0040285':0.0}
def parse_freq(f):
    if not f: return None
    if f in FREQ: return FREQ[f]
    m=re.match(r'(\d+)/(\d+)$',f)
    if m and int(m.group(2))>0: return (int(m.group(1))+1)/(int(m.group(2))+2)
    m=re.match(r'([\d.]+)%$',f)
    if m: return float(m.group(1))/100
    return None
ONSET={'HP:0030674':'neo','HP:0003577':'neo','HP:0003623':'neo','HP:0034198':'neo','HP:0034197':'neo','HP:0003593':'inf','HP:0011463':'child','HP:0003621':'juv','HP:0011462':'adult','HP:0003581':'adult','HP:0003596':'adult','HP:0003584':'adult','HP:0025708':'adult','HP:0025710':'adult'}
out=[]; used=set()
for key,fname,src,genes,fromsheet in T:
    per={}; nots=set(); pm=[]; ons=set()
    for s in src:
        is_orpha=s.startswith('ORPHA')
        for a in ann.get(s,[]):
            if a['h'] not in terms: continue
            if a['aspect']=='C' and a['h'] in ONSET: ons.add(ONSET[a['h']]); continue
            if a['aspect']!='P': continue
            for r in a['ref'].split(';'):
                if r.startswith('PMID:') and r not in pm: pm.append(r)
            if a['onset'] in ONSET: ons.add(ONSET[a['onset']])
            f=parse_freq(a['freq'])
            if a['q']=='NOT' or f==0.0: nots.add(a['h']); continue
            prio = 3 if (is_orpha and f is not None) else (2 if f is not None else 1)
            if f is None: f=0.5
            old=per.get(a['h'])
            if old is None or prio>old[1] or (prio==old[1] and f>old[0]): per[a['h']]=(f,prio)
    nots-=set(per)
    ann_list=sorted([[h,round(v[0],3)] for h,v in per.items()], key=lambda x:-x[1])
    used|=set(per)|nots
    out.append(dict(id=key,name=fname,nameEN=names.get(src[0],''),src=src,genes=genes,sheet=fromsheet,onset=sorted(ons),annots=ann_list,nots=sorted(nots),pmids=pm[:8]))
    print(key, len(ann_list), 'nots',len(nots),'onset',sorted(ons),'pmids',len(pm))
json.dump(dict(out=out), open(OUT/'diseases_raw.json','w'), ensure_ascii=False)
# extra terms to guarantee in vocab (used by demo/synonyms) - filled later
extra=json.load(open(ROOT/'data'/'extra_terms.json')) if (ROOT/'data'/'extra_terms.json').exists() else []
for t in extra:
    if t in terms: used.add(t)
    else: print('MISSING extra', t)
sub=set()
for t in used: sub|=anc(t)
print('subgraph terms', len(sub))
ROOT='HP:0000118'
systems=[c for c,v in terms.items() if ROOT in v['parents']]
V={}
for t in sub:
    v=terms[t]
    ic=-math.log(max(count[t],1)/N)
    bg=max(count[t],1)/N
    sysl=[s for s in systems if s in anc(t)]
    V[t]=[fr.get(t,''), v['name'], [p for p in v['parents'] if p in sub], round(ic,3), round(bg,6), [systems.index(s) for s in sysl], v['syn'][:4]]
sysnames=[[s, fr.get(s,terms[s]['name']), terms[s]['name']] for s in systems]
json.dump(dict(V=V,systems=sysnames,N=N), open(OUT/'vocab.json','w'), ensure_ascii=False)
print('fr coverage', sum(1 for t in V if V[t][0])/len(V))
