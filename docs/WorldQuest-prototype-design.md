# WorldQuest — Prototype & Demo Design

**Date:** 16 Nov 2026 · **Track:** EduX 2026 Challenge 3 — Turning the World Around into a Classroom
**Feeds into:** Asih's product design document (Tue 17), interface build (Wed 18), video + deck (due Thu 19, 11:59 PM), Demo Day (Fri 20)

Items marked *(my call)* are Claude's proposals the team hasn't explicitly confirmed — check these.

---

## 1. Intent

**Core idea:** the app is the bridge to the next real experience, not the destination. Students spend most of the trip looking at objects and talking to each other and to real people; the phone gives short instructions, confirms discoveries, and links one trip to the next.

**Problem (main persona):** a Year 10 (age 14–15) history or art teacher in Cambridge runs 2–3 trips a year. Trips turn into clipboard worksheets: students drift, a few do the work, and nothing connects the trip to what happens next. Planning a good activity with a museum or community partner takes time they don't have.

**Extensibility (designed in, not bolted on):** the same engine serves university and adult learners. The teacher's brief includes an **audience** field (secondary / university / adult) that changes:
- AI tone, reading level and task complexity
- safeguarding defaults (e.g. secondary: all outside contact via teacher, arranged encounters only; adults: students may contact partners directly)
- role suggestions and session length

**Pilot:** run with university students (easy consent, available this week); target market is secondary schools. *(my call)*

## 2. Goals, non-goals, anti-goals

**Goals for the demo**
- Show one complete loop: teacher builds a trip with AI help → pair of students completes a quest at the Fitzwilliam → the class unlocks a real drawing class → collectible evolves.
- Show human-in-the-loop on every AI output.
- Show at least one live AI step (not just hardcoded).
- Run on a real phone for the video and live at the stand.

**Non-goals (deck or roadmap only)**
- Real backend, accounts, database, multi-device sync
- Real object recognition (faked after camera opens)
- Provider booking, messaging or payments
- The PRD's full feature list (My Worlds, reuse, partner review links, etc.)
- The community-garden example (mention as "same engine, different world")

**Anti-goals (failure even if it works)**
- Students staring at the screen instead of the object
- Selfies or storing photos of students
- Leaderboards by speed or badge count
- AI presenting a partner, location or booking as confirmed when no human confirmed it
- Presenting simulated features (Manifest, recognition) as real integrations
- Creatures or visuals that look like Pokémon or any existing game

## 3. Learning design (for the theory slide)

| Feature | Theory |
|---|---|
| Two roles with different information (riddle vs map) | Jigsaw / positive interdependence (Aronson) |
| WorldQuest trip → experience trip sequence | Kolb's experiential learning cycle |
| Learning goal: separate observation from interpretation; write a discovery card | Evidence-based reasoning; retrieval and elaboration |
| Asking a gallery attendant | Place-based / community-based learning |
| Photo of an object detail, never a selfie | Henkel's photo-taking impairment effect: directed photos aid memory |
| Collectible evolves after applying the skill | Growth mindset / mastery recognition |

## 4. Two trip types

1. **WorldQuest trip** — knowledge trip with an in-app activity (quests, roles, collectibles). Demo: the Fitzwilliam.
2. **Experience trip** — apply the skill, no in-app activity beyond logistics, check-in and a reflection prompt. Demo: still-life drawing class (or watercolour).

**Unlock rule:** the experience trip unlocks when the **whole class** has finished the WorldQuest trip. The teacher can override with a short recorded reason (e.g. "absent — did digital-twin version"). No unlocks based on individual badge counts.

## 5. The demo quest — "The Case of the Missing Label" (Fitzwilliam)

**Learning goal:** look closely, tell observation apart from interpretation, explain with evidence.

1. **Briefing.** Pair joins; Student A = *Riddle Keeper*, Student B = *Navigator*.
2. **Different information.** A's phone shows a riddle, no picture ("I tell the time, but I'm shaped to remind my owner they will die"). B's phone shows a floor map with three candidate display cases, no descriptions. They must talk to narrow it down.
3. **Community encounter.** An encounter card tells them to ask a gallery attendant one suggested question; the answer is the unlock code. (Arranged with the museum in the real product; in the video, a team member or a willing attendant.)
4. **Discover.** B points the camera at the object (skull watch) — recognition is faked after a moment, with a "Can't scan? Tap here" fallback.
5. **Confirm together.** A shows a QR, B scans it — QR is confirmation only; the talking did the work.
6. **Collectible.** Both get the memento mori collectible (3D if available, 2D card fallback) plus a short explanation.
7. **Contribute.** The pair writes a discovery card: one observation, one interpretation, one question for the next class. Teacher-approved cards become quests for future groups.

*To verify on site:* the skull watch's gallery location, filming permission, and the "look up" ceiling easter egg (optional extra).

Backup quest (mention only): "Journeys to the Afterlife" — Ramesses III sarcophagus lid vs Roman funerary couch.

## 6. Screens to build

### Teacher (laptop)
- **T1 — Trip sequence:** timeline of trips (Fitzwilliam WorldQuest → drawing class). Shows the class unlock rule, progress bar ("24/28 complete"), "Unlock anyway" with a reason field. Mostly static.
- **T2 — WorldQuest trip builder:** sections for *Trip task & learning goal*, *Roles*, *Collectibles*, *Quests*. Each section shows AI suggestions labelled "AI suggested", with Accept / Edit / Regenerate; edited items are labelled "Teacher edited". The **Quests** section is the live AI step: teacher pastes notes about the objects → AI drafts quests.
- **T3 — Provider card:** for the experience trip — provider, date, agreed activity, what to bring, fallback, status (Pending / Confirmed — set by teacher only). Note: "Booking and messages handled outside WorldQuest."

### Student (phone)
- **P1 — Join:** session code, team alias, role assignment.
- **P2 — Mission card:** role-specific (riddle for A, map for B), with a hint; encourages putting the phone away.
- **P3 — Encounter card:** who to ask, the suggested question, enter answer code.
- **P4 — Scan:** live camera view, fake recognition, fallback button.
- **P5 — Pair confirm:** show QR (A) / scan QR (B).
- **P6 — Collectible unlock + discovery card:** collectible reveal, then a short observation / interpretation / question form.
- **P7 — Journal:** collectibles, discovery cards, next trip ("Drawing class — unlocks when your class finishes").
- **P8 — Check-in at class:** scan the provider's QR → collectible evolves; reflection prompt.

## 7. Real, simulated and planned (for the architecture slide and on-screen labels)

| Part | Status |
|---|---|
| Phone web app, roles, quest flow | Real (frontend, hardcoded content) |
| Camera view | Real |
| Object recognition | Simulated (labelled) |
| QR generate and scan | Real |
| AI quest drafting from teacher notes | **Live** if feasible (see §8), otherwise simulated and labelled |
| Manifest 3D collectibles | Simulated — assets made in Manifest by hand and exported; no API exists yet |
| Accounts, sync, dashboard data | Planned |

## 8. How it gets made *(my call — team can override)*

- A plain HTML/CSS/JS web app, no build step and no installs; hardcoded demo data.
- One link; the view is chosen by URL (`?view=teacher`, `?role=A`, `?role=B`) so two phones and a laptop can each open their part.
- Published as a private hosted link (HTTPS, needed for camera access).
- Camera through the browser; QR via a small CDN library.
- 3D via a web 3D viewer loading a model exported from Manifest; 2D card fallback.
- Live AI: try the hosted page's built-in "ask Claude" ability first (no API key needed on the Pro plan). **To verify** that this works for the Quests button and that the camera works on the hosted page; if either fails, fall back to a local file served over HTTPS or a simulated AI response labelled as such.

## 9. Video script (~2:45) *(my call)*

1. **0:00–0:30 — Teacher (laptop):** creates the Fitzwilliam trip, pastes notes, AI drafts quests live, teacher edits one and approves; trip sequence shows the drawing class locked.
2. **0:30–1:50 — Pair (two phones, at the Fitzwilliam):** riddle and map → talking → asking the attendant → scan → QR confirm → collectible → discovery card.
3. **1:50–2:20 — Drawing class:** class unlocked, check-in QR, collectible evolves, students drawing (phones away).
4. **2:20–2:45 — Close:** journal and next trip; tagline "the app is the bridge to the next real experience."

## 10. Deck-only items (not built)

Problem + persona, theory map (§3), risk register (minors contacting officials, cross-border pairing, business advertising, reward fairness, digital twin as alternative not default), pilot plan (5–9 university students, measure time looking up vs at the screen), differentiation vs Actionbound / Goosechase / Smartify, garden example, roadmap (partner review link, reuse, student-made quests).
