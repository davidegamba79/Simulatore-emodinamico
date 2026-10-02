/* Simulatore emodinamico V2 — realistic compact waveform engine
   Load AFTER app.js. It replaces only the animation loop; controls/cases remain unchanged. */
(() => {
  const nativeRAF = window.requestAnimationFrame.bind(window);
  const oldRAF = window.requestAnimationFrame.bind(window);

  // Stop the legacy function named "wave" from scheduling further frames.
  window.requestAnimationFrame = cb => {
    if (cb && cb.name === 'wave') return 0;
    return oldRAF(cb);
  };

  const clamp2=(v,a,b)=>Math.max(a,Math.min(b,v));
  const gauss=(x,m,s)=>Math.exp(-0.5*((x-m)/s)**2);
  let t0=performance.now()/1000;

  function fit(c){
    const d=devicePixelRatio||1,r=c.getBoundingClientRect();
    const W=Math.max(1,Math.floor(r.width*d)),H=Math.max(1,Math.floor(r.height*d));
    if(c.width!==W||c.height!==H){c.width=W;c.height=H}
    const g=c.getContext('2d'); g.setTransform(d,0,0,d,0,0);
    return [g,r.width,r.height];
  }
  function grid(g,w,h){
    g.strokeStyle='rgba(70,110,125,.09)'; g.lineWidth=1;
    for(let x=0;x<w;x+=25){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke()}
    for(let y=0;y<h;y+=25){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke()}
  }
  function morph(){
    const p=(window.phys||{preload:100,contractility:100,vascularTone:100,compliance:100});
    const st=window.state||{};
    return {
      preload:p.preload/100, contr:p.contractility/100, tone:p.vascularTone/100,
      compl:p.compliance/100, perf:clamp2((+st.co||3.2)/3.2,.08,1.45),
      varr:clamp2(((+st.ppv||8)-8)/22,0,1)
    };
  }
  function ecg(q,rhythm){
    if(rhythm==='Asistolia') return .002*Math.sin(q*31);
    if(rhythm.includes('Fibrillazione ventricolare'))
      return .17*Math.sin(q*23)+.10*Math.sin(q*41)+.06*Math.sin(q*67);
    if(rhythm.includes('Tachicardia ventricolare'))
      return .34*Math.sin(2*Math.PI*q)+.12*Math.sin(4*Math.PI*q);
    if(rhythm.includes('massaggio')) return .23*gauss(q,.10,.035)-.16*gauss(q,.18,.045);
    // P-QRS-T canine monitor morphology
    return .075*gauss(q,.12,.030)-.10*gauss(q,.255,.012)+.56*gauss(q,.285,.010)
          -.19*gauss(q,.315,.015)+.15*gauss(q,.56,.065);
  }
  function capno(q,et,rr,m){
    if(rr<=0||et<=2) return 0;
    // phase I/II upstroke, sloped alveolar plateau, inspiratory downstroke
    let v=0;
    if(q<.08) v=0;
    else if(q<.18){let z=(q-.08)/.10;v=z*z*(3-2*z)}
    else if(q<.64){let z=(q-.18)/.46;v=1+.07*z}
    else if(q<.72){let z=(q-.64)/.08;v=(1.07)*(1-z*z*(3-2*z))}
    // low flow/low CO: smaller, slightly less stable trace
    return v*clamp2(et/40,.12,1.45)*(0.93+0.07*m.perf);
  }
  function art(q,m){
    // Rapid systolic upstroke, systolic peak, exponential diastolic runoff + dicrotic notch.
    const up=gauss(q,.12,.065);
    const shoulder=.42*gauss(q,.24,.11);
    const tail=q>.12?Math.exp(-(q-.12)*(3.0+1.5/m.compl)):0;
    const notch=-.12*gauss(q,.43,.025)+.08*gauss(q,.48,.035);
    let pulse=.62*up+.42*shoulder+.42*tail+notch;
    // hypovolaemia / poor contractility narrow the pulse; vasodilation broadens runoff
    pulse*=clamp2(.48+.38*m.preload+.32*m.contr,.25,1.35);
    return pulse;
  }
  function pleth(q,m){
    // Peripheral pulse: fast systolic rise, rounded peak, dicrotic/reflective wave, runoff.
    const main=gauss(q,.18,.095);
    const tail=q>.18?.48*Math.exp(-(q-.18)*3.5):0;
    const refl=.16*gauss(q,.48,.07);
    return (main+tail+refl)*clamp2(m.perf*(.65+.35*m.preload),.10,1.35);
  }
  function draw(){
    const st=window.state||{hr:90,rr:18,etco2:38};
    const hr=Math.max(1,+st.hr||90), rr=Math.max(0,+st.rr||0), et=+st.etco2||0;
    const rhythm=document.getElementById('rhythm')?.value||'Ritmo sinusale';
    const m=morph(), now=performance.now()/1000, scroll=now-t0;
    const defs=[
      ['ecg','#39ef8b',6.0],
      ['capno','#3bd6ff',12.0],
      ['pleth','#ffd34e',6.0],
      ['art','#ff5364',6.0]
    ];
    defs.forEach(([id,col,seconds])=>{
      const c=document.getElementById(id); if(!c||c.offsetParent===null)return;
      const [g,w,h]=fit(c);g.clearRect(0,0,w,h);grid(g,w,h);
      g.strokeStyle=col;g.lineWidth=2;g.lineJoin='round';g.lineCap='round';g.beginPath();
      for(let x=0;x<w;x++){
        const ts=scroll+(x/w)*seconds;
        let y=.58, v=0;
        if(id==='ecg'){
          const cyc=60/hr,q=((ts/cyc)%1+1)%1;v=ecg(q,rhythm);y=.58-v*.72;
        } else if(id==='capno'){
          const cyc=rr>0?60/rr:999,q=((ts/cyc)%1+1)%1;v=capno(q,et,rr,m);y=.82-v*.56;
        } else {
          const cyc=60/hr,q=((ts/cyc)%1+1)%1;
          if(id==='pleth'){v=pleth(q,m);y=.80-v*.42}
          else {v=art(q,m);y=.82-v*.62}
        }
        // respiratory variation visible in arterial/pleth waveforms
        if((id==='art'||id==='pleth') && rr>0){
          const resp=Math.sin(2*Math.PI*ts/(60/rr));
          y += resp*.025*m.varr;
        }
        const yy=clamp2(y,.04,.96)*h;
        if(x===0)g.moveTo(x,yy); else g.lineTo(x,yy);
      }
      g.stroke();
    });
    nativeRAF(draw);
  }
  nativeRAF(draw);
})();