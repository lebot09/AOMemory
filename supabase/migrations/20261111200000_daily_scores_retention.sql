-- Keep leaderboard entries for at most 3 days, whether or not anyone keeps playing.
-- Before this, old entries were only removed when a new score came in.

create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.purge_old_daily_scores()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.daily_scores where created_at < now() - interval '3 days';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke execute on function public.purge_old_daily_scores() from public, anon, authenticated;

-- Same rule when a score comes in.
create or replace function public.submit_daily_score(p_day date, p_pairs integer, p_name text, p_ms integer, p_moves integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id   uuid;
  v_name text := left(regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g'), 20);
begin
  if p_day is null or p_day not between current_date - 1 and current_date + 1 then
    raise exception 'Scores can only be added for today';
  end if;
  if p_pairs is null or p_pairs not between 2 and 60 then raise exception 'Invalid board size'; end if;
  -- Every pair needs at least one move, and a real game can't be faster than ~0.25 s per pair.
  if p_moves is null or p_moves < p_pairs then raise exception 'Invalid moves'; end if;
  if p_ms is null or p_ms < p_pairs * 250 or p_ms > 6 * 3600 * 1000 then raise exception 'Invalid time'; end if;
  if v_name = '' then v_name := 'Guest'; end if;

  perform public.purge_old_daily_scores();

  insert into public.daily_scores (day, pairs, name, ms, moves)
  values (p_day, p_pairs, v_name, p_ms, p_moves)
  returning id into v_id;
  return v_id;
end;
$$;

-- Every hour, so nothing is kept longer than 3 days (plus at most one hour).
select cron.schedule('purge-old-daily-scores', '17 * * * *', 'select public.purge_old_daily_scores()');
