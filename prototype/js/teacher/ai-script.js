// Simulated AI: what the assistant drafts (MAIN) and how it revises cards (REV).
// Draft content comes from content.js (ROLE_DEFS, QUEST_DEFS, QUIZ, COLL_DEFS).
// KW = words in a typed message that trigger each step.
const clone=o=>JSON.parse(JSON.stringify(o));
const cite=(...ids)=>ids.flat().filter(id=>B.sources.some(s=>s.id===id));
const MAIN=[
 {id:"task",chip:"Plan the quest",prompt:"Plan a 60-minute pair quest at the Fitzwilliam for my Year 10 history class. Theme: memento mori.",
  reply:()=>B.sources.length?"Here's a plan grounded in your sources. Next I'd split the class into pairs with different roles.":"No sources yet, so this uses general knowledge. Add sources to ground it.",
  apply(){B.task={id:"task",kind:"task",title:"The Case of the Missing Label",fields:[["Goal","Tell observation from interpretation, using evidence"],["Where","Fitzwilliam Museum, case 2"],["Time","60 min"],["Groups","14 pairs (Year 10, 28 students)"]],cites:cite("S1","S2","S3"),state:"ai"}}},
 {id:"roles",chip:"Suggest roles",prompt:"Suggest two roles so each partner holds different information.",
  reply:()=>"Two roles with split information, so neither partner can finish alone. I'll assign each role its own task in every quest.",
  apply(){B.roles=ROLE_DEFS.map(r=>({...clone(r),kind:"role",cites:cite(r.cites),state:"ai"}))}},
 {id:"quests",chip:"Draft quests",prompt:"Draft the quests, with a task for each role and a clear way to finish each one.",
  reply:()=>"Five quests in order. Each one shows what each role does, what finishes it, and whether the app or you check it. Quest 2 needs the museum to brief an attendant.",
  apply(){B.quests=QUEST_DEFS.map(q=>({...clone(q),kind:"quest",cites:cite(q.cites),state:"ai"}))}},
 {id:"quiz",chip:"Write the quiz",prompt:"Write a 3-question multiple-choice quiz from my sources for Quest 4.",
  reply:()=>B.sources.length?"Three questions for Quest 4. Each links to the source it came from.":"Three questions from general knowledge. Add sources so I can cite them.",
  apply(){B.quiz=QUIZ.map((x,i)=>({id:"m"+(i+1),kind:"quiz",title:"Q"+(i+1),q:x.q,o:[...x.o],a:x.a,cites:cite(x.src),state:"ai"}))}},
 {id:"colls",chip:"Design collectibles",prompt:"Design the collectibles: one for finding the object, one for the quiz, and a hidden easter egg.",
  reply:()=>"Three collectibles, each with the exact condition that awards it and who gets it. Generating the 3D watch in Manifest now.",
  apply(){B.colls=COLL_DEFS.map(c=>({...clone(c),kind:"coll",gen:c.art==="watch"?0:100,cites:cite(c.cites),state:"ai"}));genModel()}}
];
const REV=[
 {id:"rev-task",target:"task",chip:"Make it 45 minutes",prompt:"Make it 45 minutes.",reply:"Done. 45 minutes total — Quest 3 is now 10 minutes.",
  apply(){B.task.fields[2][1]="45 min";const q=find("q3");if(q)q.min=10}},
 {id:"rev-r2",target:"B",chip:"Navigator: less phone",prompt:"Give the Navigator something to do off-screen.",reply:"Updated. The Navigator now keeps the phone away while searching and sketches in Quest 3.",
  apply(){find("B").device="Scans the object and pair code. Phone away while searching.";const q=find("q1");if(q)q.tasks.B="Lead the search with the map, phone away. Scan once you agree."}},
 {id:"rev-q2",target:"q2",chip:"Backup if no attendant",prompt:"What if no attendant is free?",reply:"Added a backup: a museum prompt card at the gallery door.",
  apply(){find("q2").tasks.A+=" No attendant free? Use the prompt card at the door."}},
 {id:"rev-q3",target:"q3",chip:"Let me mark Quest 3",prompt:"For Quest 3, I want to approve each card before it counts.",reply:"Changed. Quest 3 now finishes only when you approve the card.",
  apply(){const q=find("q3");q.done="teacher";q.tasks.B+=" Submit the card for approval."}},
 {id:"rev-m3",target:"m3",chip:"Q3: test observation",prompt:"Make Q3 test observation instead of recall.",reply:"Rewritten. Q3 now asks students to spot the observation.",
  apply(){Object.assign(find("m3"),{q:"Which of these is an observation, not an interpretation?",o:["The jaw opens on a hinge","The owner feared death","It was a gift","It was made to scare"],a:0})}},
 {id:"rev-add",target:"q4",chip:"Add a sketch quest",prompt:"Add a quest where they sketch something in the entrance hall.",
  reply:"Added Quest 5: Observe → Make a card, in the entrance hall. It also sets up the Look Up easter egg nearby.",
  cards:()=>[find("qx")],
  apply(){const q=newQuest(["observe","make"],"Sketch the entrance hall",{id:"qx",min:10,state:"ai",tasks:{A:"Name 3 shapes you see in the ceiling.",B:"Sketch the ceiling pattern."},done:"card",doneBy:"Pair"});
    const pi=B.quests.findIndex(x=>x.blocks.includes("pair"));B.quests.splice(pi<0?B.quests.length:pi,0,q)}},
 {id:"rev-swap",target:"q3",chip:"Swap roles in Quest 3",prompt:"In Quest 3, let the Navigator name the details and the Riddle Keeper sketch.",
  reply:"Swapped. In Quest 3 the Navigator now leads and the Riddle Keeper sketches.",
  apply(){const q=find("q3");q.swap=!q.swap;[q.tasks.A,q.tasks.B]=[q.tasks.B,q.tasks.A]}},
 {id:"rev-c3",target:"c3",chip:"Share the easter egg",prompt:"Make the easter egg shared — if one partner finds it, both get it.",reply:"Done. Look Up now goes to both partners.",
  apply(){find("c3").to="pair"}}
];
const KW={task:["plan","trip"],roles:["role"],quests:["quest"],quiz:["quiz","question","mcq"],colls:["collectible","badge","reward","easter"],
  "rev-task":["minute","shorter"],"rev-r2":["navigator","sketch","off-screen"],"rev-q2":["attendant","backup"],"rev-q3":["approve","mark"],"rev-m3":["q3","observation"],"rev-c3":["share","both"],"rev-add":["add","new quest","sketch quest"],"rev-swap":["swap"]};
function matchItem(text){const t=text.toLowerCase();
  return [...REV.filter(r=>find(r.target)),...MAIN].find(x=>!B.done.has(x.id)&&KW[x.id].some(k=>t.includes(k)))}
