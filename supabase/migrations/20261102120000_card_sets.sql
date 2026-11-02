-- AO Memory: card sets with frozen versions, admin roles, games pinned to a version.
--
-- Versioning model
--   card_sets            one row per set (e.g. "AO Trauma instruments")
--   card_set_versions    numbered versions of a set; status flows
--                          draft -> approved -> superseded -> retired
--                        Only one version per set is 'approved' (the one new games use).
--                        Once a version leaves 'draft', it and its cards can never change.
--   cards                the cards of one version
--   games                every game records the exact version it was started with,
--                        so publishing a new version never changes a game in progress.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- admins
create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;

create policy "admins read own row" on public.admins
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------- card sets
create type public.version_status as enum ('draft', 'approved', 'superseded', 'retired');

create table public.card_sets (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (length(name) between 1 and 120),
  description text not null default '',
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.card_set_versions (
  id          uuid primary key default gen_random_uuid(),
  set_id      uuid not null references public.card_sets (id) on delete restrict,
  version     integer not null check (version > 0),
  status      public.version_status not null default 'draft',
  notes       text not null default '',
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  unique (set_id, version)
);
create unique index card_set_versions_one_approved
  on public.card_set_versions (set_id) where status = 'approved';
create unique index card_set_versions_one_draft
  on public.card_set_versions (set_id) where status = 'draft';

create table public.cards (
  id         uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.card_set_versions (id) on delete cascade,
  position   integer not null check (position >= 0),
  label      text not null check (length(label) between 1 and 80),
  alt_text   text not null check (length(alt_text) between 1 and 300),
  image_path text not null,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (version_id, position)
);
create index cards_version_id_idx on public.cards (version_id);
create index card_set_versions_set_id_idx on public.card_set_versions (set_id);

-- ---------------------------------------------------------------- immutability
create or replace function public.guard_version_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'Only draft versions can be deleted (version % is %)', old.version, old.status;
    end if;
    return old;
  end if;

  if old.status <> 'draft' then
    if new.set_id is distinct from old.set_id
       or new.version is distinct from old.version
       or new.notes is distinct from old.notes
       or new.approved_at is distinct from old.approved_at
       or new.approved_by is distinct from old.approved_by then
      raise exception 'Version % is % and can no longer be edited', old.version, old.status;
    end if;
    if not (
         new.status = old.status
      or (old.status = 'approved'   and new.status in ('superseded', 'retired'))
      or (old.status = 'superseded' and new.status = 'retired')
    ) then
      raise exception 'Invalid status change % -> %', old.status, new.status;
    end if;
  elsif new.status not in ('draft', 'approved') then
    raise exception 'A draft can only be approved';
  end if;
  return new;
end;
$$;

create trigger card_set_versions_guard
  before update or delete on public.card_set_versions
  for each row execute function public.guard_version_update();

create or replace function public.guard_card_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status public.version_status;
begin
  select status into v_status from public.card_set_versions
   where id = coalesce(new.version_id, old.version_id);
  -- v_status is null when the whole version is being deleted (cascade); allowed only for drafts.
  if v_status is not null and v_status <> 'draft' then
    raise exception 'Cards of a % version cannot be changed', v_status;
  end if;
  if tg_op = 'UPDATE' and new.version_id <> old.version_id then
    raise exception 'Cards cannot move between versions';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger cards_guard
  before insert or update or delete on public.cards
  for each row execute function public.guard_card_change();

-- ---------------------------------------------------------------- admin workflow
-- Start a new draft of a set, copying the cards of its latest version.
create or replace function public.create_draft_version(p_set_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prev uuid;
  v_next integer;
  v_new  uuid;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;

  select id into v_prev from public.card_set_versions
   where set_id = p_set_id order by version desc limit 1;
  select coalesce(max(version), 0) + 1 into v_next
    from public.card_set_versions where set_id = p_set_id;

  insert into public.card_set_versions (set_id, version, created_by)
  values (p_set_id, v_next, auth.uid())
  returning id into v_new;

  if v_prev is not null then
    insert into public.cards (version_id, position, label, alt_text, image_path, metadata)
    select v_new, position, label, alt_text, image_path, metadata
      from public.cards where version_id = v_prev;
  end if;

  return v_new;
end;
$$;

-- Approve a draft: it becomes the set's live version; the previous live one is superseded
-- (still playable by games that already use it, never offered to new games).
create or replace function public.approve_version(p_version_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_set   uuid;
  v_count integer;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;

  select set_id into v_set from public.card_set_versions
   where id = p_version_id and status = 'draft' for update;
  if v_set is null then raise exception 'No draft with that id'; end if;

  select count(*) into v_count from public.cards where version_id = p_version_id;
  if v_count < 2 then raise exception 'A set needs at least 2 cards (has %)', v_count; end if;

  update public.card_set_versions set status = 'superseded'
   where set_id = v_set and status = 'approved';
  update public.card_set_versions
     set status = 'approved', approved_by = auth.uid(), approved_at = now()
   where id = p_version_id;
  update public.card_sets set updated_at = now() where id = v_set;
end;
$$;

-- Take a set out of play for new games.
create or replace function public.retire_set(p_set_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update public.card_set_versions set status = 'retired'
   where set_id = p_set_id and status in ('approved', 'superseded');
  update public.card_sets set updated_at = now() where id = p_set_id;
end;
$$;

revoke execute on function public.create_draft_version(uuid) from public, anon;
revoke execute on function public.approve_version(uuid)      from public, anon;
revoke execute on function public.retire_set(uuid)           from public, anon;
grant  execute on function public.create_draft_version(uuid) to authenticated;
grant  execute on function public.approve_version(uuid)      to authenticated;
grant  execute on function public.retire_set(uuid)           to authenticated;

-- ---------------------------------------------------------------- games
create type public.game_mode as enum ('solo', 'local', 'online', 'booth');

create table public.games (
  id          uuid primary key default gen_random_uuid(),
  version_id  uuid not null references public.card_set_versions (id) on delete restrict,
  mode        public.game_mode not null,
  pairs       integer not null check (pairs between 2 and 60),
  created_at  timestamptz not null default now(),
  finished_at timestamptz
);
create index games_version_id_idx on public.games (version_id);

-- ---------------------------------------------------------------- RLS
alter table public.card_sets         enable row level security;
alter table public.card_set_versions enable row level security;
alter table public.cards             enable row level security;
alter table public.games             enable row level security;

-- Players see approved versions (for new games) and superseded/retired ones
-- (so games already pinned to them keep working). Drafts are admin-only.
create policy "read playable versions" on public.card_set_versions
  for select to anon, authenticated
  using (status <> 'draft' or (select public.is_admin()));

create policy "read cards of playable versions" on public.cards
  for select to anon, authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.card_set_versions v
                where v.id = cards.version_id and v.status <> 'draft')
  );

create policy "read sets with a published version" on public.card_sets
  for select to anon, authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.card_set_versions v
                where v.set_id = card_sets.id and v.status <> 'draft')
  );

create policy "admins write sets"     on public.card_sets
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins write versions" on public.card_set_versions
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins write cards"    on public.cards
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Anyone can start a game, but only on an approved version. No personal data is stored.
create policy "start game on approved version" on public.games
  for insert to anon, authenticated
  with check (exists (select 1 from public.card_set_versions v
                       where v.id = games.version_id and v.status = 'approved'));
create policy "read games" on public.games
  for select to anon, authenticated using (true);

-- What the player picker shows: one live version per set.
create view public.playable_sets
with (security_invoker = true) as
select s.id as set_id, s.slug, s.name, s.description,
       v.id as version_id, v.version, v.approved_at,
       (select count(*) from public.cards c where c.version_id = v.id) as card_count
  from public.card_sets s
  join public.card_set_versions v on v.set_id = s.id and v.status = 'approved';

grant select on public.playable_sets to anon, authenticated;

-- ---------------------------------------------------------------- storage
-- Card images live at  card-images/<set_id>/<file>. Files are never overwritten:
-- a changed image is uploaded under a new name, so old versions keep their pictures.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('card-images', 'card-images', true, 5242880,
        array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "admins upload card images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'card-images' and (select public.is_admin()));

-- Only images no card refers to can be removed.
create policy "admins delete unused card images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'card-images' and (select public.is_admin())
    and not exists (select 1 from public.cards c where c.image_path = storage.objects.name)
  );
