/* Isolated concept dashboard. All people and participation data are illustrative. */
const CommunitySpotlight = (() => {
  const EVENT_KEY = 'worldquest-partner-spotlight-event-v1';
  const esc = (v) => String(v || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const defaultEvent = { title: 'Community Stories Open Day', date: '', time: '', location: '', content: 'Bring a question. Share a local story.' };
  const cleanEvent = (value) => Object.fromEntries(Object.keys(defaultEvent).map((key) => [key, typeof value?.[key] === 'string' ? value[key].slice(0, key === 'content' ? 600 : 160) : '']));
  let draft = { ...defaultEvent }, published = null, preview = false;
  try {
    const saved = JSON.parse(localStorage.getItem(EVENT_KEY) || 'null');
    if (saved?.draft) draft = cleanEvent(saved.draft);
    if (saved?.published) published = cleanEvent(saved.published);
  } catch { /* The editor also works without browser storage. */ }
  function saveEvent() {
    try { localStorage.setItem(EVENT_KEY, JSON.stringify({ draft, published })); return true; } catch { return false; }
  }
  function eventCard(event) {
    return `<div class="stack"><strong>${esc(event.title)}</strong>
      ${event.date ? `<div class="row"><span class="pill mint">${esc(event.date)}</span>${event.time ? `<span class="pill plain">${esc(event.time)}</span>` : ''}</div>` : ''}
      ${event.location ? `<p style="margin:0"><strong>Where:</strong> ${esc(event.location)}</p>` : ''}
      <p style="margin:0;white-space:pre-wrap">${esc(event.content)}</p></div>`;
  }
  function eventEditor() {
    const field = (key, label, type, required = true) => `<div class="fld-group"><label class="fld" for="spotlight-${key}">${label}</label><input class="input" id="spotlight-${key}" name="${key}" type="${type}" value="${esc(draft[key])}" maxlength="160" ${required ? 'required' : ''}></div>`;
    return `<details class="partner-disclosure"><summary>${published ? 'Edit event' : 'Create your event'}</summary>
      <form class="stack" data-spotlight-event style="margin-top:10px">
        ${field('title', 'Event title', 'text')}
        <div class="grid-2">${field('date', 'Date', 'date')}${field('time', 'Time (local, optional)', 'time', false)}</div>
        ${field('location', 'Location', 'text')}
        <div class="fld-group"><label class="fld" for="spotlight-content">What will happen?</label><textarea class="input" id="spotlight-content" name="content" rows="3" maxlength="600" required>${esc(draft.content)}</textarea></div>
        <button class="btn btn-secondary" type="submit">Preview event</button>
        <p class="hint-note" style="margin:0">Demo only: publish on this browser, without sharing to other users.</p>
      </form>
    </details>
    ${preview ? `<section class="card stack" aria-label="Event preview"><span class="pill peach">Preview · Not published</span>${eventCard(draft)}<button type="button" class="btn btn-teal" data-spotlight-publish>Publish event (local demo)</button></section>` : ''}
    <p class="hint-note" data-spotlight-status role="status" style="margin:0"></p>`;
  }
  function bind(root) {
    const form = root.querySelector('[data-spotlight-event]');
    if (!form) return;
    const read = () => cleanEvent(Object.fromEntries(Object.keys(defaultEvent).map((key) => [key, form.elements.namedItem(key).value.trim()])));
    form.addEventListener('input', () => {
      draft = read();
      preview = false;
      const oldPreview = root.querySelector('[aria-label="Event preview"]');
      if (oldPreview) oldPreview.remove();
      saveEvent();
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      draft = read();
      if (!draft.title || !draft.location || !draft.content) {
        root.querySelector('[data-spotlight-status]').textContent = 'Please add a title, location and activity description.';
        return;
      }
      preview = true;
      saveEvent();
      window.WQ.render();
    });
    root.querySelector('[data-spotlight-publish]')?.addEventListener('click', () => {
      published = { ...draft };
      preview = false;
      const stored = saveEvent();
      window.WQ.render();
      window.WQ.toast(stored ? 'Published on this browser only. No external post was sent.' : 'Published for this session only. Browser storage is unavailable.', 'success');
    });
  }
  const visits = [
    { name: 'Object stories', students: 12, conversations: 3 },
    { name: 'Local memories', students: 16, conversations: 4 },
    { name: 'Missing voices', students: 20, conversations: 5 },
  ];
  const people = [
    { initials: 'AM', name: 'Alex Morgan', role: 'Local storyteller', colour: 'wash-lavender' },
    { initials: 'JL', name: 'Jamie Lee', role: 'Object explorer', colour: 'wash-mint' },
    { initials: 'SP', name: 'Sam Patel', role: 'Community connector', colour: 'wash-peach' },
  ];
  const colours = ['var(--violet)', 'var(--success)', 'var(--violet-deep)'];
  const total = (key) => visits.reduce((n, v) => n + v[key], 0);
  function visitChart() {
    return `<svg viewBox="0 0 480 240" role="img" aria-labelledby="spotlight-chart-title spotlight-chart-desc">
      <title id="spotlight-chart-title">Students at each example visit</title>
      <desc id="spotlight-chart-desc">Object stories: 12. Local memories: 16. Missing voices: 20. Total: 48 student participants. Illustrative data.</desc>
      ${[0, 5, 10, 15, 20].map((n) => { const y = 190 - n * 7; return `<line x1="40" y1="${y}" x2="468" y2="${y}" stroke="var(--stroke)"/><text x="28" y="${y + 5}" text-anchor="end" fill="var(--muted)">${n}</text>`; }).join('')}
      ${visits.map((v, i) => { const x = 82 + i * 140, h = v.students * 7; return `<rect x="${x}" y="${190 - h}" width="64" height="${h}" rx="8" fill="${colours[i]}"/><text x="${x + 32}" y="${180 - h}" text-anchor="middle" fill="var(--ink)">${v.students}</text><text x="${x + 32}" y="220" text-anchor="middle" fill="var(--muted)">${v.name}</text>`; }).join('')}
    </svg>`;
  }
  function render() {
    return `<div class="stack spotlight-dashboard">
      <section class="card wash-peach">
        <div class="spread"><div class="eyebrow coral">Community recognition</div><span class="pill peach">Illustrative demo data</span></div>
        <h2>Your knowledge reaches beyond the quest.</h2>
        <p style="margin:0">Celebrate what you share, introduce your organisation and invite people to connect in person.</p>
        <p class="hint-note" style="margin:8px 0 0">Concept preview: a fictional partner and sample activities. These are not records from this class.</p>
      </section>
      <section class="stack" aria-label="Example participation summary">
        <div><div class="eyebrow">Your contribution</div><h3>Small encounters. Shared discoveries.</h3></div>
        <div class="grid-3">
          <div class="card wash-lavender"><div class="eyebrow">Learning visits supported</div><h2>${visits.length}</h2><p style="margin:0">Making local knowledge part of a school visit.</p></div>
          <div class="card wash-mint"><div class="eyebrow teal">Student participants</div><h2>${total('students')}</h2><p style="margin:0">Across the three example visits.</p></div>
          <div class="card"><div class="eyebrow coral">Group conversations hosted</div><h2>${total('conversations')}</h2><p style="margin:0">Time spent listening, questioning and sharing.</p></div>
        </div>
        <p class="hint-note" style="margin:0">Sample participation counts, not measured learning outcomes or community impact.</p>
      </section>
      <div class="grid-2">
        <section class="card stack">
          <div class="eyebrow">Participation at a glance</div><h3>Students across visits</h3>
          <figure style="margin:0">${visitChart()}<figcaption class="hint-note">Participation counts, not measured learning impact.</figcaption></figure>
          <details class="partner-disclosure"><summary>View chart data</summary><div class="matrix"><table><thead><tr><th scope="col">Example visit</th><th scope="col">Students</th><th scope="col">Conversations</th></tr></thead><tbody>${visits.map((v) => `<tr><th scope="row">${v.name}</th><td>${v.students}</td><td>${v.conversations}</td></tr>`).join('')}</tbody></table></div></details>
        </section>
        <section class="card stack">
          <div class="eyebrow coral">Conversations hosted</div><h3>Time for different perspectives</h3>
          ${visits.map((v, i) => `<div class="stack"><div class="spread"><strong>${v.name}</strong><span class="pill plain">${v.conversations} groups</span></div><div class="spotlight-bar" role="img" aria-label="${v.name}: ${v.conversations} of 12 group conversations"><span style="width:${v.conversations / total('conversations') * 100}%;background:${colours[i]}"></span></div></div>`).join('')}
          <p class="hint-note" style="margin:0">Share of the 12 example group conversations.</p>
        </section>
      </div>
      <section class="card stack">
        <div class="spread"><div class="eyebrow coral">Meet the people behind the quest</div><span class="pill plain">Fictional organisation &amp; people</span></div>
        <h3>Neighbourhood Stories Collective</h3>
        <p style="margin:0">Local voices. Real objects. New perspectives.</p>
        <div class="grid-3">${people.map((p) => `<div class="card ${p.colour} stack"><div class="spotlight-avatar" aria-hidden="true">${p.initials}</div><strong>${p.name}</strong><span class="hint-note">${p.role}</span></div>`).join('')}</div>
      </section>
      <div class="grid-2">
        <section class="card wash-mint stack">
          <div class="eyebrow teal">Beyond this quest</div><h3>Meet again, offline.</h3>
          <span class="pill ${published ? 'mint' : 'plain'}">${published ? 'Published · Local demo' : 'Example invitation'}</span>
          <div class="spotlight-event">${Art.icon('voices', 28)}${eventCard(published || defaultEvent)}</div>
          <div class="row"><span class="pill mint">Listen</span><span class="pill mint">Explore</span><span class="pill mint">Connect</span></div>
          <p class="hint-note" style="margin:0">${published ? 'Visible on this browser only. No booking or external publishing.' : 'Example invitation · No event scheduled'}</p>
          ${eventEditor()}
        </section>
        <section class="card stack">
          <div class="eyebrow">Share your contribution</div><h3>A story worth passing on.</h3>
          <details class="partner-disclosure"><summary>Preview share card</summary>
            <div class="card wash-lavender stack">
              <div class="eyebrow">WorldQuest · Community Spotlight</div><h2>Local knowledge.<br>Shared discoveries.</h2>
              <strong>Neighbourhood Stories Collective</strong>
              <div class="grid-3"><div><h3>${visits.length}</h3>visits</div><div><h3>${total('students')}</h3>students</div><div><h3>${total('conversations')}</h3>conversations</div></div>
              <div class="card"><strong>Let's meet beyond the screen.</strong>${eventCard(published || defaultEvent)}</div>
              <span class="hint-note">Fictional partner · Sample data &amp; invitation</span>
            </div>
          </details>
          <p class="hint-note" style="margin:0">Preview only · Nothing is published</p>
        </section>
      </div>
    </div>`;
  }
  return { render, bind };
})();
