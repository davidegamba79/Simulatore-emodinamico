
const $=id=>document.getElementById(id);
const keys=['ecg','capno','art','pleth','hemo'];
const labels={ecg:'ECG',capno:'EtCO₂',art:'Pressione invasiva ART',pleth:'SpO₂',hemo:'MostCare Up / PRAM'};
let active=Object.fromEntries(keys.map(k=>[k,true]));
let state={hr:80,etco2:33,rr:12,sap:118,dap:68,spo2:98,
co:3.2,ci:3.1,sv:36,svi:35,svr:1800,svri:1850,ppv:8,svv:9,dpdt:0.95,cce:0.35,ea:2.1,cpo:0.70};
const hemoDefs=[['co','CO','L/min'],['ci','CI','L/min/m²'],['sv','SV','mL'],['svi','SVI','mL/m²'],['svr','SVR','dyn·s/cm⁵'],['svri','SVRI','dyn·s·m²/cm⁵'],['ppv','PPV','%'],['svv','SVV','%'],['dpdt','dP/dtmax','mmHg/ms'],['cce','CCE',''],['ea','Ea','mmHg/mL'],['cpo','CPO','W']];
$('toggles').innerHTML=keys.map(k=>`<div class="toggle"><span>${labels[k]}</span><input type="checkbox" data-toggle="${k}"></div>`).join('');
$('hemoInputs').innerHTML=hemoDefs.map(([k,l,u])=>`<label>${l} ${u?`(${u})`:''}<input id="${k}" type="number" step="any" value="${state[k]}"></label>`).join('');
$('hemoMetrics').innerHTML=hemoDefs.map(([k,l,u])=>`<div class="metric"><small>${l}</small><b id="m_${k}">${state[k]}</b><small>${u}</small></div>`).join('');

function map(){return Math.round((+state.sap+2*(+state.dap))/3)}
function render(){
 state.hr=+$('hr').value; $('hrOut').textContent=state.hr;
 ['etco2','rr','sap','dap','spo2',...hemoDefs.map(x=>x[0])].forEach(k=>state[k]=+$(k).value);
 $('vhr').textContent=state.hr;$('vet').textContent=(+state.etco2).toFixed(1).replace('.0','');$('vrr').textContent=state.rr;
 $('vart').textContent=`${state.sap}/${state.dap}`;$('vmap').textContent=map();$('vspo2').textContent=state.spo2;
 hemoDefs.forEach(([k])=>$('m_'+k).textContent=state[k]);
 $('studentPatient').textContent=$('name').value;$('studentWeight').textContent=$('weight').value;
 document.querySelectorAll('[data-key]').forEach(el=>{let k=el.dataset.key;el.style.display=active[k]?'':'none'});
 save();
}
function save(){localStorage.setItem('recoverCaneState',JSON.stringify({state,active,name:$('name').value,weight:$('weight').value,rhythm:$('rhythm').value,caseState:typeof caseState!=='undefined'?caseState:null,casePresentation:(typeof caseState!=='undefined'&&caseState.active)?clinicalCases[caseState.key].presentation:'',caseEvolutionText:(typeof caseState!=='undefined'&&caseState.active)?caseEvolution():''}))}
function setActive(v){keys.forEach(k=>active[k]=v);document.querySelectorAll('[data-toggle]').forEach(x=>x.checked=v);render()}
document.querySelectorAll('input,select').forEach(x=>{
 if(!['preload','contractility','vascularTone','compliance','v25FluidRate','v25DobRate','v25NorRate','v25AtDose','v25Metric','v25Window'].includes(x.id)) x.addEventListener('input',render)
});
document.querySelectorAll('[data-toggle]').forEach(x=>x.addEventListener('change',e=>{active[e.target.dataset.toggle]=e.target.checked;render()}));
$('allOn').onclick=()=>setActive(true);$('allOff').onclick=()=>setActive(false);

const presets={
'Paziente anestetizzato':{hr:80,etco2:33,rr:12,sap:98,dap:48,co:2.88,ci:3.34,sv:36,svr:1800,ppv:8,svv:9,dpdt:0.79,cce:.32,ea:2.45,cpo:.42},
'Bradicardia':{hr:45,co:2.1,sv:47,sap:105,dap:62},
'Tachicardia':{hr:180,co:3.5,sv:20,sap:105,dap:65},
'PEA 80':{hr:80,sap:45,dap:25,co:.8,etco2:12,cpo:.08},
'TV senza polso 220':{hr:220,sap:25,dap:15,co:.2,etco2:8,cpo:.02},
'Massaggio cardiaco 120':{hr:120,sap:55,dap:25,co:1.0,etco2:12},
'CPR EtCO₂ basso':{hr:120,etco2:8,sap:45,dap:20,co:.7},
'CPR EtCO₂ migliore':{hr:120,etco2:18,sap:60,dap:30,co:1.2},
'CPR ROSC imminente':{hr:120,etco2:32,sap:75,dap:40,co:1.8},
'ROSC':{hr:105,etco2:38,sap:105,dap:60,co:2.8,ci:2.7,sv:27,ppv:10,svv:11,cpo:.55},
'Ipovolemia':{hr:150,sap:82,dap:48,co:1.8,ci:1.8,sv:12,svr:2400,ppv:22,svv:24,dpdt:0.8,cce:.18,ea:3.0,cpo:.30},
'Vasodilatazione':{hr:130,sap:75,dap:35,co:3.8,svr:750,ppv:9,svv:10,ea:1.1,cpo:.42},
'Bassa contrattilità':{hr:120,sap:78,dap:50,co:1.6,sv:13,dpdt:0.42,cce:.10,cpo:.25},
'Fluid responsive':{hr:140,sap:88,dap:50,co:2.0,sv:14,ppv:20,svv:22},
'Dopo fluid challenge':{hr:115,sap:108,dap:62,co:3.0,sv:26,ppv:9,svv:10},
'Dopo vasopressore':{hr:105,sap:120,dap:72,co:2.8,svr:2100,ea:2.6}
};
$('presets').innerHTML=Object.keys(presets).map(p=>`<button data-p="${p}">${p}</button>`).join('');
function applyPreset(p){let o=presets[p];Object.entries(o).forEach(([k,v])=>setNum(k,v));if(p==='Paziente anestetizzato'){phys={preload:100,contractility:100,vascularTone:100,compliance:100};setPhysInputs();$('mac').value=1;$('macOut').textContent='1,0';if(typeof v25!=='undefined'){v25.base={preload:100,contractility:100,vascularTone:100,hr:80};v25.fx={preload:0,contractility:0,tone:0,hr:0};v25.etRef=33;v25.etEffective=33}}if(p.includes('PEA'))$('rhythm').value='PEA / attività elettrica';else if(p.includes('TV'))$('rhythm').value='Tachicardia ventricolare';else if(p.includes('Massaggio')||p.includes('CPR'))$('rhythm').value='Artefatto massaggio cardiaco 120/min';else $('rhythm').value='Ritmo sinusale';render()}
document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>applyPreset(b.dataset.p));



const clinicalCases={
 hemorrhagic:{
  title:'Shock emorragico',presentation:'Cane, addome acuto post-traumatico. Mucose pallide, polso periferico debole, estremità fredde.',
  start:{preload:50,contractility:110,vascularTone:140,compliance:95,hr:150,etco2:33,rr:12,spo2:94},
  drift:{preload:-7,contractility:-2,vascularTone:3,hr:5},
  preferred:['fluid'], harmful:['vasodilator']
 },
 distributive:{
  title:'Shock distributivo / vasoplegico',presentation:'Cane con quadro infiammatorio sistemico. Polsi inizialmente ampi, mucose iperemiche, ipotensione.',
  start:{preload:75,contractility:105,vascularTone:50,compliance:112,hr:140,etco2:33,rr:12,spo2:95},
  drift:{preload:-3,contractility:-3,vascularTone:-4,hr:3},
  preferred:['pressor','fluid'], harmful:[]
 },
 myocardial:{
  title:'Depressione miocardica',presentation:'Cane debole e dispnoico. Polsi piccoli, perfusione periferica ridotta; pressione arteriosa bassa.',
  start:{preload:115,contractility:40,vascularTone:120,compliance:90,hr:140,etco2:33,rr:12,spo2:91},
  drift:{preload:2,contractility:-5,vascularTone:2,hr:2},
  preferred:['inotrope','oxygen'], harmful:['fluid']
 },
 arrest:{
  title:'Arresto cardiaco / PEA',presentation:'Paziente improvvisamente non responsivo, apnea e assenza di polso palpabile.',
  start:{preload:60,contractility:20,vascularTone:80,compliance:100,hr:80,etco2:33,rr:12,spo2:70},
  drift:{preload:-2,contractility:-2,vascularTone:-3,hr:0},
  preferred:['cpr','pressor'], harmful:['shock']
 }
};
let caseState={active:false,key:'',minute:0,score:0,actions:[],cpr:false};
function setNum(id,v){
 if(id==='etco2'){if($('etco2Set'))$('etco2Set').value=v;if($('etco2'))$('etco2').value=v;if(typeof v25!=='undefined'){v25.etRef=+v;v25.etEffective=+v}return}
 if($(id))$(id).value=v
}
function caseApplyStart(c){
 $('mac').value=1;$('macOut').textContent='1,0';
 phys.preload=c.start.preload;phys.contractility=c.start.contractility;phys.vascularTone=c.start.vascularTone;phys.compliance=c.start.compliance;
 ['hr','etco2','rr','spo2'].forEach(k=>setNum(k,c.start[k]));
 if(typeof v25!=='undefined'){v25.base={preload:phys.preload,contractility:phys.contractility,vascularTone:phys.vascularTone,hr:+$('hr').value||80};v25.fx={preload:0,contractility:0,tone:0,hr:0};}
 setPhysInputs();physiology();
}
function caseStatus(msg){
 let c=clinicalCases[caseState.key];
 $('caseInstructor').innerHTML=`<b>${c.title}</b> · minuto ${caseState.minute} · punteggio didattico <span class="case-score">${caseState.score}</span><br>${c.presentation}`;
 $('caseFeedback').textContent=msg;
 $('studentCaseMinute').textContent=caseState.minute;$('studentCasePresentation').textContent=c.presentation;
 $('studentCaseEvolution').textContent=caseEvolution();
 $('studentCaseBanner').style.display='block';
 save();
}
function caseEvolution(){
 let m=map(),co=+state.co,et=+state.etco2;
 if(caseState.key==='arrest'&&!caseState.cpr)return 'Paziente non responsivo. Nessun polso palpabile.';
 if(m<45||co<1)return 'Perfusione gravemente compromessa. Il paziente sta peggiorando.';
 if(m<60||co<1.8)return 'Perfusione ridotta. Parametri ancora instabili.';
 if(m>=65&&co>=2.2&&et>=25)return 'I parametri mostrano un miglioramento emodinamico.';
 return 'Condizioni emodinamiche intermedie: rivalutare la risposta agli interventi.';
}
function startClinicalCase(){
 let k=$('caseSelect').value;if(!k){$('caseFeedback').textContent='Seleziona prima un caso clinico.';return}
 caseState={active:true,key:k,minute:0,score:0,actions:[],cpr:false};caseApplyStart(clinicalCases[k]);
 if(k==='arrest')$('rhythm').value='PEA / attività elettrica'; else $('rhythm').value='Tachicardia sinusale';
 caseStatus('Caso avviato. Diagnosi visibile solo all’istruttore.');
}
function advanceClinicalCase(){
 if(!caseState.active)return;
 let c=clinicalCases[caseState.key],d=c.drift;caseState.minute++;
 phys.preload=clamp(phys.preload+(d.preload||0),20,180);phys.contractility=clamp(phys.contractility+(d.contractility||0),20,180);
 phys.vascularTone=clamp(phys.vascularTone+(d.vascularTone||0),30,180);
 if(d.hr)setNum('hr',clamp(+$('hr').value+d.hr,0,260));if(d.etco2)setNum('etco2',clamp(+$('etco2').value+d.etco2,3,60));
 setPhysInputs();physiology();caseStatus('È trascorso 1 minuto senza un nuovo intervento.');
}
function caseAction(a){
 if(!caseState.active){$('caseFeedback').textContent='Avvia prima un caso clinico.';return}
 let c=clinicalCases[caseState.key],good=c.preferred.includes(a),bad=c.harmful.includes(a);
 caseState.actions.push(a);caseState.score+=good?2:bad?-2:0;
 let msg='';
 if(a==='fluid'){phys.preload=clamp(phys.preload+22,20,180);msg='Somministrato bolo di fluidi.'}
 if(a==='pressor'){phys.vascularTone=clamp(phys.vascularTone+30,30,180);msg='Somministrato vasopressore.'}
 if(a==='inotrope'){phys.contractility=clamp(phys.contractility+30,20,180);msg='Somministrato inotropo.'}
 if(a==='oxygen'){setNum('spo2',clamp(+$('spo2').value+6,0,100));setNum('etco2',clamp(+$('etco2').value+3,3,60));msg='Ottimizzata ossigenazione/ventilazione.'}
 if(a==='cpr'){caseState.cpr=true;setNum('hr',120);$('rhythm').value='Artefatto massaggio cardiaco 120/min';phys.contractility=48;phys.preload=clamp(phys.preload+8,20,180);setNum('etco2',Math.max(12,+$('etco2').value));msg='CPR iniziata.'}
 if(a==='shock'){msg='Defibrillazione eseguita.'; if(caseState.key==='arrest'){caseState.score-=2;msg+=' Il ritmo iniziale è PEA: rivalutare l’indicazione alla defibrillazione.'}}
 setPhysInputs();physiology();logEvent('Caso clinico: '+msg);caseStatus(msg+(good?' Risposta emodinamica favorevole.':bad?' Risposta non favorevole.':' Rivalutare i parametri.'));
}
function endClinicalCase(){
 if(!caseState.active)return;
 let outcome=caseEvolution();$('caseFeedback').textContent=`Caso terminato — ${outcome} Punteggio didattico: ${caseState.score}.`;
 caseState.active=false;$('studentCaseEvolution').textContent='Caso terminato.';save();
}
$('startCase').onclick=startClinicalCase;$('advanceCase').onclick=advanceClinicalCase;$('endCase').onclick=endClinicalCase;
$('caseFluid').onclick=()=>caseAction('fluid');$('casePressor').onclick=()=>caseAction('pressor');$('caseInotrope').onclick=()=>caseAction('inotrope');
$('caseOxygen').onclick=()=>caseAction('oxygen');$('caseCPR').onclick=()=>caseAction('cpr');$('caseShock').onclick=()=>caseAction('shock');

let phys={preload:100,contractility:100,vascularTone:100,compliance:100};
let eventLines=[];
function logEvent(t){eventLines.unshift(new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})+' — '+t);eventLines=eventLines.slice(0,8);$('eventLog').innerHTML=eventLines.join('<br>')}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function setPhysInputs(){
 ['preload','contractility','vascularTone','compliance'].forEach(k=>{$(k).value=phys[k];$(k+'Out').textContent=Math.round(phys[k])+'%'})
}
function physiology(){
 if(!$('autoPhys').checked)return render();
 phys.preload=+$('preload').value;phys.contractility=+$('contractility').value;phys.vascularTone=+$('vascularTone').value;phys.compliance=+$('compliance').value;
 let P=phys.preload/100,mac=clamp(+$('mac').value||1,.6,2),md=mac-1,macC=Math.exp(-.28*md-.08*Math.max(md,0)*Math.max(md,0)),macV=Math.exp(-.35*md-.10*Math.max(md,0)*Math.max(md,0)),C=(phys.contractility/100)*macC,V=(phys.vascularTone/100)*macV,A=phys.compliance/100;window.macEffectiveContractility=C*100;window.macEffectiveTone=V*100;
 const calc=hr=>{hr=Math.max(1,hr);let filling=clamp(Math.pow(P,.72),.25,1.45),tp=hr>150?clamp(1-(hr-150)/350,.55,1):1,bf=hr<70?clamp(1+(70-hr)/250,1,1.16):1,ap=clamp(Math.pow(V,-.22),.72,1.22),sv=clamp(36*filling*Math.pow(C,.78)*ap*tp*bf,5,70),co=clamp(sv*hr/1000,.25,7.5),svr=clamp(1800*V,450,3400),map=clamp(co*svr/80,20,155),pp=clamp((sv/36)*(50/A),12,85),dap=clamp(map-pp/3,12,125),sap=clamp(dap+pp,25,210);return{hr,sv,co,svr,map,pp,dap,sap}};
 let hr=+$('hr').value||80,r=calc(hr),rh=$('rhythm').value,reflex=['Ritmo sinusale','Tachicardia sinusale','Bradicardia sinusale'].includes(rh);
 if(reflex){let pressureDrive=clamp((65-r.map)*1.15,-30,85),flowDrive=clamp((2.9-r.co)*18,-18,45),reflexGain=mac<=1.6?1:clamp(1-.55*((mac-1.6)/.4),.45,1),target=80+reflexGain*(pressureDrive+flowDrive)+(typeof v25!=='undefined'?(v25.fx.hr||0):0);target=clamp(target,42,190);hr+= (target-hr)*.055;$('hr').value=Math.round(hr);r=calc(hr)}
 let variability=clamp(8+Math.max(0,100-phys.preload)*.23+Math.max(0,hr-170)*.025,3,35),dpdt=clamp(950*C*(r.sap/118)*Math.pow(A,-.15),180,2200),ea=clamp((r.sap*.9)/Math.max(r.sv,5),.5,8),cce=clamp(.35*C*(r.co/3.2)/(V**.35),.04,.75),cpo=clamp(r.map*r.co/451,.03,2),bsa=Math.max(.25,0.101*Math.pow(+$('weight').value||25,2/3));
 let vals={sv:Math.round(r.sv),svi:+(r.sv/bsa).toFixed(1),co:+r.co.toFixed(2),ci:+(r.co/bsa).toFixed(2),svr:Math.round(r.svr),svri:Math.round(r.svr*bsa),ppv:Math.round(variability),svv:Math.round(variability*1.08),dpdt:+(dpdt/1000).toFixed(3),cce:+cce.toFixed(2),ea:+ea.toFixed(2),cpo:+cpo.toFixed(2),sap:Math.round(r.sap),dap:Math.round(r.dap)};
 Object.entries(vals).forEach(([k,v])=>{if($(k))$(k).value=v});$('preloadOut').textContent=Math.round(phys.preload)+'%';$('contractilityOut').textContent=Math.round(phys.contractility)+'%';$('vascularToneOut').textContent=Math.round(phys.vascularTone)+'%';$('complianceOut').textContent=Math.round(phys.compliance)+'%';render();interpret()
}
function interpret(){
 let P=phys.preload,C=window.macEffectiveContractility||phys.contractility,V=window.macEffectiveTone||phys.vascularTone,m=map(),ppv=+state.ppv,co=+state.co;
 $('iPre').textContent=P<75?'↓':P>125?'↑':'↔';
 $('iAfter').textContent=V<75?'↓':V>125?'↑':'↔';
 $('iContr').textContent=C<75?'↓':C>125?'↑':'↔';
 $('iFluid').textContent=ppv>=15?'Probabile':'Bassa';
 $('iPerf').textContent=(m<60||co<1.8)?'Ridotta':m>70&&co>=2.2?'Adeguata':'Borderline';
 let txt=[];
 if(P<70)txt.push('pattern compatibile con riduzione del precarico');
 if(V<70)txt.push('basso tono vascolare');
 if(V>135)txt.push('afterload elevato');
 if(C<70)txt.push('ridotta contrattilità');
 if(ppv>=15)txt.push('elevata variazione respiratoria: possibile fluid responsiveness');
 if(m<60)txt.push('pressione di perfusione ridotta');
 if(!txt.length)txt.push('profilo emodinamico relativamente stabile');
 $('interpretation').textContent=txt.join(' · ')+'.';
}
['preload','contractility','vascularTone','compliance'].forEach(k=>$(k).addEventListener('input',physiology));
$('mac').addEventListener('input',()=>{$('macOut').textContent=(+$('mac').value).toFixed(1).replace('.',',');physiology()});$('mac').addEventListener('change',()=>{if(typeof v25Event==='function')v25Event('MAC impostato a '+(+$('mac').value).toFixed(1));});
$('autoPhys').addEventListener('change',physiology);
$('fluid250').onclick=()=>{phys.preload=clamp(+$('preload').value+22,20,180);setPhysInputs();logEvent('Fluido 10 mL/kg: ↑ precarico');physiology()};
$('vasopressor').onclick=()=>{phys.vascularTone=clamp(+$('vascularTone').value+28,30,180);setPhysInputs();logEvent('Vasopressore: ↑ tono vascolare/SVR');physiology()};
$('inotrope').onclick=()=>{phys.contractility=clamp(+$('contractility').value+25,20,180);setPhysInputs();logEvent('Inotropo: ↑ contrattilità');physiology()};
$('vasodilator').onclick=()=>{phys.vascularTone=clamp(+$('vascularTone').value-25,30,180);setPhysInputs();logEvent('Vasodilatatore: ↓ tono vascolare/SVR');physiology()};
$('hemorrhage').onclick=()=>{phys.preload=clamp(+$('preload').value-28,20,180);setPhysInputs();logEvent('Emorragia simulata: ↓ precarico');physiology()};
$('resetPhys').onclick=()=>{phys={preload:100,contractility:100,vascularTone:100,compliance:100};setPhysInputs();logEvent('Fisiologia ripristinata');physiology()};


/* ===== V2.8.3 drug washout + MAC closed-loop hemodynamics ===== */
const v25={start:performance.now(),last:performance.now(),lastPhys:performance.now(),lastSample:0,inf:{fluid:false,dob:false,nor:false},fluidBolusUntil:0,atropineUntil:0,etRef:+$('etco2Set').value||33,etEffective:+$('etco2').value||33,history:[],events:[],applying:false,base:{preload:phys.preload,contractility:phys.contractility,vascularTone:phys.vascularTone,hr:+$('hr').value||80},fx:{preload:0,contractility:0,tone:0,hr:0}};
const v25Metrics=[['hr','FC','bpm'],['spo2','SpO₂','%'],['etco2','EtCO₂','mmHg'],['rr','FR','/min'],['sap','SAP','mmHg'],['dap','DAP','mmHg'],['map','MAP','mmHg'],['co','CO','L/min'],['ci','CI','L/min/m²'],['sv','SV','mL'],['svi','SVI','mL/m²'],['svr','SVR','dyn·s/cm⁵'],['svri','SVRI','dyn·s·m²/cm⁵'],['ppv','PPV','%'],['svv','SVV','%'],['dpdt','dP/dtmax','mmHg/ms'],['cce','CCE',''],['ea','Ea','mmHg/mL'],['cpo','CPO','W'],['preload','Precarico','%'],['afterload','Afterload','%'],['contractility','Contrattilità','%'],['mac','MAC','']];
function v25Event(txt){let t=(performance.now()-v25.start)/1000;v25.events.push({t,txt});if(v25.events.length>80)v25.events.shift();logEvent(txt);v25RenderEvents()}
function v25CaptureUntreatedBase(){v25.base={preload:clamp(phys.preload-v25.fx.preload,20,180),contractility:clamp(phys.contractility-v25.fx.contractility,20,180),vascularTone:clamp(phys.vascularTone-v25.fx.tone,30,180),hr:+$('hr').value||80}}
function v25Toggle(btn,key,label){let starting=!v25.inf[key],none=!v25.inf.fluid&&!v25.inf.dob&&!v25.inf.nor;if(starting&&none)v25CaptureUntreatedBase();v25.inf[key]=!v25.inf[key];btn.classList.toggle('active-therapy',v25.inf[key]);btn.textContent=v25.inf[key]?'ATTIVA — Stop':'Avvia';v25Event(label+(v25.inf[key]?' avviata':' arrestata'));v25Status()}
function v25Status(){let a=[];if(v25.inf.fluid)a.push('Cristalloidi '+(+$('v25FluidRate').value||0)+' mL/kg/h');if(v25.inf.dob)a.push('Dobutamina '+(+$('v25DobRate').value||0)+' µg/kg/min');if(v25.inf.nor)a.push('Noradrenalina '+(+$('v25NorRate').value||0)+' µg/kg/min');$('v25TherapyStatus').textContent=a.length?'Attive: '+a.join(' · '):'Nessuna infusione continua attiva.'}
function v25Flash(b){b.classList.add('pulse-therapy');setTimeout(()=>b.classList.remove('pulse-therapy'),700)}
function v25Setup(){
 $('v25FluidBtn').onclick=()=>v25Toggle($('v25FluidBtn'),'fluid','Cristalloidi');
 $('v25DobBtn').onclick=()=>v25Toggle($('v25DobBtn'),'dob','Dobutamina');
 $('v25NorBtn').onclick=()=>v25Toggle($('v25NorBtn'),'nor','Noradrenalina');
 $('v25FluidBolus').onclick=()=>{if(!v25.inf.fluid&&!v25.inf.dob&&!v25.inf.nor)v25CaptureUntreatedBase();v25.fluidBolusUntil=performance.now()+30000;v25Flash($('v25FluidBolus'));v25Event('Fluid challenge 2 mL/kg / 30 s')};
 $('v25AtBtn').onclick=()=>{v25.atropineUntil=performance.now()+120000;v25Flash($('v25AtBtn'));v25Event('Atropina '+(+$('v25AtDose').value||0)+' µg/kg')};
 $('etco2Set').addEventListener('input',()=>{v25.etRef=clamp(+$('etco2Set').value||33,3,80);if(!v25.applying){v25.etEffective=v25.etRef;$('etco2').value=v25.etEffective}});
 $('etco2Set').addEventListener('change',()=>v25Event('EtCO₂ impostata '+v25.etRef+' mmHg'));
 $('v25Window').addEventListener('change',v25Draw)
}
function v25TherapyStep(dt,now){
 const approach=(cur,target,tau)=>cur+(target-cur)*(1-Math.exp(-dt/Math.max(.1,tau)));
 let fluidRate=clamp(+$('v25FluidRate').value||0,0,50),dob=clamp(+$('v25DobRate').value||0,0,30),nor=clamp(+$('v25NorRate').value||0,0,2);
 let responsive=clamp((+state.ppv-8)/14,0,1);
 let pTarget=(v25.inf.fluid?clamp(fluidRate*.45,0,18):0)+(now<v25.fluidBolusUntil?(10+18*responsive):0);
 let cTarget=v25.inf.dob?clamp(dob*4,0,55):0,tTarget=v25.inf.nor?clamp(55*nor/(nor+.35),0,55):0,hTarget=now<v25.atropineUntil?clamp((+$('v25AtDose').value||0)*1.8,0,75):0;
 v25.fx.preload=approach(v25.fx.preload,pTarget,pTarget?12:28);v25.fx.contractility=approach(v25.fx.contractility,cTarget,cTarget?8:18);v25.fx.tone=approach(v25.fx.tone,tTarget,tTarget?10:20);v25.fx.hr=approach(v25.fx.hr,hTarget,hTarget?7:18);
 let residual=Math.max(Math.abs(v25.fx.preload),Math.abs(v25.fx.contractility),Math.abs(v25.fx.tone));let hemoActive=v25.inf.fluid||v25.inf.dob||v25.inf.nor||now<v25.fluidBolusUntil||residual>.05;if(hemoActive){phys.preload=clamp(v25.base.preload+v25.fx.preload,20,180);phys.contractility=clamp(v25.base.contractility+v25.fx.contractility,20,180);phys.vascularTone=clamp(v25.base.vascularTone+v25.fx.tone,30,180);setPhysInputs()}else{v25.fx.preload=0;v25.fx.contractility=0;v25.fx.tone=0;phys.preload=v25.base.preload;phys.contractility=v25.base.contractility;phys.vascularTone=v25.base.vascularTone;setPhysInputs()}
}
function v25PerfusionEt(){let co=+($('co').value)||3.2,rr=Math.max(1,+$('rr').value||18),perf=clamp(co/2.9,.25,1.55),vent=clamp(12/rr,.45,1.8);return clamp(v25.etRef*(.55+.45*perf)*Math.pow(vent,.28),3,80)}
function v25Sample(t){let rec={t};v25Metrics.forEach(([k])=>{if(k==='map')rec[k]=map();else if(k==='mac')rec[k]=+$('mac').value;else if(k==='afterload')rec[k]=phys.vascularTone;else if(k==='preload')rec[k]=phys.preload;else if(k==='contractility')rec[k]=phys.contractility;else rec[k]=+(($(k)&&$(k).value)||state[k]||0)});v25.history.push(rec);if(v25.history.length>1800)v25.history.shift()}
const v26Groups=[
 ['vitals',['hr','rr','spo2','etco2']],
 ['pressure',['sap','dap','map']],
 ['flow',['co','ci']],
 ['stroke',['sv','svi']],
 ['resistance',['svr','svri']],
 ['fluid',['ppv','svv']],
 ['contractility',['dpdt','cce']],
 ['coupling',['ea','cpo']],
 ['physiology',['preload','afterload','contractility','mac']]
];
const v26Colors=['#3bd6ff','#39ef8b','#ffd34e','#ff5364','#c78cff'];
function v26Fmt(v){v=Number(v);if(!Number.isFinite(v))return '—';return Math.abs(v)<10?v.toFixed(2):v.toFixed(1)}
function v26DrawGroup(name,keys,a,from,win){
 let c=$('trend-'+name);if(!c)return;let d=devicePixelRatio||1,r=c.getBoundingClientRect(),w=Math.max(260,r.width),h=165;c.width=Math.floor(w*d);c.height=Math.floor(h*d);
 let g=c.getContext('2d');g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,w,h);g.strokeStyle='#20323e';g.lineWidth=1;for(let i=1;i<4;i++){let y=i*h/4;g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke()}
 v25.events.filter(e=>e.t>=from).forEach(e=>{let x=(e.t-from)/win*w;g.strokeStyle='rgba(255,211,78,.38)';g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke()});if(a.length<2)return;
 let legend=[],pressure=name==='pressure',all=[];if(!pressure)keys.forEach(k=>{let b=Number(a[0][k])||1;a.forEach(q=>{let v=Number(q[k]);if(Number.isFinite(v))all.push((v-b)/Math.max(Math.abs(b),.01)*100)})});let absMax=pressure?1:Math.max(5,...all.map(Math.abs));
 let pvals=pressure?keys.flatMap(k=>a.map(q=>Number(q[k])).filter(Number.isFinite)):[],pmn=pressure?Math.min(...pvals)-8:0,pmx=pressure?Math.max(...pvals)+8:0;
 keys.forEach((key,j)=>{let def=v25Metrics.find(x=>x[0]===key)||[key,key,''],vals=a.map(q=>Number(q[key])).filter(Number.isFinite);if(!vals.length)return;let base=vals[0]||1;
 g.strokeStyle=v26Colors[j%v26Colors.length];g.lineWidth=2;g.beginPath();a.forEach((q,i)=>{let val=Number(q[key]);if(!Number.isFinite(val))return;let x=(q.t-from)/win*w,y=pressure?h*.91-((val-pmn)/Math.max(1,pmx-pmn))*h*.82:h*.5-(((val-base)/Math.max(Math.abs(base),.01)*100)/absMax)*h*.38;i?g.lineTo(x,y):g.moveTo(x,y)});g.stroke();
 let last=vals[vals.length-1],delta=(last-base)/Math.max(Math.abs(base),.01)*100;legend.push('<span style="color:'+v26Colors[j%v26Colors.length]+'">●</span> '+def[1]+' '+v26Fmt(last)+(def[2]?' '+def[2]:'')+(pressure?'':' ('+(delta>=0?'+':'')+delta.toFixed(1)+'%)'))});
 if(!pressure){g.strokeStyle='rgba(255,255,255,.18)';g.beginPath();g.moveTo(0,h*.5);g.lineTo(w,h*.5);g.stroke()}let el=$('legend-'+name);if(el)el.innerHTML=legend.join(' &nbsp; ')
}
function v25Draw(){
 let win=+$('v25Window').value||120,now=(performance.now()-v25.start)/1000,from=Math.max(0,now-win),a=v25.history.filter(x=>x.t>=from);
 v26Groups.forEach(([name,keys])=>v26DrawGroup(name,keys,a,from,win));
}
function v25RenderEvents(){$('v25TrendEvents').textContent=v25.events.slice(-5).map(e=>{let m=Math.floor(e.t/60),s=Math.floor(e.t%60);return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+' '+e.txt}).join(' · ')}
function v25Loop(now){
 let dt=Math.min(.5,(now-v25.lastPhys)/1000);if(dt>=.20){v25.lastPhys=now;v25.applying=true;v25TherapyStep(dt,now);physiology();let target=v25PerfusionEt();v25.etEffective+=(target-v25.etEffective)*(1-Math.exp(-dt/2.2));$('etco2').value=(Math.round(v25.etEffective*10)/10).toFixed(1);render();v25.applying=false}
 let sec=(now-v25.start)/1000,mm=Math.floor(sec/60),ss=Math.floor(sec%60);$('v25Clock').textContent=String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0');if(sec-v25.lastSample>=1){v25.lastSample=sec;v25Sample(sec);v25Draw()}requestAnimationFrame(v25Loop)
}
v25Setup();requestAnimationFrame(v25Loop);
/* ===== end V2.8.2 ===== */

let scenarioStep=-1;const scenario=['Paziente anestetizzato','PEA 80','CPR EtCO₂ basso','CPR EtCO₂ migliore','CPR ROSC imminente','ROSC'];
function stepScenario(){scenarioStep=Math.min(scenarioStep+1,scenario.length-1);applyPreset(scenario[scenarioStep]);$('scenarioStatus').textContent=`Fase ${scenarioStep+1}/${scenario.length}: ${scenario[scenarioStep]}${scenarioStep==1?' — PAUSA: riconoscimento arresto/ritmo':''}${scenarioStep==4?' — PAUSA: ricercare segni di ROSC':''}`}
$('startScenario').onclick=()=>{scenarioStep=-1;stepScenario()};$('nextScenario').onclick=stepScenario;$('stopScenario').onclick=()=>{$('scenarioStatus').textContent='Scenario fermato';scenarioStep=-1};

$('modeBtn').onclick=()=>{document.body.classList.toggle('student');let s=document.body.classList.contains('student');$('modeTitle').textContent=s?'Monitor studenti':'Console istruttore';$('modeBtn').textContent=s?'Torna alla console':'Modalità studenti'};
$('studentBtn').onclick=()=>{let u=new URL(location.href);u.searchParams.set('student','1');window.open(u.toString(),'_blank')};
$('fullBtn').onclick=()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.()};
if(new URLSearchParams(location.search).get('student')==='1'){$('modeBtn').click()}

window.addEventListener('storage',e=>{if(e.key==='recoverCaneState'&&document.body.classList.contains('student')){let d=JSON.parse(e.newValue);state=d.state;active=d.active;$('name').value=d.name;$('weight').value=d.weight;$('rhythm').value=d.rhythm;Object.entries(state).forEach(([k,v])=>{if($(k))$(k).value=v});document.querySelectorAll('[data-toggle]').forEach(x=>x.checked=active[x.dataset.toggle]);
if(d.caseState&&d.caseState.active){caseState=d.caseState;$('studentCaseBanner').style.display='block';$('studentCaseMinute').textContent=caseState.minute;$('studentCasePresentation').textContent=d.casePresentation;$('studentCaseEvolution').textContent=d.caseEvolutionText}else{$('studentCaseBanner').style.display='none'}
render()}});

setActive(true);setPhysInputs();physiology();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
