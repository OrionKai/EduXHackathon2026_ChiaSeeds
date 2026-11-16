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
  let db = null, queue = Promise.resolve();

  const setStatus = (s) => { state.status = s; document.dispatchEvent(new CustomEvent('wq-sync', { detail: s })); };
  const notify = (msg) => document.dispatchEvent(new CustomEvent('wq-sync-msg', { detail: msg }));

  async function start() {
    if (params.get('offline') === '1' || !window.supabase) { setStatus('offline'); return; }
    setStatus('connecting');
    try {
      db = window.supabase.createClient(CONFIG.url, CONFIG.key);
      const { data, error } = await db.rpc('wq_ensure_session', { p_id: session, p_state: Engine.sharedState() });
      if (error || !data) throw error || new Error('no session');
      state.version = data.version;
      Engine.applyShared(data.state);
      db.channel('wq-' + session)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'wq_sessions', filter: `id=eq.${session}` }, (p) => {
          const row = p.new;
          if (row && row.version > state.version) { state.version = row.version; Engine.applyShared(row.state); }
        })
        .subscribe((s) => { if (s === 'SUBSCRIBED') setStatus('live'); });
      setStatus('live');
      Engine.onCommit((type, payload) => { queue = queue.then(() => push(type, payload)).catch(() => setStatus('error')); });
    } catch (e) {
      console.warn('[sync] offline:', e);
      setStatus('offline');
    }
  }

  async function push(type, payload, tries = 0) {
    if (type === 'resetDemo') {
      // A reset legitimately clears claims, so it uses the reset function instead of the guarded save.
      const { data: rv, error: re } = await db.rpc('wq_reset_session', { p_id: session, p_state: Engine.sharedState() });
      if (re) setStatus('error'); else if (rv) state.version = rv;
      return;
    }
    const { data: v, error } = await db.rpc('wq_save_state', { p_id: session, p_expected: state.version, p_state: Engine.sharedState() });
    if (error) { setStatus('error'); return; }
    if (v === -1) {
      // The database refused a state that breaks a game rule: reload the real state.
      const { data: row } = await db.from('wq_sessions').select('state,version').eq('id', session).single();
      if (row) { state.version = row.version; Engine.applyShared(row.state); }
      notify('The server refused that change because it breaks a game rule.');
      return;
    }
    if (v) { state.version = v; return; }
    // Someone else saved first: load their state and replay this action on top of it.
    const { data: row } = await db.from('wq_sessions').select('state,version').eq('id', session).single();
    if (!row) return;
    state.version = row.version;
    Engine.applyShared(row.state);
    if (tries >= 3) return;
    const r = Engine.dispatch(type, payload, { replay: true });
    if (r.ok) return push(type, payload, tries + 1);
    if (r.msg) notify(`Another device got there first: ${r.msg}`);
  }

  /* Demo: try to cheat by opening team H1's finale without any evidence, straight to the database. */
  async function tamperTest() {
    if (!db || state.status === 'offline') return { ok: false, msg: 'Tamper test needs live sync (no ?offline=1).' };
    const forged = Engine.sharedState();
    forged.finale.H1.status = 'AVAILABLE';
    const { data: row } = await db.from('wq_sessions').select('state').eq('id', session).single();
    const { data: reason } = await db.rpc('wq_state_violation', { p_old: row ? row.state : null, p_new: forged });
    const { data: v } = await db.rpc('wq_save_state', { p_id: session, p_expected: state.version, p_state: forged });
    if (v === -1) return { ok: true, msg: `Server refused the forged write: ${reason || 'rule broken'}.` };
    return { ok: false, msg: v ? 'Forged write was ACCEPTED — run supabase/guard.sql.' : 'Version moved; try again.' };
  }

  return { start, state, tamperTest };
})();
