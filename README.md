# WorldQuest — EduX 2026 (Challenge 3)

Clickable frontend prototype. No backend, no build step: plain HTML, CSS and JavaScript.

## Run it locally

```bash
python3 -m http.server 8000 --directory prototype
```

Open http://localhost:8000 and add `#teacher`, `#student-a` or `#student-b` to the URL.
(Opening `index.html` by double-clicking may not load the scripts in every browser; use the server.)

Live camera and tilt detection need HTTPS on a phone, so test those on the hosted link, not localhost.

## Where things are

| File | What to edit there |
|---|---|
| `prototype/js/content.js` | Demo text: sample sources, quiz questions, codes, partner names |
| `prototype/js/teacher/ai-script.js` | What the simulated AI says and drafts, and its revisions |
| `prototype/js/teacher/unit.js` | Unit plan: trips, unlock rule, trip-day launch |
| `prototype/js/teacher/builder.js` | Quest builder: chat panel and draft-card board |
| `prototype/js/teacher/partners.js` | Partner booking request and studio's view |
| `prototype/js/student/flow.js` | Student phone steps (one function per step) |
| `prototype/js/student/camera.js` | Camera, QR scanning, tilt easter egg |
| `prototype/js/ui.js` | Shared helpers, icons, artwork |
| `prototype/css/styles.css` | All styling (colour tokens at the top) |

Scripts are plain `<script>` tags loaded in order (see `index.html`), so top-level names are shared between files.

## Docs

- `docs/WorldQuest-prototype-design.md` — prototype and demo design
- `Context/` — hackathon brief notes, ideas, evaluation, PRD

## To do

- [ ] Add `ANTHROPIC_API_KEY` (secret) in Netlify → Site configuration → Environment variables, optionally `DEMO_PASSCODE`; set a spend limit in the Anthropic Console; redeploy; test the live assistant (draft, then e.g. "make Track A shorter").
- [ ] Make the Netlify site publicly visible (it currently redirects visitors to a Netlify login).
- [ ] Test camera QR scanning and the full flow on a real iPhone and Android over the Netlify link.
- [ ] Team: 3–5 teacher interviews, 1–2 partner conversations, 5–8 student interviews, one usability test (quotes for deck slide 3).
