/* Isolated concept dashboard. All people and participation data are illustrative. */
const CommunitySpotlight = (() => {
  const EVENT_KEY = 'worldquest-partner-spotlight-event-v1';
  const platforms = ['Instagram', 'TikTok', 'Facebook'];
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
    root.querySelectorAll('[data-spotlight-social]').forEach((button) => button.addEventListener('click', () => {
      const platform = button.dataset.spotlightSocial;
      if (!platforms.includes(platform)) return;
      const status = root.querySelector('[data-spotlight-social-status]');
      status.textContent = `Demo complete: your card would be shared to ${platform}. Nothing was posted and no account was connected.`;
      status.hidden = false;
    }));
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
  function sharePreview() {
    const event = published || defaultEvent;
    return `<article class="spotlight-poster" aria-label="Community Spotlight social card preview">
      <div class="spread"><div class="eyebrow">WorldQuest · Community Spotlight</div><span class="pill plain">Demo preview</span></div>
      <div class="spotlight-poster-hero">
        <div class="stack"><div class="eyebrow coral">People. Places. Possibilities.</div><h2>Local knowledge.<br>Shared discoveries.</h2><strong>Neighbourhood Stories Collective</strong><p style="margin:0">Bringing local stories into real-world learning.</p></div>
        <svg viewBox="0 0 240 210" class="spotlight-poster-art" aria-hidden="true" focusable="false">
          <circle cx="120" cy="106" r="92" fill="var(--lavender)"/>
          <path d="M48 177V102a72 72 0 0 1 144 0v75" fill="var(--white)" stroke="var(--violet)" stroke-width="5"/>
          <path d="M85 126h70v51H85z" fill="var(--mint)"/>
          <circle cx="92" cy="105" r="13" fill="var(--violet)"/><path d="M69 156v-17a23 23 0 0 1 46 0v17" fill="var(--violet)"/>
          <circle cx="149" cy="111" r="13" fill="var(--success)"/><path d="M126 162v-17a23 23 0 0 1 46 0v17" fill="var(--success)"/>
          <path d="M103 49h57a9 9 0 0 1 9 9v15a9 9 0 0 1-9 9h-21l-13 12V82h-23a9 9 0 0 1-9-9V58a9 9 0 0 1 9-9" fill="var(--peach)" stroke="var(--ink)" stroke-width="2"/>
          <circle cx="112" cy="66" r="3" fill="var(--ink)"/><circle cx="131" cy="66" r="3" fill="var(--ink)"/><circle cx="150" cy="66" r="3" fill="var(--ink)"/>
          <path d="m33 64 4-10 4 10 10 4-10 4-4 10-4-10-10-4z" fill="var(--sun)"/><circle cx="209" cy="144" r="8" fill="var(--coral)"/>
        </svg>
      </div>
      <div class="spotlight-poster-stats" aria-label="Example participation counts">
        <div><h2>${visits.length}</h2><span>learning visits</span></div><div><h2>${total('students')}</h2><span>student participants</span></div><div><h2>${total('conversations')}</h2><span>group conversations</span></div>
      </div>
      <div class="spotlight-poster-invite"><div class="eyebrow teal">Let's meet beyond the screen.</div><h3>${esc(event.title)}</h3>
        <div class="row">${event.date ? `<span class="pill mint">${esc(event.date)}${event.time ? ' · ' + esc(event.time) : ''}</span>` : '<span class="pill plain">Example invitation</span>'}${event.location ? `<span class="pill plain">${esc(event.location)}</span>` : ''}</div>
        <p style="margin:0;white-space:pre-wrap">${esc(event.content)}</p>
      </div>
      <p class="hint-note" style="margin:0">Fictional organisation · Illustrative participation data · ${published ? 'Locally created event' : 'No event scheduled'}</p>
    </article>`;
  }
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
      <div class="stack">
        <section class="card wash-mint stack">
          <div class="eyebrow teal">Beyond this quest</div><h3>Meet again, offline.</h3>
          <span class="pill ${published ? 'mint' : 'plain'}">${published ? 'Published · Local demo' : 'Example invitation'}</span>
          <div class="spotlight-event">${Art.icon('voices', 28)}${eventCard(published || defaultEvent)}</div>
          <div class="row"><span class="pill mint">Listen</span><span class="pill mint">Explore</span><span class="pill mint">Connect</span></div>
          <p class="hint-note" style="margin:0">${published ? 'Visible on this browser only. No booking or external publishing.' : 'Example invitation · No event scheduled'}</p>
          ${eventEditor()}
        </section>
      </div>
      <section class="card stack">
        <div class="spread"><div><div class="eyebrow">Share your contribution</div><h3>A story worth passing on.</h3></div><span class="pill peach">Social sharing demo</span></div>
        <details class="partner-disclosure"><summary>Preview share card &amp; social publishing</summary>
          ${sharePreview()}
          <div class="stack" style="margin-top:16px"><strong>One click. A new community connection.</strong>
            <div class="spotlight-social-actions">${platforms.map((platform) => `<button type="button" class="btn btn-secondary" data-spotlight-social="${platform}">Demo publish to ${platform}</button>`).join('')}</div>
            <p class="hint-note" style="margin:0">Simulation only. No accounts connected and no real posts, images or videos are uploaded.</p>
            <p class="card wash-mint" role="status" data-spotlight-social-status hidden></p>
          </div>
        </details>
      </section>
    </div>`;
  }
  return { render, bind };
})();
