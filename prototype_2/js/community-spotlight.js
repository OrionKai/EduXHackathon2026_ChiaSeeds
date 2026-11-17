/* Standalone partner concept preview. All content is illustrative; no shared state,
 * student records, external accounts or publishing services are accessed. */
const CommunitySpotlight = (() => {
  function render() {
    return `<div class="stack">
      <div class="card wash-peach">
        <div class="spread"><div class="eyebrow coral">Community recognition</div><span class="pill peach">Illustrative demo data</span></div>
        <h2>Your knowledge reaches beyond the quest.</h2>
        <p style="margin:0">Celebrate what you share, introduce your organisation and invite people to connect in person.</p>
        <p class="hint-note" style="margin:8px 0 0">Concept preview: a fictional partner and sample activities. These are not records from this class.</p>
      </div>

      <section class="stack" aria-label="Example participation summary">
        <div><div class="eyebrow">Your contribution</div><h3>Small encounters. Shared discoveries.</h3></div>
        <div class="grid-3">
          <div class="card wash-lavender"><div class="eyebrow">Learning visits supported</div><h2>3</h2><p style="margin:0">Making local knowledge part of a school visit.</p></div>
          <div class="card wash-mint"><div class="eyebrow teal">Student participants</div><h2>48</h2><p style="margin:0">Across the three example visits.</p></div>
          <div class="card"><div class="eyebrow coral">Group conversations hosted</div><h2>12</h2><p style="margin:0">Time spent listening, questioning and sharing.</p></div>
        </div>
        <p class="hint-note" style="margin:0">Sample participation counts, not measured learning outcomes or community impact.</p>
      </section>

      <div class="grid-2">
        <section class="card stack">
          <div class="eyebrow coral">Meet the people behind the quest</div>
          <h3>Neighbourhood Stories Collective</h3>
          <p>A fictional volunteer group bringing local memories, objects and everyday experiences into learning.</p>
          <div class="evidence-quote"><strong>What we share</strong><p style="margin:6px 0 0">There is more than one way to tell a place's story. We help learners ask whose voices they hear, and whose they might be missing.</p></div>
          <span class="pill plain">Fictional organisation</span>
        </section>
        <section class="card wash-mint stack">
          <div class="eyebrow teal">Beyond this quest</div>
          <h3>Continue the conversation in person.</h3>
          <p>In this example, the partner invites families to a community open day to explore local stories and meet volunteers.</p>
          <div class="evidence-quote"><strong>Community Stories Open Day</strong><p style="margin:6px 0 0">Bring a question about your neighbourhood. Look, listen and share a story together.</p></div>
          <p class="hint-note" style="margin:0">Illustrative invitation only. No event is scheduled and no booking is available.</p>
        </section>
      </div>

      <section class="card stack">
        <div class="eyebrow">A contribution worth sharing</div>
        <h3>Share a story. Invite a real-world connection.</h3>
        <p style="margin:0">A sample card for a school newsletter or social post, giving the partner credit and inviting a next encounter.</p>
        <details class="partner-disclosure">
          <summary>Preview share card</summary>
          <div class="card wash-lavender stack" aria-label="Sample share card">
            <div class="spread"><div class="eyebrow">WorldQuest · Community Spotlight</div><span class="pill plain">Demo preview</span></div>
            <h2>Local knowledge.<br>Shared discoveries.</h2>
            <p>Neighbourhood Stories Collective helped learners explore whose stories get told, through real objects and face-to-face conversations.</p>
            <div class="grid-3">
              <div><strong>3 visits</strong><p class="hint-note" style="margin:0">supported</p></div>
              <div><strong>48 students</strong><p class="hint-note" style="margin:0">participated</p></div>
              <div><strong>12 conversations</strong><p class="hint-note" style="margin:0">hosted</p></div>
            </div>
            <div class="card"><strong>Let's meet beyond the screen.</strong><p style="margin:6px 0 0">Discover local stories at our Community Stories Open Day.</p></div>
            <p class="hint-note" style="margin:0">Fictional organisation, sample counts and example invitation. No real event or partnership is implied.</p>
          </div>
          <p class="hint-note">Sharing preview only. Nothing is published, no social account is connected, and no student names or photos are included.</p>
        </details>
      </section>
    </div>`;
  }
  return { render };
})();
