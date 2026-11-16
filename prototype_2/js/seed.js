/* WorldQuest prototype_2 — canonical seeded demo content.
 * Derived from fitzwilliam_seed_quest.json (see ../data/). All story elements are
 * fiction; gallery anchors come from official Fitzwilliam Museum pages and must be
 * re-checked before any real visit. No museum partnership is claimed.
 */
'use strict';

const SEED = {
  questId: 'fitz-lost-museum',
  title: 'The Lost Museum',
  subtitle: 'A Mystery of Four Perspectives',
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
        { id: 'a_no', text: 'They proved everyone in ancient Egypt owned a decorated coffin.', correct: false },
      ],
      B: [
        { id: 'b_ok', text: 'They showed a monumental object commemorates power — and leaves gaps in whose history survives.', correct: true },
        { id: 'b_no', text: 'They showed all ancient people were remembered equally.', correct: false },
      ],
      C: [
        { id: 'c_ok', text: 'They compared two object types that answer different historical questions.', correct: true },
        { id: 'c_no', text: 'They found one object type that explains the whole society.', correct: false },
      ],
      D: [
        { id: 'd_ok', text: 'They gathered a contributor’s perspective and named whose voices might be missing.', correct: true },
        { id: 'd_no', text: 'They confirmed one person’s view counts as established museum fact.', correct: false },
      ],
    },
  },

  finale: {
    title: 'Restore the Exhibition Introduction',
    objects: [
      { id: 'coffin_nespawershefyt', label: 'Nespawershefyt’s coffin set', gallery: 'Gallery 19', answer: 'OBJECT_EVIDENCE' },
      { id: 'lid_ramesses_iii', label: 'Sarcophagus lid of Ramesses III', gallery: 'Gallery 20', answer: 'POWER_MEMORY' },
      { id: 'gallery_21_object_types', label: 'Gallery 21 object types', gallery: 'Gallery 21', answer: 'MULTIPLE_LIVES' },
      { id: 'gallery_24_and_contributor', label: 'Gallery 24 + contributor voices', gallery: 'Gallery 24', answer: 'CONNECTIONS_VOICES' },
    ],
    overclaim: {
      question: 'Which exhibition principle is appropriately cautious?',
      options: [
        { id: 'absolute', text: '“Every object tells us everything about every person who used it.”', correct: false },
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
    text: 'Bring all five discoveries together to unlock the class’s master collectible.',
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
    EXPERT: { label: 'Expert missions', desc: 'Expert groups investigate four galleries.' },
    PEER_TEACH: { label: 'Peer teaching', desc: 'Experts return home and teach their team.' },
    FINALE: { label: 'Finale', desc: 'Teams restore the exhibition introduction.' },
    REFLECTION: { label: 'Reflection', desc: 'Individual reflections and debrief.' },
    COMPLETE: { label: 'Complete', desc: 'Quest complete — look up and celebrate.' },
  },
};

SEED.byId = Object.fromEntries(SEED.participants.map((p) => [p.id, p]));
SEED.homeMembers = (h) => SEED.participants.filter((p) => p.home === h);
SEED.expertOf = (h, topic) => SEED.participants.find((p) => p.home === h && p.topic === topic);
