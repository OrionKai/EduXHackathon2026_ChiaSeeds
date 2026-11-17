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
  const QUEST_KEYS = ['quest', 'content', 'tracks', 'revisions', 'sources', 'contributor'];
  const PLAY_KEYS = ['phase', 'evidence', 'peerTeach', 'finale', 'bonus', 'claims', 'master', 'reflections', 'seats', 'checkins', 'checkinPhotos', 'help', 'partnerFeedback', 'interactions', 'experience', 'evolved'];
  const clone = (o) => JSON.parse(JSON.stringify(o));

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
        venue: 'The Fitzwilliam Museum, Cambridge',
        id: 'q_lm',
        templateId: 'lost_museum',
        partner: { ...SEED.partnerDefaults },
        next: { ...SEED.defaultNext(), enabled: true, activity: 'Still-life drawing class: draw a memorable object from the museum trip', provider: 'Riverside Art Studio', org: 'Example provider (simulated)',
          when: 'Thu 3 Dec, 2–3:30pm', bring: 'Your team’s finale answer and field notes', fallback: 'In-class drawing session with the art department' },
        draftGenerated: true,
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
      content: JSON.parse(JSON.stringify(TEMPLATES.lost_museum)), // the quest students play (see seed.js)
      library: {}, // questId -> { quest, content, tracks, revisions, sources, contributor }
      activeQuest: 'q_lm', // the quest this class session is running
      seats: {}, // participantId -> { nick, at } once a real student joins with the class code
      partnerFeedback: {}, // home -> { text, at } from the community collaborator on the team's finale
      checkins: {}, // participantId -> { at, via: 'QR' | 'CODE' | 'PHOTO_AI' | 'PHOTO_TEACHER' | 'SIMULATED' }
      checkinPhotos: {}, // participantId -> { photo, at, reason } waiting for the educator
      experience: { unlocked: false, reason: '', checkins: {} }, // the next real experience for this class run
      evolved: {}, // collectibleId -> true once its team checked in at the next experience
      help: [], // { id, pid, at, open }
      tracks: { A: 'TEMPLATE', B: 'TEMPLATE', C: 'TEMPLATE', D: 'TEMPLATE' }, // TEMPLATE | EMPTY | AI | REVISED | EDITED | APPROVED
      revisions: {}, // topic -> note from an AI revision
      trackEdits: {}, // topic -> { observe?, discuss?, narrative?, fallback?, teachHeadline?, hintsExtra?: [] } shown to students
      ui: { role: 'student', student: 'S06', screen: null, lookUp: false, joined: false, masterSeen: false, drafts: {} },
      log: [],
    };
  }

  /* ---------- persistence ---------- */

  let state = load();
  SEED.useContent(state.content);
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
    const f = freshState();
    snapInto(f);
    return f;
  }

  function seedSources() {
    return SEED.topics.map((t, i) => ({ id: 'S' + (i + 1), kind: 'official', title: SEED.missions[t].gallery + ' · official page', url: SEED.missions[t].sourceUrl, text: SEED.missions[t].sourceFact }))
      .concat([{ id: 'S' + (SEED.topics.length + 1), kind: 'partner', title: 'Community partner contribution', url: '', text: '' }]);
  }

  function upgrade(s) {
    s.sources = s.sources || seedSources();
    s.content = s.content || JSON.parse(JSON.stringify(TEMPLATES.lost_museum));
    s.library = s.library || {};
    s.activeQuest = s.activeQuest || 'q_lm';
    s.quest.id = s.quest.id || s.activeQuest;
    s.quest.templateId = s.quest.templateId || 'lost_museum';
    s.quest.partner = s.quest.partner || { ...SEED.partnerDefaults };
    if (!s.library[s.activeQuest]) snapInto(s);
    s.checkins = s.checkins || {};
    s.help = s.help || [];
    s.tracks = s.tracks || { A: 'AI', B: 'AI', C: 'AI', D: 'AI' };
    s.revisions = s.revisions || {};
    s.trackEdits = s.trackEdits || {};
    s.seats = s.seats || {};
    s.checkinPhotos = s.checkinPhotos || {};
    s.experience = s.experience || { unlocked: false, reason: '', checkins: {} };
    s.evolved = s.evolved || {};
    s.quest.next = { ...SEED.defaultNext(), ...(s.quest.next || {}) };
    (s.content.collectibles || []).forEach((c) => { if (!c.kind) Object.assign(c, SEED.defaultEarn()); });
    s.contributor.extraPrompts = s.contributor.extraPrompts || [];
    s.partnerFeedback = s.partnerFeedback || {};
    s.quest.duration = s.quest.duration || 60;
    s.quest.classSize = s.quest.classSize || 20;
    s.ui = s.ui || {};
    s.ui.drafts = s.ui.drafts || {};
    return s;
  }

  /* ---------- quest library ---------- */
  function snapInto(s) { s.library = s.library || {}; s.library[s.activeQuest] = clone(Object.fromEntries(QUEST_KEYS.map((k) => [k, s[k]]))); }
  function resetPlay(s) { const f = freshState(); PLAY_KEYS.forEach((k) => { s[k] = f[k]; }); }
  function loadQuest(s, id) {
    const r = s.library[id];
    QUEST_KEYS.forEach((k) => { s[k] = clone(r[k]); });
    s.activeQuest = id;
    SEED.useContent(s.content);
    resetPlay(s);
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* private mode: demo continues in memory */
    }
  }

  function emit(event) {
    SEED.useContent(state.content);
    persist();
    listeners.forEach((fn) => fn(state, event));
  }

  function audit(actor, text) {
    state.log.unshift({ at: Date.now(), actor, text });
    if (state.log.length > 120) state.log.length = 120;
  }

  /* ---------- selectors (read-only helpers) ---------- */

  const sel = {
    mission: (t) => SEED.missions[t],
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
        (p) => SEED.missions[p.topic].needsFacilitator && !state.interactions[p.id] && state.phase !== 'LOBBY'
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
      SEED.useContent(state.content);
      snapInto(state);
      audit('system', 'Demo reset to seeded state.');
      return { ok: true, msg: 'Demo reset.' };
    },

    /* ----- quest authoring (educator) ----- */
    updateQuest(s, { field, value }) {
      if (!['title', 'objective', 'venue', 'duration', 'classSize', 'safety'].includes(field)) return { ok: false };
      if (field === 'safety') { s.quest.safety = !!value; return { ok: true, silent: true }; }
      s.quest[field] = ['duration', 'classSize'].includes(field) ? Number(value) : value;
      if (field === 'title') s.content.title = value;
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
      const probs = SEED.contentProblems(s.content);
      if (probs.length) return { ok: false, msg: `Not ready yet (${probs.length} to do): ${probs[0]}.` };
      if (!s.quest.safety) return { ok: false, msg: 'Confirm the safety and supervision plan first.' };
      if (SEED.topics.some((t) => s.tracks[t] !== 'APPROVED'))
        return { ok: false, msg: 'Approve all four AI-drafted expert tracks first — nothing reaches students unapproved.' };
      s.quest.status = 'PUBLISHED';
      audit('teacher', 'Published quest (DEMO_ONLY — simulation notice shown).');
      return { ok: true, msg: 'Quest published as a demo-only adventure.' };
    },

    /* ----- collaborator ----- */
    saveContribution(s, { text, questId }) {
      if (questId && questId !== s.activeQuest) {
        const r = s.library[questId]; if (!r) return { ok: false };
        const t = String(text || '').trim(); if (!t) return { ok: false, msg: 'The contribution cannot be empty.' };
        r.contributor.text = t; r.contributor.status = 'PENDING';
        return { ok: true, msg: 'Contribution saved.' };
      }
      const trimmed = (text || '').trim();
      if (!trimmed) return { ok: false, msg: 'The contribution cannot be empty.' };
      s.contributor.text = trimmed;
      audit('collaborator', 'Edited learning contribution.');
      return { ok: true, msg: 'Contribution saved.' };
    },
    approveContribution(s, { questId } = {}) {
      if (questId && questId !== s.activeQuest) {
        const r = s.library[questId]; if (!r) return { ok: false };
        if (!r.contributor.text) return { ok: false, msg: 'Write your contribution first.' };
        r.contributor.status = 'APPROVED';
        audit('collaborator', `Approved their contribution to “${r.quest.title}”.`);
        return { ok: true, msg: 'Contribution approved for that quest.' };
      }
      if (s.contributor.status === 'APPROVED') return { ok: false, msg: 'Already approved.' };
      s.contributor.status = 'APPROVED';
      audit('collaborator', 'Approved community contribution (simulated contributor).');
      return { ok: true, msg: 'Contribution approved. The educator can now publish.' };
    },
    verifyInteraction(s, { participantId }) {
      const p = SEED.byId[participantId];
      if (!p || !SEED.missions[p.topic].needsFacilitator) return { ok: false, msg: 'This track has no arranged conversation.' };
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
      return { ok: true, msg: 'Question added — students in the conversation track will see it.' };
    },
    partnerFeedback(s, { home, text }) {
      const f = s.finale[home];
      if (!f || !['SUBMITTED', 'APPROVED'].includes(f.status)) return { ok: false, msg: 'This team has not submitted its introduction yet.' };
      const t = String(text || '').trim();
      if (t.length < 8) return { ok: false, msg: 'Write a sentence or two of feedback.' };
      s.partnerFeedback[home] = { text: t, at: Date.now() };
      audit('collaborator', `Gave feedback on team ${home}’s finale answer.`);
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
    submitEvidence(s, { participantId, answers, photo, quiz }) {
      const p = SEED.byId[participantId];
      if (!p) return { ok: false };
      if (!['EXPERT', 'PEER_TEACH', 'FINALE'].includes(s.phase))
        return { ok: false, msg: 'Evidence opens when the educator starts the expert phase.' };
      const ev = s.evidence[participantId];
      if (ev.status === 'VERIFIED') return { ok: false, msg: 'This evidence is already verified.' };
      const mission = SEED.missions[p.topic];
      const as = mission.assess || SEED.defaultAssess();
      answers = answers || {};
      for (const f of (as.evidence === 'photo' ? [] : mission.evidenceFields)) {
        if (!answers[f.key] || !String(answers[f.key]).trim())
          return { ok: false, msg: `Please fill in “${f.label}” before submitting.` };
      }
      if (as.checkin !== 'none' && !s.checkins[participantId])
        return { ok: false, msg: 'Check in at your location first: scan the QR clue card there (or type the station code).' };
      if (as.evidence !== 'notes' && !(typeof photo === 'string' && photo.startsWith('data:image/')))
        return { ok: false, msg: 'Add a photo of the object (not of people).' };
      if (photo && photo.length > 90000) return { ok: false, msg: 'That photo is too large — try again.' };
      let score = null;
      if ((as.quiz || []).length) {
        score = as.quiz.filter((q, i) => quiz && Number(quiz[i]) === q.a).length;
        if (score < (as.pass || 0)) return { ok: false, msg: `You got ${score} of ${as.quiz.length} — you need ${as.pass}. Look again at the object and retry.` };
      }
      if (mission.needsFacilitator && !s.interactions[participantId])
        return {
          ok: false,
          msg: 'Your arranged contributor conversation has not been verified yet — ask the facilitator to confirm it first.',
        };
      ev.answers = answers;
      ev.photo = as.evidence !== 'notes' ? photo : null;
      ev.quiz = score === null ? null : { score, total: as.quiz.length };
      ev.note = '';
      if (as.verify === 'auto') {
        ev.status = 'VERIFIED';
        audit('student', `${p.name} passed the ${mission.name} check (${score}/${as.quiz.length}) — verified automatically.`);
        return { ok: true, msg: `Passed ${score}/${as.quiz.length} — evidence verified.` };
      }
      ev.status = 'SUBMITTED';
      audit('student', `${p.name} submitted ${mission.name} evidence.`);
      return { ok: true, msg: as.verify === 'partner' ? 'Evidence submitted — the community partner will review it.' : 'Evidence submitted — awaiting educator review.' };
    },

    reviewEvidence(s, { participantId, verdict, note, reviewer }) {
      const p = SEED.byId[participantId];
      const ev = s.evidence[participantId];
      if (!p || ev.status !== 'SUBMITTED') return { ok: false, msg: 'Nothing to review.' };
      const mission = SEED.missions[p.topic];
      const allowed = reviewer === 'teacher' || (reviewer === 'collaborator' && (mission.needsFacilitator || (mission.assess && mission.assess.verify === 'partner')));
      if (!allowed) return { ok: false, msg: 'Only the educator (or the approved facilitator) can verify this.' };
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
      if (!chosen) return { ok: false, msg: 'Choose a statement in panel 2.' };
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
      audit('student', `${home} submitted their finale answer.`);
      return { ok: true, msg: 'Submitted — your educator will review it.' };
    },

    reviewFinale(s, { home, approve, rubric, note }) {
      const f = s.finale[home];
      if (f.status !== 'SUBMITTED') return { ok: false, msg: 'Nothing to review for this team.' };
      if (approve) {
        if (!rubric || SEED.finale.rubric.some((r) => !rubric[r]))
          return { ok: false, msg: 'Tick all four rubric items to approve.' };
        f.status = 'APPROVED';
        f.rubric = rubric;
        audit('teacher', `Approved ${home}’s finale answer.`);
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
      if (card.kind && card.kind !== 'bonus') return { ok: false, msg: 'This card is earned another way.' };
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

    awardCollectible(s, { collectibleId }) {
      const card = SEED.collectibles.find((c) => c.id === collectibleId);
      if (!card) return { ok: false };
      if (s.claims[collectibleId]) return { ok: false, msg: 'Already claimed.' };
      return claim(s, card, 'teacher', 'awarded by the educator');
    },
    foundEgg(s, { participantId }) {
      const p = SEED.byId[participantId];
      if (!p || !['EXPERT', 'PEER_TEACH', 'FINALE'].includes(s.phase)) return { ok: false };
      const card = SEED.collectibles.find((c) => c.home === p.home && c.kind === 'egg');
      if (!card || s.claims[card.id]) return { ok: false };
      return claim(s, card, 'student', `${p.name} looked up and found it`);
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
      return claim(s, card, 'teacher', 'bonus discovery approved');
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
      const m = s.content.missions[topic];
      for (const k of ['observe', 'discuss', 'narrative', 'fallback', 'teachHeadline']) if (patch && typeof patch[k] === 'string' && patch[k].trim()) m[k] = patch[k].trim().slice(0, 600);
      if (patch && typeof patch.hint === 'string' && patch.hint.trim()) m.hints = [...m.hints, patch.hint.trim().slice(0, 300)].slice(-5);
      if (patch && patch.assess && typeof patch.assess === 'object') m.assess = { ...SEED.defaultAssess(), ...(m.assess || {}), ...patch.assess };
      s.tracks[topic] = by === 'educator' ? 'EDITED' : 'REVISED';
      s.revisions[topic] = [s.revisions[topic], note].filter(Boolean).join(' · ').slice(-500);
      audit('teacher', `AI revised track ${topic} on request (simulated AI) — needs approval again.`);
      return { ok: true, silent: true };
    },
    approveTrack(s, { topic }) {
      if (!s.quest.draftGenerated) return { ok: false, msg: 'Draft the quest first.' };
      const tp = SEED.contentProblems(s.content).filter((x) => x.startsWith(`Track ${topic}:`));
      if (tp.length) return { ok: false, msg: `Track ${topic} isn’t complete: ${tp[0].split(': ')[1]}.` };
      if (s.tracks[topic] === 'APPROVED') return { ok: false, msg: 'Already approved.' };
      s.tracks[topic] = 'APPROVED';
      audit('teacher', `Approved AI-drafted track ${topic} (${SEED.topicMeta[topic].name}).`);
      return { ok: true, msg: `Track ${topic} approved.` };
    },

    /* ----- quest library (educator) ----- */
    createQuest(s, { template, title }) {
      if (s.phase !== 'LOBBY') return { ok: false, msg: 'End the live session first (Live session → back to the lobby).' };
      const tpl = TEMPLATES[template] ? template : 'blank';
      snapInto(s);
      const id = 'q' + Date.now().toString(36);
      const content = clone(TEMPLATES[tpl]);
      const t = String(title || '').trim() || (tpl === 'blank' ? 'Untitled quest' : content.title);
      content.title = t;
      s.quest = { id, title: t, objective: tpl === 'lost_museum' ? 'Interpret evidence from multiple perspectives' : '', venue: tpl === 'lost_museum' ? 'The Fitzwilliam Museum, Cambridge' : '',
        duration: 60, classSize: 20, status: 'DRAFT', draftGenerated: true, safety: false, templateId: tpl, partner: { ...SEED.partnerDefaults }, next: SEED.defaultNext() };
      s.content = content;
      s.tracks = Object.fromEntries(SEED.topics.map((x) => [x, tpl === 'blank' ? 'EMPTY' : 'TEMPLATE']));
      s.revisions = {};
      s.sources = tpl === 'lost_museum' ? seedSources() : seedSources().filter((x) => x.kind === 'partner').map((x) => ({ ...x, id: 'S1' }));
      s.contributor = { text: '', status: 'PENDING', interactionPrompt: 0, extraPrompts: [] };
      s.activeQuest = id;
      SEED.useContent(s.content);
      resetPlay(s);
      audit('teacher', `Created quest “${t}” (${tpl === 'blank' ? 'blank' : 'from template ' + content.meta.name}).`);
      return { ok: true, msg: `Created “${t}”.`, id };
    },
    openQuest(s, { id }) {
      if (id === s.activeQuest) return { ok: true, silent: true };
      if (!s.library[id]) return { ok: false, msg: 'Quest not found.' };
      if (s.phase !== 'LOBBY') return { ok: false, msg: 'End the live session first (Live session → back to the lobby).' };
      snapInto(s);
      loadQuest(s, id);
      audit('teacher', `Opened quest “${s.quest.title}” for this class.`);
      return { ok: true, msg: `This class is now set to “${s.quest.title}”.` };
    },
    deleteQuest(s, { id }) {
      if (id === s.activeQuest) return { ok: false, msg: 'Open another quest before deleting this one.' };
      if (!s.library[id]) return { ok: false };
      const t = s.library[id].quest.title;
      delete s.library[id];
      audit('teacher', `Deleted quest “${t}”.`);
      return { ok: true, msg: `Deleted “${t}”.` };
    },
    setPartner(s, { questId, name, org }) {
      const q = !questId || questId === s.activeQuest ? s.quest : s.library[questId] && s.library[questId].quest;
      if (!q) return { ok: false };
      const n = String(name || '').trim(), o = String(org || '').trim();
      if (n.length < 2) return { ok: false, msg: 'Add the partner’s name.' };
      q.partner = { name: n.slice(0, 60), org: o.slice(0, 80) };
      return { ok: true, msg: 'Partner details saved.' };
    },

    /* ----- authoring the quest content (educator; AI proposals land here too) ----- */
    setContent(s, { content }) {
      if (s.quest.status === 'PUBLISHED') return { ok: false, msg: 'Published quests are frozen — create a new quest to change it.' };
      if (!content || !content.missions || !SEED.topics.every((t) => content.missions[t])) return { ok: false, msg: 'The draft was incomplete.' };
      s.content = content;
      if (content.title) s.quest.title = content.title;
      SEED.useContent(s.content);
      SEED.syncFinaleObjects(s.content);
      s.tracks = Object.fromEntries(SEED.topics.map((t) => [t, 'AI']));
      s.revisions = {};
      audit('teacher', 'AI drafted the quest from the approved sources — awaiting the educator’s review.');
      return { ok: true, msg: 'Draft ready — review each part before publishing.' };
    },
    editTrack(s, { topic, fields }) {
      if (s.quest.status === 'PUBLISHED') return { ok: false, msg: 'Published quests are frozen — create a new quest to change it.' };
      if (!SEED.topics.includes(topic)) return { ok: false };
      const b = SEED.buildTrack(topic, fields || {});
      s.content.missions[topic] = b.mission;
      s.content.topicMeta[topic] = { ...s.content.topicMeta[topic], name: fields.name || 'Track ' + topic, label: b.label };
      s.content.peerTeaching.checkOptions[topic] = b.check;
      SEED.syncFinaleObjects(s.content);
      s.tracks[topic] = 'EDITED';
      audit('teacher', `Edited track ${topic}.`);
      return { ok: true, msg: `Track ${topic} saved — approve it when you’re happy.` };
    },
    editFinale(s, { fields }) {
      if (s.quest.status === 'PUBLISHED') return { ok: false, msg: 'Published quests are frozen.' };
      SEED.buildFinale(s.content, fields || {});
      audit('teacher', 'Edited the finale.');
      return { ok: true, msg: 'Finale saved.' };
    },
    editExtras(s, { opening, collectibles, reflection }) {
      if (s.quest.status === 'PUBLISHED') return { ok: false, msg: 'Published quests are frozen.' };
      if (typeof opening === 'string') s.content.story = { ...s.content.story, opening: opening.trim() };
      if (Array.isArray(collectibles)) s.content.collectibles = s.content.collectibles.map((c, i) => ({ ...c, ...(collectibles[i] || {}) }));
      if (Array.isArray(reflection)) s.content.reflection = reflection.map((q) => String(q || '').trim());
      audit('teacher', 'Edited the story, collectibles and reflection.');
      return { ok: true, msg: 'Saved.' };
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
      if (m.assess && m.assess.checkin === 'none') return { ok: true, silent: true };
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

    /* ----- photo check-in: AI match, or the educator approves the photo ----- */
    checkInPhoto(s, { participantId, photo, ai }) {
      const p = SEED.byId[participantId];
      if (!p) return { ok: false };
      if (!['EXPERT', 'PEER_TEACH', 'FINALE'].includes(s.phase)) return { ok: false, msg: 'Check-in opens when the educator starts the expert phase.' };
      if (s.checkins[participantId]) return { ok: true, silent: true };
      const a = SEED.missions[p.topic].assess || SEED.defaultAssess();
      if (!String(a.checkin).startsWith('photo')) return { ok: false, msg: 'This track doesn’t use a photo check-in.' };
      if (ai && ai.people_visible) return { ok: false, msg: 'Please photograph just the object, with no people in the picture.' };
      if (a.checkin === 'photo_ai' && ai && ai.match) {
        s.checkins[participantId] = { at: Date.now(), via: 'PHOTO_AI' };
        delete s.checkinPhotos[participantId];
        audit('student', `${p.name} checked in with a photo (AI match, ${ai.confidence || 'n/a'} confidence).`);
        return { ok: true, msg: 'Found it! Now look closely — phone away.' };
      }
      if (a.checkin === 'photo_ai' && ai && !ai.match) return { ok: false, msg: ai.reason || 'That doesn’t look like the object. Try again, or ask your teacher.' };
      if (!(typeof photo === 'string' && photo.startsWith('data:image/')) || photo.length > 90000) return { ok: false, msg: 'Take the photo again.' };
      s.checkinPhotos[participantId] = { photo, at: Date.now(), reason: ai ? ai.reason || '' : '' };
      audit('student', `${p.name} sent a check-in photo for the educator to approve.`);
      return { ok: true, msg: 'Photo sent — your teacher will confirm it.' };
    },
    reviewCheckin(s, { participantId, approve }) {
      const p = SEED.byId[participantId];
      if (!p || !s.checkinPhotos[participantId]) return { ok: false, msg: 'Nothing to review.' };
      delete s.checkinPhotos[participantId];
      if (approve) {
        s.checkins[participantId] = { at: Date.now(), via: 'PHOTO_TEACHER' };
        audit('teacher', `Approved ${p.name}’s check-in photo.`);
        return { ok: true, msg: `${p.name} checked in.` };
      }
      audit('teacher', `Asked ${p.name} to retake their check-in photo.`);
      return { ok: true, msg: `${p.name} will retake the photo.` };
    },

    /* ----- collectibles (educator) ----- */
    editCollectible(s, { collectibleId, fields }) {
      if (s.quest.status === 'PUBLISHED') return { ok: false, msg: 'Published quests are frozen.' };
      const c = s.content.collectibles.find((x) => x.id === collectibleId);
      if (!c) return { ok: false };
      const f = fields || {};
      ['title', 'activity', 'fact'].forEach((k) => { if (typeof f[k] === 'string') c[k] = f[k].trim().slice(0, 200); });
      if (SEED.EARN_TEXT[f.kind]) c.kind = f.kind;
      if (SEED.topics.includes(f.track)) c.track = f.track;
      if (typeof f.hidden === 'boolean') c.hidden = f.hidden;
      if (typeof f.evolves === 'boolean') c.evolves = f.evolves;
      audit('teacher', `Edited collectible “${c.title || c.id}”.`);
      return { ok: true, msg: 'Collectible saved.' };
    },
    setAssess(s, { topic, patch }) {
      if (s.quest.status === 'PUBLISHED') return { ok: false, msg: 'Published quests are frozen.' };
      const m = s.content.missions[topic];
      if (!m) return { ok: false };
      m.assess = { ...SEED.defaultAssess(), ...(m.assess || {}), ...(patch || {}) };
      if (patch && typeof patch.partner === 'boolean') { m.needsFacilitator = patch.partner; delete m.assess.partner; }
      if (m.assess.verify === 'auto' && !(m.assess.quiz || []).length) m.assess.verify = 'teacher';
      s.tracks[topic] = s.tracks[topic] === 'EMPTY' ? 'EMPTY' : 'EDITED';
      return { ok: true, silent: true };
    },

    /* ----- the next real experience: booking, unlock, check-in ----- */
    setNext(s, { fields }) {
      const n = (s.quest.next = { ...SEED.defaultNext(), ...(s.quest.next || {}) });
      const f = fields || {};
      ['activity', 'provider', 'org', 'when', 'bring', 'fallback'].forEach((k) => { if (typeof f[k] === 'string') n[k] = f[k].trim().slice(0, 300); });
      if (typeof f.enabled === 'boolean') n.enabled = f.enabled;
      if (['all', 'manual'].includes(f.unlock)) n.unlock = f.unlock;
      return { ok: true, msg: 'Next experience saved.' };
    },
    sendBooking(s, { text }) {
      const n = s.quest.next;
      if (!n || !n.enabled || !n.activity || !n.provider) return { ok: false, msg: 'Add the activity and provider first.' };
      const t = String(text || '').trim();
      if (t.length < 20) return { ok: false, msg: 'Write the request first.' };
      n.request = t.slice(0, 2000); n.status = 'sent';
      audit('teacher', `Sent a booking request to ${n.provider}.`);
      return { ok: true, msg: 'Request sent (from your school email in the full product).' };
    },
    providerReply(s, { accept, when }) {
      const n = s.quest.next;
      if (!n || n.status !== 'sent') return { ok: false };
      if (accept) { n.status = 'accepted'; audit('system', `${n.provider} accepted the booking (simulated provider).`); return { ok: true, msg: `${n.provider} accepted — booked.` }; }
      n.status = 'counter'; n.counterWhen = String(when || 'another date').slice(0, 120);
      audit('system', `${n.provider} suggested ${n.counterWhen} (simulated provider).`);
      return { ok: true, msg: `${n.provider} suggested another date.` };
    },
    acceptCounter(s) {
      const n = s.quest.next;
      if (!n || n.status !== 'counter') return { ok: false };
      n.when = n.counterWhen; n.status = 'accepted';
      audit('teacher', `Accepted the new date: ${n.when}.`);
      return { ok: true, msg: `Booked for ${n.when}.` };
    },
    unlockExperience(s, { reason }) {
      const n = s.quest.next;
      if (!n || !n.enabled) return { ok: false };
      if (n.status !== 'accepted') return { ok: false, msg: 'Confirm the booking with the provider first.' };
      if (s.experience.unlocked) return { ok: false, msg: 'Already unlocked.' };
      const r = String(reason || '').trim();
      if (n.unlock === 'all' && !allFinished(s) && r.length < 3) return { ok: false, msg: 'Not every team has finished — add a reason to unlock early.' };
      s.experience.unlocked = true; s.experience.reason = r;
      audit('teacher', `Unlocked the next experience${r ? ' early: ' + r : ''}.`);
      return { ok: true, msg: 'Next experience unlocked for the class.' };
    },
    experienceCheckIn(s, { participantId, code, byTeacher }) {
      const p = SEED.byId[participantId];
      if (!p || !s.experience.unlocked) return { ok: false, msg: 'The next experience isn’t unlocked yet.' };
      if (!byTeacher && String(code || '').trim().toUpperCase() !== 'WQ-NEXT-' + String(s.activeQuest).toUpperCase()) return { ok: false, msg: 'That isn’t the check-in code for this experience.' };
      if (s.experience.checkins[participantId]) return { ok: true, silent: true };
      s.experience.checkins[participantId] = Date.now();
      const card = SEED.collectibles.find((c) => c.home === p.home);
      let evolved = false;
      if (card && card.evolves && s.claims[card.id] && !s.evolved[card.id]) { s.evolved[card.id] = true; evolved = true; }
      audit(byTeacher ? 'teacher' : 'student', `${p.name} checked in at the next experience${evolved ? ' — ' + card.title + ' levelled up' : ''}.`);
      return { ok: true, msg: evolved ? `Checked in — your team’s ${card.title} levelled up!` : 'Checked in. Enjoy!' };
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
          ev.quiz = mission.assess && mission.assess.quiz && mission.assess.quiz.length ? { score: mission.assess.quiz.length, total: mission.assess.quiz.length } : null;
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

  /* ---------- collectibles: one claim path, used by approvals and automatic rules ---------- */
  function claim(s, card, actor, why) {
    s.claims[card.id] = { home: card.home, at: Date.now() };
    if (s.bonus[card.id]) s.bonus[card.id].status = 'CLAIMED';
    audit(actor, `${card.title || 'Collectible'} claimed for ${card.home} (${why}).`);
    let masterNow = false;
    if (!s.master && SEED.collectibles.every((c) => s.claims[c.id])) {
      s.master = { at: Date.now() };
      masterNow = true;
      audit('system', `${SEED.master.title} unlocked for the class (exactly once).`);
    }
    return { ok: true, msg: `${card.title || 'A card'} added to the class album!`, reveal: card.id, master: masterNow };
  }
  const allFinished = (s) => SEED.homeGroups.every((h) => s.finale[h].status === 'APPROVED');
  function autoRules(s) {
    SEED.collectibles.forEach((c) => {
      if (s.claims[c.id]) return;
      const team = SEED.homeMembers(c.home);
      const met = c.kind === 'finale' ? s.finale[c.home].status === 'APPROVED'
        : c.kind === 'experts' ? team.every((p) => s.evidence[p.id].status === 'VERIFIED')
        : c.kind === 'track' ? (() => { const p = SEED.expertOf(c.home, c.track); return p && s.evidence[p.id].status === 'VERIFIED'; })()
        : false;
      if (met) claim(s, c, 'system', SEED.EARN_TEXT[c.kind].toLowerCase());
    });
    const n = s.quest.next;
    if (n && n.enabled && n.unlock === 'all' && n.status === 'accepted' && !s.experience.unlocked && allFinished(s)) {
      s.experience.unlocked = true;
      audit('system', 'Every team finished — the next experience unlocked.');
    }
  }

  /* UI-only actions are per device and never shared with other devices. */
  const UI_ACTIONS = new Set(['setRole', 'setStudent', 'setScreen', 'setLookUp', 'markMasterSeen']);
  let commitHook = null; // set by sync.js: called after a shared action succeeds locally

  function dispatch(type, payload = {}, opts = {}) {
    const action = actions[type];
    if (!action) return { ok: false, msg: 'Unknown action: ' + type };
    const result = action(state, payload) || { ok: true };
    if (result.ok) {
      if (!UI_ACTIONS.has(type)) autoRules(state);
      if (!UI_ACTIONS.has(type) && state.library) snapInto(state);
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
