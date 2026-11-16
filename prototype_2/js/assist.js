/* WorldQuest prototype_2 — Quest assistant (SIMULATED AI) for the educator's quest builder.
 * Shows the design-time AI step from the Product Explanation: the teacher asks, the assistant
 * drafts from APPROVED SOURCES ONLY (S1–S4 official gallery pages, S5 partner contribution),
 * cites them, and revises tracks on request. Every track needs the educator's approval
 * (engine-enforced) before publishing. No API key is used: replies are scripted and labelled.
 */
'use strict';

const Assistant = (() => {
  const msgs = [{ who: 'ai', text: 'Hi! I draft only from the approved sources in your library. Add anything else I should use, then tell me what the quest is for.' }];
  let editingTrack = null;
  let busy = false, speed = 1; // speed 0 = no animation (tests)
  // AI mode: 'live' calls the server function (/api/assistant); 'simulated' uses the scripted replies.
  let mode = (() => { try { return localStorage.getItem('wq-ai-mode') || 'live'; } catch { return 'live'; } })();
  let needPass = false, lastNotice = '';
  const history = []; // text-only {role, content} for the live model
  const sleep = (ms) => (speed ? new Promise((r) => setTimeout(r, ms * speed)) : Promise.resolve());
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const SRC = () => Engine.state.sources.map((s) => (s.kind === 'partner' ? { ...s, fact: Engine.state.contributor.text, partner: true } : { ...s, fact: s.text }));
  const srcFor = (t) => (Engine.state.sources.find((s) => s.kind === 'official' && s.url === SEED.missions[t].sourceUrl) || { id: '' }).id;
  const partnerSrc = () => (Engine.state.sources.find((s) => s.kind === 'partner') || { id: '' }).id;

  /* scripted steps: draft first, then revisions the teacher can request */
  const DRAFT = {
    id: 'draft', chip: 'Draft the jigsaw quest',
    prompt: (q) => `Draft a ${q.duration || 60}-minute jigsaw quest for ${q.classSize || 20} students at ${q.venue}. Goal: ${q.objective}. Use only approved sources.`,
    reply: 'Drafted 4 expert tracks, a locked escape-room finale that needs all four, and 5 optional class cards, from the approved template and your sources. Please review and approve each track below — nothing reaches students until you do.',
    cites: null,
    run: () => Engine.dispatch('generateDraft'),
  };
  const REVS = [
    { id: 'rc', topic: 'C', chip: 'Track C: simpler wording', prompt: 'Make Track C easier to read for students who struggle with long instructions.',
      note: 'Instructions shortened to about a 12-year-old reading level. Same evidence fields, so it still counts for the finale.',
      patch: { observe: 'Find two different kinds of object, like a painted pot and a coin. Write down what you see on each one.' },
      reply: 'Done. Track C now uses shorter instructions at about a 12-year-old reading level. The evidence it asks for hasn’t changed, so the finale still works.' },
    { id: 'rd', topic: 'D', chip: 'Track D: if the contributor is busy', prompt: 'What happens in Track D if the community contributor is busy?',
      note: 'Fallback added: a labelled prompt card from the partner’s approved questions, plus a staggered schedule (max 5 students at a time).',
      patch: { fallback: 'If the contributor is busy: use the partner’s prompt card at the gallery door (clearly labelled), then talk to them later. No more than 5 students at a time.' },
      reply: 'I added a fallback for Track D: a clearly labelled prompt card built from the partner’s approved questions (S5), and a staggered schedule so no more than 5 students reach them at once.' },
    { id: 'rb', topic: 'B', chip: 'Track B: a hint, not an answer', prompt: 'Add a hint to Track B that helps without giving the answer away.',
      note: 'New hint: “Compare its size with nearby cases. What might scale suggest about who it honoured?”',
      patch: { hint: 'Compare its size with nearby cases. What might scale suggest about who it honoured?' },
      reply: 'Added a hint to Track B: “Compare its size with nearby cases. What might scale suggest about who it honoured?” It points students back to the object rather than giving the answer. Source: S2.' },
  ];

  function chips() {
    const st = Engine.state;
    if (!st.quest.draftGenerated) return [DRAFT];
    if (st.quest.status === 'PUBLISHED') return [];
    return REVS.filter((r) => !st.revisions[r.topic]);
  }

  function msgHTML(m) {
    return `<div class="as-msg ${m.who}">${m.thinking ? '<span class="as-dots"><i></i><i></i><i></i></span>' : esc(m.text)}
      ${m.cites && m.cites.length ? `<div class="row" style="gap:4px;margin-top:6px">${m.cites.map((c) => `<button class="as-cite" data-as-cite="${c}" type="button">${c}</button>`).join('')}</div>` : ''}</div>`;
  }

  function panel() {
    const st = Engine.state;
    const cs = chips();
    return `
      <div class="card as-card">
        <div class="spread"><h3 style="margin:0">${Art.icon('sparkle', 18)} Quest assistant</h3>
          <button type="button" class="pill ${mode === 'live' ? 'mint' : ''}" data-as-mode title="Switch between the real AI and the scripted demo">AI: ${mode === 'live' ? 'live (Claude)' : 'off · scripted'}</button></div>
        ${lastNotice ? `<p class="hint-note" style="margin:0">${esc(lastNotice)}</p>` : ''}
        ${needPass ? `<form class="row" data-as-pass><label class="sr-only" for="as-pass">Demo passcode</label><input class="input" id="as-pass" type="password" placeholder="Demo passcode for live AI" style="flex:1"><button class="btn btn-secondary btn-sm">Save</button></form>` : ''}
        <div class="as-msgs" id="as-msgs">${msgs.map(msgHTML).join('')}</div>
        ${cs.length ? `<div class="row" style="gap:6px">${cs.map((c) => `<button class="as-chip" type="button" data-as-chip="${c.id}" ${busy ? 'disabled' : ''}>${Art.icon(c.id === 'draft' ? 'sparkle' : 'pencil', 14)} ${esc(c.chip)}</button>`).join('')}</div>` : ''}
        <form class="as-compose" data-as-form><label class="sr-only" for="as-in">Message the assistant</label>
          <input class="input" id="as-in" placeholder="Ask for a change…" autocomplete="off" ${busy ? 'disabled' : ''}>
          <button class="btn btn-primary btn-sm" type="submit" ${busy ? 'disabled' : ''}>Send</button></form>
        <p class="hint-note" style="margin:0">AI drafts once, at design time. Gameplay never calls AI, so the quest keeps working offline.</p>
      </div>
      ${st.quest.draftGenerated ? reviewCard(st) : ''}
      ${sourcesCard()}`;
  }

  function reviewCard(st) {
    const label = { AI: ['st-submitted', 'AI draft'], REVISED: ['st-submitted', 'AI revised'], EDITED: ['st-submitted', 'Edited by you'], APPROVED: ['st-verified', 'Approved'] };
    const n = SEED.topics.filter((t) => st.tracks[t] === 'APPROVED').length;
    const locked = st.quest.status === 'PUBLISHED';
    return `
      <div class="card">
        <div class="spread"><h3 style="margin:0">Review the AI draft</h3><span class="pill lavender">${n}/4 approved</span></div>
        <div class="stack" style="gap:10px;margin-top:10px">
          ${SEED.topics.map((t) => {
            const m = SEED.missions[t], [cls, txt] = label[st.tracks[t]];
            return `<div class="as-track" id="as-track-${t}">
              <div class="spread"><div class="row" style="gap:8px">${`<span class="topic-chip ${SEED.topicMeta[t].color}">${Art.icon(SEED.topicMeta[t].icon, 14)}${t}</span>`}<strong>${esc(m.name)}</strong></div>
                <span class="status-chip ${cls}">${txt}</span></div>
              <p class="hint-note" style="margin:6px 0">${esc(m.gallery)} · ${esc(m.narrative)} <button class="as-cite" type="button" data-as-cite="${srcFor(t)}">${srcFor(t)}</button>${m.needsFacilitator ? ' <button class="as-cite" type="button" data-as-cite="S5">S5</button>' : ''}</p>
              ${st.revisions[t] ? `<p class="as-note">${Art.icon('pencil', 14)} ${esc(st.revisions[t])}</p>` : ''}
              ${st.trackEdits && st.trackEdits[t] ? `<details><summary class="hint-note" style="cursor:pointer">What students will see</summary><dl class="evidence-quote" style="margin-top:6px">${Object.entries(st.trackEdits[t]).map(([k, v]) => `<dt>${esc(k === 'hintsExtra' ? 'extra hints' : k)}</dt><dd>${esc(Array.isArray(v) ? v.join(' · ') : v)}</dd>`).join('')}</dl></details>` : ''}
              ${locked ? '' : `<div class="row" style="gap:6px">${st.tracks[t] === 'APPROVED' ? '' : `<button class="btn btn-teal btn-sm" type="button" data-as-approve="${t}">${Art.icon('check', 14)} Approve</button>`}
                <button class="btn btn-ghost btn-sm" type="button" data-as-edit="${t}">Edit</button>
                <button class="btn btn-ghost btn-sm" type="button" data-as-ask="${t}">Ask AI to change</button></div>`}
              ${editingTrack === t && !locked ? editorHTML(t) : ''}
            </div>`;
          }).join('')}
          <div class="as-track"><div class="spread"><strong>${Art.icon('puzzle', 15)} Finale: Restore the Exhibition Story</strong><span class="pill plain">locked until all 4 tracks are verified and taught</span></div></div>
        </div>
      </div>`;
  }

  function editorHTML(t) {
    const m = Engine.sel.mission(t);
    const f = (k, label) => `<label class="fld" for="ed-${k}">${label}</label><textarea class="input" id="ed-${k}" rows="2">${esc(m[k])}</textarea>`;
    return `<form class="stack as-editor" style="gap:6px;margin-top:10px" data-as-editform="${t}">
      ${f('observe', 'What students do at the object')}${f('discuss', 'Discussion question')}${f('fallback', 'Accessible or backup route')}
      <label class="fld" for="ed-hint">Add a hint (optional)</label><input class="input" id="ed-hint" placeholder="Points back to the object, never the answer">
      <div class="row"><button class="btn btn-primary btn-sm" type="submit">Save changes</button><button class="btn btn-ghost btn-sm" type="button" data-as-edit-cancel>Cancel</button></div></form>`;
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
        <p class="hint-note" style="margin:2px 0 0">${esc(s.fact)} ${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">open</a>` : ''}</p></div></div>`).join('')}</div>
      ${locked ? '' : `<details style="margin-top:10px"><summary class="as-chip" style="display:inline-flex">${Art.icon('plus', 14)} Add a source</summary>
        <form class="stack" style="gap:6px;margin-top:10px" data-as-src>
          <label class="fld" for="src-title">Title</label><input class="input" id="src-title" placeholder="e.g. Museum learning team notes">
          <label class="fld" for="src-url">Link (optional)</label><input class="input" id="src-url" placeholder="https://…">
          <label class="fld" for="src-text">Relevant text</label><textarea class="input" id="src-text" rows="3" placeholder="Paste the facts the assistant may use"></textarea>
          <button class="btn btn-primary btn-sm" type="submit" style="align-self:flex-start">Add to library</button></form></details>`}
    </div>`;
  }

  /* streaming helpers: update only the message list so the rest of the page stays put */
  function paintMsgs() {
    const box = document.getElementById('as-msgs');
    if (!box) return;
    box.innerHTML = msgs.map(msgHTML).join('');
    box.scrollTop = box.scrollHeight;
  }
  async function say(text, cites) {
    const m = { who: 'ai', text: '', thinking: true };
    msgs.push(m); paintMsgs();
    await sleep(900 + Math.random() * 500);
    m.thinking = false;
    for (const w of text.split(' ')) { m.text += (m.text ? ' ' : '') + w; paintMsgs(); await sleep(28); }
    m.cites = cites || [];
  }
  async function typeInto(text) {
    const inp = document.getElementById('as-in');
    if (!inp) return;
    inp.disabled = false; inp.value = '';
    for (const ch of text) { inp.value += ch; await sleep(11); }
    await sleep(220); inp.value = '';
  }

  async function runStep(step, typed) {
    if (busy) return;
    busy = true;
    const st = Engine.state;
    const prompt = typed || (typeof step.prompt === 'function' ? step.prompt(st.quest) : step.prompt);
    if (!typed) await typeInto(prompt);
    if (step === DRAFT && mode === 'live') {
      Engine.dispatch('generateDraft');
      busy = false;
      return liveTurn(prompt + ' Start from the template tracks already loaded and adapt their wording to these settings.', {
        display: prompt,
        onFail: async () => { busy = true; msgs.push({ who: 'you', text: prompt }); paintMsgs(); await say(DRAFT.reply, SRC().map((x) => x.id)); busy = false; window.WQ.render(); },
      });
    }
    msgs.push({ who: 'you', text: prompt }); paintMsgs();
    document.querySelectorAll('[data-as-chip]').forEach((b) => (b.disabled = true));
    await say(step.reply, step === DRAFT ? SRC().map((x) => x.id) : step.topic === 'D' ? [srcFor('D'), partnerSrc()] : [srcFor(step.topic)]);
    busy = false;
    const r = step.run ? step.run() : Engine.dispatch('reviseTrack', { topic: step.topic, note: step.note, patch: step.patch });
    if (r && !r.ok && r.msg) window.WQ?.toast(r.msg, 'error');
    if (step.topic) document.getElementById('as-track-' + step.topic)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function freeText(text) {
    const t = text.toLowerCase();
    const st = Engine.state;
    if (mode === 'live' && st.quest.draftGenerated && st.quest.status !== 'PUBLISHED') return liveTurn(text);
    if (!st.quest.draftGenerated && /draft|quest|plan|create|make/.test(t)) return runStep(DRAFT, text);
    const rev = REVS.find((r) => !st.revisions[r.topic] && (t.includes('track ' + r.topic.toLowerCase()) || (r.topic === 'D' && /contributor|busy|unavailable/.test(t)) || (r.topic === 'B' && /hint/.test(t)) || (r.topic === 'C' && /simpl|easier|read/.test(t))));
    if (rev && st.quest.draftGenerated) return runStep(rev, text);
    busy = true;
    msgs.push({ who: 'you', text }); paintMsgs();
    await say('Noted. In the full product I’d revise the draft from your approved sources. For this demo, try one of the suggestions.');
    busy = false;
    window.WQ?.render();
  }

  function liveContext() {
    const st = Engine.state;
    const tracks = {};
    SEED.topics.forEach((t) => { const m = Engine.sel.mission(t); tracks[t] = { name: m.name, gallery: m.gallery, narrative: m.narrative, observe: m.observe, discuss: m.discuss, hints: m.hints, fallback: m.fallback, teachHeadline: m.teachHeadline, status: st.tracks[t], source: srcFor(t) }; });
    return { quest: { title: st.quest.title, objective: st.quest.objective, venue: st.quest.venue, minutes: st.quest.duration, students: st.quest.classSize, ages: '13-16' },
      tracks, sources: SRC().map((s) => ({ id: s.id, title: s.title, text: s.fact })) };
  }

  async function liveTurn(text, opts = {}) {
    busy = true;
    msgs.push({ who: 'you', text: opts.display || text }); paintMsgs();
    const m = { who: 'ai', text: '', thinking: true }; msgs.push(m); paintMsgs();
    let data = null, status = 0;
    try {
      let pass = ''; try { pass = localStorage.getItem('wq-ai-pass') || ''; } catch {}
      const res = await fetch('/api/assistant', { method: 'POST', headers: { 'content-type': 'application/json', 'x-demo-passcode': pass },
        body: JSON.stringify({ message: text, history, ...liveContext() }) });
      status = res.status;
      data = await res.json().catch(() => null);
    } catch { status = 0; }
    msgs.pop();
    if (!data || data.error || status !== 200) {
      if (status === 401) { needPass = true; lastNotice = 'Live AI needs the demo passcode.'; }
      else { mode = 'simulated'; lastNotice = 'Live AI is unavailable here, so the scripted assistant is answering.'; }
      busy = false;
      msgs.pop(); // drop the echoed request; the fallback re-adds it
      if (status === 401) return window.WQ.render();
      return opts.onFail ? opts.onFail() : freeText(text);
    }
    const cites = [...new Set((data.edits || []).flatMap((e) => e.input.source_ids || []))];
    await say(data.reply, cites);
    history.push({ role: 'user', content: opts.display || text }, { role: 'assistant', content: data.reply });
    for (const e of data.edits || []) {
      const i = e.input;
      const patch = e.tool === 'add_hint' ? { hint: i.hint } : { [i.field]: i.new_text };
      Engine.dispatch('reviseTrack', { topic: i.topic, note: (i.summary || 'AI revision') + (i.source_ids && i.source_ids.length ? ` [${i.source_ids.join(', ')}]` : ''), patch });
    }
    busy = false;
    lastNotice = data.edits && data.edits.length ? `Claude proposed ${data.edits.length} change${data.edits.length > 1 ? 's' : ''} — review and approve below.` : '';
    window.WQ.render();
  }

  function bind(root) {
    root.querySelectorAll('[data-as-chip]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.asChip;
      runStep(id === 'draft' ? DRAFT : REVS.find((r) => r.id === id));
    }));
    root.querySelectorAll('[data-as-approve]').forEach((b) => b.addEventListener('click', () => window.WQ.act('approveTrack', { topic: b.dataset.asApprove })));
    root.querySelectorAll('[data-as-ask]').forEach((b) => b.addEventListener('click', () => {
      const inp = document.getElementById('as-in');
      if (inp) { inp.value = `Track ${b.dataset.asAsk}: `; inp.focus(); inp.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }));
    root.querySelectorAll('[data-as-cite]').forEach((b) => b.addEventListener('click', () => {
      const row = document.getElementById('as-src-' + b.dataset.asCite);
      if (row) { row.classList.add('flash'); row.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => row.classList.remove('flash'), 1400); }
    }));
    root.querySelectorAll('[data-as-mode]').forEach((b) => b.addEventListener('click', () => {
      mode = mode === 'live' ? 'simulated' : 'live'; lastNotice = '';
      try { localStorage.setItem('wq-ai-mode', mode); } catch {}
      window.WQ.render();
    }));
    root.querySelectorAll('[data-as-edit]').forEach((b) => b.addEventListener('click', () => { editingTrack = editingTrack === b.dataset.asEdit ? null : b.dataset.asEdit; window.WQ.render(); }));
    root.querySelectorAll('[data-as-edit-cancel]').forEach((b) => b.addEventListener('click', () => { editingTrack = null; window.WQ.render(); }));
    root.querySelectorAll('[data-as-editform]').forEach((f) => f.addEventListener('submit', (e) => {
      e.preventDefault();
      const t = f.dataset.asEditform, m = Engine.sel.mission(t), patch = {};
      ['observe', 'discuss', 'fallback'].forEach((k) => { const v = f.querySelector('#ed-' + k).value.trim(); if (v && v !== m[k]) patch[k] = v; });
      const h = f.querySelector('#ed-hint').value.trim(); if (h) patch.hint = h;
      editingTrack = null;
      if (!Object.keys(patch).length) return window.WQ.render();
      window.WQ.act('reviseTrack', { topic: t, note: 'Edited by you', patch, by: 'educator' });
    }));
    root.querySelectorAll('[data-as-rmsrc]').forEach((b) => b.addEventListener('click', () => window.WQ.act('removeSource', { id: b.dataset.asRmsrc })));
    const sf = root.querySelector('[data-as-src]');
    if (sf) sf.addEventListener('submit', (e) => { e.preventDefault(); window.WQ.act('addSource', { title: sf.querySelector('#src-title').value, url: sf.querySelector('#src-url').value, text: sf.querySelector('#src-text').value }); });
    const pf = root.querySelector('[data-as-pass]');
    if (pf) pf.addEventListener('submit', (e) => { e.preventDefault(); try { localStorage.setItem('wq-ai-pass', document.getElementById('as-pass').value); } catch {} needPass = false; window.WQ.render(); });
    const f = root.querySelector('[data-as-form]');
    if (f) f.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = document.getElementById('as-in').value.trim();
      if (v && !busy) { document.getElementById('as-in').value = ''; freeText(v); }
    });
  }

  return { panel, bind, setSpeed: (v) => { speed = v; } };
})();
