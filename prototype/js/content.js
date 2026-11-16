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


// Experience-trip partners (example names)
const PROVIDERS=[
  {id:"draw",name:"Still-life drawing class",who:"Riverside Art Studio",icon:"brush"},
  {id:"water",name:"Watercolour workshop",who:"Community Arts Centre",icon:"brush"},
  {id:"garden",name:"Botanical sketch walk",who:"University Botanic Garden",icon:"map"}
];
