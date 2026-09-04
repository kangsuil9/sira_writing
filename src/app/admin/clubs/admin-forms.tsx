"use client";
import { useActionState } from "react";
import { createClub, createCycle, type AdminActionState } from "../actions";
const initialState: AdminActionState = {};
export function CycleForm({ nextSequence }: { nextSequence: number }) {
  const [state, action, pending] = useActionState(createCycle, initialState);
  return <form action={action} className="admin-form"><h2>새 기수 만들기</h2><label>기수 번호<input name="sequence" type="number" min="1" defaultValue={nextSequence} required /></label><div className="form-row"><label>시작일<input name="startsAt" type="date" required /></label><label>종료일<input name="endsAt" type="date" required /></label></div><Feedback state={state} /><button disabled={pending}>{pending ? "생성 중…" : "기수 생성"}</button></form>;
}
export function ClubForm({ cycles }: { cycles: Array<{ id: string; sequence: number }> }) {
  const [state, action, pending] = useActionState(createClub, initialState);
  return <form action={action} className="admin-form"><h2>수동 클럽 개설</h2><label>기수<select name="cycleId" required defaultValue=""><option value="" disabled>기수를 선택하세요</option>{cycles.map(c => <option key={c.id} value={c.id}>{c.sequence}기</option>)}</select></label><label>관심 분야<input name="category" maxLength={40} placeholder="예: 마음 건강" required /></label><label>클럽 주제 한 문장<input name="topicSentence" minLength={5} maxLength={200} placeholder="예: 불안한 날의 나에게 편지를 써보세요." required /></label><label>설명<textarea name="description" minLength={20} maxLength={1000} rows={5} placeholder="이 주제로 어떤 글을 쓰면 좋을지 2~3문장으로 설명해 주세요." required /></label><label>개설 상태<select name="status" defaultValue="ACTIVE"><option value="ACTIVE">바로 활동 시작</option><option value="DRAFT">초안으로 저장</option></select></label><p className="form-hint">수동 클럽은 클럽장 없이 모든 로그인 회원이 읽고 글을 쓸 수 있어요.</p><Feedback state={state} /><button disabled={pending || cycles.length === 0}>{pending ? "개설 중…" : "클럽 개설"}</button></form>;
}
function Feedback({ state }: { state: AdminActionState }) {
  if (state.error) return <p className="error">{state.error}</p>;
  if (state.success) return <p className="success">{state.success}</p>;
  return null;
}
