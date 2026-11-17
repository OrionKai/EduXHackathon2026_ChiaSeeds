/* WorldQuest prototype_2 — canonical seeded demo content.
 * Derived from fitzwilliam_seed_quest.json (see ../data/). All story elements are
 * fiction; gallery anchors come from official Fitzwilliam Museum pages and must be
 * re-checked before any real visit. No museum partnership is claimed.
 */
'use strict';

const SEED = {
  questId: 'fitz-lost-museum',
  title: 'The Lost Museum',
  subtitle: 'A museum mystery for four detectives',
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
      'In our story, someone has written a new sign for the museum. It says all these objects tell one simple story — but that isn’t true. Your team will look at real objects, share what you find, and write a better sign together.',
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
    A: { color: 'violet', name: 'Detail Detectives', tag: 'OBJECT_EVIDENCE', icon: 'lens', label: 'Details' },
    B: { color: 'teal', name: 'Who Gets Remembered', tag: 'POWER_MEMORY', icon: 'monument', label: 'Memory' },
    C: { color: 'sun', name: 'Different Objects, Different Clues', tag: 'MULTIPLE_LIVES', icon: 'tokens', label: 'Objects' },
    D: { color: 'coral', name: 'Voices and Places', tag: 'CONNECTIONS_VOICES', icon: 'voices', label: 'Voices' },
  },

  missions: {
    A: {
      id: 'expert_a',
      topic: 'A',
      name: 'Detail Detectives',
      gallery: 'Gallery 19 · Ancient Egypt',
      narrative: 'What can one object tell us — and what can’t it?',
      sourceFact:
        'The official gallery page identifies the coffin set of Nespawershefyt, given in 1822, and other funerary objects.',
      sourceUrl: 'https://fitzmuseum.cam.ac.uk/plan-your-visit/galleries/gallery-19',
      observe:
        'Find Nespawershefyt’s coffin set. Look closely: what is it made of? What shapes, colours and pictures can you see? Then read its label.',
      discuss:
        'With your group: which of your notes are things you can see, and which are guesses? Why can’t one coffin tell us how everyone was buried?',
      evidenceFields: [
        { key: 'observation_1', label: 'Something you can see', placeholder: 'e.g. There are painted pictures along the lid' },
        { key: 'observation_2', label: 'Another thing you can see', placeholder: 'e.g. It looks like it’s made of wood' },
        { key: 'object_reference', label: 'What the label says, in a few words', placeholder: 'e.g. Coffin of Nespawershefyt, given in 1822' },
        { key: 'uncertainty', label: 'Something this object can’t tell us', placeholder: 'e.g. Whether everyone had a coffin like this' },
      ],
      hints: [
        'Start with what it’s made of, its shape or its colours.',
        'Keep what the label says separate from what you can see.',
      ],
      teachHeadline: 'Objects give us real clues — but one object can’t tell us about everyone.',
      fallback: 'If you can’t get there: use the museum’s photos of the object and answer the same questions.',
    },
    B: {
      id: 'expert_b',
      topic: 'B',
      name: 'Who Gets Remembered',
      gallery: 'Gallery 20 · Ancient Egypt',
      narrative: 'Why do some people get huge monuments, and others nothing?',
      sourceFact:
        'The Fitzwilliam notes the seven-ton sarcophagus lid of Ramesses III, given by G. B. Belzoni in 1823.',
      sourceUrl: 'https://fitzmuseum.cam.ac.uk/plan-your-visit/galleries/gallery-20',
      observe:
        'Find the giant stone lid of Ramesses III. How big is it? What is carved on it? Pick two things that make it stand out, and find out who it was made for.',
      discuss:
        'With your group: why might a king’s stone lid survive when ordinary people’s things didn’t? This is your idea, so give a reason for it.',
      evidenceFields: [
        { key: 'visible_feature_1', label: 'One thing that makes it stand out', placeholder: 'e.g. It’s much bigger than anything near it' },
        { key: 'visible_feature_2', label: 'Another thing that makes it stand out', placeholder: 'e.g. Carved figures cover the top' },
        { key: 'reasoning', label: 'What do you think it shows? (“I think … because …”)', placeholder: 'I think … because …' },
        { key: 'uncertainty', label: 'Whose life does it NOT tell us about?', placeholder: 'e.g. The workers who carved it' },
      ],
      hints: [
        'Who was it made for?',
        'Think about who is missing from it.',
      ],
      teachHeadline: 'Big monuments show us who had power — and leave lots of other people out.',
      fallback: 'If you can’t get there: use the Gallery 20 web page and its audio description.',
    },
    C: {
      id: 'expert_c',
      topic: 'C',
      name: 'Different Objects, Different Clues',
      gallery: 'Gallery 21 · Greece & Rome',
      narrative: 'Can different kinds of objects tell us different things?',
      sourceFact:
        'Gallery 21 features Greek and Roman pottery, sculpture, jewellery, coins and funerary monuments in a roughly chronological display.',
      sourceUrl: 'https://fitzmuseum.cam.ac.uk/plan-your-visit/galleries/gallery-21',
      observe:
        'Find two different kinds of object — for example a painted pot and a coin. Write down what you see on each one.',
      discuss:
        'With your group: what can each kind of object tell us about life back then? What can’t one kind of object tell us on its own?',
      evidenceFields: [
        { key: 'artifact_type_1', label: 'The first kind of object, and what it could tell us', placeholder: 'e.g. Coins — what people bought and sold' },
        { key: 'artifact_type_2', label: 'The second kind of object, and what it could tell us', placeholder: 'e.g. Grave stones — how people were remembered' },
        { key: 'comparison', label: 'How are they different as clues?', placeholder: 'One tells us … but the other tells us …' },
        { key: 'limitation', label: 'What can’t one kind of object tell us?', placeholder: 'e.g. Pots alone can’t tell us about laws' },
      ],
      hints: [
        'Look for two different kinds of object, not two of the same.',
        'Ask: what could this help us find out? What couldn’t it?',
      ],
      teachHeadline: 'Different objects answer different questions — you need more than one kind to understand a place.',
      fallback: 'If you can’t get there: use the gallery’s web page and photos.',
    },
    D: {
      id: 'expert_d',
      topic: 'D',
      name: 'Voices and Places',
      gallery: 'Gallery 24 · Rome & Ancient Sudan',
      narrative: 'Whose voices do we hear — and whose are missing?',
      sourceFact:
        'Official Gallery 24 describes Rome and Ancient Sudan objects, grave reliefs from Palmyra and a facsimile of the Dendera Zodiac.',
      sourceUrl: 'https://fitzmuseum.cam.ac.uk/plan-your-visit/galleries/gallery-24',
      observe:
        'Read the signs in the gallery. Find two places or peoples they name. Write down one question the gallery leaves you with.',
      discuss:
        'Talk with the community partner. Ask them: how can a museum be fair to people who don’t get to write the labels? Write down what they say as their view, not as a fact.',
      evidenceFields: [
        { key: 'context_1', label: 'A place or people named in the gallery', placeholder: 'e.g. Rome' },
        { key: 'context_2', label: 'Another place or people named', placeholder: 'e.g. Ancient Sudan' },
        { key: 'question_to_contributor', label: 'The question you asked the partner', placeholder: 'What did you ask?' },
        { key: 'paraphrased_reply', label: 'What they said, in your own words', placeholder: 'They think …' },
        { key: 'remaining_uncertainty', label: 'A question we still can’t answer', placeholder: 'We still don’t know …' },
      ],
      hints: [
        'Start with the gallery’s name and the big signs.',
        'What could only a person — not a label — tell you?',
      ],
      teachHeadline: 'What we learn depends on whose voices we hear — so ask who is missing.',
      fallback:
        'If the partner can’t make it: your teacher reads out their answers, clearly marked as theirs.',
      needsFacilitator: true,
    },
  },

  contributor: {
    name: 'WorldQuest Demo Collaborator',
    label: 'SIMULATED community partner — not Fitzwilliam staff',
    prompts: [
      'What can we see for ourselves, and what are we guessing?',
      'Whose story might be missing here?',
      'How could a museum sign be honest about what we don’t know?',
    ],
    defaultContribution:
      'I can tell students how people in my community talk about objects like these today, and the questions we still ask about them.',
  },

  peerTeaching: {
    prompt: 'Say one thing you found, and why it matters.',
    checkOptions: {
      A: [
        { id: 'a_ok', text: 'One object gives real clues, but it can’t tell us about everyone.', correct: true },
        { id: 'a_no', text: 'They proved everyone in ancient Egypt owned a decorated coffin.', correct: false, miss: 'Generalising from one burial' },
        { id: 'a_no2', text: 'They used the decoration to work out exactly what Nespawershefyt believed.', correct: false, miss: 'Reading beliefs straight off an object' },
        { id: 'a_no3', text: 'They showed the painting was for display in a museum, not for burial.', correct: false, miss: 'Confusing today’s display with original use' },
      ],
      B: [
        { id: 'b_ok', text: 'Big monuments show who had power — and leave many people out.', correct: true },
        { id: 'b_no', text: 'They showed all ancient people were remembered equally.', correct: false, miss: 'Assuming monuments record everyone' },
        { id: 'b_no2', text: 'They showed the lid proves Ramesses III was a popular ruler.', correct: false, miss: 'Monument = popularity' },
        { id: 'b_no3', text: 'They showed the size of the lid tells us exactly how powerful Egypt was.', correct: false, miss: 'Size = exact power' },
      ],
      C: [
        { id: 'c_ok', text: 'Different kinds of objects answer different questions.', correct: true },
        { id: 'c_no', text: 'They found one object type that explains the whole society.', correct: false, miss: 'One object type explains a society' },
        { id: 'c_no2', text: 'They showed painted pottery was only ever owned by the rich.', correct: false, miss: 'Assuming who owned things' },
        { id: 'c_no3', text: 'They showed an object keeps the same use for its whole life.', correct: false, miss: 'Objects have one fixed use' },
      ],
      D: [
        { id: 'd_ok', text: 'Listen to other people’s views, and notice whose voices are missing.', correct: true },
        { id: 'd_no', text: 'They confirmed one person’s view counts as established museum fact.', correct: false, miss: 'Treating a perspective as fact' },
        { id: 'd_no2', text: 'They showed the relief tells us everything about the person carved on it.', correct: false, miss: 'An image shows the whole person' },
        { id: 'd_no3', text: 'They found that missing voices don’t matter as long as the object survives.', correct: false, miss: 'Ignoring missing voices' },
      ],
    },
  },

  finale: {
    title: 'Fix the museum sign',
    objects: [
      { id: 'coffin_nespawershefyt', label: 'Nespawershefyt’s coffin set', gallery: 'Gallery 19', answer: 'OBJECT_EVIDENCE' },
      { id: 'lid_ramesses_iii', label: 'Sarcophagus lid of Ramesses III', gallery: 'Gallery 20', answer: 'POWER_MEMORY' },
      { id: 'gallery_21_object_types', label: 'A piece of painted pottery', gallery: 'Gallery 21', answer: 'MULTIPLE_LIVES' },
      { id: 'gallery_24_and_contributor', label: 'A grave relief from Palmyra', gallery: 'Gallery 24', answer: 'CONNECTIONS_VOICES' },
    ],
    overclaim: {
      question: 'Which sentence would be fair to put on a museum sign?',
      options: [
        { id: 'absolute', text: '“Every object tells us everything about the people who used it.”', correct: false, miss: 'Objects tell us everything' },
        { id: 'expert', text: '“If an expert says it, it must be true.”', correct: false, miss: 'Treating a perspective as fact' },
        { id: 'biggest', text: '“The biggest objects tell the most important history.”', correct: false, miss: 'Size = importance' },
        { id: 'cautious', text: '“Different objects give different clues. To understand the past we need many of them — and many points of view.”', correct: true },
      ],
    },
    compose: {
      prompt:
        'Write a better sign together. Pick sentences that mention two real objects, show that people lived different lives, say what we still don’t know, and ask visitors a question.',
      tiles: [
        { id: 't1', cat: 'evidence', text: 'Nespawershefyt’s coffin set has painted pictures you can see for yourself.' },
        { id: 't2', cat: 'evidence', text: 'The giant lid of Ramesses III shows how a powerful king was remembered.' },
        { id: 't3', cat: 'evidence', text: 'Pots, coins and carvings each tell us different things.' },
        { id: 't4', cat: 'perspectives', text: 'These objects come from many different lives — no single object speaks for everyone.' },
        { id: 't5', cat: 'uncertainty', text: 'There is a lot we still don’t know: many people left nothing behind.' },
        { id: 't6', cat: 'invite', text: 'What would you ask these objects? Your questions matter too.' },
        { id: 't7', cat: 'overclaim', text: 'Together, these objects tell us everything about the ancient world.', trap: true },
      ],
      needs: { evidence: 2, perspectives: 1, uncertainty: 1, invite: 1 },
    },
    rubric: ['Uses real evidence', 'Shows different points of view', 'Says what we don’t know', 'Everyone helped'],
  },

  collectibles: [
    {
      id: 'detail_lens', title: 'The Detail Lens', home: 'H1', color: 'violet', category: 'Evidence',
      activity: 'Find a small detail on an object and say what it tells you.',
      fact: 'Looking closely turns a glass case into real evidence.',
      promptLabel: 'The detail you found, and what it tells you',
    },
    {
      id: 'memory_stone', title: 'The Memory Stone', home: 'H2', color: 'teal', category: 'Memory',
      activity: 'Find something made to remember someone. Write one respectful question about it.',
      fact: 'Monuments keep some stories alive — and leave others out.',
      promptLabel: 'What you found, and your question',
    },
    {
      id: 'twin_tokens', title: 'The Twin Tokens', home: 'H3', color: 'sun', category: 'Compare',
      activity: 'Find two different kinds of object and say what each could tell us.',
      fact: 'Two kinds of clues are better than one.',
      promptLabel: 'Your two objects, and what each could tell us',
    },
    {
      id: 'listening_shell', title: 'The Listening Shell', home: 'H4', color: 'coral', category: 'Voices',
      activity: 'Write a good question to ask the community partner.',
      fact: 'People can tell you things no label can.',
      promptLabel: 'Your question for a community partner',
    },
    {
      id: 'curator_lantern', title: 'The Curator’s Lantern', home: 'H5', color: 'lantern', category: 'Reflect',
      activity: 'Write a 12-word museum sign that doesn’t claim too much.',
      fact: 'Honest signs make people curious.',
      promptLabel: 'Your 12-word sign',
    },
  ],

  master: {
    id: 'guardian_of_stories',
    title: 'Guardian of Stories',
    text: 'Collect every card as a class to unlock this one.',
    fact: 'Stories last when a whole class looks after them.',
  },

  reflection: [
    'What did a teammate teach you that you didn’t know?',
    'What would you still like to ask about these objects?',
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
 * Everything a teacher can author (title, story, the expert tracks, peer-teaching checks,
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
TEMPLATES.lost_museum.meta = { id: 'lost_museum', name: 'The Lost Museum', blurb: 'Fitzwilliam Museum, Cambridge · four galleries · 20 students' };
TEMPLATES.lost_museum.questDefaults = { objective: 'Tell the difference between what objects show and what we guess', venue: 'The Fitzwilliam Museum, Cambridge', duration: 60, audience: { kind: 'secondary', ages: '13–16' },
  structure: { tracks: 4, classSize: 20, expertGroup: 5 },
  next: { enabled: true, activity: 'Drawing class: draw an object from the trip', provider: 'Riverside Art Studio', org: 'Example art studio (simulated)', when: 'Thu 3 Dec, 2–3:30pm', bring: 'Your notes and your team’s museum sign', fallback: 'A drawing lesson in class with the art teacher', staff: '2', unlock: 'all', status: 'none', request: '', counterWhen: '' } };
/* How each track is assessed: check-in at the place, what evidence students submit, an optional
   multiple-choice check with a pass mark, and who verifies it. */
SEED.defaultAssess = () => ({ checkin: 'photo_teacher', evidence: 'notes', quiz: [], pass: 0, verify: 'teacher' });
SEED.topics.forEach((t) => { TEMPLATES.lost_museum.missions[t].assess = SEED.defaultAssess(); });
/* Something students can actually photograph at each station of the example quest. */
Object.entries({ A: 'Nespawershefyt’s coffin set', B: 'the sarcophagus lid of Ramesses III', C: 'a piece of painted pottery', D: 'a grave relief from Palmyra' })
  .forEach(([t, k]) => { TEMPLATES.lost_museum.missions[t].keyObject = k; });
/* Success criteria: what a good answer includes. The misconception analysis checks answers against these. */
Object.entries({
  A: ['Names at least two things you can really see on the coffin set.',
      'Keeps what they can see apart from what they’re guessing.',
      'Says that one coffin can’t show how everyone was buried.'],
  B: ['Describes something you can see on the lid (size, carving, stone).',
      'Explains the lid shows how a king wanted to be remembered — not that he was popular.',
      'Names people the lid leaves out (e.g. workers, women, children).'],
  C: ['Names two different kinds of object and what each could tell us.',
      'Explains that different objects answer different questions.',
      'Says one kind of object can’t show everything about a place.'],
  D: ['Names places or peoples from the gallery signs.',
      'Writes down the partner’s answer as their view, not as a fact.',
      'Asks at least one real question we still can’t answer.'],
}).forEach(([t, c]) => { TEMPLATES.lost_museum.missions[t].criteria = c; });
SEED.ASSESS_TEXT = {
  checkin: { photo_ai: 'Photo of the object, checked by AI (sent to the AI, then discarded)', photo_teacher: 'Photo of the object, checked by the educator', qr: 'QR clue card or facilitator code', none: 'No check-in' },
  evidence: { notes: 'Written field notes', photo: 'A photo of the object', notes_photo: 'Field notes and a photo' },
  verify: { teacher: 'Educator verifies', partner: 'Community partner verifies', auto: 'Automatic when the quiz is passed' },
};

/* A short chip label from a track name: skip a leading "The/A/An", keep whole words, about 22 characters. */
SEED.shortLabel = (name) => {
  const words = String(name || '').replace(/[“”"]/g, '').trim().split(/\s+/).filter(Boolean);
  while (words.length > 1 && /^(the|a|an)$/i.test(words[0])) words.shift();
  let out = '';
  for (const w of words) { const next = out ? out + ' ' + w : w; if (next.length > 22 && out) break; out = next; }
  return out.replace(/[,:;–-]+$/, '');
};
/* The label to show on a track chip: the track's own short label, unless it's empty, just "The", or out of date. */
SEED.trackLabel = (t) => { const m = SEED.topicMeta[t] || {}, l = m.label || ''; return !l || /^(the|a|an|track [a-f])$/i.test(l) ? SEED.shortLabel((SEED.missions[t] || {}).name) || 'Track ' + t : l; };
/* Build a track (mission + its topic label + its peer-teaching check) from flat, teacher-friendly fields. */
SEED.buildTrack = (t, f) => {
  const prompts = (f.evidence || []).map((x) => String(x).trim()).filter(Boolean);
  return {
    mission: {
      id: 'expert_' + t.toLowerCase(), topic: t,
      name: f.name || '', gallery: f.location || '', keyObject: f.keyObject || '',
      narrative: f.narrative || '', observe: f.observe || '', discuss: f.discuss || '',
      sourceFact: f.sourceFact || '', sourceUrl: f.sourceUrl || '',
      evidenceFields: prompts.map((label, i) => ({ key: (f.evidenceKeys || [])[i] || 'f' + (i + 1), label, placeholder: '' })),
      hints: (f.hints || []).map((x) => String(x).trim()).filter(Boolean),
      criteria: (f.criteria || []).map((x) => String(x).trim()).filter(Boolean),
      teachHeadline: f.teachHeadline || '', fallback: f.fallback || '',
      needsFacilitator: !!f.needsContributor,
      stationCode: STATION[t][0], backupCode: String(f.backupCode || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || SEED.newBackupCode(),
      assess: { ...SEED.defaultAssess(), ...(f.assess || {}) },
      refPhoto: typeof f.refPhoto === 'string' && f.refPhoto.startsWith('data:image/') && f.refPhoto.length < 120000 ? f.refPhoto : null,
    },
    label: SEED.shortLabel(f.name) || 'Track ' + t,
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
    evidence: m.evidenceFields.map((e) => e.label), evidenceKeys: m.evidenceFields.map((e) => e.key), hints: m.hints, criteria: m.criteria || [], fallback: m.fallback, teachHeadline: m.teachHeadline,
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
/* The finale ("final team challenge") is a list of steps the teacher builds:
   - choice: a multiple-choice question the team answers together (tick the right option(s));
   - write:  a question the team answers in their own words, plus "what a good answer includes",
             which the teacher ticks when approving. */
let finSeq = 0;
const stepId = () => 'fs' + Date.now().toString(36) + (finSeq++);
SEED.finaleStep = (type) => (type === 'write' ? { id: stepId(), type: 'write', prompt: '', checks: [''] }
  : { id: stepId(), type: 'choice', question: '', options: [{ id: 'o1', text: '', correct: true }, { id: 'o2', text: '', correct: false }] });
/* Old saves and templates used fixed puzzles; turn them into steps once. */
SEED.migrateFinale = (c) => {
  const f = c.finale || (c.finale = {});
  if (Array.isArray(f.steps)) return c;
  const steps = [];
  if (f.overclaim && f.overclaim.options) steps.push({ id: 'fs_choice', type: 'choice', question: f.overclaim.question || 'Which sentence is fair?', options: f.overclaim.options.map((o) => ({ ...o })) });
  if (f.compose) steps.push({ id: 'fs_write', type: 'write', prompt: f.compose.prompt || 'Write your team’s answer together.', checks: (f.rubric || []).slice() });
  f.steps = steps.length ? steps : [SEED.finaleStep('choice'), SEED.finaleStep('write')];
  f.intro = f.intro || '';
  delete f.overclaim; delete f.compose; delete f.rubric;
  return c;
};
SEED.buildFinale = (c, f) => {
  const old = (c.finale.steps || []), txt = (v) => String(v == null ? '' : v).trim();
  c.finale.title = txt(f.title) || c.finale.title || 'Final team challenge';
  if (typeof f.intro === 'string') c.finale.intro = txt(f.intro);
  if (Array.isArray(f.steps)) c.finale.steps = f.steps.map((x) => {
    const prev = old.find((o) => o.id === x.id) || {};
    if (x.type === 'write') return { id: x.id || stepId(), type: 'write', prompt: txt(x.prompt || x.question), checks: (x.checks || []).map(txt).filter(Boolean) };
    const opts = (x.options || []).map((o, i) => { const was = (prev.options || []).find((p2) => p2.text === txt(o.text)) || {};
      return { id: was.id || 'o' + (i + 1), text: txt(o.text), correct: !!o.correct, ...(was.miss || o.miss ? { miss: was.miss || o.miss } : {}) }; }).filter((o) => o.text);
    return { id: x.id || stepId(), type: 'choice', question: txt(x.question), options: opts };
  });
};
SEED.finaleFields = (c) => ({ title: c.finale.title, intro: c.finale.intro || '', steps: JSON.parse(JSON.stringify(c.finale.steps || [])) });
/* Everything the teacher ticks when approving a team's answer. */
SEED.migrateFinale(TEMPLATES.lost_museum);
Object.assign(TEMPLATES.lost_museum.finale, { intro: 'Your team has found out a lot. Now use it to fix the museum’s sign.' });
TEMPLATES.lost_museum.finale.steps[1] = { id: 'fs_write', type: 'write', prompt: 'Write a better museum sign together, in 3 to 5 sentences.',
  checks: ['Mentions at least two real objects', 'Shows that people lived different lives', 'Says what we still don’t know', 'Asks visitors a question'] };
SEED.finaleChecks = (c) => (c.finale.steps || []).filter((x) => x.type === 'write').flatMap((x) => (x.checks || []).map((t, i) => ({ key: x.id + ':' + i, text: t, stepId: x.id })));

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
  c.finale = { title: 'Final team challenge', intro: '', objects: [], steps: [SEED.finaleStep('choice'), SEED.finaleStep('write')] };
  SEED.syncFinaleObjects(c);
  c.collectibles = []; // a blank quest starts with no cards; add them if you want them
  c.questDefaults = {}; // no example goal, venue or next experience
  c.reflection = [''];
  return c;
})();

/* What still has to be filled in before students can play. */
SEED.contentProblems = (c) => {
  const p = [];
  if (!c.title || !c.title.trim()) p.push('Give the quest a title');
  if (SEED.topics.length < 2) p.push('Add at least 2 tracks so students can teach each other');
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
  const fs = c.finale.steps || [];
  if (!fs.length) p.push('Finale: add at least one step');
  fs.forEach((x, i) => {
    const n = `Finale step ${i + 1}`;
    if (x.type === 'choice') {
      if (!x.question) p.push(`${n}: write the question`);
      if ((x.options || []).length < 2 || !x.options.some((o) => o.correct) || !x.options.some((o) => !o.correct)) p.push(`${n}: at least one right and one wrong answer`);
    } else {
      if (!x.prompt) p.push(`${n}: write the question`);
      if (!(x.checks || []).filter(Boolean).length) p.push(`${n}: say what a good answer includes`);
    }
  });
  if (c.collectibles.some((x) => !x.title || (x.kind === 'bonus' && !x.activity))) p.push('Cards: a name for each card (and an activity for bonus cards)');
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

SEED.genericDisclaimer = 'Story and awards are fiction, made for learning. Book real visits with the venue.';
SEED.partnerDefaults = { name: 'WorldQuest Demo Collaborator', org: 'Simulated community partner' };

/* The object students photograph to check in: the track's key object, or its finale object. */
SEED.keyObjectOf = (t) => {
  const m = SEED.missions[t];
  return m.keyObject || (SEED.finale.objects.find((o) => o.answer === SEED.topicMeta[t].tag) || {}).label || m.name || 'the object';
};

/* Collectibles: each home team's card has a rule for how it is earned.
   bonus = team submits the bonus activity and the educator approves it (the original behaviour)
   finale = the team's final challenge is approved · experts = every expert in the team is verified
   track = the team's expert for one track is verified · egg = hidden: a phone tilted up at the location
   teacher = the educator awards it by hand */
SEED.EARN_TEXT = { track: 'Students finish their track’s tasks (each gets their own)', experts: 'A team’s experts all finish their tracks', finale: 'A team solves the final challenge',
  bonus: 'A team does a bonus activity you approve', egg: 'A student finds it by tilting their phone up', teacher: 'You award it to a team' };
SEED.defaultEarn = () => ({ kind: 'bonus', track: 'A', hidden: false, evolves: true });
TEMPLATES.lost_museum.collectibles.forEach((c) => { Object.assign(c, SEED.defaultEarn()); delete c.home; });
TEMPLATES.lost_museum.collectibles.unshift(...['A', 'B', 'C', 'D'].map((t, i) => ({ id: 'badge_' + t.toLowerCase(), title: TEMPLATES.lost_museum.topicMeta[t].name + ' badge', color: ['violet', 'teal', 'sun', 'coral'][i], category: 'Badge',
  kind: 'track', track: t, hidden: false, evolves: true, activity: '', fact: 'You finished your track and taught your team.', promptLabel: '' })));
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
  const raw = Number(st && st.tracks), t = Math.max(1, Math.min(6, Number.isFinite(raw) && st && st.tracks != null ? raw : 4)); // 0 tracks = one hidden blank track
  const n = Math.max(t, 2, Math.min(60, Number(st && st.classSize) || 20));
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
/* Make a quest's content match its structure: one track per track id (A, B, C… — ids, not a fixed count). */
SEED.ensureContentShape = (c) => {
  SEED.migrateFinale(c);
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
  c.collectibles = c.collectibles || [];
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
        beliefs: { crit: 1, title: 'Reading beliefs straight off the object', explain: 'Treats the decoration as proof of exactly what people believed, rather than evidence that needs other sources.', ask: 'What else would we need, besides the coffin, to know what Nespawershefyt believed?' },
        general: { crit: 2, title: 'One burial stands for everyone', explain: 'Generalises from one high-status coffin to all Egyptians.', ask: 'Who might not have had a coffin like this — and how could we find out?' } } },
    B: { simMiss: 'b_no2', field: 'uncertainty', strengths: 'Several students noticed that workers, women and children are missing from the monument.',
      answers: [
        { text: 'Ordinary workers who built the tomb aren’t remembered here.' },
        { text: 'It shows Ramesses was loved by everyone, so it covers most people.', theme: 'popular' },
        { text: 'It doesn’t tell us about women or children in the palace.' },
        { text: 'Everyone important is on it, so it tells us about the whole of Egypt.', theme: 'popular' },
        { text: 'Because it’s so big, Ramesses must have been the most powerful king ever.', theme: 'size' }],
      themes: {
        popular: { crit: 1, title: 'A monument means the ruler was popular', explain: 'Reads a royal monument as evidence of popularity or of everyone’s experience, not as how power chose to be remembered.', ask: 'Who decided what went on this lid — and who didn’t get a say?' },
        size: { crit: 0, title: 'Bigger means more powerful', explain: 'Uses size as a direct measure of power instead of one clue among several.', ask: 'What else, besides size, could tell us how powerful a ruler was?' } } },
    C: { simMiss: 'c_no', field: 'limitation', strengths: 'Good comparisons of what different object types can and can’t answer.',
      answers: [
        { text: 'Pottery only tells us about some uses, not about laws or beliefs.' },
        { text: 'Painted pottery was only for rich people, so it only tells us about the rich.', theme: 'rich' },
        { text: 'One type can’t show the whole society.' },
        { text: 'There isn’t really a limitation if you look at enough pots.', theme: 'more' },
        { text: 'Pots get reused, so the use we see might not be the first one.' }],
      themes: {
        rich: { basis: 'Not supported by your approved sources: they don’t say who owned painted pottery.', title: 'Assuming who owned things', explain: 'States who used an object type as fact without evidence from the gallery.', ask: 'What in the case would tell us who actually used this pottery?' },
        more: { crit: 2, title: 'More of the same fills every gap', explain: 'Thinks many examples of one object type can answer every question about a society.', ask: 'What questions could a thousand pots still not answer?' } } },
    D: { simMiss: 'd_no', field: 'remaining_uncertainty', strengths: 'Strong open questions about missing voices and how objects arrived in Cambridge.',
      answers: [
        { text: 'We still don’t know how the person on the relief saw themselves.' },
        { text: 'None — the partner told us what it means, so now we know.', theme: 'fact' },
        { text: 'Whose voices from Palmyra are missing from the gallery?' },
        { text: 'The partner is from the community so their view is the official answer.', theme: 'fact' },
        { text: 'How did some of these objects end up in Cambridge?' }],
      themes: {
        fact: { crit: 1, title: 'Treating one perspective as the answer', explain: 'Records the partner’s view as settled fact instead of one perspective to weigh with the evidence.', ask: 'How is a perspective different from a fact — and why do we need both?' } } },
  },
};


/* ================= Egypt Detectives: the default example — two students, two objects ================= */
TEMPLATES.two_explorers = (() => {
  const base = JSON.parse(JSON.stringify(TEMPLATES.lost_museum));
  const A = base.missions.A, B = base.missions.B;
  const c = {
    title: 'Egypt Detectives',
    subtitle: 'Two objects, two detectives, one label',
    story: { opening: 'Two objects from ancient Egypt, two detectives, one question: what can old objects really tell us? Each of you looks closely at one object. Then you meet up, teach each other what you found, and write a label for the museum together.',
      rules: ['Stay together in the gallery', 'Look with your eyes, not your hands', 'Ask an adult if you need help'] },
    topicMeta: {
      A: { color: 'violet', name: 'The Painted Coffin', tag: 'OBJECT_EVIDENCE', icon: 'lens', label: 'Coffin' },
      B: { color: 'teal', name: 'The King’s Stone Lid', tag: 'POWER_MEMORY', icon: 'monument', label: 'Lid' },
    },
    missions: {
      A: { ...A, name: 'The Painted Coffin', keyObject: 'Nespawershefyt’s coffin set',
        narrative: 'What can a coffin tell us about the person inside?',
        observe: 'Find the painted coffin set of Nespawershefyt in Gallery 19. Look closely at the colours, the pictures and the shape. Then read its label.',
        discuss: 'Look at your notes. Which are things you can see, and which are guesses?',
        evidenceFields: [
          { key: 'seen', label: 'Two things you can see on it', placeholder: 'e.g. Painted faces, and pictures in rows' },
          { key: 'label', label: 'What the label tells you', placeholder: 'e.g. It was given to the museum in 1822' },
          { key: 'cant_tell', label: 'One thing it can’t tell us', placeholder: 'e.g. What Nespawershefyt was like as a person' }],
        criteria: ['Names two things you can really see.', 'Keeps what they can see apart from guesses.', 'Says one thing the coffin can’t tell us.'],
        hints: ['Look at the colours first. Then the pictures.', 'What does the label say that you couldn’t see for yourself?'],
        teachHeadline: 'The coffin gives real clues — but it can’t tell us everything about the person, or about everyone else.',
        fallback: 'If you can’t get there: use the museum’s photos of the coffin and answer the same questions.',
        needsFacilitator: false },
      B: { ...B, name: 'The King’s Stone Lid', keyObject: 'the stone lid of Ramesses III',
        narrative: 'Why did a king get a giant stone lid?',
        observe: 'Find the huge stone lid of Ramesses III in Gallery 20. How big is it? What is carved on it? Read the label to find out how it came to the museum.',
        discuss: 'Ask yourself: who is remembered by this lid — and who isn’t?',
        evidenceFields: [
          { key: 'stands_out', label: 'Two things that make it stand out', placeholder: 'e.g. It’s huge, and covered in carvings' },
          { key: 'made_for', label: 'Who it was made for', placeholder: 'e.g. King Ramesses III' },
          { key: 'left_out', label: 'Who it doesn’t tell us about', placeholder: 'e.g. The workers who carved it' }],
        criteria: ['Describes something you can see on the lid.', 'Says the lid shows how a king was remembered — not that everyone loved him.', 'Names people the lid leaves out.'],
        hints: ['Stand back. How big is it compared with you?', 'Who made it? Who is it about? Are they the same people?'],
        teachHeadline: 'Big monuments show who had power — ordinary people were remembered differently, or not at all.',
        fallback: 'If you can’t get there: use the Gallery 20 web page and its photos.',
        needsFacilitator: false,
        assess: { checkin: 'photo_teacher', evidence: 'notes', verify: 'teacher', pass: 2, quiz: [
          { q: 'Whose stone lid is it?', o: ['Ramesses III', 'Nespawershefyt', 'Cleopatra'], a: 0 },
          { q: 'Who gave it to the museum?', o: ['G. B. Belzoni', 'A school class', 'It doesn’t say'], a: 0 }] } },
    },
    peerTeaching: { prompt: 'Say one thing you found, and why it matters.', checkOptions: {
      A: [{ id: 'a_ok', text: 'The coffin gives real clues, but it can’t tell us everything.', correct: true },
        { id: 'a_no', text: 'The coffin proves every Egyptian had a painted coffin.', correct: false, miss: 'One object stands for everyone' },
        { id: 'a_no2', text: 'The pictures tell us exactly what Nespawershefyt believed.', correct: false, miss: 'Reading beliefs straight off an object' }],
      B: [{ id: 'b_ok', text: 'The lid shows how a powerful king was remembered — not how ordinary people were.', correct: true },
        { id: 'b_no', text: 'The lid shows that everyone loved the king.', correct: false, miss: 'Monument = popularity' },
        { id: 'b_no2', text: 'The bigger the lid, the more his life mattered.', correct: false, miss: 'Size = importance' }],
    } },
    finale: {
      title: 'Write the label together',
      objects: [
        { id: 'coffin_nespawershefyt', label: 'Nespawershefyt’s coffin set', gallery: 'Gallery 19', answer: 'OBJECT_EVIDENCE' },
        { id: 'lid_ramesses_iii', label: 'The stone lid of Ramesses III', gallery: 'Gallery 20', answer: 'POWER_MEMORY' }],
      overclaim: { question: 'Which sentence is fair to put on the label?', options: [
        { id: 'fair', text: '“These two objects show real details — and how differently people were remembered.”', correct: true },
        { id: 'all', text: '“These two objects tell us everything about ancient Egypt.”', correct: false, miss: 'Objects tell us everything' },
        { id: 'size', text: '“The king’s lid is bigger, so his life mattered more.”', correct: false, miss: 'Size = importance' }] },
      compose: {
        prompt: 'Build a short label for the two objects. Pick one sentence about each object, one about how people were remembered, one about what we still don’t know, and one question for visitors.',
        tiles: [
          { id: 't1', cat: 'evidence', text: 'Nespawershefyt’s coffin is covered in painted pictures you can see up close.' },
          { id: 't2', cat: 'evidence', text: 'The stone lid of Ramesses III is huge and carved for a king.' },
          { id: 't3', cat: 'perspectives', text: 'Together they show very different ways of being remembered.' },
          { id: 't4', cat: 'uncertainty', text: 'We don’t know how most ordinary Egyptians were buried — many left nothing behind.' },
          { id: 't5', cat: 'invite', text: 'What would you like to ask these two objects?' },
          { id: 't6', cat: 'overclaim', text: 'These objects show how every Egyptian lived and died.', trap: true }],
        needs: { evidence: 2, perspectives: 1, uncertainty: 1, invite: 1 }, max: 5 },
      rubric: ['Uses both objects', 'Says what we don’t know', 'Both students helped'],
    },
    collectibles: [
      { id: 'coffin_badge', title: 'Coffin Expert', color: 'violet', category: 'Badge', kind: 'track', track: 'A', hidden: false, evolves: true,
        activity: '', fact: 'You looked closely at a coffin over 2,500 years old.', promptLabel: '' },
      { id: 'lid_badge', title: 'Lid Expert', color: 'teal', category: 'Badge', kind: 'track', track: 'B', hidden: false, evolves: true,
        activity: '', fact: 'You found out who a king’s giant lid was made for.', promptLabel: '' },
      { id: 'label_writers', title: 'Label Writers', color: 'sun', category: 'Teamwork', kind: 'finale', track: 'any', hidden: false, evolves: true,
        activity: '', fact: 'Two detectives, one honest label.', promptLabel: '' }],
    master: { id: 'egypt_detectives', title: 'Egypt Detectives Award', text: 'Earn every card as a class to unlock it.', fact: 'You looked closely, taught each other and wrote an honest label.' },
    reflection: ['What did your partner teach you?', 'What would you still like to find out?'],
    meta: { id: 'two_explorers', name: 'Egypt Detectives', blurb: 'Fitzwilliam Museum · two objects · two students' },
    questDefaults: { objective: 'Notice what objects can and can’t tell us about the past', venue: 'The Fitzwilliam Museum, Cambridge', duration: 45, audience: { kind: 'secondary', ages: '13–16' },
      structure: { tracks: 2, classSize: 2, expertGroup: 1 }, next: { ...TEMPLATES.lost_museum.questDefaults.next } },
    sources: [
      { id: 'S1', kind: 'official', title: A.gallery + ' · official page', url: A.sourceUrl, text: A.sourceFact },
      { id: 'S2', kind: 'official', title: B.gallery + ' · official page', url: B.sourceUrl, text: B.sourceFact },
      { id: 'S3', kind: 'partner', title: 'Community partner contribution', url: '', text: '' }],
  };
  return c;
})();

SEED.migrateFinale(TEMPLATES.two_explorers);
Object.assign(TEMPLATES.two_explorers.finale, { intro: 'You’ve both found out something. Now put it together and write the museum label.' });
TEMPLATES.two_explorers.finale.steps[1] = { id: 'fs_write', type: 'write', prompt: 'Write the label for the two objects, in 2 to 4 sentences.',
  checks: ['Says something about each object', 'Says what we still don’t know', 'Asks visitors a question'] };
