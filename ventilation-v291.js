/* V2.9.12 — ipoventilazione spontanea post-induzione e meccanica coerente. */
(function(){
 'use strict';
 const el=id=>document.getElementById(id);
 const n=(id,defaultValue)=>{const x=Number(el(id)?.value);return Number.isFinite(x)&&el(id)?.value!==''?x:defaultValue};
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const ventIds=['ventMode','ventRate','ventVtKg','ventPeep','ventPinsp','ventIE','ventFio2','ventHoldEnabled','ventHoldSeconds'];
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
  const chosen=el('ventMode')?.value||'SPONT';
  const intubated=typeof v25!=='undefined'&&v25.induction.phase==='maintenance';
  const postInduction=typeof v25!=='undefined'&&v25.induction.startedAt>0&&
   ['induction','maintenance'].includes(v25.induction.phase);
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
  const crs=clamp(weight*1.10*ageFactor*bcsFactor*morphFactor*bodyFactor,.45,160);
  const raw=clamp(8*Math.pow(weight/25,-.28)*(morph==='brachy'?1.65:morph==='dolicho'?.9:1)*(bcs>=7?1.12:1),1.5,100);
  const tau=raw*crs/1000; // R (cmH2O/(L/s)) * C (L/cmH2O) = secondi
  const vtSet=clamp(n('ventVtKg',8),4,15)*weight;
  const pinsp=clamp(n('ventPinsp',12),4,30);
  // Dopo una vera induzione EV la ventilazione spontanea e' depressa:
  // Vt medio inferiore (stima didattica), senza modificare VCV/PCV.
  let vt=controlled?(mode==='VCV'?vtSet:crs*pinsp*(1-Math.exp(-flowTi/Math.max(.03,tau)))):(postInduction?5.3:7)*weight;
  vt=clamp(vt,1,weight*22);
  const plateau=controlled?peep+vt/crs:null;
  const flow=controlled?(vt/1000)/Math.max(.1,flowTi):0;
  const pip=controlled?(mode==='VCV'?plateau+raw*flow:peep+pinsp):null;
  const driving=controlled?plateau-peep:null;
  // In assenza di pausa inspiratoria la Pplat non e' misurata:
  // il modello usa comunque la componente elastica per la fisiologia.
  const plateauMeasured=hold?plateau:null,drivingMeasured=hold?driving:null;
  // Cdyn = Vt / (PIP - PEEP), stima sotto ventilazione controllata.
  // Cstat = Vt / (Pplat - PEEP) richiede una pausa inspiratoria.
  // Raw = (PIP - Pplat) / flusso inspiratorio, applicabile qui
  // solo in VCV a flusso costante e con pausa; non in PCV decelerante.
  const cdyn=controlled&&pip>peep?vt/(pip-peep):null;
  const cstat=hold&&plateau>peep?vt/(plateau-peep):null;
  const rawMeasured=hold&&mode==='VCV'&&flow>0?(pip-plateau)/flow:null;
  const minute=vt/1000*rate,alveolarMinute=Math.max(.05,(vt-weight*2)/1000*rate);
  const pmean=controlled?peep+(plateau-peep)*ti/(ti+te)*.60:0;
  const preloadSensitivity=clamp(1+Math.max(0,100-(typeof phys!=='undefined'?phys.preload:100))*.012,1,1.9);
  const preloadFactor=controlled?clamp(1-.011*Math.max(0,pmean-2)*preloadSensitivity-.005*Math.max(0,(plateau||0)-19),.68,1):1;
  return {mode,chosen,intubated,postInduction,controlled,rate,peep,ie,ti,te,flowTi,hold,holdSeconds,fio2,weight,age,bcs,morph,bodyType,crs,raw,tau,vt,pip,plateau,driving,plateauMeasured,drivingMeasured,cdyn,cstat,rawMeasured,minute,alveolarMinute,pmean,preloadFactor};
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
  // Riepilogo sempre leggibile quando i campi sono richiusi.
  const compact=el('ventPatientCompact');
  if(compact){
   const weight=el('weight')?.value||'—',age=el('patientAge')?.value||'—';
   const breed=el('patientBreed')?.value||'Meticcio',bcs=el('patientBCS')?.value||'—';
   compact.textContent=weight+' kg · '+age+' anni · '+breed+' · BCS '+bcs+'/9';
  }
 }
 function createPatientMirror(){
  if(document.body.classList.contains('student'))return;
  const vent=el('ventilationPanel');
  if(!vent||!vent.parentElement||el('ventPatientCard'))return;
  // Come i salti temporali: i dati restano accessibili, ma sono chiusi
  // per impostazione predefinita e non occupano spazio durante il monitoraggio.
  const card=document.createElement('details');card.className='card vent-patient-card';card.id='ventPatientCard';
  card.innerHTML='<summary class="vent-patient-summary"><span class="vent-patient-summary-title">Dati paziente · ventilazione</span><span class="vent-patient-compact" id="ventPatientCompact">Paziente da impostare</span></summary>'+
   '<div class="vent-patient-content"><small style="color:var(--muted)">Modificabili anche qui; i valori restano sincronizzati con la scheda Paziente.</small><div class="cols" id="ventPatientFields" style="margin-top:9px"></div><div class="status" id="ventPatientContext" style="margin-top:8px"></div></div>';
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
  // I tracciati Paw, flusso, volume e i loop richiedono un tubo
  // endotracheale; la condizione e' condivisa con il monitor studenti.
  document.body.dataset.respIntubated=String(d.intubated);
  syncPatientCopies();
  // RR e' la frequenza del ventilatore (o spontanea, se non intubato).
  if(el('rr')&&Number(el('rr').value)!==d.rate)el('rr').value=d.rate;
  const vals={ventPip:fmt(d.pip),ventPplat:fmt(d.plateauMeasured),ventDriving:fmt(d.drivingMeasured),ventVt:fmt(d.vt,0),ventMinute:fmt(d.minute,2),ventCstat:fmt(d.cstat),ventCdyn:fmt(d.cdyn),ventRaw:fmt(d.rawMeasured),ventMainPip:fmt(d.pip),ventMainVolumeValue:fmt(d.vt,0),ventMainFlowValue:fmt(d.controlled?d.mode==='VCV'?d.vt/1000/d.flowTi:(d.pip-d.peep)/Math.max(1.5,d.raw):d.vt/1000*Math.PI/(2*d.ti),2)};
  for(const [id,value] of Object.entries(vals))if(el(id))el(id).textContent=value;
  const status=el('ventStatus');
  if(status)status.textContent=!d.intubated?'Paziente non intubato: tracciati Paw, flusso e volume non disponibili. Dopo l’intubazione si parte dalla respirazione spontanea.':d.controlled?d.mode+' attiva · PEEP '+fmt(d.peep,0)+' cmH₂O · I:E 1:'+d.ie+(d.hold?' · pausa inspiratoria '+fmt(d.holdSeconds,2)+' s':' · nessuna pausa inspiratoria'):'Paziente intubato · respirazione spontanea'+(d.postInduction?' con ipoventilazione post-induzione e possibile aumento dell’EtCO₂.':'')+' Seleziona VCV o PCV per attivare la ventilazione controllata.';
  const warning=[];
  if(d.controlled&&d.vt/d.weight>12)warning.push('Vt elevato per il peso');
  if(d.controlled&&d.vt/d.weight<5)warning.push('Vt ridotto');
  if(d.controlled&&d.plateau>25)warning.push('pressione di plateau elevata');
  if(d.controlled&&d.pip>30)warning.push('PIP elevata');
  const interpret=el('ventInterpretation');
  if(interpret)interpret.textContent='Vt '+fmt(d.vt/d.weight,1)+' mL/kg · FiO₂ '+Math.round(d.fio2*100)+'% · Cdyn '+fmt(d.cdyn)+' mL/cmH₂O. '+
   (d.hold?'Cstat '+fmt(d.cstat)+' mL/cmH₂O (pausa inspiratoria); driving pressure = Pplat − PEEP = '+fmt(d.drivingMeasured)+' cmH₂O. ':'Cstat, Pplat e driving pressure richiedono la pausa inspiratoria. ')+
   (d.rawMeasured!==null?'Raw '+fmt(d.rawMeasured)+' cmH₂O/(L/s), ricavata da (PIP − Pplat)/flusso in VCV. ':d.mode==='PCV'?'Raw non misurabile con questa formula in PCV a flusso decelerante. ':'Raw misurabile in VCV con pausa inspiratoria. ')+
   (warning.length?'Attenzione: '+warning.join(', ')+'. ':'')+'Stime del modello, non misurazioni cliniche.';
  if(el('ventMode'))el('ventMode').disabled=!d.intubated;
  if(el('ventVtKg'))el('ventVtKg').disabled=d.mode!=='VCV';
  if(el('ventPinsp'))el('ventPinsp').disabled=d.mode!=='PCV';
  if(el('ventPeep'))el('ventPeep').disabled=!d.controlled;
  if(el('ventHoldEnabled'))el('ventHoldEnabled').disabled=!d.controlled;
  if(el('ventHoldSeconds'))el('ventHoldSeconds').disabled=!d.hold;
  const patient=el('studentPhenotype');
  if(patient)patient.textContent=fmt(d.age,1)+' anni · '+(el('patientBreed')?.value||'Meticcio')+' · BCS '+d.bcs+'/9';
  for(const prefix of ['studentVent']){
   const root=el(prefix+'Readouts');
   if(!root)continue;
   for(const [key,value] of Object.entries({pip:fmt(d.pip),pplat:fmt(d.plateauMeasured),driving:fmt(d.drivingMeasured),vt:fmt(d.vt,0),minute:fmt(d.minute,2),cstat:fmt(d.cstat),cdyn:fmt(d.cdyn),raw:fmt(d.rawMeasured)})){
    const target=el(prefix+key.charAt(0).toUpperCase()+key.slice(1));if(target)target.textContent=value;
   }
   const headline=el(prefix+'Headline');
   if(headline)headline.textContent=d.controlled?d.mode+' · FR '+d.rate+'/min · PEEP '+fmt(d.peep,0)+' cmH₂O · FiO₂ '+Math.round(d.fio2*100)+'%'+(d.hold?' · pausa '+fmt(d.holdSeconds,2)+' s':' · senza pausa'):(d.intubated?'Ventilazione spontanea · intubato':'Paziente non intubato · spontanea');
  }
  return d;
 }
 window.simVentRefresh=refresh;
 // Richiamato nel momento esatto dell'intubazione, prima di pubblicare
 // lo stato alla finestra studenti: nessuna VCV/PCV implicita.
 window.simVentOnIntubation=()=>{
  const mode=el('ventMode');
  if(mode)mode.value='SPONT';
  if(typeof physiology==='function')physiology();
  else refresh();
 };
 function studentPanel(){
  const panel=el('student-panel-ventilation');if(!panel)return;
  // I dati clinici ventilatori sono gia' presenti sotto le onde, accanto
  // ai loop: non creare una seconda scheda con il riepilogo paziente.
  const headline=document.createElement('div');
  headline.id='studentVentHeadline';headline.className='status';
  headline.textContent='In attesa dei dati dalla console docente';
  const readouts=document.createElement('div');
  readouts.id='studentVentReadouts';readouts.className='vent-readouts';
  readouts.innerHTML=
   [['Pip','PIP','cmH₂O'],['Pplat','Pplat','cmH₂O'],['Driving','Driving P','cmH₂O'],['Vt','Vt','mL'],['Minute','V̇E','L/min'],['Cstat','Cstat','mL/cmH₂O'],['Cdyn','Cdyn','mL/cmH₂O'],['Raw','Raw','cmH₂O/(L/s)']]
   .map(x=>'<div><small>'+x[1]+'</small><b id="studentVent'+x[0]+'">—</b><small>'+x[2]+'</small></div>').join('');

  // Nella scheda studente i loop sono affiancati alle onde, uno sopra l'altro,
  // senza sottrarre spazio al riepilogo dei parametri ventilatori.
  const loops=document.createElement('section');loops.id='studentVentLoops';
  loops.className='student-vent-loops';loops.setAttribute('aria-label','Loop spirometrici');
  loops.innerHTML='<div class="vent-loop-grid">'+
   '<div class="vent-loop-card"><strong>Pressione / Volume</strong><canvas id="studentVentLoopPV" aria-label="Loop pressione volume"></canvas></div>'+
   '<div class="vent-loop-card"><strong>Flusso / Volume</strong><canvas id="studentVentLoopFV" aria-label="Loop flusso volume"></canvas></div></div>'+
   '<div class="vent-loop-legend"><span class="insp">● Inspirazione</span><span class="exp">● Espirazione</span></div>';
  const layout=el('studentVentLayout');
  if(layout)layout.append(loops);
  else panel.append(loops);
  // Sposta i valori gia' sincronizzati (non li duplica) nello spazio
  // sotto l'ultima onda della colonna sinistra, immediatamente sotto IBP.
  // La scheda ventilazione resta l'unica in cui questo riquadro compare.
  const waveColumn=layout?.querySelector('.student-vent-wave-column');
  if(waveColumn){
   const metrics=document.createElement('section');
   metrics.id='studentVentMetrics';
   metrics.className='student-vent-metrics';
   metrics.setAttribute('aria-label','Parametri ventilatori');
   const title=document.createElement('h3');
   title.textContent='Dati della ventilazione';
   metrics.append(title);
   if(headline)metrics.append(headline);
   metrics.append(readouts);
   waveColumn.append(metrics);
  }
 }
 function sample(d,type,phase){
  // Il campione alla fase 1 rappresenta la FINE dell'espirazione,
  // non l'inizio del respiro successivo: essenziale per chiudere i loop.
  const cycle=60/d.rate,t=clamp(phase,0,1)*cycle;
  const inspir=t<d.ti;
  const activeSeconds=Math.min(t,d.flowTi);
  const inspX=clamp(activeSeconds/Math.max(.05,d.flowTi),0,1);
  const expSeconds=clamp(t-d.ti,0,d.te);
  let volume=0,flow=0,pressure=0;
  if(d.controlled){
   if(inspir){
    const holdPhase=d.hold&&t>=d.flowTi;
    if(d.mode==='VCV'){
     volume=d.vt*inspX;
     flow=holdPhase?0:d.vt/1000/Math.max(.05,d.flowTi);
    }else{
     const tau=Math.max(.03,d.tau),den=Math.max(.00001,1-Math.exp(-d.flowTi/tau));
     volume=d.vt*(1-Math.exp(-activeSeconds/tau))/den;
     flow=holdPhase?0:d.vt/1000*Math.exp(-activeSeconds/tau)/(tau*den);
    }
    if(holdPhase)volume=d.vt;
    if(holdPhase){
     // Occlusione inspiratoria: caduta resistiva PIP -> Pplat.
     pressure=d.plateau+(d.pip-d.plateau)*Math.exp(-(t-d.flowTi)/.035);
    }else{
     pressure=d.mode==='PCV'?
      d.peep+(d.pip-d.peep)*Math.min(1,t/.07):
      d.peep+(d.plateau-d.peep)*inspX+(d.pip-d.plateau);
    }
   }else{
    // Espirazione passiva: volume e flusso sono derivata e integrale
    // della stessa curva; al termine del respiro tornano esattamente a zero.
    const tauE=Math.max(.12,d.tau*2),tail=Math.exp(-d.te/tauE);
    const decay=Math.exp(-expSeconds/tauE),den=Math.max(.00001,1-tail);
    const remaining=clamp((decay-tail)/den,0,1);
    const shapePower=1.15;
    volume=d.vt*Math.pow(remaining,shapePower);
    flow=remaining<=0?0:
     -d.vt/1000*shapePower*Math.pow(remaining,shapePower-1)*decay/(tauE*den);
    const tauP=Math.max(.08,d.tau),pressureTail=Math.exp(-d.te/tauP);
    pressure=d.peep+(d.plateau-d.peep)*clamp(
     (Math.exp(-expSeconds/tauP)-pressureTail)/Math.max(.00001,1-pressureTail),0,1);
   }
  }else{
   // Respiro spontaneo regolare: volume e flusso hanno estremi comuni
   // e il ciclo si chiude senza un salto artificiale.
   if(inspir){
    const u=clamp(t/Math.max(.1,d.ti),0,1);
    volume=d.vt*(1-Math.cos(Math.PI*u))/2;
    flow=d.vt/1000*Math.PI/(2*Math.max(.1,d.ti))*Math.sin(Math.PI*u);
   }else{
    const u=clamp(expSeconds/Math.max(.1,d.te),0,1);
    volume=d.vt*(1+Math.cos(Math.PI*u))/2;
    flow=-d.vt/1000*Math.PI/(2*Math.max(.1,d.te))*Math.sin(Math.PI*u);
   }
   // Pressione subatmosferica durante l'inspirazione spontanea,
   // lieve pressione positiva espiratoria; transizioni continue.
   pressure=inspir?-2*Math.sin(Math.PI*clamp(t/d.ti,0,1)):
    1.2*Math.sin(Math.PI*clamp(expSeconds/d.te,0,1));
  }
  if(type==='Volume')return volume;
  if(type==='Pressure')return pressure;
  return flow;
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
  const spontaneousPressure=type==='Pressure'&&!d.controlled;
  const baseline=spontaneousPressure?h*.50:type==='Flow'?h*.50:h*.88;
  ctx.moveTo(0,baseline);ctx.lineTo(w,baseline);ctx.stroke();
  ctx.strokeStyle=color;ctx.lineWidth=2;ctx.lineJoin='round';ctx.beginPath();
  const cycle=60/d.rate;
  const flowMax=Math.max(.15,d.vt/1000/Math.max(.1,d.flowTi)*3,d.mode==='PCV'?(d.pip-d.peep)/Math.max(1.5,d.raw)*1.15:0);
  const max=type==='Pressure'?(spontaneousPressure?4:Math.max(15,(d.pip||5)*1.2)):type==='Volume'?Math.max(50,d.vt*1.2):flowMax;
  const speed=typeof window.simClinicalWavePixelsPerSecond==='function'?window.simClinicalWavePixelsPerSecond(type):12.5*96/25.4;
  for(let x=0;x<w;x+=2){
   const phase=(((seconds+x/speed)/cycle)%1+1)%1,v=sample(d,type,phase);
   const y=type==='Flow'?h*.50-v/max*h*.38:spontaneousPressure?h*.50-v/max*h*.36:h*.90-v/max*h*.77;
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
  // Sistema di coordinate fisso 340 × 240: ridimensionando la finestra
  // cambia soltanto la scala uniforme, mai la forma del loop.
  const baseW=340,baseH=240,scale=Math.min(w/baseW,h/baseH);
  ctx.save();
  ctx.translate((w-baseW*scale)/2,(h-baseH*scale)/2);
  ctx.scale(scale,scale);
  const margin={left:47,right:12,top:19,bottom:37};
  const pw=baseW-margin.left-margin.right,ph=baseH-margin.top-margin.bottom;
  const N=180,phaseEnd=d.ti/(60/d.rate);
  // Campionamento separato dei due rami, con entrambi gli estremi:
  // niente campioni mancanti all'inversione inspirazione/espirazione.
  const makePoint=phase=>({
   phase,p:sample(d,'Pressure',phase),v:sample(d,'Volume',phase),f:sample(d,'Flow',phase)
  });
  const inspPoints=Array.from({length:N+1},(_,i)=>
   makePoint(i===N?Math.max(0,phaseEnd-1e-9):phaseEnd*i/N));
  const expPoints=Array.from({length:N+1},(_,i)=>
   makePoint(phaseEnd+(1-phaseEnd)*i/N));
  const points=inspPoints.concat(expPoints);
  // In spontanea la pressione oscilla intorno a zero: un asse -3/+3,5
  // evita di comprimere il loop P/V nella parte sinistra del grafico.
  const pressureMin=kind==='PV'?(d.controlled?-4:-3):0;
  const pressureMax=kind==='PV'?(d.controlled?Math.max(14,(d.pip||8)*1.22):3.5):1;
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
  ctx.fillText(kind==='PV'?'Pressione vie aeree (cmH₂O)':'Volume (mL)',margin.left+pw/2,baseH-4);
  ctx.textAlign='left';ctx.fillText(kind==='PV'?'Volume (mL)':'Flusso (L/s)',margin.left,11);
  const toPoint=p=>kind==='PV'?[x(p.p),y(p.v)]:[x(p.v),y(p.f)];
  const drawLimb=(list,color)=>{
   ctx.strokeStyle=color;ctx.lineWidth=2.3;ctx.lineJoin='round';ctx.beginPath();
   list.forEach((p,i)=>{const xy=toPoint(p);if(i===0)ctx.moveTo(...xy);else ctx.lineTo(...xy)});
   ctx.stroke();
   const mid=Math.floor(list.length*.58);
   drawArrow(ctx,toPoint(list[mid-2]),toPoint(list[mid]),color);
  };
  // I due brevi tratti di commutazione (valvola insp/esp) fanno
  // parte del ciclo: senza di essi i loop rimarrebbero visivamente aperti.
  const join=(a,b,color)=>{
   const p1=toPoint(a),p2=toPoint(b);
   ctx.strokeStyle=color;ctx.lineWidth=2.2;ctx.beginPath();
   ctx.moveTo(...p1);ctx.lineTo(...p2);ctx.stroke();
  };
  drawLimb(inspPoints,'#50d9f7');
  join(inspPoints[inspPoints.length-1],expPoints[0],'#50d9f7');
  drawLimb(expPoints,'#f6c966');
  join(expPoints[expPoints.length-1],inspPoints[0],'#f6c966');
  const phase=((seconds/(60/d.rate))%1+1)%1;
  const p={p:sample(d,'Pressure',phase),v:sample(d,'Volume',phase),f:sample(d,'Flow',phase)};
  const marker=toPoint(p);
  ctx.fillStyle='#ffffff';ctx.strokeStyle='#071016';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(marker[0],marker[1],3.7,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.restore();
 }
 let waveSeconds=0,lastNow=performance.now(),lastDraw=0;
 function draw(now){
  const delta=clamp((now-lastNow)/1000,0,.25);lastNow=now;
  const paused=typeof simClock!=='undefined'&&simClock.paused;
  if(!paused)waveSeconds+=delta;
  if(now-lastDraw>=45){
   lastDraw=now;
   const d=lastData||calc();
   // Condividiamo la stessa base temporale del monitor ECG/ART/EtCO2.
   const timeline=Number.isFinite(window.simWaveTimeSeconds)?window.simWaveTimeSeconds:waveSeconds;
   for(const [type,color] of [['Pressure','#ffd34e'],['Flow','#3bd6ff'],['Volume','#39ef8b']]){
    drawTimeWave(el('ventMain'+type),d,type,color,timeline);
   }
   drawLoop(el('ventLoopPV'),d,'PV',timeline);
   drawLoop(el('ventLoopFV'),d,'FV',timeline);
   drawLoop(el('studentVentLoopPV'),d,'PV',timeline);
   drawLoop(el('studentVentLoopFV'),d,'FV',timeline);
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
