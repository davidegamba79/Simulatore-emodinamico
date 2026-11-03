/* V2.9.3 — spirometria PV/FV, monitor respiratorio e dati paziente sincronizzati. Modello didattico. */
(function(){
 'use strict';
 const el=id=>document.getElementById(id);
 const n=(id,defaultValue)=>{const x=Number(el(id)?.value);return Number.isFinite(x)&&el(id)?.value!==''?x:defaultValue};
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const ventIds=['ventMode','ventRate','ventVtKg','ventPeep','ventPinsp','ventIE','ventFio2','ventCompliance','ventResistance','ventHoldEnabled','ventHoldSeconds'];
 const fmt=(v,decimals=1)=>Number.isFinite(v)?v.toFixed(decimals).replace('.',','):'—';
 const breedMorph={
  'Bulldog francese':'brachy','Bulldog inglese':'brachy','Carlino':'brachy',
  'Boxer':'brachy','Cavalier King Charles':'brachy','Chihuahua':'meso',
  'Levriero':'dolicho','Pastore tedesco':'meso','Bassotto':'meso'
 };
 let lastData=null;
 const respDisplayKey='recoverCaneRespDisplayV293';
 const patientFields=['name','weight','patientAge','patientBreed','patientMorph','patientBodyType','patientBCS'];
 const patientCopies=new Map();
 function calc(){
  const weight=clamp(n('weight',25),1,100),age=clamp(n('patientAge',6),.1,22),bcs=clamp(n('patientBCS',5),1,9);
  const morph=el('patientMorph')?.value||'meso';
  const chosen=el('ventMode')?.value||'VCV';
  const intubated=typeof v25!=='undefined'&&v25.induction.phase==='maintenance';
  const controlled=intubated&&chosen!=='SPONT',mode=controlled?chosen:'SPONT';
  const rate=clamp(n('ventRate',12),4,50),peep=controlled?clamp(n('ventPeep',3),0,18):0;
  const ie=clamp(n('ventIE',2),1,3),fio2=clamp(n('ventFio2',.5),.21,1);
  const ti=60/rate/(1+ie),te=60/rate-ti;
  const hold=controlled&&el('ventHoldEnabled')?.checked===true;
  const maxHold=Math.max(.1,Math.min(1.5,ti*.65,ti-.15));
  const holdSeconds=hold?clamp(n('ventHoldSeconds',.4),.1,maxHold):0;
  const flowTi=Math.max(.15,ti-holdSeconds);
  // Compliance basale del cane normopeso con meccanica respiratoria conservata:
  // 1,10 mL/(kg*cmH2O). Valore didattico ricalibrato, NON una soglia clinica.
  // Le variazioni per eta', BCS e morfotipo sono ipotesi semplificate.
  const ageFactor=age<1?.90:age>8?clamp(1-.018*(age-8),.76,1):1;
  const bcsFactor=bcs>=6?clamp(1-.075*(bcs-5),.65,1):bcs<=3?.94:1;
  const morphFactor=morph==='brachy'?.86:morph==='dolicho'?1.04:1;
  const bodyType=el('patientBodyType')?.value||'meso';
  const bodyFactor=bodyType==='brachy'?.93:bodyType==='dolicho'?1.05:1;
  const crs=clamp(weight*1.10*ageFactor*bcsFactor*morphFactor*bodyFactor*clamp(n('ventCompliance',100)/100,.4,1.6),.45,160);
  const raw=clamp(8*Math.pow(weight/25,-.28)*(morph==='brachy'?1.65:morph==='dolicho'?.9:1)*(bcs>=7?1.12:1)*clamp(n('ventResistance',100)/100,.5,2.5),1.5,100);
  const tau=raw*crs/1000; // R (cmH2O/(L/s)) * C (L/cmH2O) = secondi
  const vtSet=clamp(n('ventVtKg',8),4,15)*weight;
  const pinsp=clamp(n('ventPinsp',12),4,30);
  let vt=controlled?(mode==='VCV'?vtSet:crs*pinsp*(1-Math.exp(-flowTi/Math.max(.03,tau)))):7*weight;
  vt=clamp(vt,1,weight*22);
  const plateau=controlled?peep+vt/crs:null;
  const flow=controlled?(vt/1000)/Math.max(.1,flowTi):0;
  const pip=controlled?(mode==='VCV'?plateau+raw*flow:peep+pinsp):null;
  const driving=controlled?plateau-peep:null;
  // In assenza di pausa inspiratoria la Pplat non e' misurata:
  // il modello usa comunque la componente elastica per la fisiologia.
  const plateauMeasured=hold?plateau:null,drivingMeasured=hold?driving:null;
  const minute=vt/1000*rate,alveolarMinute=Math.max(.05,(vt-weight*2)/1000*rate);
  const pmean=controlled?peep+(plateau-peep)*ti/(ti+te)*.60:0;
  const preloadSensitivity=clamp(1+Math.max(0,100-(typeof phys!=='undefined'?phys.preload:100))*.012,1,1.9);
  const preloadFactor=controlled?clamp(1-.011*Math.max(0,pmean-2)*preloadSensitivity-.005*Math.max(0,(plateau||0)-19),.68,1):1;
  return {mode,chosen,intubated,controlled,rate,peep,ie,ti,te,flowTi,hold,holdSeconds,fio2,weight,age,bcs,morph,bodyType,crs,raw,tau,vt,pip,plateau,driving,plateauMeasured,drivingMeasured,minute,alveolarMinute,pmean,preloadFactor};
 }
 window.simVentCalc=calc;
 window.simVentValid=()=>{
  const d=calc(),rh=el('rhythm')?.value||'';
  const regular=['Ritmo sinusale','Bradicardia sinusale','Tachicardia sinusale','Blocco AV I grado'].includes(rh);
  return d.controlled&&regular&&d.vt/d.weight>=7&&n('hr',80)/d.rate>=3.6;
 };
 window.simVentSettings=()=>Object.fromEntries(ventIds.map(id=>[id,id==='ventHoldEnabled'?Boolean(el(id)?.checked):(el(id)?.value??'')]));
 window.simVentApplySettings=settings=>{
  if(!settings||typeof settings!=='object')return;
  for(const id of ventIds){
   if(settings[id]==null||!el(id))continue;
   if(id==='ventHoldEnabled')el(id).checked=settings[id]===true||settings[id]==='true';
   else el(id).value=settings[id];
  }
  refresh();
 };
 function syncPatientCopies(){
  for(const [id,copy] of patientCopies){
   const original=el(id);
   if(original&&copy&&copy!==document.activeElement)copy.value=original.value;
  }
  const context=el('ventPatientContext'),preset=el('patientPresetStatus');
  if(context&&preset)context.textContent=preset.textContent;
 }
 function createPatientMirror(){
  if(document.body.classList.contains('student'))return;
  const vent=el('ventilationPanel');
  if(!vent||!vent.parentElement||el('ventPatientCard'))return;
  const card=document.createElement('section');card.className='card vent-patient-card';card.id='ventPatientCard';
  card.innerHTML='<h2>Dati paziente · ventilazione</h2><small style="color:var(--muted)">Modificabili anche qui; i valori restano sincronizzati con la scheda Paziente.</small><div class="cols" id="ventPatientFields" style="margin-top:9px"></div><div class="status" id="ventPatientContext" style="margin-top:8px"></div>';
  const box=card.querySelector('#ventPatientFields');
  for(const id of patientFields){
   const original=el(id),label=original?.closest('label');
   if(!original||!label)continue;
   const copyLabel=label.cloneNode(true),copy=copyLabel.querySelector('input,select');
   if(!copy)continue;
   copy.id='ventCopy_'+id;
   copy.value=original.value;
   copy.removeAttribute('name');
   copy.addEventListener('input',()=>{
    original.value=copy.value;
    original.dispatchEvent(new Event('input',{bubbles:true}));
    syncPatientCopies();
   });
   copy.addEventListener('change',()=>{
    original.value=copy.value;
    original.dispatchEvent(new Event('change',{bubbles:true}));
    syncPatientCopies();
   });
   box.append(copyLabel);patientCopies.set(id,copy);
   original.addEventListener('input',syncPatientCopies);
   original.addEventListener('change',syncPatientCopies);
  }
  vent.parentElement.insertBefore(card,vent);
  syncPatientCopies();
 }
 function setRespDisplay(options,write=false){
  const pressure=Boolean(options?.pressure),flow=Boolean(options?.flow);
  document.body.dataset.respPressure=String(pressure);
  document.body.dataset.respFlow=String(flow);
  if(el('showVentPressure'))el('showVentPressure').checked=pressure;
  if(el('showVentFlow'))el('showVentFlow').checked=flow;
  if(write&&!document.body.classList.contains('student')){
   try{localStorage.setItem(respDisplayKey,JSON.stringify({pressure,flow}))}catch(err){console.warn('Preferenze onde respiratorie:',err)}
  }
 }
 function setupRespDisplay(){
  let initial={pressure:false,flow:false};
  try{initial=JSON.parse(localStorage.getItem(respDisplayKey)||'null')||initial}catch(err){}
  setRespDisplay(initial);
  for(const [id,key] of [['showVentPressure','pressure'],['showVentFlow','flow']]){
   const input=el(id);if(!input)continue;
   input.addEventListener('change',()=>setRespDisplay({pressure:key==='pressure'?input.checked:el('showVentPressure')?.checked,flow:key==='flow'?input.checked:el('showVentFlow')?.checked},true));
  }
  window.addEventListener('storage',e=>{
   if(e.key!==respDisplayKey||!e.newValue)return;
   try{setRespDisplay(JSON.parse(e.newValue))}catch(err){}
  });
 }
 function refresh(){
  const d=calc();lastData=d;
  syncPatientCopies();
  // RR e' la frequenza del ventilatore (o spontanea, se non intubato).
  if(el('rr')&&Number(el('rr').value)!==d.rate)el('rr').value=d.rate;
  const vals={ventPip:fmt(d.pip),ventPplat:fmt(d.plateauMeasured),ventDriving:fmt(d.drivingMeasured),ventVt:fmt(d.vt,0),ventMinute:fmt(d.minute,2),ventCrs:fmt(d.crs),ventMainPip:fmt(d.pip),ventMainVolumeValue:fmt(d.vt,0),ventMainFlowValue:fmt(d.controlled?d.mode==='VCV'?d.vt/1000/d.flowTi:(d.pip-d.peep)/Math.max(1.5,d.raw):d.vt/1000/d.ti,2)};
  for(const [id,value] of Object.entries(vals))if(el(id))el(id).textContent=value;
  const status=el('ventStatus');
  if(status)status.textContent=!d.intubated?'Paziente non intubato: respirazione spontanea nel modello. VCV/PCV saranno attive dopo l’intubazione.':d.controlled?d.mode+' attiva · PEEP '+fmt(d.peep,0)+' cmH₂O · I:E 1:'+d.ie+(d.hold?' · pausa inspiratoria '+fmt(d.holdSeconds,2)+' s':' · nessuna pausa inspiratoria'):'Paziente intubato · ventilazione spontanea.';
  const warning=[];
  if(d.controlled&&d.vt/d.weight>12)warning.push('Vt elevato per il peso');
  if(d.controlled&&d.vt/d.weight<5)warning.push('Vt ridotto');
  if(d.controlled&&d.plateau>25)warning.push('pressione di plateau elevata');
  if(d.controlled&&d.pip>30)warning.push('PIP elevata');
  const interpret=el('ventInterpretation');
  if(interpret)interpret.textContent='Crs stimata '+fmt(d.crs/d.weight,2)+' mL/kg/cmH₂O · R vie aeree '+fmt(d.raw)+' cmH₂O/(L/s) · Vt '+fmt(d.vt/d.weight,1)+' mL/kg · FiO₂ '+Math.round(d.fio2*100)+'%. '+(d.hold?'Pplat simulata in pausa di fine inspirazione: '+fmt(d.plateauMeasured)+' cmH₂O; driving pressure = Pplat − PEEP = '+fmt(d.drivingMeasured)+' cmH₂O. ':'Pplat e driving pressure non misurate: attiva la pausa inspiratoria. ')+(warning.length?'Attenzione: '+warning.join(', ')+'. ':'')+'Stime didattiche, non valori clinici di riferimento.';
  if(el('ventVtKg'))el('ventVtKg').disabled=d.mode!=='VCV';
  if(el('ventPinsp'))el('ventPinsp').disabled=d.mode!=='PCV';
  if(el('ventPeep'))el('ventPeep').disabled=!d.controlled;
  if(el('ventHoldEnabled'))el('ventHoldEnabled').disabled=!d.controlled;
  if(el('ventHoldSeconds'))el('ventHoldSeconds').disabled=!d.hold;
  const patient=el('studentPhenotype');
  if(patient)patient.textContent=fmt(d.age,1)+' anni · '+(el('patientBreed')?.value||'Meticcio')+' · BCS '+d.bcs+'/9';
  const patientSummary=el('studentVentPatientSummary');
  if(patientSummary)patientSummary.textContent=(el('name')?.value||'Paziente')+' · '+fmt(d.weight,1)+' kg · '+fmt(d.age,1)+' anni · '+(el('patientBreed')?.value||'Meticcio')+' · '+({meso:'mesocefalo',brachy:'brachicefalo',dolicho:'dolicocefalo'}[d.morph]||d.morph)+' · '+({meso:'mesomorfo',brachy:'brachimorfo',dolicho:'dolicomorfo'}[d.bodyType]||d.bodyType)+' · BCS '+d.bcs+'/9';
  for(const prefix of ['studentVent']){
   const root=el(prefix+'Readouts');
   if(!root)continue;
   for(const [key,value] of Object.entries({pip:fmt(d.pip),pplat:fmt(d.plateauMeasured),driving:fmt(d.drivingMeasured),vt:fmt(d.vt,0),minute:fmt(d.minute,2),crs:fmt(d.crs)})){
    const target=el(prefix+key.charAt(0).toUpperCase()+key.slice(1));if(target)target.textContent=value;
   }
   const headline=el(prefix+'Headline');
   if(headline)headline.textContent=d.controlled?d.mode+' · FR '+d.rate+'/min · PEEP '+fmt(d.peep,0)+' cmH₂O · FiO₂ '+Math.round(d.fio2*100)+'%'+(d.hold?' · pausa '+fmt(d.holdSeconds,2)+' s':' · senza pausa'):(d.intubated?'Ventilazione spontanea · intubato':'Paziente non intubato · spontanea');
  }
  return d;
 }
 window.simVentRefresh=refresh;
 function studentPanel(){
  const panel=el('student-panel-ventilation');if(!panel)return;
  const card=document.createElement('section');card.className='card';
  card.innerHTML='<h2>Ventilazione · monitor di sola lettura</h2><div id="studentVentPatientSummary" class="status" style="margin-bottom:6px">Dati paziente in attesa</div><div id="studentVentHeadline" class="status">In attesa dei dati dalla console docente</div>'+
   '<div class="vent-readouts" id="studentVentReadouts">'+
   [['Pip','PIP','cmH₂O'],['Pplat','Pplat','cmH₂O'],['Driving','Driving P','cmH₂O'],['Vt','Vt','mL'],['Minute','V̇E','L/min'],['Crs','Crs','mL/cmH₂O']].map(x=>'<div><small>'+x[1]+'</small><b id="studentVent'+x[0]+'">—</b><small>'+x[2]+'</small></div>').join('')+'</div>'+
   '<h3 style="font-size:14px;margin:12px 0 6px">Spirometria — loop respiratori</h3>'+
   '<div class="vent-loop-grid">'+
   '<div class="vent-loop-card"><strong>Pressione / Volume</strong><canvas id="studentVentLoopPV" aria-label="Loop pressione volume"></canvas></div>'+
   '<div class="vent-loop-card"><strong>Flusso / Volume</strong><canvas id="studentVentLoopFV" aria-label="Loop flusso volume"></canvas></div></div>'+
   '<div class="vent-loop-legend"><span class="insp">● Inspirazione</span><span class="exp">● Espirazione</span></div>'+
   '<small style="display:block;margin-top:10px;color:var(--muted)">Le onde Paw, flusso e volume sono nel monitor principale insieme a IBP, EtCO₂ e SpO₂. Pplat e driving pressure richiedono la pausa inspiratoria.</small>';
  panel.append(card);
 }
 function sample(d,type,phase){
  const cycle=60/d.rate,insp=d.ti/cycle,inspir=phase<insp;
  const inspSeconds=phase*cycle,expSeconds=Math.max(0,phase*cycle-d.ti);
  const holdPhase=d.hold&&inspir&&inspSeconds>=d.flowTi;
  const activeSeconds=Math.min(inspSeconds,d.flowTi);
  const inspX=clamp(activeSeconds/Math.max(.05,d.flowTi),0,1);
  const expX=clamp(expSeconds/Math.max(.1,d.te),0,1);
  const spontX=inspir?clamp(phase/insp,0,1):expX;
  const volume=d.controlled?
   (inspir?(holdPhase?d.vt:(d.mode==='PCV'?d.vt*(1-Math.exp(-activeSeconds/Math.max(.03,d.tau)))/(1-Math.exp(-d.flowTi/Math.max(.03,d.tau))):d.vt*inspX)):d.vt*Math.exp(-expSeconds/Math.max(.15,d.tau*2))):
   (inspir?d.vt*Math.sin(Math.PI*spontX/2):d.vt*Math.cos(Math.PI*spontX/2));
  if(type==='Volume')return volume;
  if(type==='Pressure'){
   if(!d.controlled)return -2*Math.sin(Math.PI*phase*2);
   if(inspir){
    // Durante l'occlusione inspiratoria: flusso zero, caduta PIP -> Pplat.
    if(holdPhase)return d.plateau+(d.pip-d.plateau)*Math.exp(-(inspSeconds-d.flowTi)/.035);
    return d.mode==='PCV'?d.peep+(d.pip-d.peep)*Math.min(1,inspSeconds/.07):
      d.peep+(d.plateau-d.peep)*inspX+(d.pip-d.plateau);
   }
   return d.peep+(d.plateau-d.peep)*Math.exp(-expSeconds/Math.max(.1,d.tau));
  }
  if(d.controlled){
   if(inspir){
    if(holdPhase)return 0;
    return d.mode==='VCV'?d.vt/1000/d.flowTi:(d.pip-d.peep)/Math.max(1.5,d.raw)*Math.exp(-activeSeconds/Math.max(.03,d.tau));
   }
   return -d.vt/1000/Math.max(.12,d.tau*2)*Math.exp(-expSeconds/Math.max(.12,d.tau*2));
  }
  return inspir?d.vt/1000/d.ti*Math.sin(Math.PI*spontX):-d.vt/1000/d.te*Math.sin(Math.PI*expX);
 }
 // Curve temporali e loop spirometrici: stessi campioni, un unico modello respiratorio.
 function canvasContext(canvas){
  if(!canvas||canvas.offsetParent===null)return null;
  const rect=canvas.getBoundingClientRect(),w=Math.max(1,rect.width),h=Math.max(1,rect.height);
  if(w<30||h<30)return null;
  const pixelRatio=Math.min(1.6,window.devicePixelRatio||1),cw=Math.round(w*pixelRatio),ch=Math.round(h*pixelRatio);
  if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch}
  const ctx=canvas.getContext('2d');
  if(!ctx)return null;
  ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
  ctx.clearRect(0,0,w,h);
  return {ctx,w,h};
 }
 function drawTimeWave(canvas,d,type,color,seconds){
  const target=canvasContext(canvas);if(!target)return;
  const {ctx,w,h}=target;
  ctx.strokeStyle='#23404d';ctx.lineWidth=1;ctx.beginPath();
  const baseline=type==='Flow'?h*.50:h*.88;
  ctx.moveTo(0,baseline);ctx.lineTo(w,baseline);ctx.stroke();
  ctx.strokeStyle=color;ctx.lineWidth=2;ctx.lineJoin='round';ctx.beginPath();
  const cycle=60/d.rate;
  const flowMax=Math.max(.15,d.vt/1000/Math.max(.1,d.flowTi)*3,d.mode==='PCV'?(d.pip-d.peep)/Math.max(1.5,d.raw)*1.15:0);
  const max=type==='Pressure'?Math.max(15,(d.pip||5)*1.2):type==='Volume'?Math.max(50,d.vt*1.2):flowMax;
  for(let x=0;x<w;x+=2){
   const phase=(((seconds+x/w*9)/cycle)%1+1)%1,v=sample(d,type,phase);
   const y=type==='Flow'?h*.50-v/max*h*.38:h*.90-v/max*h*.77;
   if(x===0)ctx.moveTo(x,clamp(y,2,h-2));else ctx.lineTo(x,clamp(y,2,h-2));
  }
  ctx.stroke();
 }
 function drawArrow(ctx,a,b,color){
  if(!a||!b)return;
  const dx=b[0]-a[0],dy=b[1]-a[1],angle=Math.atan2(dy,dx);
  ctx.strokeStyle=color;ctx.lineWidth=1.8;ctx.beginPath();
  ctx.moveTo(b[0]-7*Math.cos(angle-.48),b[1]-7*Math.sin(angle-.48));
  ctx.lineTo(b[0],b[1]);ctx.lineTo(b[0]-7*Math.cos(angle+.48),b[1]-7*Math.sin(angle+.48));ctx.stroke();
 }
 function drawLoop(canvas,d,kind,seconds){
  const target=canvasContext(canvas);if(!target)return;
  const {ctx,w,h}=target;
  const margin={left:47,right:12,top:19,bottom:37};
  const pw=w-margin.left-margin.right,ph=h-margin.top-margin.bottom;
  const N=200,phaseEnd=d.ti/(60/d.rate),points=[];
  for(let i=0;i<=N;i++){
   const phase=i/N;
   points.push({phase,p:sample(d,'Pressure',phase%1),v:sample(d,'Volume',phase%1),f:sample(d,'Flow',phase%1)});
  }
  const pressureMin=kind==='PV'?Math.min(-4,d.controlled?0:-4):0;
  const pressureMax=Math.max(14,(d.pip||8)*1.22);
  const volumeMax=Math.max(50,d.vt*1.2);
  const flowMax=Math.max(.15,...points.map(p=>Math.abs(p.f)))*1.2;
  const xmin=kind==='PV'?pressureMin:0,xmax=kind==='PV'?pressureMax:volumeMax;
  const ymin=kind==='PV'?0:-flowMax,ymax=kind==='PV'?volumeMax:flowMax;
  const x=v=>margin.left+(v-xmin)/(xmax-xmin)*pw;
  const y=v=>margin.top+ph-(v-ymin)/(ymax-ymin)*ph;
  ctx.font='10px system-ui,-apple-system,sans-serif';
  ctx.strokeStyle='#1d3643';ctx.fillStyle='#9db8c6';ctx.lineWidth=1;
  for(let i=0;i<=4;i++){
   const xx=margin.left+pw*i/4,yy=margin.top+ph*i/4;
   ctx.beginPath();ctx.moveTo(xx,margin.top);ctx.lineTo(xx,margin.top+ph);ctx.stroke();
   ctx.beginPath();ctx.moveTo(margin.left,yy);ctx.lineTo(margin.left+pw,yy);ctx.stroke();
   const xValue=xmin+(xmax-xmin)*i/4,yValue=ymax-(ymax-ymin)*i/4;
   ctx.textAlign='center';ctx.fillText(fmt(xValue,xmax>50?0:1),xx,margin.top+ph+14);
   ctx.textAlign='right';ctx.fillText(fmt(yValue,Math.abs(ymax)>50?0:2),margin.left-5,yy+3);
  }
  ctx.strokeStyle='#607988';ctx.beginPath();
  ctx.moveTo(margin.left,margin.top);ctx.lineTo(margin.left,margin.top+ph);ctx.lineTo(margin.left+pw,margin.top+ph);ctx.stroke();
  if(kind==='FV'){
   ctx.strokeStyle='#66828c';ctx.setLineDash([4,3]);ctx.beginPath();ctx.moveTo(margin.left,y(0));ctx.lineTo(margin.left+pw,y(0));ctx.stroke();ctx.setLineDash([]);
  }
  ctx.fillStyle='#c2dce6';ctx.font='10px system-ui,-apple-system,sans-serif';ctx.textAlign='center';
  ctx.fillText(kind==='PV'?'Pressione vie aeree (cmH₂O)':'Volume (mL)',margin.left+pw/2,h-4);
  ctx.textAlign='left';ctx.fillText(kind==='PV'?'Volume (mL)':'Flusso (L/s)',margin.left,11);
  const toPoint=p=>kind==='PV'?[x(p.p),y(p.v)]:[x(p.v),y(p.f)];
  const drawLimb=(limb,color)=>{
   const list=points.filter(p=>limb==='insp'?p.phase<=phaseEnd:p.phase>=phaseEnd);
   if(list.length<2)return;
   ctx.strokeStyle=color;ctx.lineWidth=2.3;ctx.lineJoin='round';ctx.beginPath();
   list.forEach((p,i)=>{const xy=toPoint(p);if(i===0)ctx.moveTo(...xy);else ctx.lineTo(...xy)});
   ctx.stroke();
   const mid=Math.floor(list.length*.58);
   drawArrow(ctx,toPoint(list[mid-2]),toPoint(list[mid]),color);
  };
  drawLimb('insp','#50d9f7');
  drawLimb('exp','#f6c966');
  const phase=((seconds/(60/d.rate))%1+1)%1;
  const p={p:sample(d,'Pressure',phase),v:sample(d,'Volume',phase),f:sample(d,'Flow',phase)};
  const marker=toPoint(p);
  ctx.fillStyle='#ffffff';ctx.strokeStyle='#071016';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(marker[0],marker[1],3.7,0,Math.PI*2);ctx.fill();ctx.stroke();
 }
 let waveSeconds=0,lastNow=performance.now(),lastDraw=0;
 function draw(now){
  const delta=clamp((now-lastNow)/1000,0,.25);lastNow=now;
  const paused=typeof simClock!=='undefined'&&simClock.paused;
  if(!paused)waveSeconds+=delta;
  if(now-lastDraw>=45){
   lastDraw=now;
   const d=lastData||calc();
   for(const [type,color] of [['Pressure','#ffd34e'],['Flow','#3bd6ff'],['Volume','#39ef8b']]){
    drawTimeWave(el('ventMain'+type),d,type,color,waveSeconds);
   }
   drawLoop(el('ventLoopPV'),d,'PV',waveSeconds);
   drawLoop(el('ventLoopFV'),d,'FV',waveSeconds);
   drawLoop(el('studentVentLoopPV'),d,'PV',waveSeconds);
   drawLoop(el('studentVentLoopFV'),d,'FV',waveSeconds);
  }
  requestAnimationFrame(draw);
 }
 function onControlsChanged(e){
  if(document.body.classList.contains('student'))return;
  if(e.target.id==='patientBreed'&&e.type==='change'&&el('patientMorph'))el('patientMorph').value=breedMorph[el('patientBreed').value]||'meso';
  if(typeof physiology==='function')physiology();else refresh();
  if(e.type==='change'&&typeof v25Event==='function'&&e.target.id.startsWith('vent'))v25Event('Ventilazione: '+(el('ventMode')?.value||'SPONT')+' · FR '+n('ventRate',12)+'/min · Vt '+n('ventVtKg',8)+' mL/kg · PEEP '+n('ventPeep',3)+' cmH₂O');
 }
 window.addEventListener('DOMContentLoaded',()=>{
  studentPanel();
  createPatientMirror();
  setupRespDisplay();
  for(const id of [...ventIds,'weight','patientAge','patientBreed','patientMorph','patientBodyType','patientBCS']){
   const field=el(id);if(!field)continue;
   field.addEventListener('change',onControlsChanged);
   if(id!=='patientBreed')field.addEventListener('input',onControlsChanged);
  }
  if(document.body.classList.contains('student')){
   window.addEventListener('storage',e=>{
    if(e.key==='recoverCaneState'||e.key==='recoverCaneStudentStatusV2891')refresh();
   });
  }
  refresh();
  requestAnimationFrame(draw);
 });
})();
