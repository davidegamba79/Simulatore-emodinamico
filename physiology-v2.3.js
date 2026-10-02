/* V2.3 — motore fisiologico integrato e interventi terapeutici */
(()=>{
 const $=i=>document.getElementById(i), C=(v,a,b)=>Math.max(a,Math.min(b,v)), num=(i,f=0)=>+($(i)?.value??f);
 const S={norepi:0,dobu:0,fluidRate:0,fluidBolus:0,atropine:0,last:performance.now(),base:null};
 const set=(id,v)=>{let e=$(id);if(e){e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}))}};
 const text=(id,v)=>{let e=$(id);if(e)e.textContent=v};
 function mk(tag,attrs={},html=""){let e=document.createElement(tag);Object.assign(e,attrs);e.innerHTML=html;return e}
 function panel(){
  if($("therapyV23"))return;
  const aside=document.querySelector("aside"); if(!aside)return;
  const card=mk("section",{className:"card",id:"therapyV23"});
  card.innerHTML=`<h2>Interventi terapeutici — V2.3</h2>
  <div class="therapy-grid">
   <div class="therapy"><b>Fluid challenge</b><small>2 mL/kg in 30 sec</small><button id="v23Bolus">Somministra</button></div>
   <div class="therapy"><b>Cristalloidi</b><label>mL/kg/h<input id="v23Fluid" type="number" min="0" max="50" step="1" value="0"></label><button id="v23FluidToggle">Avvia</button></div>
   <div class="therapy"><b>Dobutamina</b><label>µg/kg/min<input id="v23Dobu" type="number" min="0" max="20" step="0.5" value="5"></label><button id="v23DobuToggle">Avvia</button></div>
   <div class="therapy"><b>Noradrenalina</b><label>µg/kg/min<input id="v23NE" type="number" min="0" max="2" step="0.01" value="0.1"></label><button id="v23NEToggle">Avvia</button></div>
   <div class="therapy"><b>Atropina</b><label>µg/kg<input id="v23Atro" type="number" min="0" max="100" step="1" value="20"></label><button id="v23AtroGive">Somministra</button></div>
  </div><div id="v23Status" class="status">Nessuna terapia attiva.</div>`;
  aside.appendChild(card);
  $("v23Bolus").onclick=()=>{S.fluidBolus=C(S.fluidBolus+1,0,2);status("Fluid challenge 2 mL/kg: in corso (30 s).");setTimeout(()=>S.fluidBolus=Math.max(0,S.fluidBolus-1),30000)};
  toggle("v23FluidToggle","v23Fluid","fluidRate","Cristalloidi");
  toggle("v23DobuToggle","v23Dobu","dobu","Dobutamina");
  toggle("v23NEToggle","v23NE","norepi","Noradrenalina");
  $("v23AtroGive").onclick=()=>{S.atropine=C(num("v23Atro",20)/20,.25,3);status("Atropina somministrata.");setTimeout(()=>S.atropine=0,180000)};
 }
 function toggle(btn,input,key,name){$(btn).onclick=()=>{if(S[key]>0){S[key]=0;$(btn).textContent="Avvia";status(name+" interrotta.")}else{S[key]=num(input);$(btn).textContent="Stop";status(name+" attiva.")}}}
 function status(s){text("v23Status",s)}
 function baseline(){
  if(!S.base)S.base={hr:num("hr",90),et:num("etco2",38),rr:num("rr",18),pre:num("preload",100),con:num("contractility",100),tone:num("vascularTone",100)};
 }
 function update(){
  baseline();
  const b=S.base, wt=Math.max(1,num("weight",25)), dt=Math.min(.2,(performance.now()-S.last)/1000);S.last=performance.now();
  if(S.fluidRate>0) b.pre=C(b.pre+S.fluidRate*dt/3600*.8,35,170);
  const fluidEffect=S.fluidBolus*22;
  const ne=S.norepi, db=S.dobu, at=S.atropine;
  let hr=b.hr + (at?C(25*at,8,65):0) + db*0.7 + ne*2;
  let pre=C(b.pre+fluidEffect,30,180);
  let con=C(b.con+db*4.2+ne*4,25,190);
  let tone=C(b.tone+ne*75-db*1.5,25,220);
  const filling=C(pre/100,.25,1.7), inot=C(con/100,.25,1.9), after=C(tone/100,.3,2.2);
  let sv=36*Math.pow(filling,.72)*Math.pow(inot,.60)/Math.pow(after,.34);
  if(hr>180)sv*=C(1-(hr-180)/300,.55,1);
  let co=sv*hr/1000;
  let map=C(18+co*(15.5*after),25,190);
  let sys=C(map+(18+12*inot)*C(sv/36,.55,1.8),35,240), dia=C(map-(11+7/after),18,160);
  let ppv=C(7+Math.max(0,1-filling)*28-S.fluidBolus*5,2,35);
  let dpdt=C(850*inot*(.75+.25*after),250,3000);
  let cce=C(.35*inot/Math.pow(after,.42),.12,1.2);
  let ea=C(map/Math.max(12,sv),.4,5);
  let cpo=C(map*co/451,.05,3);
  const rr=Math.max(1,num("rr",b.rr));
  const ventilation=C(rr/b.rr,.45,2.2);
  let et=C(b.et*Math.pow(C(co/3.24,.12,2),.42)/Math.pow(ventilation,.72),8,70);
  set("hr",Math.round(hr)); set("preload",Math.round(pre)); set("contractility",Math.round(con)); set("vascularTone",Math.round(tone));
  set("etco2",Math.round(et)); set("co",co.toFixed(2)); set("ppv",Math.round(ppv));
  const ids={vhr:Math.round(hr),vet:Math.round(et),vco:co.toFixed(2),vppv:Math.round(ppv),vart:`${Math.round(sys)}/${Math.round(dia)}`};
  Object.entries(ids).forEach(([i,v])=>text(i,v));
  text("vmap",Math.round(map)); text("vsv",Math.round(sv)); text("vdpdt",Math.round(dpdt)); text("vcce",cce.toFixed(2)); text("vea",ea.toFixed(2)); text("vcpo",cpo.toFixed(2));
  const perf=co<2||map<55?"Ridotta":co<2.7||map<65?"Borderline":"Adeguata";
  const fluid=ppv>=13?"Alta":ppv>=10?"Intermedia":"Bassa";
  text("iPerf",perf); text("iFluid",fluid);
  requestAnimationFrame(update);
 }
 function boot(){panel();baseline();requestAnimationFrame(update)}
 document.readyState==="loading"?document.addEventListener("DOMContentLoaded",boot):boot();
})();