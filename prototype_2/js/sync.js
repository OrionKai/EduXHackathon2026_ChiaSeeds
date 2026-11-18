/* WorldQuest prototype_2 — live sync across devices (Supabase).
 * One row per class session holds the engine's shared state. Each change is saved with a
 * compare-and-swap on `version`; if another device saved first, this device loads the newer
 * state and re-runs its action there, so the engine's own rules (e.g. "card already claimed")
 * decide. Other devices receive changes through Supabase Realtime.
 *
 * Session = ?session=CODE in the URL (default FITZ-DEMO). ?offline=1 keeps everything local.
 * The publishable key is designed to be public; writes only go through the SQL functions.
 */
'use strict';

const Sync = (() => {
  const CONFIG = {
    url: 'https://mmetucwurcvhomyjpbgz.supabase.co',
    key: 'sb_publishable_CiJ9j5X35rP1Zp8Ce6x4Nw_YuC9Ctu2',
  };
  const params = new URLSearchParams(location.search);
  const session = (params.get('session') || 'FITZ-DEMO').toUpperCase();
  const state = { status: 'offline', session, version: 0 };
  const rows = { class: { id: session, version: 0, on: false }, studio: { id: null, version: 0, on: false } };
  let db = null, queue = Promise.resolve();

  const setStatus = (s) => { state.status = s; document.dispatchEvent(new CustomEvent('wq-sync', { detail: s })); };
  const notify = (msg) => document.dispatchEvent(new CustomEvent('wq-sync-msg', { detail: msg }));

  /* One database row per workspace: the class (this class code) and the teacher's studio (their quests). */
  async function connect(sp) {
    const r = rows[sp];
    const { data, error } = await db.rpc('wq_ensure_session', { p_id: r.id, p_state: Engine.sharedState(sp) });
    if (error || !data) throw error || new Error('no session');
    r.version = data.version; r.on = true;
    if (sp === 'class') state.version = data.version;
    Engine.applyShared(data.state, sp);
    db.channel('wq-' + r.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'wq_sessions', filter: `id=eq.${r.id}` }, (p) => {
        const row = p.new;
        if (row && row.version > r.version) { r.version = row.version; if (sp === 'class') state.version = row.version; Engine.applyShared(row.state, sp); }
      })
      .subscribe((s) => { if (s === 'SUBSCRIBED' && sp === 'class') setStatus('live'); });
  }
  /* Students never need the studio; educators and partners do. */
  const needsStudio = () => /^#(educator|partner)$/.test(location.hash);
  async function ensureStudio() {
    if (!db || rows.studio.on || rows.studio.busy || !needsStudio()) return;
    rows.studio.busy = true;
    try { rows.studio.id = 'STUDIO-' + (Engine.classState.studio || 'DEMO'); await connect('studio'); } catch (e) { console.warn('[sync] studio offline:', e); }
    rows.studio.busy = false;
  }

  async function start() {
    if (params.get('offline') === '1' || !window.supabase) { setStatus('offline'); return; }
    setStatus('connecting');
    try {
      db = window.supabase.createClient(CONFIG.url, CONFIG.key);
      await connect('class');
      setStatus('live');
      Engine.onCommit((type, payload, result, sp) => { queue = queue.then(() => push(type, payload, sp || 'class', 0, result)).catch(() => setStatus('error')); });
      ensureStudio();
      window.addEventListener('hashchange', ensureStudio);
    } catch (e) {
      console.warn('[sync] offline:', e);
      setStatus('offline');
    }
  }

  async function push(type, payload, sp, tries = 0, result = null) {
    const r = rows[sp];
    if (!r.on) return;
    if (type === 'resetDemo' || type === 'createQuest' || type === 'openQuest' || type === 'runQuest' || type === 'deleteQuest' || (result && result.reset)) {
      // Resetting or switching quests legitimately clears claims, so these use the reset function instead of the guarded save.
      const { data: rv, error: re } = await db.rpc('wq_reset_session', { p_id: r.id, p_state: Engine.sharedState(sp) });
      if (re) setStatus('error'); else if (rv) { r.version = rv; if (sp === 'class') state.version = rv; }
      if (type === 'resetDemo' && sp === 'class' && rows.studio.on) return push('resetDemo', payload, 'studio');
      return;
    }
    const { data: v, error } = await db.rpc('wq_save_state', { p_id: r.id, p_expected: r.version, p_state: Engine.sharedState(sp) });
    if (error) { setStatus('error'); return; }
    const reload = async () => { const { data: row } = await db.from('wq_sessions').select('state,version').eq('id', r.id).single(); if (row) { r.version = row.version; if (sp === 'class') state.version = row.version; Engine.applyShared(row.state, sp); } return row; };
    if (v === -1) {
      // The database refused a state that breaks a game rule: reload the real state.
      await reload();
      notify('The server refused that change because it breaks a game rule.');
      return;
    }
    if (v) { r.version = v; if (sp === 'class') state.version = v; return; }
    // Someone else saved first: load their state and replay this action on top of it.
    if (!(await reload())) return;
    if (tries >= 3) return;
    const res = Engine.dispatch(type, payload, { replay: true });
    if (res.ok) return push(type, payload, sp, tries + 1, res);
    if (res.msg) notify(`Another device got there first: ${res.msg}`);
  }

  /* Demo: try to cheat by opening team H1's finale without any evidence, straight to the database. */
  async function tamperTest() {
    if (!db || state.status === 'offline') return { ok: false, msg: 'Tamper test needs live sync (no ?offline=1).' };
    const forged = Engine.sharedState();
    const home = SEED.homeGroups.find((h) => forged.finale[h].status === 'LOCKED');
    if (!home) return { ok: false, msg: 'Every finale is already legitimately unlocked — run the tamper test before seeding classmates.' };
    forged.finale[home].status = 'AVAILABLE';
    const { data: row } = await db.from('wq_sessions').select('state').eq('id', session).single();
    const { data: reason } = await db.rpc('wq_state_violation', { p_old: row ? row.state : null, p_new: forged });
    const { data: v } = await db.rpc('wq_save_state', { p_id: session, p_expected: state.version, p_state: forged });
    if (v === -1) return { ok: true, msg: `Forged write (team ${home} finale forced open) refused by the server: ${reason || 'rule broken'}.` };
    return { ok: false, msg: v ? 'Forged write was ACCEPTED — run supabase/guard.sql.' : 'Version moved; try again.' };
  }

  return { start, state, tamperTest };
})();
