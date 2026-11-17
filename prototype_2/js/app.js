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
  const joinedHere = (st) => { const pid = st.ui.joinedIn && st.ui.joinedIn[sessionCode()]; return !!(pid && SEED.byId[pid] && (st.seats[pid] || st.ui.demoPlay === pid)); };
  function markJoined(pid, nick) {
    const u = S().ui; u.joinedIn = u.joinedIn || {}; u.joinedIn[sessionCode()] = pid;
    try { const k = 'wq-joined', list = JSON.parse(localStorage.getItem(k) || '[]').filter((x) => x.code !== sessionCode());
      list.unshift({ code: sessionCode(), title: S().quest.title, nick: nick || '' }); localStorage.setItem(k, JSON.stringify(list.slice(0, 8))); } catch {}
  }
  const joinedList = () => { try { return JSON.parse(localStorage.getItem('wq-joined') || '[]'); } catch { return []; } };
  const who = (p) => (S().seats && S().seats[p.id] ? S().seats[p.id].nick : p.name);
  const collArt = (c) => { const keys = Object.keys(Art.collectibleArt); const i = Math.max(0, SEED.collectibles.findIndex((x) => x.id === c.id)); return (Art.collectibleArt[c.id] || Art.collectibleArt[keys[i % keys.length]])(); };
  /* One page header for every screen in every role: context eyebrow, the screen's name, actions on the right. */
  const pageHead = (eyebrow, title, actions = '', tone = '') =>
    `<div class="spread page-head"><div><div class="eyebrow ${tone}">${eyebrow}</div><h2 style="margin:2px 0 0">${title}</h2></div>${actions ? `<div class="row" style="gap:8px">${actions}</div>` : ''}</div>`;
  const topicColor = (t) => SEED.topicMeta[t].color;
  const topicChip = (t) =>
    `<span class="topic-chip ${topicColor(t)}">${Art.icon(SEED.topicMeta[t].icon, 15)}${t} · ${SEED.topicMeta[t].label}</span>`;

  /* ================= shell ================= */

  /* Routing: '#student', '#educator', '#partner'; no hash = landing page. Each device stays in one role. */
  const ROUTES = { student: 'student', educator: 'teacher', partner: 'collaborator' };
  const ROUTE_OF = { student: 'student', teacher: 'educator', collaborator: 'partner' };
  const ROLE_LABEL = { student: 'Student', teacher: 'Educator', collaborator: 'Community partner' };
  const DEFAULT_SCREEN = { student: 'adventure', teacher: 'dashboard', collaborator: 'overview' };
  const NAV = {
    student: [['adventure', 'sparkle', 'My adventure'], ['map', 'map', 'Quest map'], ['album', 'trophy', 'Class album']],
    teacher: [['dashboard', 'map', 'My quests'], ['builder', 'pencil', 'Quest builder'], ['next', 'arrow', 'Journey'], ['teams', 'team', 'Teams'], ['live', 'eye', 'Live session'], ['album', 'trophy', 'Class album'], ['report', 'book', 'Report']],
    collaborator: [['overview', 'map', 'Overview'], ['contribution', 'pencil', 'My contribution'], ['review', 'eye', 'Review the quest'], ['facilitate', 'voices', 'On the day'], ['work', 'book', 'Student work']],
  };
  const currentRole = () => ROUTES[location.hash.slice(1)] || null;
  /* Presenter controls stay off student phones unless the link asks for them (?demo=1 or a ?fast= demo link). */
  const demoOn = () => {
    try { if (/[?&](demo|fast)=/.test(location.search)) sessionStorage.setItem('wq-demo', '1'); return sessionStorage.getItem('wq-demo') === '1'; }
    catch { return /[?&](demo|fast)=/.test(location.search); }
  };

  function render() {
    const y = window.scrollY;
    const st = S();
    if (!SEED.byId[st.ui.student]) st.ui.student = SEED.participants[0].id;
    const role = currentRole();
    if (!role) {
      root.innerHTML = landingView(st) + overlays(st) + demoDrawer(st);
    } else {
      if (st.ui.role !== role) { st.ui.role = role; st.ui.screen = null; st.ui.lookUp = false; }
      const screen = role === 'student' && !joinedHere(st) ? 'adventure' : st.ui.screen || DEFAULT_SCREEN[role];
      const pp = role === 'collaborator' ? sel.partnerProgress() : null;
      const badge = (id) => (id === 'review' && pp && !pp.signedOff && pp.contributed && pp.reviewed < pp.items.length ? ` <span class="pill peach">${pp.items.length - pp.reviewed}</span>` : id === 'facilitate' && sel.pendingInteractions().length ? ` <span class="pill peach">${sel.pendingInteractions().length}</span>` : id === 'live' && st.help.some((h) => h.open) ? ` <span class="pill peach">help</span>` : '');
      root.innerHTML = `
      <div class="shell role-${role}${demoOn() ? ' demo-on' : ''}">
        <aside class="sidebar">
          <a class="brand" href="#" aria-label="WorldQuest home">${Art.logo(42)}<h1>WorldQuest</h1></a>
          <div class="side-label">${ROLE_LABEL[role]}</div>
          <nav class="side-nav" aria-label="${ROLE_LABEL[role]} screens">
            ${(role === 'student' && !joinedHere(st) ? [['adventure', 'arrow', 'Join a quest']] : NAV[role]).map(([id, ic, lb]) => `<button data-a="screen" data-screen="${id}" aria-current="${screen === id}">${Art.icon(ic, 19)}${lb}${badge(id)}</button>`).join('')}
          </nav>
          <div class="side-tip"><strong>${Art.icon('leaf', 16)} Look up, not down</strong>
          The best clues are in the real world.</div>
        </aside>
        <main class="main" id="main">
          <a class="skip-link" href="#main-content">Skip to content</a>
          <div class="topbar">
            <a class="brand-mini" href="#" aria-label="WorldQuest home">${Art.logo(30)}</a><span class="crumb">${esc(st.quest.title)} · ${ROLE_LABEL[role]}</span>
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
          <ol class="hint-note" style="margin:0;padding-left:18px"><li>Partner reviews the quest and signs off</li><li>Educator drafts, approves tracks, publishes</li><li>Live session → advance phases; students join with the class code</li></ol></div>
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
          <div class="row me-row">
            <span class="identity-chip">${Art.icon('eye', 17)} <span class="nick">${esc(who(me))}</span> · <span class="hide-sm">Home team </span>${me.home}</span>
            ${topicChip(me.topic)}
            ${st.help.some((h) => h.pid === me.id && h.open)
              ? `<span class="pill peach">${Art.icon('clock', 14)} Teacher is on the way</span>`
              : `<button class="btn btn-sm help-btn" data-a="help">${Art.icon('alert', 15)} <span class="hide-sm">Call teacher</span><span class="show-sm">Help</span></button>`}
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
        const how = a.checkin === 'qr' ? ' and scan the clue card' : String(a.checkin).startsWith('photo') ? ` and photograph <strong>${esc(SEED.keyObjectOf(me.topic))}</strong>${a.qr ? ' (or scan the clue card)' : ''}` : '';
        const together = SEED.expertGroupOf(me.id).members.length > 1;
        const hand = { notes: 'your notes', photo: 'your photo', notes_photo: 'your notes and photo' }[a.evidence] || 'your notes';
        const list = [[at, !at, st.checkinPhotos[me.id] ? 'Wait for your teacher to confirm your photo' : `Go to <strong>${place}</strong>${together ? ' with your expert group' : ''}${how}`],
          [at && (st.ui.missionTab === 'record' || submitted), at && !submitted, together ? 'Look closely and talk it through with your group — phone away' : 'Look closely — phone away'],
          [submitted, at && !submitted, `Send ${hand}${a.quiz && a.quiz.length ? ' and answer the quick quiz' : ''}`],
          [ev.status === 'VERIFIED', ev.status === 'SUBMITTED', ev.status === 'NEEDS_REVISION' ? 'Fix what your teacher asked for, then send it again' : a.verify === 'auto' ? 'Pass the quiz to finish' : a.verify === 'partner' ? 'Wait for the community partner to check it' : 'Wait for your teacher to check it']];
        title = ev.status === 'VERIFIED' ? 'Done! Wait for peer teaching' : 'Your expert mission';
        const grp = SEED.expertGroupOf(me.id), mates = grp.members.filter((p) => p.id !== me.id);
        body = (mates.length ? `<p style="margin:0 0 8px">Your expert group: <strong>${mates.map((p) => esc(who(p))).join(', ')}</strong> and you.</p>` : '') + steps(list);
        if (!at && a.checkin === 'qr') action = `<button class="btn btn-primary btn-sm" data-a="scan-station">${Art.icon('eye', 15)} Scan clue card</button>`;
        else if (!at && String(a.checkin).startsWith('photo') && !st.checkinPhotos[me.id]) action = `<button class="btn btn-primary btn-sm" data-a="mtab" data-tab="observe">${Art.icon('eye', 15)} Photograph the object</button>`;
        else if (!submitted || ev.status === 'NEEDS_REVISION') action = `<button class="btn btn-primary btn-sm" data-a="mtab" data-tab="record">${Art.icon('pencil', 15)} Open my field notes</button>`;
        break;
      }
      case 'PEER_TEACH': {
        const mine = SEED.topicsFor(me.home), taught = mine.filter((t) => st.peerTeach[me.home][t].shared).length;
        title = 'Teach your home team';
        body = `<p>Go back to home team <strong>${me.home}</strong>. Explain what you found as the ${track} expert, then listen to the others. A teammate answers a quick check after each one. <strong>${taught}/${mine.length}</strong> taught so far.</p>`;
        break;
      }
      case 'FINALE':
        title = 'Solve the finale together';
        body = `<p>With home team <strong>${me.home}</strong>, use every team member’s perspective to complete “${esc(SEED.finale.title)}”.</p>`;
        break;
      case 'REFLECTION':
        title = 'Reflect';
        body = `<p>Answer the reflection question${SEED.reflection.length === 1 ? '' : 's'} on your own, then look up and join the class discussion.</p>`;
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
    if (!joinedHere(st)) return joinScreen(st, me);
    switch (st.phase) {
      case 'LOBBY': return lobbyScreen(st, me) + phasePath(st);
      case 'BRIEFING': return briefingScreen(me) + phasePath(st);
      case 'EXPERT': return missionScreen(st, me) + phasePath(st);
      case 'PEER_TEACH': return teachScreen(st, me) + phasePath(st);
      case 'FINALE': return finaleScreen(st, me) + bonusCardFor(st, me) + Journey.student(st, me) + phasePath(st);
      case 'REFLECTION': return reflectionScreen(st, me) + bonusCardFor(st, me) + Journey.student(st, me) + phasePath(st);
      case 'COMPLETE': return completeScreen(st, me) + Journey.student(st, me) + bonusCardFor(st, me) + phasePath(st);
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
        <h3>How it works</h3>
        <ol class="ns-steps"><li><span>Join with the class code — you get a home team and an expert track.</span></li><li><span>Explore your place with your expert group and record what you find.</span></li><li><span>Teach your home team, then solve the finale together.</span></li></ol>
      </div>`;
  }

  function lobbyScreen(st, me) {
    return `<div class="card">
        <div class="spread"><div><div class="eyebrow">${esc(SEED.title)}</div><h3 style="margin:2px 0 0">Waiting in the lobby</h3></div>${statusChip(st.quest.status === 'PUBLISHED' ? 'AVAILABLE' : 'LOCKED')}</div>
        <p>${st.quest.status === 'PUBLISHED' ? 'Your educator will start the briefing soon.' : 'Your educator hasn’t opened this quest yet. Hang tight.'}</p>
        <p class="hint-note">You are ${esc(who(me))} in home team ${me.home}, expert track ${me.topic} · ${esc(SEED.topicMeta[me.topic].name)}. Meanwhile, look at the quest map to see how the teams fit together.</p>
        <button class="btn btn-ghost btn-sm" data-a="leave-class">Join a different class</button>
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
        ${m.sourceFact || m.fallback ? `<div class="card"><p class="hint-note" style="margin:0">${m.sourceFact ? `<strong>From an approved source:</strong> ${esc(m.sourceFact)}${m.sourceUrl ? ` <a href="${esc(m.sourceUrl)}" target="_blank" rel="noopener">source</a>` : ''} · re-check on the day. ` : ''}${esc(m.fallback)}</p></div>` : ''}
        <p class="hint-note">Observe in person with your group. Never touch or place anything on objects or exhibits.</p>` : ''}
      ${tab === 'discuss' ? `
        <div class="card wash-lavender"><h4>${Art.icon('voices', 18)} Talk it through</h4><p style="margin:0">${esc(m.discuss)}</p></div>
        ${m.needsFacilitator ? `<div class="card"><div class="eyebrow coral">Today’s question from the community partner</div><p style="margin:0"><strong>${esc((st.contributor.prompts || SEED.contributor.prompts)[st.contributor.interactionPrompt || 0])}</strong></p></div>` : ''}
        ${m.needsFacilitator ? `
          <div class="card ${st.interactions[me.id] ? 'wash-mint' : 'wash-peach'}">
            <div class="spread"><h4 style="margin:0">${Art.icon('handshake', 18)} Arranged conversation with the community partner</h4>
            ${st.interactions[me.id] ? statusChip('VERIFIED') : statusChip('SUBMITTED')}</div>
            <p style="margin:8px 0 0">${st.interactions[me.id]
              ? 'Your conversation with the community partner is verified — record their perspective in step 3.'
              : `Meet the community partner (<em>${esc(Partner.label(st.quest, st.contributor))}</em>). They confirm it from their own device.`}</p>
          </div>` : ''}` : ''}
      ${tab === 'record' ? (st.checkins[me.id] || (m.assess && m.assess.checkin === 'none') ? recordForm(st, me, m, ev) : checkinCard(st, me, m, true)) : ''}`;
  }

  function checkinCard(st, me, m, locked) {
    const a = m.assess || SEED.defaultAssess();
    if (a.checkin === 'none') return '';
    const c = st.checkins[me.id];
    const via = { QR: 'QR clue card', CODE: 'backup code', PHOTO_AI: 'photo checked by AI', PHOTO_TEACHER: 'photo approved by your teacher', SIMULATED: 'simulated' };
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
        : `<label class="btn btn-primary" for="ci-photo">${Art.icon('eye', 17)} Photograph the object</label>${a.qr ? ` <button class="btn btn-secondary" data-a="scan-station">${Art.icon('map', 17)} Scan the clue card instead</button>` : ''}<input id="ci-photo" type="file" accept="image/*" capture="environment" hidden>
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
          <div class="spread" style="margin-top:8px"><span class="hint-src">${m.sourceUrl ? `From an approved source · <a href="${esc(m.sourceUrl)}" target="_blank" rel="noopener">${esc(m.gallery)} page</a> · ` : ''}educator-approved</span>
          ${(st.ui.hintsShown || 1) < m.hints.length ? `<button class="btn btn-ghost btn-sm" type="button" data-a="hint-more">Another hint</button>` : ''}</div></div>` : ''}
      </form>`;
  }

  function teachScreen(st, me) {
    const home = me.home;
    const shared = st.peerTeach[home];
    const myTopics = SEED.topicsFor(home);
    const doneCount = myTopics.filter((t) => shared[t].shared).length;
    return `
      <div class="mission-hero violet">
        <div class="eyebrow">Home team ${home} · Peer teaching</div>
        <h2>Everyone holds a piece.</h2>
        <p style="max-width:54ch">Each expert teaches what they found; a teammate answers a quick check to show the knowledge landed. ${doneCount}/${myTopics.length} perspectives shared.</p>
      </div>
      <div class="jigsaw-grid">
        ${myTopics.map((t) => {
          const expert = SEED.expertOf(home, t);
          const evs = st.evidence[expert.id].status;
          const cell = shared[t];
          const meta = SEED.topicMeta[t];
          return `<div class="jig-tile ${meta.color} ${cell.shared ? 'shared' : ''}">
            <div class="topic-dot">${Art.icon(meta.icon, 18)}</div>
            <h4>${t} · ${esc(meta.name)}</h4>
            <span class="who">${esc(who(expert))}${expert.id === me.id ? ' (you)' : ''}${cell.simulated ? ' · simulated' : ''}</span>
            <div style="margin-top:8px">${cell.shared ? statusChip('VERIFIED').replace('Verified', 'Shared') : evs !== 'VERIFIED' ? statusChip('LOCKED').replace('Locked', 'Evidence not verified') : cell.asking ? '<span class="pill peach">check sent</span>' : statusChip('AVAILABLE').replace('Available', 'Ready to teach')}</div>
            ${cell.shared || evs !== 'VERIFIED' ? '' : teachAction(st, me, t, expert, cell)}
          </div>`;
        }).join('')}
      </div>
      ${st.ui.teachTopic && !shared[st.ui.teachTopic].shared ? teachForm(st, me, st.ui.teachTopic) : ''}
      ${doneCount === myTopics.length ? `<div class="card wash-mint burst"><strong>${Art.icon('check', 17)} All ${myTopics.length} perspectives shared!</strong> The finale unlocks when your educator opens the next phase.</div>` : ''}`;
  }

  /* Who can do what on this phone: the expert sends the check; a teammate answers it on their own phone.
     Teammates without a device (simulated in the demo) can be answered for, clearly labelled. */
  const onDevice = (st, p) => !!st.seats[p.id] || p.id === st.ui.student;
  function teachAction(st, me, t, expert, cell) {
    const btn = (a, label, icon) => `<div style="margin-top:10px"><button class="btn btn-sm btn-secondary" data-a="${a}" data-topic="${t}">${Art.icon(icon, 15)} ${label}</button></div>`;
    const mates = SEED.homeMembers(me.home).filter((p) => p.id !== expert.id);
    const offline = mates.filter((p) => !onDevice(st, p));
    if (expert.id === me.id) {
      if (!cell.asking) return btn('teach-ask', 'I’ve explained it — send the check', 'voices');
      return `<p class="hint-note" style="margin:8px 0 0">Waiting for a teammate to answer on their phone…</p>${offline.length ? btn('teach-open', 'Answer for a teammate without a phone', 'team') : ''}`;
    }
    if (cell.asking) return btn('teach-open', `Answer ${esc(who(expert))}’s check`, 'check');
    return onDevice(st, expert) ? `<p class="hint-note" style="margin:8px 0 0">Listen to ${esc(who(expert))} first.</p>` : '';
  }
  /* Options in a stable shuffled order, so the right answer isn't always first. */
  const shuffled = (opts, salt) => opts.slice().sort((a, b) => hashStr(salt + a.id) - hashStr(salt + b.id));
  const hashStr = (x) => { let h = 7; for (const ch of String(x)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
  function teachForm(st, me, topic) {
    const home = me.home;
    const expert = SEED.expertOf(home, topic);
    const forOther = expert.id === me.id; // the expert answering for a teammate who has no device
    const mates = SEED.homeMembers(home).filter((p) => p.id !== expert.id && (forOther ? !onDevice(st, p) : true));
    const opts = shuffled(SEED.peerTeaching.checkOptions[topic], home + topic);
    return `
      <form class="card" data-form="teach" data-topic="${topic}">
        <div class="spread"><h3>Quick check: ${esc(SEED.topicMeta[topic].name)}</h3>${topicChip(topic)}</div>
        <p class="hint-note">${forOther ? 'Your teammate has no phone in this session (simulated in the demo). Let them choose, then enter their answer.' : `${esc(who(expert))} just explained their part. Which statement fits what they found?`}</p>
        ${forOther ? `<div class="fld-group"><label class="fld" for="checker">Teammate answering</label>
          <select class="input" id="checker" name="checker">${mates.map((p) => `<option value="${p.id}">${esc(who(p))}${st.evidence[p.id].simulated ? ' · simulated' : ''}</option>`).join('')}</select></div>`
          : `<input type="hidden" name="checker" value="${me.id}">`}
        <div class="fld-group" role="radiogroup" aria-label="Your answer">
          ${opts.map((o) => `<label class="tile-pick" style="display:flex;gap:9px;align-items:flex-start">
            <input type="radio" name="answer" value="${o.id}" style="margin-top:4px;accent-color:var(--violet)"> <span>${esc(o.text)}</span></label>`).join('')}
        </div>
        <div class="row">
          <button class="btn btn-primary" type="submit">${Art.icon('check', 17)} Submit answer</button>
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
      return `<div class="card"><div class="spread"><h2>Sent to your teacher</h2>${statusChip('SUBMITTED')}</div>
        <p style="margin:0">Your teacher is checking team ${home}’s answers.</p></div>`;
    }
    if (f.status === 'APPROVED') {
      return `<div class="card wash-mint burst"><div class="spread"><h2>Main quest complete! ✦</h2>${statusChip('APPROVED')}</div>
        <p style="margin:0">Your educator approved team ${home}’s answer. Careful, evidence-based work.</p></div>`;
    }
    const fin = SEED.finale, steps = fin.steps || [];
    const firstOpen = steps.findIndex((x) => (x.type === 'choice' ? !(f.answers[x.id] || {}).done : !String((f.answers[x.id] || {}).text || '').trim()));
    return `
      ${f.status === 'NEEDS_REVISION' ? `<div class="card wash-peach"><strong>${Art.icon('alert', 17)} Your teacher says:</strong> ${esc(f.note)}</div>` : ''}
      <div class="mission-hero sun">
        <div class="eyebrow sun">Final team challenge · Team ${home}</div>
        <h2>${esc(fin.title)}</h2>
        ${fin.intro ? `<p style="max-width:56ch">${esc(fin.intro)}</p>` : ''}
        <p class="hint-note" style="margin:0">${steps.length} step${steps.length === 1 ? '' : 's'} · work it out together</p>
      </div>
      ${steps.map((x, i) => { const a = f.answers[x.id] || {}, done = x.type === 'choice' ? a.done : !!String(a.text || '').trim();
        return `<div class="card fin-step ${done ? 'done' : ''} ${i === firstOpen ? 'now' : ''}">
          <div class="eyebrow">Step ${i + 1}${done ? ' · ✓' : ''}</div>
          ${x.type === 'choice' ? `<h3 style="margin:2px 0 8px">${esc(x.question)}</h3>
            ${a.done ? `<p style="margin:0">${Art.icon('check', 16)} <strong>${esc((x.options.find((o) => o.id === a.pick) || {}).text || '')}</strong></p>`
              : x.options.map((o) => `<button type="button" class="tile-pick" data-a="fchoice" data-step="${x.id}" data-opt="${o.id}">${esc(o.text)}</button>`).join('')}`
          : `<h3 style="margin:2px 0 6px">${esc(x.prompt)}</h3>
            ${(x.checks || []).length ? `<p class="hint-note" style="margin:0 0 6px">A good answer: ${x.checks.map(esc).join(' · ')}</p>` : ''}
            <label class="sr-only" for="fw-${x.id}">Your team’s answer</label>
            <textarea class="input" id="fw-${x.id}" data-fwrite="${x.id}" rows="4" placeholder="Write it together…">${esc(a.text || '')}</textarea>`}
        </div>`; }).join('')}
      <button class="btn btn-primary" data-a="submit-finale">${Art.icon('puzzle', 18)} Send our answers to the teacher</button>`;
  }

  function tagName(tag) {
    const t = SEED.topics.find((t) => SEED.topicMeta[t].tag === tag);
    return t ? SEED.topicMeta[t].name : tag;
  }

  /* How a card is earned, said to a student. */
  function cardRule(c) {
    if (c.kind === 'track') return 'Finish your track — the badge is yours.';
    return { experts: 'When everyone in your team finishes their track.', finale: 'When your team solves the finale.', bonus: esc(c.activity || 'A bonus activity for your team.'),
      egg: 'Hidden somewhere: try tilting your phone up at the right spot.', teacher: 'Your teacher can award it to your team.' }[c.kind] || '';
  }
  function bonusCardFor(st, me) {
    const cards = SEED.collectibles.filter((c) => sel.cardScope(c) === 'team' || sel.holdersOf(c).some((p) => p.id === me.id))
      .map((c) => ({ c, holder: sel.cardScope(c) === 'student' ? me.id : me.home })).filter(({ c, holder }) => !c.hidden || sel.hasCard(c, holder));
    if (!cards.length) return '';
    return `<div class="card" style="background:var(--grad-collect)">
      <div class="spread"><div class="eyebrow sun">Your cards · optional</div><button class="btn btn-ghost btn-sm" data-a="screen" data-screen="album">Class album</button></div>
      <div class="stack" style="gap:10px;margin-top:8px">${cards.map(({ c, holder }) => {
        const has = sel.hasCard(c, holder), b = c.kind === 'bonus' ? sel.bonusOf(c, me.home) : null, lv2 = st.evolved[c.id + '@' + holder];
        return `<div class="my-card ${has ? 'has' : ''}">
          <div class="collect-card ${has ? 'claimed' : 'locked'}" style="width:56px;min-width:56px;cursor:default">${has ? collArt(c) : Art.lockedArt()}</div>
          <div style="min-width:0;flex:1"><div class="spread"><strong>${esc(c.title)}${lv2 ? ' <span class="pill sun">Level 2</span>' : ''}</strong><span class="pill ${has ? 'mint' : 'plain'}">${has ? (sel.cardScope(c) === 'student' ? 'yours ✓' : 'your team’s ✓') : sel.cardScope(c) === 'student' ? 'just for you' : 'for your team'}</span></div>
            <p class="hint-note" style="margin:2px 0 0">${has ? esc(c.fact) : cardRule(c)}</p>
            ${!has && b ? (b.status === 'SUBMITTED' ? '<p class="hint-note" style="margin:4px 0 0">Sent — waiting for your teacher.</p>'
              : ['FINALE', 'REFLECTION', 'COMPLETE'].includes(st.phase) ? `<form data-form="bonus" data-card="${c.id}" data-home="${me.home}" class="row" style="margin-top:6px"><label class="sr-only" for="bonus-${c.id}">${esc(c.promptLabel || 'Your team’s answer')}</label>
                <input class="input" id="bonus-${c.id}" name="answer" placeholder="${esc(c.promptLabel || 'Your team’s answer')}" style="flex:1;min-width:150px"><button class="btn btn-sun btn-sm" type="submit">Send</button></form>` : '<p class="hint-note" style="margin:4px 0 0">Opens at the finale.</p>') : ''}
            ${has && c.evolves && !lv2 && st.journey.steps.some((x) => x.type === 'experience') ? '<p class="hint-note" style="margin:4px 0 0">Levels up when you check in at the next real experience.</p>' : ''}</div>
        </div>`; }).join('')}</div></div>`;
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
          <p class="hint-note" style="margin:0 0 10px">Your teacher reads this. (In this prototype, class data sits in one shared demo database; a real deployment keeps reflections teacher-only.)</p>
          <button class="btn btn-primary" type="submit">${Art.icon('check', 17)} Save my reflection</button>
        </form>`}`;
  }

  function completeScreen(st, me) {
    return `
      <div class="hero">
        <div>
          <div class="eyebrow sun">${esc(SEED.title)} · complete</div>
          <h1>Quest <span class="accent">complete.</span></h1>
          <p class="lede">${SEED.topics.length} perspectives, ${SEED.homeGroups.length} teams, one shared answer. The best part wasn’t on this screen — it was the looking, the listening and the teaching.</p>
          <button class="btn btn-primary" data-a="screen" data-screen="album">${Art.icon('trophy', 18)} Open the class album</button>
        </div>
        <div class="hero-art">${Art.arch({ door: '#FFB547', face: '#C8EDE3' })}${Art.sticker('Quest complete!', '🏆')}</div>
      </div>`;
  }

  function questMap(st, me) {
    return `
      ${pageHead(esc(SEED.title), 'Quest map')}
      ${Journey.strip(st)}
      ${phasePath(st)}
      <div class="card wash-lavender">
        <div class="eyebrow">Learning with others</div>
        <h3>Everyone holds a piece.</h3>
        <p>You investigate one expert perspective, teach it to your home team, then use every perspective in the final puzzle.</p>
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
    if (!SEED.collectibles.length) return `${pageHead(esc(st.quest.title), 'Class album')}<div class="card"><p style="margin:0">This quest has no reward cards.</p></div>`;
    return `
      ${pageHead(esc(st.quest.title), 'Class album', `<span class="pill lavender">${n} / ${SEED.collectibles.length} found by the class</span>`)}
      <div class="album-grid">
        ${SEED.collectibles.map((c) => {
          const found = !!st.claims[c.id], justNow = lastReveal === c.id, scope = sel.cardScope(c), total = sel.holdersOf(c).length, got = sel.earnedBy(c);
          const me = SEED.byId[st.ui.student], mine = viewer === 'student' && me && sel.hasCard(c, scope === 'student' ? me.id : me.home);
          const who = `${got} of ${total} ${scope === 'student' ? 'student' : 'team'}${total === 1 ? '' : 's'}`;
          return `<button type="button" class="collect-card ${found ? 'claimed' : 'locked'} ${justNow ? 'just-claimed' : ''}" data-a="card-info" data-card="${c.id}" aria-label="${esc(c.title)}: ${found ? 'earned by ' + who : 'not found yet'}">
            ${found ? collArt(c) + '<span class="holo"></span>' + (mine ? '<span class="claim-stamp">' + Art.icon('check', 15) + '</span>' : '') : Art.lockedArt()}
            <span class="card-strip"><strong>${found || !c.hidden ? esc(c.title) : 'Hidden card'}</strong><small>${found ? `${scope === 'student' ? 'Badge' : 'Team card'} · ${who}` : scope === 'student' ? 'Badge · not earned yet' : 'Team card · not earned yet'}</small></span>
          </button>`;
        }).join('')}
      </div>
      <div class="album-progress" role="progressbar" aria-valuenow="${n}" aria-valuemin="0" aria-valuemax="${SEED.collectibles.length}" aria-label="Album progress"><div style="width:${Math.round(n / Math.max(1, SEED.collectibles.length) * 100)}%"></div></div>
      <div class="card ${st.master ? '' : 'wash-lavender'}" style="${st.master ? 'background:var(--grad-collect)' : ''}">
        <div class="grid-2" style="grid-template-columns: 110px 1fr; gap:16px; align-items:center">
          <div class="collect-card ${st.master ? 'claimed' : 'locked'}" style="max-width:110px;cursor:default">${st.master ? Art.masterArt() : Art.lockedArt()}</div>
          <div>
            <h3>${Art.icon('trophy', 20)} ${esc(SEED.master.title)}</h3>
            <p style="margin:0">${st.master ? esc(SEED.master.fact) + ' Unlocked for the whole class — exactly once.' : esc(SEED.master.text)}</p>
          </div>
        </div>
      </div>
      ${viewer === 'teacher' ? SEED.collectibles.filter((c) => c.kind === 'teacher').map((c) => { const left = SEED.homeGroups.filter((h) => !sel.hasCard(c, h)); return left.length ? `<div class="card row" style="gap:6px;padding:12px 16px"><strong style="margin-right:6px">Award “${esc(c.title)}” to:</strong>${left.map((h) => `<button class="btn btn-sun btn-sm" data-a="award-card" data-card="${c.id}" data-home="${h}">Team ${h}</button>`).join('')}</div>` : ''; }).join('') : ''}
      ${viewer === 'student' ? `<p class="hint-note">Badges are yours; team cards belong to your team. They’re just for fun — they never block the quest.</p>` : ''}`;
  }

  /* ================= teacher ================= */

  function teacherView(st) {
    const screen = st.ui.screen || 'dashboard';
    return `
      <div class="stack">
        ${screen === 'builder' ? teacherBuilder(st)
          : screen === 'teams' ? teacherTeams(st)
          : screen === 'live' ? teacherLive(st)
          : screen === 'album' ? `<div class="stage-wrap stack">${albumScreen(st, 'teacher')}</div>`
          : screen === 'report' ? teacherReport(st)
          : screen === 'next' ? Journey.teacher(st)
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
        ${pageHead(`Educator studio · class code <span class="mono">${esc(code)}</span>`, 'My quests', `<button class="btn btn-primary" data-a="new-quest" ${live ? 'disabled title="End the live session first"' : ''}>${Art.icon('plus', 16)} New quest</button>`)}
        ${st.ui.newQuest && !live ? `<div class="card new-quest">
          <div class="spread"><h3 style="margin:0">Start a new quest</h3><button class="btn btn-ghost btn-sm" data-a="new-quest-x">Cancel</button></div>
          <label class="fld" for="nq-title">Working title (optional)</label><input class="input" id="nq-title" placeholder="e.g. Pollinator Patrol at the community garden" value="${esc(st.ui.nqTitle || '')}">
          ${!st.ui.nqTpl ? `<p class="hint-note" style="margin:10px 0 6px">Step 1 of 2 · How do you want to start?</p>
          <div class="grid-2">
            <button class="card choice-card" data-a="nq-pick" data-tpl="blank">${Art.icon('pencil', 20)}<strong>Blank quest</strong><small>Write every part yourself, or ask the assistant as you go.</small></button>
            <button class="card choice-card" data-a="nq-pick" data-tpl="ai">${Art.icon('sparkle', 20)}<strong>Generate with AI</strong><small>Add your sources, then the assistant drafts every track, the finale and collectibles for you to review.</small></button>
            <button class="card choice-card" data-a="nq-pick" data-tpl="two_explorers">${Art.icon('book', 20)}<strong>Example: Egypt Detectives</strong><small>Two students, two objects at the Fitzwilliam. A short, complete quest to adapt.</small></button>
            <button class="card choice-card" data-a="nq-pick" data-tpl="lost_museum">${Art.icon('map', 20)}<strong>Example: The Lost Museum</strong><small>A whole class (20 students, four galleries) at the Fitzwilliam.</small></button>
          </div>` : (() => { const tq = TEMPLATES[st.ui.nqTpl], d = (tq && tq.questDefaults && tq.questDefaults.structure) || SEED.defaultStructure(); return `<form class="stack" data-form="new-quest" style="gap:8px;margin-top:10px">
            <p class="hint-note" style="margin:0">Step 2 of 2 · How will the class be split? You can change this later in Quest settings.</p>
            <div class="grid-3" style="gap:10px">
              <div class="fld-group"><label class="fld" for="g-tracks">Tracks to start with</label><input class="input" id="g-tracks" type="number" min="1" max="6" value="${st.ui.nqTpl === 'blank' ? 1 : d.tracks}"></div>
              <div class="fld-group"><label class="fld" for="g-size">Students in the class</label><input class="input" id="g-size" type="number" min="2" max="60" value="${d.classSize}"></div>
              <div class="fld-group"><label class="fld" for="g-exp">Students per expert group</label><input class="input" id="g-exp" type="number" min="1" max="30" value="${d.expertGroup}"></div>
            </div>
            <p class="hint-note" style="margin:0" id="g-summary">${structSummary(st.ui.nqTpl === 'blank' ? 1 : d.tracks, d.classSize, d.expertGroup)}</p>
            <p class="hint-note" style="margin:0">You can add or remove tracks any time in the builder.</p>
            ${tq && tq.questDefaults ? `<p class="hint-note" style="margin:0">This example has ${d.tracks} written tracks; if you add more, the extra ones start empty.</p>` : ''}
            <div class="row"><button class="btn btn-primary" type="submit">Create quest</button><button class="btn btn-ghost" type="button" data-a="nq-back">Back</button></div>
          </form>`; })()}</div>` : ''}
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
          <div class="card wash-mint"><div class="eyebrow teal">Students joined</div><h2 style="font-size:40px">${Object.keys(st.seats).length}<small style="font-size:20px">/${SEED.participants.length}</small></h2><p style="margin:0">with class code <span class="mono">${esc(code)}</span></p></div>
          <div class="card wash-peach"><div class="eyebrow coral">Pending reviews</div><h2 style="font-size:40px">${String(pend).padStart(2, '0')}</h2><p style="margin:0">${pend ? 'Evidence, finales or discoveries waiting in the live room.' : 'Nothing waiting — all clear.'}</p></div>
          ${Partner.educatorCard(st)}
        </div>
      </div>`;
  }


  /* ---------------- quest builder: five guided steps, one at a time ---------------- */
  const BSTEPS = [['trip', 'The trip'], ['sources', 'Sources'], ['tracks', 'Tracks'], ['finale', 'Finale & extras'], ['publish', 'Check & publish']];
  function builderDone(st) {
    const q = st.quest, probs = SEED.contentProblems(st.content);
    return {
      trip: !!(q.title && q.venue && q.objective),
      sources: st.sources.some((x) => x.kind !== 'partner' && x.text),
      tracks: !probs.some((p) => /^(Track|Add at least)/.test(p)) && SEED.topics.every((t) => st.tracks[t] === 'APPROVED'),
      finale: !probs.some((p) => /^(Finale|Cards|Reflection)/.test(p)),
      publish: q.status === 'PUBLISHED',
    };
  }
  function teacherBuilder(st) {
    const q = st.quest, locked = q.status === 'PUBLISHED', dis = locked ? 'disabled' : '';
    const step = BSTEPS.some(([k]) => k === st.ui.bStep) ? st.ui.bStep : 'trip', i = BSTEPS.findIndex(([k]) => k === step), done = builderDone(st);
    const body = step === 'trip' ? builderTrip(st, dis, locked) : step === 'sources' ? builderSources(st)
      : step === 'tracks' ? Partner.requestsCard(st) + Assistant.tracks() : step === 'finale' ? Assistant.finale() + Assistant.story() + Assistant.collectibles() : builderPublish(st, dis, locked);
    return `
      ${pageHead(esc(q.title || 'Untitled quest'), 'Quest builder', `<button class="btn btn-ghost btn-sm" data-a="screen" data-screen="dashboard">${Art.icon('back', 15)} All quests</button>`)}
      ${locked ? `<div class="card wash-mint" style="padding:12px 16px"><strong>${Art.icon('check', 16)} Published.</strong> This quest is frozen so a live session isn’t disrupted — create a new quest to change it.</div>` : ''}
      <nav aria-label="Builder steps"><ol class="b-steps">${BSTEPS.map(([k, l], j) => `<li><button data-a="bstep" data-step="${k}" aria-current="${k === step ? 'step' : 'false'}" class="${done[k] ? 'done' : ''}"><b>${done[k] ? '✓' : j + 1}</b><span>${l}</span></button></li>`).join('')}</ol></nav>
      <div class="b-layout">
        <div class="stack b-body">
          ${body}
          <div class="row b-nav">${i > 0 ? `<button class="btn btn-ghost" data-a="bstep" data-step="${BSTEPS[i - 1][0]}">${Art.icon('back', 15)} ${BSTEPS[i - 1][1]}</button>` : ''}
            ${i < BSTEPS.length - 1 ? `<button class="btn btn-primary" data-a="bstep" data-step="${BSTEPS[i + 1][0]}" style="margin-left:auto">Next: ${BSTEPS[i + 1][1]} ${Art.icon('arrow', 15)}</button>` : ''}</div>
        </div>
        <aside class="b-side">${Assistant.chat()}</aside>
      </div>`;
  }
  function builderTrip(st, dis, locked) {
    const q = st.quest;
    return `<div class="card">
        <h3 style="margin:0 0 6px">What’s the trip?</h3>
        <div class="fld-group"><label class="fld" for="q-title">Name of the quest</label><input class="input" id="q-title" data-q="title" value="${esc(q.title)}" placeholder="e.g. The Lost Museum" ${dis}></div>
        <div class="fld-group"><label class="fld" for="q-obj">What should students learn?</label><input class="input" id="q-obj" data-q="objective" value="${esc(q.objective)}" placeholder="e.g. Tell the difference between what an object shows and what we guess" ${dis}></div>
        <div class="fld-group"><label class="fld" for="q-venue">Where are you going?</label><input class="input" id="q-venue" data-q="venue" value="${esc(q.venue)}" placeholder="e.g. The Fitzwilliam Museum, Cambridge" ${dis}></div>
        <div class="grid-3" style="gap:10px">
          <div class="fld-group"><label class="fld" for="q-aud">Who’s going?</label><select class="input" id="q-aud" data-q="audience" ${dis}>${Object.entries(SEED.AUDIENCES).map(([k, l]) => `<option value="${k}" ${(q.audience || {}).kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="fld-group"><label class="fld" for="q-ages">Ages</label><input class="input" id="q-ages" data-q="ages" value="${esc((q.audience || {}).ages || '')}" placeholder="e.g. 13–16" ${dis}></div>
          <div class="fld-group"><label class="fld" for="q-dur">Minutes on site</label><input class="input" id="q-dur" data-q="duration" type="number" min="10" max="480" step="5" value="${q.duration || 60}" ${dis}></div>
        </div>
      </div>
      <div class="card wash-lavender"><h3 style="margin:0 0 8px">How a WorldQuest works</h3>
        <ol class="b-how"><li>${Art.icon('lens', 18)}<span><strong>Explore.</strong> Each student becomes the expert on one <em>track</em> (one topic) and investigates it on site with the other experts.</span></li>
          <li>${Art.icon('voices', 18)}<span><strong>Teach.</strong> Back in their team, each expert teaches the others what they found.</span></li>
          <li>${Art.icon('puzzle', 18)}<span><strong>Solve.</strong> The team solves a final puzzle that needs everyone’s part.</span></li></ol></div>
      <form class="card" data-form="structure">
        <h3 style="margin:0 0 6px">How the class splits up</h3>
        <div class="grid-3" style="gap:10px">
          <div class="fld-group"><label class="fld" for="g-tracks">Tracks (topics)</label><input class="input" id="g-tracks" type="number" min="1" max="6" value="${st.quest.structure.tracks === 0 ? 0 : SEED.structure.tracks}" ${dis}></div>
          <div class="fld-group"><label class="fld" for="g-size">Students</label><input class="input" id="g-size" type="number" min="2" max="60" value="${SEED.structure.classSize}" ${dis}></div>
          <div class="fld-group"><label class="fld" for="g-exp">Experts who explore together</label><input class="input" id="g-exp" type="number" min="1" max="30" value="${SEED.structure.expertGroup}" ${dis}></div>
        </div>
        <p class="hint-note" style="margin:6px 0 8px" id="g-summary">${structSummary(SEED.structure.tracks, SEED.structure.classSize, SEED.structure.expertGroup)}</p>
        ${locked ? '' : '<button class="btn btn-secondary btn-sm" type="submit">Update teams</button>'}
      </form>`;
  }
  function builderSources(st) {
    return `${Assistant.sources()}
      <div class="card"><h3 style="margin:0 0 6px">${Art.icon('sparkle', 18)} Want a head start?</h3>
        <p style="margin:0">Add the pages or notes you trust, then ask the assistant to draft the whole quest from them. It uses only these sources, and nothing reaches students until you’ve checked and approved it.</p></div>`;
  }
  function builderPublish(st, dis, locked) {
    const q = st.quest, probs = SEED.contentProblems(st.content), p = sel.partnerProgress();
    const fix = (txt, step, track = '') => `<li class="b-todo"><span>${esc(txt)}</span>${locked ? '' : `<button class="btn btn-ghost btn-sm" data-a="bfix" data-step="${step}" data-track="${track}">Fix</button>`}</li>`;
    const todo = probs.filter((x) => !(q.structure.tracks === 0 && /^Track /.test(x))).map((x) => { const t = (x.match(/^Track ([A-F]):/) || [])[1];
      return t ? fix(`Track ${t} still needs: ${x.split(': ')[1]}`, 'tracks', t) : /^Give the quest/.test(x) ? fix(x, 'trip') : /^Add at least/.test(x) ? fix(x, 'tracks') : fix(x, 'finale'); });
    SEED.topics.filter((t) => st.tracks[t] !== 'APPROVED' && !probs.some((x) => x.startsWith(`Track ${t}:`))).forEach((t) => todo.push(fix(`Approve Track ${t} (${SEED.missions[t].name || 'untitled'})`, 'tracks', t)));
    return `<div class="card">
        <h3 style="margin:0 0 6px">Ready to publish?</h3>
        ${todo.length ? `<p class="hint-note" style="margin:0 0 6px">${todo.length} thing${todo.length > 1 ? 's' : ''} to do first:</p><ul class="b-todos">${todo.join('')}</ul>` : `<p style="margin:0 0 6px">${Art.icon('check', 16)} Every track, the finale and the extras are complete and approved.</p>`}
        <ul class="b-todos">
          <li class="b-todo"><span>Community partner: <strong>${p.signedOff ? 'signed off ✓' : p.open ? p.open + ' suggestion(s) waiting for you (Tracks step)' : !p.contributed ? 'hasn’t written their contribution yet' : `reviewing (${p.reviewed}/${p.items.length} parts)`}</strong></span>${p.signedOff ? '' : '<button class="btn btn-ghost btn-sm" data-a="screen" data-screen="dashboard">Partner link</button>'}</li>
          <li class="b-todo"><label><input type="checkbox" data-a="safety" ${q.safety ? 'checked' : ''} ${dis}> I’ve confirmed safety, supervision and the venue booking</label></li>
        </ul>
        <button class="btn btn-teal" data-a="publish" ${dis}>${locked ? 'Published ✓' : 'Publish to students'}</button>
      </div>
      ${Journey.builderCard(st)}
      <div class="card wash-mint">
        <div class="eyebrow teal">What students will see first</div>
        <div class="preview-phone">
          <div class="row" style="justify-content:space-between"><strong style="font-family:var(--font-display)">${Art.logo(26)} WorldQuest</strong><span class="pill lavender">Briefing</span></div>
          <h3 id="pv-title" style="margin-top:12px">${esc(q.title)}</h3>
          <p id="pv-obj" class="hint-note">${esc(q.objective)}</p>
          <div class="gallery-note" style="margin-bottom:10px"><h4>${Art.icon('map', 16)} <span id="pv-venue">${esc(q.venue)}</span></h4></div>
          <p class="hint-note" style="margin:0 0 8px">${esc(st.content.story.opening || 'Your story opening appears here.')}</p>
          <div class="row" style="margin-bottom:10px">${SEED.topics.map((t) => topicChip(t)).join('')}</div>
          <div class="card" style="padding:12px;background:var(--grad-collect);text-align:center"><strong>${Art.icon('puzzle', 16)} ${esc(SEED.finale.title)}</strong><br><small>Needs every track in the team</small></div>
        </div>
      </div>`;
  }

  /* ---------------- next real experience (educator) ---------------- */
  function structSummary(t, n, g) {
    t = Number(t); n = Number(n); g = Number(g);
    if (t === 0) return 'No tracks yet — add them in the Tracks step.';
    if (t < 2) return `${t} track so far — add at least one more before publishing, so students can teach each other.`;
    const teams = Math.ceil(n / t), last = n - (teams - 1) * t, gg = Math.max(1, Math.min(g, teams)), pl = (k, w) => `${k} ${w}${k === 1 ? '' : 's'}`;
    if (t >= 2 && teams > 1 && last === 1) return `The last home team would have just one student — try ${n - 1} or ${n + 1} students.`;
    return `${pl(teams, 'home team')} of ${t}${last < t ? ` (the last has ${last})` : ''} · each track has ${pl(teams, 'expert')}${teams > 1 ? `, visiting in groups of ${gg} (${pl(Math.ceil(teams / gg), 'group')} per station)` : ''}${gg < g ? ` · group size set to ${gg}` : ''}`;
  }



  function teacherTeams(st) {
    const viewExpert = st.ui.teamView === 'expert';
    return `
      <div class="stack">
        ${pageHead(esc(st.quest.title), 'Teams', `<div class="stage-tabs">
            <button data-a="teamview" data-view="home" aria-pressed="${!viewExpert}">${Art.icon('team', 15)}Home teams</button>
            <button data-a="teamview" data-view="expert" aria-pressed="${viewExpert}">${Art.icon('lens', 15)}Expert groups</button>
          </div>`)}
        <div class="card matrix" role="region" aria-label="${viewExpert ? 'Expert groups by track' : 'Home teams with their experts'}" tabindex="0">
          ${viewExpert ? expertMatrix(st) : homeMatrix(st)}
        </div>
        <p class="hint-note">${SEED.participants.length} explorers · ${SEED.homeGroups.length} home teams of up to ${SEED.topics.length} · same-track experts visit their station in groups of ${SEED.structure.expertGroup}. Tile colour = expertise; the small line is live evidence status.</p>
      </div>`;
  }

  function evShort(st, p) {
    const s = st.evidence[p.id].status;
    const map = { AVAILABLE: ['—', 'var(--muted)'], SUBMITTED: ['submitted', '#7A5A17'], VERIFIED: ['verified ✓', 'var(--success)'], NEEDS_REVISION: ['revise', 'var(--danger)'] };
    const [t, c] = map[s];
    return `<span class="mini-status" style="color:${c}">${t}</span>`;
  }

  function homeMatrix(st) {
    const cls = Object.fromEntries(SEED.topics.map((t) => [t, { violet: 'v', teal: 't', sun: 's', coral: 'c', sky: 'k', lime: 'l' }[SEED.topicMeta[t].color] || 'v']));
    return `<table><thead><tr><th scope="col">Track</th>${SEED.homeGroups.map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead>
      <tbody>${SEED.topics.map((t) => `<tr><th scope="row">${t} · ${esc(SEED.topicMeta[t].label)}</th>
        ${SEED.homeGroups.map((h) => { const p = SEED.expertOf(h, t); if (!p) return '<td>—</td>'; return `<td class="${cls[t]}">${esc(who(p).replace('Explorer ', 'Ex '))}${evShort(st, p)}</td>`; }).join('')}</tr>`).join('')}</tbody></table>`;
  }

  function expertMatrix(st) {
    const cls = Object.fromEntries(SEED.topics.map((t) => [t, { violet: 'v', teal: 't', sun: 's', coral: 'c', sky: 'k', lime: 'l' }[SEED.topicMeta[t].color] || 'v']));
    return `<table><thead><tr>${SEED.topics.map((t) => `<th scope="col">${t} · ${esc(SEED.topicMeta[t].name)}</th>`).join('')}</tr></thead>
      <tbody><tr>${SEED.topics.map((t) => { const ps = SEED.participants.filter((p) => p.topic === t), g = SEED.structure.expertGroup; const groups = []; for (let k = 0; k < ps.length; k += g) groups.push(ps.slice(k, k + g));
      return `<td class="${cls[t]}" style="vertical-align:top">${groups.map((grp, gi) => `<div class="exp-sub"><small class="hint-note">Group ${gi + 1}</small>${grp.map((p) => `<div>${esc(who(p).replace('Explorer ', 'Ex '))} <small>(${p.home})</small>${evShort(st, p)}</div>`).join('')}</div>`).join('')}</td>`; }).join('')}</tr></tbody></table>`;
  }

  function teacherLive(st) {
    const evQ = sel.pendingEvidence();
    const finQ = sel.pendingFinales();
    const bonusQ = sel.pendingBonus();
    const idx = sel.phaseIndex();
    return `
      <div class="stack">
        ${pageHead(esc(st.quest.title), 'Live session', `<button class="btn btn-secondary btn-sm" data-a="show-code">${Art.icon('team', 15)} Show class code</button><button class="btn btn-secondary btn-sm" data-a="qr-cards">${Art.icon('map', 15)} Station QR cards</button>`)}
        <div class="card">
          <div class="spread">
            <h3 style="margin:0">Phase: ${esc(SEED.phaseMeta[st.phase].label)}</h3>
            <div class="row">
              <button class="btn btn-secondary btn-sm" data-a="rewind" ${idx === 0 ? 'disabled' : ''}>${Art.icon('back', 15)} Back</button>
              <button class="btn btn-primary btn-sm" data-a="advance" ${idx >= SEED.phases.length - 1 ? 'disabled' : ''}>Advance phase ${Art.icon('arrow', 15)}</button>
            </div>
          </div>
          <div class="path-steps" style="margin-top:8px">
            ${SEED.phases.map((ph, i) => `<div class="path-step ${i < idx ? 'done' : i === idx ? 'now' : ''}"><div class="path-dot">${i < idx ? Art.icon('check', 17) : i + 1}</div><small>${esc(SEED.phaseMeta[ph].label)}</small></div>`).join('')}
          </div>
          <p class="hint-note" style="margin:10px 0 0">${esc(SEED.phaseMeta[st.phase].desc)} ${st.phase === 'LOBBY' && st.quest.status !== 'PUBLISHED' ? '· Publish the quest first (Quest builder).' : ''}</p>
        </div>

        ${Partner.flagsCard(st)}
        ${Journey.liveCard(st)}
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
              ${finQ.length === 0 ? `<p class="hint-note" style="margin:0">Teams’ finale answers appear here for you to check.</p>` : ''}
              ${finQ.map((h) => { const f = st.finale[h];
                return `<form class="queue-row" data-form="finale-review" data-home="${h}" style="display:block"><strong>Team ${h}</strong>
                  ${(SEED.finale.steps || []).map((x, i) => { const a = f.answers[x.id] || {};
                    return x.type === 'choice' ? `<p class="hint-note" style="margin:6px 0 0">Step ${i + 1} · ${esc(x.question)} — ${a.done ? `✓ ${a.tries > 1 ? `after ${a.tries} tries` : 'first try'}` : 'not answered'}</p>`
                      : `<p style="margin:8px 0 2px"><strong>Step ${i + 1} · ${esc(x.prompt)}</strong></p><div class="evidence-quote">${esc(a.text || '')}</div>
                        <div class="rubric-row" style="margin-top:6px">${(x.checks || []).map((c, k) => `<label><input type="checkbox" name="rub" value="${x.id}:${k}">${esc(c)}</label>`).join('')}</div>`; }).join('')}
                  <div class="row" style="gap:8px;margin-top:10px"><button class="btn btn-teal btn-sm" type="submit">${Art.icon('check', 15)} Approve</button>
                    <input class="input" id="fr-note-${h}" placeholder="Note if you send it back" style="flex:1;min-width:140px">
                    <button class="btn btn-danger-ghost btn-sm" type="button" data-a="return-finale" data-home="${h}">Send back</button></div></form>`;
              }).join('')}
            </div>
            <div class="card">
              <div class="spread"><h3>${Art.icon('trophy', 18)} Bonus discoveries</h3><span class="pill lavender">${sel.claimedCount()}/${SEED.collectibles.length} found</span></div>
              ${bonusQ.length === 0 ? `<p class="hint-note" style="margin:0">Teams’ bonus activities appear here from the finale on. Approving twice can never give a card twice.</p>` : ''}
              ${bonusQ.map((x) => `<div class="queue-row"><div class="meta"><strong>${esc(x.card.title)}</strong> <small>team ${x.home}${x.b.simulated ? ' · SIMULATED' : ''}</small>
                <div class="evidence-quote">${esc(x.b.answer)}</div></div>
                <button class="btn btn-sun btn-sm" data-a="approve-bonus" data-card="${x.card.id}" data-home="${x.home}">${Art.icon('sparkle', 15)} Approve</button></div>`).join('')}
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
    const shares = SEED.homeGroups.reduce((n, h) => n + SEED.topicsFor(h).filter((t) => st.peerTeach[h][t].shared).length, 0);
    const teachTotal = SEED.homeGroups.reduce((n, h) => n + SEED.topicsFor(h).length, 0);
    const fins = SEED.homeGroups.filter((h) => st.finale[h].status === 'APPROVED').length;
    const refl = Object.entries(st.reflections);
    return `
      <div class="stack">
        ${pageHead(esc(st.quest.title), 'Report', SEED.participants.some((p) => st.evidence[p.id].simulated) ? '<span class="pill">includes simulated classmates</span>' : '')}
        <div class="grid-3">
          <div class="card wash-lavender"><div class="eyebrow">Evidence verified</div><h2 style="font-size:38px">${verified.length}/${SEED.participants.length}</h2><p style="margin:0">${simCount ? simCount + ' marked SIMULATED' : 'all from live demo play'}</p></div>
          <div class="card wash-mint"><div class="eyebrow teal">Perspectives taught</div><h2 style="font-size:38px">${shares}/${teachTotal}</h2><p style="margin:0">teach-backs across ${SEED.homeGroups.length} home teams</p></div>
          <div class="card wash-peach"><div class="eyebrow coral">Finales approved</div><h2 style="font-size:38px">${fins}/${SEED.homeGroups.length}</h2><p style="margin:0">cards claimed: ${sel.claimedCount()}/${SEED.collectibles.length} · master: ${st.master ? 'unlocked' : 'locked'}</p></div>
        </div>
        <div class="card"><h3>By home team</h3><div class="matrix"><table><thead><tr><th scope="col">Team</th><th scope="col">Evidence verified</th><th scope="col">Perspectives taught</th><th scope="col">Finale</th><th scope="col">Partner feedback</th></tr></thead><tbody>
          ${SEED.homeGroups.map((h) => { const mem = SEED.homeMembers(h); return `<tr><th scope="row">${h}</th><td>${mem.filter((p) => st.evidence[p.id].status === 'VERIFIED').length}/${mem.length}</td><td>${SEED.topicsFor(h).filter((t) => st.peerTeach[h][t].shared).length}/${SEED.topicsFor(h).length}</td><td>${statusChip(st.finale[h].status)}</td><td>${st.partnerFeedback[h] ? '✓' : '—'}</td></tr>`; }).join('')}
          </tbody></table></div></div>
        ${typeof Insights !== 'undefined' ? Insights.section(st) : ''}
        <div class="card"><h3>What students explained (live, not simulated)</h3>
          ${(() => { const live = verified.filter((p) => !st.evidence[p.id].simulated); return live.length === 0 ? '<p class="hint-note" style="margin:0">Verified evidence from real students appears here, with their own words.</p>'
            : live.map((p) => { const m = SEED.missions[p.topic], a = st.evidence[p.id].answers || {}; return `<div class="evidence-quote" style="margin-bottom:8px"><strong>${esc(who(p))}</strong> · ${topicChip(p.topic)}<br>${m.evidenceFields.slice(-2).map((f) => `<em>${esc(f.label)}:</em> ${esc(a[f.key])}`).join('<br>')}</div>`; }).join(''); })()}
          <p class="hint-note" style="margin-top:10px" hidden>Look for misconceptions in the last field: does the student state a limit of the evidence, or overclaim?</p></div>
        <div class="card">
          <h3>Student reflections (${refl.length})</h3>
          ${refl.length === 0 ? '<p class="hint-note" style="margin:0">Individual reflections appear here after the reflection phase.</p>'
            : refl.map(([pid, a]) => `<div class="evidence-quote" style="margin-bottom:8px"><strong>${esc(who(SEED.byId[pid]))}</strong><br>${(a || []).filter(Boolean).map((x) => `“${esc(x)}”`).join(' · ')}</div>`).join('')}
          <p class="hint-note" style="margin-top:12px">This report shows demonstration workflow data only — no learning-impact claims. A production build adds pre/post observation-vs-inference checks and per-group participation counts.</p>
        </div>
      </div>`;
  }

  /* ================= collaborator ================= */

  function collaboratorView(st) {
    const TITLES = { overview: 'Overview', contribution: 'My contribution', review: 'Review the quest', facilitate: 'On the day', work: 'Student work' };
    const screen = TITLES[st.ui.screen] ? st.ui.screen : 'overview';
    const questLevel = ['overview', 'contribution', 'review'].includes(screen);
    const pqId = questLevel && st.ui.pq && st.library[st.ui.pq] ? st.ui.pq : st.activeQuest;
    const pq = pqId === st.activeQuest ? st.quest : st.library[pqId].quest;
    const picker = questLevel && Object.keys(st.library).length > 1 ? `<label class="sr-only" for="pq-sel">Quest</label><select class="input" id="pq-sel" data-a="pq-sel" style="width:auto;min-width:200px">${Object.entries(st.library).map(([id, r]) => `<option value="${id}" ${id === pqId ? 'selected' : ''}>${esc((id === st.activeQuest ? st.quest : r.quest).title)}${id === st.activeQuest ? ' (this class)' : ''}</option>`).join('')}</select>` : '';
    return `
      <div class="stack">
        ${pageHead(`Community partner · ${esc(pq.title)}`, TITLES[screen], picker, 'coral')}
        ${screen === 'overview' ? Partner.overview(st, pqId) : screen === 'contribution' ? Partner.contribution(st, pqId) : screen === 'review' ? Partner.review(st, pqId)
          : screen === 'facilitate' ? facilitateScreen(st, sel.pendingInteractions()) : Partner.quotes(st) + partnerWork(st)}
      </div>`;
  }


  function partnerWork(st) {
    const homes = SEED.homeGroups.filter((h) => ['SUBMITTED', 'APPROVED'].includes(st.finale[h].status));
    return `<div class="card"><div class="eyebrow coral">Partner feedback</div><h3>Teams’ finale answers</h3>
      <p class="hint-note">When you have time, share what students understood well and one thing to reconsider. Your feedback is a perspective, not a grade.</p>
      ${homes.length === 0 ? '<p class="hint-note" style="margin:0">Teams’ answers appear here once they send their finale.</p>' : ''}
      <div class="stack" style="gap:12px">${homes.map((h) => { const f = st.finale[h], fb = st.partnerFeedback[h];
        const written = (SEED.finale.steps || []).filter((x) => x.type === 'write').map((x) => (f.answers[x.id] || {}).text).filter(Boolean);
        return `<div class="queue-row" style="display:block"><div class="spread"><strong>Team ${h}</strong>${statusChip(f.status)}</div>
          <div class="evidence-quote" style="margin:8px 0">${written.map(esc).join('<br>') || '—'}</div>
          ${fb ? `<div class="card wash-mint" style="padding:10px 14px"><strong>Your feedback:</strong> ${esc(fb.text)}</div>` :
          `<form class="row" data-form="partner-fb" data-home="${h}"><label class="sr-only" for="fb-${h}">Feedback for team ${h}</label><input class="input" id="fb-${h}" placeholder="Your response to team ${h}…" style="flex:1;min-width:180px"><button class="btn btn-teal btn-sm" type="submit">Send</button></form>`}</div>`; }).join('')}</div></div>`;
  }

  function facilitateScreen(st, pendD) {
    const promptIdx = st.contributor.interactionPrompt || 0;
    const hasConversations = SEED.topics.some((t) => SEED.missions[t].needsFacilitator);
    const toCheck = sel.pendingEvidence().filter((p) => (SEED.missions[p.topic].assess || {}).verify === 'partner');
    return `
      <div class="card">
        <div class="eyebrow coral">${st.phase === 'LOBBY' ? 'Before the session starts' : 'Session in progress'}</div>
        <p style="margin:6px 0 0">${!hasConversations ? 'This quest has no arranged conversation activity. You can still review student work after it is submitted.' : st.phase === 'LOBBY' ? 'The educator has not started the session yet. Choose a discussion question while you wait.' : 'Meet students as arranged with the educator. Put your device away while you talk, then return to confirm participation.'}</p>
      </div>
      ${toCheck.length ? `<div class="card"><div class="spread"><h3>${Art.icon('check', 18)} Evidence for you to verify</h3><span class="pill peach">${toCheck.length}</span></div>
        <div class="stack" style="gap:10px">${toCheck.map((p) => { const m = SEED.missions[p.topic], ev = st.evidence[p.id]; return `<div class="queue-row"><div class="meta"><strong>${esc(who(p))}</strong> · ${esc(m.name)}
          ${ev.photo ? `<img class="ev-photo" src="${ev.photo}" alt="Photo submitted by ${esc(who(p))}">` : ''}${ev.quiz ? `<p class="hint-note" style="margin:4px 0">Quick check: ${ev.quiz.score}/${ev.quiz.total}</p>` : ''}
          ${m.assess.evidence === 'photo' ? '' : `<dl class="evidence-quote">${m.evidenceFields.map((f) => `<dt>${esc(f.label)}</dt><dd>${esc(ev.answers[f.key])}</dd>`).join('')}</dl>`}</div>
          <div class="stack" style="gap:8px"><button class="btn btn-teal btn-sm" data-a="pverify-ev" data-pid="${p.id}">${Art.icon('check', 15)} Verify</button><button class="btn btn-danger-ghost btn-sm" data-a="preturn-ev" data-pid="${p.id}">Needs revision</button></div></div>`; }).join('')}</div></div>` : ''}
      <div class="grid-2">
        <div class="card">
          <div class="eyebrow coral">Prepare to talk</div>
          <h3>Choose a discussion question</h3>
          <p class="hint-note">Students in the conversation activity will see the selected question. Use it to start your in-person conversation.</p>
          ${(st.contributor.prompts || SEED.contributor.prompts).map((p, i) => `<button type="button" class="tile-pick" data-a="prompt" data-i="${i}" aria-pressed="${promptIdx === i}">${promptIdx === i ? '<span class="pill mint">Selected question</span> ' : ''}${esc(p)}</button>`).join('')}
          <p class="hint-note">Read the question, then put your device away and talk. Confirm afterwards.</p>
          <details class="partner-disclosure" style="margin-top:10px"><summary>${Art.icon('pencil', 14)} Edit questions</summary>
            <form class="stack" data-form="partner-prompts" style="gap:8px;margin-top:10px">${Assistant.listEd('pp', st.contributor.prompts || SEED.contributor.prompts, 'A question for students', 'Add a question')}
            <button class="btn btn-secondary btn-sm" type="submit" style="align-self:flex-start">Save questions</button></form></details>
          <details class="partner-disclosure" style="margin-top:10px"><summary>How students use your contribution</summary><p class="hint-note">Students record your perspective in their own words and share it with their team. You can check their understanding later in "Student work".</p></details>
        </div>
        <div class="card">
          <h3>${Art.icon('handshake', 19)} Confirm completed conversations</h3>
          <p class="hint-note">After speaking with students, confirm who took part below.</p>
          ${hasConversations && st.phase === 'LOBBY' ? '<p class="hint-note" style="margin:0">Waiting for the educator to start. Students will appear here when the session begins.</p>' : ''}
          ${!hasConversations ? '<p class="hint-note" style="margin:0">No conversations are planned for this quest.</p>' : pendD.length === 0 && st.phase !== 'LOBBY' ? '<p class="hint-note" style="margin:0">All arranged conversations have been confirmed.</p>' : ''}
          <div class="stack" style="gap:10px">
            ${pendD.map((p) => `<div class="queue-row"><div class="meta"><strong>${esc(who(p))}</strong><br><small>Home ${p.home} · Expert ${p.topic} · ${esc(SEED.missions[p.topic].gallery)}</small></div>
              <button class="btn btn-teal btn-sm" data-a="verify-int" data-pid="${p.id}">${Art.icon('check', 15)} Confirm conversation</button></div>`).join('')}
          </div>
          <p class="hint-note" style="margin-top:12px">Only confirm students you have spoken with.</p>
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
            <div class="eyebrow sun">${SEED.collectibles.length} / ${SEED.collectibles.length} discoveries · class award</div>
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
    if (typeof Insights !== 'undefined') Insights.bind(root);
    if (typeof Journey !== 'undefined') Journey.bind(root);
    root.querySelectorAll('[data-fwrite]').forEach((t) => t.addEventListener('change', () => { const me = SEED.byId[S().ui.student]; Engine.dispatch('finaleWrite', { home: me.home, stepId: t.dataset.fwrite, text: t.value }); }));
    if (typeof Partner !== 'undefined') Partner.bind(root);
    root.querySelectorAll('[data-a]').forEach((el) => {
      const a = el.dataset.a;
      if (a === 'pq-sel') { el.addEventListener('change', () => { S().ui.pq = el.value; render(); }); return; }
      if (a === 'student-sel') {
        el.addEventListener('change', () => { S().ui.demoPlay = el.value; markJoined(el.value); act('setStudent', { id: el.value }); });
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
          case 'award-card': return act('awardCollectible', { collectibleId: el.dataset.card, home: el.dataset.home });
          case 'show-code': return JoinCode.open(sessionCode(), S().quest.title);
          case 'demo-toggle': S().ui.demoOpen = !S().ui.demoOpen; render(); return;
          case 'safety': return act('updateQuest', { field: 'safety', value: el.checked }), render();
          case 'tamper': return typeof Sync !== 'undefined' && Sync.tamperTest().then((r) => toast(r.msg, r.ok ? 'success' : 'error'));
          case 'scan-station': {
            const me = SEED.byId[S().ui.student], m = SEED.missions[me.topic];
            return Scanner.open({ title: `Scan the ${m.name} clue card`, hint: `It’s at ${m.gallery}. Your teacher can read you the backup code if the camera won’t work.`,
              onCode: (code) => act('checkIn', { participantId: me.id, code }).ok });
          }
          case 'lookup': return act('setLookUp', { on: true });
          case 'lookup-off': return act('setLookUp', { on: false });
          case 'teach-open': S().ui.teachTopic = el.dataset.topic; render(); return;
          case 'teach-ask': { const me = SEED.byId[S().ui.student]; return act('askTeachCheck', { home: me.home, topic: el.dataset.topic, by: me.id }); }
          case 'teach-close': S().ui.teachTopic = null; render(); return;
          case 'fchoice': { const me = SEED.byId[S().ui.student]; return act('finaleChoice', { home: me.home, stepId: el.dataset.step, optionId: el.dataset.opt }); }
          case 'submit-finale': { const me = SEED.byId[S().ui.student]; root.querySelectorAll('[data-fwrite]').forEach((t) => Engine.dispatch('finaleWrite', { home: me.home, stepId: t.dataset.fwrite, text: t.value })); return act('submitFinale', { home: me.home }); }
          case 'card-info': {
            const c = SEED.collectibles.find((x) => x.id === el.dataset.card);
            const claimed = S().claims[c.id];
            toast(claimed ? `${c.title} — ${c.fact}` : `${c.hidden ? 'A hidden card' : c.title}: not found yet.`, 'success');
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
          case 'return-finale': return act('reviewFinale', { home: el.dataset.home, approve: false, note: (document.getElementById('fr-note-' + el.dataset.home) || {}).value || '' });
          case 'approve-bonus': return act('approveBonus', { collectibleId: el.dataset.card, home: el.dataset.home });
          case 'sim-class': return act('simulateClassmates');
          case 'sim-bonus': return act('simulateBonusSubmissions');
          case 'approve-contrib': return act('approveContribution', { questId: el.dataset.qid });
          case 'bstep': S().ui.bStep = el.dataset.step; Assistant.openEditor(null); render(); window.scrollTo(0, 0); return;
          case 'bfix': S().ui.bStep = el.dataset.step; Assistant.openEditor(el.dataset.track || null); render(); window.scrollTo(0, 0); return;
          case 'new-quest': S().ui.newQuest = true; S().ui.nqTpl = null; render(); return;
          case 'new-quest-x': S().ui.newQuest = false; S().ui.nqTpl = null; render(); return;
          case 'nq-pick': S().ui.nqTitle = (document.getElementById('nq-title') || {}).value || ''; S().ui.nqTpl = el.dataset.tpl; render(); return;
          case 'nq-back': S().ui.nqTpl = null; render(); return;
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
    const gs = root.querySelector('form[data-form="structure"], form[data-form="new-quest"]');
    if (gs) gs.addEventListener('input', () => { const v = (id) => gs.querySelector('#' + id).value; const out = document.getElementById('g-summary'); if (out && Number(v('g-tracks')) >= 1 && Number(v('g-size')) >= 1 && Number(v('g-exp')) >= 1) out.textContent = structSummary(v('g-tracks'), v('g-size'), v('g-exp')); });
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
        if (kind === 'partner-prompts') { act('setPartnerPrompts', { prompts: Assistant.readList(form, 'pp') }); return; }
        if (kind === 'partner-q') { const r = act('addPartnerPrompt', { text: form.querySelector('#pq').value }); return; }
        if (kind === 'partner-fb') { act('partnerFeedback', { home: form.dataset.home, text: form.querySelector('input').value }); return; }
        if (kind === 'new-quest') {
          const v = (id) => Number(form.querySelector('#' + id).value), tpl = S().ui.nqTpl;
          const r = act('createQuest', { template: tpl === 'ai' ? 'blank' : tpl, title: S().ui.nqTitle || '', structure: { tracks: v('g-tracks'), classSize: v('g-size'), expertGroup: v('g-exp') } });
          if (!r.ok) return;
          S().ui.newQuest = false; S().ui.nqTpl = null; S().ui.nqTitle = ''; S().ui.screen = 'builder'; S().ui.bStep = tpl === 'ai' ? 'sources' : 'trip'; render();
          if (tpl === 'ai') toast(Assistant.getMode() === 'live' ? 'Add your sources and check the quest settings, then press “Generate the whole quest”.' : 'Live AI is off — switch the assistant’s “AI” button to live to generate, or write the tracks yourself.', 'success');
          return;
        }
        if (kind === 'structure') {
          const v = (id) => Number(form.querySelector('#' + id).value);
          act('setStructure', { tracks: v('g-tracks'), classSize: v('g-size'), expertGroup: v('g-exp') });
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
          act('submitBonus', { collectibleId: form.dataset.card, home: form.dataset.home, answer: form.querySelector('[name="answer"]').value });
        } else if (kind === 'reflection') {
          const me = SEED.byId[S().ui.student];
          act('submitReflection', { participantId: me.id, answers: SEED.reflection.map((q, i) => (form.querySelector(`[name="r${i}"]`) || {}).value || '') });
        } else if (kind === 'contribution') {
          const v = (id) => (form.querySelector('#' + id) || {}).value;
          const r = act('saveContribution', { questId: form.dataset.qid, text: v('contrib'), avoid: v('c-avoid'), availability: v('c-avail'), name: v('pt-name'), org: v('pt-org'),
            credit: (form.querySelector('[name="credit"]:checked') || {}).value });
          if (r.ok && form.querySelector('[data-le="pp"], [data-list="pp"]') && (!form.dataset.qid || form.dataset.qid === S().activeQuest)) Engine.dispatch('setPartnerPrompts', { prompts: Assistant.readList(form, 'pp') });
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
      d('updateQuest', { field: 'safety', value: true });
      sel.partnerItems().forEach((item) => d('reviewItem', { item }));
      d('approveContribution');
      SEED.topics.forEach((t) => d('approveTrack', { topic: t }));
      d('publishQuest');
      const j = d('joinClass', { nick: 'Demo explorer' });
      if (j && j.pid) { markJoined(j.pid, 'Demo explorer'); d('setStudent', { id: j.pid }); }
      d('advancePhase'); // BRIEFING
      if (['expert', 'teach', 'finale', 'album3', 'album5'].includes(fast)) d('advancePhase'); // EXPERT
      if (fast !== 'expert' && fast !== 'briefing') {
        // verify the active explorer's own evidence, then seed classmates (SIMULATED)
        const me = SEED.byId[Engine.state.ui.student];
        const answers = {};
        SEED.missions[me.topic].evidenceFields.forEach((f) => (answers[f.key] = '[Demo answer] ' + f.label));
        if (SEED.missions[me.topic].needsFacilitator) d('verifyInteraction', { participantId: me.id });
        d('checkIn', { participantId: me.id, code: SEED.missions[me.topic].backupCode });
        d('submitEvidence', { participantId: me.id, answers });
        d('reviewEvidence', { participantId: me.id, verdict: 'VERIFIED', reviewer: 'teacher' });
        d('simulateClassmates');
        d('advancePhase'); // PEER_TEACH
      }
      if (['finale', 'album3', 'album5'].includes(fast)) {
        const me = SEED.byId[Engine.state.ui.student];
        const checker = SEED.homeMembers(me.home).find((p) => p.id !== me.id);
        const answer = SEED.peerTeaching.checkOptions[me.topic].find((o) => o.correct);
        d('askTeachCheck', { home: me.home, topic: me.topic, by: me.id });
        d('shareTeachBack', { home: me.home, topic: me.topic, checkerId: checker.id, answerId: answer.id });
        d('advancePhase'); // FINALE
      }
      if (fast === 'album3' || fast === 'album5') {
        d('simulateBonusSubmissions');
        const n = fast === 'album5' ? SEED.collectibles.length : 3; // album5 = every card
        const home = SEED.byId[Engine.state.ui.student].home;
        SEED.collectibles.slice(0, n).forEach((c) => { if (sel.cardScope(c) === 'team') d('awardCollectible', { collectibleId: c.id, home }); });
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
  window.WQ = { act, toast, render, pageHead };
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
      const me = SEED.byId[S().ui.student], card = SEED.collectibles.find((c) => c.kind === 'egg' && !sel.hasCard(c, me.id));
      if (joinedHere(S()) && card) act('foundEgg', { participantId: me.id });
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
