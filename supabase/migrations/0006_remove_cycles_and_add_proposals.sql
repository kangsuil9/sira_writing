alter table public.clubs
  add column starts_at timestamptz,
  add column ends_at timestamptz;

update public.clubs c
set starts_at = cy.starts_at,
    ends_at = cy.ends_at
from public.cycles cy
where cy.id = c.cycle_id;

alter table public.clubs
  alter column starts_at set not null,
  alter column ends_at set not null,
  add constraint clubs_dates_check check (ends_at > starts_at);

create index clubs_status_dates_idx
  on public.clubs(status, starts_at, ends_at);

drop policy if exists "users create continuations during club" on public.post_continuations;
drop policy if exists "authors update continuations during club" on public.post_continuations;
drop policy if exists "authors delete continuations during club" on public.post_continuations;
drop policy if exists "allowed users create posts during club" on public.posts;
drop policy if exists "authors update posts during club" on public.posts;
drop policy if exists "authors delete posts during club" on public.posts;

create policy "users create continuations during club"
on public.post_continuations for insert to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.posts p
    join public.clubs c on c.id = p.club_id
    where p.id = post_id
      and c.status = 'ACTIVE'
      and now() between c.starts_at and c.ends_at
  )
);

create policy "authors update continuations during club"
on public.post_continuations for update to authenticated
using (
  author_id = auth.uid()
  and exists (
    select 1 from public.posts p
    join public.clubs c on c.id = p.club_id
    where p.id = post_id
      and c.status = 'ACTIVE'
      and now() between c.starts_at and c.ends_at
  )
)
with check (author_id = auth.uid());

create policy "authors delete continuations during club"
on public.post_continuations for delete to authenticated
using (
  author_id = auth.uid()
  and exists (
    select 1 from public.posts p
    join public.clubs c on c.id = p.club_id
    where p.id = post_id
      and c.status = 'ACTIVE'
      and now() between c.starts_at and c.ends_at
  )
);

create policy "allowed users create posts during club"
on public.posts for insert to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.clubs c
    where c.id = club_id
      and c.status = 'ACTIVE'
      and now() between c.starts_at and c.ends_at
      and (
        c.write_scope = 'AUTHENTICATED'
        or (
          c.write_scope = 'MEMBERS'
          and exists (
            select 1 from public.club_memberships m
            where m.club_id = c.id and m.user_id = auth.uid()
          )
        )
      )
  )
);

create policy "authors update posts during club"
on public.posts for update to authenticated
using (
  author_id = auth.uid()
  and exists (
    select 1 from public.clubs c
    where c.id = club_id
      and c.status = 'ACTIVE'
      and now() between c.starts_at and c.ends_at
  )
)
with check (author_id = auth.uid());

create policy "authors delete posts during club"
on public.posts for delete to authenticated
using (
  author_id = auth.uid()
  and exists (
    select 1 from public.clubs c
    where c.id = club_id
      and c.status = 'ACTIVE'
      and now() between c.starts_at and c.ends_at
  )
);

drop index if exists public.clubs_cycle_id_idx;
alter table public.clubs drop constraint if exists clubs_cycle_id_fkey;
alter table public.clubs drop column cycle_id;
drop table public.cycles;

create policy "members propose clubs"
on public.clubs for insert to authenticated
with check (
  origin_type = 'PROPOSAL'
  and status = 'DRAFT'
  and participation_mode = 'OPEN'
  and read_scope = 'CLOSED'
  and write_scope = 'AUTHENTICATED'
  and proposed_by = auth.uid()
  and created_by = auth.uid()
);

create policy "proposers read own proposals"
on public.clubs for select to authenticated
using (origin_type = 'PROPOSAL' and proposed_by = auth.uid());
