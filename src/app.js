// ===================== Silsila app =====================
const V=KB.V, D=KB.D, SYS=KB.systems;
const IN_CLAUDE=!!(window.claude&&typeof window.claude.use==='function');
const E=makeEngine(KB);
const NLP=makeNLP(V,LEX,NEG_TRIGGERS,SCOPE_END);
const DB=Object.fromEntries(D.map(d=>[d.id,d]));
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lab=t=>V[t]?(V[t][0]||V[t][1]):t;
const labEN=t=>V[t]?V[t][1]:'';
const SYS_COL=['#4035C4','#147657','#B8372F','#B87D06','#2E7FB8','#8B3FA8','#3E8E8E','#C0588A','#6B7A1F','#5E5E9A','#A2582A','#1F6F9E'];
const sysColor=t=>{const s=V[t]&&V[t][5]&&V[t][5][0]; return s==null?'var(--ink3)':SYS_COL[s%SYS_COL.length];};
const sysName=t=>{const s=V[t]&&V[t][5]&&V[t][5][0]; return s==null?'':(SYS[s][1]||SYS[s][2]);};
const pct=p=>p>=0.995?'> 99 %':p<0.001?'< 0,1 %':(p*100).toLocaleString('fr-FR',{maximumFractionDigits:p<0.1?1:0})+' %';
const fr=n=>n.toLocaleString('fr-FR');
const ONS_L={neo:'néonatal',inf:'nourrisson',child:'1–5 ans',juv:'5–15 ans',adult:'adulte'};
const MATCH={exact:'Correspondance exacte',broader:'Signe plus général que l’annotation',narrower:'Signe plus précis que l’annotation',partial:'Signe proche',none:'Non expliqué par la maladie',not:'Exclu par la maladie',excluded:'Absent chez le patient'};
function toast(m){const t=$('#toast'); t.textContent=m; t.classList.add('on'); clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.remove('on'),2600);}

const S={obs:[],exc:[],onset:null,cons:'unk',sib:false,mode:'maghreb',unmapped:[],open:null,res:null,evidence:{}};
let sample=null, downloads=null;

// ---------- demos ----------
const DEMOS=[
 {k:'Tremblements et foie',note:"Adolescente de 14 ans, parents cousins germains. Depuis 6 mois : tremblement des mains, dysarthrie et changement de comportement. Transaminases élevées. Examen à la lampe à fente : anneau de Kayser-Fleischer."},
 {k:'Ataxie à 11 ans',note:"Garçon de 11 ans, parents cousins. Démarche ataxique depuis 3 ans avec aréflexie, signe de Babinski bilatéral et dysarthrie. Titubation de la tête. Échographie cardiaque normale, pas de cardiomyopathie."},
 {k:'Darija : n’entend pas, voit mal la nuit',note:"Weld 3ndo 9 snin, walidih wlad l3am. Ma kaysme3ch mn nhar tzad. Had l3am wella ma kaychoufch mzyan f lil. Tmecha m3ettel w kaytih bzzaf."},
 {k:'Nourrisson infecté',note:"Nourrisson de 7 mois, parents cousins germains. Infections respiratoires à répétition depuis l'âge de 2 mois, diarrhée chronique, cassure de la courbe pondérale, muguet récidivant. Lymphopénie CD4."},
 {k:'Photosensibilité',note:"Fille de 6 ans, consanguinité au 1er degré. Photosensibilité importante depuis la première année, éphélides sur les zones exposées, peau sèche, kératite avec photophobie."},
 {k:'Fièvres périodiques',note:"Garçon de 12 ans. Accès fébriles récurrents de 2 à 3 jours avec douleurs abdominales épisodiques, arthrite du genou et pleurite. CRP élevée pendant les crises. Un frère présente des épisodes similaires."},
 {k:'Nouveau-né, ambiguïté',note:"Nouveau-né de 10 jours, parents cousins. Ambiguïté génitale à la naissance, vomissements, déshydratation. Ionogramme : hyponatrémie et hyperkaliémie."},
 {k:'Hors base (contrôle)',note:"Adolescent de 15 ans, parents non consanguins. Grande taille, arachnodactylie, ectopie du cristallin et dilatation de la racine aortique."}
];
$('#demos').innerHTML=DEMOS.map((d,i)=>`<button data-i="${i}">${esc(d.k)}</button>`).join('');
$('#demos').addEventListener('click',e=>{const b=e.target.closest('button'); if(!b) return; const d=DEMOS[+b.dataset.i]; clearCase(); $('#note').value=d.note; runLocal(); if(innerWidth<1080) $('#results').scrollIntoView({behavior:'smooth'});});

// ---------- term management ----------
function addObs(id,silent){
  if(!V[id]) return false;
  S.exc=S.exc.filter(x=>x!==id);
  if(S.obs.includes(id)) return false;
  if(S.obs.some(o=>E.anc(o).has(id))){ if(!silent) toast('Un signe plus précis est déjà présent'); return false; }
  S.obs=S.obs.filter(o=>!E.anc(id).has(o)); S.obs.push(id); return true;
}
function addExc(id){ if(!V[id]) return false; S.obs=S.obs.filter(x=>x!==id); if(!S.exc.includes(id)) S.exc.push(id); return true; }
function removeTerm(id){ S.obs=S.obs.filter(x=>x!==id); S.exc=S.exc.filter(x=>x!==id); }
function clearCase(){ Object.assign(S,{obs:[],exc:[],onset:null,cons:'unk',sib:false,unmapped:[],open:null,evidence:{}}); $('#note').value=''; $('#nlpStatus').textContent=''; $('#aiBox')&&($('#aiBox').innerHTML=''); syncCtx(); update(); }
function syncCtx(){
  $$('#onsetSeg button').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.v||null)===S.onset)));
  $$('#consSeg button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===S.cons)));
  $('#sib').checked=S.sib;
}
$('#onsetSeg').addEventListener('click',e=>{const b=e.target.closest('button'); if(!b) return; S.onset=b.dataset.v||null; syncCtx(); update();});
$('#consSeg').addEventListener('click',e=>{const b=e.target.closest('button'); if(!b) return; S.cons=b.dataset.v; syncCtx(); update();});
$('#sib').addEventListener('change',e=>{S.sib=e.target.checked; update();});
$('#bReset').onclick=clearCase;
$$('.calib .seg button').forEach(b=>b.onclick=()=>{S.mode=b.dataset.mode; $$('.calib .seg button').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); update(); if(cur==='kb') renderKB(); toast(S.mode==='maghreb'?'Prévalences et consanguinité calibrées Maghreb':'Prévalences mondiales (sans calibration régionale)');});

function chipHTML(id,kind){
  const ev=S.evidence[id];
  return `<span class="chip ${kind==='exc'?'exc':''}" title="${esc(id+' — '+labEN(id)+(ev?'\nDans la note : « '+ev+' »':''))}"><span class="dot" style="background:${sysColor(id)}"></span><span class="t">${esc(lab(id))}</span>`+
   `<button aria-label="${kind==='exc'?'Marquer présent':'Marquer absent'}" data-flip="${id}" title="${kind==='exc'?'Marquer présent':'Marquer absent'}">${kind==='exc'?'↺':'⊘'}</button><button aria-label="Retirer" data-rm="${id}">×</button></span>`;
}
function renderChips(){
  $('#obsChips').innerHTML=S.obs.length?S.obs.map(id=>chipHTML(id,'obs')).join('')+S.unmapped.map(u=>`<span class="chip unm" title="Terme proposé par Claude hors du vocabulaire de la base : non utilisé dans le score"><span class="t">${esc(u)}</span></span>`).join(''):'<span class="empty">Aucun signe pour l’instant</span>';
  $('#excChips').innerHTML=S.exc.length?S.exc.map(id=>chipHTML(id,'exc')).join(''):'<span class="empty">Aucun</span>';
}
['#obsChips','#excChips'].forEach(sel=>$(sel).addEventListener('click',e=>{
  const rm=e.target.closest('[data-rm]'), fl=e.target.closest('[data-flip]');
  if(rm){removeTerm(rm.dataset.rm); update();}
  else if(fl){const id=fl.dataset.flip; if(S.exc.includes(id)) addObs(id); else addExc(id); update();}
}));

// ---------- autocomplete ----------
const q=$('#q'), ac=$('#ac'); let acItems=[], acSel=0;
function renderAC(){
  if(!acItems.length){ac.classList.remove('on'); ac.innerHTML=''; return;}
  ac.innerHTML=acItems.map((id,i)=>`<div class="it ${i===acSel?'act':''}" role="option" aria-selected="${i===acSel}" data-id="${id}"><div><div class="nm"><span class="dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${sysColor(id)};margin-right:6px"></span>${esc(lab(id))}</div><div class="en">${esc(labEN(id))} · ${id}</div></div><div class="row"><button class="btn sm" data-add="obs">Présent</button><button class="btn sm ghost" data-add="exc">Absent</button></div></div>`).join('');
  ac.classList.add('on');
}
q.addEventListener('input',()=>{acItems=NLP.search(q.value,10); acSel=0; renderAC();});
q.addEventListener('keydown',e=>{
  if(!acItems.length) return;
  if(e.key==='ArrowDown'){acSel=(acSel+1)%acItems.length; renderAC(); e.preventDefault();}
  else if(e.key==='ArrowUp'){acSel=(acSel-1+acItems.length)%acItems.length; renderAC(); e.preventDefault();}
  else if(e.key==='Enter'){ const id=acItems[acSel]; e.shiftKey?addExc(id):addObs(id); q.value=''; acItems=[]; renderAC(); update(); e.preventDefault();}
  else if(e.key==='Escape'){acItems=[]; renderAC();}
});
ac.addEventListener('mousedown',e=>{ const b=e.target.closest('[data-add]'), it=e.target.closest('.it'); if(!it) return; e.preventDefault(); const id=it.dataset.id; (b&&b.dataset.add==='exc')?addExc(id):addObs(id); q.value=''; acItems=[]; renderAC(); update(); q.focus();});
q.addEventListener('blur',()=>setTimeout(()=>{acItems=[]; renderAC();},150));

// ---------- local extraction ----------
function runLocal(){
  const text=$('#note').value.trim(); if(!text){ $('#nlpStatus').textContent='Saisissez ou collez une observation.'; return; }
  const r=NLP.extract(text); let n=0;
  r.present.forEach(p=>{ if(addObs(p.id,true)) n++; S.evidence[p.id]=p.snippet; });
  r.absent.forEach(p=>{ addExc(p.id); S.evidence[p.id]=p.snippet; });
  if(r.cons!=='unk') S.cons=r.cons; if(r.sib) S.sib=true; if(r.onset) S.onset=r.onset;
  syncCtx(); update();
  const bits=[`${r.present.length} signe${r.present.length>1?'s':''} présent${r.present.length>1?'s':''}`];
  if(r.absent.length) bits.push(`${r.absent.length} négation${r.absent.length>1?'s':''}`);
  if(r.cons!=='unk') bits.push(r.cons==='yes'?'consanguinité notée':'non consanguin');
  if(r.onset) bits.push('début '+ONS_L[r.onset]+(r.onsetFromAge?' (estimé depuis l’âge)':''));
  $('#nlpStatus').textContent='Extraction locale : '+bits.join(', ')+'. Vérifiez et corrigez les puces.';
}
$('#bExtract').onclick=runLocal;

// ---------- update / results ----------
function update(){ const res=E.score(S); S.res=res; renderChips(); renderResults(res); $('#bExport').hidden=!(canExport()&&S.obs.length); if(cur==='graph') renderGraph(); }
function allRanked(res){ return [...res.rows,res.other].sort((a,b)=>b.post-a.post); }
function nm(r){ return r.other?'Hors base (autre maladie)':r.d.name; }

function stripSVG(r,scale){
  const W=300,H=22,z=W*0.26,k=(W-z-4)/scale, kn=(z-4)/scale;
  if(r.other) return `<svg class="strip" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><line x1="${z}" x2="${z}" y1="2" y2="${H-2}" stroke="var(--line2)"/><rect x="${z+1}" y="8" width="${Math.max(2,(W-z)*0.12)}" height="6" rx="2" fill="var(--other)" opacity=".5"/></svg>`;
  const tau=E.P.tau; let xp=z+1, xn=z-1, out='';
  const segs=[...r.ev.map(e=>({v:tau*e.l,t:e.type,q:e.q,kind:e.kind})),...r.mods.map(m=>({v:m.l,t:'mod',name:m.name}))];
  segs.sort((a,b)=>Math.abs(b.v)-Math.abs(a.v));
  for(const s of segs){
    if(Math.abs(s.v)<0.005) continue;
    const col=s.t==='mod'?'var(--mod)':(s.v>0?'var(--for)':'var(--against)');
    const op=s.t==='exact'?1:s.t==='partial'?0.45:s.t==='mod'?0.9:0.75;
    const tt=esc((s.t==='mod'?s.name:lab(s.q))+' : '+(s.v>0?'+':'')+s.v.toFixed(2)+' log');
    if(s.v>0){ const w=Math.min(W-1-xp,Math.max(1.5,s.v*k-1.2)); if(w<1) continue; out+=`<rect x="${xp}" y="5" width="${w}" height="12" rx="2" fill="${col}" opacity="${op}"><title>${tt}</title></rect>`; xp+=w+1.2; }
    else { const w=Math.min(xn-2,Math.max(1.5,-s.v*kn-1.2)); if(w<1) continue; xn-=w; out+=`<rect x="${xn}" y="5" width="${w}" height="12" rx="2" fill="${col}" opacity="${op}"><title>${tt}</title></rect>`; xn-=1.2; }
  }
  return `<svg class="strip" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><line x1="${z}" x2="${z}" y1="1" y2="${H-1}" stroke="var(--line2)" stroke-width="1.2"/>${out}</svg>`;
}

function ledgerHTML(r){
  if(r.other) return `<div class="ledger"><p class="hint" style="margin:6px 0">Classe « monde ouvert » : représente toutes les maladies rares absentes de la base (prévalence cumulée ≈ ${E.P.otherRatio}× celle des 20 maladies). Chaque signe y a un rapport de vraisemblance de 1. Elle gagne quand aucun modèle de la base n’explique mieux le tableau qu’une maladie quelconque.</p></div>`;
  const d=r.d, tau=E.P.tau;
  const rows=r.ev.map(e=>{
    const how=e.type==='partial'?`Signe proche (ancêtre commun : ${esc(lab(e.a))})`:e.type==='broader'||e.type==='narrower'?`${MATCH[e.type]} « ${esc(lab(e.h))} »`:MATCH[e.type];
    const f=e.f!=null?`<span class="fbar"><i style="width:${Math.round(e.f*100)}%"></i></span>${Math.round(e.f*100)} %`:'—';
    return `<tr><td>${e.kind==='exc'?'<s>'+esc(lab(e.q))+'</s>':esc(lab(e.q))}</td><td>${how}</td><td class="num">${f}</td><td class="num">${e.lr>=10?fr(Math.round(e.lr)):e.lr.toFixed(2)}</td><td class="num ${e.l>0?'pos':'neg'}">${(tau*e.l>0?'+':'')+(tau*e.l).toFixed(2)}</td></tr>`;}).join('');
  const mods=r.mods.map(m=>`<tr><td>${esc(m.name)}</td><td>Modèle ${m.name.includes('onsan')?'de génétique des populations (récessif, F = 1/32)':m.name.includes('Âge')?'d’âge de début (annotations HPO)':'familial'}</td><td class="num">—</td><td class="num">${Math.pow(10,m.l).toFixed(2)}</td><td class="num ${m.l>0?'pos':'neg'}">${(m.l>0?'+':'')+m.l.toFixed(2)}</td></tr>`).join('');
  return `<div class="ledger"><div class="tbl"><table><thead><tr><th>Signe</th><th>Correspondance dans HPO</th><th>Fréquence dans la maladie</th><th>Rapport de vraisemblance</th><th>Poids (log₁₀)</th></tr></thead><tbody>${rows}${mods}<tr><td>A priori</td><td>Prévalence estimée ${S.mode==='maghreb'?'Maghreb':'mondiale'} : ${fr(S.mode==='maghreb'?d.prevM:d.prevG)} / 100 000</td><td></td><td></td><td class="num">${Math.log10(r.prior).toFixed(2)}</td></tr></tbody></table></div>
  <div class="row" style="margin-top:8px"><button class="btn sm" data-sheet="${d.id}">Ouvrir la fiche maladie</button><span class="hint" style="margin:0">Poids des signes pondérés par τ = ${tau} pour corriger leur corrélation.</span></div></div>`;
}

function renderResults(res){
  const el=$('#results');
  if(!S.obs.length){
    el.innerHTML=`<div class="panel intro"><h1>Du tableau clinique à la maladie fondatrice, avec les preuves.</h1>
    <p>Silsila classe ${D.length} maladies génétiques récessives documentées au Maghreb à partir des signes observés et des signes absents. Chaque point du score renvoie à une annotation HPO sourcée, à la consanguinité et à l’âge de début : rien n’est une boîte noire.</p>
    <p>Chargez un cas d’exemple à gauche, ou décrivez un patient.</p>
    <div class="how"><div><b>Signes normalisés</b>Extraction locale en français et en darija, ou par Claude pour les notes complexes. Chaque signe devient un terme HPO.</div>
    <div><b>Score probabiliste</b>Rapports de vraisemblance calculés sur ${fr(KB.N)} maladies de référence, a priori calibrés Maghreb et classe « hors base » pour rester honnête.</div>
    <div><b>Décision</b>Questions les plus discriminantes, examens de confirmation dans l’ordre et variants fondateurs à tester en premier.</div></div></div>`;
    return;
  }
  const all=allRanked(res); const top=all[0];
  const shown=all.slice(0,8); if(!shown.includes(res.other)) shown.push(res.other);
  const scale=Math.max(1,...shown.filter(r=>!r.other).map(r=>E.P.tau*r.ev.filter(e=>e.l>0).reduce((s,e)=>s+e.l,0)+r.mods.filter(m=>m.l>0).reduce((s,m)=>s+m.l,0)));
  const conf=top.post>0.9?'forte':top.post>0.6?'modérée':'faible';
  const lead=top.other?`<div class="panel lead"><p class="k">Aucune maladie de la base n’explique bien ce tableau</p><h1>Probablement hors base</h1>
     <div class="meta"><span class="pct">${pct(top.post)}</span><span>La meilleure candidate de la base, ${esc(res.rows[0].d.name)}, reste à ${pct(res.rows[0].post)}. Élargir le bilan : exome ou panel large, et avis génétique.</span></div></div>`
   :`<div class="panel lead"><p class="k">Hypothèse principale, confiance ${conf}</p><h1>${esc(top.d.name)}</h1>
     <div class="meta"><span class="pct">${pct(top.post)}</span><span>Gène${top.d.genes.length>1?'s':''} <i>${esc(top.d.genes.join(', '))}</i></span>
     ${top.d.treat==='Traitable'?'<span class="flag tr">Traitable</span>':''}${top.d.urgent?'<span class="flag ur">À ne pas manquer</span>':''}
     <button class="btn sm" data-sheet="${top.d.id}">Fiche et examens</button></div>
     ${top.d.variants&&top.d.variants[0]?`<p class="notice">Premier test à envisager : ${esc(top.d.variants[0][0])} ${esc(top.d.variants[0][1])}. ${esc(top.d.variants[0][2])}.</p>`:''}</div>`;
  const rows=shown.map((r,i)=>{
    const rank=all.indexOf(r)+1; const id=r.other?'__other':r.d.id; const open=S.open===id;
    return `<div class="dr ${rank===1?'top':''} ${r.other?'oth':''}" data-open="${id}" role="button" tabindex="0" aria-expanded="${open}">
      <div class="rk">${rank}</div>
      <div><div class="nm">${esc(nm(r))} ${!r.other&&r.d.treat==='Traitable'?'<span class="flag tr" style="margin-left:4px">Traitable</span>':''}</div><div class="gn">${r.other?'Classe monde ouvert':'<i>'+esc(r.d.genes.join(', '))+'</i>'+(r.d.sheet?'':' — ajout proposé')}</div></div>
      <div class="p">${pct(r.post)}<small>${r.other?'':(r.Lpheno>0?'+':'')+(E.P.tau*r.Lpheno).toFixed(1)+' log'}</small></div>
      <div class="stripc">${stripSVG(r,scale)}</div>
      ${open?ledgerHTML(r):''}
    </div>`;}).join('');
  el.innerHTML=lead+`<div class="panel ddx"><div class="ddx-h"><h2>Diagnostic différentiel</h2>
    <div class="legend"><span><i style="background:var(--for)"></i>Signe en faveur</span><span><i style="background:var(--against)"></i>Signe contre</span><span><i style="background:var(--mod)"></i>Consanguinité, âge, fratrie</span></div></div>${rows}</div>
    <div class="two"><div class="panel card"><h2>Prochaines questions</h2><p class="hint">Signes à rechercher qui départageraient le mieux les hypothèses (gain d’information attendu).</p><div class="nq" id="nq"></div></div>
    <div class="panel card" id="aiCard"><h2>Synthèse clinique</h2><div id="aiBox"></div></div></div>`;
  renderNQ(res); renderAICard();
}
$('#results').addEventListener('click',e=>{
  const sh=e.target.closest('[data-sheet]'); if(sh){ openSheet(sh.dataset.sheet); return; }
  const nqb=e.target.closest('[data-nq]'); if(nqb){ const id=nqb.dataset.id; nqb.dataset.nq==='obs'?addObs(id):addExc(id); update(); return; }
  if(e.target.closest('.ledger')) return;
  const r=e.target.closest('[data-open]'); if(r){ S.open=S.open===r.dataset.open?null:r.dataset.open; renderResults(S.res); }
});
$('#results').addEventListener('keydown',e=>{ if(e.key==='Enter'&&e.target.matches('[data-open]')){ S.open=S.open===e.target.dataset.open?null:e.target.dataset.open; renderResults(S.res); }});

function renderNQ(res){
  const box=$('#nq'); if(!box) return;
  const nq=E.nextQuestions(S,res,5);
  if(!nq.length){ box.innerHTML='<p class="empty">Aucune question discriminante supplémentaire.</p>'; return; }
  const mx=Math.max(...nq.map(n=>n.gain));
  const pt=x=>{const v=Math.max(1,Math.round(x*100)); return 'gagne '+v+(v>1?' points':' point');};
  const top=allRanked(res)[0];
  const note=(top&&!top.other&&top.post>=0.95)?`<p class="hint" style="margin:0 0 8px">Le tableau est déjà très discriminant : la priorité est la confirmation (<button class="lnk" data-sheet="${top.d.id}">examens de la fiche</button>). Ces questions testent surtout la robustesse face au « hors base ».</p>`:'';
  box.innerHTML=note+nq.map(n=>{
    const up=n.up.other?'hors base':n.up.d.name, dn=n.dn.other?'hors base':n.dn.d.name;
    return `<div class="q"><div><div class="qt">${esc(lab(n.t))}</div><div class="qw"><span class="gain" style="width:${Math.round(40*n.gain/mx)}px"></span>Si présent, ${esc(up)} ${n.upDelta>0.005?pt(n.upDelta):'se renforce'}. Si absent, ${esc(dn)} ${n.dnDelta>0.005?pt(n.dnDelta):'se renforce'}.</div></div>
    <div class="row"><button class="btn sm" data-nq="obs" data-id="${n.t}">Présent</button><button class="btn sm ghost" data-nq="exc" data-id="${n.t}">Absent</button></div></div>`;}).join('');
}

// ---------- disease sheet ----------
function openSheet(id){
  const d=DB[id]; const r=S.res&&S.res.rows.find(x=>x.d.id===id);
  const matched=new Set(r?r.ev.filter(e=>e.l>0&&e.h).map(e=>e.h):[]);
  const cur=new Set(d.curated||[]);
  const src=d.src.map(s=>s.startsWith('OMIM')?`<a href="https://omim.org/entry/${s.slice(5)}" target="_blank" rel="noopener">${s}</a>`:`<a href="https://www.orpha.net/fr/disease/detail/${s.slice(6)}" target="_blank" rel="noopener">${s}</a>`).join('');
  const pm=(d.pmids||[]).slice(0,6).map(p=>`<a href="https://pubmed.ncbi.nlm.nih.gov/${p}/" target="_blank" rel="noopener">PMID ${p}</a>`).join('');
  const qry=encodeURIComponent(`(${d.nameEN||d.name}) AND (Morocco OR Maghreb OR Tunisia OR Algeria OR "North Africa")`);
  const pc=E.consPc(S.mode==='global'?d.prevG:d.prevM);
  const ann=d.annots.slice(0,28).map(([h,f])=>`<div>${matched.has(h)?'<span class="m">●</span> ':''}${esc(lab(h))}${cur.has(h)?' <span class="c" title="Ajout de curation experte, à valider">(curation)</span>':''}</div><div><span class="fbar"><i style="width:${Math.round(f*100)}%"></i></span>${Math.round(f*100)} %</div>`).join('');
  $('#drawer').innerHTML=`<button class="btn sm x" id="dClose">Fermer</button>
   <p class="hint" style="margin:0">${d.sheet?'Maladie de la liste projet':'Ajout proposé pour le différentiel'}</p>
   <h2 id="dTitle">${esc(d.name)}</h2><div class="en">${esc(d.nameEN)}</div>
   <div class="genes">${d.genes.map(g=>`<span class="gene">${esc(g)}</span>`).join('')}${d.treat==='Traitable'?'<span class="flag tr">Traitable</span>':''}${d.urgent?'<span class="flag ur">À ne pas manquer</span>':''}</div>
   <div class="links">${src}${pm}<a href="https://pubmed.ncbi.nlm.nih.gov/?term=${qry}" target="_blank" rel="noopener">Recherche PubMed Maghreb</a></div>
   <h3>Au Maghreb</h3><p style="margin:0">${esc(d.maghreb)}</p>
   <h3>Variants à tester en premier</h3><div class="tbl"><table><thead><tr><th>Gène</th><th>Variant</th><th>Contexte</th></tr></thead><tbody>${d.variants.map(v=>`<tr><td><i>${esc(v[0])}</i></td><td>${esc(v[1])}</td><td>${esc(v[2])}</td></tr>`).join('')}</tbody></table></div>
   <h3>Examens de confirmation, dans l’ordre</h3><ol class="steps">${d.tests.map(t=>`<li>${esc(t)}</li>`).join('')}</ol>
   <h3>Prise en charge</h3><p style="margin:0">${esc(d.care)}</p>
   <h3>Modèle de population</h3><p style="margin:0;font-size:14px">Prévalence ${S.mode==='maghreb'?'Maghreb estimée':'mondiale'} : ${fr(S.mode==='maghreb'?d.prevM:d.prevG)} / 100 000. Parmi les patients atteints, part attendue issue d’unions apparentées : <b>${Math.round(pc*100)} %</b> (population générale : ${Math.round(E.P.c*100)} %).${id==='wilson'?' Contrôle : 63,3 % observés dans la série du CHU de Marrakech.':''}</p>
   <h3>Phénotypes annotés (${d.annots.length})</h3><p class="hint">Fréquences Orphanet ou OMIM via HPO. <span class="m" style="color:var(--for)">●</span> signe du patient qui y correspond.</p><div class="ann">${ann}</div>
   <p class="notice">Sources : ${d.src.join(', ')} via HPO ${KB.hpo}. Couche Maghreb (prévalences, variants, examens) : dossier projet et littérature, à valider avec un généticien.</p>`;
  $('#drawer').classList.add('on'); $('#scrim').classList.add('on'); $('#dClose').focus();
  $('#dClose').onclick=closeSheet;
}
function closeSheet(){ $('#drawer').classList.remove('on'); $('#scrim').classList.remove('on'); }
$('#scrim').onclick=closeSheet; document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeSheet(); });

// ---------- tabs ----------
let cur='diag';
$$('nav.tabs button').forEach(b=>b.onclick=()=>{ cur=b.dataset.tab; $$('nav.tabs button').forEach(x=>x.setAttribute('aria-selected',String(x===b))); $$('section.view').forEach(v=>v.classList.toggle('on',v.id==='v-'+cur));
  if(cur==='graph') renderGraph(); if(cur==='kb') renderKB(); if(cur==='val') renderVal(); if(cur==='proj') renderProj(); scrollTo({top:0}); });

// ---------- graph ----------
let gMode='case', sim=null;
$('#gMode').addEventListener('click',e=>{const b=e.target.closest('button'); if(!b) return; gMode=b.dataset.v; $$('#gMode button').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); renderGraph();});
function graphData(){
  const nodes=[], links=[], seen=new Map();
  const node=(id,o)=>{ if(!seen.has(id)){ const n={id,...o}; seen.set(id,n); nodes.push(n);} return seen.get(id); };
  if(gMode==='case' && S.obs.length){
    const top=S.res.rows.slice(0,6);
    S.obs.forEach(t=>node(t,{type:'ph',label:lab(t)}));
    S.exc.forEach(t=>node(t,{type:'ex',label:lab(t)}));
    top.forEach(r=>{ node(r.d.id,{type:'dz',label:r.d.name,post:r.post});
      r.d.genes.filter(g=>!g.includes('*')).forEach(g=>{ node('g:'+g,{type:'gn',label:g}); links.push({source:r.d.id,target:'g:'+g,k:'gene'}); });
      r.ev.forEach(e=>{ if(e.kind==='obs'&&e.l>0) links.push({source:e.q,target:r.d.id,k:e.type==='partial'?'partial':'match',w:e.l});
                       if(e.l<-0.3) links.push({source:e.q,target:r.d.id,k:'against',w:-e.l}); });
    });
  } else {
    const cnt=new Map();
    D.forEach(d=>d.annots.forEach(([h,f])=>{ if(f>=0.3&&E.ic(h)>=4) cnt.set(h,(cnt.get(h)||0)+1); }));
    const shared=[...cnt.entries()].filter(([h,c])=>c>=2).sort((a,b)=>b[1]*E.ic(b[0])-a[1]*E.ic(a[0])).slice(0,45).map(x=>x[0]);
    D.forEach(d=>{ node(d.id,{type:'dz',label:d.name,post:0.12});
      d.genes.filter(g=>!g.includes('*')).forEach(g=>{ node('g:'+g,{type:'gn',label:g}); links.push({source:d.id,target:'g:'+g,k:'gene'}); });
      d.annots.forEach(([h,f])=>{ if(f>=0.3&&shared.includes(h)){ node(h,{type:'ph',label:lab(h)}); links.push({source:h,target:d.id,k:'match',w:1}); } });
    });
  }
  return {nodes,links};
}
function renderChain(svg,W,H){
  // Case mode: deterministic "silsila" layout, signs -> diseases, one row per hypothesis
  const tip=$('#gtip'); const narrow=W<640;
  const rows=S.res.rows.slice(0,6), obs=S.obs.slice(), exc=S.exc.slice();
  const sysOf=t=>{const v=V[t]; return v&&v[5]&&v[5].length?v[5][0]:99;};
  obs.sort((a,b)=>sysOf(a)-sysOf(b));
  const signs=[...obs.map(t=>({id:t,ex:false})),...exc.map(t=>({id:t,ex:true}))];
  const xs=narrow?W*0.42:W*0.36, xd=narrow?W*0.56:W*0.58;
  const gap0=rows.length>1?(H-80)/(rows.length-1):H;
  const R=r=>Math.max(5,Math.min(gap0/2-6,6+30*Math.sqrt(r.post||0)));
  const mR=Math.max(...rows.map(R),6), top=Math.max(44,mR+30), bot=Math.max(20,mR+8);
  const sy=i=>top+(signs.length<=1?(H-top-bot)/2:i*(H-top-bot)/(signs.length-1));
  const dy=i=>top+(rows.length<=1?(H-top-bot)/2:i*(H-top-bot)/(rows.length-1));
  const pos=new Map(); signs.forEach((s,i)=>pos.set(s.id,[xs,sy(i)]));
  const links=[];
  rows.forEach((r,j)=>{ r.ev.forEach(e=>{ if(!pos.has(e.q)) return;
    if(e.kind==='obs'&&e.l>0) links.push({s:e.q,d:r.d.id,j,k:e.type==='partial'?'partial':'match',w:e.l});
    else if(e.l<-0.3) links.push({s:e.q,d:r.d.id,j,k:'against',w:-e.l}); }); });
  const g=svg.append('g'); svg.call(d3.zoom().scaleExtent([0.5,3]).on('zoom',ev=>g.attr('transform',ev.transform)));
  const lk=d3.linkHorizontal();
  const L=g.append('g').attr('fill','none').selectAll('path').data(links).join('path')
    .attr('d',l=>{const r=rows[l.j]; return lk({source:pos.get(l.s),target:[xd-R(r),dy(l.j)]});})
    .attr('stroke',l=>l.k==='against'?'var(--against)':'var(--for)')
    .attr('stroke-opacity',l=>l.k==='partial'?0.35:0.6).attr('stroke-width',l=>Math.min(5,0.8+l.w*0.8))
    .attr('stroke-dasharray',l=>l.k==='against'?'4 3':l.k==='partial'?'2 3':null);
  const clip=(t,n)=>t.length>n?t.slice(0,n-1)+'…':t;
  const SG=g.append('g').selectAll('g').data(signs).join('g').attr('transform',s=>`translate(${xs},${pos.get(s.id)[1]})`).style('cursor','default');
  SG.append('circle').attr('r',6).attr('fill',s=>s.ex?'var(--surface)':sysColor(s.id)).attr('stroke',s=>s.ex?'var(--against)':'var(--surface)').attr('stroke-width',s=>s.ex?2:1.5).attr('stroke-dasharray',s=>s.ex?'2 2':null);
  SG.append('text').text(s=>(s.ex?'pas de : ':'')+clip(lab(s.id),narrow?20:40)).attr('x',-12).attr('dy',4).attr('text-anchor','end')
    .attr('font-size',narrow?10:12).attr('fill',s=>s.ex?'var(--against)':'var(--ink2)').attr('font-family','var(--sans)');
  const DG=g.append('g').selectAll('g').data(rows).join('g').attr('transform',(r,j)=>`translate(${xd},${dy(j)})`).style('cursor','pointer');
  DG.append('circle').attr('r',R).attr('fill','var(--majs)').attr('stroke','var(--maj)').attr('stroke-width',2);
  DG.append('text').text(r=>clip(r.d.name.split(' (')[0],narrow?18:40)).attr('x',r=>R(r)+10).attr('dy',-2)
    .attr('font-size',narrow?12:15).attr('font-weight',600).attr('font-family','var(--serif)').attr('fill','var(--ink)');
  DG.append('text').attr('x',r=>R(r)+10).attr('dy',15).attr('font-size',narrow?10:12).attr('fill','var(--ink3)').attr('font-family','var(--sans)')
    .html(r=>`<tspan font-weight="700" fill="var(--maj)">${esc(pct(r.post))}</tspan>  <tspan font-style="italic">${esc(clip(r.d.genes.join(', '),narrow?14:36))}</tspan>`);
  const hl=(pred,lp)=>{ SG.style('opacity',s=>pred('s',s.id)?1:0.2); DG.style('opacity',r=>pred('d',r.d.id)?1:0.2); L.style('opacity',l=>lp(l)?1:0.06); };
  const clear=()=>{ SG.style('opacity',1); DG.style('opacity',1); L.style('opacity',null); tip.style.display='none'; };
  const mv=ev=>{ const b=$('.graphwrap').getBoundingClientRect(); tip.style.left=(ev.clientX-b.left+12)+'px'; tip.style.top=(ev.clientY-b.top+12)+'px'; };
  SG.on('mouseenter',(ev,s)=>{ const ds=new Set(links.filter(l=>l.s===s.id).map(l=>l.d)); hl((t,id)=>t==='s'?id===s.id:ds.has(id),l=>l.s===s.id);
      tip.style.display='block'; tip.innerHTML=`<b>${esc(lab(s.id))}</b><br>${esc(s.id)} ${esc(sysName(s.id))}${s.ex?'<br>Signe recherché et absent':''}`; })
    .on('mousemove',mv).on('mouseleave',clear);
  DG.on('mouseenter',(ev,r)=>{ const ss=new Set(links.filter(l=>l.d===r.d.id).map(l=>l.s)); hl((t,id)=>t==='d'?id===r.d.id:ss.has(id),l=>l.d===r.d.id);
      tip.style.display='block'; tip.innerHTML=`<b>${esc(r.d.name)}</b><br>${pct(r.post)} · cliquer pour la fiche`; })
    .on('mousemove',mv).on('mouseleave',clear).on('click',(ev,r)=>openSheet(r.d.id));
  g.append('text').attr('x',xs+6).attr('y',16).attr('text-anchor','end').attr('font-size',11).attr('fill','var(--ink3)').attr('font-family','var(--sans)').attr('letter-spacing','.04em').text('SIGNES DU PATIENT');
  g.append('text').attr('x',xd-8).attr('y',16).attr('font-size',11).attr('fill','var(--ink3)').attr('font-family','var(--sans)').attr('letter-spacing','.04em').text('HYPOTHÈSES');
}
function renderGraph(){
  if(typeof d3==='undefined') return;
  const svg=d3.select('#graph'); svg.selectAll('*').remove(); if(sim) sim.stop();
  const el=$('#graph'), W=el.clientWidth||900, H=el.clientHeight||600;
  svg.attr('viewBox',`0 0 ${W} ${H}`);
  if(gMode==='case' && S.obs.length && S.res){ renderChain(svg,W,H); return; }
  const {nodes,links}=graphData();
  if(!nodes.length){ svg.append('text').attr('x',W/2).attr('y',H/2).attr('text-anchor','middle').attr('fill','var(--ink3)').text('Ajoutez des signes dans l’onglet Diagnostic, ou affichez la base complète.'); return; }
  const g=svg.append('g');
  const zoom=d3.zoom().scaleExtent([0.3,3]).on('zoom',ev=>g.attr('transform',ev.transform)); svg.call(zoom);
  const R=n=>n.type==='dz'?12+34*Math.sqrt(n.post||0):n.type==='gn'?6:7;
  sim=d3.forceSimulation(nodes)
    .force('link',d3.forceLink(links).id(d=>d.id).distance(l=>l.k==='gene'?38:95).strength(l=>l.k==='gene'?0.9:0.35))
    .force('charge',d3.forceManyBody().strength(n=>n.type==='dz'?-520:-140))
    .force('center',d3.forceCenter(W/2,H/2))
    .force('col',d3.forceCollide().radius(n=>R(n)+6))
    .force('x',d3.forceX(W/2).strength(0.05)).force('y',d3.forceY(H/2).strength(0.07));
  const link=g.append('g').selectAll('line').data(links).join('line')
    .attr('stroke',l=>l.k==='against'?'var(--against)':l.k==='gene'?'var(--line2)':'var(--for)')
    .attr('stroke-opacity',l=>l.k==='gene'?0.9:0.55).attr('stroke-width',l=>l.k==='gene'?1.2:Math.min(4,0.8+(l.w||1)*0.7))
    .attr('stroke-dasharray',l=>l.k==='partial'||l.k==='against'?'4 3':null);
  const tip=$('#gtip');
  const node=g.append('g').selectAll('g').data(nodes).join('g').style('cursor','pointer')
    .call(d3.drag().on('start',(ev,d)=>{ if(!ev.active) sim.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
      .on('drag',(ev,d)=>{d.fx=ev.x; d.fy=ev.y;}).on('end',(ev,d)=>{ if(!ev.active) sim.alphaTarget(0); d.fx=null; d.fy=null; }));
  node.each(function(n){ const s=d3.select(this);
    if(n.type==='dz') s.append('circle').attr('r',R(n)).attr('fill','var(--majs)').attr('stroke','var(--maj)').attr('stroke-width',2);
    else if(n.type==='gn') s.append('rect').attr('x',-16).attr('y',-8).attr('width',32).attr('height',16).attr('rx',3).attr('fill','var(--surface)').attr('stroke','var(--line2)');
    else if(n.type==='ex') s.append('circle').attr('r',7).attr('fill','var(--surface)').attr('stroke','var(--against)').attr('stroke-width',2).attr('stroke-dasharray','2 2');
    else s.append('circle').attr('r',7).attr('fill',sysColor(n.id)).attr('stroke','var(--surface)').attr('stroke-width',1.5);
    if(n.type==='gn') s.append('text').text(n.label.length>6?n.label.slice(0,6):n.label).attr('text-anchor','middle').attr('dy',4).attr('font-size',10).attr('font-style','italic').attr('font-weight',700).attr('fill','var(--ink2)');
    else s.append('text').text(n.type==='dz'?n.label.split(' (')[0]:n.label.length>34?n.label.slice(0,33)+'…':n.label)
      .attr('x',n.type==='dz'?0:10).attr('y',n.type==='dz'?R(n)+14:4).attr('text-anchor',n.type==='dz'?'middle':'start')
      .attr('font-size',n.type==='dz'?13:11).attr('font-weight',n.type==='dz'?700:400).attr('fill',n.type==='dz'?'var(--ink)':'var(--ink2)')
      .attr('font-family',n.type==='dz'?'var(--serif)':'var(--sans)').attr('paint-order','stroke').attr('stroke','var(--paper)').attr('stroke-width',3);
  });
  node.on('mouseenter',(ev,n)=>{ const nb=new Set([n.id]); links.forEach(l=>{ if(l.source.id===n.id) nb.add(l.target.id); if(l.target.id===n.id) nb.add(l.source.id); });
      node.style('opacity',m=>nb.has(m.id)?1:0.18); link.style('opacity',l=>l.source.id===n.id||l.target.id===n.id?1:0.08);
      tip.style.display='block'; tip.innerHTML=n.type==='dz'?`<b>${esc(n.label)}</b>${gMode==='case'?'<br>'+pct(n.post):''}`:n.type==='gn'?`Gène <i>${esc(n.label)}</i>`:`<b>${esc(n.label)}</b><br>${esc(n.id)} ${esc(sysName(n.id))}`; })
    .on('mousemove',ev=>{ const b=$('.graphwrap').getBoundingClientRect(); tip.style.left=(ev.clientX-b.left+12)+'px'; tip.style.top=(ev.clientY-b.top+12)+'px'; })
    .on('mouseleave',()=>{ node.style('opacity',1); link.style('opacity',null); tip.style.display='none'; })
    .on('click',(ev,n)=>{ if(n.type==='dz') openSheet(n.id); });
  const ticked=()=>{ link.attr('x1',l=>l.source.x).attr('y1',l=>l.source.y).attr('x2',l=>l.target.x).attr('y2',l=>l.target.y); node.attr('transform',n=>`translate(${n.x},${n.y})`); };
  sim.on('tick',ticked); sim.stop(); for(let i=0;i<340;i++) sim.tick(); ticked();
  const X=nodes.map(n=>n.x), Y=nodes.map(n=>n.y);
  const x0=Math.min(...X)-70, x1=Math.max(...X)+170, y0=Math.min(...Y)-50, y1=Math.max(...Y)+40;
  const k=Math.min(1.15,0.98*Math.min(W/(x1-x0),H/(y1-y0)));
  svg.call(zoom.transform,d3.zoomIdentity.translate(W/2-k*(x0+x1)/2,H/2-k*(y0+y1)/2).scale(k));
}
addEventListener('resize',()=>{ if(cur==='graph') renderGraph(); });

// ---------- KB ----------
function renderKB(){
  const nAnn=D.reduce((s,d)=>s+d.annots.length,0);
  $('#kbStats').innerHTML=`<div><b>${D.length}</b>maladies (${D.filter(d=>d.sheet).length} de la liste projet)</div><div><b>${fr(nAnn)}</b>annotations maladie–signe</div><div><b>${fr(Object.keys(V).length)}</b>termes HPO indexés</div><div><b>${fr(KB.N)}</b>maladies de référence pour la spécificité</div><div><b>${KB.hpo}</b>version HPO</div>`;
  const m=S.mode;
  $('#kbTable').innerHTML=`<thead><tr><th>Maladie</th><th>Gènes</th><th>Sources</th><th>Signes</th><th>Début</th><th>Prévalence /100 000 (Maghreb | mondial)</th><th>Unions apparentées attendues</th><th>Statut</th></tr></thead><tbody>`+
   D.map(d=>`<tr data-id="${d.id}"><td><span class="nm">${esc(d.name)}</span></td><td><i>${esc(d.genes.join(', '))}</i></td><td>${d.src.join('<br>')}</td><td class="num">${d.annots.length}</td><td>${(d.onset||[]).map(o=>ONS_L[o]).join(', ')}</td><td class="num">${fr(d.prevM)} | ${fr(d.prevG)}</td><td class="num">${Math.round(E.consPc(m==='global'?d.prevG:d.prevM)*100)} %</td><td>${d.sheet?'Liste projet':'Ajout proposé'}${d.treat==='Traitable'?'<br><span class="flag tr">Traitable</span>':''}</td></tr>`).join('')+'</tbody>';
}
$('#kbTable').addEventListener('click',e=>{const tr=e.target.closest('tr[data-id]'); if(tr) openSheet(tr.dataset.id);});

// ---------- validation ----------
let refRes=null;
function runRef(){
  return CASES.map(c=>{ const r=E.score({obs:c.obs,exc:c.exc,onset:c.onset,cons:c.cons,sib:c.sib,mode:S.mode}); const all=allRanked(r);
    const rank=all.findIndex(x=>(x.other?'other':x.d.id)===c.exp)+1; return {c,rank,post:all[rank-1].post,top:all.slice(0,3)}; });
}
function renderVal(){
  refRes=runRef(); const t1=refRes.filter(x=>x.rank===1).length, t3=refRes.filter(x=>x.rank<=3).length;
  $('#refSummary').innerHTML=`<div><b>${t1}/${refRes.length}</b>en tête</div><div><b>${t3}/${refRes.length}</b>dans le top 3</div><div><b>${S.mode==='maghreb'?'Maghreb':'Mondial'}</b>a priori utilisés</div>`;
  $('#refTable').innerHTML=`<table><thead><tr><th>Cas</th><th>Attendu</th><th>Rang</th><th>Probabilité</th><th>Top 3 du système</th><th></th></tr></thead><tbody>`+refRes.map(x=>`<tr><td>${esc(x.c.title)}</td><td>${x.c.exp==='other'?'Hors base':esc(DB[x.c.exp].name)}</td><td class="num ${x.rank===1?'ok':x.rank<=3?'':'ko'}">${x.rank}</td><td class="num">${pct(x.post)}</td><td>${x.top.map(r=>esc(r.other?'Hors base':r.d.name.split(' (')[0])).join(', ')}</td><td><button class="btn sm" data-load="${x.c.id}">Charger</button></td></tr>`).join('')+'</tbody></table>'+
   (refRes.some(x=>x.rank>1)?`<p class="notice">Échec assumé : ${refRes.filter(x=>x.rank>1).map(x=>esc(x.c.title)).join(', ')}. Maladie très rare, trois signes seulement : le système préfère « hors base » tant que les preuves restent partielles, et propose les questions qui trancheraient.</p>`:'');
  $('#method').innerHTML=METHOD_HTML;
}
$('#refTable').addEventListener('click',e=>{const b=e.target.closest('[data-load]'); if(!b) return; const c=CASES.find(x=>x.id===b.dataset.load); clearCase(); c.obs.forEach(id=>addObs(id,true)); c.exc.forEach(addExc); Object.assign(S,{onset:c.onset,cons:c.cons,sib:c.sib}); syncCtx(); update(); $('nav.tabs button[data-tab="diag"]').click();});
$('#bSim').onclick=()=>{
  $('#simOut').innerHTML='<p class="status">Simulation en cours…</p>';
  setTimeout(()=>{ let seed=7; const rng=()=>{seed=(seed*1664525+1013904223)%4294967296; return seed/4294967296;};
    const t0=performance.now(); const r=E.simulate(40,rng); const ms=Math.round(performance.now()-t0);
    const cols=[...D.map(d=>d.id),'other'];
    const heat=`<div class="heat"><table><thead><tr><th></th>${cols.map(c=>`<th>${c==='other'?'Hors base':esc(DB[c].name.split(' (')[0].slice(0,26))}</th>`).join('')}</tr></thead><tbody>`+
      D.map(d=>`<tr><th>${esc(d.name.split(' (')[0].slice(0,30))}</th>${cols.map(c=>{const v=(r.conf[d.id][c]||0)/40; return `<td title="${esc(d.name)} classé ${c==='other'?'hors base':esc(DB[c].name)} : ${Math.round(v*100)} %" style="background:${v?`color-mix(in srgb, ${c===d.id?'var(--maj)':c==='other'?'var(--other)':'var(--against)'} ${Math.round(12+v*88)}%, transparent)`:'var(--sunk)'};color:${v>0.55?'#fff':'var(--ink)'}">${v?Math.round(v*100):''}</td>`;}).join('')}</tr>`).join('')+'</tbody></table></div>';
    $('#simOut').innerHTML=`<div class="metrics"><div><b>${Math.round(r.top1*100)} %</b>en tête</div><div><b>${Math.round(r.top3*100)} %</b>dans le top 3</div><div><b>${r.mrr.toFixed(2)}</b>rang réciproque moyen</div><div><b>${fr(r.n)}</b>patients en ${ms} ms</div></div>
    <p class="hint">Lignes : maladie simulée. Colonnes : classe mise en tête (%). La diagonale est la bonne réponse, la colonne grise « hors base » les cas où le système refuse de conclure. La surdité isolée (DFNB1) tombe souvent hors base : c’est voulu, une surdité isolée a des centaines de causes.</p>${heat}`;
  },30);
};

// ---------- project ----------
function renderProj(){
  const rr=refRes||runRef(); const t1=rr.filter(x=>x.rank===1).length;
  const phases=[['Recherche et validation',1,1,'Maladies cibles, retours médecins',false],['Prototype v1',2,2,'Moteur de matching, base de connaissances',true],['Test et itération',3,3,'Tests par 2–3 médecins',false],['Extension',4,5,'Graphe de connaissances, interface, 30–40 maladies','en partie livré : graphe, interface, 20 maladies'],['Premier pilote',6,6,'Un service de génétique ou pédiatrie',false],['Itération post-pilote',7,8,'Version 2, publication',false],['Financement',9,10,'Recherche de financement et partenariats',false],['Bilan',11,12,'Bilan à 12 mois et suite du projet',false]];
  $('#v-proj').innerHTML=`<div class="vh"><div><h1>Le projet, de A à Z</h1><p>IA de support diagnostique pour les maladies génétiques rares liées à la consanguinité au Maghreb. Ce prototype couvre déjà la phase 2 de la feuille de route et une partie de la phase 4.</p></div></div>
  <div class="facts"><div><b>2 à 10 ans</b>d’errance diagnostique courante au Maroc</div><div><b>1,5 million</b>de Marocains concernés par une maladie rare</div><div><b>80 %</b>d’origine génétique</div><div><b>29–33 %</b>de mariages apparentés au Maroc (jusqu’à 40–49 % en Tunisie)</div></div>
  <h2>Feuille de route sur 12 mois</h2>
  <div class="panel card"><div class="road"><div class="ax">${Array.from({length:12},(_,i)=>`<span>M${i+1}</span>`).join('')}</div>
  ${phases.map((p,i)=>{const L=p[1]<=7; return `<div class="ph"><div class="rbar ${p[4]?'done':''}" style="grid-column:${p[1]}/${p[2]+1}"></div><div class="lb" style="grid-column:${L?p[1]+'/13':'1/'+(p[2]+1)};text-align:${L?'left':'right'}"><b>${i+1}. ${esc(p[0])}</b>${esc(p[3])}${p[4]?' <span class="flag tr">'+(p[4]===true?'livré par ce prototype':esc(p[4]))+'</span>':''}</div></div>`;}).join('')}</div></div>
  <h2>Architecture</h2>
  <p>Choix d’expert : le classement est un moteur probabiliste déterministe sur HPO, auditable ligne à ligne. Le modèle de langage intervient aux deux bouts, là où il excelle : comprendre une note libre en français ou en darija, et rédiger une synthèse qui ne cite que des sources fournies. Un classement « RAG pur » serait moins traçable et plus difficile à certifier.</p>
  <div class="arch">
   <div><b>Sources ouvertes</b>HPO, Orphanet, OMIM, ClinVar, PubMed<em>Prototype : HPO ${KB.hpo}</em></div>
   <div><b>Normalisation</b>Termes HPO, fréquences, âges de début<em>Prototype : ${fr(D.reduce((s,d)=>s+d.annots.length,0))} annotations</em></div>
   <div><b>Couche Maghreb</b>Prévalences, variants fondateurs, consanguinité<em>Prototype : curation manuelle</em></div>
   <div><b>Moteur de score</b>Rapports de vraisemblance, classe hors base, gain d’information<em>Prototype : dans le navigateur</em></div>
   <div><b>Couche LLM</b>Extraction de notes, synthèse citée<em>Prototype : Claude à la demande</em></div>
   <div><b>Interface</b>Web clinicien, export compte rendu<em>Production : FastAPI + index PubMed</em></div>
  </div>
  <h2>Positionnement</h2>
  <div class="panel card">${positionSVG()}</div>
  <h2>Jalons et indicateurs</h2>
  <div class="panel card kpi">
   <div class="r"><b>Premier prototype fonctionnel</b><span>Classement cohérent sur au moins 5 cas tests connus</span><span class="ok">Atteint : ${t1}/${rr.length} cas en tête</span></div>
   <div class="r"><b>Validation médecin</b><span>Au moins 3 médecins confirment l’utilité clinique</span><span>À faire, fin mois 3</span></div>
   <div class="r"><b>Couverture de la base</b><span>Au moins 30 maladies intégrées</span><span>${D.length}/30, fin mois 5</span></div>
   <div class="r"><b>Premier pilote actif</b><span>Un service utilise l’outil sur au moins 10 cas réels</span><span>À faire, fin mois 6</span></div>
   <div class="r"><b>Reconnaissance externe</b><span>Contact établi avec un financeur ou un partenaire institutionnel</span><span>À faire, fin mois 9</span></div>
   <div class="r"><b>Bilan à 12 mois</b><span>Bilan documenté et suite du projet décidée</span><span>À faire, fin mois 12</span></div>
  </div>
  <h2>Points de vigilance</h2>
  <div class="vig">
   <div><b>Des outils à partir des symptômes existent déjà.</b><p>Phenomizer, LIRICAL, Exomiser, PubCaseFinder ou Isabel classent des maladies rares à partir de termes HPO. L’apport de Silsila est ailleurs : calibration Maghreb (a priori, consanguinité, variants fondateurs), saisie en français et en darija, et orientation vers le test le moins cher d’abord.</p></div>
   <div><b>Pas de données patient pour construire ne veut pas dire pas de réglementation pour déployer.</b><p>Le pilote de la phase 5 traite des données réelles : déclaration ou autorisation CNDP (loi 09-08) et avis d’un comité d’éthique pour l’étude d’évaluation. Un logiciel qui oriente un diagnostic peut relever des dispositifs médicaux (loi 84-12 au Maroc, règlement MDR en Europe). Le pilote démarrera en statut d’outil de recherche, en mode silencieux.</p></div>
   <div><b>La validation actuelle est une borne haute.</b><p>Cas de référence et simulations viennent de la même base : c’est circulaire. Étape suivante : 50 à 100 cas publiés marocains et maghrébins, phénotypes extraits à l’aveugle, puis pilote prospectif mesurant le top 3 et le délai jusqu’au diagnostic.</p></div>
   <div><b>L’intérêt économique : le test fondateur ciblé.</b><p>Rechercher d’abord TTPA c.744delA, XPC c.1643_1644delTG ou SGCG c.525delT coûte bien moins qu’un exome et se fait localement. Un outil qui dit « testez ce variant d’abord » parle directement au budget d’un CHU.</p></div>
   <div><b>Biais à documenter.</b><p>La littérature surreprésente les familles publiées ; les prévalences du prototype sont des estimations ; une partie des termes HPO n’a pas encore de traduction française officielle ; la darija demande une validation clinique dédiée. L’humain reste dans la boucle et la classe « hors base » est toujours affichée.</p></div>
  </div>`;
}
function positionSVG(){
  const P=[['Face2Gene',0.1,0.18],['GestaltMatcher',0.2,0.1],['Phenomizer, LIRICAL, Exomiser, PubCaseFinder',0.78,0.16],['MENARA',0.62,0.66],['MedQA-MA / TRUMEDIQA',0.5,0.82],['MGDD (base statique)',0.3,0.9],['Silsila',0.9,0.86]];
  const W=760,H=380,m=46;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Carte de positionnement" style="width:100%;height:auto;display:block">
   <rect x="${m}" y="14" width="${W-m-14}" height="${H-m-14}" fill="none" stroke="var(--line2)"/>
   <line x1="${(W+m-14)/2}" y1="14" x2="${(W+m-14)/2}" y2="${H-m}" stroke="var(--line)" stroke-dasharray="3 4"/><line x1="${m}" y1="${(H-m+14)/2}" x2="${W-14}" y2="${(H-m+14)/2}" stroke="var(--line)" stroke-dasharray="3 4"/>
   <text x="${m}" y="${H-m+22}" font-size="12" fill="var(--ink3)">Entrée : photo du visage</text><text x="${W-14}" y="${H-m+22}" font-size="12" fill="var(--ink3)" text-anchor="end">Entrée : signes cliniques, texte</text>
   <text x="${m-10}" y="${H-m}" font-size="12" fill="var(--ink3)" transform="rotate(-90 ${m-10} ${H-m})">Calibration mondiale</text><text x="${m-10}" y="140" font-size="12" fill="var(--ink3)" transform="rotate(-90 ${m-10} 140)" text-anchor="end">Maghreb</text>
   ${P.map(([n,x,y])=>{const cx=m+x*(W-m-14), cy=14+(1-y)*(H-m-14); const me=n==='Silsila'; return `<circle cx="${cx}" cy="${cy}" r="${me?9:6}" fill="${me?'var(--maj)':'var(--surface)'}" stroke="${me?'var(--maj)':'var(--ink3)'}" stroke-width="1.5"/><text x="${cx+(x>0.7?-12:12)}" y="${cy+4}" font-size="${me?15:12.5}" font-weight="${me?700:400}" fill="var(--ink${me?'':'2'})" text-anchor="${x>0.7?'end':'start'}" font-family="${me?'var(--serif)':'var(--sans)'}">${esc(n)}</text>`;}).join('')}
  </svg>`;
}

const METHOD_HTML=`<p>Pour chaque maladie <i>M</i> et chaque signe <i>s</i> du patient, le moteur calcule un rapport de vraisemblance LR = P(<i>s</i> | <i>M</i>) / P(<i>s</i>), dans l’esprit de LIRICAL. P(<i>s</i> | <i>M</i>) vient des fréquences HPO (catégories Orphanet, ou comptes OMIM lissés par Laplace). P(<i>s</i>) est la fraction des ${fr(KB.N)} maladies de référence annotées avec ce signe ou un descendant : un signe rare pèse lourd, un signe banal presque rien.</p>
<p>La correspondance suit l’ontologie : exacte, plus générale, plus précise, ou « proche » via l’ancêtre commun le plus informatif (similarité de Lin, atténuée au cube). Un signe inexpliqué vaut LR = ${E.P.eps}. Un signe recherché et absent vaut (1 − f) / (1 − P(s)), plafonné pour ne jamais éliminer une maladie sur un seul signe.</p>
<p>Les signes étant corrélés, leur somme en log est pondérée par τ = ${E.P.tau}. La consanguinité agit via un modèle de génétique des populations : pour une maladie récessive de prévalence p, le risque relatif chez un enfant d’union apparentée vaut 1 + F(1 − q)/q avec q = √p et F = 1/32. Plus une maladie est rare, plus la consanguinité l’oriente. Pour Wilson, le modèle prédit 72 % d’unions apparentées chez les patients ; la série de Marrakech en observe 63 %.</p>
<p>Une classe « hors base » de prévalence ${E.P.otherRatio} fois supérieure à la base, où chaque signe a un LR de 1, absorbe les tableaux mal expliqués. Les questions suivantes maximisent le gain d’information attendu sur la distribution a posteriori.</p>`;

// ---------- AI (Claude via sample capability) ----------
function renderAICard(){
  const box=$('#aiBox'); if(!box) return;
  if(!sample){ box.innerHTML=`<p class="hint">La synthèse rédigée par Claude s’active lorsque la page est ouverte dans Claude. Le classement, les preuves et les questions ci-contre fonctionnent sans elle.</p>`; return; }
  if(box.dataset.done==='1' && box.dataset.key===caseKey()) return;
  box.dataset.done=''; box.innerHTML=`<p class="hint">Claude rédige un raisonnement structuré à partir du classement et des fiches de la base uniquement, en citant les sources fournies.</p><div class="row"><button class="btn pri" id="bSynth">Rédiger la synthèse</button></div><div class="ai-out" id="aiOut"></div>`;
  $('#bSynth').onclick=synthesize;
}
function caseKey(){ return JSON.stringify([S.obs,S.exc,S.onset,S.cons,S.sib,S.mode]); }
let synthCtl=null;
async function synthesize(){
  const b=$('#bSynth'), out=$('#aiOut'); const all=allRanked(S.res).slice(0,5);
  const srcs=[]; const cite=s=>{ let i=srcs.indexOf(s); if(i<0){srcs.push(s); i=srcs.length-1;} return 'S'+(i+1); };
  const cands=all.map(r=>{ if(r.other) return `- Hors base (autre maladie non couverte) : ${pct(r.post)}`; const d=r.d;
    const sup=r.ev.filter(e=>e.l>0).map(e=>`${lab(e.q)} (fréquence ${e.f!=null?Math.round(e.f*100)+'%':'?'})`).join(', ');
    const con=r.ev.filter(e=>e.l<0).map(e=>`${lab(e.q)}${e.kind==='exc'?' [absent]':' [non expliqué]'}`).join(', ');
    const s1=cite(d.src.join('/')+' via HPO '+KB.hpo); const s2=cite('Couche Maghreb Silsila : '+d.name);
    return `- ${d.name} [${d.genes.join(', ')}] : ${pct(r.post)} [${s1}]\n  En faveur : ${sup||'aucun'}\n  Contre : ${con||'aucun'}\n  Maghreb [${s2}] : ${d.maghreb}\n  Variants à tester : ${d.variants.map(v=>v[0]+' '+v[1]).join(' ; ')}\n  Examens : ${d.tests.join(' ; ')}\n  Prise en charge : ${d.care}`; }).join('\n');
  const prompt=`Tu es généticien clinicien au Maroc. Rédige en français une synthèse de raisonnement diagnostique pour un collègue, à partir UNIQUEMENT des données ci-dessous (sorties d'un moteur probabiliste sur HPO). N'ajoute aucun fait médical absent de ces données ; si une information manque, dis-le.
Format : quatre courtes sections avec un titre précédé de "### " : "Lecture du cas", "Hypothèses à retenir", "Conduite à tenir", "Limites". Puces "- " autorisées. 220 mots maximum. Cite les sources entre crochets, par exemple [S1], seulement avec les identifiants fournis. Ne donne pas de pourcentage non fourni.

PATIENT
Signes présents : ${S.obs.map(lab).join(', ')}
Signes absents : ${S.exc.map(lab).join(', ')||'aucun'}
Âge de début : ${S.onset?ONS_L[S.onset]:'inconnu'} ; consanguinité : ${({yes:'oui',no:'non',unk:'inconnue'})[S.cons]} ; fratrie atteinte : ${S.sib?'oui':'non'}
A priori : ${S.mode==='maghreb'?'calibrés Maghreb':'mondiaux'}

CLASSEMENT (probabilités a posteriori)
${cands}

SOURCES
${srcs.map((s,i)=>`[S${i+1}] ${s}`).join('\n')}`;
  synthCtl=new AbortController(); b.textContent='Arrêter'; b.onclick=()=>synthCtl.abort(); out.innerHTML='<p class="status">Claude réfléchit…</p>';
  try{
    const {truncated}=await sample(prompt,{signal:synthCtl.signal,cache:{gcTime:600000},onText:({text})=>{ out.innerHTML=md(text,srcs); }});
    if(truncated) out.insertAdjacentHTML('beforeend','<p class="notice">Réponse tronquée.</p>');
    out.insertAdjacentHTML('beforeend',`<p class="notice">Texte généré par Claude à partir du classement ; à relire par un clinicien. Sources : ${srcs.map((s,i)=>'S'+(i+1)+' '+esc(s)).join(' ; ')}.</p>`);
    $('#aiBox').dataset.done='1'; $('#aiBox').dataset.key=caseKey();
  }catch(e){
    if(e.text) out.innerHTML=md(e.text,srcs); else if(e.code!=='cancelled') out.innerHTML='';
    if(['not_granted','sampling_disabled','not_declared','capability_disabled','capability_removed'].includes(e.code)){ sample=null; $('#bAI').hidden=true; renderAICard(); return; }
    if(e.code!=='cancelled') out.insertAdjacentHTML('beforeend',`<p class="notice">${e.code==='rate_limited'?'Limite d’utilisation atteinte, réessayez plus tard.':e.code==='session_expired'?'Session expirée : reconnectez-vous.':'La synthèse a été interrompue. Réessayez.'}</p>`);
  }finally{ b.textContent='Rédiger à nouveau'; b.onclick=synthesize; }
}
function md(t,srcs){
  const lines=esc(t).split('\n'); let h='', inUl=false;
  for(let l of lines){
    l=l.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\[(S\d+)\]/g,'<span class="src">[$1]</span>');
    if(/^#{2,4}\s/.test(l)){ if(inUl){h+='</ul>';inUl=false;} h+=`<h4>${l.replace(/^#+\s/,'')}</h4>`; }
    else if(/^\s*[-•]\s/.test(l)){ if(!inUl){h+='<ul>';inUl=true;} h+=`<li>${l.replace(/^\s*[-•]\s/,'')}</li>`; }
    else if(l.trim()){ if(inUl){h+='</ul>';inUl=false;} h+=`<p>${l}</p>`; }
  }
  return h+(inUl?'</ul>':'');
}
const AI_EXTRACT=note=>`Tu es généticien clinicien, expert du phénotypage HPO. Extrais de l'observation ci-dessous (français, anglais, arabe ou darija marocaine en arabizi) les signes cliniques du PATIENT uniquement (pas ceux de la famille), normalisés en termes de la Human Phenotype Ontology, aussi précis que le texte le justifie, sans rien inventer. Les signes explicitement niés vont dans "absent".
Réponds uniquement par un objet JSON de la forme :
{"present":[{"hpo":"HP:0000662","label_en":"Nyctalopia","evidence":"extrait court de la note"}],"absent":[{"hpo":"...","label_en":"...","evidence":"..."}],"onset":"neo|inf|child|juv|adult|null","consanguinity":"yes|no|unk","sibling_affected":false,"remark":"une phrase en français, 25 mots maximum, sur ce qui reste ambigu"}
label_en doit être le libellé officiel anglais du terme HPO.

OBSERVATION
${note.slice(0,6000)}`;
async function aiExtract(){
  const note=$('#note').value.trim(); if(!note){ $('#nlpStatus').textContent='Saisissez ou collez une observation.'; return; }
  const b=$('#bAI'); b.disabled=true; $('#nlpStatus').textContent='Claude lit l’observation…';
  try{
    const r=await sample.json(AI_EXTRACT(note),{cache:{gcTime:600000}});
    const map=it=>{ if(!it||typeof it!=='object') return null; const id=String(it.hpo||'').trim(); const l=String(it.label_en||'');
      if(V[id]&&(!l||NLP.labelAgree(id,l))) return {id,how:'id'};
      const f=NLP.fuzzy(l); if(f) return {id:f.id,how:'label'}; return {unm:l||id}; };
    let n=0,rm=0,un=[]; S.unmapped=[];
    (Array.isArray(r.present)?r.present:[]).forEach(it=>{ const m=map(it); if(!m) return; if(m.unm){un.push(m.unm);return;} if(addObs(m.id,true)) n++; if(m.how==='label') rm++; if(it.evidence) S.evidence[m.id]=String(it.evidence).slice(0,120); });
    (Array.isArray(r.absent)?r.absent:[]).forEach(it=>{ const m=map(it); if(m&&!m.unm){ addExc(m.id); if(it.evidence) S.evidence[m.id]=String(it.evidence).slice(0,120);} });
    if(['yes','no'].includes(r.consanguinity)) S.cons=r.consanguinity; if(r.sibling_affected===true) S.sib=true; if(E.ONS.includes(r.onset)) S.onset=r.onset;
    S.unmapped=un.slice(0,6); syncCtx(); update();
    $('#nlpStatus').textContent=`Claude : ${n} signe${n>1?'s':''} ajouté${n>1?'s':''}${rm?`, ${rm} recalé${rm>1?'s':''} sur le libellé (identifiant incohérent)`:''}${un.length?`, ${un.length} hors vocabulaire de la base (grisé${un.length>1?'s':''}, non comptés)`:''}.${r.remark?' '+String(r.remark).slice(0,200):''}`;
  }catch(e){
    if(['not_granted','sampling_disabled','not_declared','capability_disabled','capability_removed'].includes(e.code)){ sample=null; b.hidden=true; renderAICard(); $('#nlpStatus').textContent='Analyse par Claude indisponible ici ; l’extraction locale reste active.'; }
    else $('#nlpStatus').textContent=e.code==='invalid_json'?'Réponse de Claude illisible, réessayez.':e.code==='rate_limited'?'Limite d’utilisation atteinte, réessayez plus tard.':'Analyse interrompue, réessayez.';
  }finally{ b.disabled=false; }
}
$('#bAI').onclick=aiExtract;

// ---------- export ----------
// Dans Claude : capacité downloads. Hébergé ailleurs (GitHub Pages, serveur) : téléchargement navigateur classique.
function canExport(){ return !!downloads||!IN_CLAUDE; }
function saveLocal(name,text){ const u=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'})); const a=document.createElement('a'); a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),2000); }
$('#bExport').onclick=async()=>{
  const all=allRanked(S.res).slice(0,6); const d=new Date().toLocaleDateString('fr-FR');
  const t=`# Compte rendu d'aide au diagnostic — Silsila\n\nDate : ${d}\nA priori : ${S.mode==='maghreb'?'Maghreb':'mondiaux'}\n\n## Patient\n- Signes présents : ${S.obs.map(x=>lab(x)+' ('+x+')').join(', ')}\n- Signes absents : ${S.exc.map(x=>lab(x)+' ('+x+')').join(', ')||'aucun'}\n- Âge de début : ${S.onset?ONS_L[S.onset]:'inconnu'}\n- Consanguinité : ${({yes:'oui',no:'non',unk:'inconnue'})[S.cons]}\n- Fratrie atteinte : ${S.sib?'oui':'non'}\n\n## Diagnostic différentiel\n${all.map((r,i)=>`${i+1}. ${nm(r)} — ${pct(r.post)}${r.other?'':(r.d.genes.length>1?' — gènes ':' — gène ')+r.d.genes.join(', ')}`).join('\n')}\n\n${all.filter(r=>!r.other).slice(0,2).map(r=>`## ${r.d.name}\nVariants à tester : ${r.d.variants.map(v=>v[0]+' '+v[1]).join(' ; ')}\nExamens : ${r.d.tests.map((x,i)=>(i+1)+'. '+x).join(' ')}\nSources : ${r.d.src.join(', ')} (HPO ${KB.hpo})`).join('\n\n')}\n\n---\nPrototype de recherche : ne remplace pas l'avis d'un généticien.\n`;
  if(!downloads){ saveLocal('silsila-compte-rendu.md',t); toast('Compte rendu téléchargé'); return; }
  try{ await downloads.save({filename:'silsila-compte-rendu.md',data:t}); toast('Compte rendu enregistré'); }
  catch(e){ toast(e.code==='declined'?'Enregistrement annulé':'Export indisponible ici'); }
};

// ---------- boot ----------
syncCtx(); update();
(async()=>{
  if(!window.claude||typeof window.claude.use!=='function') return;
  try{ sample=await window.claude.use('sample'); }catch(e){ sample=null; }
  try{ downloads=await window.claude.use('downloads'); }catch(e){ downloads=null; }
  if(sample){ $('#bAI').hidden=false; }
  renderAICard(); $('#bExport').hidden=!(canExport()&&S.obs.length);
})();
