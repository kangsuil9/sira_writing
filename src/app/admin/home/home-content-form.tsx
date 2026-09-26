"use client";

import { FormEvent, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  updateHomeContent,
  type AdminActionState,
} from "../actions";

type HomeContent = {
  hero_title: string;
  hero_description: string;
  hero_image_url: string;
};

export function HomeContentForm({ content }: { content: HomeContent }) {
  const [imageUrl, setImageUrl] = useState(content.hero_image_url);
  const [previewUrl, setPreviewUrl] = useState(content.hero_image_url);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<AdminActionState>({});
  const [pending, startTransition] = useTransition();

  function selectImage(nextFile: File | null) {
    if (!nextFile) return;
    if (!nextFile.type.startsWith("image/")) {
      setState({ error: "이미지 파일만 선택할 수 있어요." });
      return;
    }
    if (nextFile.size > 8 * 1024 * 1024) {
      setState({ error: "사진은 8MB 이하로 등록해 주세요." });
      return;
    }
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
    setState({});
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      setState({});
      let nextImageUrl = imageUrl;
      if (file) {
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `home/hero-${Date.now()}.${extension}`;
        const supabase = createClient();
        const { error: uploadError } = await supabase.storage
          .from("site-assets")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) {
          setState({ error: "사진을 업로드하지 못했어요." });
          return;
        }
        nextImageUrl = supabase.storage.from("site-assets").getPublicUrl(path)
          .data.publicUrl;
      }

      const result = await updateHomeContent({
        heroTitle: String(formData.get("heroTitle") ?? ""),
        heroDescription: String(formData.get("heroDescription") ?? ""),
        heroImageUrl: nextImageUrl,
      });
      setState(result);
      if (result.success) {
        setImageUrl(nextImageUrl);
        setPreviewUrl(nextImageUrl);
        setFile(null);
      }
    });
  }

  return (
    <form className="admin-form home-content-form" onSubmit={submit}>
      <h2>대표 영역</h2>
      <label>
        큰 문구
        <textarea
          name="heroTitle"
          rows={3}
          maxLength={120}
          defaultValue={content.hero_title}
          required
        />
      </label>
      <label>
        작은 문구
        <textarea
          name="heroDescription"
          rows={4}
          maxLength={300}
          defaultValue={content.hero_description}
          required
        />
      </label>
      <label>
        대표 사진
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => selectImage(event.target.files?.[0] ?? null)}
        />
      </label>
      <p className="form-hint">JPG, PNG, WebP · 최대 8MB</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="home-content-preview" src={previewUrl} alt="대표 사진 미리보기" />
      {state.error && <p className="error">{state.error}</p>}
      {state.success && <p className="success">{state.success}</p>}
      <button disabled={pending}>{pending ? "저장 중…" : "홈 화면에 반영"}</button>
    </form>
  );
}
