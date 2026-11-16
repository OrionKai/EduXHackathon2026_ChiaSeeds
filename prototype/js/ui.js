// Shared helpers: DOM shortcuts, toast, icons, artwork, QR helpers.
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let toastT;function toast(m){const t=$("#toast");t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,2600)}
const IC={
  plus:'<path d="M8 3v10M3 8h10"/>', check:'<path d="M3 8.5l3 3 7-7"/>', edit:'<path d="M3 13h3l7-7-3-3-7 7z"/>',
  chat:'<path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z"/>', send:'<path d="M2 8l12-5-5 12-2-5z"/>', spark:'<path d="M8 1.5l1.6 4.9 4.9 1.6-4.9 1.6L8 14.5l-1.6-4.9L1.5 8l4.9-1.6z"/>',
  doc:'<path d="M4 1.5h5l3 3v10H4z M9 1.5v3h3"/>', map:'<path d="M1.5 3.5l4-1.5 5 2 4-1.5v10l-4 1.5-5-2-4 1.5z M5.5 2v10 M10.5 4v10"/>',
  brush:'<path d="M10 2l4 4-6 6-4-4z M4 8l-2.5 6.5L8 12"/>', lock:'<path d="M4 7h8v7H4z M5.5 7V5a2.5 2.5 0 015 0v2"/>',
  cam:'<path d="M1.5 5h3l1.5-2h4L11.5 5h3v8h-13z"/><circle cx="8" cy="9" r="2.5"/>', mail:'<path d="M1.5 3.5h13v9h-13z M1.5 4l6.5 5 6.5-5"/>',
  play:'<path d="M5 3l8 5-8 5z"/>', users:'<circle cx="5.5" cy="5" r="2.2"/><circle cx="11" cy="5.5" r="1.8"/><path d="M1.5 13c.5-2.5 2-3.6 4-3.6s3.5 1.1 4 3.6 M10 9.6c1.9 0 3.6.9 4.2 3"/>'
};
const ic=(n,s=16)=>`<svg class="i" width="${s}" height="${s}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;
const logo=`<svg width="28" height="28" viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15" r="13" fill="none" stroke="var(--accent)" stroke-width="3"/><path d="M15 6 L18 15 L15 24 L12 15 Z" fill="var(--accent)"/><circle cx="15" cy="15" r="2.5" fill="var(--surface)"/></svg>`;
function watchArt(size=120,evolved=false){const c=evolved?"var(--gold)":"var(--ink)";return `<svg width="${size}" height="${size}" viewBox="0 0 120 120" aria-label="Skull watch">
 ${evolved?'<circle cx="60" cy="66" r="52" fill="none" stroke="var(--gold)" stroke-width="2" stroke-dasharray="4 6"/>':''}
 <circle cx="60" cy="14" r="7" fill="none" stroke="${c}" stroke-width="4"/><rect x="55" y="19" width="10" height="8" rx="2" fill="${c}"/>
 <ellipse cx="60" cy="66" rx="36" ry="40" fill="var(--surface)" stroke="${c}" stroke-width="5"/>
 <circle cx="46" cy="60" r="8" fill="${c}"/><circle cx="74" cy="60" r="8" fill="${c}"/><path d="M60 70 l-5 9 h10 z" fill="${c}"/>
 <path d="M44 90 h32 M50 86 v8 M56 86 v8 M62 86 v8 M68 86 v8" stroke="${c}" stroke-width="3" fill="none"/>
 ${evolved?'<path d="M96 30 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill="var(--gold)"/>':''}</svg>`}
function badgeArt(size=60){return `<svg width="${size}" height="${size}" viewBox="0 0 60 60" aria-label="Timekeeper badge"><path d="M30 4l7 6 9-1 2 9 8 5-4 8 4 8-8 5-2 9-9-1-7 6-7-6-9 1-2-9-8-5 4-8-4-8 8-5 2-9 9 1z" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2.5"/><circle cx="30" cy="30" r="11" fill="none" stroke="var(--accent)" stroke-width="2.5"/><path d="M30 23v7l5 3" stroke="var(--accent)" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`}
function domeArt(size=60){return `<svg width="${size}" height="${size}" viewBox="0 0 60 60" aria-label="Look Up easter egg"><path d="M8 44a22 22 0 0144 0z" fill="var(--ai-soft)" stroke="var(--ai)" stroke-width="2.5"/><path d="M30 22v22 M19 26l5 18 M41 26l-5 18 M8 44h44" stroke="var(--ai)" stroke-width="2"/><circle cx="30" cy="16" r="4" fill="var(--ai)"/></svg>`}
function makeQR(el,text){el.innerHTML="";if(window.QRCode)new QRCode(el,{text,width:190,height:190,colorDark:"#141b2b",colorLight:"#ffffff"});else el.innerHTML=`<p class="mono">${esc(text)}</p>`}
function readQRFromFile(file){return new Promise(res=>{const img=new Image();img.onload=()=>{const s=Math.min(1,1000/Math.max(img.width,img.height));const cv=document.createElement("canvas");cv.width=img.width*s;cv.height=img.height*s;const cx=cv.getContext("2d");cx.drawImage(img,0,0,cv.width,cv.height);try{const d=cx.getImageData(0,0,cv.width,cv.height);const r=window.jsQR?jsQR(d.data,cv.width,cv.height):null;res(r?r.data:null)}catch{res(null)}};img.onerror=()=>res(null);img.src=URL.createObjectURL(file)})}
