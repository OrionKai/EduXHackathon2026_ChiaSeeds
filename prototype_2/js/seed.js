/* WorldQuest prototype_2 — canonical seeded demo content.
 * Derived from fitzwilliam_seed_quest.json (see ../data/). All story elements are
 * fiction; gallery anchors come from official Fitzwilliam Museum pages and must be
 * re-checked before any real visit. No museum partnership is claimed.
 */
'use strict';

const SEED = {
  questId: 'fitz-lost-museum',
  title: 'The Lost Museum',
  subtitle: 'A Mystery of Many Perspectives',
  tagline: 'Junior Curators of Cambridge',
  fictionDisclaimer:
    'All curator requests, mystery clues, awards and character dialogue are fiction. This is not an official Fitzwilliam Museum programme or a confirmed partnership. All school groups must pre-book real visits.',
  location: {
    name: 'The Fitzwilliam Museum',
    address: 'Trumpington Street, Cambridge CB2 1RB',
    bookingNote: 'All school groups must pre-book, including self-guided visits.',
  },
  story: {
    opening:
      'The museum has a fictional challenge for our Junior Curators: a draft introduction treats very different objects as one single story. Investigate real exhibits, share your expertise, and propose a better evidence-based introduction.',
    rules: ['Stay with your group', 'Listen to approved adults', 'Ask for help anytime'],
  },

  participants: (() => {
    const list = [];
    const topics = ['A', 'B', 'C', 'D'];
    for (let i = 1; i <= 20; i++) {
      const id = 'S' + String(i).padStart(2, '0');
      list.push({
        id,
        name: 'Explorer ' + String(i).padStart(2, '0'),
        home: 'H' + (Math.floor((i - 1) / 4) + 1),
        topic: topics[(i - 1) % 4],
      });
    }
    return list;
  })(),

  homeGroups: ['H1', 'H2', 'H3', 'H4', 'H5'],
  topics: ['A', 'B', 'C', 'D'],

  topicMeta: {
    A: { color: 'violet', name: 'Evidence Detectives', tag: 'OBJECT_EVIDENCE', icon: 'lens', label: 'Evidence' },
    B: { color: 'teal', name: 'Power & Memory', tag: 'POWER_MEMORY', icon: 'monument', label: 'Power' },
    C: { color: 'sun', name: 'Multiple Lives', tag: 'MULTIPLE_LIVES', icon: 'tokens', label: 'Objects' },
    D: { color: 'coral', name: 'Connections & Voices', tag: 'CONNECTIONS_VOICES', icon: 'voices', label: 'Voices' },
  },

  missions: {
    A: {
      id: 'expert_a',
      topic: 'A',
      name: 'Evidence Detectives',
      gallery: 'Gallery 19 · Ancient Egypt',
      narrative: 'What can the object itself tell us?',
      sourceFact:
        'The official gallery page identifies the coffin set of Nespawershefyt, given in 1822, and other funerary objects.',
      sourceUrl: 'https://fitzmuseum.cam.ac.uk/plan-your-visit/galleries/gallery-19',
      observe:
        'Find Nespawershefyt’s coffin set (or a teacher-approved alternative). Look closely at shape, materials, colour and visible decoration. Then find its museum label.',
      discuss:
        'With your expert group: which of your claims are observations (things you can actually see) and which are inferences (interpretations)? Why can a single displayed object not prove what everyone experienced?',
      evidenceFields: [
        { key: 'observation_1', label: 'Observation 1 — something you can actually see', placeholder: 'e.g. I can see painted decoration along the lid…' },
        { key: 'observation_2', label: 'Observation 2 — a second visible detail', placeholder: 'e.g. The surface looks layered, like wood and plaster…' },
        { key: 'object_reference', label: 'Object label or case reference', placeholder: 'Which label or case did you check?' },
        { key: 'uncertainty', label: 'One thing this object cannot tell us', placeholder: 'e.g. It cannot tell us whether everyone had a coffin like this…' },
      ],
      hints: [
        'Start with a material, shape, or decoration.',
        'Separate words on the label from your own observations.',
      ],
      teachHeadline: 'Physical details are evidence — but one artifact never speaks for everyone.',
      fallback: 'Accessible alternative: approved official museum object images with descriptive text.',
    },
    B: {
      id: 'expert_b',
      topic: 'B',
      name: 'Power & Memory',
      gallery: 'Gallery 20 · Ancient Egypt',
      narrative: 'Whose stories become monumental?',
      sourceFact:
        'The Fitzwilliam notes the seven-ton sarcophagus lid of Ramesses III, given by G. B. Belzoni in 1823.',
      sourceUrl: 'https://fitzmuseum.cam.ac.uk/plan-your-visit/galleries/gallery-20',
      observe:
        'Find the monumental sarcophagus lid of Ramesses III. Look closely at its scale and decoration. Choose two visible features that make it prominent, and find whom it is associated with.',
      discuss:
        'Why might a monumental royal object survive — or be displayed — differently from objects connected with ordinary lives? Treat your answer as an interpretation to justify, not a fact.',
      evidenceFields: [
        { key: 'visible_feature_1', label: 'Visible feature 1 — what draws attention', placeholder: 'e.g. It is huge compared with nearby cases…' },
        { key: 'visible_feature_2', label: 'Visible feature 2', placeholder: 'e.g. Carved figures cover the surface…' },
        { key: 'reasoning', label: 'Your “This suggests… because…” inference', placeholder: 'This suggests… because…' },
        { key: 'uncertainty', label: 'Whose experience does it NOT tell us about?', placeholder: 'e.g. It does not show how ordinary workers were remembered…' },
      ],
      hints: [
        'Ask whom the object names or commemorates.',
        'Contrast “what it shows” with “whose experience it does not tell us”.',
      ],
      teachHeadline: 'Monuments show power and commemoration — and leave gaps in whose history is visible.',
      fallback: 'Accessible alternative: official Gallery 20 page and audio description where available.',
    },
    C: {
      id: 'expert_c',
      topic: 'C',
      name: 'Multiple Lives',
      gallery: 'Gallery 21 · Greece & Rome',
      narrative: 'Can two kinds of objects tell different stories?',
      sourceFact:
        'Gallery 21 features Greek and Roman pottery, sculpture, jewellery, coins and funerary monuments in a roughly chronological display.',
      sourceUrl: 'https://fitzmuseum.cam.ac.uk/plan-your-visit/galleries/gallery-21',
      observe:
        'Find two DIFFERENT categories of object — for example painted pottery and funerary sculpture, or jewellery and coins. Record what you see for each.',
      discuss:
        'Which kind of evidence helps with daily material life, and which with commemoration? What is one limit of drawing broad conclusions from one object type?',
      evidenceFields: [
        { key: 'artifact_type_1', label: 'Artifact type 1 and what it could help investigate', placeholder: 'e.g. Coins — trade, authority, imagery…' },
        { key: 'artifact_type_2', label: 'Artifact type 2 and what it could help investigate', placeholder: 'e.g. Funerary monuments — remembrance…' },
        { key: 'comparison', label: 'How do they answer different questions?', placeholder: 'Compare the two types…' },
        { key: 'limitation', label: 'One limitation of using a single object type', placeholder: 'e.g. One type cannot represent a whole society…' },
      ],
      hints: [
        'Look for different object types, not two of the same thing.',
        'Ask what each helps historians know — and what it cannot prove.',
      ],
      teachHeadline: 'Different object types answer different historical questions — never explain a society from one.',
      fallback: 'Accessible alternative: approved gallery descriptions and image examples.',
    },
    D: {
      id: 'expert_d',
      topic: 'D',
      name: 'Connections & Voices',
      gallery: 'Gallery 24 · Rome & Ancient Sudan',
      narrative: 'Whose perspective is present, and whose is missing?',
      sourceFact:
        'Official Gallery 24 describes Rome and Ancient Sudan objects, grave reliefs from Palmyra and a facsimile of the Dendera Zodiac.',
      sourceUrl: 'https://fitzmuseum.cam.ac.uk/plan-your-visit/galleries/gallery-24',
      observe:
        'Identify two geographical or cultural contexts named on gallery signs or labels, and note one question the display leaves you with.',
      discuss:
        'Your arranged conversation with the approved WorldQuest contributor: ask how to make an interpretation fair to people whose views may not appear on a museum label. Record their reply as a perspective, not a fact.',
      evidenceFields: [
        { key: 'context_1', label: 'Context 1 named in the gallery', placeholder: 'e.g. Rome…' },
        { key: 'context_2', label: 'Context 2 named in the gallery', placeholder: 'e.g. Ancient Sudan…' },
        { key: 'question_to_contributor', label: 'The question you asked the contributor', placeholder: 'What did you ask?' },
        { key: 'paraphrased_reply', label: 'Their reply, in your own words (a perspective, not a fact)', placeholder: 'They suggested…' },
        { key: 'remaining_uncertainty', label: 'One question that remains open', placeholder: 'We still do not know…' },
      ],
      hints: [
        'Start with the gallery title and signs.',
        'What question could only new evidence or human perspectives answer?',
      ],
      teachHeadline: 'Interpretation depends on whose voices are heard — seek context and name the gaps.',
      fallback:
        'Accessible alternative: teacher-guided conversation with a clearly labelled simulated contributor transcript.',
      needsFacilitator: true,
    },
  },

  contributor: {
    name: 'WorldQuest Demo Collaborator',
    label: 'SIMULATED WorldQuest contributor — not Fitzwilliam staff',
    prompts: [
      'What is evidence, and what is interpretation?',
      'Whose perspective might be absent, and what would help us know?',
      'How can we honestly show uncertainty in a short label?',
    ],
    defaultContribution:
      'Ask students what questions they would need to investigate before confidently interpreting an artifact’s cultural context.',
  },

  peerTeaching: {
    prompt: 'Name one thing this expert observed and why it matters.',
    checkOptions: {
      A: [
        { id: 'a_ok', text: 'They observed real physical details, and noted one artifact cannot represent everyone.', correct: true },
        { id: 'a_no', text: 'They proved everyone in ancient Egypt owned a decorated coffin.', correct: false, miss: 'Generalising from one burial' },
        { id: 'a_no2', text: 'They used the decoration to work out exactly what Nespawershefyt believed.', correct: false, miss: 'Reading beliefs straight off an object' },
        { id: 'a_no3', text: 'They showed the painting was for display in a museum, not for burial.', correct: false, miss: 'Confusing today’s display with original use' },
      ],
      B: [
        { id: 'b_ok', text: 'They showed a monumental object commemorates power — and leaves gaps in whose history survives.', correct: true },
        { id: 'b_no', text: 'They showed all ancient people were remembered equally.', correct: false, miss: 'Assuming monuments record everyone' },
        { id: 'b_no2', text: 'They showed the lid proves Ramesses III was a popular ruler.', correct: false, miss: 'Monument = popularity' },
        { id: 'b_no3', text: 'They showed the size of the lid tells us exactly how powerful Egypt was.', correct: false, miss: 'Size = exact power' },
      ],
      C: [
        { id: 'c_ok', text: 'They compared two object types that answer different historical questions.', correct: true },
        { id: 'c_no', text: 'They found one object type that explains the whole society.', correct: false, miss: 'One object type explains a society' },
        { id: 'c_no2', text: 'They showed painted pottery was only ever owned by the rich.', correct: false, miss: 'Assuming who owned things' },
        { id: 'c_no3', text: 'They showed an object keeps the same use for its whole life.', correct: false, miss: 'Objects have one fixed use' },
      ],
      D: [
        { id: 'd_ok', text: 'They gathered a contributor’s perspective and named whose voices might be missing.', correct: true },
        { id: 'd_no', text: 'They confirmed one person’s view counts as established museum fact.', correct: false, miss: 'Treating a perspective as fact' },
        { id: 'd_no2', text: 'They showed the relief tells us everything about the person carved on it.', correct: false, miss: 'An image shows the whole person' },
        { id: 'd_no3', text: 'They found that missing voices don’t matter as long as the object survives.', correct: false, miss: 'Ignoring missing voices' },
      ],
    },
  },

  finale: {
    title: 'Restore the Exhibition Introduction',
    objects: [
      { id: 'coffin_nespawershefyt', label: 'Nespawershefyt’s coffin set', gallery: 'Gallery 19', answer: 'OBJECT_EVIDENCE' },
      { id: 'lid_ramesses_iii', label: 'Sarcophagus lid of Ramesses III', gallery: 'Gallery 20', answer: 'POWER_MEMORY' },
      { id: 'gallery_21_object_types', label: 'A piece of painted pottery', gallery: 'Gallery 21', answer: 'MULTIPLE_LIVES' },
      { id: 'gallery_24_and_contributor', label: 'A grave relief from Palmyra', gallery: 'Gallery 24', answer: 'CONNECTIONS_VOICES' },
    ],
    overclaim: {
      question: 'Which exhibition principle is appropriately cautious?',
      options: [
        { id: 'absolute', text: '“Every object tells us everything about every person who used it.”', correct: false, miss: 'Objects tell us everything' },
        { id: 'expert', text: '“If a museum expert or community member says it, it is a fact.”', correct: false, miss: 'Treating a perspective as fact' },
        { id: 'biggest', text: '“The largest objects tell us the most important history.”', correct: false, miss: 'Size = importance' },
        { id: 'cautious', text: '“Objects provide different evidence; historical interpretations require context and multiple perspectives.”', correct: true },
      ],
    },
    compose: {
      prompt:
        'Build an improved introduction: cite at least two observed objects, acknowledge varied experiences, note one uncertainty, and invite a visitor question.',
      tiles: [
        { id: 't1', cat: 'evidence', text: 'Nespawershefyt’s coffin set shows us painted decoration we can observe directly.' },
        { id: 't2', cat: 'evidence', text: 'The monumental lid of Ramesses III shows how power was commemorated.' },
        { id: 't3', cat: 'evidence', text: 'Gallery 21’s pottery, coins and monuments answer different historical questions.' },
        { id: 't4', cat: 'perspectives', text: 'These objects reflect many different lives — no single artifact speaks for everyone.' },
        { id: 't5', cat: 'uncertainty', text: 'Much remains uncertain: many experiences left no objects behind.' },
        { id: 't6', cat: 'invite', text: 'What question would YOU ask of these objects? Your perspective matters too.' },
        { id: 't7', cat: 'overclaim', text: 'Together, these objects tell us everything about the ancient world.', trap: true },
      ],
      needs: { evidence: 2, perspectives: 1, uncertainty: 1, invite: 1 },
    },
    rubric: ['Evidence', 'Multiple perspectives', 'Appropriate uncertainty', 'Collaboration'],
  },

  collectibles: [
    {
      id: 'detail_lens', title: 'The Detail Lens', home: 'H1', color: 'violet', category: 'Evidence',
      activity: 'Locate an approved visual detail and explain what it reveals.',
      fact: 'Close observation turns a display case into a primary source.',
      promptLabel: 'The detail your team chose, and what it reveals',
    },
    {
      id: 'memory_stone', title: 'The Memory Stone', home: 'H2', color: 'teal', category: 'Memory',
      activity: 'Find a sign of remembrance and formulate one respectful historical question.',
      fact: 'Commemoration preserves some stories — and quietly leaves out others.',
      promptLabel: 'Your sign of remembrance and respectful question',
    },
    {
      id: 'twin_tokens', title: 'The Twin Tokens', home: 'H3', color: 'sun', category: 'Compare',
      activity: 'Identify two different artifact types and what questions they answer.',
      fact: 'Two kinds of evidence beat one: each answers a different question.',
      promptLabel: 'Your two artifact types and their questions',
    },
    {
      id: 'listening_shell', title: 'The Listening Shell', home: 'H4', color: 'coral', category: 'Voices',
      activity: 'Compose a meaningful question for an approved community contributor.',
      fact: 'Human perspectives add context no label can hold.',
      promptLabel: 'Your question for a community contributor',
    },
    {
      id: 'curator_lantern', title: 'The Curator’s Lantern', home: 'H5', color: 'lantern', category: 'Reflect',
      activity: 'Write a 12-word exhibition description that avoids unsupported universal claims.',
      fact: 'Honest labels light the way: cautious words invite curiosity.',
      promptLabel: 'Your 12-word inclusive micro-label',
    },
  ],

  master: {
    id: 'guardian_of_stories',
    title: 'Guardian of Stories',
    text: 'Bring every discovery together to unlock the class’s master collectible.',
    fact: 'Five perspectives, one guardian: stories survive when a whole class keeps them.',
  },

  reflection: [
    'What did someone from another expert group teach you?',
    'What question about the objects would you still like to ask?',
  ],

  phases: ['LOBBY', 'BRIEFING', 'EXPERT', 'PEER_TEACH', 'FINALE', 'REFLECTION', 'COMPLETE'],
  phaseMeta: {
    LOBBY: { label: 'Lobby', desc: 'Explorers join and home teams form.' },
    BRIEFING: { label: 'Briefing', desc: 'Story, safety rules and expert roles.' },
    EXPERT: { label: 'Expert missions', desc: 'Expert groups investigate their locations.' },
    PEER_TEACH: { label: 'Peer teaching', desc: 'Experts return home and teach their team.' },
    FINALE: { label: 'Finale', desc: 'Home teams combine every perspective to solve the finale.' },
    REFLECTION: { label: 'Reflection', desc: 'Individual reflections and debrief.' },
    COMPLETE: { label: 'Complete', desc: 'Quest complete — look up and celebrate.' },
  },
};

SEED.byId = Object.fromEntries(SEED.participants.map((p) => [p.id, p]));
SEED.homeMembers = (h) => SEED.participants.filter((p) => p.home === h);
SEED.expertOf = (h, topic) => SEED.participants.find((p) => p.home === h && p.topic === topic);

/* Station check-in: each expert gallery has a printed QR clue card (stationCode)
   and a short backup code a facilitator can read out (backupCode). */
Object.entries({ A: ['WQ-STATION-A', 'LENS'], B: ['WQ-STATION-B', 'STONE'], C: ['WQ-STATION-C', 'TOKEN'], D: ['WQ-STATION-D', 'VOICE'] })
  .forEach(([t, [qr, code]]) => { SEED.missions[t].stationCode = qr; SEED.missions[t].backupCode = code; });

/* ================= Quest content is owned by the session, not this file =================
 * Everything a teacher can author (title, story, the four expert tracks, peer-teaching checks,
 * finale, collectibles, master award, reflection questions) lives in the session state as
 * `content`. SEED keeps only the fixed Jigsaw structure (20 seats, 5 home teams x 4 tracks,
 * phases). The properties below are getters, so existing screens keep reading SEED.missions,
 * SEED.finale, ... and automatically get the current quest. Templates are starting points only.
 */
/* Short words a facilitator can read out if a QR card can't be scanned; new ones for every quest. */
const CODE_WORDS = ['LENS', 'STONE', 'TOKEN', 'VOICE', 'MAPLE', 'RIVER', 'CEDAR', 'EMBER', 'ORBIT', 'PRISM', 'QUILL', 'SPARK', 'COMET', 'FERN', 'HARBOR', 'LANTERN'];
SEED.newBackupCode = () => CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)] + String(10 + Math.floor(Math.random() * 90));
const STATION = { A: ['WQ-STATION-A', 'LENS'], B: ['WQ-STATION-B', 'STONE'], C: ['WQ-STATION-C', 'TOKEN'], D: ['WQ-STATION-D', 'VOICE'] };
const CONTENT_KEYS = ['title', 'subtitle', 'story', 'topicMeta', 'missions', 'peerTeaching', 'finale', 'collectibles', 'master', 'reflection'];
const TEMPLATES = {
  lost_museum: JSON.parse(JSON.stringify(Object.fromEntries(CONTENT_KEYS.map((k) => [k, SEED[k]])))),
};
TEMPLATES.lost_museum.meta = { id: 'lost_museum', name: 'The Lost Museum', blurb: 'Fitzwilliam Museum, Cambridge · four galleries · ancient world' };
/* How each track is assessed: check-in at the place, what evidence students submit, an optional
   multiple-choice check with a pass mark, and who verifies it. */
SEED.defaultAssess = () => ({ checkin: 'photo_teacher', evidence: 'notes', quiz: [], pass: 0, verify: 'teacher' });
SEED.topics.forEach((t) => { TEMPLATES.lost_museum.missions[t].assess = SEED.defaultAssess(); });
/* Something students can actually photograph at each station of the example quest. */
Object.entries({ A: 'Nespawershefyt’s coffin set', B: 'the sarcophagus lid of Ramesses III', C: 'a piece of painted pottery', D: 'a grave relief from Palmyra' })
  .forEach(([t, k]) => { TEMPLATES.lost_museum.missions[t].keyObject = k; });
SEED.ASSESS_TEXT = {
  checkin: { photo_ai: 'Photo of the object, checked by AI (sent to the AI, then discarded)', photo_teacher: 'Photo of the object, checked by the educator', qr: 'QR clue card or facilitator code', none: 'No check-in' },
  evidence: { notes: 'Written field notes', photo: 'A photo of the object', notes_photo: 'Field notes and a photo' },
  verify: { teacher: 'Educator verifies', partner: 'Community partner verifies', auto: 'Automatic when the quiz is passed' },
};

/* Build a track (mission + its topic label + its peer-teaching check) from flat, teacher-friendly fields. */
SEED.buildTrack = (t, f) => {
  const prompts = (f.evidence || []).map((x) => String(x).trim()).filter(Boolean);
  return {
    mission: {
      id: 'expert_' + t.toLowerCase(), topic: t,
      name: f.name || '', gallery: f.location || '', keyObject: f.keyObject || '',
      narrative: f.narrative || '', observe: f.observe || '', discuss: f.discuss || '',
      sourceFact: f.sourceFact || '', sourceUrl: f.sourceUrl || '',
      evidenceFields: prompts.map((label, i) => ({ key: 'f' + (i + 1), label, placeholder: '' })),
      hints: (f.hints || []).map((x) => String(x).trim()).filter(Boolean),
      teachHeadline: f.teachHeadline || '', fallback: f.fallback || '',
      needsFacilitator: !!f.needsContributor,
      stationCode: STATION[t][0], backupCode: String(f.backupCode || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || SEED.newBackupCode(),
      assess: { ...SEED.defaultAssess(), ...(f.assess || {}) },
      refPhoto: typeof f.refPhoto === 'string' && f.refPhoto.startsWith('data:image/') && f.refPhoto.length < 120000 ? f.refPhoto : null,
    },
    label: (f.name || 'Track ' + t).split(/\s+/)[0].replace(/[^\w’'-]/g, '').slice(0, 14) || 'Track ' + t,
    check: (Array.isArray(f.checks) && f.checks.length ? f.checks : [{ text: f.checkCorrect || '', correct: true }, { text: f.checkIncorrect || '', correct: false }])
      .map((x, i) => ({ id: x.id || t.toLowerCase() + '_' + (i + 1), text: String(x.text || '').trim(), correct: !!x.correct, ...(x.miss ? { miss: String(x.miss) } : {}) })),
  };
};
/* Flat fields back out of a track, for the editor. */
SEED.trackFields = (c, t) => {
  const m = c.missions[t], opts = (c.peerTeaching.checkOptions[t] || []);
  return {
    name: m.name, location: m.gallery, keyObject: m.keyObject || (c.finale.objects.find((o) => o.answer === c.topicMeta[t].tag) || {}).label || '',
    narrative: m.narrative, observe: m.observe, discuss: m.discuss,
    evidence: m.evidenceFields.map((e) => e.label), hints: m.hints, fallback: m.fallback, teachHeadline: m.teachHeadline,
    checkCorrect: (opts.find((o) => o.correct) || {}).text || '', checkIncorrect: (opts.find((o) => !o.correct) || {}).text || '',
    checks: opts.map((o) => ({ id: o.id, text: o.text, correct: !!o.correct, miss: o.miss || '' })),
    needsContributor: !!m.needsFacilitator, sourceFact: m.sourceFact, sourceUrl: m.sourceUrl, backupCode: m.backupCode,
    assess: JSON.parse(JSON.stringify(m.assess || SEED.defaultAssess())), refPhoto: m.refPhoto || null,
  };
};
/* Finale objects always follow the tracks: one key object per perspective. */
SEED.syncFinaleObjects = (c) => {
  c.finale.objects = SEED.topics.map((t) => ({
    id: 'obj_' + t, label: c.missions[t].keyObject || c.missions[t].name || 'Track ' + t,
    gallery: c.missions[t].gallery || '', answer: c.topicMeta[t].tag,
  }));
};
SEED.FINALE_CATS = { evidence: 'Evidence sentences', perspectives: 'Different perspectives', uncertainty: 'Naming an uncertainty', invite: 'Inviting a question' };
SEED.buildFinale = (c, f) => {
  const list = (v) => (Array.isArray(v) ? v : v ? [v] : []).map((x) => String(x).trim()).filter(Boolean);
  const tiles = [];
  Object.keys(SEED.FINALE_CATS).forEach((cat) => list(f[cat]).forEach((text, i) => tiles.push({ id: cat[0] + (i + 1), cat, text })));
  list(f.traps || f.trap).forEach((text, i) => tiles.push({ id: 'x' + (i + 1), cat: 'overclaim', text, trap: true }));
  c.finale.title = f.title || c.finale.title || 'Restore the story';
  const opts = Array.isArray(f.options) && f.options.length ? f.options : [{ text: f.cautious || '', correct: true }, { text: f.overclaim || '', correct: false }];
  c.finale.overclaim = { question: String(f.question || c.finale.overclaim.question || 'Which statement stays within the evidence?').trim(),
    options: opts.map((o, i) => ({ id: o.id || 'o' + (i + 1), text: String(o.text || '').trim(), correct: !!o.correct, ...(o.miss ? { miss: String(o.miss) } : {}) })).filter((o) => o.text) };
  const needs = { ...c.finale.compose.needs, ...(f.needs || {}) };
  Object.keys(needs).forEach((k) => { needs[k] = Math.max(0, Number(needs[k]) || 0); });
  c.finale.compose = { ...c.finale.compose, tiles, needs, max: Math.max(1, Number(f.max) || c.finale.compose.max || 6) };
  if (Array.isArray(f.rubric)) c.finale.rubric = list(f.rubric);
};
SEED.finaleFields = (c) => {
  const T = c.finale.compose.tiles, by = (cat) => T.filter((x) => x.cat === cat && !x.trap).map((x) => x.text);
  const out = { title: c.finale.title, question: c.finale.overclaim.question, options: c.finale.overclaim.options.map((o) => ({ id: o.id, text: o.text, correct: !!o.correct, miss: o.miss || '' })),
    traps: T.filter((x) => x.trap).map((x) => x.text), needs: { ...c.finale.compose.needs }, max: c.finale.compose.max || 6, rubric: [...(c.finale.rubric || [])] };
  Object.keys(SEED.FINALE_CATS).forEach((cat) => { out[cat] = by(cat); });
  return out;
};

/* A blank quest: the Jigsaw structure with every authored field empty. */
TEMPLATES.blank = (() => {
  const base = JSON.parse(JSON.stringify(TEMPLATES.lost_museum));
  const c = { ...base, title: 'Untitled quest', subtitle: '', story: { opening: '', rules: base.story.rules }, meta: { id: 'blank', name: 'Blank quest', blurb: 'Your place, your perspectives' } };
  c.topicMeta = JSON.parse(JSON.stringify(base.topicMeta));
  c.missions = {}; c.peerTeaching = { prompt: base.peerTeaching.prompt, checkOptions: {} };
  SEED.topics.forEach((t) => {
    const b = SEED.buildTrack(t, { name: '', evidence: ['', ''], hints: [] });
    c.missions[t] = b.mission; c.topicMeta[t].name = 'Track ' + t; c.topicMeta[t].label = 'Track ' + t; c.peerTeaching.checkOptions[t] = b.check;
  });
  c.finale = { ...base.finale, title: 'Restore the story', compose: { ...base.finale.compose, prompt: 'Build a short introduction: cite at least two pieces of evidence, acknowledge different perspectives, note one uncertainty, and invite a question.', tiles: [] },
    overclaim: { question: 'Which statement stays within the evidence?', options: [{ id: 'cautious', text: '', correct: true }, { id: 'absolute', text: '', correct: false }] } };
  SEED.syncFinaleObjects(c);
  c.collectibles = base.collectibles.map((x) => ({ ...x, title: '', activity: '', fact: '', promptLabel: 'Your team’s discovery' }));
  c.reflection = [''];
  return c;
})();

/* What still has to be filled in before students can play. */
SEED.contentProblems = (c) => {
  const p = [];
  if (!c.title || !c.title.trim()) p.push('Give the quest a title');
  SEED.topics.forEach((t) => {
    const m = c.missions[t], chk = c.peerTeaching.checkOptions[t] || [];
    if (!m.name) p.push(`Track ${t}: name`);
    if (!m.gallery) p.push(`Track ${t}: location`);
    if (!m.observe) p.push(`Track ${t}: what students do`);
    if (m.evidenceFields.filter((e) => e.label).length < 1) p.push(`Track ${t}: at least one evidence prompt`);
    if (!chk.length || chk.some((o) => !o.text) || !chk.some((o) => o.correct)) p.push(`Track ${t}: teach-back check statements (at least one correct)`);
    const a = m.assess || SEED.defaultAssess();
    if ((a.quiz || []).some((q) => !q.q || q.o.length < 2 || q.o.some((o) => !o))) p.push(`Track ${t}: complete every quiz question`);
    if (a.verify === 'auto' && !(a.quiz || []).length) p.push(`Track ${t}: automatic verification needs a quiz`);
  });
  const T = c.finale.compose.tiles, n = (cat) => T.filter((x) => x.cat === cat && !x.trap).length, needs = c.finale.compose.needs || {};
  if (Object.keys(needs).some((cat) => n(cat) < needs[cat])) p.push('Finale: enough sentences for each requirement');
  if (Object.values(needs).reduce((x, y) => x + y, 0) > (c.finale.compose.max || 6)) p.push('Finale: the sentence limit is lower than the requirements');
  const o = c.finale.overclaim.options;
  if (!o.some((x) => x.correct) || !o.some((x) => !x.correct)) p.push('Finale: at least one cautious and one overclaiming statement');
  if (!(c.finale.rubric || []).length) p.push('Finale: at least one rubric item');
  if (c.collectibles.some((x) => !x.title || !x.activity)) p.push('Collectibles: a title and activity for each card');
  if (!c.reflection.length || c.reflection.some((q) => !q || !q.trim())) p.push('Reflection: at least one question, none empty');
  return p;
};

/* Station codes were attached above for the template; the getters below take over from here. */
let __content = null;
SEED.useContent = (c) => { __content = c; };
CONTENT_KEYS.forEach((k) => Object.defineProperty(SEED, k, {
  get: () => (__content && __content[k] !== undefined ? __content[k] : TEMPLATES.lost_museum[k]),
  configurable: true, enumerable: true,
}));

SEED.genericDisclaimer = 'Story elements, characters and awards are fiction created for learning. No partnership with any venue is claimed unless one has been agreed. Real school visits must be booked with the venue.';
SEED.partnerDefaults = { name: 'WorldQuest Demo Collaborator', org: 'Simulated community contributor' };

/* The object students photograph to check in: the track's key object, or its finale object. */
SEED.keyObjectOf = (t) => {
  const m = SEED.missions[t];
  return m.keyObject || (SEED.finale.objects.find((o) => o.answer === SEED.topicMeta[t].tag) || {}).label || m.name || 'the object';
};

/* Collectibles: each home team's card has a rule for how it is earned.
   bonus = team submits the bonus activity and the educator approves it (the original behaviour)
   finale = the team's finale is approved · experts = all four of the team's experts are verified
   track = the team's expert for one track is verified · egg = hidden: a phone tilted up at the location
   teacher = the educator awards it by hand */
SEED.EARN_TEXT = { bonus: 'Team bonus activity, approved by the educator', finale: 'The team’s finale is approved', experts: 'All four of the team’s experts are verified',
  track: 'The team’s expert for one track is verified', egg: 'Hidden easter egg: a phone tilted up at the location', teacher: 'The educator awards it' };
SEED.defaultEarn = () => ({ kind: 'bonus', track: 'A', hidden: false, evolves: true });
TEMPLATES.lost_museum.collectibles.forEach((c) => Object.assign(c, SEED.defaultEarn()));
TEMPLATES.blank.collectibles.forEach((c) => Object.assign(c, SEED.defaultEarn()));
/* The next real experience after the quest (booked with a provider, unlocked for the class). */
SEED.defaultNext = () => ({ enabled: false, activity: '', provider: '', org: '', when: '', bring: '', fallback: '', staff: '2', unlock: 'all', status: 'none', request: '', counterWhen: '' });

/* ================= Jigsaw structure is configurable per quest =================
 * tracks (3–6) = home team size; classSize = seats; expertGroup = how many experts of the same
 * track visit their station together. Everything that used to be fixed (participants, home teams,
 * tracks) is now computed from the active quest's structure. */
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const TRACK_STYLE = {
  A: { color: 'violet', icon: 'lens', tag: 'OBJECT_EVIDENCE' }, B: { color: 'teal', icon: 'monument', tag: 'POWER_MEMORY' },
  C: { color: 'sun', icon: 'tokens', tag: 'MULTIPLE_LIVES' }, D: { color: 'coral', icon: 'voices', tag: 'CONNECTIONS_VOICES' },
  E: { color: 'sky', icon: 'map', tag: 'TRACK_E' }, F: { color: 'lime', icon: 'leaf', tag: 'TRACK_F' },
};
const STATION_WORDS = { E: ['WQ-STATION-E', 'MAPLE'], F: ['WQ-STATION-F', 'RIVER'] };
Object.assign(STATION, STATION_WORDS);
SEED.defaultStructure = () => ({ tracks: 4, classSize: 20, expertGroup: 5 });
let __structure = SEED.defaultStructure(), __roster = null;
function buildRoster() {
  const { tracks, classSize } = __structure, topics = LETTERS.slice(0, tracks), list = [];
  for (let i = 1; i <= classSize; i++) {
    const id = 'S' + String(i).padStart(2, '0');
    list.push({ id, name: 'Explorer ' + String(i).padStart(2, '0'), home: 'H' + (Math.floor((i - 1) / tracks) + 1), topic: topics[(i - 1) % tracks] });
  }
  const homes = [...new Set(list.map((p) => p.home))];
  __roster = { topics, list, homes, byId: Object.fromEntries(list.map((p) => [p.id, p])) };
}
SEED.useStructure = (st) => {
  const t = Math.max(3, Math.min(6, Number(st && st.tracks) || 4));
  const n = Math.max(t, Math.min(60, Number(st && st.classSize) || 20));
  const g = Math.max(1, Number(st && st.expertGroup) || 5);
  if (__roster && t === __structure.tracks && n === __structure.classSize && g === __structure.expertGroup) return;
  __structure = { tracks: t, classSize: n, expertGroup: g };
  buildRoster();
};
buildRoster();
Object.defineProperty(SEED, 'participants', { get: () => __roster.list, configurable: true });
Object.defineProperty(SEED, 'homeGroups', { get: () => __roster.homes, configurable: true });
Object.defineProperty(SEED, 'topics', { get: () => __roster.topics, configurable: true });
Object.defineProperty(SEED, 'byId', { get: () => __roster.byId, configurable: true });
Object.defineProperty(SEED, 'structure', { get: () => __structure, configurable: true });
/* Tracks present in one home team (the last team can be smaller when the class doesn't divide evenly). */
SEED.topicsFor = (h) => SEED.topics.filter((t) => SEED.expertOf(h, t));
/* The small group of same-track experts a student visits their station with. */
SEED.expertGroupOf = (pid) => {
  const p = SEED.byId[pid]; if (!p) return { index: 0, members: [] };
  const same = SEED.participants.filter((x) => x.topic === p.topic);
  const g = __structure.expertGroup, i = same.findIndex((x) => x.id === pid), index = Math.floor(i / g);
  return { index, members: same.slice(index * g, index * g + g), count: Math.ceil(same.length / g) };
};
SEED.styleOf = (t) => TRACK_STYLE[t];
/* Make a quest's content match its structure: a track per letter, a collectible per home team. */
SEED.ensureContentShape = (c) => {
  SEED.topics.forEach((t) => {
    if (!c.missions[t]) {
      const b = SEED.buildTrack(t, { name: '', evidence: [''], hints: [] });
      c.missions[t] = b.mission;
      c.peerTeaching.checkOptions[t] = b.check;
    }
    c.topicMeta[t] = { ...TRACK_STYLE[t], ...(c.topicMeta[t] || {}), color: (c.topicMeta[t] || TRACK_STYLE[t]).color || TRACK_STYLE[t].color };
    if (!c.topicMeta[t].name) c.topicMeta[t].name = c.missions[t].name || 'Track ' + t;
    if (!c.topicMeta[t].label) c.topicMeta[t].label = 'Track ' + t;
  });
  SEED.syncFinaleObjects(c);
  const base = TEMPLATES.lost_museum.collectibles;
  c.collectibles = SEED.homeGroups.map((h, i) => {
    const old = c.collectibles[i];
    if (old) return { ...old, home: h };
    return { id: 'card_' + (i + 1), title: '', activity: '', fact: '', home: h, color: base[i % base.length].color, category: 'Discovery', promptLabel: 'Your team’s discovery', ...SEED.defaultEarn() };
  });
  return c;
};

SEED.AUDIENCES = { secondary: 'Secondary school', university: 'University', adult: 'Adult / community learners' };
SEED.defaultAudience = () => ({ kind: 'secondary', ages: '13–16' });

/* Example quest only: realistic answers for simulated classmates (some with typical misconceptions),
   and the scripted analysis of them used when live AI is off. Keyed by template, then track. */
SEED.SAMPLE_INSIGHTS = {
  lost_museum: {
    A: { simMiss: 'a_no2', field: 'uncertainty', strengths: 'Most answers name a real limit of the evidence (who paid, who the person was).',
      answers: [
        { text: 'It can’t tell us whether ordinary people had coffins like this.' },
        { text: 'Nothing really — the painting shows exactly what Egyptians believed about the afterlife.', theme: 'beliefs' },
        { text: 'It can’t tell us how much it cost or who paid for it.' },
        { text: 'It shows all Egyptians were buried this way, so there isn’t much it can’t tell us.', theme: 'general' },
        { text: 'We don’t know what Nespawershefyt was like as a person, only how they were buried.' }],
      themes: {
        beliefs: { title: 'Reading beliefs straight off the object', explain: 'Treats the decoration as proof of exactly what people believed, rather than evidence that needs other sources.', ask: 'What else would we need, besides the coffin, to know what Nespawershefyt believed?' },
        general: { title: 'One burial stands for everyone', explain: 'Generalises from one high-status coffin to all Egyptians.', ask: 'Who might not have had a coffin like this — and how could we find out?' } } },
    B: { simMiss: 'b_no2', field: 'uncertainty', strengths: 'Several students noticed that workers, women and children are missing from the monument.',
      answers: [
        { text: 'Ordinary workers who built the tomb aren’t remembered here.' },
        { text: 'It shows Ramesses was loved by everyone, so it covers most people.', theme: 'popular' },
        { text: 'It doesn’t tell us about women or children in the palace.' },
        { text: 'Everyone important is on it, so it tells us about the whole of Egypt.', theme: 'popular' },
        { text: 'Because it’s so big, Ramesses must have been the most powerful king ever.', theme: 'size' }],
      themes: {
        popular: { title: 'A monument means the ruler was popular', explain: 'Reads a royal monument as evidence of popularity or of everyone’s experience, not as how power chose to be remembered.', ask: 'Who decided what went on this lid — and who didn’t get a say?' },
        size: { title: 'Bigger means more powerful', explain: 'Uses size as a direct measure of power instead of one clue among several.', ask: 'What else, besides size, could tell us how powerful a ruler was?' } } },
    C: { simMiss: 'c_no', field: 'limitation', strengths: 'Good comparisons of what different object types can and can’t answer.',
      answers: [
        { text: 'Pottery only tells us about some uses, not about laws or beliefs.' },
        { text: 'Painted pottery was only for rich people, so it only tells us about the rich.', theme: 'rich' },
        { text: 'One type can’t show the whole society.' },
        { text: 'There isn’t really a limitation if you look at enough pots.', theme: 'more' },
        { text: 'Pots get reused, so the use we see might not be the first one.' }],
      themes: {
        rich: { title: 'Assuming who owned things', explain: 'States who used an object type as fact without evidence from the gallery.', ask: 'What in the case would tell us who actually used this pottery?' },
        more: { title: 'More of the same fills every gap', explain: 'Thinks many examples of one object type can answer every question about a society.', ask: 'What questions could a thousand pots still not answer?' } } },
    D: { simMiss: 'd_no', field: 'remaining_uncertainty', strengths: 'Strong open questions about missing voices and how objects arrived in Cambridge.',
      answers: [
        { text: 'We still don’t know how the person on the relief saw themselves.' },
        { text: 'None — the contributor told us what it means, so now we know.', theme: 'fact' },
        { text: 'Whose voices from Palmyra are missing from the gallery?' },
        { text: 'The contributor is from the community so their view is the official answer.', theme: 'fact' },
        { text: 'How did some of these objects end up in Cambridge?' }],
      themes: {
        fact: { title: 'Treating one perspective as the answer', explain: 'Records the contributor’s view as settled fact instead of one perspective to weigh with the evidence.', ask: 'How is a perspective different from a fact — and why do we need both?' } } },
  },
};
