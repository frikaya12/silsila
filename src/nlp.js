// ===== Local clinical NLP: phrase matching over HPO FR/EN labels + curated lexicon, NegEx-style negation =====
function makeNLP(V,LEX,NEG_TRIGGERS,SCOPE_END){
  const norm=s=>s.toLowerCase().replace(/œ/g,'oe').replace(/æ/g,'ae').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const stem=w=>(w.length>3&&/[sx]$/.test(w)&&!/^\d/.test(w))?w.slice(0,-1):w;
  function tok(s){const out=[];const re=/([a-z0-9]+)|([.;:!?\n])|(,)/g;let m;
    while((m=re.exec(s))){ if(m[1]) out.push({w:stem(m[1]),i:m.index,e:m.index+m[1].length}); else out.push({b:m[2]?'S':'C',i:m.index,e:m.index+1}); }
    return out;}
  const toksOf=p=>tok(norm(p)).filter(x=>x.w).map(x=>x.w);
  const idx=new Map();
  function add(phrase,id,src){const t=toksOf(phrase); if(!t.length) return; if(t.length===1&&t[0].length<4) return;
    const k=t[0]; if(!idx.has(k)) idx.set(k,[]); idx.get(k).push({t,id,src});}
  for(const [id,ps] of Object.entries(LEX)) if(V[id]) ps.forEach(p=>add(p,id,'lex'));
  for(const [id,v] of Object.entries(V)){
    if(v[0]) add(v[0],id,'fr');
    if(v[1] && (v[1].split(' ').length>1 || v[1].length>=6)) add(v[1],id,'en');
    (v[6]||[]).forEach(s=>{ if(s.split(' ').length>1) add(s,id,'en'); });
  }
  const trig=NEG_TRIGGERS.map(toksOf), ends=new Set(SCOPE_END.map(s=>toksOf(s)[0]));
  function extract(text){
    const n=norm(text), T=tok(n), spans=[];
    for(let i=0;i<T.length;i++){ if(!T[i].w) continue; const c=idx.get(T[i].w); if(!c) continue;
      for(const ph of c){ let ok=true;
        for(let k=0;k<ph.t.length;k++){const x=T[i+k]; if(!x||!x.w||x.w!==ph.t[k]){ok=false;break;}}
        if(ok) spans.push({i,j:i+ph.t.length,id:ph.id,src:ph.src,len:ph.t.length});
      }}
    spans.sort((a,b)=>b.len-a.len||(a.src==='lex'?-1:1));
    const used=new Array(T.length).fill(false), keep=[];
    for(const s of spans){ let free=true; for(let k=s.i;k<s.j;k++) if(used[k]){free=false;break;}
      if(!free) continue; for(let k=s.i;k<s.j;k++) used[k]=true; keep.push(s);}
    keep.sort((a,b)=>a.i-b.i);
    const present=[],absent=[],seen=new Set();
    for(const s of keep){
      let neg=false, words=0;
      for(let k=s.i-1;k>=0&&words<8;k--){ const x=T[k]; if(x.b==='S') break; if(!x.w) continue; words++;
        if(ends.has(x.w)) break;
        for(const tr of trig){ const L=tr.length; let ok=true; let kk=k;
          for(let q=L-1;q>=0;q--){ while(kk>=0&&!T[kk].w) kk--; if(kk<0||T[kk].w!==tr[q]){ok=false;break;} kk--; }
          if(ok){neg=true;break;} }
        if(neg) break; }
      if(seen.has(s.id)) continue; seen.add(s.id);
      const snippet=text.slice(T[s.i].i,T[s.j-1].e);
      (neg?absent:present).push({id:s.id,snippet,src:s.src});
    }
    // context
    let cons='unk';
    if(/\bnon[ -]?consanguin|pas de consanguinit|parents non apparent|non apparent/.test(n)) cons='no';
    else if(/consanguin|cousins? germain|parents cousins|apparentes?\b|wlad (l3a?m|3am|l5al|khal)|wlad l3m/.test(n)) cons='yes';
    const sib=/(frere|soeur|fratrie|khoh|khouh|khtou|khtha)[^.\n]{0,60}(atteint|similaire|meme|pareil|bhal|nefs|nafs)/.test(n);
    let age=null, m;
    if((m=n.match(/(\d+(?:[.,]\d+)?)\s*(ans|an|snin|sna|mois|chhour|chhar|jours|j)\b/))){ const v=parseFloat(m[1].replace(',','.')); const u=m[2];
      age = /mois|chh/.test(u)? v/12 : (/^j/.test(u)? v/365 : v); }
    else if(/nouveau[- ]?ne/.test(n)) age=0.02; else if(/nourrisson/.test(n)) age=0.5;
    let onset=null;
    if(/depuis la naissance|des la naissance|a la naissance|congenital|mn nhar tzad|men nhar tzad|mn sghrou|nouveau[- ]?ne/.test(n)) onset='neo';
    else if((m=n.match(/depuis l.?\s?age de (\d+)\s*(mois|ans)/))){ const v=parseFloat(m[1]); const a=m[2]==='mois'?v/12:v; onset=a<1/12?'neo':a<1?'inf':a<5?'child':a<16?'juv':'adult'; }
    else if(/(premiere|1re|1ere) annee/.test(n)) onset='inf';
    else if(age!=null) onset= age<1/12?'neo':age<1?'inf':age<5?'child':age<16?'juv':'adult';
    return {present,absent,cons,sib,age,onset,onsetFromAge:onset&&!/naissance|congenital|tzad|sghrou|nouveau/.test(n)};
  }
  function search(q,limit=12){
    const nq=norm(q).trim(); if(nq.length<2) return [];
    if(/^hp:?\d+/.test(nq)){ const id='HP:'+nq.replace(/\D/g,'').padStart(7,'0'); return V[id]?[id]:[]; }
    const qt=toksOf(q); const res=[];
    for(const [id,v] of Object.entries(V)){
      const hay=[v[0],v[1],...(v[6]||[]),...(LEX[id]||[])].filter(Boolean).map(norm);
      let best=0;
      for(const h of hay){
        if(h.startsWith(nq)) best=Math.max(best,3);
        else if(h.includes(nq)) best=Math.max(best,2);
        else { const ht=toksOf(h); const hit=qt.filter(w=>ht.some(x=>x.startsWith(w))).length; if(hit===qt.length) best=Math.max(best,1.5); }
      }
      if(best) res.push([id,best+Math.min(v[3],10)/20]);
    }
    res.sort((a,b)=>b[1]-a[1]); return res.slice(0,limit).map(r=>r[0]);
  }
  function fuzzy(label){ // for mapping LLM output
    const qt=new Set(toksOf(label)); if(!qt.size) return null; let best=null,bs=0;
    for(const [id,v] of Object.entries(V)){
      for(const h of [v[1],v[0],...(v[6]||[])]){ if(!h) continue; const ht=new Set(toksOf(h));
        let inter=0; qt.forEach(w=>{if(ht.has(w)) inter++;}); const j=inter/(qt.size+ht.size-inter);
        if(j>bs){bs=j;best=id;} } }
    return bs>=0.6?{id:best,score:bs}:null;
  }
  function labelAgree(id,label){ if(!V[id]||!label) return false; const qt=new Set(toksOf(label));
    return [V[id][1],V[id][0],...(V[id][6]||[])].some(h=>{ if(!h) return false; const ht=new Set(toksOf(h)); let inter=0; qt.forEach(w=>{if(ht.has(w)) inter++;}); return inter/(qt.size+ht.size-inter)>=0.5; }); }
  return {extract,search,fuzzy,labelAgree,norm};
}
if(typeof module!=='undefined') module.exports={makeNLP};
