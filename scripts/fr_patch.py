# Traductions françaises (curation Silsila) pour les termes HPO sans libellé officiel FR (babelon 2026-09)
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
FR={
"HP:6000281":"Élévation de la gamma-glutamylphénylalanine urinaire","HP:4000169":"Hyposignal T2 pontique",
"HP:0032351":"Phénylalaninurie","HP:5200321":"Désinhibition sexuelle",
"HP:0034075":"Apolipoprotéine B circulante diminuée","HP:0032359":"DEM 25-75 diminué",
"HP:0033687":"Troubles de la mémoire à court terme","HP:0033834":"Malaise",
"HP:0034275":"Nævus épidermique verruqueux","HP:0034254":"Signe de la « tête de panda » (IRM)",
"HP:0033748":"Hypoesthésie","HP:6000516":"21-désoxycortisol circulant élevé",
"HP:0034458":"Acide phénylpyruvique urinaire élevé","HP:0034280":"Hématies en cible",
"HP:6000100":"Différence de potentiel nasal transépithélial hyperpolarisée","HP:0033332":"Protéine amyloïde A sérique élevée",
"HP:6000725":"Peau au goût salé","HP:0032341":"Capacité vitale forcée diminuée",
"HP:0034336":"Infarctus splénique","HP:0002942":"Cyphose thoracique",
"HP:0032342":"VEMS diminué","HP:6000642":"Cataracte en tournesol",
"HP:0034644":"Anomalie de concentration d'un métabolite hépatique","HP:0034059":"Anomalie de la physiologie fœtale",
"HP:0033331":"Réaction de phase aiguë","HP:0034669":"Anomalie morphologique du genou",
"HP:0025780":"Anomalie de la volition","HP:0033354":"Anomalie d'un métabolite urinaire",
"HP:4000072":"Anomalie du langage","HP:5200423":"Anomalie du rapport à la réalité",
"HP:0034430":"Anomalie de la physiologie articulaire","HP:0033098":"Acide aminé non protéinogène urinaire élevé",
"HP:5201015":"Fente craniofaciale","HP:0025640":"Anomalie d'un minéral urinaire",
"HP:5210000":"Infection bactérienne inhabituelle","HP:0020129":"Anomalie de la protéinurie",
"HP:0020347":"Anomalie d'un monosaccharide circulant","HP:0025633":"Anomalie morphologique de l'uretère",
"HP:5200430":"Symptomatologie psychotique","HP:0025668":"Anomalie morphologique du cou",
"HP:0033799":"Anomalie des hormones sexuelles circulantes","HP:0034684":"Anomalie de concentration ou d'activité enzymatique",
"HP:6000531":"Anomalie d'un composé organique urinaire","HP:0032943":"Anomalie du pH urinaire",
"HP:5210003":"Infection inhabituelle à Staphylococcus aureus","HP:5210099":"Infection inhabituelle à Aspergillus",
"HP:5200263":"Volition anormalement accrue","HP:5210079":"Infection inhabituelle à Burkholderia cepacia",
"HP:0034930":"Tumeur de l'appareil digestif","HP:5210139":"Hépatite infectieuse",
"HP:5200212":"Interactions sociales exacerbées","HP:0025769":"Trouble du cours de la pensée",
"HP:0034353":"Spasticité des membres","HP:5210123":"Infection inhabituelle des voies respiratoires basses",
"HP:0020350":"Anomalie d'une vitamine circulante","HP:0025793":"Modification anormale de la libido",
"HP:0025722":"Infarctus cérébral","HP:0032368":"Acidémie",
"HP:0430106":"Potentiels évoqués cérébraux anormaux","HP:0033678":"Syndrome coronarien aigu",
"HP:0020301":"Anomalie de la physiologie du coude","HP:5200058":"Hypersensibilité sensorielle",
"HP:0032436":"Anomalie de la CRP circulante","HP:5200283":"Troubles respiratoires du sommeil",
"HP:5210121":"Infection inhabituelle des voies respiratoires hautes","HP:0033151":"Anomalie morphologique du pharynx",
"HP:5210070":"Infection inhabituelle à Haemophilus influenzae","HP:0034317":"Infection virale inhabituelle",
"HP:0033353":"Anomalie morphologique des vaisseaux","HP:5210135":"Infection génito-urinaire inhabituelle",
"HP:0034318":"Réactivation virale inhabituelle","HP:0033019":"Tumeur de l'appareil reproducteur masculin",
"HP:5210138":"Infection hépatique inhabituelle","HP:0033796":"Anomalie de la physiologie leucocytaire",
"HP:0033578":"Hypertension pulmonaire précapillaire","HP:0033747":"Anomalie de la sensibilité extéroceptive",
"HP:0020108":"Infection parasitaire inhabituelle","HP:0034398":"Déformation des orteils",
"HP:0034057":"Anomalie fœtale","HP:0034392":"Contracture articulaire",
"HP:5200046":"Anomalie du comportement sensoriel","HP:5200401":"Anomalie du jugement",
"HP:0025792":"Anomalie des processus cognitifs","HP:0034671":"Flessum du genou",
"HP:0034391":"Flessum du coude","HP:0033144":"Anomalie de la céruloplasmine circulante",
"HP:0025183":"Anomalie du nombre de lymphocytes T CD4+","HP:5200230":"Cognitions anxieuses inadaptées",
"HP:0034482":"Anomalie de la physiologie médullaire","HP:0033107":"Anomalie d'un acide aminé circulant",
"HP:5210419":"Cytopénie auto-immune","HP:5200044":"Défaut de régulation attentionnelle",
"HP:5210411":"Lymphocytes T totaux diminués","HP:0033127":"Anomalie de l'appareil locomoteur",
"HP:5210119":"Infection inhabituelle à Cryptosporidium","HP:0020119":"Anomalie de la couche des fibres nerveuses rétiniennes",
"HP:0033684":"Anomalie de répartition des types de fibres musculaires","HP:0033090":"Acides aminés aromatiques urinaires élevés",
"HP:0033401":"Ischémie tissulaire","HP:0033100":"Acides aminés urinaires élevés",
"HP:0020104":"Infection inhabituelle à protozoaire","HP:0033811":"Anomalie de l'androstènedione circulante",
"HP:5210236":"Infection fongique cutanée inhabituelle","HP:0032309":"Anomalie du nombre de granulocytes",
"HP:0033725":"Corps calleux fin","HP:0025766":"Anomalie de l'affect",
"HP:0020100":"Infection fongique inhabituelle","HP:5210001":"Infection inhabituelle à bactérie Gram positif",
"HP:0033479":"Anomalie de la bilirubine circulante","HP:0034915":"Anomalie morphologique de l'anus",
"HP:0020015":"Dépôts amyloïdes","HP:0025745":"Anomalie des acides aminés urinaires",
"HP:5200300":"Mouvements anormaux pendant le sommeil","HP:5210415":"Lymphocytes T CD4+ diminués",
"HP:5210102":"Infection inhabituelle à Candida","HP:0430071":"Anomalie d'un composé organique circulant",
"HP:0033405":"Anomalie d'un composé aminé circulant","HP:5200241":"Comportements inadaptés récurrents",
"HP:0034434":"Anomalie de la communication","HP:0020330":"Anomalie d'un anion inorganique circulant",
"HP:0033459":"Apolipoprotéines circulantes diminuées","HP:5200243":"Modification anormale du comportement social",
"HP:6001190":"Anomalie de l'expression membranaire du CMH","HP:6000852":"Mégacôlon",
"HP:0430048":"Calcifications intracrâniennes","HP:0430135":"Anomalie des transaminases",
"HP:0034033":"Cyanose périphérique","HP:5210002":"Infection inhabituelle à bactérie Gram négatif",
}
p=ROOT/'data'/'kb.json'; kb=json.load(open(p,encoding='utf-8'))
n=0
for t,l in FR.items():
    if t in kb['V'] and not kb['V'][t][0]: kb['V'][t][0]=l; n+=1
# Corrections typographiques de libellés officiels
for t,l in {'HP:0200032':'Anneau de Kayser-Fleischer'}.items():
    if t in kb['V']: kb['V'][t][0]=l
left=[t for t,v in kb['V'].items() if not v[0]]
# AVED : lipid/xanthoma annotations come without frequency (default 0.5); rare in AVED -> curated 0.1
LIP={'HP:0002155','HP:0003124','HP:0003141','HP:0010874','HP:0001114'}
for d in kb['D']:
    if d['id']=='aved':
        d['annots']=[[t,(0.1 if t in LIP else f)]+x for t,f,*x in d['annots']]
        d['curated']=sorted(set(d.get('curated',[]))|{t for t,*_ in d['annots'] if t in LIP})
json.dump(kb,open(p,'w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
print('patched',n,'left',left)
