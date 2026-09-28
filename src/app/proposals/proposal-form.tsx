"use client";

import { ChangeEvent, useActionState, useEffect, useId, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  createClubProposal,
  type ProposalState,
} from "@/app/proposal-actions";

const initialState: ProposalState = {};

export function ProposalForm({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState(createClubProposal, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const imageInputId = useId();
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState("");

  useEffect(() => {
    if (state.saved) {
      formRef.current?.reset();
      setImageUrl("");
      setPreviewUrl("");
    }
  }, [state.saved]);

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("이미지 파일만 선택할 수 있어요.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setImageError("사진은 8MB 이하로 등록해 주세요.");
      return;
    }

    setUploading(true);
    setImageError("");
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `clubs/proposal-${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const supabase = createClient();
    const { error } = await supabase.storage
      .from("site-assets")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) {
      setUploading(false);
      setImageUrl("");
      setImageError("사진을 업로드하지 못했어요. 다시 시도해 주세요.");
      return;
    }
    const publicUrl = supabase.storage.from("site-assets").getPublicUrl(path).data.publicUrl;
    setImageUrl(publicUrl);
    setPreviewUrl(publicUrl);
    setUploading(false);
  }

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
      <div className="proposal-image-field">
        <input type="hidden" name="coverImageUrl" value={imageUrl} />
        <strong>대표 사진 <em>필수</em></strong>
        <label className="proposal-image-picker" htmlFor={imageInputId}>
          <span aria-hidden="true">＋</span>
          <b>{previewUrl ? "다른 사진 선택" : "대표 사진 첨부"}</b>
          <small>클럽 목록과 상세 화면에 표시돼요. 가로 사진을 권장합니다.</small>
        </label>
        <input
          id={imageInputId}
          className="proposal-image-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={uploadImage}
        />
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="제안할 클럽 대표 사진 미리보기" />
        )}
        {imageError && <p className="error">{imageError}</p>}
      </div>
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
      <button type="submit" disabled={pending || uploading || !imageUrl}>
        {pending ? "제안 중…" : uploading ? "사진 업로드 중…" : !imageUrl ? "대표 사진을 첨부해 주세요" : "주제 제안하기"}
      </button>
    </form>
  );
}
