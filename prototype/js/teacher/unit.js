// Unit plan: add trips, unlock rule, launch trip day, live progress.
const U={trips:[],adding:false,picking:false,rule:"all",live:false,done:0,total:28,unlocked:false,showOverride:false,override:""};
const questTrip=()=>U.trips.find(t=>t.type==="quest"), expTrip=()=>U.trips.find(t=>t.type==="exp");
function renderUnit(){
  const q=questTrip(), x=expTrip();
  const qStatus=B.published?`<span class="chip ok">Published</span>`:B.started?`<span class="chip edit">Draft</span>`:`<span class="chip lock">Not started</span>`;
  const pStatus={none:`<span class="chip lock">Not requested</span>`,sent:`<span class="chip edit">Awaiting studio</span>`,counter:`<span class="chip edit">New date proposed</span>`,accepted:`<span class="chip ok">Studio accepted</span>`}[P.status];
  const ready=q&&x&&B.published&&P.status==="accepted";
  const missing=[!q&&"Add a quest",!x&&"Add an experience",q&&!B.published&&"Publish the quest",x&&P.status!=="accepted"&&"Studio acceptance"].filter(Boolean);
    let h=`<div class="row between" style="margin-bottom:18px"><div><span class="label">Autumn unit</span><h2>Memento mori</h2></div>
    <div class="row">${U.live?`<span class="chip ok">Trip day live</span>`:`<button class="primary" id="launch" ${ready?"":"disabled"}>${ic("play")} Launch trip day</button>`}</div></div>
    ${!U.live&&missing.length?`<p class="small muted" style="margin:-8px 0 16px">To launch: ${missing.join(" · ")}</p>`:""}
    <div class="flow">`;
  if(!U.trips.length) h+=`<div class="empty" style="margin-bottom:12px">No trips yet. Start with a quest, then add the experience it leads to.</div>`;
  U.trips.forEach((t,i)=>{
    if(i>0) h+=`<div class="link"><span class="ln"></span><label class="row small">${ic("lock")} Unlocks when <select id="rule"><option value="all" ${U.rule==="all"?"selected":""}>the whole class finishes</option><option value="manual" ${U.rule==="manual"?"selected":""}>I unlock it</option></select></label></div>`;
    if(t.type==="quest") h+=`<div class="node"><span class="ic">${ic("map",22)}</span><div class="card stack" style="gap:8px">
      <div class="row between"><span class="label">WorldQuest trip</span>${qStatus}</div>
      <h3>${B.task?esc(B.task.title):"New quest"}</h3><p class="small muted">Fitzwilliam Museum · pairs</p>
      ${U.live?`<div class="row between small"><span>${pairsDone()}/${D.pairs.length} pairs finished</span><span class="mono">${Math.round(pairsDone()/D.pairs.length*100)}%</span></div><div class="bar"><b style="width:${pairsDone()/D.pairs.length*100}%"></b></div><div class="row"><button data-goto="day">${ic("users")} Open trip day</button></div>`:`<div class="row"><button data-goto="builder">${ic("spark")} ${B.started?"Continue in builder":"Build with AI"}</button></div>`}
     </div></div>`;
    else { const pv=PROVIDERS.find(p=>p.id===t.provider);
      const locked=!U.unlocked;
      h+=`<div class="node exp ${locked?"locked":""}"><span class="ic">${ic(locked?"lock":pv.icon,22)}</span><div class="card stack ${U.unlocked&&U.live?"unlock":""}" style="gap:8px">
      <div class="row between"><span class="label">Experience trip</span>${U.live?(U.unlocked?`<span class="chip ok">Unlocked</span>`:`<span class="chip lock">Locked</span>`):pStatus}</div>
      <h3>${pv.name}</h3><p class="small muted">${pv.who} · ${P.date}</p>
      ${U.override?`<p class="small hint">Unlocked early: “${esc(U.override)}”</p>`:""}
      ${!U.live?`<div class="row"><button data-goto="partners">${ic("mail")} ${P.status==="none"?"Request booking":"View booking"}</button></div>`:""}
     </div></div>`;}
  });
  if(!U.live&&U.trips.length<2){
    if(U.picking) h+=`<div class="card stack" style="margin-top:12px"><span class="label">Choose a partner</span><div class="addmenu">${PROVIDERS.map(p=>`<button data-prov="${p.id}">${ic(p.icon,20)}<b>${p.name}</b><span class="small muted">${p.who}</span></button>`).join("")}</div></div>`;
    else if(U.adding) h+=`<div class="addmenu" style="margin-top:12px">
      ${!q?`<button id="addQuest">${ic("map",20)}<b>WorldQuest trip</b><span class="small muted">Quests, roles, quiz, collectibles</span></button>`:""}
      ${!x?`<button id="addExp" ${q?"":"disabled"}>${ic("brush",20)}<b>Experience trip</b><span class="small muted">${q?"Apply it with a partner":"Add a quest first"}</span></button>`:""}</div>`;
    else h+=`<button id="add" style="margin-top:12px;align-self:flex-start">${ic("plus")} Add trip</button>`;
  }
  h+=`</div>`;
  $("#tmain").innerHTML=h;
  $("#add")&&($("#add").onclick=()=>{U.adding=true;renderUnit()});
  $("#addQuest")&&($("#addQuest").onclick=()=>{U.trips.push({type:"quest"});U.adding=false;renderUnit()});
  $("#addExp")&&($("#addExp").onclick=()=>{U.picking=true;renderUnit()});
  $$("[data-prov]").forEach(b=>b.onclick=()=>{U.trips.push({type:"exp",provider:b.dataset.prov});U.picking=false;U.adding=false;renderUnit()});
  $$("[data-goto]").forEach(b=>b.onclick=()=>go(b.dataset.goto));
  $("#rule")&&($("#rule").onchange=e=>{U.rule=e.target.value});
  $("#launch")&&($("#launch").onclick=launchDay);
}
function launchDay(){startTripDay()}
