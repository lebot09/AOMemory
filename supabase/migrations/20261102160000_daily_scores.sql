-- Today's best times for single-player games, one board per board size (pairs).
-- Shared by every screen (web and booth). Only the display name a player typed is kept,
-- and rows older than a few days are deleted automatically.

create table public.daily_scores (
  id         uuid primary key default gen_random_uuid(),
  day        date not null,
  pairs      integer not null check (pairs between 2 and 60),
  name       text not null check (length(name) between 1 and 20),
  ms         integer not null check (ms > 0),
  moves      integer not null check (moves > 0),
  created_at timestamptz not null default now()
);
create index daily_scores_board_idx on public.daily_scores (day, pairs, ms, moves);

alter table public.daily_scores enable row level security;

-- Anyone can read recent boards. "Today" is the player's local date, so allow a day either side.
create policy "read recent scores" on public.daily_scores
  for select to anon, authenticated
  using (day >= current_date - 1);

-- No direct writes: scores go in through submit_daily_score, and only admins can remove them.

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

  delete from public.daily_scores where day < current_date - 3;

  insert into public.daily_scores (day, pairs, name, ms, moves)
  values (p_day, p_pairs, v_name, p_ms, p_moves)
  returning id into v_id;
  return v_id;
end;
$$;

-- Admins: wipe the boards (one board size, or all of them when p_pairs is null).
create or replace function public.reset_daily_scores(p_pairs integer default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  delete from public.daily_scores where p_pairs is null or pairs = p_pairs;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.submit_daily_score(date, integer, text, integer, integer) from public;
grant  execute on function public.submit_daily_score(date, integer, text, integer, integer) to anon, authenticated;
revoke execute on function public.reset_daily_scores(integer) from public, anon;
grant  execute on function public.reset_daily_scores(integer) to authenticated;
