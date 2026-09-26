const vm=require('vm'); const fs=require('fs');
const ctx={}; vm.createContext(ctx); vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../src/lexicon.js'),'utf8')+';this.LEX=LEX;this.NEG_TRIGGERS=NEG_TRIGGERS;this.SCOPE_END=SCOPE_END;',ctx);
const {makeNLP}=require('../src/nlp.js'); const KB=require('../data/kb.json');
const missing=Object.keys(ctx.LEX).filter(k=>!KB.V[k]); console.log('LEX ids missing',missing);
const N=makeNLP(KB.V,ctx.LEX,ctx.NEG_TRIGGERS,ctx.SCOPE_END);
const lab=t=>KB.V[t][0]||KB.V[t][1];
const notes=[
"Adolescente de 14 ans, parents cousins germains. Depuis 6 mois : tremblement des mains, dysarthrie et changement de comportement. Transaminases élevées. Examen à la lampe à fente : anneau de Kayser-Fleischer.",
"Garçon de 11 ans, parents cousins. Démarche ataxique depuis 3 ans avec aréflexie, signe de Babinski bilatéral et dysarthrie. Titubation de la tête. Échographie cardiaque normale, pas de cardiomyopathie.",
"Weld 3ndo 9 snin, walidih wlad l3am. Ma kaysme3ch mn nhar tzad. Had l3am wella ma kaychoufch mzyan f lil. Tmecha m3ettel w kaytih bzzaf.",
"Nourrisson de 7 mois, parents cousins germains. Infections respiratoires à répétition depuis l'âge de 2 mois, diarrhée chronique, cassure de la courbe pondérale, muguet récidivant. Lymphopénie CD4.",
"Fille de 6 ans, consanguinité au 1er degré. Photosensibilité importante depuis la première année, éphélides sur les zones exposées, peau sèche, kératite avec photophobie.",
"Garçon de 12 ans. Accès fébriles récurrents de 2 à 3 jours avec douleurs abdominales épisodiques, arthrite du genou et pleurite. CRP élevée pendant les crises. Un frère présente des épisodes similaires.",
"Nouveau-né de 10 jours, parents cousins. Ambiguïté génitale à la naissance, vomissements, déshydratation. Ionogramme : hyponatrémie et hyperkaliémie.",
"Adolescent de 15 ans, parents non consanguins. Grande taille, arachnodactylie, ectopie du cristallin et dilatation de la racine aortique. Pas de surdité ni de trouble visuel nocturne."];
for(const t of notes){ const r=N.extract(t); console.log('\n'+t.slice(0,50)); console.log(' +',r.present.map(p=>lab(p.id)+'['+p.id+']').join(' | ')); console.log(' -',r.absent.map(p=>lab(p.id)).join(' | '), '| cons',r.cons,'sib',r.sib,'age',r.age&&r.age.toFixed(2),'onset',r.onset);}
console.log(N.search('surdi').map(lab)); console.log(N.search('kayser').map(lab)); console.log(N.fuzzy('Congenital sensorineural hearing impairment'), N.labelAgree('HP:0000662','Nyctalopia'));
