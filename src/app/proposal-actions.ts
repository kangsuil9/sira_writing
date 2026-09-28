"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { proposalsEnabled } from "@/lib/features";

export type ProposalState = { error?: string; saved?: boolean };

export async function createClubProposal(
  _: ProposalState,
  formData: FormData,
): Promise<ProposalState> {
  if (!proposalsEnabled) return { error: "주제 제안 기능은 아직 준비 중이에요." };

  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
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

  const { data: proposal, error } = await supabase
    .from("clubs")
    .insert({
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
    })
    .select("id")
    .single();
  if (error || !proposal) return { error: "주제를 제안하지 못했어요. 잠시 후 다시 시도해 주세요." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", user.id)
    .single();
  const { data: authData } = await supabase.auth.getUser();
  await sendProposalNotification({
    proposalId: proposal.id,
    proposer: profile?.nickname ?? "회원",
    proposerEmail: authData.user?.email ?? "이메일 정보 없음",
    title,
    description,
    startsAt,
    endsAt,
  });

  revalidatePath("/proposals");
  revalidatePath("/admin/clubs");
  revalidatePath("/admin/clubs/proposals");
  return { saved: true };
}

async function sendProposalNotification(proposal: {
  proposalId: string;
  proposer: string;
  proposerEmail: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.PROPOSAL_EMAIL_FROM;
  const to =
    process.env.PROPOSAL_NOTIFICATION_TO ?? "sirastandard9@gmail.com";
  if (!apiKey || !from) {
    console.warn("Proposal email skipped: Resend environment variables are missing.");
    return;
  }

  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://sirawriting.co.kr"}/admin/clubs/proposals`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `[시라 글쓰기] ${proposal.proposer}님이 새 주제를 제안했어요`,
        html: `
          <h2>새로운 글쓰기 주제가 제안됐어요.</h2>
          <p><strong>제안자</strong>: ${escapeHtml(proposal.proposer)} (${escapeHtml(proposal.proposerEmail)})</p>
          <p><strong>주제</strong>: ${escapeHtml(proposal.title)}</p>
          <p><strong>설명</strong><br>${escapeHtml(proposal.description).replace(/\n/g, "<br>")}</p>
          <p><strong>활동 기간</strong>: ${escapeHtml(proposal.startsAt)} – ${escapeHtml(proposal.endsAt)}</p>
          <p><a href="${adminUrl}">선정 대기 글쓰기 클럽 확인하기</a></p>
          <small>제안 ID: ${escapeHtml(proposal.proposalId)}</small>
        `,
      }),
    });
    if (!response.ok) {
      console.error("Proposal email failed:", response.status, await response.text());
    }
  } catch (error) {
    console.error("Proposal email failed:", error);
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
