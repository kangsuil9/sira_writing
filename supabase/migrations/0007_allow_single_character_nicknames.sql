alter table public.profiles
  drop constraint if exists profiles_nickname_check;

alter table public.profiles
  add constraint profiles_nickname_check
  check (
    nickname is null
    or (
      char_length(nickname) between 1 and 20
      and nickname ~ '^[가-힣a-zA-Z0-9_]+$'
    )
  );
