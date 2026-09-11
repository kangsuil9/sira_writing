create table public.writing_notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default '' check (char_length(title) <= 120),
  content text not null check (
    char_length(content) >= 1
    and char_length(content) <= 10000
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index writing_notes_author_updated_idx
  on public.writing_notes(author_id, updated_at desc);

alter table public.writing_notes enable row level security;

create policy "authors read own writing notes"
on public.writing_notes for select to authenticated
using (author_id = auth.uid());

create policy "authors create own writing notes"
on public.writing_notes for insert to authenticated
with check (author_id = auth.uid());

create policy "authors update own writing notes"
on public.writing_notes for update to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());

create policy "authors delete own writing notes"
on public.writing_notes for delete to authenticated
using (author_id = auth.uid());
