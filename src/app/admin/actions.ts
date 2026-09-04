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
export async function createCycle(_: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await requireAdmin(); if ("error" in auth) return { error: auth.error };
  const sequence = Number(formData.get("sequence")), startsAt = String(formData.get("startsAt") ?? ""), endsAt = String(formData.get("endsAt") ?? "");
  if (!Number.isInteger(sequence) || sequence < 1) return { error: "기수 번호를 확인해 주세요." };
  if (!startsAt || !endsAt || new Date(endsAt) <= new Date(startsAt)) return { error: "시작일과 종료일을 확인해 주세요." };
  const { error } = await auth.supabase.from("cycles").insert({ sequence, starts_at: `${startsAt}T00:00:00+09:00`, ends_at: `${endsAt}T23:59:59+09:00`, created_by: auth.user.id });
  if (error?.code === "23505") return { error: "이미 존재하는 기수 번호예요." };
  if (error) return { error: "기수를 만들지 못했어요." };
  revalidatePath("/admin/clubs"); return { success: `${sequence}기를 만들었어요.` };
}
export async function createClub(_: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await requireAdmin(); if ("error" in auth) return { error: auth.error };
  const cycleId = String(formData.get("cycleId") ?? ""), category = String(formData.get("category") ?? "").trim(), topicSentence = String(formData.get("topicSentence") ?? "").trim(), description = String(formData.get("description") ?? "").trim();
  const status = formData.get("status") === "DRAFT" ? "DRAFT" : "ACTIVE";
  if (!cycleId) return { error: "기수를 선택해 주세요." };
  if (category.length < 1 || category.length > 40) return { error: "관심 분야는 1~40자로 입력해 주세요." };
  if (topicSentence.length < 5 || topicSentence.length > 200) return { error: "한 문장 주제는 5~200자로 입력해 주세요." };
  if (description.length < 20 || description.length > 1000) return { error: "설명은 20~1000자로 입력해 주세요." };
  const { error } = await auth.supabase.from("clubs").insert({ cycle_id: cycleId, category, topic_sentence: topicSentence, description, origin_type: "MANUAL", status, participation_mode: "OPEN", read_scope: "AUTHENTICATED", write_scope: "AUTHENTICATED", minimum_members: 1, created_by: auth.user.id });
  if (error) return { error: "클럽을 개설하지 못했어요." };
  revalidatePath("/admin/clubs"); return { success: "클럽을 개설했어요." };
}
export async function updateClubStatus(_: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const auth = await requireAdmin(); if ("error" in auth) return { error: auth.error };
  const clubId = String(formData.get("clubId") ?? ""), status = String(formData.get("status") ?? "");
  if (!["DRAFT", "ACTIVE", "COMPLETED"].includes(status)) return { error: "변경할 상태를 확인해 주세요." };
  const { error } = await auth.supabase.from("clubs").update({ status, updated_at: new Date().toISOString() }).eq("id", clubId);
  if (error) return { error: "클럽 상태를 변경하지 못했어요." };
  revalidatePath("/"); revalidatePath("/admin/clubs"); revalidatePath(`/clubs/${clubId}`);
  return { success: "상태를 변경했어요." };
}
