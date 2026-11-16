// Student phone flow: one function per step in STEPS.
const S={A:fresh(),B:fresh()};
function fresh(){return{step:0,alias:"",pick:null,quiz:[],qi:0,answer:"",card:{obs:"",int:"",q:""},egg:false,evolved:false,photo:null}}
const STEPS=["join","mission","encounter","scan","quiz","pair","collect","card","journal","checkin"];
function renderStudent(role){
  stopCam();eggRole=role;const s=S[role];const name=role==="A"?"Riddle Keeper":"Navigator";
  $("#app").innerHTML=`<div class="phone">
   <div class="topbar" style="margin-bottom:8px"><a class="brand" href="#">${logo} WorldQuest</a>${s.step>0?`<span class="role-badge">${name}</span>`:""}</div>
   <div class="steps" id="stepbar" aria-hidden="true">${STEPS.map((_,i)=>`<i class="${i<=s.step?"on":""}"></i>`).join("")}</div>
   <div id="smain" class="stack"></div>
   <p class="small muted" style="margin-top:24px;text-align:center"><a href="#" id="restart">Restart</a></p></div>`;
  $("#restart").onclick=e=>{e.preventDefault();S[role]=fresh();renderStudent(role)};
  let taps=0,tt;$("#stepbar").onclick=()=>{taps++;clearTimeout(tt);tt=setTimeout(()=>taps=0,600);if(taps>=3)foundEgg()};
  ST[STEPS[s.step]](role,s);
}
const next=role=>{S[role].step++;renderStudent(role);scrollTo(0,0)};
const ST={
 join(role,s){
  $("#smain").innerHTML=`<h1 style="font-size:32px">Join your trip</h1>
   <div class="card stack"><label class="small" for="code">Session code</label><input id="code" class="mono" value="${CODES.session}">
   <label class="small" for="alias">Team name</label><input id="alias" placeholder="Clockwatchers" value="${esc(s.alias)}"></div>
   <button class="primary big" id="go">Join</button>`;
  $("#go").onclick=()=>{s.alias=$("#alias").value.trim()||"Clockwatchers";armTilt();next(role)}},
 mission(role,s){
  const head=`<div><span class="label">Fitzwilliam Museum · Team ${esc(s.alias)}</span><h2>The Case of the Missing Label</h2></div>`;
  if(role==="A"){
   $("#smain").innerHTML=head+`<div class="card stack"><span class="label">Your riddle</span><p class="riddle">“I tell the time, yet I'm shaped to remind my owner their time will run out.”</p></div>
    <div class="away">${ic("users",20)} Read it to your Navigator. Phone away.</div>
    <button class="primary big" id="go">We found it</button>`;
   $("#go").onclick=()=>next(role);
  }else{
   $("#smain").innerHTML=head+`<div class="card stack map"><span class="label">Your map · which case?</span>
    <svg viewBox="0 0 340 230" role="group" aria-label="Gallery map"><rect class="wall" x="6" y="6" width="328" height="218" rx="8"/><text class="faint" x="20" y="214">Entrance</text>
    ${[[30,36,"1"],[130,112,"2"],[235,36,"3"]].map(([x,y,n])=>`<g class="case ${s.pick===n?(n==="2"?"sel":"bad"):""}" data-case="${n}" tabindex="0" role="button" aria-label="Case ${n}"><rect x="${x}" y="${y}" width="80" height="58" rx="6"/><text x="${x+40}" y="${y+34}" text-anchor="middle">Case ${n}</text></g>`).join("")}</svg></div>
    ${s.pick&&s.pick!=="2"?`<div class="hint">Not quite. Ask for the riddle again.</div>`:`<div class="away">${ic("users",20)} Ask your Riddle Keeper what you're looking for.</div>`}
    <button class="primary big" id="go" ${s.pick==="2"?"":"disabled"}>This is the one</button>`;
   $$("[data-case]").forEach(g=>{const f=()=>{s.pick=g.dataset.case;renderStudent(role)};g.onclick=f;g.onkeydown=e=>{if(e.key==="Enter"||e.key===" ")f()}});
   $("#go").onclick=()=>next(role);
  }},
 encounter(role,s){
  $("#smain").innerHTML=`<div><span class="label">Talk to someone</span><h2>Ask the gallery attendant</h2></div>
   <div class="card stack"><p class="riddle" style="font-size:21px">“Which object here is oldest, and how can you tell?”</p></div>
   <div class="card stack"><label class="small" for="ans">One thing you learned</label><input id="ans" placeholder="e.g. about 400 years old" value="${esc(s.answer)}"></div>
   <button class="primary big" id="go">Save</button>`;
  $("#go").onclick=()=>{s.answer=$("#ans").value.trim();if(!s.answer){toast("Write a few words first");return}next(role)}},
 scan(role,s){
  if(role==="A"){
   $("#smain").innerHTML=`<div><span class="label">Look closer</span><h2>Spot 3 details</h2></div>
    <div class="card stack small"><p>1 · What is it made of?</p><p>2 · What moves or opens?</p><p>3 · What is carved on it?</p></div>
    <div class="away">${ic("users",20)} Say them out loud. Your Navigator is scanning.</div>
    <button class="primary big" id="go">Done</button>`;
   $("#go").onclick=()=>next(role);return}
  $("#smain").innerHTML=`<div><span class="label">Discovery</span><h2>Scan the object</h2></div>
   <div class="vf" id="vf"><video id="vid" playsinline muted></video><span id="vfmsg" style="position:relative;padding:20px">Starting camera…</span><div class="reticle" id="ret"></div><div class="scanline" id="sl"></div></div>
   <div id="camfail" hidden class="stack"><label class="btn primary big" for="cap">${ic("cam")} Take a photo</label><input id="cap" type="file" accept="image/*" capture="environment" hidden></div>
   <p class="small muted">Objects only, never people. Nothing is saved.</p>`;
  const detected=()=>{const r=$("#ret");if(!r)return;r.classList.add("hit");$("#sl")?.remove();
    $("#vf").insertAdjacentHTML("beforeend",`<div class="detect pop"><div><b>Skull watch</b><br><span class="small" style="opacity:.75">Match 94% · simulated</span></div><button class="primary" id="collect">Capture</button></div>`);
    $("#collect").onclick=()=>{stopCam();next(role)}};
  openCam($("#vid")).then(()=>{$("#vfmsg").remove();setTimeout(detected,2600)}).catch(()=>{
    $("#vfmsg").textContent="Camera not available here";$("#sl")?.remove();$("#camfail").hidden=false;
    $("#cap").onchange=e=>{const f=e.target.files[0];if(!f)return;$("#vf").insertAdjacentHTML("afterbegin",`<img src="${URL.createObjectURL(f)}" alt="Your photo">`);$("#vfmsg").remove();$("#camfail").hidden=true;
      $("#vf").insertAdjacentHTML("beforeend",`<div class="scanline" id="sl"></div>`);setTimeout(detected,1500)}})},
 quiz(role,s){
  const i=s.qi;
  if(i>=QUIZ.length){const score=s.quiz.filter((a,k)=>a===QUIZ[k].a).length,pass=score>=2;
   $("#smain").innerHTML=`<div style="text-align:center" class="stack"><span class="label">Knowledge check</span><h1 style="font-size:52px">${score}/${QUIZ.length}</h1>
    ${pass?`<div class="collectible pop">${badgeArt(110)}</div><h2>Timekeeper badge</h2>`:`<p class="muted">2 to earn the badge.</p>`}</div>
    ${pass?`<button class="primary big" id="go">Continue</button>`:`<button class="primary big" id="retry">Try again</button><button class="big" id="go">Skip for now</button>`}`;
   $("#go").onclick=()=>next(role);$("#retry")&&($("#retry").onclick=()=>{s.qi=0;s.quiz=[];renderStudent(role)});return}
  const q=QUIZ[i],ans=s.quiz[i],src=SAMPLE_SOURCES.find(x=>x.id===q.src);
  $("#smain").innerHTML=`<div class="row between"><span class="label">Question ${i+1} of ${QUIZ.length}</span><span class="chip ai">${ic("spark")} AI-written · teacher-approved</span></div>
   <h2>${esc(q.q)}</h2>
   <div class="stack" style="gap:8px">${q.o.map((o,k)=>`<button class="qopt ${ans!=null?(k===q.a?"right":k===ans?"wrong":""):""}" data-o="${k}" ${ans!=null?"disabled":""}>${esc(o)}</button>`).join("")}</div>
   ${ans!=null?`<p class="small muted">${ic("doc",13)} From: ${esc(src.title)}</p><button class="primary big" id="nq">${i+1<QUIZ.length?"Next":"See score"}</button>`:""}`;
  $$("[data-o]").forEach(b=>b.onclick=()=>{s.quiz[i]=+b.dataset.o;renderStudent(role)});
  $("#nq")&&($("#nq").onclick=()=>{s.qi++;renderStudent(role)})},
 pair(role,s){
  if(role==="A"){
   $("#smain").innerHTML=`<div><span class="label">Together</span><h2>Show this to your Navigator</h2></div>
    <div class="card"><div class="qr" id="pqr"></div></div>
    <button class="primary big" id="go">They scanned it</button>`;
   makeQR($("#pqr"),CODES.pair);$("#go").onclick=()=>next(role);return}
  $("#smain").innerHTML=`<div><span class="label">Together</span><h2>Scan your partner's code</h2></div>
   <div class="vf" style="aspect-ratio:1"><video id="vid" playsinline muted></video><span id="vfmsg" style="position:relative;padding:20px">Starting camera…</span><div class="reticle" style="inset:18%"></div></div>
   <div id="camfail" hidden><label class="btn primary big" for="cap">${ic("cam")} Photograph the code</label><input id="cap" type="file" accept="image/*" capture="environment" hidden></div>
   <details><summary class="small" style="cursor:pointer">Type it instead</summary><div class="row" style="margin-top:8px"><input id="typed" class="mono" placeholder="WQ-PAIR-…" style="flex:1"><button id="tgo">OK</button></div></details>`;
  const ok=()=>{toast("Pair confirmed");next(role)};
  openCam($("#vid")).then(()=>{$("#vfmsg").remove();startQRScan($("#vid"),CODES.pair,ok)}).catch(()=>{$("#vfmsg").textContent="Camera not available here";$("#camfail").hidden=false;
    $("#cap").onchange=async e=>{const f=e.target.files[0];if(f&&await readQRFromFile(f)===CODES.pair)ok();else toast("Couldn't read it. Try again or type it.")}});
  $("#tgo").onclick=()=>{$("#typed").value.trim().toUpperCase()===CODES.pair?ok():toast("Code doesn't match")}},
 collect(role,s){
  const badge=s.quiz.filter((a,k)=>a===QUIZ[k].a).length>=2;
  $("#smain").innerHTML=`<div style="text-align:center" class="stack"><span class="label">Collected</span><h1 style="font-size:30px">Memento Mori Watch</h1></div>
   <div class="collectible pop"><div class="coll-card">${watchArt(130)}<span class="label">Level 1</span></div></div>
   <p style="text-align:center"><span class="chip sim">Manifest 3D model · simulated</span></p>
   <div class="card small"><b>Memento mori</b> = “remember you must die.” Owners carried it to use their time well.</div>
   ${badge?`<div class="card row" style="flex-wrap:nowrap">${badgeArt(40)}<span class="small"><b>Timekeeper</b> badge also collected</span></div>`:""}
   <button class="primary big" id="go">Write your discovery card</button>`;
  $("#go").onclick=()=>next(role)},
 card(role,s){const c=s.card;
  $("#smain").innerHTML=`<div><span class="label">For next year's class</span><h2>Discovery card</h2></div>
   <div class="card stack"><label class="small" for="obs">I saw…</label><textarea id="obs" placeholder="The jaw opens on a hinge">${esc(c.obs)}</textarea>
   <label class="small" for="int">I think it means…</label><textarea id="int" placeholder="The owner faced death every time they checked the time">${esc(c.int)}</textarea>
   <label class="small" for="cq">My question</label><input id="cq" placeholder="Why want this reminder?" value="${esc(c.q)}"></div>
   <button class="primary big" id="go">Submit</button>`;
  $("#go").onclick=()=>{c.obs=$("#obs").value;c.int=$("#int").value;c.q=$("#cq").value;toast("Sent to your teacher");next(role)}},
 journal(role,s){const badge=s.quiz.filter((a,k)=>a===QUIZ[k].a).length>=2;
  $("#smain").innerHTML=`<h1 style="font-size:30px">Journal</h1>
   <div class="card stack">
    <div class="jitem"><div class="mini">${watchArt(42)}</div><div><b>Memento Mori Watch</b><p class="small muted">Discovery · Level 1</p></div></div>
    ${badge?`<div class="jitem"><div class="mini" style="background:var(--accent-soft);border-color:var(--accent)">${badgeArt(40)}</div><div><b>Timekeeper</b><p class="small muted">Knowledge</p></div></div>`:""}
    ${s.egg?`<div class="jitem"><div class="mini" style="background:var(--ai-soft);border-color:var(--ai)">${domeArt(40)}</div><div><b>Look Up</b><p class="small muted">Easter egg</p></div></div>`:`<div class="jitem" style="opacity:.55"><div class="mini" style="background:var(--sunk);border-color:var(--line)">?</div><div><b>Hidden</b><p class="small muted">Explorers notice more</p></div></div>`}
    <div class="jitem"><div class="mini" style="background:var(--accent-soft);border-color:var(--accent)">${ic("edit",20)}</div><div><b>Discovery card</b><p class="small"><span class="chip edit">Teacher reviewing</span></p></div></div>
   </div>
   <div class="card stack"><div class="row between"><span class="label">Up next</span><span class="chip lock">${ic("lock",12)} 24/28 finished</span></div><h3>Still-life drawing class</h3><p class="small muted">Riverside Art Studio · Thu 3 Dec</p></div>
   <button class="big" id="go">Demo: jump to class day</button>`;
  $("#go").onclick=()=>next(role)},
 checkin(role,s){
  if(s.evolved){
   $("#smain").innerHTML=`<div style="text-align:center" class="stack"><span class="label">Evolved</span><h1 style="font-size:30px">Memento Mori Watch</h1></div>
    <div class="collectible pop"><div class="coll-card evolved">${watchArt(130,true)}<span class="label" style="color:var(--gold)">Level 2 · Applied</span></div></div>
    <div class="card stack"><label for="refl">What did the watch help you notice in your drawing?</label><textarea id="refl"></textarea><button class="primary" id="done">Save</button></div>`;
   $("#done").onclick=()=>toast("Saved. Phones away, enjoy the class.");return}
  $("#smain").innerHTML=`<div><span class="label">Class unlocked</span><h2>Check in at the studio</h2></div>
   <div class="vf" style="aspect-ratio:1"><video id="vid" playsinline muted></video><span id="vfmsg" style="position:relative;padding:20px">Starting camera…</span><div class="reticle" style="inset:18%"></div></div>
   <div id="camfail" hidden><label class="btn primary big" for="cap">${ic("cam")} Photograph the code</label><input id="cap" type="file" accept="image/*" capture="environment" hidden></div>
   <button id="skip">No phone? Teacher checks you in</button>`;
  const ok=()=>{stopCam();s.evolved=true;toast("Checked in. Your collectible evolved!");renderStudent(role)};
  openCam($("#vid")).then(()=>{$("#vfmsg").remove();startQRScan($("#vid"),CODES.checkin,ok)}).catch(()=>{$("#vfmsg").textContent="Camera not available here";$("#camfail").hidden=false;
    $("#cap").onchange=async e=>{const f=e.target.files[0];if(f&&await readQRFromFile(f)===CODES.checkin)ok();else toast("Couldn't read it. Try again.")}});
  $("#skip").onclick=ok}
};
