/* WorldQuest: misconception insights for the educator (teacher-only, after or during the session).
 *
 * Layer 1 (no AI): counts of wrong picks students made in the teach-back check, the quick check and
 *   the finale. The engine records them in state.misses; this file only reads and groups them.
 * Layer 2 (AI, on request): the educator taps "Analyse written answers" for one track. The answers go
 *   to /api/assistant with nicknames replaced by "Student 1, 2…"; the reply groups possible
 *   misconceptions, each with verbatim quotes and a debrief question. Quotes that don't appear in a
 *   student's answer are dropped. Results are suggestions for the teacher, never grades, never shown
 *   to students. Live AI only: when it is off, the button says how to turn it on.
 */
const Insights = (() => {
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const busy = {};
  /* Analyses live on the educator's device only (UI state, never in the shared class data). */
  const getA = (st, t) => ((st.ui && st.ui.analysis) || {})[st.activeQuest + ':' + t];
  const norm = (x) => String(x || '').toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();

  /* ----- layer 1: wrong picks, grouped per track ----- */
  function missesFor(st, t) {
    const m = st.misses || {}, out = [];
    const check = SEED.peerTeaching.checkOptions[t] || [];
    for (const o of check) { const n = m[`teach:${t}:${o.id}`]; if (n && !o.correct) out.push({ n, label: o.miss, text: o.text, where: 'teach-back check' }); }
    const quiz = (SEED.missions[t].assess || {}).quiz || [];
    quiz.forEach((q, i) => q.o.forEach((opt, k) => { const n = m[`quiz:${t}:${i}:${k}`]; if (n) out.push({ n, label: '', text: `${q.q} → “${opt}”`, where: 'quick check' }); }));
    return out.sort((a, b) => b.n - a.n);
  }
  function finaleMisses(st) {
    const m = st.misses || {}, f = SEED.finale, out = [];
    for (const o of f.overclaim.options) { const n = m['overclaim:' + o.id]; if (n && !o.correct) out.push({ n, label: o.miss, text: o.text, where: 'finale · spot the overclaim' }); }
    for (const t of f.compose.tiles.filter((x) => x.trap)) { const n = m['trap:' + t.id]; if (n) out.push({ n, label: 'Overclaiming in the final answer', text: t.text, where: 'finale · introduction' }); }
    for (const [k, n] of Object.entries(m).filter(([k]) => k.startsWith('match:'))) {
      const [, oid, tag] = k.split(':'); const o = f.objects.find((x) => x.id === oid); const t = SEED.topics.find((x) => SEED.topicMeta[x].tag === tag);
      if (o && t) out.push({ n, label: '', text: `${o.label} placed under ${SEED.topicMeta[t].name}`, where: 'finale · placing pieces' });
    }
    return out.sort((a, b) => b.n - a.n);
  }
  const missList = (list) => list.length
    ? `<ul class="miss-list">${list.map((x) => `<li><span class="miss-n">${x.n}×</span><span>${x.label ? `<strong>${esc(x.label)}</strong> · ` : ''}“${esc(x.text)}” <small class="hint-note">${esc(x.where)}</small></span></li>`).join('')}</ul>`
    : '<p class="hint-note" style="margin:0">No wrong picks recorded yet.</p>';

  /* ----- layer 2: written answers for one track, anonymised ----- */
  function answersFor(st, t) {
    const m = SEED.missions[t];
    return SEED.participants.filter((p) => p.topic === t && st.evidence[p.id].answers && ['SUBMITTED', 'VERIFIED', 'NEEDS_REVISION'].includes(st.evidence[p.id].status))
      .map((p, i) => ({ sid: 'Student ' + (i + 1), pid: p.id,
        text: m.evidenceFields.map((f) => `${f.label}: ${String(st.evidence[p.id].answers[f.key] || '').slice(0, 400)}`).join('\n') }));
  }
  const liveOn = () => typeof Assistant !== 'undefined' && Assistant.getMode() === 'live';

  const apiPost = async (body) => {
    let pass = ''; try { pass = localStorage.getItem('wq-ai-pass') || ''; } catch {}
    const res = await fetch('/api/assistant', { method: 'POST', headers: { 'content-type': 'application/json', 'x-demo-passcode': pass }, body: JSON.stringify(body) });
    return { status: res.status, data: res.ok ? await res.json().catch(() => null) : null };
  };
  const audienceOf = (q) => { const au = q.audience || SEED.defaultAudience(); return `${SEED.AUDIENCES[au.kind] || ''} ${au.ages || ''}`.trim(); };
  /* The teacher's approved material for a track: what answers are judged against. */
  const groundOf = (st, t) => {
    const m = SEED.missions[t], opts = SEED.peerTeaching.checkOptions[t] || [];
    return { criteria: (m.criteria || []).filter(Boolean), sources: (st.sources || []).map((s) => ({ title: s.title, text: s.text })),
      correct_statement: (opts.find((o) => o.correct) || {}).text || '', known_misconceptions: opts.filter((o) => !o.correct).map((o) => ({ label: o.miss || '', statement: o.text })) };
  };
  const trackBrief = (m, st) => ({ name: m.name, location: m.gallery, goal: m.teachHeadline, source_fact: m.sourceFact, prompts: m.evidenceFields.map((f) => f.label), ...groundOf(st || Engine.state, m.topic) });
  const basisLine = (st, t, by) => {
    const g = groundOf(st, t), parts = [];
    if (g.criteria.length) parts.push(`${g.criteria.length} success criteri${g.criteria.length === 1 ? 'on' : 'a'}`);
    if (g.sources.length) parts.push(`${g.sources.length} approved source${g.sources.length === 1 ? '' : 's'}`);
    if (g.correct_statement) parts.push('your teach-back answer key');
    return parts.length ? `Checked against: ${parts.join(' · ')}` : '';
  };

  async function analyse(topic) {
    const st = Engine.state, answers = answersFor(st, topic);
    if (!answers.length) return window.WQ.toast('No written answers for this track yet.', 'error');
    let result = null;
    busy[topic] = true; window.WQ.render();
    if (liveOn()) {
        try {
        const r = await apiPost({ mode: 'misconceptions', audience: audienceOf(st.quest), track: trackBrief(SEED.missions[topic], st),
          answers: answers.map((a) => ({ id: a.sid, text: a.text })) });
        const res = { status: r.status }, d = r.data;
        if (d && d.result) {
          const known = Object.fromEntries(answers.map((a) => [a.sid, norm(a.text)]));
          result = { by: 'ai', strengths: d.result.strengths || [], note: d.result.note || '',
            cannot: (d.result.cannot_verify || []).filter((c) => known[c.student_id]).slice(0, 5).map((c) => ({ sid: c.student_id, claim: c.claim })),
            themes: (d.result.themes || []).slice(0, 4).map((th) => ({ title: th.title, explain: th.explanation, ask: th.debrief_question, basis: th.basis || '',
              students: (th.student_ids || []).filter((id) => known[id]),
              quotes: (th.quotes || []).filter((x) => known[x.student_id] && x.quote && known[x.student_id].includes(norm(x.quote))).slice(0, 3).map((x) => ({ sid: x.student_id, quote: x.quote })) }))
              .filter((th) => th.students.length) };
        } else if (res.status === 401) window.WQ.toast('Live AI needs the demo passcode (Quest builder → assistant).', 'error');
      } catch { /* network: fall through */ }
    }
    busy[topic] = false;
    if (!result) { window.WQ.render(); return window.WQ.toast(liveOn() ? 'Live AI didn’t answer — try again in a moment.' : 'Turn on live AI in the Quest builder to analyse answers.', 'error'); }
    chats[ck(topic)] = [];
    result.n = answers.length; result.at = Date.now(); result.basisLine = basisLine(st, topic, result.by);
    result.who = Object.fromEntries(answers.map((a) => [a.sid, a.pid])); // names are never sent to the AI; this map stays on this device
    window.WQ.act('setAnalysis', { topic, result });
  }

  function analysisCard(st, t) {
    const a = getA(st, t), n = answersFor(st, t).length;
    const label = 'AI suggestion — check before acting';
    const name = (sid) => { const p = a && a.who && SEED.byId[a.who[sid]]; return p ? `${esc(sid)} (${esc(st.seats && st.seats[p.id] ? st.seats[p.id].nick : p.name)})` : esc(sid); };
    return `<div class="stack" style="gap:8px">
      <div class="row" style="gap:8px">
        <button class="btn btn-secondary btn-sm" data-ins="${t}" ${busy[t] || !n || !liveOn() ? 'disabled' : ''}>${Art.icon('sparkle', 15)} ${busy[t] ? 'Analysing…' : a ? 'Analyse again with live AI' : 'Analyse with live AI'} (${n} answer${n === 1 ? '' : 's'})</button>
        ${liveOn() ? '' : '<span class="hint-note">Live AI is off — switch the assistant’s “AI” button to live in the Quest builder.</span>'}
        ${a ? `<span class="pill lavender">${label}</span>` : ''}</div>
      ${!groundOf(st, t).criteria.length ? `<p class="hint-note" style="margin:0">${Art.icon('alert', 14)} No success criteria for this track yet — add “What a good answer includes” in the Quest builder so answers are checked against your expectations.</p>` : ''}
      ${a && a.basisLine ? `<p class="hint-note" style="margin:0">${esc(a.basisLine)}</p>` : ''}
      ${a ? (a.themes.length ? a.themes.map((th) => `<div class="ins-theme">
          <div class="spread"><strong>${esc(th.title)}</strong><span class="pill peach">${th.students.length} of ${a.n}</span></div>
          <p style="margin:4px 0">${esc(th.explain)}</p>
          ${th.basis ? `<p class="hint-note" style="margin:0 0 4px"><strong>Why it’s flagged:</strong> ${esc(th.basis)}</p>` : ''}
          ${th.quotes.map((q) => `<p class="evidence-quote" style="margin:4px 0">“${esc(q.quote)}” <small>— ${name(q.sid)}</small></p>`).join('')}
          ${th.ask ? `<p style="margin:6px 0 0"><span class="eyebrow teal">Ask in the debrief</span><br>${esc(th.ask)}</p>` : ''}</div>`).join('')
        : '<p class="hint-note" style="margin:0">No clear misconceptions in these answers.</p>')
        + ((a.cannot || []).length ? `<p class="hint-note" style="margin:0"><strong>Can’t verify against your material</strong> (not counted as misconceptions): ${a.cannot.map((c) => `${name(c.sid)}: “${esc(c.claim)}”`).join(' · ')}</p>` : '')
        + (a.strengths.length ? `<p class="hint-note" style="margin:0"><strong>Going well:</strong> ${a.strengths.map(esc).join(' ')}</p>` : '')
        + (a.note ? `<p class="hint-note" style="margin:0">${esc(a.note)}</p>` : '') + chatBox(st, t, a) : ''}
    </div>`;
  }

  /* ----- follow-up conversation with the live AI (suggestions are just ready-made questions) ----- */
  const chats = {};
  const ck = (t) => Engine.state.activeQuest + ':' + t; // follow-up chats belong to one quest
  const CHIPS = ['Why might students think this?', 'Suggest a 5-minute activity for tomorrow', 'Draft an exit-ticket question'];
  function chatBox(st, t, a) {
    const msgs = chats[ck(t)] || [], chips = liveOn();
    const pending = msgs.length && msgs[msgs.length - 1].who === 'you';
    return `<div class="ins-chat">
      <div class="eyebrow">Plan the follow-up</div>
      ${msgs.map((m) => `<div class="ins-msg ${m.who}">${m.who !== 'you' ? '<small class="hint-note">AI suggestion</small><br>' : ''}${esc(m.text).replace(/\n/g, '<br>')}</div>`).join('')}
      ${pending ? '<p class="hint-note" style="margin:0">Thinking…</p>' : ''}
      ${chips ? `<div class="row" style="gap:6px">${CHIPS.map((l, k) => `<button class="as-chip" type="button" data-ins-chip="${k}" data-topic="${t}" ${pending ? 'disabled' : ''}>${esc(l)}</button>`).join('')}</div>` : ''}
      <form class="row" data-ins-form="${t}" style="gap:6px"><label class="sr-only" for="ins-q-${t}">Ask about these answers</label>
        <input class="input" id="ins-q-${t}" style="flex:1;min-width:160px" maxlength="500" placeholder="${liveOn() ? 'Ask the AI about these answers…' : 'Live AI is off'}" ${liveOn() && !pending ? '' : 'disabled'}>
        <button class="btn btn-secondary btn-sm" type="submit" ${liveOn() && !pending ? '' : 'disabled'}>Ask</button></form>
    </div>`;
  }
  const chip = (t, k) => ask(t, CHIPS[Number(k)]);
  async function ask(t, text) {
    const st = Engine.state, a = getA(st, t), q = String(text || '').trim();
    if (!a || !q || !liveOn()) return;
    const msgs = chats[ck(t)] = chats[ck(t)] || [];
    const history = msgs.slice(-6).map((m) => ({ role: m.who === 'you' ? 'user' : 'assistant', content: m.text }));
    msgs.push({ who: 'you', text: q }); window.WQ.render();
    let reply = '';
    try {
      const answers = answersFor(st, t);
      const r = await apiPost({ mode: 'insight_chat', message: q, history, audience: audienceOf(st.quest), track: trackBrief(SEED.missions[t], st),
        findings: a.themes.map((th) => ({ title: th.title, explanation: th.explain })), answers: answers.map((x) => ({ id: x.sid, text: x.text })) });
      reply = r.data && r.data.reply ? r.data.reply : r.status === 401 ? 'Live AI needs the demo passcode (Quest builder → assistant).' : '';
    } catch {}
    msgs.push({ who: 'ai', text: reply || 'Live AI didn’t answer — try again in a moment.' }); window.WQ.render();
  }

  function section(st) {
    const sim = SEED.participants.some((p) => st.evidence[p.id].simulated);
    const fin = finaleMisses(st);
    return `<div class="card">
      <div class="spread"><h3 style="margin:0">${Art.icon('lens', 18)} Misconceptions to address</h3>${sim ? '<span class="pill">includes simulated classmates</span>' : ''}</div>
      <p class="hint-note">Wrong picks are counted automatically. Written answers are analysed only when you ask: they are sent to the AI with names replaced by “Student 1, 2…”. Results stay on this device only (not in the shared class data), are never shown to students, and are never a grade.</p>
      <div class="stack" style="gap:14px">
        ${SEED.topics.map((t) => `<div class="ins-track">
          <div class="row" style="gap:8px;margin-bottom:6px"><span class="topic-chip ${SEED.topicMeta[t].color}">${t} · ${esc(SEED.topicMeta[t].name)}</span></div>
          ${missList(missesFor(st, t))}
          ${analysisCard(st, t)}</div>`).join('')}
        <div class="ins-track"><div class="eyebrow">Finale</div>${missList(fin)}</div>
      </div></div>`;
  }

  function bind(root) {
    root.querySelectorAll('[data-ins]').forEach((b) => b.addEventListener('click', () => analyse(b.dataset.ins)));
    root.querySelectorAll('[data-ins-chip]').forEach((b) => b.addEventListener('click', () => chip(b.dataset.topic, b.dataset.insChip)));
    root.querySelectorAll('[data-ins-form]').forEach((f) => f.addEventListener('submit', (e) => { e.preventDefault(); ask(f.dataset.insForm, f.querySelector('input').value); }));
  }
  return { section, bind, analyse, chip, ask };
})();
