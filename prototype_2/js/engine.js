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
        duration: 60,
        classSize: 20,
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
      sources: seedSources(), // the educator's approved-source library the assistant may draft from
      seats: {}, // participantId -> { nick, at } once a real student joins with the class code
      partnerFeedback: {}, // home -> { text, at } from the community collaborator on the team's finale
      checkins: {}, // participantId -> { at, via: 'QR' | 'CODE' | 'SIMULATED' }
      help: [], // { id, pid, at, open }
      tracks: { A: 'AI', B: 'AI', C: 'AI', D: 'AI' }, // AI | REVISED | APPROVED (educator review of AI-drafted tracks)
      revisions: {}, // topic -> note from an AI revision
      trackEdits: {}, // topic -> { observe?, discuss?, narrative?, fallback?, teachHeadline?, hintsExtra?: [] } shown to students
      ui: { role: 'student', student: 'S06', screen: null, lookUp: false, joined: false, masterSeen: false, drafts: {} },
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
        if (parsed && parsed.v === 1) return upgrade(parsed);
      }
    } catch (e) {
      /* corrupted or unavailable storage -> fresh demo */
    }
    return freshState();
  }

  function seedSources() {
    return SEED.topics.map((t, i) => ({ id: 'S' + (i + 1), kind: 'official', title: SEED.missions[t].gallery + ' · official page', url: SEED.missions[t].sourceUrl, text: SEED.missions[t].sourceFact }))
      .concat([{ id: 'S' + (SEED.topics.length + 1), kind: 'partner', title: 'Community partner contribution', url: '', text: '' }]);
  }

  function upgrade(s) {
    s.sources = s.sources || seedSources();
    s.checkins = s.checkins || {};
    s.help = s.help || [];
    s.tracks = s.tracks || { A: 'AI', B: 'AI', C: 'AI', D: 'AI' };
    s.revisions = s.revisions || {};
    s.trackEdits = s.trackEdits || {};
    s.seats = s.seats || {};
    s.contributor.extraPrompts = s.contributor.extraPrompts || [];
    s.partnerFeedback = s.partnerFeedback || {};
    s.quest.duration = s.quest.duration || 60;
    s.quest.classSize = s.quest.classSize || 20;
    s.ui = s.ui || {};
    s.ui.drafts = s.ui.drafts || {};
    return s;
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
    mission: (t) => {
      const base = SEED.missions[t], e = (state.trackEdits && state.trackEdits[t]) || {};
      return { ...base, ...e, hints: [...base.hints, ...(e.hintsExtra || [])] };
    },
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
      if (!['title', 'objective', 'venue', 'duration', 'classSize', 'safety'].includes(field)) return { ok: false };
      if (field === 'safety') { s.quest.safety = !!value; return { ok: true, silent: true }; }
      s.quest[field] = ['duration', 'classSize'].includes(field) ? Number(value) : value;
      return { ok: true, silent: true };
    },
    generateDraft(s) {
      s.quest.draftGenerated = true;
      s.tracks = { A: 'AI', B: 'AI', C: 'AI', D: 'AI' };
      s.revisions = {};
      s.trackEdits = {};
      audit('teacher', 'Generated quest draft (Seeded demo — no API key used).');
      return { ok: true, msg: 'Seeded demo draft ready — no AI key was used.' };
    },
    publishQuest(s) {
      if (s.contributor.status !== 'APPROVED')
        return { ok: false, msg: 'The community contribution has not been approved yet.' };
      if (s.quest.status === 'PUBLISHED') return { ok: false, msg: 'Already published.' };
      if (!s.quest.draftGenerated) return { ok: false, msg: 'Draft the quest first.' };
      if (!s.quest.safety) return { ok: false, msg: 'Confirm the safety and supervision plan first.' };
      if (SEED.topics.some((t) => s.tracks[t] !== 'APPROVED'))
        return { ok: false, msg: 'Approve all four AI-drafted expert tracks first — nothing reaches students unapproved.' };
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
    addPartnerPrompt(s, { text }) {
      const t = String(text || '').trim();
      if (t.length < 8) return { ok: false, msg: 'Write a full question for the students.' };
      s.contributor.extraPrompts = s.contributor.extraPrompts || [];
      if (s.contributor.extraPrompts.length >= 3) return { ok: false, msg: 'Three of your own questions is plenty for one session.' };
      s.contributor.extraPrompts.push(t);
      s.contributor.interactionPrompt = SEED.contributor.prompts.length + s.contributor.extraPrompts.length - 1;
      audit('collaborator', `Added a conversation question: “${t}”`);
      return { ok: true, msg: 'Question added — Expert D students will see it.' };
    },
    partnerFeedback(s, { home, text }) {
      const f = s.finale[home];
      if (!f || !['SUBMITTED', 'APPROVED'].includes(f.status)) return { ok: false, msg: 'This team has not submitted its introduction yet.' };
      const t = String(text || '').trim();
      if (t.length < 8) return { ok: false, msg: 'Write a sentence or two of feedback.' };
      s.partnerFeedback[home] = { text: t, at: Date.now() };
      audit('collaborator', `Gave feedback on team ${home}’s exhibition introduction.`);
      return { ok: true, msg: `Feedback sent to team ${home}.` };
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
      if (!s.checkins[participantId])
        return { ok: false, msg: 'Check in at your gallery first: scan the QR clue card there (or type the station code).' };
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
      s.ui.masterSeen = true;
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

    /* ----- AI draft review (educator approves each track) ----- */
    reviseTrack(s, { topic, note, patch, by }) {
      if (!s.quest.draftGenerated) return { ok: false, msg: 'Draft the quest first.' };
      if (s.quest.status === 'PUBLISHED') return { ok: false, msg: 'Already published — edits would disrupt a live session.' };
      if (!SEED.topics.includes(topic)) return { ok: false };
      const e = (s.trackEdits[topic] = s.trackEdits[topic] || {});
      for (const k of ['observe', 'discuss', 'narrative', 'fallback', 'teachHeadline']) if (patch && typeof patch[k] === 'string' && patch[k].trim()) e[k] = patch[k].trim().slice(0, 600);
      if (patch && typeof patch.hint === 'string' && patch.hint.trim()) e.hintsExtra = [...(e.hintsExtra || []), patch.hint.trim().slice(0, 300)].slice(-3);
      s.tracks[topic] = by === 'educator' ? 'EDITED' : 'REVISED';
      s.revisions[topic] = [s.revisions[topic], note].filter(Boolean).join(' · ').slice(-500);
      audit('teacher', `AI revised track ${topic} on request (simulated AI) — needs approval again.`);
      return { ok: true, silent: true };
    },
    approveTrack(s, { topic }) {
      if (!s.quest.draftGenerated) return { ok: false, msg: 'Draft the quest first.' };
      if (s.tracks[topic] === 'APPROVED') return { ok: false, msg: 'Already approved.' };
      s.tracks[topic] = 'APPROVED';
      audit('teacher', `Approved AI-drafted track ${topic} (${SEED.topicMeta[topic].name}).`);
      return { ok: true, msg: `Track ${topic} approved.` };
    },

    /* ----- approved-source library (educator) ----- */
    addSource(s, { title, url, text }) {
      if (s.quest.status === 'PUBLISHED') return { ok: false, msg: 'The quest is published — sources are frozen for this version.' };
      const t = String(title || '').trim(), x = String(text || '').trim(), u = String(url || '').trim();
      if (t.length < 3) return { ok: false, msg: 'Give the source a short title.' };
      if (x.length < 20) return { ok: false, msg: 'Paste the relevant text (at least a sentence) so the assistant can cite it.' };
      if (u && !/^https?:\/\//.test(u)) return { ok: false, msg: 'Links must start with http:// or https://' };
      const n = Math.max(0, ...s.sources.map((x2) => parseInt(String(x2.id).slice(1), 10) || 0)) + 1;
      s.sources.push({ id: 'S' + n, kind: 'educator', title: t.slice(0, 80), url: u.slice(0, 300), text: x.slice(0, 2000) });
      audit('teacher', `Added approved source S${n}: ${t.slice(0, 60)}.`);
      return { ok: true, msg: `Added S${n} to your approved sources.` };
    },
    removeSource(s, { id }) {
      const i = s.sources.findIndex((x) => x.id === id);
      if (i < 0 || s.sources[i].kind !== 'educator') return { ok: false, msg: 'Only sources you added can be removed.' };
      if (s.quest.status === 'PUBLISHED') return { ok: false, msg: 'The quest is published — sources are frozen for this version.' };
      const [x] = s.sources.splice(i, 1);
      audit('teacher', `Removed source ${x.id}.`);
      return { ok: true, msg: `Removed ${x.id}.` };
    },

    /* ----- real-world checkpoint: QR clue card or facilitator code ----- */
    checkIn(s, { participantId, code }) {
      const p = SEED.byId[participantId];
      if (!p) return { ok: false };
      if (!['EXPERT', 'PEER_TEACH', 'FINALE'].includes(s.phase))
        return { ok: false, msg: 'Stations open when the educator starts the expert phase.' };
      if (s.checkins[participantId]) return { ok: true, silent: true };
      const m = SEED.missions[p.topic];
      const c = String(code || '').trim().toUpperCase();
      const via = c === m.stationCode ? 'QR' : c === m.backupCode ? 'CODE' : null;
      if (!via) return { ok: false, msg: `That code isn’t for ${m.gallery}. Find the ${m.name} clue card.` };
      s.checkins[participantId] = { at: Date.now(), via };
      audit('student', `${p.name} checked in at ${m.gallery} (${via === 'QR' ? 'QR clue card' : 'facilitator code'}).`);
      return { ok: true, msg: `Checked in at ${m.gallery}. Phone away — observe first.` };
    },

    /* ----- joining: class code is checked by the device; the engine hands out the next Jigsaw seat ----- */
    joinClass(s, { nick }) {
      const n = String(nick || '').trim().replace(/\s+/g, ' ');
      if (n.length < 2 || n.length > 16) return { ok: false, msg: 'Pick a nickname of 2–16 characters (not your real name).' };
      if (Object.values(s.seats).some((x) => x.nick.toLowerCase() === n.toLowerCase())) return { ok: false, msg: 'That nickname is taken — try another.' };
      const p = SEED.participants.find((x) => !s.seats[x.id] && !s.evidence[x.id].simulated && s.evidence[x.id].status === 'AVAILABLE');
      if (!p) return { ok: false, msg: 'This class is full (20 explorers).' };
      s.seats[p.id] = { nick: n, at: Date.now() };
      audit('student', `${n} joined as ${p.name} (home ${p.home}, expert ${p.topic}).`);
      return { ok: true, msg: `Welcome, ${n}! You’re in home team ${p.home}, expert track ${p.topic}.`, pid: p.id };
    },

    /* ----- help: always one tap away ----- */
    requestHelp(s, { participantId }) {
      const p = SEED.byId[participantId];
      if (!p) return { ok: false };
      if (s.help.some((h) => h.pid === participantId && h.open)) return { ok: false, msg: 'Your teacher already has your request — stay where you are.' };
      s.help.unshift({ id: 'h' + Date.now().toString(36), pid: participantId, at: Date.now(), open: true });
      audit('student', `${p.name} asked for help.`);
      return { ok: true, msg: 'Your teacher has been told. Stay with your group.' };
    },
    resolveHelp(s, { id }) {
      const h = s.help.find((x) => x.id === id);
      if (!h || !h.open) return { ok: false };
      h.open = false;
      audit('teacher', `Help request from ${SEED.byId[h.pid].name} resolved.`);
      return { ok: true, silent: true };
    },

    /* ----- clearly labelled demo shortcut (SIMULATED) ----- */
    simulateClassmates(s) {
      let changed = 0;
      for (const p of SEED.participants) {
        if (p.id === s.ui.student || s.seats[p.id] || (s.checkins[p.id] && s.checkins[p.id].via !== 'SIMULATED')) continue;
        const ev = s.evidence[p.id];
        if (ev.status !== 'VERIFIED') {
          if (p.topic === 'D') s.interactions[p.id] = true;
          s.checkins[p.id] = s.checkins[p.id] || { at: Date.now(), via: 'SIMULATED' };
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
          const isActive = expert && (expert.id === s.ui.student || !!s.seats[expert.id]);
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

  /* UI-only actions are per device and never shared with other devices. */
  const UI_ACTIONS = new Set(['setRole', 'setStudent', 'setScreen', 'setLookUp', 'markMasterSeen']);
  let commitHook = null; // set by sync.js: called after a shared action succeeds locally

  function dispatch(type, payload = {}, opts = {}) {
    const action = actions[type];
    if (!action) return { ok: false, msg: 'Unknown action: ' + type };
    const result = action(state, payload) || { ok: true };
    if (result.ok) {
      emit({ type, payload, result });
      if (commitHook && !opts.replay && !UI_ACTIONS.has(type)) commitHook(type, payload, result);
    }
    return result;
  }

  /* ---------- shared-state hooks for live sync (sync.js) ---------- */
  function sharedState() {
    const { ui, ...rest } = state;
    return JSON.parse(JSON.stringify(rest));
  }
  function applyShared(shared) {
    const ui = state.ui;
    state = upgrade({ ...JSON.parse(JSON.stringify(shared)), ui });
    emit({ type: 'remote' });
  }
  function freshShared() {
    const { ui, ...rest } = freshState();
    return rest;
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  return {
    dispatch,
    subscribe,
    sharedState,
    applyShared,
    freshShared,
    onCommit: (fn) => { commitHook = fn; },
    sel,
    get state() {
      return state;
    },
  };
})();
