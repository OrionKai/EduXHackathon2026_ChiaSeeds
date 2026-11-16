// Router and home screen. Loaded last.
function route(){stopCam();const h=location.hash.slice(1);
  if(h==="teacher")return renderTeacher();
  if(h==="student-a")return renderStudent("A");
  if(h==="student-b")return renderStudent("B");
  renderHome()}
addEventListener("hashchange",route);

function renderHome(){
  $("#app").innerHTML=`<div class="wrap">
   <div class="brand">${logo} WorldQuest</div>
   <h1 style="margin-top:32px;max-width:640px">Turn any place into a quest. Then into the next real experience.</h1>
   <div class="choices">
    <a class="card choice btn" href="#teacher"><span class="label">Laptop</span><h3>Teacher</h3><span class="muted small">Plan the unit, build the quest with AI, book the partner.</span></a>
    <a class="card choice btn" href="#student-a"><span class="label">Phone 1</span><h3>Riddle Keeper</h3><span class="muted small">Student A</span></a>
    <a class="card choice btn" href="#student-b"><span class="label">Phone 2</span><h3>Navigator</h3><span class="muted small">Student B</span></a>
   </div>
   <p class="small muted" style="margin-top:20px"><span class="chip sim">Simulated</span> marks parts that stand in for unbuilt features. Camera and tilt need the hosted HTTPS link on a phone.</p></div>`}


route();
