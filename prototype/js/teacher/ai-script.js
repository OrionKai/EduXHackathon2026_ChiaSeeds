// Simulated AI: what the assistant drafts (MAIN) and how it revises cards (REV).
// Edit prompts, replies and card content here. KW = words in typed messages that trigger each step.
const cite=(...ids)=>ids.filter(id=>B.sources.some(s=>s.id===id));
const MAIN=[
 {id:"task",chip:"Plan the quest",prompt:"Plan a 60-minute pair quest at the Fitzwilliam for my Year 10 history class. Theme: memento mori.",
  reply:()=>B.sources.length?"Here's a plan grounded in your sources.":"No sources yet, so this uses general knowledge. Add sources to ground it.",
  apply(){B.task={id:"task",kind:"task",title:"The Case of the Missing Label",fields:[["Goal","Tell observation from interpretation, using evidence"],["Where","Fitzwilliam Museum, case 2"],["Time","60 min"],["Who","Year 10 · pairs"]],cites:cite("S1","S2","S3"),state:"ai"}}},
 {id:"roles",chip:"Suggest roles",prompt:"Suggest two roles so each partner holds different information.",reply:()=>"Two roles with split information. Neither can finish alone.",
  apply(){B.roles=[{id:"r1",kind:"role",title:"Riddle Keeper",body:"Holds a riddle about the object. No picture.",cites:cite("S1"),state:"ai"},{id:"r2",kind:"role",title:"Navigator",body:"Holds the gallery map. No descriptions.",cites:cite("S2"),state:"ai"}]}},
 {id:"quests",chip:"Draft quests",prompt:"Draft the quests for the trip.",reply:()=>"Three quests. Quest 2 needs the museum to brief an attendant — worth checking with them.",
  apply(){B.quests=[{id:"q1",kind:"quest",title:"Find the object",body:"Riddle + map. Talk until you agree on the case.",cites:cite("S1","S2"),state:"ai"},
   {id:"q2",kind:"quest",title:"Ask an attendant",body:"Ask: “Which object here is oldest, and how can you tell?”",cites:[],state:"ai"},
   {id:"q3",kind:"quest",title:"Look closer",body:"Scan the object. Name 3 details before guessing what they mean.",cites:cite("S3"),state:"ai"}]}},
 {id:"quiz",chip:"Write the quiz",prompt:"Write a 3-question multiple-choice quiz from my sources for the knowledge badge.",reply:()=>B.sources.length?"Three questions. Each links to the source it came from.":"Three questions from general knowledge. Add sources so I can cite them.",
  apply(){B.quiz=QUIZ.map((x,i)=>({id:"m"+(i+1),kind:"quiz",title:"Q"+(i+1),q:x.q,o:[...x.o],a:x.a,cites:cite(x.src),state:"ai"}))}},
 {id:"colls",chip:"Design collectibles",prompt:"Design the collectibles: one for finding the object, one for the quiz, and a hidden easter egg.",reply:()=>"Three collectibles. Generating the 3D watch in Manifest now.",
  apply(){B.colls=[{id:"c1",kind:"coll",title:"Memento Mori Watch",type:"Discovery",body:"Scan the object to collect its 3D model.",art:"watch",gen:0,cites:cite("S1"),state:"ai"},
   {id:"c2",kind:"coll",title:"Timekeeper",type:"Knowledge",body:"Score 2 of 3 on the quiz.",art:"badge",cites:[],state:"ai"},
   {id:"c3",kind:"coll",title:"Look Up",type:"Easter egg",body:"Point the camera at the entrance-hall ceiling. Not in the instructions.",art:"dome",cites:[],state:"ai"}];genModel()}}
];
const REV=[
 {id:"rev-task",target:"task",chip:"Make it 45 minutes",prompt:"Make it 45 minutes.",reply:"Done. 45 minutes — Quest 3 is now 10 minutes.",apply(){B.task.fields[2][1]="45 min"}},
 {id:"rev-r2",target:"r2",chip:"Navigator: less phone",prompt:"Give the Navigator something to do off-screen — sketching?",reply:"Updated. The Navigator now sketches one detail; phone away while searching.",apply(){const r=find("r2");r.body="Holds the gallery map and sketches one detail. Phone away while searching."}},
 {id:"rev-q2",target:"q2",chip:"Backup if no attendant",prompt:"What if no attendant is free?",reply:"Added a backup: a museum prompt card at the gallery door.",apply(){const q=find("q2");q.body+=" Backup: museum prompt card at the door."}},
 {id:"rev-m3",target:"m3",chip:"Q3: test observation",prompt:"Make Q3 test observation instead of recall.",reply:"Rewritten. Q3 now asks students to spot the observation.",apply(){Object.assign(find("m3"),{q:"Which of these is an observation, not an interpretation?",o:["The jaw opens on a hinge","The owner feared death","It was a gift","It was made to scare"],a:0})}},
 {id:"rev-c3",target:"c3",chip:"Share the easter egg",prompt:"Make the easter egg shared — if one partner finds it, both get it.",reply:"Done. Look Up is now shared by the pair.",apply(){find("c3").body+=" Shared: both partners get it."}}
];
const KW={task:["plan","trip"],roles:["role"],quests:["quest"],quiz:["quiz","question","mcq"],colls:["collectible","badge","reward","easter"],
  "rev-task":["minute","shorter"],"rev-r2":["navigator","sketch"],"rev-q2":["attendant","backup"],"rev-m3":["q3","observation"],"rev-c3":["share","both"]};
function matchItem(text){const t=text.toLowerCase();
  return [...REV.filter(r=>find(r.target)),...MAIN].find(x=>!B.done.has(x.id)&&KW[x.id].some(k=>t.includes(k)))}
