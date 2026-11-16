// Trip day: live class progress per pair, review queue for teacher-checked quests, stuck pairs, unlock.
const D={pairs:[],queue:[],timer:null,stuckShown:false,returning:null};
const pairsDone=()=>D.pairs.filter(p=>p.q>=questList().length).length;
const questList=()=>B.quests.length?B.quests:QUEST_DEFS;

function startTripDay(){
  D.pairs=PAIR_NAMES.map((name,i)=>({id:i,name,q:0,stuck:null,badges:0,egg:false}));
  D.queue=[];U.live=true;toast(`Session ${CODES.session} is live`);
  D.timer=setInterval(tickDay,650);go("day");
}
function tickDay(){
  const qs=questList(),open=D.pairs.filter(p=>p.q<qs.length&&!p.stuck&&!p.waiting);
  if(!open.length){if(D.pairs.every(p=>p.q>=qs.length)){clearInterval(D.timer);finishDay()}return}
  const p=open[Math.floor(Math.random()*open.length)];
  if(!D.stuckShown&&p.q===0&&D.pairs.filter(x=>x.q>0).length>4){D.stuckShown=true;p.stuck="Camera can't scan the object (glare on the case)";refreshDay();return}
  const q=qs[p.q];const blocks=q.done==="teacher";if(blocks)p.waiting=true;else p.q++;
  if(DONE_TYPES[q.done].check==="teacher"){
    const card=q.done==="card"||q.done==="teacher";
    D.queue.push({id:"r"+Math.random().toString(36).slice(2,7),pair:p.name,pid:p.id,blocks,quest:q,status:"pending",
      text:card?SAMPLE_CARDS[D.queue.length%SAMPLE_CARDS.length]:SAMPLE_ANSWERS[D.queue.length%SAMPLE_ANSWERS.length]});
  }
  if(q.done==="quiz")p.badges=[2,2,1,2,0][p.id%5];
  if(p.q===2&&p.id%4===0)p.egg=true;
  refreshDay();
}
function finishDay(){
  if(U.rule==="all"&&!U.unlocked){U.unlocked=true;toast("Every pair finished. Drawing class unlocked.")}
  refreshDay(true);
}
function refreshDay(full){
  if(TAB==="unit"&&$(".flow")){renderUnit();return}
  if(TAB!=="day")return;
  if(full||!$("#dqueue")?.contains(document.activeElement)) renderDay();
  else{$("#dstats").innerHTML=statsHTML();$("#dpairs").innerHTML=pairsHTML();bindPairs()}
}
function statsHTML(){const pend=D.queue.filter(r=>r.status==="pending").length,stuck=D.pairs.filter(p=>p.stuck).length;
  return [["Pairs finished",`${pairsDone()}/${D.pairs.length}`],["Waiting for you",pend],["Need help",stuck],["Easter eggs found",D.pairs.filter(p=>p.egg).length]]
   .map(([k,v])=>`<div class="stat ${k==="Need help"&&v?"warn":""}"><b>${v}</b><span class="small muted">${k}</span></div>`).join("")}
function pairsHTML(){const qs=questList();
  return `<table class="qt pairs"><thead><tr><th>Pair</th>${qs.map((q,i)=>`<th title="${esc(q.title)}">Q${i+1}</th>`).join("")}<th>Collected</th></tr></thead><tbody>
   ${D.pairs.map(p=>`<tr class="${p.stuck?"stuckrow":""}"><td><b>${esc(p.name)}</b>${p.stuck?`<div class="small" style="color:var(--warn)">${ic("lock",12)} Stuck on Q${p.q+1}: ${esc(p.stuck)}</div><button class="tiny" data-unstick="${p.id}" style="margin-top:4px">Mark Q${p.q+1} done (checked in person)</button>`:""}</td>
    ${qs.map((q,i)=>`<td><span class="qdot ${i<p.q?"done":i===p.q&&p.q<qs.length?(p.stuck?"stuck":p.waiting?"wait":"now"):""}" title="${i<p.q?"Done":i===p.q?"In progress":"Not started"}"></span></td>`).join("")}
    <td class="row" style="gap:4px;flex-wrap:nowrap">${p.q>=1?`<span class="mini xs">${watchArt(18)}</span>`:""}${p.badges>=2?`<span class="mini xs" style="background:var(--accent-soft);border-color:var(--accent)">${badgeArt(18)}</span>`:""}${p.egg?`<span class="mini xs" style="background:var(--ai-soft);border-color:var(--ai)">${domeArt(18)}</span>`:""}</td></tr>`).join("")}
   </tbody></table>`}
function reviewHTML(){
  const pend=D.queue.filter(r=>r.status==="pending").sort((a,b)=>b.blocks-a.blocks),done=D.queue.filter(r=>r.status!=="pending");
  if(!D.queue.length)return `<div class="empty">Submissions you need to check will appear here: Quest 2 answers and Quest 3 discovery cards.</div>`;
  return pend.map(r=>{const isCard=typeof r.text==="object";
    return `<div class="rv" ${r.blocks?'style="border-color:var(--ai)"':""}><div class="row between"><b>${esc(r.pair)}</b><span class="chip edit">${esc(r.quest.title)}</span></div>
     ${r.blocks?`<span class="chip ai" style="align-self:flex-start">${ic("lock",12)} Pair is waiting for your approval</span>`:""}
     ${isCard?`<dl class="kvs"><dt>I saw</dt><dd>${esc(r.text.obs)}</dd><dt>I think</dt><dd>${esc(r.text.int)}</dd><dt>Question</dt><dd>${esc(r.text.q)}</dd></dl>`:`<p class="small">“${esc(r.text)}”</p>`}
     ${D.returning===r.id?`<div class="row"><input id="rcomment" placeholder="What should they improve?" style="flex:1;min-width:150px"><button class="tiny primary" data-sendret="${r.id}">Send back</button></div>`:
     `<div class="row"><button class="tiny primary" data-approve="${r.id}">${ic("check",13)} ${isCard?"Approve card":"Looks good"}</button><button class="tiny" data-return="${r.id}">Return with comment</button></div>`}</div>`}).join("")
   +(done.length?`<p class="small muted">${done.filter(r=>r.status==="approved").length} approved · ${done.filter(r=>r.status==="returned").length} returned${done.some(r=>r.status==="approved"&&typeof r.text==="object")?" · approved cards join next year's quest bank":""}</p>`:"")}
function renderDay(){
  if(!U.live){$("#tmain").innerHTML=`<div class="empty" style="max-width:520px">Nothing live yet. Launch trip day from the unit plan.<div style="margin-top:10px"><button data-goto="unit">Go to unit plan</button></div></div>`;$("[data-goto]").onclick=()=>go("unit");return}
  const x=expTrip(),pv=x&&PROVIDERS.find(p=>p.id===x.provider);
  $("#tmain").innerHTML=`<div class="stack" style="gap:16px">
   <div class="row between"><div><span class="label">Live · session ${CODES.session}</span><h2>${B.task?esc(B.task.title):"Trip day"}</h2></div>
    ${pv?`<div class="card row" style="padding:10px 14px;gap:10px">${ic(U.unlocked?pv.icon:"lock")}<span class="small"><b>${pv.name}</b><br>${U.unlocked?"Unlocked for the class":U.rule==="all"?"Unlocks when every pair finishes":"You unlock it"}</span>
     ${U.unlocked?"":D.showOverride?`<input id="reason" placeholder="Reason" style="width:150px"><button class="tiny primary" id="doUnlock">Unlock</button>`:`<button class="tiny" id="override">Unlock now</button>`}</div>`:""}</div>
   ${U.override?`<p class="small hint">Unlocked early: “${esc(U.override)}”</p>`:""}
   <div class="stats" id="dstats">${statsHTML()}</div>
   <div class="dash">
    <section class="panel"><div class="panel-h"><h3>${ic("users")} Pairs</h3><span class="row small muted" style="gap:10px"><span><span class="qdot done"></span> done</span><span><span class="qdot now"></span> working</span><span><span class="qdot wait"></span> needs your approval</span><span><span class="qdot stuck"></span> stuck</span></span></div><div class="tablewrap" id="dpairs">${pairsHTML()}</div></section>
    <section class="panel"><div class="panel-h"><h3>${ic("edit")} Check submissions</h3><span class="count">${D.queue.filter(r=>r.status==="pending").length} waiting</span></div>
     <p class="small muted">Most quests finish when students submit; your review is feedback. Quests set to “Teacher approves” wait for you.</p><div class="stack" id="dqueue">${reviewHTML()}</div></section>
   </div></div>`;
  bindPairs();
  $$("[data-approve]").forEach(b=>b.onclick=()=>{const r=D.queue.find(r=>r.id===b.dataset.approve);r.status="approved";if(r.blocks){const p=D.pairs[r.pid];p.waiting=false;p.q++;toast(`${p.name} can move on`)}renderDay()});
  $$("[data-return]").forEach(b=>b.onclick=()=>{D.returning=b.dataset.return;renderDay();$("#rcomment")?.focus()});
  $$("[data-sendret]").forEach(b=>b.onclick=()=>{const r=D.queue.find(r=>r.id===b.dataset.sendret);r.status="returned";r.comment=$("#rcomment").value;if(r.blocks)D.pairs[r.pid].waiting=false;D.returning=null;toast(`Sent back to ${r.pair}`);renderDay()});
  $("#override")&&($("#override").onclick=()=>{D.showOverride=true;renderDay()});
  $("#doUnlock")&&($("#doUnlock").onclick=()=>{const r=$("#reason").value.trim();if(!r){toast("Add a reason first");return}U.override=r;U.unlocked=true;D.showOverride=false;toast("Unlocked for the class");renderDay()});
}
function bindPairs(){$$("[data-unstick]").forEach(b=>b.onclick=()=>{const p=D.pairs[+b.dataset.unstick];p.stuck=null;p.q++;toast(`${p.name}: quest marked done by you`);refreshDay(true)})}
