// Camera, live QR scanning and the tilt-up easter egg.
let stream=null,scanLoop=null;
function stopCam(){clearInterval(scanLoop);scanLoop=null;stream?.getTracks().forEach(t=>t.stop());stream=null}
async function openCam(video){if(!navigator.mediaDevices?.getUserMedia)throw new Error("nocam");
  stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});video.srcObject=stream;await video.play()}
function startQRScan(video,expected,onHit){const cv=document.createElement("canvas"),cx=cv.getContext("2d",{willReadFrequently:true});
  scanLoop=setInterval(()=>{if(!video.videoWidth||!window.jsQR)return;const s=Math.min(1,640/video.videoWidth);cv.width=video.videoWidth*s;cv.height=video.videoHeight*s;
    cx.drawImage(video,0,0,cv.width,cv.height);const r=jsQR(cx.getImageData(0,0,cv.width,cv.height).data,cv.width,cv.height);if(r&&r.data===expected){stopCam();onHit()}},280)}

/* tilt easter egg */
let tiltArmed=false,upSince=0;
function armTilt(){
  if(window.DeviceOrientationEvent&&typeof DeviceOrientationEvent.requestPermission==="function")DeviceOrientationEvent.requestPermission().catch(()=>{});
  if(tiltArmed)return;tiltArmed=true;
  addEventListener("deviceorientation",e=>{if(e.beta==null)return;const up=Math.abs(e.beta)>140;
    if(up){upSince||=Date.now();if(Date.now()-upSince>700)foundEgg()}else upSince=0});
}
let eggRole=null;
function foundEgg(){const r=eggRole&&S[eggRole];if(!r||r.egg||r.step<1)return;r.egg=true;
  const o=$("#overlay");o.hidden=false;o.innerHTML=`<div class="card stack pop" style="align-items:center"><span class="label">Easter egg found</span><div class="mini" style="width:96px;height:96px;background:var(--ai-soft);border-color:var(--ai)">${domeArt(76)}</div><h2>Look Up</h2><p class="small muted">You looked beyond the instructions. Shared with your partner.</p><button class="primary big" id="eggOk">Nice</button></div>`;
  $("#eggOk").onclick=()=>{o.hidden=true;renderStudent(eggRole)}}
