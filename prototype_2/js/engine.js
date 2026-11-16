/* WorldQuest prototype_2 — authoritative demo game engine.
 * Pure state + guarded actions. The UI may only mutate state through Engine.dispatch,
 * which enforces the Jigsaw rules: evidence must be VERIFIED by the educator (or the
 * approved facilitator for Expert D), the finale stays LOCKED until all four
 * perspectives are verified AND shared, collectible claims are idempotent, and the
 * Guardian of Stories master award is granted exactly once.
 *
 * This is a single-browser demo adapter (localStorage persistence), standing in for
 * the server-side logic described in WORLDQUEST_MVP_PRD.md. It does not demonstrate
 * multi-user production security.
 */
'use strict';

const Engine = (() => {
  const STORAGE_KEY = 'worldquest-prototype2-v1';

  /* ---------- initial state ---------- */

  function freshState() {
    const evidence = {};
    for (const p of SEED.participants) {
      evidence[p.id] = { status: 'AVAILABLE', answers: null, note: '', simulated: false };
    }
    const peerTeach = {};
    for (const h of SEED.homeGroups) {
      peerTeach[h] = {};
      for (const t of SEED.topics) {
        peerTeach[h][t] = { shared: false, presenter: null, checker: null, answerId: null, simulated: false };
      }
    }
    const finale = {};
    for (const h of SEED.homeGroups) {
      finale[h] = {
        status: 'LOCKED', // LOCKED | AVAILABLE | SUBMITTED | APPROVED | NEEDS_REVISION
        match: {}, // objectId -> evidence tag
        overclaim: null,
        tiles: [],
        note: '',
        rubric: null,
        simulated: false,
      };
    }
    const bonus = {};
    for (const c of SEED.collectibles) {
      bonus[c.id] = { status: 'AVAILABLE', answer: '', simulated: false }; // AVAILABLE | SUBMITTED | CLAIMED
    }
    return {
      v: 1,
      phase: 'LOBBY',
      quest: {
        status: 'PARTNER_REVIEW', // DRAFT | PARTNER_REVIEW | APPROVED | PUBLISHED
        title: SEED.title,
        objective: 'Interpret evidence from multiple perspectives',
        venue: 'The Fitzwilliam Museum (demo setting)',
        draftGenerated: false,
      },
      contributor: {
        text: SEED.contributor.defaultContribution,
        status: 'PENDING', // PENDING | APPROVED
        interactionPrompt: 0,
      },
      interactions: {}, // participantId -> true once facilitator verifies (Expert D)
      evidence,
      peerTeach,
      finale,
      bonus,
      claims: {}, // collectibleId -> { home, at }
      master: null, // { at } — exactly once
      masterSeen: false,
      reflections: {}, // participantId -> [a1, a2]
      ui: { role: 'student', student: 'S06', screen: null, lookUp: false },
      log: [],
    };
  }

  /* ---------- persistence ---------- */

  let state = load();
  const listeners = new Set();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.v === 1) return parsed;
      }
    } catch (e) {
      /* corrupted or unavailable storage -> fresh demo */
    }
    return freshState();
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* private mode: demo continues in memory */
    }
  }

  function emit(event) {
    persist();
    listeners.forEach((fn) => fn(state, event));
  }

  function audit(actor, text) {
    state.log.unshift({ at: Date.now(), actor, text });
    if (state.log.length > 120) state.log.length = 120;
  }

  /* ---------- selectors (read-only helpers) ---------- */

  const sel = {
    participant: (id) => SEED.byId[id],
    evidenceOf: (id) => state.evidence[id],

    // The verified evidence map for one home group: topic -> boolean
    homeVerified(h) {
      const out = {};
      for (const t of SEED.topics) {
        const expert = SEED.expertOf(h, t);
        out[t] = expert ? state.evidence[expert.id].status === 'VERIFIED' : false;
      }
      return out;
    },

    homeShared(h) {
      const out = {};
      for (const t of SEED.topics) out[t] = state.peerTeach[h][t].shared;
      return out;
    },

    finaleUnlocked(h) {
      const v = sel.homeVerified(h);
      const s = sel.homeShared(h);
      return SEED.topics.every((t) => v[t]) && SEED.topics.every((t) => s[t]);
    },

    finaleLockReasons(h) {
      const v = sel.homeVerified(h);
      const s = sel.homeShared(h);
      const reasons = [];
      for (const t of SEED.topics) {
        if (!v[t]) reasons.push({ topic: t, kind: 'evidence' });
        else if (!s[t]) reasons.push({ topic: t, kind: 'teach' });
      }
      return reasons;
    },

    claimedCount: () => Object.keys(state.claims).length,

    pendingEvidence: () =>
      SEED.participants.filter((p) => state.evidence[p.id].status === 'SUBMITTED'),

    pendingInteractions: () =>
      SEED.participants.filter(
        (p) => p.topic === 'D' && !state.interactions[p.id] && state.phase !== 'LOBBY'
      ),

    pendingFinales: () => SEED.homeGroups.filter((h) => state.finale[h].status === 'SUBMITTED'),

    pendingBonus: () => SEED.collectibles.filter((c) => state.bonus[c.id].status === 'SUBMITTED'),

    phaseIndex: () => SEED.phases.indexOf(state.phase),
  };

  /* ---------- guarded actions ---------- */

  const actions = {
    /* ----- demo navigation (UI state kept here so reloads restore the demo) ----- */
    setRole(s, { role }) {
      s.ui.role = role;
      s.ui.lookUp = false;
      return { ok: true };
    },
    setStudent(s, { id }) {
      if (!SEED.byId[id]) return { ok: false, msg: 'Unknown explorer.' };
      s.ui.student = id;
      s.ui.lookUp = false;
      return { ok: true };
    },
    setScreen(s, { screen }) {
      s.ui.screen = screen;
      return { ok: true };
    },
    setLookUp(s, { on }) {
      s.ui.lookUp = !!on;
      return { ok: true };
    },

    resetDemo() {
      state = freshState();
      audit('system', 'Demo reset to seeded state.');
      return { ok: true, msg: 'Demo reset.' };
    },

    /* ----- quest authoring (educator) ----- */
    updateQuest(s, { field, value }) {
      if (!['title', 'objective', 'venue'].includes(field)) return { ok: false };
      s.quest[field] = value;
      return { ok: true, silent: true };
    },
    generateDraft(s) {
      s.quest.draftGenerated = true;
      audit('teacher', 'Generated quest draft (Seeded demo — no API key used).');
      return { ok: true, msg: 'Seeded demo draft ready — no AI key was used.' };
    },
    publishQuest(s) {
      if (s.contributor.status !== 'APPROVED')
        return { ok: false, msg: 'The community contribution has not been approved yet.' };
      if (s.quest.status === 'PUBLISHED') return { ok: false, msg: 'Already published.' };
      s.quest.status = 'PUBLISHED';
      audit('teacher', 'Published quest (DEMO_ONLY — simulation notice shown).');
      return { ok: true, msg: 'Quest published as a demo-only adventure.' };
    },

    /* ----- collaborator ----- */
    saveContribution(s, { text }) {
      const trimmed = (text || '').trim();
      if (!trimmed) return { ok: false, msg: 'The contribution cannot be empty.' };
      s.contributor.text = trimmed;
      audit('collaborator', 'Edited learning contribution.');
      return { ok: true, msg: 'Contribution saved.' };
    },
    approveContribution(s) {
      if (s.contributor.status === 'APPROVED') return { ok: false, msg: 'Already approved.' };
      s.contributor.status = 'APPROVED';
      audit('collaborator', 'Approved community contribution (simulated contributor).');
      return { ok: true, msg: 'Contribution approved. The educator can now publish.' };
    },
    verifyInteraction(s, { participantId }) {
      const p = SEED.byId[participantId];
      if (!p || p.topic !== 'D') return { ok: false, msg: 'Only Expert D has an arranged interaction.' };
      if (s.interactions[participantId]) return { ok: false, msg: 'Interaction already verified.' };
      s.interactions[participantId] = true;
      audit('collaborator', `Verified arranged interaction with ${p.name}.`);
      return { ok: true, msg: `Interaction with ${p.name} verified.` };
    },
    setInteractionPrompt(s, { index }) {
      s.contributor.interactionPrompt = index;
      return { ok: true, silent: true };
    },

    /* ----- session phases (educator only) ----- */
    advancePhase(s) {
      const i = SEED.phases.indexOf(s.phase);
      if (i >= SEED.phases.length - 1) return { ok: false, msg: 'The session is already complete.' };
      if (s.phase === 'LOBBY' && s.quest.status !== 'PUBLISHED')
        return { ok: false, msg: 'Publish the quest before starting the session.' };
      s.phase = SEED.phases[i + 1];
      audit('teacher', `Advanced session to ${s.phase}.`);
      return { ok: true, msg: `Session phase: ${SEED.phaseMeta[s.phase].label}.` };
    },
    rewindPhase(s) {
      const i = SEED.phases.indexOf(s.phase);
      if (i <= 0) return { ok: false, msg: 'Already at the lobby.' };
      s.phase = SEED.phases[i - 1];
      audit('teacher', `Rewound session to ${s.phase}.`);
      return { ok: true, msg: `Session phase: ${SEED.phaseMeta[s.phase].label}.` };
    },

    /* ----- evidence (student submits; educator/facilitator verifies) ----- */
    submitEvidence(s, { participantId, answers }) {
      const p = SEED.byId[participantId];
      if (!p) return { ok: false };
      if (!['EXPERT', 'PEER_TEACH', 'FINALE'].includes(s.phase))
        return { ok: false, msg: 'Evidence opens when the educator starts the expert phase.' };
      const ev = s.evidence[participantId];
      if (ev.status === 'VERIFIED') return { ok: false, msg: 'This evidence is already verified.' };
      const mission = SEED.missions[p.topic];
      for (const f of mission.evidenceFields) {
        if (!answers[f.key] || !String(answers[f.key]).trim())
          return { ok: false, msg: `Please fill in “${f.label}” before submitting.` };
      }
      if (mission.needsFacilitator && !s.interactions[participantId])
        return {
          ok: false,
          msg: 'Your arranged contributor conversation has not been verified yet — ask the facilitator to confirm it first.',
        };
      ev.answers = answers;
      ev.status = 'SUBMITTED';
      ev.note = '';
      audit('student', `${p.name} submitted ${mission.name} evidence.`);
      return { ok: true, msg: 'Evidence submitted — awaiting educator review.' };
    },

    reviewEvidence(s, { participantId, verdict, note, reviewer }) {
      const p = SEED.byId[participantId];
      const ev = s.evidence[participantId];
      if (!p || ev.status !== 'SUBMITTED') return { ok: false, msg: 'Nothing to review.' };
      const mission = SEED.missions[p.topic];
      const allowed = reviewer === 'teacher' || (reviewer === 'collaborator' && mission.needsFacilitator);
      if (!allowed) return { ok: false, msg: 'Only the educator (or the approved facilitator for Expert D) can verify this.' };
      if (verdict === 'VERIFIED') {
        ev.status = 'VERIFIED';
        audit(reviewer, `Verified ${p.name}’s ${mission.name} evidence.`);
        return { ok: true, msg: `${p.name}’s evidence verified.` };
      }
      ev.status = 'NEEDS_REVISION';
      ev.note = note || 'Add one directly observed detail and separate it from interpretation.';
      audit(reviewer, `Returned ${p.name}’s evidence for revision.`);
      return { ok: true, msg: `${p.name}’s evidence returned for revision.` };
    },

    /* ----- peer teaching ----- */
    shareTeachBack(s, { home, topic, checkerId, answerId }) {
      if (!['PEER_TEACH', 'FINALE'].includes(s.phase))
        return { ok: false, msg: 'Peer teaching opens when the educator starts that phase.' };
      const cell = s.peerTeach[home][topic];
      if (cell.shared) return { ok: false, msg: 'This perspective has already been shared.' };
      const expert = SEED.expertOf(home, topic);
      if (!expert || s.evidence[expert.id].status !== 'VERIFIED')
        return { ok: false, msg: `${SEED.topicMeta[topic].name} evidence must be verified before it can be taught.` };
      const checker = SEED.byId[checkerId];
      if (!checker || checker.home !== home)
        return { ok: false, msg: 'Pick a teammate from this home team to answer the check.' };
      if (checker.id === expert.id)
        return { ok: false, msg: 'The expert cannot answer their own comprehension check — pick a teammate.' };
      const opt = SEED.peerTeaching.checkOptions[topic].find((o) => o.id === answerId);
      if (!opt) return { ok: false, msg: 'Choose a teach-back answer.' };
      if (!opt.correct)
        return { ok: false, msg: 'Not quite — that overstates what the evidence can show. Listen again and retry.' };
      cell.shared = true;
      cell.presenter = expert.id;
      cell.checker = checkerId;
      cell.answerId = answerId;
      audit('student', `${expert.name} taught ${SEED.topicMeta[topic].name} to ${home}; ${checker.name} passed the check.`);
      maybeUnlockFinale(s, home);
      return { ok: true, msg: `${SEED.topicMeta[topic].name} shared with the team!` };
    },

    /* ----- finale ----- */
    setFinaleMatch(s, { home, objectId, tag }) {
      const f = s.finale[home];
      if (!sel.finaleUnlocked(home)) return { ok: false, msg: 'The finale is still locked.' };
      if (['SUBMITTED', 'APPROVED'].includes(f.status)) return { ok: false, msg: 'Already submitted.' };
      f.status = 'AVAILABLE';
      if (tag === null) delete f.match[objectId];
      else {
        for (const k of Object.keys(f.match)) if (f.match[k] === tag) delete f.match[k];
        f.match[objectId] = tag;
      }
      return { ok: true, silent: true };
    },
    setFinaleOverclaim(s, { home, optionId }) {
      const f = s.finale[home];
      if (!sel.finaleUnlocked(home)) return { ok: false, msg: 'The finale is still locked.' };
      if (['SUBMITTED', 'APPROVED'].includes(f.status)) return { ok: false, msg: 'Already submitted.' };
      f.overclaim = optionId;
      return { ok: true, silent: true };
    },
    toggleFinaleTile(s, { home, tileId }) {
      const f = s.finale[home];
      if (!sel.finaleUnlocked(home)) return { ok: false, msg: 'The finale is still locked.' };
      if (['SUBMITTED', 'APPROVED'].includes(f.status)) return { ok: false, msg: 'Already submitted.' };
      const i = f.tiles.indexOf(tileId);
      if (i >= 0) f.tiles.splice(i, 1);
      else {
        if (f.tiles.length >= 5) return { ok: false, msg: 'Five sentences is plenty — remove one first.' };
        f.tiles.push(tileId);
      }
      return { ok: true, silent: true };
    },

    submitFinale(s, { home }) {
      const f = s.finale[home];
      if (!sel.finaleUnlocked(home))
        return { ok: false, msg: 'The finale is locked: every perspective must be verified and taught first.' };
      if (['SUBMITTED', 'APPROVED'].includes(f.status)) return { ok: false, msg: 'Already submitted.' };

      // Panel 1 — evidence match must be complete and correct.
      for (const o of SEED.finale.objects) {
        if (!f.match[o.id]) return { ok: false, msg: 'Match all four objects to a perspective first.' };
        if (f.match[o.id] !== o.answer)
          return { ok: false, msg: 'One of the matches does not fit — discuss as a team and try a different pairing.' };
      }
      // Panel 2 — cautious principle.
      const chosen = SEED.finale.overclaim.options.find((o) => o.id === f.overclaim);
      if (!chosen) return { ok: false, msg: 'Choose an exhibition principle in panel 2.' };
      if (!chosen.correct)
        return { ok: false, msg: 'That principle overclaims. Which statement stays within the evidence?' };
      // Panel 3 — structural check of the composed introduction.
      const picked = SEED.finale.compose.tiles.filter((t) => f.tiles.includes(t.id));
      if (picked.some((t) => t.trap))
        return { ok: false, msg: 'One chosen sentence claims too much — your introduction should avoid overclaiming.' };
      const counts = {};
      for (const t of picked) counts[t.cat] = (counts[t.cat] || 0) + 1;
      const needs = SEED.finale.compose.needs;
      for (const cat of Object.keys(needs)) {
        if ((counts[cat] || 0) < needs[cat]) {
          const hints = {
            evidence: 'cite at least two observed objects',
            perspectives: 'acknowledge varied experiences',
            uncertainty: 'note one uncertainty',
            invite: 'invite a visitor question',
          };
          return { ok: false, msg: `Your introduction still needs to ${hints[cat]}.` };
        }
      }
      f.status = 'SUBMITTED';
      audit('student', `${home} submitted the restored exhibition introduction.`);
      return { ok: true, msg: 'Introduction submitted — awaiting the curator’s (educator’s) approval.' };
    },

    reviewFinale(s, { home, approve, rubric, note }) {
      const f = s.finale[home];
      if (f.status !== 'SUBMITTED') return { ok: false, msg: 'Nothing to review for this team.' };
      if (approve) {
        if (!rubric || SEED.finale.rubric.some((r) => !rubric[r]))
          return { ok: false, msg: 'Tick all four rubric items to approve.' };
        f.status = 'APPROVED';
        f.rubric = rubric;
        audit('teacher', `Approved ${home}’s exhibition introduction.`);
        return { ok: true, msg: `${home}’s introduction approved — main quest complete for that team.` };
      }
      f.status = 'NEEDS_REVISION';
      f.note = note || 'Strengthen the uncertainty sentence and cite a second object.';
      audit('teacher', `Returned ${home}’s introduction for revision.`);
      return { ok: true, msg: `${home}’s introduction returned with a note.` };
    },

    /* ----- optional collectibles (never gate the main quest) ----- */
    submitBonus(s, { collectibleId, answer }) {
      const card = SEED.collectibles.find((c) => c.id === collectibleId);
      if (!card) return { ok: false };
      const b = s.bonus[collectibleId];
      if (s.claims[collectibleId]) return { ok: false, msg: 'This card has already been earned.' };
      if (b.status === 'SUBMITTED') return { ok: false, msg: 'Already submitted — awaiting educator approval.' };
      if (!answer || !answer.trim()) return { ok: false, msg: 'Write your team’s discovery first.' };
      if (!['FINALE', 'REFLECTION', 'COMPLETE'].includes(s.phase))
        return { ok: false, msg: 'Bonus discoveries open during the finale phase — the main quest comes first.' };
      b.answer = answer.trim();
      b.status = 'SUBMITTED';
      audit('student', `${card.home} submitted the ${card.title} bonus discovery.`);
      return { ok: true, msg: 'Discovery submitted — awaiting educator approval.' };
    },

    /* Idempotent claim: approving twice, or two racing approvals, yields one claim;
       the master award is granted exactly once, inside the same action. */
    approveBonus(s, { collectibleId }) {
      const card = SEED.collectibles.find((c) => c.id === collectibleId);
      if (!card) return { ok: false };
      if (s.claims[collectibleId]) return { ok: false, msg: 'Already claimed — claims are idempotent.' };
      const b = s.bonus[collectibleId];
      if (b.status !== 'SUBMITTED') return { ok: false, msg: 'No submitted discovery to approve.' };
      b.status = 'CLAIMED';
      s.claims[collectibleId] = { home: card.home, at: Date.now() };
      audit('teacher', `Approved ${card.title} — claimed for ${card.home}.`);
      let masterNow = false;
      if (!s.master && SEED.collectibles.every((c) => s.claims[c.id])) {
        s.master = { at: Date.now() };
        masterNow = true;
        audit('system', 'Guardian of Stories master award unlocked (exactly once).');
      }
      return {
        ok: true,
        msg: `${card.title} added to the class album!`,
        reveal: collectibleId,
        master: masterNow,
      };
    },

    markMasterSeen(s) {
      s.masterSeen = true;
      return { ok: true, silent: true };
    },

    /* ----- reflection ----- */
    submitReflection(s, { participantId, answers }) {
      if (!['REFLECTION', 'COMPLETE'].includes(s.phase))
        return { ok: false, msg: 'Reflection opens at the end of the session.' };
      if (!answers[0]?.trim() || !answers[1]?.trim())
        return { ok: false, msg: 'Answer both reflection prompts.' };
      s.reflections[participantId] = answers.map((a) => a.trim());
      audit('student', `${SEED.byId[participantId].name} submitted a reflection.`);
      return { ok: true, msg: 'Reflection saved — now look up and join the discussion!' };
    },

    /* ----- clearly labelled demo shortcut (SIMULATED) ----- */
    simulateClassmates(s) {
      let changed = 0;
      for (const p of SEED.participants) {
        if (p.id === s.ui.student) continue;
        const ev = s.evidence[p.id];
        if (ev.status !== 'VERIFIED') {
          if (p.topic === 'D') s.interactions[p.id] = true;
          const mission = SEED.missions[p.topic];
          const answers = {};
          for (const f of mission.evidenceFields) answers[f.key] = '[Simulated demo answer] ' + f.label;
          ev.answers = answers;
          ev.status = 'VERIFIED';
          ev.simulated = true;
          changed++;
        }
      }
      for (const h of SEED.homeGroups) {
        for (const t of SEED.topics) {
          const cell = s.peerTeach[h][t];
          const expert = SEED.expertOf(h, t);
          const isActive = expert && expert.id === s.ui.student;
          if (!cell.shared && !isActive && s.evidence[expert.id].status === 'VERIFIED') {
            const checker = SEED.homeMembers(h).find((m) => m.id !== expert.id);
            cell.shared = true;
            cell.presenter = expert.id;
            cell.checker = checker.id;
            cell.answerId = SEED.peerTeaching.checkOptions[t].find((o) => o.correct).id;
            cell.simulated = true;
            maybeUnlockFinale(s, h);
            changed++;
          }
        }
      }
      audit('teacher', `SIMULATED demo action: seeded ${changed} classmate step(s).`);
      return {
        ok: true,
        msg: changed
          ? 'Classmate progress seeded (clearly marked SIMULATED). Your own explorer’s steps stay yours to play.'
          : 'Classmates are already up to date.',
      };
    },

    simulateBonusSubmissions(s) {
      if (!['FINALE', 'REFLECTION', 'COMPLETE'].includes(s.phase))
        return { ok: false, msg: 'Bonus discoveries open during the finale phase.' };
      let n = 0;
      for (const c of SEED.collectibles) {
        const b = s.bonus[c.id];
        if (b.status === 'AVAILABLE' && !s.claims[c.id]) {
          b.answer = '[Simulated demo discovery] ' + c.activity;
          b.status = 'SUBMITTED';
          b.simulated = true;
          n++;
        }
      }
      audit('teacher', `SIMULATED demo action: submitted ${n} bonus discoveries.`);
      return { ok: true, msg: n ? `${n} team discoveries submitted (SIMULATED) — approve them to fill the album.` : 'Nothing left to simulate.' };
    },
  };

  function maybeUnlockFinale(s, home) {
    const f = s.finale[home];
    if (f.status === 'LOCKED' && sel.finaleUnlocked(home)) f.status = 'AVAILABLE';
  }

  /* ---------- dispatch ---------- */

  function dispatch(type, payload = {}) {
    const action = actions[type];
    if (!action) return { ok: false, msg: 'Unknown action: ' + type };
    const result = action(state, payload) || { ok: true };
    if (result.ok) emit({ type, payload, result });
    return result;
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  return {
    dispatch,
    subscribe,
    sel,
    get state() {
      return state;
    },
  };
})();
