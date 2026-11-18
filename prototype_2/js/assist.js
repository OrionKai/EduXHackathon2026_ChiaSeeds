/* WorldQuest prototype_2 — quest content editor + AI assistant for the educator's quest builder.
 * The quest's content lives in the session (see seed.js): the expert tracks, the finale,
 * collectibles, reflection questions and the story. The educator can edit every part by hand,
 * ask the assistant to change it, or generate a whole quest from the approved-source library.
 * Live AI runs through /api/assistant (Netlify function); when it's unavailable or switched off,
 * a scripted assistant answers (for the Lost Museum template) and everything stays editable by hand.
 * Every AI change is a proposal: tracks need the educator's approval before publishing.
 */
'use strict';

const Assistant = (() => {
  const GREETING = 'Hi! I draft only from the approved sources in your library. Add anything else I should use, then tell me what the quest is for.';
  /* One conversation per quest: switching quests switches the conversation (and closes any open editor). */
  const convos = {}, CHAT_KEY = 'wq-chat-';
  /* Saved on this device only, per quest; the last messages are enough to pick up where you left off. */
  function saveConvo() {
    if (!convoOf) return;
    try { localStorage.setItem(CHAT_KEY + convoOf, JSON.stringify({ msgs: msgs.filter((m) => !m.thinking).slice(-60), history: history.slice(-24) })); } catch {}
  }
  function clearConvo() {
    if (!convoOf) return;
    convos[convoOf] = { msgs: [{ who: 'ai', text: GREETING }], history: [] }; msgs = convos[convoOf].msgs; history = convos[convoOf].history;
    try { localStorage.removeItem(CHAT_KEY + convoOf); } catch {}
  }
  function forgetAll() { Object.keys(convos).forEach((k) => delete convos[k]); convoOf = null;
    try { Object.keys(localStorage).filter((k) => k.startsWith(CHAT_KEY)).forEach((k) => localStorage.removeItem(k)); } catch {} }
  let msgs = [], history = [], convoOf = null;
  function syncQuest() {
    const id = Engine.state.activeQuest;
    if (id === convoOf) return;
    if (!convos[id]) { let saved = null; try { saved = JSON.parse(localStorage.getItem(CHAT_KEY + id) || 'null'); } catch {}
      convos[id] = saved && Array.isArray(saved.msgs) && saved.msgs.length ? { msgs: saved.msgs, history: Array.isArray(saved.history) ? saved.history : [] } : { msgs: [{ who: 'ai', text: GREETING }], history: [] }; }
    msgs = convos[id].msgs; history = convos[id].history; convoOf = id;
    editing = null; refDraft = null; quizOpen = false; confirmGen = false; lastNotice = '';
  }
  let editing = null; // 'A'..'D' | 'finale' | 'extras'
  let refDraft = null; // reference photo being edited for the open track
  let quizOpen = false;
  let busy = false, speed = 1, confirmGen = false;
  let mode = (() => { try { return localStorage.getItem('wq-ai-mode') || 'live'; } catch { return 'live'; } })();
  let offWhy = mode === 'live' ? '' : 'you switched it off on this device';
  let needPass = false, passBad = false, lastNotice = '';
  /* Is a demo passcode needed, and does the saved one work? The function checks the passcode before anything else,
     so an empty request answers 401 (needed / wrong) or 400 (fine) without ever calling the AI. */
  async function checkPass(after) {
    let pass = ''; try { pass = localStorage.getItem('wq-ai-pass') || ''; } catch {}
    try {
      const r = await fetch('/api/assistant', { method: 'POST', headers: { 'content-type': 'application/json', 'x-demo-passcode': pass }, body: '{}' });
      needPass = r.status === 401; passBad = needPass && !!pass;
      if (after) window.WQ.toast(needPass ? 'That passcode didn’t work.' : 'Passcode saved — live AI is ready.', needPass ? 'error' : 'success');
    } catch {}
    if (window.WQ) window.WQ.render();
  }
  const sleep = (ms) => (speed ? new Promise((r) => setTimeout(r, ms * speed)) : Promise.resolve());
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lines = (v) => String(v || '').split('\n').map((x) => x.trim()).filter(Boolean);

  const SRC = () => Engine.state.sources.map((s) => (s.kind === 'partner' ? { ...s, fact: [Engine.state.contributor.text ? 'In the partner’s own words: “' + Engine.state.contributor.text + '”' : '', Engine.state.contributor.avoid ? '(Caution from the partner — respect it, but it is not a topic or title for the quest: ' + Engine.state.contributor.avoid + ')' : '', (Engine.state.contributor.prompts || []).length ? 'Questions the partner will ask students: ' + Engine.state.contributor.prompts.join(' / ') : ''].filter(Boolean).join(' '), partner: true } : { ...s, fact: s.text }));
  const srcFor = (t) => (Engine.state.sources.find((s) => s.url && s.url === SEED.missions[t].sourceUrl) || { id: '' }).id;
  const partnerSrc = () => (Engine.state.sources.find((s) => s.kind === 'partner') || { id: '' }).id;
  const isTemplate = () => (Engine.state.content.meta || {}).id === 'lost_museum';
  const isEmpty = () => SEED.topics.every((t) => !SEED.missions[t].name);

  /* Scripted revisions exist only for the Lost Museum template (they are written for its content). */
  const REVS = [
    { id: 'rq', topic: 'B', chip: 'Track B: switch to multiple choice', prompt: 'Add a multiple-choice check to Track B.',
      note: '3-question multiple-choice check from the Gallery 20 page (pass 2/3).',
      patch: { assess: { quiz: [
        { q: 'Whose sarcophagus lid is in Gallery 20?', o: ['Ramesses III', 'Nespawershefyt', 'Tutankhamun', 'Cleopatra'], a: 0 },
        { q: 'According to the gallery page, who gave the lid to the museum?', o: ['G. B. Belzoni', 'A local farmer', 'The British Army', 'It isn’t recorded'], a: 0 },
        { q: 'Which question can the lid alone NOT answer?', o: ['How ordinary workers were remembered', 'What it is made of', 'How big it is', 'What is carved on it'], a: 0 }], pass: 2, verify: 'teacher' } },
      reply: 'Track B now uses a 3-question multiple-choice check built only from the Gallery 20 page [S2]. Students need 2 of 3 right before they can send their notes; the last question checks they know what the lid can’t tell us.' },
    { id: 'rh', topic: 'A', chip: 'Track A: add a harder question', prompt: 'Add a harder multiple-choice question to Track A about the limits of the evidence.',
      note: 'Quick check now has 3 questions, including one about the limits of the evidence (pass 2/3).',
      patch: { assess: { quiz: [
        { q: 'Which of these is an observation, not an interpretation?', o: ['The lid has painted decoration', 'Everyone in ancient Egypt had a coffin like this', 'The owner must have been very rich', 'One artist made the whole set'], a: 0 },
        { q: 'According to the gallery page, when was the coffin set given to the museum?', o: ['1822', '1923', '1700', '2001'], a: 0 },
        { q: 'Why can’t this coffin set tell us how most Egyptians were buried?', o: ['It is one high-status burial, so it may not be typical', 'Its paint has faded', 'It is in a museum now', 'It has no writing on it'], a: 0 }], pass: 2, verify: 'teacher' } },
      reply: 'Added a harder question to Track A’s quick check: it asks why one coffin can’t stand for everyone [S1]. Students need 2 of 3 right before they can send their notes.' },
    { id: 'ra', topic: 'A', chip: 'Track A: add a quick check', prompt: 'Add a short multiple-choice check to Track A that students must pass.',
      note: 'Added a 2-question check students must pass (2/2).',
      patch: { assess: { quiz: [
        { q: 'Which of these is an observation, not an interpretation?', o: ['The lid has painted decoration', 'Everyone in ancient Egypt had a coffin like this', 'The owner must have been very rich', 'One artist made the whole set'], a: 0 },
        { q: 'According to the gallery page, when was the coffin set given to the museum?', o: ['1822', '1923', '1700', '2001'], a: 0 }], pass: 2, verify: 'teacher' } },
      reply: 'Added a 2-question check to Track A: one separates observation from interpretation, one comes straight from the gallery page. Students must get both right before they can send their notes; anyone else looks again at the object.' },
    { id: 'rc', topic: 'C', chip: 'Track C: simpler wording', prompt: 'Make Track C easier to read for students who struggle with long instructions.',
      note: 'Instructions shortened to about a 12-year-old reading level.',
      patch: { observe: 'Find two different kinds of object, like a painted pot and a coin. Write down what you see on each one.' },
      reply: 'Done. Track C now uses shorter instructions at about a 12-year-old reading level. The evidence it asks for hasn’t changed, so the finale still works.' },
    { id: 'rd', topic: 'D', chip: 'Track D: if the partner is busy', prompt: 'What happens in Track D if the community partner is busy?',
      note: 'Fallback added: labelled prompt card and a staggered schedule (max 5 students at a time).',
      patch: { fallback: 'If the contributor is busy: use the partner’s prompt card at the gallery door (clearly labelled), then talk to them later. No more than 5 students at a time.' },
      reply: 'I added a fallback for Track D: a clearly labelled prompt card built from the partner’s approved questions, and a staggered schedule so no more than 5 students reach them at once.' },
    { id: 'rb', topic: 'B', chip: 'Track B: a hint, not an answer', prompt: 'Add a hint to Track B that helps without giving the answer away.',
      note: 'New hint about comparing scale.',
      patch: { hint: 'Compare its size with nearby cases. What might scale suggest about who it honoured?' },
      reply: 'Added a hint to Track B: “Compare its size with nearby cases. What might scale suggest about who it honoured?” It points students back to the object rather than giving the answer.' },
  ];
  const DRAFT = { id: 'draft', chip: 'Draft the example quest (Fitzwilliam Museum)', prompt: (q) => `Draft the example ${q.duration || 60}-minute Jigsaw quest at the Fitzwilliam Museum for ${SEED.participants.length} students.` };
  /* Suggestions are scripted and repeatable (for demos); anything typed goes to the live AI. */
  const chips = () => {
    const st = Engine.state;
    if (st.quest.status === 'PUBLISHED') return [];
    if (isEmpty()) return SEED.topics.length === 4 && (/fitzwilliam/i.test(st.quest.venue || '') || !st.quest.venue) ? [DRAFT] : [];
    return isTemplate() ? REVS.filter((r) => SEED.topics.includes(r.topic) && !st.revisions[r.topic]) : [];
  };

  /* ---------------- rendering ---------------- */
  const jumpChip = (p) => `<button class="as-jump" data-as-jump="${p.step}|${p.sel}" type="button" title="Go to what changed">${Art.icon(PART_ICON[p.kind] || 'arrow', 13)} ${esc(p.label)}</button>`;
  function msgHTML(m) {
    return `<div class="as-msg ${m.who}">${m.thinking ? '<span class="as-dots"><i></i><i></i><i></i></span>' : esc(m.text)}
      ${m.cites && m.cites.length ? `<div class="row" style="gap:4px;margin-top:6px">${m.cites.map((c) => `<button class="as-cite" data-as-cite="${c}" type="button">${c}</button>`).join('')}</div>` : ''}
      ${m.changes && m.changes.length ? `<ul class="as-changes">${m.changes.map((c) => `<li><span>${esc(c.text)}</span>${c.part ? jumpChip(c.part) : ''}</li>`).join('')}</ul>`
        : m.parts && m.parts.length ? `<div class="row" style="gap:4px;margin-top:6px">${m.parts.map(jumpChip).join('')}</div>` : ''}</div>`;
  }

  function chat() {
    syncQuest();
    const st = Engine.state, cs = chips(), locked = st.quest.status === 'PUBLISHED';
    return `
      <div class="card as-card">
        <div class="spread"><h3 style="margin:0">${Art.icon('sparkle', 18)} Quest assistant</h3>
          <span class="row" style="gap:6px">${msgs.length > 1 ? '<button type="button" class="btn btn-ghost btn-sm" data-as-clear title="Start a fresh conversation for this quest">Clear chat</button>' : ''}<button type="button" class="pill ${mode === 'live' ? 'mint' : ''}" data-as-mode title="Switch between the real AI and the scripted demo">AI: ${mode === 'live' ? 'live' : 'off · scripted'}</button></span></div>
        ${mode !== 'live' ? `<div class="as-off"><span>Live AI is off — ${esc(offWhy || 'switched off')}. Suggestions below still work.</span><button type="button" class="btn btn-secondary btn-sm" data-as-mode>Turn live AI on</button></div>` : ''}
        ${lastNotice ? `<p class="hint-note" style="margin:0">${esc(lastNotice)}</p>` : ''}
        ${needPass && mode === 'live' ? `<form class="as-off" data-as-pass><span>${passBad ? 'That passcode didn’t work — check it and try again.' : 'Live AI on this site is protected by a demo passcode (the <span class="mono">DEMO_PASSCODE</span> set in Netlify). Enter it once on this device:'}</span>
          <span class="row" style="gap:6px;flex:1;min-width:200px"><label class="sr-only" for="as-passcode">Demo passcode</label><input class="input" id="as-passcode" type="password" placeholder="Demo passcode" autocomplete="off" style="flex:1"><button class="btn btn-primary btn-sm">Save</button></span></form>` : ''}
        <div class="as-msgs" id="as-msgs">${msgs.map(msgHTML).join('')}</div>
        ${!locked && mode === 'live' ? (confirmGen
          ? `<div class="row"><span class="small">Replace the current content with a new AI draft?</span><button class="btn btn-primary btn-sm" type="button" data-as-gen-go>Yes, generate</button><button class="btn btn-ghost btn-sm" type="button" data-as-gen-no>Cancel</button></div>`
          : busy ? '<p class="hint-note" style="margin:0">Working on it — this takes about 20 seconds…</p>' : `<button class="as-chip" type="button" data-as-gen>${Art.icon('sparkle', 14)} Generate the whole quest from my sources</button>`) : ''}
        ${cs.length ? `<div class="stack" style="gap:6px"><span class="hint-note" style="margin:0">Suggestions <span class="pill plain">scripted · same reply every time</span></span><div class="row" style="gap:6px">${cs.map((c) => `<button class="as-chip" type="button" data-as-chip="${c.id}" ${busy ? 'disabled' : ''}>${Art.icon(c.id === 'draft' ? 'sparkle' : 'pencil', 14)} ${esc(c.chip)}</button>`).join('')}</div></div>` : ''}
        <form class="as-compose" data-as-form><label class="sr-only" for="as-in">Message the assistant</label>
          <input class="input" id="as-in" placeholder="${mode === 'live' ? 'Ask for a change, e.g. “make Track B shorter”' : 'Live AI is off — edit by hand below'}" autocomplete="off" ${busy ? 'disabled' : ''}>
          <button class="btn btn-primary btn-sm" type="submit" ${busy ? 'disabled' : ''}>Send</button></form>
        <p class="hint-note" style="margin:0">The AI helps you write the quest. During the trip it’s only used for the optional AI photo check and the Report’s answer analysis.</p>
      </div>`;
  }
  function board() {
    syncQuest();
    const st = Engine.state;
    return `${sourcesCard()}${tracksSection(st)}${finaleSection(st)}${collectiblesSection(st)}${storySection(st)}`;
  }

  const LABEL = { TEMPLATE: ['st-submitted', 'Check & approve'], EMPTY: ['st-locked', 'To write'], AI: ['st-submitted', 'AI draft · check it'], REVISED: ['st-submitted', 'Changed · check it'], EDITED: ['st-submitted', 'Check & approve'], APPROVED: ['st-verified', 'Approved'] };

  /* One line that says, in plain words, how students show their work for a track. */
  const assessOn = (m) => { const a = m.assess || SEED.defaultAssess(), photo = String(a.checkin).startsWith('photo');
    return { photo, qr: a.checkin === 'qr' || (photo && !!a.qr), notes: a.evidence !== 'photo', evphoto: a.evidence !== 'notes', quiz: (a.quiz || []).length > 0, partner: !!m.needsFacilitator }; };
  function howShown(m) {
    const a = m.assess || SEED.defaultAssess(), on = assessOn(m), parts = [];
    if (on.photo) parts.push('photo of the object');
    if (on.qr) parts.push('QR card');
    if (on.notes) parts.push(`notes (${m.evidenceFields.filter((e) => e.label).length} question${m.evidenceFields.length === 1 ? '' : 's'})`);
    if (on.evphoto) parts.push('a photo');
    if (on.quiz) parts.push(`must pass ${a.pass || 1} of ${a.quiz.length} multiple-choice`);
    if (on.partner) parts.push('talk with the partner');
    return parts.join(' · ') + ` — checked by ${a.verify === 'partner' ? 'the community partner' : 'you'}`;
  }

  function tracksSection(st) {
    const locked = st.quest.status === 'PUBLISHED';
    const probs = SEED.contentProblems(st.content);
    const n = SEED.topics.filter((t) => st.tracks[t] === 'APPROVED').length;
    if (st.quest.structure && st.quest.structure.tracks === 0) {
      return `<section class="card" id="as-content"><h3 style="margin:0">${Art.icon('map', 18)} Tracks</h3>
        <p style="margin:8px 0">No tracks yet. A track is one topic of the trip: in every team, one student becomes the expert on it, investigates it on site, then teaches the others.</p>
        ${locked ? '' : `<button class="btn btn-primary btn-sm" type="button" data-as-addtrack>${Art.icon('plus', 14)} Add your first track</button>`}
        <p class="hint-note" style="margin:8px 0 0">Or ask the assistant to draft tracks from your sources. Students need at least 2 tracks to teach each other.</p></section>`;
    }
    if (editing && SEED.topics.includes(editing) && !locked) {
      const t = editing, m = SEED.missions[t];
      return `<section class="card" id="as-content">
        <button class="btn btn-ghost btn-sm" type="button" data-as-edit-cancel>${Art.icon('back', 14)} All tracks</button>
        <div class="row" style="gap:8px;margin-top:6px"><span class="topic-chip ${SEED.topicMeta[t].color}">${Art.icon(SEED.topicMeta[t].icon, 14)}${t}</span><h3 style="margin:0">${esc(m.name || 'New track')}</h3></div>
        ${trackEditor(t)}</section>`;
    }
    return `
      <section class="card" id="as-content">
        <div class="spread"><h3 style="margin:0">${Art.icon('map', 18)} Tracks</h3><span class="pill lavender">${n}/${SEED.topics.length} approved</span></div>
        <p class="hint-note" style="margin:6px 0 10px">A track is one topic. In each team, one student becomes its expert, explores it on site, then teaches the others.</p>
        <div class="stack" style="gap:10px">
          ${SEED.topics.map((t) => {
            const m = SEED.missions[t], [cls, txt] = LABEL[st.tracks[t]] || LABEL.EDITED, tp = probs.filter((x) => x.startsWith(`Track ${t}:`));
            const partnerAsk = (st.contributor.requests || []).some((r) => r.item === 'track:' + t && r.status === 'open');
            return `<div class="as-track" id="as-track-${t}">
              <div class="spread"><div class="row" style="gap:8px"><span class="topic-chip ${SEED.topicMeta[t].color}">${Art.icon(SEED.topicMeta[t].icon, 14)}${t}</span><strong>${esc(m.name || 'Untitled track')}</strong></div>
                <span class="row" style="gap:6px">${partnerAsk ? '<span class="pill peach">Partner suggestion</span>' : ''}<span class="status-chip ${cls}">${txt}</span></span></div>
              <p style="margin:6px 0 2px">${m.gallery || m.keyObject ? `${esc(m.gallery || '')}${m.keyObject ? ` · find ${esc(m.keyObject)}` : ''}` : '<span class="hint-note">Not written yet.</span>'}</p>
              ${m.name ? `<p class="hint-note" style="margin:0">Students show it by: ${esc(howShown(m))}</p>` : ''}
              ${tp.length ? `<p class="hint-note" style="margin:6px 0 0;color:var(--danger)">Still missing: ${tp.map((x) => esc(x.split(': ')[1])).join(', ')}</p>` : ''}
              ${st.revisions[t] ? `<p class="as-note">${Art.icon('pencil', 14)} ${esc(st.revisions[t])}</p>` : ''}
              ${locked ? '' : `<div class="row" style="gap:6px;margin-top:8px">
                <button class="btn btn-secondary btn-sm" type="button" data-as-edit="${t}">${Art.icon('pencil', 14)} ${m.name ? 'Open' : 'Write'}</button>
                ${st.tracks[t] === 'APPROVED' || tp.length ? '' : `<button class="btn btn-teal btn-sm" type="button" data-as-approve="${t}">${Art.icon('check', 14)} Approve</button>`}
                ${mode === 'live' ? `<button class="btn btn-ghost btn-sm" type="button" data-as-ask="${t}">Ask AI to change</button>` : ''}
                ${st.phase === 'LOBBY' ? `<button class="btn btn-danger-ghost btn-sm" type="button" data-as-rmtrack="${t}" style="margin-left:auto">Remove</button>` : ''}</div>`}
            </div>`;
          }).join('')}
          ${!locked && SEED.topics.length < 6 && st.phase === 'LOBBY' ? `<button class="btn btn-secondary btn-sm" type="button" data-as-addtrack style="align-self:flex-start">${Art.icon('plus', 14)} Add a track</button>` : ''}
        </div>
      </section>`;
  }

  function finaleSection(st) {
    const locked = st.quest.status === 'PUBLISHED', fin = st.content.finale, steps = fin.steps || [];
    const kinds = (t) => steps.filter((x) => x.type === t).length;
    return `<section class="card" id="as-finale">
      <div class="spread"><h3 style="margin:0">${Art.icon('puzzle', 18)} Final team challenge: ${esc(fin.title || 'Untitled')}</h3>${locked ? '' : `<button class="btn btn-secondary btn-sm" type="button" data-as-edit="finale">${editing === 'finale' ? 'Close' : 'Edit'}</button>`}</div>
      <p class="hint-note" style="margin:6px 0 8px">What each team does together at the end, after every expert has taught the team: <strong>multiple-choice</strong> and <strong>team-answer</strong> steps.</p>
      ${editing === 'finale' && !locked ? finaleEditor(fin) : `<ol class="fin-list">${steps.map((x) => `<li><span class="pill plain">${x.type === 'choice' ? 'Multiple choice' : 'Team answer'}</span> ${esc((x.type === 'choice' ? x.question : x.prompt) || 'Not written yet')}</li>`).join('') || '<li class="hint-note">No steps yet.</li>'}</ol>
        <p class="hint-note" style="margin:6px 0 0">${kinds('choice')} multiple choice · ${kinds('write')} team answer${kinds('write') === 1 ? '' : 's'}</p>`}
    </section>`;
  }

  function collectiblesSection(st) {
    const locked = st.quest.status === 'PUBLISHED', cards = st.content.collectibles;
    const rule = (c) => (c.kind === 'track'
      ? (!c.track || c.track === 'any' ? 'Earned by every student when they finish their track’s tasks.' : `Earned by students on “${esc(SEED.missions[c.track] && SEED.missions[c.track].name ? SEED.missions[c.track].name : 'Track ' + c.track)}” when they finish their track’s tasks.`)
      : { experts: 'Earned by a team when all its experts have finished their tracks.', finale: 'Earned by a team when it solves the final challenge.', bonus: 'Earned by a team when you approve its bonus activity.',
          egg: 'Earned by a student who finds it by tilting their phone up at the place.', teacher: 'Earned by a team when you award it.' }[c.kind] || '');
    return `<section class="card" id="as-collectibles">
      <div class="spread"><h3 style="margin:0">${Art.icon('trophy', 18)} Reward cards</h3><span class="pill plain">optional · just for fun</span></div>
      <p class="hint-note" style="margin:6px 0 10px">Fun extras for the class album. A <strong>badge</strong> is personal — e.g. every student who finishes their track gets one. A <strong>team card</strong> can be earned by every team — e.g. for solving the finale. They never block the quest.${cards.length ? ` When the class has every card, it unlocks “${esc(SEED.master.title)}”.` : ''}</p>
      ${cards.length ? `<div class="coll-grid">${cards.map((c) => editing === 'c:' + c.id && !locked ? collEditor(c) : `<div class="coll-item">
        <div class="row" style="gap:10px;flex-wrap:nowrap"><div class="collect-card claimed" style="width:64px;min-width:64px;cursor:default">${Art.collectibleArt[c.id] ? Art.collectibleArt[c.id]() : Art.lockedArt()}</div>
          <div style="min-width:0"><strong>${esc(c.title || 'Untitled card')}</strong><br><small class="hint-note">${c.kind === 'track' || c.kind === 'egg' ? 'Badge · one per student' : 'Team card · one per team'}</small></div></div>
        <p class="hint-note" style="margin:6px 0 4px">${rule(c)}</p>
        ${c.kind === 'bonus' && c.activity ? `<p class="hint-note" style="margin:0 0 4px">Activity: ${esc(c.activity)}</p>` : ''}
        ${locked ? '' : `<div class="row" style="gap:6px;margin-top:6px"><button class="btn btn-ghost btn-sm" type="button" data-as-edit="c:${c.id}">Edit</button><button class="btn btn-danger-ghost btn-sm" type="button" data-as-rmcard="${c.id}">Remove</button></div>`}
      </div>`).join('')}</div>` : '<p style="margin:0 0 8px">No cards yet.</p>'}
      ${locked ? '' : `<button class="btn btn-secondary btn-sm" type="button" data-as-addcard style="margin-top:8px">${Art.icon('plus', 14)} Add a card</button>`}
    </section>`;
  }
  function collEditor(c) {
    return `<form class="coll-item stack as-editor" style="gap:6px" data-as-collform="${c.id}">
      ${inp('ce-t', 'Card name', c.title, 'e.g. Golden Scarab')}
      <label class="fld" for="ce-k">Earned when</label><select class="input" id="ce-k">${Object.entries(SEED.EARN_TEXT).map(([k, l]) => `<option value="${k}" ${c.kind === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
      <label class="fld" for="ce-tr">Which track (if earned by finishing a track)</label><select class="input" id="ce-tr"><option value="any" ${!c.track || c.track === 'any' ? 'selected' : ''}>Any track</option>${SEED.topics.map((t) => `<option value="${t}" ${c.track === t ? 'selected' : ''}>${t} · ${esc(SEED.missions[t].name || 'Track ' + t)}</option>`).join('')}</select>
      ${inp('ce-a', 'Bonus activity (if earned by a bonus activity)', c.activity, 'e.g. Find a symbol that appears in two galleries')}
      ${inp('ce-f', 'A fun fact shown when it’s earned', c.fact)}
      <label class="toggle"><input type="checkbox" id="ce-h" ${c.hidden ? 'checked' : ''}> Keep it secret until it’s found</label>
      <label class="toggle"><input type="checkbox" id="ce-e" ${c.evolves ? 'checked' : ''}> Levels up when they check in at the next real experience</label>
      <div class="row"><button class="btn btn-primary btn-sm" type="submit">Save card</button><button class="btn btn-ghost btn-sm" type="button" data-as-edit-cancel>Cancel</button></div></form>`;
  }

  function storySection(st) {
    const locked = st.quest.status === 'PUBLISHED', c = st.content;
    return `<section class="card" id="as-extras">
      <div class="spread"><h3 style="margin:0">${Art.icon('book', 18)} Story &amp; reflection</h3>${locked ? '' : `<button class="btn btn-ghost btn-sm" type="button" data-as-edit="extras">${editing === 'extras' ? 'Close' : 'Edit'}</button>`}</div>
      <p class="hint-note" style="margin:6px 0 0">${c.story.opening ? esc(c.story.opening) : 'No story yet.'}</p>
      <ol class="hint-note" style="margin:6px 0 0;padding-left:18px">${c.reflection.map((q) => `<li>${esc(q || '—')}</li>`).join('')}</ol>
      ${editing === 'extras' && !locked ? extrasEditor(c) : ''}
    </section>`;
  }

  const ta = (id, label, v, rows = 2, ph = '') => `<label class="fld" for="${id}">${label}</label><textarea class="input" id="${id}" rows="${rows}" placeholder="${esc(ph)}">${esc(v)}</textarea>`;
  const inp = (id, label, v, ph = '') => `<label class="fld" for="${id}">${label}</label><input class="input" id="${id}" value="${esc(v)}" placeholder="${esc(ph)}">`;

  /* ---------- open-list editors: add and remove rows in place (typing is never lost) ---------- */
  const leRow = (v, ph) => `<div class="le-row"><input class="input" data-le-item value="${esc(v)}" placeholder="${esc(ph)}"><button type="button" class="le-x" data-le-rm aria-label="Remove">✕</button></div>`;
  function listEd(name, items, ph, add) {
    const rows = (items && items.length ? items : ['']).map((v) => leRow(v, ph)).join('');
    return `<div class="le" data-le="${name}" data-ph="${esc(ph)}">${rows}<button type="button" class="btn btn-ghost btn-sm le-add" data-le-add>${Art.icon('plus', 14)} ${esc(add)}</button></div>`;
  }
  const readList = (root, name) => [...root.querySelectorAll(`[data-le="${name}"] [data-le-item]`)].map((i) => i.value.trim()).filter(Boolean);
  /* Statements with a "correct" tick (teach-back checks, finale statements). */
  const lcRow = (x, ph) => `<div class="le-row"><label class="le-ok" title="Correct"><input type="checkbox" data-lc-ok ${x.correct ? 'checked' : ''}> correct</label><input class="input" data-le-item value="${esc(x.text)}" placeholder="${esc(ph)}"><button type="button" class="le-x" data-le-rm aria-label="Remove">✕</button></div>`;
  function checkListEd(name, items, ph, add) {
    const rows = (items && items.length ? items : [{ text: '', correct: true }, { text: '', correct: false }]).map((x) => lcRow(x, ph)).join('');
    return `<div class="le" data-le="${name}" data-lc data-ph="${esc(ph)}">${rows}<button type="button" class="btn btn-ghost btn-sm le-add" data-le-add>${Art.icon('plus', 14)} ${esc(add)}</button></div>`;
  }
  const readCheckList = (root, name) => [...root.querySelectorAll(`[data-le="${name}"] .le-row`)].map((r) => ({ text: r.querySelector('[data-le-item]').value.trim(), correct: r.querySelector('[data-lc-ok]').checked })).filter((x) => x.text);
  /* Quiz: any number of questions, 2–6 options each. */
  let qzSeq = 0;
  const qzOpt = (g, v, ok) => `<div class="le-row"><label class="le-ok" title="Correct answer"><input type="radio" name="${g}" ${ok ? 'checked' : ''}> right</label><input class="input" data-qz-opt value="${esc(v)}" placeholder="Option"><button type="button" class="le-x" data-qz-opt-rm aria-label="Remove option">✕</button></div>`;
  function qzCard(q) {
    const g = 'qz' + (++qzSeq), o = q && q.o && q.o.length ? q.o : ['', ''];
    return `<div class="qz-card" data-qz-card><div class="spread"><span class="fld">Question</span><button type="button" class="btn btn-ghost btn-sm" data-qz-rm>Remove question</button></div>
      <input class="input" data-qz-q value="${esc(q ? q.q : '')}" placeholder="What should students be able to answer at the object?">
      <div class="stack" style="gap:6px" data-qz-opts data-g="${g}">${o.map((v, k) => qzOpt(g, v, (q ? q.a : 0) === k)).join('')}</div>
      <button type="button" class="btn btn-ghost btn-sm le-add" data-qz-opt-add>${Art.icon('plus', 14)} Add option</button></div>`;
  }
  const readQuiz = (root) => [...root.querySelectorAll('[data-qz-card]')].map((c) => {
    const rows = [...c.querySelectorAll('[data-qz-opts] .le-row')].map((r) => ({ v: r.querySelector('[data-qz-opt]').value.trim(), ok: r.querySelector('input[type=radio]').checked })).filter((x) => x.v);
    const q = c.querySelector('[data-qz-q]').value.trim();
    return q && rows.length >= 2 ? { q, o: rows.map((x) => x.v), a: Math.max(0, rows.findIndex((x) => x.ok)) } : null;
  }).filter(Boolean);

  const sec = (title, open, body, note = '') => `<details class="ed-sec" ${open ? 'open' : ''}><summary>${title}${note ? `<small>${note}</small>` : ''}</summary><div class="stack" style="gap:8px;margin-top:8px">${body}</div></details>`;
  const help = (t) => `<p class="hint-note" style="margin:-2px 0 2px">${t}</p>`;
  const cb = (id, label, on, extra = '', note = '') => `<label class="opt"><input type="checkbox" id="${id}" ${on ? 'checked' : ''} ${extra}><span class="opt-box" aria-hidden="true"></span><span class="opt-text">${label}${note ? `<small>${note}</small>` : ''}</span></label>`;
  const rd = (name, v, label, on, note = '') => `<label class="opt"><input type="radio" name="${name}" value="${v}" ${on ? 'checked' : ''}><span class="opt-box round" aria-hidden="true"></span><span class="opt-text">${label}${note ? `<small>${note}</small>` : ''}</span></label>`;
  function trackEditor(t) {
    const f = SEED.trackFields(Engine.state.content, t), a = f.assess, quiz = a.quiz || [], m = SEED.missions[t], on = assessOn(m);
    return `<form class="stack as-editor" style="gap:10px;margin-top:10px" data-as-trackform="${t}">
      ${sec('1 · Where and what', true, `
        ${inp('ed-name', 'Name of this track', f.name, 'e.g. Evidence Detectives')}
        <div class="grid-2" style="gap:8px"><div>${inp('ed-loc', 'Where students go', f.location, 'e.g. Gallery 19, Ancient Egypt')}</div><div>${inp('ed-key', 'The object they look for', f.keyObject, 'e.g. the painted coffin set')}</div></div>
        ${ta('ed-narr', 'The big question they explore', f.narrative, 1, 'e.g. What can the object itself tell us?')}
        ${ta('ed-obs', 'What they do there (students read this)', f.observe, 3, 'e.g. Find the coffin set. Look closely at the shape, materials and decoration, then find its label.')}
        ${ta('ed-disc', 'A question to talk about with their group', f.discuss, 2, 'e.g. What can you see for yourself, and what are you guessing?')}
        ${cb('a-partner', 'Students also talk with the community partner here', f.needsContributor, '', 'The partner asks them one of the questions from the partner’s own list (you pick which in Live session). Students can send their notes once the partner confirms the chat on their phone.')}`, 'the place, the object, the task')}
      ${sec('2 · What students hand in', true, `
        <span class="fld">How students show they found it</span>
        <div class="opt-grid">${cb('a-photo', 'A photo of the object', on.photo, 'data-show="photo-box"', 'They photograph it on their phone.')}${cb('a-qr', 'Scan a QR card placed there', on.qr, '', 'You print the card from Live session.')}</div>
        <div class="opt-sub" data-show-box="photo-box" ${on.photo ? '' : 'hidden'}>
          <span class="fld">Who checks the photo</span>
          <div class="opt-grid">${rd('a-pcheck', 'photo_teacher', 'You confirm each photo', a.checkin !== 'photo_ai')}${rd('a-pcheck', 'photo_ai', 'AI checks first', a.checkin === 'photo_ai', 'You decide when it’s unsure. The photo is sent to the AI, then discarded.')}</div>
          <span class="fld">Reference photo for the AI (optional)</span>
          ${refDraft ? `<img class="ev-photo" src="${refDraft}" alt="Reference photo">` : '<span class="hint-note">Without one, the AI matches the photo against the object’s name.</span>'}
          <div class="row" style="gap:6px"><label class="btn btn-ghost btn-sm" for="as-ref">${refDraft ? 'Replace photo' : 'Add a photo'}</label><input id="as-ref" type="file" accept="image/*" hidden>
          ${refDraft ? '<button class="btn btn-ghost btn-sm" type="button" data-as-ref-clear>Remove photo</button>' : ''}</div></div>
        <span class="fld">What they hand in</span>
        <div class="opt-grid">${cb('a-notes', 'Written answers', on.notes, 'data-show="notes-box"', 'They answer your questions on site.')}${cb('a-evphoto', 'A photo of a detail', on.evphoto, 'data-show="evp-box"', 'e.g. the symbol they want to explain.')}</div>
        <div class="opt-sub" data-show-box="notes-box" ${on.notes ? '' : 'hidden'}>
          <span class="fld">Questions they answer</span>${help('Start with what they can see, then what it might mean, then what it can’t tell us.')}
          ${listEd('ev', f.evidence, 'e.g. Something you can actually see', 'Add a question')}
          <span class="fld">What a good answer includes</span>${help('You check answers against this, and the Report uses it to spot misunderstandings.')}
          ${listEd('crit', f.criteria, 'e.g. Says what the object can’t tell us', 'Add a point')}</div>
        <div class="opt-sub" data-show-box="evp-box" ${on.evphoto ? '' : 'hidden'}>
          ${inp('ed-photoask', 'What the photo should show', a.photoAsk || '', 'e.g. A close-up of one symbol on the lid')}${help('Students see this above the camera button. You see the photo when you check their work.')}</div>
        ${cb('a-quiz', 'Add a multiple-choice check', on.quiz, 'data-show="qz-box"', 'Students must pass it before they can send their notes. It doesn’t replace your check.')}
        <div class="stack qz-box" data-show-box="qz-box" style="gap:8px" ${on.quiz ? '' : 'hidden'}>
          <div class="stack" style="gap:8px" data-qz>${(quiz.length ? quiz : [null]).map(qzCard).join('')}</div>
          <button type="button" class="btn btn-ghost btn-sm le-add" data-qz-add>${Art.icon('plus', 14)} Add a question</button>
          <div class="row"><label class="fld" for="as-pass" style="margin:0">Questions they must get right</label><input class="input" id="as-pass" type="number" min="1" value="${a.pass || 1}" style="width:90px"></div></div>
        <span class="fld">Who checks their work</span>
        <div class="opt-grid">${rd('a-verify', 'teacher', 'You (the teacher)', a.verify !== 'partner', 'In Live session.')}${rd('a-verify', 'partner', 'The community partner', a.verify === 'partner', 'On their phone, under “On the day”.')}</div>`, 'check-in, notes, multiple choice')}
      ${sec('3 · Teaching their team', false, `
        ${inp('ed-teach', 'The key idea of this track, in one sentence', f.teachHeadline, 'e.g. Objects show us real details — but one object can’t speak for everyone.')}${help('Experts teach from their own notes. The team sees this key idea after the teammate’s check, as a recap — so the check isn’t given away.')}
        <span class="fld">Check that the team understood</span>${help('After the expert explains, a teammate picks the statement that matches. Tick the true one(s); the others should be tempting but wrong.')}
        ${checkListEd('chk', f.checks, 'A statement about what the expert found', 'Add a statement')}`, 'what the expert teaches, and a quick check')}
      ${sec('More options', false, `
        <span class="fld">Hints if students get stuck</span>${help('Point them back to the object — never give the answer.')}
        ${listEd('hints', f.hints, 'e.g. Look at the bottom edge — what material is it?', 'Add a hint')}
        ${inp('ed-fb', 'If they can’t get there (accessible or backup plan)', f.fallback, 'e.g. Use the museum’s online photos with the same questions')}
        ${inp('ed-code', 'Backup code you can read out if a QR card won’t scan', f.backupCode)}`, 'hints and backup plans')}
      <div class="row b-save"><button class="btn btn-primary" type="submit">Save track</button><button class="btn btn-ghost" type="button" data-as-edit-cancel>Cancel</button></div></form>`;
  }
  function readAssess(f) {
    const ck = (id) => !!(f.querySelector('#' + id) || {}).checked, val = (n) => (f.querySelector(`[name="${n}"]:checked`) || {}).value;
    const quiz = ck('a-quiz') ? readQuiz(f) : [], photo = ck('a-photo'), qr = ck('a-qr'), notes = ck('a-notes'), evphoto = ck('a-evphoto');
    const pv = Number((f.querySelector('#as-pass') || {}).value) || 1, v = val('a-verify') || 'teacher';
    return { checkin: photo ? (val('a-pcheck') === 'photo_ai' ? 'photo_ai' : 'photo_teacher') : qr ? 'qr' : 'none', qr: photo && qr,
      evidence: notes && evphoto ? 'notes_photo' : evphoto ? 'photo' : 'notes', photoAsk: ((f.querySelector('#ed-photoask') || {}).value || '').trim(), quiz, pass: quiz.length ? Math.max(1, Math.min(pv, quiz.length)) : 0,
      verify: v === 'partner' ? 'partner' : 'teacher' };
  }

  function finStep(x) {
    const head = (label) => `<div class="spread"><strong>${label}</strong><span class="row" style="gap:4px"><button type="button" class="btn btn-ghost btn-sm" data-fs-move="-1" aria-label="Move step up">↑</button><button type="button" class="btn btn-ghost btn-sm" data-fs-move="1" aria-label="Move step down">↓</button><button type="button" class="btn btn-danger-ghost btn-sm" data-fs-rm>Remove</button></span></div>`;
    if (x.type === 'write') return `<div class="fstep" data-fstep data-type="write" data-id="${x.id}">${head(`${Art.icon('pencil', 15)} Team answer`)}
      <label class="fld">The question the team answers together</label><textarea class="input" data-fs-q rows="2" placeholder="e.g. Write a label for the two objects, in 2 to 4 sentences.">${esc(x.prompt)}</textarea>
      <span class="fld">What a good answer includes</span><p class="hint-note" style="margin:-2px 0 2px">Students see this as a checklist; you tick it when you approve their answer.</p>
      ${listEd('fc-' + x.id, x.checks, 'e.g. Says what we still don’t know', 'Add a point')}</div>`;
    return `<div class="fstep" data-fstep data-type="choice" data-id="${x.id}">${head(`${Art.icon('check', 15)} Multiple choice`)}
      <label class="fld">The question</label><input class="input" data-fs-q value="${esc(x.question)}" placeholder="e.g. Which sentence is fair to put on the label?">
      <span class="fld">Answers (tick the right one)</span>${checkListEd('fo-' + x.id, x.options, 'An answer', 'Add an answer')}</div>`;
  }
  function finaleEditor(fin) {
    return `<form class="stack as-editor" style="gap:10px;margin-top:10px" data-as-finaleform>
      ${inp('fe-title', 'Name of the challenge', fin.title, 'e.g. Write the label together')}
      ${ta('fe-intro', 'What students are told at the start', fin.intro || '', 2, 'e.g. You’ve both found out something. Now put it together.')}
      <div class="stack" style="gap:10px" data-fsteps>${(fin.steps || []).map(finStep).join('')}</div>
      <div class="row" style="gap:6px"><span class="hint-note">Add a step:</span><button type="button" class="btn btn-secondary btn-sm" data-fs-add="choice">${Art.icon('plus', 14)} Multiple choice</button><button type="button" class="btn btn-secondary btn-sm" data-fs-add="write">${Art.icon('plus', 14)} Team answer</button></div>
      <div class="row b-save"><button class="btn btn-primary" type="submit">Save challenge</button><button class="btn btn-ghost" type="button" data-as-edit-cancel>Cancel</button></div></form>`;
  }
  const readFinale = (f) => ({ title: f.querySelector('#fe-title').value, intro: f.querySelector('#fe-intro').value,
    steps: [...f.querySelectorAll('[data-fstep]')].map((el) => { const id = el.dataset.id, q = el.querySelector('[data-fs-q]').value;
      return el.dataset.type === 'write' ? { id, type: 'write', prompt: q, checks: readList(el, 'fc-' + id) } : { id, type: 'choice', question: q, options: readCheckList(el, 'fo-' + id) }; }) });

  function extrasEditor(c) {
    return `<form class="stack as-editor" style="gap:6px;margin-top:10px" data-as-extrasform>
      ${ta('ex-open', 'Story opening (students read this at the briefing)', c.story.opening, 3)}
      <span class="fld">Reflection questions</span>${listEd('refl', c.reflection, 'A reflection question', 'Add question')}
      <div class="row"><button class="btn btn-primary btn-sm" type="submit">Save</button><button class="btn btn-ghost btn-sm" type="button" data-as-edit-cancel>Cancel</button></div></form>`;
  }

  function sourcesCard() {
    const st = Engine.state, locked = st.quest.status === 'PUBLISHED';
    return `<div class="card as-sources" id="as-sources">
      <div class="spread"><h3 style="margin:0">${Art.icon('book', 18)} Approved sources</h3><span class="pill lavender">${st.sources.length} in library</span></div>
      <p class="hint-note" style="margin:6px 0 10px">The only pages and notes the assistant may use. Add what you trust; remove what you don’t.</p>
      <div class="stack" style="gap:8px">${SRC().filter((s) => !s.partner).map((s) => `<div class="as-src" id="as-src-${s.id}"><span class="as-cite">${s.id}</span>
        <div style="min-width:0"><div class="spread"><strong>${esc(s.title)}</strong>
          <span class="row" style="gap:6px"><span class="pill plain">${s.kind === 'educator' ? 'added by you' : 'web page'}</span>${locked ? '' : `<button class="btn btn-ghost btn-sm" type="button" data-as-rmsrc="${s.id}" aria-label="Remove ${s.id}">Remove</button>`}</span></div>
        <p class="hint-note" style="margin:2px 0 0">${esc(s.fact)} ${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">open</a>` : ''}</p></div></div>`).join('') || '<p class="hint-note" style="margin:0">No sources yet. Add the pages or notes you trust below.</p>'}
        ${SRC().filter((s) => s.partner).map((s) => { const c = st.contributor; return `<div class="as-src as-partner-src" id="as-src-${s.id}"><span class="as-cite">${s.id}</span>
          <div style="min-width:0"><div class="spread"><strong>From your community partner</strong><span class="pill ${c.status === 'APPROVED' ? 'mint' : 'plain'}">${c.status === 'APPROVED' ? 'signed off' : c.text ? 'written · not signed off yet' : 'not written yet'}</span></div>
          <p class="hint-note" style="margin:2px 0 0">${c.text ? `“${esc(c.text)}”` : 'Your partner hasn’t written anything yet.'}</p>
          ${c.avoid ? `<p class="hint-note" style="margin:2px 0 0"><strong>Please avoid:</strong> ${esc(c.avoid)}</p>` : ''}
          ${(c.prompts || []).length ? `<p class="hint-note" style="margin:2px 0 0"><strong>Questions they’ll ask students:</strong> ${c.prompts.map(esc).join(' · ')}</p>` : ''}
          ${c.availability ? `<p class="hint-note" style="margin:2px 0 0"><strong>Available on the day:</strong> ${esc(c.availability)}</p>` : ''}</div></div>`; }).join('')}</div>
      ${locked ? '' : `<details style="margin-top:10px" ${st.sources.length < 2 ? 'open' : ''}><summary class="as-chip" style="display:inline-flex">${Art.icon('plus', 14)} Add a source</summary>
        <form class="stack" style="gap:6px;margin-top:10px" data-as-src>
          <label class="fld" for="src-title">Title</label><input class="input" id="src-title" placeholder="e.g. Venue learning team notes">
          <label class="fld" for="src-url">Link (optional)</label><input class="input" id="src-url" placeholder="https://…">
          <label class="fld" for="src-text">Relevant text</label><textarea class="input" id="src-text" rows="3" placeholder="Paste the facts the assistant may use"></textarea>
          <button class="btn btn-primary btn-sm" type="submit" style="align-self:flex-start">Add to library</button></form></details>`}
    </div>`;
  }

  /* ---------------- chat helpers ---------------- */
  function paintMsgs() {
    const box = document.getElementById('as-msgs');
    if (!box) return;
    box.innerHTML = msgs.map(msgHTML).join('');
    box.scrollTop = box.scrollHeight; chatPinned = true; saveConvo();
  }
  async function say(text, cites, parts, changes) {
    const m = { who: 'ai', text: '', thinking: true };
    msgs.push(m); paintMsgs();
    await sleep(700 + Math.random() * 400);
    m.thinking = false;
    for (const w of text.split(' ')) { m.text += (m.text ? ' ' : '') + w; paintMsgs(); await sleep(24); }
    m.cites = cites || [];
    m.parts = (parts || []).slice();
    m.changes = (changes || []).slice();
    paintMsgs();
  }
  async function typeInto(text) {
    const el = document.getElementById('as-in');
    if (!el) return;
    el.disabled = false; el.value = '';
    for (const ch of text) { el.value += ch; await sleep(10); }
    await sleep(200); el.value = '';
  }

  async function runRev(step, typed) {
    if (busy) return;
    busy = true;
    if (!typed) await typeInto(step.prompt);
    msgs.push({ who: 'you', text: typed || step.prompt }); paintMsgs();
    await say(step.reply, step.topic === 'D' ? [srcFor('D'), partnerSrc()].filter(Boolean) : [srcFor(step.topic)].filter(Boolean), [{ step: 'tracks', sel: '#as-track-' + step.topic, label: 'Track ' + step.topic, kind: 'tracks' }]);
    busy = false;
    const r = Engine.dispatch('reviseTrack', { topic: step.topic, note: step.note, patch: step.patch });
    if (r && !r.ok && r.msg) window.WQ?.toast(r.msg, 'error');
  }

  /* Scripted draft: same output every time — loads the example quest and its sources as if drafted. */
  async function scriptedDraft() {
    if (busy) return;
    busy = true;
    const q = Engine.state.quest, prompt = DRAFT.prompt(q);
    await typeInto(prompt);
    msgs.push({ who: 'you', text: prompt }); paintMsgs();
    const have = new Set(Engine.state.sources.map((s) => s.url));
    SEED.topics.forEach((t) => { const m = TEMPLATES.lost_museum.missions[t]; if (!have.has(m.sourceUrl)) Engine.dispatch('addSource', { title: m.gallery + ' · official page', url: m.sourceUrl, text: m.sourceFact }); });
    await say('Reading your sources: four Fitzwilliam gallery pages and your partner’s notes. Planning the perspectives: Evidence, Power & Memory, Multiple Lives, Connections & Voices…');
    const content = JSON.parse(JSON.stringify(TEMPLATES.lost_museum));
    if (q.title && q.title !== 'Untitled quest') content.title = q.title;
    Engine.dispatch('setContent', { content });
    if (!q.venue) Engine.dispatch('updateQuest', { field: 'venue', value: 'The Fitzwilliam Museum, Cambridge' });
    if (!q.objective) Engine.dispatch('updateQuest', { field: 'objective', value: 'Interpret evidence from multiple perspectives' });
    await say(`Drafted ${SEED.topics.length} expert tracks (Galleries 19, 20, 21 and 24${SEED.topics.length > 4 ? ', plus empty tracks for you to fill' : ''}), a locked finale that needs every perspective, ${SEED.collectibles.length} collectibles and ${SEED.reflection.length} reflection questions. Review and approve each track below — nothing reaches students until you do.`, Engine.state.sources.map((s) => s.id));
    busy = false;
    window.WQ.render();
    document.getElementById('as-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function freeText(text) {
    const st = Engine.state;
    if (mode === 'live' && st.quest.status !== 'PUBLISHED') return liveTurn(text);
    const t = text.toLowerCase();
    if (isTemplate()) {
      const rev = REVS.find((r) => !st.revisions[r.topic] && (t.includes('track ' + r.topic.toLowerCase()) || (r.topic === 'D' && /contributor|busy|unavailable/.test(t)) || (r.topic === 'B' && /hint/.test(t)) || (r.topic === 'C' && /simpl|easier|read/.test(t))));
      if (rev) return runRev(rev, text);
    }
    busy = true;
    msgs.push({ who: 'you', text }); paintMsgs();
    await say('Live AI is off, so I can’t write new content. Edit any part by hand below, or switch AI back on.');
    busy = false;
    window.WQ?.render();
  }

  /* ---------------- live AI ---------------- */
  async function call(body) {
    let pass = ''; try { pass = localStorage.getItem('wq-ai-pass') || ''; } catch {}
    try {
      const res = await fetch('/api/assistant', { method: 'POST', headers: { 'content-type': 'application/json', 'x-demo-passcode': pass }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => null);
      return { status: res.status, data };
    } catch { return { status: 0, data: null }; }
  }
  function failNotice(status) {
    if (status === 401) { needPass = true; lastNotice = ''; }
    else { mode = 'simulated'; offWhy = status === 503 ? 'the AI isn’t set up on this site yet' : 'it didn’t answer just now'; lastNotice = ''; }
  }
  function questBrief() {
    const q = Engine.state.quest;
    const au = q.audience || SEED.defaultAudience();
    return { title: q.title, objective: q.objective, venue: q.venue, minutes: q.duration, students: SEED.participants.length, tracks: SEED.topics.length, teams: SEED.homeGroups.length, audience: SEED.AUDIENCES[au.kind], ages: au.ages };
  }
  function liveContext() {
    const tracks = {};
    SEED.topics.forEach((t) => { const { refPhoto, backupCode, evidenceKeys, ...f } = SEED.trackFields(Engine.state.content, t); tracks[t] = { ...f, status: Engine.state.tracks[t] }; });
    const c = Engine.state.content, fin = SEED.finaleFields(c);
    const extras = { groups: { tracks: Engine.state.quest.structure.tracks, class_size: SEED.structure.classSize, teams: SEED.homeGroups },
      finale: fin,
      cards: c.collectibles.map((k) => ({ id: k.id, title: k.title, earned_when: k.kind, track: k.track, activity: k.activity, fact: k.fact })), story: c.story.opening, reflection: c.reflection };
    return { extras, quest: questBrief(), tracks, sources: SRC().filter((s) => s.fact).map((s) => ({ id: s.id, title: s.title, text: s.fact, url: s.url || '' })) };
  }

  /* One assistant tool call → one proposal the educator approves (tracks) or a settings change. */
  function applyEdit(e) {
    const i = e.input || {}, note = (i.summary || 'AI revision') + (i.source_ids && i.source_ids.length ? ` [${i.source_ids.join(', ')}]` : '');
    const D = (t, p) => Engine.dispatch(t, p), list = (v) => (Array.isArray(v) ? v.map(String).map((y) => y.trim()).filter(Boolean) : []);
    if (e.tool === 'set_groups') { const t = Math.max(1, Math.min(6, Number(i.tracks) || SEED.topics.length)), n = Math.max(2, Math.min(60, Number(i.class_size) || SEED.structure.classSize)); return D('setStructure', { tracks: t, classSize: n, expertGroup: Math.min(SEED.structure.expertGroup, Math.ceil(n / t)) }); }
    if (e.tool === 'remove_track') return SEED.topics.includes(i.topic) ? D('removeTrack', { topic: i.topic }) : null;
    if (e.tool === 'set_story') return i.opening ? D('editExtras', { opening: String(i.opening) }) : null;
    if (e.tool === 'set_reflection') { const q = list(i.questions).slice(0, 5); return q.length ? D('editExtras', { reflection: q }) : null; }
    if (e.tool === 'add_source') return D('addSource', { title: i.title, url: i.url || '', text: i.text });
    if (e.tool === 'remove_card') return D('removeCollectible', { collectibleId: i.card_id });
    if (e.tool === 'set_card') {
      let id = i.card_id; if (!id || id === 'new' || !Engine.state.content.collectibles.some((k) => k.id === id)) { const r = D('addCollectible'); if (!r.ok) return r; id = r.id; }
      const f = {}; ['title', 'activity', 'fact'].forEach((k) => { if (i[k]) f[k] = i[k]; }); if (i.earned_when) f.kind = i.earned_when; if (i.track) f.track = i.track; if (i.team) f.home = i.team;
      return D('editCollectible', { collectibleId: id, fields: f });
    }
    if (e.tool === 'set_finale') {
      const f = { title: i.title || '', intro: i.intro || '' };
      const steps = (i.steps || []).filter((y) => y && (y.question || '').trim()).map((y) => (y.type === 'write'
        ? { type: 'write', prompt: y.question, checks: list(y.checks) } : { type: 'choice', question: y.question, options: (y.options || []).filter((o) => o && o.text).map((o) => ({ text: o.text, correct: !!o.correct })) }));
      if (steps.length) f.steps = steps;
      return D('editFinale', { fields: f });
    }
    if (e.tool === 'update_quest_settings') {
      [['title', i.title], ['objective', i.objective], ['venue', i.venue], ['ages', i.ages]].forEach(([k, v]) => { if (v && String(v).trim()) Engine.dispatch('updateQuest', { field: k, value: String(v).trim() }); });
      if (Number(i.duration_minutes) > 0) Engine.dispatch('updateQuest', { field: 'duration', value: Number(i.duration_minutes) });
      return;
    }
    if (!SEED.topics.includes(i.topic)) return;
    const f = SEED.trackFields(Engine.state.content, i.topic);
    if (e.tool === 'revise_track' && i.field in f) f[i.field] = String(i.new_text || '');
    else if (e.tool === 'add_hint') f.hints = [...f.hints, String(i.hint || '')];
    else if (e.tool === 'set_track_list') { const k = { evidence_prompts: 'evidence', hints: 'hints', success_criteria: 'criteria' }[i.field]; if (!k) return; f[k] = (i.items || []).map(String).filter((x) => x.trim()); }
    else if (e.tool === 'set_assessment') {
      const quiz = (i.quiz || []).filter((q) => q && q.question && Array.isArray(q.options) && q.options.length >= 2)
        .map((q) => ({ q: String(q.question), o: q.options.slice(0, 6).map(String), a: Math.max(0, Math.min(Number(q.correct_index) || 0, Math.min(q.options.length, 6) - 1)) }));
      f.assess = { ...f.assess, checkin: i.checkin || f.assess.checkin, evidence: i.evidence || f.assess.evidence,
        verify: i.verify === 'partner' ? 'partner' : 'teacher', quiz, pass: quiz.length ? Math.max(1, Math.min(Number(i.pass_mark) || quiz.length, quiz.length)) : 0 };
    } else if (e.tool === 'set_teachback_check') {
      const st = (i.statements || []).filter((x) => x && String(x.text || '').trim());
      if (!st.some((x) => x.correct) || !st.some((x) => !x.correct)) return;
      f.checks = st.map((x) => ({ text: String(x.text).trim(), correct: !!x.correct, miss: x.correct ? '' : String(x.misconception || '') }));
    } else return;
    Engine.dispatch('reviseTrack', { topic: i.topic, note, patch: { fields: f }, by: 'ai' });
  }

  /* Which builder step + card an AI edit lands on, so the message can link to it. */
  const PART_ICON = { tracks: 'map', split: 'team', finale: 'puzzle', story: 'book', reflection: 'leaf', card: 'trophy', source: 'lens', trip: 'pencil' };
  function partTarget(e) {
    const i = e.input || {}, T = i.topic;
    if (['revise_track', 'set_track_list', 'set_assessment', 'set_teachback_check', 'add_hint'].includes(e.tool))
      return SEED.topics.includes(T) ? { step: 'tracks', sel: '#as-track-' + T, label: 'Track ' + T, kind: 'tracks' } : null;
    switch (e.tool) {
      case 'remove_track': return { step: 'tracks', sel: '#as-content', label: 'Tracks', kind: 'tracks' };
      case 'set_groups': return { step: 'trip', sel: '#as-splits', label: 'Class split', kind: 'split' };
      case 'set_finale': return { step: 'finale', sel: '#as-finale', label: 'Finale', kind: 'finale' };
      case 'set_story': return { step: 'finale', sel: '#as-extras', label: 'Story', kind: 'story' };
      case 'set_reflection': return { step: 'finale', sel: '#as-extras', label: 'Reflection', kind: 'reflection' };
      case 'set_card': return { step: 'finale', sel: '#as-collectibles', label: 'Collectibles', kind: 'card' };
      case 'remove_card': return { step: 'finale', sel: '#as-collectibles', label: 'Collectibles', kind: 'card' };
      case 'add_source': return { step: 'sources', sel: '#as-sources', label: 'Source', kind: 'source' };
      case 'update_quest_settings': return { step: 'trip', sel: '#as-trip', label: 'Trip', kind: 'trip' };
      default: return null;
    }
  }

  async function liveTurn(text) {
    busy = true;
    msgs.push({ who: 'you', text }); paintMsgs();
    const m = { who: 'ai', text: '', thinking: true }; msgs.push(m); paintMsgs();
    const { status, data } = await call({ mode: 'chat', message: text, history, ...liveContext() });
    msgs.pop();
    if (!data || data.error || status !== 200) { failNotice(status); busy = false; msgs.pop(); return status === 401 ? window.WQ.render() : freeText(text); }
    const cites = [...new Set((data.edits || []).flatMap((e) => e.input.source_ids || []))];
    const changes = (data.edits || []).map((e) => ({ text: String((e.input || {}).summary || '').trim() || 'Changed ' + ((partTarget(e) || {}).label || 'the quest') + '.', part: partTarget(e) }));
    await say(data.reply, cites, [], changes);
    // remember what was actually changed, not only what was said — so it doesn't redo or duplicate it next time
    history.push({ role: 'user', content: text }, { role: 'assistant', content: data.reply + (changes.length ? '\n[Changes I made: ' + changes.map((c) => c.text).join(' ') + ']' : '') }); saveConvo();
    for (const e of data.edits || []) applyEdit(e);
    busy = false;
    lastNotice = data.edits && data.edits.some((e) => ['revise_track', 'set_track_list', 'set_assessment', 'set_teachback_check', 'add_hint'].includes(e.tool)) ? 'Changed tracks need your approval again before students see them.' : '';
    window.WQ.render();
  }

  /* Generate a whole quest: one planning call, then tracks, finale and extras in parallel
     (each call stays well under the hosting time limit). */
  async function generate() {
    if (busy) return;
    const ctx = liveContext();
    if (!ctx.sources.length) { lastNotice = 'Add at least one approved source first — the assistant only writes from your sources.'; return window.WQ.render(); }
    // students need at least 2 tracks to teach each other; a quest with fewer gets 2
    const st0 = Engine.state.quest.structure;
    if (!st0.tracks || st0.tracks < 2) { const n = Math.max(2, SEED.structure.classSize); Engine.dispatch('setStructure', { tracks: 2, classSize: n, expertGroup: Math.min(SEED.structure.expertGroup, Math.ceil(n / 2)) }); ctx.quest = questBrief(); }
    busy = true; confirmGen = false; window.WQ.render();
    const prompt = `Plan a ${ctx.quest.minutes}-minute Jigsaw quest for ${ctx.quest.students} students${ctx.quest.venue ? ' at ' + ctx.quest.venue : ''}. Goal: ${ctx.quest.objective || 'decide from the sources'}.`;
    msgs.push({ who: 'you', text: prompt }); paintMsgs();
    const step = { who: 'ai', text: `Planning ${SEED.topics.length} complementary perspectives from your sources…`, thinking: false }; msgs.push(step); paintMsgs();
    const plan = await call({ mode: 'plan', quest: ctx.quest, sources: ctx.sources });
    if (plan.status !== 200 || !plan.data || !plan.data.plan) {
      msgs.pop(); msgs.pop(); busy = false;
      if (plan.data && plan.data.error === 'bad_plan') { lastNotice = `The AI’s plan didn’t have enough tracks (${SEED.topics.length} needed) — press Generate again.`; return window.WQ.render(); }
      failNotice(plan.status); return window.WQ.render();
    }
    const P = plan.data.plan;
    step.text = `Plan: ${P.tracks.map((t) => `${t.letter} ${t.name}`).join(' · ')}. Writing the tracks, finale and collectibles…`; paintMsgs();
    const [tr, fin, ext] = await Promise.all([
      Promise.all(SEED.topics.map((t) => call({ mode: 'track', letter: t, plan: P, quest: ctx.quest, sources: ctx.sources }))),
      call({ mode: 'finale', plan: P, quest: ctx.quest, sources: ctx.sources }),
      call({ mode: 'extras', plan: P, quest: ctx.quest, sources: ctx.sources }),
    ]);
    const content = JSON.parse(JSON.stringify(TEMPLATES.blank));
    SEED.ensureContentShape(content);
    content.title = P.title || Engine.state.quest.title;
    content.story = { ...content.story, opening: P.story_opening || '' };
    const failed = [];
    SEED.topics.forEach((t, i) => {
      const r = tr[i], pt = P.tracks.find((x) => x.letter === t) || {};
      const d = r.status === 200 && r.data && r.data.track ? r.data.track : null;
      if (!d) failed.push('Track ' + t);
      const src = ctx.sources.find((s) => (d && d.source_ids || []).includes(s.id));
      const b = SEED.buildTrack(t, {
        name: (d && d.name) || pt.name || '', location: (d && d.location) || pt.location || '', keyObject: (d && d.key_object) || pt.key_object || '',
        narrative: d ? d.narrative : pt.perspective || '', observe: d ? d.observe : '', discuss: d ? d.discuss : '',
        evidence: d ? d.evidence_prompts : [], criteria: d ? d.success_criteria : [], hints: d ? d.hints : [], fallback: d ? d.fallback : '', teachHeadline: d ? d.teach_headline : '',
        checkCorrect: d ? d.check_correct : '', checkIncorrect: d ? d.check_incorrect : '', needsContributor: !!(d ? d.needs_contributor : pt.needs_contributor),
        sourceFact: src ? src.text.slice(0, 280) : '', sourceUrl: src && src.url ? src.url : '',
        assess: (() => { const qz = d && Array.isArray(d.quiz) ? d.quiz.filter((x) => x && x.question && Array.isArray(x.options) && x.options.length >= 2).slice(0, 3).map((x) => ({ q: x.question, o: x.options.slice(0, 4), a: Math.max(0, Math.min(Number(x.correct_index) || 0, x.options.length - 1)) })) : [];
          return { ...SEED.defaultAssess(), quiz: qz, pass: qz.length ? Math.max(1, qz.length - 1) : 0 }; })(),
      });
      content.missions[t] = b.mission;
      content.topicMeta[t] = { ...content.topicMeta[t], name: b.mission.name || 'Track ' + t, label: b.label };
      content.peerTeaching.checkOptions[t] = b.check;
    });
    SEED.syncFinaleObjects(content);
    if (fin.status === 200 && fin.data && fin.data.finale) {
      const F = fin.data.finale;
      const steps = (F.steps || []).filter((y) => y && y.question).map((y) => (y.type === 'write' ? { type: 'write', prompt: y.question, checks: y.checks || [] } : { type: 'choice', question: y.question, options: y.options || [] }));
      SEED.buildFinale(content, { title: F.title, intro: F.intro || '', steps: steps.length ? steps : [SEED.finaleStep('choice'), SEED.finaleStep('write')] });
    } else failed.push('the finale');
    if (ext.status === 200 && ext.data && ext.data.extras) {
      const X = ext.data.extras;
      const colors = ['violet', 'teal', 'sun', 'coral', 'sky', 'lime'];
      content.collectibles = (X.cards || []).filter((k) => k && k.title).slice(0, 6).map((k, i) => ({ id: 'card_' + Date.now().toString(36) + i, title: k.title, color: colors[i % colors.length], category: k.earned_when === 'track' ? 'Badge' : 'Team',
        kind: ['track', 'experts', 'finale', 'bonus'].includes(k.earned_when) ? k.earned_when : 'finale', track: SEED.topics.includes(k.track) ? k.track : 'any',
        activity: k.earned_when === 'bonus' ? k.activity || '' : '', fact: k.fact || '', hidden: false, evolves: true, promptLabel: '' }));
      if (Array.isArray(X.reflection)) content.reflection = X.reflection.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 5);
    } else failed.push('collectibles and reflection');
    msgs.pop();
    const r = Engine.dispatch('setContent', { content });
    await say(r.ok
      ? `Drafted “${content.title}”: ${P.tracks.map((t) => t.name).join(', ')}, a final team challenge that needs every track, ${content.collectibles.length} reward cards and ${content.reflection.length} reflection questions.${failed.length ? ` I couldn’t finish ${failed.join(', ')} — fill those in by hand.` : ''} Review and approve each track below.`
      : 'The draft came back incomplete. Try again, or fill the quest in by hand.', ctx.sources.map((s) => s.id));
    history.push({ role: 'user', content: prompt }, { role: 'assistant', content: `Drafted ${content.title}.` }); saveConvo();
    busy = false;
    window.WQ.render();
    document.getElementById('as-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------------- events ---------------- */
  let delegated = false;
  function delegate() {
    if (delegated) return; delegated = true;
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-fs-add],[data-fs-move],[data-fs-rm]'); if (!el) return;
      e.preventDefault();
      if (el.matches('[data-fs-add]')) { const box = el.closest('form').querySelector('[data-fsteps]'); box.insertAdjacentHTML('beforeend', finStep(SEED.finaleStep(el.dataset.fsAdd))); box.lastElementChild.querySelector('[data-fs-q]').focus(); return; }
      const step = el.closest('[data-fstep]');
      if (el.matches('[data-fs-rm]')) { if (step.parentElement.querySelectorAll('[data-fstep]').length > 1 || confirm('Remove the last step?')) step.remove(); return; }
      const d = Number(el.dataset.fsMove), sib = d < 0 ? step.previousElementSibling : step.nextElementSibling;
      if (sib) (d < 0 ? sib.before(step) : sib.after(step));
    });
    document.addEventListener('change', (e) => { const k = e.target.dataset && e.target.dataset.show; if (k) document.querySelectorAll(`[data-show-box="${k}"]`).forEach((b) => { b.hidden = !e.target.checked; }); });
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-le-add],[data-le-rm],[data-qz-add],[data-qz-rm],[data-qz-opt-add],[data-qz-opt-rm]');
      if (!el) return;
      e.preventDefault();
      if (el.matches('[data-le-add]')) { const box = el.closest('[data-le]'), ph = box.dataset.ph || ''; el.insertAdjacentHTML('beforebegin', box.hasAttribute('data-lc') ? lcRow({ text: '', correct: false }, ph) : leRow('', ph)); el.previousElementSibling.querySelector('[data-le-item]').focus(); }
      else if (el.matches('[data-le-rm]')) { const box = el.closest('[data-le]'); if (box.querySelectorAll('.le-row').length > 1) el.closest('.le-row').remove(); else el.closest('.le-row').querySelector('[data-le-item]').value = ''; }
      else if (el.matches('[data-qz-add]')) { el.previousElementSibling.insertAdjacentHTML('beforeend', qzCard(null)); }
      else if (el.matches('[data-qz-rm]')) { el.closest('[data-qz-card]').remove(); }
      else if (el.matches('[data-qz-opt-add]')) { const box = el.previousElementSibling; if (box.querySelectorAll('.le-row').length >= 6) return window.WQ.toast('Six options is the most.', 'error'); box.insertAdjacentHTML('beforeend', qzOpt(box.dataset.g, '', false)); }
      else if (el.matches('[data-qz-opt-rm]')) { const box = el.closest('[data-qz-opts]'); if (box.querySelectorAll('.le-row').length <= 2) return window.WQ.toast('A question needs at least two options.', 'error'); el.closest('.le-row').remove(); }
    });
  }

  /* The chat keeps its place when the page redraws (e.g. switching builder steps):
     it stays at the newest message unless the educator had scrolled up to read. */
  let chatPinned = true, chatTop = 0;
  function bind(root) {
    delegate();
    const box = root.querySelector('#as-msgs');
    if (box) {
      box.scrollTop = chatPinned ? box.scrollHeight : chatTop;
      box.addEventListener('scroll', () => { chatTop = box.scrollTop; chatPinned = box.scrollHeight - box.scrollTop - box.clientHeight < 40; });
    }
    const on = (sel, ev, fn) => root.querySelectorAll(sel).forEach((el) => el.addEventListener(ev, (e) => fn(el, e)));
    on('[data-as-chip]', 'click', (b) => (b.dataset.asChip === 'draft' ? scriptedDraft() : runRev(REVS.find((r) => r.id === b.dataset.asChip))));
    on('[data-as-gen]', 'click', () => {
      const empty = SEED.topics.every((t) => !SEED.missions[t].name);
      if (empty) return generate();
      confirmGen = true; window.WQ.render();
    });
    on('[data-as-gen-go]', 'click', () => generate());
    on('[data-as-gen-no]', 'click', () => { confirmGen = false; window.WQ.render(); });
    on('[data-as-approve]', 'click', (b) => window.WQ.act('approveTrack', { topic: b.dataset.asApprove }));
    on('[data-as-ask]', 'click', (b) => { const i = document.getElementById('as-in'); if (i) { i.value = `Track ${b.dataset.asAsk}: `; i.focus(); i.scrollIntoView({ behavior: 'smooth', block: 'center' }); } });
    on('[data-as-jump]', 'click', (b) => {
      const [step, sel] = b.dataset.asJump.split('|');
      const go = (r) => { if (!r) return; r.classList.add('flash'); r.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => r.classList.remove('flash'), 1400); };
      const here = Engine.state.ui.bStep === step && document.querySelector(sel);
      if (here && !editing) return go(here);
      Engine.state.ui.bStep = step; openEditor(null); window.WQ.render();
      setTimeout(() => go(document.querySelector(sel)), 30);
    });
    on('[data-as-cite]', 'click', (b) => {
      const id = b.dataset.asCite;
      const go = (r) => { if (!r) return; r.classList.add('flash'); r.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => r.classList.remove('flash'), 1400); };
      const row = document.getElementById('as-src-' + id);
      if (row) return go(row);
      // The source list lives on the "Sources" builder step; switch to it first so the row is in the DOM, then jump to it.
      Engine.state.ui.bStep = 'sources'; openEditor(null); window.WQ.render();
      setTimeout(() => go(document.getElementById('as-src-' + id)), 30);
    });
    on('[data-as-clear]', 'click', () => { if (busy) return; clearConvo(); window.WQ.render(); });
    on('[data-as-mode]', 'click', () => { mode = mode === 'live' ? 'simulated' : 'live'; offWhy = mode === 'live' ? '' : 'you switched it off on this device'; lastNotice = ''; try { localStorage.setItem('wq-ai-mode', mode); } catch {} window.WQ.render(); });
    on('[data-as-edit]', 'click', (b) => { editing = editing === b.dataset.asEdit ? null : b.dataset.asEdit; refDraft = editing && SEED.missions[editing] ? SEED.missions[editing].refPhoto || null : null; window.WQ.render(); });
    on('[data-as-ref-clear]', 'click', () => { refDraft = null; window.WQ.render(); });
    on('#as-ref', 'change', (input) => {
      const file = input.files[0]; if (!file) return;
      const img = new Image();
      img.onload = () => { const k = Math.min(1, 480 / Math.max(img.width, img.height)), cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        refDraft = cv.toDataURL('image/jpeg', 0.6); window.WQ.render(); };
      img.src = URL.createObjectURL(file);
    });
    on('[data-as-edit-cancel]', 'click', () => { editing = null; quizOpen = false; window.WQ.render(); });
    on('[data-as-addcard]', 'click', () => { const r = window.WQ.act('addCollectible'); if (r.ok) { editing = 'c:' + r.id; window.WQ.render(); } });
    on('[data-as-rmcard]', 'click', (b) => { if (confirm('Remove this card?')) window.WQ.act('removeCollectible', { collectibleId: b.dataset.asRmcard }); });
    on('[data-as-addtrack]', 'click', () => { const s = SEED.structure, t = (Engine.state.quest.structure.tracks === 0 ? 0 : s.tracks) + 1, n = Math.max(s.classSize, t); const r = window.WQ.act('setStructure', { tracks: t, classSize: n, expertGroup: Math.min(s.expertGroup, Math.ceil(n / t)) }); if (r.ok) setTimeout(() => document.getElementById('as-track-' + SEED.topics[SEED.topics.length - 1])?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 30); });
    on('[data-as-rmtrack]', 'click', (b) => { const t = b.dataset.asRmtrack; if (confirm(`Remove track ${t} (${SEED.missions[t].name || 'untitled'})? Its content will be deleted.`)) { if (editing === t) editing = null; window.WQ.act('removeTrack', { topic: t }); } });
    on('[data-as-quiz]', 'click', (b) => { editing = b.dataset.asQuiz; quizOpen = true; refDraft = SEED.missions[editing].refPhoto || null; window.WQ.render(); setTimeout(() => document.querySelector('[data-qz]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 30); });
    on('[data-as-collform]', 'submit', (f, e) => {
      e.preventDefault();
      const v = (id) => f.querySelector('#' + id).value;
      editing = null;
      window.WQ.act('editCollectible', { collectibleId: f.dataset.asCollform, fields: { title: v('ce-t'), kind: v('ce-k'), track: v('ce-tr'), activity: v('ce-a'), fact: v('ce-f'), hidden: f.querySelector('#ce-h').checked, evolves: f.querySelector('#ce-e').checked } });
    });
    on('[data-as-trackform]', 'submit', (f, e) => {
      e.preventDefault();
      const v = (id) => f.querySelector('#' + id).value.trim(), tk = f.dataset.asTrackform, old = SEED.trackFields(Engine.state.content, tk);
      const fields = { name: v('ed-name'), location: v('ed-loc'), keyObject: v('ed-key'), narrative: v('ed-narr'), observe: v('ed-obs'), discuss: v('ed-disc'),
        evidence: readList(f, 'ev'), evidenceKeys: old.evidenceKeys, criteria: readList(f, 'crit'), hints: readList(f, 'hints'), fallback: v('ed-fb'), teachHeadline: v('ed-teach'), checks: readCheckList(f, 'chk'),
        needsContributor: f.querySelector('#a-partner').checked, sourceFact: old.sourceFact, sourceUrl: old.sourceUrl, assess: readAssess(f), refPhoto: refDraft, backupCode: v('ed-code') };
      editing = null; refDraft = null; quizOpen = false;
      window.WQ.act('editTrack', { topic: tk, fields });
    });
    on('[data-as-finaleform]', 'submit', (f, e) => {
      e.preventDefault();
      const fields = readFinale(f);
      editing = null;
      window.WQ.act('editFinale', { fields });
    });
    on('[data-as-extrasform]', 'submit', (f, e) => {
      e.preventDefault();
      editing = null;
      window.WQ.act('editExtras', { opening: f.querySelector('#ex-open').value.trim(), reflection: readList(f, 'refl') });
    });
    on('[data-as-rmsrc]', 'click', (b) => window.WQ.act('removeSource', { id: b.dataset.asRmsrc }));
    on('[data-as-src]', 'submit', (sf, e) => { e.preventDefault(); window.WQ.act('addSource', { title: sf.querySelector('#src-title').value, url: sf.querySelector('#src-url').value, text: sf.querySelector('#src-text').value }); });
    on('[data-as-pass]', 'submit', (pf, e) => { e.preventDefault(); try { localStorage.setItem('wq-ai-pass', pf.querySelector('#as-passcode').value.trim()); } catch {} checkPass(true); });
    on('[data-as-form]', 'submit', (f, e) => {
      e.preventDefault();
      const v = document.getElementById('as-in').value.trim();
      if (v && !busy) { document.getElementById('as-in').value = ''; freeText(v); }
    });
  }

  /* Is the live AI endpoint deployed here? A GET costs nothing (the function answers 405); a plain static server answers 404. */
  try {
    fetch('/api/assistant', { method: 'GET' }).then((r) => {
      if (r.status === 405) checkPass();
      if (r.status !== 405 && mode === 'live') { mode = 'simulated'; offWhy = 'this copy of the app has no AI connection (e.g. running on your own computer)'; window.WQ && window.WQ.render(); }
    }).catch(() => { if (mode === 'live') { mode = 'simulated'; offWhy = 'there’s no internet connection'; window.WQ && window.WQ.render(); } });
  } catch {}
  const openEditor = (k) => { syncQuest(); editing = k || null; quizOpen = false; refDraft = k && SEED.missions[k] ? SEED.missions[k].refPhoto || null : null; };
  return { forgetAll, getMode: () => mode, checkPass, chat, board, bind, openEditor, sources: () => (syncQuest(), sourcesCard()), tracks: () => (syncQuest(), tracksSection(Engine.state)), finale: () => (syncQuest(), finaleSection(Engine.state)), collectibles: () => (syncQuest(), collectiblesSection(Engine.state)), story: () => (syncQuest(), storySection(Engine.state)), generate, listEd, readList, setSpeed: (v) => { speed = v; }, setMode: (m) => { mode = m; } };
})();
