"use client";

import { useActionState, useEffect, useState } from "react";
import {
  deleteWritingNote,
  updateWritingNote,
  type NoteState,
} from "@/app/note-actions";

const initialState: NoteState = {};

export function NoteItem({
  id,
  title,
  content,
  updatedAt,
}: {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <article className="note-card">
      {editing ? (
        <NoteEditForm
          id={id}
          title={title}
          content={content}
          onClose={() => setEditing(false)}
        />
      ) : (
        <>
          <div className="note-card-head">
            <h2>{title || "제목 없는 메모"}</h2>
            <time dateTime={updatedAt}>{formatDate(updatedAt)}</time>
          </div>
          <p>{content}</p>
          <div className="note-card-actions">
            <button type="button" onClick={() => setEditing(true)}>수정</button>
            <form
              action={deleteWritingNote}
              onSubmit={(event) => {
                if (!window.confirm("이 메모를 삭제할까요?")) event.preventDefault();
              }}
            >
              <input type="hidden" name="noteId" value={id} />
              <button type="submit" className="delete-action">삭제</button>
            </form>
          </div>
        </>
      )}
    </article>
  );
}

function NoteEditForm({
  id,
  title,
  content,
  onClose,
}: {
  id: string;
  title: string;
  content: string;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(updateWritingNote, initialState);

  useEffect(() => {
    if (state.saved) onClose();
  }, [state.saved, onClose]);

  return (
    <form action={action} className="memo-form note-edit-form">
      <input type="hidden" name="noteId" value={id} />
      <input name="title" maxLength={120} defaultValue={title} placeholder="제목 (선택)" />
      <textarea name="content" rows={8} maxLength={10000} defaultValue={content} required />
      {state.error && <p className="error">{state.error}</p>}
      <div className="memo-form-actions">
        <button type="button" className="secondary-action" onClick={onClose}>취소</button>
        <button type="submit" disabled={pending}>{pending ? "수정 중…" : "수정 저장"}</button>
      </div>
    </form>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}
