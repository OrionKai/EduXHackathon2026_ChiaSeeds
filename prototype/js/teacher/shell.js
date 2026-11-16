// Teacher header and tab switching.
let TAB="unit";
function renderTeacher(){
  const tabs=[["unit","Unit plan"],["builder","Quest builder"],["partners","Partners"]];
  $("#app").innerHTML=`<div class="wrap">
   <div class="topbar"><a class="brand" href="#">${logo} WorldQuest</a>
    <nav class="tabs" aria-label="Teacher sections">${tabs.map(([k,v])=>`<button data-tab="${k}" aria-current="${TAB===k}">${v}</button>`).join("")}</nav>
    <span class="small muted">Ms Rahman · Year 10 History</span></div>
   <main id="tmain"></main></div>`;
  $$("[data-tab]").forEach(b=>b.onclick=()=>go(b.dataset.tab));
  ({unit:renderUnit,builder:renderBuilder,partners:renderPartners})[TAB]();
}
function go(tab){TAB=tab;renderTeacher();scrollTo(0,0)}
