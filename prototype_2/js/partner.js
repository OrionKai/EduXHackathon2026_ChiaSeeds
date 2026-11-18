/* WorldQuest: the community partner's side, and the educator's view of it.
 * Partner: Overview (what to do now) → My contribution (structured) → Review the quest (how their
 * community is represented: "Looks right" or "Suggest a change") → Sign off → On the day → Student work
 * (check how students recorded their words). Educator: partner status + invite link, a requests inbox
 * in the builder, and partner flags in the live session.
 * Engine actions: saveContribution, reviewItem, requestChange, answerRequest, approveContribution,
 * flagParaphrase, resolveFlag, setPartnerPrompts.
 */
const Partner = (() => {
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const recOf = (st, qid) => (!qid || qid === st.activeQuest ? st : st.library[qid]);
  const nameOf = (st, p) => (st.seats[p.id] ? st.seats[p.id].nick : p.name);
  const itemLabel = (rec, item) => {
    if (item.startsWith('track:')) { const t = item.slice(6), m = rec.content.missions[t] || {}; return `Track ${t} · ${m.name || 'Untitled track'}`; }
    return item === 'story' ? 'The story students read' : 'The finale';
  };
  /* How students see the partner, following the credit they chose. */
  const label = (q, c) => (c && c.credit === 'anonymous' ? 'a community partner' : c && c.credit === 'org' ? q.partner.org || 'a community partner'
    : `${q.partner.name}${q.partner.org ? ', ' + q.partner.org : ''}`);

  function pipe(st, qid) {
    const rec = recOf(st, qid), p = Engine.sel.partnerProgress(qid);
    const done = [true, p.contributed, p.reviewed === p.items.length && !p.open, p.signedOff, rec === st && st.phase !== 'LOBBY'];
    const now = done.indexOf(false);
    return `<div class="pipe">${['Invited', 'Contributed', 'Reviewed', 'Signed off', 'On the day'].map((t, i) => `<span class="pipe-s ${done[i] ? 'done' : i === now ? 'on' : ''}"><b>${done[i] ? '✓' : i + 1}</b>${t}</span>`).join('<i></i>')}</div>`;
  }

  function todos(st, qid) {
    const rec = recOf(st, qid), c = rec.contributor, p = Engine.sel.partnerProgress(qid), out = [];
    if (!p.contributed) out.push(['Tell students what they can learn from you', 'contribution']);
    c.requests.filter((r) => r.status !== 'open' && !c.reviews[r.item]).forEach((r) => out.push([`The educator answered your suggestion on “${itemLabel(rec, r.item)}” — check it again`, 'review']));
    if (p.contributed && p.reviewed < p.items.length) out.push([`Review how your community is represented (${p.items.length - p.reviewed} of ${p.items.length} left)`, 'review']);
    if (p.contributed && p.reviewed === p.items.length && !p.open && !p.signedOff) out.push(['Sign off the quest', 'review']);
    if (p.signedOff && rec === st && st.quest.status === 'PUBLISHED') out.push(['On the day: talk with students and confirm each conversation', 'facilitate']);
    return { list: out, waiting: p.open };
  }

  /* ---------------- partner screens ---------------- */
  function overview(st, qid) {
    const rec = recOf(st, qid), q = rec.quest, t = todos(st, qid), p = Engine.sel.partnerProgress(qid);
    const au = q.audience || SEED.defaultAudience();
    const ids = Object.keys(st.library);
    const all = ids.length > 1 ? `<div class="card"><h3 style="margin:0 0 8px">Your quests</h3><div class="stack" style="gap:6px">${ids.map((id) => { const r = recOf(st, id), pp = Engine.sel.partnerProgress(id);
      return `<div class="queue-row" style="align-items:center"><span style="flex:1"><strong>${esc(r.quest.title || 'Untitled quest')}</strong>${id === Engine.classState.activeQuest ? ' <span class="hint-note">· the class is running it</span>' : ''}</span>
        <span class="pill ${pp.signedOff ? 'mint' : pp.contributed ? 'peach' : 'plain'}">${pp.signedOff ? 'Signed off' : !pp.contributed ? 'Not started' : `${pp.reviewed}/${pp.items.length} reviewed`}</span>
        ${id === qid ? '<span class="pill lavender">Open</span>' : `<button class="btn btn-ghost btn-sm" data-a="pq-pick" data-id="${esc(id)}">Open</button>`}</div>`; }).join('')}</div></div>` : '';
    return `${all}<div class="card">
        <p style="margin:0">The educator invited you to help with <strong>${esc(q.title)}</strong>${q.venue ? ` at ${esc(q.venue)}` : ''}, for ${esc((SEED.AUDIENCES[au.kind] || 'school').toLowerCase())} learners${au.ages ? ' aged ' + esc(au.ages) : ''}.</p>
        <ul style="margin:8px 0 0;padding-left:20px"><li><strong>Before:</strong> share your knowledge and review how it is used.</li><li><strong>On the day:</strong> put devices away and talk with students. Confirm participation afterwards.</li><li><strong>After:</strong> read students' work and offer feedback when you have time.</li></ul>
        <div style="margin-top:12px">${pipe(st, qid)}</div></div>
      <div class="card next-step"><div class="eyebrow">What to do now</div>
        ${t.list.length ? `<ol class="ns-steps">${t.list.map(([text, screen], i) => `<li class="${i === 0 ? 'now' : ''}"><span style="flex:1">${esc(text)}</span><button class="btn btn-sm ${i === 0 ? 'btn-primary' : 'btn-ghost'}" data-a="screen" data-screen="${screen}">${({ contribution: 'Add contribution', review: 'Open review', facilitate: 'Open session' })[screen]}</button></li>`).join('')}</ol>`
          : `<p style="margin:4px 0 0">${p.signedOff ? 'All done for now — you’ve signed off. Thank you!' : 'Nothing to do right now.'}</p>`}
        ${t.waiting ? `<p class="hint-note" style="margin:8px 0 0">${Art.icon('clock', 14)} Waiting for the educator to answer ${t.waiting} suggestion${t.waiting > 1 ? 's' : ''}.</p>` : ''}
      </div>`;
  }

  function contribution(st, qid) {
    const rec = recOf(st, qid), q = rec.quest, c = rec.contributor, locked = q.status === 'PUBLISHED', dis = locked ? 'disabled' : '';
    const radio = (v, l) => `<label class="toggle"><input type="radio" name="credit" value="${v}" ${c.credit === v ? 'checked' : ''} ${dis}> ${l}</label>`;
    return `<div class="grid-2">
      <form class="card stack" data-form="contribution" data-qid="${qid}" style="gap:8px">
        <p class="hint-note" style="margin:0">Share your knowledge, preferences and availability. Save below, then open "Review the quest".</p>
        <div class="fld-group"><label class="fld" for="contrib">What can students learn only from you?</label>
          <textarea class="input" id="contrib" rows="4" placeholder="e.g. How objects like these are remembered in my community, and questions we still ask about them" ${dis}>${esc(c.text)}</textarea></div>
        <div class="fld-group"><label class="fld" for="c-avoid">Anything to avoid or handle with care?</label>
          <textarea class="input" id="c-avoid" rows="2" placeholder="e.g. Please don’t describe this as ‘lost’ culture; it is still practised" ${dis}>${esc(c.avoid)}</textarea></div>
        ${qid === st.activeQuest ? `<span class="fld">Questions you’ll ask students on the day</span>${Assistant.listEd('pp', st.contributor.prompts || SEED.contributor.prompts, 'A question for students', 'Add question')}` : ''}
        <span class="fld">How students should credit you</span>
        <div class="stack" style="gap:4px">${radio('name', 'My name and organisation')}${radio('org', 'Organisation only')}${radio('anonymous', 'Anonymous (“a community partner”)')}</div>
        <div class="grid-2" style="gap:8px"><div class="fld-group"><label class="fld" for="pt-name">Your name</label><input class="input" id="pt-name" value="${esc(q.partner.name)}" ${dis}></div>
          <div class="fld-group"><label class="fld" for="pt-org">Organisation</label><input class="input" id="pt-org" value="${esc(q.partner.org)}" ${dis}></div></div>
        <div class="fld-group"><label class="fld" for="c-avail">When you’re available on the day</label><input class="input" id="c-avail" value="${esc(c.availability)}" placeholder="e.g. 10:00–11:30, up to 5 students at a time" ${dis}></div>
        ${locked ? '<p class="hint-note" style="margin:0">The quest is published — ask the educator before changing anything.</p>' : `<button class="btn btn-primary" type="submit" style="align-self:flex-start">${Art.icon('check', 16)} Save my contribution</button>`}
      </form>
      <div class="stack">
        <div class="card"><div class="eyebrow coral">How this is used</div>
          <p style="margin:6px 0">The quest assistant uses your knowledge and care notes to help draft activities. You review how your contribution is represented before the educator publishes.</p>
          <p style="margin:0">Students will see you as: <strong>${esc(label(q, c))}</strong>.</p></div>
        <div class="card wash-peach"><div class="eyebrow coral">A shared responsibility</div>
          <p class="hint-note" style="margin:0">You approve your contribution and its representation. The educator manages the learning activity and publication.</p>
          <details class="partner-disclosure"><summary>About this demo</summary><p class="hint-note">The partner is simulated. No venue partnership is confirmed.</p></details></div>
      </div></div>`;
  }

  function itemBody(rec, item) {
    const c = rec.content;
    if (item.startsWith('track:')) {
      const m = c.missions[item.slice(6)] || {}, opts = c.peerTeaching.checkOptions[item.slice(6)] || [];
      const rows = (fields) => fields.filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
      return `<dl class="p-dl">${rows([['Where', m.gallery], ['Main question', m.narrative], ['What students do', m.observe]])}</dl>
        <details class="partner-disclosure"><summary>View discussion and learning details</summary><dl class="p-dl">${rows([['Discussion question', m.discuss], ['What students explain to their team', m.teachHeadline], ['Expected summary', (opts.find((o) => o.correct) || {}).text]])}</dl></details>`;
    }
    if (item === 'story') return `<p style="margin:0">${esc(c.subtitle ? c.subtitle + ' — ' : '')}${esc(c.story.opening || 'No story written yet.')}</p>`;
    return `<p style="margin:0 0 6px"><strong>${esc(c.finale.title)}</strong>${c.finale.intro ? ` — ${esc(c.finale.intro)}` : ''}</p>
      <ol style="margin:0;padding-left:18px">${(c.finale.steps || []).map((x) => `<li>${x.type === 'choice' ? `${esc(x.question)} <span class="hint-note">(right answer: ${esc((x.options.find((o) => o.correct) || {}).text || '—')})</span>` : esc(x.prompt)}</li>`).join('')}</ol>`;
  }

  function review(st, qid) {
    const rec = recOf(st, qid), c = rec.contributor, p = Engine.sel.partnerProgress(qid), locked = rec.quest.status === 'PUBLISHED';
    const cards = p.items.map((item) => {
      const reqs = c.requests.filter((r) => r.item === item), open = reqs.some((r) => r.status === 'open'), ok = c.reviews[item] === 'ok';
      return `<div class="card p-item ${ok ? 'p-ok' : ''}">
        <div class="spread"><h3 style="margin:0">${esc(itemLabel(rec, item))}</h3><span class="pill ${ok ? 'mint' : open ? 'peach' : 'plain'}">${ok ? '✓ Looks right' : open ? 'Suggestion sent' : 'To review'}</span></div>
        <div style="margin-top:8px">${itemBody(rec, item)}</div>
        ${reqs.map((r) => `<div class="p-req"><p style="margin:0"><strong>You suggested:</strong> ${esc(r.text)}</p>${r.status !== 'open' ? `<p style="margin:4px 0 0"><strong>Educator${r.status === 'accepted' ? ' (changed it)' : ''}:</strong> ${esc(r.reply)}</p>` : '<p class="hint-note" style="margin:4px 0 0">Waiting for the educator…</p>'}</div>`).join('')}
        ${locked ? '' : `<div class="row" style="margin-top:10px;gap:6px">
          ${!ok && !open ? `<button class="btn btn-teal btn-sm" data-p="ok" data-item="${item}" data-qid="${qid}">${Art.icon('check', 14)} Looks right</button>` : ''}
          <button class="btn btn-ghost btn-sm" data-p="suggest" data-item="${item}">Suggest a change</button></div>
          ${st.ui.pSuggest === item ? `<div class="row" style="margin-top:8px"><label class="sr-only" for="p-sug">Your suggestion</label><textarea class="input" id="p-sug" rows="2" style="flex:1;min-width:200px" placeholder="What should change, and why?"></textarea><button class="btn btn-primary btn-sm" data-p="send" data-item="${item}" data-qid="${qid}">Send to the educator</button></div>` : ''}`}
      </div>`;
    }).join('');
    const ready = p.contributed && p.reviewed === p.items.length && !p.open;
    return `<p class="hint-note" style="margin:-4px 0 0">Check that your knowledge and community are represented accurately. Open the details before marking a part "Looks right", or choose "Suggest a change".</p>
      ${cards}
      <div class="card ${p.signedOff ? 'wash-mint' : ''}"><div class="spread"><h3 style="margin:0">Approve your contribution and its representation</h3>${pipe(st, qid)}</div>
        <p class="hint-note">Your approval lets the educator publish. The educator remains responsible for the learning activity and supervision.</p>
        <ul style="margin:10px 0;padding-left:20px"><li>Contribution written: <strong>${p.contributed ? 'yes' : 'not yet'}</strong></li><li>Parts reviewed: <strong>${p.reviewed}/${p.items.length}</strong></li><li>Suggestions waiting for the educator: <strong>${p.open}</strong></li></ul>
        ${p.signedOff ? `<p style="margin:0">${Art.icon('check', 16)} You’ve signed off — the educator can publish.</p>`
          : `<button class="btn btn-teal" data-a="approve-contrib" data-qid="${qid}" ${ready ? '' : 'disabled'}>${Art.icon('check', 16)} Sign off the quest</button>${ready ? '' : '<p class="hint-note" style="margin:6px 0 0">Finish the steps above first.</p>'}`}
      </div>`;
  }

  /* Student work: did students record the partner's words fairly? */
  function quotes(st) {
    const tracks = SEED.topics.filter((t) => SEED.missions[t].needsFacilitator);
    if (!tracks.length) return '';
    const ps = SEED.participants.filter((p) => tracks.includes(p.topic) && st.evidence[p.id].answers && ['SUBMITTED', 'VERIFIED', 'NEEDS_REVISION'].includes(st.evidence[p.id].status));
    return `<div class="card"><div class="eyebrow coral">After the conversation</div><h3 style="margin:2px 0 6px">How students understood your words</h3>
      <p class="hint-note">Read their notes when you have time. If they misunderstood your meaning, flag it for the educator to follow up.</p>
      ${ps.length ? `<div class="stack" style="gap:10px">${ps.map((p) => { const ev = st.evidence[p.id], f = st.partnerFlags[p.id], m = SEED.missions[p.topic];
        return `<div class="queue-row" style="display:block"><div class="spread"><strong>${esc(nameOf(st, p))}${ev.simulated ? ' <span class="pill plain">simulated</span>' : ''}</strong>${f ? `<span class="pill ${f.open ? 'peach' : 'plain'}">${f.open ? 'flagged' : 'handled'}</span>` : ''}</div>
          <dl class="evidence-quote" style="margin:6px 0">${m.evidenceFields.map((x) => `<dt>${esc(x.label)}</dt><dd>${esc(ev.answers[x.key])}</dd>`).join('')}</dl>
          ${f ? `<p class="hint-note" style="margin:0">Your flag: ${esc(f.note)}</p>` : st.ui.pFlag === p.id
            ? `<div class="row"><label class="sr-only" for="p-flag">What’s not right</label><input class="input" id="p-flag" placeholder="What’s not right?" style="flex:1;min-width:160px"><button class="btn btn-primary btn-sm" data-p="flag-send" data-pid="${p.id}">Send flag</button></div>`
            : `<button class="btn btn-ghost btn-sm" data-p="flag" data-pid="${p.id}">Flag: not what I meant</button>`}</div>`; }).join('')}</div>`
        : '<p class="hint-note" style="margin:0">Students’ notes appear here once they submit them.</p>'}</div>`;
  }

  /* ---------------- educator side ---------------- */
  /* The link a partner opens: this class's session, partner view. */
  const partnerLink = () => `${location.origin}${location.pathname}?session=${encodeURIComponent(typeof Sync !== 'undefined' ? Sync.state.session : '')}#partner`;
  function educatorCard(st) {
    const c = st.contributor, p = Engine.sel.partnerProgress(), link = partnerLink();
    return `<form class="card stack" data-form="partner" style="gap:6px">
      <div class="spread"><h3 style="margin:0">${Art.icon('handshake', 18)} Community partner for this quest</h3><span class="pill ${p.signedOff ? 'mint' : 'peach'}">${p.signedOff ? 'signed off' : p.open ? p.open + ' suggestion' + (p.open > 1 ? 's' : '') : !p.contributed ? 'invited' : 'reviewing'}</span></div>
      <div class="grid-2" style="gap:8px"><div><label class="fld" for="pt-name">Name</label><input class="input" id="pt-name" value="${esc(st.quest.partner.name)}"></div><div><label class="fld" for="pt-org">Organisation</label><input class="input" id="pt-org" value="${esc(st.quest.partner.org)}"></div></div>
      <button class="btn btn-secondary btn-sm" type="submit" style="align-self:flex-start">Save</button>
      <p class="hint-note" style="margin:4px 0 0">Reviewed ${p.reviewed}/${p.items.length} parts${c.availability ? ' · available ' + esc(c.availability) : ''}.${p.open ? ' <a href="#educator" data-a="screen" data-screen="builder">Answer their suggestions</a>.' : ''}</p>
      <label class="fld" for="pt-link">Partner link (simulated invite)</label><div class="row" style="gap:6px"><input class="input mono" id="pt-link" value="${esc(link)}" readonly style="flex:1;min-width:140px"><button class="btn btn-ghost btn-sm" type="button" data-p="copy">Copy</button></div>
    </form>`;
  }
  function requestsCard(st) {
    const c = st.contributor, reqs = c.requests.filter((r) => r.status === 'open');
    if (!reqs.length) return '';
    return `<section class="card wash-peach" id="sec-partner-req"><div class="spread"><h3 style="margin:0">${Art.icon('handshake', 18)} Suggestions from your community partner</h3><span class="pill peach">${reqs.length}</span></div>
      <div class="stack" style="gap:10px;margin-top:8px">${reqs.map((r) => `<div class="queue-row" style="display:block"><strong>${esc(itemLabel(st, r.item))}</strong><p style="margin:4px 0">${esc(r.text)}</p>
        <div class="row" style="gap:6px"><label class="sr-only" for="pr-${r.id}">Reply</label><input class="input" id="pr-${r.id}" placeholder="Reply (optional if you changed it)" style="flex:1;min-width:160px">
          <button class="btn btn-teal btn-sm" data-p="accept" data-id="${r.id}">${Art.icon('check', 14)} I’ve changed it</button><button class="btn btn-ghost btn-sm" data-p="reply" data-id="${r.id}">Reply only</button></div></div>`).join('')}</div>
      <p class="hint-note" style="margin:8px 0 0">Edit the track or finale below, then mark it changed — your partner checks it again before signing off.</p></section>`;
  }
  function flagsCard(st) {
    const open = Object.entries(st.partnerFlags || {}).filter(([, f]) => f.open);
    if (!open.length) return '';
    return `<div class="card wash-peach"><div class="spread"><h3 style="margin:0">${Art.icon('alert', 18)} Your partner flagged how students quoted them</h3><span class="pill peach">${open.length}</span></div>
      <div class="stack" style="gap:8px;margin-top:8px">${open.map(([pid, f]) => { const p = SEED.byId[pid]; return p ? `<div class="help-row"><span><strong>${esc(nameOf(st, p))}</strong> · “${esc(f.note)}”</span>
        <span class="row" style="gap:6px"><button class="btn btn-teal btn-sm" data-p="flag-ask" data-pid="${pid}">Ask student to revise</button><button class="btn btn-ghost btn-sm" data-p="flag-dismiss" data-pid="${pid}">Dismiss</button></span></div>` : ''; }).join('')}</div></div>`;
  }

  function bind(root) {
    root.querySelectorAll('[data-p]').forEach((el) => el.addEventListener('click', (e) => {
      e.preventDefault();
      const S = Engine.state, act = window.WQ.act, render = window.WQ.render, d = el.dataset;
      switch (d.p) {
        case 'ok': return act('reviewItem', { questId: d.qid, item: d.item }), render();
        case 'suggest': S.ui.pSuggest = S.ui.pSuggest === d.item ? null : d.item; return render();
        case 'send': { const r = act('requestChange', { questId: d.qid, item: d.item, text: (document.getElementById('p-sug') || {}).value }); if (r.ok) S.ui.pSuggest = null; return render(); }
        case 'accept': return act('answerRequest', { id: d.id, accept: true, reply: (document.getElementById('pr-' + d.id) || {}).value });
        case 'reply': return act('answerRequest', { id: d.id, accept: false, reply: (document.getElementById('pr-' + d.id) || {}).value });
        case 'flag': S.ui.pFlag = d.pid; return render();
        case 'flag-send': { const r = act('flagParaphrase', { participantId: d.pid, note: (document.getElementById('p-flag') || {}).value }); if (r.ok) S.ui.pFlag = null; return render(); }
        case 'flag-ask': return act('resolveFlag', { participantId: d.pid, ask: true });
        case 'flag-dismiss': return act('resolveFlag', { participantId: d.pid, ask: false });
        case 'copy': { const i = document.getElementById('pt-link'); try { navigator.clipboard.writeText(i.value); window.WQ.toast('Link copied.', 'success'); } catch { i.select(); } return; }
        default:
      }
    }));
  }

  return { overview, contribution, review, quotes, educatorCard, requestsCard, flagsCard, label, bind, link: partnerLink };
})();
