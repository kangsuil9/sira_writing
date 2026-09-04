# 인증 및 데이터베이스 설정

## 환경 변수

.env.local에 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 설정합니다. 실제 값은 Git에 커밋하지 않습니다.

## Supabase

1. SQL Editor에서 supabase/migrations/0001_initial.sql을 실행합니다.
2. Authentication → Providers → Kakao를 활성화하고 REST API Key와 Client Secret을 입력합니다.
3. Authentication → URL Configuration에서 Site URL을 http://localhost:3000, Redirect URLs에 http://localhost:3000/**를 등록합니다.

## Kakao Developers

카카오 로그인 Redirect URI에는 Supabase 콜백 주소인 https://PROJECT_REF.supabase.co/auth/v1/callback을 등록합니다.

## 최초 관리자 지정

첫 로그인 후 SQL Editor에서 다음 쿼리를 실행합니다: update public.profiles set role = 'ADMIN' where id = '사용자 UUID';
