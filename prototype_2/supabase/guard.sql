-- WorldQuest prototype_2: server-side rule check (run after setup.sql; safe to re-run).
-- The browser engine enforces the rules for normal use. This makes the database refuse
-- impossible states too, so a tampered client cannot skip the Jigsaw or forge awards:
--   * a team's finale can only leave LOCKED once all four experts' evidence is VERIFIED
--     and all four perspectives have been taught (shared) in that home team;
--   * collectible claims are append-only, at most 5, and the master award needs all 5.
-- wq_save_state now returns -1 when the new state breaks a rule.

create or replace function public.wq_state_violation(p_old jsonb, p_new jsonb)
returns text
language plpgsql immutable as $$
declare
  h text; t text; pid text; n int;
begin
  for h in select jsonb_object_keys(coalesce(p_new->'finale', '{}'::jsonb)) loop
    if coalesce(p_new->'finale'->h->>'status', 'LOCKED') <> 'LOCKED' then
      foreach t in array array['A','B','C','D'] loop
        n := (substr(h, 2)::int - 1) * 4 + position(t in 'ABCD');
        pid := 'S' || lpad(n::text, 2, '0');
        if coalesce(p_new->'evidence'->pid->>'status', '') <> 'VERIFIED' then
          return format('finale %s opened before %s evidence was verified', h, t);
        end if;
        if coalesce((p_new->'peerTeach'->h->t->>'shared')::boolean, false) is not true then
          return format('finale %s opened before track %s was taught', h, t);
        end if;
      end loop;
    end if;
  end loop;

  if (select count(*) from jsonb_object_keys(coalesce(p_new->'claims', '{}'::jsonb))) > 5 then
    return 'more than 5 collectible claims';
  end if;
  if exists (select 1 from jsonb_object_keys(coalesce(p_old->'claims', '{}'::jsonb)) k
             where not (coalesce(p_new->'claims', '{}'::jsonb) ? k)) then
    return 'a collectible claim was removed';
  end if;
  if p_new->'master' is not null and jsonb_typeof(p_new->'master') <> 'null'
     and (select count(*) from jsonb_object_keys(coalesce(p_new->'claims', '{}'::jsonb))) < 5 then
    return 'master award without all 5 cards';
  end if;
  return null;
end $$;

create or replace function public.wq_save_state(p_id text, p_expected integer, p_state jsonb)
returns integer
language plpgsql security definer set search_path = public as $$
declare v integer; old_state jsonb;
begin
  select state into old_state from wq_sessions where id = p_id;
  if wq_state_violation(old_state, p_state) is not null then
    return -1;  -- refused: the new state breaks a game rule
  end if;
  update wq_sessions
     set state = p_state, version = version + 1, updated_at = now()
   where id = p_id and version = p_expected
  returning version into v;
  return v;
end $$;

grant execute on function public.wq_save_state(text, integer, jsonb) to anon, authenticated;

grant execute on function public.wq_state_violation(jsonb, jsonb) to anon, authenticated;
