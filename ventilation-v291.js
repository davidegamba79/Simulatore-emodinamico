/* V2.9.1 — modello cardiopolmonare didattico: non validato per decisioni cliniche. */
(function(){
 'use strict';
 const el=id=>document.getElementById(id);
 const n=(id,defaultValue)=>{const x=Number(el(id)?.value);return Number.isFinite(x)&&el(id)?.value!==''?x:defaultValue};
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const ventIds=['ventMode','ventRate','ventVtKg','ventPeep','ventPinsp','ventIE','ventFio2','ventCompliance','ventResistance'];
 const fmt=(v,decimals=1)=>Number.isFinite(v)?v.toFixed(decimals).replace('.',','):'—';
 const breedMorph={
  'Bulldog francese':'brachy','Bulldog inglese':'brachy','Carlino':'brachy',
  'Boxer':'brachy','Cavalier King Charles':'brachy','Chihuahua':'meso',
  'Levriero':'dolicho','Pastore tedesco':'meso','Bassotto':'meso'
 };
 let lastData=null;
 function calc(){
  const weight=clamp(n('weight',25),1,100),age=clamp(n('patientAge',6),.1,22),bcs=clamp(n('patientBCS',5),1,9);
  const morph=el('patientMorph')?.value||'meso';
  const chosen=el('ventMode')?.value||'VCV';
  const intubated=typeof v25!=='undefined'&&v25.induction.phase==='maintenance';
  const controlled=intubated&&chosen!=='SPONT',mode=controlled?chosen:'SPONT';
  const rate=clamp(n('ventRate',12),4,50),peep=controlled?clamp(n('ventPeep',3),0,18):0;
  const ie=clamp(n('ventIE',2),1,3),fio2=clamp(n('ventFio2',.5),.21,1);
  const ti=60/rate/(1+ie),te=60/rate-ti;
  // Crs specifica iniziale ~0,75 mL/(kg*cmH2O), modificata da fenotipo e controlli.
  // Sono coefficienti dimostrativi, NON valori di riferimento per razze specifiche.
  const ageFactor=age<1?.90:age>8?clamp(1-.018*(age-8),.76,1):1;
  const bcsFactor=bcs>=6?clamp(1-.075*(bcs-5),.65,1):bcs<=3?.94:1;
  const morphFactor=morph==='brachy'?.86:morph==='dolicho'?1.04:1;
  const crs=clamp(weight*.75*ageFactor*bcsFactor*morphFactor*clamp(n('ventCompliance',100)/100,.4,1.6),.45,160);
  const raw=clamp(8*Math.pow(weight/25,-.28)*(morph==='brachy'?1.65:morph==='dolicho'?.9:1)*(bcs>=7?1.12:1)*clamp(n('ventResistance',100)/100,.5,2.5),1.5,100);
  const tau=raw*crs/1000; // R (cmH2O/(L/s)) * C (L/cmH2O) = secondi
  const vtSet=clamp(n('ventVtKg',8),4,15)*weight;
  const pinsp=clamp(n('ventPinsp',12),4,30);
  let vt=controlled?(mode==='VCV'?vtSet:crs*pinsp*(1-Math.exp(-ti/Math.max(.03,tau)))):7*weight;
  vt=clamp(vt,1,weight*22);
  const plateau=controlled?peep+vt/crs:null;
  const flow=controlled?(vt/1000)/Math.max(.25,ti):0;
  const pip=controlled?(mode==='VCV'?plateau+raw*flow:peep+pinsp):null;
  const driving=controlled?plateau-peep:null;
  const minute=vt/1000*rate,alveolarMinute=Math.max(.05,(vt-weight*2)/1000*rate);
  const pmean=controlled?peep+(plateau-peep)*ti/(ti+te)*.60:0;
  const preloadSensitivity=clamp(1+Math.max(0,100-(typeof phys!=='undefined'?phys.preload:100))*.012,1,1.9);
  const preloadFactor=controlled?clamp(1-.011*Math.max(0,pmean-2)*preloadSensitivity-.005*Math.max(0,(plateau||0)-19),.68,1):1;
  return {mode,chosen,intubated,controlled,rate,peep,ie,ti,te,fio2,weight,age,bcs,morph,crs,raw,tau,vt,pip,plateau,driving,minute,alveolarMinute,pmean,preloadFactor};
 }
 window.simVentCalc=calc;
 window.simVentValid=()=>{
  const d=calc(),rh=el('rhythm')?.value||'';
  const regular=['Ritmo sinusale','Bradicardia sinusale','Tachicardia sinusale','Blocco AV I grado'].includes(rh);
  return d.controlled&&regular&&d.vt/d.weight>=7&&n('hr',80)/d.rate>=3.6;
 };
 window.simVentSettings=()=>Object.fromEntries(ventIds.map(id=>[id,el(id)?.value??'']));
 window.simVentApplySettings=settings=>{
  if(!settings||typeof settings!=='object')return;
  for(const id of ventIds)if(settings[id]!=null&&el(id))el(id).value=settings[id];
  refresh();
 };
 function refresh(){
  const d=calc();lastData=d;
  // RR e' la frequenza del ventilatore (o spontanea, se non intubato).
  if(el('rr')&&Number(el('rr').value)!==d.rate)el('rr').value=d.rate;
  const vals={ventPip:fmt(d.pip),ventPplat:fmt(d.plateau),ventDriving:fmt(d.driving),ventVt:fmt(d.vt,0),ventMinute:fmt(d.minute,2),ventCrs:fmt(d.crs)};
  for(const [id,value] of Object.entries(vals))if(el(id))el(id).textContent=value;
  const status=el('ventStatus');
  if(status)status.textContent=!d.intubated?'Paziente non intubato: respirazione spontanea nel modello. VCV/PCV saranno attive dopo l’intubazione.':d.controlled?d.mode+' attiva · PEEP '+fmt(d.peep,0)+' cmH₂O · I:E 1:'+d.ie:'Paziente intubato · ventilazione spontanea.';
  const warning=[];
  if(d.controlled&&d.vt/d.weight>12)warning.push('Vt elevato per il peso');
  if(d.controlled&&d.vt/d.weight<5)warning.push('Vt ridotto');
  if(d.controlled&&d.plateau>25)warning.push('pressione di plateau elevata');
  if(d.controlled&&d.pip>30)warning.push('PIP elevata');
  const interpret=el('ventInterpretation');
  if(interpret)interpret.textContent='Crs stimata '+fmt(d.crs/d.weight,2)+' mL/kg/cmH₂O · R vie aeree '+fmt(d.raw)+' cmH₂O/(L/s) · Vt '+fmt(d.vt/d.weight,1)+' mL/kg · FiO₂ '+Math.round(d.fio2*100)+'%. '+(warning.length?'Attenzione: '+warning.join(', ')+'. ':'')+'Stime didattiche, non valori clinici di riferimento.';
  if(el('ventVtKg'))el('ventVtKg').disabled=d.mode!=='VCV';
  if(el('ventPinsp'))el('ventPinsp').disabled=d.mode!=='PCV';
  if(el('ventPeep'))el('ventPeep').disabled=!d.controlled;
  const patient=el('studentPhenotype');
  if(patient)patient.textContent=fmt(d.age,1)+' anni · '+(el('patientBreed')?.value||'Meticcio')+' · BCS '+d.bcs+'/9';
  for(const prefix of ['studentVent']){
   const root=el(prefix+'Readouts');
   if(!root)continue;
   for(const [key,value] of Object.entries({pip:fmt(d.pip),pplat:fmt(d.plateau),driving:fmt(d.driving),vt:fmt(d.vt,0),minute:fmt(d.minute,2),crs:fmt(d.crs)})){
    const target=el(prefix+key.charAt(0).toUpperCase()+key.slice(1));if(target)target.textContent=value;
   }
   const headline=el(prefix+'Headline');
   if(headline)headline.textContent=d.controlled?d.mode+' · FR '+d.rate+'/min · PEEP '+fmt(d.peep,0)+' cmH₂O · FiO₂ '+Math.round(d.fio2*100)+'%':(d.intubated?'Ventilazione spontanea · intubato':'Paziente non intubato · spontanea');
  }
  return d;
 }
 window.simVentRefresh=refresh;
 function studentPanel(){
  const panel=el('student-panel-ventilation');if(!panel)return;
  const card=document.createElement('section');card.className='card';
  card.innerHTML='<h2>Ventilazione · monitor di sola lettura</h2><div id="studentVentHeadline" class="status">In attesa dei dati dalla console docente</div>'+
   '<div class="vent-readouts" id="studentVentReadouts">'+
   [['Pip','PIP','cmH₂O'],['Pplat','Pplat','cmH₂O'],['Driving','Driving P','cmH₂O'],['Vt','Vt','mL'],['Minute','V̇E','L/min'],['Crs','Crs','mL/cmH₂O']].map(x=>'<div><small>'+x[1]+'</small><b id="studentVent'+x[0]+'">—</b><small>'+x[2]+'</small></div>').join('')+'</div>'+
   '<div class="vent-wave-stack">'+
   [['Pressure','Pressione vie aeree'],['Flow','Flusso'],['Volume','Volume']].map(x=>'<div><small>'+x[1]+'</small><canvas id="studentVentWave'+x[0]+'"></canvas></div>').join('')+'</div>'+
   '<small style="display:block;margin-top:10px;color:var(--muted)">Valori e curve prodotti dal modello didattico semplificato; PIP non dedotta dalla sola razza.</small>';
  panel.append(card);
 }
 function sample(d,type,phase){
  const insp=1/(1+d.ie),inspir=phase<insp,x=inspir?phase/insp:(phase-insp)/(1-insp);
  const volume=d.controlled?(inspir?(d.mode==='PCV'?d.vt*(1-Math.exp(-d.ti*x/Math.max(.03,d.tau)))/(1-Math.exp(-d.ti/Math.max(.03,d.tau))):d.vt*x):d.vt*Math.exp(-d.te*x/Math.max(.15,d.tau*2))):(inspir?d.vt*Math.sin(Math.PI*x/2):d.vt*Math.cos(Math.PI*x/2));
  if(type==='Volume')return volume;
  if(type==='Pressure'){
   if(!d.controlled)return -2*Math.sin(Math.PI*phase*2);
   if(inspir)return d.mode==='PCV'?d.peep+(d.pip-d.peep)*Math.min(1,x*10):d.peep+(d.plateau-d.peep)*x+(d.pip-d.plateau);
   return d.peep+(d.plateau-d.peep)*Math.exp(-d.te*x/Math.max(.1,d.tau));
  }
  if(d.controlled){
   if(inspir)return d.mode==='VCV'?d.vt/1000/d.ti:d.vt/1000/d.ti*2.5*Math.exp(-3*x);
   return -d.vt/1000/Math.max(.12,d.tau*2)*Math.exp(-d.te*x/Math.max(.12,d.tau*2));
  }
  return inspir?d.vt/1000/d.ti*Math.sin(Math.PI*x):-d.vt/1000/d.te*Math.sin(Math.PI*x);
 }
 let waveSeconds=0,lastNow=performance.now(),lastDraw=0;
 function draw(now){
  const delta=clamp((now-lastNow)/1000,0,.25);lastNow=now;
  const paused=typeof simClock!=='undefined'&&simClock.paused;
  if(!paused)waveSeconds+=delta;
  if(!paused&&now-lastDraw>40){
   lastDraw=now;const d=lastData||calc();
   for(const prefix of ['ventWave','studentVentWave']){
    for(const [type,color] of [['Pressure','#ffd34e'],['Flow','#3bd6ff'],['Volume','#39ef8b']]){
     const canvas=el(prefix+type);if(!canvas||canvas.offsetParent===null)continue;
     const rect=canvas.getBoundingClientRect(),w=Math.max(1,rect.width),h=Math.max(1,rect.height),pixelRatio=Math.min(2,window.devicePixelRatio||1);
     canvas.width=Math.round(w*pixelRatio);canvas.height=Math.round(h*pixelRatio);
     const ctx=canvas.getContext('2d');ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
     ctx.clearRect(0,0,w,h);ctx.strokeStyle='#23404d';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,h*.82);ctx.lineTo(w,h*.82);ctx.stroke();
     ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();
     const max=type==='Pressure'?Math.max(15,(d.pip||5)*1.2):type==='Volume'?Math.max(50,d.vt*1.2):Math.max(.15,d.vt/1000/d.ti*3);
     for(let x=0;x<w;x+=2){
      const phase=((waveSeconds+x/w*9)/(60/d.rate))%1,v=sample(d,type,phase);
      const y=type==='Flow'?h*.50-v/max*h*.38:h*.90-v/max*h*.77;
      if(x===0)ctx.moveTo(x,clamp(y,2,h-2));else ctx.lineTo(x,clamp(y,2,h-2));
     }
     ctx.stroke();
    }
   }
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
  for(const id of [...ventIds,'weight','patientAge','patientBreed','patientMorph','patientBCS']){
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
