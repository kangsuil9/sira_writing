alter table public.posts
  add column body_html text
  check (body_html is null or char_length(body_html) <= 200000);

create table public.post_drafts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default '' check (char_length(title) <= 200),
  body text not null default '' check (char_length(body) <= 50000),
  body_html text not null default '' check (char_length(body_html) <= 200000),
  discussion_question text check (
    discussion_question is null
    or char_length(discussion_question) <= 300
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index post_drafts_author_updated_idx
  on public.post_drafts(author_id, updated_at desc);

alter table public.post_drafts enable row level security;

create policy "authors read own drafts"
on public.post_drafts for select to authenticated
using (author_id = auth.uid());

create policy "authors create own drafts"
on public.post_drafts for insert to authenticated
with check (author_id = auth.uid());

create policy "authors update own drafts"
on public.post_drafts for update to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());

create policy "authors delete own drafts"
on public.post_drafts for delete to authenticated
using (author_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do update set public = true;

create policy "authenticated users upload post images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'post-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "owners update post images"
on storage.objects for update to authenticated
using (
  bucket_id = 'post-images'
  and owner_id = auth.uid()::text
)
with check (
  bucket_id = 'post-images'
  and owner_id = auth.uid()::text
);

create policy "owners delete post images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'post-images'
  and owner_id = auth.uid()::text
);
