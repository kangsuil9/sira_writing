"use client";
import { useActionState } from "react";
import { saveNickname } from "@/app/actions";
const initialState: { error?: string } = {};
export function NicknameForm() {
  const [state, action, pending] = useActionState(saveNickname, initialState);
  return <form className="form-card" action={action}><div className="brand">시라</div><h1>어떤 이름으로 글을 쓸까요?</h1><p>시라 안에서 사용할 닉네임을 정해 주세요.</p><label htmlFor="nickname">닉네임</label><input id="nickname" name="nickname" minLength={2} maxLength={20} required placeholder="2~20자" />{state.error && <p className="error">{state.error}</p>}<button disabled={pending}>{pending ? "저장 중…" : "시작하기"}</button></form>;
}
