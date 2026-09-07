alter table public.profiles
  add column avatar_url text
  check (avatar_url is null or char_length(avatar_url) <= 2000);

update public.profiles as profile
set avatar_url = coalesce(
  auth_user.raw_user_meta_data ->> 'avatar_url',
  auth_user.raw_user_meta_data ->> 'picture',
  auth_user.raw_user_meta_data ->> 'profile_image_url'
)
from auth.users as auth_user
where profile.id = auth_user.id;

grant update (avatar_url) on public.profiles to authenticated;
