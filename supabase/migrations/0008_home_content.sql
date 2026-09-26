create table public.home_content (
  id smallint primary key default 1 check (id = 1),
  hero_title text not null check (char_length(hero_title) between 1 and 120),
  hero_description text not null check (char_length(hero_description) between 1 and 300),
  hero_image_url text not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.home_content enable row level security;

create policy "authenticated users read home content"
on public.home_content for select to authenticated
using (true);

create policy "admins manage home content"
on public.home_content for all to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.home_content (
  id,
  hero_title,
  hero_description,
  hero_image_url
) values (
  1,
  E'누구나 읽는다.\n하지만 아무나 안쓴다.',
  '내 속에 나를 꺼내 나를 완성해보세요. 나다움과 나만의 특별함을 보여주세요.',
  '/images/home-writing-hero-v1.png'
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'site-assets',
  'site-assets',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "public reads site assets"
on storage.objects for select to public
using (bucket_id = 'site-assets');

create policy "admins upload site assets"
on storage.objects for insert to authenticated
with check (bucket_id = 'site-assets' and public.is_admin());

create policy "admins update site assets"
on storage.objects for update to authenticated
using (bucket_id = 'site-assets' and public.is_admin())
with check (bucket_id = 'site-assets' and public.is_admin());

create policy "admins delete site assets"
on storage.objects for delete to authenticated
using (bucket_id = 'site-assets' and public.is_admin());
