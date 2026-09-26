alter table public.clubs
  add column cover_image_url text;

comment on column public.clubs.cover_image_url is
  'Public URL of the club cover image stored in the site-assets bucket.';
