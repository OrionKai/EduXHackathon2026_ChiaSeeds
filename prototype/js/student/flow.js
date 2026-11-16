// Student phone flow. Each step belongs to a quest (STEP_Q); the header shows the student's own task and what finishes the quest.
const S={A:fresh(),B:fresh()};
function fresh(){return{step:0,alias:"",pick:null,quiz:[],qi:0,tries:0,answer:"",card:{obs:"",int:"",q:""},egg:false,evolved:false,done:[]}}
const STEPS=["join","hub","mission","scan","collect","encounter","look","card","quiz","pair","journal","checkin"];
const STEP_Q={mission:"q1",scan:"q1",collect:"q1",encounter:"q2",look:"q3",card:"q3",quiz:"q4",pair:"q5"};
const roleTitle=r=>ROLE_DEFS.find(x=>x.id===r).title;
const sWho=(v,role)=>v==="Pair"?"either of you":v==="Each"?"each of you":v===role?"you":`your ${roleTitle(v)}`;
const sDone=(q,role)=>DONE_TYPES[q.done].text(sWho(q.doneBy,role));
const score=s=>s.quiz.filter((a,k)=>a===QUIZ[k].a).length;
const hasColl=(s,id)=>id==="c1"?s.done.includes("q1"):id==="c2"?score(s)>=COLL_DEFS[1].trigger.min:s.egg;

function completeQuest(role,qid){const s=S[role];if(s.done.includes(qid))return;s.done.push(qid);
  const i=QUEST_DEFS.findIndex(q=>q.id===qid);toast(`Quest ${i+1} complete`)}
function qhead(role,qid){const i=QUEST_DEFS.findIndex(q=>q.id===qid),q=QUEST_DEFS[i],d=DONE_TYPES[q.done];
  return `<div class="qhead"><div class="row between"><span class="label">Quest ${i+1} of ${QUEST_DEFS.length} · ${q.min} min</span><button class="tiny ghost" data-hub>All quests</button></div>
   <b style="font-family:var(--f-display);font-size:19px">${esc(q.title)}</b>
   <span class="line">${rdotS(role)}<span><b>Your job:</b> ${esc(q.tasks[role])}</span></span>
   <span class="line muted">${ic(d.icon,14)}<span><b>Done when</b> ${esc(sDone(q,role))}${q.done==="teacher"?" · counts once your teacher approves":d.check==="teacher"?" · your teacher gives feedback later":""}</span></span></div>`}
const rdotS=r=>`<span class="rdot ${r}">${r}</span>`;
function hubList(role){const s=S[role],now=QUEST_DEFS.find(q=>!s.done.includes(q.id));
  return `<div class="ql">${QUEST_DEFS.map((q,i)=>{const done=s.done.includes(q.id),cur=q===now,rw=q.reward&&COLL_DEFS.find(c=>c.id===q.reward);
    return `<div class="qi ${done?"done":cur?"now":""}"><span class="qn">${done?ic("check",14):i+1}</span><div class="stack" style="gap:3px">
     <div class="row between"><b>${esc(q.title)}</b>${rw?`<span class="chip ${done?"ok":"lock"}">${esc(rw.title)}</span>`:""}</div>
     <span class="small">${esc(q.tasks[role])}</span><span class="small muted">Done when ${esc(sDone(q,role))}${DONE_TYPES[q.done].check==="teacher"?" (teacher checks)":""}</span></div></div>`}).join("")}</div>`}
function openHub(role){const o=$("#overlay");o.hidden=false;
  o.innerHTML=`<div class="card stack" style="max-width:420px;text-align:left;max-height:90vh;overflow:auto"><div class="row between"><h2>Your quests</h2><button class="tiny" id="hubClose">Close</button></div>${hubList(role)}</div>`;
  $("#hubClose").onclick=()=>o.hidden=true}

function renderStudent(role){
  stopCam();eggRole=role;const s=S[role],name=roleTitle(role);
  $("#app").innerHTML=`<div class="phone">
   <div class="topbar" style="margin-bottom:8px"><a class="brand" href="#">${logo} WorldQuest</a>${s.step>0?`<span class="role-badge">${rdotS(role)} ${name}</span>`:""}</div>
   <div class="steps" id="stepbar" aria-hidden="true">${STEPS.map((_,i)=>`<i class="${i<=s.step?"on":""}"></i>`).join("")}</div>
   <div id="smain" class="stack"></div>
   <p class="small muted" style="margin-top:24px;text-align:center"><a href="#" id="restart">Restart</a></p></div>`;
  $("#restart").onclick=e=>{e.preventDefault();S[role]=fresh();renderStudent(role)};
  let taps=0,tt;$("#stepbar").onclick=()=>{taps++;clearTimeout(tt);tt=setTimeout(()=>taps=0,600);if(taps>=3)foundEgg()};
  const st=STEPS[s.step];ST[st](role,s);
  if(STEP_Q[st]&&st!=="collect")$("#smain").insertAdjacentHTML("afterbegin",qhead(role,STEP_Q[st]));
  $$("[data-hub]").forEach(b=>b.onclick=()=>openHub(role));
}
const next=role=>{S[role].step++;renderStudent(role);scrollTo(0,0)};
const away=t=>`<div class="away">${ic("users",20)} ${t}</div>`;
const vfHTML=(sq)=>`<div class="vf" ${sq?'style="aspect-ratio:1"':""}><video id="vid" playsinline muted></video><span id="vfmsg" style="position:relative;padding:20px">Starting camera…</span><div class="reticle" id="ret" ${sq?'style="inset:18%"':""}></div>${sq?"":'<div class="scanline" id="sl"></div>'}</div>
 <div id="camfail" hidden><label class="btn primary big" for="cap">${ic("cam")} Take a photo instead</label><input id="cap" type="file" accept="image/*" capture="environment" hidden></div>`;
function qrScreen(expected,ok){
  openCam($("#vid")).then(()=>{$("#vfmsg").remove();startQRScan($("#vid"),expected,ok)}).catch(()=>{$("#vfmsg").textContent="Camera not available here";$("#camfail").hidden=false;
    $("#cap").onchange=async e=>{const f=e.target.files[0];if(f&&await readQRFromFile(f)===expected)ok();else toast("Couldn't read it. Try again.")}})}

const ST={
 join(role,s){
  $("#smain").innerHTML=`<h1 style="font-size:32px">Join your trip</h1>
   <div class="card stack"><label class="small" for="code">Session code</label><input id="code" class="mono" value="${CODES.session}">
   <label class="small" for="alias">Team name</label><input id="alias" placeholder="Clockwatchers" value="${esc(s.alias)}"></div>
   <button class="primary big" id="go">Join</button>`;
  $("#go").onclick=()=>{s.alias=$("#alias").value.trim()||"Clockwatchers";armTilt();next(role)}},
 hub(role,s){const r=ROLE_DEFS.find(x=>x.id===role);
  $("#smain").innerHTML=`<div><span class="label">Team ${esc(s.alias)} · Fitzwilliam Museum</span><h2>You are the ${r.title}</h2></div>
   <div class="card stack" style="gap:6px"><span class="line small">${rdotS(role)} <b>You hold:</b> ${esc(r.holds)}</span><span class="small muted">Your partner holds something different. You'll need each other.</span></div>
   ${hubList(role)}<button class="primary big" id="go">Start Quest 1</button>`;
  $("#go").onclick=()=>next(role)},
 mission(role,s){
  if(role==="A"){
   $("#smain").innerHTML=`<div class="card stack"><span class="label">Your riddle</span><p class="riddle">“I tell the time, yet I'm shaped to remind my owner their time will run out.”</p></div>
    ${away("Read it to your Navigator. Phone away.")}<button class="primary big" id="go">We've found it</button>`;
   $("#go").onclick=()=>next(role);
  }else{
   $("#smain").innerHTML=`<div class="card stack map"><span class="label">Your map · which case?</span>
    <svg viewBox="0 0 340 230" role="group" aria-label="Gallery map"><rect class="wall" x="6" y="6" width="328" height="218" rx="8"/><text class="faint" x="20" y="214">Entrance</text>
    ${[[30,36,"1"],[130,112,"2"],[235,36,"3"]].map(([x,y,n])=>`<g class="case ${s.pick===n?(n==="2"?"sel":"bad"):""}" data-case="${n}" tabindex="0" role="button" aria-label="Case ${n}"><rect x="${x}" y="${y}" width="80" height="58" rx="6"/><text x="${x+40}" y="${y+34}" text-anchor="middle">Case ${n}</text></g>`).join("")}</svg></div>
    ${s.pick&&s.pick!=="2"?`<div class="hint">Not quite. Ask for the riddle again.</div>`:away("Ask your Riddle Keeper what you're looking for.")}
    <button class="primary big" id="go" ${s.pick==="2"?"":"disabled"}>This is the one</button>`;
   $$("[data-case]").forEach(g=>{const f=()=>{s.pick=g.dataset.case;renderStudent(role)};g.onclick=f;g.onkeydown=e=>{if(e.key==="Enter"||e.key===" ")f()}});
   $("#go").onclick=()=>next(role);
  }},
 scan(role,s){
  if(role==="A"){
   $("#smain").innerHTML=`<div class="card stack"><h3>Your Navigator is scanning</h3><p class="small muted">Check the object matches every part of your riddle while you wait.</p></div>
    <button class="primary big" id="go">They scanned it</button>`;
   $("#go").onclick=()=>{completeQuest(role,"q1");next(role)};return}
  $("#smain").innerHTML=vfHTML()+`<p class="small muted">Objects only, never people. Nothing is saved.</p>`;
  const detected=()=>{const r=$("#ret");if(!r)return;r.classList.add("hit");$("#sl")?.remove();
    $(".vf").insertAdjacentHTML("beforeend",`<div class="detect pop"><div><b>Skull watch</b><br><span class="small" style="opacity:.75">Match 94% · simulated</span></div><button class="primary" id="collect">Confirm</button></div>`);
    $("#collect").onclick=()=>{stopCam();completeQuest(role,"q1");next(role)}};
  openCam($("#vid")).then(()=>{$("#vfmsg").remove();setTimeout(detected,2600)}).catch(()=>{
    $("#vfmsg").textContent="Camera not available here";$("#sl")?.remove();$("#camfail").hidden=false;
    $("#cap").onchange=e=>{const f=e.target.files[0];if(!f)return;$(".vf").insertAdjacentHTML("afterbegin",`<img src="${URL.createObjectURL(f)}" alt="Your photo">`);$("#vfmsg").remove();$("#camfail").hidden=true;setTimeout(detected,1200)}})},
 collect(role,s){const c=COLL_DEFS[0];
  $("#smain").innerHTML=`<div style="text-align:center" class="stack"><span class="label">Quest 1 reward · ${TO_TEXT[c.to].toLowerCase()}</span><h1 style="font-size:30px">${c.title}</h1></div>
   <div class="collectible pop"><div class="coll-card">${watchArt(130)}<span class="label">Level 1</span></div></div>
   <p style="text-align:center"><span class="chip sim">Manifest 3D model · simulated</span></p>
   <div class="card small stack" style="gap:6px"><span><b>Memento mori</b> = “remember you must die.” Owners carried it to use their time well.</span><span class="muted">${ic("spark",13)} Evolves: ${esc(c.evolve.toLowerCase())}.</span></div>
   <button class="primary big" id="go">Next: Quest 2</button>`;
  $("#go").onclick=()=>next(role)},
 encounter(role,s){
  if(role==="A"){
   $("#smain").innerHTML=`<div class="card stack"><span class="label">Ask the attendant</span><p class="riddle" style="font-size:21px">“Which object here is oldest, and how can you tell?”</p></div>
    ${away("Your Navigator writes down what you hear.")}<button class="primary big" id="go">They've submitted it</button>`;
   $("#go").onclick=()=>{completeQuest(role,"q2");next(role)};return}
  $("#smain").innerHTML=`<div class="card stack"><span class="label">Your partner asks</span><p class="small">“Which object here is oldest, and how can you tell?”</p>
   <label class="small" for="ans">One new fact you heard</label><input id="ans" placeholder="e.g. the watch is about 400 years old" value="${esc(s.answer)}"></div>
   <button class="primary big" id="go">Submit</button>`;
  $("#go").onclick=()=>{s.answer=$("#ans").value.trim();if(!s.answer){toast("Write a few words first");return}completeQuest(role,"q2");next(role)}},
 look(role,s){
  if(role==="A"){
   $("#smain").innerHTML=`<div class="card stack small"><p>1 · What is it made of?</p><p>2 · What moves or opens?</p><p>3 · What is carved on it?</p></div>
    ${away("Say them out loud while your Navigator sketches.")}<button class="primary big" id="go">Done, write the card</button>`}
  else $("#smain").innerHTML=`<div class="card stack"><h3>Sketch one detail</h3><p class="small muted">On paper, not the phone. Your Riddle Keeper names 3 details first.</p></div>
    ${away("Phone away while you sketch.")}<button class="primary big" id="go">Sketched, write the card</button>`;
  $("#go").onclick=()=>next(role)},
 card(role,s){const c=s.card;
  $("#smain").innerHTML=`<div class="card stack"><p class="small muted">One card per pair, from either phone. Approved cards become quests for next year's class.</p>
   <label class="small" for="obs">We saw…</label><textarea id="obs" placeholder="The jaw opens on a hinge">${esc(c.obs)}</textarea>
   <label class="small" for="int">We think it means…</label><textarea id="int" placeholder="The owner faced death every time they checked the time">${esc(c.int)}</textarea>
   <label class="small" for="cq">Our question</label><input id="cq" placeholder="Why want this reminder?" value="${esc(c.q)}"></div>
   <button class="primary big" id="go">Submit card</button>`;
  $("#go").onclick=()=>{c.obs=$("#obs").value;c.int=$("#int").value;c.q=$("#cq").value;if(!c.obs.trim()){toast("Write what you saw first");return}completeQuest(role,"q3");next(role)}},
 quiz(role,s){
  const i=s.qi,min=COLL_DEFS[1].trigger.min;
  if(i>=QUIZ.length){const sc=score(s),pass=sc>=min;
   $("#smain").innerHTML=`<div style="text-align:center" class="stack"><span class="label">Your score</span><h1 style="font-size:52px">${sc}/${QUIZ.length}</h1>
    ${pass?`<div class="collectible pop">${badgeArt(110)}</div><h2>Timekeeper badge</h2><p class="small muted">Earned for ${min} of 3 or more</p>`:`<p class="muted">${min} of 3 earns the Timekeeper badge.${s.tries<1?" You have one retry.":""}</p>`}</div>
    ${!pass&&s.tries<1?`<button class="primary big" id="retry">Retry</button>`:""}<button class="${pass||s.tries>=1?"primary ":""}big" id="go">Next: Quest 5</button>`;
   $("#go").onclick=()=>{completeQuest(role,"q4");next(role)};$("#retry")&&($("#retry").onclick=()=>{s.qi=0;s.quiz=[];s.tries++;renderStudent(role)});return}
  const q=QUIZ[i],ans=s.quiz[i],src=SAMPLE_SOURCES.find(x=>x.id===q.src);
  $("#smain").innerHTML=`<div class="row between"><span class="label">Question ${i+1} of ${QUIZ.length}</span><span class="chip ai">${ic("spark")} AI-written · teacher-approved</span></div>
   <h2>${esc(q.q)}</h2>
   <div class="stack" style="gap:8px">${q.o.map((o,k)=>`<button class="qopt ${ans!=null?(k===q.a?"right":k===ans?"wrong":""):""}" data-o="${k}" ${ans!=null?"disabled":""}>${esc(o)}</button>`).join("")}</div>
   ${ans!=null?`<p class="small muted">${ic("doc",13)} From: ${esc(src.title)}</p><button class="primary big" id="nq">${i+1<QUIZ.length?"Next":"See score"}</button>`:""}`;
  $$("[data-o]").forEach(b=>b.onclick=()=>{s.quiz[i]=+b.dataset.o;renderStudent(role)});
  $("#nq")&&($("#nq").onclick=()=>{s.qi++;renderStudent(role)})},
 pair(role,s){
  const ok=()=>{stopCam();completeQuest(role,"q5");next(role)};
  if(role==="A"){
   $("#smain").innerHTML=`<div class="card"><div class="qr" id="pqr"></div></div><button class="primary big" id="go">They scanned it</button>`;
   makeQR($("#pqr"),CODES.pair);$("#go").onclick=ok;return}
  $("#smain").innerHTML=vfHTML(true)+`<details><summary class="small" style="cursor:pointer">Type it instead</summary><div class="row" style="margin-top:8px"><input id="typed" class="mono" placeholder="WQ-PAIR-…" style="flex:1"><button id="tgo">OK</button></div></details>`;
  qrScreen(CODES.pair,ok);
  $("#tgo").onclick=()=>{$("#typed").value.trim().toUpperCase()===CODES.pair?ok():toast("Code doesn't match")}},
 journal(role,s){
  const row=(c,got,cond)=>`<div class="jitem ${got?"":"locked"}" style="${got?"":"opacity:.55"}"><div class="mini" style="${got?"":"background:var(--sunk);border-color:var(--line)"}">${got?(c.art==="watch"?watchArt(42):c.art==="badge"?badgeArt(40):domeArt(40)):(c.hidden?"?":ic("lock",18))}</div>
    <div><b>${got||!c.hidden?esc(c.title):"Hidden"}</b><p class="small muted">${got?`${c.type} · collected`:cond}</p></div></div>`;
  $("#smain").innerHTML=`<h1 style="font-size:30px">Trip complete</h1>
   <div class="card stack"><span class="label">Collected</span>
    ${row(COLL_DEFS[0],hasColl(s,"c1"),"Finish Quest 1")}
    ${row(COLL_DEFS[1],hasColl(s,"c2"),`Score ${COLL_DEFS[1].trigger.min} of 3 in Quest 4`)}
    ${row(COLL_DEFS[2],hasColl(s,"c3"),"Explorers notice more")}</div>
   <div class="card stack"><span class="label">Waiting for your teacher</span>
    <div class="jitem"><div class="mini" style="background:var(--accent-soft);border-color:var(--accent)">${ic("edit",20)}</div><div><b>Quest 2 answer and Quest 3 card</b><p class="small"><span class="chip edit">Submitted · teacher reviewing</span></p></div></div></div>
   <div class="card stack"><div class="row between"><span class="label">Up next</span><span class="chip lock">${ic("lock",12)} Unlocks when every pair finishes</span></div><h3>Still-life drawing class</h3><p class="small muted">Riverside Art Studio · Thu 3 Dec</p></div>
   <button class="big" id="go">Demo: jump to class day</button>`;
  $("#go").onclick=()=>next(role)},
 checkin(role,s){
  if(s.evolved){
   $("#smain").innerHTML=`<div style="text-align:center" class="stack"><span class="label">Evolved</span><h1 style="font-size:30px">Memento Mori Watch</h1></div>
    <div class="collectible pop"><div class="coll-card evolved">${watchArt(130,true)}<span class="label" style="color:var(--gold)">Level 2 · Applied</span></div></div>
    <div class="card stack"><label for="refl">What did the watch help you notice in your drawing?</label><textarea id="refl"></textarea><button class="primary" id="done">Save</button></div>`;
   $("#done").onclick=()=>toast("Saved. Phones away, enjoy the class.");return}
  $("#smain").innerHTML=`<div><span class="label">Class unlocked</span><h2>Check in at the studio</h2><p class="small muted">Scan the code at the door. Your watch evolves.</p></div>`+vfHTML(true)+`<button id="skip">No phone? Teacher checks you in</button>`;
  const ok=()=>{stopCam();s.evolved=true;toast("Checked in. Your collectible evolved!");renderStudent(role)};
  qrScreen(CODES.checkin,ok);$("#skip").onclick=ok}
};
