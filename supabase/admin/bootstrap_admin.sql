-- Supabase SQL Editor에서 한 번만 실행합니다.
update public.profiles
set role = 'ADMIN', updated_at = now()
where nickname = '나야나'
  and id in (
    select id from auth.users
    where email = 'kangsuil9@gmail.com'
  );

select p.id, u.email, p.nickname, p.role
from public.profiles p
join auth.users u on u.id = p.id
where p.nickname = '나야나';
