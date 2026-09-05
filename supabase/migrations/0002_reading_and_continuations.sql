alter table public.posts
  add column discussion_question text
  check (discussion_question is null or char_length(discussion_question) between 1 and 300);

create table public.post_reads (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.post_continuations (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index post_continuations_post_created_idx
  on public.post_continuations(post_id, created_at);

alter table public.post_reads enable row level security;
alter table public.post_continuations enable row level security;

create policy "authenticated read reading marks"
on public.post_reads for select to authenticated using (true);

create policy "users mark posts read"
on public.post_reads for insert to authenticated
with check (user_id = auth.uid());

create policy "users remove own reading mark"
on public.post_reads for delete to authenticated
using (user_id = auth.uid());

create policy "authenticated read continuations"
on public.post_continuations for select to authenticated using (true);

create policy "users create continuations during club"
on public.post_continuations for insert to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.posts p
    join public.clubs c on c.id = p.club_id
    join public.cycles cy on cy.id = c.cycle_id
    where p.id = post_id
      and c.status = 'ACTIVE'
      and now() between cy.starts_at and cy.ends_at
  )
);

create policy "authors update continuations during club"
on public.post_continuations for update to authenticated
using (
  author_id = auth.uid()
  and exists (
    select 1 from public.posts p
    join public.clubs c on c.id = p.club_id
    join public.cycles cy on cy.id = c.cycle_id
    where p.id = post_id and c.status = 'ACTIVE'
      and now() between cy.starts_at and cy.ends_at
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
    join public.cycles cy on cy.id = c.cycle_id
    where p.id = post_id and c.status = 'ACTIVE'
      and now() between cy.starts_at and cy.ends_at
  )
);

drop policy if exists "allowed users create posts" on public.posts;
drop policy if exists "authors update posts" on public.posts;
drop policy if exists "authors delete posts" on public.posts;

create policy "allowed users create posts during club"
on public.posts for insert to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.clubs c
    join public.cycles cy on cy.id = c.cycle_id
    where c.id = club_id and c.status = 'ACTIVE'
      and now() between cy.starts_at and cy.ends_at
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
    join public.cycles cy on cy.id = c.cycle_id
    where c.id = club_id and c.status = 'ACTIVE'
      and now() between cy.starts_at and cy.ends_at
  )
)
with check (author_id = auth.uid());

create policy "authors delete posts during club"
on public.posts for delete to authenticated
using (
  author_id = auth.uid()
  and exists (
    select 1 from public.clubs c
    join public.cycles cy on cy.id = c.cycle_id
    where c.id = club_id and c.status = 'ACTIVE'
      and now() between cy.starts_at and cy.ends_at
  )
);
