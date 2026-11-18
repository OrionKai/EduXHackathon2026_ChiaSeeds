/* WorldQuest prototype_2 — authoritative demo game engine.
 * Pure state + guarded actions. The UI may only mutate state through Engine.dispatch,
 * which enforces the Jigsaw rules: evidence must be VERIFIED by the educator (or the
 * community partner where a track needs one), the finale stays LOCKED until every
 * perspectives are verified AND shared, collectible claims are idempotent, and the
 * Guardian of Stories master award is granted exactly once.
 *
 * This is a single-browser demo adapter (localStorage persistence), standing in for
 * the server-side logic described in WORLDQUEST_MVP_PRD.md. It does not demonstrate
 * multi-user production security.
 */
'use strict';

const Engine = (() => {
  /* Each class code is its own class: its own saved state on this device (and its own row when live). */
  const SESSION = (new URLSearchParams(location.search).get('session') || 'FITZ-DEMO').toUpperCase();
  const STORAGE_KEY = 'worldquest-prototype2-v1' + (SESSION === 'FITZ-DEMO' ? '' : ':' + SESSION);
  const NEW_CLASS_KEY = (code) => 'wq-newclass:' + code;
  const QUEST_KEYS = ['quest', 'content', 'tracks', 'revisions', 'sources', 'contributor'];
  const PLAY_KEYS = ['phase', 'evidence', 'peerTeach', 'finale', 'bonus', 'claims', 'master', 'reflections', 'seats', 'checkins', 'checkinPhotos', 'help', 'partnerFeedback', 'interactions', 'experience', 'evolved', 'misses', 'analysis', 'partnerFlags', 'earned'];
  const clone = (o) => JSON.parse(JSON.stringify(o));
  let classState = null, studioState = null, state = null, space = 'class'; // set up below

  /* ---------- initial state ---------- */

  /* Fresh/reset state is always the example quest: its groups and its content, never the last quest's. */
  function useDefaults() { SEED.useStructure(SEED.defaultStructure()); SEED.useContent(null); }
  /* A valid Jigsaw shape, or the reason it isn't. */
  function structureProblem(t, n, g) {
    if (!(t >= 1 && t <= 6)) return 'Choose 1 to 6 tracks.';
    if (!(n >= Math.max(t, 2) && n <= 60)) return `Class size must be between ${Math.max(t, 2)} and 60.`;
    const teams = Math.ceil(n / t), last = n - (teams - 1) * t;
    if (t >= 2 && last === 1) return `With ${n} students the last home team would have just one student, who couldn’t be taught. Try ${n - 1} or ${n + 1}.`;
    if (!(g >= 1)) return 'Expert groups need at least 1 student.';
    return '';
  }
  /* ---------- the class journey: an ordered programme of quests, real experiences and classroom sessions ---------- */
  const STEP_TYPES = ['quest', 'experience', 'class'];
  let stepSeq = 0;
  function newStep(s, type) {
    const st = { id: 'j' + Date.now().toString(36) + (stepSeq++), type, title: '', when: '', where: '', opens: 'after', date: '', opened: false, reason: '', done: false, checkins: {}, note: '' };
    if (type === 'quest') st.questId = s.activeQuest;
    if (type === 'experience') st.exp = { activity: '', provider: '', org: '', email: '', bring: '', fallback: '', staff: '2', status: 'none', request: '', counterWhen: '' };
    return st;
  }
  function defaultJourney(s) {
    const n = { ...SEED.defaultNext(), ...((s.quest && s.quest.next) || {}) };
    const q = { ...newStep(s, 'quest'), id: 'j1', opens: 'start' };
    const x = { ...newStep(s, 'experience'), id: 'j2', title: n.activity, when: n.when, where: n.org,
      whenDate: n.whenDate || '', whenTime: n.whenTime || '',
      exp: { activity: n.activity, provider: n.provider, org: n.org, email: n.email || '', bring: n.bring, fallback: n.fallback, staff: n.staff || '2', status: n.status || 'none', request: n.request || '', counterWhen: n.counterWhen || '' } };
    const c = { ...newStep(s, 'class'), id: 'j3', title: 'Back in class: debrief', note: 'Use the Report’s “Misconceptions to address” to plan it.' };
    return { steps: n.enabled === false && !n.activity ? [q, c] : [q, x, c] };
  }
  const todayISO = () => new Date().toISOString().slice(0, 10);
  function stepTitle(s, st) {
    if (!st) return '';
    if (st.type === 'quest') { const lib = (x) => x && (st.questId === x.activeQuest ? x.quest : x.library && x.library[st.questId] && x.library[st.questId].quest); const r = lib(s) || (studioState && lib(studioState)); return r ? r.title || 'Untitled quest' : 'Choose a quest'; }
    if (st.type === 'experience') return st.title || st.exp.activity || 'Real experience';
    return st.title || 'Classroom session';
  }
  /* done | open | waiting (experience not booked yet) | locked, with the reason students and teachers see */
  /* A class can have several journeys; `s.journey` is the class's current one (the one students follow). */
  const jById = (s, jid) => (jid && s.journeys && s.journeys.find((j) => j.id === jid)) || s.journey;
  const jOf = (s, stepId) => (s.journeys || [s.journey]).find((j) => j.steps.some((x) => x.id === stepId)) || s.journey;
  function ensureJourneys(s) {
    if (!Array.isArray(s.journeys) || !s.journeys.length) {
      const d = Object.getOwnPropertyDescriptor(s, 'journey'), old = d && d.value && Array.isArray(d.value.steps) && d.value.steps.length ? d.value : defaultJourney(s);
      s.journeys = [{ id: 'jr1', name: 'Main journey', steps: old.steps }];
    }
    s.journeys.forEach((j) => { j.name = j.name || 'Journey'; j.steps = Array.isArray(j.steps) ? j.steps : []; });
    if (!s.journeys.some((j) => j.id === s.journeyId)) s.journeyId = s.journeys[0].id;
    delete s.journey;
    Object.defineProperty(s, 'journey', { get() { return this.journeys.find((j) => j.id === this.journeyId) || this.journeys[0]; }, configurable: true, enumerable: false });
    s.catalog = s.catalog || {};
    return s;
  }
  /* The reward cards of a quest the class will run (so students' album can show what's still to find). */
  function catalogQuest(s, id) {
    const snap = typeof questSnapshot === 'function' && studioState ? questSnapshot(id) : null;
    if (!snap) return;
    s.catalog = s.catalog || {};
    s.catalog[id] = { title: snap.quest.title || 'Untitled quest', cards: (snap.content.collectibles || []).map((c) => ({ id: c.id, title: c.title, kind: c.kind, hidden: !!c.hidden, art: c.art || '', image: c.image || null })) };
  }
  /* The step the class is on: the first step of its journey that isn't done. */
  function nowOf(s) {
    const j = s.journey, i = j.steps.findIndex((x) => !x.done);
    return { journey: j, index: i, step: i >= 0 ? j.steps[i] : null, state: i >= 0 ? stepState(s, i, j.id) : null };
  }
  /* Keep the running quest in line with the journey: when the class's current step is a quest, the class runs it.
     Only between sessions (lobby, or a finished session) — never in the middle of one. */
  function alignRun(s) {
    if (s !== classState || !studioState) return '';
    const n = nowOf(s);
    if (!n.step || n.step.type !== 'quest' || n.step.questId === s.activeQuest) return '';
    if (!['LOBBY', 'COMPLETE'].includes(s.phase)) return '';
    const snap = questSnapshot(n.step.questId);
    if (!snap) return '';
    runInto(s, n.step.questId, snap);
    return `The class is now on “${s.quest.title || 'Untitled quest'}”.`;
  }
  function stepState(s, i, jid) {
    const steps = jById(s, jid).steps, st = steps[i];
    if (!st) return { state: 'locked', why: '' };
    if (st.done) return { state: 'done', why: '' };
    const prev = steps[i - 1];
    let open = i === 0 || st.opens === 'start', why = '';
    if (!open && st.opens === 'after') { open = !!(prev && prev.done); why = prev ? `Opens when “${stepTitle(s, prev)}” is done` : ''; }
    if (!open && st.opens === 'manual') why = 'Opens when the teacher opens it';
    if (!open && st.opens === 'date') { open = !!st.date && st.date <= todayISO(); why = st.date ? `Opens on ${st.date}` : 'Opens on a date (not set yet)'; }
    if (st.opened) open = true;
    if (open && st.type === 'experience' && st.exp.status !== 'accepted') return { state: 'waiting', why: 'Waiting for the booking to be confirmed' };
    return open ? { state: 'open', why: st.opened && st.reason ? 'Opened early: ' + st.reason : '' } : { state: 'locked', why };
  }
  const findStep = (s, id) => ((s.journeys || [s.journey]).flatMap((j) => j.steps).find((x) => x.id === id) || null);
  const firstExperience = (s) => s.journey.steps.find((x) => x.type === 'experience') || null;

  /* ---------- community partner: structured contribution, review of how they're represented, sign-off ---------- */
  function normContributor(c) {
    c = c || {};
    if (!['INVITED', 'CONTRIBUTED', 'APPROVED'].includes(c.status)) c.status = c.text ? 'CONTRIBUTED' : 'INVITED';
    c.avoid = c.avoid || ''; c.credit = c.credit || 'name'; c.availability = c.availability || '';
    c.reviews = c.reviews || {}; c.requests = c.requests || [];
    return c;
  }
  const recOf = (s, qid) => (!qid || qid === s.activeQuest ? s : s.library[qid]);
  /* What the partner reviews: the tracks with a partner conversation (or all tracks if none), the story and the finale. */
  function partnerItems(rec) {
    const n = Number((rec.quest.structure || {}).tracks);
    const letters = Object.keys(rec.content.missions).sort().slice(0, Number.isFinite(n) ? Math.max(1, n) : undefined).filter((t) => rec.content.missions[t]);
    const withPartner = letters.filter((t) => rec.content.missions[t].needsFacilitator);
    return [...(withPartner.length ? withPartner : letters).map((t) => 'track:' + t), 'story', 'finale'];
  }
  function partnerProgress(rec) {
    const c = rec.contributor, items = partnerItems(rec);
    const reviewed = items.filter((i) => c.reviews[i] === 'ok').length, open = c.requests.filter((r) => r.status === 'open').length;
    return { items, reviewed, open, contributed: c.status !== 'INVITED' && !!c.text, signedOff: c.status === 'APPROVED' };
  }

  /* Build a quest from a template and make it the class's active quest. */
  function makeQuest(s, { template, title, structure, id: fixedId, quiet }) {
    if (s.phase !== 'LOBBY') return { ok: false, msg: 'End the live session first (Live session → back to the lobby).' };
    const tpl = TEMPLATES[template] ? template : 'blank';
    snapInto(s);
    const qd = TEMPLATES[tpl].questDefaults || {};
    const st = { ...SEED.defaultStructure(), ...(qd.structure || {}), ...(structure || {}) };
    st.tracks = Number(st.tracks); st.classSize = Number(st.classSize); st.expertGroup = Number(st.expertGroup);
    st.expertGroup = Math.max(1, Math.min(st.expertGroup, Math.ceil(st.classSize / st.tracks))); // can't be bigger than the experts per track
    const bad = structureProblem(st.tracks, st.classSize, st.expertGroup);
    if (bad) return { ok: false, msg: bad };
    const id = fixedId || 'q' + Date.now().toString(36);
    SEED.useStructure(st);
    const content = clone(TEMPLATES[tpl]);
    SEED.useContent(content);
    const t = String(title || '').trim() || (tpl === 'blank' ? 'Untitled quest' : content.title);
    content.title = t;
    s.quest = { id, title: t, objective: qd.objective || '', venue: qd.venue || '',
      duration: qd.duration || '', classSize: 20, status: 'DRAFT', draftGenerated: true, safety: false, templateId: tpl, partner: { ...SEED.partnerDefaults }, next: { ...SEED.defaultNext(), ...(qd.next || {}) }, structure: st, audience: qd.audience ? { ...qd.audience } : { kind: '', ages: '' } };
    SEED.ensureContentShape(content);
    Object.keys(content.missions).forEach((k) => { if (!SEED.topics.includes(k)) delete content.missions[k]; });
    Object.values(content.missions).forEach((m) => { m.backupCode = SEED.newBackupCode(); });
    s.quest.classSize = st.classSize;
    s.content = content;
    s.tracks = Object.fromEntries(SEED.topics.map((x) => [x, tpl === 'blank' || !content.missions[x].name ? 'EMPTY' : 'TEMPLATE']));
    s.revisions = {};
    s.sources = TEMPLATES[tpl].sources ? clone(TEMPLATES[tpl].sources) : tpl === 'lost_museum' ? seedSources() : seedSources().filter((x) => x.kind === 'partner').map((x) => ({ ...x, id: 'S1' }));
    s.contributor = normContributor({ text: tpl !== 'blank' ? SEED.contributor.defaultContribution : '', status: tpl !== 'blank' ? 'CONTRIBUTED' : 'INVITED', interactionPrompt: 0, extraPrompts: [], prompts: [...SEED.contributor.prompts] });
    s.activeQuest = id;
    SEED.useStructure(s.quest.structure); SEED.useContent(s.content);
    resetPlay(s);
    if (!quiet) audit('teacher', `Created quest “${t}” (${tpl === 'blank' ? 'blank' : 'from template ' + content.meta.name}).`);
    return { ok: true, msg: `Created “${t}”.`, id };
  }
  function freshDemo() {
    useDefaults();
    const f = freshState();
    syncRoster(f);
    snapInto(f);
    makeQuest(f, { template: 'two_explorers', id: 'q_eg', quiet: true });
    snapInto(f);
    f.journey = defaultJourney(f); ensureJourneys(f);
    f.className = 'Demo class';
    return f;
  }
  /* Wrong picks are kept (counts only) so the educator can see common misconceptions. */
  const miss = (s, key) => { s.misses = s.misses || {}; s.misses[key] = (s.misses[key] || 0) + 1; };
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
        answers: {}, // stepId -> { pick, done, tries } for multiple choice, { text } for a team answer
        note: '',
        rubric: null,
        simulated: false,
      };
    }
    const bonus = {}; // `${cardId}@${home}` -> a team's bonus activity submission
    return {
      v: 1,
      phase: 'LOBBY',
      quest: {
        status: 'PARTNER_REVIEW', // DRAFT | PARTNER_REVIEW | APPROVED | PUBLISHED
        title: SEED.title,
        objective: TEMPLATES.lost_museum.questDefaults.objective,
        duration: 60,
        classSize: 20,
        venue: 'The Fitzwilliam Museum, Cambridge',
        id: 'q_lm',
        templateId: 'lost_museum',
        partner: { ...SEED.partnerDefaults },
        structure: SEED.defaultStructure(),
        audience: SEED.defaultAudience(),
        next: { ...SEED.defaultNext(), ...TEMPLATES.lost_museum.questDefaults.next },
        draftGenerated: true,
      },
      contributor: normContributor({
        text: SEED.contributor.defaultContribution,
        status: 'CONTRIBUTED', // INVITED | CONTRIBUTED | APPROVED (signed off)
        interactionPrompt: 0,
      }),
      partnerFlags: {}, // participantId -> { note, open } when the partner says a student misquoted them
      interactions: {}, // participantId -> true once facilitator verifies (Expert D)
      evidence,
      peerTeach,
      finale,
      bonus,
      claims: {}, // cardId -> { holder, at }: the class album (a card is “found” the first time anyone earns it)
      earned: {}, // `${cardId}@${studentId or teamId}` -> { at }: who has each card
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
      tracks: Object.fromEntries(SEED.topics.map((t) => [t, 'TEMPLATE'])), // TEMPLATE | EMPTY | AI | REVISED | EDITED | APPROVED
      revisions: {}, // topic -> note from an AI revision
      trackEdits: {}, // topic -> { observe?, discuss?, narrative?, fallback?, teachHeadline?, hintsExtra?: [] } shown to students
      ui: { role: 'student', student: 'S06', screen: null, lookUp: false, joined: false, masterSeen: false, drafts: {} },
      log: [],
    };
  }

  /* ---------- persistence ---------- */

  /* Two workspaces. The class (this class code) runs a copy of one quest; the studio is the teacher's quest
     library, shared by all their classes, where quests are written and edited. Editing never touches a class
     until the teacher runs (or updates) the quest there. */
  classState = load();
  SEED.useStructure(classState.quest.structure); SEED.useContent(classState.content);
  studioState = loadStudio(classState);
  studioState.ui = classState.ui; // one set of screen settings for the device
  state = classState; space = 'class';
  SEED.useStructure(state.quest.structure); SEED.useContent(state.content);
  function useSpace(sp) {
    space = sp === 'studio' ? 'studio' : 'class';
    state = space === 'studio' ? studioState : classState;
    SEED.useStructure(state.quest.structure); SEED.useContent(state.content);
  }
  function inSpace(sp, fn) { const back = space; useSpace(sp); try { return fn(); } finally { useSpace(back); } }
  function studioKey(c) { return 'worldquest-studio-v1:' + ((c && c.studio) || 'DEMO'); }
  function loadStudio(c) {
    try { const raw = localStorage.getItem(studioKey(c)); if (raw) { const p = JSON.parse(raw); if (p && p.v === 1) { SEED.useStructure(p.quest.structure); SEED.useContent(p.content); const u = upgrade(p); SEED.useStructure(c.quest.structure); SEED.useContent(c.content); return u; } } } catch (e) { console.warn('[studio] could not load the saved quests:', e); }
    return studioFrom(c);
  }
  /* First time on this device: the studio starts from the quests this class already has. */
  function studioFrom(c) {
    const s = clone({ ...c, ui: {} }); snapInto(s);
    const f = freshState(); PLAY_KEYS.forEach((k) => { if (f[k] !== undefined) s[k] = clone(f[k]); }); syncRoster(s);
    s.phase = 'LOBBY';
    return s;
  }
  /* A copy of one quest from the studio, as a class runs it. */
  function questSnapshot(id) {
    const s = studioState;
    if (id === s.activeQuest) return clone(Object.fromEntries(QUEST_KEYS.map((k) => [k, s[k]])));
    return s.library[id] ? clone(s.library[id]) : null;
  }
  /* Has the studio's version of the quest this class runs changed since the class got its copy? */
  function runOutdated() {
    const snap = questSnapshot(classState.activeQuest);
    if (!snap) return false;
    return ['quest', 'content', 'tracks', 'sources'].some((k) => JSON.stringify(snap[k]) !== JSON.stringify(classState[k]));
  }
  const listeners = new Set();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.v === 1) return upgrade(parsed);
      }
      const made = localStorage.getItem(NEW_CLASS_KEY(SESSION)); // a class just created on this device
      if (made) { localStorage.setItem(STORAGE_KEY, made); localStorage.removeItem(NEW_CLASS_KEY(SESSION)); const parsed = JSON.parse(made); if (parsed && parsed.v === 1) return upgrade(parsed); }
    } catch (e) {
      /* corrupted or unavailable storage -> fresh demo */
    }
    return freshDemo();
  }

  function seedSources() {
    const T = TEMPLATES.lost_museum.missions, keys = Object.keys(T);
    return keys.map((t, i) => ({ id: 'S' + (i + 1), kind: 'official', title: T[t].gallery + ' · official page', url: T[t].sourceUrl, text: T[t].sourceFact }))
      .concat([{ id: 'S' + (keys.length + 1), kind: 'partner', title: 'Community partner contribution', url: '', text: '' }]);
  }

  function upgrade(s) {
    s.quest.structure = { ...SEED.defaultStructure(), ...(s.quest.structure || {}) };
    s.quest.audience = { ...SEED.defaultAudience(), ...(s.quest.audience || {}) };
    SEED.useStructure(s.quest.structure);
    if (s.content) SEED.useContent(s.content);
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
    s.tracks = s.tracks || {};
    SEED.topics.forEach((t) => { if (!s.tracks[t]) s.tracks[t] = 'EMPTY'; });
    s.revisions = s.revisions || {};
    /* self-heal: play data must match the quest's groups (e.g. a state saved under a different structure) */
    if (SEED.participants.some((p) => !s.evidence || !s.evidence[p.id]) || SEED.homeGroups.some((h) => !s.finale || !s.finale[h] || !s.peerTeach || !s.peerTeach[h] || SEED.topicsFor(h).some((t) => !s.peerTeach[h][t]))) resetPlay(s);
    syncRoster(s);
    s.trackEdits = s.trackEdits || {};
    s.seats = s.seats || {};
    s.checkinPhotos = s.checkinPhotos || {};
    s.experience = s.experience || { unlocked: false, reason: '', checkins: {} };
    s.evolved = s.evolved || {};
    s.misses = s.misses || {};
    if (s.content) SEED.migrateFinale(s.content);
    Object.values(s.library || {}).forEach((r) => r.content && SEED.migrateFinale(r.content));
    Object.values(s.finale || {}).forEach((f) => { f.answers = f.answers || {}; });
    s.bonus = s.bonus || {};
    s.earned = s.earned || {};
    Object.entries(s.claims || {}).forEach(([id, c]) => { if (c && c.home && !s.earned[id + '@' + c.home]) s.earned[id + '@' + c.home] = { at: c.at || Date.now() }; });
    Object.keys(s.bonus).forEach((k) => { if (!k.includes('@')) { const c = (s.content.collectibles || []).find((x) => x.id === k); if (c && c.home) s.bonus[k + '@' + c.home] = s.bonus[k]; delete s.bonus[k]; } });
    s.analysis = s.analysis || {};
    s.quest.next = { ...SEED.defaultNext(), ...(s.quest.next || {}) };
    ensureJourneys(s);
    (s.content.collectibles || []).forEach((c) => { if (!c.kind) Object.assign(c, SEED.defaultEarn()); });
    normContributor(s.contributor);
    Object.values(s.library || {}).forEach((r) => r.contributor && normContributor(r.contributor));
    s.partnerFlags = s.partnerFlags || {};
    s.contributor.extraPrompts = s.contributor.extraPrompts || [];
    s.contributor.prompts = s.contributor.prompts || [...SEED.contributor.prompts, ...s.contributor.extraPrompts];
    s.partnerFeedback = s.partnerFeedback || {};
    s.quest.duration = s.quest.duration || 60;
    s.quest.classSize = s.quest.classSize || 20;
    s.ui = s.ui || {};
    s.ui.drafts = s.ui.drafts || {};
    s.pastAlbums = s.pastAlbums || [];
    s.className = typeof s.className === 'string' ? s.className : '';
    s.studio = typeof s.studio === 'string' && s.studio ? s.studio : 'DEMO';
    return s;
  }

  /* Load a copy of a quest into the class (keeps seats when it's the same quest with the same teams). */
  function runInto(s, id, snapshot) {
    const same = id === s.activeQuest && JSON.stringify(snapshot.quest.structure) === JSON.stringify(s.quest.structure);
    const seats = same ? clone(s.seats) : null;
    if (!same) archiveAlbum(s);
    s.library = s.library || {}; s.library[id] = clone(snapshot);
    loadQuest(s, id); catalogQuest(s, id);
    if (seats) s.seats = seats;
    audit('teacher', same ? `Updated the class to the latest “${s.quest.title}”.` : `The class is now on “${s.quest.title}”.`);
    return same;
  }
  /* ---------- quest library ---------- */
  /* The class album outlives a quest: before the class switches, keep the cards it found. */
  function archiveAlbum(s) {
    const cards = SEED.collectibles.filter((c) => s.claims[c.id]).map((c) => ({ id: c.id, title: c.title, fact: c.fact || '', scope: cardScope(c), art: SEED.collectibles.indexOf(c), artKey: c.art || '', image: c.image || null,
      got: holdersOf(c).filter((h) => s.earned[c.id + '@' + (h.id || h)]).length, total: holdersOf(c).length }));
    if (!cards.length && !s.master) return;
    s.pastAlbums = (s.pastAlbums || []).filter((x) => x.questId !== s.activeQuest);
    s.pastAlbums.unshift({ questId: s.activeQuest, title: s.quest.title || 'Untitled quest', at: Date.now(), cards, master: s.master ? SEED.master.title : '' });
  }
  function snapInto(s) { s.library = s.library || {}; s.library[s.activeQuest] = clone(Object.fromEntries(QUEST_KEYS.map((k) => [k, s[k]]))); }
  function resetPlay(s) {
    const f = freshState(); PLAY_KEYS.forEach((k) => { s[k] = f[k]; }); syncRoster(s);
    if (s.ui && !SEED.byId[s.ui.student]) s.ui.student = SEED.participants[0].id;
  }
  /* The seat list, kept in the shared state so the database guard can check it. */
  function syncRoster(s) { s.roster = SEED.participants.map((p) => [p.id, p.home, p.topic]); }
  function loadQuest(s, id) {
    const r = s.library[id];
    QUEST_KEYS.forEach((k) => { s[k] = clone(r[k]); });
    s.activeQuest = id;
    SEED.useStructure(s.quest.structure); SEED.useContent(s.content);
    resetPlay(s);
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(classState));
      localStorage.setItem(studioKey(classState), JSON.stringify(studioState));
    } catch (e) {
      /* private mode: demo continues in memory */
    }
  }

  function emit(event) {
    SEED.useStructure(state.quest.structure); SEED.useContent(state.content);
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
      for (const t of SEED.topicsFor(h)) {
        const expert = SEED.expertOf(h, t);
        out[t] = expert ? state.evidence[expert.id].status === 'VERIFIED' : false;
      }
      return out;
    },

    homeShared(h) {
      const out = {};
      for (const t of SEED.topicsFor(h)) out[t] = state.peerTeach[h][t].shared;
      return out;
    },

    finaleUnlocked(h) {
      const v = sel.homeVerified(h);
      const s = sel.homeShared(h);
      return SEED.topicsFor(h).every((t) => v[t] && s[t]);
    },

    finaleLockReasons(h) {
      const v = sel.homeVerified(h);
      const s = sel.homeShared(h);
      const reasons = [];
      for (const t of SEED.topicsFor(h)) {
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

    stepState: (i, jid) => stepState(state, i, jid),
    journeyById: (jid) => jById(state, jid),
    nowStep: () => nowOf(state),
    partnerItems: (qid) => partnerItems(recOf(state, qid)),
    partnerProgress: (qid) => partnerProgress(recOf(state, qid)),
    stepTitle: (st) => stepTitle(state, st),
    pendingBonus: () => Object.entries(state.bonus).filter(([, b]) => b && b.status === 'SUBMITTED').map(([k, b]) => { const [id, home] = k.split('@'); return { card: SEED.collectibles.find((c) => c.id === id), home, b }; }).filter((x) => x.card),
    /* Cards: personal (a student's track badge, a hidden find) or team (finale, every expert done, bonus, awarded). */
    cardScope: (c) => cardScope(c),
    holdersOf: (c) => holdersOf(c),
    hasCard: (c, holder) => !!state.earned[c.id + '@' + holder],
    earnedBy: (c) => holdersOf(c).filter((h) => state.earned[c.id + '@' + (h.id || h)]).length,
    bonusOf: (c, home) => state.bonus[c.id + '@' + home] || { status: 'AVAILABLE', answer: '' },

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

    runQuest(s, { id, snapshot }) {
      if (!snapshot || !snapshot.quest || !snapshot.content) return { ok: false, msg: 'Quest not found.' };
      if (!['LOBBY', 'COMPLETE'].includes(s.phase)) return { ok: false, msg: 'End the live session first (Live session → back to the lobby).' };
      const same = runInto(s, id, snapshot);
      return { ok: true, reset: true, msg: same ? 'Updated to the latest version.' : `The class is now on “${s.quest.title || 'Untitled quest'}”.` };
    },
    addJourney(s, { name }) {
      const n = String(name || '').trim().slice(0, 60);
      if (!n) return { ok: false, msg: 'Give the journey a name.' };
      const j = { id: 'jr' + Date.now().toString(36), name: n, steps: [] };
      s.journeys.push(j);
      audit('teacher', `Created the journey “${n}”.`);
      return { ok: true, msg: `Journey “${n}” created.`, id: j.id };
    },
    renameJourney(s, { id, name }) {
      const j = s.journeys.find((x) => x.id === id), n = String(name || '').trim().slice(0, 60);
      if (!j || !n) return { ok: false, msg: 'Give the journey a name.' };
      j.name = n; return { ok: true, msg: 'Journey renamed.' };
    },
    removeJourney(s, { id }) {
      if (s.journeys.length <= 1) return { ok: false, msg: 'A class keeps at least one journey.' };
      const i = s.journeys.findIndex((x) => x.id === id);
      if (i < 0) return { ok: false };
      const [gone] = s.journeys.splice(i, 1);
      if (s.journeyId === id) s.journeyId = s.journeys[0].id;
      audit('teacher', `Removed the journey “${gone.name}”.`);
      return { ok: true, msg: `Removed “${gone.name}”.` };
    },
    startNow(s) {
      const m = alignRun(s);
      return m ? { ok: true, reset: true, msg: m } : { ok: false, msg: 'Nothing to start right now.' };
    },
    useJourney(s, { id }) {
      if (!s.journeys.some((x) => x.id === id)) return { ok: false };
      if (s.journeyId === id) return { ok: true, silent: true };
      if (!['LOBBY', 'COMPLETE'].includes(s.phase)) return { ok: false, msg: 'End the live session first (Live session → back to the lobby).' };
      s.journeyId = id;
      return { ok: true, msg: 'The class is now on this journey.' };
    },
    renameClass(s, { name }) {
      const n = String(name || '').trim().slice(0, 60);
      if (!n) return { ok: false, msg: 'Give the class a name.' };
      s.className = n;
      return { ok: true, msg: 'Class renamed.' };
    },
    resetDemo() {
      const ui = classState.ui;
      classState = freshDemo(); classState.ui = ui; snapInto(classState);
      studioState = studioFrom(classState); studioState.ui = ui;
      state = space === 'studio' ? studioState : classState;
      SEED.useStructure(state.quest.structure); SEED.useContent(state.content);
      audit('system', 'Demo reset to seeded state.');
      return { ok: true, msg: 'Demo reset.' };
    },

    /* ----- quest authoring (educator) ----- */
    updateQuest(s, { field, value }) {
      if (field === 'audience' || field === 'ages') { s.quest.audience = { ...SEED.defaultAudience(), ...(s.quest.audience || {}), [field === 'audience' ? 'kind' : 'ages']: String(value || '').slice(0, 40) }; return { ok: true, silent: true }; }
      if (!['title', 'objective', 'venue', 'duration', 'classSize', 'safety'].includes(field)) return { ok: false };
      if (field === 'safety') { s.quest.safety = !!value; return { ok: true, silent: true }; }
      s.quest[field] = ['duration', 'classSize'].includes(field) ? Number(value) : value;
      if (field === 'title') s.content.title = value;
      return { ok: true, silent: true };
    },
    generateDraft(s) {
      s.quest.draftGenerated = true;
      s.tracks = Object.fromEntries(SEED.topics.map((t) => [t, 'AI']));
      s.revisions = {};
      s.trackEdits = {};
      audit('teacher', 'Generated quest draft (Seeded demo — no API key used).');
      return { ok: true, msg: 'Seeded demo draft ready — no AI key was used.' };
    },
    publishQuest(s) {
      if (s.contributor.status !== 'APPROVED')
        return { ok: false, msg: 'Your community partner hasn’t signed off yet (they review how their community is represented).' };
      if (s.quest.status === 'PUBLISHED') return { ok: false, msg: 'Already published.' };
      if (!s.quest.draftGenerated) return { ok: false, msg: 'Draft the quest first.' };
      const probs = SEED.contentProblems(s.content);
      if (probs.length) return { ok: false, msg: `Not ready yet (${probs.length} to do): ${probs[0]}.` };
      if (!s.quest.safety) return { ok: false, msg: 'Confirm the safety and supervision plan first.' };
      if (SEED.topics.length < 2) return { ok: false, msg: 'Add at least 2 tracks so students can teach each other.' };
      if (SEED.topics.some((t) => s.tracks[t] !== 'APPROVED'))
        return { ok: false, msg: 'Approve every expert track first — nothing reaches students unapproved.' };
      s.quest.status = 'PUBLISHED';
      audit('teacher', 'Published quest (DEMO_ONLY — simulation notice shown).');
      return { ok: true, msg: 'Quest published as a demo-only adventure.' };
    },

    /* ----- collaborator ----- */
    saveContribution(s, { questId, text, avoid, credit, availability, name, org }) {
      const rec = recOf(s, questId); if (!rec) return { ok: false };
      if (rec.quest.status === 'PUBLISHED') return { ok: false, msg: 'This quest is published — ask the educator before changing your contribution.' };
      const c = rec.contributor, t = String(text == null ? c.text : text).trim();
      if (!t) return { ok: false, msg: 'Tell students what they can learn from you first.' };
      c.text = t.slice(0, 1500);
      if (typeof avoid === 'string') c.avoid = avoid.trim().slice(0, 800);
      if (['name', 'org', 'anonymous'].includes(credit)) c.credit = credit;
      if (typeof availability === 'string') c.availability = availability.trim().slice(0, 200);
      if (typeof name === 'string' && name.trim()) rec.quest.partner.name = name.trim().slice(0, 80);
      if (typeof org === 'string') rec.quest.partner.org = org.trim().slice(0, 120);
      const was = c.status;
      if (was !== 'APPROVED') c.status = 'CONTRIBUTED'; // your sign-off is about how the quest represents you; editing your own words keeps it
      audit('collaborator', `Saved their contribution to “${rec.quest.title}”.`);
      return { ok: true, msg: was === 'APPROVED' ? 'Saved. Your sign-off still stands.' : 'Contribution saved. Next: review the quest.' };
    },
    reviewItem(s, { questId, item }) {
      const rec = recOf(s, questId); if (!rec || !partnerItems(rec).includes(item)) return { ok: false };
      if (rec.contributor.requests.some((r) => r.item === item && r.status === 'open')) return { ok: false, msg: 'Wait for the educator to answer your suggestion first.' };
      rec.contributor.reviews[item] = 'ok';
      return { ok: true, silent: true };
    },
    requestChange(s, { questId, item, text }) {
      const rec = recOf(s, questId); if (!rec || !partnerItems(rec).includes(item)) return { ok: false };
      const t = String(text || '').trim();
      if (t.length < 5) return { ok: false, msg: 'Say what should change, in a sentence.' };
      const c = rec.contributor;
      c.requests.push({ id: 'r' + Date.now().toString(36) + c.requests.length, item, text: t.slice(0, 800), status: 'open', reply: '', at: Date.now() });
      c.reviews[item] = 'change';
      if (c.status === 'APPROVED') c.status = 'CONTRIBUTED';
      audit('collaborator', `Suggested a change to ${item.replace('track:', 'track ')} in “${rec.quest.title}”.`);
      return { ok: true, msg: 'Suggestion sent to the educator.' };
    },
    answerRequest(s, { questId, id, accept, reply }) {
      const rec = recOf(s, questId); if (!rec) return { ok: false };
      const r = rec.contributor.requests.find((x) => x.id === id);
      if (!r || r.status !== 'open') return { ok: false };
      const t = String(reply || '').trim();
      if (!accept && t.length < 3) return { ok: false, msg: 'Write a short reply to the partner.' };
      r.status = accept ? 'accepted' : 'replied'; r.reply = t || 'Thanks — I’ve made that change.';
      delete rec.contributor.reviews[r.item]; // the partner looks again
      audit('teacher', `${accept ? 'Accepted' : 'Replied to'} the partner’s suggestion on ${r.item.replace('track:', 'track ')}.`);
      return { ok: true, msg: accept ? 'Marked as changed — your partner will check it again.' : 'Reply sent to your partner.' };
    },
    approveContribution(s, { questId } = {}) {
      const rec = recOf(s, questId); if (!rec) return { ok: false };
      const c = rec.contributor, p = partnerProgress(rec);
      if (c.status === 'APPROVED') return { ok: false, msg: 'Already signed off.' };
      if (!p.contributed) return { ok: false, msg: 'Write your contribution first.' };
      if (p.open) return { ok: false, msg: 'Wait for the educator to answer your suggestions first.' };
      if (p.reviewed < p.items.length) return { ok: false, msg: `Review every part first (${p.items.length - p.reviewed} left).` };
      c.status = 'APPROVED';
      audit('collaborator', `Signed off “${rec.quest.title}”.`);
      return { ok: true, msg: 'Signed off. The educator can now publish.' };
    },
    flagParaphrase(s, { participantId, note }) {
      const p = SEED.byId[participantId]; if (!p) return { ok: false };
      const t = String(note || '').trim();
      if (t.length < 3) return { ok: false, msg: 'Say briefly what’s not right.' };
      s.partnerFlags[participantId] = { note: t.slice(0, 400), open: true, at: Date.now() };
      audit('collaborator', `Flagged how ${p.name} recorded their words.`);
      return { ok: true, msg: 'Flag sent to the educator.' };
    },
    resolveFlag(s, { participantId, ask }) {
      const f = s.partnerFlags[participantId], p = SEED.byId[participantId];
      if (!f || !f.open || !p) return { ok: false };
      f.open = false;
      const ev = s.evidence[participantId];
      if (ask && ev && ['SUBMITTED', 'VERIFIED'].includes(ev.status)) { ev.status = 'NEEDS_REVISION'; ev.note = 'Your community partner says: ' + f.note; }
      audit('teacher', ask ? `Asked ${p.name} to fix how they recorded the partner’s words.` : `Dismissed the partner’s flag on ${p.name}.`);
      return { ok: true, msg: ask ? 'The student will see the partner’s note and revise.' : 'Flag dismissed.' };
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
      s.contributor.prompts = s.contributor.prompts || [...SEED.contributor.prompts];
      s.contributor.prompts.push(t);
      s.contributor.interactionPrompt = s.contributor.prompts.length - 1;
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
    setPartnerPrompts(s, { prompts }) {
      const list = (Array.isArray(prompts) ? prompts : []).map((x) => String(x || '').trim()).filter(Boolean).map((x) => x.slice(0, 300));
      if (!list.length) return { ok: false, msg: 'Keep at least one question.' };
      s.contributor.prompts = list;
      s.contributor.interactionPrompt = Math.min(s.contributor.interactionPrompt || 0, list.length - 1);
      audit('collaborator', `Updated their conversation questions (${list.length}).`);
      return { ok: true, msg: 'Questions saved.' };
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
        as.quiz.forEach((q, i) => { if (quiz && quiz[i] != null && quiz[i] !== '' && Number(quiz[i]) !== q.a) miss(s, `quiz:${p.topic}:${i}:${Number(quiz[i])}`); });
        if (score < (as.pass || 0)) return { ok: false, commit: true, msg: `You got ${score} of ${as.quiz.length} — you need ${as.pass}. Look again at the object and retry.` };
      }
      if (mission.needsFacilitator && !s.interactions[participantId])
        return {
          ok: false,
          msg: 'Your arranged conversation with the community partner has not been verified yet — ask the community partner to confirm it first.',
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
      if (!allowed) return { ok: false, msg: 'Only the educator (or the community partner) can verify this.' };
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
    /* Educator-only: store an analysis of one track's written answers (AI or scripted). */
    setAnalysis(s, { topic, result }) {
      if (!SEED.topics.includes(topic) || !result || !Array.isArray(result.themes)) return { ok: false };
      s.ui.analysis = s.ui.analysis || {};
      s.ui.analysis[s.activeQuest + ':' + topic] = result;
      audit('teacher', `Analysed ${SEED.topicMeta[topic].name} answers (${result.by === 'ai' ? 'AI suggestion' : 'scripted'}).`);
      return { ok: true, msg: result.themes.length ? `${result.themes.length} possible misconception${result.themes.length > 1 ? 's' : ''} found — check before acting.` : 'No clear misconceptions found.' };
    },
    /* The expert has explained their part; the check now appears on teammates' own phones. */
    askTeachCheck(s, { home, topic, by }) {
      if (!['PEER_TEACH', 'FINALE'].includes(s.phase)) return { ok: false, msg: 'Peer teaching opens when the educator starts that phase.' };
      const cell = s.peerTeach[home] && s.peerTeach[home][topic];
      const expert = SEED.expertOf(home, topic);
      if (!cell || !expert) return { ok: false };
      if (by && by !== expert.id) return { ok: false, msg: 'Only the expert can send their check.' };
      if (cell.shared) return { ok: false, msg: 'Already shared.' };
      if (s.evidence[expert.id].status !== 'VERIFIED') return { ok: false, msg: 'Your evidence must be verified first.' };
      cell.asking = true;
      audit('student', `${expert.name} explained ${SEED.topicMeta[topic].name} and sent the check to home team ${home}.`);
      return { ok: true, msg: 'Check sent — a teammate answers it on their own phone.' };
    },
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
      if (!opt.correct) {
        miss(s, `teach:${topic}:${answerId}`);
        return { ok: false, commit: true, msg: 'Not quite — ask the expert to explain that part again, then try another answer.' };
      }
      cell.shared = true;
      cell.presenter = expert.id;
      cell.checker = checkerId;
      cell.answerId = answerId;
      audit('student', `${expert.name} taught ${SEED.topicMeta[topic].name} to ${home}; ${checker.name} passed the check.`);
      maybeUnlockFinale(s, home);
      return { ok: true, msg: `${SEED.topicMeta[topic].name} shared with the team!` };
    },

    /* ----- finale ----- */
    /* Multiple-choice step: the team picks an answer; a wrong pick is counted (misconceptions) and they try again. */
    finaleChoice(s, { home, stepId, optionId }) {
      const f = s.finale[home], step = (SEED.finale.steps || []).find((x) => x.id === stepId && x.type === 'choice');
      if (!f || !step) return { ok: false };
      if (!sel.finaleUnlocked(home)) return { ok: false, msg: 'The finale is still locked.' };
      if (['SUBMITTED', 'APPROVED'].includes(f.status)) return { ok: false, msg: 'Already sent to your teacher.' };
      const opt = step.options.find((o) => o.id === optionId);
      if (!opt) return { ok: false };
      const a = f.answers[stepId] = { ...(f.answers[stepId] || {}), tries: ((f.answers[stepId] || {}).tries || 0) + 1 };
      if (f.status === 'LOCKED') f.status = 'AVAILABLE';
      if (!opt.correct) { miss(s, `fchoice:${stepId}:${optionId}`); return { ok: false, commit: true, msg: 'Not quite — talk it over and try again.' }; }
      a.pick = optionId; a.done = true;
      return { ok: true, msg: 'Yes! That’s right.' };
    },
    /* Team answer step: saved as they write (any teammate's phone). */
    finaleWrite(s, { home, stepId, text }) {
      const f = s.finale[home], step = (SEED.finale.steps || []).find((x) => x.id === stepId && x.type === 'write');
      if (!f || !step || ['SUBMITTED', 'APPROVED'].includes(f.status)) return { ok: false };
      f.answers[stepId] = { text: String(text || '').slice(0, 2000) };
      return { ok: true, silent: true };
    },
    submitFinale(s, { home }) {
      const f = s.finale[home];
      if (!sel.finaleUnlocked(home))
        return { ok: false, msg: 'The finale is locked: every expert must be checked and have taught the team first.' };
      if (['SUBMITTED', 'APPROVED'].includes(f.status)) return { ok: false, msg: 'Already sent.' };
      const steps = SEED.finale.steps || [];
      const open = steps.findIndex((x) => (x.type === 'choice' ? !(f.answers[x.id] || {}).done : String((f.answers[x.id] || {}).text || '').trim().length < 10));
      if (open >= 0) return { ok: false, msg: `Finish step ${open + 1} first.` };
      f.status = 'SUBMITTED';
      audit('student', `Team ${home} sent their finale.`);
      return { ok: true, msg: 'Sent — your teacher will check it.' };
    },

    reviewFinale(s, { home, approve, rubric, note }) {
      const f = s.finale[home];
      if (f.status !== 'SUBMITTED') return { ok: false, msg: 'Nothing to review for this team.' };
      if (approve) {
        if (SEED.finaleChecks(s.content).some((c) => !(rubric || {})[c.key]))
          return { ok: false, msg: 'Tick everything a good answer includes before approving — or send it back with a note.' };
        f.status = 'APPROVED';
        f.rubric = rubric;
        audit('teacher', `Approved ${home}’s finale answer.`);
        return { ok: true, msg: `Team ${home}’s answer approved — main quest complete for that team.` };
      }
      f.status = 'NEEDS_REVISION';
      f.note = note || 'Have another look at your answer — check it includes everything on the list.';
      audit('teacher', `Sent team ${home}’s finale back with a note.`);
      return { ok: true, msg: `Sent back to team ${home} with a note.` };
    },

    /* ----- optional collectibles (never gate the main quest) ----- */
    submitBonus(s, { collectibleId, home, answer }) {
      const card = SEED.collectibles.find((c) => c.id === collectibleId);
      if (!card || !SEED.homeGroups.includes(home)) return { ok: false };
      if (card.kind !== 'bonus') return { ok: false, msg: 'This card is earned another way.' };
      if (s.earned[card.id + '@' + home]) return { ok: false, msg: 'Your team already has this card.' };
      const k = card.id + '@' + home, b = s.bonus[k] || { status: 'AVAILABLE', answer: '', simulated: false };
      if (b.status === 'SUBMITTED') return { ok: false, msg: 'Already sent — waiting for your teacher.' };
      if (!answer || !answer.trim()) return { ok: false, msg: 'Write your team’s answer first.' };
      if (!['FINALE', 'REFLECTION', 'COMPLETE'].includes(s.phase)) return { ok: false, msg: 'Bonus activities open at the finale — the main quest comes first.' };
      s.bonus[k] = { ...b, answer: answer.trim(), status: 'SUBMITTED' };
      audit('student', `Team ${home} sent the “${card.title}” bonus activity.`);
      return { ok: true, msg: 'Sent — your teacher will check it.' };
    },
    awardCollectible(s, { collectibleId, home }) {
      const card = SEED.collectibles.find((c) => c.id === collectibleId);
      if (!card || !SEED.homeGroups.includes(home)) return { ok: false, msg: 'Choose a team.' };
      if (s.earned[card.id + '@' + home]) return { ok: false, msg: 'That team already has it.' };
      return claim(s, card, home, 'teacher', 'awarded by the teacher');
    },
    foundEgg(s, { participantId }) {
      const p = SEED.byId[participantId];
      if (!p || !['EXPERT', 'PEER_TEACH', 'FINALE'].includes(s.phase)) return { ok: false };
      const card = SEED.collectibles.find((c) => c.kind === 'egg' && !s.earned[c.id + '@' + p.id]);
      if (!card) return { ok: false };
      return claim(s, card, p.id, 'student', `${p.name} looked up and found it`);
    },
    approveBonus(s, { collectibleId, home }) {
      const card = SEED.collectibles.find((c) => c.id === collectibleId);
      const k = collectibleId + '@' + home, b = s.bonus[k];
      if (!card || !b) return { ok: false };
      if (s.earned[k]) return { ok: false, msg: 'Already earned — approving twice never double-awards.' };
      if (b.status !== 'SUBMITTED') return { ok: false, msg: 'Nothing sent to approve.' };
      b.status = 'CLAIMED';
      return claim(s, card, home, 'teacher', 'bonus activity approved');
    },

    markMasterSeen(s) {
      s.ui.masterSeen = true;
      return { ok: true, silent: true };
    },

    /* ----- reflection ----- */
    submitReflection(s, { participantId, answers }) {
      if (!['REFLECTION', 'COMPLETE'].includes(s.phase))
        return { ok: false, msg: 'Reflection opens at the end of the session.' };
      if (!Array.isArray(answers) || SEED.reflection.some((q, i) => !String(answers[i] || '').trim()))
        return { ok: false, msg: 'Answer every reflection question.' };
      s.reflections[participantId] = answers.map((a) => a.trim());
      audit('student', `${SEED.byId[participantId].name} submitted a reflection.`);
      return { ok: true, msg: 'Reflection saved — now look up and join the discussion!' };
    },

    /* ----- AI draft review (educator approves each track) ----- */
    reviseTrack(s, { topic, note, patch, by }) {
      if (!s.quest.draftGenerated) return { ok: false, msg: 'Draft the quest first.' };
      if (s.quest.status === 'PUBLISHED') return { ok: false, msg: 'Already published — edits would disrupt a live session.' };
      if (!SEED.topics.includes(topic)) return { ok: false };
      if (patch && patch.fields) {
        const b = SEED.buildTrack(topic, patch.fields);
        s.content.missions[topic] = b.mission;
        s.content.topicMeta[topic] = { ...s.content.topicMeta[topic], name: patch.fields.name || 'Track ' + topic, label: b.label };
        s.content.peerTeaching.checkOptions[topic] = b.check;
        SEED.syncFinaleObjects(s.content);
      }
      const m = s.content.missions[topic];
      for (const k of ['observe', 'discuss', 'narrative', 'fallback', 'teachHeadline']) if (patch && typeof patch[k] === 'string' && patch[k].trim()) m[k] = patch[k].trim().slice(0, 600);
      if (patch && typeof patch.hint === 'string' && patch.hint.trim()) m.hints = [...m.hints, patch.hint.trim().slice(0, 300)].slice(-5);
      if (patch && patch.assess && typeof patch.assess === 'object') m.assess = { ...SEED.defaultAssess(), ...(m.assess || {}), ...patch.assess };
      s.tracks[topic] = by === 'educator' ? 'EDITED' : 'REVISED';
      s.revisions[topic] = [s.revisions[topic], note].filter(Boolean).join(' · ').slice(-500);
      audit('teacher', `The assistant revised track ${topic}${by === 'ai' ? ' (live AI)' : by === 'educator' ? '' : ' (scripted suggestion)'} — needs approval again.`);
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
    createQuest(s, opts) { return makeQuest(s, opts || {}); },
    openQuest(s, { id }) {
      if (id === s.activeQuest) return { ok: true, silent: true };
      if (!s.library[id]) return { ok: false, msg: 'Quest not found.' };
      snapInto(s);
      loadQuest(s, id);
      return { ok: true, silent: true };
    },
    deleteQuest(s, { id }) {
      if (id === s.activeQuest) { const other = Object.keys(s.library).find((k) => k !== id); if (!other) return { ok: false, msg: 'Keep at least one quest.' }; snapInto(s); loadQuest(s, other); }
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

    /* Remove one track; later tracks move up a letter (their content, status and notes move with them). */
    removeTrack(s, { topic }) {
      if (s.quest.status === 'PUBLISHED') return { ok: false, msg: 'Published quests are frozen — create a new quest to change it.' };
      if (s.phase !== 'LOBBY') return { ok: false, msg: 'End the live session first.' };
      const L = SEED.topics.slice(), i = L.indexOf(topic), st = s.quest.structure;
      if (i < 0) return { ok: false };
      if (L.length <= 1) {
        const old = s.content.missions[topic], b = SEED.buildTrack(topic, { name: '', evidence: [''], hints: [] });
        s.content.missions[topic] = { ...b.mission, stationCode: old.stationCode };
        s.content.topicMeta[topic] = { ...s.content.topicMeta[topic], name: 'Track ' + topic, label: 'Track ' + topic };
        s.content.peerTeaching.checkOptions[topic] = b.check;
        s.tracks[topic] = 'EMPTY'; delete s.revisions[topic];
        s.quest.structure = { ...s.quest.structure, tracks: 0 };
        SEED.syncFinaleObjects(s.content);
        audit('teacher', 'Removed the last track — starting from zero.');
        return { ok: true, msg: 'No tracks now — add one when you’re ready.' };
      }
      const t = L.length - 1, n = Math.max(st.classSize, 2), g = Math.min(st.expertGroup, Math.ceil(n / t));
      const bad = structureProblem(t, n, g);
      if (bad) return { ok: false, msg: bad };
      const c = s.content, gone = c.missions[topic].name || 'track ' + topic;
      for (let k = i; k < L.length - 1; k++) {
        const to = L[k], from = L[k + 1], codes = { stationCode: c.missions[to].stationCode };
        c.missions[to] = { ...c.missions[from], ...codes, topic: to, id: 'expert_' + to.toLowerCase() };
        c.topicMeta[to] = { ...c.topicMeta[to], name: c.topicMeta[from].name, label: c.topicMeta[from].label };
        c.peerTeaching.checkOptions[to] = c.peerTeaching.checkOptions[from];
        s.tracks[to] = s.tracks[from]; s.revisions[to] = s.revisions[from];
      }
      const last = L[L.length - 1];
      delete c.missions[last]; delete c.peerTeaching.checkOptions[last]; delete s.tracks[last]; delete s.revisions[last];
      (c.collectibles || []).forEach((x) => { if (x.kind === 'track' && x.track !== 'any') { const j = L.indexOf(x.track); if (x.track === topic) x.track = 'any'; else if (j > i) x.track = L[j - 1]; } });
      const r = actions.setStructure(s, { tracks: t, classSize: n, expertGroup: g });
      if (!r.ok) return r;
      audit('teacher', `Removed the track “${gone}”.`);
      return { ok: true, msg: `Removed “${gone}”. ${t} track${t === 1 ? '' : 's'} left.` };
    },
    setStructure(s, { tracks, classSize, expertGroup }) {
      if (s.quest.status === 'PUBLISHED') return { ok: false, msg: 'Published quests are frozen — create a new quest to change the groups.' };
      if (s.phase !== 'LOBBY') return { ok: false, msg: 'End the live session first.' };
      const t = Number(tracks), n = Number(classSize), g = Math.max(1, Math.min(Number(expertGroup), Math.ceil(Number(classSize) / Math.max(1, Number(tracks)))));
      const bad = structureProblem(t, n, g);
      if (bad) return { ok: false, msg: bad };
      const teams = Math.ceil(n / t), last = n - (teams - 1) * t;
      s.quest.structure = { tracks: t, classSize: n, expertGroup: g };
      s.quest.classSize = n;
      SEED.useStructure(s.quest.structure);
      SEED.ensureContentShape(s.content);
      const nt = {}; SEED.topics.forEach((x) => { nt[x] = s.tracks[x] || 'EMPTY'; }); s.tracks = nt;
      resetPlay(s);
      audit('teacher', `Set the groups: ${t} tracks, ${n} students (${teams} home teams), expert groups of ${g}.`);
      return { ok: true, msg: `${teams} home teams of ${t}${last < t ? ` (the last has ${last})` : ''}, expert groups of ${g}.` };
    },

    /* ----- authoring the quest content (educator; AI proposals land here too) ----- */
    setContent(s, { content }) {
      if (s.quest.status === 'PUBLISHED') return { ok: false, msg: 'Published quests are frozen — create a new quest to change it.' };
      if (!content || !content.missions || !SEED.topics.every((t) => content.missions[t])) return { ok: false, msg: 'The draft was incomplete.' };
      s.content = SEED.ensureContentShape(content);
      if (content.title) s.quest.title = content.title;
      SEED.useStructure(s.quest.structure); SEED.useContent(s.content);
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
      if (i < 0) return { ok: false };
      if (s.sources[i].kind === 'partner') return { ok: false, msg: 'Your partner’s notes come from them — they change them in their own view.' };
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
      if (!p) return { ok: false, msg: `This class is full (${SEED.participants.length} explorers).` };
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
    addCollectible(s) {
      if (s.quest.status === 'PUBLISHED') return { ok: false, msg: 'Published quests are frozen.' };
      const base = TEMPLATES.lost_museum.collectibles, i = s.content.collectibles.length;
      const id = 'card_' + Date.now().toString(36);
      s.content.collectibles.push({ id, title: '', activity: '', fact: '', color: base[i % base.length].color, category: 'Discovery', promptLabel: 'Your team’s discovery', ...SEED.defaultEarn(), kind: 'track', track: SEED.topics[0] });
      return { ok: true, msg: 'Card added — give it a name and choose how it’s earned.', id };
    },
    removeCollectible(s, { collectibleId }) {
      if (s.quest.status === 'PUBLISHED') return { ok: false, msg: 'Published quests are frozen.' };
      const i = s.content.collectibles.findIndex((c) => c.id === collectibleId);
      if (i < 0) return { ok: false };
      const [c] = s.content.collectibles.splice(i, 1);
      Object.keys(s.bonus).forEach((k) => { if (k.startsWith(collectibleId + '@')) delete s.bonus[k]; });
      audit('teacher', `Removed the card “${c.title || 'untitled'}”.`);
      return { ok: true, msg: 'Card removed.' };
    },
    editCollectible(s, { collectibleId, fields }) {
      if (s.quest.status === 'PUBLISHED') return { ok: false, msg: 'Published quests are frozen.' };
      const c = s.content.collectibles.find((x) => x.id === collectibleId);
      if (!c) return { ok: false };
      const f = fields || {};
      ['title', 'activity', 'fact'].forEach((k) => { if (typeof f[k] === 'string') c[k] = f[k].trim().slice(0, 200); });
      if (SEED.EARN_TEXT[f.kind]) c.kind = f.kind;
      if (SEED.topics.includes(f.track) || f.track === 'any') c.track = f.track;
      if (typeof f.hidden === 'boolean') c.hidden = f.hidden;
      if (typeof f.evolves === 'boolean') c.evolves = f.evolves;
      if (typeof f.art === 'string' && /^[a-z_]{0,40}$/.test(f.art)) c.art = f.art;
      if (f.image === null) delete c.image;
      else if (typeof f.image === 'string' && f.image.length < 150000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(f.image)) c.image = f.image;
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
      ['activity', 'provider', 'org', 'when', 'bring', 'fallback', 'staff'].forEach((k) => { if (typeof f[k] === 'string') n[k] = f[k].trim().slice(0, 300); });
      if (typeof f.enabled === 'boolean') n.enabled = f.enabled;
      if (['all', 'manual'].includes(f.unlock)) n.unlock = f.unlock;
      return { ok: true, msg: 'Next experience saved.' };
    },
    /* ----- the class journey (educator) ----- */
    addStep(s, { type, at, journeyId }) {
      if (!STEP_TYPES.includes(type)) return { ok: false };
      const J = jById(s, journeyId);
      const st = newStep(s, type);
      if (type === 'quest' && arguments[1].questId) st.questId = String(arguments[1].questId);
      else if (type === 'quest') { const used = new Set(J.steps.filter((x) => x.type === 'quest').map((x) => x.questId)); const free = Object.keys(s.library).find((k) => !used.has(k)); st.questId = free || s.activeQuest; }
      const i = Math.max(0, Math.min(Number.isInteger(at) ? at : J.steps.length, J.steps.length));
      J.steps.splice(i, 0, st);
      if (i === 0 && J.steps[1] && J.steps[1].opens === 'start') J.steps[1].opens = 'after';
      if (i === 0) st.opens = 'start';
      if (st.type === 'quest') catalogQuest(s, st.questId);
      audit('teacher', `Added a ${type === 'class' ? 'classroom session' : type} step to the journey.`);
      return { ok: true, msg: 'Step added — fill in the details.', id: st.id };
    },
    updateStep(s, { id, fields }) {
      const st = findStep(s, id), f = fields || {};
      if (!st) return { ok: false };
      ['title', 'when', 'where', 'note'].forEach((k) => { if (typeof f[k] === 'string') st[k] = f[k].trim().slice(0, 200); });
      if (typeof f.whenDate === 'string') { st.whenDate = /^\d{4}-\d{2}-\d{2}$/.test(f.whenDate) ? f.whenDate : ''; st.whenTime = /^\d{2}:\d{2}$/.test(f.whenTime || '') ? f.whenTime : ''; st.when = SEED.fmtWhen(st.whenDate, st.whenTime); }
      if (['start', 'after', 'manual', 'date'].includes(f.opens)) st.opens = f.opens;
      if (typeof f.date === 'string') st.date = /^\d{4}-\d{2}-\d{2}$/.test(f.date) ? f.date : '';
      if (st.type === 'quest' && f.questId) { if (!s.library[f.questId] && f.questId !== s.activeQuest) return { ok: false, msg: 'Quest not found.' }; st.questId = f.questId; catalogQuest(s, st.questId); }
      if (st.type === 'experience') ['activity', 'provider', 'org', 'bring', 'fallback', 'staff'].forEach((k) => { if (typeof f[k] === 'string') st.exp[k] = f[k].trim().slice(0, 300); });
      if (st.type === 'experience' && typeof f.email === 'string') { const m = f.email.trim().slice(0, 120); if (m && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)) return { ok: false, msg: 'That email address doesn’t look right.' }; st.exp.email = m; }
      if (st.type === 'experience' && !st.title) st.title = st.exp.activity;
      return { ok: true, msg: 'Step saved.' };
    },
    removeStep(s, { id }) {
      const J = jOf(s, id);
      const i = J.steps.findIndex((x) => x.id === id);
      if (i < 0) return { ok: false };
      const [gone] = J.steps.splice(i, 1);
      if (i === 0 && J.steps[0]) J.steps[0].opens = 'start';
      audit('teacher', `Removed “${stepTitle(s, gone)}” from the journey.`);
      return { ok: true, msg: 'Step removed.' };
    },
    moveStep(s, { id, dir }) {
      const steps = jOf(s, id).steps, i = steps.findIndex((x) => x.id === id), j = i + (dir < 0 ? -1 : 1);
      if (i < 0 || j < 0 || j >= steps.length) return { ok: false };
      [steps[i], steps[j]] = [steps[j], steps[i]];
      steps.forEach((x, k) => { if (k === 0) x.opens = 'start'; else if (x.opens === 'start') x.opens = 'after'; });
      return { ok: true, silent: true };
    },
    openStep(s, { id, reason }) {
      const J = jOf(s, id), i = J.steps.findIndex((x) => x.id === id), st = J.steps[i];
      if (!st) return { ok: false };
      if (i !== J.steps.findIndex((x) => !x.done)) return { ok: false, msg: 'Steps happen in order. Finish (or mark done) the step before it first.' };
      if (st.type === 'experience' && st.exp.status !== 'accepted') return { ok: false, msg: 'Confirm the booking with the provider first.' };
      const now = stepState(s, i, J.id);
      if (now.state === 'open' || now.state === 'done') return { ok: false, msg: 'This step is already open.' };
      st.opened = true; st.reason = String(reason || '').trim().slice(0, 200);
      audit('teacher', `Opened “${stepTitle(s, st)}” for the class.`);
      return { ok: true, msg: `“${stepTitle(s, st)}” is open for the class.` };
    },
    markStepDone(s, { id, done }) {
      const st = findStep(s, id);
      if (!st) return { ok: false };
      st.done = done !== false;
      audit('teacher', `Marked “${stepTitle(s, st)}” as ${st.done ? 'done' : 'not done'}.`);
      return { ok: true, msg: st.done ? `“${stepTitle(s, st)}” done — the next step can open.` : 'Marked as not done.' };
    },
    sendBooking(s, { id, text, date, time }) {
      const st = id ? findStep(s, id) : firstExperience(s), n = st && st.exp;
      if (!n || !n.activity || !n.provider) return { ok: false, msg: 'Add the activity and provider first.' };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n.email || '')) return { ok: false, msg: 'Add the provider’s email in the step details first.' };
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return { ok: false, msg: 'Choose the date you’d like.' };
      const t = String(text || '').trim();
      if (t.length < 20) return { ok: false, msg: 'Write the message first.' };
      n.request = t.slice(0, 2000); n.status = 'sent'; n.via = 'app'; n.askDate = date; n.askTime = /^\d{2}:\d{2}$/.test(time || '') ? time : ''; n.reply = '';
      audit('teacher', `Sent a booking request to ${n.provider}.`);
      return { ok: true, msg: `Request sent to ${n.provider} (simulated in this demo).` };
    },
    bookDirectly(s, { id, date, time }) {
      const st = findStep(s, id), n = st && st.exp;
      if (!n) return { ok: false };
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return { ok: false, msg: 'Choose the date you agreed.' };
      st.whenDate = date; st.whenTime = /^\d{2}:\d{2}$/.test(time || '') ? time : ''; st.when = SEED.fmtWhen(st.whenDate, st.whenTime);
      n.status = 'accepted'; n.via = 'self';
      audit('teacher', `Recorded a booking arranged directly${n.provider ? ' with ' + n.provider : ''}: ${st.when}.`);
      return { ok: true, msg: `Booked for ${st.when}.` };
    },
    resetBooking(s, { id }) {
      const st = findStep(s, id), n = st && st.exp;
      if (!n) return { ok: false };
      Object.assign(n, { status: 'none', via: '', reply: '', counterDate: '', counterTime: '', counterWhen: '' });
      return { ok: true, silent: true };
    },
    providerReply(s, { id, decision, date, time, note, accept }) {
      const st = id ? findStep(s, id) : firstExperience(s), n = st && st.exp;
      if (!n || n.status !== 'sent') return { ok: false };
      const d = decision || (accept ? 'accept' : 'counter');
      n.reply = String(note || '').trim().slice(0, 300);
      if (d === 'accept') {
        if (n.askDate) { st.whenDate = n.askDate; st.whenTime = n.askTime || ''; st.when = SEED.fmtWhen(st.whenDate, st.whenTime); }
        n.status = 'accepted'; audit('system', `${n.provider} accepted the booking (simulated provider).`); return { ok: true, msg: `${n.provider} accepted — booked.` };
      }
      if (d === 'decline') { n.status = 'declined'; audit('system', `${n.provider} declined (simulated provider).`); return { ok: true, msg: `${n.provider} declined.` }; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return { ok: false, msg: 'Choose the date to suggest.' };
      n.status = 'counter'; n.counterDate = date; n.counterTime = /^\d{2}:\d{2}$/.test(time || '') ? time : ''; n.counterWhen = SEED.fmtWhen(n.counterDate, n.counterTime);
      audit('system', `${n.provider} suggested ${n.counterWhen} (simulated provider).`);
      return { ok: true, msg: `${n.provider} suggested another time.` };
    },
    acceptCounter(s, { id } = {}) {
      const st = id ? findStep(s, id) : firstExperience(s), n = st && st.exp;
      if (!n || n.status !== 'counter') return { ok: false };
      if (n.counterDate) { st.whenDate = n.counterDate; st.whenTime = n.counterTime || ''; st.when = SEED.fmtWhen(st.whenDate, st.whenTime); } else st.when = n.counterWhen;
      n.status = 'accepted';
      audit('teacher', `Accepted the new time: ${st.when}.`);
      return { ok: true, msg: `Booked for ${st.when}.` };
    },
    experienceCheckIn(s, { participantId, code, byTeacher, stepId }) {
      const p = SEED.byId[participantId];
      const J = stepId ? jOf(s, stepId) : s.journey;
      const i = J.steps.findIndex((x) => x.type === 'experience' && (stepId ? x.id === stepId : ['open'].includes(stepState(s, J.steps.indexOf(x), J.id).state)));
      const st = J.steps[i];
      if (!p || !st || stepState(s, i, J.id).state !== 'open') return { ok: false, msg: 'This experience isn’t open yet.' };
      if (!byTeacher && String(code || '').trim().toUpperCase() !== ('WQ-' + st.id).toUpperCase()) return { ok: false, msg: 'That isn’t the check-in code for this experience.' };
      if (st.checkins[participantId]) return { ok: true, silent: true };
      st.checkins[participantId] = Date.now();
      let card = null, evolved = false;
      SEED.collectibles.filter((c) => c.evolves).forEach((c) => { [p.id, p.home].forEach((h) => { const k = c.id + '@' + h; if (s.earned[k] && !s.evolved[k]) { s.evolved[k] = true; evolved = true; card = card || c; } }); });
      audit(byTeacher ? 'teacher' : 'student', `${p.name} checked in at ${stepTitle(s, st)}${evolved ? ' — ' + card.title + ' levelled up' : ''}.`);
      return { ok: true, msg: evolved ? `Checked in — ${card.title} levelled up!` : 'Checked in. Enjoy!' };
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
      if (s.phase === 'LOBBY') return { ok: false, msg: 'Start the session first (Live session → Advance phase).' };
      let changed = 0;
      for (const p of SEED.participants) {
        if (p.id === s.ui.student || s.seats[p.id] || (s.checkins[p.id] && s.checkins[p.id].via !== 'SIMULATED')) continue;
        const ev = s.evidence[p.id];
        if (ev.status !== 'VERIFIED') {
          const mission = SEED.missions[p.topic];
          if (mission.needsFacilitator) s.interactions[p.id] = true;
          s.checkins[p.id] = s.checkins[p.id] || { at: Date.now(), via: 'SIMULATED' };
          const answers = {}, bank = (SEED.SAMPLE_INSIGHTS[s.quest.templateId] || {})[p.topic];
          const k = SEED.participants.filter((x) => x.topic === p.topic).indexOf(p);
          for (const f of mission.evidenceFields) {
            answers[f.key] = bank && f.key === bank.field ? bank.answers[k % bank.answers.length].text
              : bank && f.placeholder ? f.placeholder.replace(/^e\.g\.\s*/i, '').replace(/…$/, '.') : '[Simulated demo answer] ' + f.label;
          }
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
          if (!expert) continue;
          const isActive = expert && (expert.id === s.ui.student || !!s.seats[expert.id]);
          if (!cell.shared && !isActive && s.evidence[expert.id].status === 'VERIFIED') {
            const checker = SEED.homeMembers(h).find((m) => m.id !== expert.id);
            if (!checker) continue;
            cell.shared = true;
            cell.presenter = expert.id;
            cell.checker = checker.id;
            cell.answerId = SEED.peerTeaching.checkOptions[t].find((o) => o.correct).id;
            cell.simulated = true;
            const wrong = SEED.peerTeaching.checkOptions[t].filter((o) => !o.correct);
            const hIdx = SEED.homeGroups.indexOf(h);
            const typical = ((SEED.SAMPLE_INSIGHTS[s.quest.templateId] || {})[t] || {}).simMiss;
            if (wrong.length && hIdx % 5 !== 4) miss(s, `teach:${t}:${typical && hIdx % 3 !== 2 && wrong.some((o) => o.id === typical) ? typical : wrong[(hIdx + t.charCodeAt(0)) % wrong.length].id}`);
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
      for (const c of SEED.collectibles.filter((x) => x.kind === 'bonus')) for (const h of SEED.homeGroups) {
        const k = c.id + '@' + h;
        if (s.earned[k] || (s.bonus[k] && s.bonus[k].status === 'SUBMITTED')) continue;
        s.bonus[k] = { answer: '[Simulated] ' + (c.activity || 'Our discovery'), status: 'SUBMITTED', simulated: true };
        n++;
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
  function cardScope(c) { return c.kind === 'track' || c.kind === 'egg' ? 'student' : 'team'; }
  function holdersOf(c) {
    if (cardScope(c) === 'team') return SEED.homeGroups.slice();
    return SEED.participants.filter((p) => c.kind !== 'track' || !c.track || c.track === 'any' || p.topic === c.track);
  }
  function claim(s, card, holder, actor, why) {
    const k = card.id + '@' + holder;
    if (s.earned[k]) return { ok: false, msg: 'Already earned.' };
    s.earned[k] = { at: Date.now() };
    if (s.bonus[k]) s.bonus[k].status = 'CLAIMED';
    const first = !s.claims[card.id];
    if (first) s.claims[card.id] = { holder, at: Date.now() };
    const who = SEED.byId[holder] ? SEED.byId[holder].name : 'team ' + holder;
    audit(actor, `${card.title || 'A card'} earned by ${who} (${why}).`);
    let masterNow = false;
    if (!s.master && SEED.collectibles.length && SEED.collectibles.every((c) => s.claims[c.id])) {
      s.master = { at: Date.now() };
      masterNow = true;
      audit('system', `${SEED.master.title} unlocked for the class (exactly once).`);
    }
    return { ok: true, msg: `${card.title || 'A card'} earned!`, reveal: first ? card.id : null, master: masterNow };
  }
  const allFinished = (s) => SEED.homeGroups.every((h) => s.finale[h].status === 'APPROVED');
  function autoRules(s) {
    SEED.collectibles.forEach((c) => {
      if (c.kind === 'track') holdersOf(c).forEach((p) => { if (!s.earned[c.id + '@' + p.id] && s.evidence[p.id] && s.evidence[p.id].status === 'VERIFIED') claim(s, c, p.id, 'system', 'finished their track'); });
      if (c.kind === 'finale' || c.kind === 'experts') SEED.homeGroups.forEach((h) => {
        if (s.earned[c.id + '@' + h]) return;
        const met = c.kind === 'finale' ? s.finale[h].status === 'APPROVED' : SEED.homeMembers(h).every((p) => s.evidence[p.id].status === 'VERIFIED');
        if (met) claim(s, c, h, 'system', c.kind === 'finale' ? 'solved the finale' : 'every expert finished');
      });
    });
    for (const st of (s.journeys || []).flatMap((j) => j.steps)) {
      if (st.type === 'quest' && !st.done && st.questId === s.activeQuest && (s.phase === 'COMPLETE' || allFinished(s))) {
        st.done = true;
        audit('system', `Every team finished “${s.quest.title}” — the next step in the journey can open.`);
      }
    }
  }

  /* UI-only actions are per device and never shared with other devices. */
  const UI_ACTIONS = new Set(['setRole', 'setStudent', 'setScreen', 'setLookUp', 'markMasterSeen', 'setAnalysis']);
  let commitHook = null; // set by sync.js: called after a shared action succeeds locally

  ['useJourney', 'markStepDone', 'addStep', 'removeStep', 'moveStep', 'updateStep'].forEach((k) => {
    const f = actions[k];
    actions[k] = (s, p) => { const r = f(s, p); if (r && r.ok) { const m = alignRun(s); if (m) return { ...r, silent: false, reset: true, msg: m }; } return r; };
  });
  /* Actions that write quests happen in the studio; everything else happens in the class. */
  const STUDIO_ACTIONS = new Set(['updateQuest', 'generateDraft', 'publishQuest', 'saveContribution', 'reviewItem', 'requestChange', 'answerRequest', 'approveContribution',
    'reviseTrack', 'approveTrack', 'createQuest', 'openQuest', 'deleteQuest', 'setPartner', 'removeTrack', 'setStructure', 'setContent', 'editTrack', 'editFinale', 'editExtras',
    'addSource', 'removeSource', 'addCollectible', 'removeCollectible', 'editCollectible', 'setAssess', 'setNext']);
  const spaceOf = (type) => (UI_ACTIONS.has(type) ? space : STUDIO_ACTIONS.has(type) ? 'studio' : 'class');
  function dispatch(type, payload = {}, opts = {}) {
    const action = actions[type];
    if (!action) return { ok: false, msg: 'Unknown action: ' + type };
    const target = spaceOf(type), back = space;
    useSpace(target);
    try {
      const result = action(state, payload) || { ok: true };
      if (result.ok || result.commit) {
        if (!UI_ACTIONS.has(type)) autoRules(state);
        if (!UI_ACTIONS.has(type) && state.library) snapInto(state);
        persist();
        if (commitHook && !opts.replay && !UI_ACTIONS.has(type)) commitHook(type, payload, result, target);
        useSpace(back);
        emit({ type, payload, result });
      }
      return result;
    } finally { if (space !== back) useSpace(back); }
  }

  /* ---------- shared-state hooks for live sync (sync.js) ---------- */
  /* A new class: same quests (copied), nothing played yet, an empty journey after the current quest. */
  function prepareClass(code, name) {
    const s = clone(classState); snapInto(s);
    s.library = { [s.activeQuest]: s.library[s.activeQuest] };
    const f = freshState();
    const n = { ...f, ...Object.fromEntries(QUEST_KEYS.map((k) => [k, clone(s[k])])), library: clone(s.library), activeQuest: s.activeQuest,
      className: String(name || '').trim().slice(0, 60), studio: classState.studio || 'DEMO', pastAlbums: [], ui: { drafts: {}, screen: 'next' } };
    PLAY_KEYS.forEach((k) => { if (f[k] === undefined) delete n[k]; else n[k] = clone(f[k]); }); syncRoster(n); // missing keys are filled in on load
    n.journey = defaultJourney(n); ensureJourneys(n);
    try { localStorage.setItem(NEW_CLASS_KEY(code), JSON.stringify(n)); return true; } catch { return false; }
  }
  function sharedState(sp = 'class') {
    const { ui, ...rest } = sp === 'studio' ? studioState : classState;
    return JSON.parse(JSON.stringify(rest));
  }
  function applyShared(shared, sp = 'class') {
    const ui = classState.ui;
    if (shared && shared.quest) { SEED.useStructure(shared.quest.structure); SEED.useContent(shared.content); }
    const next = upgrade({ ...JSON.parse(JSON.stringify(shared)), ui });
    if (sp === 'studio') studioState = next; else classState = next;
    state = space === 'studio' ? studioState : classState;
    emit({ type: 'remote' });
  }
  function freshShared() {
    const { ui, ...rest } = freshDemo();
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
    prepareClass,
    useSpace,
    inSpace,
    questSnapshot,
    runOutdated,
    get space() { return space; },
    get classState() { return classState; },
    get studioState() { return studioState; },
    freshShared,
    onCommit: (fn) => { commitHook = fn; },
    sel,
    get state() {
      return state;
    },
  };
})();
