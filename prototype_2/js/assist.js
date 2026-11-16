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

  function panel() {
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
      </div>
      ${sourcesCard()}
      ${contentCard(st)}`;
  }

  const LABEL = { TEMPLATE: ['st-available', 'From template'], EMPTY: ['st-locked', 'To write'], AI: ['st-submitted', 'AI draft'], REVISED: ['st-submitted', 'AI revised'], EDITED: ['st-submitted', 'Edited by you'], APPROVED: ['st-verified', 'Approved'] };

  function contentCard(st) {
    const locked = st.quest.status === 'PUBLISHED';
    const probs = SEED.contentProblems(st.content);
    const n = SEED.topics.filter((t) => st.tracks[t] === 'APPROVED').length;
    const f = SEED.finaleFields(st.content);
    const coll = st.content.collectibles;
    return `
      <div class="card" id="as-content">
        <div class="spread"><h3 style="margin:0">${Art.icon('map', 18)} Quest content</h3><span class="row" style="gap:6px"><span class="pill lavender">${n}/4 tracks approved</span>${probs.length ? `<span class="pill peach">${probs.length} to complete</span>` : '<span class="pill mint">complete</span>'}</span></div>
        <p class="hint-note" style="margin:6px 0 10px">Four expert tracks, each investigated by one member of every home team, plus a finale that needs all four.</p>
        <div class="stack" style="gap:10px">
          ${SEED.topics.map((t) => {
            const m = SEED.missions[t], [cls, txt] = LABEL[st.tracks[t]] || LABEL.EDITED, tp = probs.filter((x) => x.startsWith(`Track ${t}:`));
            return `<div class="as-track" id="as-track-${t}">
              <div class="spread"><div class="row" style="gap:8px"><span class="topic-chip ${SEED.topicMeta[t].color}">${Art.icon(SEED.topicMeta[t].icon, 14)}${t}</span><strong>${esc(m.name || 'Untitled track')}</strong></div>
                <span class="status-chip ${cls}">${txt}</span></div>
              <p class="hint-note" style="margin:6px 0">${m.gallery ? esc(m.gallery) + ' · ' : ''}${esc(m.narrative || m.observe || 'Nothing written yet.')} ${srcFor(t) ? `<button class="as-cite" type="button" data-as-cite="${srcFor(t)}">${srcFor(t)}</button>` : ''}${m.needsFacilitator && partnerSrc() ? ` <span class="pill plain">partner conversation</span>` : ''}</p>
              <div class="row" style="gap:4px;margin:0 0 6px">${(() => { const a = m.assess || SEED.defaultAssess(), T = SEED.ASSESS_TEXT; return [a.checkin === 'qr' ? 'QR check-in' : 'no check-in', T.evidence[a.evidence], a.quiz && a.quiz.length ? `quiz ${a.pass}/${a.quiz.length}` : '', T.verify[a.verify]].filter(Boolean).map((x) => `<span class="pill plain">${esc(x)}</span>`).join(''); })()}</div>
              ${tp.length ? `<p class="hint-note" style="margin:0 0 6px;color:var(--danger)">Missing: ${tp.map((x) => esc(x.split(': ')[1])).join(', ')}</p>` : ''}
              ${st.revisions[t] ? `<p class="as-note">${Art.icon('pencil', 14)} ${esc(st.revisions[t])}</p>` : ''}
              ${locked ? '' : `<div class="row" style="gap:6px">${st.tracks[t] === 'APPROVED' ? '' : `<button class="btn btn-teal btn-sm" type="button" data-as-approve="${t}">${Art.icon('check', 14)} Approve</button>`}
                <button class="btn btn-ghost btn-sm" type="button" data-as-edit="${t}">${editing === t ? 'Close' : 'Edit'}</button>
                ${mode === 'live' ? `<button class="btn btn-ghost btn-sm" type="button" data-as-ask="${t}">Ask AI to change</button>` : ''}</div>`}
              ${editing === t && !locked ? trackEditor(t) : ''}
            </div>`;
          }).join('')}
          <div class="as-track" id="as-finale">
            <div class="spread"><strong>${Art.icon('puzzle', 15)} Finale: ${esc(st.content.finale.title || 'Untitled')}</strong>${locked ? '' : `<button class="btn btn-ghost btn-sm" type="button" data-as-edit="finale">${editing === 'finale' ? 'Close' : 'Edit'}</button>`}</div>
            <p class="hint-note" style="margin:6px 0 0">Locked until every track in a home team is verified and taught. Match each key object to its perspective (${st.content.finale.objects.map((o) => esc(o.label || '—')).join(' · ')}), spot the overclaim, then build a short answer from ${f.evidence.length} evidence sentences.</p>
            ${editing === 'finale' && !locked ? finaleEditor(f) : ''}
          </div>
          <div class="as-track" id="as-extras">
            <div class="spread"><strong>${Art.icon('trophy', 15)} Story, collectibles &amp; reflection</strong>${locked ? '' : `<button class="btn btn-ghost btn-sm" type="button" data-as-edit="extras">${editing === 'extras' ? 'Close' : 'Edit'}</button>`}</div>
            <p class="hint-note" style="margin:6px 0 0">${coll.filter((c) => c.title).length}/5 collectibles · ${st.content.reflection.filter(Boolean).length}/2 reflection questions · ${st.content.story.opening ? 'story written' : 'no story yet'}</p>
            ${editing === 'extras' && !locked ? extrasEditor(st.content) : ''}
          </div>
        </div>
      </div>`;
  }

  const ta = (id, label, v, rows = 2, ph = '') => `<label class="fld" for="${id}">${label}</label><textarea class="input" id="${id}" rows="${rows}" placeholder="${esc(ph)}">${esc(v)}</textarea>`;
  const inp = (id, label, v, ph = '') => `<label class="fld" for="${id}">${label}</label><input class="input" id="${id}" value="${esc(v)}" placeholder="${esc(ph)}">`;

  function trackEditor(t) {
    const f = SEED.trackFields(Engine.state.content, t);
    return `<form class="stack as-editor" style="gap:6px;margin-top:10px" data-as-trackform="${t}">
      <div class="grid-2" style="gap:8px"><div>${inp('ed-name', 'Track name', f.name, 'e.g. Evidence Detectives')}</div><div>${inp('ed-loc', 'Location', f.location, 'e.g. Gallery 19 · Ancient Egypt')}</div></div>
      ${inp('ed-key', 'Key object (used in the finale)', f.keyObject, 'e.g. the painted coffin set')}
      ${ta('ed-narr', 'The question this track asks', f.narrative, 1)}
      ${ta('ed-obs', 'What students do there', f.observe, 3)}
      ${ta('ed-disc', 'Discussion question', f.discuss, 2)}
      ${ta('ed-ev', 'Evidence prompts (one per line)', f.evidence.join('\n'), 3)}
      ${ta('ed-hints', 'Hints, one per line (never the answer)', f.hints.join('\n'), 2)}
      ${ta('ed-fb', 'Accessible or backup route', f.fallback, 1)}
      ${inp('ed-teach', 'What they teach their home team (one line)', f.teachHeadline)}
      <div class="grid-2" style="gap:8px"><div>${ta('ed-ok', 'Teach-back check: a correct summary', f.checkCorrect, 2)}</div><div>${ta('ed-no', 'Teach-back check: an overclaiming summary', f.checkIncorrect, 2)}</div></div>
      <label class="toggle"><input type="checkbox" id="ed-partner" ${f.needsContributor ? 'checked' : ''}> Includes an arranged conversation with the community partner</label>
      ${assessEditor(f.assess)}
      <div class="row"><button class="btn btn-primary btn-sm" type="submit">Save track</button><button class="btn btn-ghost btn-sm" type="button" data-as-edit-cancel>Cancel</button></div></form>`;
  }
  const opt = (id, v, map) => `<select class="input" id="${id}">${Object.entries(map).map(([k, l]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  function assessEditor(a) {
    const T = SEED.ASSESS_TEXT, quiz = a.quiz || [];
    const slot = (i) => { const q = quiz[i] || { q: '', o: ['', '', '', ''], a: 0 }; const o = [...q.o, '', '', '', ''].slice(0, 4);
      return `<fieldset class="as-fs"><legend>Question ${i + 1}${i ? ' (optional)' : ''}</legend>${inp('qz-q' + i, 'Question', q.q)}
        ${o.map((x, k) => `<label class="quiz-o"><input type="radio" name="qz-a${i}" value="${k}" ${q.a === k ? 'checked' : ''} aria-label="Correct answer"><input class="input" id="qz-o${i}-${k}" value="${esc(x)}" placeholder="Option ${k + 1}${k === 0 ? ' (tick the correct one)' : ''}"></label>`).join('')}</fieldset>`; };
    return `<fieldset class="as-fs assess"><legend>How this track is assessed</legend>
      <div class="grid-3" style="gap:8px"><div><label class="fld" for="as-ci">Check-in at the place</label>${opt('as-ci', a.checkin, T.checkin)}</div>
        <div><label class="fld" for="as-ev">Evidence students submit</label>${opt('as-ev', a.evidence, T.evidence)}</div>
        <div><label class="fld" for="as-ver">Verified by</label>${opt('as-ver', a.verify, T.verify)}</div></div>
      <label class="toggle"><input type="checkbox" id="as-qz" ${quiz.length ? 'checked' : ''}> Add a multiple-choice check</label>
      <div class="stack" style="gap:8px" id="as-qz-box" ${quiz.length ? '' : 'hidden'}>${[0, 1, 2].map(slot).join('')}
        <label class="fld" for="as-pass">Pass mark (questions right)</label><select class="input" id="as-pass" style="width:auto">${[1, 2, 3].map((n) => `<option value="${n}" ${a.pass === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    </fieldset>`;
  }
  function readAssess(f) {
    const v = (id) => f.querySelector('#' + id).value;
    const quiz = !f.querySelector('#as-qz').checked ? [] : [0, 1, 2].map((i) => {
      const q = v('qz-q' + i).trim(), o = [0, 1, 2, 3].map((k) => v(`qz-o${i}-${k}`).trim()).filter(Boolean);
      const c = f.querySelector(`[name="qz-a${i}"]:checked`);
      return q && o.length >= 2 ? { q, o, a: Math.min(Number(c ? c.value : 0), o.length - 1) } : null;
    }).filter(Boolean);
    return { checkin: v('as-ci'), evidence: v('as-ev'), verify: v('as-ver'), quiz, pass: quiz.length ? Math.min(Number(v('as-pass')), quiz.length) : 0 };
  }

  function finaleEditor(f) {
    return `<form class="stack as-editor" style="gap:6px;margin-top:10px" data-as-finaleform>
      ${inp('fe-title', 'Finale title', f.title)}
      <div class="grid-2" style="gap:8px"><div>${ta('fe-ok', 'Cautious statement (correct)', f.cautious, 2)}</div><div>${ta('fe-no', 'Overclaiming statement (wrong)', f.overclaim, 2)}</div></div>
      ${ta('fe-ev', 'Evidence sentences, one per line (at least 2)', f.evidence.join('\n'), 3)}
      ${inp('fe-per', 'A sentence about different perspectives', f.perspectives)}
      ${inp('fe-unc', 'A sentence naming an uncertainty', f.uncertainty)}
      ${inp('fe-inv', 'A sentence inviting a question', f.invite)}
      ${inp('fe-trap', 'A tempting overclaim (students must leave it out)', f.trap)}
      <div class="row"><button class="btn btn-primary btn-sm" type="submit">Save finale</button><button class="btn btn-ghost btn-sm" type="button" data-as-edit-cancel>Cancel</button></div></form>`;
  }
  function extrasEditor(c) {
    return `<form class="stack as-editor" style="gap:6px;margin-top:10px" data-as-extrasform>
      ${ta('ex-open', 'Story opening (students read this at the briefing)', c.story.opening, 3)}
      ${c.collectibles.map((x, i) => `<fieldset class="as-fs"><legend>Collectible ${i + 1} · team ${esc(x.home)}</legend>
        <div class="grid-2" style="gap:8px"><div>${inp('ex-t' + i, 'Name', x.title)}</div><div>${inp('ex-f' + i, 'Fact shown when earned', x.fact)}</div></div>
        ${inp('ex-a' + i, 'Bonus activity', x.activity)}</fieldset>`).join('')}
      ${inp('ex-r0', 'Reflection question 1', c.reflection[0] || '')}
      ${inp('ex-r1', 'Reflection question 2', c.reflection[1] || '')}
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
    return { title: q.title, objective: q.objective, venue: q.venue, minutes: q.duration, students: q.classSize, ages: '13-16' };
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
    const step = { who: 'ai', text: 'Planning four complementary perspectives from your sources…', thinking: false }; msgs.push(step); paintMsgs();
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
      content.collectibles = content.collectibles.map((c, i) => ({ ...c, ...(X.collectibles && X.collectibles[i] ? { title: X.collectibles[i].title, activity: X.collectibles[i].activity, fact: X.collectibles[i].fact } : {}) }));
      if (Array.isArray(X.reflection)) content.reflection = [X.reflection[0] || '', X.reflection[1] || ''];
    } else failed.push('collectibles and reflection');
    msgs.pop();
    const r = Engine.dispatch('setContent', { content });
    await say(r.ok
      ? `Drafted “${content.title}”: ${P.tracks.map((t) => t.name).join(', ')}, a finale that needs all four, 5 collectibles and 2 reflection questions.${failed.length ? ` I couldn’t finish ${failed.join(', ')} — fill those in by hand.` : ''} Review and approve each track below.`
      : 'The draft came back incomplete. Try again, or fill the quest in by hand.', ctx.sources.map((s) => s.id));
    history.push({ role: 'user', content: prompt }, { role: 'assistant', content: `Drafted ${content.title}.` });
    busy = false;
    window.WQ.render();
    document.getElementById('as-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------------- events ---------------- */
  function bind(root) {
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
    on('[data-as-edit]', 'click', (b) => { editing = editing === b.dataset.asEdit ? null : b.dataset.asEdit; window.WQ.render(); });
    on('[data-as-edit-cancel]', 'click', () => { editing = null; window.WQ.render(); });
    on('#as-qz', 'change', (c) => { const box = document.getElementById('as-qz-box'); if (box) box.hidden = !c.checked; });
    on('[data-as-trackform]', 'submit', (f, e) => {
      e.preventDefault();
      const v = (id) => f.querySelector('#' + id).value.trim(), t = f.dataset.asTrackform, old = SEED.trackFields(Engine.state.content, t);
      editing = null;
      window.WQ.act('editTrack', { topic: t, fields: { name: v('ed-name'), location: v('ed-loc'), keyObject: v('ed-key'), narrative: v('ed-narr'), observe: v('ed-obs'), discuss: v('ed-disc'),
        evidence: lines(v('ed-ev')), hints: lines(v('ed-hints')), fallback: v('ed-fb'), teachHeadline: v('ed-teach'), checkCorrect: v('ed-ok'), checkIncorrect: v('ed-no'),
        needsContributor: f.querySelector('#ed-partner').checked, sourceFact: old.sourceFact, sourceUrl: old.sourceUrl, assess: readAssess(f) } });
    });
    on('[data-as-finaleform]', 'submit', (f, e) => {
      e.preventDefault();
      const v = (id) => f.querySelector('#' + id).value.trim();
      editing = null;
      window.WQ.act('editFinale', { fields: { title: v('fe-title'), cautious: v('fe-ok'), overclaim: v('fe-no'), evidence: lines(v('fe-ev')), perspectives: v('fe-per'), uncertainty: v('fe-unc'), invite: v('fe-inv'), trap: v('fe-trap') } });
    });
    on('[data-as-extrasform]', 'submit', (f, e) => {
      e.preventDefault();
      const v = (id) => f.querySelector('#' + id).value.trim();
      editing = null;
      window.WQ.act('editExtras', { opening: v('ex-open'), collectibles: [0, 1, 2, 3, 4].map((i) => ({ title: v('ex-t' + i), fact: v('ex-f' + i), activity: v('ex-a' + i) })), reflection: [v('ex-r0'), v('ex-r1')] });
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

  return { panel, bind, generate, setSpeed: (v) => { speed = v; }, setMode: (m) => { mode = m; } };
})();
