"use client";

import { ChangeEvent, useActionState, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createClub, reviewClubProposal, updateClubDetails, updateClubStatus, type AdminActionState } from "../actions";

const initialState: AdminActionState = {};

export function ClubForm() {
  const [state, action, pending] = useActionState(createClub, initialState);
  const image = useClubImage();
  return (
    <form action={action} className="admin-form">
      <h2>수동 클럽 개설</h2>
      <label>관심 분야<input name="category" maxLength={40} placeholder="예: 마음 건강" required /></label>
      <label>클럽 주제 한 문장<input name="topicSentence" minLength={5} maxLength={200} placeholder="예: 불안한 날의 나에게 편지를 써보세요." required /></label>
      <label>설명<textarea name="description" minLength={20} maxLength={1000} rows={5} placeholder="이 주제로 어떤 글을 쓰면 좋을지 2~3문장으로 설명해 주세요." required /></label>
      <ClubImageField image={image} />
      <div className="form-row"><label>시작일<input name="startsAt" type="date" required /></label><label>종료일<input name="endsAt" type="date" required /></label></div>
      <label>개설 상태<select name="status" defaultValue="ACTIVE"><option value="ACTIVE">공개하기</option><option value="DRAFT">초안으로 저장</option></select></label>
      <p className="form-hint">모든 로그인 회원이 별도 참여 신청 없이 읽고 글을 쓸 수 있어요.</p>
      <Feedback state={state} />
      <button disabled={pending || image.uploading}>{pending ? "개설 중…" : image.uploading ? "사진 업로드 중…" : "클럽 개설"}</button>
    </form>
  );
}

type EditableClub = {
  id: string;
  category: string;
  topic_sentence: string;
  description: string;
  cover_image_url: string | null;
};

export function ClubEditForm({ club, locked }: { club: EditableClub; locked: boolean }) {
  const [state, action, pending] = useActionState(updateClubDetails, initialState);
  const image = useClubImage(club.cover_image_url ?? "");
  return (
    <details className="club-edit-panel">
      <summary>{locked ? "클럽 정보 확인" : "클럽 정보 수정"}</summary>
      <form action={action} className="club-edit-form">
        <input type="hidden" name="clubId" value={club.id} />
        <label>관심 분야<input name="category" maxLength={40} defaultValue={club.category} disabled={locked} required /></label>
        <label>클럽명<input name="topicSentence" minLength={5} maxLength={200} defaultValue={club.topic_sentence} disabled={locked} required /></label>
        <label>클럽 설명<textarea name="description" minLength={20} maxLength={1000} rows={5} defaultValue={club.description} disabled={locked} required /></label>
        {!locked && <ClubImageField image={image} />}
        <Feedback state={state} />
        {!locked && <button disabled={pending || image.uploading}>{pending ? "저장 중…" : image.uploading ? "사진 업로드 중…" : "정보 저장"}</button>}
      </form>
    </details>
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

type ClubImageState = ReturnType<typeof useClubImage>;

function ClubImageField({ image }: { image: ClubImageState }) {
  return (
    <div className="club-image-field">
      <input type="hidden" name="coverImageUrl" value={image.imageUrl} />
      <label>
        클럽 대표 사진 <span>선택</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={image.upload} />
      </label>
      <p className="form-hint">JPG, PNG, WebP · 최대 8MB</p>
      {image.previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.previewUrl} alt="클럽 대표 사진 미리보기" />
      )}
      {image.error && <p className="error">{image.error}</p>}
    </div>
  );
}

function useClubImage(initialUrl = "") {
  const [imageUrl, setImageUrl] = useState(initialUrl);
  const [previewUrl, setPreviewUrl] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 선택할 수 있어요.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("사진은 8MB 이하로 등록해 주세요.");
      return;
    }

    setUploading(true);
    setError("");
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `clubs/cover-${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("site-assets")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      setUploading(false);
      setError("사진을 업로드하지 못했어요.");
      return;
    }
    const publicUrl = supabase.storage.from("site-assets").getPublicUrl(path).data.publicUrl;
    setImageUrl(publicUrl);
    setPreviewUrl(publicUrl);
    setUploading(false);
  }

  return { imageUrl, previewUrl, uploading, error, upload };
}
