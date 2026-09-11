"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  createClubProposal,
  type ProposalState,
} from "@/app/proposal-actions";

const initialState: ProposalState = {};

export function ProposalForm({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState(createClubProposal, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.saved) formRef.current?.reset();
  }, [state.saved]);

  if (!enabled) {
    return (
      <button type="button" disabled>
        주제 제안하기 · 준비 중
      </button>
    );
  }

  return (
    <form ref={formRef} action={action} className="proposal-form">
      <label>
        주제 한 문장
        <input name="title" minLength={5} maxLength={200} required />
      </label>
      <label>
        설명
        <textarea
          name="description"
          minLength={20}
          maxLength={1000}
          rows={5}
          placeholder="함께 어떤 이야기를 고민하고 쓰면 좋을지 2~3문장으로 적어주세요."
          required
        />
      </label>
      <div className="form-row">
        <label>시작일<input name="startsAt" type="date" required /></label>
        <label>종료일<input name="endsAt" type="date" required /></label>
      </div>
      {state.error && <p className="error">{state.error}</p>}
      {state.saved && <p className="success">제안을 보냈어요. 관리자가 확인한 뒤 결과를 알려드릴게요.</p>}
      <button type="submit" disabled={pending}>{pending ? "제안 중…" : "주제 제안하기"}</button>
    </form>
  );
}
