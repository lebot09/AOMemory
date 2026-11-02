-- Online multiplayer rooms. The server owns the board: clients never see which card is
-- under a face-down tile, and every flip goes through flip_tile(), which checks the turn.
-- Players are anonymous: a display name plus a random token kept on their device.

create type public.room_status as enum ('lobby', 'playing', 'finished');

create table public.rooms (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique check (code ~ '^[A-Z2-9]{5}$'),
  version_id   uuid not null references public.card_set_versions (id) on delete restrict,
  pairs        integer not null check (pairs between 2 and 60),
  status       public.room_status not null default 'lobby',
  current_seat integer not null default 0,
  moves        integer not null default 0,
  open_idx     integer[] not null default '{}',
  last_kind    text check (last_kind in ('flip', 'match', 'miss', 'won')),
  last_idx     integer[] not null default '{}',
  rev          bigint not null default 0,
  created_at   timestamptz not null default now(),
  started_at   timestamptz,
  finished_at  timestamptz,
  updated_at   timestamptz not null default now()
);
create index rooms_version_id_idx on public.rooms (version_id);
create index rooms_updated_at_idx on public.rooms (updated_at);

create table public.room_players (
  room_id    uuid not null references public.rooms (id) on delete cascade,
  seat       integer not null check (seat between 0 and 3),
  name       text not null check (length(name) between 1 and 20),
  token_hash text not null,
  pairs      integer not null default 0,
  joined_at  timestamptz not null default now(),
  primary key (room_id, seat)
);

create table public.room_tiles (
  room_id  uuid not null references public.rooms (id) on delete cascade,
  idx      integer not null,
  card_id  uuid not null references public.cards (id) on delete restrict,
  face_up  boolean not null default false,
  matched  boolean not null default false,
  primary key (room_id, idx)
);
create index room_tiles_card_id_idx on public.room_tiles (card_id);

-- Rooms carry no secrets and are readable so clients can subscribe to changes (rev).
-- Players (token hashes) and tiles (hidden cards) are only reachable through get_room().
alter table public.rooms        enable row level security;
alter table public.room_players enable row level security;
alter table public.room_tiles   enable row level security;
create policy "read rooms" on public.rooms for select to anon, authenticated using (true);

alter publication supabase_realtime add table public.rooms;

-- ---------------------------------------------------------------- helpers
create or replace function public.room_token_hash(p_token text)
returns text language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
$$;

create or replace function public.room_clean_name(p_name text, p_fallback text)
returns text language sql immutable set search_path = '' as $$
  select coalesce(nullif(left(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), 20), ''), p_fallback);
$$;

create or replace function public.room_new_code()
returns text language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text;
begin
  loop
    c := '';
    for i in 1..5 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.rooms r where r.code = c);
  end loop;
  return c;
end;
$$;

-- ---------------------------------------------------------------- state
create or replace function public.get_room(p_code text)
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'code', r.code, 'status', r.status, 'pairs', r.pairs, 'version_id', r.version_id,
    'current_seat', r.current_seat, 'moves', r.moves, 'open_idx', r.open_idx,
    'last_kind', r.last_kind, 'last_idx', r.last_idx, 'rev', r.rev,
    'started_at', r.started_at, 'finished_at', r.finished_at, 'updated_at', r.updated_at,
    'set_name', s.name,
    'players', coalesce((
      select json_agg(json_build_object('seat', p.seat, 'name', p.name, 'pairs', p.pairs) order by p.seat)
        from public.room_players p where p.room_id = r.id), '[]'::json),
    'tiles', coalesce((
      select json_agg(json_build_object(
               'idx', t.idx, 'face_up', t.face_up, 'matched', t.matched,
               'card', case when t.face_up or t.matched then json_build_object(
                          'id', c.id, 'label', c.label, 'alt_text', c.alt_text, 'image_path', c.image_path) end)
             order by t.idx)
        from public.room_tiles t join public.cards c on c.id = t.card_id
       where t.room_id = r.id), '[]'::json)
  )
  from public.rooms r
  join public.card_set_versions v on v.id = r.version_id
  join public.card_sets s on s.id = v.set_id
  where r.code = upper(p_code);
$$;

-- ---------------------------------------------------------------- lobby
create or replace function public.create_room(p_version_id uuid, p_pairs integer, p_name text)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare
  v_room  uuid;
  v_code  text;
  v_cards integer;
  v_pairs integer;
  v_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  -- Housekeeping: rooms idle for a day are removed (names included).
  delete from public.rooms where updated_at < now() - interval '1 day';

  if not exists (select 1 from public.card_set_versions v where v.id = p_version_id and v.status = 'approved') then
    raise exception 'That card set is not available';
  end if;
  select count(*) into v_cards from public.cards c where c.version_id = p_version_id;
  v_pairs := least(greatest(coalesce(p_pairs, 6), 2), v_cards, 60);
  if v_pairs < 2 then raise exception 'That card set has too few cards'; end if;

  v_code := public.room_new_code();
  insert into public.rooms (code, version_id, pairs) values (v_code, p_version_id, v_pairs) returning id into v_room;
  insert into public.room_players (room_id, seat, name, token_hash)
  values (v_room, 0, public.room_clean_name(p_name, 'Player 1'), public.room_token_hash(v_token));

  insert into public.room_tiles (room_id, idx, card_id)
  select v_room, (row_number() over (order by random()))::int - 1, chosen.id
    from (select c.id from public.cards c where c.version_id = p_version_id order by random() limit v_pairs) chosen
   cross join generate_series(1, 2);

  return json_build_object('code', v_code, 'seat', 0, 'token', v_token);
end;
$$;

create or replace function public.join_room(p_code text, p_name text)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare
  r public.rooms;
  v_seat integer;
  v_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  select * into r from public.rooms where code = upper(btrim(p_code)) for update;
  if r.id is null then raise exception 'No game with that code'; end if;
  if r.status <> 'lobby' then raise exception 'That game has already started'; end if;
  select min(s) into v_seat from generate_series(0, 3) s
   where not exists (select 1 from public.room_players p where p.room_id = r.id and p.seat = s);
  if v_seat is null then raise exception 'That game is full (4 players)'; end if;
  insert into public.room_players (room_id, seat, name, token_hash)
  values (r.id, v_seat, public.room_clean_name(p_name, 'Player ' || (v_seat + 1)), public.room_token_hash(v_token));
  update public.rooms set rev = rev + 1, updated_at = now() where id = r.id;
  return json_build_object('code', r.code, 'seat', v_seat, 'token', v_token);
end;
$$;

create or replace function public.start_room(p_code text, p_token text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare r public.rooms;
begin
  select * into r from public.rooms where code = upper(p_code) for update;
  if r.id is null then raise exception 'No game with that code'; end if;
  if not exists (select 1 from public.room_players p where p.room_id = r.id and p.seat = 0
                   and p.token_hash = public.room_token_hash(p_token)) then
    raise exception 'Only the host can start the game';
  end if;
  if r.status <> 'lobby' then return; end if;
  if (select count(*) from public.room_players p where p.room_id = r.id) < 2 then
    raise exception 'Wait for at least one more player';
  end if;
  update public.rooms set status = 'playing', started_at = now(), rev = rev + 1, updated_at = now() where id = r.id;
end;
$$;

-- ---------------------------------------------------------------- play
-- Turns a shown miss back over. Anyone may call it once the miss has been visible for a moment.
create or replace function public.hide_miss(p_code text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare r public.rooms;
begin
  select * into r from public.rooms where code = upper(p_code) for update;
  if r.id is null or cardinality(r.open_idx) <> 2 or r.updated_at > now() - interval '900 milliseconds' then return; end if;
  update public.room_tiles set face_up = false where room_id = r.id and idx = any (r.open_idx) and not matched;
  update public.rooms set open_idx = '{}', last_kind = null, last_idx = '{}', rev = rev + 1, updated_at = now() where id = r.id;
end;
$$;

create or replace function public.flip_tile(p_code text, p_token text, p_idx integer)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  r       public.rooms;
  v_seat  integer;
  v_open  integer[];
  v_a     uuid;
  v_b     uuid;
  v_count integer;
  t       public.room_tiles;
begin
  select * into r from public.rooms where code = upper(p_code) for update;
  if r.id is null then raise exception 'No game with that code'; end if;
  if r.status <> 'playing' then raise exception 'The game is not running'; end if;
  select seat into v_seat from public.room_players p
   where p.room_id = r.id and p.token_hash = public.room_token_hash(p_token);
  if v_seat is null then raise exception 'You are not in this game'; end if;
  if v_seat <> r.current_seat then raise exception 'It is not your turn'; end if;

  select * into t from public.room_tiles where room_id = r.id and idx = p_idx;
  if t.room_id is null or t.matched or (t.face_up and not (t.idx = any (r.open_idx) and cardinality(r.open_idx) = 2)) then
    return; -- not a playable tile: ignore quietly
  end if;

  v_open := r.open_idx;
  -- A shown miss is turned back over by the next flip.
  if cardinality(v_open) = 2 then
    update public.room_tiles set face_up = false where room_id = r.id and idx = any (v_open) and not matched;
    v_open := '{}';
  end if;

  update public.room_tiles set face_up = true where room_id = r.id and idx = p_idx;
  v_open := v_open || p_idx;

  if cardinality(v_open) = 1 then
    update public.rooms set open_idx = v_open, last_kind = 'flip', last_idx = v_open,
           rev = rev + 1, updated_at = now() where id = r.id;
    return;
  end if;

  select card_id into v_a from public.room_tiles where room_id = r.id and idx = v_open[1];
  select card_id into v_b from public.room_tiles where room_id = r.id and idx = v_open[2];

  if v_a = v_b then
    update public.room_tiles set matched = true where room_id = r.id and idx = any (v_open);
    update public.room_players set pairs = pairs + 1 where room_id = r.id and seat = v_seat;
    select count(*) into v_count from public.room_tiles where room_id = r.id and not matched;
    update public.rooms set
      moves = moves + 1, open_idx = '{}', last_idx = v_open,
      last_kind = case when v_count = 0 then 'won' else 'match' end,
      status = case when v_count = 0 then 'finished'::public.room_status else status end,
      finished_at = case when v_count = 0 then now() else finished_at end,
      rev = rev + 1, updated_at = now()
     where id = r.id;
  else
    -- Miss: the pair stays visible (open_idx) and the turn passes to the next player.
    update public.rooms set
      moves = moves + 1, open_idx = v_open, last_kind = 'miss', last_idx = v_open,
      current_seat = (select coalesce(min(p.seat), (select min(seat) from public.room_players where room_id = r.id))
                        from public.room_players p where p.room_id = r.id and p.seat > v_seat),
      rev = rev + 1, updated_at = now()
     where id = r.id;
  end if;
end;
$$;

revoke execute on function public.get_room(text), public.create_room(uuid, integer, text), public.join_room(text, text),
  public.start_room(text, text), public.hide_miss(text), public.flip_tile(text, text, integer) from public;
grant execute on function public.get_room(text), public.create_room(uuid, integer, text), public.join_room(text, text),
  public.start_room(text, text), public.hide_miss(text), public.flip_tile(text, text, integer) to anon, authenticated;
revoke execute on function public.room_token_hash(text), public.room_clean_name(text, text), public.room_new_code() from public, anon, authenticated;
