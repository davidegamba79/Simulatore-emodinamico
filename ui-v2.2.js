/* V2.2 — ordine monitor: onde prima dei dati PRAM */
(()=>{
 const cards=[...document.querySelectorAll("section.card")];
 const cap=cards.find(s=>s.querySelector("h2")?.textContent.trim()==="Capnografia");
 if(cap&&!document.getElementById("capnoPattern")){
   const l=document.createElement("label");l.style.marginTop="8px";l.textContent="Morfologia";
   const s=document.createElement("select");s.id="capnoPattern";
   ["Normale","Broncospasmo / shark-fin","Rebreathing","Oscillazioni cardiogene","Disconnessione / apnea"].forEach(x=>{let o=document.createElement("option");o.textContent=x;s.appendChild(o)});
   l.appendChild(s);cap.appendChild(l);
 }
 const m=document.querySelector(".monitor");
 if(m){
   const firstCard=m.querySelector(".card[data-key='nibp']");
   ["ecg","pleth","capno","art"].forEach(k=>{
     const e=m.querySelector('.wave[data-key="'+k+'"]');
     if(e&&firstCard)m.insertBefore(e,firstCard);
   });
   const p=m.querySelector('.wave[data-key="pleth"] .wlabel');
   if(p)p.textContent="SpO₂ — pleth";
 }
})();