// Quest builder: AI chat panel + board of draft cards (sources, task, roles, quests, quiz, collectibles).
const B={started:false,busy:false,msgs:[{who:"a",text:"Hi! Add anything I should stick to — object records, floor plans, your notes. Then tell me about the trip."}],
  sources:[],grounded:true,task:null,roles:[],quests:[],quiz:[],colls:[],done:new Set(),focus:null,hl:null,published:false,pasting:false};
const allCards=()=>[B.task,...B.roles,...B.quests,...B.quiz,...B.colls].filter(Boolean);
const find=id=>allCards().find(c=>c.id===id);
function revise(c,kind){if(c.state!=="accepted")c.state=kind;c.flash=true}

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
  const s=$("#sugg");const chips=[];
  if(B.focus){const r=REV.find(r=>r.target===B.focus&&!B.done.has(r.id));if(r)chips.push(r)}
  const next=MAIN.find(x=>!B.done.has(x.id));if(next)chips.push(next);
  REV.filter(r=>!B.done.has(r.id)&&find(r.target)&&!chips.includes(r)).slice(0,2).forEach(r=>chips.push(r));
  s.innerHTML=chips.slice(0,3).map(c=>`<button data-chip="${c.id}" class="${c.target?"rev":""}" ${B.busy?"disabled":""}>${c.target?ic("edit"):ic("spark")} ${esc(c.chip)}</button>`).join("");
  $$("[data-chip]").forEach(b=>b.onclick=()=>runPrompt([...MAIN,...REV].find(x=>x.id===b.dataset.chip)));
}
async function aiSay(text,cites){const m={who:"a",text:"",thinking:true};B.msgs.push(m);renderChat();await sleep(800+Math.random()*500);m.thinking=false;
  for(const w of text.split(" ")){m.text+=(m.text?" ":"")+w;renderChat();await sleep(32)}m.cites=cites}
async function runPrompt(item,typed){
  if(B.busy||!item)return;B.busy=true;B.started=true;renderChat();
  const inp=$("#cin");if(inp&&!typed){inp.value="";for(const ch of item.prompt){inp.value+=ch;await sleep(12)}await sleep(250)}if(inp)inp.value="";
  B.msgs.push({who:"t",text:typed||item.prompt});renderChat();
  await aiSay(typeof item.reply==="function"?item.reply():item.reply);
  item.apply();B.done.add(item.id);
  const cards=item.target?[find(item.target)]:{task:[B.task],roles:B.roles,quests:B.quests,quiz:B.quiz,colls:B.colls}[item.id];
  cards.forEach(c=>item.target?revise(c,"revised"):(c.flash=true));
  B.msgs[B.msgs.length-1].cites=[...new Set(cards.flatMap(c=>c.cites||[]))];
  B.focus=null;B.busy=false;renderChat();renderBoard();
}
let samplePromise=null;
async function freeSend(text){
  const hit=matchItem(text);if(hit)return runPrompt(hit,text);
  B.busy=true;B.started=true;$("#cin").value="";B.msgs.push({who:"t",text});renderChat();
  const focus=B.focus&&find(B.focus);let reply=null;
  try{const sample=await(samplePromise??=(window.claude?.use?window.claude.use("sample"):Promise.resolve(null)));
    if(sample){const ctx=JSON.stringify(allCards().map(c=>({id:c.id,title:c.title,body:c.body||c.q})));
      const r=await sample(`You are the quest assistant in WorldQuest, helping a teacher plan a museum trip (Fitzwilliam Museum, Year 10, pairs, memento mori). Current draft cards: ${ctx}. ${focus?`The teacher is asking about card "${focus.title}".`:""} Reply in at most 2 short sentences with a concrete suggestion. Teacher: ${text}`,{modelTier:"quick",cache:false});reply=r.text}}catch{}
  await aiSay(reply||"Got it. In the full version I'd update the draft on the right — try one of the suggestions below for this demo.");
  B.busy=false;renderChat();
}
function showSource(id){B.hl=id;renderBoard();document.getElementById("src-"+id)?.scrollIntoView({behavior:"smooth",block:"center"})}
function genModel(){const c=find("c1");const t=setInterval(()=>{c.gen=Math.min(100,c.gen+7);const b=$("#gen-c1");if(b)b.style.width=c.gen+"%";if(c.gen>=100){clearInterval(t);if(TAB==="builder")renderBoard()}},220)}

const STATE={ai:`<span class="chip ai">${ic("spark")} AI draft</span>`,revised:`<span class="chip ai">${ic("spark")} Revised</span>`,edited:`<span class="chip edit">${ic("edit")} Edited by you</span>`,accepted:`<span class="chip ok">${ic("check")} Accepted</span>`};
function cardHTML(c){
  const cites=(c.cites||[]).map(id=>`<button class="cite" data-cite="${id}">${id}</button>`).join("");
  let body="";
  if(c.editing){
    if(c.kind==="quiz") body=`<input data-f="q" value="${esc(c.q)}">${c.o.map((o,i)=>`<label class="row" style="flex-wrap:nowrap"><input type="radio" name="a-${c.id}" value="${i}" ${i===c.a?"checked":""} style="width:auto"><input data-o="${i}" value="${esc(o)}"></label>`).join("")}`;
    else if(c.kind==="task") body=c.fields.map((f,i)=>`<label class="small">${f[0]}<input data-tf="${i}" value="${esc(f[1])}"></label>`).join("");
    else body=`<input data-f="title" value="${esc(c.title)}"><textarea data-f="body">${esc(c.body)}</textarea>`;
    return `<div class="c focus" id="card-${c.id}">${body}<div class="acts"><button class="tiny primary" data-save="${c.id}">Save</button><button class="tiny" data-cancel="${c.id}">Cancel</button></div></div>`;
  }
  if(c.kind==="quiz") body=`<b class="body">${esc(c.q)}</b><ol class="opts">${c.o.map((o,i)=>`<li class="${i===c.a?"correct":""}">${i===c.a?ic("check",13):"<span style='width:13px'></span>"}${esc(o)}</li>`).join("")}</ol>`;
  else if(c.kind==="task") body=`<b class="body">${esc(c.title)}</b><dl style="margin:0;display:grid;grid-template-columns:auto 1fr;gap:3px 10px;font-size:13px">${c.fields.map(f=>`<dt class="muted">${f[0]}</dt><dd style="margin:0">${esc(f[1])}</dd>`).join("")}</dl>`;
  else if(c.kind==="coll"){const art=c.art==="watch"?watchArt(54):c.art==="badge"?badgeArt(50):domeArt(50);
    const gen=c.art==="watch"&&c.gen<100;
    body=`<div class="row" style="flex-wrap:nowrap;align-items:center"><div class="mini" style="flex:none">${gen?`<span class="small mono">${c.gen}%</span>`:art}</div><div style="min-width:0"><span class="label">${c.type}</span><br><b>${esc(c.title)}</b></div></div><p class="small">${esc(c.body)}</p>
     ${c.art==="watch"?(gen?`<div class="gen"><b id="gen-c1" style="width:${c.gen}%"></b></div><span class="small muted">Generating in Manifest…</span>`:`<span class="chip sim">Manifest 3D (simulated)</span>`):""}`}
  else body=`<b>${esc(c.title)}</b><p class="body">${esc(c.body)}</p>`;
  return `<div class="c ${c.state==="accepted"?"accepted":""} ${B.focus===c.id?"focus":""} ${c.flash?"flash":""}" id="card-${c.id}">
    <div class="row between">${STATE[c.state]}<span class="row" style="gap:3px">${cites}</span></div>${body}
    <div class="acts">${c.state==="accepted"?`<button class="tiny ghost" data-unaccept="${c.id}">Undo</button>`:`<button class="tiny primary" data-accept="${c.id}">${ic("check",13)} Accept</button>`}
     <button class="tiny" data-edit="${c.id}">${ic("edit",13)} Edit</button><button class="tiny" data-ask="${c.id}">${ic("chat",13)} Ask AI</button></div></div>`;
}
function section(title,icon,cards,emptyText,key){
  const acc=cards.filter(c=>c.state==="accepted").length;
  return `<section class="panel"><div class="panel-h"><h3>${ic(icon)} ${title}</h3><span class="row">${cards.length?`<span class="count">${acc}/${cards.length}</span>${acc<cards.length?`<button class="tiny" data-accall="${key}">Accept all</button>`:""}`:""}</span></div>
   ${cards.length?`<div class="cards">${cards.map(cardHTML).join("")}</div>`:`<div class="empty">${emptyText}</div>`}</section>`;
}
function renderBoard(){
  const el=$("#board");if(!el)return;
  const cards=allCards(),acc=cards.filter(c=>c.state==="accepted").length,allDone=MAIN.every(m=>B.done.has(m.id));
  const unadded=SAMPLE_SOURCES.filter(s=>!B.sources.some(x=>x.id===s.id));
  el.innerHTML=`
   <section class="panel"><div class="panel-h"><h3>${ic("doc")} Sources</h3><label class="toggle"><input type="checkbox" id="grounded" ${B.grounded?"checked":""}> Only use my sources</label></div>
    ${B.sources.map(s=>`<div class="src ${B.hl===s.id?"hl":""}" id="src-${s.id}"><span class="kind">${s.kind}</span><span>${esc(s.title)}</span><span class="small muted">${s.indexing?"Indexing…":s.chunks+" passages"} <span class="cite">${s.id}</span></span>${B.hl===s.id?`<p class="snip">${esc(s.snip)}</p>`:""}</div>`).join("")||`<div class="empty">Ground the AI in your own material.</div>`}
    <div class="row">${unadded.map(s=>`<button class="tiny" data-addsrc="${s.id}">${ic("plus",13)} ${esc(s.title)}</button>`).join("")}<button class="tiny" id="pasteBtn">${ic("plus",13)} Paste text</button></div>
    ${B.pasting?`<div class="stack" style="gap:8px"><input id="ptitle" placeholder="Title, e.g. Museum guide notes"><textarea id="ptext" placeholder="Paste facts about the place or objects"></textarea><div class="row"><button class="tiny primary" id="paddsrc">Add source</button></div></div>`:""}
   </section>
   ${section("Trip task","map",B.task?[B.task]:[],"Ask the assistant to plan the quest.","task")}
   ${section("Roles","users",B.roles,"Roles appear here.","roles")}
   ${section("Quests","spark",B.quests,"Quests appear here.","quests")}
   ${section("Knowledge quiz","check",B.quiz,"Multiple-choice questions appear here.","quiz")}
   ${section("Collectibles","cam",B.colls,"Collectibles appear here.","colls")}
   <section class="panel"><div class="panel-h"><h3>Publish</h3><span class="count">${acc}/${cards.length} accepted</span></div>
    <div class="row"><button class="primary" id="publish" ${B.published||!allDone||acc<cards.length?"disabled":""}>${B.published?`Published · code ${CODES.session}`:"Publish to students"}</button>
    ${!B.published&&(!allDone||acc<cards.length)?`<span class="small muted">You accept every item before students see it.</span>`:""}</div></section>`;
  allCards().forEach(c=>c.flash=false);
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
  $$("[data-save]").forEach(b=>b.onclick=()=>{const c=find(b.dataset.save),root=$("#card-"+c.id);
    if(c.kind==="quiz"){c.q=root.querySelector('[data-f="q"]').value;c.o=[...root.querySelectorAll("[data-o]")].map(i=>i.value);c.a=+(root.querySelector("input[type=radio]:checked")?.value||0)}
    else if(c.kind==="task"){root.querySelectorAll("[data-tf]").forEach(i=>c.fields[+i.dataset.tf][1]=i.value)}
    else{c.title=root.querySelector('[data-f="title"]').value;c.body=root.querySelector('[data-f="body"]').value}
    c.editing=false;c.state="edited";renderBoard()});
  $$("[data-ask]").forEach(b=>b.onclick=()=>{B.focus=b.dataset.ask;const c=find(B.focus);renderBoard();renderChat();const i=$("#cin");i.value=`About “${c.title}”: `;i.focus()});
  $("#publish").onclick=()=>{B.published=true;renderBoard();toast(`Published. Students join with ${CODES.session}`)};
}
