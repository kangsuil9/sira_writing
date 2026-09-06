"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createContinuation,
  deleteContinuation,
  updateContinuation,
  type WritingState,
} from "@/app/writing-actions";

const initialState: WritingState = {};

export function ContinuationForm({ postId }: { postId: string }) {
  const [state, action, pending] = useActionState(
    createContinuation,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.saved) formRef.current?.reset();
  }, [state.saved]);

  return (
    <form ref={formRef} action={action} className="continuation-form">
      <input type="hidden" name="postId" value={postId} />
      <textarea
        name="body"
        rows={5}
        maxLength={5000}
        placeholder="이 글에서 이어진 생각을 적어보세요."
        required
      />
      {state.error && <p className="error">{state.error}</p>}
      <button disabled={pending}>
        {pending ? "저장 중…" : "이어쓰기 남기기"}
      </button>
    </form>
  );
}

export function ContinuationItem({
  postId,
  continuationId,
  body,
  author,
  date,
  editable,
}: {
  postId: string;
  continuationId: string;
  body: string;
  author: string;
  date: string;
  editable: boolean;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <article className="continuation">
      <div className="continuation-byline">
        <strong>{author}</strong>
        <span>{date}</span>
      </div>

      {editing ? (
        <ContinuationEditForm
          postId={postId}
          continuationId={continuationId}
          body={body}
          onSaved={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <p>{body}</p>
      )}

      {editable && !editing && (
        <div className="continuation-actions">
          <button type="button" onClick={() => setEditing(true)}>
            수정
          </button>
          <form action={deleteContinuation}>
            <input type="hidden" name="postId" value={postId} />
            <input
              type="hidden"
              name="continuationId"
              value={continuationId}
            />
            <button className="delete-action">삭제</button>
          </form>
        </div>
      )}
    </article>
  );
}

function ContinuationEditForm({
  postId,
  continuationId,
  body,
  onSaved,
  onCancel,
}: {
  postId: string;
  continuationId: string;
  body: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(
    updateContinuation,
    initialState,
  );

  useEffect(() => {
    if (state.saved) onSaved();
  }, [state.saved, onSaved]);

  return (
    <form action={action} className="continuation-edit">
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="continuationId" value={continuationId} />
      <textarea
        name="body"
        rows={4}
        maxLength={5000}
        defaultValue={body}
        required
      />
      {state.error && <p className="error">{state.error}</p>}
      <div className="continuation-edit-actions">
        <button type="button" className="secondary-action" onClick={onCancel}>
          취소
        </button>
        <button disabled={pending}>
          {pending ? "수정 중…" : "수정 저장"}
        </button>
      </div>
    </form>
  );
}
