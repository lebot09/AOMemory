-- Emails that become admins automatically when that account is created (or already exists).
create table public.admin_emails (
  email      text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
alter table public.admin_emails enable row level security;
create policy "admins read admin emails" on public.admin_emails
  for select to authenticated using ((select public.is_admin()));

create or replace function public.grant_admin_from_allowlist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.admin_emails a where a.email = lower(new.email)) then
    insert into public.admins (user_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke execute on function public.grant_admin_from_allowlist() from public, anon, authenticated;

create trigger on_auth_user_created_grant_admin
  after insert on auth.users
  for each row execute function public.grant_admin_from_allowlist();

insert into public.admin_emails (email) values ('marc.stal@gmail.com');
-- In case the account already exists.
insert into public.admins (user_id)
select id from auth.users where lower(email) = 'marc.stal@gmail.com'
on conflict do nothing;
