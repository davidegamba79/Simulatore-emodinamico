/* V2.4.2 Safari/iPad stable module */
(function(){
function q(i){return document.getElementById(i)}
function num(i,d){var e=q(i),v=e?parseFloat(e.value):NaN;return isFinite(v)?v:d}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
var S={start:Date.now(),last:Date.now(),sample:0,fr:0,db:0,ne:0,bol:false,at:0,atUntil:0,hist:[],events:[],base:null,etRef:38};
function log(s){S.events.push({t:(Date.now()-S.start)/1000,s:s});var e=q("v242Status");if(e)e.textContent=s}
function addUI(){
 var a=document.querySelector("aside.controls"),m=document.querySelector("section.monitor"); if(!a||!m)return;
 var t=document.createElement("section");t.className="card";t.id="therapyV242";
 t.innerHTML='<h2>Terapie dinamiche V2.4.2</h2><div class="therapy-grid">'+
 '<div class="therapy"><b>Fluid challenge</b><small>2 mL/kg in 30 s</small><button id="bol242">Somministra</button></div>'+
 '<div class="therapy"><b>Cristalloidi</b><label>mL/kg/h <input id="fr242" type="number" value="2"></label><button id="frb242">Avvia</button></div>'+
 '<div class="therapy"><b>Dobutamina</b><label>µg/kg/min <input id="db242" type="number" step=".5" value="5"></label><button id="dbb242">Avvia</button></div>'+
 '<div class="therapy"><b>Noradrenalina</b><label>µg/kg/min <input id="ne242" type="number" step=".01" value=".10"></label><button id="neb242">Avvia</button></div>'+
 '<div class="therapy"><b>Atropina</b><label>µg/kg <input id="at242" type="number" value="20"></label><button id="atb242">Somministra</button></div></div><div id="v242Status" class="status">Modulo V2.4.2 caricato.</div>';
 a.appendChild(t);
 var tr=document.createElement("section");tr.className="card trend-card";tr.id="trendV242";
 tr.innerHTML='<div class="trend-head"><h2>Trend monitor V2.4.2</h2><b id="clock242">00:00</b></div>'+
 '<div class="trend-controls"><select id="metric242"></select><select id="window242"><option value="120">2 min</option><option value="300">5 min</option><option value="600">10 min</option></select></div>'+
 '<canvas id="canvas242"></canvas><div id="legend242" class="trend-legend">Registrazione in corso…</div><div id="events242" class="trend-events"></div>';
 m.appendChild(tr);
 var metrics=["HR","SpO2","EtCO2","RR","SAP","DAP","MAP","CO","CI","SV","SVI","SVR","SVRI","PPV","SVV","dPdt","CCE","Ea","CPO","Temp","Preload","Afterload","Contractility"],sel=q("metric242");
 for(var i=0;i<metrics.length;i++){var o=document.createElement("option");o.value=metrics[i];o.textContent=metrics[i];sel.appendChild(o)} sel.value="MAP";
 sel.onchange=draw;q("window242").onchange=draw;
 function toggle(b,i,k,label){q(b).onclick=function(){if(S[k]>0){S[k]=0;this.className="";this.textContent="Avvia";log(label+" OFF")}else{S[k]=Math.max(0,num(i,0));this.className="active-therapy";this.textContent="ATTIVA — Stop";log(label+" ON")}}}
 toggle("frb242","fr242","fr","Cristalloidi");toggle("dbb242","db242","db","Dobutamina");toggle("neb242","ne242","ne","Noradrenalina");
 q("bol242").onclick=function(){S.bol=true;this.className="pulse-therapy";log("Fluid challenge 2 mL/kg");var b=this;setTimeout(function(){S.bol=false;b.className=""},30000)};
 q("atb242").onclick=function(){S.at=clamp(num("at242",20)/20,.25,3);S.atUntil=Date.now()+180000;this.className="pulse-therapy";log("Atropina "+num("at242",20)+" µg/kg");var b=this;setTimeout(function(){b.className=""},4000)};
}
function init(){S.base={hr:num("hr",90),pre:num("preload",100),con:num("contractility",100),tone:num("vascularTone",100),rr:num("rr",18)};S.etRef=num("etco2",38);var e=q("etco2");if(e)e.onchange=function(){S.etRef=num("etco2",38)}}
function model(dt){var b=S.base;if(S.fr)b.pre=clamp(b.pre+S.fr*dt/3600*.9,20,180);if(Date.now()>S.atUntil)S.at=0;
 var pre=clamp(b.pre+(S.bol?22:0),20,180),con=clamp(b.con+S.db*4+S.ne*3,20,190),tone=clamp(b.tone+S.ne*80-S.db*1.2,30,220),hr=clamp(b.hr+S.at*25+S.db*.6+S.ne*1.5,0,260),rr=Math.max(0,num("rr",b.rr));
 var sv=clamp(36*Math.pow(pre/100,.72)*Math.pow(con/100,.7),3,75),co=clamp(sv*hr/1000,.05,8),svr=clamp(1800*tone/100,400,3600),map=clamp(co*svr/80,15,170),pp=clamp(sv/36*50,10,90),dap=clamp(map-pp/3,8,140),sap=clamp(dap+pp,18,230),ppv=clamp(8+Math.max(0,100-pre)*.23,2,35),svv=clamp(ppv*1.08,2,38),dpdt=clamp(950*con/100*(sap/118),150,2400),ea=clamp(sap*.9/Math.max(sv,3),.3,10),cce=clamp(.35*con/100*(co/3.2)/Math.pow(tone/100,.35),.02,.9),cpo=clamp(map*co/451,.01,2.5),vent=rr?clamp(rr/Math.max(1,b.rr),.35,2.5):.2,et=clamp(S.etRef*Math.pow(clamp(co/3.2,.05,2.2),.38)/Math.pow(vent,.7),3,75);
 return {pre:pre,con:con,tone:tone,hr:hr,rr:rr,sv:sv,co:co,svr:svr,map:map,sap:sap,dap:dap,ppv:ppv,svv:svv,dpdt:dpdt,ea:ea,cce:cce,cpo:cpo,et:et}}
function setv(i,v){var e=q(i);if(e)e.value=v}
function apply(x){var bsa=Math.max(.25,.101*Math.pow(num("weight",25),2/3));setv("hr",Math.round(x.hr));setv("preload",Math.round(x.pre));setv("contractility",Math.round(x.con));setv("vascularTone",Math.round(x.tone));setv("sap",Math.round(x.sap));setv("dap",Math.round(x.dap));setv("co",x.co.toFixed(2));setv("ci",(x.co/bsa).toFixed(2));setv("sv",Math.round(x.sv));setv("svi",(x.sv/bsa).toFixed(1));setv("svr",Math.round(x.svr));setv("svri",Math.round(x.svr*bsa));setv("ppv",Math.round(x.ppv));setv("svv",Math.round(x.svv));setv("dpdt",Math.round(x.dpdt));setv("cce",x.cce.toFixed(2));setv("ea",x.ea.toFixed(2));setv("cpo",x.cpo.toFixed(2));if(typeof render==="function")render();if(q("vet"))q("vet").textContent=Math.round(x.et);if(q("vart"))q("vart").textContent=Math.round(x.sap)+"/"+Math.round(x.dap);if(q("vmap"))q("vmap").textContent=Math.round(x.map)}
function draw(){var c=q("canvas242");if(!c)return;var r=c.getBoundingClientRect(),d=window.devicePixelRatio||1,w=r.width,h=Math.max(160,r.height);c.width=w*d;c.height=h*d;var g=c.getContext("2d");g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,w,h);var k=q("metric242").value,win=parseInt(q("window242").value,10),now=(Date.now()-S.start)/1000,H=[],V=[];for(var i=0;i<S.hist.length;i++)if(S.hist[i].t>=now-win){H.push(S.hist[i]);if(isFinite(S.hist[i][k]))V.push(S.hist[i][k])}if(!V.length)return;var lo=Math.min.apply(null,V),hi=Math.max.apply(null,V);if(lo===hi){lo-=1;hi+=1}g.strokeStyle="#39ef8b";g.lineWidth=2;g.beginPath();for(i=0;i<H.length;i++){var x=w*(1-(now-H[i].t)/win),y=h-(H[i][k]-lo)/(hi-lo)*h;if(i===0)g.moveTo(x,y);else g.lineTo(x,y)}g.stroke();q("legend242").textContent=k+": "+V[V.length-1].toFixed(2)+" · min "+Math.min.apply(null,V).toFixed(2)+" · max "+Math.max.apply(null,V).toFixed(2);var ev=[];for(i=Math.max(0,S.events.length-4);i<S.events.length;i++)ev.push(Math.floor(S.events[i].t/60)+":"+("0"+Math.floor(S.events[i].t%60)).slice(-2)+" "+S.events[i].s);q("events242").textContent=ev.join(" • ")}
function loop(){var now=Date.now(),dt=Math.min(.25,(now-S.last)/1000);S.last=now;var x=model(dt);apply(x);var t=(now-S.start)/1000;if(q("clock242"))q("clock242").textContent=("0"+Math.floor(t/60)).slice(-2)+":"+("0"+Math.floor(t%60)).slice(-2);if(now-S.sample>=1000){S.sample=now;var bsa=Math.max(.25,.101*Math.pow(num("weight",25),2/3));S.hist.push({t:t,HR:x.hr,SpO2:num("spo2",98),EtCO2:x.et,RR:x.rr,SAP:x.sap,DAP:x.dap,MAP:x.map,CO:x.co,CI:x.co/bsa,SV:x.sv,SVI:x.sv/bsa,SVR:x.svr,SVRI:x.svr*bsa,PPV:x.ppv,SVV:x.svv,dPdt:x.dpdt,CCE:x.cce,Ea:x.ea,CPO:x.cpo,Temp:num("temp",38.3),Preload:x.pre,Afterload:x.tone,Contractility:x.con});if(S.hist.length>3600)S.hist.shift();draw()}window.requestAnimationFrame(loop)}
function boot(){addUI();init();log("V2.4.2 attiva");window.requestAnimationFrame(loop)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();