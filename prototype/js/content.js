// Demo content: edit text here without touching logic.
const CODES={session:"FITZ-26",pair:"WQ-PAIR-7F3K",checkin:"WQ-CHECKIN-DRAW26"};
const SAMPLE_SOURCES=[
  {id:"S1",kind:"PDF",title:"Object record: skull watch",chunks:8,snip:"Silver skull-shaped watch, 17th century. The jaw hinges open to show the dial. Made as a memento mori."},
  {id:"S2",kind:"IMG",title:"Gallery floor plan",chunks:1,snip:"Case 1: coins and medals. Case 2: personal objects and watches. Case 3: ceramics."},
  {id:"S3",kind:"DOC",title:"My lesson notes: memento mori",chunks:5,snip:"Memento mori means 'remember you must die'. Artists and makers used it to urge people to live well."}
];
const QUIZ=[
  {q:"What does “memento mori” mean?",o:["Remember you must die","Seize the day","Time heals all","Rest in peace"],a:0,src:"S3"},
  {q:"Why carry a skull-shaped watch in the 1600s?",o:["To remember to use time well","To scare off thieves","To show you were a doctor","Skulls kept better time"],a:0,src:"S1"},
  {q:"Where is the dial on this watch?",o:["Inside the hinged jaw","In the eye sockets","On the back of the skull","It has no dial"],a:0,src:"S1"}
];

/* ---- Roles: what each partner holds and does on the device ---- */
const ROLE_DEFS=[
  {id:"A",title:"Riddle Keeper",holds:"A riddle about the object. No picture.",device:"Shows the pair code at the end.",cites:["S1"]},
  {id:"B",title:"Navigator",holds:"The gallery map. No descriptions.",device:"Scans the object and the pair code.",cites:["S2"]}
];

/* ---- How a quest is completed and who checks it ----
   check: "auto" = the app marks it done; "teacher" = done on submission, then the teacher reviews it. */
const vb=(w,s,p)=>`${w} ${w.toLowerCase()==="you"?p:s}`;
const DONE_TYPES={
  scan:   {label:"Object scan",      icon:"cam",  check:"auto",    text:w=>`${vb(w,"scans","scan")} the object`},
  submit: {label:"Answer submitted", icon:"edit", check:"teacher", text:w=>`${vb(w,"submits","submit")} the answer`},
  card:   {label:"Discovery card",   icon:"doc",  check:"teacher", text:w=>`${vb(w,"submits","submit")} a discovery card`},
  quiz:   {label:"Quiz",             icon:"check",check:"auto",    text:()=>"each student answers the quiz"},
  qr:     {label:"Pair code scan",   icon:"users",check:"auto",    text:()=>"partners scan each other's code"},
  teacher:{label:"Teacher approves", icon:"check",check:"teacher", text:()=>"the teacher approves it"}
};
const CHECK_TEXT={auto:"Automatic",teacher:"Teacher reviews"};

/* ---- Quests, in order. tasks = what each role does. doneBy = "A" | "B" | "Pair" | "Each". reward = collectible id or "". ---- */
const QUEST_DEFS=[
  {id:"q1",title:"Find the object",min:15,tasks:{A:"Read the riddle aloud. Check every clue matches.",B:"Lead the search with the map. Scan the object."},done:"scan",doneBy:"B",reward:"c1",cites:["S1","S2"]},
  {id:"q2",title:"Ask an attendant",min:10,tasks:{A:"Ask: “Which object here is oldest, and how can you tell?”",B:"Write down one new fact you heard."},done:"submit",doneBy:"B",reward:"",cites:[]},
  {id:"q3",title:"Look closer",min:15,tasks:{A:"Name 3 details out loud.",B:"Sketch one detail on paper."},done:"card",doneBy:"Pair",reward:"",cites:["S3"]},
  {id:"q4",title:"Knowledge check",min:5,tasks:{A:"Answer 3 questions on your own.",B:"Answer 3 questions on your own."},done:"quiz",doneBy:"Each",reward:"c2",cites:["S1","S3"]},
  {id:"q5",title:"Finish together",min:2,tasks:{A:"Show your pair code.",B:"Scan your partner's code."},done:"qr",doneBy:"Pair",reward:"",cites:[]}
];

/* ---- Collectibles. trigger.kind: "quest" (quest done) | "quiz" (score >= min) | "sensor" (phone tilted up at place) | "teacher" ----
   to: "each" | "pair" | "finder". hidden: students don't see the condition. */
const COLL_DEFS=[
  {id:"c1",title:"Memento Mori Watch",type:"Discovery",art:"watch",trigger:{kind:"quest",quest:"q1",min:2,place:""},to:"pair",evolve:"Level 2 when they check in at the drawing class",hidden:false,cites:["S1"]},
  {id:"c2",title:"Timekeeper",type:"Knowledge",art:"badge",trigger:{kind:"quiz",quest:"q1",min:2,place:""},to:"each",evolve:"",hidden:false,cites:[]},
  {id:"c3",title:"Look Up",type:"Easter egg",art:"dome",trigger:{kind:"sensor",quest:"q1",min:2,place:"the entrance-hall ceiling"},to:"finder",evolve:"",hidden:true,cites:[]}
];
const TO_TEXT={each:"Each student",pair:"Both partners",finder:"Whoever finds it"};

/* ---- Trip-day simulation ---- */
const PAIR_NAMES=["Clockwatchers","Night Owls","Curators","Relic Hunters","Map Makers","Sharp Eyes","Bookends","Sketchers","Lanterns","North Star","Echoes","Pathfinders","Quiet Ones","Magpies"];
const SAMPLE_ANSWERS=["The attendant said the watch is about 400 years old.","Oldest is a coin from Rome. You can tell from the emperor's head.","Dates on labels tell you, but some are guesses from the style.","The skull watch is older than the clocks in case 1."];
const SAMPLE_CARDS=[
  {obs:"The jaw opens on a hinge to show the dial.",int:"The owner had to face death each time they checked the time.",q:"Why would anyone want that reminder?"},
  {obs:"There are tiny scenes engraved on the skull.",int:"They tell a story about life and death.",q:"Who made the engravings?"},
  {obs:"It's small enough to hold in one hand.",int:"It was meant to be carried every day.",q:"Was it worn or kept in a pocket?"}
];

// Experience-trip partners (example names)
const PROVIDERS=[
  {id:"draw",name:"Still-life drawing class",who:"Riverside Art Studio",icon:"brush"},
  {id:"water",name:"Watercolour workshop",who:"Community Arts Centre",icon:"brush"},
  {id:"garden",name:"Botanical sketch walk",who:"University Botanic Garden",icon:"map"}
];
