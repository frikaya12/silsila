const {makeEngine}=require('../src/engine.js');
const KB=require('../data/kb.json'); const E=makeEngine(KB); const cases=require('../data/cases.json');
const lab=t=>KB.V[t]?KB.V[t][0]||KB.V[t][1]:t;
let t1=0,t3=0;
for(const c of cases){
  for(const mode of ['maghreb','global']){
  const res=E.score({obs:c.obs,exc:c.exc,onset:c.onset,cons:c.cons,sib:c.sib,mode});
  const all=[...res.rows,res.other].sort((a,b)=>b.post-a.post);
  const rank=all.findIndex(r=>(r.other?'other':r.d.id)===c.exp)+1;
  if(mode==='maghreb'){ if(rank===1)t1++; if(rank<=3)t3++; }
  console.log(mode.padEnd(8),c.id.padEnd(4),c.exp.padEnd(8),'rank',rank, all.slice(0,4).map(r=>(r.other?'OTHER':r.d.id)+':'+(r.post*100).toFixed(1)).join('  '));
  }
}
console.log('top1',t1,'top3',t3,'of',cases.length);
const c=cases[1]; const st={obs:c.obs,exc:c.exc,onset:c.onset,cons:c.cons,sib:c.sib,mode:'maghreb'};
const res=E.score(st); const nq=E.nextQuestions(st,res);
nq.forEach(n=>console.log(lab(n.t), n.gain.toFixed(3), 'P+',n.Pp.toFixed(2), 'up:',n.up.other?'other':n.up.d.id));
console.log(res.rows[0].ev.map(e=>lab(e.q)+' '+e.type+' '+e.l.toFixed(2)).join(' | '));
console.log(res.rows[1].d.id, res.rows[1].ev.map(e=>lab(e.q)+' '+e.type+' '+e.l.toFixed(2)).join(' | '));
console.log('Wilson Pc',E.consPc(3.88));
let seed=42; const rng=()=>{seed=(seed*1664525+1013904223)%4294967296; return seed/4294967296;};
const t0=Date.now(); const sim=E.simulate(40,rng); console.log('sim ms',Date.now()-t0);
console.log('top1',sim.top1.toFixed(3),'top3',sim.top3.toFixed(3),'mrr',sim.mrr.toFixed(3));
for(const [k,v] of Object.entries(sim.per)) console.log(k.padEnd(8),v.top1.toFixed(2),v.top3.toFixed(2), JSON.stringify(sim.conf[k]));

// ---- garde-fous de non-régression (échoue si le moteur se dégrade)
const fail=[];
if(t1<15) fail.push(`cas de référence : ${t1}/16 en tête (attendu ≥ 15)`);
if(t3<16) fail.push(`cas de référence : ${t3}/16 dans le top 3 (attendu 16)`);
if(sim.top1<0.75) fail.push(`simulation : top 1 = ${sim.top1.toFixed(2)} (attendu ≥ 0,75)`);
if(sim.top3<0.95) fail.push(`simulation : top 3 = ${sim.top3.toFixed(2)} (attendu ≥ 0,95)`);
if(fail.length){ console.error('\nÉCHEC\n- '+fail.join('\n- ')); process.exit(1); }
console.log('\nOK : non-régression respectée');
