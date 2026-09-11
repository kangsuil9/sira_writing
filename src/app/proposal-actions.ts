"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { proposalsEnabled } from "@/lib/features";

export type ProposalState = { error?: string; saved?: boolean };

export async function createClubProposal(
  _: ProposalState,
  formData: FormData,
): Promise<ProposalState> {
  if (!proposalsEnabled) return { error: "주제 제안 기능은 아직 준비 중이에요." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const startsAt = String(formData.get("startsAt") ?? "");
  const endsAt = String(formData.get("endsAt") ?? "");

  if (title.length < 5 || title.length > 200) {
    return { error: "주제는 5~200자로 입력해 주세요." };
  }
  if (description.length < 20 || description.length > 1000) {
    return { error: "설명은 20~1,000자로 입력해 주세요." };
  }
  if (!startsAt || !endsAt || new Date(endsAt) <= new Date(startsAt)) {
    return { error: "시작일과 종료일을 확인해 주세요." };
  }
  const start = `${startsAt}T00:00:00+09:00`;
  const end = `${endsAt}T23:59:59+09:00`;
  if (new Date(end) <= new Date()) return { error: "종료일은 오늘 이후로 정해 주세요." };

  const { error } = await supabase.from("clubs").insert({
    category: "회원 제안",
    topic_sentence: title,
    description,
    starts_at: start,
    ends_at: end,
    origin_type: "PROPOSAL",
    status: "DRAFT",
    participation_mode: "OPEN",
    read_scope: "CLOSED",
    write_scope: "AUTHENTICATED",
    proposed_by: user.id,
    minimum_members: 1,
    created_by: user.id,
  });
  if (error) return { error: "주제를 제안하지 못했어요. 잠시 후 다시 시도해 주세요." };

  revalidatePath("/proposals");
  revalidatePath("/admin/clubs");
  return { saved: true };
}
