"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
export function LoginButton() {
  const [pending, setPending] = useState(false);
  async function login() {
    setPending(true);
    const origin = window.location.origin;
    const { error } = await createClient().auth.signInWithOAuth({ provider: "kakao", options: { redirectTo: `${origin}/auth/callback` } });
    if (error) { setPending(false); alert("로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요."); }
  }
  return <button className="kakao" onClick={login} disabled={pending}>{pending ? "카카오로 이동 중…" : "카카오로 시작하기"}</button>;
}
