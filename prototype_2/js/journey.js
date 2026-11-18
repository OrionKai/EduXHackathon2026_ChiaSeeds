/* WorldQuest: the class journey — an ordered programme of WorldQuest quests, real experiences
 * (booked with a provider) and classroom sessions. Each step opens by a rule the educator picks:
 * when the previous step is done, when the educator opens it, or on a date. Students see what's
 * done, what's now and what's next. Engine actions: addStep, updateStep, removeStep, moveStep,
 * openStep, markStepDone, sendBooking, providerReply, acceptCounter, experienceCheckIn.
 */
const Journey = (() => {
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TYPE = { quest: ['map', 'WorldQuest'], experience: ['handshake', 'Real experience'], class: ['book', 'In class'] };
  const OPENS = { after: 'When the step before is done', manual: 'When I open it', date: 'On a date' };
  const BOOK = { none: ['plain', 'not booked yet'], sent: ['peach', 'waiting for provider'], counter: ['peach', 'new time suggested'], declined: ['peach', 'declined'], accepted: ['mint', 'booked'] };
  const steps = () => Engine.state.journey.steps;
  const nameOf = (st, id) => (st.seats[id] ? st.seats[id].nick : (SEED.byId[id] || {}).name || id);
  const ui = () => Engine.state.ui;
  const stateLabel = (s) => ({ done: ['mint', 'Done'], open: ['lavender', 'Open'], waiting: ['peach', 'Booking not confirmed'], locked: ['plain', 'Locked'] }[s.state]);

  /* ---------------- educator: the Journey screen ---------------- */
  function teacher(st) {
    const code = typeof Sync !== 'undefined' ? Sync.state.session : '';
    const list = steps();
    return `${window.WQ.pageHead(`Class code <span class="mono">${esc(code)}</span>`, 'Journey')}
      <p class="hint-note" style="margin:0 0 6px">Plan the class’s programme in order. Each step opens when you choose; students always see what’s next.</p>
      <ol class="journey">${list.map((x, i) => addSlot(i) + stepCard(st, x, i)).join('')}${addSlot(list.length)}</ol>`;
  }

  function addSlot(i) {
    if (ui().jAdd !== i) return `<li class="j-add"><button class="btn btn-ghost btn-sm" data-j="add-open" data-i="${i}">${Art.icon('plus', 14)} Add a step here</button></li>`;
    return `<li class="j-add open"><div class="card j-addcard"><strong>Add a step</strong>
      <div class="row" style="gap:8px;margin-top:8px">${Object.entries(TYPE).map(([t, [ic, lb]]) => `<button class="btn btn-secondary btn-sm" data-j="add" data-type="${t}" data-i="${i}">${Art.icon(ic, 15)} ${lb}</button>`).join('')}
      <button class="btn btn-ghost btn-sm" data-j="add-close">Cancel</button></div></div></li>`;
  }

  function stepCard(st, x, i) {
    const s = Engine.sel.stepState(i), [cls, lab] = stateLabel(s), [ic, typeLabel] = TYPE[x.type];
    const isActive = x.type === 'quest' && x.questId === st.activeQuest, live = st.phase !== 'LOBBY';
    const meta = [x.when, x.where, i === 0 ? 'First step' : 'Opens: ' + (OPENS[x.opens] || OPENS.after).toLowerCase() + (x.opens === 'date' && x.date ? ' (' + x.date + ')' : '')].filter(Boolean).join(' · ');
    const expanded = ui().jOpen === x.id;
    return `<li class="j-step j-${s.state}">
      <div class="j-dot" aria-hidden="true">${s.state === 'done' ? Art.icon('check', 16) : Art.icon(ic, 16)}</div>
      <div class="card j-card">
        <div class="spread"><div><div class="eyebrow">Step ${i + 1} · ${typeLabel}</div><h3 style="margin:2px 0 0">${esc(Engine.sel.stepTitle(x))}</h3></div>
          <div class="row" style="gap:6px">${x.type === 'experience' ? `<span class="pill ${BOOK[x.exp.status][0]}">${BOOK[x.exp.status][1]}</span>` : ''}<span class="pill ${cls}">${lab}</span></div></div>
        <p class="hint-note" style="margin:6px 0 0">${esc(meta)}${s.why ? ` · ${esc(s.why)}` : ''}</p>
        ${x.type === 'experience' && s.state !== 'done' && Object.keys(x.checkins).length ? `<p style="margin:6px 0 0"><strong>${Object.keys(x.checkins).length}</strong> checked in</p>` : ''}
        <div class="row j-actions">
          <button class="btn btn-secondary btn-sm" data-j="toggle" data-id="${x.id}" aria-expanded="${expanded}">${expanded ? 'Close' : x.type === 'experience' ? 'Details & booking' : 'Details'}</button>
          ${x.type === 'quest' ? (isActive ? `<button class="btn btn-ghost btn-sm" data-a="edit-quest" data-id="${esc(x.questId)}">${Art.icon('pencil', 14)} Edit quest</button>`
            : `<button class="btn btn-ghost btn-sm" data-j="use" data-id="${x.id}" ${live ? 'disabled title="End the live session first"' : ''}>Run with my class</button>`) : ''}
          ${s.state === 'locked' || s.state === 'waiting' ? `<button class="btn btn-ghost btn-sm" data-j="open-ask" data-id="${x.id}">Open now</button>` : ''}
          ${s.state === 'done' ? `<button class="btn btn-ghost btn-sm" data-j="undone" data-id="${x.id}">Mark not done</button>` : s.state === 'open' ? `<button class="btn btn-ghost btn-sm" data-j="done" data-id="${x.id}">${Art.icon('check', 14)} Mark done</button>` : ''}
          <span class="j-move"><button class="btn btn-ghost btn-sm" data-j="up" data-id="${x.id}" aria-label="Move step ${i + 1} up" ${i === 0 ? 'disabled' : ''}>↑</button><button class="btn btn-ghost btn-sm" data-j="down" data-id="${x.id}" aria-label="Move step ${i + 1} down" ${i === steps().length - 1 ? 'disabled' : ''}>↓</button>
          <button class="btn btn-danger-ghost btn-sm" data-j="remove" data-id="${x.id}" ${steps().length <= 1 ? 'disabled' : ''}>Remove</button></span>
        </div>
        ${ui().jOpenNow === x.id ? `<div class="row" style="margin-top:8px"><label class="sr-only" for="j-reason">Reason</label><input class="input" id="j-reason" placeholder="${x.opens === 'after' ? 'Why open it early? (shown to students)' : 'Note (optional)'}" style="flex:1;min-width:180px"><button class="btn btn-primary btn-sm" data-j="open" data-id="${x.id}">Open for the class</button></div>` : ''}
        ${expanded ? details(st, x, i) : ''}
      </div></li>`;
  }

  function details(st, x, i) {
    const when = SEED.splitWhen(x);
    const inp = (id, label, v, ph = '', type = 'text') => `<div class="fld-group"><label class="fld" for="${id}">${label}</label><input class="input" id="${id}" type="${type}" value="${esc(v)}" placeholder="${esc(ph)}"></div>`;
    const S2 = Engine.studioState, quests = Object.entries(S2.library).map(([id, r]) => [id, (id === S2.activeQuest ? S2.quest : r.quest).title || 'Untitled quest']);
    return `<form class="stack j-form" data-jform="${x.id}" style="gap:6px;margin-top:12px">
      ${x.type === 'quest' ? `<div class="fld-group"><label class="fld" for="j-q">Quest</label><select class="input" id="j-q">${quests.map(([id, t]) => `<option value="${id}" ${id === x.questId ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>`
        : inp('j-title', x.type === 'experience' ? 'Activity' : 'Session title', x.type === 'experience' ? x.exp.activity : x.title, x.type === 'experience' ? 'e.g. Still-life drawing class' : 'e.g. Debrief and exit ticket')}
      <div class="grid-3" style="gap:8px">${inp('j-wdate', 'Date', when.date, '', 'date')}${inp('j-wtime', 'Time', when.time, '', 'time')}${inp('j-where', 'Where', x.where, x.type === 'class' ? 'e.g. Room 12' : 'e.g. Riverside Art Studio')}</div>
      ${i > 0 ? `<div class="grid-2" style="gap:8px"><div class="fld-group"><label class="fld" for="j-opens">Opens</label><select class="input" id="j-opens">${Object.entries(OPENS).map(([k, l]) => `<option value="${k}" ${x.opens === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div data-j-datebox ${x.opens === 'date' ? '' : 'hidden'}>${inp('j-date', 'Opens for students on', x.date, '', 'date')}</div></div>` : ''}
      ${x.type === 'experience' ? `<div class="grid-3" style="gap:8px">${inp('j-prov', 'Provider', x.exp.provider, 'Who runs it')}${inp('j-org', 'Organisation', x.exp.org)}${inp('j-mail', 'Their email', x.exp.email, 'name@example.org', 'email')}</div>
        ${inp('j-bring', 'Students bring', x.exp.bring, 'e.g. their field notes')}${inp('j-fb', 'If the provider cancels', x.exp.fallback)}${inp('j-staff', 'Supervising adults', x.exp.staff)}` : ''}
      ${x.type === 'class' ? `<div class="fld-group"><label class="fld" for="j-note">Plan / notes</label><textarea class="input" id="j-note" rows="2">${esc(x.note)}</textarea></div>` : ''}
      <button class="btn btn-primary btn-sm" type="submit" style="align-self:flex-start">Save step</button>
    </form>
    ${x.type === 'experience' ? booking(st, x, i) : ''}`;
  }

  function booking(st, x, i) {
    const n = x.exp, stage = n.status === 'accepted' ? 3 : n.status === 'none' ? 1 : 2, draft = ui().jDraft && ui().jDraft[x.id] != null ? ui().jDraft[x.id] : n.request;
    const s = Engine.sel.stepState(i), code = ('WQ-' + x.id).toUpperCase(), checked = Object.keys(x.checkins), when = SEED.splitWhen(x);
    const how = (ui().jHow || {})[x.id] || (n.via === 'self' ? 'self' : 'app');
    const dt = (pre, d, t) => `<div class="grid-2" style="gap:8px"><div><label class="fld" for="${pre}-d">Date</label><input class="input" id="${pre}-d" type="date" value="${esc(d || '')}"></div><div><label class="fld" for="${pre}-t">Time</label><input class="input" id="${pre}-t" type="time" value="${esc(t || '')}"></div></div>`;
    const opt = (v, label, note) => `<label class="opt"><input type="radio" name="j-how-${x.id}" data-j-how="${x.id}" value="${v}" ${how === v ? 'checked' : ''}><span class="opt-box round" aria-hidden="true"></span><span class="opt-text">${label}<small>${note}</small></span></label>`;
    const okMail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n.email || '');
    let left;
    if (n.status === 'accepted') {
      left = `<div class="card wash-mint" style="padding:12px 14px"><strong>${Art.icon('check', 15)} Booked${x.when ? ' for ' + esc(x.when) : ''}</strong>
        <p class="hint-note" style="margin:4px 0 0">${n.via === 'self' ? 'You arranged this directly with ' + esc(n.provider || 'the provider') + '.' : esc(n.provider || 'The provider') + ' accepted your request.'}</p></div>
        <button class="btn btn-ghost btn-sm" data-j="rebook" data-id="${x.id}" style="align-self:flex-start">Change the booking</button>`;
    } else if (n.status === 'none') {
      left = `<div class="opt-grid">${opt('app', 'Send a request from here', 'The provider replies with a link; you confirm.')}${opt('self', 'I’ve arranged it myself', 'By email, phone or in person. Just record it here.')}</div>
        ${how === 'self' ? `<div class="stack" style="gap:8px">${dt('j-bk-' + x.id, when.date, when.time)}
            <button class="btn btn-primary btn-sm" data-j="self-book" data-id="${x.id}" style="align-self:flex-start">${Art.icon('check', 15)} Mark as booked</button></div>`
          : `<div class="stack" style="gap:8px">
            <p class="hint-note" style="margin:0">To: ${n.provider ? esc(n.provider) + ' ' : ''}${okMail ? `<span class="mono">&lt;${esc(n.email)}&gt;</span>` : '<strong>add their email in the step details above first</strong>'}</p>
            ${dt('j-bk-' + x.id, when.date, when.time)}
            <div class="spread"><label class="fld" for="j-req-${x.id}" style="margin:0">Message</label><button class="as-chip" type="button" data-j="draft" data-id="${x.id}">${Art.icon('pencil', 14)} Write it for me</button></div>
            <textarea class="input" id="j-req-${x.id}" rows="6" placeholder="Say who you are, what you’d like and for how many students.">${esc(draft)}</textarea>
            <button class="btn btn-primary btn-sm" data-j="send" data-id="${x.id}" style="align-self:flex-start" ${okMail ? '' : 'disabled'}>${Art.icon('arrow', 15)} Send request</button>
            <p class="hint-note" style="margin:0">Demo: nothing is really emailed — the provider’s side is simulated below.</p></div>`}`;
    } else {
      left = `<div class="mail"><small class="hint-note">To ${esc(n.provider)} &lt;${esc(n.email || '')}&gt; · for ${esc(SEED.fmtWhen(n.askDate, n.askTime) || x.when || 'a date to agree')}</small><br>${esc(n.request)}</div>
        ${n.status === 'sent' ? '<p class="hint-note" style="margin:0">Waiting for the provider to reply.</p>' : ''}
        ${n.status === 'counter' ? `<div class="card wash-peach" style="padding:12px 14px"><strong>${esc(n.provider)} suggests ${esc(SEED.fmtWhen(n.counterDate, n.counterTime))}</strong>${n.reply ? `<p class="hint-note" style="margin:4px 0 0">“${esc(n.reply)}”</p>` : ''}
            <div class="row" style="gap:6px;margin-top:8px"><button class="btn btn-primary btn-sm" data-j="accept-counter" data-id="${x.id}">Accept this time</button><button class="btn btn-ghost btn-sm" data-j="rebook" data-id="${x.id}">Ask for another time</button></div></div>` : ''}
        ${n.status === 'declined' ? `<div class="card wash-peach" style="padding:12px 14px"><strong>${esc(n.provider)} can’t do it</strong>${n.reply ? `<p class="hint-note" style="margin:4px 0 0">“${esc(n.reply)}”</p>` : ''}
            <div class="row" style="gap:6px;margin-top:8px"><button class="btn btn-secondary btn-sm" data-j="rebook" data-id="${x.id}">Start a new request</button></div>${n.fallback ? `<p class="hint-note" style="margin:6px 0 0">Your backup plan: ${esc(n.fallback)}</p>` : ''}</div>` : ''}`;
    }
    const provider = n.status === 'sent' ? `<p class="hint-note" style="margin:6px 0 8px">${esc(n.provider || 'The provider')} sees your message and the time you asked for.</p>
        <div class="row" style="gap:6px"><button class="btn btn-teal btn-sm" data-j="p-accept" data-id="${x.id}">${Art.icon('check', 15)} Accept</button><button class="btn btn-ghost btn-sm" data-j="p-other" data-id="${x.id}" aria-expanded="${(ui().jOther || '') === x.id}">Suggest another time</button><button class="btn btn-danger-ghost btn-sm" data-j="p-decline" data-id="${x.id}">Decline</button></div>
        ${(ui().jOther || '') === x.id ? `<div class="stack" style="gap:8px;margin-top:10px">${dt('j-ct-' + x.id, '', '')}<label class="fld" for="j-cn-${x.id}">Note to the teacher (optional)</label><input class="input" id="j-cn-${x.id}" placeholder="e.g. Mornings are better for us">
          <button class="btn btn-primary btn-sm" data-j="p-counter" data-id="${x.id}" style="align-self:flex-start">Send suggestion</button></div>` : ''}`
      : `<p class="hint-note" style="margin:6px 0 0">${n.status === 'none' ? (how === 'self' ? 'Not needed — you arranged it yourself.' : 'Nothing sent yet.') : n.status === 'accepted' ? (n.via === 'self' ? 'Not used — arranged directly.' : 'Accepted.') : 'Waiting for the teacher.'}</p>`;
    return `<div class="grid-2" style="margin-top:12px;gap:12px">
      <div class="stack" style="gap:10px">
        <div class="spread"><h4 style="margin:0">Booking</h4><div class="pipe">${['Request', 'Reply', 'Booked'].map((t, k) => `<span class="pipe-s ${k + 1 < stage || n.status === 'accepted' ? 'done' : k + 1 === stage ? 'on' : ''}"><b>${k + 1}</b>${t}</span>`).join('<i></i>')}</div></div>
        ${left}
        ${how === 'self' && n.status === 'none' ? '' : `<div class="card" style="background:var(--paper);padding:12px"><div class="spread"><strong>Provider’s side</strong><span class="pill plain">simulated</span></div>${provider}</div>`}
      </div>
      <div class="stack" style="gap:8px;align-items:flex-start">
        <h4 style="margin:0">On the day</h4>
        <p class="hint-note" style="margin:0">Print this door code for the provider. Students scan it when they arrive.</p>
        <div class="qr-box" data-qrtext="${code}"></div><span class="mono">${code}</span>
        <p style="margin:0"><strong>${checked.length}</strong> checked in${checked.length ? ': ' + checked.map((id) => esc(nameOf(st, id))).join(', ') : ''}</p>
        ${s.state === 'open' ? `<div class="row" style="gap:6px">${Object.keys(st.seats).filter((id) => !x.checkins[id]).map((id) => `<button class="btn btn-secondary btn-sm" data-j="t-checkin" data-id="${x.id}" data-pid="${id}">Check in ${esc(nameOf(st, id))}</button>`).join('')}</div>` : ''}
      </div></div>`;
  }

  /* ---------------- summaries elsewhere ---------------- */
  function builderCard(st) {
    const list = Engine.classState.journey.steps, mine = list.findIndex((x) => x.type === 'quest' && x.questId === st.activeQuest);
    return `<section class="card" id="sec-next"><div class="spread"><h3 style="margin:0">${Art.icon('arrow', 18)} Where this quest fits</h3>
        <button class="btn btn-ghost btn-sm" data-a="screen" data-screen="next">Edit the journey</button></div>
      <ol class="j-flow">${list.map((x, i) => { const [ic, tl] = TYPE[x.type], me = i === mine;
        return `<li class="j-f ${me ? 'me' : ''}"><span class="j-f-ic">${Art.icon(ic, 16)}</span><span><small>Step ${i + 1} · ${me ? 'this quest' : tl}</small><strong>${esc(Engine.inSpace('class', () => Engine.sel.stepTitle(x)))}</strong>${x.when ? `<small>${esc(x.when)}</small>` : ''}</span></li>`; }).join('')}</ol>
      ${mine < 0 ? `<div class="row" style="margin-top:10px;gap:8px"><span class="hint-note" style="margin:0">This quest isn’t in the class journey yet.</span><button class="btn btn-secondary btn-sm" data-j="add-me">${Art.icon('plus', 14)} Add it as the next step</button></div>` : ''}</section>`;
  }
  function liveCard(st) {
    const open = steps().map((x, i) => [x, i]).filter(([x, i]) => x.type === 'experience' && Engine.sel.stepState(i).state === 'open');
    return open.map(([x]) => `<div class="card"><div class="spread"><h3>${Art.icon('handshake', 18)} ${esc(Engine.sel.stepTitle(x))}</h3><span class="pill mint">${Object.keys(x.checkins).length} checked in</span></div>
      <p class="hint-note" style="margin:4px 0 0">Students check in by scanning the door code; you can also check someone in. <button class="btn btn-ghost btn-sm" data-a="screen" data-screen="next">Journey</button></p>
      <div class="row" style="margin-top:6px">${Object.keys(st.seats).filter((id) => !x.checkins[id]).map((id) => `<button class="btn btn-secondary btn-sm" data-j="t-checkin" data-id="${x.id}" data-pid="${id}">Check in ${esc(nameOf(st, id))}</button>`).join('')}</div></div>`).join('');
  }

  /* ---------------- students: where am I in the journey, and the next real experience ---------------- */
  function strip(st) {
    const list = steps();
    return `<div class="card"><div class="eyebrow">Your journey</div>
      <ol class="j-strip">${list.map((x, i) => { const s = Engine.sel.stepState(i), [ic] = TYPE[x.type];
        const tag = s.state === 'done' ? 'done' : s.state === 'open' ? 'now' : s.state === 'waiting' ? 'coming up' : 'next';
        return `<li class="j-s ${s.state}">${Art.icon(s.state === 'done' ? 'check' : ic, 15)}<span><strong>${esc(Engine.sel.stepTitle(x))}</strong><small>${tag}${s.state === 'locked' && s.why ? ' · ' + esc(s.why) : ''}</small></span></li>`; }).join('')}</ol></div>`;
  }
  function student(st, me) {
    const list = steps();
    const exp = list.map((x, i) => [x, i]).find(([x, i]) => x.type === 'experience' && Engine.sel.stepState(i).state !== 'done');
    let card = '';
    if (exp) {
      const [x, i] = exp, s = Engine.sel.stepState(i), here = !!x.checkins[me.id];
      card = `<div class="card next-exp">
        <div class="spread"><div class="eyebrow teal">Next: a real experience</div><span class="pill ${here ? 'mint' : s.state === 'open' ? 'mint' : 'plain'}">${here ? 'checked in' : s.state === 'open' ? 'open' : 'locked'}</span></div>
        <h3 style="margin:4px 0">${esc(Engine.sel.stepTitle(x))}</h3>
        <p class="hint-note" style="margin:0">${[x.exp.provider, x.when, x.where].filter(Boolean).map(esc).join(' · ')}${x.exp.bring ? ' · bring: ' + esc(x.exp.bring) : ''}</p>
        ${here ? `<p style="margin:8px 0 0">${Art.icon('check', 15)} You’re checked in. Phones away — enjoy it.</p>`
          : s.state === 'open' ? `<button class="btn btn-primary btn-sm" data-j="s-checkin" data-id="${x.id}" style="margin-top:8px">${Art.icon('eye', 15)} Check in at the door</button>`
          : `<p class="hint-note" style="margin:8px 0 0">${esc(s.why || 'Your teacher opens it.')}</p>`}
      </div>`;
    }
    return strip(st) + card;
  }

  /* ---------------- events ---------------- */
  function bind(root) {
    root.querySelectorAll('[data-j]').forEach((el) => el.addEventListener('click', (e) => {
      e.preventDefault();
      const S = Engine.state, id = el.dataset.id, act = window.WQ.act, render = window.WQ.render;
      switch (el.dataset.j) {
        case 'add-open': S.ui.jAdd = Number(el.dataset.i); return render();
        case 'add-close': S.ui.jAdd = null; return render();
        case 'add-me': act('addStep', { type: 'quest', at: Engine.classState.journey.steps.length, questId: Engine.studioState.activeQuest }); return render();
        case 'add': { const r = act('addStep', { type: el.dataset.type, at: Number(el.dataset.i) }); S.ui.jAdd = null; if (r.ok) S.ui.jOpen = r.id; return render(); }
        case 'toggle': S.ui.jOpen = S.ui.jOpen === id ? null : id; return render();
        case 'use': { const x = S.journey.steps.find((y) => y.id === id); if (x) window.WQ.runQuest(x.questId); return; }
        case 'open-ask': S.ui.jOpenNow = S.ui.jOpenNow === id ? null : id; return render();
        case 'open': { const r = act('openStep', { id, reason: (document.getElementById('j-reason') || {}).value || '' }); if (r.ok) S.ui.jOpenNow = null; return render(); }
        case 'done': return act('markStepDone', { id, done: true });
        case 'undone': return act('markStepDone', { id, done: false });
        case 'up': return act('moveStep', { id, dir: -1 }), render();
        case 'down': return act('moveStep', { id, dir: 1 }), render();
        case 'remove': if (confirm('Remove this step from the journey?')) act('removeStep', { id }); return;
        case 'draft': {
          const x = S.journey.steps.find((y) => y.id === id), n = x.exp, au = S.quest.audience || SEED.defaultAudience();
          S.ui.jDraft = S.ui.jDraft || {};
          S.ui.jDraft[id] = `Hello ${n.provider || 'there'},\n\nMy group (${SEED.participants.length} ${(SEED.AUDIENCES[au.kind] || 'school').toLowerCase()} learners${au.ages ? ', ages ' + au.ages : ''}) is taking part in a learning journey. As part of it we’d love to come to you for: ${n.activity || 'a short workshop'}${(() => { const g = (k) => (document.getElementById(k) || {}).value || ''; const w = SEED.fmtWhen(g('j-bk-' + id + '-d'), g('j-bk-' + id + '-t')) || x.when; return w ? ', on ' + w : ''; })()}.\n\nThey will bring: ${n.bring || 'their notes from the quest'}.${n.staff ? ' ' + n.staff + ' adults will supervise.' : ''} Could you confirm availability, timing and any cost?\n\nThank you`;
          return render();
        }
        case 'send': { const g = (k) => (document.getElementById(k) || {}).value || ''; const r = act('sendBooking', { id, text: g('j-req-' + id), date: g('j-bk-' + id + '-d'), time: g('j-bk-' + id + '-t') }); if (r.ok && S.ui.jDraft) delete S.ui.jDraft[id]; return; }
        case 'self-book': { const g = (k) => (document.getElementById(k) || {}).value || ''; return act('bookDirectly', { id, date: g('j-bk-' + id + '-d'), time: g('j-bk-' + id + '-t') }); }
        case 'rebook': if (S.ui.jHow) delete S.ui.jHow[id]; return act('resetBooking', { id });
        case 'p-other': S.ui.jOther = S.ui.jOther === id ? null : id; return render();
        case 'p-decline': { const why = prompt('Reason for declining (shown to the teacher, optional):', 'Sorry, we’re fully booked that week.'); if (why === null) return; return act('providerReply', { id, decision: 'decline', note: why }); }
        case 'p-accept': return act('providerReply', { id, decision: 'accept' });
        case 'p-counter': { const g = (k) => (document.getElementById(k) || {}).value || ''; const r = act('providerReply', { id, decision: 'counter', date: g('j-ct-' + id + '-d'), time: g('j-ct-' + id + '-t'), note: g('j-cn-' + id) }); if (r.ok) S.ui.jOther = null; return; }
        case 'accept-counter': return act('acceptCounter', { id });
        case 't-checkin': return act('experienceCheckIn', { participantId: el.dataset.pid, byTeacher: true, stepId: id });
        case 's-checkin': {
          const me = SEED.byId[S.ui.student];
          return Scanner.open({ title: 'Scan the code at the door', hint: 'It’s on the provider’s door. No camera? Ask your teacher to check you in.', onCode: (c) => act('experienceCheckIn', { participantId: me.id, code: c, stepId: id }).ok });
        }
        default:
      }
    }));
    root.querySelectorAll('#j-opens').forEach((el) => el.addEventListener('change', () => { const b = el.closest('form').querySelector('[data-j-datebox]'); if (b) b.hidden = el.value !== 'date'; }));
    root.querySelectorAll('[data-j-how]').forEach((el) => el.addEventListener('change', () => { const S = Engine.state; S.ui.jHow = S.ui.jHow || {}; S.ui.jHow[el.dataset.jHow] = el.value; window.WQ.render(); }));
    root.querySelectorAll('[data-jform]').forEach((f) => f.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = (id) => { const el = f.querySelector('#' + id); return el ? el.value : undefined; };
      const id = f.dataset.jform, x = Engine.state.journey.steps.find((y) => y.id === id);
      const fields = { whenDate: v('j-wdate'), whenTime: v('j-wtime'), where: v('j-where'), opens: v('j-opens'), date: v('j-date'), questId: v('j-q'), note: v('j-note') };
      if (x.type === 'experience') Object.assign(fields, { activity: v('j-title'), title: v('j-title'), provider: v('j-prov'), org: v('j-org'), email: v('j-mail'), bring: v('j-bring'), fallback: v('j-fb'), staff: v('j-staff') });
      if (x.type === 'class') fields.title = v('j-title');
      window.WQ.act('updateStep', { id, fields });
    }));
  }

  return { teacher, builderCard, liveCard, strip, student, bind };
})();
