-- WorldQuest prototype_2: shared live session state.
-- Paste this whole file into Supabase → SQL Editor → Run. Safe to run more than once.
--
-- Model: one row per class session holding the engine's game state (JSON).
-- Every write is a compare-and-swap on `version`, so two devices acting at the same
-- moment can never both win: the loser re-applies its action on the newer state,
-- where the engine's own rules (e.g. "card already claimed") reject duplicates.

create table if not exists public.wq_sessions (
  id          text primary key,
  state       jsonb not null,
  version     integer not null default 1,
  updated_at  timestamptz not null default now()
);

alter table public.wq_sessions enable row level security;

-- Anyone with the publishable key may READ a session (demo: class code = session id).
drop policy if exists "read sessions" on public.wq_sessions;
create policy "read sessions" on public.wq_sessions for select to anon, authenticated using (true);
grant select on public.wq_sessions to anon, authenticated; -- needed for reads and Realtime
-- No direct insert/update/delete policies: all writes go through the functions below.

-- Create the session if it does not exist yet; returns the current row.
create or replace function public.wq_ensure_session(p_id text, p_state jsonb)
returns public.wq_sessions
language plpgsql security definer set search_path = public as $$
declare r public.wq_sessions;
begin
  insert into wq_sessions (id, state) values (p_id, p_state)
  on conflict (id) do nothing;
  select * into r from wq_sessions where id = p_id;
  return r;
end $$;

-- Compare-and-swap write. Returns the new version, or null if someone else wrote first.
create or replace function public.wq_save_state(p_id text, p_expected integer, p_state jsonb)
returns integer
language plpgsql security definer set search_path = public as $$
declare v integer;
begin
  update wq_sessions
     set state = p_state, version = version + 1, updated_at = now()
   where id = p_id and version = p_expected
  returning version into v;
  return v;
end $$;

-- Reset a session to a given state (demo "Reset" button).
create or replace function public.wq_reset_session(p_id text, p_state jsonb)
returns integer
language plpgsql security definer set search_path = public as $$
declare v integer;
begin
  update wq_sessions set state = p_state, version = version + 1, updated_at = now()
   where id = p_id returning version into v;
  return v;
end $$;

grant execute on function public.wq_ensure_session(text, jsonb) to anon, authenticated;
grant execute on function public.wq_save_state(text, integer, jsonb) to anon, authenticated;
grant execute on function public.wq_reset_session(text, jsonb) to anon, authenticated;

-- Live updates: broadcast row changes to subscribed devices.
do $$ begin
  alter publication supabase_realtime add table public.wq_sessions;
exception when duplicate_object then null; end $$;
