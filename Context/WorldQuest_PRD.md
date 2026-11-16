# WorldQuest
## Product requirements document — simplified version 3

**Date:** 16 November 2026  
**Status:** proposed product specification  
**Purpose:** help educators and community partners create gamified real-world learning adventures.

## 1. Product concept

WorldQuest is a platform where educators collaborate with museums, community groups, gardens, charities, or local practitioners to create learning adventures in real places.

An educator describes what students should learn, where the activity will happen, and how the community partner will participate. AI generates an editable world with a storyline, checkpoints, collaborative tasks, and rewards. The educator reviews the plan with the partner before launching it.

Students join in teams, explore their surroundings, talk to people, solve tasks together, and contribute something relevant to the partner. The app gives short instructions and records progress; most of the activity happens away from the screen.

**Educator loop:** plan with a partner → generate a world → customise and approve → launch → review learning and feedback.

**Student loop:** discover a task → explore and talk → work together → record a finding → unlock the next task → share a final contribution.

### What “community involvement” means

A partner helps shape the activity, contributes local knowledge, and gives feedback on student work. They might also host a short conversation or demonstration. A separate expert appointment is not compulsory for every mission.

The platform supports the relationship between educators and partners. The first version does not need a public expert marketplace, elaborate booking system, or separate partner app. Educators can coordinate with partners directly and record the agreed details in WorldQuest.

## 2. Problem and goals

Educators need a practical way to connect lessons with real places and people. Partners have knowledge and contexts that can make learning meaningful, but planning a good activity together takes effort. Students need reasons to observe, discuss, and collaborate rather than simply answer questions on a screen.

The product aims to:

- Make it easier to create and adapt real-world learning activities.
- Make community participation part of the activity design.
- Encourage students to learn from their surroundings and one another.
- Use gamification to reward discovery, cooperation, and improvement.
- Let the same platform work across subjects, venues, and student needs.

These are product goals to validate through a pilot, not established outcomes.

## 3. Users and responsibilities

| User | Responsibility |
|---|---|
| Educator | Sets learning goals, builds the world, agrees activities with the partner, supervises students, and reviews learning. |
| Community partner | Helps choose relevant locations and activities, supplies knowledge or resources, confirms what is feasible, and offers feedback. |
| Students | Explore in teams, gather observations, exchange ideas, complete tasks, and explain what they learned. |

Initial testing can use adult students. School use requires the educator's normal institutional arrangements for supervision, permissions, and safeguarding.

## 4. Example one: a museum adventure

### “The Missing Story” — proposed Fitzwilliam Museum quest

**Learning goal:** look closely at objects, distinguish observations from interpretations, and explain ideas using evidence.

**Community partner:** a willing museum learning team or educator. The partner helps select suitable objects and sources, reviews the route, and agrees how to contribute. This is a proposed collaboration, not a confirmed museum project.

**Story:** students become junior curators creating a small discovery trail for other learners.

| Task | What students do | Collaboration and community involvement |
|---|---|---|
| 1. Look closely | Examine an approved object or artwork. Sketch or describe three details. | Each teammate notices something different before the group compares observations. |
| 2. Find the context | Read the approved label or source material and compare it with the team's first interpretation. | One learner explains the source while another identifies what it does and does not support. |
| 3. Learn from a person | Ask an arranged museum educator a question, or discuss a museum-provided prompt with a facilitator. | Students paraphrase what they understood and explain how it changes their interpretation. |
| 4. Create a discovery card | Write a short description and a question that encourages another team to look more closely. | Another team tries the card and suggests one improvement. |
| 5. Share the trail | Present the revised card to the class and agreed museum contact. | The partner gives feedback when available; any public use needs separate agreement. |

**Gamification:** each task unlocks a story fragment or fictional Curator Guardian. The team completes its exhibition when it combines observations, context, and another person's perspective.

**Final output:** a draft visitor discovery card or small learner-created trail. It is not presented as an official museum resource unless the museum approves it.

## 5. Example two: a local community adventure

### “Our Growing Neighbourhood” — proposed community-garden quest

**Learning goal:** understand how a shared green space serves different people and use observations and community knowledge to propose a useful contribution.

**Community partner:** a willing neighbourhood gardening group or residents' association. This is an illustrative partner type; no specific organisation has been confirmed.

**Story:** students become garden explorers helping the group make its space easier for new visitors to understand.

| Task | What students do | Collaboration and community involvement |
|---|---|---|
| 1. Explore the space | Observe approved plants, signs, paths, and shared areas without disturbing them. | Teammates investigate different features and compare what they noticed. |
| 2. Meet a gardener | Join a short arranged conversation or demonstration about how the space is used and maintained. | Students ask questions and check their assumptions against the gardener's experience. |
| 3. Choose something useful | Consider partner-agreed options: a plant information card, welcoming sign draft, or beginner activity sheet. | The team discusses which option meets the group's actual needs. |
| 4. Make and test | Create a paper prototype and ask consenting volunteers or another team to try it. | Different learners write, sketch, explain, and collect feedback. |
| 5. Improve and share | Revise the prototype and present it to the gardening group. | The group comments on accuracy and usefulness and decides whether to use it. |

**Gamification:** teams collect fictional Garden Guardians for observation, listening, and cooperation. A guardian can evolve when the team improves its work after feedback.

**Final output:** a small educational resource requested by the group. Physical gardening work is optional and only included if the partner approves the task, materials, supervision, and timing.

Both examples use the same product engine. The educator changes the setting, learning goals, partner input, storyline, and tasks.

## 6. Educator journey — in collaboration with the community

| Step | Educator and partner activity | What the app does |
|---|---|---|
| 1. Agree the activity | Decide the learning goal, available locations, partner involvement, and useful final output. | Provides a short planning form. |
| 2. Describe the world | Enter student age range, group size, time, materials, access needs, theme, and approved resources. | Summarises the brief and identifies missing essentials. |
| 3. Generate | Ask AI to turn the brief into an adventure. | Creates a storyline, mission cards, roles, checkpoints, and a final task. |
| 4. Customise | Edit through chat or directly: “Make this 30 minutes,” “Add a team exchange,” or “Replace this location.” | Updates the proposed plan and highlights changes. |
| 5. Review together | Check accuracy, feasibility, partner commitments, and suitability for students. | Offers a preview and review checklist; publication remains an educator action. |
| 6. Launch | Share the session code, form teams, and explain boundaries. | Opens the student experience and progress dashboard. |
| 7. Facilitate | Respond to questions and adjust when a location or participant becomes unavailable. | Shows progress and allows teacher-controlled substitutions. |
| 8. Review and reuse | Look at evidence, reflections, and partner feedback. | Saves a reusable world; a new session needs renewed confirmation of partner availability. |

## 7. Feature requirements: educator interface

**Must-have** means needed for the first functional pilot. **Next** means useful after the core works.

| ID | Feature | What it should look like and do | Priority |
|---|---|---|---|
| E1 | My Worlds | Cards showing title, topic, partner, draft/published status, and actions to open, duplicate, or archive. | Must-have |
| E2 | Partner planning form | Simple fields for partner name, agreed role, approved locations/resources, contact arrangements, final output, and feedback plan. Contact details remain private. | Must-have |
| E3 | AI world builder | Chat beside a visual preview. Accept a brief and pasted teaching material; generate editable mission cards. | Must-have |
| E4 | Mission editor | Edit instructions, objective, location, team roles, evidence required, collaboration prompt, accessible alternative, and reward. | Must-have |
| E5 | Map and task sequence | Place approved checkpoints on a simple map/board; provide a list view; set mission order or prerequisites. | Must-have |
| E6 | Community participation settings | Add an arranged conversation, demonstration, partner-provided resource, or feedback stage. Record a fallback if the person is unavailable. | Must-have |
| E7 | Theme and appearance | Choose a visual theme and preview generated assets. Show generation status and allow a simple fallback. | Must-have; custom generation depends on provider access |
| E8 | Preview and approval | Preview the student journey and printable tasks. Check that locations, content, and partner arrangements are confirmed before publishing. | Must-have |
| E9 | Session dashboard | Show teams, current tasks, submissions, help requests, and feedback. Start, pause, end, or adjust a session with a recorded reason. | Must-have |
| E10 | Learning and partner feedback | View student work by objective; add educator feedback and clearly attributed partner comments; allow revisions. | Must-have |
| E11 | Reuse and adapt | Duplicate a world without copying student data. Change the audience, duration, location, or partner arrangements. | Must-have |
| E12 | Partner review link | Let an invited partner inspect the draft or comment on submitted work through scoped access. | Next |
| E13 | Shared template collection | Reuse partner-approved activity structures within their permitted scope. | Next |

### Key acceptance checks

- A teacher can create, edit, preview, and publish a world without changing code.
- AI cannot invent a confirmed partner, approved location, or commitment from a real person.
- Editing a running world's draft does not silently change students' published instructions.
- A collaboration task states what students must exchange or create together.
- Partner comments are labelled accurately, including when entered by the educator on the partner's behalf.
- Duplicate worlds contain no previous students' submissions or private personal details.

## 8. Student journey

| Step | What students experience |
|---|---|
| Join | Enter a session code, choose a team alias, and see the shared challenge. |
| Get ready | Receive roles, meeting instructions, and the first short mission. |
| Explore | Go to the approved location and investigate the real object, plant, or space. |
| Connect | Talk with teammates and participate in the arranged community activity. |
| Record | Briefly enter observations or an explanation after doing the activity. |
| Progress | Unlock the next task or receive a collectible linked to the discovery. |
| Create | Combine findings into the final card, proposal, or other agreed output. |
| Reflect | Share what another person helped them understand and respond to feedback. |

Teams can share one phone and use printed role cards and a notebook. Students do not need individual accounts or devices for the first pilot.

## 9. Feature requirements: student interface

**Main navigation:** Explore · Mission · Journal · Team.

| ID | Feature | What it should look like and do | Priority |
|---|---|---|---|
| S1 | Simple joining | Session code, team alias, short briefing, and clear meeting point. | Must-have |
| S2 | Explore map/list | Show approved checkpoints and available, locked, or completed missions. Explain why a mission is locked. | Must-have |
| S3 | Short mission cards | Display the question, physical action, discussion prompt, what to bring back, and optional hint. | Must-have |
| S4 | Explore-together mode | Keep the task summary and Help available, with no requirement to keep the screen on. | Must-have |
| S5 | Team roles | Assign observer, questioner, recorder, or connector roles; allow rotation and adaptation to student needs. | Must-have |
| S6 | Community encounter card | Show who the group is meeting, where/when, the agreed topic, and suggested questions. No public personal contact details. | Must-have |
| S7 | Evidence capture | Short observation fields, explanations, and a final-output text template. Preserve drafts and show whether they have synced. | Must-have |
| S8 | Team exchange | Prompt students to explain findings to each other and record one contribution that changed their thinking. | Must-have |
| S9 | Discovery journal | Collect mission findings, optional creatures, feedback, and revisions in one place. | Must-have |
| S10 | Shared finale | Combine team contributions into a class exhibition, field guide, or partner-agreed output. | Must-have |
| S11 | Reflection and revision | Ask what students learned from another person; let them improve work after educator or partner feedback. | Must-have |
| S12 | Optional media submissions | Add sketches/photos/audio only when useful and permitted, with appropriate consent and storage controls. | Next |

### Key acceptance checks

- Core tasks work without 3D, GPS, camera permission, or an individual student phone.
- Students can complete most of a mission with the device put away.
- Submitting evidence is labelled as completion, not automatically as a correct answer.
- A delayed partner response does not prevent students from finishing the learning session.
- Repeated scans or submission retries do not create duplicate rewards.
- Help, meeting instructions, and equivalent activity alternatives remain accessible.

## 10. Gamification and collaboration

The Pokémon GO inspiration comes from real-world checkpoints, discovery, a journal, optional original creatures, and a world that changes as teams contribute.

| Mechanic | How WorldQuest uses it |
|---|---|
| Encounters | A checkpoint introduces a real observation task or conversation. |
| Missing pieces | Different students investigate different aspects; they explain findings before combining them. |
| Collectibles | Reward a completed contribution, with a link to the student's evidence. |
| Evolution | Recognise a meaningful improvement after feedback, reviewed by the educator. |
| Shared finale | Teams create something together for an agreed audience. |

No leaderboards based on speed, distance, screen time, or number of people approached. Accessible variants earn equivalent recognition. Community interaction is arranged rather than requiring students to approach strangers.

The learning session can end with a submitted draft. Partner feedback, acceptance, public use, and actual benefit are separate later outcomes. The app does not claim community impact merely because students finished a quest.

## 11. AI and Manifest

### AI's role

Generate a new storyline, mission sequence, role assignments, discussion prompts, and assessment suggestions from each educator's brief. Revise these when the educator changes constraints. The educator remains responsible for review and publication.

### Manifest's role

Generate custom visual assets for the educator's world: an original guide, creatures, mission props, card illustrations, or an optional introduction/finale scene.

**Target flow:** educator brief → world plan → visual brief → background asset generation → educator review → assets appear in the published world.

Generate once per world version and reuse for that world's students. Regenerate only the assets affected by an edit. Teaching a new topic does not require rebuilding the application.

Programmatic generation through Manifest remains a dependency to verify. If no supported API is available, manual export is a clearly labelled prototype fallback, not the complete scalable solution. Keep the integration replaceable so another supported asset service can be used if necessary.

Use visuals for briefings, printed cards, discoveries, and shared reflection. The museum objects, garden, people, and student work remain the main experience. The app must still work if an asset fails or takes time to generate.

## 12. First build and pilot

### Build first

1. Educator brief with partner involvement.
2. AI-generated world with three to five editable tasks.
3. Review, publication, and session code.
4. Student mission player with roles, evidence, team exchange, and simple rewards.
5. Educator progress dashboard and feedback.
6. One custom asset-generation path if supported, with a static fallback.

Suggested implementation remains a mobile-friendly web app, structured mission data, server-side AI calls, a database for worlds/sessions/submissions, and private access to student evidence. Detailed vendor integrations should be tested before being promised.

### Test the product

Start with one venue, six to nine adult students, one educator, and a consenting partner representative or agreed partner-provided activity. Arrange the partner contribution before running the pilot. Use the second example to test whether another educator can create a different world with the same tools.

Observe:

- Can an educator create a workable world without developer help?
- Do students spend most of the session observing, talking, and making?
- Does each student contribute something to the team's work?
- What did community input change in their understanding or output?
- Does the partner find the activity useful and manageable?
- Can the app recover from connectivity problems, absent participants, and unavailable assets?

The first release is complete when the educator-to-student loop works, the partner's role is real and clearly described, the students collaborate outside the screen, and the output and feedback are captured accurately.

## 13. Essential boundaries

- No museum or community partnership is confirmed by this PRD.
- Educators confirm locations, permissions, participation arrangements, and suitable alternatives.
- Do not attach signs, disturb plants/objects, or publish partner-branded work without agreement.
- Collect minimal personal information; do not record conversations by default.
- Keep private student evidence and partner contact details restricted to appropriate users.
- Show pending, submitted, reviewed, and approved states accurately.
- Treat pilot observations as early evidence, not proof of educational effectiveness or community impact.

---

**Product summary:** educators and communities create the adventure; students explore, meet, discuss, and make something together; the app helps organise and celebrate the learning.
