"use client";

import { useActionState } from "react";
import { createClub, reviewClubProposal, updateClubStatus, type AdminActionState } from "../actions";

const initialState: AdminActionState = {};

export function ClubForm() {
  const [state, action, pending] = useActionState(createClub, initialState);
  return (
    <form action={action} className="admin-form">
      <h2>수동 클럽 개설</h2>
      <label>관심 분야<input name="category" maxLength={40} placeholder="예: 마음 건강" required /></label>
      <label>클럽 주제 한 문장<input name="topicSentence" minLength={5} maxLength={200} placeholder="예: 불안한 날의 나에게 편지를 써보세요." required /></label>
      <label>설명<textarea name="description" minLength={20} maxLength={1000} rows={5} placeholder="이 주제로 어떤 글을 쓰면 좋을지 2~3문장으로 설명해 주세요." required /></label>
      <div className="form-row"><label>시작일<input name="startsAt" type="date" required /></label><label>종료일<input name="endsAt" type="date" required /></label></div>
      <label>개설 상태<select name="status" defaultValue="ACTIVE"><option value="ACTIVE">공개하기</option><option value="DRAFT">초안으로 저장</option></select></label>
      <p className="form-hint">모든 로그인 회원이 별도 참여 신청 없이 읽고 글을 쓸 수 있어요.</p>
      <Feedback state={state} />
      <button disabled={pending}>{pending ? "개설 중…" : "클럽 개설"}</button>
    </form>
  );
}

export function ClubStatusForm({ clubId, status, locked }: { clubId: string; status: string; locked: boolean }) {
  const [state, action, pending] = useActionState(updateClubStatus, initialState);
  return <form className="status-form" action={action}><input type="hidden" name="clubId" value={clubId} /><select name="status" defaultValue={status} disabled={locked}><option value="DRAFT">초안</option><option value="ACTIVE">공개</option><option value="COMPLETED">종료</option></select><button disabled={pending || locked}>{locked ? "변경 불가" : pending ? "변경 중…" : "변경"}</button><Feedback state={state} /></form>;
}

export function ProposalReviewForm({ clubId }: { clubId: string }) {
  const [state, action, pending] = useActionState(reviewClubProposal, initialState);
  return <form className="proposal-review-form" action={action}><input type="hidden" name="clubId" value={clubId} /><button name="decision" value="reject" className="reject-action" disabled={pending}>미승인</button><button name="decision" value="approve" disabled={pending}>{pending ? "처리 중…" : "승인"}</button><Feedback state={state} /></form>;
}

function Feedback({ state }: { state: AdminActionState }) {
  if (state.error) return <span className="error">{state.error}</span>;
  if (state.success) return <span className="success">{state.success}</span>;
  return null;
}
