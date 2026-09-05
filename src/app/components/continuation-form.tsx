"use client";
import { useActionState, useEffect, useRef } from "react";
import { createContinuation, updateContinuation, type WritingState } from "@/app/writing-actions";
const initialState: WritingState = {};
export function ContinuationForm({ postId }: { postId: string }) {
  const [state, action, pending] = useActionState(createContinuation, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (!state.error) formRef.current?.reset(); }, [state]);
  return <form ref={formRef} action={action} className="continuation-form"><input type="hidden" name="postId" value={postId} /><textarea name="body" rows={5} maxLength={5000} placeholder="이 글에서 이어진 생각을 적어보세요." required />{state.error && <p className="error">{state.error}</p>}<button disabled={pending}>{pending ? "저장 중…" : "이어쓰기 남기기"}</button></form>;
}
export function ContinuationEditForm({ postId, continuationId, body }: { postId: string; continuationId: string; body: string }) {
  const [state, action, pending] = useActionState(updateContinuation, initialState);
  return <form action={action} className="continuation-edit"><input type="hidden" name="postId" value={postId} /><input type="hidden" name="continuationId" value={continuationId} /><textarea name="body" rows={4} maxLength={5000} defaultValue={body} required />{state.error && <p className="error">{state.error}</p>}<button disabled={pending}>{pending ? "수정 중…" : "수정 저장"}</button></form>;
}
