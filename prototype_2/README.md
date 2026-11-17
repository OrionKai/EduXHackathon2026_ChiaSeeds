# WorldQuest — prototype_2

An interactive, fully clickable prototype of **WorldQuest: The Lost Museum**, built for the
Cambridge EduX Hackathon 2026. Unlike a static mockup, every primary control is wired to a
real demo game engine with the gameplay rules from the PRD.

## Run it

No build step and no dependencies:

```bash
cd prototype_2 && python3 -m http.server 4180
```

Then open <http://localhost:4180>. (Opening `index.html` directly from disk also works;
Google Fonts load when online, with safe system fallbacks offline.)

## What is real in this prototype

- **Authoritative demo engine** ([js/engine.js](js/engine.js)): a pure state machine the UI
  can only talk to through guarded actions. It enforces:
  - the quest cannot be published until the community collaborator approves their contribution;
  - evidence goes `AVAILABLE → SUBMITTED → VERIFIED / NEEDS_REVISION`, and only the educator
    (or the approved facilitator, for Expert D) can verify;
  - Expert D cannot submit evidence until the facilitator has confirmed the arranged conversation;
  - peer teach-backs require verified evidence, a different teammate as checker, and a correct
    comprehension answer;
  - the finale stays **LOCKED** until all four perspectives in a home team are verified *and*
    taught — the lock lives in the engine, not the screen;
  - finale submission validates the evidence match, the overclaim choice and the structural
    requirements of the composed introduction; approval needs the full four-item rubric;
  - collectible claims are **idempotent** (a card can never be claimed twice) and the
    Guardian of Stories master award is granted **exactly once**, atomically inside the claim
    action; collectibles never gate the main quest;
  - demo shortcuts exist but are clearly labelled `SIMULATED` and logged in the audit trail.
- **Seeded demo content** ([js/seed.js](js/seed.js), [data/fitzwilliam_seed_quest.json](data/fitzwilliam_seed_quest.json)):
  20 pseudonymous explorers, 5 home teams × A/B/C/D, 4 expert groups of 5, four gallery
  missions anchored to official Fitzwilliam Museum pages, finale, 5 collectibles + master.
- **Persistence**: state survives reloads via `localStorage` ("Reload in another tab" restores
  shared progress); "Reset demo" returns to the seeded start.
- **Original artwork** ([js/art.js](js/art.js)): logo, museum arch, five collectible
  illustrations and the master award, all hand-written SVG — no third-party assets, no
  museum-artifact replicas.

## Suggested walkthrough (4–6 min)

1. **Educator → Quest builder**: edit the title (live student preview updates), *Generate quest
   draft* (labelled *Seeded demo — no AI key*), try *Publish* → blocked until the partner approves.
2. **Collaborator**: edit + *Approve contribution*.
3. **Educator**: *Publish*, then in **Live session** advance to *Briefing* → *Expert missions*.
4. **Student** (Explorer 06 · H2 · Expert B): read the mission, try *Look Up Mode*, submit evidence.
   Try Explorer 08 (Expert D) — submission is blocked until the **Collaborator** confirms the
   arranged conversation in *Facilitate*.
5. **Educator → Live session**: verify evidence; use *Seed classmate progress* (SIMULATED) for
   the other 19 explorers. Advance to *Peer teaching*.
6. **Student**: log teach-backs (expert must be verified; a teammate answers the check).
   Peek at the finale — **locked**, with the exact reasons listed. Advance phase as educator,
   then solve the three finale panels and submit.
7. **Educator**: approve the finale with the rubric; *Seed team discoveries*, approve the five
   bonus cards and watch the album fill; the 5th claim triggers the one-time Guardian of
   Stories reveal. Advance to *Reflection*, submit one as a student, and view the **Report**.

## Deep-linkable demo states

For quick demos and screenshots, boot straight into a scripted state (every step still
runs through the guarded engine actions):

- Add `&offline=1` to keep it on this device: each link resets the demo, and without it that resets the shared class session too.
- `?fast=expert&role=student` — expert mission open
- `?fast=teach&role=student` — peer-teaching board (own teach-back left to play)
- `?fast=finale&role=student` — unlocked finale board
- `?fast=album3&role=student&screen=album` — album with 3 cards claimed
- `?fast=album5&role=student&screen=album` — every card claimed, class award unlocked
- `role` = `student` / `teacher` / `collaborator`, `screen` = that role's tab

Reference screenshots at 390px and 1440px live in `artifacts/screenshots/`.

## Honesty labels

The story is fiction; the collaborator is a **simulated demo actor**; no Fitzwilliam Museum
partnership exists or is implied; real school visits must be pre-booked. The engine is a
single-browser demo adapter standing in for the server-side logic (Supabase + Next.js route
handlers) specified in `WORLDQUEST_MVP_PRD.md` — it does not demonstrate multi-user
production security.

## Additions (Kai_Revision)

- **Live sync across devices** ([js/sync.js](js/sync.js), [supabase/setup.sql](supabase/setup.sql)): one Supabase row per class
  session; compare-and-swap writes so simultaneous actions can't both win (the loser replays its action on the newer state,
  where engine rules like "card already claimed" decide). Use `?session=CODE` for a fresh session per demo run;
  `?offline=1` keeps everything on this device. The browser only holds the publishable key.
- **QR station checkpoints** ([js/scan.js](js/scan.js)): evidence unlocks only after a student scans their gallery's clue card
  (or types the facilitator's backup code). Educator → Live session → *Station QR cards* prints them. Camera needs HTTPS.
- **Quest assistant** ([js/assist.js](js/assist.js)): simulated, labelled AI chat in the quest builder. Drafts from approved
  sources only (S1–S4 gallery pages, S5 partner contribution), cites them, revises tracks on request; the engine blocks
  publishing until the educator approves all four tracks.
- **Hints one at a time with their source**, and an always-visible **Call teacher** button with a help queue in the live session.
- **Join flow**: students enter the class code (the `?session=` code, default `FITZ-DEMO`) and a nickname, and are
  seated automatically in the next free Jigsaw place; the educator dashboard shows how many have joined.
- **Quest setup**: session length and class size (demo seating supports 20) feed the assistant's draft.
- **Server-side rules** ([supabase/guard.sql](supabase/guard.sql)): the database refuses states where a finale opens
  before all four tracks are verified and taught, or where claims exceed 5 / disappear / the master award comes early.
  Educator → Live session → *Tamper test* shows a forged write being refused.
- **Partner role**: the collaborator can add their own question for Expert D students and give feedback on each team's
  restored introduction (students see it; the report counts it). Richer learning report per home team.
- **Real AI (optional)** ([../netlify/functions/assistant.mjs](../netlify/functions/assistant.mjs)): on Netlify, the
  assistant calls Claude through a server function with two tools (`revise_track`, `add_hint`) that propose edits from
  the approved sources only; edits become "AI revised" items the educator must approve, and they change what students
  see. Needs `ANTHROPIC_API_KEY` (secret env var); optional `DEMO_PASSCODE`. Without it, or with "AI: off", the
  scripted assistant answers.
