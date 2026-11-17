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

  const sessionCode = () => (typeof Sync !== 'undefined' ? Sync.state.session : 'FITZ-DEMO');
  const joinedHere = (st) => !!(st.ui.joinedIn && st.ui.joinedIn[sessionCode()]);
  function markJoined(pid, nick) {
    const u = S().ui; u.joinedIn = u.joinedIn || {}; u.joinedIn[sessionCode()] = pid;
    try { const k = 'wq-joined', list = JSON.parse(localStorage.getItem(k) || '[]').filter((x) => x.code !== sessionCode());
      list.unshift({ code: sessionCode(), title: S().quest.title, nick: nick || '' }); localStorage.setItem(k, JSON.stringify(list.slice(0, 8))); } catch {}
  }
  const joinedList = () => { try { return JSON.parse(localStorage.getItem('wq-joined') || '[]'); } catch { return []; } };
  const who = (p) => (S().seats && S().seats[p.id] ? S().seats[p.id].nick : p.name);
  const topicColor = (t) => SEED.topicMeta[t].color;
  const topicChip = (t) =>
    `<span class="topic-chip ${topicColor(t)}">${Art.icon(SEED.topicMeta[t].icon, 15)}${t} · ${SEED.topicMeta[t].label}</span>`;

  /* ================= shell ================= */

  /* Routing: '#student', '#educator', '#partner'; no hash = landing page. Each device stays in one role. */
  const ROUTES = { student: 'student', educator: 'teacher', partner: 'collaborator' };
  const ROUTE_OF = { student: 'student', teacher: 'educator', collaborator: 'partner' };
  const ROLE_LABEL = { student: 'Student', teacher: 'Educator', collaborator: 'Community partner' };
  const DEFAULT_SCREEN = { student: 'adventure', teacher: 'dashboard', collaborator: 'review' };
  const NAV = {
    student: [['adventure', 'sparkle', 'My adventure'], ['map', 'map', 'Quest map'], ['album', 'trophy', 'Class album']],
    teacher: [['dashboard', 'map', 'My quests'], ['builder', 'pencil', 'Quest builder'], ['next', 'arrow', 'Next experience'], ['teams', 'team', 'Teams'], ['live', 'eye', 'Live session'], ['album', 'trophy', 'Album'], ['report', 'book', 'Report']],
    collaborator: [['review', 'pencil', 'Review contribution'], ['facilitate', 'voices', 'Facilitate'], ['work', 'book', 'Student work']],
  };
  const currentRole = () => ROUTES[location.hash.slice(1)] || null;

  function render() {
    const y = window.scrollY;
    const st = S();
    const role = currentRole();
    if (!role) {
      root.innerHTML = landingView(st) + overlays(st) + demoDrawer(st);
    } else {
      if (st.ui.role !== role) { st.ui.role = role; st.ui.screen = null; st.ui.lookUp = false; }
      const screen = st.ui.screen || DEFAULT_SCREEN[role];
      const badge = (id) => (id === 'facilitate' && sel.pendingInteractions().length ? ` <span class="pill peach">${sel.pendingInteractions().length}</span>` : id === 'live' && st.help.some((h) => h.open) ? ` <span class="pill peach">help</span>` : '');
      root.innerHTML = `
      <div class="shell">
        <aside class="sidebar">
          <a class="brand" href="#" aria-label="WorldQuest home">${Art.logo(42)}<h1>WorldQuest</h1></a>
          <div class="side-label">${ROLE_LABEL[role]}</div>
          <nav class="side-nav" aria-label="${ROLE_LABEL[role]} screens">
            ${NAV[role].map(([id, ic, lb]) => `<button data-a="screen" data-screen="${id}" aria-current="${screen === id}">${Art.icon(ic, 19)}${lb}${badge(id)}</button>`).join('')}
          </nav>
          <div class="side-tip"><strong>${Art.icon('leaf', 16)} Look up, not down</strong>
          The best clues are in the real world.</div>
        </aside>
        <main class="main" id="main">
          <a class="skip-link" href="#main-content">Skip to content</a>
          <div class="topbar">
            <span class="crumb">${esc(st.quest.title)} · ${ROLE_LABEL[role]}</span>
            <span class="row" style="gap:8px">${syncPill()}<button class="demo-fab" data-a="demo-toggle" aria-expanded="${!!st.ui.demoOpen}">${Art.icon('sparkle', 15)} Demo</button></span>
          </div>
          <div id="main-content">
            ${role === 'student' ? studentView(st) : role === 'teacher' ? teacherView(st) : collaboratorView(st)}
          </div>
          <p class="fiction-note">${esc(SEED.genericDisclaimer)} ${st.quest.templateId === 'lost_museum' ? 'This example’s gallery details come from official Fitzwilliam Museum pages (<a href="https://fitzmuseum.cam.ac.uk/plan-your-visit/galleries" target="_blank" rel="noopener">galleries</a>) and must be re-checked before a visit; no partnership with the museum is claimed.' : 'Facts come only from the sources the educator approved.'}</p>
        </main>
      </div>
      ${overlays(st)}
      ${demoDrawer(st)}`;
    }
    bind();
    window.scrollTo(0, y);
    lastReveal = null; // the one-time card flip plays only on the render right after its claim
  }

  function syncPill() {
    const s = typeof Sync !== 'undefined' ? Sync.state : { status: 'offline', session: '' };
    const txt = { live: `● Live · class ${s.session}`, connecting: 'Connecting…', offline: 'This device only', error: 'Sync error · this device only' }[s.status];
    return `<span class="pill sync-pill ${s.status}" title="Shared session code: ${esc(s.session)}">${txt}</span>`;
  }

  function landingView(st) {
    return `
      <div class="landing">
        <header class="landing-top"><span class="brand">${Art.logo(40)}<h1>WorldQuest</h1></span><span class="row" style="gap:8px">${syncPill()}<button class="demo-fab" data-a="demo-toggle" aria-expanded="${!!st.ui.demoOpen}">${Art.icon('sparkle', 15)} Demo</button></span></header>
        <section class="hero">
          <div>
            <div class="eyebrow">Learning beyond the screen</div>
            <h1>The real world is <span class="accent">your classroom.</span></h1>
            <p class="lede">Teachers and community partners design quests in real places. Students explore, teach each other and solve one shared mystery.</p>
          </div>
          <div class="hero-art">${Art.arch()}</div>
        </section>
        <div class="grid-3 landing-roles">
          <a class="card role-card" href="#student"><div class="eyebrow">Student</div><h3>Join a quest</h3><p>Use the class code from your teacher. No account, just a nickname.</p><span class="btn btn-primary btn-sm">Join ${Art.icon('arrow', 15)}</span></a>
          <a class="card role-card" href="#educator"><div class="eyebrow teal">Educator</div><h3>Design and run a quest</h3><p>Plan with the AI assistant, approve every step, run the live session.</p><span class="btn btn-teal btn-sm">Open studio ${Art.icon('arrow', 15)}</span></a>
          <a class="card role-card" href="#partner"><div class="eyebrow coral">Community partner</div><h3>Share your knowledge</h3><p>Review how your community is represented and talk with students.</p><span class="btn btn-secondary btn-sm">Contribute ${Art.icon('arrow', 15)}</span></a>
        </div>
        <p class="fiction-note">${esc(SEED.genericDisclaimer)}</p>
      </div>`;
  }

  /* Demo controls: everything a presenter needs that is NOT part of the product, in one drawer. */
  function demoDrawer(st) {
    const sync = typeof Sync !== 'undefined' ? Sync.state : { session: 'FITZ-DEMO', status: 'offline' };
    const me = SEED.byId[st.ui.student];
    return `<div class="demo-drawer">
      ${st.ui.demoOpen ? `<div class="demo-panel" role="dialog" aria-label="Demo controls">
        <div class="spread"><strong>Demo controls</strong><button class="btn btn-ghost btn-sm" data-a="demo-toggle">Close</button></div>
        <p class="hint-note" style="margin:0">Presenter tools, not part of the product. Shortcuts are logged as SIMULATED.</p>
        <div class="demo-sec"><span class="eyebrow">Open this device as</span>
          <div class="row"><a class="btn btn-secondary btn-sm" href="#student">Student</a><a class="btn btn-secondary btn-sm" href="#educator">Educator</a><a class="btn btn-secondary btn-sm" href="#partner">Partner</a><a class="btn btn-ghost btn-sm" href="#">Home</a></div></div>
        <div class="demo-sec"><span class="eyebrow">Class session</span>
          <p style="margin:0">Code <strong>${esc(sync.session)}</strong> · ${sync.status === 'live' ? 'live across devices' : 'this device only'}</p>
          <form class="row" data-form="session"><label class="sr-only" for="demo-session">New session code</label><input class="input" id="demo-session" placeholder="New code, e.g. ARENA1" style="flex:1;min-width:120px"><button class="btn btn-secondary btn-sm" type="submit">Switch</button></form></div>
        <div class="demo-sec"><span class="eyebrow">Play as explorer (student view)</span>
          <select id="student-sel" class="input" data-a="student-sel">
            ${SEED.homeGroups.map((h) => `<optgroup label="Home team ${h}">${SEED.homeMembers(h).map((p) => `<option value="${p.id}" ${p.id === me.id ? 'selected' : ''}>${esc(who(p))} · ${p.topic}</option>`).join('')}</optgroup>`).join('')}
          </select></div>
        <div class="demo-sec"><span class="eyebrow">Shortcuts</span>
          <div class="row"><button class="btn btn-secondary btn-sm" data-a="sim-class">Seed classmates</button><button class="btn btn-secondary btn-sm" data-a="sim-bonus">Seed discoveries</button><button class="btn btn-secondary btn-sm" data-a="tamper">Tamper test</button></div></div>
        <div class="demo-sec"><span class="eyebrow">Running order</span>
          <ol class="hint-note" style="margin:0;padding-left:18px"><li>Partner approves their contribution</li><li>Educator drafts, approves tracks, publishes</li><li>Live session → advance phases; students join with the class code</li></ol></div>
        <button class="btn btn-danger-ghost btn-sm" data-a="reset">Reset demo data (everyone on this class code)</button>
      </div>` : ''}
    </div>`;
  }

  const sideBtn = (role, icon, label) =>
    `<button data-a="role" data-role="${role}" aria-current="${S().ui.role === role}">${Art.icon(icon, 19)}${label}</button>`;
  const roleTab = (role, emoji, label) =>
    `<button data-a="role" data-role="${role}" aria-pressed="${S().ui.role === role}"><span aria-hidden="true">${emoji}</span>${label}</button>`;

  /* ================= student ================= */

  function studentView(st) {
    const me = SEED.byId[st.ui.student];
    if (!joinedHere(st)) return `<div class="stage-wrap stack">${joinScreen(st, me)}</div>`;
    const screen = st.ui.screen || 'adventure';
    return `
      <div class="stack">
        <div class="spread">
          <div class="row">
            <span class="identity-chip">${Art.icon('eye', 17)} ${esc(who(me))} · Home team ${me.home}</span>
            ${topicChip(me.topic)}
            ${st.help.some((h) => h.pid === me.id && h.open)
              ? `<span class="pill peach">${Art.icon('clock', 14)} Teacher is on the way</span>`
              : `<button class="btn btn-sm help-btn" data-a="help">${Art.icon('alert', 15)} Call teacher</button>`}
          </div>
        </div>
        ${nextStep(st, me)}
        <div class="stage-wrap stack">
          ${screen === 'map' ? questMap(st, me) : screen === 'album' ? albumScreen(st, 'student') : adventureScreen(st, me)}
        </div>
      </div>`;
  }

  /* The one thing this student should do now, from the phase and their own progress. */
  function nextStep(st, me) {
    const m = SEED.missions[me.topic], a = m.assess || SEED.defaultAssess(), ev = st.evidence[me.id];
    const track = esc(m.name || 'your track'), place = esc(m.gallery || 'your location');
    const steps = (list) => `<ol class="ns-steps">${list.map(([done, now, text]) => `<li class="${done ? 'done' : now ? 'now' : ''}">${done ? Art.icon('check', 14) : ''}<span>${text}</span></li>`).join('')}</ol>`;
    let title = '', body = '', action = '';
    switch (st.phase) {
      case 'LOBBY':
        title = 'You’re in — wait for your teacher to start';
        body = `<p>You are the <strong>${track}</strong> expert in home team <strong>${me.home}</strong>. Find your home team and stay together. Your teacher will start the briefing soon.</p>`;
        break;
      case 'BRIEFING':
        title = 'Read your briefing';
        body = `<p>Read the story and your role below. Next, your teacher opens the expert missions and you go to <strong>${place}</strong>.</p>`;
        break;
      case 'EXPERT': {
        const at = a.checkin === 'none' || !!st.checkins[me.id];
        const submitted = ev.status === 'SUBMITTED' || ev.status === 'VERIFIED';
        const how = a.checkin === 'qr' ? ' and scan the clue card' : String(a.checkin).startsWith('photo') ? ` and photograph <strong>${esc(SEED.keyObjectOf(me.topic))}</strong>` : '';
        const list = [[at, !at, st.checkinPhotos[me.id] ? 'Wait for your teacher to confirm your photo' : `Go to <strong>${place}</strong> with your expert group${how}`],
          [at && (st.ui.missionTab === 'record' || submitted), at && !submitted, 'Look closely and talk it through — phone away'],
          [submitted, at && !submitted, `Submit your evidence (${esc(SEED.ASSESS_TEXT.evidence[a.evidence]).toLowerCase()}${a.quiz && a.quiz.length ? ' + quick check' : ''})`],
          [ev.status === 'VERIFIED', ev.status === 'SUBMITTED', ev.status === 'NEEDS_REVISION' ? 'Fix what your reviewer asked for, then submit again' : `Get it verified (${esc(SEED.ASSESS_TEXT.verify[a.verify]).toLowerCase()})`]];
        title = ev.status === 'VERIFIED' ? 'Done! Wait for peer teaching' : 'Your expert mission';
        body = steps(list);
        if (!at && a.checkin === 'qr') action = `<button class="btn btn-primary btn-sm" data-a="scan-station">${Art.icon('eye', 15)} Scan clue card</button>`;
        else if (!at && String(a.checkin).startsWith('photo') && !st.checkinPhotos[me.id]) action = `<button class="btn btn-primary btn-sm" data-a="mtab" data-tab="observe">${Art.icon('eye', 15)} Photograph the object</button>`;
        else if (!submitted || ev.status === 'NEEDS_REVISION') action = `<button class="btn btn-primary btn-sm" data-a="mtab" data-tab="record">${Art.icon('pencil', 15)} Open my field notes</button>`;
        break;
      }
      case 'PEER_TEACH': {
        const taught = SEED.topics.filter((t) => st.peerTeach[me.home][t].shared).length;
        title = 'Teach your home team';
        body = `<p>Go back to home team <strong>${me.home}</strong>. Explain what you found as the ${track} expert, then listen to the other three. A teammate answers a quick check after each one. <strong>${taught}/4</strong> taught so far.</p>`;
        break;
      }
      case 'FINALE':
        title = 'Solve the finale together';
        body = `<p>With home team <strong>${me.home}</strong>, use all four perspectives to complete “${esc(SEED.finale.title)}”.</p>`;
        break;
      case 'REFLECTION':
        title = 'Reflect';
        body = '<p>Answer the two reflection questions on your own, then look up and join the class discussion.</p>';
        break;
      default:
        title = 'Quest complete';
        body = '<p>Have a look at the class album, then put your phone away.</p>';
    }
    return `<div class="card next-step"><div class="spread"><div><div class="eyebrow">What to do now</div><h3 style="margin:2px 0 6px">${title}</h3></div>${action}</div>${body}</div>`;
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
      default: break;
    }
    if (!joinedHere(st)) return joinScreen(st, me);
    switch (st.phase) {
      case 'BRIEFING': return briefingScreen(me) + phasePath(st);
      case 'EXPERT': return missionScreen(st, me) + phasePath(st);
      case 'PEER_TEACH': return teachScreen(st, me) + phasePath(st);
      case 'FINALE': return finaleScreen(st, me) + bonusCardFor(st, me) + nextExperienceCard(st, me) + phasePath(st);
      case 'REFLECTION': return reflectionScreen(st, me) + bonusCardFor(st, me) + nextExperienceCard(st, me) + phasePath(st);
      case 'COMPLETE': return completeScreen(st, me) + nextExperienceCard(st, me) + bonusCardFor(st, me) + phasePath(st);
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
          ${joinedHere(st) ? `<p class="hint-note" style="margin:0">You’re in as <strong>${esc(who(me))}</strong>.</p>` : `
          <form class="row" data-form="join">
            <label class="sr-only" for="join-code">Class code</label>
            <input id="join-code" class="input" style="width:150px" placeholder="Class code" autocomplete="off" autocapitalize="characters" value="${new URLSearchParams(location.search).get('session') ? esc(sessionCode()) : ''}">
            <label class="sr-only" for="join-nick">Nickname</label>
            <input id="join-nick" class="input" style="width:170px" placeholder="Nickname" maxlength="16" autocomplete="off">
            <button class="btn btn-primary" type="submit">Join the quest ✦</button>
          </form>`}
          ${joinedHere(st) ? `<button class="btn btn-ghost btn-sm" data-a="leave-class">Join a different class</button>` : `<p class="hint-note" style="margin-top:10px">Your teacher shows the class code and a join QR on their screen — scanning the QR fills the code in for you. Use a nickname, not your real name; you’ll be placed in a home team and an expert track automatically.</p>
          ${joinedList().length ? `<div class="stack" style="gap:6px;margin-top:12px"><span class="eyebrow">Your quests on this device</span>${joinedList().map((j) => `<a class="btn btn-secondary btn-sm" style="justify-content:flex-start" href="?session=${encodeURIComponent(j.code)}#student">${esc(j.title)} · <span class="mono">${esc(j.code)}</span>${j.nick ? ' · ' + esc(j.nick) : ''}</a>`).join('')}</div>` : ''}`}
        </div>
        <div class="hero-art">${Art.arch()}${Art.sticker('A clue awaits!', '🔍')}</div>
      </div>
      <div class="card">
        <div class="spread"><h3>Waiting in the lobby</h3>${statusChip(st.quest.status === 'PUBLISHED' ? 'AVAILABLE' : 'LOCKED')}</div>
        <p>${st.quest.status === 'PUBLISHED'
          ? 'You’re in! Your educator will start the briefing soon.'
          : 'Your educator hasn’t opened this quest yet. Hang tight.'}</p>
        ${joinedHere(st) ? `<p class="hint-note">You are ${esc(who(me))} in home team ${me.home}, expert track ${me.topic} · ${esc(SEED.topicMeta[me.topic].name)}.</p>` : ''}
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
        <div class="hero-art">${Art.arch({ door: '#20BDA9', face: '#F6C5CF' })}${Art.sticker('Team ' + me.home, '🧭')}</div>
      </div>
      <div class="card wash-lavender">
        <div class="eyebrow">You are a…</div>
        <div class="spread">
          <div><h3>${esc(m.name)}</h3><p style="margin:0">${esc(m.narrative)} Your team needs what only you will discover in ${esc(m.gallery)}.</p></div>
          ${topicChip(me.topic)}
        </div>
      </div>
      <div class="card"><p style="margin:0" class="hint-note">${Art.icon('help', 16)} This story is fiction, created for learning — it is not an official programme of the venue. Your educator starts the expert phase when every team is ready.</p></div>`;
  }

  function missionScreen(st, me) {
    const m = sel.mission(me.topic);
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
        <p class="hint-note">Observe in person with your group. Never touch or place anything on objects or exhibits.</p>` : ''}
      ${tab === 'discuss' ? `
        <div class="card wash-lavender"><h4>${Art.icon('voices', 18)} Talk it through</h4><p style="margin:0">${esc(m.discuss)}</p></div>
        ${m.needsFacilitator ? `<div class="card"><div class="eyebrow coral">Today’s question from the community partner</div><p style="margin:0"><strong>${esc([...SEED.contributor.prompts, ...(st.contributor.extraPrompts || [])][st.contributor.interactionPrompt || 0])}</strong></p></div>` : ''}
        ${m.needsFacilitator ? `
          <div class="card ${st.interactions[me.id] ? 'wash-mint' : 'wash-peach'}">
            <div class="spread"><h4 style="margin:0">${Art.icon('handshake', 18)} Arranged contributor conversation</h4>
            ${st.interactions[me.id] ? statusChip('VERIFIED') : statusChip('SUBMITTED')}</div>
            <p style="margin:8px 0 0">${st.interactions[me.id]
              ? 'Your conversation with the approved contributor is verified — record their perspective in step 3.'
              : `Meet the approved community partner (<em>${esc(st.quest.partner.name)}</em>). They confirm it from their own device.`}</p>
          </div>` : ''}` : ''}
      ${tab === 'record' ? (st.checkins[me.id] || (m.assess && m.assess.checkin === 'none') ? recordForm(st, me, m, ev) : checkinCard(st, me, m, true)) : ''}`;
  }

  function checkinCard(st, me, m, locked) {
    const a = m.assess || SEED.defaultAssess();
    if (a.checkin === 'none') return '';
    const c = st.checkins[me.id];
    const via = { QR: 'QR clue card', CODE: 'facilitator code', PHOTO_AI: 'photo checked by AI', PHOTO_TEACHER: 'photo approved by your teacher', SIMULATED: 'simulated' };
    if (c) return `<div class="card wash-mint" style="padding:12px 16px"><strong>${Art.icon('check', 16)} Checked in at ${esc(m.gallery)}</strong> <small>${via[c.via] || ''}</small></div>`;
    if (a.checkin === 'qr') return `<div class="card checkin-card">
      <h4 style="margin:0 0 6px">${Art.icon('map', 18)} ${locked ? 'Field notes unlock at your station' : 'Find your station'}</h4>
      <p style="margin:0 0 10px">Go to <strong>${esc(m.gallery)}</strong> and scan the <strong>${esc(m.name)}</strong> clue card.</p>
      <button class="btn btn-primary" data-a="scan-station">${Art.icon('eye', 17)} Scan clue card</button></div>`;
    const pending = st.checkinPhotos[me.id];
    return `<div class="card checkin-card">
      <h4 style="margin:0 0 6px">${Art.icon('eye', 18)} ${locked ? 'Field notes unlock when you find the object' : 'Find the object'}</h4>
      <p style="margin:0 0 10px">Go to <strong>${esc(m.gallery)}</strong>, find <strong>${esc(SEED.keyObjectOf(me.topic))}</strong> and take a photo of it — the object only, no people.</p>
      ${pending ? `<img class="ev-photo" src="${pending.photo}" alt="Your check-in photo"><p class="hint-note" style="margin:0">${Art.icon('clock', 14)} Waiting for your teacher to confirm.${pending.reason ? ' ' + esc(pending.reason) : ''}</p>`
        : st.ui.photoCheck === me.id ? `<p class="hint-note" style="margin:0">${Art.icon('sparkle', 14)} Checking your photo…</p>`
        : `<label class="btn btn-primary" for="ci-photo">${Art.icon('eye', 17)} Photograph the object</label><input id="ci-photo" type="file" accept="image/*" capture="environment" hidden>
           <p class="hint-note" style="margin:8px 0 0">${a.checkin === 'photo_ai' ? 'An AI checks it matches the object; if it’s unsure, your teacher decides. The photo isn’t kept after the check.' : 'Your teacher confirms the photo.'}</p>`}
    </div>`;
  }


  function recordForm(st, me, m, ev) {
    if (ev.status === 'SUBMITTED') {
      return `<div class="card"><div class="spread"><h3>Evidence submitted</h3>${statusChip('SUBMITTED')}</div>
        <p style="margin:0">${m.assess && m.assess.verify === 'partner' ? 'The community partner is reviewing your evidence.' : 'Your educator is reviewing your evidence.'} Look up and keep exploring with your group — you’ll feel a tap when it’s verified.</p></div>`;
    }
    const hintsOpen = st.ui.hintsOpen;
    return `
      <form class="card" data-form="evidence">
        <h3>Your field notes</h3>
        <p class="hint-note" style="margin:0 0 10px">${esc(SEED.ASSESS_TEXT.evidence[(m.assess || {}).evidence || 'notes'])}${(m.assess || {}).quiz && m.assess.quiz.length ? ` · quick check (${m.assess.pass}/${m.assess.quiz.length} to pass)` : ''} · ${esc(SEED.ASSESS_TEXT.verify[(m.assess || {}).verify || 'teacher'])}</p>
        ${(m.assess || {}).evidence === 'photo' ? '' : m.evidenceFields.map((f) => `
          <div class="fld-group">
            <label class="fld" for="f-${f.key}">${esc(f.label)}</label>
            <textarea class="input" id="f-${f.key}" name="${f.key}" rows="2" placeholder="${esc(f.placeholder)}">${esc(ev.answers?.[f.key] || st.ui.drafts?.[me.id]?.[f.key] || '')}</textarea>
          </div>`).join('')}
        ${(m.assess || {}).evidence && m.assess.evidence !== 'notes' ? `<div class="fld-group"><span class="fld">Photo of the object or a detail (never people)</span>
          ${st.ui.drafts?.[me.id]?.photo ? `<img class="ev-photo" src="${st.ui.drafts[me.id].photo}" alt="Your photo of the object">` : ''}
          <label class="btn btn-secondary btn-sm" for="ev-photo-in" style="align-self:flex-start">${Art.icon('eye', 16)} ${st.ui.drafts?.[me.id]?.photo ? 'Retake photo' : 'Take photo'}</label>
          <input id="ev-photo-in" type="file" accept="image/*" capture="environment" hidden></div>` : ''}
        ${(m.assess || {}).quiz && m.assess.quiz.length ? `<div class="fld-group"><span class="fld">Quick check</span>${m.assess.quiz.map((q, i) => `<fieldset class="quiz-q"><legend>${i + 1}. ${esc(q.q)}</legend>
          ${q.o.map((o, k) => `<label class="quiz-o"><input type="radio" name="quiz${i}" value="${k}" ${String(st.ui.drafts?.[me.id]?.['quiz' + i]) === String(k) ? 'checked' : ''}> ${esc(o)}</label>`).join('')}</fieldset>`).join('')}</div>` : ''}
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
          <select class="input" id="checker" name="checker">${mates.map((p) => `<option value="${p.id}">${esc(who(p))}</option>`).join('')}</select>
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
          <p>“${esc(SEED.finale.title)}” needs every perspective in team ${home} verified <em>and</em> taught:</p>
          <div class="stack" style="gap:8px">
            ${reasons.map((r) => `<div class="row">${topicChip(r.topic)}<span class="hint-note">${r.kind === 'evidence' ? 'evidence not yet verified by the educator' : 'not yet taught to the team'}</span></div>`).join('')}
          </div>
          <p class="hint-note" style="margin-top:12px">No shortcuts — the lock is enforced by the game engine, not the screen.</p>
        </div>`;
    }
    if (f.status === 'SUBMITTED') {
      return `<div class="card"><div class="spread"><h2>Introduction submitted</h2>${statusChip('SUBMITTED')}</div>
        <p style="margin:0">Your educator is reviewing team ${home}’s answer against the rubric: ${SEED.finale.rubric.join(' · ')}.</p></div>`;
    }
    if (f.status === 'APPROVED') {
      return `<div class="card wash-mint burst"><div class="spread"><h2>Main quest complete! ✦</h2>${statusChip('APPROVED')}</div>
        <p style="margin:0">Your educator approved team ${home}’s answer. Careful, evidence-based work.</p></div>`;
    }
    const fin = SEED.finale;
    const picked = st.ui.pickedObject;
    return `
      ${f.status === 'NEEDS_REVISION' ? `<div class="card wash-peach"><strong>${Art.icon('alert', 17)} Educator’s note:</strong> ${esc(f.note)}</div>` : ''}
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
    const b = st.bonus[card.id], claimed = !!st.claims[card.id];
    if (card.hidden && !claimed) return '';
    const rule = card.kind === 'track' ? `Your team’s ${esc(SEED.missions[card.track].name || 'Track ' + card.track)} expert is verified` : esc(SEED.EARN_TEXT[card.kind] || '');
    return `
      <div class="card" style="background:var(--grad-collect)">
        <div class="spread"><div class="eyebrow sun">Team collectible · optional</div>${claimed ? statusChip('CLAIMED') : card.kind === 'bonus' ? statusChip(b.status) : '<span class="pill plain">not yet</span>'}</div>
        <div class="grid-2" style="grid-template-columns: 110px 1fr; gap:16px">
          <div class="collect-card ${claimed ? 'claimed' : 'locked'}" style="max-width:110px;cursor:default">${claimed ? Art.collectibleArt[card.id]() : Art.lockedArt()}</div>
          <div>
            <h3>${esc(card.title)}${st.evolved[card.id] ? ' <span class="pill sun">Level 2</span>' : ''}</h3>
            ${claimed ? `<p style="margin:0"><strong>Earned for the class album!</strong> ${esc(card.fact)}</p>`
              : card.kind !== 'bonus' ? `<p class="hint-note" style="margin:0">Earned when: ${rule}.</p>`
              : b.status === 'SUBMITTED' ? `<p style="margin:0">Submitted — awaiting educator approval.</p>`
              : `<p class="hint-note">${esc(card.activity)} This never blocks the main quest.</p><form data-form="bonus" data-card="${card.id}">
                  <label class="fld" for="bonus-a">${esc(card.promptLabel || 'Your team’s discovery')}</label>
                  <textarea class="input" id="bonus-a" name="answer" rows="2"></textarea>
                  <div style="margin-top:10px"><button class="btn btn-sun btn-sm" type="submit">${Art.icon('sparkle', 16)} Submit discovery</button></div>
                </form>`}
            ${claimed && card.evolves && !st.evolved[card.id] && st.quest.next && st.quest.next.enabled ? `<p class="hint-note" style="margin:6px 0 0">Levels up when your team checks in at the next experience.</p>` : ''}
          </div>
        </div>
      </div>`;
  }

  function nextExperienceCard(st, me) {
    const n = st.quest.next, ex = st.experience;
    if (!n || !n.enabled || !n.activity) return '';
    const here = !!ex.checkins[me.id];
    return `<div class="card next-exp">
      <div class="spread"><div class="eyebrow teal">Next real experience</div><span class="pill ${ex.unlocked ? 'mint' : 'plain'}">${here ? 'checked in' : ex.unlocked ? 'unlocked' : 'locked'}</span></div>
      <h3 style="margin:4px 0">${esc(n.activity)}</h3>
      <p class="hint-note" style="margin:0">${esc(n.provider)}${n.when ? ' · ' + esc(n.when) : ''}${n.bring ? ' · bring: ' + esc(n.bring) : ''}</p>
      ${here ? `<p style="margin:8px 0 0">${Art.icon('check', 15)} You’re checked in. Phones away — enjoy it.</p>`
        : ex.unlocked ? `<button class="btn btn-primary btn-sm" data-a="next-checkin" style="margin-top:8px">${Art.icon('eye', 15)} Check in at the door</button>`
        : `<p class="hint-note" style="margin:8px 0 0">${n.unlock === 'all' ? 'Unlocks when every home team finishes the quest.' : 'Your teacher unlocks it.'}</p>`}
    </div>`;
  }


  function reflectionScreen(st, me) {
    const done = st.reflections[me.id];
    const f = st.finale[me.home];
    return `
      ${f.status === 'APPROVED' ? `<div class="card wash-mint"><div class="spread"><h2>Quest complete ✦</h2>${statusChip('APPROVED')}</div><p style="margin:0">Team ${me.home} completed the finale.</p></div>` : ''}
      ${st.partnerFeedback[me.home] ? `<div class="card wash-peach"><div class="eyebrow coral">From the community partner</div><p style="margin:0">“${esc(st.partnerFeedback[me.home].text)}”</p></div>` : ''}
      ${done ? `<div class="card"><h3>Reflection saved</h3><p style="margin:0">Thanks, ${esc(who(me))} — now look up and join the class discussion!</p></div>`
      : `<form class="card" data-form="reflection">
          <div class="eyebrow">Two-minute reflection</div>
          <h3>Before you go…</h3>
          ${SEED.reflection.map((q, i) => `<div class="fld-group"><label class="fld" for="refl-${i}">${esc(q)}</label><textarea id="refl-${i}" class="input" name="r${i}" rows="2">${esc(st.ui.drafts?.[me.id]?.['r' + i] || '')}</textarea></div>`).join('')}
          <button class="btn btn-primary" type="submit">${Art.icon('check', 17)} Save my reflection</button>
        </form>`}`;
  }

  function completeScreen(st, me) {
    return `
      <div class="hero">
        <div>
          <div class="eyebrow sun">${esc(SEED.title)} · complete</div>
          <h1>Guardians of <span class="accent">stories.</span></h1>
          <p class="lede">Four perspectives, five teams, one shared answer. The best part wasn’t on this screen — it was the looking, the listening and the teaching.</p>
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
            <span class="card-strip"><strong>${claimed ? esc(c.title) : c.hidden ? 'Hidden card' : 'Mystery card'}${st.evolved[c.id] ? ' · Lv 2' : ''}</strong><small>${claimed ? esc(c.category) + ' · team ' + c.home : 'Team ' + c.home + (viewer === 'teacher' ? ' · ' + esc(SEED.EARN_TEXT[c.kind] || '') : ' · not discovered')}</small></span>
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
      ${viewer === 'teacher' && SEED.collectibles.some((c) => c.kind === 'teacher' && !st.claims[c.id]) ? `<div class="row">${SEED.collectibles.filter((c) => c.kind === 'teacher' && !st.claims[c.id]).map((c) => `<button class="btn btn-sun btn-sm" data-a="award-card" data-card="${c.id}">${Art.icon('sparkle', 15)} Award “${esc(c.title)}” to team ${c.home}</button>`).join('')}</div>` : ''}
      ${viewer === 'student' ? `<p class="hint-note">Each home team can earn one card. Cards never gate the main quest.</p>` : ''}`;
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
        ${screen === 'builder' ? teacherBuilder(st)
          : screen === 'teams' ? teacherTeams(st)
          : screen === 'live' ? teacherLive(st)
          : screen === 'album' ? `<div class="stage-wrap stack">${albumScreen(st, 'teacher')}</div>`
          : screen === 'report' ? teacherReport(st)
          : screen === 'next' ? teacherNext(st)
          : teacherDashboard(st)}
      </div>`;
  }

  function teacherDashboard(st) {
    const pend = sel.pendingEvidence().length + sel.pendingFinales().length + sel.pendingBonus().length;
    const quests = Object.entries(st.library).map(([id, r]) => ({ id, q: id === st.activeQuest ? st.quest : r.quest, active: id === st.activeQuest }))
      .sort((x, y) => (y.active - x.active) || String(y.id).localeCompare(String(x.id)));
    const live = st.phase !== 'LOBBY';
    const code = typeof Sync !== 'undefined' ? Sync.state.session : 'FITZ-DEMO';
    return `
      <div class="stack">
        <div class="spread"><div><div class="eyebrow">Educator studio · class code <span class="mono">${esc(code)}</span></div><h2 style="margin:4px 0 0">My quests</h2></div>
          <button class="btn btn-primary" data-a="new-quest" ${live ? 'disabled title="End the live session first"' : ''}>${Art.icon('plus', 16)} New quest</button></div>
        ${st.ui.newQuest && !live ? `<div class="card new-quest">
          <div class="spread"><h3 style="margin:0">Start a new quest</h3><button class="btn btn-ghost btn-sm" data-a="new-quest-x">Cancel</button></div>
          <label class="fld" for="nq-title">Working title (optional)</label><input class="input" id="nq-title" placeholder="e.g. Pollinator Patrol at the community garden">
          <div class="grid-3" style="margin-top:10px">
            <button class="card choice-card" data-a="create-quest" data-tpl="blank">${Art.icon('pencil', 20)}<strong>Blank quest</strong><small>Write every part yourself, or ask the AI as you go.</small></button>
            <button class="card choice-card" data-a="create-quest" data-tpl="ai">${Art.icon('sparkle', 20)}<strong>Generate with AI</strong><small>Add your sources, then the assistant drafts all four tracks, the finale and collectibles for you to review.</small></button>
            <button class="card choice-card" data-a="create-quest" data-tpl="lost_museum">${Art.icon('book', 20)}<strong>Example: The Lost Museum</strong><small>A complete Fitzwilliam quest to adapt.</small></button>
          </div></div>` : ''}
        <div class="grid-3">
          ${quests.map(({ id, q, active }) => `<div class="card quest-card ${active ? 'is-active' : ''}">
            <div class="spread"><span class="pill ${q.status === 'PUBLISHED' ? 'mint' : 'plain'}">${q.status === 'PUBLISHED' ? 'Published' : 'Draft'}</span>${active ? '<span class="pill lavender">This class</span>' : ''}</div>
            <h3 style="margin:8px 0 2px">${esc(q.title || 'Untitled quest')}</h3>
            <p class="hint-note" style="margin:0 0 10px">${esc(q.venue || 'No venue yet')} · ${q.duration || 60} min · ${q.templateId === 'blank' ? 'written from scratch' : 'from an example'}</p>
            <div class="row" style="margin-top:auto">${active
              ? `<button class="btn btn-secondary btn-sm" data-a="screen" data-screen="builder">${Art.icon('pencil', 15)} Open in builder</button>${q.status === 'PUBLISHED' ? `<button class="btn btn-ghost btn-sm" data-a="screen" data-screen="live">${Art.icon('eye', 15)} Live session</button>` : ''}`
              : `<button class="btn btn-secondary btn-sm" data-a="open-quest" data-id="${id}" ${live ? 'disabled' : ''}>Use with this class</button><button class="btn btn-ghost btn-sm" data-a="del-quest" data-id="${id}">Delete</button>`}</div>
          </div>`).join('')}
        </div>
        ${live ? `<p class="hint-note" style="margin:0">A live session is running. Return it to the lobby (Live session → Back) before switching quests.</p>` : ''}
        <div class="grid-3">
          <div class="card wash-mint"><div class="eyebrow teal">Students joined</div><h2 style="font-size:40px">${Object.keys(st.seats).length}<small style="font-size:20px">/20</small></h2><p style="margin:0">with class code <span class="mono">${esc(code)}</span></p></div>
          <div class="card wash-peach"><div class="eyebrow coral">Pending reviews</div><h2 style="font-size:40px">${String(pend).padStart(2, '0')}</h2><p style="margin:0">${pend ? 'Evidence, finales or discoveries waiting in the live room.' : 'Nothing waiting — all clear.'}</p></div>
          <form class="card" data-form="partner">
            <div class="spread"><div class="eyebrow">Community partner for this quest</div>${statusChip(st.contributor.status)}</div>
            <label class="fld" for="pt-name">Name</label><input class="input" id="pt-name" value="${esc(st.quest.partner.name)}">
            <label class="fld" for="pt-org">Organisation</label><input class="input" id="pt-org" value="${esc(st.quest.partner.org)}">
            <button class="btn btn-secondary btn-sm" type="submit" style="margin-top:8px">Save partner</button>
          </form>
        </div>
      </div>`;
  }


  function teacherBuilder(st) {
    const q = st.quest, locked = q.status === 'PUBLISHED', dis = locked ? 'disabled' : '';
    const n = q.next || {};
    return `
      <div class="spread" style="margin-bottom:12px"><div><div class="eyebrow">Quest builder</div><h2 style="margin:2px 0 0">${esc(q.title || 'Untitled quest')}</h2></div>
        <button class="btn btn-ghost btn-sm" data-a="screen" data-screen="dashboard">${Art.icon('back', 15)} All quests</button></div>
      <div class="builder-2col">
        <div class="stack builder-left">
          <div class="card">
            <h3 style="margin:0 0 6px">Quest settings</h3>
            <div class="fld-group"><label class="fld" for="q-title">Quest title</label><input class="input" id="q-title" data-q="title" value="${esc(q.title)}" ${dis}></div>
            <div class="fld-group"><label class="fld" for="q-obj">Learning objective</label><input class="input" id="q-obj" data-q="objective" value="${esc(q.objective)}" ${dis}></div>
            <div class="fld-group"><label class="fld" for="q-venue">Where will they explore?</label><input class="input" id="q-venue" data-q="venue" value="${esc(q.venue)}" ${dis}></div>
            <div class="grid-2" style="gap:12px">
              <div class="fld-group"><label class="fld" for="q-dur">Session length</label>
                <select class="input" id="q-dur" data-q="duration" ${dis}>${[45, 60, 75].map((m) => `<option value="${m}" ${q.duration === m ? 'selected' : ''}>${m} minutes</option>`).join('')}</select></div>
              <div class="fld-group"><label class="fld" for="q-size">Class size</label>
                <select class="input" id="q-size" data-q="classSize" ${dis}><option value="20" selected>20 students</option></select>
                <small class="hint-note">5 home teams × 4 experts</small></div>
            </div>
          </div>
          ${Assistant.chat()}
        </div>
        <div class="stack builder-right">
          ${Assistant.board()}
          <section class="card" id="sec-next"><div class="spread"><h3 style="margin:0">${Art.icon('arrow', 18)} Next real experience</h3>${n.enabled ? `<span class="pill ${n.status === 'accepted' ? 'mint' : 'peach'}">${n.status === 'accepted' ? 'booked' : n.status === 'none' ? 'not requested' : 'awaiting provider'}</span>` : '<span class="pill plain">off</span>'}</div>
            <p class="hint-note" style="margin:6px 0 10px">${n.enabled ? `${esc(n.activity)} · ${esc(n.provider)}${n.when ? ' · ' + esc(n.when) : ''}. Unlocks ${n.unlock === 'all' ? 'when every team finishes' : 'when you unlock it'}.` : 'After the quest, students apply what they learned with a real-world partner, e.g. a drawing class or a workshop.'}</p>
            <button class="btn btn-secondary btn-sm" data-a="screen" data-screen="next">${n.enabled ? 'Manage booking' : 'Set one up'}</button></section>
          <section class="card" id="sec-publish">
            <div class="spread"><h3 style="margin:0">Publish</h3>${statusChip(locked ? 'APPROVED' : 'PENDING')}</div>
            <ul style="margin:10px 0 12px;padding-left:20px">
              <li>Quest content complete: <strong>${SEED.contentProblems(st.content).length ? SEED.contentProblems(st.content).length + ' to do' : 'yes'}</strong></li>
              <li>Tracks approved by you: <strong>${SEED.topics.filter((t) => st.tracks[t] === 'APPROVED').length}/4</strong></li>
              <li>Community partner approved their contribution: <strong>${st.contributor.status === 'APPROVED' ? 'yes' : 'not yet'}</strong></li>
              <li><label><input type="checkbox" data-a="safety" ${q.safety ? 'checked' : ''} ${dis}> Safety, supervision and venue booking confirmed by me</label></li>
            </ul>
            <button class="btn btn-teal" data-a="publish" ${dis}>${locked ? 'Published ✓' : 'Publish to students'}</button>
          </section>
        </div>
      </div>`;
  }

  /* ---------------- next real experience (educator) ---------------- */
  function teacherNext(st) {
    const n = { ...st.quest.next }, ex = st.experience, locked = st.quest.status === 'PUBLISHED';
    const stage = n.status === 'accepted' ? 3 : n.status === 'none' ? 1 : 2;
    const draft = st.ui.bookingDraft != null ? st.ui.bookingDraft : n.request;
    const checked = Object.keys(ex.checkins);
    const code = 'WQ-NEXT-' + String(st.activeQuest).toUpperCase();
    return `
      <div class="spread" style="margin-bottom:12px"><div><div class="eyebrow">${esc(st.quest.title)}</div><h2 style="margin:2px 0 0">Next real experience</h2></div>
        <label class="toggle"><input type="checkbox" data-a="next-enable" ${n.enabled ? 'checked' : ''}> Include one</label></div>
      <p class="hint-note" style="margin:-4px 0 14px">The quest is the bridge, not the destination: after it, the class applies what they learned with a real partner. Each team’s collectible levels up when they check in.</p>
      ${!n.enabled ? '' : `
      <div class="grid-2">
        <form class="card stack" data-form="next" style="gap:6px">
          <h3 style="margin:0">The experience</h3>
          <label class="fld" for="nx-act">Activity</label><input class="input" id="nx-act" value="${esc(n.activity)}" placeholder="e.g. Still-life drawing class">
          <div class="grid-2" style="gap:8px"><div><label class="fld" for="nx-prov">Provider</label><input class="input" id="nx-prov" value="${esc(n.provider)}"></div>
            <div><label class="fld" for="nx-org">Organisation</label><input class="input" id="nx-org" value="${esc(n.org)}"></div></div>
          <label class="fld" for="nx-when">When</label><input class="input" id="nx-when" value="${esc(n.when)}">
          <label class="fld" for="nx-bring">Students bring</label><input class="input" id="nx-bring" value="${esc(n.bring)}">
          <label class="fld" for="nx-fb">If the provider cancels</label><input class="input" id="nx-fb" value="${esc(n.fallback)}">
          <label class="fld" for="nx-unlock">Unlocks</label><select class="input" id="nx-unlock"><option value="all" ${n.unlock === 'all' ? 'selected' : ''}>When every home team has finished the quest</option><option value="manual" ${n.unlock === 'manual' ? 'selected' : ''}>When I unlock it</option></select>
          <button class="btn btn-secondary btn-sm" type="submit" style="align-self:flex-start;margin-top:6px">Save</button>
        </form>
        <div class="stack">
          <div class="card stack" style="gap:8px">
            <div class="spread"><h3 style="margin:0">Booking</h3><div class="pipe">${['Request', 'Provider replies', 'Booked'].map((t, i) => `<span class="pipe-s ${i + 1 < stage || n.status === 'accepted' ? 'done' : i + 1 === stage ? 'on' : ''}"><b>${i + 1}</b>${t}</span>`).join('<i></i>')}</div></div>
            ${n.status === 'none' ? `
              <button class="as-chip" type="button" data-a="draft-booking" style="align-self:flex-start">${Art.icon('sparkle', 14)} Draft the request</button>
              <label class="fld" for="nx-req">Message to ${esc(n.provider || 'the provider')}</label><textarea class="input" id="nx-req" rows="7">${esc(draft)}</textarea>
              <button class="btn btn-primary btn-sm" data-a="send-booking" style="align-self:flex-start">${Art.icon('arrow', 15)} Send request</button>`
              : `<div class="mail">${esc(n.request)}</div>`}
            ${n.status === 'counter' ? `<div class="hint-note">${esc(n.provider)} suggests <strong>${esc(n.counterWhen)}</strong>.</div><button class="btn btn-primary btn-sm" data-a="accept-counter" style="align-self:flex-start">Accept new date</button>` : ''}
            <p class="hint-note" style="margin:0">Emails and payment happen outside WorldQuest; only you can confirm the booking here.</p>
          </div>
          <div class="card stack" style="gap:8px;background:var(--paper)">
            <div class="spread"><h3 style="margin:0">Provider’s view</h3><span class="pill plain">simulated</span></div>
            ${n.status === 'none' ? '<p class="hint-note" style="margin:0">Nothing sent yet.</p>'
              : n.status === 'sent' ? `<div class="mail">${esc(n.request)}</div><div class="row"><button class="btn btn-teal btn-sm" data-a="provider-accept">${Art.icon('check', 15)} Accept</button><button class="btn btn-ghost btn-sm" data-a="provider-counter">Suggest another date</button></div>`
              : `<p class="hint-note" style="margin:0">${n.status === 'accepted' ? 'Accepted — booking confirmed.' : 'Waiting for the teacher.'}</p>`}
          </div>
        </div>
      </div>
      <div class="grid-2" style="margin-top:16px">
        <div class="card stack" style="gap:8px">
          <div class="spread"><h3 style="margin:0">On the day</h3><span class="pill ${ex.unlocked ? 'mint' : 'plain'}">${ex.unlocked ? 'unlocked' : 'locked'}</span></div>
          <p class="hint-note" style="margin:0">${ex.unlocked ? (ex.reason ? 'Unlocked early: “' + esc(ex.reason) + '”.' : 'Unlocked for the class.') : n.unlock === 'all' ? `Unlocks automatically when every home team’s finale is approved (${SEED.homeGroups.filter((h) => st.finale[h].status === 'APPROVED').length}/5 so far).` : 'You unlock it when you’re ready.'}</p>
          ${!ex.unlocked && n.status === 'accepted' ? `<div class="row"><input class="input" id="nx-reason" placeholder="${n.unlock === 'all' ? 'Reason to unlock early' : 'Note (optional)'}" style="flex:1;min-width:160px"><button class="btn btn-primary btn-sm" data-a="unlock-next">Unlock now</button></div>` : ''}
          ${n.status !== 'accepted' ? '<p class="hint-note" style="margin:0">Confirm the booking first.</p>' : ''}
          <p style="margin:0"><strong>${checked.length}</strong> checked in${checked.length ? ': ' + checked.map((id) => esc(who(SEED.byId[id]))).join(', ') : ''}</p>
        </div>
        <div class="card stack" style="gap:8px;align-items:flex-start">
          <h3 style="margin:0">Door check-in code</h3>
          <p class="hint-note" style="margin:0">Print it for the provider’s door. Students scan it on arrival; their team’s collectible levels up.</p>
          <div class="qr-box" data-qrtext="${code}"></div><span class="mono">${code}</span>
        </div>
      </div>`}`;
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
        ${SEED.homeGroups.map((h) => { const p = SEED.expertOf(h, t); return `<td class="${cls[t]}">${esc(who(p).replace('Explorer ', 'Ex '))}${evShort(st, p)}</td>`; }).join('')}</tr>`).join('')}</tbody></table>`;
  }

  function expertMatrix(st) {
    const cls = { A: 'v', B: 't', C: 's', D: 'c' };
    return `<table><thead><tr>${SEED.topics.map((t) => `<th scope="col">${t} · ${esc(SEED.topicMeta[t].name)}</th>`).join('')}</tr></thead>
      <tbody><tr>${SEED.topics.map((t) => `<td class="${cls[t]}" style="vertical-align:top">${SEED.participants.filter((p) => p.topic === t).map((p) => `<div>${esc(who(p).replace('Explorer ', 'Ex '))} <small>(${p.home})</small>${evShort(st, p)}</div>`).join('')}</td>`).join('')}</tr></tbody></table>`;
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
            <button class="btn btn-secondary btn-sm" data-a="show-code">${Art.icon('team', 15)} Show class code</button>
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

        ${st.quest.next && st.quest.next.enabled ? `<div class="card"><div class="spread"><h3>${Art.icon('arrow', 18)} Next experience: ${esc(st.quest.next.activity)}</h3><span class="pill ${st.experience.unlocked ? 'mint' : 'plain'}">${st.experience.unlocked ? Object.keys(st.experience.checkins).length + ' checked in' : 'locked'}</span></div>
          <p class="hint-note" style="margin:4px 0 0">${st.experience.unlocked ? 'Students check in by scanning the door code; you can also check someone in.' : 'Unlocks ' + (st.quest.next.unlock === 'all' ? 'when every team’s finale is approved' : 'when you unlock it') + '.'} <button class="btn btn-ghost btn-sm" data-a="screen" data-screen="next">Manage</button></p>
          ${st.experience.unlocked ? `<div class="row" style="margin-top:6px">${Object.keys(st.seats).filter((id) => !st.experience.checkins[id]).map((id) => `<button class="btn btn-secondary btn-sm" data-a="teacher-checkin" data-pid="${id}">Check in ${esc(who(SEED.byId[id]))}</button>`).join('')}</div>` : ''}</div>` : ''}
        ${Object.keys(st.checkinPhotos).length ? `<div class="card"><div class="spread"><h3>${Art.icon('eye', 18)} Check-in photos</h3><span class="pill lavender">${Object.keys(st.checkinPhotos).length} to confirm</span></div>
          <div class="grid-3">${Object.entries(st.checkinPhotos).map(([pid, c]) => { const p = SEED.byId[pid]; return `<div class="queue-row" style="display:block"><strong>${esc(who(p))}</strong> · ${esc(SEED.missions[p.topic].name)}
            <p class="hint-note" style="margin:2px 0">Should show: ${esc(SEED.keyObjectOf(p.topic))}</p><img class="ev-photo" src="${c.photo}" alt="Check-in photo from ${esc(who(p))}">${c.reason ? `<p class="hint-note" style="margin:0">AI: ${esc(c.reason)}</p>` : ''}
            <div class="row" style="margin-top:6px"><button class="btn btn-teal btn-sm" data-a="ok-checkin" data-pid="${pid}">${Art.icon('check', 15)} That’s it</button><button class="btn btn-danger-ghost btn-sm" data-a="no-checkin" data-pid="${pid}">Retake</button></div></div>`; }).join('')}</div></div>` : ''}
        ${st.help.some((h) => h.open) ? `<div class="card"><div class="spread"><h3>${Art.icon('alert', 18)} Help requests</h3><span class="pill peach">${st.help.filter((h) => h.open).length} open</span></div>
          <div class="stack" style="gap:8px">${st.help.filter((h) => h.open).map((h) => { const p = SEED.byId[h.pid]; return `<div class="help-row"><span><strong>${esc(who(p))}</strong> · Home ${p.home} · ${esc(SEED.missions[p.topic].gallery)}</span><button class="btn btn-teal btn-sm" data-a="resolve-help" data-id="${h.id}">${Art.icon('check', 15)} I’m with them</button></div>`; }).join('')}</div></div>` : ''}
        <div class="grid-2">
          <div class="card">
            <div class="spread"><h3>${Art.icon('clock', 18)} Evidence queue</h3><span class="pill lavender">${evQ.length} waiting</span></div>
            ${evQ.length === 0 ? `<p class="hint-note" style="margin:0">No submissions waiting. Students submit during the expert phase.</p>` : ''}
            <div class="stack" style="gap:10px">
              ${evQ.map((p) => {
                const m = SEED.missions[p.topic];
                const ev = st.evidence[p.id];
                return `<div class="queue-row"><div class="meta">
                  <div class="row">${topicChip(p.topic)}<strong>${esc(who(p))}</strong><small>${esc(m.gallery)}</small></div>
                  ${ev.photo ? `<img class="ev-photo" src="${ev.photo}" alt="Photo submitted by ${esc(who(p))}">` : ''}
                  ${ev.quiz ? `<p class="hint-note" style="margin:4px 0">Quick check: ${ev.quiz.score}/${ev.quiz.total}</p>` : ''}
                  ${m.assess && m.assess.evidence === 'photo' ? '' : `<dl class="evidence-quote">${m.evidenceFields.map((f) => `<dt>${esc(f.label)}</dt><dd>${esc(ev.answers[f.key])}</dd>`).join('')}</dl>`}</div>
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
        <div class="card"><h3>By home team</h3><div class="matrix"><table><thead><tr><th scope="col">Team</th><th scope="col">Evidence verified</th><th scope="col">Perspectives taught</th><th scope="col">Finale</th><th scope="col">Partner feedback</th></tr></thead><tbody>
          ${SEED.homeGroups.map((h) => { const mem = SEED.homeMembers(h); return `<tr><th scope="row">${h}</th><td>${mem.filter((p) => st.evidence[p.id].status === 'VERIFIED').length}/4</td><td>${SEED.topics.filter((t) => st.peerTeach[h][t].shared).length}/4</td><td>${statusChip(st.finale[h].status)}</td><td>${st.partnerFeedback[h] ? '✓' : '—'}</td></tr>`; }).join('')}
          </tbody></table></div></div>
        <div class="card"><h3>What students explained (live, not simulated)</h3>
          ${(() => { const live = verified.filter((p) => !st.evidence[p.id].simulated); return live.length === 0 ? '<p class="hint-note" style="margin:0">Verified evidence from real students appears here, with their own words.</p>'
            : live.map((p) => { const m = SEED.missions[p.topic], a = st.evidence[p.id].answers || {}; return `<div class="evidence-quote" style="margin-bottom:8px"><strong>${esc(who(p))}</strong> · ${topicChip(p.topic)}<br>${m.evidenceFields.slice(-2).map((f) => `<em>${esc(f.label)}:</em> ${esc(a[f.key])}`).join('<br>')}</div>`; }).join(''); })()}
          <p class="hint-note" style="margin-top:10px">Look for misconceptions in the last field: does the student state a limit of the evidence, or overclaim?</p></div>
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
    const pqId = st.ui.pq && st.library[st.ui.pq] ? st.ui.pq : st.activeQuest;
    const pq = pqId === st.activeQuest ? st.quest : st.library[pqId].quest;
    const pendD = sel.pendingInteractions();
    return `
      <div class="stack">
        <div class="hero peach">
          <div>
            <div class="eyebrow coral">Community-powered learning</div>
            <h1>Your knowledge <span class="accent-coral">brings it to life.</span></h1>
            <p class="lede">Help educators create respectful, accurate missions rooted in people, places and real stories.</p>
            <span class="pill">${esc(pq.partner.name)} · ${esc(pq.partner.org)}</span>
          </div>
          <div class="hero-art">${Art.arch({ door: '#6B5CE7', face: '#F6C5CF' })}${Art.sticker('A story to share', '💬')}</div>
        </div>
        <div class="card row" style="padding:12px 16px;gap:10px"><label class="fld" for="pq-sel" style="margin:0">Quest</label>
          <select class="input" id="pq-sel" data-a="pq-sel" style="width:auto;flex:1;min-width:180px">${Object.entries(st.library).map(([id, r]) => `<option value="${id}" ${id === pqId ? 'selected' : ''}>${esc((id === st.activeQuest ? st.quest : r.quest).title)}${id === st.activeQuest ? ' (running with the class)' : ''}</option>`).join('')}</select></div>
        ${screen === 'facilitate' || screen === 'work' ? (pqId === st.activeQuest ? (screen === 'facilitate' ? facilitateScreen(st, pendD) : partnerWork(st)) : `<div class="card"><p style="margin:0">Facilitation and student work are for the quest the class is running: <strong>${esc(st.quest.title)}</strong>.</p></div>`) : reviewScreen(st, pqId)}
      </div>`;
  }

  function reviewScreen(st, qid) {
    const rec = qid === st.activeQuest ? st : st.library[qid];
    const c = rec.contributor, q = rec.quest, approved = c.status === 'APPROVED';
    const conv = SEED.topics.map((t) => rec.content.missions[t]).find((m) => m.needsFacilitator);
    return `
      <div class="grid-2">
        <form class="card" data-form="contribution" data-qid="${qid}">
          <div class="eyebrow coral">${esc(q.title)}${conv ? ' · ' + esc(conv.name) : ''}</div>
          <h3>Your learning contribution</h3>
          <p class="hint-note">Add context students can only get from you. You edit only your own contribution — never the educator’s curriculum. It becomes an approved source the assistant may draw on.</p>
          <label class="fld" for="contrib">What students can learn from you</label>
          <textarea class="input" id="contrib" rows="4" ${approved ? 'disabled' : ''}>${esc(c.text)}</textarea>
          <div class="row" style="margin-top:12px">
            ${approved
              ? `<span class="status-chip st-verified">${Art.icon('check', 15)}Approved — educator notified</span>`
              : `<button class="btn btn-primary" type="submit">${Art.icon('pencil', 16)} Save edit</button>
                 <button class="btn btn-teal" type="button" data-a="approve-contrib" data-qid="${qid}">${Art.icon('check', 16)} Approve contribution</button>`}
          </div>
        </form>
        <div class="stack">
          <form class="card" data-form="partner" data-qid="${qid}">
            <div class="eyebrow coral">How students see you</div>
            <label class="fld" for="pt-name">Name</label><input class="input" id="pt-name" value="${esc(q.partner.name)}">
            <label class="fld" for="pt-org">Organisation</label><input class="input" id="pt-org" value="${esc(q.partner.org)}">
            <button class="btn btn-secondary btn-sm" type="submit" style="margin-top:8px">Save</button>
          </form>
          <div class="card wash-peach">
            <div class="eyebrow coral">A shared responsibility</div>
            <p class="hint-note" style="margin:0">Your approval is a separate sign-off from the educator’s: the quest can’t be published without it. This demo role is simulated; it does not represent venue staff or a confirmed partnership.</p>
          </div>
        </div>
      </div>`;
  }


  function partnerWork(st) {
    const homes = SEED.homeGroups.filter((h) => ['SUBMITTED', 'APPROVED'].includes(st.finale[h].status));
    return `<div class="card"><div class="eyebrow coral">Partner feedback</div><h3>Teams’ finale answers</h3>
      <p class="hint-note">Respond as the community partner: what rings true, what is missing, what would you add? Students see your words as a perspective, not a grade.</p>
      ${homes.length === 0 ? '<p class="hint-note" style="margin:0">Introductions appear here once teams submit their finale.</p>' : ''}
      <div class="stack" style="gap:12px">${homes.map((h) => { const f = st.finale[h], fb = st.partnerFeedback[h];
        const tiles = SEED.finale.compose.tiles.filter((t) => f.tiles.includes(t.id));
        return `<div class="queue-row" style="display:block"><div class="spread"><strong>Team ${h}</strong>${statusChip(f.status)}</div>
          <div class="evidence-quote" style="margin:8px 0">${tiles.map((t) => esc(t.text)).join(' ')}</div>
          ${fb ? `<div class="card wash-mint" style="padding:10px 14px"><strong>Your feedback:</strong> ${esc(fb.text)}</div>` :
          `<form class="row" data-form="partner-fb" data-home="${h}"><label class="sr-only" for="fb-${h}">Feedback for team ${h}</label><input class="input" id="fb-${h}" placeholder="Your response to team ${h}…" style="flex:1;min-width:180px"><button class="btn btn-teal btn-sm" type="submit">Send</button></form>`}</div>`; }).join('')}</div></div>`;
  }

  function facilitateScreen(st, pendD) {
    const promptIdx = st.contributor.interactionPrompt || 0;
    const toCheck = sel.pendingEvidence().filter((p) => (SEED.missions[p.topic].assess || {}).verify === 'partner');
    return `
      ${toCheck.length ? `<div class="card"><div class="spread"><h3>${Art.icon('check', 18)} Evidence for you to verify</h3><span class="pill peach">${toCheck.length}</span></div>
        <div class="stack" style="gap:10px">${toCheck.map((p) => { const m = SEED.missions[p.topic], ev = st.evidence[p.id]; return `<div class="queue-row"><div class="meta"><strong>${esc(who(p))}</strong> · ${esc(m.name)}
          ${ev.photo ? `<img class="ev-photo" src="${ev.photo}" alt="Photo submitted by ${esc(who(p))}">` : ''}${ev.quiz ? `<p class="hint-note" style="margin:4px 0">Quick check: ${ev.quiz.score}/${ev.quiz.total}</p>` : ''}
          ${m.assess.evidence === 'photo' ? '' : `<dl class="evidence-quote">${m.evidenceFields.map((f) => `<dt>${esc(f.label)}</dt><dd>${esc(ev.answers[f.key])}</dd>`).join('')}</dl>`}</div>
          <div class="stack" style="gap:8px"><button class="btn btn-teal btn-sm" data-a="pverify-ev" data-pid="${p.id}">${Art.icon('check', 15)} Verify</button><button class="btn btn-danger-ghost btn-sm" data-a="preturn-ev" data-pid="${p.id}">Needs revision</button></div></div>`; }).join('')}</div></div>` : ''}
      <div class="grid-2">
        <div class="card">
          <div class="eyebrow coral">Live facilitation</div>
          <h3>Your conversation prompt</h3>
          <p class="hint-note">Pick one prompt and discuss it with each student in the conversation track in an arranged, supervised conversation.</p>
          ${[...SEED.contributor.prompts, ...(st.contributor.extraPrompts || [])].map((p, i) => `<button type="button" class="tile-pick" data-a="prompt" data-i="${i}" aria-pressed="${promptIdx === i}">${i >= SEED.contributor.prompts.length ? '<span class="pill mint" style="margin-right:6px">your question</span>' : ''}${esc(p)}</button>`).join('')}
          <form class="row" data-form="partner-q" style="margin-top:10px"><label class="sr-only" for="pq">Add your own question</label>
            <input class="input" id="pq" placeholder="Add your own question for students…" style="flex:1;min-width:180px"><button class="btn btn-secondary btn-sm" type="submit">${Art.icon('plus', 15)} Add</button></form>
          <p class="hint-note" style="margin-top:10px">Your reply is recorded by students as a <em>perspective</em>, never as established fact.</p>
        </div>
        <div class="card">
          <h3>${Art.icon('handshake', 19)} Verify arranged interactions</h3>
          ${st.phase === 'LOBBY' ? '<p class="hint-note" style="margin:0">Interactions open once the educator starts the session.</p>' : ''}
          ${pendD.length === 0 && st.phase !== 'LOBBY' ? '<p class="hint-note" style="margin:0">All arranged conversations are verified. ✓</p>' : ''}
          <div class="stack" style="gap:10px">
            ${pendD.map((p) => `<div class="queue-row"><div class="meta"><strong>${esc(who(p))}</strong><br><small>Home ${p.home} · Expert ${p.topic} · ${esc(SEED.missions[p.topic].gallery)}</small></div>
              <button class="btn btn-teal btn-sm" data-a="verify-int" data-pid="${p.id}">${Art.icon('check', 15)} Confirm interaction</button></div>`).join('')}
          </div>
          <p class="hint-note" style="margin-top:12px">Verification is an adult-controlled action — students cannot confirm it themselves.</p>
        </div>
      </div>`;
  }

  /* ================= overlays ================= */

  function overlays(st) {
    let html = '<div class="toast-zone" id="toasts"></div>';
    if (st.master && !st.ui.masterSeen) {
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
      if (a === 'pq-sel') { el.addEventListener('change', () => { S().ui.pq = el.value; render(); }); return; }
      if (a === 'student-sel') {
        el.addEventListener('change', () => { markJoined(el.value); act('setStudent', { id: el.value }); });
        return;
      }
      el.addEventListener('click', (e) => {
        switch (a) {
          case 'role': location.hash = ROUTE_OF[el.dataset.role] || ''; return;
          case 'screen': return act('setScreen', { screen: el.dataset.screen });
          case 'reset': if (confirmReset()) act('resetDemo'); return;
          case 'mtab': S().ui.missionTab = el.dataset.tab; S().ui.screen = 'adventure'; render(); return;
          case 'hints': S().ui.hintsOpen = !S().ui.hintsOpen; S().ui.hintsShown = 1; render(); return;
          case 'hint-more': S().ui.hintsShown = (S().ui.hintsShown || 1) + 1; render(); return;
          case 'help': return act('requestHelp', { participantId: S().ui.student });
          case 'resolve-help': return act('resolveHelp', { id: el.dataset.id });
          case 'qr-cards': return StationCards.open();
          case 'next-enable': return act('setNext', { fields: { enabled: el.checked } }), render();
          case 'draft-booking': {
            const n = S().quest.next;
            S().ui.bookingDraft = `Hello ${n.provider || 'there'},\n\nMy class (${S().quest.classSize} students, ages 13–16) is finishing a quest on “${S().quest.title}”. Afterwards we’d love to come to you for: ${n.activity || 'a short workshop'}${n.when ? ', on ' + n.when : ''}.\n\nStudents will bring: ${n.bring || 'their notes from the quest'}. Two staff will supervise. Could you confirm availability, timing and any cost?\n\nThank you,\nThe class teacher`;
            render(); return;
          }
          case 'send-booking': { const t = (document.getElementById('nx-req') || {}).value; const r = act('sendBooking', { text: t }); if (r.ok) S().ui.bookingDraft = null; return; }
          case 'provider-accept': return act('providerReply', { accept: true });
          case 'provider-counter': return act('providerReply', { accept: false, when: 'Fri 4 Dec, 10–11:30am' });
          case 'accept-counter': return act('acceptCounter');
          case 'unlock-next': return act('unlockExperience', { reason: (document.getElementById('nx-reason') || {}).value || '' });
          case 'award-card': return act('awardCollectible', { collectibleId: el.dataset.card });
          case 'next-checkin': {
            const me = SEED.byId[S().ui.student];
            return Scanner.open({ title: 'Scan the code at the door', hint: 'It’s on the provider’s door. No camera? Ask your teacher to check you in.', onCode: (c) => act('experienceCheckIn', { participantId: me.id, code: c }).ok });
          }
          case 'teacher-checkin': return act('experienceCheckIn', { participantId: el.dataset.pid, byTeacher: true });
          case 'show-code': return JoinCode.open(sessionCode(), S().quest.title);
          case 'demo-toggle': S().ui.demoOpen = !S().ui.demoOpen; render(); return;
          case 'safety': return act('updateQuest', { field: 'safety', value: el.checked }), render();
          case 'tamper': return typeof Sync !== 'undefined' && Sync.tamperTest().then((r) => toast(r.msg, r.ok ? 'success' : 'error'));
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
          case 'ok-checkin': return act('reviewCheckin', { participantId: el.dataset.pid, approve: true });
          case 'no-checkin': return act('reviewCheckin', { participantId: el.dataset.pid, approve: false });
          case 'pverify-ev': return act('reviewEvidence', { participantId: el.dataset.pid, verdict: 'VERIFIED', reviewer: 'collaborator' });
          case 'preturn-ev': return act('reviewEvidence', { participantId: el.dataset.pid, verdict: 'NEEDS_REVISION', reviewer: 'collaborator' });
          case 'return-ev': return act('reviewEvidence', { participantId: el.dataset.pid, verdict: 'NEEDS_REVISION', reviewer: 'teacher' });
          case 'return-finale': return act('reviewFinale', { home: el.dataset.home, approve: false });
          case 'approve-bonus': return act('approveBonus', { collectibleId: el.dataset.card });
          case 'sim-class': return act('simulateClassmates');
          case 'sim-bonus': return act('simulateBonusSubmissions');
          case 'approve-contrib': return act('approveContribution', { questId: el.dataset.qid });
          case 'new-quest': S().ui.newQuest = true; render(); return;
          case 'new-quest-x': S().ui.newQuest = false; render(); return;
          case 'create-quest': {
            const tpl = el.dataset.tpl, title = (document.getElementById('nq-title') || {}).value || '';
            const r = act('createQuest', { template: tpl === 'ai' ? 'blank' : tpl, title });
            if (!r.ok) return;
            S().ui.newQuest = false; S().ui.screen = 'builder'; render();
            if (tpl === 'ai') { toast('Add your sources and the quest settings, then press “Generate the whole quest”.', 'success'); document.getElementById('as-sources')?.scrollIntoView({ behavior: 'smooth' }); }
            return;
          }
          case 'open-quest': return act('openQuest', { id: el.dataset.id });
          case 'del-quest': return act('deleteQuest', { id: el.dataset.id });
          case 'leave-class': { const code = sessionCode(); delete S().ui.joinedIn[code]; render(); return; }
          case 'verify-int': return act('verifyInteraction', { participantId: el.dataset.pid });
          case 'prompt': return act('setInteractionPrompt', { index: Number(el.dataset.i) }), render();
          case 'teamview': S().ui.teamView = el.dataset.view; render(); return;
          case 'master-seen': return act('markMasterSeen'), render();
        }
      });
    });

    // keep unsent typing in this device's drafts so re-renders (hints, other devices) never wipe it
    root.querySelectorAll('form[data-form="evidence"] textarea, form[data-form="reflection"] textarea').forEach((t) => {
      t.addEventListener('input', () => { const id = S().ui.student; const d = (S().ui.drafts[id] = S().ui.drafts[id] || {}); d[t.name] = t.value; });
    });
    const cp = root.querySelector('#ci-photo');
    if (cp) cp.addEventListener('change', async () => {
      const file = cp.files[0]; if (!file) return;
      const me = SEED.byId[S().ui.student], m = SEED.missions[me.topic], a = m.assess || SEED.defaultAssess();
      const shrink = (max, q) => new Promise((res) => { const img = new Image(); img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)), cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); res(cv.toDataURL('image/jpeg', q)); }; img.onerror = () => res(null); img.src = URL.createObjectURL(file); });
      const thumb = await shrink(240, 0.6);
      let ai = null;
      if (a.checkin === 'photo_ai') {
        S().ui.photoCheck = me.id; render();
        try {
          const big = await shrink(640, 0.7);
          let pass = ''; try { pass = localStorage.getItem('wq-ai-pass') || ''; } catch {}
          const res = await fetch('/api/assistant', { method: 'POST', headers: { 'content-type': 'application/json', 'x-demo-passcode': pass },
            body: JSON.stringify({ mode: 'photo', photo: big, reference: m.refPhoto || null, object: SEED.keyObjectOf(me.topic), location: m.gallery }) });
          const d = res.ok ? await res.json() : null;
          ai = d && d.result ? d.result : null;
        } catch { ai = null; }
        S().ui.photoCheck = null;
      }
      act('checkInPhoto', { participantId: me.id, photo: thumb, ai });
      render();
    });
    const ph = root.querySelector('#ev-photo-in');
    if (ph) ph.addEventListener('change', () => {
      const file = ph.files[0]; if (!file) return;
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 240 / Math.max(img.width, img.height)), cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        const id = S().ui.student, d = (S().ui.drafts[id] = S().ui.drafts[id] || {});
        d.photo = cv.toDataURL('image/jpeg', 0.6);
        render();
      };
      img.src = URL.createObjectURL(file);
    });
    root.querySelectorAll('form[data-form="evidence"] input[type=radio]').forEach((r) => r.addEventListener('change', () => {
      const id = S().ui.student, d = (S().ui.drafts[id] = S().ui.drafts[id] || {}); d[r.name] = r.value;
    }));
    root.querySelectorAll('[data-qrtext]').forEach((q) => { if (window.QRCode && !q.firstChild) new QRCode(q, { text: q.dataset.qrtext, width: 150, height: 150, colorDark: '#20264B', colorLight: '#FFFFFF' }); });
    if (typeof Assistant !== 'undefined') Assistant.bind(root);

    // live preview typing in the quest builder (silent updates, targeted DOM refresh)
    root.querySelectorAll('[data-q]').forEach((el) => {
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
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
        if (kind === 'partner-q') { const r = act('addPartnerPrompt', { text: form.querySelector('#pq').value }); return; }
        if (kind === 'partner-fb') { act('partnerFeedback', { home: form.dataset.home, text: form.querySelector('input').value }); return; }
        if (kind === 'next') {
          const v = (id) => form.querySelector('#' + id).value;
          act('setNext', { fields: { activity: v('nx-act'), provider: v('nx-prov'), org: v('nx-org'), when: v('nx-when'), bring: v('nx-bring'), fallback: v('nx-fb'), unlock: v('nx-unlock') } });
          return;
        }
        if (kind === 'session') {
          const code = form.querySelector('#demo-session').value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
          if (code) location.href = location.pathname + '?session=' + encodeURIComponent(code) + location.hash;
          return;
        }
        if (kind === 'join') {
          const code = form.querySelector('#join-code').value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
          const nick = form.querySelector('#join-nick').value;
          if (!code) return toast('Enter the class code from your teacher.', 'error');
          if (nick.trim().length < 2) return toast('Pick a nickname of 2–16 characters.', 'error');
          if (code !== sessionCode()) {
            // another class: go to its session and finish joining there
            try { localStorage.setItem('wq-pending-join', JSON.stringify({ code, nick })); } catch {}
            location.href = location.pathname + '?session=' + encodeURIComponent(code) + '#student';
            return;
          }
          armTilt();
          const r = act('joinClass', { nick });
          if (r.ok) { markJoined(r.pid, nick); act('setStudent', { id: r.pid }); }
          return;
        }
        if (kind === 'evidence') {
          const me = SEED.byId[S().ui.student], m = SEED.missions[me.topic], d = S().ui.drafts[me.id] || {};
          const answers = {};
          m.evidenceFields.forEach((f) => { answers[f.key] = form.querySelector(`[name="${f.key}"]`)?.value || ''; });
          const quiz = ((m.assess || {}).quiz || []).map((q, i) => { const c = form.querySelector(`[name="quiz${i}"]:checked`); return c ? Number(c.value) : null; });
          const r = act('submitEvidence', { participantId: me.id, answers, photo: d.photo || null, quiz });
          if (r.ok && S().ui.drafts[me.id]) delete S().ui.drafts[me.id].photo;
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
          act('saveContribution', { text: form.querySelector('#contrib').value, questId: form.dataset.qid });
        } else if (kind === 'partner') {
          act('setPartner', { questId: form.dataset.qid, name: form.querySelector('#pt-name').value, org: form.querySelector('#pt-org').value });
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
    if (q.get('role') && !location.hash) location.hash = ROUTE_OF[q.get('role')] || q.get('role');
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
  addEventListener('hashchange', () => { window.scrollTo(0, 0); render(); });
  let tiltArmed = false, upSince = 0;
  function armTilt() {
    try { if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') DeviceOrientationEvent.requestPermission().catch(() => {}); } catch {}
    if (tiltArmed) return; tiltArmed = true;
    addEventListener('deviceorientation', (e) => {
      if (e.beta == null || currentRole() !== 'student') return;
      const up = Math.abs(e.beta) > 140;
      if (!up) { upSince = 0; return; }
      upSince = upSince || Date.now();
      if (Date.now() - upSince < 700) return;
      upSince = Date.now() + 60000;
      const me = SEED.byId[S().ui.student], card = SEED.collectibles.find((c) => c.home === me.home && c.kind === 'egg');
      if (joinedHere(S()) && card && !S().claims[card.id]) act('foundEgg', { participantId: me.id });
    });
  }
  function finishPendingJoin() {
    let p = null; try { p = JSON.parse(localStorage.getItem('wq-pending-join') || 'null'); } catch {}
    if (!p || p.code !== sessionCode()) return;
    try { localStorage.removeItem('wq-pending-join'); } catch {}
    if (joinedHere(S())) return;
    const r = act('joinClass', { nick: p.nick });
    if (r.ok) { markJoined(r.pid, p.nick); act('setStudent', { id: r.pid }); }
  }
  document.addEventListener('wq-sync', (e) => { if (e.detail === 'live' || e.detail === 'offline') finishPendingJoin(); render(); });
  // when this class code is opened on a device that joined before, play as the same explorer
  { const pid = S().ui.joinedIn && S().ui.joinedIn[sessionCode()]; if (pid) S().ui.student = pid; }
  document.addEventListener('wq-sync-msg', (e) => toast(e.detail, 'error'));

  applyDemoParams();
  render();
  if (typeof Sync !== 'undefined') Sync.start();
})();
