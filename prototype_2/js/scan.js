/* WorldQuest prototype_2 — camera QR scanner and printable station cards.
 * Lives outside the app's render tree so re-renders never kill the camera.
 * Camera needs HTTPS (or localhost). Without a camera, students type the code instead.
 */
'use strict';

const Scanner = (() => {
  let stream = null, timer = null, el = null;

  function close() {
    clearInterval(timer); timer = null;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    if (el) el.remove();
    el = null;
  }

  /* open({ title, hint, onCode(text) -> true to close }) */
  function open({ title, hint, onCode }) {
    close();
    el = document.createElement('div');
    el.className = 'overlay scan-overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', title);
    el.innerHTML = `
      <div class="overlay-panel scan-panel">
        <div class="spread"><div class="eyebrow teal">Real-world checkpoint</div><button class="btn btn-ghost btn-sm" data-x>Close</button></div>
        <h2 style="margin:4px 0 6px">${title}</h2>
        <p class="hint-note" style="margin:0 0 12px">${hint}</p>
        <div class="scan-view"><video playsinline muted></video><div class="scan-frame"></div><p class="scan-msg">Starting camera…</p></div>
        <form class="row" style="margin-top:12px" data-typed>
          <label class="sr-only" for="scan-code">Or type the code</label>
          <input class="input" id="scan-code" placeholder="No camera? Type the code" style="flex:1;min-width:160px" autocomplete="off">
          <button class="btn btn-secondary btn-sm" type="submit">Check in</button>
        </form>
      </div>`;
    document.body.appendChild(el);
    el.querySelector('[data-x]').onclick = close;
    el.querySelector('[data-typed]').onsubmit = (e) => {
      e.preventDefault();
      const v = el.querySelector('#scan-code').value.trim();
      if (v && onCode(v)) close();
    };
    const video = el.querySelector('video'), msg = el.querySelector('.scan-msg');
    if (!navigator.mediaDevices?.getUserMedia || !window.jsQR) {
      msg.textContent = 'Camera not available here — type the code from the card.';
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((s) => {
        stream = s;
        video.srcObject = s;
        return video.play();
      })
      .then(() => {
        msg.textContent = 'Point at the QR clue card';
        const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
        timer = setInterval(() => {
          if (!video.videoWidth) return;
          const k = Math.min(1, 640 / video.videoWidth);
          cv.width = video.videoWidth * k; cv.height = video.videoHeight * k;
          cx.drawImage(video, 0, 0, cv.width, cv.height);
          const r = jsQR(cx.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height);
          if (r && r.data && onCode(r.data)) close();
        }, 280);
      })
      .catch(() => { msg.textContent = 'Camera blocked or unavailable — type the code from the card.'; });
  }

  return { open, close };
})();

const StationCards = (() => {
  function open() {
    const el = document.createElement('div');
    el.className = 'overlay print-overlay';
    el.innerHTML = `
      <div class="overlay-panel print-panel">
        <div class="spread no-print"><h2 style="margin:0">Station clue cards</h2>
          <div class="row"><button class="btn btn-primary btn-sm" data-print>Print</button><button class="btn btn-ghost btn-sm" data-x>Close</button></div></div>
        <p class="hint-note no-print">Place one card at each expert station (with the venue’s permission). Students scan it to unlock their field notes. The facilitator can read out the backup code instead.</p>
        <div class="station-grid">
          ${SEED.topics.map((t) => {
            const m = SEED.missions[t];
            return `<div class="station-card"><div class="eyebrow">Expert ${t} · ${m.gallery}</div><h3>${m.name}</h3>
              <div class="station-qr" data-qr="${m.stationCode}"></div><p class="mono">Backup code: <strong>${m.backupCode}</strong></p></div>`;
          }).join('')}
        </div>
      </div>`;
    document.body.appendChild(el);
    el.querySelectorAll('[data-qr]').forEach((q) => {
      if (window.QRCode) new QRCode(q, { text: q.dataset.qr, width: 150, height: 150, colorDark: '#20264B', colorLight: '#FFFFFF' });
      else q.textContent = q.dataset.qr;
    });
    el.querySelector('[data-x]').onclick = () => el.remove();
    el.querySelector('[data-print]').onclick = () => window.print();
  }
  return { open };
})();

/* Show the class code and a join QR full-screen, for the projector. */
const JoinCode = (() => {
  function open(code, title) {
    const url = location.origin + location.pathname + '?session=' + encodeURIComponent(code) + '#student';
    const el = document.createElement('div');
    el.className = 'overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Class code');
    el.innerHTML = `<div class="overlay-panel join-panel">
      <div class="eyebrow">Join ${title ? '“' + title.replace(/[<>&]/g, '') + '”' : 'the quest'}</div>
      <p style="margin:6px 0 0">Scan with your phone camera, or go to the WorldQuest site and type</p>
      <div class="join-code mono">${code.replace(/[<>&]/g, '')}</div>
      <div class="station-qr" data-join></div>
      <button class="btn btn-ghost btn-sm" data-x>Close</button></div>`;
    document.body.appendChild(el);
    const q = el.querySelector('[data-join]');
    if (window.QRCode) new QRCode(q, { text: url, width: 220, height: 220, colorDark: '#20264B', colorLight: '#FFFFFF' });
    el.querySelector('[data-x]').onclick = () => el.remove();
    el.addEventListener('click', (e) => { if (e.target === el) el.remove(); });
  }
  return { open };
})();
