// ===== Silsila scoring engine (LIRICAL-inspired likelihood ratios over HPO) =====
function makeEngine(KB){
  const V=KB.V, D=KB.D, N=KB.N;
  const P={eps:0.12, lrCap:1000, notLR:0.02, fExCap:0.95, otherRatio:20, F:1/32, c:0.30, sibKB:2.5, simPow:3, tau:0.6};
  const ANC=new Map();
  function anc(t){let s=ANC.get(t); if(s) return s; s=new Set([t]); const v=V[t]; if(v) for(const p of v[2]) for(const a of anc(p)) s.add(a); ANC.set(t,s); return s;}
  const bg=t=>Math.max(V[t]?V[t][4]:1/N, 1/N);
  const ic=t=>V[t]?V[t][3]:0;
  const ONS=['neo','inf','child','juv','adult'];
  D.forEach(d=>{d.f=new Map(d.annots);});
  const cache=new Map();
  function termLR(d,q){
    const key=d.id+'|'+q; if(cache.has(key)) return cache.get(key);
    const r=_termLR(d,q); cache.set(key,r); return r;
  }
  function _termLR(d,q){
    const Aq=anc(q);
    for(const n of d.nots) if(Aq.has(n)) return {lr:P.notLR,type:'not',h:n};
    const fq=d.f.get(q);
    if(fq!==undefined) return {lr:Math.min(P.lrCap,fq/bg(q)),type:'exact',h:q,f:fq};
    let fm=0,hm=null;
    for(const [h,f] of d.annots) if(f>fm && anc(h).has(q)){fm=f;hm=h;}
    if(hm) return {lr:Math.min(P.lrCap,fm/bg(q)),type:'broader',h:hm,f:fm};
    let bl=0,bh=null,bf=0;
    for(const [h,f] of d.annots) if(Aq.has(h)){const lr=f/bg(h); if(lr>bl){bl=lr;bh=h;bf=f;}}
    if(bh) return {lr:Math.min(P.lrCap,bl),type:'narrower',h:bh,f:bf};
    let pl=P.eps,ph=null,pa=null,pf=0; const icq=ic(q);
    for(const [h,f] of d.annots){
      let mica=null,mi=0;
      for(const a of anc(h)) if(Aq.has(a)&&ic(a)>mi){mi=ic(a);mica=a;}
      if(mi<2) continue;
      const sim=Math.min(1,2*mi/(icq+ic(h)));
      const s=Math.pow(sim,P.simPow);
      const lr=Math.pow(P.eps,1-s)*Math.pow(Math.min(P.lrCap,f/bg(h)),s);
      if(lr>pl){pl=lr;ph=h;pa=mica;pf=f;}
    }
    if(ph) return {lr:pl,type:'partial',h:ph,a:pa,f:pf};
    return {lr:P.eps,type:'none'};
  }
  function exclLR(d,q){
    let f=d.f.get(q)||0, h=f?q:null;
    for(const [hh,fh] of d.annots) if(fh>f && anc(hh).has(q)){f=fh;h=hh;}
    if(!f) return {lr:1,type:'none'};
    return {lr:(1-Math.min(f,P.fExCap))/(1-Math.min(bg(q),0.5)),type:'excluded',h,f};
  }
  function onsetLR(d,o){
    if(!o||!d.onset||!d.onset.length) return 1;
    const i=ONS.indexOf(o); let m=9;
    for(const x of d.onset) m=Math.min(m,Math.abs(ONS.indexOf(x)-i));
    return m===0?1.5:(m===1?0.7:0.2);
  }
  function consPc(prev){const q=Math.sqrt(prev/1e5); const RR=1+P.F*(1-q)/q; return P.c*RR/(P.c*RR+1-P.c);}
  function consLR(d,cons,mode){
    if(cons==='unk') return 1;
    const pc=consPc(mode==='global'?d.prevG:d.prevM);
    return cons==='yes'?pc/P.c:(1-pc)/(1-P.c);
  }
  // state: {obs:[], exc:[], onset, cons:'unk'|'yes'|'no', sib:bool, mode:'maghreb'|'global'}
  function score(st){
    const mode=st.mode||'maghreb';
    const tot=D.reduce((s,d)=>s+(mode==='global'?d.prevG:d.prevM),0);
    const rows=D.map(d=>{
      const prior=(mode==='global'?d.prevG:d.prevM);
      const ev=[];
      for(const q of st.obs){const r=termLR(d,q); ev.push({q,kind:'obs',...r,l:Math.log10(r.lr)});}
      for(const q of st.exc){const r=exclLR(d,q); if(r.type!=='none') ev.push({q,kind:'exc',...r,l:Math.log10(r.lr)});}
      const mods=[];
      const ol=onsetLR(d,st.onset); if(ol!==1) mods.push({name:'Âge de début',l:Math.log10(ol)});
      const cl=consLR(d,st.cons,mode); if(cl!==1) mods.push({name:st.cons==='yes'?'Consanguinité':'Non consanguin',l:Math.log10(cl)});
      if(st.sib) mods.push({name:'Fratrie atteinte',l:Math.log10(P.sibKB)});
      const Lph=ev.reduce((s,e)=>s+e.l,0);
      const L=Math.log10(prior)+P.tau*Lph+mods.reduce((s,m)=>s+m.l,0);
      return {d,prior,ev,mods,L,Lpheno:Lph};
    });
    const oPrior=P.otherRatio*tot;
    let oL=Math.log10(oPrior);
    if(st.cons==='yes') oL+=Math.log10(1.25); else if(st.cons==='no') oL+=Math.log10(0.9);
    const other={d:null,other:true,prior:oPrior,ev:[],mods:[],L:oL,Lpheno:0};
    const all=[...rows,other];
    const mx=Math.max(...all.map(r=>r.L));
    let Z=0; all.forEach(r=>{r.w=Math.pow(10,r.L-mx); Z+=r.w;});
    all.forEach(r=>r.post=r.w/Z);
    rows.sort((a,b)=>b.L-a.L);
    return {rows,other,priorLTot:Math.log10(tot)};
  }
  // expected information gain for next question
  function nextQuestions(st,res,k=6){
    const top=res.rows.slice(0,6);
    const specified=new Set();
    for(const q of st.obs) for(const a of anc(q)) specified.add(a);
    for(const q of [...st.obs,...st.exc]) specified.add(q);
    const exAnc=st.exc;
    const cands=new Set();
    for(const r of top) for(const [h,f] of r.d.annots){
      if(f<0.17||ic(h)<3||specified.has(h)) continue;
      if(exAnc.some(e=>anc(h).has(e))) continue;
      cands.add(h);
    }
    const classes=[...res.rows,res.other];
    const H=ps=>{let s=0; for(const p of ps) if(p>1e-12) s-=p*Math.log2(p); return s;};
    const H0=H(classes.map(c=>c.post));
    const out=[];
    for(const t of cands){
      const lp=[],la=[],pt=[];
      for(const c of classes){
        if(c.other){lp.push(1);la.push(1);pt.push(bg(t));continue;}
        const r=termLR(c.d,t); const e=exclLR(c.d,t);
        lp.push(Math.pow(r.lr,P.tau)); la.push(Math.pow(e.lr,P.tau)); pt.push(Math.min(0.97,r.lr*bg(t)));
      }
      let Pp=0; classes.forEach((c,i)=>Pp+=c.post*pt[i]);
      const norm=arr=>{let z=0; const w=classes.map((c,i)=>{const v=c.post*arr[i]; z+=v; return v;}); return w.map(v=>v/z);};
      const pp=norm(lp), pa=norm(la);
      const gain=H0-(Pp*H(pp)+(1-Pp)*H(pa));
      let up=0,upi=0; pp.forEach((v,i)=>{const dlt=v-classes[i].post; if(dlt>up){up=dlt;upi=i;}});
      let dn=0,dni=0; pa.forEach((v,i)=>{const dlt=v-classes[i].post; if(dlt>dn){dn=dlt;dni=i;}});
      out.push({t,gain,Pp,up:classes[upi],upDelta:up,dn:classes[dni],dnDelta:dn});
    }
    out.sort((a,b)=>b.gain-a.gain);
    return out.slice(0,k);
  }
  function simulate(nPer,rng){
    rng=rng||Math.random;
    const allAnn=D.flatMap(d=>d.annots.map(a=>a[0]));
    const res={per:{},conf:{}}; let t1=0,t3=0,rr=0,n=0;
    for(const d of D){
      let a1=0,a3=0; res.conf[d.id]={};
      const pool=d.annots.filter(a=>ic(a[0])>=2.5);
      for(let k=0;k<nPer;k++){
        let obs=[];
        for(const [h,f] of pool) if(rng()<f*0.8) obs.push(h);
        obs.sort(()=>rng()-0.5); obs=obs.slice(0,3+Math.floor(rng()*4));
        if(!obs.length) obs=[pool[Math.floor(rng()*pool.length)][0]];
        obs=obs.map(h=>{const ps=V[h][2]; return (rng()<0.3&&ps.length&&ic(ps[0])>=2)?ps[0]:h;});
        if(rng()<0.5) obs.push(allAnn[Math.floor(rng()*allAnn.length)]);
        const onset=d.onset&&d.onset.length&&rng()<0.7?d.onset[Math.floor(rng()*d.onset.length)]:null;
        const r=score({obs:[...new Set(obs)],exc:[],onset,cons:'unk',sib:false,mode:'maghreb'});
        const all=[...r.rows,r.other].sort((x,y)=>y.post-x.post);
        const rank=all.findIndex(x=>x.d&&x.d.id===d.id)+1;
        const top=all[0].other?'other':all[0].d.id;
        res.conf[d.id][top]=(res.conf[d.id][top]||0)+1;
        if(rank===1)a1++; if(rank<=3)a3++; rr+=1/rank; n++;
      }
      res.per[d.id]={top1:a1/nPer,top3:a3/nPer}; t1+=a1; t3+=a3;
    }
    res.top1=t1/n; res.top3=t3/n; res.mrr=rr/n; res.n=n;
    return res;
  }
  return {simulate,P,anc,bg,ic,termLR,exclLR,score,nextQuestions,consPc,ONS};
}
if(typeof module!=='undefined') module.exports={makeEngine};
