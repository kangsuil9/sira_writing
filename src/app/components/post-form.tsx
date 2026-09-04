"use client";
import { useActionState } from "react";
import { createPost, updatePost, type WritingState } from "@/app/writing-actions";
const initialState: WritingState = {};
type Props = { clubId: string; post?: { id: string; title: string; body: string } };
export function PostForm({ clubId, post }: Props) {
  const [state, action, pending] = useActionState(post ? updatePost : createPost, initialState);
  return <form action={action} className="post-form">
    <input type="hidden" name="clubId" value={clubId} />
    {post && <input type="hidden" name="postId" value={post.id} />}
    <label>제목<input name="title" defaultValue={post?.title} maxLength={200} placeholder="글의 제목을 적어주세요" required /></label>
    <label>본문<textarea name="body" defaultValue={post?.body} maxLength={50000} rows={18} placeholder="지금 떠오르는 생각부터 천천히 적어보세요." required /></label>
    {state.error && <p className="error">{state.error}</p>}
    <button disabled={pending}>{pending ? "저장 중…" : post ? "수정 완료" : "글 발행하기"}</button>
  </form>;
}
