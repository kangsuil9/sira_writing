"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AdminActionState = { error?: string; success?: string };

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요해요." } as const;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "ADMIN") return { error: "관리자만 사용할 수 있어요." } as const;
  return { supabase, user } as const;
}

function clubValues(formData: FormData) {
  return {
    category: String(formData.get("category") ?? "").trim(),
    topicSentence: String(formData.get("topicSentence") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    startsAt: String(formData.get("startsAt") ?? ""),
    endsAt: String(formData.get("endsAt") ?? ""),
  };
}

function validateClub(values: ReturnType<typeof clubValues>) {
  if (values.category.length < 1 || values.category.length > 40) return "관심 분야는 1~40자로 입력해 주세요.";
  if (values.topicSentence.length < 5 || values.topicSentence.length > 200) return "한 문장 주제는 5~200자로 입력해 주세요.";
  if (values.description.length < 20 || values.description.length > 1000) return "설명은 20~1,000자로 입력해 주세요.";
  if (!values.startsAt || !values.endsAt || new Date(values.endsAt) <= new Date(values.startsAt)) return "시작일과 종료일을 확인해 주세요.";
  return null;
}

export async function createClub(_: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };
  const values = clubValues(formData);
  const validationError = validateClub(values);
  if (validationError) return { error: validationError };
  const status = formData.get("status") === "DRAFT" ? "DRAFT" : "ACTIVE";

  const { error } = await auth.supabase.from("clubs").insert({
    category: values.category,
    topic_sentence: values.topicSentence,
    description: values.description,
    starts_at: `${values.startsAt}T00:00:00+09:00`,
    ends_at: `${values.endsAt}T23:59:59+09:00`,
    origin_type: "MANUAL",
    status,
    participation_mode: "OPEN",
    read_scope: "AUTHENTICATED",
    write_scope: "AUTHENTICATED",
    minimum_members: 1,
    created_by: auth.user.id,
  });
  if (error) return { error: "클럽을 개설하지 못했어요." };
  revalidatePath("/");
  revalidatePath("/admin/clubs");
  return { success: "클럽을 개설했어요." };
}

export async function updateClubStatus(_: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };
  const clubId = String(formData.get("clubId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["DRAFT", "ACTIVE", "COMPLETED"].includes(status)) return { error: "변경할 상태를 확인해 주세요." };

  const { data: club } = await auth.supabase.from("clubs").select("status,ends_at").eq("id", clubId).single();
  if (!club) return { error: "클럽을 찾지 못했어요." };
  if (club.status === "COMPLETED" || new Date(club.ends_at) < new Date()) return { error: "종료된 클럽은 변경할 수 없어요." };

  const { error } = await auth.supabase.from("clubs").update({ status, updated_at: new Date().toISOString() }).eq("id", clubId);
  if (error) return { error: "클럽 상태를 변경하지 못했어요." };
  revalidateClubPaths(clubId);
  return { success: "상태를 변경했어요." };
}

export async function reviewClubProposal(_: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };
  const clubId = String(formData.get("clubId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!["approve", "reject"].includes(decision)) return { error: "처리할 결과를 확인해 주세요." };

  const { data: proposal } = await auth.supabase
    .from("clubs")
    .select("origin_type,status,ends_at")
    .eq("id", clubId)
    .single();
  if (!proposal || proposal.origin_type !== "PROPOSAL" || proposal.status !== "DRAFT") {
    return { error: "이미 처리됐거나 찾을 수 없는 제안이에요." };
  }
  if (decision === "approve" && new Date(proposal.ends_at) < new Date()) return { error: "종료일이 지난 제안은 승인할 수 없어요." };

  const changes = decision === "approve"
    ? { status: "ACTIVE", read_scope: "AUTHENTICATED", updated_at: new Date().toISOString() }
    : { status: "NOT_SELECTED", updated_at: new Date().toISOString() };
  const { error } = await auth.supabase.from("clubs").update(changes).eq("id", clubId);
  if (error) return { error: "제안 결과를 저장하지 못했어요." };
  revalidateClubPaths(clubId);
  revalidatePath("/proposals");
  return { success: decision === "approve" ? "제안을 승인했어요." : "제안을 미승인 처리했어요." };
}

function revalidateClubPaths(clubId: string) {
  revalidatePath("/");
  revalidatePath("/admin/clubs");
  revalidatePath(`/clubs/${clubId}`);
}
