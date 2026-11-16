// Quest builder: AI chat panel + board of draft cards (sources, task, roles, quests, quiz, collectibles).
const B={started:false,busy:false,msgs:[{who:"a",text:"Hi! Add anything I should stick to — object records, floor plans, your notes. Then tell me about the trip."}],
  sources:[],grounded:true,task:null,roles:[],quests:[],quiz:[],colls:[],done:new Set(),focus:null,hl:null,published:false,pasting:false};
const allCards=()=>[B.task,...B.roles,...B.quests,...B.quiz,...B.colls].filter(Boolean);
const find=id=>allCards().find(c=>c.id===id);

/* ---- readable rule text, shared with the trip-day view ---- */
const roleName=id=>(B.roles.find(r=>r.id===id)||ROLE_DEFS.find(r=>r.id===id)).title;
const whoText=v=>v==="Pair"?"Either partner":v==="Each"?"Each student":`The ${roleName(v)}`;
const doneText=q=>{const t=DONE_TYPES[q.done].text(whoText(q.doneBy));return t[0].toUpperCase()+t.slice(1)};
const collById=id=>B.colls.find(c=>c.id===id)||COLL_DEFS.find(c=>c.id===id);
function whenText(c){const t=c.trigger,qs=B.quests.length?B.quests:QUEST_DEFS;
  if(t.kind==="quest"){const i=qs.findIndex(q=>q.id===t.quest);return i<0?"A quest is finished":`Quest ${i+1} finished (${qs[i].title})`}
  if(t.kind==="quiz")return `Quiz score ${t.min} of 3 or higher`;
  if(t.kind==="sensor")return `Phone tilted up at ${t.place||"a set spot"} (motion sensor)`;
  return "You award it by hand"}
const collCheck=c=>c.trigger.kind==="teacher"?"You":"Automatic";
const artFor=(a,s)=>a==="watch"?watchArt(s):a==="badge"?badgeArt(s):domeArt(s);

/* ---- chat ---- */
function renderBuilder(){
  $("#tmain").innerHTML=`<div class="builder">
    <section class="card chat" aria-label="AI assistant">
      <div class="chat-h"><span class="avatar">${ic("spark")}</span><b>Quest assistant</b><span class="chip sim" style="margin-left:auto">Simulated AI</span></div>
      <div class="msgs" id="msgs" aria-live="polite"></div>
      <div class="sugg" id="sugg"></div>
      <form class="composer" id="composer"><input id="cin" placeholder="Ask for changes or new ideas…" autocomplete="off"><button class="primary" aria-label="Send">${ic("send")}</button></form>
    </section>
    <div class="board" id="board"></div></div>`;
  $("#composer").onsubmit=e=>{e.preventDefault();const v=$("#cin").value.trim();if(v&&!B.busy)freeSend(v)};
  renderChat();renderBoard();
}
function renderChat(){
  const m=$("#msgs");if(!m)return;
  m.innerHTML=B.msgs.map(x=>`<div class="msg ${x.who}">${x.thinking?`<span class="dots"><i></i><i></i><i></i></span>`:esc(x.text)}
    ${x.cites&&x.cites.length?`<div class="row">${x.cites.map(id=>`<button class="cite" data-cite="${id}">${id}</button>`).join("")}</div>`:""}</div>`).join("");
  m.scrollTop=m.scrollHeight;
  $$("#msgs [data-cite]").forEach(b=>b.onclick=()=>showSource(b.dataset.cite));
  const chips=[];
  if(B.focus){const r=REV.find(r=>r.target===B.focus&&!B.done.has(r.id));if(r)chips.push(r)}
  const next=MAIN.find(x=>!B.done.has(x.id));if(next)chips.push(next);
  REV.filter(r=>!B.done.has(r.id)&&find(r.target)&&!chips.includes(r)).slice(0,2).forEach(r=>chips.push(r));
  $("#sugg").innerHTML=chips.slice(0,3).map(c=>`<button data-chip="${c.id}" class="${c.target?"rev":""}" ${B.busy?"disabled":""}>${c.target?ic("edit"):ic("spark")} ${esc(c.chip)}</button>`).join("");
  $$("[data-chip]").forEach(b=>b.onclick=()=>runPrompt([...MAIN,...REV].find(x=>x.id===b.dataset.chip)));
}
async function aiSay(text){const m={who:"a",text:"",thinking:true};B.msgs.push(m);renderChat();await sleep(800+Math.random()*500);m.thinking=false;
  for(const w of text.split(" ")){m.text+=(m.text?" ":"")+w;renderChat();await sleep(30)}}
async function runPrompt(item,typed){
  if(B.busy||!item)return;B.busy=true;B.started=true;renderChat();
  const inp=$("#cin");if(inp&&!typed){inp.value="";for(const ch of item.prompt){inp.value+=ch;await sleep(12)}await sleep(250)}if(inp)inp.value="";
  B.msgs.push({who:"t",text:typed||item.prompt});renderChat();
  await aiSay(typeof item.reply==="function"?item.reply():item.reply);
  item.apply();B.done.add(item.id);
  const cards=item.cards?item.cards():item.target?[find(item.target)]:{task:[B.task],roles:B.roles,quests:B.quests,quiz:B.quiz,colls:B.colls}[item.id];
  cards.forEach(c=>{if(item.target&&!item.cards)c.state="revised";c.flash=true});
  B.msgs[B.msgs.length-1].cites=[...new Set(cards.flatMap(c=>c.cites||[]))];
  B.focus=null;B.busy=false;renderChat();renderBoard();
  document.getElementById("card-"+cards[0].id)?.scrollIntoView({behavior:"smooth",block:"nearest"});
}
let samplePromise=null;
async function freeSend(text){
  const hit=matchItem(text);if(hit)return runPrompt(hit,text);
  B.busy=true;B.started=true;$("#cin").value="";B.msgs.push({who:"t",text});renderChat();
  const focus=B.focus&&find(B.focus);let reply=null;
  try{const sample=await(samplePromise??=(window.claude?.use?window.claude.use("sample"):Promise.resolve(null)));
    if(sample){const ctx=JSON.stringify(allCards().map(c=>({id:c.id,title:c.title,tasks:c.tasks,body:c.q||c.holds})));
      const r=await sample(`You are the quest assistant in WorldQuest, helping a teacher plan a museum trip (Fitzwilliam Museum, Year 10, pairs, memento mori). Current draft: ${ctx}. ${focus?`The teacher is asking about "${focus.title}".`:""} Reply in at most 2 short sentences with a concrete suggestion. Teacher: ${text}`,{modelTier:"quick",cache:false});reply=r.text}}catch{}
  await aiSay(reply||"Got it. In the full version I'd update the draft on the right — for this demo, try one of the suggestions below.");
  B.busy=false;renderChat();
}
function showSource(id){B.hl=id;renderBoard();document.getElementById("src-"+id)?.scrollIntoView({behavior:"smooth",block:"center"})}
function genModel(){const c=find("c1");if(!c)return;const t=setInterval(()=>{c.gen=Math.min(100,c.gen+7);const b=$("#gen-c1");if(b)b.style.width=c.gen+"%";if(c.gen>=100){clearInterval(t);if(TAB==="builder")renderBoard()}},220)}

/* ---- board ---- */
const STATE={ai:`<span class="chip ai">${ic("spark")} AI draft</span>`,revised:`<span class="chip ai">${ic("spark")} Revised</span>`,edited:`<span class="chip edit">${ic("edit")} Edited by you</span>`,accepted:`<span class="chip ok">${ic("check")} Accepted</span>`};
const citesHTML=c=>(c.cites||[]).map(id=>`<button class="cite" data-cite="${id}">${id}</button>`).join("");
const actsHTML=c=>`<div class="acts">${c.state==="accepted"?`<button class="tiny ghost" data-unaccept="${c.id}">Undo</button>`:`<button class="tiny primary" data-accept="${c.id}">${ic("check",13)} Accept</button>`}
  <button class="tiny" data-edit="${c.id}">${ic("edit",13)} Edit</button><button class="tiny" data-ask="${c.id}">${ic("chat",13)} Ask AI</button></div>`;
const saveActs=c=>`<div class="acts"><button class="tiny primary" data-save="${c.id}">Save</button><button class="tiny" data-cancel="${c.id}">Cancel</button></div>`;
const sel=(f,val,opts)=>`<select data-f="${f}">${opts.map(([v,l])=>`<option value="${v}" ${String(v)===String(val)?"selected":""}>${esc(l)}</option>`).join("")}</select>`;
const rdot=id=>`<span class="rdot ${id}">${id}</span>`;
const wrapCls=c=>`c ${c.state==="accepted"?"accepted":""} ${B.focus===c.id?"focus":""} ${c.flash?"flash":""}`;
const kv=rows=>`<dl class="kvs">${rows.map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`;

function taskHTML(c){
  if(c.editing)return `<div class="c focus" id="card-${c.id}">${c.fields.map((f,i)=>`<label class="small">${f[0]}<input data-f="fields.${i}.1" value="${esc(f[1])}"></label>`).join("")}${saveActs(c)}</div>`;
  return `<div class="${wrapCls(c)}" id="card-${c.id}"><div class="row between">${STATE[c.state]}<span class="row" style="gap:3px">${citesHTML(c)}</span></div>
    <b>${esc(c.title)}</b>${kv(c.fields.map(f=>[f[0],esc(f[1])]))}${actsHTML(c)}</div>`}
function roleHTML(c){
  if(c.editing)return `<div class="c focus" id="card-${c.id}"><label class="small">Role name<input data-f="title" value="${esc(c.title)}"></label>
    <label class="small">Holds (information only this role sees)<textarea data-f="holds">${esc(c.holds)}</textarea></label>
    <label class="small">On the phone<input data-f="device" value="${esc(c.device)}"></label>${saveActs(c)}</div>`;
  return `<div class="${wrapCls(c)}" id="card-${c.id}"><div class="row between">${STATE[c.state]}<span class="row" style="gap:3px">${citesHTML(c)}</span></div>
    <b class="row" style="gap:8px">${rdot(c.id)} ${esc(c.title)}</b>${kv([["Holds",esc(c.holds)],["On the phone",esc(c.device)]])}${actsHTML(c)}</div>`}
const blockChips=q=>`<span class="row" style="gap:4px">${q.blocks.map((b,k)=>`${k?`<span class="muted">→</span>`:""}<span class="bchip">${ic(BLOCKS[b].icon,12)} ${BLOCKS[b].label}</span>`).join("")}</span>`;
function questRow(c,i){
  const d=DONE_TYPES[c.done],rw=c.reward&&collById(c.reward);
  if(c.editing)return `<div class="qc focus" id="card-${c.id}"><div class="row"><span class="qnum">${i+1}</span><b>Edit quest</b></div>
    <div class="stack" style="gap:6px"><span class="small">Activity blocks, in order</span><div class="row" style="gap:6px">${Object.entries(BLOCKS).map(([k,v])=>`<label class="bpick"><input type="checkbox" data-block="${k}" ${c.blocks.includes(k)?"checked":""}> ${ic(v.icon,13)} ${v.label}</label>`).join("")}</div></div>
    <div class="qedit">
    <label class="small">Quest<input data-f="title" value="${esc(c.title)}"></label><label class="small">Minutes<input data-f="min" type="number" min="1" value="${c.min}"></label>
    ${B.roles.map(r=>`<label class="small wide">${rdot(r.id)} ${esc(r.title)} does<textarea data-f="tasks.${r.id}">${esc(c.tasks[r.id])}</textarea></label>`).join("")}
    <label class="small">Finished by${sel("done",c.done,Object.entries(DONE_TYPES).map(([k,v])=>[k,v.label]))}</label>
    <label class="small">Who completes it${sel("doneBy",c.doneBy,[...B.roles.map(r=>[r.id,r.title]),["Pair","Either partner"],["Each","Each student"]])}</label>
    <label class="small">Reward${sel("reward",c.reward,[["","None"],...(B.colls.length?B.colls:COLL_DEFS).map(x=>[x.id,x.title])])}</label>
    <label class="toggle" style="align-self:end"><input type="checkbox" data-f="swap" ${c.swap?"checked":""}> Swap who leads</label>
    </div>${saveActs(c)}</div>`;
  return `<div class="qc ${c.state==="accepted"?"accepted":""} ${B.focus===c.id?"focus":""} ${c.flash?"flash":""}" id="card-${c.id}">
    <div class="row between"><span class="row" style="gap:8px"><span class="qnum">${i+1}</span><b>${esc(c.title)}</b><span class="muted small">${c.min} min</span></span><span class="row" style="gap:4px">${citesHTML(c)}${STATE[c.state]}</span></div>
    <div class="row between">${blockChips(c)}${c.swap?`<span class="chip lock">Roles swapped</span>`:""}</div>
    <div class="roles2">${B.roles.map(r=>`<div class="rbox"><span class="row small" style="gap:6px;font-weight:600">${rdot(r.id)} ${esc(r.title)}</span><p>${esc(c.tasks[r.id])}</p></div>`).join("")}</div>
    <div class="foot"><span class="row" style="gap:6px;flex-wrap:nowrap">${ic(d.icon,15)}<span><b>Finished when:</b> ${esc(doneText(c))}</span></span>
      <span class="chip ${d.check==="auto"?"lock":"edit"}">${d.check==="auto"?"App checks":"You check"}</span>
      ${rw?`<span class="row" style="gap:6px;flex-wrap:nowrap"><span class="mini xs">${artFor(rw.art,18)}</span>Reward: ${esc(rw.title)}</span>`:""}</div>
    <div class="row between">${actsHTML(c)}<span class="row" style="gap:4px"><button class="tiny ghost" data-move="${c.id}|-1" ${i===0?"disabled":""} aria-label="Move up">↑</button><button class="tiny ghost" data-move="${c.id}|1" ${i===B.quests.length-1?"disabled":""} aria-label="Move down">↓</button><button class="tiny ghost" data-del="${c.id}">Remove</button></span></div></div>`}
function addPanel(){
  if(!B.adding)return `<button class="tiny" id="addq" style="align-self:flex-start">${ic("plus",13)} Add quest</button>`;
  return `<div class="addq stack"><div class="row between"><b>New quest: pick activity blocks</b><button class="tiny ghost" id="addqx">Cancel</button></div>
   <div class="bgrid">${Object.entries(BLOCKS).map(([k,v])=>`<label class="bcard"><input type="checkbox" data-newblock="${k}"><span class="row" style="gap:6px">${ic(v.icon,15)} <b>${v.label}</b></span><span class="small muted">${v.desc}</span></label>`).join("")}</div>
   <div class="row"><button class="tiny primary" id="addqgo">${ic("plus",13)} Add quest</button><span class="small muted">Blocks run in the order shown. You can edit everything after.</span></div></div>`}
function newQuest(blocks,title,extra={}){
  const q={id:"q"+Math.random().toString(36).slice(2,6),kind:"quest",title:title||blocks.map(b=>BLOCKS[b].label).join(" + "),min:10,blocks,swap:false,tasks:{},done:BLOCKS[blocks.at(-1)].done,doneBy:"Pair",reward:"",cites:[],data:{},state:"edited",flash:true,...extra};
  B.roles.forEach(r=>{const parts=blocks.map(b=>BLOCKS[b].tasks[leadOf(q,b)===r.id?"lead":"support"]);q.tasks[r.id]=[...new Set(parts)].join(" ")});
  if(blocks.at(-1)==="quiz")q.doneBy="Each";
  return q}
function quizHTML(c){
  if(c.editing)return `<div class="c focus" id="card-${c.id}"><input data-f="q" value="${esc(c.q)}">${c.o.map((o,i)=>`<label class="row" style="flex-wrap:nowrap"><input type="radio" name="a-${c.id}" data-f="a" value="${i}" ${i===c.a?"checked":""} style="width:auto" aria-label="Correct answer"><input data-f="o.${i}" value="${esc(o)}"></label>`).join("")}<span class="small muted">Tick the correct answer.</span>${saveActs(c)}</div>`;
  return `<div class="${wrapCls(c)}" id="card-${c.id}"><div class="row between">${STATE[c.state]}<span class="row" style="gap:3px">${citesHTML(c)}</span></div>
    <b class="body">${esc(c.q)}</b><ol class="opts">${c.o.map((o,i)=>`<li class="${i===c.a?"correct":""}">${i===c.a?ic("check",13):"<span style='width:13px'></span>"}${esc(o)}</li>`).join("")}</ol>${actsHTML(c)}</div>`}
function collHTML(c){
  const t=c.trigger,qs=B.quests.length?B.quests:QUEST_DEFS;
  if(c.editing)return `<div class="c focus" id="card-${c.id}"><label class="small">Name<input data-f="title" value="${esc(c.title)}"></label>
    <label class="small">Earned when${sel("trigger.kind",t.kind,[["quest","A quest is finished"],["quiz","Quiz score reaches…"],["sensor","Phone tilted up at a spot"],["teacher","I award it by hand"]])}</label>
    <label class="small" data-k="quest" ${t.kind==="quest"?"":"hidden"}>Which quest${sel("trigger.quest",t.quest,qs.map((q,i)=>[q.id,`Quest ${i+1}: ${q.title}`]))}</label>
    <label class="small" data-k="quiz" ${t.kind==="quiz"?"":"hidden"}>Minimum score${sel("trigger.min",t.min,[[1,"1 of 3"],[2,"2 of 3"],[3,"3 of 3"]])}</label>
    <label class="small" data-k="sensor" ${t.kind==="sensor"?"":"hidden"}>Where<input data-f="trigger.place" value="${esc(t.place)}"></label>
    <label class="small">Who gets it${sel("to",c.to,Object.entries(TO_TEXT))}</label>
    <label class="small">Evolves (optional)<input data-f="evolve" value="${esc(c.evolve)}"></label>
    <label class="toggle"><input type="checkbox" data-f="hidden" ${c.hidden?"checked":""}> Hide the condition from students</label>${saveActs(c)}</div>`;
  const gen=c.art==="watch"&&c.gen<100;
  return `<div class="${wrapCls(c)}" id="card-${c.id}"><div class="row between">${STATE[c.state]}<span class="row" style="gap:3px">${citesHTML(c)}</span></div>
    <div class="row" style="flex-wrap:nowrap"><div class="mini" style="flex:none">${gen?`<span class="small mono">${c.gen}%</span>`:artFor(c.art,c.art==="watch"?44:42)}</div><div style="min-width:0"><span class="label">${c.type}</span><br><b>${esc(c.title)}</b></div></div>
    ${kv([["Earned when",esc(whenText(c))],["Goes to",TO_TEXT[c.to]],["Checked by",collCheck(c)],...(c.evolve?[["Evolves",esc(c.evolve)]]:[]),...(c.hidden?[["Students see","Nothing until found"]]:[])])}
    ${c.art==="watch"?(gen?`<div class="gen"><b id="gen-c1" style="width:${c.gen}%"></b></div><span class="small muted">Generating in Manifest…</span>`:`<span class="chip sim">Manifest 3D model (simulated)</span>`):""}
    ${actsHTML(c)}</div>`}
function sectionHead(title,icon,cards,key){const acc=cards.filter(c=>c.state==="accepted").length;
  return `<div class="panel-h"><h3>${ic(icon)} ${title}</h3><span class="row">${cards.length?`<span class="count">${acc}/${cards.length} accepted</span>${acc<cards.length?`<button class="tiny" data-accall="${key}">Accept all</button>`:""}`:""}</span></div>`}
const emptyBox=t=>`<div class="empty">${t}</div>`;

function renderBoard(){
  const el=$("#board");if(!el)return;
  const cards=allCards(),acc=cards.filter(c=>c.state==="accepted").length,allDone=MAIN.every(m=>B.done.has(m.id));
  const unadded=SAMPLE_SOURCES.filter(s=>!B.sources.some(x=>x.id===s.id));
  el.innerHTML=`
   <section class="panel"><div class="panel-h"><h3>${ic("doc")} Sources</h3><label class="toggle"><input type="checkbox" id="grounded" ${B.grounded?"checked":""}> Only use my sources</label></div>
    ${B.sources.map(s=>`<div class="src ${B.hl===s.id?"hl":""}" id="src-${s.id}"><span class="kind">${s.kind}</span><span>${esc(s.title)}</span><span class="small muted">${s.indexing?"Indexing…":s.chunks+" passages"} <span class="cite">${s.id}</span></span>${B.hl===s.id?`<p class="snip">${esc(s.snip)}</p>`:""}</div>`).join("")||emptyBox("Ground the AI in your own material.")}
    <div class="row">${unadded.map(s=>`<button class="tiny" data-addsrc="${s.id}">${ic("plus",13)} ${esc(s.title)}</button>`).join("")}<button class="tiny" id="pasteBtn">${ic("plus",13)} Paste text</button></div>
    ${B.pasting?`<div class="stack" style="gap:8px"><input id="ptitle" placeholder="Title, e.g. Museum guide notes"><textarea id="ptext" placeholder="Paste facts about the place or objects"></textarea><div class="row"><button class="tiny primary" id="paddsrc">Add source</button></div></div>`:""}
   </section>
   <section class="panel">${sectionHead("Trip task","map",B.task?[B.task]:[],"task")}${B.task?`<div class="cards">${taskHTML(B.task)}</div>`:emptyBox("Ask the assistant to plan the quest.")}</section>
   <section class="panel">${sectionHead("Roles","users",B.roles,"roles")}${B.roles.length?`<div class="cards">${B.roles.map(roleHTML).join("")}</div><p class="small muted">Each role gets its own task in every quest below.</p>`:emptyBox("Each partner gets a role with different information.")}</section>
   <section class="panel">${sectionHead("Quests","spark",B.quests,"quests")}
    ${B.quests.length?`<div class="stack" style="gap:10px">${B.quests.map(questRow).join("")}${addPanel()}</div>`:emptyBox(B.roles.length?"Quests appear here, with a task for each role.":"Suggest roles first, then quests.")}</section>
   <section class="panel">${sectionHead("Knowledge quiz (Quest 4)","check",B.quiz,"quiz")}${B.quiz.length?`<div class="cards">${B.quiz.map(quizHTML).join("")}</div>`:emptyBox("Multiple-choice questions appear here.")}</section>
   <section class="panel">${sectionHead("Collectibles","cam",B.colls,"colls")}${B.colls.length?`<div class="cards">${B.colls.map(collHTML).join("")}</div>`:emptyBox("Collectibles appear here, each with the condition that awards it.")}</section>
   <section class="panel"><div class="panel-h"><h3>Publish</h3><span class="count">${acc}/${cards.length} accepted</span></div>
    <div class="row"><button class="primary" id="publish" ${B.published||!allDone||acc<cards.length?"disabled":""}>${B.published?`Published · code ${CODES.session}`:"Publish to students"}</button>
    ${!B.published&&(!allDone||acc<cards.length)?`<span class="small muted">Students see nothing until you accept every item.</span>`:""}</div></section>`;
  allCards().forEach(c=>c.flash=false);
  bindBoard();
}
function setPath(o,path,v){const k=path.split(".");let t=o;for(let i=0;i<k.length-1;i++)t=t[k[i]];t[k.at(-1)]=v}
function bindBoard(){
  $("#grounded").onchange=e=>B.grounded=e.target.checked;
  $$("[data-addsrc]").forEach(b=>b.onclick=async()=>{const s={...SAMPLE_SOURCES.find(x=>x.id===b.dataset.addsrc),indexing:true};B.sources.push(s);renderBoard();await sleep(700);s.indexing=false;renderBoard()});
  $("#pasteBtn").onclick=()=>{B.pasting=!B.pasting;renderBoard()};
  $("#paddsrc")&&($("#paddsrc").onclick=()=>{const t=$("#ptext").value.trim();if(!t){toast("Paste some text first");return}
    const id="S"+(B.sources.length+SAMPLE_SOURCES.length+1);B.sources.push({id,kind:"TXT",title:$("#ptitle").value.trim()||t.slice(0,32)+"…",chunks:Math.max(1,Math.ceil(t.length/400)),snip:t.slice(0,180)});B.pasting=false;renderBoard();toast("Source added")});
  $$("#board [data-cite]").forEach(b=>b.onclick=()=>showSource(b.dataset.cite));
  $$("[data-accept]").forEach(b=>b.onclick=()=>{find(b.dataset.accept).state="accepted";renderBoard()});
  $$("[data-unaccept]").forEach(b=>b.onclick=()=>{find(b.dataset.unaccept).state="edited";renderBoard()});
  $$("[data-accall]").forEach(b=>b.onclick=()=>{const k=b.dataset.accall;(k==="task"?[B.task]:B[k]).forEach(c=>c.state="accepted");renderBoard()});
  $$("[data-edit]").forEach(b=>b.onclick=()=>{find(b.dataset.edit).editing=true;renderBoard()});
  $$("[data-cancel]").forEach(b=>b.onclick=()=>{find(b.dataset.cancel).editing=false;renderBoard()});
  $$('select[data-f="trigger.kind"]').forEach(s=>s.onchange=()=>{const root=s.closest(".c");root.querySelectorAll("[data-k]").forEach(l=>l.hidden=l.dataset.k!==s.value)});
  $$("[data-save]").forEach(b=>b.onclick=()=>{const c=find(b.dataset.save),root=$("#card-"+c.id);
    root.querySelectorAll("[data-f]").forEach(inp=>{const f=inp.dataset.f;
      if(inp.type==="radio"){if(inp.checked)c.a=+inp.value;return}
      if(inp.type==="checkbox"){setPath(c,f,inp.checked);return}
      let v=inp.value;if(f==="min"||f==="trigger.min")v=+v;setPath(c,f,v)});
    if(c.kind==="quest"){const bl=[...root.querySelectorAll("[data-block]")].filter(x=>x.checked).map(x=>x.dataset.block);if(!bl.length){toast("Pick at least one block");return}c.blocks=bl}
    c.editing=false;c.state="edited";renderBoard()});
  $$("[data-move]").forEach(b=>b.onclick=()=>{const [id,d]=b.dataset.move.split("|"),i=B.quests.findIndex(q=>q.id===id),j=i+ +d;[B.quests[i],B.quests[j]]=[B.quests[j],B.quests[i]];B.quests[j].flash=true;renderBoard()});
  $$("[data-del]").forEach(b=>b.onclick=()=>{const q=find(b.dataset.del);B.quests=B.quests.filter(x=>x!==q);B.colls.forEach(c=>{if(c.trigger.kind==="quest"&&c.trigger.quest===q.id)c.trigger.quest=B.quests[0]?.id});toast(`Removed “${q.title}”`);renderBoard()});
  $("#addq")&&($("#addq").onclick=()=>{B.adding=true;renderBoard();$(".addq")?.scrollIntoView({behavior:"smooth",block:"center"})});
  $("#addqx")&&($("#addqx").onclick=()=>{B.adding=false;renderBoard()});
  $("#addqgo")&&($("#addqgo").onclick=()=>{const bl=Object.keys(BLOCKS).filter(k=>$(`[data-newblock="${k}"]`).checked);if(!bl.length){toast("Pick at least one block");return}
    const q=newQuest(bl);const pi=B.quests.findIndex(x=>x.blocks.includes("pair"));B.quests.splice(pi<0?B.quests.length:pi,0,q);B.adding=false;renderBoard();document.getElementById("card-"+q.id)?.scrollIntoView({behavior:"smooth",block:"center"})});
  $$("[data-ask]").forEach(b=>b.onclick=()=>{B.focus=b.dataset.ask;const c=find(B.focus);renderBoard();renderChat();const i=$("#cin");i.value=`About “${c.title}”: `;i.focus()});
  $("#publish").onclick=()=>{B.published=true;savePublished();renderBoard();toast(`Published. Students join with ${CODES.session}`)};
}

/* Published content is also saved in this browser, so a student view opened on the same device uses the teacher's version. */
function savePublished(){try{localStorage.setItem("wq-published",JSON.stringify({quests:B.quests,roles:B.roles,colls:B.colls,quiz:B.quiz.map(x=>({q:x.q,o:x.o,a:x.a,src:x.cites[0]||"S1"}))}))}catch{}}
