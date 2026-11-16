// Partners: AI-drafted booking request, studio's view, booking and check-in QR.
const P={status:"none",msg:"",drafting:false,date:"Thu 3 Dec, 2–3:30pm"};
function renderPartners(){
  const x=expTrip();
  if(!x){$("#tmain").innerHTML=`<div class="empty" style="max-width:520px">Add an experience trip in the unit plan first.<div style="margin-top:10px"><button data-goto="unit">Go to unit plan</button></div></div>`;$("[data-goto]").onclick=()=>go("unit");return}
  const pv=PROVIDERS.find(p=>p.id===x.provider);
  const order=["none","sent","accepted"],idx=P.status==="counter"?1:order.indexOf(P.status);
  const stepCls=i=>i<idx||P.status==="accepted"?"s done":i===idx?"s on":"s";
  $("#tmain").innerHTML=`<div class="stack" style="gap:18px">
   <div class="row between"><div><span class="label">Experience trip</span><h2>${pv.name}</h2><p class="small muted">${pv.who}</p></div>
    <div class="pipe"><span class="${stepCls(0)}"><b>1</b>Request</span><i></i><span class="${stepCls(1)}"><b>2</b>Studio replies</span><i></i><span class="${stepCls(2)}"><b>3</b>Booked</span></div></div>
   <div class="grid2">
    <section class="card stack"><div class="row between"><h3>Your request</h3>${P.status==="none"?"":`<span class="chip ${P.status==="accepted"?"ok":"edit"}">${{sent:"Sent",counter:"Reply received",accepted:"Booked"}[P.status]}</span>`}</div>
     ${P.status==="none"?`<button id="draft" ${P.drafting?"disabled":""} style="align-self:flex-start;background:var(--ai-soft);color:var(--ai);border-color:transparent">${ic("spark")} Draft with AI</button>
       <textarea id="pmsg" style="min-height:190px" placeholder="Your message to the studio">${esc(P.msg)}</textarea>
       <button class="primary" id="send" ${P.msg?"":"disabled"}>${ic("send")} Send request</button>`:
      `<div class="mail">${esc(P.msg)}</div>`}
     ${P.status==="counter"?`<div class="hint">Studio proposes <b>Fri 4 Dec, 10–11:30am</b></div><div class="row"><button class="primary" id="acceptNew">Accept new date</button></div>`:""}
     ${P.status==="accepted"?`<div class="stack"><span class="label">Check-in code for the studio door</span><div class="qr" id="pqr" style="max-width:220px"></div><p class="small muted">Students scan it on arrival. Their collectible evolves.</p></div>`:""}
    </section>
    <section class="card stack" style="background:var(--sunk)"><div class="row between"><h3>Studio's view</h3><span class="chip sim">Preview</span></div>
     ${P.status==="none"?`<div class="empty">Nothing sent yet.</div>`:
      `<div class="inbox"><div class="row between small"><b>Ms Rahman · Year 10</b><span class="muted">${P.status==="sent"?"New":"Replied"}</span></div><div class="mail">${esc(P.msg)}</div>
       ${P.status==="sent"?`<div class="row"><button class="primary" id="pAccept">${ic("check")} Accept</button><button id="pCounter">Suggest another date</button></div>`:`<span class="small muted">${P.status==="accepted"?"Accepted. Booking confirmed.":"Waiting for the teacher."}</span>`}</div>`}
    </section></div></div>`;
  $("#draft")&&($("#draft").onclick=async()=>{P.drafting=true;$("#draft").disabled=true;const t=$("#pmsg");
    const text=`Hello ${pv.who},\n\nMy Year 10 class (28 students, age 14–15) is studying memento mori. After their museum trip we'd love a ${pv.name.toLowerCase()} on ${P.date}.\n\nCould you run a 90-minute session drawing a memento mori still life (skull model, candle, timepiece)? Students will bring their discovery cards.\n\nTwo staff will supervise. Could you confirm availability and cost?\n\nThanks,\nMs Rahman`;
    t.value="";for(const w of text.split(" ")){t.value+=(t.value?" ":"")+w;await sleep(18)}P.msg=t.value;P.drafting=false;renderPartners()});
  $("#pmsg")&&($("#pmsg").oninput=e=>{P.msg=e.target.value;$("#send").disabled=!P.msg.trim()});
  $("#send")&&($("#send").onclick=()=>{P.msg=$("#pmsg").value;P.status="sent";toast("Request sent");renderPartners()});
  $("#pAccept")&&($("#pAccept").onclick=()=>{P.status="accepted";toast("Studio accepted. Booked.");renderPartners()});
  $("#pCounter")&&($("#pCounter").onclick=()=>{P.status="counter";renderPartners()});
  $("#acceptNew")&&($("#acceptNew").onclick=()=>{P.date="Fri 4 Dec, 10–11:30am";P.status="accepted";toast("Booked for Fri 4 Dec");renderPartners()});
  if(P.status==="accepted")makeQR($("#pqr"),CODES.checkin);
}
