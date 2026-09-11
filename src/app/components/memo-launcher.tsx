"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createWritingNote, type NoteState } from "@/app/note-actions";

const hiddenPrefixes = ["/login", "/auth", "/onboarding", "/admin"];
const initialState: NoteState = {};

export function MemoLauncher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const hidden =
    hiddenPrefixes.some((prefix) => pathname.startsWith(prefix)) ||
    pathname.endsWith("/write") ||
    pathname.endsWith("/edit");

  useEffect(() => setOpen(false), [pathname]);

  if (hidden) return null;

  return (
    <>
      <button
        type="button"
        className="memo-launcher"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        메모
      </button>
      {open && <QuickMemoDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function QuickMemoDialog({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState(createWritingNote, initialState);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => titleRef.current?.focus(), []);
  useEffect(() => {
    if (state.saved) onClose();
  }, [state.saved, onClose]);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="memo-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="memo-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-memo-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="memo-dialog-head">
          <h2 id="quick-memo-title">떠오른 생각 붙잡기</h2>
          <button type="button" aria-label="닫기" onClick={onClose}>×</button>
        </div>
        <form action={action} className="memo-form">
          <input
            ref={titleRef}
            name="title"
            maxLength={120}
            placeholder="제목 (선택)"
          />
          <textarea
            name="content"
            rows={8}
            maxLength={10000}
            placeholder="나중에 글이 될 생각을 적어보세요."
            required
          />
          {state.error && <p className="error">{state.error}</p>}
          <div className="memo-form-actions">
            <button type="button" className="secondary-action" onClick={onClose}>취소</button>
            <button type="submit" disabled={pending}>{pending ? "저장 중…" : "저장"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
