-- WorldQuest prototype_2: server-side rule check (run after setup.sql; safe to re-run).
-- The browser engine enforces the rules for normal use. This makes the database refuse
-- impossible states too, so a tampered client cannot skip the Jigsaw or forge awards.
-- Works for any Jigsaw size: the state carries its roster as [participantId, homeTeam, track].
--   * a team's finale can only leave LOCKED once every member's evidence is VERIFIED
--     and every one of the team's tracks has been taught (shared);
--   * collectible claims are append-only, at most one per collectible card, and the
--     class award needs every card.
-- wq_save_state returns -1 when the new state breaks a rule.

create or replace function public.wq_state_violation(p_old jsonb, p_new jsonb)
returns text
language plpgsql immutable as $$
declare
  h text; r jsonb; n_cards int; n_claims int;
begin
  for h in select jsonb_object_keys(coalesce(p_new->'finale', '{}'::jsonb)) loop
    if coalesce(p_new->'finale'->h->>'status', 'LOCKED') <> 'LOCKED' then
      if jsonb_typeof(p_new->'roster') is distinct from 'array' then
        return 'finale opened without a roster';
      end if;
      for r in select value from jsonb_array_elements(p_new->'roster') where value->>1 = h loop
        if coalesce(p_new->'evidence'->(r->>0)->>'status', '') <> 'VERIFIED' then
          return format('finale %s opened before %s evidence was verified', h, r->>2);
        end if;
        if coalesce((p_new->'peerTeach'->h->(r->>2)->>'shared')::boolean, false) is not true then
          return format('finale %s opened before track %s was taught', h, r->>2);
        end if;
      end loop;
    end if;
  end loop;

  n_cards := coalesce(jsonb_array_length(p_new->'content'->'collectibles'), 5);
  n_claims := (select count(*) from jsonb_object_keys(coalesce(p_new->'claims', '{}'::jsonb)));
  if n_claims > n_cards then
    return 'more claims than collectible cards';
  end if;
  if exists (select 1 from jsonb_object_keys(coalesce(p_old->'claims', '{}'::jsonb)) k
             where not (coalesce(p_new->'claims', '{}'::jsonb) ? k)) then
    return 'a collectible claim was removed';
  end if;
  if p_new->'master' is not null and jsonb_typeof(p_new->'master') <> 'null' and n_claims < n_cards then
    return 'class award without every card';
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
