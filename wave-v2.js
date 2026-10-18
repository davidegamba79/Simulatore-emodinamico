/* V2.8.28 expanded pressure-calibrated peripheral IBP contour */
(()=>{const R=requestAnimationFrame.bind(window),E=i=>document.getElementById(i),N=i=>+(E(i)?.value||0),C=(v,a,b)=>Math.max(a,Math.min(b,v)),G=(x,m,s)=>Math.exp(-.5*((x-m)/s)**2),t0=performance.now()/1000;
function fit(c){let d=devicePixelRatio||1,r=c.getBoundingClientRect();c.width=Math.floor(r.width*d);c.height=Math.floor(r.height*d);let g=c.getContext("2d");g.setTransform(d,0,0,d,0,0);return[g,r.width,r.height]}
function ecg(q,r){if(r==="Asistolia")return .003*Math.sin(q*20);if(r.includes("Fibrillazione")){let t=q/Math.max(.001,(N("hr")||80)/60);let slow=.5+.5*Math.sin(t*1.13+.9*Math.sin(t*.37)),amp=.45+.8*slow;let s=.095*Math.sin(t*33+1.4*Math.sin(t*2.3))+.075*Math.sin(t*49+1.1*Math.sin(t*1.7))+.05*Math.sin(t*71+.8*Math.sin(t*3.1))+.028*Math.sin(t*113);return amp*s;}if(r.includes("Tachicardia ventricolare"))return .34*Math.sin(2*Math.PI*q)+.13*Math.sin(4*Math.PI*q);return .06*G(q,.12,.034)-.07*G(q,.255,.015)+.47*G(q,.286,.013)-.16*G(q,.319,.017)+.13*G(q,.57,.072)}
function art(q){if((E("rhythm")?.value==="Fibrillazione ventricolare"||E("rhythm")?.value==="Tachicardia ventricolare senza polso"))return 0;let pp=C((N("sap")-N("dap"))/60,.12,1.75),sv=C(N("sv")/36,.35,1.8),con=C((window.macEffectiveContractility||N("contractility"))/100,.2,1.9),dp=C((N("dpdt")||.8)/.8,.4,2.2),tone=C((window.macEffectiveTone||N("vascularTone"))/100,.3,2.1),comp=C(N("compliance")/100,.4,1.8);
// Baseline retains V2.8.22/V2.8.24 peripheral contour.
// Norepinephrine alone adds a concave systolic downslope, prominent systolic
// peak and near-horizontal post-dicrotic runoff as peripheral resistance rises.
let norFx=(typeof v25!=="undefined"&&v25.fx)?Math.max(0,v25.fx.tone||0):0;
let norActive=typeof v25!=="undefined"&&v25.inf&&v25.inf.nor;
let nor=C((norActive||norFx>2?norFx:0)/30,0,1);
let onset=.085,rise=C(.072/Math.pow(con*dp,.10),.055,.092);
let z=C((q-onset)/rise,0,1),up=z*z*(3-2*z);
let dt=Math.max(0,q-onset-rise),fall=C(.145+.015*comp-.012*tone,.115,.18);
let tail=1/(1+Math.pow(dt/fall,1.65));
let baseline=up*tail;
let notchAt=C(.40+.025/comp,.39,.46),notch=C(.065+.012*tone,.045,.085)*G(q,notchAt,.020),dicrotic=C(.075+.018*tone,.055,.105)*G(q,notchAt+.078,.058);
let constrict=C((tone-1)/.40,0,1),reflection=C((tone-1)*.55,-.10,.46);
let reflected=reflection*G(q,C(.335-.035*constrict,.29,.36),.065),shoulder=.10*constrict*G(q,.235,.045);
baseline+=-notch*(1+.20*constrict)+dicrotic*(1+.25*constrict)+reflected+shoulder;
// Peripheral norepinephrine contour: early fast fall (concave in pressure),
// clear incisura and reflection, then sustained diastolic pressure plateau.
let systoleEnd=.395,peakAt=onset+rise;
let t=C((q-peakAt)/(systoleEnd-peakAt),0,1);
let concaveFall=1-.69*(1-Math.pow(1-t,3.1));
let early=up*concaveFall;
let dip=.115*G(q,.402,.016);
let rebound=.105*G(q,.472,.045);
let after=C((q-.46)/.12,0,1);after=after*after*(3-2*after);
let plateau=.26+.015*(tone-1);
let post=plateau*(1-.16*C((q-.62)/.38,0,1));
let norContour=q<.46?early-dip+rebound:early*(1-after)+post*after+rebound;
let end=C((1-q)/.23,0,1);end=end*end*(3-2*end);
let peak=C(1+.14*(dp-1)+.07*(sv-1),.75,1.35);let norSystolicBoost=1+nor*.32*G(q,peakAt,.082);
return C((baseline*(1-nor)+norContour*nor*norSystolicBoost)*end*peak,0,1.5)*pp}
function pleth(q){if((E("rhythm")?.value==="Fibrillazione ventricolare"||E("rhythm")?.value==="Tachicardia ventricolare senza polso"))return 0;let co=C(N("co")/3.2,.08,1.8),pp=C((N("sap")-N("dap"))/50,.15,1.7),tone=C((window.macEffectiveTone||N("vascularTone"))/100,.3,2),z=Math.max(0,q-.1),v=q>.1?(1-Math.exp(-z/.055))*Math.exp(-z*(2.7+.45*tone)):0;return (v+.08*G(q,.53,.075))*C(Math.sqrt(co*pp/tone),.08,1.35)}
function cap(q){let m=E("capnoPattern")?.value||"Normale";if(m.includes("Disconnessione"))return 0;let b=m.includes("Rebreathing")?.18:0,v=0;if(m.includes("Broncospasmo")){if(q<.07)v=0;else if(q<.42)v=C((q-.07)/.35,0,1)**1.8;else if(q<.69)v=.96+.06*(q-.42)/.27;else if(q<.82){let z=(q-.69)/.13;v=1.02*(1-z*z*(3-2*z))}}else{if(q<.08)v=0;else if(q<.14){let z=(q-.08)/.06;v=.94*(z*z*(3-2*z))}else if(q<.72){let z=(q-.14)/.58;v=.94+.09*z+.010*Math.sin(Math.PI*z)}else if(q<.78){let z=(q-.72)/.06;v=1.03*(1-(z*z*(3-2*z)))}else v=0;if(m.includes("Oscillazioni"))v+=.045*Math.sin(q*42)*C((q-.14)*4,0,1)*C((.78-q)*8,0,1)}return b+(1-b)*C(v,0,1.1)}
function draw(){let hr=Math.max(1,N("hr")||90),rr=Math.max(1,N("rr")||18),et=C(N("etco2")||38,3,80),rh=E("rhythm")?.value||"Ritmo sinusale",now=performance.now()/1000-t0;[["ecg","#39ef8b",6],["pleth","#3bd6ff",6],["capno","#ffd34e",12],["art","#ff5364",6]].forEach(([id,col,sec])=>{let c=E(id);if(!c||c.offsetParent===null)return;let[g,w,h]=fit(c);g.clearRect(0,0,w,h);g.strokeStyle=col;g.lineWidth=2;g.beginPath();for(let x=0;x<w;x++){let ts=now+x/w*sec,q,y;if(id==="capno"){q=((ts/(60/rr))%1+1)%1;y=.86-cap(q)*C(et/40,.12,1.65)*.60}else{let rate=rh.includes("massaggio")?120:rh.includes("Tachicardia ventricolare")?Math.max(120,hr):hr,delay=id==="art"?.055:id==="pleth"?.16:0;q=((((ts-delay)/(60/rate))%1)+1)%1;if(id==="ecg")y=.58-ecg(q,rh)*.76;else if(id==="art"){let sap=N("sap"),dap=N("dap"),pulse=Math.max(1,sap-dap),shape=art(q)/C(pulse/60,.12,1.75);let pressure=(rh==="Fibrillazione ventricolare"||rh==="Tachicardia ventricolare senza polso")?0:dap+pulse*shape;let displayMin=30,displayMax=145;y=.93-(pressure-displayMin)/(displayMax-displayMin)*.91;}else y=.84-pleth(q)*.48}x?g.lineTo(x,C(y,.035,.965)*h):g.moveTo(x,C(y,.035,.965)*h)}g.stroke()});R(draw)}R(draw)})();