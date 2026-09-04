create extension if not exists pgcrypto;

create type public.user_role as enum ('USER', 'ADMIN');
create type public.club_origin_type as enum ('MANUAL', 'PROPOSAL');
create type public.club_status as enum ('DRAFT', 'RECRUITING', 'ACTIVE', 'NOT_SELECTED', 'COMPLETED');
create type public.participation_mode as enum ('OPEN', 'RECRUITING', 'MEMBERS_ONLY');
create type public.access_scope as enum ('AUTHENTICATED', 'MEMBERS', 'CLOSED');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text unique check (nickname is null or (char_length(nickname) between 2 and 20 and nickname ~ '^[가-힣a-zA-Z0-9_]+$')),
  role public.user_role not null default 'USER',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cycles (
  id uuid primary key default gen_random_uuid(),
  sequence integer not null unique check (sequence > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  proposal_starts_at timestamptz,
  proposal_ends_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.cycles(id),
  category text not null check (char_length(category) between 1 and 40),
  topic_sentence text not null check (char_length(topic_sentence) between 5 and 200),
  description text not null check (char_length(description) between 20 and 1000),
  origin_type public.club_origin_type not null default 'MANUAL',
  status public.club_status not null default 'DRAFT',
  participation_mode public.participation_mode not null default 'OPEN',
  read_scope public.access_scope not null default 'AUTHENTICATED',
  write_scope public.access_scope not null default 'AUTHENTICATED',
  proposed_by uuid references public.profiles(id),
  minimum_members integer not null default 1 check (minimum_members > 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.club_memberships (
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_code text not null default 'MEMBER',
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id),
  check (role_code ~ '^[A-Z][A-Z0-9_]{0,39}$')
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id),
  author_id uuid not null references public.profiles(id),
  title text not null check (char_length(title) between 1 and 200),
  body text not null check (char_length(body) between 1 and 50000),
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clubs_cycle_id_idx on public.clubs(cycle_id);
create index posts_club_published_idx on public.posts(club_id, published_at desc);
create index posts_author_idx on public.posts(author_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'ADMIN');
$$;

alter table public.profiles enable row level security;
alter table public.cycles enable row level security;
alter table public.clubs enable row level security;
alter table public.club_memberships enable row level security;
alter table public.posts enable row level security;

create policy "authenticated profiles readable" on public.profiles for select to authenticated using (true);
revoke update on public.profiles from authenticated;
grant update (nickname, onboarding_completed) on public.profiles to authenticated;
create policy "users update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "admins manage cycles" on public.cycles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "authenticated read cycles" on public.cycles for select to authenticated using (true);
create policy "admins manage clubs" on public.clubs for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "authenticated read clubs" on public.clubs for select to authenticated using (read_scope = 'AUTHENTICATED' or public.is_admin() or (read_scope = 'MEMBERS' and exists(select 1 from public.club_memberships m where m.club_id = id and m.user_id = auth.uid())));
create policy "members manage own membership" on public.club_memberships for insert to authenticated with check (user_id = auth.uid() and role_code = 'MEMBER');
create policy "members leave club" on public.club_memberships for delete to authenticated using (user_id = auth.uid() and role_code = 'MEMBER');
create policy "authenticated read memberships" on public.club_memberships for select to authenticated using (true);
create policy "admins manage memberships" on public.club_memberships for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "allowed users read posts" on public.posts for select to authenticated using (exists(select 1 from public.clubs c where c.id = club_id and (c.read_scope = 'AUTHENTICATED' or public.is_admin() or (c.read_scope = 'MEMBERS' and exists(select 1 from public.club_memberships m where m.club_id = c.id and m.user_id = auth.uid())))));
create policy "allowed users create posts" on public.posts for insert to authenticated with check (author_id = auth.uid() and exists(select 1 from public.clubs c where c.id = club_id and c.status = 'ACTIVE' and (c.write_scope = 'AUTHENTICATED' or (c.write_scope = 'MEMBERS' and exists(select 1 from public.club_memberships m where m.club_id = c.id and m.user_id = auth.uid())))));
create policy "authors update posts" on public.posts for update to authenticated using (author_id = auth.uid() or public.is_admin()) with check (author_id = auth.uid() or public.is_admin());
create policy "authors delete posts" on public.posts for delete to authenticated using (author_id = auth.uid() or public.is_admin());
