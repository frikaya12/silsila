import json, re, os
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
raw=json.load(open(ROOT/'build'/'diseases_raw.json'))['out']; voc=json.load(open(ROOT/'build'/'vocab.json'))
def _ver(f,pat,default):
    try:
        with open(ROOT/'data'/'hpo'/f,encoding='utf8') as fh:
            for i,l in enumerate(fh):
                m=re.search(pat,l)
                if m: return m.group(1)
                if i>40: break
    except FileNotFoundError: pass
    return default
HPO_V=_ver('hp.obo',r'data-version: hp/releases/(\S+)','2026-09-01'); HPOA_V=_ver('phenotype.hpoa',r'#version: (\S+)','2026-09-02')
V=voc['V']
# --- cosmetic fixes of official FR labels
FIX={'Tâches':'Taches','Epilépsie':'Crises épileptiques','Hèrpes':'Herpès','Pauvre appétît':'Appétit diminué','Immmunodéficience':'Immunodéficience',
 'Larche':'Marche','fungiques':'fongiques','Têtée':'Tétée','membes':'membres','progresive':'progressive','Cryptospridium':'Cryptosporidium',
 'Anomalie  dentaires':'Anomalies dentaires','Insuffisance hepatique':'Insuffisance hépatique','Hypoxémia':'Hypoxémie','dûes':'dues','dûe':'due','  ':' '}
for t,v in V.items():
    l=v[0]
    for a,b in FIX.items(): l=l.replace(a,b)
    l=l.strip()
    if l: l=l[0].upper()+l[1:]
    v[0]=l
C={
'xp':dict(onset=['inf','child'],prevM=5,prevG=0.4,treat='Prévention',urgent=False,
  maghreb="Fréquent au Maghreb ; série de 86 patients XP marocains. Mutation fondatrice XPC majoritaire en Afrique du Nord.",
  variants=[['XPC','c.1643_1644delTG (p.Val548Alafs*25)','Fondatrice nord-africaine (Soufir et al., 2010)']],
  tests=['Examen dermatologique et ophtalmologique complet','Test de réparation de l\'ADN (UDS) sur fibroblastes','Recherche ciblée XPC c.1643_1644delTG puis séquençage XPC/XPA'],
  care='Photoprotection stricte et précoce, dépistage dermatologique des cancers cutanés.'),
'wilson':dict(onset=['child','juv','adult'],prevM=3.88,prevG=3,treat='Traitable',urgent=True,
  maghreb="226 patients étudiés au CHU de Marrakech ; prévalence 3,88/100 000 ; consanguinité dans 63,3 % des cas.",
  variants=[['ATP7B','Spectre hétérogène au Maroc','Séquençage complet ATP7B recommandé']],
  tests=['Céruloplasmine sérique','Cuivre urinaire des 24 h','Examen à la lampe à fente (anneau de Kayser-Fleischer)','Bilan hépatique, IRM cérébrale','Séquençage ATP7B (score de Leipzig)'],
  care='Chélateurs (D-pénicillamine, trientine) ou zinc. Retard diagnostique = atteinte hépatique et neurologique irréversible.',
  add={'HP:0000708':0.3}),
'usher1b':dict(onset=['neo','child'],prevM=1.5,prevG=1,treat='Symptomatique',urgent=False,
  maghreb="Famille consanguine marocaine étudiée ; mutation MYO7A p.Tyr1719Cys identifiée.",
  variants=[['MYO7A','p.Tyr1719Cys','Rapportée dans une famille consanguine marocaine']],
  tests=['Audiométrie / PEA','Électrorétinogramme et fond d\'œil','Épreuves vestibulaires','Panel Usher (MYO7A en priorité)'],
  care='Implant cochléaire précoce avant la perte visuelle, conseil génétique.',
  add={'HP:0008527':0.9,'HP:0008555':0.85,'HP:0001270':0.8}),
'dfnb1':dict(onset=['neo'],prevM=25,prevG=20,treat='Symptomatique',urgent=False,
  maghreb="Surdités récessives fréquentes au Maghreb ; plus de 70 % des variants sont spécifiques à la population. GJB2 c.35delG est le variant le plus fréquent au Maroc.",
  variants=[['GJB2','c.35delG','Le plus fréquent au Maroc'],['Autres loci DFNB','Hétérogène','Panel surdité si GJB2 négatif']],
  tests=['Audiométrie / PEA','Recherche GJB2 c.35delG puis séquençage GJB2','Panel surdités si négatif'],
  care='Appareillage ou implant cochléaire précoce ; prise en charge orthophonique.',
  add={'HP:0008527':0.9,'HP:0000407':0.97}),
'mhc2':dict(onset=['inf'],prevM=0.5,prevG=0.1,treat='Traitable',urgent=True,
  maghreb="Mutations fondatrices RFXANK fréquentes en Afrique du Nord ; cas CIITA rapporté au Maroc.",
  variants=[['RFXANK','c.338-25_338del26 (dite 752delG26)','Fondatrice nord-africaine'],['CIITA','Variants privés','Cas marocain rapporté']],
  tests=['Immunophénotypage : expression HLA-DR sur lymphocytes B et monocytes','Numération CD4, dosage des immunoglobulines','Séquençage CIITA / RFXANK / RFX5 / RFXAP'],
  care='Greffe de cellules souches hématopoïétiques : pronostic lié à la précocité.'),
'scd':dict(onset=['inf','child'],prevM=10,prevG=10,treat='Traitable',urgent=False,
  maghreb="Prévalence rapportée 0,8 à 3,5 % dans les pays du Maghreb (porteurs), plus élevée dans certaines régions.",
  variants=[['HBB','c.20A>T (HbS, p.Glu7Val)','Allèle drépanocytaire']],
  tests=['NFS, réticulocytes, frottis','Électrophorèse de l\'hémoglobine','Étude moléculaire HBB si besoin'],
  care='Hydroxyurée, prévention infectieuse, transfusions ; greffe dans certains cas.',
  add={'HP:0002653':0.7}),
'btal':dict(onset=['inf'],prevM=10,prevG=2,treat='Traitable',urgent=False,
  maghreb="Porteurs 1,5 à 3 % au Maghreb ; codon 39 et codon 8 fréquents au Maroc.",
  variants=[['HBB','c.118C>T (codon 39)','Fréquente au Maroc'],['HBB','c.25_26delAA (codon 8)','Fréquente au Maroc'],['HBB','c.93-21G>A (IVS-I-110)','Méditerranéenne']],
  tests=['NFS (microcytose, hypochromie)','Électrophorèse de l\'Hb (HbF, HbA2)','Bilan martial (éliminer une carence)','Étude moléculaire HBB'],
  care='Transfusions, chélation du fer ; greffe de CSH.'),
'hsnsp':dict(onset=['child','juv'],prevM=0.05,prevG=0.01,treat='Symptomatique',urgent=False,
  maghreb="Famille consanguine marocaine, 4 hommes atteints. La fiche projet indique « gène non identifié » : OMIM/HPO relient ce phénotype à CCT5 (Bouhouche et al., 2006) — à confirmer.",
  variants=[['CCT5','p.His147Arg','Famille marocaine (Bouhouche et al., 2006)']],
  tests=['ENMG (neuropathie sensitive axonale)','IRM médullaire','Séquençage CCT5 ou panel neuropathies héréditaires'],
  care='Prévention des ulcérations et ostéites, kinésithérapie.'),
'pn':dict(onset=['inf'],prevM=0.1,prevG=0.05,treat='Symptomatique',urgent=False,
  maghreb="4 cas rapportés au Maroc. Diagnostic différentiel : syndrome de Rothmund-Thomson.",
  variants=[['USB1','Variants privés','Séquençage complet']],
  tests=['NFS répétées (neutropénie)','Biopsie cutanée','Séquençage USB1 (différentiel RECQL4)'],
  care='Prise en charge des infections, surveillance hématologique (risque de myélodysplasie).'),
'arsacs':dict(onset=['child'],prevM=0.5,prevG=0.2,treat='Symptomatique',urgent=False,
  maghreb="Cas rapporté au Maroc dans une famille consanguine.",
  variants=[['SACS','Variants privés','Séquençage complet (grand gène)']],
  tests=['IRM : atrophie du vermis supérieur, hypointensités pontiques linéaires','OCT rétinien (épaississement des fibres nerveuses)','ENMG','Séquençage SACS'],
  care='Rééducation, prise en charge de la spasticité.'),
'fmf':dict(onset=['child','juv','adult'],prevM=10,prevG=1,treat='Traitable',urgent=False,
  maghreb="Fréquente dans les populations méditerranéennes et nord-africaines ; prévalence marocaine à confirmer.",
  variants=[['MEFV','p.Met694Ile','Fréquent au Maghreb'],['MEFV','p.Met694Val, p.Val726Ala, p.Met680Ile','Méditerranéens']],
  tests=['CRP et SAA pendant et hors crise','Séquençage MEFV (exon 10 en priorité)','Protéinurie (dépistage amylose)'],
  care='Colchicine au long cours : prévient les crises et l\'amylose AA.'),
'pku':dict(onset=['neo','inf'],prevM=7,prevG=8,treat='Traitable',urgent=True,
  maghreb="Dépistage néonatal incomplet dans certaines régions : des diagnostics tardifs persistent.",
  variants=[['PAH','Spectre à caractériser','Séquençage PAH']],
  tests=['Phénylalanine plasmatique','Test de charge BH4 (éliminer un déficit en ptérines)','Séquençage PAH'],
  care='Régime pauvre en phénylalanine dès les premières semaines ; sapropterine si répondeur.'),
'sma':dict(onset=['neo','inf','child'],prevM=10,prevG=10,treat='Traitable',urgent=True,
  maghreb="Maladie récessive fréquente ; prévalence spécifique au Maghreb à confirmer.",
  variants=[['SMN1','Délétion homozygote exon 7','≈ 95 % des cas'],['SMN2','Nombre de copies','Modificateur de sévérité']],
  tests=['Recherche de délétion SMN1 exon 7 (MLPA / qPCR)','Nombre de copies SMN2','ENMG, CPK'],
  care='Nusinersen, risdiplam, onasemnogene : bénéfice maximal si traitement précoce.'),
'cah':dict(onset=['neo'],prevM=7,prevG=7,treat='Traitable',urgent=True,
  maghreb="Prévalence spécifique au Maghreb à confirmer ; consanguinité fréquente dans les séries.",
  variants=[['CYP21A2','c.293-13A/C>G, p.Ile173Asn, p.Val282Leu','Variants classiques'],['CYP21A2','Délétions / conversions','Fréquentes']],
  tests=['17-hydroxyprogestérone','Ionogramme (Na, K), rénine','Caryotype si ambiguïté génitale','Séquençage CYP21A2'],
  care='Urgence vitale néonatale (crise de perte de sel) : hydrocortisone, fludrocortisone, sel.',
  add={'HP:0000062':0.45}),
'fanconi':dict(onset=['child','juv'],prevM=2,prevG=0.3,treat='Traitable',urgent=False,
  maghreb="Mutations fondatrices rapportées dans certaines populations nord-africaines.",
  variants=[['FANCA','Majoritaire','Panel FANC complet']],
  tests=['NFS, myélogramme','Test de cassures chromosomiques (DEB / MMC) : examen de référence','Panel gènes FANC'],
  care='Greffe de CSH, surveillance des cancers (ORL, gynécologiques).',
  add={'HP:0001915':0.8,'HP:0001876':0.7}),
'aved':dict(onset=['child','juv'],prevM=1,prevG=0.1,treat='Traitable',urgent=True,
  maghreb="Ajout proposé : forme d'ataxie récessive fréquente en Afrique du Nord, mutation fondatrice TTPA. Mime une ataxie de Friedreich mais se traite.",
  variants=[['TTPA','c.744delA','Fondatrice nord-africaine']],
  tests=['Vitamine E (α-tocophérol) sérique — effondrée','Bilan lipidique (éliminer une malabsorption)','Recherche TTPA c.744delA'],
  care='Vitamine E à forte dose : stabilise voire améliore l\'atteinte neurologique.'),
'frda':dict(onset=['child','juv'],prevM=2,prevG=2.5,treat='Symptomatique',urgent=False,
  maghreb="Ajout proposé : ataxie héréditaire la plus fréquente au Maghreb comme en Europe. Toujours éliminer une AVED.",
  variants=[['FXN','Expansion GAA intron 1 homozygote','≈ 96 % des cas']],
  tests=['Recherche d\'expansion GAA FXN','Échocardiographie et ECG (cardiomyopathie)','Glycémie','Vitamine E (éliminer AVED)'],
  care='Omaveloxolone (≥ 16 ans selon AMM), suivi cardiaque.',
  add={'HP:0001639':0.6}),
'lgmdr5':dict(onset=['child','juv'],prevM=1.5,prevG=0.5,treat='Symptomatique',urgent=False,
  maghreb="Ajout proposé : sarcoglycanopathie la plus fréquente au Maghreb, mutation fondatrice SGCG.",
  variants=[['SGCG','c.525delT (ancienne nomenclature 521ΔT)','Fondatrice maghrébine']],
  tests=['CPK (très élevées)','IRM musculaire','Biopsie musculaire (sarcoglycanes)','Recherche SGCG c.525delT'],
  care='Kinésithérapie, surveillance cardiaque et respiratoire.'),
'cf':dict(onset=['neo','inf'],prevM=4,prevG=12,treat='Traitable',urgent=False,
  maghreb="Ajout proposé : moins fréquente qu'en Europe, spectre CFTR maghrébin plus hétérogène (F508del moins dominant).",
  variants=[['CFTR','c.1521_1523delCTT (F508del)','Majoritaire mais non exclusif'],['CFTR','Spectre hétérogène','Séquençage complet recommandé']],
  tests=['Test de la sueur (chlorures)','Élastase fécale','Séquençage CFTR'],
  care='Prise en charge multidisciplinaire ; modulateurs CFTR selon le génotype.'),
'at':dict(onset=['inf','child'],prevM=1.5,prevG=0.5,treat='Symptomatique',urgent=False,
  maghreb="Ajout proposé : fréquente dans les familles consanguines maghrébines ; diagnostic différentiel des déficits immunitaires avec ataxie.",
  variants=[['ATM','Variants privés','Séquençage ATM']],
  tests=['Alpha-fœtoprotéine (élevée)','Immunoglobulines, lymphocytes','Caryotype (translocations 7;14)','Séquençage ATM'],
  care='Éviter les radiations ionisantes ; prise en charge immunologique et neurologique.'),
}
for d in raw:
    c=C[d['id']]; d.update({k:v for k,v in c.items() if k!='add'})
    am={h:f for h,f in d['annots']}
    for h,f in c.get('add',{}).items():
        assert h in V, h
        am[h]=f; d.setdefault('curated',[]).append(h)
    d['annots']=sorted([[h,f] for h,f in am.items()], key=lambda x:-x[1])
    d['pmids']=[p.replace('PMID:','') for p in d['pmids']]
json.dump(dict(V=V,systems=voc['systems'],N=voc['N'],D=raw,hpo=HPO_V,hpoa=HPOA_V), open(ROOT/'data'/'kb.json','w',encoding='utf-8'), ensure_ascii=False, separators=(',',':'))
print('data/kb.json', os.path.getsize(ROOT/'data'/'kb.json'), 'octets')
