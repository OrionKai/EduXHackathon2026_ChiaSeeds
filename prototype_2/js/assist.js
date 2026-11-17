/* WorldQuest prototype_2 — quest content editor + AI assistant for the educator's quest builder.
 * The quest's content lives in the session (see seed.js): four expert tracks, the finale,
 * collectibles, reflection questions and the story. The educator can edit every part by hand,
 * ask the assistant to change it, or generate a whole quest from the approved-source library.
 * Live AI runs through /api/assistant (Netlify function); when it's unavailable or switched off,
 * a scripted assistant answers (for the Lost Museum template) and everything stays editable by hand.
 * Every AI change is a proposal: tracks need the educator's approval before publishing.
 */
'use strict';

const Assistant = (() => {
  const msgs = [{ who: 'ai', text: 'Hi! I draft only from the approved sources in your library. Add anything else I should use, then tell me what the quest is for.' }];
  let editing = null; // 'A'..'D' | 'finale' | 'extras'
  let refDraft = null; // reference photo being edited for the open track
  let quizOpen = false;
  let busy = false, speed = 1, confirmGen = false;
  let mode = (() => { try { return localStorage.getItem('wq-ai-mode') || 'live'; } catch { return 'live'; } })();
  let needPass = false, lastNotice = '';
  const history = [];
  const sleep = (ms) => (speed ? new Promise((r) => setTimeout(r, ms * speed)) : Promise.resolve());
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lines = (v) => String(v || '').split('\n').map((x) => x.trim()).filter(Boolean);

  const SRC = () => Engine.state.sources.map((s) => (s.kind === 'partner' ? { ...s, fact: Engine.state.contributor.text, partner: true } : { ...s, fact: s.text }));
  const srcFor = (t) => (Engine.state.sources.find((s) => s.url && s.url === SEED.missions[t].sourceUrl) || { id: '' }).id;
  const partnerSrc = () => (Engine.state.sources.find((s) => s.kind === 'partner') || { id: '' }).id;
  const isTemplate = () => (Engine.state.content.meta || {}).id === 'lost_museum';
  const isEmpty = () => SEED.topics.every((t) => !SEED.missions[t].name);

  /* Scripted revisions exist only for the Lost Museum template (they are written for its content). */
  const REVS = [
    { id: 'ra', topic: 'A', chip: 'Track A: add a quick check', prompt: 'Add a short multiple-choice check to Track A and verify it automatically if students pass.',
      note: 'Added a 2-question check (pass 2/2), verified automatically.',
      patch: { assess: { quiz: [
        { q: 'Which of these is an observation, not an interpretation?', o: ['The lid has painted decoration', 'Everyone in ancient Egypt had a coffin like this', 'The owner must have been very rich', 'One artist made the whole set'], a: 0 },
        { q: 'According to the gallery page, when was the coffin set given to the museum?', o: ['1822', '1923', '1700', '2001'], a: 0 }], pass: 2, verify: 'auto' } },
      reply: 'Added a 2-question check to Track A: one separates observation from interpretation, one comes straight from the gallery page. Students who get both right are verified automatically; anyone else looks again at the object.' },
    { id: 'rc', topic: 'C', chip: 'Track C: simpler wording', prompt: 'Make Track C easier to read for students who struggle with long instructions.',
      note: 'Instructions shortened to about a 12-year-old reading level.',
      patch: { observe: 'Find two different kinds of object, like a painted pot and a coin. Write down what you see on each one.' },
      reply: 'Done. Track C now uses shorter instructions at about a 12-year-old reading level. The evidence it asks for hasn’t changed, so the finale still works.' },
    { id: 'rd', topic: 'D', chip: 'Track D: if the contributor is busy', prompt: 'What happens in Track D if the community contributor is busy?',
      note: 'Fallback added: labelled prompt card and a staggered schedule (max 5 students at a time).',
      patch: { fallback: 'If the contributor is busy: use the partner’s prompt card at the gallery door (clearly labelled), then talk to them later. No more than 5 students at a time.' },
      reply: 'I added a fallback for Track D: a clearly labelled prompt card built from the partner’s approved questions, and a staggered schedule so no more than 5 students reach them at once.' },
    { id: 'rb', topic: 'B', chip: 'Track B: a hint, not an answer', prompt: 'Add a hint to Track B that helps without giving the answer away.',
      note: 'New hint about comparing scale.',
      patch: { hint: 'Compare its size with nearby cases. What might scale suggest about who it honoured?' },
      reply: 'Added a hint to Track B: “Compare its size with nearby cases. What might scale suggest about who it honoured?” It points students back to the object rather than giving the answer.' },
  ];
  const DRAFT = { id: 'draft', chip: 'Draft the quest from my sources', prompt: (q) => `Draft a ${q.duration || 60}-minute Jigsaw quest for ${q.classSize || 20} students at the Fitzwilliam Museum using my sources.` };
  /* Suggestions are scripted and repeatable (for demos); anything typed goes to the live AI. */
  const chips = () => {
    const st = Engine.state;
    if (st.quest.status === 'PUBLISHED') return [];
    if (isEmpty()) return [DRAFT];
    return isTemplate() ? REVS.filter((r) => !st.revisions[r.topic]) : [];
  };

  /* ---------------- rendering ---------------- */
  function msgHTML(m) {
    return `<div class="as-msg ${m.who}">${m.thinking ? '<span class="as-dots"><i></i><i></i><i></i></span>' : esc(m.text)}
      ${m.cites && m.cites.length ? `<div class="row" style="gap:4px;margin-top:6px">${m.cites.map((c) => `<button class="as-cite" data-as-cite="${c}" type="button">${c}</button>`).join('')}</div>` : ''}</div>`;
  }

  function chat() {
    const st = Engine.state, cs = chips(), locked = st.quest.status === 'PUBLISHED';
    return `
      <div class="card as-card">
        <div class="spread"><h3 style="margin:0">${Art.icon('sparkle', 18)} Quest assistant</h3>
          <button type="button" class="pill ${mode === 'live' ? 'mint' : ''}" data-as-mode title="Switch between the real AI and the scripted demo">AI: ${mode === 'live' ? 'live (Claude)' : 'off · scripted'}</button></div>
        ${lastNotice ? `<p class="hint-note" style="margin:0">${esc(lastNotice)}</p>` : ''}
        ${needPass ? `<form class="row" data-as-pass><label class="sr-only" for="as-pass">Demo passcode</label><input class="input" id="as-pass" type="password" placeholder="Demo passcode for live AI" style="flex:1"><button class="btn btn-secondary btn-sm">Save</button></form>` : ''}
        <div class="as-msgs" id="as-msgs">${msgs.map(msgHTML).join('')}</div>
        ${!locked && mode === 'live' ? (confirmGen
          ? `<div class="row"><span class="small">Replace the current content with a new AI draft?</span><button class="btn btn-primary btn-sm" type="button" data-as-gen-go>Yes, generate</button><button class="btn btn-ghost btn-sm" type="button" data-as-gen-no>Cancel</button></div>`
          : `<button class="as-chip" type="button" data-as-gen ${busy ? 'disabled' : ''}>${Art.icon('sparkle', 14)} Generate the whole quest from my sources</button>`) : ''}
        ${cs.length ? `<div class="stack" style="gap:6px"><span class="hint-note" style="margin:0">Suggestions <span class="pill plain">scripted · same reply every time</span></span><div class="row" style="gap:6px">${cs.map((c) => `<button class="as-chip" type="button" data-as-chip="${c.id}" ${busy ? 'disabled' : ''}>${Art.icon(c.id === 'draft' ? 'sparkle' : 'pencil', 14)} ${esc(c.chip)}</button>`).join('')}</div></div>` : ''}
        <form class="as-compose" data-as-form><label class="sr-only" for="as-in">Message the assistant</label>
          <input class="input" id="as-in" placeholder="${mode === 'live' ? 'Ask for a change, e.g. “make Track B shorter”' : 'Live AI is off — edit by hand below'}" autocomplete="off" ${busy ? 'disabled' : ''}>
          <button class="btn btn-primary btn-sm" type="submit" ${busy ? 'disabled' : ''}>Send</button></form>
        <p class="hint-note" style="margin:0">AI drafts at design time only. Gameplay never calls AI, so the quest keeps working offline.</p>
      </div>`;
  }
  function board() {
    const st = Engine.state;
    return `${sourcesCard()}${tracksSection(st)}${finaleSection(st)}${collectiblesSection(st)}${storySection(st)}`;
  }

  const LABEL = { TEMPLATE: ['st-available', 'From template'], EMPTY: ['st-locked', 'To write'], AI: ['st-submitted', 'AI draft'], REVISED: ['st-submitted', 'AI revised'], EDITED: ['st-submitted', 'Edited by you'], APPROVED: ['st-verified', 'Approved'] };

  /* Each track is built from blocks the educator mixes and matches. */
  const BLOCKS = [
    { group: 'Check-in', opts: [['photo_ai', 'Photo · AI checks'], ['photo_teacher', 'Photo · you check'], ['qr', 'QR clue card'], ['none', 'No check-in']], get: (a) => a.checkin, set: (v) => ({ checkin: v }) },
    { group: 'At the place', multi: true, opts: [['observe', 'Observe'], ['partner', 'Partner conversation'], ['discuss', 'Discuss']] },
    { group: 'Evidence', multi: true, opts: [['notes', 'Field notes'], ['photo', 'Photo']] },
    { group: 'Quick check', multi: true, opts: [['quiz', 'Multiple-choice quiz']] },
    { group: 'Verified by', opts: [['teacher', 'You'], ['partner', 'Community partner'], ['auto', 'Automatic (quiz)']], get: (a) => a.verify, set: (v) => ({ verify: v }) },
  ];
  function blocksHTML(t, m, locked) {
    const a = m.assess || SEED.defaultAssess(), quiz = (a.quiz || []).length > 0;
    const on = { observe: true, discuss: true, partner: !!m.needsFacilitator, notes: a.evidence !== 'photo', photo: a.evidence !== 'notes', quiz };
    return `<div class="blocks">${BLOCKS.map((g) => `<div class="blk-group"><span class="blk-label">${g.group}</span><div class="blk-row">${g.opts.map(([v, l]) => {
      const active = g.multi ? on[v] : g.get(a) === v;
      const fixed = v === 'observe' || v === 'discuss';
      const disabled = locked || fixed || (v === 'auto' && !quiz);
      return `<button type="button" class="blk ${active ? 'on' : ''}" data-as-block="${t}|${g.group}|${v}" ${disabled ? 'disabled' : ''} title="${fixed ? 'Always part of a Jigsaw track' : v === 'auto' && !quiz ? 'Add a quiz first' : ''}">${esc(l)}</button>`;
    }).join('')}</div></div>`).join('')}</div>`;
  }
  function toggleBlock(t, group, v) {
    const m = SEED.missions[t], a = m.assess || SEED.defaultAssess();
    if (group === 'Check-in') return Engine.dispatch('setAssess', { topic: t, patch: { checkin: v } });
    if (group === 'Verified by') return Engine.dispatch('setAssess', { topic: t, patch: { verify: v } });
    if (v === 'partner') return Engine.dispatch('setAssess', { topic: t, patch: { partner: !m.needsFacilitator } });
    if (v === 'notes' || v === 'photo') {
      const notes = a.evidence !== 'photo', photo = a.evidence !== 'notes';
      const n = v === 'notes' ? !notes : notes, p = v === 'photo' ? !photo : photo;
      if (!n && !p) return { ok: false, msg: 'Keep at least one kind of evidence.' };
      return Engine.dispatch('setAssess', { topic: t, patch: { evidence: n && p ? 'notes_photo' : p ? 'photo' : 'notes' } });
    }
    if (v === 'quiz') {
      if ((a.quiz || []).length) return Engine.dispatch('setAssess', { topic: t, patch: { quiz: [], pass: 0, verify: a.verify === 'auto' ? 'teacher' : a.verify } });
      editing = t; refDraft = m.refPhoto || null; quizOpen = true; return { ok: true };
    }
    return { ok: false };
  }

  function tracksSection(st) {
    const locked = st.quest.status === 'PUBLISHED';
    const probs = SEED.contentProblems(st.content);
    const n = SEED.topics.filter((t) => st.tracks[t] === 'APPROVED').length;
    return `
      <section class="card" id="as-content">
        <div class="spread"><h3 style="margin:0">${Art.icon('map', 18)} Expert tracks</h3><span class="row" style="gap:6px"><span class="pill lavender">${n}/${SEED.topics.length} approved</span>${probs.length ? `<span class="pill peach">${probs.length} to complete</span>` : '<span class="pill mint">complete</span>'}</span></div>
        <p class="hint-note" style="margin:6px 0 10px">One member of every home team investigates each track, then teaches the others. Mix and match the blocks each track uses.</p>
        <div class="stack" style="gap:10px">
          ${SEED.topics.map((t) => {
            const m = SEED.missions[t], [cls, txt] = LABEL[st.tracks[t]] || LABEL.EDITED, tp = probs.filter((x) => x.startsWith(`Track ${t}:`));
            return `<div class="as-track" id="as-track-${t}">
              <div class="spread"><div class="row" style="gap:8px"><span class="topic-chip ${SEED.topicMeta[t].color}">${Art.icon(SEED.topicMeta[t].icon, 14)}${t}</span><strong>${esc(m.name || 'Untitled track')}</strong></div>
                <span class="status-chip ${cls}">${txt}</span></div>
              <p class="hint-note" style="margin:6px 0">${m.gallery ? esc(m.gallery) + ' · ' : ''}${esc(m.narrative || m.observe || 'Nothing written yet.')} ${srcFor(t) ? `<button class="as-cite" type="button" data-as-cite="${srcFor(t)}">${srcFor(t)}</button>` : ''}</p>
              ${blocksHTML(t, m, locked)}
              ${tp.length ? `<p class="hint-note" style="margin:6px 0;color:var(--danger)">Missing: ${tp.map((x) => esc(x.split(': ')[1])).join(', ')}</p>` : ''}
              ${st.revisions[t] ? `<p class="as-note">${Art.icon('pencil', 14)} ${esc(st.revisions[t])}</p>` : ''}
              ${locked ? '' : `<div class="row" style="gap:6px;margin-top:6px">${st.tracks[t] === 'APPROVED' ? '' : `<button class="btn btn-teal btn-sm" type="button" data-as-approve="${t}">${Art.icon('check', 14)} Approve</button>`}
                <button class="btn btn-ghost btn-sm" type="button" data-as-edit="${t}">${editing === t ? 'Close' : 'Edit details'}</button>
                ${mode === 'live' ? `<button class="btn btn-ghost btn-sm" type="button" data-as-ask="${t}">Ask AI to change</button>` : ''}</div>`}
              ${editing === t && !locked ? trackEditor(t) : ''}
            </div>`;
          }).join('')}
        </div>
      </section>`;
  }

  function finaleSection(st) {
    const locked = st.quest.status === 'PUBLISHED', f = SEED.finaleFields(st.content);
    return `<section class="card" id="as-finale">
      <div class="spread"><h3 style="margin:0">${Art.icon('puzzle', 18)} Finale: ${esc(st.content.finale.title || 'Untitled')}</h3>${locked ? '' : `<button class="btn btn-ghost btn-sm" type="button" data-as-edit="finale">${editing === 'finale' ? 'Close' : 'Edit'}</button>`}</div>
      <p class="hint-note" style="margin:6px 0 0">Locked until every track in a home team is verified and taught. Teams match each key object to its perspective (${st.content.finale.objects.map((o) => esc(o.label || '—')).join(' · ')}), spot the overclaim, then build a short answer from ${f.evidence.length} evidence sentences.</p>
      ${editing === 'finale' && !locked ? finaleEditor(f) : ''}
    </section>`;
  }

  function collectiblesSection(st) {
    const locked = st.quest.status === 'PUBLISHED';
    return `<section class="card" id="as-collectibles">
      <div class="spread"><h3 style="margin:0">${Art.icon('trophy', 18)} Collectibles</h3><span class="pill plain">optional · never block the quest</span></div>
      <p class="hint-note" style="margin:6px 0 10px">One card per home team; all five unlock the class award (${esc(SEED.master.title)}). Choose how each one is earned.</p>
      <div class="coll-grid">${st.content.collectibles.map((c) => editing === 'c:' + c.id && !locked ? collEditor(c) : `<div class="coll-item">
        <div class="row" style="gap:10px;flex-wrap:nowrap"><div class="collect-card claimed" style="width:64px;min-width:64px;cursor:default">${Art.collectibleArt[c.id] ? Art.collectibleArt[c.id]() : ''}</div>
          <div style="min-width:0"><strong>${esc(c.title || 'Untitled card')}</strong><br><small class="hint-note">Team ${c.home}</small></div></div>
        <p class="hint-note" style="margin:6px 0 4px"><strong>Earned when:</strong> ${c.kind === 'track' ? `the team’s ${esc(SEED.missions[c.track].name || 'Track ' + c.track)} expert is verified` : esc((SEED.EARN_TEXT[c.kind] || '').toLowerCase())}</p>
        ${c.kind === 'bonus' && c.activity ? `<p class="hint-note" style="margin:0 0 4px">Activity: ${esc(c.activity)}</p>` : ''}
        <div class="row" style="gap:4px">${c.hidden ? '<span class="pill plain">hidden until found</span>' : ''}${c.evolves ? '<span class="pill plain">levels up at the next experience</span>' : ''}</div>
        ${locked ? '' : `<button class="btn btn-ghost btn-sm" type="button" data-as-edit="c:${c.id}" style="margin-top:6px">Edit</button>`}
      </div>`).join('')}</div>
    </section>`;
  }
  function collEditor(c) {
    return `<form class="coll-item stack as-editor" style="gap:6px" data-as-collform="${c.id}">
      ${inp('ce-t', 'Name', c.title)}
      <label class="fld" for="ce-k">Earned when</label><select class="input" id="ce-k">${Object.entries(SEED.EARN_TEXT).map(([k, l]) => `<option value="${k}" ${c.kind === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
      <label class="fld" for="ce-tr">Track (for “one track verified”)</label><select class="input" id="ce-tr">${SEED.topics.map((t) => `<option value="${t}" ${c.track === t ? 'selected' : ''}>${t} · ${esc(SEED.missions[t].name || 'Track ' + t)}</option>`).join('')}</select>
      ${inp('ce-a', 'Bonus activity (for “team bonus activity”)', c.activity)}
      ${inp('ce-f', 'Fact shown when earned', c.fact)}
      <label class="toggle"><input type="checkbox" id="ce-h" ${c.hidden ? 'checked' : ''}> Hidden until found</label>
      <label class="toggle"><input type="checkbox" id="ce-e" ${c.evolves ? 'checked' : ''}> Levels up at the next experience</label>
      <div class="row"><button class="btn btn-primary btn-sm" type="submit">Save</button><button class="btn btn-ghost btn-sm" type="button" data-as-edit-cancel>Cancel</button></div></form>`;
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

  const sec = (title, open, body) => `<details class="ed-sec" ${open ? 'open' : ''}><summary>${title}</summary><div class="stack" style="gap:6px;margin-top:8px">${body}</div></details>`;
  function trackEditor(t) {
    const f = SEED.trackFields(Engine.state.content, t), a = f.assess, quiz = a.quiz || [];
    const opt = (id, v, map) => `<select class="input" id="${id}">${Object.entries(map).map(([k, l]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    return `<form class="stack as-editor" style="gap:8px;margin-top:10px" data-as-trackform="${t}">
      ${sec('Basics', true, `<div class="grid-2" style="gap:8px"><div>${inp('ed-name', 'Track name', f.name, 'e.g. Evidence Detectives')}</div><div>${inp('ed-loc', 'Location', f.location, 'e.g. Gallery 19')}</div></div>
        ${inp('ed-key', 'Key object (students photograph it; used in the finale)', f.keyObject)}${ta('ed-narr', 'The question this track asks', f.narrative, 1)}`)}
      ${sec('At the place', false, `${ta('ed-obs', 'What students do there', f.observe, 3)}${ta('ed-disc', 'Discussion question', f.discuss, 2)}
        <label class="toggle"><input type="checkbox" id="ed-partner" ${f.needsContributor ? 'checked' : ''}> Includes an arranged conversation with the community partner</label>
        <span class="fld">Hints (never the answer)</span>${listEd('hints', f.hints, 'A hint that points back to the object', 'Add hint')}
        ${inp('ed-fb', 'Accessible or backup route', f.fallback)}`)}
      ${sec('Evidence &amp; quick check', quizOpen, `<span class="fld">Evidence prompts</span>${listEd('ev', f.evidence, 'What students record', 'Add prompt')}
        <div class="grid-3" style="gap:8px"><div><label class="fld" for="as-ci">Check-in</label>${opt('as-ci', a.checkin, SEED.ASSESS_TEXT.checkin)}</div>
          <div><label class="fld" for="as-ev">Evidence type</label>${opt('as-ev', a.evidence, SEED.ASSESS_TEXT.evidence)}</div>
          <div><label class="fld" for="as-ver">Verified by</label>${opt('as-ver', a.verify, SEED.ASSESS_TEXT.verify)}</div></div>
        <div class="stack" style="gap:4px"><span class="fld">Reference photo for the AI check (optional)</span>
          ${refDraft ? `<img class="ev-photo" src="${refDraft}" alt="Reference photo">` : '<span class="hint-note">Without one, the AI matches the photo against the key object’s name.</span>'}
          <label class="btn btn-ghost btn-sm" for="as-ref" style="align-self:flex-start">${refDraft ? 'Replace photo' : 'Add a photo'}</label><input id="as-ref" type="file" accept="image/*" hidden>
          ${refDraft ? '<button class="btn btn-ghost btn-sm" type="button" data-as-ref-clear style="align-self:flex-start">Remove photo</button>' : ''}</div>
        <span class="fld">Quick check (multiple choice)</span>
        <div class="stack" style="gap:8px" data-qz>${(quiz.length ? quiz : quizOpen ? [null] : []).map(qzCard).join('')}</div>
        <button type="button" class="btn btn-ghost btn-sm le-add" data-qz-add>${Art.icon('plus', 14)} Add question</button>
        <div class="row"><label class="fld" for="as-pass" style="margin:0">Pass mark (questions right)</label><input class="input" id="as-pass" type="number" min="1" value="${a.pass || 1}" style="width:90px"></div>`)}
      ${sec('Teach-back', false, `${inp('ed-teach', 'What they teach their home team (one line)', f.teachHeadline)}
        <span class="fld">Check statements a teammate chooses from (tick the correct ones)</span>${checkListEd('chk', f.checks, 'A summary of what this expert found', 'Add statement')}`)}
      <div class="row"><button class="btn btn-primary btn-sm" type="submit">Save track</button><button class="btn btn-ghost btn-sm" type="button" data-as-edit-cancel>Cancel</button></div></form>`;
  }
  function readAssess(f) {
    const v = (id) => f.querySelector('#' + id).value, quiz = readQuiz(f);
    return { checkin: v('as-ci'), evidence: v('as-ev'), verify: quiz.length || v('as-ver') !== 'auto' ? v('as-ver') : 'teacher', quiz, pass: quiz.length ? Math.max(1, Math.min(Number(v('as-pass')) || 1, quiz.length)) : 0 };
  }

  function finaleEditor(f) {
    const cats = Object.entries(SEED.FINALE_CATS);
    return `<form class="stack as-editor" style="gap:8px;margin-top:10px" data-as-finaleform>
      ${sec('Basics', true, inp('fe-title', 'Finale title', f.title))}
      ${sec('Panel 2: spot the overclaim', false, `${inp('fe-q', 'Question', f.question)}
        <span class="fld">Statements (tick the cautious ones)</span>${checkListEd('fe-opts', f.options, 'A statement', 'Add statement')}`)}
      ${sec('Panel 3: build the answer', false, `${cats.map(([k, l]) => `<div class="stack" style="gap:4px"><div class="spread"><span class="fld">${l}</span>
          <label class="row" style="gap:6px;font-size:13px">at least <input class="input" type="number" min="0" data-need="${k}" value="${f.needs[k] || 0}" style="width:70px"></label></div>
          ${listEd('fe-' + k, f[k], 'A sentence students can choose', 'Add sentence')}</div>`).join('')}
        <span class="fld">Tempting overclaims (students must leave these out)</span>${listEd('fe-traps', f.traps, 'An overclaiming sentence', 'Add overclaim')}
        <div class="row"><label class="fld" for="fe-max" style="margin:0">Most sentences a team may pick</label><input class="input" id="fe-max" type="number" min="1" value="${f.max}" style="width:90px"></div>`)}
      ${sec('Rubric (you tick every item to approve)', false, listEd('fe-rubric', f.rubric, 'A rubric item', 'Add item'))}
      <div class="row"><button class="btn btn-primary btn-sm" type="submit">Save finale</button><button class="btn btn-ghost btn-sm" type="button" data-as-edit-cancel>Cancel</button></div></form>`;
  }

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
      <p class="hint-note" style="margin:6px 0 10px">The assistant may only use these. Add your own notes, object records or links.</p>
      <div class="stack" style="gap:8px">${SRC().map((s) => `<div class="as-src" id="as-src-${s.id}"><span class="as-cite">${s.id}</span>
        <div style="min-width:0"><div class="spread"><strong>${esc(s.title)}</strong>
          ${s.partner ? `<span class="pill ${st.contributor.status === 'APPROVED' ? 'mint' : 'peach'}">${st.contributor.status === 'APPROVED' ? 'partner-approved' : 'awaiting partner'}</span>`
            : s.kind === 'educator' ? `<span class="row" style="gap:6px"><span class="pill plain">added by you</span>${locked ? '' : `<button class="btn btn-ghost btn-sm" type="button" data-as-rmsrc="${s.id}" aria-label="Remove ${s.id}">Remove</button>`}</span>` : '<span class="pill plain">official page</span>'}</div>
        <p class="hint-note" style="margin:2px 0 0">${esc(s.fact || (s.partner ? 'Nothing from the partner yet.' : ''))} ${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">open</a>` : ''}</p></div></div>`).join('')}</div>
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
    box.scrollTop = box.scrollHeight;
  }
  async function say(text, cites) {
    const m = { who: 'ai', text: '', thinking: true };
    msgs.push(m); paintMsgs();
    await sleep(700 + Math.random() * 400);
    m.thinking = false;
    for (const w of text.split(' ')) { m.text += (m.text ? ' ' : '') + w; paintMsgs(); await sleep(24); }
    m.cites = cites || [];
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
    await say(step.reply, step.topic === 'D' ? [srcFor('D'), partnerSrc()].filter(Boolean) : [srcFor(step.topic)].filter(Boolean));
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
    await say('Reading your sources: four Fitzwilliam gallery pages and your partner’s notes. Planning four perspectives: Evidence, Power & Memory, Multiple Lives, Connections & Voices…');
    const content = JSON.parse(JSON.stringify(TEMPLATES.lost_museum));
    if (q.title && q.title !== 'Untitled quest') content.title = q.title;
    Engine.dispatch('setContent', { content });
    if (!q.venue) Engine.dispatch('updateQuest', { field: 'venue', value: 'The Fitzwilliam Museum, Cambridge' });
    if (!q.objective) Engine.dispatch('updateQuest', { field: 'objective', value: 'Interpret evidence from multiple perspectives' });
    await say('Drafted 4 expert tracks (Galleries 19, 20, 21 and 24), a locked finale that needs all four, 5 collectibles and 2 reflection questions. Review and approve each track below — nothing reaches students until you do.', Engine.state.sources.map((s) => s.id));
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
    if (status === 401) { needPass = true; lastNotice = 'Live AI needs the demo passcode.'; }
    else { mode = 'simulated'; lastNotice = 'Live AI is unavailable here — switched to editing by hand.'; }
  }
  function questBrief() {
    const q = Engine.state.quest;
    return { title: q.title, objective: q.objective, venue: q.venue, minutes: q.duration, students: SEED.participants.length, tracks: SEED.topics.length, teams: SEED.homeGroups.length, ages: '13-16' };
  }
  function liveContext() {
    const tracks = {};
    SEED.topics.forEach((t) => { const f = SEED.trackFields(Engine.state.content, t); tracks[t] = { ...f, status: Engine.state.tracks[t] }; });
    return { quest: questBrief(), tracks, sources: SRC().filter((s) => s.fact).map((s) => ({ id: s.id, title: s.title, text: s.fact, url: s.url || '' })) };
  }

  async function liveTurn(text) {
    busy = true;
    msgs.push({ who: 'you', text }); paintMsgs();
    const m = { who: 'ai', text: '', thinking: true }; msgs.push(m); paintMsgs();
    const { status, data } = await call({ mode: 'chat', message: text, history, ...liveContext() });
    msgs.pop();
    if (!data || data.error || status !== 200) { failNotice(status); busy = false; msgs.pop(); return status === 401 ? window.WQ.render() : freeText(text); }
    const cites = [...new Set((data.edits || []).flatMap((e) => e.input.source_ids || []))];
    await say(data.reply, cites);
    history.push({ role: 'user', content: text }, { role: 'assistant', content: data.reply });
    for (const e of data.edits || []) {
      const i = e.input;
      const patch = e.tool === 'add_hint' ? { hint: i.hint } : { [i.field]: i.new_text };
      Engine.dispatch('reviseTrack', { topic: i.topic, note: (i.summary || 'AI revision') + (i.source_ids && i.source_ids.length ? ` [${i.source_ids.join(', ')}]` : ''), patch });
    }
    busy = false;
    lastNotice = data.edits && data.edits.length ? `Claude proposed ${data.edits.length} change${data.edits.length > 1 ? 's' : ''} — review and approve them in Quest content.` : '';
    window.WQ.render();
  }

  /* Generate a whole quest: one planning call, then tracks, finale and extras in parallel
     (each call stays well under the hosting time limit). */
  async function generate() {
    if (busy) return;
    const ctx = liveContext();
    if (!ctx.sources.length) { lastNotice = 'Add at least one approved source first — the assistant only writes from your sources.'; return window.WQ.render(); }
    busy = true; confirmGen = false;
    const prompt = `Plan a ${ctx.quest.minutes}-minute Jigsaw quest for ${ctx.quest.students} students${ctx.quest.venue ? ' at ' + ctx.quest.venue : ''}. Goal: ${ctx.quest.objective || 'decide from the sources'}.`;
    msgs.push({ who: 'you', text: prompt }); paintMsgs();
    const step = { who: 'ai', text: `Planning ${SEED.topics.length} complementary perspectives from your sources…`, thinking: false }; msgs.push(step); paintMsgs();
    const plan = await call({ mode: 'plan', quest: ctx.quest, sources: ctx.sources });
    if (plan.status !== 200 || !plan.data || !plan.data.plan) { msgs.pop(); msgs.pop(); failNotice(plan.status); busy = false; return window.WQ.render(); }
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
        evidence: d ? d.evidence_prompts : [], hints: d ? d.hints : [], fallback: d ? d.fallback : '', teachHeadline: d ? d.teach_headline : '',
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
      SEED.buildFinale(content, { title: F.title, cautious: F.cautious_statement, overclaim: F.overclaim_statement, evidence: F.evidence_sentences, perspectives: F.perspectives_sentence, uncertainty: F.uncertainty_sentence, invite: F.invite_sentence, trap: F.trap_sentence });
    } else failed.push('the finale');
    if (ext.status === 200 && ext.data && ext.data.extras) {
      const X = ext.data.extras;
      content.collectibles = SEED.ensureContentShape(content).collectibles.map((c, i) => ({ ...c, ...(X.collectibles && X.collectibles[i] ? { title: X.collectibles[i].title, activity: X.collectibles[i].activity, fact: X.collectibles[i].fact } : {}) }));
      if (Array.isArray(X.reflection)) content.reflection = [X.reflection[0] || '', X.reflection[1] || ''];
    } else failed.push('collectibles and reflection');
    msgs.pop();
    const r = Engine.dispatch('setContent', { content });
    await say(r.ok
      ? `Drafted “${content.title}”: ${P.tracks.map((t) => t.name).join(', ')}, a finale that needs every perspective, ${content.collectibles.length} collectibles and ${content.reflection.length} reflection questions.${failed.length ? ` I couldn’t finish ${failed.join(', ')} — fill those in by hand.` : ''} Review and approve each track below.`
      : 'The draft came back incomplete. Try again, or fill the quest in by hand.', ctx.sources.map((s) => s.id));
    history.push({ role: 'user', content: prompt }, { role: 'assistant', content: `Drafted ${content.title}.` });
    busy = false;
    window.WQ.render();
    document.getElementById('as-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------------- events ---------------- */
  let delegated = false;
  function delegate() {
    if (delegated) return; delegated = true;
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

  function bind(root) {
    delegate();
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
    on('[data-as-cite]', 'click', (b) => { const row = document.getElementById('as-src-' + b.dataset.asCite); if (row) { row.classList.add('flash'); row.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => row.classList.remove('flash'), 1400); } });
    on('[data-as-mode]', 'click', () => { mode = mode === 'live' ? 'simulated' : 'live'; lastNotice = ''; try { localStorage.setItem('wq-ai-mode', mode); } catch {} window.WQ.render(); });
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
    on('[data-as-block]', 'click', (b) => { const [tk, g, v] = b.dataset.asBlock.split('|'); const r = toggleBlock(tk, g, v); if (r && !r.ok && r.msg) window.WQ.toast(r.msg, 'error'); window.WQ.render(); if (v === 'quiz' && editing === tk) document.querySelector('[data-qz]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
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
        evidence: readList(f, 'ev'), hints: readList(f, 'hints'), fallback: v('ed-fb'), teachHeadline: v('ed-teach'), checks: readCheckList(f, 'chk'),
        needsContributor: f.querySelector('#ed-partner').checked, sourceFact: old.sourceFact, sourceUrl: old.sourceUrl, assess: readAssess(f), refPhoto: refDraft };
      editing = null; refDraft = null; quizOpen = false;
      window.WQ.act('editTrack', { topic: tk, fields });
    });
    on('[data-as-finaleform]', 'submit', (f, e) => {
      e.preventDefault();
      const fields = { title: f.querySelector('#fe-title').value.trim(), question: f.querySelector('#fe-q').value.trim(), options: readCheckList(f, 'fe-opts'),
        traps: readList(f, 'fe-traps'), rubric: readList(f, 'fe-rubric'), max: Number(f.querySelector('#fe-max').value) || 6, needs: {} };
      Object.keys(SEED.FINALE_CATS).forEach((k) => { fields[k] = readList(f, 'fe-' + k); fields.needs[k] = Number(f.querySelector(`[data-need="${k}"]`).value) || 0; });
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
    on('[data-as-pass]', 'submit', (pf, e) => { e.preventDefault(); try { localStorage.setItem('wq-ai-pass', document.getElementById('as-pass').value); } catch {} needPass = false; window.WQ.render(); });
    on('[data-as-form]', 'submit', (f, e) => {
      e.preventDefault();
      const v = document.getElementById('as-in').value.trim();
      if (v && !busy) { document.getElementById('as-in').value = ''; freeText(v); }
    });
  }

  return { chat, board, bind, generate, listEd, readList, setSpeed: (v) => { speed = v; }, setMode: (m) => { mode = m; } };
})();
