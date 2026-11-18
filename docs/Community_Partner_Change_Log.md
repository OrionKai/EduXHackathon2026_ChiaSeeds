# Community Partner Change Log

**WorldQuest · 17 November 2026 · `prototype_2`**

## Why

Make voluntary participation clearer and less demanding, recognise partners' contributions, and encourage real-world connections in line with **Beyond the Screen**.

## Changes

| Area | Key changes |
| --- | --- |
| **Overview & contribution** | Clearer responsibilities, next-step buttons and guidance on saving and reviewing contributions. |
| **Quest review** | Core information stays visible; discussion and learning details are expandable. Clarified the scope of partner approval. |
| **On the day** | Clear session states and selected-question labels; simpler conversation confirmation; reminders to put devices away during discussions. |
| **Student work** | Clearer guidance for checking students' interpretations and giving feedback. |
| **Expandable sections** | Kept triangle markers; added purple emphasis, lavender backgrounds, borders and focus/hover states. |
| **Community Spotlight** | Added a separate partner screen with illustrative participation data: **3 visits, 48 students, 12 group conversations**. |
| **Dashboard** | Added a student-participation chart, conversation bars and a data table. Preserved the preferred introduction and summary-card copy. |
| **People & community** | Kept **Meet the people behind the quest**, adding fictional volunteer profiles with initials and roles. Added an invitation to reconnect offline. |
| **Event editor** | Partners can enter a title, date, optional time, location and content; preview and publish locally; edit later. Drafts and published versions are saved separately in the browser. |
| **Share preview** | Added a full-width poster with an illustration, participation metrics and the locally published event details. |
| **Social demo** | Added simulated publishing to **Instagram, TikTok and Facebook**, with explicit confirmation that nothing was actually posted. |

## Boundaries

- Existing student/educator workflows, quest rules and class sync remain unchanged.
- Existing fonts and design tokens are preserved; new styles are scoped to partner components.
- Spotlight statistics and people are fictional demo content, not measured impact.
- Event publication is **local to the current browser**; no public event, booking or cross-device sync.
- Social buttons **do not connect accounts or publish externally**.
- The extra simplification round was **reverted**; earlier readability improvements remain.

## Files

- `prototype_2/js/partner.js` — partner copy and disclosures.
- `prototype_2/js/app.js` — partner navigation, rendering and bindings.
- `prototype_2/js/community-spotlight.js` — dashboard, events and sharing demo.
- `prototype_2/css/styles.css` — scoped visual treatments.
- `prototype_2/index.html` — loads the Spotlight module.

## Checks

Syntax, generated markup, chart totals, event persistence/validation, text escaping and simulated social actions were checked. Full browser/mobile testing remains outstanding.
