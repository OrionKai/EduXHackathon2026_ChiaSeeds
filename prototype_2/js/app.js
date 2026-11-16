/* WorldQuest prototype_2 — UI renderer.
 * Every control dispatches a guarded Engine action; nothing here mutates game
 * state directly. Failed actions surface the engine's reason as a toast and
 * change nothing on screen.
 */
'use strict';

(() => {
  const root = document.getElementById('app');
  const live = document.getElementById('aria-live');
  const S = () => Engine.state;
  const sel = Engine.sel;

  let lastReveal = null; // collectible id revealed this session (one-time flip)

  /* ================= helpers ================= */

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function act(type, payload) {
    const r = Engine.dispatch(type, payload);
    if (!r.ok && r.msg) toast(r.msg, 'error');
    else if (r.ok && r.msg) toast(r.msg, 'success');
    if (r.ok && r.msg) live.textContent = r.msg;
    if (r.reveal) lastReveal = r.reveal;
    return r;
  }

  function toast(msg, kind) {
    const zone = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + (kind === 'error' ? 'error' : 'success');
    el.setAttribute('role', 'status');
    el.innerHTML = `${Art.icon(kind === 'error' ? 'alert' : 'check', 18)}<span>${esc(msg)}</span>`;
    zone.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  function statusChip(status) {
    const map = {
      LOCKED: ['st-locked', 'lock', 'Locked'],
      AVAILABLE: ['st-available', 'sparkle', 'Available'],
      SUBMITTED: ['st-submitted', 'clock', 'Awaiting review'],
      VERIFIED: ['st-verified', 'check', 'Verified'],
      CLAIMED: ['st-verified', 'check', 'Claimed'],
      APPROVED: ['st-verified', 'check', 'Approved'],
      NEEDS_REVISION: ['st-revision', 'alert', 'Needs revision'],
      PENDING: ['st-submitted', 'clock', 'Awaiting review'],
    };
    const [cls, icon, label] = map[status] || map.AVAILABLE;
    return `<span class="status-chip ${cls}">${Art.icon(icon, 15)}${label}</span>`;
  }

  const topicColor = (t) => SEED.topicMeta[t].color;
  const topicChip = (t) =>
    `<span class="topic-chip ${topicColor(t)}">${Art.icon(SEED.topicMeta[t].icon, 15)}${t} · ${SEED.topicMeta[t].label}</span>`;

  /* ================= shell ================= */

  function render() {
    const y = window.scrollY;
    const st = S();
    const role = st.ui.role;
    root.innerHTML = `
      <div class="shell">
        <aside class="sidebar">
          <div class="brand">${Art.logo(42)}<h1>WorldQuest</h1></div>
          <div class="side-label">Adventure base</div>
          <nav class="side-nav" aria-label="Choose a role view">
            ${sideBtn('student', 'sparkle', 'Student adventure')}
            ${sideBtn('teacher', 'map', 'Educator studio')}
            ${sideBtn('collaborator', 'handshake', 'Community partner')}
          </nav>
          <div class="side-tip"><strong>${Art.icon('leaf', 16)} Look up, not down</strong>
          The best clues are in the real world.</div>
        </aside>
        <main class="main" id="main">
          <a class="skip-link" href="#main-content">Skip to content</a>
          <div class="topbar">
            <span class="crumb">WorldQuest · Interactive prototype</span>
            <div class="role-tabs" role="group" aria-label="Demo role">
              ${roleTab('student', '🧭', 'Student')}
              ${roleTab('teacher', '✏️', 'Educator')}
              ${roleTab('collaborator', '🤝', 'Collaborator')}
            </div>
            ${syncPill()}
            <button class="btn btn-ghost btn-sm" data-a="reset">${Art.icon('back', 16)} Reset demo</button>
          </div>
          <div id="main-content">
            ${role === 'student' ? studentView(st) : role === 'teacher' ? teacherView(st) : collaboratorView(st)}
          </div>
          <p class="fiction-note">${esc(SEED.fictionDisclaimer)} Gallery anchors come from official Fitzwilliam Museum pages
          (<a href="https://fitzmuseum.cam.ac.uk/plan-your-visit/galleries" target="_blank" rel="noopener">galleries</a>) and must be
          re-checked before a real visit. This prototype runs entirely in your browser: a local demo adapter stands in for the
          production server described in the PRD.</p>
        </main>
      </div>
      ${overlays(st)}
      <div class="demo-float">Working prototype · seeded demo state</div>`;
    bind();
    window.scrollTo(0, y);
    lastReveal = null; // the one-time card flip plays only on the render right after its claim
  }

  function syncPill() {
    const s = typeof Sync !== 'undefined' ? Sync.state : { status: 'offline', session: '' };
    const txt = { live: `● Live · class ${s.session}`, connecting: 'Connecting…', offline: 'This device only', error: 'Sync error · this device only' }[s.status];
    return `<span class="pill sync-pill ${s.status}" title="Shared session code: ${esc(s.session)}">${txt}</span>`;
  }

  const sideBtn = (role, icon, label) =>
    `<button data-a="role" data-role="${role}" aria-current="${S().ui.role === role}">${Art.icon(icon, 19)}${label}</button>`;
  const roleTab = (role, emoji, label) =>
    `<button data-a="role" data-role="${role}" aria-pressed="${S().ui.role === role}"><span aria-hidden="true">${emoji}</span>${label}</button>`;

  /* ================= student ================= */

  function studentView(st) {
    const me = SEED.byId[st.ui.student];
    const screen = st.ui.screen || 'adventure';
    const tabs = [
      ['adventure', 'sparkle', 'My adventure'],
      ['map', 'map', 'Quest map'],
      ['album', 'trophy', 'Class album'],
    ];
    return `
      <div class="stack">
        <div class="spread">
          <div class="row">
            <span class="identity-chip">${Art.icon('eye', 17)} ${esc(me.name)} · Home ${me.home} · Expert ${me.topic}</span>
            ${topicChip(me.topic)}
            ${st.help.some((h) => h.pid === me.id && h.open)
              ? `<span class="pill peach">${Art.icon('clock', 14)} Teacher is on the way</span>`
              : `<button class="btn btn-sm help-btn" data-a="help">${Art.icon('alert', 15)} Call teacher</button>`}
          </div>
          <div class="row">
            <label class="sr-only" for="student-sel">Play as explorer</label>
            <select id="student-sel" class="input" style="width:auto;padding:8px 12px" data-a="student-sel">
              ${SEED.homeGroups.map((h) => `<optgroup label="Home team ${h}">${SEED.homeMembers(h).map((p) => `<option value="${p.id}" ${p.id === me.id ? 'selected' : ''}>${p.name} · ${p.topic}</option>`).join('')}</optgroup>`).join('')}
            </select>
            <span class="pill plain">demo: play as any explorer</span>
          </div>
        </div>
        <div class="stage-tabs" role="group" aria-label="Student screens">
          ${tabs.map(([id, ic, lb]) => `<button data-a="screen" data-screen="${id}" aria-pressed="${screen === id}">${Art.icon(ic, 16)}${lb}</button>`).join('')}
        </div>
        <div class="stage-wrap stack">
          ${screen === 'map' ? questMap(st, me) : screen === 'album' ? albumScreen(st, 'student') : adventureScreen(st, me)}
        </div>
      </div>`;
  }

  function phasePath(st) {
    const stations = [
      ['BRIEFING', 'book', 'Briefing'],
      ['EXPERT', 'lens', 'Explore'],
      ['PEER_TEACH', 'team', 'Teach'],
      ['FINALE', 'puzzle', 'Solve'],
      ['REFLECTION', 'trophy', 'Celebrate'],
    ];
    const idx = SEED.phases.indexOf(st.phase);
    return `<div class="card"><div class="eyebrow">Quest path · ${esc(SEED.phaseMeta[st.phase].label)}</div>
      <div class="path-steps">
        ${stations.map(([ph, ic, lb]) => {
          const i = SEED.phases.indexOf(ph);
          const cls = i < idx || st.phase === 'COMPLETE' ? 'done' : i === idx ? 'now' : '';
          return `<div class="path-step ${cls}"><div class="path-dot">${Art.icon(ic, 20)}</div><small>${lb}</small></div>`;
        }).join('')}
      </div></div>`;
  }

  function adventureScreen(st, me) {
    switch (st.phase) {
      case 'LOBBY': return joinScreen(st, me);
      case 'BRIEFING': return briefingScreen(me) + phasePath(st);
      case 'EXPERT': return missionScreen(st, me) + phasePath(st);
      case 'PEER_TEACH': return teachScreen(st, me) + phasePath(st);
      case 'FINALE': return finaleScreen(st, me) + bonusCardFor(st, me) + phasePath(st);
      case 'REFLECTION': return reflectionScreen(st, me) + bonusCardFor(st, me) + phasePath(st);
      case 'COMPLETE': return completeScreen(st, me) + phasePath(st);
      default: return '';
    }
  }

  function joinScreen(st, me) {
    return `
      <div class="hero">
        <div>
          <div class="eyebrow">A new world of learning</div>
          <h1>The world is <span class="accent">your classroom.</span></h1>
          <p class="lede">Explore real places, unlock hidden stories, and bring your friends’ discoveries together to solve a mystery.</p>
          <div class="row">
            <label class="sr-only" for="join-code">Classroom code</label>
            <input id="join-code" class="input" style="width:170px" value="FITZ-DEMO" aria-label="Classroom code">
            <button class="btn btn-primary" data-a="join">Join the quest ✦</button>
          </div>
          <p class="hint-note" style="margin-top:10px">No real name needed — you play as a pseudonymous explorer.</p>
        </div>
        <div class="hero-art">${Art.arch()}${Art.sticker('A clue awaits!', '🔍')}</div>
      </div>
      <div class="card">
        <div class="spread"><h3>Waiting in the lobby</h3>${statusChip(st.quest.status === 'PUBLISHED' ? 'AVAILABLE' : 'LOCKED')}</div>
        <p>${st.quest.status === 'PUBLISHED'
          ? 'You’re in! Your educator will begin the briefing shortly. (In this demo, switch to the Educator view and advance the session.)'
          : 'The quest hasn’t been published yet. In this demo: the Collaborator approves their contribution, then the Educator publishes and starts the session.'}</p>
        <p class="hint-note">You are ${esc(me.name)} in home team ${me.home}, expert track ${me.topic} · ${esc(SEED.topicMeta[me.topic].name)}.</p>
      </div>`;
  }

  function briefingScreen(me) {
    const m = SEED.missions[me.topic];
    return `
      <div class="hero">
        <div>
          <div class="eyebrow">Chapter 01 · ${esc(SEED.title)}</div>
          <h1>${esc(SEED.subtitle)}</h1>
          <p class="lede">${esc(SEED.story.opening)}</p>
          <div class="row">${SEED.story.rules.map((r) => `<span class="pill mint">${Art.icon('check', 14)} ${esc(r)}</span>`).join('')}</div>
        </div>
        <div class="hero-art">${Art.arch({ door: '#20BDA9', face: '#F6C5CF' })}${Art.sticker('Junior Curators', '🏛️')}</div>
      </div>
      <div class="card wash-lavender">
        <div class="eyebrow">You are a…</div>
        <div class="spread">
          <div><h3>${esc(m.name)}</h3><p style="margin:0">${esc(m.narrative)} Your team needs what only you will discover in ${esc(m.gallery)}.</p></div>
          ${topicChip(me.topic)}
        </div>
      </div>
      <div class="card"><p style="margin:0" class="hint-note">${Art.icon('help', 16)} This story is fiction, created for learning — it is not an official museum programme. Your educator starts the expert phase when every team is ready.</p></div>`;
  }

  function missionScreen(st, me) {
    const m = SEED.missions[me.topic];
    const ev = st.evidence[me.id];
    const tab = st.ui.missionTab || 'observe';
    const color = topicColor(me.topic);
    if (ev.status === 'VERIFIED') {
      return `
        <div class="card wash-mint burst">
          <div class="eyebrow teal">Evidence verified</div>
          <h2>You’re the ${esc(m.name)} expert! ✦</h2>
          <p>Your evidence from ${esc(m.gallery)} is confirmed. Get ready to teach your home team ${me.home} what you found:</p>
          <p><strong>${esc(m.teachHeadline)}</strong></p>
          <p class="hint-note" style="margin:0">Your educator will open the peer-teaching phase. This badge is your expert role — collectible cards are a separate, optional side quest.</p>
        </div>`;
    }
    const tabs = [
      ['observe', 'eye', '1 · Observe'],
      ['discuss', 'voices', '2 · Discuss'],
      ['record', 'pencil', '3 · Record'],
    ];
    return `
      <div class="mission-hero ${color}">
        <div class="eyebrow">${esc(SEED.title)} · Expert ${me.topic}</div>
        <h2>${esc(m.name)}</h2>
        <p style="max-width:52ch">${esc(m.narrative)}</p>
        <div class="row">${statusChip(ev.status)}<span class="pill plain">${esc(m.gallery)}</span></div>
      </div>
      ${ev.status === 'NEEDS_REVISION' ? `<div class="card wash-peach"><strong>${Art.icon('alert', 17)} Revision requested:</strong> ${esc(ev.note)}</div>` : ''}
      <div class="stage-tabs" role="group" aria-label="Mission steps">
        ${tabs.map(([id, ic, lb]) => `<button data-a="mtab" data-tab="${id}" aria-pressed="${tab === id}">${Art.icon(ic, 15)}${lb}</button>`).join('')}
      </div>
      ${tab === 'observe' ? `
        ${checkinCard(st, me, m)}
        <div class="gallery-note"><h4>${Art.icon('map', 18)} ${esc(m.gallery)}</h4><p style="margin:0">${esc(m.observe)}</p></div>
        <div class="card"><p class="hint-note" style="margin:0"><strong>Verified anchor:</strong> ${esc(m.sourceFact)}
          <a href="${m.sourceUrl}" target="_blank" rel="noopener">official source</a> · re-check on the day. ${esc(m.fallback)}</p></div>
        <button class="btn btn-secondary" data-a="lookup">${Art.icon('eye', 18)} Look Up Mode</button>
        <p class="hint-note">Observe in person with your group. Never place anything on museum objects.</p>` : ''}
      ${tab === 'discuss' ? `
        <div class="card wash-lavender"><h4>${Art.icon('voices', 18)} Talk it through</h4><p style="margin:0">${esc(m.discuss)}</p></div>
        ${m.needsFacilitator ? `
          <div class="card ${st.interactions[me.id] ? 'wash-mint' : 'wash-peach'}">
            <div class="spread"><h4 style="margin:0">${Art.icon('handshake', 18)} Arranged contributor conversation</h4>
            ${st.interactions[me.id] ? statusChip('VERIFIED') : statusChip('SUBMITTED')}</div>
            <p style="margin:8px 0 0">${st.interactions[me.id]
              ? 'Your conversation with the approved contributor is verified — record their perspective in step 3.'
              : `Meet the approved adult contributor (<em>${esc(SEED.contributor.label)}</em>). They confirm the conversation from their own device — in this demo, switch to the Collaborator view to verify it.`}</p>
          </div>` : ''}` : ''}
      ${tab === 'record' ? (st.checkins[me.id] ? recordForm(st, me, m, ev) : checkinCard(st, me, m, true)) : ''}`;
  }

  function checkinCard(st, me, m, locked) {
    const c = st.checkins[me.id];
    if (c) return `<div class="card wash-mint" style="padding:12px 16px"><strong>${Art.icon('check', 16)} Checked in at ${esc(m.gallery)}</strong> <small>${c.via === 'QR' ? 'QR clue card' : c.via === 'CODE' ? 'facilitator code' : 'simulated'}</small></div>`;
    return `<div class="card checkin-card">
      <h4 style="margin:0 0 6px">${Art.icon('map', 18)} ${locked ? 'Field notes unlock at your station' : 'Find your station'}</h4>
      <p style="margin:0 0 10px">Go to <strong>${esc(m.gallery)}</strong> and scan the <strong>${esc(m.name)}</strong> clue card.</p>
      <button class="btn btn-primary" data-a="scan-station">${Art.icon('eye', 17)} Scan clue card</button></div>`;
  }

  function recordForm(st, me, m, ev) {
    if (ev.status === 'SUBMITTED') {
      return `<div class="card"><div class="spread"><h3>Evidence submitted</h3>${statusChip('SUBMITTED')}</div>
        <p style="margin:0">Your educator is reviewing your evidence. Look up and keep exploring with your group — you’ll feel a tap when it’s verified. (Demo: review it from the Educator studio.)</p></div>`;
    }
    const hintsOpen = st.ui.hintsOpen;
    return `
      <form class="card" data-form="evidence">
        <h3>Your field notes</h3>
        ${m.evidenceFields.map((f) => `
          <div class="fld-group">
            <label class="fld" for="f-${f.key}">${esc(f.label)}</label>
            <textarea class="input" id="f-${f.key}" name="${f.key}" rows="2" placeholder="${esc(f.placeholder)}">${esc(ev.answers?.[f.key] || '')}</textarea>
          </div>`).join('')}
        <div class="row">
          <button class="btn btn-primary" type="submit">${Art.icon('check', 18)} Submit evidence</button>
          <button class="btn btn-ghost" type="button" data-a="hints">${Art.icon('help', 17)} ${hintsOpen ? 'Hide hints' : 'Need a hint?'}</button>
        </div>
        ${hintsOpen ? `<div class="gallery-note" style="margin-top:12px"><h4>${Art.icon('sparkle', 16)} Hints, one at a time · never the answer</h4>
          <ol style="margin:0;padding-left:18px">${m.hints.slice(0, st.ui.hintsShown || 1).map((h) => `<li>${esc(h)}</li>`).join('')}</ol>
          <div class="spread" style="margin-top:8px"><span class="hint-src">From: approved source · <a href="${m.sourceUrl}" target="_blank" rel="noopener">${esc(m.gallery)} page</a> · educator-approved</span>
          ${(st.ui.hintsShown || 1) < m.hints.length ? `<button class="btn btn-ghost btn-sm" type="button" data-a="hint-more">Another hint</button>` : ''}</div></div>` : ''}
      </form>`;
  }

  function teachScreen(st, me) {
    const home = me.home;
    const shared = st.peerTeach[home];
    const doneCount = SEED.topics.filter((t) => shared[t].shared).length;
    return `
      <div class="mission-hero violet">
        <div class="eyebrow">Home team ${home} · Peer teaching</div>
        <h2>Everyone holds a piece.</h2>
        <p style="max-width:54ch">Each expert teaches what they found; a teammate answers a quick check to show the knowledge landed. ${doneCount}/4 perspectives shared.</p>
      </div>
      <div class="jigsaw-grid">
        ${SEED.topics.map((t) => {
          const expert = SEED.expertOf(home, t);
          const evs = st.evidence[expert.id].status;
          const cell = shared[t];
          const meta = SEED.topicMeta[t];
          return `<div class="jig-tile ${meta.color} ${cell.shared ? 'shared' : ''}">
            <div class="topic-dot">${Art.icon(meta.icon, 18)}</div>
            <h4>${t} · ${esc(meta.name)}</h4>
            <span class="who">${esc(expert.name)}${expert.id === me.id ? ' (you)' : ''}${cell.simulated ? ' · simulated' : ''}</span>
            <div style="margin-top:8px">${cell.shared ? statusChip('VERIFIED').replace('Verified', 'Shared') : evs === 'VERIFIED' ? statusChip('AVAILABLE').replace('Available', 'Ready to teach') : statusChip('LOCKED').replace('Locked', 'Evidence not verified')}</div>
            ${!cell.shared && evs === 'VERIFIED' ? `<div style="margin-top:10px"><button class="btn btn-sm btn-secondary" data-a="teach-open" data-topic="${t}">${Art.icon('voices', 15)} Log teach-back</button></div>` : ''}
          </div>`;
        }).join('')}
      </div>
      ${st.ui.teachTopic ? teachForm(st, me, st.ui.teachTopic) : ''}
      ${doneCount === 4 ? `<div class="card wash-mint burst"><strong>${Art.icon('check', 17)} All four perspectives shared!</strong> The finale unlocks when your educator opens the next phase.</div>` : ''}`;
  }

  function teachForm(st, me, topic) {
    const home = me.home;
    const expert = SEED.expertOf(home, topic);
    const mates = SEED.homeMembers(home).filter((p) => p.id !== expert.id);
    const opts = SEED.peerTeaching.checkOptions[topic];
    return `
      <form class="card" data-form="teach" data-topic="${topic}">
        <div class="spread"><h3>${esc(expert.name)} teaches ${esc(SEED.topicMeta[topic].name)}</h3>${topicChip(topic)}</div>
        <p class="hint-note">${esc(SEED.peerTeaching.prompt)} The expert talks for ~2 minutes off-screen; then a teammate answers:</p>
        <div class="fld-group">
          <label class="fld" for="checker">Which teammate answers the check?</label>
          <select class="input" id="checker" name="checker">${mates.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select>
        </div>
        <div class="fld-group" role="radiogroup" aria-label="Teach-back answer">
          ${opts.map((o) => `<label class="tile-pick" style="display:flex;gap:9px;align-items:flex-start">
            <input type="radio" name="answer" value="${o.id}" style="margin-top:4px;accent-color:var(--violet)"> <span>${esc(o.text)}</span></label>`).join('')}
        </div>
        <div class="row">
          <button class="btn btn-primary" type="submit">${Art.icon('check', 17)} Mark as shared</button>
          <button class="btn btn-ghost" type="button" data-a="teach-close">Cancel</button>
        </div>
      </form>`;
  }

  function finaleScreen(st, me) {
    const home = me.home;
    const f = st.finale[home];
    if (f.status === 'LOCKED') {
      const reasons = sel.finaleLockReasons(home);
      return `
        <div class="card">
          <div class="spread"><h2>${Art.icon('lock', 24)} Finale locked</h2>${statusChip('LOCKED')}</div>
          <p>“Restore the Exhibition Introduction” needs every perspective in team ${home} verified <em>and</em> taught:</p>
          <div class="stack" style="gap:8px">
            ${reasons.map((r) => `<div class="row">${topicChip(r.topic)}<span class="hint-note">${r.kind === 'evidence' ? 'evidence not yet verified by the educator' : 'not yet taught to the team'}</span></div>`).join('')}
          </div>
          <p class="hint-note" style="margin-top:12px">No shortcuts — the lock is enforced by the game engine, not the screen.</p>
        </div>`;
    }
    if (f.status === 'SUBMITTED') {
      return `<div class="card"><div class="spread"><h2>Introduction submitted</h2>${statusChip('SUBMITTED')}</div>
        <p style="margin:0">The curator (your educator) is reviewing team ${home}’s restored introduction against the rubric: ${SEED.finale.rubric.join(' · ')}.</p></div>`;
    }
    if (f.status === 'APPROVED') {
      return `<div class="card wash-mint burst"><div class="spread"><h2>Main quest complete! ✦</h2>${statusChip('APPROVED')}</div>
        <p style="margin:0">The curator approved team ${home}’s exhibition introduction. Beautifully cautious, evidence-based work.</p></div>`;
    }
    const fin = SEED.finale;
    const picked = st.ui.pickedObject;
    return `
      ${f.status === 'NEEDS_REVISION' ? `<div class="card wash-peach"><strong>${Art.icon('alert', 17)} Curator’s note:</strong> ${esc(f.note)}</div>` : ''}
      <div class="mission-hero sun">
        <div class="eyebrow sun">Escape-room finale · Team ${home}</div>
        <h2>${esc(fin.title)}</h2>
        <p style="max-width:56ch">Use all four experts’ knowledge. Three puzzle panels, one shared answer.</p>
      </div>
      <div class="card">
        <h3>Panel 1 · Match the evidence</h3>
        <p class="hint-note">Tap an object, then the perspective it helps investigate. (Fully keyboard accessible — no dragging needed.)</p>
        <div class="match-board">
          <div class="stack" style="gap:8px" role="group" aria-label="Objects">
            ${fin.objects.map((o) => {
              const placedTag = f.match[o.id];
              return `<button type="button" class="match-obj ${placedTag ? 'placed' : ''}" data-a="pick-obj" data-obj="${o.id}" aria-pressed="${picked === o.id}">
                ${Art.icon('lens', 15)} ${esc(o.label)} <small>· ${esc(o.gallery)}</small>${placedTag ? `<span class="assigned" style="color:var(--success)">→ ${esc(tagName(placedTag))}</span>` : ''}</button>`;
            }).join('')}
          </div>
          <div class="stack" style="gap:8px" role="group" aria-label="Perspectives">
            ${SEED.topics.map((t) => {
              const tag = SEED.topicMeta[t].tag;
              const obj = Object.entries(f.match).find(([, v]) => v === tag);
              return `<button type="button" class="match-slot ${obj ? 'filled' : ''}" data-a="pick-slot" data-tag="${tag}">
                ${topicChip(t)}<span class="assigned">${obj ? esc(fin.objects.find((o) => o.id === obj[0]).label) + ' ✦' : 'place an object here'}</span></button>`;
            }).join('')}
          </div>
        </div>
      </div>
      <div class="card">
        <h3>Panel 2 · Spot the overclaim</h3>
        <p class="hint-note">${esc(fin.overclaim.question)}</p>
        ${fin.overclaim.options.map((o) => `<button type="button" class="tile-pick" data-a="overclaim" data-opt="${o.id}" aria-pressed="${f.overclaim === o.id}">${esc(o.text)}</button>`).join('')}
      </div>
      <div class="card">
        <h3>Panel 3 · Compose the new introduction</h3>
        <p class="hint-note">${esc(fin.compose.prompt)} Pick 4–5 sentence tiles:</p>
        ${fin.compose.tiles.map((t) => `<button type="button" class="tile-pick" data-a="tile" data-tile="${t.id}" aria-pressed="${f.tiles.includes(t.id)}">${esc(t.text)}</button>`).join('')}
      </div>
      <button class="btn btn-primary" data-a="submit-finale">${Art.icon('puzzle', 18)} Submit our restored introduction</button>`;
  }

  function tagName(tag) {
    const t = SEED.topics.find((t) => SEED.topicMeta[t].tag === tag);
    return t ? SEED.topicMeta[t].name : tag;
  }

  function bonusCardFor(st, me) {
    const card = SEED.collectibles.find((c) => c.home === me.home);
    if (!card) return '';
    const b = st.bonus[card.id];
    const claimed = !!st.claims[card.id];
    return `
      <div class="card" style="background:var(--grad-collect)">
        <div class="spread"><div class="eyebrow sun">Bonus discovery · optional</div>${claimed ? statusChip('CLAIMED') : statusChip(b.status)}</div>
        <div class="grid-2" style="grid-template-columns: 110px 1fr; gap:16px">
          <div class="collect-card ${claimed ? 'claimed' : 'locked'}" style="max-width:110px;cursor:default">${claimed ? Art.collectibleArt[card.id]() : Art.lockedArt()}</div>
          <div>
            <h3>${esc(card.title)}</h3>
            <p class="hint-note">${esc(card.activity)} This side quest never blocks the main quest.</p>
            ${claimed ? `<p style="margin:0"><strong>Earned for the class album!</strong> ${esc(card.fact)}</p>`
              : b.status === 'SUBMITTED' ? `<p style="margin:0">Submitted — awaiting educator approval.</p>`
              : `<form data-form="bonus" data-card="${card.id}">
                  <label class="fld" for="bonus-a">${esc(card.promptLabel)}</label>
                  <textarea class="input" id="bonus-a" name="answer" rows="2"></textarea>
                  <div style="margin-top:10px"><button class="btn btn-sun btn-sm" type="submit">${Art.icon('sparkle', 16)} Submit discovery</button></div>
                </form>`}
          </div>
        </div>
      </div>`;
  }

  function reflectionScreen(st, me) {
    const done = st.reflections[me.id];
    const f = st.finale[me.home];
    return `
      ${f.status === 'APPROVED' ? `<div class="card wash-mint"><div class="spread"><h2>Quest complete ✦</h2>${statusChip('APPROVED')}</div><p style="margin:0">Team ${me.home} restored the exhibition introduction.</p></div>` : ''}
      ${done ? `<div class="card"><h3>Reflection saved</h3><p style="margin:0">Thanks, ${esc(me.name)} — now look up and join the class discussion!</p></div>`
      : `<form class="card" data-form="reflection">
          <div class="eyebrow">Two-minute reflection</div>
          <h3>Before you go…</h3>
          ${SEED.reflection.map((q, i) => `<div class="fld-group"><label class="fld" for="refl-${i}">${esc(q)}</label><textarea id="refl-${i}" class="input" name="r${i}" rows="2"></textarea></div>`).join('')}
          <button class="btn btn-primary" type="submit">${Art.icon('check', 17)} Save my reflection</button>
        </form>`}`;
  }

  function completeScreen(st, me) {
    return `
      <div class="hero">
        <div>
          <div class="eyebrow sun">The Lost Museum · restored</div>
          <h1>Guardians of <span class="accent">stories.</span></h1>
          <p class="lede">Four perspectives, five teams, one restored exhibition introduction. The best part wasn’t on this screen — it was the looking, the listening and the teaching.</p>
          <button class="btn btn-primary" data-a="screen" data-screen="album">${Art.icon('trophy', 18)} Open the class album</button>
        </div>
        <div class="hero-art">${Art.arch({ door: '#FFB547', face: '#C8EDE3' })}${Art.sticker('Quest complete!', '🏆')}</div>
      </div>`;
  }

  function questMap(st, me) {
    return `
      ${phasePath(st)}
      <div class="card wash-lavender">
        <div class="eyebrow">Learning with others</div>
        <h3>Everyone holds a piece.</h3>
        <p>You investigate one expert perspective, teach it to your home team, then use all four perspectives in the final puzzle.</p>
        <div class="row">${SEED.topics.map((t) => topicChip(t)).join('')}</div>
      </div>
      <div class="jigsaw-grid">
        ${SEED.topics.map((t) => {
          const m = SEED.missions[t];
          const mine = me.topic === t;
          return `<div class="jig-tile ${topicColor(t)}">
            <div class="topic-dot">${Art.icon(SEED.topicMeta[t].icon, 18)}</div>
            <h4>${esc(m.name)}</h4>
            <span class="who">${esc(m.gallery)}</span>
            <p class="hint-note" style="margin:8px 0 0">${mine ? esc(m.narrative) + ' — your mission!' : 'A peer will teach you this perspective.'}</p>
          </div>`;
        }).join('')}
      </div>`;
  }

  /* ================= album (shared) ================= */

  function albumScreen(st, viewer) {
    const n = sel.claimedCount();
    return `
      <div class="spread">
        <h2>The class discovery album</h2>
        <span class="pill lavender">${n} / 5 collected</span>
      </div>
      <div class="album-grid">
        ${SEED.collectibles.map((c) => {
          const claimed = !!st.claims[c.id];
          const justNow = lastReveal === c.id;
          return `<button type="button" class="collect-card ${claimed ? 'claimed' : 'locked'} ${justNow ? 'just-claimed' : ''}" data-a="card-info" data-card="${c.id}" aria-label="${esc(c.title)}: ${claimed ? 'collected by team ' + c.home : 'not yet discovered'}">
            ${claimed ? Art.collectibleArt[c.id]() + '<span class="holo"></span><span class="claim-stamp">' + Art.icon('check', 15) + '</span>' : Art.lockedArt()}
            <span class="card-strip"><strong>${claimed ? esc(c.title) : 'Mystery card'}</strong><small>${claimed ? esc(c.category) + ' · team ' + c.home : 'Team ' + c.home + ' · not discovered'}</small></span>
          </button>`;
        }).join('')}
      </div>
      <div class="album-progress" role="progressbar" aria-valuenow="${n}" aria-valuemin="0" aria-valuemax="5" aria-label="Album progress"><div style="width:${n * 20}%"></div></div>
      <div class="card ${st.master ? '' : 'wash-lavender'}" style="${st.master ? 'background:var(--grad-collect)' : ''}">
        <div class="grid-2" style="grid-template-columns: 110px 1fr; gap:16px; align-items:center">
          <div class="collect-card ${st.master ? 'claimed' : 'locked'}" style="max-width:110px;cursor:default">${st.master ? Art.masterArt() : Art.lockedArt()}</div>
          <div>
            <h3>${Art.icon('trophy', 20)} ${esc(SEED.master.title)}</h3>
            <p style="margin:0">${st.master ? esc(SEED.master.fact) + ' Unlocked for the whole class — exactly once.' : esc(SEED.master.text)}</p>
          </div>
        </div>
      </div>
      ${viewer === 'student' ? `<p class="hint-note">Each home team earns one card from an optional real-world micro-discovery. Cards never gate the main quest.</p>` : ''}`;
  }

  /* ================= teacher ================= */

  function teacherView(st) {
    const screen = st.ui.screen || 'dashboard';
    const tabs = [
      ['dashboard', 'map', 'Overview'],
      ['builder', 'pencil', 'Quest builder'],
      ['teams', 'team', 'Teams'],
      ['live', 'eye', 'Live session'],
      ['album', 'trophy', 'Album'],
      ['report', 'book', 'Report'],
    ];
    return `
      <div class="stack">
        <div class="stage-tabs" role="group" aria-label="Educator screens">
          ${tabs.map(([id, ic, lb]) => `<button data-a="screen" data-screen="${id}" aria-pressed="${screen === id}">${Art.icon(ic, 16)}${lb}</button>`).join('')}
        </div>
        ${screen === 'builder' ? teacherBuilder(st)
          : screen === 'teams' ? teacherTeams(st)
          : screen === 'live' ? teacherLive(st)
          : screen === 'album' ? `<div class="stage-wrap stack">${albumScreen(st, 'teacher')}</div>`
          : screen === 'report' ? teacherReport(st)
          : teacherDashboard(st)}
      </div>`;
  }

  function teacherDashboard(st) {
    const pend = sel.pendingEvidence().length + sel.pendingFinales().length + sel.pendingBonus().length;
    return `
      <div class="stack">
        <div class="hero" style="background:linear-gradient(120deg,#EFEBFF,#FDF3FA 60%,#FFF1DA)">
          <div>
            <div class="eyebrow">Educator creative studio</div>
            <h1>Design an <span class="accent">adventure.</span></h1>
            <p class="lede">Bring curriculum, community expertise and real-world exploration into one unforgettable quest.</p>
            <div class="row">
              <button class="btn btn-primary" data-a="screen" data-screen="builder">Create a quest ✦</button>
              <button class="btn btn-secondary" data-a="screen" data-screen="live">${Art.icon('eye', 17)} Live session</button>
            </div>
          </div>
          <div class="hero-art">${Art.arch({ door: '#6B5CE7', face: '#C8EDE3' })}${Art.sticker('Quest Builder', '✏️')}</div>
        </div>
        <div class="grid-3">
          <div class="card wash-lavender"><div class="eyebrow">My quests</div><h2 style="font-size:40px">01</h2><p style="margin:0">${esc(st.quest.title)} · ${statusChip(st.quest.status === 'PUBLISHED' ? 'APPROVED' : 'PENDING').replace('Approved', 'Published').replace('Awaiting review', esc(st.quest.status))}</p></div>
          <div class="card wash-mint"><div class="eyebrow teal">Class explorers</div><h2 style="font-size:40px">20</h2><p style="margin:0">5 home teams · 4 expertise tracks · seeded demo class</p></div>
          <div class="card wash-peach"><div class="eyebrow coral">Pending reviews</div><h2 style="font-size:40px">${String(pend).padStart(2, '0')}</h2><p style="margin:0">${pend ? 'Evidence, finales or discoveries waiting in the live room.' : 'Nothing waiting — all clear.'}</p></div>
        </div>
        <div class="card">
          <div class="spread"><h3>${Art.icon('handshake', 19)} Your community collaborator</h3>${statusChip(st.contributor.status)}</div>
          <p style="margin:0">${esc(SEED.contributor.name)} — <em>${esc(SEED.contributor.label)}</em>. ${st.contributor.status === 'APPROVED' ? 'Contribution approved; the quest can be published.' : 'Awaiting their review of the learning contribution (switch to the Collaborator view to act).'}</p>
        </div>
      </div>`;
  }

  function teacherBuilder(st) {
    const q = st.quest;
    const step = q.status === 'PUBLISHED' ? 4 : q.draftGenerated ? (st.contributor.status === 'APPROVED' ? 4 : 3) : 1;
    return `
      <div class="grid-2">
        <div class="stack">
          <div class="card">
            <div class="wizard-steps" aria-hidden="true">
              <span class="${step >= 1 ? 'on' : ''}">The Why</span> → <span class="${step >= 2 ? 'on' : ''}">The Where</span> → <span class="${step >= 3 ? 'on' : ''}">The Magic</span> → <span class="${step >= 4 ? 'on' : ''}">The Plan</span>
            </div>
            <h2 style="margin-top:8px">Set the scene</h2>
            <div class="fld-group"><label class="fld" for="q-title">Quest title</label>
              <input class="input" id="q-title" data-q="title" value="${esc(q.title)}" ${q.status === 'PUBLISHED' ? 'disabled' : ''}></div>
            <div class="fld-group"><label class="fld" for="q-obj">Learning objective</label>
              <input class="input" id="q-obj" data-q="objective" value="${esc(q.objective)}" ${q.status === 'PUBLISHED' ? 'disabled' : ''}></div>
            <div class="fld-group"><label class="fld" for="q-venue">Where will they explore?</label>
              <input class="input" id="q-venue" data-q="venue" value="${esc(q.venue)}" ${q.status === 'PUBLISHED' ? 'disabled' : ''}></div>
          </div>
          ${Assistant.panel()}
          ${q.draftGenerated ? `
          <div class="card">
            <div class="spread"><h3>Publish checklist</h3>${statusChip(q.status === 'PUBLISHED' ? 'APPROVED' : st.contributor.status === 'APPROVED' ? 'AVAILABLE' : 'PENDING')}</div>
            <ul style="margin:0 0 12px;padding-left:20px">
              <li>Safety &amp; supervision reviewed (demo checklist) ✓</li>
              <li>Sources verified against official gallery pages ✓</li>
              <li>AI-drafted tracks approved by you: <strong>${SEED.topics.filter((t) => st.tracks[t] === 'APPROVED').length}/4</strong></li>
              <li>Community contribution approved: <strong>${st.contributor.status === 'APPROVED' ? 'yes' : 'not yet — collaborator must approve'}</strong></li>
              <li>Published as <strong>DEMO_ONLY</strong> — no real venue permission implied</li>
            </ul>
            <button class="btn btn-teal" data-a="publish" ${q.status === 'PUBLISHED' ? 'disabled' : ''}>${q.status === 'PUBLISHED' ? 'Published ✓' : 'Publish demo quest'}</button>
          </div>` : ''}
        </div>
        <div class="card wash-mint" style="position:sticky;top:14px">
          <div class="eyebrow teal">Live student preview</div>
          <div class="preview-phone">
            <div class="row" style="justify-content:space-between"><strong style="font-family:var(--font-display)">${Art.logo(26)} WorldQuest</strong><span class="pill lavender">Chapter 01</span></div>
            <h3 id="pv-title" style="margin-top:12px">${esc(q.title)}</h3>
            <p id="pv-obj" class="hint-note">${esc(q.objective)}</p>
            <div class="gallery-note" style="margin-bottom:12px"><h4>${Art.icon('map', 16)} <span id="pv-venue">${esc(q.venue)}</span></h4></div>
            ${q.draftGenerated ? `
              <div class="row" style="margin-bottom:10px">${SEED.topics.map((t) => topicChip(t)).join('')}</div>
              <div class="card" style="padding:12px;background:var(--grad-collect);text-align:center">
                <strong>${Art.icon('puzzle', 16)} Restore the Exhibition Story</strong><br><small>One collaborative escape-room finale needs all four perspectives</small>
              </div>` : `<p class="hint-note" style="margin:0">Generate a draft to see the Jigsaw map appear here.</p>`}
          </div>
          <p class="hint-note" style="margin:12px 0 0;text-align:center">Edit the inputs — the preview updates live.</p>
        </div>
      </div>`;
  }

  function teacherTeams(st) {
    const viewExpert = st.ui.teamView === 'expert';
    return `
      <div class="stack">
        <div class="spread">
          <h2>Colour-coded Jigsaw matrix</h2>
          <div class="stage-tabs">
            <button data-a="teamview" data-view="home" aria-pressed="${!viewExpert}">${Art.icon('team', 15)}Home teams</button>
            <button data-a="teamview" data-view="expert" aria-pressed="${viewExpert}">${Art.icon('lens', 15)}Expert groups</button>
          </div>
        </div>
        <div class="card matrix" role="region" aria-label="${viewExpert ? 'Expert groups, four columns of five' : 'Home teams, five columns with expertise rows A to D'}" tabindex="0">
          ${viewExpert ? expertMatrix(st) : homeMatrix(st)}
        </div>
        <p class="hint-note">20 explorers · every home team holds one of each expertise A/B/C/D; every expert group has five members. Tile colour = expertise; the small line is live evidence status.</p>
      </div>`;
  }

  function evShort(st, p) {
    const s = st.evidence[p.id].status;
    const map = { AVAILABLE: ['—', 'var(--muted)'], SUBMITTED: ['submitted', '#7A5A17'], VERIFIED: ['verified ✓', 'var(--success)'], NEEDS_REVISION: ['revise', 'var(--danger)'] };
    const [t, c] = map[s];
    return `<span class="mini-status" style="color:${c}">${t}</span>`;
  }

  function homeMatrix(st) {
    const cls = { A: 'v', B: 't', C: 's', D: 'c' };
    return `<table><thead><tr><th scope="col">Track</th>${SEED.homeGroups.map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead>
      <tbody>${SEED.topics.map((t) => `<tr><th scope="row">${t} · ${esc(SEED.topicMeta[t].label)}</th>
        ${SEED.homeGroups.map((h) => { const p = SEED.expertOf(h, t); return `<td class="${cls[t]}">${esc(p.name.replace('Explorer ', 'Ex '))}${evShort(st, p)}</td>`; }).join('')}</tr>`).join('')}</tbody></table>`;
  }

  function expertMatrix(st) {
    const cls = { A: 'v', B: 't', C: 's', D: 'c' };
    return `<table><thead><tr>${SEED.topics.map((t) => `<th scope="col">${t} · ${esc(SEED.topicMeta[t].name)}</th>`).join('')}</tr></thead>
      <tbody><tr>${SEED.topics.map((t) => `<td class="${cls[t]}" style="vertical-align:top">${SEED.participants.filter((p) => p.topic === t).map((p) => `<div>${esc(p.name.replace('Explorer ', 'Ex '))} <small>(${p.home})</small>${evShort(st, p)}</div>`).join('')}</td>`).join('')}</tr></tbody></table>`;
  }

  function teacherLive(st) {
    const evQ = sel.pendingEvidence();
    const finQ = sel.pendingFinales();
    const bonusQ = sel.pendingBonus();
    const idx = sel.phaseIndex();
    return `
      <div class="stack">
        <div class="card">
          <div class="spread">
            <h2>Live control room</h2>
            <div class="row">
              <button class="btn btn-secondary btn-sm" data-a="rewind" ${idx === 0 ? 'disabled' : ''}>${Art.icon('back', 15)} Back</button>
              <button class="btn btn-secondary btn-sm" data-a="qr-cards">${Art.icon('map', 15)} Station QR cards</button>
              <button class="btn btn-primary btn-sm" data-a="advance" ${idx >= SEED.phases.length - 1 ? 'disabled' : ''}>Advance phase ${Art.icon('arrow', 15)}</button>
            </div>
          </div>
          <div class="path-steps" style="margin-top:8px">
            ${SEED.phases.map((ph, i) => `<div class="path-step ${i < idx ? 'done' : i === idx ? 'now' : ''}"><div class="path-dot">${i < idx ? Art.icon('check', 17) : i + 1}</div><small>${esc(SEED.phaseMeta[ph].label)}</small></div>`).join('')}
          </div>
          <p class="hint-note" style="margin:10px 0 0">${esc(SEED.phaseMeta[st.phase].desc)} ${st.phase === 'LOBBY' && st.quest.status !== 'PUBLISHED' ? '· Publish the quest first (Quest builder).' : ''}</p>
        </div>

        ${st.help.some((h) => h.open) ? `<div class="card"><div class="spread"><h3>${Art.icon('alert', 18)} Help requests</h3><span class="pill peach">${st.help.filter((h) => h.open).length} open</span></div>
          <div class="stack" style="gap:8px">${st.help.filter((h) => h.open).map((h) => { const p = SEED.byId[h.pid]; return `<div class="help-row"><span><strong>${esc(p.name)}</strong> · Home ${p.home} · ${esc(SEED.missions[p.topic].gallery)}</span><button class="btn btn-teal btn-sm" data-a="resolve-help" data-id="${h.id}">${Art.icon('check', 15)} I’m with them</button></div>`; }).join('')}</div></div>` : ''}
        <div class="grid-2">
          <div class="card">
            <div class="spread"><h3>${Art.icon('clock', 18)} Evidence queue</h3><span class="pill lavender">${evQ.length} waiting</span></div>
            ${evQ.length === 0 ? `<p class="hint-note" style="margin:0">No submissions waiting. Students submit during the expert phase.</p>` : ''}
            <div class="stack" style="gap:10px">
              ${evQ.map((p) => {
                const m = SEED.missions[p.topic];
                const ev = st.evidence[p.id];
                return `<div class="queue-row"><div class="meta">
                  <div class="row">${topicChip(p.topic)}<strong>${esc(p.name)}</strong><small>${esc(m.gallery)}</small></div>
                  <dl class="evidence-quote">${m.evidenceFields.map((f) => `<dt>${esc(f.label)}</dt><dd>${esc(ev.answers[f.key])}</dd>`).join('')}</dl></div>
                  <div class="stack" style="gap:8px">
                    <button class="btn btn-teal btn-sm" data-a="verify-ev" data-pid="${p.id}">${Art.icon('check', 15)} Verify</button>
                    <button class="btn btn-danger-ghost btn-sm" data-a="return-ev" data-pid="${p.id}">Needs revision</button>
                  </div></div>`;
              }).join('')}
            </div>
          </div>
          <div class="stack">
            <div class="card">
              <div class="spread"><h3>${Art.icon('puzzle', 18)} Finale reviews</h3><span class="pill lavender">${finQ.length} waiting</span></div>
              ${finQ.length === 0 ? `<p class="hint-note" style="margin:0">Submitted introductions appear here for rubric approval.</p>` : ''}
              ${finQ.map((h) => {
                const f = st.finale[h];
                const tiles = SEED.finale.compose.tiles.filter((t) => f.tiles.includes(t.id));
                return `<form class="queue-row" data-form="finale-review" data-home="${h}"><div class="meta">
                  <strong>Team ${h} · restored introduction</strong>
                  <div class="evidence-quote">${tiles.map((t) => esc(t.text)).join(' ')}</div>
                  <div class="rubric-row" style="margin-top:10px">
                    ${SEED.finale.rubric.map((r) => `<label><input type="checkbox" name="rub" value="${esc(r)}">${esc(r)}</label>`).join('')}
                  </div></div>
                  <div class="stack" style="gap:8px">
                    <button class="btn btn-teal btn-sm" type="submit">${Art.icon('check', 15)} Approve</button>
                    <button class="btn btn-danger-ghost btn-sm" type="button" data-a="return-finale" data-home="${h}">Return</button>
                  </div></form>`;
              }).join('')}
            </div>
            <div class="card">
              <div class="spread"><h3>${Art.icon('trophy', 18)} Bonus discoveries</h3><span class="pill lavender">${sel.claimedCount()}/5 claimed</span></div>
              ${bonusQ.length === 0 ? `<p class="hint-note" style="margin:0">Optional team discoveries appear here during the finale phase. Claims are idempotent — approving twice can never double-award.</p>` : ''}
              ${bonusQ.map((c) => `<div class="queue-row"><div class="meta"><strong>${esc(c.title)}</strong> <small>team ${c.home}${st.bonus[c.id].simulated ? ' · SIMULATED' : ''}</small>
                <div class="evidence-quote">${esc(st.bonus[c.id].answer)}</div></div>
                <button class="btn btn-sun btn-sm" data-a="approve-bonus" data-card="${c.id}">${Art.icon('sparkle', 15)} Approve &amp; claim</button></div>`).join('')}
            </div>
            <div class="card wash-peach">
              <h3>${Art.icon('sparkle', 18)} Demo shortcuts <span class="pill peach">simulated</span></h3>
              <p class="hint-note">For a solo walkthrough: seed the other 19 explorers’ steps. Everything seeded is labelled SIMULATED in the audit log.</p>
              <div class="row">
                <button class="btn btn-secondary btn-sm" data-a="sim-class">Seed classmate progress</button>
                <button class="btn btn-secondary btn-sm" data-a="sim-bonus">Seed team discoveries</button>
              </div>
            </div>
          </div>
        </div>
        <div class="card">
          <h3>${Art.icon('book', 18)} Audit log</h3>
          ${st.log.length === 0 ? '<p class="hint-note" style="margin:0">Actions appear here as the session runs.</p>' : ''}
          <ul class="audit-log">${st.log.slice(0, 14).map((l) => `<li><span class="who ${l.actor}">${esc(l.actor)}</span><span>${esc(l.text)}</span></li>`).join('')}</ul>
        </div>
      </div>`;
  }

  function teacherReport(st) {
    const verified = SEED.participants.filter((p) => st.evidence[p.id].status === 'VERIFIED');
    const simCount = verified.filter((p) => st.evidence[p.id].simulated).length;
    const shares = SEED.homeGroups.reduce((n, h) => n + SEED.topics.filter((t) => st.peerTeach[h][t].shared).length, 0);
    const fins = SEED.homeGroups.filter((h) => st.finale[h].status === 'APPROVED').length;
    const refl = Object.entries(st.reflections);
    return `
      <div class="stack">
        <h2>Learning report <span class="pill">demo data — not real learners</span></h2>
        <div class="grid-3">
          <div class="card wash-lavender"><div class="eyebrow">Evidence verified</div><h2 style="font-size:38px">${verified.length}/20</h2><p style="margin:0">${simCount ? simCount + ' marked SIMULATED' : 'all from live demo play'}</p></div>
          <div class="card wash-mint"><div class="eyebrow teal">Perspectives taught</div><h2 style="font-size:38px">${shares}/20</h2><p style="margin:0">teach-backs across 5 home teams</p></div>
          <div class="card wash-peach"><div class="eyebrow coral">Finales approved</div><h2 style="font-size:38px">${fins}/5</h2><p style="margin:0">cards claimed: ${sel.claimedCount()}/5 · master: ${st.master ? 'unlocked' : 'locked'}</p></div>
        </div>
        <div class="card">
          <h3>Student reflections (${refl.length})</h3>
          ${refl.length === 0 ? '<p class="hint-note" style="margin:0">Individual reflections appear here after the reflection phase.</p>'
            : refl.map(([pid, a]) => `<div class="evidence-quote" style="margin-bottom:8px"><strong>${esc(SEED.byId[pid].name)}</strong><br>“${esc(a[0])}” · “${esc(a[1])}”</div>`).join('')}
          <p class="hint-note" style="margin-top:12px">This report shows demonstration workflow data only — no learning-impact claims. A production build adds pre/post observation-vs-inference checks and per-group participation counts.</p>
        </div>
      </div>`;
  }

  /* ================= collaborator ================= */

  function collaboratorView(st) {
    const screen = st.ui.screen || 'review';
    const pendD = sel.pendingInteractions();
    return `
      <div class="stack">
        <div class="hero peach">
          <div>
            <div class="eyebrow coral">Community-powered learning</div>
            <h1>Your knowledge <span class="accent-coral">brings it to life.</span></h1>
            <p class="lede">Help educators create respectful, accurate missions rooted in people, places and real stories.</p>
            <span class="pill">${esc(SEED.contributor.label)}</span>
          </div>
          <div class="hero-art">${Art.arch({ door: '#6B5CE7', face: '#F6C5CF' })}${Art.sticker('A story to share', '💬')}</div>
        </div>
        <div class="stage-tabs" role="group" aria-label="Collaborator screens">
          <button data-a="screen" data-screen="review" aria-pressed="${screen === 'review'}">${Art.icon('pencil', 16)}Review contribution</button>
          <button data-a="screen" data-screen="facilitate" aria-pressed="${screen === 'facilitate'}">${Art.icon('voices', 16)}Facilitate · Expert D ${pendD.length ? `(${pendD.length})` : ''}</button>
        </div>
        ${screen === 'facilitate' ? facilitateScreen(st, pendD) : reviewScreen(st)}
      </div>`;
  }

  function reviewScreen(st) {
    const approved = st.contributor.status === 'APPROVED';
    return `
      <div class="grid-2">
        <form class="card" data-form="contribution">
          <div class="eyebrow coral">Expert D · Connections &amp; Voices</div>
          <h3>Your approved learning contribution</h3>
          <p class="hint-note">Review the student discussion prompts and add context that cannot be replaced by generic AI answers. You edit only your own contribution — never the educator’s curriculum.</p>
          <label class="fld" for="contrib">What students can learn from you</label>
          <textarea class="input" id="contrib" rows="4" ${approved ? 'disabled' : ''}>${esc(st.contributor.text)}</textarea>
          <div class="row" style="margin-top:12px">
            ${approved
              ? `<span class="status-chip st-verified">${Art.icon('check', 15)}Approved — educator notified</span>`
              : `<button class="btn btn-primary" type="submit">${Art.icon('pencil', 16)} Save edit</button>
                 <button class="btn btn-teal" type="button" data-a="approve-contrib">${Art.icon('check', 16)} Approve contribution</button>`}
          </div>
        </form>
        <div class="card wash-peach">
          <div class="eyebrow coral">A shared responsibility</div>
          <h3>Made together. Learned together.</h3>
          <div class="stack" style="gap:10px">
            ${[['Community context', 'Adult-approved knowledge', true],
               ['Respectful representation', 'Review learning activity and cultural context', true],
               ['Approve student interaction', 'Explicit confirmation is recorded', approved]]
              .map(([t, d, on]) => `<div class="queue-row" style="background:var(--white)"><div class="meta"><strong>${t}</strong><br><small>${d}</small></div>${on ? statusChip('VERIFIED').replace('Verified', '✓') : statusChip('PENDING').replace('Awaiting review', 'open')}</div>`).join('')}
          </div>
          <p class="hint-note" style="margin:12px 0 0">This demo role is simulated; it does not represent museum staff or a confirmed museum partnership. Your approval is a separate sign-off from the educator’s.</p>
        </div>
      </div>`;
  }

  function facilitateScreen(st, pendD) {
    const promptIdx = st.contributor.interactionPrompt || 0;
    return `
      <div class="grid-2">
        <div class="card">
          <div class="eyebrow coral">Live facilitation</div>
          <h3>Your conversation prompt</h3>
          <p class="hint-note">Pick one prompt and discuss it with each Expert D student in an arranged, supervised conversation.</p>
          ${SEED.contributor.prompts.map((p, i) => `<button type="button" class="tile-pick" data-a="prompt" data-i="${i}" aria-pressed="${promptIdx === i}">${esc(p)}</button>`).join('')}
          <p class="hint-note" style="margin-top:10px">Your reply is recorded by students as a <em>perspective</em>, never as museum fact.</p>
        </div>
        <div class="card">
          <h3>${Art.icon('handshake', 19)} Verify arranged interactions</h3>
          ${st.phase === 'LOBBY' ? '<p class="hint-note" style="margin:0">Interactions open once the educator starts the session.</p>' : ''}
          ${pendD.length === 0 && st.phase !== 'LOBBY' ? '<p class="hint-note" style="margin:0">All Expert D conversations are verified. ✓</p>' : ''}
          <div class="stack" style="gap:10px">
            ${pendD.map((p) => `<div class="queue-row"><div class="meta"><strong>${esc(p.name)}</strong><br><small>Home ${p.home} · Expert D · Gallery 24</small></div>
              <button class="btn btn-teal btn-sm" data-a="verify-int" data-pid="${p.id}">${Art.icon('check', 15)} Confirm interaction</button></div>`).join('')}
          </div>
          <p class="hint-note" style="margin-top:12px">Verification is an adult-controlled action — students cannot confirm it themselves.</p>
        </div>
      </div>`;
  }

  /* ================= overlays ================= */

  function overlays(st) {
    let html = '<div class="toast-zone" id="toasts"></div>';
    if (st.ui.lookUp) {
      const me = SEED.byId[st.ui.student];
      const m = SEED.missions[me.topic];
      html += `<div class="overlay" role="dialog" aria-modal="true" aria-label="Look up mode">
        <div class="overlay-panel lookup-panel">
          <div class="eyebrow teal">Look Up Mode</div>
          <h2>Eyes on the real world 👀</h2>
          <p class="big-instruction">${esc(m.observe)}</p>
          <p class="hint-note">Stay with your group · ask an approved adult if unsure · nothing touches the exhibits.</p>
          <button class="btn btn-primary" data-a="lookup-off">${Art.icon('back', 17)} Back to quest</button>
        </div></div>`;
    }
    if (st.master && !st.masterSeen) {
      html += `<div class="overlay" role="dialog" aria-modal="true" aria-label="Master award unlocked">
        <div class="overlay-panel master-panel">
          <div class="reveal">
            <div class="eyebrow sun">5 / 5 discoveries · class award</div>
            <h2>${esc(SEED.master.title)}</h2>
            ${Art.masterArt()}
            <p style="margin-top:14px">${esc(SEED.master.fact)}</p>
          </div>
          <button class="btn btn-primary" data-a="master-seen">${Art.icon('trophy', 17)} Add to the class album</button>
          <p class="hint-note" style="margin:10px 0 0">Awarded exactly once per class — this reveal won’t loop or repeat.</p>
        </div></div>`;
    }
    return html;
  }

  /* ================= events ================= */

  function bind() {
    root.querySelectorAll('[data-a]').forEach((el) => {
      const a = el.dataset.a;
      if (a === 'student-sel') {
        el.addEventListener('change', () => act('setStudent', { id: el.value }));
        return;
      }
      el.addEventListener('click', (e) => {
        switch (a) {
          case 'role': return act('setRole', { role: el.dataset.role }) && act('setScreen', { screen: null });
          case 'screen': return act('setScreen', { screen: el.dataset.screen });
          case 'reset': if (confirmReset()) act('resetDemo'); return;
          case 'join': toast('You’re in the lobby, ' + SEED.byId[S().ui.student].name + '!', 'success'); return;
          case 'mtab': S().ui.missionTab = el.dataset.tab; render(); return;
          case 'hints': S().ui.hintsOpen = !S().ui.hintsOpen; S().ui.hintsShown = 1; render(); return;
          case 'hint-more': S().ui.hintsShown = (S().ui.hintsShown || 1) + 1; render(); return;
          case 'help': return act('requestHelp', { participantId: S().ui.student });
          case 'resolve-help': return act('resolveHelp', { id: el.dataset.id });
          case 'qr-cards': return StationCards.open();
          case 'scan-station': {
            const me = SEED.byId[S().ui.student], m = SEED.missions[me.topic];
            return Scanner.open({ title: `Scan the ${m.name} clue card`, hint: `It’s at ${m.gallery}. The facilitator can read you the backup code if the camera won’t work.`,
              onCode: (code) => act('checkIn', { participantId: me.id, code }).ok });
          }
          case 'lookup': return act('setLookUp', { on: true });
          case 'lookup-off': return act('setLookUp', { on: false });
          case 'teach-open': S().ui.teachTopic = el.dataset.topic; render(); return;
          case 'teach-close': S().ui.teachTopic = null; render(); return;
          case 'pick-obj': S().ui.pickedObject = S().ui.pickedObject === el.dataset.obj ? null : el.dataset.obj; render(); return;
          case 'pick-slot': {
            const obj = S().ui.pickedObject;
            const me = SEED.byId[S().ui.student];
            if (!obj) { toast('Tap an object first, then its perspective.', 'error'); return; }
            S().ui.pickedObject = null;
            return act('setFinaleMatch', { home: me.home, objectId: obj, tag: el.dataset.tag }), render();
          }
          case 'overclaim': { const me = SEED.byId[S().ui.student]; return act('setFinaleOverclaim', { home: me.home, optionId: el.dataset.opt }), render(); }
          case 'tile': { const me = SEED.byId[S().ui.student]; return act('toggleFinaleTile', { home: me.home, tileId: el.dataset.tile }), render(); }
          case 'submit-finale': { const me = SEED.byId[S().ui.student]; return act('submitFinale', { home: me.home }); }
          case 'card-info': {
            const c = SEED.collectibles.find((x) => x.id === el.dataset.card);
            const claimed = S().claims[c.id];
            toast(claimed ? `${c.title} — ${c.fact}` : `${c.title}: team ${c.home}’s discovery is still out there…`, 'success');
            return;
          }
          case 'generate': return act('generateDraft');
          case 'publish': return act('publishQuest');
          case 'advance': return act('advancePhase');
          case 'rewind': return act('rewindPhase');
          case 'verify-ev': return act('reviewEvidence', { participantId: el.dataset.pid, verdict: 'VERIFIED', reviewer: 'teacher' });
          case 'return-ev': return act('reviewEvidence', { participantId: el.dataset.pid, verdict: 'NEEDS_REVISION', reviewer: 'teacher' });
          case 'return-finale': return act('reviewFinale', { home: el.dataset.home, approve: false });
          case 'approve-bonus': return act('approveBonus', { collectibleId: el.dataset.card });
          case 'sim-class': return act('simulateClassmates');
          case 'sim-bonus': return act('simulateBonusSubmissions');
          case 'approve-contrib': return act('approveContribution');
          case 'verify-int': return act('verifyInteraction', { participantId: el.dataset.pid });
          case 'prompt': return act('setInteractionPrompt', { index: Number(el.dataset.i) }), render();
          case 'teamview': S().ui.teamView = el.dataset.view; render(); return;
          case 'master-seen': return act('markMasterSeen'), render();
        }
      });
    });

    if (typeof Assistant !== 'undefined') Assistant.bind(root);

    // live preview typing in the quest builder (silent updates, targeted DOM refresh)
    root.querySelectorAll('[data-q]').forEach((el) => {
      el.addEventListener('input', () => {
        Engine.dispatch('updateQuest', { field: el.dataset.q, value: el.value });
        const map = { title: 'pv-title', objective: 'pv-obj', venue: 'pv-venue' };
        const pv = document.getElementById(map[el.dataset.q]);
        if (pv) pv.textContent = el.value;
      });
    });

    root.querySelectorAll('form[data-form]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const kind = form.dataset.form;
        if (kind === 'evidence') {
          const me = SEED.byId[S().ui.student];
          const answers = {};
          SEED.missions[me.topic].evidenceFields.forEach((f) => { answers[f.key] = form.querySelector(`[name="${f.key}"]`)?.value || ''; });
          act('submitEvidence', { participantId: me.id, answers });
        } else if (kind === 'teach') {
          const me = SEED.byId[S().ui.student];
          const topic = form.dataset.topic;
          const checker = form.querySelector('[name="checker"]').value;
          const answer = form.querySelector('[name="answer"]:checked')?.value;
          const r = act('shareTeachBack', { home: me.home, topic, checkerId: checker, answerId: answer || '' });
          if (r.ok) { S().ui.teachTopic = null; render(); }
        } else if (kind === 'bonus') {
          act('submitBonus', { collectibleId: form.dataset.card, answer: form.querySelector('[name="answer"]').value });
        } else if (kind === 'reflection') {
          const me = SEED.byId[S().ui.student];
          act('submitReflection', { participantId: me.id, answers: [form.querySelector('[name="r0"]').value, form.querySelector('[name="r1"]').value] });
        } else if (kind === 'contribution') {
          act('saveContribution', { text: form.querySelector('#contrib').value });
        } else if (kind === 'finale-review') {
          const rubric = {};
          form.querySelectorAll('[name="rub"]:checked').forEach((c) => { rubric[c.value] = true; });
          act('reviewFinale', { home: form.dataset.home, approve: true, rubric });
        }
      });
    });
  }

  function confirmReset() {
    return window.confirm ? window.confirm('Reset the whole demo to its seeded starting state?') : true;
  }

  /* ================= boot ================= */

  /* Deep-linkable demo states, e.g. ?fast=teach&role=student — handy for demos
     and screenshot capture. Every step goes through the same guarded actions. */
  function applyDemoParams() {
    const q = new URLSearchParams(location.search);
    const fast = q.get('fast');
    if (fast) {
      const d = Engine.dispatch;
      d('resetDemo');
      d('approveContribution');
      d('generateDraft');
      d('publishQuest');
      d('advancePhase'); // BRIEFING
      if (['expert', 'teach', 'finale', 'album3', 'album5'].includes(fast)) d('advancePhase'); // EXPERT
      if (fast !== 'expert' && fast !== 'briefing') {
        // verify the active explorer's own evidence, then seed classmates (SIMULATED)
        const me = SEED.byId[Engine.state.ui.student];
        const answers = {};
        SEED.missions[me.topic].evidenceFields.forEach((f) => (answers[f.key] = '[Demo answer] ' + f.label));
        if (me.topic === 'D') d('verifyInteraction', { participantId: me.id });
        d('submitEvidence', { participantId: me.id, answers });
        d('reviewEvidence', { participantId: me.id, verdict: 'VERIFIED', reviewer: 'teacher' });
        d('simulateClassmates');
        d('advancePhase'); // PEER_TEACH
      }
      if (['finale', 'album3', 'album5'].includes(fast)) {
        const me = SEED.byId[Engine.state.ui.student];
        const checker = SEED.homeMembers(me.home).find((p) => p.id !== me.id);
        const answer = SEED.peerTeaching.checkOptions[me.topic].find((o) => o.correct);
        d('shareTeachBack', { home: me.home, topic: me.topic, checkerId: checker.id, answerId: answer.id });
        d('advancePhase'); // FINALE
      }
      if (fast === 'album3' || fast === 'album5') {
        d('simulateBonusSubmissions');
        const n = fast === 'album5' ? 5 : 3;
        SEED.collectibles.slice(0, n).forEach((c) => d('approveBonus', { collectibleId: c.id }));
        lastReveal = null;
        if (fast === 'album5') d('markMasterSeen');
      }
    }
    if (q.get('role')) Engine.dispatch('setRole', { role: q.get('role') });
    if (q.get('screen')) Engine.dispatch('setScreen', { screen: q.get('screen') });
  }

  let deferred = false;
  Engine.subscribe((st, event) => {
    if (event?.result?.silent && event.type === 'updateQuest') return; // targeted update already done
    // A change from another device must not wipe what this person is typing: wait until they leave the field.
    const a = document.activeElement;
    if (event?.type === 'remote' && a && root.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) {
      if (!deferred) { deferred = true; a.addEventListener('blur', () => { deferred = false; render(); }, { once: true }); }
      return;
    }
    render();
  });
  window.WQ = { act, toast, render };
  document.addEventListener('wq-sync', () => render());
  document.addEventListener('wq-sync-msg', (e) => toast(e.detail, 'error'));

  applyDemoParams();
  render();
  if (typeof Sync !== 'undefined') Sync.start();
})();
