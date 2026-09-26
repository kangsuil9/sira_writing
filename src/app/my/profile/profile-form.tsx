"use client";

import { ChangeEvent, useActionState, useMemo, useState } from "react";
import { updateProfile, type ProfileState } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";

const initialState: ProfileState = {};

type Props = {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
};

export function ProfileForm({ userId, nickname, avatarUrl }: Props) {
  const [state, action, pending] = useActionState(updateProfile, initialState);
  const [nextNickname, setNextNickname] = useState(nickname);
  const [nextAvatarUrl, setNextAvatarUrl] = useState(avatarUrl ?? "");
  const [nicknameStatus, setNicknameStatus] = useState<
    "unchanged" | "unchecked" | "checking" | "available" | "duplicate" | "invalid"
  >("unchanged");
  const [uploading, setUploading] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  async function checkNickname() {
    const value = nextNickname.trim();
    if (!/^[가-힣a-zA-Z0-9_]{2,20}$/.test(value)) {
      setNicknameStatus("invalid");
      return;
    }
    if (value === nickname) {
      setNicknameStatus("unchanged");
      return;
    }

    setNicknameStatus("checking");
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("nickname", value)
      .neq("id", userId)
      .maybeSingle();

    if (error) {
      setNicknameStatus("unchecked");
      return;
    }
    setNicknameStatus(data ? "duplicate" : "available");
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일을 선택해 주세요.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("프로필 사진은 5MB 이하로 올려주세요.");
      return;
    }

    setUploading(true);
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/profile/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from("post-images")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) {
      setUploading(false);
      alert("프로필 사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }

    const { data } = supabase.storage.from("post-images").getPublicUrl(path);
    setNextAvatarUrl(data.publicUrl);
    setUploading(false);
    event.target.value = "";
  }

  const nicknameReady =
    nicknameStatus === "unchanged" || nicknameStatus === "available";

  return (
    <form className="profile-form" action={action}>
      <input type="hidden" name="avatarUrl" value={nextAvatarUrl} />

      <div className="profile-photo-field">
        {nextAvatarUrl ? (
          // Profile images can be served from Kakao or Supabase Storage host names.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={nextAvatarUrl} alt="프로필 사진 미리보기" />
        ) : (
          <span aria-hidden="true">{nextNickname.trim().slice(0, 1) || "시"}</span>
        )}
        <label className="profile-photo-button">
          {uploading ? "사진 올리는 중…" : "프로필 사진 변경"}
          <input
            type="file"
            accept="image/*"
            disabled={uploading || pending}
            onChange={uploadAvatar}
          />
        </label>
      </div>

      <div className="profile-nickname-field">
        <label htmlFor="profile-nickname">닉네임</label>
        <div>
          <input
            id="profile-nickname"
            name="nickname"
            value={nextNickname}
            minLength={2}
            maxLength={20}
            required
            onChange={(event) => {
              const value = event.target.value;
              setNextNickname(value);
              setNicknameStatus(value.trim() === nickname ? "unchanged" : "unchecked");
            }}
          />
          <button
            type="button"
            disabled={nicknameStatus === "checking" || pending}
            onClick={checkNickname}
          >
            {nicknameStatus === "checking" ? "확인 중…" : "중복 확인"}
          </button>
        </div>
        <NicknameMessage status={nicknameStatus} />
      </div>

      {state.error && <p className="error">{state.error}</p>}
      <button
        className="profile-save-button"
        type="submit"
        disabled={!nicknameReady || uploading || pending}
      >
        {pending ? "저장 중…" : "변경사항 저장"}
      </button>
    </form>
  );
}

function NicknameMessage({
  status,
}: {
  status: "unchanged" | "unchecked" | "checking" | "available" | "duplicate" | "invalid";
}) {
  if (status === "available") {
    return <p className="nickname-message available">사용할 수 있는 닉네임이에요.</p>;
  }
  if (status === "duplicate") {
    return <p className="nickname-message error">이미 사용 중인 닉네임이에요.</p>;
  }
  if (status === "invalid") {
    return <p className="nickname-message error">2~20자의 한글, 영문, 숫자, 밑줄만 사용할 수 있어요.</p>;
  }
  if (status === "unchecked") {
    return <p className="nickname-message">변경한 닉네임의 중복을 확인해 주세요.</p>;
  }
  return <p className="nickname-message">2~20자의 한글, 영문, 숫자, 밑줄을 사용할 수 있어요.</p>;
}
